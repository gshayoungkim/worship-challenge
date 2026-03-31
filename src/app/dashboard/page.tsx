'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Camera,
  Calendar,
  Trophy,
  Users,
  LogOut,
  CheckCircle2,
  Loader2,
  Lock,
  Home,
  Settings,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────
type ActiveView = 'home' | 'community';

interface StatsData {
  myStreak: number;
  myDates: string[];
  myBadges: Array<{ badges: { badge_code: string; badge_name: string; badge_emoji: string } }>;
  checkedToday: boolean;
  todayCompleters: Array<{
    checkinId: string;
    displayName: string;
    message: string | null;
    photos: Array<{ id: string; image_url: string }>;
  }>;
  leaderboard: Array<{ displayName: string; streak: number; total: number; dates: string[] }>;
  stats: { totalHouseholds: number; todayCount: number; totalCheckins: number };
}

interface CheckinItem {
  id: string;
  challenge_date: string;
  message: string | null;
  households: { display_name: string };
  checkin_photos: Array<{ id: string; image_url: string }>;
}

interface SessionData {
  authenticated: boolean;
  displayName: string;
  isAdmin: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CHALLENGE_START = '2026-04-06';
const CHALLENGE_DAYS = 13;

const BADGES = [
  { code: 'first_step', name: '첫걸음', icon: '🌱', days: 1 },
  { code: 'sprout', name: '새싹 예배자', icon: '🌿', days: 3 },
  { code: 'steady', name: '꾸준한 가정', icon: '🌳', days: 5 },
  { code: 'week', name: '일주일 동행', icon: '✨', days: 7 },
  { code: 'faithful', name: '신실한 예배자', icon: '🙏', days: 10 },
  { code: 'complete', name: '완주 가정', icon: '👑', days: 13 },
];

function getTodayKST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-amber-600 scale-110' : 'text-amber-300 hover:text-amber-400'}`}
    >
      <div className={`p-2 rounded-2xl ${active ? 'bg-amber-100' : 'bg-transparent'}`}>
        <Icon size={24} strokeWidth={active ? 3 : 2} />
      </div>
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );
}

