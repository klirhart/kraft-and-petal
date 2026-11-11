/*
 * Every route: renders its page, has one h1 and a main landmark, sets the
 * document title, passes axe, and shows its loading, error and empty states.
 * Guards: signed-out visitors are sent to sign in, customers cannot open the
 * dashboard, and the dashboard requests no data for them.
 */
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { data, resetSampleData } from '@/lib/data'
import { DataError } from '@/lib/errors'
import { expectNoAxeViolations } from '../helpers/axe'
import { currentLocation, renderApp } from '../helpers/renderApp'
import { CUSTOMER, OPERATOR } from '../helpers/sampleBackend'

const WAIT = { timeout: 5000 }

async function pageHeading(name: string | RegExp) {
  return screen.findByRole('heading', { level: 1, name }, WAIT)
}

/** The alert holding `text`. The (empty) toast region is an alert too, so a bare role query is ambiguous. */
async function findAlert(text: RegExp): Promise<HTMLElement> {
  return waitFor(() => {
    const alert = screen.getAllByRole('alert').find((element) => text.test(element.textContent ?? ''))
    if (!alert) throw new Error(`No alert matching ${text}`)
    return alert
  }, WAIT)
}

async function expectAccessiblePage(title: string) {
  await waitFor(() => expect(document.querySelector('main')).not.toHaveAttribute('aria-busy'), WAIT)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
  expect(document.title).toBe(`${title} \u2013 Kraft & Petal`)
  await expectNoAxeViolations()
}

beforeEach(async () => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  await resetSampleData()
  await data.auth.signOut()
  document.title = ''
})

describe('public routes', () => {
  it.each([
    ['/', /Flowers wrapped by hand/, 'Home'],
    ['/shop', 'Shop', 'Shop'],
    ['/shop?category=plants', 'Shop', 'Shop'],
    ['/shop/blush-peony-bouquet', 'Blush Peony Bouquet', 'Blush Peony Bouquet'],
    ['/cart', 'Your cart', 'Your cart'],
    ['/about', /About/, 'About'],
    ['/contact', 'Contact', 'Contact'],
    ['/login', 'Sign in', 'Sign in'],
    ['/signup', 'Create account', 'Create account'],
    ['/no-such-page', /can't find that page/, 'Page not found'],
  ])('%s is accessible', async (path, heading, title) => {
    renderApp(path)
    await pageHeading(heading)
    await expectAccessiblePage(title)
  })

  it('moves focus to the page heading after navigation', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await pageHeading(/Flowers wrapped by hand/)
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'About' }))
    const heading = await pageHeading(/About/)
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('/shop lists products with described images and filters by category from the URL', async () => {
    renderApp('/shop?category=plants')
    await pageHeading('Shop')
    expect(await screen.findByRole('heading', { name: 'Little Monstera' }, WAIT)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Blush Peony Bouquet' })).not.toBeInTheDocument()
    const categories = within(screen.getByRole('navigation', { name: 'Categories' }))
    expect(categories.getByRole('link', { name: 'Plants' })).toHaveAttribute('aria-current', 'true')
    // The header's link to the same category is marked as the current page.
    const main = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(main.getByRole('link', { name: 'Plants' })).toHaveAttribute('aria-current', 'page')
    expect(main.getByRole('link', { name: 'Shop all' })).not.toHaveAttribute('aria-current')
    for (const image of screen.getAllByRole('img')) expect(image).toHaveAccessibleName()
  })

  it('a sold-out product cannot be added to the cart', async () => {
    renderApp('/shop/windowsill-succulent')
    await pageHeading('Windowsill Succulent')
    expect(screen.getAllByText('Sold out').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Add to cart/ })).not.toBeInTheDocument()
  })
})

