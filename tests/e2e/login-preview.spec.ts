import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
  { width: 2560, height: 944 },
  { width: 820, height: 1180 },
]) {
  test(`prévia completa e ampliação acessível no login em ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/login')
    const email = page.getByLabel('E-mail', { exact: true })
    await email.fill('pessoa@exemplo.test')
    const preview = page.locator('.login-product-showcase .product-preview > img')
    await expect(preview).toBeVisible()
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    const size = await preview.evaluate((image: HTMLImageElement) => ({
      width: image.getBoundingClientRect().width,
      height: image.getBoundingClientRect().height,
      ratio: image.naturalWidth / image.naturalHeight,
    }))
    expect(size.width / size.height).toBeCloseTo(size.ratio, 2)
    const figure = await page.locator('.login-product-showcase').boundingBox()
    if (!figure) throw new Error('A prévia precisa estar visível.')
    expect(figure.y + figure.height).toBeLessThan(viewport.height)
    if (viewport.width === 2560) expect(size.width).toBeGreaterThan(800)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true })

    const expand = page.getByRole('button', { name: 'Ampliar prévia' })
    await expand.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Conheça o Kanban do Orbit' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused()
    const enlarged = dialog.getByRole('img')
    expect(await enlarged.evaluate((image) => image.getBoundingClientRect().width)).toBeGreaterThan(size.width)
    const bounds = await dialog.boundingBox()
    if (!bounds) throw new Error('A prévia ampliada precisa estar visível.')
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
    await page.keyboard.press('Tab')
    const region = dialog.getByRole('region')
    await expect(region).toBeFocused()
    const overflow = await region.evaluate((element) => ({
      vertical: element.scrollHeight > element.clientHeight,
      horizontal: element.scrollWidth > element.clientWidth,
    }))
    if (overflow.vertical) {
      await page.keyboard.press('End')
      await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    }
    if (overflow.horizontal) {
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    }
    await page.screenshot({ path: testInfo.outputPath('expanded.png') })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(expand).toBeFocused()
    await expect(email).toHaveValue('pessoa@exemplo.test')
  })
}

test('login compacto mantém o formulário acessível no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar no workspace' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Ampliar prévia' })).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
