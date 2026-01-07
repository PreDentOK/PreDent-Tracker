// --- MAIN APP LOGIC ---
const STORAGE_KEY = 'pd_tracker_data_v2'; 
let entries = []; 
let currentFilter = 'All';
let currentSearch = ''; 
let entryToDeleteId = null; 
let editingEntryId = null;
let appUser = null; 
let isSelectionMode = false;
let unlockedGoalIds = new Set();
let isShowingNotification = false;
let notificationQueue = [];

// SUBTYPES (Updated "General")
const SUBTYPES_SHADOW = ["General", "Orthodontics", "Pediatric Dentistry", "Oral Surgery", "Endodontics", "Periodontics", "Prosthodontics", "Dental Public Health", "Other"];
const SUBTYPES_VOLUNTEER = ["Dental Related", "Non-Dental Related"];
const CIRCLE_RADIUS = 110; 
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// --- GOAL DEFINITIONS ---
const GOALS = [
    // Shadowing Tiers
    { id: 'g1', title: 'Shadowing I', req: '10 Hours Shadowing', difficulty: 'Easy', class: 'easy', stars: 1, 
      check: (s, v, count, specs) => s >= 10, progress: (s) => Math.min((s / 10) * 100, 100), label: (s) => `${s} / 10` },
    { id: 'g2', title: 'Shadowing II', req: '50 Hours Shadowing', difficulty: 'Medium', class: 'medium', stars: 2, 
      check: (s, v, count, specs) => s >= 50, progress: (s) => Math.min((s / 50) * 100, 100), label: (s) => `${s} / 50` },
    { id: 'g3', title: 'Shadowing III', req: '100 Hours Shadowing', difficulty: 'Hard', class: 'hard', stars: 3, 
      check: (s, v, count, specs) => s >= 100, progress: (s) => Math.min((s / 100) * 100, 100), label: (s) => `${s} / 100` },
    { id: 'g4', title: 'Shadowing IV', req: '200 Hours Shadowing', difficulty: 'Extreme', class: 'extreme', stars: 4, 
      check: (s, v, count, specs) => s >= 200, progress: (s) => Math.min((s / 200) * 100, 100), label: (s) => `${s} / 200` },
    { id: 'g5', title: 'Shadowing V', req: '300+ Hours Shadowing', difficulty: 'Impossible', class: 'impossible', stars: 5, 
      check: (s, v, count, specs) => s >= 300, progress: (s) => Math.min((s / 300) * 100, 100), label: (s) => `${s} / 300+` },

    // Volunteer Tiers
    { id: 'g6', title: 'Volunteer I', req: '10 Hours Volunteering', difficulty: 'Easy', class: 'easy', stars: 1, 
      check: (s, v, count, specs) => v >= 10, progress: (s, v) => Math.min((v / 10) * 100, 100), label: (s, v) => `${v} / 10` },
    { id: 'g7', title: 'Volunteer II', req: '50 Hours Volunteering', difficulty: 'Medium', class: 'medium', stars: 2, 
      check: (s, v, count, specs) => v >= 50, progress: (s, v) => Math.min((v / 50) * 100, 100), label: (s, v) => `${v} / 50` },
    { id: 'g8', title: 'Volunteer III', req: '100 Hours Volunteering', difficulty: 'Hard', class: 'hard', stars: 3, 
      check: (s, v, count, specs) => v >= 100, progress: (s, v) => Math.min((v / 100) * 100, 100), label: (s, v) => `${v} / 100` },
    { id: 'g9', title: 'Volunteer IV', req: '200 Hours Volunteering', difficulty: 'Extreme', class: 'extreme', stars: 4, 
      check: (s, v, count, specs) => v >= 200, progress: (s, v) => Math.min((v / 200) * 100, 100), label: (s, v) => `${v} / 200` },
    { id: 'g10', title: 'Volunteer V', req: '300+ Hours Volunteering', difficulty: 'Impossible', class: 'impossible', stars: 5, 
      check: (s, v, count, specs) => v >= 300, progress: (s, v) => Math.min((v / 300) * 100, 100), label: (s, v) => `${v} / 300+` },

    // Entry Tiers
    { id: 'g11', title: 'First Step', req: 'Log 1st Entry', difficulty: 'Easy', class: 'easy', stars: 1, 
      check: (s, v, count, specs) => count >= 1, progress: (s, v, count) => Math.min((count / 1) * 100, 100), label: (s, v, count) => `${count} / 1` },
    { id: 'g12', title: 'Momentum', req: 'Log 10 Entries', difficulty: 'Medium', class: 'medium', stars: 2, 
      check: (s, v, count, specs) => count >= 10, progress: (s, v, count) => Math.min((count / 10) * 100, 100), label: (s, v, count) => `${count} / 10` },
    { id: 'g13', title: 'Dedicated', req: 'Log 100 Entries', difficulty: 'Hard', class: 'hard', stars: 3, 
      check: (s, v, count, specs) => count >= 100, progress: (s, v, count) => Math.min((count / 100) * 100, 100), label: (s, v, count) => `${count} / 100` },

    // Specialist Goals
    { id: 'g14', title: 'Initiate', req: 'Shadow 1 Specialist', difficulty: 'Easy', class: 'easy', stars: 1, 
      check: (s, v, count, specs) => specs >= 1, progress: (s, v, count, specs) => Math.min((specs / 1) * 100, 100), label: (s, v, count, specs) => `${specs} / 1` },
    { id: 'g15', title: 'Explorer', req: 'Shadow 3 Specialists', difficulty: 'Medium', class: 'medium', stars: 2, 
      check: (s, v, count, specs) => specs >= 3, progress: (s, v, count, specs) => Math.min((specs / 3) * 100, 100), label: (s, v, count, specs) => `${specs} / 3` },
    { id: 'g16', title: 'Networker', req: 'Shadow 6 Specialists', difficulty: 'Hard', class: 'hard', stars: 3, 
      check: (s, v, count, specs) => specs >= 6, progress: (s, v, count, specs) => Math.min((specs / 6) * 100, 100), label: (s, v, count, specs) => `${specs} / 6` },
      
    // Specifics
    { id: 'g17', title: 'The Generalist', req: '50 Hrs General Dentistry', difficulty: 'Easy', class: 'easy', stars: 1, 
      check: (s, v, count, specs, entries) => {
        const gen = entries.filter(e => e.type === 'Shadowing' && e.subtype && e.subtype.toLowerCase().includes('general')).reduce((a,c) => a+parseInt(c.hours),0);
        return gen >= 50;
      },
      progress: (s, v, count, specs, entries) => Math.min((entries.filter(e => e.type === 'Shadowing' && e.subtype && e.subtype.toLowerCase().includes('general')).reduce((a,c) => a+parseInt(c.hours),0) / 50) * 100, 100),
      label: (s, v, count, specs, entries) => `${entries.filter(e => e.type === 'Shadowing' && e.subtype && e.subtype.toLowerCase().includes('general')).reduce((a,c) => a+parseInt(c.hours),0)} / 50`
    },
    
    { id: 'g18', title: 'Marathon', req: 'Log an 8+ Hour Session', difficulty: 'Medium', class: 'medium', stars: 2,
      check: (s, v, count, specs, entries) => entries.some(e => parseInt(e.hours) >= 8),
      progress: (s, v, count, specs, entries) => entries.some(e => parseInt(e.hours) >= 8) ? 100 : 0,
      label: (s, v, count, specs, entries) => entries.some(e => parseInt(e.hours) >= 8) ? "Done" : "0 / 1"
    },

    { id: 'g19', title: 'The Tour Guide', req: 'Visit 5 Different Locations', difficulty: 'Medium', class: 'medium', stars: 2,
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

    { id: 'g20', title: 'Consistency is Key', req: 'Log hours in 6 different months', difficulty: 'Hard', class: 'hard', stars: 3,
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

    { id: 'g22', title: 'Heavy Hitter', req: '40+ Hours in 1 Month', difficulty: 'Extreme', class: 'extreme', stars: 4,
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
    },

    // RARE GOAL
    { id: 'g14_rare', title: 'Mission of Mercy', req: 'Volunteer at OKMOM', difficulty: 'Special', class: 'special', stars: 1,
      check: (s, v, count, specs, entries) => {
          const terms = ["okmom", "ok mom", "oklahoma mission of mercy", "mission of mercy"];
          return entries.some(e => {
             // Check location, doctor, notes fields
             const txt = ((e.location||"") + " " + (e.doctor||"") + " " + (e.notes||"")).toLowerCase();
             return terms.some(t => txt.includes(t));
          });
      },
      progress: (s, v, count, specs, entries) => {
          const terms = ["okmom", "ok mom", "oklahoma mission of mercy", "mission of mercy"];
          const found = entries.some(e => {
             const txt = ((e.location||"") + " " + (e.doctor||"") + " " + (e.notes||"")).toLowerCase();
             return terms.some(t => txt.includes(t));
          });
          return found ? 100 : 0;
      },
      label: (s, v, count, specs, entries) => {
          const terms = ["okmom", "ok mom", "oklahoma mission of mercy", "mission of mercy"];
          const found = entries.some(e => {
             const txt = ((e.location||"") + " " + (e.doctor||"") + " " + (e.notes||"")).toLowerCase();
             return terms.some(t => txt.includes(t));
          });
          return found ? "Found!" : "Not Found";
      }
    }
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("year").textContent = new Date().getFullYear();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    document.getElementById('entry-date').value = `${year}-${month}-${day}`;

    document.querySelectorAll('.pd-progress-ring__circle').forEach(circle => {
        circle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
        circle.style.strokeDashoffset = CIRCUMFERENCE;
    });

    document.getElementById('entry-type').addEventListener('change', handleTypeChange);
    document.getElementById('edit-entry-type').addEventListener('change', handleEditTypeChange);

    setupHoursInput('entry-hours');
    setupHoursInput('edit-entry-hours');

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pd-menu-btn') && !e.target.closest('.pd-user-profile') && !e.target.closest('#pd-filter-container')) {
            closeAllMenus();
        }
    });

    loadData();
    handleTypeChange();
});

