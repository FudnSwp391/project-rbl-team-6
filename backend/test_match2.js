const express = require('express');
const bodyParser = require('body-parser');
const router = require('./routes/tutorRequestRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/', router);

const server = app.listen(5003, async () => {
  console.log('Server started for matching test on port 5003');
  try {
    console.log('=== MATCHING REQUEST A (Toán, Lớp 10) ===');
    const resA = await fetch('http://localhost:5003/api/tutor-matches/d9e2bf6b-d46c-41b1-819e-7a833eb886e0');
    const dataA = await resA.json();
    console.log(JSON.stringify(dataA.data.tutors, null, 2));

    console.log('\n=== MATCHING REQUEST B (Tiếng Anh, Lớp 5) ===');
    const resB = await fetch('http://localhost:5003/api/tutor-matches/059d3157-9c43-4b3b-9585-006c4e325fa9');
    const dataB = await resB.json();
    console.log(JSON.stringify(dataB.data.tutors, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
