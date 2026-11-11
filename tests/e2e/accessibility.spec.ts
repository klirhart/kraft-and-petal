import { expect, test } from '@playwright/test'
import { CUSTOMER, OPERATOR, expectNoAxeViolations, pageReady, signIn } from './helpers'

const PUBLIC_ROUTES: [path: string, heading: string | RegExp][] = [
  ['/', /Flowers wrapped by hand/],
  ['/shop', 'Shop'],
  ['/shop?category=gifts', 'Shop'],
  ['/shop/cream-and-green-wrap', 'Cream & Green Wrap'],
  ['/shop/windowsill-succulent', 'Windowsill Succulent'],
  ['/cart', 'Your cart'],
  ['/about', /About/],
  ['/contact', 'Contact'],
  ['/login', 'Sign in'],
  ['/signup', 'Create account'],
  ['/nowhere', /can't find that page/],
]

test.describe('axe, color contrast included', () => {
  for (const [path, heading] of PUBLIC_ROUTES) {
    test(`public ${path}`, async ({ page }) => {
      await page.goto(path)
      await pageReady(page, heading)
      await expectNoAxeViolations(page)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    })
  }

  test('customer routes, with a cart', async ({ page }) => {
    await signIn(page, CUSTOMER, '/shop/sunny-meadow-bunch')
    await pageReady(page, 'Sunny Meadow Bunch')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'added to your cart' })).toBeVisible()
    await expectNoAxeViolations(page)

    await page.goto('/cart')
    await pageReady(page, 'Your cart')
    await expect(page.getByRole('link', { name: 'Checkout' })).toBeVisible()
    await expectNoAxeViolations(page)

    await page.goto('/checkout')
    await pageReady(page, 'Checkout')
    await page.getByRole('button', { name: /Place order/ }).click()
    await expect(page.getByText('Check 6 fields')).toBeVisible()
    await expectNoAxeViolations(page)

    await page.goto('/account/orders')
    await pageReady(page, 'Your orders')
    await expectNoAxeViolations(page)
  })

  test('the cart drawer and the mobile menu', async ({ page, isMobile, viewport }) => {
    await page.goto('/shop/blush-peony-bouquet')
    await pageReady(page, 'Blush Peony Bouquet')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByRole('button', { name: /^Cart, 1 item/ }).click()
    const drawer = page.getByRole('dialog', { name: /Your cart/ })
    await expect(drawer.getByRole('link', { name: 'Checkout' })).toBeVisible()
    await expectNoAxeViolations(page)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    if ((viewport?.width ?? 1280) < 1024 || isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click()
      await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
      await expectNoAxeViolations(page)
    }
  })

  test('operator dashboard', async ({ page }) => {
    await signIn(page, OPERATOR, '/admin')
    for (const [path, heading] of [
      ['/admin', 'Overview'],
      ['/admin/products', 'Products'],
      ['/admin/orders', 'Orders'],
      ['/admin/inventory', 'Inventory'],
    ] as const) {
      await page.goto(path)
      await pageReady(page, heading)
      await expectNoAxeViolations(page)
    }
    await page.goto('/admin/products')
    await page.getByRole('button', { name: 'Add product' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Add product' })).toBeVisible()
    await page.getByRole('button', { name: 'Save product' }).click()
    await expect(page.getByRole('dialog').getByText(/Check \d+ fields/)).toBeVisible()
    await expectNoAxeViolations(page)
  })
})

test.describe('reflow and text resize', () => {
  test('no sideways scrolling at 320px wide', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    for (const path of ['/', '/shop', '/shop/blush-peony-bouquet', '/cart', '/login', '/contact']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
    }
  })

  test('touch targets are at least 24px, and primary controls 44px', async ({ page }) => {
    await page.goto('/shop')
    await pageReady(page, 'Shop')
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, a[href], input, select')]
        .filter((element) => element.offsetParent !== null && !element.closest('.visually-hidden') && element.getBoundingClientRect().width > 1)
        .map((element) => {
          const box = element.getBoundingClientRect()
          const inline = element.tagName === 'A' && getComputedStyle(element).display === 'inline'
          return { name: (element.textContent ?? '').trim().slice(0, 30), width: box.width, height: box.height, inline }
        }),
    )
    for (const size of sizes.filter((entry) => !entry.inline)) {
      expect(Math.min(size.width, size.height), `${size.name} is ${size.width}x${size.height}`).toBeGreaterThanOrEqual(24)
    }
    const addButtons = page.getByRole('button', { name: /^Add / })
    const box = await addButtons.first().boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
