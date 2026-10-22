import { expect, test, type Page } from '@playwright/test'

const ROUTES = ['/dashboard', '/negotiate', '/transactions', '/governance', '/audit']

const noHorizontalOverflow = async (page: Page) => {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }))
  expect(scroll, 'page must not scroll horizontally').toBeLessThanOrEqual(inner)
}

// getByRole skips hidden nodes (a Suspense placeholder can briefly hold a hidden copy during hydration)
const banner = (page: Page) => page.getByRole('region', { name: 'Authority mode banner' })

test.describe('shell and capability banner', () => {
  for (const route of ROUTES) {
    test(`${route}: banner present, not dismissible, no overflow`, async ({ page }, info) => {
      await page.goto(route)
      await expect(banner(page)).toBeVisible()
      // fallback authority + reachable TideCloak = SIMULATED; never LIVE_VERIFIED at app level
      await expect(banner(page)).toHaveAttribute('data-mode', 'SIMULATED')
      await expect(banner(page)).toContainText('SIMULATED')
      await expect(banner(page).getByRole('button', { name: /close|dismiss|hide/i })).toHaveCount(0)
      await expect(page.getByRole('main')).toBeVisible()
      await noHorizontalOverflow(page)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: `docs/screenshots/${info.project.name}${route.replace(/\//g, '-')}.png`, fullPage: true })
    })
  }

  test('no page claims Tide verification it has not observed', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route)
      await expect(banner(page)).toHaveAttribute('data-mode', 'SIMULATED')
      const text = await page.locator('body').innerText()
      expect(text).not.toMatch(/Verified by Tide|QEA 2\/3 completed|REAL CONNECTED|100% protected/i)
    }
  })
})

test.describe('mission control', () => {
  test('KPIs are truthful and scenario fixtures carry the seeded amounts', async ({ page }) => {
    await page.goto('/dashboard')
    const proof = page.getByTestId('metric-proof')
    await expect(proof).toContainText('Live Tide proofs')
    await expect(proof).toContainText('00')
    for (const [title, amount] of [['Clean procurement', '$1,200'], ['Malicious invoice', '$50,000'], ['Escalation attempt', '$12,000']]) {
      const card = page.getByRole('link', { name: new RegExp(title) })
      await expect(card).toContainText(amount)
    }
    await expect(page.getByRole('link', { name: /Inject malicious invoice/ })).toHaveAttribute('href', '/negotiate?scenario=injected_invoice')
    await expect(page.getByText('Forseti policy signing')).toBeVisible()
    await expect(page.getByText('Not deployed', { exact: true })).toBeVisible()
  })
})

test.describe('protected routes without a session', () => {
  for (const route of ['/negotiate', '/transactions', '/audit', '/transactions/00000000-0000-0000-0000-000000000000']) {
    test(`${route} shows the Tide login gate, not data`, async ({ page }) => {
      await page.goto(route)
      await expect(page.getByText(/Log in with Tide to view/)).toBeVisible()
      await expect(page.locator('main table')).toHaveCount(0)
    })
  }
})

test.describe('unavailable authority fails closed in the UI', () => {
  test('health probe failure shows UNAVAILABLE with a reason', async ({ page }) => {
    await page.route('**/api/health', (r) => r.fulfill({ status: 500, body: '{}' }))
    await page.goto('/dashboard')
    await expect(banner(page)).toHaveAttribute('data-mode', 'UNAVAILABLE')
    await expect(banner(page)).toContainText('AUTHORITY UNAVAILABLE')
    await expect(banner(page)).toContainText('HEALTH_PROBE_FAILED')
  })

  test('TideCloak unreachable shows TIDE_UNAVAILABLE', async ({ page, request }) => {
    const real = await (await request.get('/api/health')).json()
    await page.route('**/api/health', (r) => r.fulfill({ json: { ...real, tidecloak: { ...real.tidecloak, status: 'UNAVAILABLE' } } }))
    await page.goto('/governance')
    await expect(banner(page)).toHaveAttribute('data-mode', 'UNAVAILABLE')
    await expect(banner(page)).toContainText('TIDE_UNAVAILABLE')
  })

  test('executor unconfigured shows EXECUTOR_UNCONFIGURED', async ({ page, request }) => {
    const real = await (await request.get('/api/health')).json()
    await page.route('**/api/health', (r) => r.fulfill({ json: { ...real, authorityMode: 'UNCONFIGURED' } }))
    await page.goto('/dashboard')
    await expect(banner(page)).toContainText('EXECUTOR_UNCONFIGURED')
  })

  test('live mode without evidence is POLICY_UNVERIFIED, never LIVE_VERIFIED', async ({ page, request }) => {
    const real = await (await request.get('/api/health')).json()
    await page.route('**/api/health', (r) => r.fulfill({ json: { ...real, authorityMode: 'live' } }))
    await page.goto('/dashboard')
    await expect(banner(page)).toHaveAttribute('data-mode', 'TIDE_CONNECTED_POLICY_UNVERIFIED')
    await expect(banner(page)).toContainText('Forseti policy signing has not been verified')
  })
})

