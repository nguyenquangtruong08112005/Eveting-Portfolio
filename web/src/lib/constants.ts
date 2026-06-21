// Design tokens as TypeScript constants — matches DESIGN.md and mobile Color.kt
// Single source of truth for all color references in components

export const colors = {
  // Primary
  primary: '#F76B10',
  primaryDark: '#FF8F66',
  primaryContainer: '#3E1C0A',
  onPrimary: '#12141A',

  // Backgrounds & Surfaces
  background: '#12141A',
  surface: '#1E212B',
  surfaceHover: '#262A36',
  surfaceBorder: 'rgba(255,255,255,0.06)',

  // Secondary
  yellow: '#FBBE47',
  yellowDark: '#FFD54F',
  blue: '#3B82F7',
  blueDark: '#64B5F6',
  green: '#2D9687',
  greenDark: '#81C784',
  darkOrange: '#8C3700',

  // Semantic
  info: '#64B5F6',
  success: '#81C784',
  warning: '#FFD54F',
  error: '#E57373',

  // Text
  textPrimary: '#E8EAED',
  textSecondary: '#B0B3B8',
  textMuted: '#6B7280',
} as const;

export const HOLD_TIMER_SECONDS = 600; // 10 minutes seat hold

export const CURRENCY_LOCALE = 'vi-VN';

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Liên hệ';
  if (price === 0) return 'Miễn phí';
  return price.toLocaleString(CURRENCY_LOCALE) + ' ₫';
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CATEGORY_MAP: Record<string, string[]> = {
  'Âm nhạc': ['music', 'concert', 'edm', 'pop', 'hip-hop', 'v-pop', 'show', 'âm nhạc'],
  'Nghệ thuật': ['art', 'exhibition', 'culture', 'museum', 'nghệ thuật', 'fashion'],
  'Nightlife': ['nightlife', 'dj', 'club', 'party', 'festival'],
  'Thể thao': ['sports', 'marathon', 'running', 'fitness', 'yoga', 'wellness', 'thể thao'],
  'Công nghệ': ['tech', 'conference', 'expo', 'business', 'networking', 'esports', 'gaming', 'công nghệ', 'online'],
};

export function matchCategory(eventCategories: string[] | undefined, activeCategory: string): boolean {
  if (activeCategory === 'Tất cả') return true;
  if (!eventCategories || eventCategories.length === 0) return false;
  
  const targetTags = CATEGORY_MAP[activeCategory];
  if (!targetTags) return false;
  
  return eventCategories.some(cat => 
    targetTags.includes(cat.toLowerCase()) || 
    cat.toLowerCase() === activeCategory.toLowerCase()
  );
}

// ── Curated images per event (replaces identical Ticketbox placeholders) ──
export const EVENT_IMAGES: Record<string, string> = {
  evt_foodfest_saigon_2025: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
  evt_tedx_danang_2025: 'https://images.unsplash.com/photo-1540575467063-178a50da2fd8?w=600&auto=format&fit=crop&q=80',
  evt_vdf_hcm_2025: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80',
  evt_rapviet_allstar_2025: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
  evt_circus_hcm_2025: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80',
  evt_ravolution_hanoi_2026: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&auto=format&fit=crop&q=80',
  evt_lantern_hoian_2026: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=600&auto=format&fit=crop&q=80',
  evt_coffee_expo_bmt_2026: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&auto=format&fit=crop&q=80',
  evt_haanh_show_dalat_2026: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  evt_art_exhibit_hanoi_2026: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&auto=format&fit=crop&q=80',
  evt_yoga_retreat_dalat_2026: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
  evt_startup_expo_2026: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=80',
  evt_cat_show_hcm_2026: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
  evt_marketing_conf_2026: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80',
  evt_online_webinar_2026: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
  evt_bookfair_hcm_2026: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80',
  evt_fashion_week_hanoi_2026: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80',
  evt_gaming_expo_hanoi_2026: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
};

