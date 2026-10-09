import { expect, test, type Page } from '@playwright/test'

async function openLanding(page: Page, reducedMotion: 'reduce' | 'no-preference' = 'no-preference') {
  await page.emulateMedia({ reducedMotion })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Grandes ideias. Na mesma órbita.', exact: true }),
  ).toBeVisible()
}

async function expectAnchorSettled(page: Page, selector: string) {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) => {
        const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop)
        const target = Math.max(
          0,
          Math.min(
            window.scrollY + element.getBoundingClientRect().top - margin,
            document.documentElement.scrollHeight - window.innerHeight,
          ),
        )
        return Math.abs(window.scrollY - target)
      }),
    )
    .toBeLessThan(2)
  const headerBottom = await page.getByRole('banner').evaluate((element) => element.getBoundingClientRect().bottom)
  const sectionTop = await page.locator(selector).evaluate((element) => element.getBoundingClientRect().top)
  expect(sectionTop).toBeGreaterThanOrEqual(headerBottom - 1)
}

test('rolagem suave conclui a navegação sob o header fixo e atualiza a seção ativa', async ({ page }) => {
  await openLanding(page)
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'smooth')
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  const dialog = page.getByRole('dialog')
  const navigation = (await dialog.isVisible()) ? dialog : page.getByRole('banner')
  await navigation.locator('a[href="#produto"]').click()
  await expect(page).toHaveURL((url) => url.hash === '#produto')
  await expect(dialog).not.toBeVisible()
  await expectAnchorSettled(page, '#produto')
  await expect(page.getByRole('banner').locator('a[href="#produto"]')).toHaveAttribute('aria-current', 'location')
  await expect(page.getByRole('banner')).toHaveAttribute('data-scrolled', 'true')
})

test('rolagem manual atualiza navegação e revela conteúdo uma única vez', async ({ page }) => {
  await openLanding(page)
  const step = page.locator('#como-funciona .workflow-interactive')
  await expect(step).toHaveAttribute('data-reveal', 'pending')
  const header = page.getByRole('banner')
  for (const selector of ['#como-funciona', '#produto']) {
    const delta = await page.locator(selector).evaluate((element) => element.getBoundingClientRect().top)
    await page.mouse.move(100, 300)
    await page.mouse.wheel(0, Math.round(delta))
    await expect(header.locator(`a[href="${selector}"]`)).toHaveAttribute('aria-current', 'location')
    await expect(header.locator('a[aria-current="location"]')).toHaveCount(1)
    if (selector === '#como-funciona') {
      await expect(step).toHaveAttribute('data-reveal', 'visible')
      await expect(step).toHaveCSS('opacity', '1')
    }
  }
  const distanceToTop = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, -Math.ceil(distanceToTop))
  await expect(header).toHaveAttribute('data-scrolled', 'false')
  await expect(header.locator('a[aria-current="location"]')).toHaveCount(0)
  await expect(step).toHaveAttribute('data-reveal', 'visible')
})

test('movimento reduzido mantém conteúdo visível e usa rolagem imediata', async ({ page }) => {
  await openLanding(page, 'reduce')
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
  const invisibleContent = await page.getByRole('main').evaluate((main) => {
    return [...main.querySelectorAll('h2, h3, a, button, summary')]
      .filter((element) => {
        if (element.closest('[hidden]')) return false
        for (let ancestor: Element | null = element; ancestor && ancestor !== main; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor)
          if (Number(style.opacity) < 1 || style.visibility === 'hidden') return true
        }
        return false
      })
      .map((element) => element.textContent?.trim())
  })
  expect(invisibleContent).toEqual([])
  await page.getByRole('link', { name: 'Conhecer os recursos', exact: true }).click()
  await expectAnchorSettled(page, '#recursos')
  await expect(page.getByRole('banner').locator('a[href="#recursos"]')).toHaveAttribute('aria-current', 'location')
})

test('alterar preferência para reduzir movimento revela todo conteúdo pendente', async ({ page }) => {
  await openLanding(page)
  await expect.poll(() => page.locator('[data-reveal="pending"]').count()).toBeGreaterThan(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
  await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0)
  const opacity = await page
    .locator('[data-reveal]')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity))
  expect(opacity.length).toBeGreaterThan(0)
  expect(opacity.every((value) => value === '1')).toBe(true)
})

test('tabulação revela os controles antes de receberem foco', async ({ page }) => {
  await openLanding(page)
  await expect.poll(() => page.locator('[data-reveal="pending"]').count()).toBeGreaterThan(0)
  let reachedFaq = false
  let focusedReveal = false
  const focusableCount = await page
    .locator('a[href], button, input, select, textarea, summary, [tabindex]')
    .evaluateAll(
      (elements) =>
        elements.filter((element) => {
          return (
            element instanceof HTMLElement &&
            element.tabIndex >= 0 &&
            !element.matches(':disabled') &&
            !element.closest('[hidden]') &&
            element.getClientRects().length > 0
          )
        }).length,
    )
  for (let index = 0; index <= focusableCount; index += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement)) return { revealed: false, invisible: [], faq: false }
      const invisible: string[] = []
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        if (!ancestor.hasAttribute('data-reveal')) continue
        const style = getComputedStyle(ancestor)
        if (Number(style.opacity) < 0.99 || style.visibility === 'hidden') invisible.push(ancestor.tagName)
      }
      return {
        revealed: Boolean(element.closest('[data-reveal]')),
        invisible,
        faq: element.tagName === 'SUMMARY' && Boolean(element.closest('#duvidas')),
      }
    })
    expect(focused.invisible).toEqual([])
    focusedReveal ||= focused.revealed
    if (focused.faq) {
      reachedFaq = true
      break
    }
  }
  expect(focusedReveal).toBe(true)
  expect(reachedFaq).toBe(true)
})
