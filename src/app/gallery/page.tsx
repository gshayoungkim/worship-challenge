'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TOTAL_DAYS, createChallengeDateKey, getTodayKST } from '@/lib/constants';

interface CheckinItem {
  id: string;
  challenge_date: string;
  message: string | null;
  created_at: string;
  households: {
    display_name: string;
  };
  checkin_photos: Array<{
    id: string;
    image_url: string;
  }>;
}

export default function GalleryPage() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const challengeDates = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const d = new Date(2026, 3, 6 + i);
    return {
      date: createChallengeDateKey(2026, 3, 6 + i),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayLabel: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
    };
  });

  const todayStr = getTodayKST();

  const fetchCheckins = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const url = date ? `/api/checkin?date=${date}` : '/api/checkin';
      const res = await fetch(url);
      const data = await res.json();
      if (data.checkins) {
        setCheckins(data.checkins);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.replace('/');
          return;
        }
        fetchCheckins(todayStr);
        setSelectedDate(todayStr);
      })
      .catch(() => router.replace('/'));
  }, [router, fetchCheckins, todayStr]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchCheckins(date);
  };

  return (
    <div className="min-h-screen relative" style={{ zIndex: 5 }}>
      {/* Header */}
      <header className="text-center pt-8 pb-4 px-5 relative" style={{ zIndex: 10 }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="absolute left-4 top-8 cursor-pointer px-3 py-2 rounded-xl"
          style={{
            background: 'white',
            border: '2px solid #ddd',
            fontSize: '14px',
            color: 'var(--color-brown)',
          }}
        >
          ← 대시보드
        </button>
        <div
          style={{
            fontFamily: 'var(--font-gaegu)',
            fontSize: 'clamp(24px, 5vw, 36px)',
            fontWeight: 700,
            color: 'var(--color-brown)',
          }}
        >
          📸 예배 사진 갤러리
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-16 relative" style={{ zIndex: 5 }}>
        {/* Date Selector */}
        <div className="card shadow-mint">
          <div
            className="mb-3"
            style={{ fontFamily: 'var(--font-gaegu)', fontSize: '18px', color: 'var(--color-brown)', fontWeight: 700 }}
          >
            📅 날짜 선택
          </div>
          <div className="flex flex-wrap gap-2">
            {challengeDates.map((cd) => {
              const isFuture = cd.date > todayStr;
              const isSelected = cd.date === selectedDate;
              return (
                <button
                  key={cd.date}
                  onClick={() => !isFuture && handleDateChange(cd.date)}
                  disabled={isFuture}
                  className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, var(--color-warm-yellow), var(--color-orange))'
                      : isFuture ? '#f5f5f5' : 'white',
                    border: isSelected
                      ? '2px solid var(--color-brown)'
                      : '2px solid #e8e0d5',
                    color: isSelected
                      ? 'var(--color-brown)'
                      : isFuture ? '#ccc' : '#888',
                    opacity: isFuture ? 0.5 : 1,
                  }}
                >
                  {cd.label}<br />{cd.dayLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-pulse-slow">📸</div>
            <p style={{ color: '#ccc', fontSize: '14px' }}>로딩 중...</p>
          </div>
        ) : checkins.length === 0 ? (
          <div className="card shadow-yellow text-center">
            <div className="text-4xl mb-4">😴</div>
            <p style={{ color: '#ccc', fontSize: '14px' }}>
              이 날짜에는 아직 인증 사진이 없어요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="photo-card animate-fadeInUp">
                {/* Photo */}
                {checkin.checkin_photos.length > 0 && (
                  <div
                    className="cursor-pointer overflow-hidden"
                    onClick={() => setSelectedPhoto(checkin.checkin_photos[0].image_url)}
                  >
                    <img
                      src={checkin.checkin_photos[0].image_url}
                      alt={`${checkin.households?.display_name}의 예배`}
                      className="w-full h-48 object-cover transition-transform hover:scale-105"
                      loading="lazy"
                    />
                    {checkin.checkin_photos.length > 1 && (
                      <div
                        className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: 'rgba(0,0,0,0.5)',
                          color: 'white',
                        }}
                      >
                        +{checkin.checkin_photos.length - 1}
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-bold text-sm"
                      style={{ color: 'var(--color-brown)' }}
                    >
                      🏠 {checkin.households?.display_name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#ccc' }}>
                      {new Date(checkin.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {checkin.message && (
                    <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
                      &ldquo;{checkin.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', zIndex: 5000 }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-lg w-full animate-bounceIn" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="확대 보기"
              className="w-full rounded-2xl"
              style={{ border: '3px solid white' }}
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-lg"
              style={{
                background: 'var(--color-coral)',
                color: 'white',
                border: '3px solid white',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
