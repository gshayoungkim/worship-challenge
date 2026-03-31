#!/usr/bin/env node
/**
 * 관리자/가정 계정 생성 스크립트
 * 사용법: node scripts/create-household.mjs
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 수동 로드 (dotenv 없이)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error('⚠️  .env.local 파일을 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요.');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function validateSupabaseUrl(rawUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. 예: https://your-project-ref.supabase.co'
    );
  }

  const isProjectApiHost = /^[a-z0-9-]+\.supabase\.co$/i.test(parsedUrl.host);
  if (!isProjectApiHost) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL에는 Supabase 대시보드 주소가 아니라 프로젝트 API 주소를 넣어야 합니다. 예: https://your-project-ref.supabase.co'
    );
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log('\n🏠 365 가정예배 챌린지 - 계정 생성\n');

  validateSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const householdName = await ask('가정명 (로그인 ID, 영어/숫자, 예: kim_family): ');
  const displayName = await ask('표시명 (한글 가능, 예: 김하영 가정): ');
  const password = await ask('비밀번호: ');
  const groupName = await ask('셀/구역 (선택, 없으면 Enter): ');
  const isAdminStr = await ask('관리자 권한? (y/N): ');

  const passwordHash = await bcrypt.hash(password, 10);
  const isAdmin = isAdminStr.trim().toLowerCase() === 'y';

  const { data, error } = await supabase
    .from('households')
    .insert({
      household_name: householdName.trim(),
      display_name: displayName.trim(),
      password_hash: passwordHash,
      group_name: groupName.trim() || null,
      is_admin: isAdmin,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('\n❌ 오류:', error.message);
  } else {
    console.log(`\n✅ 생성 완료!`);
    console.log(`   ID: ${data.id}`);
    console.log(`   가정명: ${data.household_name}`);
    console.log(`   표시명: ${data.display_name}`);
    console.log(`   관리자: ${data.is_admin ? '예' : '아니오'}`);
  }

  rl.close();
}

main().catch(console.error);
