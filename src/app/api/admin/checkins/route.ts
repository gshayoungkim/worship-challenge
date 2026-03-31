import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { type NextRequest } from 'next/server';

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

async function checkAdmin() {
  const session = await getSession();
  if (!session || !session.isAdmin) return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');

  try {
    let query = supabase
      .from('checkins')
      .select(`
        id,
        challenge_date,
        message,
        created_at,
        households (
          id,
          display_name,
          household_name
        ),
        checkin_photos (
          id,
          image_url
        )
      `)
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('challenge_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;

    const checkinsWithSignedUrls = await Promise.all(
      (data || []).map(async (checkin) => {
        const checkinPhotos = await Promise.all(
          (checkin.checkin_photos || []).map(async (photo) => {
            const path = extractStoragePath(photo.image_url) || photo.image_url;
            if (!path) return photo;

            const { data: signedUrlData } = await supabaseAdmin.storage
              .from('checkin-photos')
              .createSignedUrl(path, 60 * 60);

            if (!signedUrlData?.signedUrl) return photo;

            return {
              ...photo,
              image_url: signedUrlData.signedUrl,
            };
          })
        );

        return {
          ...checkin,
          checkin_photos: checkinPhotos,
        };
      })
    );

    // Stats
    const { data: allHouseholds } = await supabase
      .from('households')
      .select('id')
      .eq('is_active', true);

    const { data: allCheckins } = await supabase
      .from('checkins')
      .select('household_id, challenge_date');

    // Count households that completed >= 10 days
    const householdCounts: Record<string, number> = {};
    (allCheckins || []).forEach(c => {
      householdCounts[c.household_id] = (householdCounts[c.household_id] || 0) + 1;
    });

    const over10 = Object.values(householdCounts).filter(count => count >= 10).length;
    const completed = Object.values(householdCounts).filter(count => count >= 13).length;

    return Response.json({
      checkins: checkinsWithSignedUrls,
      stats: {
        totalHouseholds: allHouseholds?.length || 0,
        totalCheckins: allCheckins?.length || 0,
        over10Days: over10,
        completed,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return Response.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: Delete a specific checkin (and its photos)
export async function DELETE(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const { checkinId } = await request.json();

    // Delete photos from storage first
    const { data: photos } = await supabase
      .from('checkin_photos')
      .select('image_url')
      .eq('checkin_id', checkinId);

    if (photos) {
      for (const photo of photos) {
        const path = extractStoragePath(photo.image_url) || photo.image_url;
        if (path) {
          await supabaseAdmin.storage.from('checkin-photos').remove([path]);
        }
      }
    }

    // Delete checkin (cascade will remove photos records)
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('id', checkinId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('Delete checkin error:', err);
    return Response.json({ error: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
