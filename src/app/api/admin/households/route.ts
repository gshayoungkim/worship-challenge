import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { type NextRequest } from 'next/server';

// Middleware to check admin
async function checkAdmin() {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return null;
  }
  return session;
}

// GET: List all households
export async function GET() {
  const session = await checkAdmin();
  if (!session) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('households')
    .select('id, household_name, display_name, group_name, is_active, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ households: data });
}

// POST: Create new household
export async function POST(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { householdName, displayName, password, groupName, isAdmin } = body;

    if (!householdName || !displayName || !password) {
      return Response.json(
        { error: '가정명, 표시명, 비밀번호는 필수입니다.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('households')
      .insert({
        household_name: householdName,
        display_name: displayName,
        password_hash: passwordHash,
        group_name: groupName || null,
        is_admin: isAdmin || false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json(
          { error: '이미 존재하는 가정명입니다.' },
          { status: 409 }
        );
      }
      throw error;
    }

    return Response.json({ success: true, household: data });
  } catch (err) {
    console.error('Create household error:', err);
    return Response.json(
      { error: '가정 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: Update household
export async function PATCH(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, displayName, password, groupName, isActive, isAdmin } = body;

    if (!id) {
      return Response.json({ error: '가정 ID가 필요합니다.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (groupName !== undefined) updates.group_name = groupName;
    if (isActive !== undefined) updates.is_active = isActive;
    if (isAdmin !== undefined) updates.is_admin = isAdmin;
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const { error } = await supabase
      .from('households')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('Update household error:', err);
    return Response.json(
      { error: '가정 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete household
export async function DELETE(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return Response.json({ error: '가정 ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('Delete household error:', err);
    return Response.json(
      { error: '가정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