// ── Vietnamese descriptions for events (API doesn't return descriptions) ──
export const EVENT_DESCRIPTIONS: Record<string, string> = {
  evt_foodfest_saigon_2025: 'Lễ hội ẩm thực quốc tế quy tụ hàng trăm gian hàng từ 20+ quốc gia, biểu diễn nấu ăn trực tiếp và trải nghiệm văn hóa ẩm thực đường phố Sài Gòn.',
  evt_tedx_danang_2025: 'Chuỗi diễn thuyết truyền cảm hứng TEDx tại Đà Nẵng với chủ đề "Bridges" — kết nối ý tưởng đột phá từ các diễn giả hàng đầu Việt Nam.',
  evt_vdf_hcm_2025: 'Hội nghị lập trình viên lớn nhất Việt Nam với hơn 30 phiên workshop về AI, Cloud, và Mobile Development từ các chuyên gia Google, AWS.',
  evt_rapviet_allstar_2025: 'Đêm nhạc rap đỉnh cao quy tụ toàn bộ quán quân và á quân Rap Việt qua các mùa. Sân khấu hoành tráng, âm thanh chuẩn quốc tế.',
  evt_circus_hcm_2025: 'Show xiếc quốc tế "Giấc Mơ" kết hợp nghệ thuật xiếc truyền thống và công nghệ hologram hiện đại, phù hợp cho cả gia đình.',
  evt_ravolution_hanoi_2026: 'Festival âm nhạc EDM lớn nhất miền Bắc với lineup DJ quốc tế, sân khấu LED khổng lồ và hiệu ứng laser ngoạn mục tại Mỹ Đình.',
  evt_lantern_hoian_2026: 'Lễ hội đèn lồng truyền thống Hội An với hàng nghìn chiếc đèn lồng thắp sáng phố cổ, biểu diễn nghệ thuật dân gian và thả hoa đăng trên sông.',
  evt_coffee_expo_bmt_2026: 'Lễ hội cà phê thường niên tại thủ phủ cà phê Việt Nam — triển lãm giống cà phê, cupping chuyên nghiệp và tour tham quan rẫy.',
  evt_haanh_show_dalat_2026: 'Đêm nhạc acoustic của Hà Anh Tuấn giữa thiên nhiên Đà Lạt — trải nghiệm âm nhạc đẳng cấp trong không gian thơ mộng.',
  evt_art_exhibit_hanoi_2026: 'Triển lãm nghệ thuật đương đại "Di Sản" trưng bày tác phẩm của 50+ nghệ sĩ Việt Nam, kết hợp nghệ thuật truyền thống và digital art.',
  evt_yoga_retreat_dalat_2026: 'Khóa retreat yoga & thiền định 3 ngày tại Đà Lạt với các giảng viên yoga quốc tế, bao gồm ăn chay organic và tắm rừng.',
  evt_startup_expo_2026: 'Triển lãm startup công nghệ lớn nhất năm với 200+ gian hàng, pitching competition và networking cùng các quỹ đầu tư.',
  evt_cat_show_hcm_2026: 'Triển lãm mèo quốc tế với hàng trăm giống mèo quý hiếm từ 15 quốc gia, thi đấu giải thưởng và hoạt động tương tác.',
  evt_marketing_conf_2026: 'Hội nghị marketing hàng đầu Việt Nam với insight từ CMO các tập đoàn lớn, workshop thực hành và case study thực tế.',
  evt_online_webinar_2026: 'Webinar trực tuyến miễn phí về xu hướng AI mới nhất — từ LLM, Computer Vision đến AI Agent, với Q&A trực tiếp.',
  evt_bookfair_hcm_2026: 'Hội sách TP.HCM lần thứ XI với hàng triệu đầu sách, giao lưu tác giả, workshop sáng tạo và không gian đọc sách miễn phí.',
  evt_fashion_week_hanoi_2026: 'Tuần lễ thời trang quốc tế Việt Nam tại Hà Nội với BST mới nhất từ NTK trong và ngoài nước, runway show hoành tráng.',
  evt_gaming_expo_hanoi_2026: 'Sự kiện gaming và esports lớn nhất miền Bắc — giải đấu PUBG, Valorant, trải nghiệm VR và giao lưu streamer nổi tiếng.',
};

/** Enrich event from API with curated image and description */
export function enrichEvent(event: import('@/types').Event): import('@/types').Event {
  const isPlaceholderImage = !event.imageUrl || event.imageUrl.includes('tkbcdn.com');
  return {
    ...event,
    imageUrl: isPlaceholderImage
      ? (EVENT_IMAGES[event.id] || `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80`)
      : event.imageUrl,
    description: event.description || EVENT_DESCRIPTIONS[event.id] || `${event.name} — sự kiện đặc sắc tại ${event.city || 'Việt Nam'}.`,
  };
}

