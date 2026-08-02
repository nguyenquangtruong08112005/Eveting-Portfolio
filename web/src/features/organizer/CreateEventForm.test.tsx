import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { CreateEventForm } from './CreateEventForm'

vi.mock('next-intl', () => {
  const messages = JSON.parse(readFileSync(process.cwd() + '/messages/vi.json', 'utf8'))
  const lookup = (obj: Record<string, unknown>, path: string[]) => {
    let cur: unknown = obj
    for (const part of path) {
      if (typeof cur !== 'object' || cur === null) return undefined
      cur = (cur as Record<string, unknown>)[part]
    }
    return cur
  }
  const useTranslations = (ns: string) => (key: string, params?: Record<string, unknown>) => {
    const value = lookup(messages, ns.split('.').concat(key.split('.')))
    if (value === undefined) return key
    if (typeof value !== 'string') return String(value)
    if (params) return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
    return value
  }
  return { useTranslations }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'evt_edit_1' }),
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

vi.mock('@/features/organizer/OrganizerWorkspace', () => ({
  useOrganizerWorkspace: () => ({ can: (permission: string) => permission === 'EDIT_EVENT' }),
}))

vi.mock('@/components/organizer/OrganizerShell', () => ({
  OrganizerShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}))

vi.mock('@/features/events/api', () => ({
  EventService: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
}))

vi.mock('@/features/organizer/api', () => ({
  OrganizerBusinessService: {
    listFeaturedProfiles: vi.fn(),
    createFeaturedProfile: vi.fn(),
  },
  OrganizerService: { getEventStats: vi.fn() },
  VenueService: { list: vi.fn() },
}))

const source = readFileSync(new URL('./CreateEventForm.tsx', import.meta.url), 'utf8')

describe('CreateEventForm — initial state', () => {
  it('renders the create shell, dashboard back link and page title', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).toContain('data-testid="shell"')
    expect(html).toContain('href="/organizer/dashboard"')
    expect(html).toContain('Khởi Tạo Sự Kiện Mới')
    expect(html).toContain('Quay lại bảng điều khiển')
  })

  it('renders all four step sections on first load', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).toContain('1. Thông tin cơ bản')
    expect(html).toContain('2. Thời gian &amp; Địa điểm')
    expect(html).toContain('3. Giá vé &amp; Hạng vé')
    expect(html).toContain('4. Visibility and attendee details')
  })

  it('seeds one default Standard ticket tier at 150000 for 100 tickets', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).toContain('value="Standard"')
    expect(html).toContain('value="150000"')
    expect(html).toContain('value="100"')
  })

  it('offers draft and submit actions in create mode', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).toContain('Lưu dưới dạng bản nháp')
    expect(html).toContain('Gửi yêu cầu phê duyệt')
  })

  it('does not render the venue picker before venues load', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).not.toContain('Chọn từ danh mục')
  })

  it('does not block the form for an organizer with EDIT_EVENT permission', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).not.toContain('EDIT_EVENT permission is required')
  })

  it('boots loading only in edit mode', () => {
    expect(source).toMatch(/const \[bootLoading, setBootLoading\] = useState\(mode === 'edit'\)/)
  })

  it('defers venue and featured-profile fetches to a post-mount effect', () => {
    const html = renderToStaticMarkup(<CreateEventForm />)
    expect(html).toBeTruthy()
    expect(source).toMatch(/VenueService\.list\(\)/)
    expect(source).toMatch(/OrganizerBusinessService\.listFeaturedProfiles\(\)/)
  })
})