// --- POPUP LOGIC ---
function queueNotification(goal) {
    notificationQueue.push(goal);
    processNotificationQueue();
}

function processNotificationQueue() {
    if (isShowingNotification || notificationQueue.length === 0) return;
    
    isShowingNotification = true;
    const goal = notificationQueue.shift();
    showAchievementPopup(goal);
}

function showAchievementPopup(goal) {
    const popup = document.getElementById('achievement-popup');
    const nameEl = document.getElementById('popup-goal-name');
    if(!popup) return;
    
    nameEl.textContent = goal.title;
    popup.classList.add('active');
    
    setTimeout(() => {
        popup.classList.remove('active');
        setTimeout(() => {
            isShowingNotification = false;
            processNotificationQueue();
        }, 600); 
    }, 2500); 
}

function checkAchievements(silent = false) {
    let sTotal = 0, vTotal = 0;
    const specialistTypes = new Set(); 
    entries.forEach(e => {
        const h = parseInt(e.hours) || 0;
        if (e.type === 'Shadowing') { 
            sTotal += h; 
            if (e.subtype && !e.subtype.toLowerCase().includes('general')) {
                specialistTypes.add(e.subtype); 
            }
        }
        else { vTotal += h; }
    });
    const uniqueSpecs = specialistTypes.size;
    const count = entries.length;

    GOALS.forEach(g => {
        let unlocked = false;
        try { unlocked = g.check(sTotal, vTotal, count, uniqueSpecs, entries); } catch(e){}
        
        if (unlocked) {
            // Only notify if newly unlocked (or first load sync)
            if (!unlockedGoalIds.has(g.id)) {
                unlockedGoalIds.add(g.id);
                if (!silent) {
                    queueNotification(g);
                }
            }
        }
    });
}

