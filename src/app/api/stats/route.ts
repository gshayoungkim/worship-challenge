import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
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

  return imageUrl || null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // Get today's date in KST
    const today = getTodayKST();

    // My checkins
    const { data: myCheckins } = await supabase
      .from('checkins')
      .select('challenge_date')
      .eq('household_id', session.householdId)
      .order('challenge_date');

    // My badges
    const { data: myBadges } = await supabase
      .from('household_badges')
      .select(`
        awarded_at,
        badges (
          badge_code,
          badge_name,
          badge_emoji,
          min_streak,
          description
        )
      `)
      .eq('household_id', session.householdId);

    // Today's completers
    const { data: todayCheckins } = await supabase
      .from('checkins')
      .select(`
        id,
        message,
        households (
          display_name
        ),
        checkin_photos (
          id,
          image_url
        )
      `)
      .eq('challenge_date', today);

    // Leaderboard: all households with their checkin counts
    const { data: allHouseholds } = await supabase
      .from('households')
      .select('id, display_name')
      .eq('is_active', true);

    const { data: allCheckins } = await supabase
      .from('checkins')
      .select('household_id, challenge_date')
      .order('challenge_date');

    // Calculate streaks for leaderboard
    const leaderboard = (allHouseholds || []).map(h => {
      const householdCheckins = (allCheckins || [])
        .filter(c => c.household_id === h.id)
        .map(c => c.challenge_date)
        .sort();

      const streak = calculateStreak(householdCheckins, today);
      const total = householdCheckins.length;

      return {
        displayName: h.display_name,
        streak,
        total,
        dates: householdCheckins,
      };
    })
    .filter(h => h.total > 0)
    .sort((a, b) => b.total - a.total || b.streak - a.streak)
    .slice(0, 10);

    // Overall stats
    const totalHouseholds = allHouseholds?.length || 0;
    const todayCount = todayCheckins?.length || 0;
    const totalCheckins = allCheckins?.length || 0;

    // My streak
    const myDates = (myCheckins || []).map(c => c.challenge_date);
    const myStreak = calculateStreak(myDates, today);
    const checkedToday = myDates.includes(today);

    const todayCompletersDetailed = await Promise.all(
      (todayCheckins || []).map(async (checkin) => {
        const household = checkin.households as unknown as { display_name: string } | null;
        const photos = await Promise.all(
          (((checkin.checkin_photos as Array<{ id: string; image_url: string }> | null) || [])).map(async (photo) => {
            const path = extractStoragePath(photo.image_url);
            if (!path) return photo;

            const { data } = await supabaseAdmin.storage
              .from('checkin-photos')
              .createSignedUrl(path, 60 * 60);

            return {
              ...photo,
              image_url: data?.signedUrl || photo.image_url,
            };
          })
        );

        return {
          checkinId: checkin.id,
          displayName: household?.display_name || '',
          message: checkin.message || null,
          photos,
        };
      })
    );

    return Response.json({
      myStreak,
      myDates,
      myBadges: myBadges || [],
      checkedToday,
      todayCompleters: todayCompletersDetailed.filter((item) => item.displayName),
      leaderboard,
      stats: {
        totalHouseholds,
        todayCount,
        totalCheckins,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return Response.json(
      { error: '통계를 불러오는 중 오류가 발생했습니다.' },
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