describe('CreateEventForm — essential validation', () => {
  it('blocks submit when name or start date are missing', () => {
    expect(source).toMatch(/if \(!name \|\| !dateInput\) \{\r?\n\s+setErrorMsg\(t\('error_required_fields'\)\);\r?\n\s+return;\r?\n\s+\}/)
  })

  it('requires a venue selection or free-form physical address', () => {
    expect(source).toMatch(/eventType === 'physical' && !venueId && !venueName\.trim\(\) && !city\.trim\(\) && !address\.trim\(\)/)
    expect(source).toMatch(/setErrorMsg\(t\('error_venue_required'\)\)/)
  })

  it('requires an online URL for online events', () => {
    expect(source).toMatch(/eventType === 'online' && !onlineUrl\.trim\(\)/)
    expect(source).toMatch(/setErrorMsg\(t\('error_online_url_required'\)\)/)
  })

  it('releases loading before returning on validation failures', () => {
    expect(source).toMatch(/setErrorMsg\(t\('error_venue_required'\)\);\r?\n\s+setLoading\(false\);\r?\n\s+return;/)
    expect(source).toMatch(/setErrorMsg\(t\('error_online_url_required'\)\);\r?\n\s+setLoading\(false\);\r?\n\s+return;/)
  })

  it('marks name and start date as required native inputs', () => {
    expect(source).toMatch(/<Input\r?\n\s+type="text"\r?\n\s+required/)
    expect(source).toMatch(/type="datetime-local"\r?\n\s+required/)
  })
})

