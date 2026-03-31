import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { type NextRequest } from 'next/server';
import { getTodayKST } from '@/lib/constants';

function extractStoragePath(imageUrl: string): string | null {
  const marker = '/storage/v1/object/public/checkin-photos/';
  const privateMarker = '/storage/v1/object/sign/checkin-photos/';

  if (imageUrl.includes(marker)) {
    return imageUrl.split(marker)[1]?.split('?')[0] || null;
  }

  if (imageUrl.includes(privateMarker)) {
    return imageUrl.split(privateMarker)[1]?.split('?')[0] || null;
  }

  if (imageUrl.includes('/checkin-photos/')) {
    return imageUrl.split('/checkin-photos/')[1]?.split('?')[0] || null;
  }

  return null;
}

async function attachSignedPhotoUrls<
  T extends { checkin_photos?: Array<{ id: string; image_url: string; thumbnail_url?: string | null }> | null }
>(items: T[] | null) {
  if (!items?.length) return items;

  return Promise.all(
    items.map(async (item) => {
      const signedPhotos = await Promise.all(
        (item.checkin_photos || []).map(async (photo) => {
          const path = extractStoragePath(photo.image_url) || photo.image_url;
          if (!path) return photo;

          const { data } = await supabaseAdmin.storage
            .from('checkin-photos')
            .createSignedUrl(path, 60 * 60);

          if (!data?.signedUrl) return photo;

          return {
            ...photo,
            image_url: data.signedUrl,
            thumbnail_url: data.signedUrl,
          };
        })
      );

      return {
        ...item,
        checkin_photos: signedPhotos,
      };
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const formData = await request.formData();
    const message = formData.get('message') as string | null;
    const photos = formData.getAll('photos') as File[];

    if (!photos || photos.length === 0) {
      return Response.json(
        { error: '사진을 1장 이상 업로드해주세요.' },
        { status: 400 }
      );
    }

    if (photos.length > 3) {
      return Response.json(
        { error: '사진은 최대 3장까지 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // Get today's date in KST
    const challengeDate = getTodayKST();

    // Check if already checked in today
    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('household_id', session.householdId)
      .eq('challenge_date', challengeDate)
      .single();

    if (existing) {
      return Response.json(
        { error: '오늘은 이미 인증했습니다.' },
        { status: 409 }
      );
    }

    // Create checkin record
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert({
        household_id: session.householdId,
        challenge_date: challengeDate,
        message: message || null,
      })
      .select()
      .single();

    if (checkinError) throw checkinError;

    // Upload photos
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        continue;
      }

      const fileName = `${session.householdId}/${challengeDate}/${Date.now()}_${i}.${ext}`;
      const arrayBuffer = await photo.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from('checkin-photos')
        .upload(fileName, arrayBuffer, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`사진 업로드에 실패했습니다: ${uploadError.message}`);
      }

      const { data: urlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('checkin-photos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      if (signedUrlError || !urlData?.signedUrl) {
        throw new Error('업로드한 사진의 접근 URL 생성에 실패했습니다.');
      }

      photoUrls.push(urlData.signedUrl);

      // Save photo record
      const { error: photoInsertError } = await supabaseAdmin.from('checkin_photos').insert({
        checkin_id: checkin.id,
        image_url: fileName,
        thumbnail_url: fileName,
      });

      if (photoInsertError) {
        throw photoInsertError;
      }
    }

    if (photoUrls.length === 0) {
      throw new Error('업로드된 사진이 없습니다. Storage 설정을 확인해주세요.');
    }

    // Calculate streak and check for new badges
    const { data: allCheckins } = await supabase
      .from('checkins')
      .select('challenge_date')
      .eq('household_id', session.householdId)
      .order('challenge_date', { ascending: true });

    const streak = calculateStreak(allCheckins?.map(c => c.challenge_date) || [], challengeDate);

    // Award badges
    const newBadge = await awardBadges(session.householdId, streak);

    return Response.json({
      success: true,
      checkinId: checkin.id,
      streak,
      newBadge,
      photoCount: photoUrls.length,
    });
  } catch (err) {
    console.error('Checkin error:', err);
    return Response.json(
      { error: '인증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    let query = supabase
      .from('checkins')
      .select(`
        id,
        challenge_date,
        message,
        created_at,
        households!inner (
          id,
          display_name,
          household_name
        ),
        checkin_photos (
          id,
          image_url,
          thumbnail_url
        )
      `)
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('challenge_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;

    const checkinsWithSignedUrls = await attachSignedPhotoUrls(data);

    return Response.json({ checkins: checkinsWithSignedUrls });
  } catch (err) {
    console.error('Checkin fetch error:', err);
    return Response.json(
      { error: '인증 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function calculateStreak(dates: string[], today: string): number {
  if (!dates.length) return 0;

  const sortedDates = [...new Set(dates)].sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffTime = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

function getTodayKSTForDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

async function awardBadges(householdId: string, streak: number) {
  const badgeThresholds = [
    { code: 'first_step', days: 1 },
    { code: 'sprout', days: 3 },
    { code: 'steady', days: 5 },
    { code: 'week', days: 7 },
    { code: 'faithful', days: 10 },
    { code: 'complete', days: 13 },
  ];

  let newBadge = null;

  for (const threshold of badgeThresholds) {
    if (streak >= threshold.days) {
      // Check if already has this badge
      const { data: badge } = await supabase
        .from('badges')
        .select('id')
        .eq('badge_code', threshold.code)
        .single();

      if (badge) {
        const { data: existing } = await supabase
          .from('household_badges')
          .select('id')
          .eq('household_id', householdId)
          .eq('badge_id', badge.id)
          .single();

        if (!existing) {
          await supabase.from('household_badges').insert({
            household_id: householdId,
            badge_id: badge.id,
          });

          if (streak === threshold.days) {
            newBadge = threshold;
          }
        }
      }
    }
  }

  return newBadge;
}
