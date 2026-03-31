import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cnstmburgewhzvuiapwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuc3RtYnVyZ2V3aHp2dWlhcHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzNDcsImV4cCI6MjA4Nzk5NjM0N30.21NkuUHJT9im7B002djJvleroZ6xyiK1s35hyiQUn3o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
