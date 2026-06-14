import { createClient } from '@supabase/supabase-js';
import { courses } from './courseData.js'; // Your uploaded file

// Initialize Supabase. 
// 🚨 IMPORTANT: Use your SERVICE ROLE KEY here to bypass RLS policies during seeding.
const SUPABASE_URL = 'https://nemdsepzbxcpmfdckffk.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_68PNsB2Z7rkezo83bLpVrQ_P0YXEZug';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedDatabase() {
  console.log('⛳️ Starting course data seed...');

  for (const [courseKey, courseData] of Object.entries(courses)) {
    console.log(`\nPreparing to insert course: ${courseData.name}`);

    // 1. Insert the Course and get the generated relational ID back
    const { data: courseRow, error: courseError } = await supabase
      .from('courses')
      .insert({ name: courseData.name })
      .select('id')
      .single();

    if (courseError) {
      console.error(`❌ Error inserting course ${courseData.name}:`, courseError.message);
      continue;
    }

    const courseId = courseRow.id;
    console.log(`✅ Course created with ID: ${courseId}`);

    // 2. Format the 18 holes to link to the new course ID
    const holesToInsert = courseData.holes.map((hole) => {
      
      // Flip the coordinates from [Lat, Lon] to PostGIS native [Lon, Lat]
      const frontLonLat = `${hole.gps.front[1]} ${hole.gps.front[0]}`;
      const centerLonLat = `${hole.gps.center[1]} ${hole.gps.center[0]}`;
      const backLonLat = `${hole.gps.back[1]} ${hole.gps.back[0]}`;

      return {
        course_id: courseId, // 🔗 The Relational Link!
        hole_number: hole.number,
        par: hole.par,
        hcp_index: hole.handicapIndex,
        yardage_gold: hole.yardage.gold,
        yardage_blue: hole.yardage.blue,
        yardage_white: hole.yardage.white,
        elevation_green_ft: hole.gps.elevationFeet,
        // Supabase JS auto-converts WKT (Well-Known Text) string format into PostGIS Point geometries
        green_front_geo: `POINT(${frontLonLat})`,
        green_center_geo: `POINT(${centerLonLat})`,
        green_back_geo: `POINT(${backLonLat})`
      };
    });

    // 3. Bulk insert the holes
    const { error: holesError } = await supabase
      .from('holes')
      .insert(holesToInsert);

    if (holesError) {
      console.error(`❌ Error inserting holes for ${courseData.name}:`, holesError.message);
    } else {
      console.log(`✅ Successfully linked and inserted 18 holes for ${courseData.name}`);
    }
  }

  console.log('\n🏌️‍♂️ Database seed complete!');
}

seedDatabase();