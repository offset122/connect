const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Available avatar options
const avatarOptions = [
  '3d-cartoon-portrait-person-practicing-law-related-profession.jpg',
  '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg',
  '2809696b-04f1-4ca8-8194-2ac46919f408.jpg',
  '10491828.jpg',
  '11475208.jpg',
  'androgynous-avatar-non-binary-queer-person.jpg',
  'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg',
  'b400cea9-fa0a-4595-9865-d1216fea02e8.jpg',
];

async function addAvatarColumn() {
  console.log('Note: This script assumes the avatar column already exists in your database.');
  console.log('If you need to add the column, run this SQL in your Supabase SQL editor:');
  console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;');
  console.log('');
}

async function assignRandomAvatars() {
  try {
    console.log('Fetching users without avatars...');

    // Get users who don't have avatars set
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar')
      .or('avatar.is.null,avatar.eq.\"\"');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found without avatars.');
      return;
    }

    console.log(`Found ${users.length} users without avatars.`);

    // Update each user with a random avatar
    for (const user of users) {
      const randomAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar: randomAvatar })
        .eq('id', user.id);

      if (updateError) {
        console.error(`Error updating user ${user.first_name} ${user.last_name}:`, updateError);
      } else {
        console.log(`✓ Updated ${user.first_name} ${user.last_name} with avatar: ${randomAvatar}`);
      }
    }

    console.log('Avatar assignment completed!');

  } catch (error) {
    console.error('Error in assignRandomAvatars:', error);
  }
}

async function listUsersWithAvatars() {
  try {
    console.log('Fetching all users and their avatars...');

    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar')
      .order('first_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log('\nUsers and their avatars:');
    console.log('=====================================');

    users.forEach(user => {
      const avatar = user.avatar || 'No avatar';
      console.log(`${user.first_name} ${user.last_name}: ${avatar}`);
    });

  } catch (error) {
    console.error('Error in listUsersWithAvatars:', error);
  }
}

async function resetAllAvatars() {
  try {
    console.log('Resetting all user avatars to null...');

    const { error } = await supabase
      .from('users')
      .update({ avatar: null })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Avoid updating a dummy ID

    if (error) {
      console.error('Error resetting avatars:', error);
      return;
    }

    console.log('All avatars have been reset to null.');

  } catch (error) {
    console.error('Error in resetAllAvatars:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'assign':
      console.log('Assigning random avatars to users...');
      await assignRandomAvatars();
      break;

    case 'list':
      await listUsersWithAvatars();
      break;

    case 'reset':
      console.log('⚠️  WARNING: This will reset all user avatars!');
      // In a real script, you might want to add confirmation
      await resetAllAvatars();
      break;

    case 'help':
    default:
      console.log('Avatar Management Script');
      console.log('========================');
      console.log('');
      console.log('Commands:');
      console.log('  assign  - Assign random avatars to users who don\'t have one');
      console.log('  list    - List all users and their current avatars');
      console.log('  reset   - Reset all user avatars to null');
      console.log('  help    - Show this help message');
      console.log('');
      console.log('Usage: node update_avatars.js <command>');
      console.log('');
      await addAvatarColumn();
      break;
  }
}

main().catch(console.error);