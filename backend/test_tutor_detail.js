const express = require('express');
const router = require('./routes/tutorRequestRoutes'); // Wait, the get /api/tutors is in server.js directly.

// Since the route is in server.js, we can just run a fetch against port 5000 if the server is running.
// Wait, is the main server running? Let's check with an HTTP request to localhost:5000.
// If not, we'll write a quick fetch script and see if it responds.
async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/tutors/968d1ce5-4604-46b9-ba32-28bb11f0fca6');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Server might not be running on 5000:', err.message);
  }
}

test();
