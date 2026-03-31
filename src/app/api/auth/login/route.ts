import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { householdName, password } = await request.json();

    if (!householdName || !password) {
      return Response.json(
        { error: '가정명과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const { data: household, error } = await supabase
      .from('households')
      .select('*')
      .eq('household_name', householdName)
      .eq('is_active', true)
      .single();

    if (error || !household) {
      return Response.json(
        { error: '등록되지 않은 가정이거나 비활성화된 계정입니다.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, household.password_hash);
    if (!passwordMatch) {
      return Response.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    await createSession({
      householdId: household.id,
      householdName: household.household_name,
      displayName: household.display_name,
      isAdmin: household.is_admin || false,
    });

    return Response.json({
      success: true,
      household: {
        id: household.id,
        householdName: household.household_name,
        displayName: household.display_name,
        isAdmin: household.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
