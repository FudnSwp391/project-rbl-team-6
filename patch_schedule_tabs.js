const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/SchedulePage.jsx', 'utf8');

// 1. Add timeFrame state
code = code.replace(
  /const \[selectedDay, setSelectedDay\] = useState\(null\);/,
  "const [selectedDay, setSelectedDay] = useState(null);\n  const [timeFrame, setTimeFrame] = useState('This Week');"
);

// 2. Replace getWeekDates with getDisplayDates
const getDisplayDatesCode = `
  const getDisplayDates = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dates = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (timeFrame === 'Today') {
      dates.push({
        dayName: days[today.getDay()],
        date: today.getDate(),
        fullDate: today,
        isToday: true
      });
    } else if (timeFrame === 'This Week') {
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push({
          dayName: days[d.getDay()],
          date: d.getDate(),
          fullDate: d,
          isToday: d.toDateString() === new Date().toDateString()
        });
      }
    } else if (timeFrame === 'This Month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1);
      const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
      
      for (let i = 0; i < firstDayIndex; i++) {
        dates.push(null);
      }
      for (let i = 1; i <= numDays; i++) {
        const d = new Date(year, month, i);
        dates.push({
          dayName: days[d.getDay()],
          date: d.getDate(),
          fullDate: d,
          isToday: d.toDateString() === new Date().toDateString()
        });
      }
    }
    return dates;
  };

  const displayDates = getDisplayDates();
`;
code = code.replace(/const getWeekDates = \(\) => \{[\s\S]*?const weekDates = getWeekDates\(\);/, getDisplayDatesCode.trim());

// 3. Replace Tab buttons
code = code.replace(
  /<button type="button" className="px-4 py-1\.5 rounded-md text-label-md font-label-md text-on-surface-variant hover:text-on-surface transition-colors">Today<\/button>/,
  '<button type="button" onClick={() => setTimeFrame(\'Today\')} className={`px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors ${timeFrame === \'Today\' ? \'bg-surface shadow-sm text-primary font-bold\' : \'text-on-surface-variant hover:text-on-surface\'}`}>Today</button>'
);
code = code.replace(
  /<button type="button" className="px-4 py-1\.5 rounded-md bg-surface shadow-sm text-label-md font-label-md text-primary font-bold">This Week<\/button>/,
  '<button type="button" onClick={() => setTimeFrame(\'This Week\')} className={`px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors ${timeFrame === \'This Week\' ? \'bg-surface shadow-sm text-primary font-bold\' : \'text-on-surface-variant hover:text-on-surface\'}`}>This Week</button>'
);
code = code.replace(
  /<button type="button" className="px-4 py-1\.5 rounded-md text-label-md font-label-md text-on-surface-variant hover:text-on-surface transition-colors">This Month<\/button>/,
  '<button type="button" onClick={() => setTimeFrame(\'This Month\')} className={`px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors ${timeFrame === \'This Month\' ? \'bg-surface shadow-sm text-primary font-bold\' : \'text-on-surface-variant hover:text-on-surface\'}`}>This Month</button>'
);

// 4. Update Header description
code = code.replace(
  /<p className="text-body-md font-body-md text-on-surface-variant mt-1">Theo dõi và quản lý tất cả các buổi học của bạn trong tuần này<\/p>/,
  '<p className="text-body-md font-body-md text-on-surface-variant mt-1">Theo dõi và quản lý tất cả các buổi học của bạn trong {timeFrame === \'Today\' ? \'hôm nay\' : timeFrame === \'This Week\' ? \'tuần này\' : \'tháng này\'}</p>'
);

// 5. Replace grid rendering
code = code.replace(
  /<div className="grid grid-cols-7 min-w-\[700px\] border-b border-surface-variant bg-surface-container-lowest rounded-t-xl shrink-0">/,
  '<div className={`grid ${timeFrame === \'Today\' ? \'grid-cols-1\' : \'grid-cols-7 min-w-[700px]\'} ${timeFrame === \'This Month\' ? \'border-b-0\' : \'border-b\'} border-surface-variant bg-surface-container-lowest rounded-t-xl shrink-0`}>'
);
code = code.replace(
  /\{weekDates\.map\(\(wd, index\) => \(/,
  `{displayDates.map((wd, index) => {
                  if (!wd) return <div key={index} className="py-3 border-r border-b border-surface-variant last:border-r-0 bg-surface/30"></div>;
                  return (`
);
code = code.replace(
  /<p className=\{`text-label-sm font-label-sm uppercase tracking-wider \$\{wd\.isToday \? 'text-primary font-bold' : 'text-on-surface-variant'\}`\}>\n\s*\{wd\.dayName\}\n\s*<\/p>\n\s*<p className=\{`text-headline-md font-headline-md mt-1 \$\{wd\.isToday \? 'text-primary' : 'text-on-surface'\}`\}>\n\s*\{wd\.date\}\n\s*<\/p>\n\s*\{wd\.isToday && <div className="text-\[10px\] font-bold text-primary mt-1">Hôm nay<\/div>\}\n\s*<\/div>\n\s*\)\)}/,
  `<p className={\`text-label-sm font-label-sm uppercase tracking-wider \${wd.isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}\`}>
                      {wd.dayName}
                    </p>
                    <p className={\`text-headline-md font-headline-md mt-1 \${wd.isToday ? 'text-primary' : 'text-on-surface'}\`}>
                      {wd.date}
                    </p>
                    {wd.isToday && <div className="text-[10px] font-bold text-primary mt-1">Hôm nay</div>}
                  </div>
                );
              })}`
);

// Replace grid container for compact calendar grid
code = code.replace(
  /<div className="grid grid-cols-7 min-w-\[700px\] bg-surface-container-lowest rounded-b-xl flex-1">/,
  '<div className={`grid ${timeFrame === \'Today\' ? \'grid-cols-1\' : \'grid-cols-7 min-w-[700px]\'} bg-surface-container-lowest rounded-b-xl flex-1`}>'
);

code = code.replace(
  /\{weekDates\.map\(\(wd, index\) => \{/,
  `{displayDates.map((wd, index) => {
                  if (!wd) return <div key={index} className="border-r border-b border-surface-variant last:border-r-0 p-2 bg-surface/30 h-full min-h-[120px]"></div>;`
);

code = code.replace(
  /className=\{`border-r border-surface-variant last:border-0 p-2 flex flex-col gap-2 \$\{wd\.isToday \? 'bg-primary\/5' : 'bg-surface'\} h-full min-h-\[200px\]`\}/,
  'className={`border-r border-b border-surface-variant last:border-r-0 p-2 flex flex-col gap-2 ${wd.isToday ? \'bg-primary/5\' : \'bg-surface\'} h-full ${timeFrame === \'This Month\' ? \'min-h-[120px]\' : \'min-h-[200px]\'}`}'
);

// Replace "Đặt Lịch Mới" button logic
code = code.replace(
  /onClick=\{\(\) => window\.location\.hash = '#\/dashboard\/tutors'\}/,
  "onClick={() => window.location.hash = '#/'}"
);

fs.writeFileSync('frontend/src/components/SchedulePage.jsx', code);
console.log('patched');