test.describe('keyboard and navigation', () => {
  test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
    await page.goto('/governance')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('active route is marked with aria-current', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'sidebar is a drawer on mobile')
    await page.goto('/governance')
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Governance' })).toHaveAttribute('aria-current', 'page')
  })

  test('mobile drawer opens, navigates and closes with Escape', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'drawer exists below 768px only')
    await page.goto('/dashboard')
    const toggle = page.getByRole('button', { name: 'Open navigation' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    const drawer = page.getByRole('dialog', { name: 'Navigation' })
    await expect(drawer).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await drawer.getByRole('link', { name: 'Governance' }).click()
    await expect(page).toHaveURL(/\/governance$/)
    await expect(drawer).toBeHidden()
  })
})

// Editorial Authority v2 (design/app-v2): same palette as landing v2, no blue, no dark sidebar.
test.describe('brand parity', () => {
  test('canvas, ink and sidebar use the landing v2 tokens; nothing renders cobalt', async ({ page }, info) => {
    await page.goto('/dashboard')
    const css = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const body = getComputedStyle(document.body)
      const side = document.querySelector('.sidebar-slot')
      const all = [...document.querySelectorAll('body *')].flatMap((el) => {
        const s = getComputedStyle(el)
        return [s.color, s.backgroundColor, s.borderTopColor]
      })
      return {
        tokens: ['--paper', '--ink', '--console', '--signal', '--failure'].map((t) => root.getPropertyValue(t).trim().toUpperCase()),
        bg: body.backgroundColor,
        fg: body.color,
        sidebar: side ? getComputedStyle(side).backgroundColor : null,
        blue: all.filter((c) => /rgb\(36, 92, 246\)|rgb\(12, 23, 40\)|rgb\(2, 169, 146\)/.test(c)).length,
      }
    })
    expect(css.tokens).toEqual(['#F1F2EB', '#17201E', '#111B19', '#D5F96A', '#F19D90'])
    expect(css.bg).toBe('rgb(241, 242, 235)')
    expect(css.fg).toBe('rgb(23, 32, 30)')
    if (info.project.name === 'desktop') expect(css.sidebar).toBe('rgb(235, 238, 230)')
    expect(css.blue, 'no legacy cobalt / midnight / teal').toBe(0)
  })

  test('numbered navigation and editorial titles on every route', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'sidebar is a drawer on mobile')
    for (const [route, title] of [['/dashboard', /Control, without/], ['/negotiate', /Let them/], ['/transactions', /Every request/], ['/governance', /Authority has/], ['/audit', /Show the/]] as const) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.getByRole('navigation', { name: 'Primary' }).locator('.nav-index')).toHaveText(['01', '02', '03', '04', '05'])
    }
  })

  test('governance keeps business approval, QEA and ORK threshold as separate rows', async ({ page }) => {
    await page.goto('/governance')
    for (const h of ['Business authorization', 'Realm governance', 'Cryptographic signing']) {
      await expect(page.getByRole('heading', { name: h, level: 2 })).toBeVisible()
    }
    await expect(page.locator('body')).not.toContainText(/quorum 2\/3/i)
  })
})

test.describe('responsive', () => {
  for (const width of [390, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px on all routes`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'width loop runs once')
      await page.setViewportSize({ width, height: 900 })
      for (const route of ROUTES) {
        await page.goto(route)
        await expect(banner(page)).toHaveAttribute('data-mode', 'SIMULATED')
        await noHorizontalOverflow(page)
        if (width === 768 || width === 1024) await page.screenshot({ path: `docs/screenshots/w${width}${route.replace(/\//g, '-')}.png`, fullPage: true })
      }
    })
  }

  test('reduced motion disables transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/dashboard')
    const d = await page.evaluate(() => getComputedStyle(document.querySelector('.nav-arrow') ?? document.body).transitionDuration)
    expect(['0s', '1e-05s']).toContain(d)
  })
})
