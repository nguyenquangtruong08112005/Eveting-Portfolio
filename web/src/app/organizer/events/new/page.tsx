'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Calendar, Ticket, Sparkles, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventService } from '@/services/event.service';

interface TicketTier {
  name: string;
  price: number;
  available: number;
}

const CATEGORY_OPTIONS = ['Âm nhạc', 'Nghệ thuật', 'Nightlife', 'Thể thao', 'Công nghệ'];

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [eventType, setEventType] = useState<'physical' | 'online'>('physical');
  
  // Location states
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');

  // Category states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Ticket Tiers
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { name: 'Standard', price: 150000, available: 100 }
  ]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const addTicketTier = () => {
    setTicketTiers(prev => [...prev, { name: '', price: 100000, available: 50 }]);
  };

  const removeTicketTier = (index: number) => {
    if (ticketTiers.length === 1) return;
    setTicketTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicketTier = (index: number, field: keyof TicketTier, value: string | number) => {
    setTicketTiers(prev =>
      prev.map((tier, i) => {
        if (i === index) {
          return { ...tier, [field]: value };
        }
        return tier;
      })
    );
  };

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (!name || !dateInput) {
      setErrorMsg('Vui lòng điền tên sự kiện và ngày bắt đầu tổ chức.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Structure ticketTypes object matching: { [name]: { price, available } }
      const ticketTypes: Record<string, { price: number; available: number }> = {};
      ticketTiers.forEach(tier => {
        if (tier.name.trim()) {
          ticketTypes[tier.name.trim()] = {
            price: Number(tier.price) || 0,
            available: Number(tier.available) || 0
          };
        }
      });

      const eventData = {
        name,
        description,
        imageUrl: imageUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        date: new Date(dateInput).getTime(),
        endDate: endDateInput ? new Date(endDateInput).getTime() : undefined,
        eventType,
        category: selectedCategories,
        onlineUrl: eventType === 'online' ? onlineUrl : undefined,
        venueName: eventType === 'physical' ? venueName : undefined,
        city: eventType === 'physical' ? city : undefined,
        location: eventType === 'physical' ? { address } : undefined,
        ticketTypes,
        saveAsDraft
      };

      await EventService.create(eventData);
      setSuccess(true);
      setTimeout(() => {
        router.push('/organizer/dashboard');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi khởi tạo sự kiện. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar isOrganizerPage />

      <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-grow space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/organizer/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Quay lại bảng điều khiển
          </Link>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Sparkles className="size-6 text-[var(--primary)]" />
            Khởi Tạo Sự Kiện Mới
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Đăng ký và cấu hình các thông số cho sự kiện đối tác của bạn
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl flex items-start gap-2.5 text-[var(--error)] text-sm">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="p-10 bg-[#1E212B] border border-white/5 rounded-2xl text-center flex flex-col items-center justify-center gap-4 shadow-xl">
            <CheckCircle2 className="size-16 text-green-400 animate-bounce" />
            <h2 className="text-xl font-bold text-white">Khởi tạo thành công!</h2>
            <p className="text-zinc-400 text-sm max-w-sm">
              Sự kiện của bạn đã được lưu lại và đồng bộ thành công lên hệ thống. Đang chuyển hướng về trang quản lý...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Basic Information */}
            <section className="bg-[#1E212B] border border-white/5 p-6 rounded-2xl shadow-xl space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                <FileText className="size-4 text-[var(--primary)]" />
                1. Thông tin cơ bản
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-zinc-400 block mb-1.5">Tên sự kiện *</Label>
                  <Input
                    type="text"
                    required
                    placeholder="Đại nhạc hội Rock Việt 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <Label className="text-xs text-zinc-400 block mb-1.5">Mô tả sự kiện</Label>
                  <textarea
                    placeholder="Mô tả chi tiết nội dung sự kiện, lịch trình biểu diễn và các lưu ý..."
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)] focus:outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-zinc-400 block mb-1.5">Link ảnh đại diện (Square)</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-xs focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400 block mb-1.5">Link ảnh bìa (Banner URL)</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/banner.jpg"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-xs focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400 block mb-1.5">Link video quảng bá (Trailer/Youtube)</Label>
                    <Input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-xs focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-zinc-400 block mb-1.5">Danh mục sự kiện</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]'
                              : 'bg-zinc-800/40 border-white/5 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Time & Venue */}
            <section className="bg-[#1E212B] border border-white/5 p-6 rounded-2xl shadow-xl space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                <Calendar className="size-4 text-[var(--primary)]" />
                2. Thời gian & Địa điểm
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-zinc-400 block mb-1.5">Thời gian bắt đầu tổ chức *</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400 block mb-1.5">Thời gian kết thúc (Không bắt buộc)</Label>
                    <Input
                      type="datetime-local"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-zinc-400 block mb-1.5">Hình thức tổ chức</Label>
                  <div className="flex gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setEventType('physical')}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        eventType === 'physical'
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                          : 'bg-[#12141A] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sự kiện trực tiếp (Offline)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType('online')}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        eventType === 'online'
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                          : 'bg-[#12141A] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sự kiện trực tuyến (Online)
                    </button>
                  </div>
                </div>

                {eventType === 'physical' ? (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-zinc-400 block mb-1.5">Tên địa điểm (Sân vận động, Nhà hát...)</Label>
                        <Input
                          type="text"
                          placeholder="Ví dụ: Nhà hát Lớn Hà Nội"
                          value={venueName}
                          onChange={(e) => setVenueName(e.target.value)}
                          className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 block mb-1.5">Thành phố</Label>
                        <Input
                          type="text"
                          placeholder="Ví dụ: Hà Nội"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400 block mb-1.5">Địa chỉ cụ thể</Label>
                      <Input
                        type="text"
                        placeholder="Ví dụ: 01 Tràng Tiền, Hoàn Kiếm, Hà Nội"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-zinc-400 block mb-1.5">Đường dẫn tham dự trực tuyến (URL Live stream/Zoom)</Label>
                    <Input
                      type="url"
                      placeholder="https://zoom.us/j/... hoặc https://youtube.com/live/..."
                      value={onlineUrl}
                      onChange={(e) => setOnlineUrl(e.target.value)}
                      className="w-full bg-[#12141A] border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-[var(--primary)]"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Step 3: Ticketing */}
            <section className="bg-[#1E212B] border border-white/5 p-6 rounded-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Ticket className="size-4 text-[var(--primary)]" />
                  3. Giá vé & Hạng vé
                </h2>
                <button
                  type="button"
                  onClick={addTicketTier}
                  className="flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Thêm hạng vé
                </button>
              </div>

              <div className="space-y-4">
                {ticketTiers.map((tier, idx) => (
                  <div key={idx} className="p-4 bg-[#12141A] border border-white/5 rounded-xl flex flex-col md:flex-row gap-4 items-end relative">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                          <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Tên hạng vé *</Label>
                          <Input
                            type="text"
                            required
                            placeholder="Ví dụ: VIP, Standard, Early Bird"
                            value={tier.name}
                            onChange={(e) => updateTicketTier(idx, 'name', e.target.value)}
                            className="w-full bg-[#1E212B] border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:border-[var(--primary)]"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Giá vé (VNĐ) *</Label>
                          <Input
                            type="number"
                            required
                            value={tier.price}
                            onChange={(e) => updateTicketTier(idx, 'price', Number(e.target.value))}
                            className="w-full bg-[#1E212B] border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:border-[var(--primary)]"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Số lượng vé mở bán *</Label>
                          <Input
                            type="number"
                            required
                            value={tier.available}
                            onChange={(e) => updateTicketTier(idx, 'available', Number(e.target.value))}
                            className="w-full bg-[#1E212B] border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:border-[var(--primary)]"
                          />
                        </div>
                      </div>
                    </div>

                    {ticketTiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketTier(idx)}
                        className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-all cursor-pointer mb-0.5 shrink-0"
                        title="Xóa hạng vé"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                variant="outline"
                className="flex-1 py-6 bg-transparent hover:bg-white/5 border border-white/10 text-white font-bold text-sm rounded-xl cursor-pointer"
              >
                {loading ? 'Đang xử lý...' : 'Lưu dưới dạng bản nháp'}
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="flex-1 py-6 rounded-xl btn-primary-gradient text-sm font-black tracking-wide text-[#12141A] border-none hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-orange-500/10"
              >
                {loading ? 'Đang xử lý...' : 'Gửi yêu cầu phê duyệt'}
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
