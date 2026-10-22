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
    const proof = page.locator('.card', { hasText: 'Authorized with proof' })
    await expect(proof).toContainText('0')
    for (const [title, amount] of [['Clean procurement', '$1,200.00'], ['Malicious invoice', '$50,000.00'], ['Escalation attempt', '$12,000.00']]) {
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
    await page.getByRole('button', { name: 'Open navigation' }).click()
    const drawer = page.getByRole('dialog', { name: 'Navigation' })
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await drawer.getByRole('link', { name: 'Governance' }).click()
    await expect(page).toHaveURL(/\/governance$/)
    await expect(drawer).toBeHidden()
  })
})
