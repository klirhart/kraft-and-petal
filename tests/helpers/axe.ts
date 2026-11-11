import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * Runs axe on the rendered page with the WCAG 2.2 A and AA rule sets.
 * jsdom has no layout or painting, so color contrast is checked from the
 * tokens (tests/unit/tokens.test.ts) and in a real browser (tests/e2e).
 */
export async function expectNoAxeViolations(root: Element = document.body): Promise<void> {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help}\n${violation.nodes.map((node) => `    ${node.html.slice(0, 160)}`).join('\n')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}
