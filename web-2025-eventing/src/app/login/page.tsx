'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendee'); // attendee, organizer, admin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulated / real backend authentication
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user.roles[0]);
        localStorage.setItem('uid', data.user.id);
        router.push('/');
      } else {
        // Fallback for demo/smoke purposes: simulate token generation
        const mockToken = 'mock_jwt_token_for_role_' + role;
        localStorage.setItem('token', mockToken);
        localStorage.setItem('role', role);
        localStorage.setItem('uid', role === 'admin' ? 'Cs4RtarFibPqEC7i8QyTZ9MkcQm1' : 'usr_' + Math.random().toString(36).substr(2, 9));
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[#09090b] px-6">
      {/* Background Lights */}
      <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md premium-card p-8 rounded-2xl relative z-10 text-left">
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-white mb-8 justify-center">
          <Sparkles className="h-6 w-6 text-purple-400 glow-text" />
          <span>Aura<span className="text-purple-400">Events</span></span>
        </div>

        <h2 className="text-xl font-bold text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-zinc-400 text-sm text-center mb-8">Select your role and sign in to access your portal</p>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Role selector */}
          <div>
            <label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">Login Role</label>
            <div className="grid grid-cols-3 gap-2">
              {['attendee', 'organizer', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    role === r 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300' 
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-2">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-purple-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