function BadgeItem({ icon, name, earned }: { icon: string; name: string; earned: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-all ${earned ? 'opacity-100 scale-105' : 'opacity-30 grayscale'}`}>
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl shadow-inner border border-amber-200">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-amber-800 text-center leading-tight">{name}</span>
    </div>
  );
}

// ─── Community Tab ───────────────────────────────────────────────────────────
function CommunityTab({ stats, todayStr }: { stats: StatsData; todayStr: string }) {
  const challengeDates = useMemo(() =>
    Array.from({ length: CHALLENGE_DAYS }, (_, i) => {
      const d = addDays(parseISO(CHALLENGE_START), i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'M/d'), day: format(d, 'EEE') };
    }), []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string; message: string | null } | null>(null);

  const fetchCheckins = useCallback(async (date: string) => {
    setGalleryLoading(true);
    try {
      const res = await fetch(`/api/checkin?date=${date}`);
      const data = await res.json();
      setCheckins(data.checkins || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  useEffect(() => { fetchCheckins(todayStr); }, [fetchCheckins, todayStr]);

  return (
    <motion.div
      key="community"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '참여 가정', value: stats.stats.totalHouseholds, color: 'text-amber-500' },
          { label: '오늘 완료', value: stats.stats.todayCount, color: 'text-orange-500' },
          { label: '누적 인증', value: stats.stats.totalCheckins, color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/50 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-amber-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Date Gallery */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/50 space-y-4">
        <h3 className="text-sm font-black flex items-center gap-2">
          <Calendar size={16} className="text-amber-500" />
          날짜별 예배 현황
        </h3>

        {/* Date selector */}
        <div className="flex gap-1.5 flex-wrap">
          {challengeDates.map((cd) => {
            const isSelected = cd.date === selectedDate;
            return (
              <button
                key={cd.date}
                onClick={() => { setSelectedDate(cd.date); fetchCheckins(cd.date); }}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
              >
                {cd.label}
                <br />
                <span className="opacity-70">{cd.day}</span>
              </button>
            );
          })}
        </div>

        {/* Checkins for selected date */}
        {galleryLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="animate-spin text-amber-400" size={32} />
          </div>
        ) : checkins.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="text-4xl">😴</div>
            <p className="text-xs font-bold text-amber-300">이 날짜엔 아직 인증한 가정이 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Household badges */}
            <div className="flex flex-wrap gap-2">
              {checkins.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full border border-amber-200"
                >
                  🏠 {c.households?.display_name}
                </span>
              ))}
            </div>

            {/* Photo grid */}
            {checkins.some(c => c.checkin_photos.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {checkins.filter(c => c.checkin_photos.length > 0).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm"
                    onClick={() => setSelectedPhoto({ url: c.checkin_photos[0].image_url, name: c.households?.display_name, message: c.message })}
                  >
                    <img
                      src={c.checkin_photos[0].image_url}
                      alt={`${c.households?.display_name} 예배`}
                      className="w-full h-28 object-cover"
                      loading="lazy"
                    />
                    <div className="bg-amber-50 px-2 py-1">
                      <p className="text-[10px] font-black text-amber-700 truncate">🏠 {c.households?.display_name}</p>
                      {c.message && (
                        <p className="text-[9px] text-amber-400 truncate">"{c.message}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/50 space-y-3">
        <h3 className="text-sm font-black flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          함께 걷는 가정들
        </h3>
        {stats.leaderboard.length === 0 ? (
          <p className="text-xs text-amber-300 font-bold text-center py-4">아직 참여자가 없어요</p>
        ) : (
          <div className="space-y-1">
            {stats.leaderboard.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-amber-50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-amber-50 text-amber-400 border border-amber-100">
                  {idx + 1}
                </div>
                <p className="flex-1 text-sm font-black text-amber-900">{entry.displayName}</p>
                <span className="text-xs font-bold text-amber-400 bg-amber-50 px-2 py-0.5 rounded-full">
                  총 {entry.total}일 인증
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-sm w-full space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1">
              <p className="text-white font-black text-sm">🏠 {selectedPhoto.name}</p>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedPhoto.url}
              alt="Worship photo"
              className="w-full rounded-2xl"
            />
            {selectedPhoto.message && (
              <div className="bg-amber-50 rounded-2xl p-3 shadow-lg">
                <p className="text-sm text-amber-800 leading-relaxed font-medium text-center">"{selectedPhoto.message}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState<ActiveView>('home');
  const [session, setSession] = useState<SessionData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Stamp photo modal
  const [stampModal, setStampModal] = useState<{ date: string; photos: Array<{ id: string; image_url: string }>; message: string | null } | null>(null);
  const [stampLoading, setStampLoading] = useState(false);

  const todayStr = getTodayKST();

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, statsRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/stats'),
      ]);
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) { router.replace('/'); return; }
      setSession(sessionData);
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
  };

  const handleStampClick = async (date: string) => {
    if (!stats?.myDates.includes(date)) return;
    setStampLoading(true);
    setStampModal({ date, photos: [], message: null });
    try {
      const res = await fetch(`/api/checkin?date=${date}`);
      const data = await res.json();
      const mine = (data.checkins || []).find((c: CheckinItem) =>
        c.households?.display_name === session?.displayName
      );
      if (mine) {
        setStampModal({ date, photos: mine.checkin_photos || [], message: mine.message });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStampLoading(false);
    }
  };

  const challengeDates = useMemo(() =>
    Array.from({ length: CHALLENGE_DAYS }, (_, i) => {
      const d = addDays(parseISO(CHALLENGE_START), i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'M/d') };
    }), []);

  const streak = stats?.myStreak ?? 0;
  const earnedBadgeCodes = useMemo(() =>
    stats?.myBadges.map(b => b.badges?.badge_code) ?? [], [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  if (!session || !stats) return null;

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-amber-900 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Heart fill="currentColor" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black text-amber-900 leading-tight">365 가정예배</h1>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Challenge 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-xl text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Settings size={20} />
            </button>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-md mx-auto p-4 pb-28">
        <AnimatePresence mode="wait">

          {/* ── Home Tab ── */}
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl p-6 shadow-xl border border-white/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-black mb-1">{session.displayName} 가정</h2>
                    <p className="text-amber-100 text-xs font-medium">부활절 13일 챌린지</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    Level {earnedBadgeCodes.length}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-[10px] text-amber-100 font-bold uppercase mb-1">연속 예배일</p>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black">{streak}</span>
                      <span className="text-xs font-bold mb-1">일째 🔥</span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-[10px] text-amber-100 font-bold uppercase mb-1">전체 인증</p>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black">{stats.myDates.length}</span>
                      <span className="text-xs font-bold mb-1">회</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stamp Board */}
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" />
                    13일 챌린지 스탬프
                  </h3>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                    {stats.myDates.length} / 13
                  </span>
                </div>
                <p className="text-[10px] text-amber-400 font-bold px-1 mb-3">✨ 스탬프를 누르면 그날의 예배 사진을 볼 수 있어요</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {challengeDates.map(({ date, label }) => {
                    const isDone = stats.myDates.includes(date);
                    const isFuture = date > todayStr;
                    const isToday = isSameDay(parseISO(date), new Date());

                    return (
                      <div
                        key={date}
                        onClick={() => isDone && handleStampClick(date)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                          isDone
                            ? 'bg-amber-100 border-amber-300 shadow-sm hover:scale-110 active:scale-95'
                            : isToday
                            ? 'bg-white border-amber-400 animate-pulse'
                            : isFuture
                            ? 'bg-gray-50 border-gray-100 opacity-40 cursor-default'
                            : 'bg-white border-amber-100'
                        }`}
                      >
                        {isDone ? (
                          <Heart fill="#f59e0b" className="text-amber-500" size={22} />
                        ) : (
                          <span className={`text-xs font-black ${isFuture ? 'text-gray-300' : 'text-amber-200'}`}>
                            {label.split('/')[1]}
                          </span>
                        )}
                        <span className="text-[8px] font-bold mt-0.5 opacity-50 text-amber-600">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Badges */}
              <section>
                <h3 className="text-sm font-black flex items-center gap-2 mb-3 px-1">
                  <Trophy size={16} className="text-amber-500" />
                  획득한 뱃지
                </h3>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/50 grid grid-cols-3 gap-4">
                  {BADGES.map((badge) => (
                    <BadgeItem
                      key={badge.code}
                      icon={badge.icon}
                      name={badge.name}
                      earned={earnedBadgeCodes.includes(badge.code) || streak >= badge.days}
                    />
                  ))}
                </div>
              </section>

              {/* Check-in CTA */}
              {!stats.checkedToday ? (
                <div className="fixed bottom-24 left-0 right-0 px-4 max-w-md mx-auto">
                  <button
                    id="checkin-cta"
                    onClick={() => router.push('/checkin')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-3xl font-black text-lg bg-amber-500 hover:bg-amber-600 text-white shadow-2xl transition-all active:scale-95"
                  >
                    <Camera size={22} />
                    오늘 예배 인증하기
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-green-800">오늘 예배 완료! 🎉</p>
                    <p className="text-xs text-green-600 font-medium">내일 또 만나요, 신실한 예배자님 ✨</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Community Tab ── */}
          {view === 'community' && (
            <CommunityTab stats={stats} todayStr={todayStr} />
          )}

        </AnimatePresence>

        {/* Footer Verse */}
        <div className="mt-12 mb-8 text-center px-2 opacity-80">
          <p className="text-xs font-bold text-amber-700 leading-loose break-keep">
            "오늘 내가 네게 명하는 이 말씀을 너는 마음에 새기고 네 자녀에게 부지런히 가르치며 집에 앉았을 때에든지 길을 갈 때에든지 누워 있을 때에든지 일어날 때에든지 이 말씀을 강론할 것이며"
          </p>
          <p className="text-[10px] font-black text-amber-600 mt-2 tracking-widest">
            - 신명기 6:6-7 -
          </p>
        </div>
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-amber-100 px-6 py-3 flex justify-around items-center z-50">
        <NavButton active={view === 'home'} onClick={() => setView('home')} icon={Home} label="홈" />
        <NavButton active={view === 'community'} onClick={() => setView('community')} icon={Users} label="공동체" />
        {session.isAdmin && (
          <NavButton active={false} onClick={() => router.push('/admin')} icon={Lock} label="관리" />
        )}
      </nav>

      {/* ── Stamp Photo Modal ── */}
      {stampModal && (
        <div
          className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
          onClick={() => setStampModal(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-amber-100">
              <div>
                <p className="text-[10px] font-bold text-amber-400 uppercase">나의 예배 기록</p>
                <p className="text-base font-black text-amber-900">{stampModal.date}</p>
              </div>
              <button
                onClick={() => setStampModal(null)}
                className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-black"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {stampLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-amber-400" size={32} />
                </div>
              ) : stampModal.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {stampModal.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.image_url}
                      alt="예배 사진"
                      className="w-full h-36 object-cover rounded-2xl"
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <ImageIcon size={40} className="text-amber-200 mx-auto mb-2" />
                  <p className="text-xs text-amber-300 font-bold">사진이 없어요</p>
                </div>
              )}
              {stampModal.message && (
                <div className="bg-amber-50 rounded-2xl p-3">
                  <p className="text-sm text-amber-800 leading-relaxed font-medium">"{stampModal.message}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
