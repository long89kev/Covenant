import { expect, test, type Page } from '@playwright/test'

const noOverflow = async (page: Page) => {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }))
  expect(scroll, 'page must not scroll horizontally').toBeLessThanOrEqual(inner)
}
const gate = (page: Page) => page.locator('#playground')
const pick = (page: Page, name: RegExp) => gate(page).getByRole('button', { name })

const expectScenario = async (page: Page, s: { amount: string; payee: string; policy: string; executor: string; verdict: string }) => {
  await expect(page.getByTestId('lp-amount')).toHaveText(s.amount)
  await expect(page.getByTestId('lp-counterparty')).toHaveText(s.payee)
  await expect(page.getByTestId('lp-policy-status')).toHaveText(s.policy)
  await expect(page.getByTestId('lp-executor-status')).toHaveText(s.executor)
  await expect(page.getByTestId('lp-verdict')).toHaveText(s.verdict)
}

const VALID = { amount: '$2,400.00', payee: 'Verified supplier', policy: 'PASS', executor: 'WOULD ACCEPT', verdict: 'Eligible for signing' }
const APPROVAL = { amount: '$12,500.00', payee: 'Verified supplier', policy: 'PENDING', executor: 'NOT EXECUTED', verdict: 'Approval required' }
const TAMPERED = { amount: '$50,000.00', payee: 'Unverified payee', policy: 'DENIED', executor: 'REJECTED', verdict: 'Execution blocked' }

test.describe('landing / authorization playground', () => {
  test('all three scenarios update every bound field in sync, with aria-pressed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Give agentsfreedom.Not the keys.')
    await expectScenario(page, VALID)
    await expect(pick(page, /Within policy/)).toHaveAttribute('aria-pressed', 'true')
    await pick(page, /Missing approval/).click()
    await expectScenario(page, APPROVAL)
    await expect(pick(page, /Missing approval/)).toHaveAttribute('aria-pressed', 'true')
    await expect(pick(page, /Within policy/)).toHaveAttribute('aria-pressed', 'false')
    await pick(page, /Tampered/).click()
    await expectScenario(page, TAMPERED)
    await expect(page.getByTestId('lp-policy')).toContainText('Payee mismatch')
    await pick(page, /Within policy/).click()
    await expectScenario(page, VALID)
    await expect(gate(page).locator('[aria-live="polite"]')).toHaveCount(1)
  })

  test('simulation disclaimer is persistent and nothing claims a real signature', async ({ page }) => {
    await page.goto('/')
    for (const name of [/Within policy/, /Missing approval/, /Tampered/]) {
      await pick(page, name).click()
      await expect(page.getByTestId('lp-disclaimer')).toHaveText('Illustrative policy simulation. No Tide signature is issued by this landing page.')
      await expect(gate(page)).toContainText('SIMULATED AUTHORIZATION RESULT')
      await expect(gate(page)).toContainText('Interactive simulation')
      const text = await page.locator('body').innerText()
      expect(text).not.toMatch(/Signed by Tide|Tide verified|Verified by Tide|payment (sent|complete)/i)
    }
  })

  for (const [cta, where] of [['Run a failure case', 'hero'], ['Run tampered request', 'dark section']] as const) {
    test(`"${cta}" (${where}) selects tampered and brings the console into view`, async ({ page }) => {
      await page.goto('/')
      if (where === 'dark section') await page.locator('#threat').scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: cta }).click()
      await expectScenario(page, TAMPERED)
      await expect(gate(page)).toBeInViewport({ ratio: 0.5 })
    })
  }

  test('anchor CTAs and nav links point at real sections', async ({ page }) => {
    await page.goto('/')
    for (const href of await page.locator('.lp-root a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
      await expect(page.locator(href), `${href} target exists`).toHaveCount(1)
    }
    await expect(page.getByRole('link', { name: /Open the operator workspace/ })).toHaveAttribute('href', '/dashboard')
  })

  test('keyboard: scenario buttons are reachable and operable', async ({ page }) => {
    await page.goto('/')
    await pick(page, /Missing approval/).focus()
    await page.keyboard.press('Enter')
    await expectScenario(page, APPROVAL)
    await page.keyboard.press('Tab')
    await expect(pick(page, /Tampered/)).toBeFocused()
    await page.keyboard.press('Space')
    await expectScenario(page, TAMPERED)
  })
})

test.describe('landing / mobile menu', () => {
  test('toggles with aria-expanded, closes on link and Escape', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'menu button exists ≤780px')
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Toggle navigation' })
    const nav = page.getByRole('navigation', { name: 'Primary navigation' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(nav).toBeHidden()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(nav).toBeVisible()
    await nav.getByRole('link', { name: 'Mechanism' }).click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page).toHaveURL(/#mechanism$/)
    await toggle.click()
    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('landing / responsive + screenshots', () => {
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px in every scenario`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'width loop runs once')
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      for (const name of [/Within policy/, /Missing approval/, /Tampered/]) {
        await pick(page, name).click()
        await noOverflow(page)
      }
    })
  }

  test('capture hero, full page and attack state', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const p = info.project.name
    await page.screenshot({ path: `docs/screenshots/landing-${p}-hero.png` })
    await page.screenshot({ path: `docs/screenshots/landing-${p}-full.png`, fullPage: true })
    await page.getByRole('button', { name: 'Run a failure case' }).click()
    await page.screenshot({ path: `docs/screenshots/landing-${p}-attack.png` })
  })

  test('reduced motion disables transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const d = await pick(page, /Tampered/).evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(['0s', '1e-05s']).toContain(d)
  })
})
