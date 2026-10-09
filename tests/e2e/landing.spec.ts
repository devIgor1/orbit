import { expect, test, type Page } from '@playwright/test'

const sections = ['#recursos', '#como-funciona', '#produto', '#duvidas']

async function openLanding(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Grandes ideias. Na mesma órbita.', exact: true }),
  ).toBeVisible()
}

test('landing pública funciona sem sessão nem consultas de dados privados', async ({ page }, testInfo) => {
  const failures: string[] = []
  const businessRequests: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/rest/v1/')) businessRequests.push(url.pathname)
  })
  await openLanding(page)
  await expect(page).toHaveURL(/\/$/)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Grandes ideias\.\s*Na mesma órbita\./)
  await expect(page.getByRole('main')).toBeVisible()
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  for (const preview of await page.locator('main img:visible').all()) {
    await preview.scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        preview.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
      )
      .toBe(true)
  }
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('landing-public.png'), fullPage: true })
  expect(businessRequests).toEqual([])
  expect(failures).toEqual([])
})

test('ações de acesso direcionam para o login real', async ({ page }) => {
  await openLanding(page)
  const accessLinks = page.getByRole('link', { name: 'Acessar workspace', exact: true })
  await expect(accessLinks.first()).toBeVisible()
  for (const link of await accessLinks.all()) await expect(link).toHaveAttribute('href', '/login')
  await accessLinks.first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
})

test('navegação por seções mantém destinos reais e fecha o menu mobile', async ({ page }) => {
  await openLanding(page)
  for (const section of sections) {
    const menu = page.getByRole('button', { name: 'Abrir menu', exact: true })
    if (await menu.isVisible()) await menu.click()
    const dialog = page.getByRole('dialog')
    const navigation = (await dialog.isVisible()) ? dialog : page.getByRole('banner')
    const link = navigation.locator(`a[href="${section}"]`)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL((url) => url.hash === section)
    await expect(page.locator(section)).toBeInViewport()
    await expect(dialog).not.toBeVisible()
  }
})

test('dúvidas abrem e fecham pelo teclado com estado acessível', async ({ page }) => {
  await openLanding(page)
  const faq = page.locator('#duvidas')
  const details = faq.locator('details').first()
  const question = details.locator('summary')
  const answer = details.locator('p').first()
  await question.scrollIntoViewIfNeeded()
  await expect(details).not.toHaveAttribute('open')
  await expect(answer).not.toBeVisible()
  await question.focus()
  await page.keyboard.press('Enter')
  await expect(details).toHaveAttribute('open', '')
  await expect(answer).toBeVisible()
  await page.keyboard.press('Space')
  await expect(details).not.toHaveAttribute('open')
  await expect(answer).not.toBeVisible()
})

test('carrossel oferece navegação pelo teclado sem depender de movimento automático', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openLanding(page)
  const product = page.locator('#produto')
  await product.scrollIntoViewIfNeeded()
  const screenshot = product.locator('img:visible').first()
  await expect(screenshot).toBeVisible()
  await expect
    .poll(() =>
      screenshot.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
    )
    .toBe(true)
  const initialSource = await screenshot.getAttribute('src')
  const initialDescription = await screenshot.getAttribute('alt')
  const announcement = product.getByRole('status')
  const initialAnnouncement = await announcement.innerText()
  expect(initialSource).toBeTruthy()
  expect(initialDescription).toBeTruthy()
  const next = page.getByRole('button', { name: 'Próxima visualização', exact: true })
  await next.focus()
  await page.keyboard.press('Enter')
  await expect(screenshot).not.toHaveAttribute('src', initialSource ?? '')
  await expect(screenshot).not.toHaveAttribute('alt', initialDescription ?? '')
  await expect
    .poll(() =>
      screenshot.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
    )
    .toBe(true)
  await expect(announcement).not.toHaveText(initialAnnouncement)
  await page.getByRole('button', { name: 'Visualização anterior', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(screenshot).toHaveAttribute('src', initialSource ?? '')
  await expect(screenshot).toHaveAttribute('alt', initialDescription ?? '')
  await expect(announcement).toHaveText(initialAnnouncement)
})

test('menu mobile pode ser fechado por teclado e devolve o foco', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'O menu colapsado pertence ao layout de celular.')
  await openLanding(page)
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true })
  await menu.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(menu).toBeFocused()
})

test('link direto abre a seção e a marca retorna ao início da página', async ({ page }) => {
  await page.goto('/#produto')
  await expect(page.locator('#produto')).toBeInViewport()
  await page.getByRole('banner').getByRole('link', { name: 'Orbit — início', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Grandes ideias. Na mesma órbita.', exact: true }),
  ).toBeInViewport()
})
