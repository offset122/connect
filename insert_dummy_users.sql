-- ============================================================================
-- DUMMY USERS DATA for Hanna's Connect
-- ============================================================================
-- Insert sample users to test the profile card design
-- Run this in your Supabase SQL Editor

-- Insert dummy users with realistic profile data
INSERT INTO users (
  auth_id, email, username, first_name, last_name, gender, age, nationality,
  sexual_orientation, relationship_goal, country_of_residence, city, county, constituency,
  tribe, religion, religiousness, believe_in_marriage, height_ft, height_in, weight_kg,
  body_type, complexion, teeth_status, has_scars_birthmarks_tattoos, hiv_status, blood_group,
  has_disabilities, has_allergies, smoking, alcohol_consumption, pets_details,
  education_level, field_of_study, current_profession, work_county, work_constituency,
  employment_status, financial_stability, can_relocate, can_date_with_disability,
  marital_status, number_of_children, children_ages, open_to_dating_with_children,
  want_kids, relationship_perspective, do_not_contact_if, things_i_dont_do,
  what_i_hope_to_find, what_to_expect_from_me, imperfections, is_active, is_verified,
  has_paid, payment_status, created_at, updated_at
) VALUES 
-- User 1: Sarah
(
  uuid_generate_v4(), 'sarah.wanjiku@gmail.com', 'sarah_w', 'Sarah', 'Wanjiku', 'Female', 28, 'Kenyan',
  'Heterosexual', 'Long-term relationship', 'Kenya', 'Nairobi', 'Nairobi County', 'Westlands',
  'Kikuyu', 'Christianity', 'Moderately religious', 'Yes', 5, 6, 58,
  'Slim', 'Fair', 'Perfect', false, 'Negative', 'O+', false, false, 'No', 'Occasionally', 'Cat lover',
  'Bachelor''s degree', 'Marketing', 'Marketing Manager', 'Nairobi County', 'Westlands',
  'Employed full-time', 'Stable', 'Maybe', 'Yes',
  'Single', 0, null, 'Yes', 'Yes', 'Shared roles / equal partnership', 
  'If you\'re not serious about relationships', 'Threesomes', 'Someone loyal and understanding',
  'Honesty, support, and adventure', 'Sometimes impatient', true, true,
  true, 'completed', NOW(), NOW()
),
-- User 2: Michael
(
  uuid_generate_v4(), 'michael.mutua@gmail.com', 'mike_dev', 'Michael', 'Mutua', 'Male', 32, 'Kenyan',
  'Heterosexual', 'Marriage', 'Kenya', 'Thika', 'Kiambu County', 'Juja',
  'Kamba', 'Christianity', 'Religious', 'Yes', 6, 0, 75,
  'Athletic', 'Medium', 'Good', false, 'Negative', 'A+', false, false, 'No', 'Yes', 'Dog owner',
  'Bachelor''s degree', 'Computer Science', 'Software Engineer', 'Kiambu County', 'Juja',
  'Self-employed', 'Very stable', 'Yes', 'Yes',
  'Single', 0, null, 'Yes', 'Yes', 'Traditional (man leads)', 
  'If you smoke or drink heavily', 'One night stands', 'A God-fearing woman who loves family',
  'Loyalty, honesty, and good communication', 'Can be workaholic sometimes', true, true,
  true, 'completed', NOW(), NOW()
),
-- User 3: Grace
(
  uuid_generate_v4(), 'grace.cheptoo@gmail.com', 'grace_t', 'Grace', 'Cheptoo', 'Female', 26, 'Kenyan',
  'Heterosexual', 'Casual dating', 'Kenya', 'Mombasa', 'Mombasa County', 'Kisauni',
  'Kalenjin', 'Christianity', 'Slightly religious', 'No', 5, 4, 52,
  'Average', 'Dark brown', 'Good', false, 'Negative', 'B+', false, false, 'No', 'No', null,
  'Bachelor''s degree', 'Education', 'Primary School Teacher', 'Mombasa County', 'Kisauni',
  'Employed full-time', 'Getting by', 'Yes', 'Maybe',
  'Single', 0, null, 'Yes', 'No', 'Modern (woman leads)', 
  'If you\'re not financially stable', 'Gambling', 'Someone fun and adventurous',
  'Support and encouragement', 'Can be indecisive', true, true,
  true, 'completed', NOW(), NOW()
),
-- User 4: David
(
  uuid_generate_v4(), 'david.kiprotich@gmail.com', 'dr_david', 'David', 'Kiprotich', 'Male', 30, 'Kenyan',
  'Heterosexual', 'Long-term relationship', 'Kenya', 'Kisumu', 'Kisumu County', 'Kisumu East',
  'Luo', 'Christianity', 'Very religious', 'Yes', 5, 10, 70,
  'Muscular', 'Medium', 'Perfect', false, 'Negative', 'AB+', false, false, 'No', 'Occasionally', null,
  'Doctorate (PhD)', 'Medicine', 'Medical Doctor', 'Kisumu County', 'Kisumu East',
  'Employed full-time', 'Very stable', 'Maybe', 'Yes',
  'Single', 0, null, 'Yes', 'Yes', 'Shared roles / equal partnership', 
  'If you have multiple relationships', 'Cheating', 'A woman with good values and character',
  'Respect, love and companionship', 'Can be very busy with work', true, true,
  true, 'completed', NOW(), NOW()
),
-- User 5: Faith
(
  uuid_generate_v4(), 'faith.njeri@gmail.com', 'faith_student', 'Faith', 'Njeri', 'Female', 24, 'Kenyan',
  'Heterosexual', 'Friendship', 'Kenya', 'Nakuru', 'Nakuru County', 'Nakuru Town East',
  'Kikuyu', 'Christianity', 'Moderately religious', 'Maybe', 5, 2, 55,
  'Slim', 'Olive', 'Good', false, 'Negative', 'O-', false, false, 'No', 'No', 'Bird enthusiast',
  'Bachelor''s degree', 'Psychology', 'Student', 'Nakuru County', 'Nakuru Town East',
  'Student', 'Getting by', 'Yes', 'Yes',
  'Single', 0, null, 'Yes', 'Maybe', 'Traditional (man leads)', 
  'If you\'re older than 35', 'Smoking', 'A genuine and kind person',
  'Understanding and patience', 'Sometimes overthink things', true, false,
  false, 'pending', NOW(), NOW()
),
-- User 6: James
(
  uuid_generate_v4(), 'james.mwangi@gmail.com', 'james_fitness', 'James', 'Mwangi', 'Male', 29, 'Kenyan',
  'Heterosexual', 'Marriage', 'Kenya', 'Nairobi', 'Nairobi County', 'Dagoretti North',
  'Kikuyu', 'Christianity', 'Religious', 'Yes', 5, 8, 68,
  'Athletic', 'Medium', 'Perfect', false, 'Negative', 'A-', false, false, 'No', 'Occasionally', null,
  'Master''s degree', 'Business Administration', 'Business Consultant', 'Nairobi County', 'Dagoretti North',
  'Self-employed', 'Very stable', 'Yes', 'Yes',
  'Single', 0, null, 'Yes', 'Yes', 'Traditional (man leads)', 
  'If you\'re not ready for commitment', 'Playing games', 'A woman who shares my faith and values',
  'Love, support and partnership', 'Can be perfectionist', true, true,
  true, 'completed', NOW(), NOW()
),
-- User 7: Lisa
(
  uuid_generate_v4(), 'lisa.chemutai@gmail.com', 'lisa_artist', 'Lisa', 'Chemutai', 'Female', 27, 'Kenyan',
  'Heterosexual', 'Short-term relationship', 'Kenya', 'Eldoret', 'Uasin Gishu County', 'Eldoret Town',
  'Kalenjin', 'Christianity', 'Slightly religious', 'No', 5, 5, 60,
  'Curvy', 'Medium', 'Good', true, 'Negative', 'B-', false, false, 'No', 'Yes', 'Cat lover',
  'Bachelor''s degree', 'Fine Arts', 'Graphic Designer', 'Uasin Gishu County', 'Eldoret Town',
  'Employed full-time', 'Stable', 'Maybe', 'Yes',
  'Single', 0, null, 'Yes', 'No', 'Modern (woman leads)', 
  'If you\'re judgmental', 'Being controlling', 'Someone creative and open-minded',
  'Freedom and creativity', 'Can be moody at times', true, true,
  true, 'completed', NOW(), NOW()
),
-- User 8: Peter
(
  uuid_generate_v4(), 'peter.odhiambo@gmail.com', 'peter_tech', 'Peter', 'Odhiambo', 'Male', 31, 'Kenyan',
  'Heterosexual', 'Long-term relationship', 'Kenya', 'Kisumu', 'Kisumu County', 'Kisumu Central',
  'Luo', 'Christianity', 'Moderately religious', 'Yes', 5, 11, 72,
  'Average', 'Dark brown', 'Good', false, 'Negative', 'O+', false, false, 'No', 'Occasionally', null,
  'Bachelor''s degree', 'Information Technology', 'IT Specialist', 'Kisumu County', 'Kisumu Central',
  'Employed full-time', 'Stable', 'Yes', 'Yes',
  'Divorced', 1, '5', 'Yes', 'Yes', 'Shared roles / equal partnership', 
  'If you have many baby daddies', 'Drama', 'A stable woman who understands life',
  'Honesty and loyalty', 'Can be too trusting', true, true,
  true, 'completed', NOW(), NOW()
);

-- Verify the inserted users
SELECT 'Users inserted successfully!' as status, COUNT(*) as total_users FROM users;

-- Show sample of inserted data
SELECT 
  first_name, 
  last_name, 
  age, 
  gender, 
  county, 
  current_profession, 
  relationship_goal,
  has_paid,
  payment_status 
FROM users 
ORDER BY created_at DESC 
LIMIT 8;