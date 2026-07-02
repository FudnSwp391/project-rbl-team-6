const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/TutorMatchesPage.jsx', 'utf-8');

// 1. Update BestMatchCard signature
content = content.replace(
  'function BestMatchCard({ tutor }) {',
  'function BestMatchCard({ tutor, onSelect, onInterest }) {'
);

// 2. Update BestMatchCard buttons
content = content.replace(
  `          <button className="flex-[2] bg-primary text-on-primary px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors shadow-sm focus:ring-2 focus:ring-primary/50">\n            Đặt lịch học thử\n          </button>`,
  `          <button onClick={() => onInterest(tutor.id)} className={\`flex items-center justify-center p-2.5 rounded-lg border transition-colors \${tutor.is_interested ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface-container text-on-surface hover:bg-surface-variant border-outline-variant'}\`}>\n            <span className="material-symbols-outlined" style={{ fontVariationSettings: tutor.is_interested ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>\n          </button>\n          <button onClick={() => onSelect(tutor.id)} disabled={tutor.is_selected} className="flex-[2] bg-primary text-on-primary px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors shadow-sm focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed">\n            {tutor.is_selected ? 'Đã gửi yêu cầu' : 'Chọn gia sư này'}\n          </button>`
);

// 3. Update TutorCard signature
content = content.replace(
  'function TutorCard({ tutor }) {',
  'function TutorCard({ tutor, onSelect, onInterest }) {'
);

// 4. Update TutorCard buttons
content = content.replace(
  `        <button className="flex-[1.5] bg-primary text-on-primary px-2 py-2 rounded-lg text-label-sm font-label-md hover:bg-primary-container transition-colors">\n          Đặt học thử\n        </button>`,
  `        <button onClick={() => onInterest(tutor.id)} className={\`px-2 py-2 rounded-lg border flex items-center justify-center \${tutor.is_interested ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface-container text-on-surface hover:bg-surface-variant border-outline-variant'}\`}>\n          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: tutor.is_interested ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>\n        </button>\n        <button onClick={() => onSelect(tutor.id)} disabled={tutor.is_selected} className="flex-[1.5] bg-primary text-on-primary px-2 py-2 rounded-lg text-label-sm font-label-md hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed">\n          {tutor.is_selected ? 'Đã gửi' : 'Chọn gia sư'}\n        </button>`
);

// 5. Add functions in TutorMatchesPage
const funcs = `
  const handleSelect = async (tutorId) => {
    const requestId = formData?.tutorRequestId;
    if (!requestId) return;
    try {
      const res = await fetch(\`\${API_BASE}/api/tutor-requests/\${requestId}/select\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Có lỗi xảy ra');
        return;
      }
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_selected: true, status: 'pending' } : t));
      alert('Đã gửi yêu cầu thành công!');
    } catch (e) {
      alert('Lỗi kết nối');
    }
  };

  const handleInterest = async (tutorId) => {
    const requestId = formData?.tutorRequestId;
    if (!requestId) return;
    try {
      await fetch(\`\${API_BASE}/api/tutor-requests/\${requestId}/interest\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId })
      });
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_interested: !t.is_interested } : t));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch from real API`;

content = content.replace('  // Fetch from real API', funcs);

// 6. Update rendering
content = content.replace(
  '<BestMatchCard tutor={bestMatch} />',
  '<BestMatchCard tutor={bestMatch} onSelect={handleSelect} onInterest={handleInterest} />'
);

content = content.replace(
  '{otherTutors.map(t => <TutorCard key={t.id} tutor={t} />)}',
  '{otherTutors.map(t => <TutorCard key={t.id} tutor={t} onSelect={handleSelect} onInterest={handleInterest} />)}'
);

fs.writeFileSync('frontend/src/pages/TutorMatchesPage.jsx', content);
console.log('Frontend updated.');
