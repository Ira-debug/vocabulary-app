import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://joramelvilxoerjrjkgk.supabase.co';
const supabaseKey = 'sb_publishable_KzLi7uYyhGQbejLYfwtzsw_hCxcA8R6';

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;