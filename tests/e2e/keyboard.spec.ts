/*
 * Keyboard-only journeys. No mouse or touch is used after the page loads.
 */
import { expect, test } from '@playwright/test'
import { CUSTOMER, OPERATOR, deliveryDate, expectVisibleFocus, pageReady, signIn, tabTo } from './helpers'

test.describe('keyboard only', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1280) < 1024, 'The journeys are written for the inline navigation')

  test('skip link is the first stop and moves focus to the content', async ({ page }) => {
    await page.goto('/shop')
    await pageReady(page, 'Shop')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expectVisibleFocus(page)
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
  })

  test('every stop on the shop page shows a focus indicator, in a sensible order', async ({ page }) => {
    await page.goto('/shop')
    await pageReady(page, 'Shop')
    const seen: string[] = []
    for (let presses = 0; presses < 16; presses += 1) {
      await page.keyboard.press('Tab')
      await expectVisibleFocus(page)
      seen.push(await page.evaluate(() => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '').trim()))
    }
    // Reading order: the links before the centred logo, the logo, the links after it, then the tools.
    const order = [
      'Skip to main content',
      'Shop all',
      'Bouquets',
      'Plants',
      'Gifts',
      'Kraft & Petal, home',
      'About',
      'Contact',
      'Sign in',
      'Workshops',
    ]
    expect(seen.slice(0, order.length)).toEqual(order)
    expect(seen[order.length]).toMatch(/^Cart/)
  })

  test('browse, add to cart, sign in, check out and see the order', async ({ page }) => {
    await page.goto('/shop')
    await pageReady(page, 'Shop')

    // Open a product from the list.
    await tabTo(page, 'Sunny Meadow Bunch')
    await page.keyboard.press('Enter')
    await pageReady(page, 'Sunny Meadow Bunch')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()

    // Raise the quantity with the arrow key, then add to the cart.
    await tabTo(page, /Quantity|Sunny Meadow Bunch/)
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('spinbutton')).toHaveValue('2')
    await tabTo(page, 'Add to cart')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: 'added to your cart' })).toBeVisible()

    // Open the cart drawer: focus moves in, Tab stays in, Escape returns focus.
    await tabTo(page, /^Cart, 2 items/)
    await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: /Your cart/ })
    await expect(drawer).toBeVisible()
    for (let presses = 0; presses < 10; presses += 1) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('button', { name: /^Cart, 2 items/ })).toBeFocused()

    // Go to checkout from the drawer; the guard asks for sign-in and remembers the way back.
    await page.keyboard.press('Enter')
    await expect(drawer.getByRole('link', { name: 'Checkout' })).toBeVisible()
    await tabTo(page, 'Checkout')
    await page.keyboard.press('Enter')
    await pageReady(page, 'Sign in')
    expect(new URL(page.url()).searchParams.get('next')).toBe('/checkout')
    await tabTo(page, 'Email')
    await page.keyboard.type(CUSTOMER.email)
    await page.keyboard.press('Tab')
    await page.keyboard.type(CUSTOMER.password)
    await page.keyboard.press('Enter')
    await pageReady(page, 'Checkout')

    // An empty submit lists the errors and moves focus to the summary.
    await tabTo(page, /^Place order/)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: 'Check 6 fields' })).toBeFocused()

    // The first link in the summary jumps to its field.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByLabel(/Name of the person/)).toBeFocused()
    for (const value of ['Maya Linden', '+63 917 555 0101', '4 Fern Lane', 'Quezon City', '1100']) {
      await page.keyboard.type(value)
      await page.keyboard.press('Tab')
    }
    await expect(page.getByLabel('Delivery date')).toBeFocused()
    await page.getByLabel('Delivery date').fill(deliveryDate())
    await tabTo(page, /^Place order/)
    await page.keyboard.press('Enter')

    await pageReady(page, 'Thank you. Your order is in.')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await tabTo(page, 'See your orders')
    await page.keyboard.press('Enter')
    await pageReady(page, 'Your orders')
    await expect(page.getByText('Order received').first()).toBeVisible()
    await expect(page.getByText(/Sunny Meadow Bunch/).first()).toBeVisible()
  })

  test('operator: confirm an order and change stock', async ({ page }) => {
    await signIn(page, OPERATOR, '/admin/orders?status=pending')
    await pageReady(page, 'Orders')
    await tabTo(page, /^Review/)
    await page.keyboard.press('Enter')
    await tabTo(page, /^Status of order/)
    await page.getByRole('combobox', { name: /^Status of order/ }).first().selectOption('confirmed')
    await tabTo(page, 'Update status')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: /is now confirmed/ })).toBeVisible()

    await page.goto('/admin/inventory')
    await pageReady(page, 'Inventory')
    const first = page.getByRole('spinbutton').first()
    const before = Number(await first.inputValue())
    await first.focus()
    await page.keyboard.press('ArrowUp')
    await expect(first).toHaveValue(String(before + 1))
    await expect(page.getByRole('status').filter({ hasText: /Stock updated/ }).first()).toBeVisible()
  })

  test('a customer who opens the dashboard is told why not, and can get back', async ({ page }) => {
    await signIn(page, CUSTOMER, '/admin')
    await pageReady(page, 'This page is for shop staff')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0)
  })
})
