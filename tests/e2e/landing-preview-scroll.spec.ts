import { expect, test, type Page } from '@playwright/test'

const previewSelector = '.landing-hero-product'

async function openLanding(page: Page, reducedMotion: 'reduce' | 'no-preference' = 'no-preference') {
  await page.emulateMedia({ reducedMotion })
  await page.goto('/')
  await expect(page.locator(previewSelector)).toBeAttached()
  await page.evaluate(() => document.fonts.ready)
}

async function settledAppearance(page: Page) {
  const preview = page.locator(previewSelector)
  await expect.poll(() => preview.evaluate((element) => element.getAnimations().length)).toBe(0)
  return preview.evaluate((element) => {
    const style = getComputedStyle(element)
    return { transform: style.transform, opacity: Number(style.opacity) }
  })
}

test('prévia fica parada sem scroll e acompanha a rolagem nos dois sentidos', async ({ page }, testInfo) => {
  await openLanding(page)
  const initial = await settledAppearance(page)
  expect(initial.transform).not.toBe('none')

  // Exceeds the old autoplay duration: passing time alone must not move the preview.
  await page.waitForTimeout(3000)
  expect(await settledAppearance(page)).toEqual(initial)
  await page.screenshot({ path: testInfo.outputPath('preview-initial.png') })

  await page.mouse.wheel(0, 140)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  await expect.poll(async () => (await settledAppearance(page)).opacity).toBeGreaterThan(initial.opacity)
  const intermediate = await settledAppearance(page)
  expect(intermediate.opacity).toBeLessThan(1)
  expect(intermediate.transform).not.toBe(initial.transform)
  await page.screenshot({ path: testInfo.outputPath('preview-intermediate.png') })

  const distance = await page.locator('.landing-hero-perspective').evaluate((element) => element.getBoundingClientRect().top)
  await page.mouse.wheel(0, Math.ceil(distance))
  await expect(page.locator(previewSelector)).toHaveCSS('opacity', '1')
  const complete = await settledAppearance(page)
  expect(complete.transform).toBe('matrix(1, 0, 0, 1, 0, 0)')
  await page.screenshot({ path: testInfo.outputPath('preview-complete.png') })

  const distanceToTop = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, -Math.ceil(distanceToTop))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect.poll(() => settledAppearance(page)).toEqual(initial)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('movimento reduzido mantém a prévia estática, inclusive ao alterar a preferência', async ({ page }) => {
  await openLanding(page, 'reduce')
  expect(await settledAppearance(page)).toEqual({ transform: 'none', opacity: 1 })
  await page.mouse.wheel(0, 140)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  expect(await settledAppearance(page)).toEqual({ transform: 'none', opacity: 1 })

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(async () => (await settledAppearance(page)).opacity).toBeLessThan(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await settledAppearance(page)).toEqual({ transform: 'none', opacity: 1 })
})

test('prévia recalcula a entrada ao redimensionar para tablet', async ({ page }) => {
  await openLanding(page)
  await page.setViewportSize({ width: 820, height: 1180 })
  const initial = await settledAppearance(page)
  await page.mouse.wheel(0, 140)
  await expect.poll(async () => (await settledAppearance(page)).opacity).toBeGreaterThan(initial.opacity)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByRole('link', { name: 'Conhecer os recursos', exact: true }).click()
  await expect(page.locator(previewSelector)).toHaveCSS('opacity', '1')
})
