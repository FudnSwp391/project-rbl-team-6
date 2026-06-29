const express = require('express');
const bodyParser = require('body-parser');
const router = require('./routes/tutorRequestRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/', router);

const server = app.listen(5002, async () => {
  console.log('Server started for matching test on port 5002');
  try {
    const res = await fetch('http://localhost:5002/api/tutor-matches/9354c5e5-dbc0-4419-8224-7948ce56610b');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