function updateCircleStats(ringId, textId, hours) {
    const circle = document.getElementById(ringId); 
    const text = document.getElementById(textId);
    if(circle) { 
        const percent = Math.min(hours, 100); 
        const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE; 
        circle.style.strokeDashoffset = offset; 
    }
    if(text) text.innerText = hours;
}

function updateDeleteButtonState() {
    const count = document.querySelectorAll('.pd-checkbox:checked').length;
    const btn = document.getElementById('btn-delete-selected');
    btn.disabled = count === 0;
    if (count > 0) btn.classList.add('active');
    else btn.classList.remove('active');
}

window.handleSearch = function() {
    currentSearch = document.getElementById('search-input').value.trim().toLowerCase();
    render();
};

function setupHoursInput(id) {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('keydown', function(e) {
        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.'].includes(e.key)) return;
        if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault();
    });
    el.addEventListener('blur', function() {
        if (this.value) {
            let val = parseFloat(this.value);
            if (isNaN(val) || val < 0) this.value = '';
            else this.value = Math.round(val);
        }
    });
}

// --- CLOSE SIGN IN PROMPT ---
window.closeSignInPrompt = function() {
    const modal = document.getElementById('signin-prompt-modal');
    if(modal) modal.style.display = 'none';
    sessionStorage.setItem('pd_signin_dismissed', 'true');
};

window.googleLoginFromPrompt = function() { window.closeSignInPrompt(); window.googleLogin(); };
window.refreshApp = async function(user) { 
    appUser = user; 
    await loadData(); 
};
window.refreshAppPage = function() { window.location.href = 'https://predent.net/#app'; window.location.reload(); };

