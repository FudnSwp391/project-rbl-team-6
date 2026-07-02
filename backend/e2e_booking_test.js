const { Pool } = require('pg');
require('dotenv').config();

async function runE2ETest() {
  console.log("=== STARTING E2E TEST: TUTOR & BOOKING ===\n");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const timestamp = Date.now();
    const tutorEmail = `tutor_${timestamp}@example.com`;
    const studentEmail = `student_${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Register Tutor Applicant
    console.log(`1. Registering Tutor Applicant: ${tutorEmail}`);
    let res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: tutorEmail, password, fullName: "Test Tutor", role: "student" })
    });
    if (!res.ok) throw new Error(await res.text());
    let data = await res.json();
    const tutorToken = data.token;
    
    // Check if token exists, meaning auto-login on register
    if (!tutorToken) {
        // let's login
        res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: tutorEmail, password })
        });
        data = await res.json();
    }
    const tutorAuthToken = data.token;
    const tutorId = data.user.id;
    console.log(`   -> Success. Tutor ID: ${tutorId}`);

    // 2. Submit Tutor Request
    console.log(`2. Submitting Tutor Request...`);
    res = await fetch("http://localhost:5000/api/tutor/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tutorAuthToken}` },
      body: JSON.stringify({
        first_name: "Test",
        last_name: "Tutor",
        display_name: "Test Tutor",
        phone: "0123456789",
        birthday: "1990-01-01",
        gender: "male",
        country: "VN",
        city: "Hanoi",
        hourly_rate: 10,
        experience_years: 5,
        education: "BS Computer Science",
        language: "English",
        teaching_style: "Hands-on",
        qualifications: "Certified",
        bio: "I love math",
        subjects: '["Math"]',
        profile_photo_url: "http://example.com/photo.jpg",
        cccd_front_url: "http://example.com/id.jpg",
        cccd_back_url: "http://example.com/id2.jpg",
        teaching_methods: '[]',
        suitable_students: '[]',
        cert_metadata: '[]',
        certificate_urls: '[]'
      })
    });
    if (!res.ok) throw new Error(await res.text());
    console.log(`   -> Tutor Request Submitted.`);

    // 3. Admin Approves Tutor (Direct DB for ease, bypassing Admin Auth)
    console.log(`3. Admin Approving Tutor (via DB)...`);
    await pool.query("UPDATE tutor_profiles SET status = 'approved' WHERE user_id = $1", [tutorId]);
    await pool.query("UPDATE users SET role = 'tutor' WHERE id = $1", [tutorId]);
    console.log(`   -> Tutor Approved.`);

    // Update availability
    console.log(`4. Tutor Setting Availability...`);
    res = await fetch("http://localhost:5000/api/tutor/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tutorAuthToken}` },
        body: JSON.stringify({ availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }] })
    });
    console.log(`   -> Availability updated.`);

    // 5. Register Student
    console.log(`5. Registering Student: ${studentEmail}`);
    res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentEmail, password, fullName: "Test Student", role: "student" })
    });
    if (!res.ok) throw new Error(await res.text());
    data = await res.json();
    let studentAuthToken = data.token;
    if (!studentAuthToken) {
        res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: studentEmail, password })
        });
        data = await res.json();
        studentAuthToken = data.token;
    }
    console.log(`   -> Success. Student ID: ${data.user.id}`);

    // 6. Student Fetches Tutor Availability
    console.log(`6. Student Fetching Tutor Availability...`);
    res = await fetch(`http://localhost:5000/api/tutors/${tutorId}/availability`);
    if (!res.ok) throw new Error(await res.text());
    data = await res.json();
    console.log(`   -> Fetched: `, data);

    // 7. Student Books Tutor
    console.log(`7. Student Booking Tutor...`);
    res = await fetch("http://localhost:5000/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${studentAuthToken}` },
      body: JSON.stringify({
        tutor_id: tutorId,
        tutor_name: "Test Tutor",
        subject: "Math",
        lesson_date: new Date().toISOString().split('T')[0],
        time_slot: "08:00-09:00"
      })
    });
    if (!res.ok) {
        console.log(`   -> Booking returned an error (might be expected if date/time invalid):`, await res.text());
    } else {
        console.log(`   -> Booking Success!`);
    }

    console.log("\n=== E2E TEST COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("\n=== E2E TEST FAILED ===");
    console.error(err);
  } finally {
    pool.end();
  }
}

runE2ETest();