describe('shopping from the cards, the product page and the cart drawer', () => {
  it('the product page has a breadcrumb back to its category', async () => {
    renderApp('/shop/blush-peony-bouquet')
    await pageHeading('Blush Peony Bouquet')
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(crumbs.getByRole('link', { name: 'Bouquets' })).toHaveAttribute('href', '/shop?category=bouquets')
    expect(crumbs.getByText('Blush Peony Bouquet').closest('li')).toHaveAttribute('aria-current', 'page')
  })

  it('quick add puts one in the cart without leaving the list, and the drawer shows it with a stepper', async () => {
    const user = userEvent.setup()
    renderApp('/shop')
    await pageHeading('Shop')
    await user.click(await screen.findByRole('button', { name: 'Add to cart: Blush Peony Bouquet' }, WAIT))
    await user.click(await screen.findByRole('button', { name: /^Cart, 1 item/ }, WAIT))
    const drawer = within(await screen.findByRole('dialog', { name: /Your cart/ }, WAIT))
    expect(await drawer.findByRole('link', { name: 'Blush Peony Bouquet' }, WAIT)).toBeInTheDocument()
    expect(drawer.getByRole('button', { name: /Increase quantity/ })).toBeInTheDocument()
    expect(drawer.getByText('Subtotal')).toBeInTheDocument()
    expect(drawer.getByRole('link', { name: 'Checkout' })).toHaveAttribute('href', '/checkout')
    expect(drawer.getByText(/wrapped by hand on the day it leaves the shop/)).toBeInTheDocument()
    expect(currentLocation()).toBe('/shop')
    await expectNoAxeViolations()
  })

  it('a note written in the cart is waiting in the checkout form', async () => {
    const user = userEvent.setup()
    await data.auth.signIn({ email: CUSTOMER.email, password: CUSTOMER.password })
    renderApp('/shop/blush-peony-bouquet')
    await pageHeading('Blush Peony Bouquet')
    await user.click(await screen.findByRole('button', { name: 'Add to cart' }, WAIT))
    await user.click(await screen.findByRole('button', { name: /^Cart, 1 item/ }, WAIT))
    const drawer = within(await screen.findByRole('dialog', { name: /Your cart/ }, WAIT))
    await user.click(await drawer.findByText('Add a note to your order', {}, WAIT))
    await user.type(drawer.getByRole('textbox', { name: /Note for the florist/ }), 'Leave it with the neighbour')
    await user.click(drawer.getByRole('link', { name: 'Checkout' }))
    await pageHeading('Checkout')
    expect(await screen.findByRole('textbox', { name: /Note for the florist/ }, WAIT)).toHaveValue(
      'Leave it with the neighbour',
    )
  })
})

