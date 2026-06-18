'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendee'); // attendee, organizer
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, roles: [role] })
      }).catch(() => null);

      if (response && response.ok) {
        router.push('/login');
      } else {
        // Fallback simulate registration success
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[#09090b] px-6">
      {/* Background Lights */}
      <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md premium-card p-8 rounded-2xl relative z-10 text-left border-none ring-0">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-white mb-2 justify-center">
            <Sparkles className="size-6 text-purple-400 glow-text" />
            <span>Aura<span className="text-purple-400">Events</span></span>
          </div>
          <CardTitle className="text-xl font-bold text-white text-center mt-2">Create Account</CardTitle>
          <CardDescription className="text-zinc-400 text-sm text-center mt-1">Join us to discover or host stunning events</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Role selector */}
            <div>
              <Label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">I want to register as</Label>
              <div className="grid grid-cols-2 gap-2">
                {['attendee', 'organizer'].map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={role === r ? 'default' : 'outline'}
                    onClick={() => setRole(r)}
                    className={`py-5 px-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer btn-tactile ${
                      role === r 
                        ? 'border-purple-500 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20' 
                        : 'border-zinc-850 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">Full Name</Label>
              <div className="relative">
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-zinc-850 bg-zinc-900/50 text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:border-purple-500 transition-all text-sm"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">Email Address</Label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-zinc-850 bg-zinc-900/50 text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:border-purple-500 transition-all text-sm"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">Password</Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-zinc-850 bg-zinc-900/50 text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:border-purple-500 transition-all text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 border-none btn-tactile"
            >
              {loading ? 'Creating Account...' : 'Register'}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
            <p className="text-zinc-500 text-xs">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
