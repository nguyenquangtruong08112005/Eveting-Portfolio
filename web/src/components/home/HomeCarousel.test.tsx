import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeCarousel } from './HomeCarousel'

const carouselSource = readFileSync(new URL('./HomeCarousel.tsx', import.meta.url), 'utf8')

describe('HomeCarousel — layout rendering', () => {
  it('renders the header slot and all children', () => {
    const html = renderToStaticMarkup(
      <HomeCarousel header={<h3>Xu hướng</h3>}>
        <div>Card A</div>
        <div>Card B</div>
      </HomeCarousel>,
    )
    expect(html).toContain('Xu hướng')
    expect(html).toContain('Card A')
    expect(html).toContain('Card B')
  })

  it('renders without a header slot', () => {
    const html = renderToStaticMarkup(<HomeCarousel>nội dung</HomeCarousel>)
    expect(html).toContain('nội dung')
  })

  it('renders left and right arrow buttons, both disabled until the list can scroll', () => {
    const html = renderToStaticMarkup(<HomeCarousel>cards</HomeCarousel>)
    expect(html).toMatch(/<button[^>]*aria-label="Scroll left"[^>]*disabled/)
    expect(html).toMatch(/<button[^>]*aria-label="Scroll right"[^>]*disabled/)
  })

  it('forwards the className to the scroll container', () => {
    const html = renderToStaticMarkup(
      <HomeCarousel className="extra-scroll-class">cards</HomeCarousel>,
    )
    expect(html).toContain('extra-scroll-class')
  })
})

describe('HomeCarousel — scroll behavior', () => {
  it('scrolls by 75% of the visible width in the requested direction', () => {
    expect(carouselSource).toMatch(/const scrollAmount = el\.clientWidth \* 0\.75;/)
    expect(carouselSource).toMatch(
      /el\.scrollBy\(\{[\s\S]*left: direction === 'left' \? -scrollAmount : scrollAmount,[\s\S]*behavior: 'smooth'/,
    )
  })

  it('enables arrows only when there is room to scroll in that direction', () => {
    expect(carouselSource).toMatch(/setCanScrollLeft\(scrollLeft > 4\);/)
    expect(carouselSource).toMatch(
      /setCanScrollRight\(scrollLeft \+ clientWidth < scrollWidth - 4\);/,
    )
  })

  it('re-checks arrow availability on scroll, on resize and after children change', () => {
    expect(carouselSource).toMatch(/onScroll=\{checkScrollButtons\}/)
    expect(carouselSource).toMatch(/window\.addEventListener\('resize', checkScrollButtons\)/)
    expect(carouselSource).toMatch(/window\.removeEventListener\('resize', checkScrollButtons\)/)
    expect(carouselSource).toMatch(/}, \[children, checkScrollButtons\]\)/)
  })
})
