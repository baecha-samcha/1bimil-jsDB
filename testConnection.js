// testConnection.js
import { supabase } from './supabase.js';

const test = async () => {
  const { data, error } = await supabase.from('photos').select('*').limit(1);
  if (error) console.error('❌ 연결 실패:', error.message);
  else console.log('✅ 연결 성공:', data);
};

test();
