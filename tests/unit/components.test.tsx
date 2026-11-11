/*
 * UI primitives: each state the guidelines ask for is reachable, named for
 * assistive technology and usable from the keyboard.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Drawer,
  EmptyState,
  ErrorState,
  ErrorSummary,
  Input,
  Modal,
  Pagination,
  PasswordInput,
  QuantityStepper,
  RadioGroup,
  Select,
  Table,
  Textarea,
  ToastProvider,
  ToastViewport,
  useToast,
} from '@/components/ui'
import { expectNoAxeViolations } from '../helpers/axe'

describe('Button', () => {
  it('fires on click, Enter and Space', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Add to cart</Button>)
    const button = screen.getByRole('button', { name: 'Add to cart' })
    await user.click(button)
    button.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
    expect(button).toHaveAttribute('type', 'button')
  })

  it('loading: stays focusable, says what it is doing and ignores presses', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button loading loadingLabel="Placing order" onClick={onClick}>
        Place order
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent('Placing order')
    await user.click(button)
    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveFocus()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('disabled: cannot be pressed', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Sold out
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Sold out' }))
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('a link that looks like a button is still a link', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/shop">Browse the shop</ButtonLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Browse the shop' })).toHaveAttribute('href', '/shop')
  })
})

describe('Input and friends', () => {
  it('ties the label, hint and error to the control', () => {
    render(<Input label="Email" hint="We only use it for your order." error="Enter your email address." defaultValue="" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter your email address. We only use it for your order.')
    expect(input).toBeRequired()
  })

  it('marks optional fields in the label and drops "required"', () => {
    render(<Textarea label="Note for the florist" optional defaultValue="" />)
    const field = screen.getByLabelText(/Note for the florist/)
    expect(field).not.toBeRequired()
    expect(screen.getByText('(optional)')).toBeInTheDocument()
  })

  it('has no error state until an error is given', () => {
    render(<Input label="Name" defaultValue="Maya" />)
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
  })

  it('disabled and loading states are exposed', () => {
    render(
      <>
        <Input label="Locked" disabled defaultValue="x" />
        <Input label="Saving" loading loadingLabel="Saving stock" defaultValue="4" />
      </>,
    )
    expect(screen.getByLabelText('Locked')).toBeDisabled()
    expect(screen.getByText('Saving stock')).toBeInTheDocument()
  })

  it('the password can be shown and hidden from the keyboard', async () => {
    const user = userEvent.setup()
    render(<PasswordInput label="Password" defaultValue="sample-petals" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    const toggle = screen.getByRole('button', { name: /Show password/ })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(input).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveFocus()
  })

  it('select, checkbox and radio group are labelled and keyboard operable', async () => {
    const user = userEvent.setup()
    function Controls() {
      const [choice, setChoice] = useState('paid')
      const [checked, setChecked] = useState(false)
      return (
        <>
          <Select label="Category" defaultValue="plants">
            <option value="bouquets">Bouquets</option>
            <option value="plants">Plants</option>
          </Select>
          <Checkbox label="Show low stock only" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <RadioGroup
            legend="What should the simulated payment do?"
            name="outcome"
            value={choice}
            onChange={setChoice}
            options={[
              { value: 'paid', label: 'Payment goes through' },
              { value: 'failed', label: 'Payment is declined' },
            ]}
          />
        </>
      )
    }
    render(<Controls />)
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('plants')
    const checkbox = screen.getByRole('checkbox', { name: 'Show low stock only' })
    checkbox.focus()
    await user.keyboard(' ')
    expect(checkbox).toBeChecked()
    const group = screen.getByRole('group', { name: 'What should the simulated payment do?' })
    within(group).getByRole('radio', { name: 'Payment goes through' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(within(group).getByRole('radio', { name: 'Payment is declined' })).toBeChecked()
  })
})

describe('QuantityStepper', () => {
  function Stepper({ max = 4, start = 1 }: { max?: number; start?: number }) {
    const [value, setValue] = useState(start)
    return <QuantityStepper itemName="Blush Peony Bouquet" value={value} max={max} onChange={setValue} maxReason={`Only ${max} left`} />
  }

  it('names its controls after the item', () => {
    render(<Stepper />)
    const group = screen.getByRole('group', { name: 'Quantity for Blush Peony Bouquet' })
    expect(within(group).getByRole('button', { name: 'Decrease quantity' })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: 'Increase quantity' })).toBeInTheDocument()
    expect(within(group).getByRole('spinbutton')).toHaveAccessibleName(/Blush Peony Bouquet/)
    expect(within(group).getByRole('spinbutton')).toHaveValue(1)
  })

  it('steps with the buttons and the arrow keys, and stops at the limits', async () => {
    const user = userEvent.setup()
    render(<Stepper max={3} />)
    const field = screen.getByRole('spinbutton')
    const increase = screen.getByRole('button', { name: /Increase/ })
    await user.click(increase)
    expect(field).toHaveValue(2)
    field.focus()
    await user.keyboard('{ArrowUp}')
    expect(field).toHaveValue(3)
    await user.keyboard('{ArrowUp}')
    expect(field).toHaveValue(3)
    expect(increase).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Only 3 left/)).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(field).toHaveValue(1)
    expect(screen.getByRole('button', { name: /Decrease/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('corrects a typed value to the nearest allowed number on blur', async () => {
    const user = userEvent.setup()
    render(<Stepper max={4} />)
    const field = screen.getByRole('spinbutton')
    await user.clear(field)
    await user.type(field, '25')
    await user.tab()
    expect(field).toHaveValue(4)
    await user.clear(field)
    await user.tab()
    expect(field).toHaveValue(4)
  })
})

describe('Modal', () => {
  function Example({ variant = 'confirm' as 'confirm' | 'form' | 'info', busy = false }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Delete product</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Delete Blush Peony Bouquet?"
          variant={variant}
          busy={busy}
          footer={
            <>
              <Button variant="danger">Delete product</Button>
              <Button variant="secondary" data-autofocus onClick={() => setOpen(false)}>
                Keep product
              </Button>
            </>
          }
        >
          <p>This removes it from the shop for good.</p>
        </Modal>
      </>
    )
  }

  it('opens as a named dialog with focus on the least destructive button', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Delete product' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Blush Peony Bouquet?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('button', { name: 'Keep product' })).toHaveFocus()
    await expectNoAxeViolations()
  })

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Delete product' }))
    const dialog = screen.getByRole('alertdialog')
    for (let presses = 0; presses < 8; presses += 1) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await user.tab({ shift: true })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('closes on Escape and returns focus to the control that opened it', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const opener = screen.getByRole('button', { name: 'Delete product' })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('does not close while busy', async () => {
    const user = userEvent.setup()
    render(<Example busy />)
    await user.click(screen.getByRole('button', { name: 'Delete product' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true')
  })

  it('a drawer is a dialog with its own close label', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Drawer open onClose={onClose} title="Your cart" side="trailing" closeLabel="Close cart">
        <p>Empty</p>
      </Drawer>,
    )
    expect(screen.getByRole('dialog', { name: 'Your cart' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close cart' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('Toast', () => {
  function Trigger() {
    const toast = useToast()
    return (
      <>
        <Button onClick={() => toast.success('Blush Peony Bouquet added to your cart')}>Add</Button>
        <Button onClick={() => toast.error("We couldn't save that. Try again.")}>Fail</Button>
        <Button onClick={() => [1, 2, 3, 4].forEach((n) => toast.show(`Message ${n}`))}>Many</Button>
      </>
    )
  }
  const setup = () =>
    render(
      <ToastProvider>
        <Trigger />
        <ToastViewport />
      </ToastProvider>,
    )

  it('has both live regions on the page before any toast appears', () => {
    setup()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('announces successes politely and errors at once', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('status')).toHaveTextContent('Blush Peony Bouquet added to your cart')
    await user.click(screen.getByRole('button', { name: 'Fail' }))
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save that. Try again.")
    await expectNoAxeViolations()
  })

  it('merges repeats, shows three at most and can be dismissed', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getAllByText('Blush Peony Bouquet added to your cart')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /Dismiss/ }))
    expect(screen.queryByText('Blush Peony Bouquet added to your cart')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Many' }))
    expect(screen.getAllByText(/^Message \d$/)).toHaveLength(3)
  })

  it('leaves after six seconds, but an error stays until dismissed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      setup()
      await user.click(screen.getByRole('button', { name: 'Add' }))
      await user.click(screen.getByRole('button', { name: 'Fail' }))
      await user.click(document.body)
      await vi.advanceTimersByTimeAsync(6500)
      await waitFor(() => expect(screen.queryByText('Blush Peony Bouquet added to your cart')).not.toBeInTheDocument())
      expect(screen.getByText("We couldn't save that. Try again.")).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('state blocks, cards and lists', () => {
  it('error block: says what happened, offers a retry and reports a failed retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <main>
          <ErrorState variant="offline" onRetry={onRetry} />
        </main>
      </MemoryRouter>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    await waitFor(() => expect(heading).toHaveFocus())
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
    await expectNoAxeViolations()
  })

  it('empty block: a heading, a sentence and one next step', async () => {
    render(
      <MemoryRouter>
        <main>
          <h1>Your cart</h1>
          <EmptyState heading="Your cart is empty" message="Have a look around the shop." action={<ButtonLink to="/shop">Browse the shop</ButtonLink>} />
        </main>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Your cart is empty' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    await expectNoAxeViolations()
  })

  it('a gallery of primitives in their states passes axe', async () => {
    render(
      <MemoryRouter>
        <main>
          <h1>Gallery</h1>
          <Alert variant="error" title="Something went wrong">
            Try again in a moment.
          </Alert>
          <Alert variant="success">Saved.</Alert>
          <Alert variant="warning" live={false}>
            Payment is simulated.
          </Alert>
          <Badge variant="attention">Only 3 left</Badge>
          <Badge variant="negative">Sold out</Badge>
          <Badge variant="positive">Delivered</Badge>
          <Card>
            <h2>Card</h2>
            <p>Body</p>
          </Card>
          <ErrorSummary errors={[{ fieldId: 'gallery-name', message: 'Enter a product name.' }]} />
          <Input id="gallery-name" label="Name" error="Enter a product name." defaultValue="" />
          <Input label="Price" adornment="$" hint="For example 24.50" defaultValue="" />
          <Input label="Disabled" disabled defaultValue="x" />
          <Textarea label="Description" optional defaultValue="" />
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete product</Button>
          <Button loading loadingLabel="Saving">
            Save
          </Button>
          <Button disabled>Sold out</Button>
          <Table caption="All products">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Blush Peony Bouquet</th>
                <td>₱1,900.00</td>
              </tr>
            </tbody>
          </Table>
          <Pagination page={2} pageCount={3} onPageChange={() => {}} label="Products" />
        </main>
      </MemoryRouter>,
    )
    await expectNoAxeViolations()
  })

  it('pagination names the current page and disables the ends', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={1} pageCount={3} onPageChange={onPageChange} label="Orders" />)
    const nav = screen.getByRole('navigation', { name: 'Orders pages' })
    expect(within(nav).getByText(/Page 1 of 3/)).toBeInTheDocument()
    await user.click(within(nav).getByRole('button', { name: /Next/ }))
    expect(onPageChange).toHaveBeenCalledWith(2)
    await user.click(within(nav).getByRole('button', { name: /Previous/ }))
    expect(onPageChange).toHaveBeenCalledTimes(1)
  })
})
