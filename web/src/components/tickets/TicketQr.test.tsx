import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { TicketQr, buildClientTicketQrValue } from './TicketQr'

const qr = vi.hoisted(() => ({ toDataURL: vi.fn() }))

vi.mock('qrcode', () => ({ default: { toDataURL: qr.toDataURL } }))

// node test environment has no DOM, so drive post-mount state and run the
// passive effect synchronously, then let its async chain resolve via flush().
const state = vi.hoisted(() => ({
  injected: [] as unknown[],
  setCalls: [] as unknown[],
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => {
      if (state.injected.length > 0) {
        return [state.injected.shift(), () => {}]
      }
      return [initial, (v: unknown) => state.setCalls.push(v)]
    },
    useEffect: (effect: () => void) => {
      effect()
    },
  }
})

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const source = readFileSync(new URL('./TicketQr.tsx', import.meta.url), 'utf8')

beforeEach(() => {
  state.injected.length = 0
  state.setCalls.length = 0
  vi.resetAllMocks()
})

describe('TicketQr — QR value building via the qrcode library', () => {
  it('calls qrcode.toDataURL with the raw value and the configured options', async () => {
    qr.toDataURL.mockResolvedValue('data:image/png;base64,XYZ')
    renderToStaticMarkup(<TicketQr value="ticket.jwt.token" />)
    await flush()
    expect(qr.toDataURL).toHaveBeenCalledWith('ticket.jwt.token', {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0C0A09', light: '#FFFFFF' },
    })
  })

  it('honors a custom size in the QR generation options', async () => {
    qr.toDataURL.mockResolvedValue('data:image/png;base64,XYZ')
    renderToStaticMarkup(<TicketQr value="tok" size={220} />)
    await flush()
    expect(qr.toDataURL).toHaveBeenCalledWith('tok', expect.objectContaining({ width: 220 }))
  })

  it('stores the generated data URL into state', async () => {
    qr.toDataURL.mockResolvedValue('data:image/png;base64,XYZ')
    renderToStaticMarkup(<TicketQr value="tok" />)
    await flush()
    expect(state.setCalls).toContain('data:image/png;base64,XYZ')
  })

  it('does not generate a QR when the value is empty', async () => {
    renderToStaticMarkup(<TicketQr value="" />)
    await flush()
    expect(qr.toDataURL).not.toHaveBeenCalled()
  })
})

describe('TicketQr — fallback when the QR library fails', () => {
  it('falls back to the public QR API URL with the encoded value', async () => {
    qr.toDataURL.mockRejectedValue(new Error('qr unavailable'))
    renderToStaticMarkup(<TicketQr value="a&b / c" />)
    await flush()
    expect(state.setCalls).toContain(
      'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=a%26b%20%2F%20c',
    )
  })

  it('embeds the requested size in the fallback URL', async () => {
    qr.toDataURL.mockRejectedValue(new Error('qr unavailable'))
    renderToStaticMarkup(<TicketQr value="tok" size={96} />)
    await flush()
    expect(state.setCalls).toContain('https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=tok')
  })

  it('wires the fallback branch in the component source', () => {
    expect(source).toContain('https://api.qrserver.com/v1/create-qr-code/')
    expect(source).toContain('encodeURIComponent(value)')
  })
})

describe('TicketQr — empty input', () => {
  it('renders a "No QR" placeholder with the default size and no image', () => {
    const html = renderToStaticMarkup(<TicketQr value="" />)
    expect(html).toContain('No QR')
    expect(html).toContain('style="width:160px;height:160px"')
    expect(html).not.toContain('<img')
  })

  it('applies className and custom size to the empty placeholder', () => {
    const html = renderToStaticMarkup(<TicketQr value="" size={96} className="m-2" />)
    expect(html).toContain('m-2')
    expect(html).toContain('style="width:96px;height:96px"')
  })
})

describe('TicketQr — loading placeholder', () => {
  it('shows an aria-hidden pulse block with the default size while no data URL is ready', () => {
    const html = renderToStaticMarkup(<TicketQr value="tok" />)
    expect(html).toContain('animate-pulse')
    expect(html).toContain('aria-hidden')
    expect(html).toContain('style="width:160px;height:160px"')
    expect(html).not.toContain('<img')
  })

  it('forwards className to the loading placeholder', () => {
    const html = renderToStaticMarkup(<TicketQr value="tok" className="shadow-lg" />)
    expect(html).toContain('shadow-lg')
    expect(html).toContain('animate-pulse')
  })
})

describe('TicketQr — rendered QR image', () => {
  it('renders an img with the generated data URL, default alt and default size', () => {
    state.injected = ['data:image/png;base64,ABC', false]
    const html = renderToStaticMarkup(<TicketQr value="tok" />)
    expect(html).toContain('<img')
    expect(html).toContain('src="data:image/png;base64,ABC"')
    expect(html).toContain('alt="Ticket QR code"')
    expect(html).toContain('width="160"')
    expect(html).toContain('height="160"')
  })

  it('applies custom alt, size and className to the image', () => {
    state.injected = ['data:image/png;base64,ABC', false]
    const html = renderToStaticMarkup(<TicketQr value="tok" size={200} alt="Check-in" className="my-4" />)
    expect(html).toContain('src="data:image/png;base64,ABC"')
    expect(html).toContain('alt="Check-in"')
    expect(html).toContain('width="200"')
    expect(html).toContain('height="200"')
    expect(html).toContain('my-4')
    expect(html).toContain('rounded-lg bg-white')
  })

  it('shows the loading placeholder instead of the image when the failed flag is set', () => {
    state.injected = ['data:image/png;base64,ABC', true]
    const html = renderToStaticMarkup(<TicketQr value="tok" />)
    expect(html).toContain('animate-pulse')
    expect(html).toContain('aria-hidden')
    expect(html).not.toContain('<img')
  })

  it('marks the image failed when its loading errors', () => {
    expect(source).toContain('onError={() => setFailed(true)}')
  })
})

describe('buildClientTicketQrValue', () => {
  it('returns the trimmed server QR value when present', () => {
    expect(buildClientTicketQrValue({ ticketId: 't_1', qrCode: '  abc.def.ghi  ' })).toBe('abc.def.ghi')
  })

  it('builds a versioned JSON payload when the QR value is absent or blank', () => {
    const expected = JSON.stringify({ v: 1, ticketId: 't_1' })
    expect(buildClientTicketQrValue({ ticketId: 't_1' })).toBe(expected)
    expect(buildClientTicketQrValue({ ticketId: 't_1', qrCode: '' })).toBe(expected)
    expect(buildClientTicketQrValue({ ticketId: 't_1', qrCode: '   ' })).toBe(expected)
    expect(buildClientTicketQrValue({ ticketId: 't_1', qrCode: null })).toBe(expected)
  })

  it('includes the event id in the fallback payload when provided', () => {
    expect(buildClientTicketQrValue({ ticketId: 't_1', eventId: 'e_1' })).toBe(
      JSON.stringify({ v: 1, ticketId: 't_1', eventId: 'e_1' }),
    )
  })
})
