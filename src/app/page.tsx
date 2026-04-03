'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface Household {
  id: string;
  household_name: string;
  display_name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace('/dashboard');
        } else {
          setPageLoading(false);
        }
      })
      .catch(() => setPageLoading(false));

    fetch('/api/households')
      .then((r) => r.json())
      .then((data) => setHouseholds(data.households || []))
      .catch(console.error);
  }, [router]);

  const handleLogin = async () => {
    if (!selectedId || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdName: selectedId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '로그인 실패');
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">

        {/* Logo */}
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto">
            <img src="/아이콘2.png" alt="로고" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-amber-900 tracking-tight">동행교회 365 가정예배</h1>
            <p className="text-amber-600 font-bold text-sm">부활절 13일 챌린지 · 4/6 – 4/18</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 space-y-4 text-left">

          <div className="space-y-2">
            <label className="text-xs font-black text-amber-800 ml-1 flex items-center gap-1">
              <User size={12} /> 우리 가정 선택
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-amber-400 transition-colors"
              style={{ appearance: 'none' }}
            >
              <option value="">가정을 선택해주세요</option>
              {households.map((h) => (
                <option key={h.id} value={h.household_name}>{h.display_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-amber-800 ml-1 flex items-center gap-1">
              <Lock size={12} /> 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호를 입력하세요"
              className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            id="login-button"
            onClick={handleLogin}
            disabled={!selectedId || !password || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-600 text-white shadow-md mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            로그인하기
          </button>

          <div className="pt-4 border-t border-amber-100">
            <button
              onClick={() => router.push('/admin')}
              className="w-full text-xs font-bold text-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2 py-1"
            >
              <Lock size={12} /> 관리자 로그인
            </button>
          </div>
        </div>

        <p className="text-[10px] text-amber-400 font-bold">
          © 2026 WalkTogether Church Family Worship Challenge
        </p>
      </div>
    </div>
  );
}