async function loadData() {
    if (appUser) { entries = await window.db_loadEntries(appUser); } 
    else { entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    
    checkAchievements(true); 
    render();
}

async function saveData() {
    if (appUser) {
        // Sync Logic
    } else { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
    updateDatalists();
}

function updateDatalists() {
    const uniqueDocs = [...new Set(
        entries.map(e => e.doctor)
               .filter(Boolean)
               .flatMap(d => d.split(',').map(s => s.trim()))
               .filter(s => s.length > 0)
    )].sort();

    const uniqueLocs = [...new Set(entries.map(e => e.location).filter(Boolean))].sort();
    
    const docList = document.getElementById('doc-suggestions');
    const locList = document.getElementById('loc-suggestions');
    if(docList) docList.innerHTML = uniqueDocs.map(d => `<option value="${d}">`).join('');
    if(locList) locList.innerHTML = uniqueLocs.map(l => `<option value="${l}">`).join('');
}

// --- AUTH UI UPDATE ---
window.updateAuthUI = function(user) {
    const loginBtn = document.getElementById('btn-google-login');
    const profileSection = document.getElementById('user-profile');
    const promptModal = document.getElementById('signin-prompt-modal');
    
    if (user) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(profileSection) profileSection.classList.remove('hidden');
        if(document.getElementById('user-avatar')) document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/36';
        if(document.getElementById('dropdown-name')) document.getElementById('dropdown-name').textContent = user.displayName || 'User';
        if(promptModal) promptModal.style.display = 'none'; 
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(profileSection) profileSection.classList.add('hidden');
        
        // Show modal if not dismissed
        if(promptModal && !sessionStorage.getItem('pd_signin_dismissed')) {
            promptModal.style.display = 'flex';
        }
    }
};

async function addEntry() {
    document.querySelectorAll('#input-form-card .pd-input-wrapper').forEach(el => el.classList.remove('error'));
    const type = document.getElementById('entry-type').value;
    const subtype = document.getElementById('entry-subtype').value;
    const date = document.getElementById('entry-date').value;
    const loc = document.getElementById('entry-loc').value.trim();
    const doctor = document.getElementById('entry-doctor').value.trim();
    let hoursInput = document.getElementById('entry-hours').value;
    const notes = document.getElementById('entry-notes').value;
    
    let hasError = false;
    if (!type) { document.getElementById('entry-type').parentNode.classList.add('error'); hasError = true; }
    if (!date) { document.getElementById('entry-date').parentNode.classList.add('error'); hasError = true; }
    if (!subtype) { document.getElementById('entry-subtype').parentNode.classList.add('error'); hasError = true; }
    if (!hoursInput || isNaN(parseFloat(hoursInput)) || parseFloat(hoursInput) <= 0) { document.getElementById('entry-hours').parentNode.classList.add('error'); hasError = true; }
    if (!doctor) { document.getElementById('entry-doctor').parentNode.classList.add('error'); hasError = true; }
    if (!loc) { document.getElementById('entry-loc').parentNode.classList.add('error'); hasError = true; }
    if (hasError) return;
    
    let hours = Math.round(parseFloat(hoursInput));
    const newEntry = { id: String(Date.now()) + Math.random().toString(16).slice(2), type, subtype, date, location: loc, doctor, hours, notes };
    
    try {
        if (appUser) { await window.db_addEntry(appUser, newEntry); entries.push(newEntry); } 
        else { entries.push(newEntry); }
        document.getElementById('entry-loc').value = ''; document.getElementById('entry-doctor').value = ''; document.getElementById('entry-hours').value = ''; document.getElementById('entry-notes').value = ''; 
        saveData(); 
        render();
        checkAchievements(false); // AUDIBLE POPUP
    } catch (e) { console.error("Error adding entry:", e); alert(`Error saving: ${e.message}`); }
}

async function saveEditEntry() {
    if (!editingEntryId) return;
    const modalWrappers = document.querySelectorAll('#edit-modal .pd-input-wrapper');
    if(modalWrappers.length > 0) modalWrappers.forEach(el => el.classList.remove('error'));
    const type = document.getElementById('edit-entry-type').value;
    const subtype = document.getElementById('edit-entry-subtype').value;
    const date = document.getElementById('edit-entry-date').value;
    const loc = document.getElementById('edit-entry-loc').value.trim();
    const doctor = document.getElementById('edit-entry-doctor').value.trim();
    const hoursInput = document.getElementById('edit-entry-hours').value;
    const notes = document.getElementById('edit-entry-notes').value;
    let hasError = false;
    const markError = (id) => { const el = document.getElementById(id); if(el) { el.style.borderColor = "#ff6b6b"; el.addEventListener('input', function() { this.style.borderColor = "rgba(255, 255, 255, 0.2)"; }, {once:true}); } hasError = true; };
    if (!type) markError('edit-entry-type'); if (!subtype) markError('edit-entry-subtype'); if (!date) markError('edit-entry-date'); if (!loc) markError('edit-entry-loc'); if (!doctor) markError('edit-entry-doctor'); if (!hoursInput) markError('edit-entry-hours');
    if (hasError) return; 

    const hours = Math.round(parseFloat(hoursInput));
    const updatedEntry = { id: editingEntryId, type, subtype, date, location: loc, doctor, hours, notes };
    try {
        if (appUser) { await window.db_addEntry(appUser, updatedEntry); const idx = entries.findIndex(e => e.id === editingEntryId); if(idx !== -1) entries[idx] = updatedEntry; } 
        else { const idx = entries.findIndex(e => e.id === editingEntryId); if (idx !== -1) entries[idx] = updatedEntry; }
        saveData(); render(); closeEditModal();
        checkAchievements(false); // AUDIBLE POPUP
    } catch (e) { console.error("Error editing entry:", e); alert("Error saving changes."); }
}

async function deleteSelectedEntries() {
    const checkboxes = document.querySelectorAll('.pd-checkbox:checked');
    if(checkboxes.length === 0) return;
    const idsToDelete = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    if(appUser) { await window.db_batchDelete(appUser, idsToDelete); }
    entries = entries.filter(e => !idsToDelete.includes(e.id));
    saveData(); render(); toggleSelectionMode();
}

async function confirmReset() {
    if(appUser) { try { await window.db_wipeAllEntries(appUser); } catch(e) { console.error("Wipe failed", e); closeResetModal(); return; } }
    entries = []; saveData(); render(); closeResetModal(); 
}

async function confirmDeleteEntry() {
    if (entryToDeleteId) {
        if (appUser) { await window.db_deleteEntry(appUser, entryToDeleteId); entries = entries.filter(e => e.id !== entryToDeleteId); } 
        else { entries = entries.filter(e => e.id !== entryToDeleteId); }
        saveData(); render();
    }
    closeDeleteModal();
}

window.viewEntry = function(id) {
    if(isSelectionMode) {
        const cb = document.querySelector(`.pd-checkbox[data-id="${id}"]`);
        if(cb) { cb.checked = !cb.checked; updateDeleteButtonState(); }
        return;
    }
    const entry = entries.find(e => e.id === String(id));
    if(!entry) return;
    const modalContent = document.getElementById('view-modal-content');
    if (entry.type === 'Volunteering') {
        modalContent.classList.add('pd-modal-volunteer');
        document.getElementById('view-type-title').style.color = '#ffd700';
    } else {
        modalContent.classList.remove('pd-modal-volunteer');
        document.getElementById('view-type-title').style.color = '#4da6ff';
    }
    document.getElementById('view-type-title').textContent = entry.type;
    document.getElementById('view-subtype').textContent = entry.subtype;
    let viewDate = entry.date;
    if(viewDate.includes('-')) { const p = viewDate.split('-'); viewDate = `${p[1]}/${p[2]}/${p[0]}`; }
    document.getElementById('view-date').textContent = viewDate;
    document.getElementById('view-hours').textContent = entry.hours;
    document.getElementById('view-doc').textContent = entry.doctor;
    document.getElementById('view-loc').textContent = entry.location;
    const notesDiv = document.getElementById('view-notes-container');
    if(entry.notes) { notesDiv.textContent = entry.notes; notesDiv.style.display = 'block'; } else { notesDiv.style.display = 'none'; }
    document.getElementById('view-modal').style.display = 'flex';
};

window.toggleFilterMenu = (e) => { e.stopPropagation(); document.getElementById('pd-filter-dropdown').classList.toggle('active'); };
window.toggleOptionsMenu = (e) => { e.stopPropagation(); document.getElementById('pd-options-dropdown').classList.toggle('active'); };
window.toggleProfileMenu = (e) => { e.stopPropagation(); document.getElementById('profile-dropdown').classList.toggle('active'); };

window.setFilter = function(type) {
    currentFilter = type; 
    document.querySelectorAll('#pd-filter-dropdown .pd-menu-item').forEach(btn => { if(btn.innerText.includes(type) || (type==='All' && btn.innerText.includes('Show All'))) btn.classList.add('selected'); else btn.classList.remove('selected'); });
    render(); 
    closeAllMenus();
};
window.openResetModal = openResetModal;
window.closeResetModal = closeResetModal;
window.checkResetInput = checkResetInput;
window.confirmReset = confirmReset;
window.addEntry = addEntry;
window.exportData = exportData;
window.deleteSelectedEntries = deleteSelectedEntries;
window.deleteEntry = (id) => { entryToDeleteId = String(id); document.getElementById('delete-modal').style.display = 'flex'; };
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteEntry = confirmDeleteEntry;
window.editEntry = editEntry;
window.closeEditModal = closeEditModal;
window.saveEditEntry = saveEditEntry;
window.switchTab = switchTab;
window.skipProfileSetup = skipProfileSetup; 
window.toggleProfileMenu = (e) => { if(e) e.stopPropagation(); document.getElementById('profile-dropdown').classList.toggle('active'); };

function checkResetInput() { const val = document.getElementById('reset-confirm-input').value.trim().toUpperCase(); document.getElementById('reset-confirm-btn').disabled = (val !== 'DELETE'); }
function closeAllMenus() {
    document.getElementById('pd-filter-dropdown').classList.remove('active');
    document.getElementById('pd-options-dropdown').classList.remove('active');
    document.getElementById('profile-dropdown').classList.remove('active');
}
function skipProfileSetup() { localStorage.setItem('pd_profile_setup_done', 'true'); document.getElementById('lb-profile-box').classList.add('pd-hidden'); }
function updateProfileName() {
    // Deprecated
}
function switchTab(tabName) {
    document.querySelectorAll('.pd-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.pd-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${tabName}`).classList.add('active');
    const btns = document.querySelectorAll('.pd-tab-btn');
    if(tabName === 'tracker') { btns[0].classList.add('active'); handleTypeChange(); }
    else if (tabName === 'stats') { 
        btns[1].classList.add('active'); 
        calculateTrends(); 
    }
    else if (tabName === 'goals') {
        btns[2].classList.add('active');
        renderGoals(); 
    }
}
function handleTypeChange() { updateSubtypeOptions('entry-type', 'entry-subtype', 'entry-doctor', 'entry-notes'); }
function handleEditTypeChange() { updateSubtypeOptions('edit-entry-type', 'edit-entry-subtype', 'edit-entry-doctor', 'edit-entry-notes'); }
function updateSubtypeOptions(typeId, subtypeId, docId, notesId) {
    const mainType = document.getElementById(typeId).value;
    const subSelect = document.getElementById(subtypeId);
    const docInput = document.getElementById(docId);
    const notesInput = document.getElementById(notesId);
    
    subSelect.innerHTML = '';
    const options = mainType === 'Shadowing' ? SUBTYPES_SHADOW : SUBTYPES_VOLUNTEER;
    options.forEach(opt => { const el = document.createElement('option'); el.value = opt; el.textContent = opt; subSelect.appendChild(el); });
    
    docInput.placeholder = mainType === 'Shadowing' ? "Doctor(s) (separate with comma)" : "Organization / Supervisor";
    
    if(notesInput) {
        notesInput.placeholder = (mainType === 'Shadowing') 
            ? "What did you learn/see today?" 
            : "What did you do today?";
    }
}
function openResetModal() { document.getElementById('reset-modal').style.display = 'flex'; }
function closeResetModal() { document.getElementById('reset-modal').style.display = 'none'; document.getElementById('reset-confirm-input').value = ''; }

function render() {
    let sTotal = 0, vTotal = 0; 
    entries.forEach(e => { const h = parseInt(e.hours, 10) || 0; if (e.type === 'Shadowing') sTotal += h; else vTotal += h; });
    updateCircleStats('ring-shadow', 'total-shadow', sTotal); 
    updateCircleStats('ring-volunteer', 'total-volunteer', vTotal);
    
    // UPDATE TRENDS & GRAPH ON EVERY RENDER
    calculateTrends();

    updateDatalists();
    const list = document.getElementById('log-list-ul'); list.innerHTML = '';
    
    let displayEntries = entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (currentFilter !== 'All') displayEntries = displayEntries.filter(e => e.type === currentFilter);
    if (currentSearch) {
        const term = currentSearch.toLowerCase();
        displayEntries = displayEntries.filter(e => 
            (e.doctor && e.doctor.toLowerCase().includes(term)) ||
            (e.location && e.location.toLowerCase().includes(term)) ||
            (e.notes && e.notes.toLowerCase().includes(term))
        );
    }
    
    document.getElementById('filter-badge').style.display = currentFilter !== 'All' ? 'inline-block' : 'none';
    if(currentFilter === 'Volunteering') document.getElementById('filter-badge').classList.add('volunteer');
    else document.getElementById('filter-badge').classList.remove('volunteer');
    
    if(currentFilter !== 'All') document.getElementById('filter-badge').innerText = currentFilter.toUpperCase();
    if (displayEntries.length === 0) list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:1rem;">No entries found.</div>';
    
    displayEntries.forEach((entry) => {
        const typeClass = entry.type === 'Shadowing' ? 'type-shadow' : 'type-volunteer';
        const dp = entry.date.split('-');
        const displayDate = `${dp[1]}/${dp[2]}/${dp[0]}`;
        const li = document.createElement('li');
        li.className = `pd-entry-item ${typeClass}`;
        li.setAttribute('onclick', `viewEntry('${entry.id}')`);
        li.innerHTML = `
            <input type="checkbox" class="pd-checkbox" data-id="${entry.id}" onclick="event.stopPropagation(); updateDeleteButtonState()">
            <div class="pd-entry-content">
                <div class="pd-entry-title">${entry.doctor||entry.location} <span style="font-weight:400; opacity:0.7; font-size:0.9em;">(${entry.subtype})</span></div>
                <div class="pd-entry-meta">${entry.location} • ${displayDate}</div>
            </div>
            <div style="font-weight:700; color:#fff; margin-right:15px; white-space:nowrap;">${entry.hours} hrs</div>
            <div class="pd-entry-actions">
                <button class="pd-entry-btn edit" onclick="event.stopPropagation(); editEntry('${entry.id}')">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
            </div>
        `;
        list.appendChild(li);
    });
    
    if(isSelectionMode) {
        document.getElementById('log-list').classList.add('selection-mode');
        document.getElementById('btn-delete-selected').style.display = 'block';
        document.getElementById('btn-select-mode').textContent = 'Cancel';
        updateDeleteButtonState();
    } else {
        document.getElementById('log-list').classList.remove('selection-mode');
        document.getElementById('btn-delete-selected').style.display = 'none';
        document.getElementById('btn-select-mode').textContent = 'Select Entries';
    }
}

function calculateTrends() {
    if(entries.length === 0) {
        document.getElementById('stat-unique-docs').innerText = "0";
        document.getElementById('stat-unique-orgs').innerText = "0";
        document.getElementById('stat-total-entries').innerText = "0";
        document.getElementById('stat-avg-session').innerText = "0h";
        document.getElementById('stat-proj-shadow').innerText = "--";
        document.getElementById('stat-proj-vol').innerText = "--";
        document.getElementById('list-vol-mix').innerHTML = '<div class="pd-trend-empty">No data available</div>';
        renderPieChart();
        renderHeatmap();
        return;
    }

    calculateAdvancedStats();

    // Unique Dentists (Shadowing)
    const uniqueDocs = new Set(
        entries.filter(e => e.type === 'Shadowing')
               .flatMap(e => e.doctor.split(',').map(s => s.trim()))
               .filter(s => s.length > 0)
    ).size;

    // Unique Orgs (Volunteer)
    const uniqueOrgs = new Set(
        entries.filter(e => e.type === 'Volunteering')
               .flatMap(e => e.doctor.split(',').map(s => s.trim()))
               .filter(s => s.length > 0)
    ).size;

    document.getElementById('stat-unique-docs').innerText = uniqueDocs;
    document.getElementById('stat-unique-orgs').innerText = uniqueOrgs;
    document.getElementById('stat-total-entries').innerText = entries.length;
    
    // Vol Mix
    const volEntries = entries.filter(e => e.type === 'Volunteering');
    let dentalHrs = 0, nonDentalHrs = 0; 
    volEntries.forEach(e => { if(e.subtype === 'Dental Related') dentalHrs += parseInt(e.hours); else nonDentalHrs += parseInt(e.hours); });
    const volList = document.getElementById('list-vol-mix');
    if(dentalHrs > 0 || nonDentalHrs > 0) {
        const total = dentalHrs + nonDentalHrs; const dPct = Math.round((dentalHrs / total) * 100); const nPct = 100 - dPct;
        volList.innerHTML = `<li><span style="color:#51cf66;">Dental Related</span><span>${dPct}% (${dentalHrs} hrs)</span></li><li><span style="color:#ff6b6b;">Non-Dental</span><span>${nPct}% (${nonDentalHrs} hrs)</span></li><div class="pd-percent-bar"><div class="pd-fill-dental" style="width:${dPct}%;"></div><div class="pd-fill-non" style="width:${nPct}%;"></div></div>`;
    } else { volList.innerHTML = '<div class="pd-trend-empty">No volunteer data available</div>'; }
    
    renderPieChart();
    renderHeatmap();
}

function calculateAdvancedStats() {
    let totalHours = 0;
    let sTotal = 0;
    let vTotal = 0;
    let firstDate = null;
    
    entries.forEach(e => {
        const h = parseInt(e.hours);
        totalHours += h;
        if(e.type === 'Shadowing') sTotal += h;
        else vTotal += h;
        
        const d = new Date(e.date);
        if(!firstDate || d < firstDate) firstDate = d;
    });
    
    const avg = entries.length > 0 ? (totalHours / entries.length).toFixed(1) : 0;
    document.getElementById('stat-avg-session').innerText = avg + "h";
    
    // Shadowing Projection
    if(sTotal >= 100) document.getElementById('stat-proj-shadow').innerText = "Done!";
    else if (firstDate) {
        const days = Math.max(1, Math.ceil((new Date() - firstDate)/(1000*60*60*24)));
        const rate = sTotal / days; 
        if(rate > 0) {
            const need = 100 - sTotal;
            const moreDays = Math.ceil(need / rate);
            const d = new Date(); d.setDate(d.getDate() + moreDays);
            document.getElementById('stat-proj-shadow').innerText = d.toLocaleDateString('en-US', {month:'short', year:'numeric'});
        } else { document.getElementById('stat-proj-shadow').innerText = "--"; }
    } else { document.getElementById('stat-proj-shadow').innerText = "--"; }

    // Volunteer Projection
    if(vTotal >= 100) document.getElementById('stat-proj-vol').innerText = "Done!";
    else if (firstDate) {
        const days = Math.max(1, Math.ceil((new Date() - firstDate)/(1000*60*60*24)));
        const rate = vTotal / days; 
        if(rate > 0) {
            const need = 100 - vTotal;
            const moreDays = Math.ceil(need / rate);
            const d = new Date(); d.setDate(d.getDate() + moreDays);
            document.getElementById('stat-proj-vol').innerText = d.toLocaleDateString('en-US', {month:'short', year:'numeric'});
        } else { document.getElementById('stat-proj-vol').innerText = "--"; }
    } else { document.getElementById('stat-proj-vol').innerText = "--"; }
}

function renderPieChart() {
    const canvas = document.getElementById('pie-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const legend = document.getElementById('pie-legend');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    
    const radius = Math.min(width, height) / 2.2;
    const centerX = width / 2; 
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const counts = {};
    let total = 0;
    entries.filter(e => e.type === 'Shadowing').forEach(e => {
        const key = e.subtype; 
        counts[key] = (counts[key] || 0) + parseInt(e.hours);
        total += parseInt(e.hours);
    });

    if(total === 0) {
        // legend.innerHTML = '<div class="pd-trend-empty">No data</div>';
        return;
    }

    const colors = ['#4da6ff', '#ffd700', '#51cf66', '#ff6b6b', '#9333ea', '#ec4899', '#f97316'];
    let startAngle = 0;
    let colorIdx = 0;
    legend.innerHTML = '';

    Object.entries(counts).forEach(([label, value]) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        const color = colors[colorIdx % colors.length];
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.fillStyle = color;
        ctx.fill();
        
        const item = document.createElement('div');
        item.className = 'pd-legend-item';
        item.innerHTML = `<div class="pd-legend-dot" style="background:${color}"></div>${label}`;
        legend.appendChild(item);

        startAngle += sliceAngle;
        colorIdx++;
    });
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#030D4A'; 
    ctx.fill();
}

function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    if(!container) return;
    container.innerHTML = '';
    const today = new Date();
    const activeDates = {}; 
    
    entries.forEach(e => {
        if (!activeDates[e.date]) activeDates[e.date] = new Set();
        activeDates[e.date].add(e.type);
    });

    for (let i = 180; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const cell = document.createElement('div');
        cell.className = 'pd-heatmap-cell';
        
        if (activeDates[dateStr]) {
            const types = activeDates[dateStr];
            if (types.has('Shadowing') && types.has('Volunteering')) {
                cell.style.background = '#51cf66'; // Green
            } else if (types.has('Shadowing')) {
                cell.style.background = '#4da6ff'; // Blue
            } else {
                cell.style.background = '#ffd700'; // Yellow
            }
            cell.title = dateStr;
        }
        container.appendChild(cell);
    }
}

// --- RENDER GOALS (SPLIT SECTIONS) ---
function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    container.innerHTML = '';
    
    let sTotal = 0, vTotal = 0;
    const specialistTypes = new Set(); 
    entries.forEach(e => {
        const h = parseInt(e.hours) || 0;
        if (e.type === 'Shadowing') { 
            sTotal += h; 
            if (e.subtype && !e.subtype.toLowerCase().includes('general')) {
                specialistTypes.add(e.subtype); 
            }
        }
        else { vTotal += h; }
    });
    const uniqueSpecs = specialistTypes.size;
    const count = entries.length;

    const completed = [];
    const incomplete = [];

    GOALS.forEach(g => {
        let unlocked = false;
        try { unlocked = g.check(sTotal, vTotal, count, uniqueSpecs, entries); } catch(e){}
        const gObj = { ...g, unlocked };
        if(unlocked) completed.push(gObj);
        else incomplete.push(gObj);
    });

    const createGrid = (goalsList) => {
        const gridDiv = document.createElement('div');
        gridDiv.className = 'pd-goals-grid';
        goalsList.forEach(g => {
            let progress = 0;
            if (g.progress) {
                 try { progress = g.progress(sTotal, vTotal, count, uniqueSpecs, entries); } catch(e){}
            }
            
            let label = "0 / " + g.req;
            if (g.label) {
                try { label = g.label(sTotal, vTotal, count, uniqueSpecs, entries); } catch(e){}
            }
            if (g.unlocked) label = "COMPLETED";

            let typeClass = '';
            if (g.type === 'shadow') typeClass = 'type-shadow';
            else if (g.type === 'vol') typeClass = 'type-vol';
            else typeClass = 'type-mixed';
            
            if(g.class) typeClass += ' ' + g.class;

            const card = document.createElement('div');
            card.className = `pd-goal-card ${typeClass} ${g.unlocked ? 'completed' : ''}`;
            
            let starHTML = '';
            // Pink for special, yellow otherwise
            const starColor = g.unlocked ? (g.class === 'special' ? '#ec4899' : '#ffd700') : '#555';
            for(let i=0; i<g.stars; i++) starHTML += `<span style="color:${starColor}">★</span> `;
            
            card.innerHTML = `
                <div class="pd-goal-stars">${starHTML}</div>
                <div class="pd-goal-title">${g.title}</div>
                <div class="pd-goal-diff">${g.difficulty}</div>
                <div class="pd-goal-req">${g.req}</div>
                ${!g.unlocked ? `<div class="pd-goal-progress-container"><div class="pd-goal-progress-bar" style="width:${progress}%"></div></div>` : ''}
                <div class="pd-goal-status">${label}</div>
            `;
            gridDiv.appendChild(card);
        });
        return gridDiv;
    };

    if (incomplete.length > 0) {
        const title = document.createElement('div');
        title.className = 'pd-goals-section-title';
        title.innerText = 'In Progress';
        container.appendChild(title);
        container.appendChild(createGrid(incomplete));
    }

    if (completed.length > 0) {
        const title = document.createElement('div');
        title.className = 'pd-goals-section-title';
        title.innerText = 'Completed';
        container.appendChild(title);
        container.appendChild(createGrid(completed));
    }
}
