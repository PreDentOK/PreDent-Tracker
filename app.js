// ... existing goals ...

    // NEW IDEAS
    { id: 'g15', title: 'The Tour Guide', req: 'Visit 5 Different Locations', difficulty: 'Medium', class: 'medium', stars: 2,
      check: (s, v, count, specs, entries) => {
          const locs = new Set(entries.map(e => e.location.trim().toLowerCase()));
          return locs.size >= 5;
      },
      progress: (s, v, count, specs, entries) => {
          const locs = new Set(entries.map(e => e.location.trim().toLowerCase()));
          return Math.min((locs.size / 5) * 100, 100);
      },
      label: (s, v, count, specs, entries) => {
          const locs = new Set(entries.map(e => e.location.trim().toLowerCase()));
          return `${locs.size} / 5`;
      }
    },

    { id: 'g16', title: 'Consistency is Key', req: 'Log hours in 6 different months', difficulty: 'Hard', class: 'hard', stars: 3,
      check: (s, v, count, specs, entries) => {
          const months = new Set(entries.map(e => e.date.substring(0, 7))); // YYYY-MM
          return months.size >= 6;
      },
      progress: (s, v, count, specs, entries) => {
          const months = new Set(entries.map(e => e.date.substring(0, 7)));
          return Math.min((months.size / 6) * 100, 100);
      },
      label: (s, v, count, specs, entries) => {
          const months = new Set(entries.map(e => e.date.substring(0, 7)));
          return `${months.size} / 6`;
      }
    },

    { id: 'g17', title: 'Future Surgeon', req: '10 Hours Oral Surgery', difficulty: 'Medium', class: 'medium', stars: 2,
      check: (s, v, count, specs, entries) => {
          const os = entries.filter(e => e.subtype === 'Oral Surgery').reduce((a,c) => a+parseInt(c.hours),0);
          return os >= 10;
      },
      progress: (s, v, count, specs, entries) => {
          const os = entries.filter(e => e.subtype === 'Oral Surgery').reduce((a,c) => a+parseInt(c.hours),0);
          return Math.min((os / 10) * 100, 100);
      },
      label: (s, v, count, specs, entries) => {
          const os = entries.filter(e => e.subtype === 'Oral Surgery').reduce((a,c) => a+parseInt(c.hours),0);
          return `${os} / 10`;
      }
    },

    { id: 'g18', title: 'Heavy Hitter', req: '40+ Hours in 1 Month', difficulty: 'Extreme', class: 'extreme', stars: 3,
      check: (s, v, count, specs, entries) => {
          const months = {};
          entries.forEach(e => {
              const k = e.date.substring(0, 7);
              months[k] = (months[k] || 0) + parseInt(e.hours);
          });
          return Object.values(months).some(val => val >= 40);
      },
      progress: (s, v, count, specs, entries) => {
          const months = {};
          entries.forEach(e => {
              const k = e.date.substring(0, 7);
              months[k] = (months[k] || 0) + parseInt(e.hours);
          });
          const max = Math.max(0, ...Object.values(months));
          return Math.min((max / 40) * 100, 100);
      },
      label: (s, v, count, specs, entries) => {
          const months = {};
          entries.forEach(e => {
              const k = e.date.substring(0, 7);
              months[k] = (months[k] || 0) + parseInt(e.hours);
          });
          const max = Math.max(0, ...Object.values(months));
          return `${max} / 40`;
      }
    }