describe('route states', () => {
  it('loading: the main region is busy and names what is loading', async () => {
    vi.spyOn(data.catalog, 'listProducts').mockReturnValue(new Promise(() => {}))
    renderApp('/shop')
    await pageHeading('Shop')
    await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true'), WAIT)
    expect(await screen.findByText(/Loading/, {}, WAIT)).toBeInTheDocument()
    await expectNoAxeViolations()
  })

  it('error: a network failure offers "Try again", which loads the page', async () => {
    const user = userEvent.setup()
    const listProducts = vi.spyOn(data.catalog, 'listProducts').mockRejectedValueOnce(new DataError('network', 'offline'))
    renderApp('/shop')
    const retry = await screen.findByRole('button', { name: 'Try again' }, WAIT)
    await expectNoAxeViolations()
    await user.click(retry)
    expect(await screen.findByRole('heading', { name: 'Blush Peony Bouquet' }, WAIT)).toBeInTheDocument()
    expect(listProducts).toHaveBeenCalledTimes(2)
  })

  it('error: an unknown product shows the not-found state with a way back', async () => {
    renderApp('/shop/not-a-product')
    await pageHeading(/can't find/)
    expect(screen.getByRole('main').querySelector('a[href="/shop"]')).not.toBeNull()
    await expectNoAxeViolations()
  })

  it('empty: a category with nothing in it says so and links to everything', async () => {
    vi.spyOn(data.catalog, 'listProducts').mockResolvedValue([])
    renderApp('/shop?category=plants')
    await pageHeading('Shop')
    await waitFor(() => expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy'), WAIT)
    expect(screen.queryByRole('button', { name: /Add to cart/ })).not.toBeInTheDocument()
    expect(screen.getByRole('main').querySelectorAll('h2, h3').length).toBeGreaterThan(0)
    await expectNoAxeViolations()
  })

  it('empty: an empty cart points to the shop', async () => {
    renderApp('/cart')
    await pageHeading('Your cart')
    expect(await screen.findByRole('heading', { name: /cart is empty/i }, WAIT)).toBeInTheDocument()
    expect(screen.getByRole('main').querySelector('a[href="/shop"]')).not.toBeNull()
  })

  it('empty: a new customer has no orders yet', async () => {
    await data.auth.signUp({ email: 'new@example.com', password: 'longenough', fullName: 'New Person' })
    renderApp('/account/orders')
    await pageHeading('Your orders')
    expect(await screen.findByRole('heading', { name: /No orders yet/i }, WAIT)).toBeInTheDocument()
    await expectAccessiblePage('Your orders')
  })
})

describe('guards', () => {
  it.each(['/checkout', '/account/orders', '/admin', '/admin/products'])(
    'signed out, %s goes to sign in and remembers where to return',
    async (path) => {
      renderApp(path)
      await pageHeading('Sign in')
      expect(currentLocation()).toBe(`/login?next=${encodeURIComponent(path)}`)
    },
  )

  it('returns to the requested page after signing in', async () => {
    const user = userEvent.setup()
    renderApp('/account/orders')
    await pageHeading('Sign in')
    await user.type(screen.getByLabelText('Email'), CUSTOMER.email)
    await user.type(screen.getByLabelText('Password'), CUSTOMER.password)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await pageHeading('Your orders')
    expect(currentLocation()).toBe('/account/orders')
  })

  it('a wrong password explains itself in an alert without clearing the email', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await pageHeading('Sign in')
    await user.type(screen.getByLabelText('Email'), CUSTOMER.email)
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await findAlert(/email and password don't match/i)).toBeVisible()
    expect(screen.getByLabelText('Email')).toHaveValue(CUSTOMER.email)
    await expectNoAxeViolations()
  })

  it('signed in, /login goes home', async () => {
    await data.auth.signIn(CUSTOMER)
    renderApp('/login')
    await pageHeading(/Flowers wrapped by hand/)
    expect(currentLocation()).toBe('/')
  })

  it('a customer on /admin sees the not-allowed state and no dashboard data is requested', async () => {
    const calls = [
      vi.spyOn(data.admin, 'listOrders'),
      vi.spyOn(data.admin, 'listProducts'),
    ]
    await data.auth.signIn(CUSTOMER)
    for (const path of ['/admin', '/admin/orders', '/admin/inventory']) {
      const view = renderApp(path)
      await pageHeading('This page is for shop staff')
      expect(screen.queryByRole('navigation', { name: 'Admin' })).not.toBeInTheDocument()
      await expectNoAxeViolations()
      view.unmount()
    }
    for (const call of calls) expect(call).not.toHaveBeenCalled()
  })
})

describe('customer routes', () => {
  beforeEach(async () => {
    await data.auth.signIn(CUSTOMER)
  })

  it('/account/orders lists the customer\u2019s orders with a text status', async () => {
    renderApp('/account/orders')
    await pageHeading('Your orders')
    expect((await screen.findAllByText('Being arranged', {}, WAIT)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0)
    await expectAccessiblePage('Your orders')
  })

  it('/checkout with an empty cart sends the customer to the shop', async () => {
    renderApp('/checkout')
    await pageHeading('Checkout')
    await waitFor(() => expect(screen.getByRole('main').querySelector('a[href="/shop"]')).not.toBeNull(), WAIT)
    expect(screen.queryByRole('button', { name: /Place order/ })).not.toBeInTheDocument()
    await expectAccessiblePage('Checkout')
  })

  it('/checkout: errors are listed, linked to their fields, and the order is placed once fixed', async () => {
    const user = userEvent.setup()
    const product = (await data.catalog.getProductBySlug('sunny-meadow-bunch'))!
    window.localStorage.setItem('kraft-petal.cart.v1', JSON.stringify([{ productId: product.id, quantity: 2 }]))
    renderApp('/checkout')
    await pageHeading('Checkout')
    const submit = await screen.findByRole('button', { name: 'Place order, ₱2,800.00' }, WAIT)
    expect(screen.getByText(/Payment is simulated/)).toBeInTheDocument()
    await expectAccessiblePage('Checkout')

    await user.click(submit)
    const summary = await findAlert(/Check 6 fields/)
    const street = screen.getByLabelText('Street address')
    expect(street).toHaveAttribute('aria-invalid', 'true')
    expect(street).toHaveAccessibleDescription(/Enter your delivery address/)
    await expectNoAxeViolations()

    await user.click(within(summary).getByRole('link', { name: /Enter your delivery address/ }))
    expect(street).toHaveFocus()

    await user.type(screen.getByLabelText(/Name of the person/), 'Maya Linden')
    await user.type(screen.getByLabelText('Phone number'), '+63 917 555 0101')
    await user.type(street, '4 Fern Lane')
    await user.type(screen.getByLabelText('Town or city'), 'Quezon City')
    await user.type(screen.getByLabelText('Postal code'), '1100')
    const date = screen.getByLabelText('Delivery date')
    await user.type(date, date.getAttribute('min') ?? '')
    await user.click(screen.getByRole('button', { name: 'Place order, ₱2,800.00' }))

    const thanks = await pageHeading('Thank you. Your order is in.')
    await waitFor(() => expect(thanks).toHaveFocus())
    expect(window.localStorage.getItem('kraft-petal.cart.v1')).toBe('[]')
    const orders = await data.orders.listMine()
    expect(orders[0]?.total_cents).toBe(product.price_cents * 2)
    await expectNoAxeViolations()
  })

  it('/checkout: a declined payment places no order and keeps what was typed', async () => {
    const user = userEvent.setup()
    const product = (await data.catalog.getProductBySlug('sunny-meadow-bunch'))!
    const before = (await data.orders.listMine()).length
    window.localStorage.setItem('kraft-petal.cart.v1', JSON.stringify([{ productId: product.id, quantity: 1 }]))
    renderApp('/checkout')
    await screen.findByRole('button', { name: /Place order/ }, WAIT)
    await user.type(screen.getByLabelText(/Name of the person/), 'Maya Linden')
    await user.type(screen.getByLabelText('Phone number'), '+63 917 555 0101')
    await user.type(screen.getByLabelText('Street address'), '4 Fern Lane')
    await user.type(screen.getByLabelText('Town or city'), 'Quezon City')
    await user.type(screen.getByLabelText('Postal code'), '1100')
    const date = screen.getByLabelText('Delivery date')
    await user.type(date, date.getAttribute('min') ?? '')
    await user.click(screen.getByLabelText('Payment is declined'))
    await user.click(screen.getByRole('button', { name: /Place order/ }))

    expect(await screen.findByText(/payment didn't go through/i, {}, WAIT)).toBeInTheDocument()
    expect(screen.getByLabelText('Street address')).toHaveValue('4 Fern Lane')
    expect(await data.orders.listMine()).toHaveLength(before)
  })
})

describe('operator routes', () => {
  beforeEach(async () => {
    await data.auth.signIn(OPERATOR)
  })

  it.each([
    ['/admin', 'Overview', 'Dashboard overview'],
    ['/admin/products', 'Products', 'Products'],
    ['/admin/orders', 'Orders', 'Orders'],
    ['/admin/inventory', 'Inventory', 'Inventory'],
  ])('%s is accessible', async (path, heading, title) => {
    renderApp(path)
    await pageHeading(heading)
    expect(await screen.findByRole('navigation', { name: 'Admin' }, WAIT)).toBeInTheDocument()
    await expectAccessiblePage(title)
  })

  it('/admin/products: the form asks for an image description', async () => {
    const user = userEvent.setup()
    renderApp('/admin/products')
    await pageHeading('Products')
    await user.click((await screen.findAllByRole('button', { name: 'Add product' }, WAIT))[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Add product' }, WAIT)
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveFocus())
    await expectNoAxeViolations()
    await user.click(within(dialog).getByRole('button', { name: 'Save product' }))
    expect(await within(dialog).findByText(/Check \d+ fields/, {}, WAIT)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Image description')).toHaveAttribute('aria-invalid', 'true')
    await user.keyboard('{Escape}')
  })

  it('/admin/orders: an order status can be changed', async () => {
    const user = userEvent.setup()
    renderApp('/admin/orders?status=pending')
    await pageHeading('Orders')
    const pending = (await data.admin.listOrders()).find((order) => order.status === 'pending')!
    await user.click((await screen.findAllByRole('button', { name: /Review/ }, WAIT))[0]!)
    const select = (await screen.findAllByRole('combobox', { name: /Status of order/ }, WAIT))[0]!
    await user.selectOptions(select, 'confirmed')
    await user.click(screen.getAllByRole('button', { name: /Update status/ })[0]!)
    await waitFor(async () => {
      const updated = (await data.admin.listOrders()).find((order) => order.id === pending.id)
      expect(updated?.status).toBe('confirmed')
    }, WAIT)
  })

  it('error: a dashboard page that fails to load offers "Try again"', async () => {
    vi.spyOn(data.admin, 'listProducts').mockRejectedValue(new DataError('network', 'offline'))
    renderApp('/admin/inventory')
    await pageHeading('Inventory')
    expect(await screen.findByRole('button', { name: 'Try again' }, WAIT)).toBeInTheDocument()
    await expectNoAxeViolations()
  })

  it('empty: no orders for a filter says so', async () => {
    vi.spyOn(data.admin, 'listOrders').mockResolvedValue([])
    renderApp('/admin/orders')
    await pageHeading('Orders')
    await waitFor(() => expect(screen.getByRole('main').querySelectorAll('h2').length).toBeGreaterThan(0), WAIT)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await expectNoAxeViolations()
  })
})
