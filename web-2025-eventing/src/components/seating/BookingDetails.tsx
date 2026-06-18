'use client';

import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface BookingDetailsProps {
  eventName: string;
  eventDate: number;
  venueName: string;
  address: string;
  city: string;
  selectedSeats: string[];
  minPrice: number;
  onCheckout: () => void;
  disabled: boolean;
}

export function BookingDetails({
  eventName,
  eventDate,
  venueName,
  address,
  city,
  selectedSeats,
  minPrice,
  onCheckout,
  disabled,
}: BookingDetailsProps) {
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subtotal = selectedSeats.length * minPrice;
  const handlingFee = 0;
  const total = subtotal + handlingFee;

  return (
    <Card className="premium-card p-6 rounded-2xl border-none ring-0">
      <CardContent className="p-0 text-left">
        <h3 className="text-xl font-bold text-white mb-6">Booking Details</h3>

        <div className="flex flex-col gap-4 mb-8">
          <div className="text-white text-lg font-bold line-clamp-1">{eventName}</div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Calendar className="size-4 text-purple-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <MapPin className="size-4 text-cyan-400" />
            <span>
              {venueName || address}, {city || 'HCM'}
            </span>
          </div>
        </div>

        <Separator className="bg-zinc-800/80 my-6" />

        <div className="mb-6">
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider block mb-3">
            Selected Seats
          </label>
          {selectedSeats.length === 0 ? (
            <span className="text-xs text-zinc-500 italic block">No seats selected yet.</span>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
              {selectedSeats.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 font-semibold uppercase"
                >
                  {id.replace('seat_', '').replace('_', '')}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-zinc-800/80 my-6" />

        <div className="mb-8 text-sm text-zinc-450">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString('vi-VN')} ₫</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400 mb-4">
            <span>Handling Fee</span>
            <span>{handlingFee.toLocaleString('vi-VN')} ₫</span>
          </div>
          
          <Separator className="bg-zinc-800/80 my-4" />

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-white font-semibold">Total Amount</span>
            <span className="text-lg font-bold text-cyan-400">{total.toLocaleString('vi-VN')} ₫</span>
          </div>
        </div>

        <Button
          onClick={onCheckout}
          disabled={disabled || selectedSeats.length === 0}
          className="w-full py-6 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 border-none btn-tactile"
        >
          Proceed to Book
        </Button>
      </CardContent>
    </Card>
  );
}