describe('CreateEventForm — date and range handling', () => {
  it('serializes empty datetimes to undefined and real ones to epoch ms', () => {
    expect(source).toMatch(/date: new Date\(dateInput\)\.getTime\(\),/)
    expect(source).toMatch(/endDate: endDateInput \? new Date\(endDateInput\)\.getTime\(\) : undefined,/)
  })

  it('formats an existing event date into a local datetime-local input value', () => {
    expect(source).toMatch(/function toLocalInput\(ts\?: number \| null\): string \{/)
    expect(source).toMatch(/if \(!ts\) return '';/)
    expect(source).toMatch(/`\$\{d\.getFullYear\(\)\}-\$\{pad\(d\.getMonth\(\) \+ 1\)\}-\$\{pad\(d\.getDate\(\)\)\}T/)
  })

  it('converts ticket sale windows to epoch ms only when set', () => {
    expect(source).toMatch(/sellAt: tier\.sellAt \? new Date\(tier\.sellAt\)\.getTime\(\) : undefined,/)
    expect(source).toMatch(/endSellAt: tier\.endSellAt\r?\n\s+\? new Date\(tier\.endSellAt\)\.getTime\(\)\r?\n\s+: undefined,/)
  })

  it('hydrates edit-mode datetimes through toLocalInput', () => {
    expect(source).toMatch(/setDateInput\(toLocalInput\(ev\.date\)\)/)
    expect(source).toMatch(/setEndDateInput\(toLocalInput\(ev\.endDate as number \| undefined\)\)/)
  })
})

describe('CreateEventForm — ticket tier add/remove/update', () => {
  it('appends a new default tier on add', () => {
    expect(source).toMatch(/const addTicketTier = \(\) => \{/)
    expect(source).toMatch(/name: '',\r?\n\s+price: 100000,\r?\n\s+available: 50,/)
  })

  it('refuses to remove the last remaining tier', () => {
    expect(source).toMatch(/const removeTicketTier = \(index: number\) => \{\r?\n\s+if \(ticketTiers\.length === 1\) return;/)
  })

  it('removes tiers immutably by index', () => {
    expect(source).toMatch(/setTicketTiers\(prev => prev\.filter\(\(_, i\) => i !== index\)\)/)
  })

  it('updates a single tier field without mutating siblings', () => {
    expect(source).toMatch(/prev\.map\(\(tier, i\) => \{\r?\n\s+if \(i === index\) \{\r?\n\s+return \{ \.\.\.tier, \[field\]: value \};/)
  })

  it('renders a remove control only when more than one tier exists', () => {
    expect(source).toMatch(/ticketTiers\.length > 1 && \(/)
  })

  it('serializes only named tiers into the ticketTypes map', () => {
    expect(source).toMatch(/ticketTiers\.forEach\(tier => \{\r?\n\s+if \(tier\.name\.trim\(\)\) \{/)
    expect(source).toMatch(/ticketTypes\[tier\.name\.trim\(\)\] = \{/)
  })

  it('normalizes free tiers to zero price and clamps order limits to at least one', () => {
    expect(source).toMatch(/price: tier\.isFree \? 0 : Number\(tier\.price\) \|\| 0,/)
    expect(source).toMatch(/minPerOrder: Math\.max\(1, Number\(tier\.minPerOrder\) \|\| 1\),/)
    expect(source).toMatch(/maxPerOrder: Math\.max\(1, Number\(tier\.maxPerOrder\) \|\| 1\),/)
  })
})

describe('CreateEventForm — venue selection and custom venue', () => {
  it('applies a selected venue into the free-form address fields', () => {
    expect(source).toMatch(/const applyVenue = \(id: string\) => \{/)
    expect(source).toMatch(/const v = venues\.find\(\(x\) => x\.id === id\);\r?\n\s+if \(!v\) return;/)
    expect(source).toMatch(/setVenueName\(v\.name \|\| ''\);\r?\n\s+setCity\(v\.city \|\| ''\);\r?\n\s+setAddress\(v\.address \|\| ''\);/)
  })

  it('sends venueId only for physical events with a selection', () => {
    expect(source).toMatch(/venueId: eventType === 'physical' && venueId \? venueId : undefined,/)
  })

  it('sends free-form venue fields only for physical events', () => {
    expect(source).toMatch(/venueName: eventType === 'physical' \? venueName\.trim\(\) \|\| undefined : undefined,/)
    expect(source).toMatch(/city: eventType === 'physical' \? city\.trim\(\) \|\| undefined : undefined,/)
  })

  it('includes a street address object and address details for physical events', () => {
    expect(source).toMatch(/location:\r?\n\s+eventType === 'physical'\r?\n\s+\? \{\r?\n\s+address: address\.trim\(\) \|\| '',/)
    expect(source).toMatch(/addressDetails:\r?\n\s+eventType === 'physical'\r?\n\s+\? \{/)
  })

  it('drops venue fields and adds onlineUrl for online events', () => {
    expect(source).toMatch(/onlineUrl: eventType === 'online' \? onlineUrl\.trim\(\) : undefined,/)
  })
})

describe('CreateEventForm — media URL fields', () => {
  it('sends image, banner and video as trimmed values or undefined', () => {
    expect(source).toMatch(/imageUrl: imageUrl\.trim\(\) \|\| undefined,/)
    expect(source).toMatch(/bannerUrl: bannerUrl\.trim\(\) \|\| undefined,/)
    expect(source).toMatch(/videoUrl: videoUrl\.trim\(\) \|\| undefined,/)
  })

  it('collects the media URLs from url-type inputs', () => {
    expect(source).toMatch(/<Input\r?\n\s+type="url"\r?\n\s+placeholder="https:\/\/example\.com\/image\.jpg"/)
    expect(source).toMatch(/placeholder="https:\/\/example\.com\/banner\.jpg"/)
    expect(source).toMatch(/placeholder="https:\/\/youtube\.com\/watch\?v=\.\.\."/)
  })
})

describe('CreateEventForm — draft vs submit payload', () => {
  it('tags create-mode payloads with the saveAsDraft flag', () => {
    expect(source).toMatch(/\.\.\.\(mode === 'create' \? \{ saveAsDraft \} : \{\}\),/)
  })

  it('calls create for drafts and publish in create mode, then navigates to the dashboard', () => {
    expect(source).toMatch(/await EventService\.create\(eventData\);\r?\n\s+setSuccess\(true\);\r?\n\s+setTimeout\(\(\) => \{\r?\n\s+router\.push\('\/organizer\/dashboard'\);/)
  })

  it('updates the event in edit mode and navigates back to its detail page', () => {
    expect(source).toMatch(/await EventService\.update\(editId, eventData\);\r?\n\s+setSuccess\(true\);\r?\n\s+setTimeout\(\(\) => \{\r?\n\s+router\.push\(`\/organizer\/events\/\$\{editId\}`\);/)
  })

  it('wires the draft button to handleSubmit(true) and publish to handleSubmit(false)', () => {
    expect(source).toMatch(/onClick=\{\(\) => handleSubmit\(true\)\}/)
    expect(source).toMatch(/onClick=\{\(\) => handleSubmit\(false\)\}/)
  })

  it('includes category, artist, visibility and question data in the payload', () => {
    expect(source).toContain('category: selectedCategories,')
    expect(source).toContain('featuredProfileIds: selectedFeaturedIds,')
    expect(source).toContain('isPrivate,')
    expect(source).toContain('messageForAttendee: messageForAttendee.trim() || undefined,')
    expect(source).toContain('customQuestions,')
  })
})

describe('CreateEventForm — featured artist creation', () => {
  it('creates an artist profile, prepends it and selects it', () => {
    expect(source).toMatch(/const profile = await OrganizerBusinessService\.createFeaturedProfile\(\{/)
    expect(source).toMatch(/profileType: 'artist',/)
    expect(source).toMatch(/setFeaturedProfiles\(\(current\) => \[profile, \.\.\.current\]\)/)
    expect(source).toMatch(/setSelectedFeaturedIds\(\(current\) => \[\.\.\.current, profile\.id\]\)/)
  })

  it('ignores blank artist names', () => {
    expect(source).toMatch(/const artistName = newArtistName\.trim\(\);\r?\n\s+if \(!artistName\) return;/)
  })

  it('surfaces artist creation failures in the error banner', () => {
    expect(source).toMatch(/error instanceof Error \? error\.message : 'Unable to create featured artist'/)
    expect(source).toMatch(/setErrorMsg\(/)
  })

  it('toggles the creating flag around the service call', () => {
    expect(source).toMatch(/setCreatingArtist\(true\);\r?\n\s+try \{/)
    expect(source).toMatch(/finally \{\r?\n\s+setCreatingArtist\(false\);/)
  })
})

describe('CreateEventForm — attendee questions', () => {
  it('appends, patches and removes questions through immutable updates', () => {
    expect(source).toMatch(/const addQuestion = \(\) => \{/)
    expect(source).toMatch(/setCustomQuestions\(\(current\) => \[\r?\n\s+\.\.\.current,/)
    expect(source).toMatch(/current\.map\(\(question, questionIndex\) =>/)
    expect(source).toMatch(/current\.filter\(\(_, questionIndex\) => questionIndex !== index\)/)
  })

  it('locks question editing when tickets have been sold', () => {
    expect(source).toMatch(/setQuestionsLocked\(sold > 0\);/)
    expect(source).toMatch(/if \(questionsLocked\) return;/)
  })

  it('guards the question editor inputs with the locked flag', () => {
    expect(source).toContain('disabled={questionsLocked}')
  })
})

describe('CreateEventForm — server error display and success navigation', () => {
  it('surfaces the server message or the fallback translation on failure', () => {
    expect(source).toMatch(/catch \(err: any\) \{\r?\n\s+setErrorMsg\(err\.message \|\| t\('create_error'\)\);/)
  })

  it('resets loading after a failed submit', () => {
    expect(source).toMatch(/setErrorMsg\(err\.message \|\| t\('create_error'\)\);\r?\n\s+setLoading\(false\);/)
  })

  it('clears stale errors before starting a submit', () => {
    expect(source).toMatch(/setLoading\(true\);\r?\n\s+setErrorMsg\(''\);/)
  })

  it('renders the error banner only when an error message exists', () => {
    expect(source).toMatch(/\{errorMsg && \(/)
  })

  it('replaces the form with a success card after navigation is scheduled', () => {
    expect(source).toMatch(/\{success \? \(/)
    expect(source).toMatch(/mode === 'edit' \? t\('update_success'\) : t\('create_success'\)/)
  })

  it('reads the edit id from route params in edit mode', () => {
    expect(source).toMatch(/const editId = mode === 'edit' \? \(params\?\.id as string\) : undefined;/)
  })

  it('hydrates edit-mode events from getById and locks questions when sold', () => {
    expect(source).toMatch(/EventService\.getById\(editId\)/)
    expect(source).toMatch(/OrganizerService\.getEventStats\(editId\)/)
    expect(source).toMatch(/catch\(\(\) => setQuestionsLocked\(false\)\)/)
  })
})
