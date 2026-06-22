const express = require('express');
const bodyParser = require('body-parser');
const router = require('./routes/tutorRequestRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/', router);

const server = app.listen(5001, async () => {
  console.log('Server started for testing on port 5001');
  
  try {
    const body = {
      grade: "10",
      educationLevel: "Chuẩn",
      subject: "toan",
      topics: ["Đại số"],
      recentAverageScore: "8",
      contact_name: "Test Guest",
      contact_phone: "0999999"
    };

    const res = await fetch('http://localhost:5001/api/tutor-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log("=== KIỂM TRA 4 - API THỰC TẾ ===");
    console.log("HTTP Status:", res.status);
    const data = await res.json();
    console.log("Response Body:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
