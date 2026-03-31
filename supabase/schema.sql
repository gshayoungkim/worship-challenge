-- ================================================
-- 365 가정예배 챌린지 - Supabase 스키마
-- ================================================

-- 1. households: 사전 등록된 가정 계정
CREATE TABLE IF NOT EXISTS households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. checkins: 일일 예배 인증
CREATE TABLE IF NOT EXISTS checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, challenge_date)
);

-- 3. checkin_photos: 인증 사진
CREATE TABLE IF NOT EXISTS checkin_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. badges: 뱃지 정의 (시드 데이터)
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_code TEXT NOT NULL UNIQUE,
  badge_name TEXT NOT NULL,
  badge_emoji TEXT NOT NULL,
  min_streak INT NOT NULL,
  description TEXT
);

-- 5. household_badges: 가정별 획득 뱃지
CREATE TABLE IF NOT EXISTS household_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, badge_id)
);

-- ================================================
-- 인덱스
-- ================================================
CREATE INDEX IF NOT EXISTS idx_checkins_household_date ON checkins(household_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(challenge_date);
CREATE INDEX IF NOT EXISTS idx_checkin_photos_checkin ON checkin_photos(checkin_id);

-- ================================================
-- 시드 데이터: 뱃지
-- ================================================
INSERT INTO badges (badge_code, badge_name, badge_emoji, min_streak, description) VALUES
  ('first_step', '첫걸음', '🌱', 1, '첫 번째 예배를 드렸어요!'),
  ('sprout', '새싹 예배자', '🌿', 3, '3일 연속 예배 달성!'),
  ('steady', '꾸준한 가정', '🌻', 5, '5일 연속! 습관이 시작됩니다'),
  ('week', '일주일 동행', '🌟', 7, '일주일 연속 예배! 놀라워요 🎉'),
  ('faithful', '신실한 예배자', '👑', 10, '10일 연속! 진정한 예배자!'),
  ('complete', '완주 가정', '🏆', 13, '13일 완주! 하나님이 기뻐하십니다 💫')
ON CONFLICT (badge_code) DO NOTHING;

-- ================================================
-- Storage bucket (Supabase 대시보드에서 수동 생성 필요)
-- 버킷명: checkin-photos
-- 공개 여부: private (RLS로 제어)
-- ================================================
