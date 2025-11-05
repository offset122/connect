// Test script to check user authentication and profile
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'your-supabase-url';
const supabaseKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('Checking user...');

  // Check session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Session:', session?.user?.id);

  if (session?.user) {
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();

    console.log('Profile:', profile);
    console.log('Profile error:', profileError);
  }
}

checkUser();