import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('households')
      .select('id, household_name, display_name')
      .eq('is_active', true)
      .order('display_name');

    if (error) throw error;

    return Response.json({ households: data });
  } catch (err) {
    console.error('Households fetch error:', err);
    return Response.json(
      { error: '가정 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
