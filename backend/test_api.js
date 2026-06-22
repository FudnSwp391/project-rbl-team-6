fetch('http://localhost:5000/api/tutors/1').then(r=>r.text()).then(console.log).catch(console.error);
