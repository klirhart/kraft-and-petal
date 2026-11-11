import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const CUSTOMER = { email: 'maya@example.com', password: 'sample-petals' }
export const OPERATOR = { email: 'olive@kraftandpetal.example', password: 'sample-twine' }

/** axe with the WCAG 2.2 A and AA rules, color contrast included. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help}\n${violation.nodes
        .map((node) => `    ${node.html.slice(0, 160)}${node.failureSummary ? `\n      ${node.failureSummary.split('\n').join(' ')}` : ''}`)
        .join('\n')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}

export async function pageReady(page: Page, heading: string | RegExp): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  await expect(page.locator('main')).not.toHaveAttribute('aria-busy', 'true')
}

export async function signIn(page: Page, account: { email: string; password: string }, next = '/'): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

/** Presses Tab until the focused element matches, and fails if it never does. */
export async function tabTo(page: Page, name: string | RegExp, limit = 40): Promise<void> {
  for (let presses = 0; presses < limit; presses += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const element = document.activeElement
      if (!element) return ''
      const labelledBy = element.getAttribute('aria-labelledby')
      const label =
        element.getAttribute('aria-label') ??
        (labelledBy ? document.getElementById(labelledBy)?.textContent : null) ??
        (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent : null) ??
        element.textContent
      return (label ?? '').replace(/\s+/g, ' ').trim()
    })
    if (typeof name === 'string' ? focused === name : name.test(focused)) return
  }
  throw new Error(`Tab never reached ${name}`)
}

/** The focused element must show a visible focus indicator. */
export async function expectVisibleFocus(page: Page): Promise<void> {
  const outline = await page.evaluate(() => {
    const element = document.activeElement
    if (!element || element === document.body) return null
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(outline, 'something has focus').not.toBeNull()
  expect(outline?.style, 'focus outline style').not.toBe('none')
  expect(outline?.width, 'focus outline width').toBeGreaterThanOrEqual(2)
}

export function deliveryDate(daysAhead = 3): string {
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}
