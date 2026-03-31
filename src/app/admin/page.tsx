'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Users,
  Camera,
  BarChart3,
  LogOut,
  ChevronLeft,
  Settings,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  ImageIcon
} from 'lucide-react';

interface Household {
  id: string;
  household_name: string;
  display_name: string;
  group_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  password?: string; // Optional for admin display
}

interface AdminStats {
  totalHouseholds: number;
  totalCheckins: number;
  over10Days: number;
  completed: number;
}

interface CheckinItem {
  id: string;
  challenge_date: string;
  message: string | null;
  created_at: string;
  households: {
    id: string;
    display_name: string;
    household_name: string;
  };
  checkin_photos: Array<{
    id: string;
    image_url: string;
  }>;
}

type Tab = 'households' | 'checkins' | 'stats';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('households');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Households state
  const [households, setHouseholds] = useState<Household[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    householdName: '',
    displayName: '',
    password: '',
    groupName: '',
    isAdmin: false,
  });

  // Checkins state
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.replace('/');
          return;
        }
        if (!data.isAdmin) {
          router.replace('/dashboard');
          return;
        }
        setIsAdmin(true);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/');
      });
  }, [router]);

  const fetchHouseholds = useCallback(async () => {
    const res = await fetch('/api/admin/households');
    const data = await res.json();
    if (data.households) setHouseholds(data.households);
  }, []);

  const fetchCheckins = useCallback(async () => {
    const url = filterDate
      ? `/api/admin/checkins?date=${filterDate}`
      : '/api/admin/checkins';
    const res = await fetch(url);
    const data = await res.json();
    if (data.checkins) setCheckins(data.checkins);
    if (data.stats) setAdminStats(data.stats);
  }, [filterDate]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'households') fetchHouseholds();
    if (tab === 'checkins' || tab === 'stats') fetchCheckins();
  }, [tab, isAdmin, fetchHouseholds, fetchCheckins]);

  const createHousehold = async () => {
    if (!formData.householdName || !formData.displayName || !formData.password) {
      alert('가정명, 표시명, 비밀번호는 필수입니다.');
      return;
    }

    const res = await fetch('/api/admin/households', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (data.success) {
      setFormData({ householdName: '', displayName: '', password: '', groupName: '', isAdmin: false });
      setShowForm(false);
      fetchHouseholds();
    } else {
      alert(data.error);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/households', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchHouseholds();
  };

  const deleteHousehold = async (id: string, name: string) => {
    if (!confirm(`"${name}" 가정을 정말 삭제하시겠습니까?\n관련된 모든 인증 데이터도 함께 삭제됩니다.`)) return;

    await fetch('/api/admin/households', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchHouseholds();
  };

  const deleteCheckin = async (checkinId: string) => {
    if (!confirm('이 인증을 삭제하시겠습니까?')) return;

    await fetch('/api/admin/checkins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinId }),
    });
    fetchCheckins();
  };

  const downloadCSV = () => {
    if (!checkins.length) return;

    const headers = ['가정명', '인증 날짜', '메시지', '인증 시간', '사진 수'];
    const rows = checkins.map(c => [
      c.households?.display_name || '',
      c.challenge_date,
      (c.message || '').replace(/,/g, ' '), // sanitize commas
      new Date(c.created_at).toLocaleString('ko-KR'),
      c.checkin_photos?.length || 0,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `challenge_checkins_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-amber-900 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 bg-white rounded-xl shadow-sm border border-amber-100 text-amber-600 hover:text-amber-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-black text-amber-900 flex items-center gap-2">
          <Settings size={20} className="text-amber-500" />
          관리자 패널
        </h1>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-amber-100/50 rounded-2xl">
          <button
            onClick={() => setTab('households')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-2 transition-all ${
              tab === 'households' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/70 hover:bg-white/50'
            }`}
          >
            <Users size={16} /> <span className="hidden sm:inline">가정 관리</span>
          </button>
          <button
            onClick={() => setTab('checkins')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-2 transition-all ${
              tab === 'checkins' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/70 hover:bg-white/50'
            }`}
          >
            <Camera size={16} /> <span className="hidden sm:inline">인증 확인</span>
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-2 transition-all ${
              tab === 'stats' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/70 hover:bg-white/50'
            }`}
          >
            <BarChart3 size={16} /> <span className="hidden sm:inline">참여 통계</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          
          {/* Households Tab */}
          {tab === 'households' && (
            <motion.div
              key="households"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-lg font-black text-amber-900">
                  등록된 가정 ({households.length})
                </h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    showForm 
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                      : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  }`}
                >
                  {showForm ? <><ChevronLeft size={14} className="-rotate-90"/> 양식 닫기</> : <><Plus size={14}/> 가정 추가</>}
                </button>
              </div>

              <AnimatePresence>
                {showForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/50 space-y-4 mb-6">
                      <h3 className="font-black text-amber-800 text-sm mb-2">새로운 가정 등록</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          placeholder="가정 아이디 (영문/숫자)"
                          value={formData.householdName}
                          onChange={(e) => setFormData({ ...formData, householdName: e.target.value })}
                          className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                        />
                        <input
                          placeholder="표시명 (예: 김하영 가정)"
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                        />
                        <input
                          placeholder="비밀번호 설정"
                          type="text"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                        />
                        <input
                          placeholder="소속/구역 (선택 사항)"
                          value={formData.groupName}
                          onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                          className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isAdmin}
                            onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-amber-100 border-transparent"
                          />
                          관리자 권한 부여
                        </label>
                        <button
                          onClick={createHousehold}
                          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-black shadow-md transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={16} /> 등록하기
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                {households.map((h) => (
                  <div key={h.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 sm:mt-0 shrink-0 ${h.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`} />
                      <div>
                        <div className="font-black text-amber-900 flex items-center gap-2">
                          {h.display_name}
                          {h.is_admin && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-500 font-bold mt-0.5 flex flex-wrap gap-2">
                          <span>ID: {h.household_name}</span>
                          {h.password && <span className="text-amber-300/50">|</span>}
                          {h.password && <span className="font-mono text-amber-600 bg-amber-50 px-1.5 rounded">{h.password}</span>}
                          {h.group_name && <span className="text-amber-300/50">|</span>}
                          {h.group_name && <span>{h.group_name}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto ml-6 sm:ml-0">
                      <button
                        onClick={() => toggleActive(h.id, h.is_active)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                          h.is_active 
                            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' 
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        }`}
                      >
                        {h.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => deleteHousehold(h.id, h.display_name)}
                        className="p-1.5 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
                        title="가정 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Checkins Tab */}
          {tab === 'checkins' && (
            <motion.div
              key="checkins"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2 px-1">
                <h2 className="text-lg font-black text-amber-900">
                  예배 인증 기록
                </h2>
                <div className="flex bg-white rounded-xl p-1 shadow-sm border border-amber-100 shrink-0">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-2 py-1 text-xs font-bold text-amber-800 outline-none bg-transparent"
                  />
                  <button
                    onClick={() => { setFilterDate(''); fetchCheckins(); }}
                    className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors ml-1"
                  >
                    전체 보기
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {checkins.length === 0 ? (
                  <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/50 border-dashed">
                    <ImageIcon size={40} className="mx-auto text-amber-200 mb-2" />
                    <p className="text-sm font-bold text-amber-400">인증 데이터가 없습니다.</p>
                  </div>
                ) : (
                  checkins.map((c) => (
                    <div key={c.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/50 flex flex-col sm:flex-row gap-4">
                      {/* Photo preview */}
                      <div className="shrink-0 flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                        {c.checkin_photos?.map(p => (
                          <img
                            key={p.id}
                            src={p.image_url}
                            alt="인증 사진"
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-amber-100 shadow-sm"
                          />
                        ))}
                        {(!c.checkin_photos || c.checkin_photos.length === 0) && (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 border-dashed">
                            <ImageIcon size={20} className="text-amber-200" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-black text-amber-900 truncate flex-1">
                              {c.households?.display_name}
                            </span>
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                              {c.challenge_date}
                            </span>
                          </div>
                          {c.message && (
                            <p className="text-xs text-amber-700 mt-1.5 leading-snug break-words line-clamp-2">
                              "{c.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-50/50">
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                            {new Date(c.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => deleteCheckin(c.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Stats Tab */}
          {tab === 'stats' && adminStats && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-black text-amber-900 px-1 mb-2">
                총 참여 현황 요약
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl p-5 text-white shadow-lg">
                  <p className="text-xs font-bold text-amber-100 mb-1">전체 가정</p>
                  <p className="text-4xl font-black">{adminStats.totalHouseholds}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl p-5 text-white shadow-lg">
                  <p className="text-xs font-bold text-orange-100 mb-1">누적 인증 횟수</p>
                  <p className="text-4xl font-black">{adminStats.totalCheckins}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-3xl p-5 text-white shadow-lg">
                  <p className="text-xs font-bold text-emerald-100 mb-1">10일 이상 (신실한)</p>
                  <div className="flex items-end gap-1">
                    <p className="text-4xl font-black">{adminStats.over10Days}</p>
                    <span className="text-sm font-bold mb-1">가정</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-400 to-purple-500 rounded-3xl p-5 text-white shadow-lg outline outline-2 outline-white/50 outline-offset-[-4px]">
                  <p className="text-xs font-bold text-purple-100 mb-1">13일 완주 (왕관)</p>
                  <div className="flex items-end gap-1">
                    <p className="text-4xl font-black">{adminStats.completed}</p>
                    <span className="text-sm font-bold mb-1">가정</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={downloadCSV}
                  className="w-full bg-white/80 backdrop-blur-sm shadow-sm border border-amber-200 hover:border-amber-400 text-amber-700 flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all"
                >
                  <Download size={18} />
                  전체 인증 데이터 CSV로 다운로드
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
