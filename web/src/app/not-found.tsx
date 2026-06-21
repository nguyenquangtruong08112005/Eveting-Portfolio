import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen items-center justify-center p-6">
      <div className="max-w-md glass-card rounded-2xl p-8 border border-white/5 bg-[#1E212B] text-center">
        <AlertCircle className="size-12 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-zinc-200 text-lg font-bold mb-2">Page Not Found</h2>
        <p className="text-zinc-500 text-sm mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[#12141A] border-none"
        >
          Back to Homepage
        </Link>
      </div>
    </div>
  );
}
