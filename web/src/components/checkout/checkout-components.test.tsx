import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { BillingForm } from './BillingForm'
import { CheckoutQuestions, type CheckoutAnswers } from './CheckoutQuestions'
import { OrderSummary } from './OrderSummary'
import { PaymentMethods } from './PaymentMethods'

vi.mock('next-intl', () => {
  const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
  const checkout = messages.checkout
  const t = (key: string, params?: Record<string, unknown>) => {
    let value = checkout[key]
    if (value === undefined) return key
    if (params) value = value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
    return value
  }
  return { useTranslations: () => t }
})

vi.mock('next/image', () => ({
  default: (props: { src: string; alt?: string }) => (
    <img src={props.src} alt={props.alt ?? ''} />
  ),
}))

const noop = () => {}
const event = {
  id: 'evt_1',
  name: 'Anh Trai Say Hi',
  date: new Date('2026-09-15T18:00:00').getTime(),
  city: 'Hà Nội',
}

describe('OrderSummary', () => {
  it('renders the selected ticket types with name, quantity and price', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={[]}
        selectedTickets={[{ name: 'VIP', qty: 2, price: 300000 }]}
        subtotal={600000}
        discount={0}
        total={600000}
        voucherCode=""
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(html).toContain('Vé VIP')
    expect(html).toContain('2 x 300.000 ₫')
    expect(html).toContain('Tổng thanh toán')
  })

  it('renders a seating ticket line when seat checkout is used', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={['A1', 'A2']}
        selectedTickets={[]}
        subtotal={300000}
        discount={0}
        total={300000}
        voucherCode=""
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(html).toContain('Vé ghế ngồi (Seating)')
    expect(html).toContain('Số ghế: A1, A2')
  })

  it('shows the discount row and reduced total when a discount applies', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={[]}
        selectedTickets={[{ name: 'Standard', qty: 1, price: 150000 }]}
        subtotal={150000}
        discount={30000}
        total={120000}
        voucherCode=""
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(html).toContain('Giảm giá khuyến mãi')
    expect(html).toContain('-30.000 ₫')
    expect(html).toContain('120.000 ₫')
  })

  it('disables payment when no ticket quantity is selected', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={[]}
        selectedTickets={[]}
        subtotal={0}
        discount={0}
        total={0}
        voucherCode=""
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(html).toMatch(/<button[^>]*disabled/)
  })

  it('disables payment and shows processing text while a booking is in flight', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={[]}
        selectedTickets={[{ name: 'VIP', qty: 1, price: 300000 }]}
        subtotal={300000}
        discount={0}
        total={300000}
        voucherCode=""
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={true}
        seatPrice={150000}
      />,
    )
    expect(html).toMatch(/<button[^>]*disabled/)
    expect(html).toContain('Đang tạo giao dịch...')
  })

  it('surfaces a voucher error and success message to the user', () => {
    const withError = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={[]}
        selectedTickets={[{ name: 'Standard', qty: 1, price: 150000 }]}
        subtotal={150000}
        discount={0}
        total={150000}
        voucherCode="BAD"
        setVoucherCode={noop}
        voucherError="Mã giảm giá không hợp lệ hoặc đã hết hạn."
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(withError).toContain('Mã giảm giá không hợp lệ hoặc đã hết hạn.')

    const withSuccess = renderToStaticMarkup(
      <OrderSummary
        event={null}
        selectedSeats={[]}
        selectedTickets={[{ name: 'Standard', qty: 1, price: 150000 }]}
        subtotal={150000}
        discount={0}
        total={150000}
        voucherCode="EVENTING20"
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess="Đã áp dụng mã giảm giá."
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(withSuccess).toContain('Đã áp dụng mã giảm giá.')
  })

  it('renders event details from the resolved event', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        event={event as never}
        selectedSeats={[]}
        selectedTickets={[{ name: 'Standard', qty: 1, price: 150000 }]}
        subtotal={150000}
        discount={0}
        total={150000}
        voucherCode=""
        setVoucherCode={noop}
        voucherError=""
        voucherSuccess=""
        onApplyVoucher={noop}
        processing={false}
        seatPrice={150000}
      />,
    )
    expect(html).toContain('Anh Trai Say Hi')
  })
})

describe('CheckoutQuestions', () => {
  const questions = [
    { id: 'eq_text', questionText: 'Tên người tham gia', questionType: 'text' as const, isRequired: true, options: [] },
    { id: 'eq_size', questionText: 'Chọn size áo', questionType: 'single_choice' as const, isRequired: false, options: ['S', 'M'] },
    { id: 'eq_days', questionText: 'Ngày tham dự', questionType: 'multi_choice' as const, isRequired: false, options: ['Thứ 6', 'Thứ 7'] },
  ]

  it('renders nothing when the event has no persisted questions', () => {
    expect(renderToStaticMarkup(<CheckoutQuestions questions={[]} answers={{}} onChange={noop} />)).toBe('')
    expect(
      renderToStaticMarkup(
        <CheckoutQuestions questions={[{ questionText: 'X', questionType: 'text', isRequired: false, options: [] }]} answers={{}} onChange={noop} />,
      ),
    ).toBe('')
  })

  it('renders required marker, textarea, radio and checkbox controls', () => {
    const html = renderToStaticMarkup(
      <CheckoutQuestions questions={questions} answers={{ eq_size: 'M', eq_days: ['Thứ 6'] }} onChange={noop} />,
    )
    expect(html).toContain('Tên người tham gia')
    expect(html).toContain('textarea')
    expect(html).toContain('radio')
    expect(html).toContain('checkbox')
    expect(html).toMatch(/eq_size[^>]*checked/)
    expect(html).toMatch(/eq_days[^>]*checked/)
  })

  it('marks an unanswered required question as invalid', () => {
    const html = renderToStaticMarkup(
      <CheckoutQuestions questions={[questions[0]]} answers={{}} invalidQuestionId="eq_text" onChange={noop} />,
    )
    expect(html).toMatch(/<textarea[^>]*aria-invalid="true"/)
    expect(html).toContain('Vui lòng trả lời các câu hỏi bắt buộc.')
  })
})

describe('BillingForm', () => {
  it('renders name, email and phone fields with the provided values', () => {
    const html = renderToStaticMarkup(
      <BillingForm
        name="Nguyễn Văn A"
        email="a@example.com"
        phone="0901234567"
        setName={noop}
        setEmail={noop}
        setPhone={noop}
      />,
    )
    expect(html).toContain('id="billing-name"')
    expect(html).toContain('value="Nguyễn Văn A"')
    expect(html).toContain('value="a@example.com"')
    expect(html).toContain('value="0901234567"')
    expect(html).toMatch(/<input[^>]*required/)
  })
})

describe('PaymentMethods', () => {
  it('renders the three payment options and preselects ZaloPay', () => {
    const html = renderToStaticMarkup(<PaymentMethods paymentMethod="zalopay" setPaymentMethod={noop} />)
    expect(html).toContain('Ví điện tử ZaloPay')
    expect(html).toContain('Thẻ tín dụng quốc tế')
    expect(html).toContain('Thẻ ATM nội địa')
    const radios = html.match(/type="radio"/g)
    expect(radios).toHaveLength(3)
    expect(html).toMatch(/<input[^>]*name="payment"[^>]*checked/)
  })

  it('highlights the selected card method when changed', () => {
    const html = renderToStaticMarkup(<PaymentMethods paymentMethod="card" setPaymentMethod={noop} />)
    expect(html).toMatch(/type="radio"/g)
  })
})
