'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ImageIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function CheckInPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 3);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !message.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('photos', f));
      if (message.trim()) formData.append('message', message.trim());

      const res = await fetch('/api/checkin', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증 실패');

      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 bg-white rounded-xl shadow-sm border border-amber-100 text-amber-600 hover:text-amber-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-black text-amber-900">오늘의 예배 인증</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Photo Upload */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-amber-800 ml-1">
                예배 사진 업로드 <span className="text-amber-400 font-normal">(선택, 최대 3장)</span>
              </label>

              {previews.length === 0 ? (
                <div
                  onClick={() => !loading && document.getElementById('photo-input')?.click()}
                  className={`aspect-video rounded-3xl border-4 border-dashed border-amber-100 bg-amber-50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ImageIcon size={48} className="text-amber-200 mb-2" />
                  <p className="text-xs font-bold text-amber-400">사진을 선택하거나 촬영하세요</p>
                  <p className="text-[10px] text-amber-300 mt-1">JPG, PNG, WEBP 지원</p>
                </div>
              ) : (
                <div
                  className="grid gap-2 cursor-pointer"
                  style={{ gridTemplateColumns: previews.length === 1 ? '1fr' : 'repeat(2, 1fr)' }}
                  onClick={() => !loading && document.getElementById('photo-input')?.click()}
                >
                  {previews.map((p, i) => (
                    <div key={i} className="relative">
                      <img
                        src={p}
                        alt={`Preview ${i + 1}`}
                        className="w-full rounded-2xl object-cover"
                        style={{ height: previews.length === 1 ? '200px' : '140px' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <input
                id="photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {previews.length > 0 && (
                <button
                  onClick={() => !loading && document.getElementById('photo-input')?.click()}
                  className="w-full text-xs font-bold text-amber-500 hover:text-amber-700 py-1 transition-colors"
                >
                  사진 변경하기
                </button>
              )}
            </div>

            {/* Example Photos */}
            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-50 space-y-2">
              <p className="text-[10px] font-black text-amber-700 flex items-center gap-1">
                ✨ 이런 사진을 올려주세요!
              </p>
              <div className="grid grid-cols-2 gap-2">
                <img src="/example1.jpeg" alt="예시사진 1" className="w-full h-24 object-cover rounded-xl" />
                <img src="/example2.jpeg" alt="예시사진 2" className="w-full h-24 object-cover rounded-xl" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-xs font-black text-amber-800 ml-1">
                오늘의 한줄 고백 <span className="text-amber-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                placeholder="오늘 예배를 통해 느낀 은혜를 나눠주세요"
                className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-amber-400 transition-colors h-24 resize-none disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="submit-checkin"
              onClick={handleSubmit}
              disabled={(files.length === 0 && !message.trim()) || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> 업로드 중...</>
              ) : (
                <><CheckCircle2 size={20} /> 인증 완료하기</>
              )}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-black text-amber-700">📸 사진 업로드 안내</p>
            <ul className="text-[10px] text-amber-500 font-bold space-y-0.5 ml-2">
              <li>• 가족이 함께 예배하는 모습을 촬영해주세요</li>
              <li>• 하루에 한 번만 인증이 가능합니다</li>
              <li>• 사진은 교회 가정들만 볼 수 있어요</li>
            </ul>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
