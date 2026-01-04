// --- MAIN APP LOGIC ---
const STORAGE_KEY = 'pd_tracker_data_v2'; 
let entries = []; 
let currentFilter = 'All';
let entryToDeleteId = null; 
let editingEntryId = null;
let appUser = null; 

const SUBTYPES_SHADOW = ["General Dentistry", "Orthodontics", "Pediatric Dentistry", "Oral Surgery", "Endodontics", "Periodontics", "Prosthodontics", "Dental Public Health", "Other"];
const SUBTYPES_VOLUNTEER = ["Dental Related", "Non-Dental Related"];
const BLOCKED_WORDS = ["damn", "hell", "crap", "suck", "sexy", "hot", "xxx", "stupid", "idiot", "ass", "bitch", "shit", "fuck", "dick", "cock", "pussy"];
const CIRCLE_RADIUS = 110; 
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("year").textContent = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entry-date').value = today;

    document.querySelectorAll('.pd-progress-ring__circle').forEach(circle => {
        circle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
        circle.style.strokeDashoffset = CIRCUMFERENCE;
    });

    document.getElementById('entry-type').addEventListener('change', handleTypeChange);
    document.getElementById('edit-entry-type').addEventListener('change', handleEditTypeChange);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pd-menu-btn') && !e.target.closest('.pd-user-profile')) {
            closeAllMenus();
        }
    });

    loadData();
    handleTypeChange();
});

window.refreshApp = async function(user) {
    appUser = user;
    await loadData();
};

window.refreshAppPage = function() {
    window.location.href = 'https://predent.net/#app';
    window.location.reload();
};

async function loadData() {
    if (appUser) {
        entries = await window.db_loadEntries(appUser);
    } else {
        entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }
    render();
}

async function saveData() {
    if (appUser) {
        // Calculate Totals for Leaderboard Sync
        let sTotal = 0, vTotal = 0;
        entries.forEach(e => { 
            const h = parseInt(e.hours, 10) || 0; 
            if (e.type === 'Shadowing') sTotal += h; else vTotal += h; 
        });
        
        // Push stats to Firebase Leaderboard
        if(window.updateLeaderboardStats) {
            await window.updateLeaderboardStats(appUser, sTotal, vTotal);
        }
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
}

// --- ADD ENTRY ---
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
    
    if (!hoursInput || isNaN(parseFloat(hoursInput)) || parseFloat(hoursInput) <= 0) { 
        document.getElementById('entry-hours').parentNode.classList.add('error'); 
        hasError = true; 
    }
    
    if (!doctor) { document.getElementById('entry-doctor').parentNode.classList.add('error'); hasError = true; }
    
    if (!loc) { 
        document.getElementById('entry-loc').parentNode.classList.add('error'); 
        hasError = true; 
    }

    if (hasError) return;
    
    let hours = Math.round(parseFloat(hoursInput));
    
    const newEntry = { 
        id: String(Date.now()) + Math.random().toString(16).slice(2), 
        type, subtype, date, location: loc, doctor, hours, notes 
    };
    
    try {
        if (appUser) {
            await window.db_addEntry(appUser, newEntry);
            entries.push(newEntry);
        } else {
            entries.push(newEntry);
        }
        
        document.getElementById('entry-loc').value = ''; 
        document.getElementById('entry-doctor').value = ''; 
        document.getElementById('entry-hours').value = ''; 
        document.getElementById('entry-notes').value = ''; 
        
        saveData(); 
        render();
    } catch (e) {
        console.error("Error adding entry:", e);
        alert("Connection error. Please try again.");
    }
}

// --- EDIT ENTRY ---
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
    const markError = (id) => {
        const el = document.getElementById(id);
        if(el) { el.style.borderColor = "#ff6b6b"; el.addEventListener('input', function() { this.style.borderColor = "rgba(255, 255, 255, 0.2)"; }, {once:true}); }
        hasError = true;
    };

    if (!type) markError('edit-entry-type');
    if (!subtype) markError('edit-entry-subtype');
    if (!date) markError('edit-entry-date');
    if (!loc) markError('edit-entry-loc');
    if (!doctor) markError('edit-entry-doctor');
    if (!hoursInput) markError('edit-entry-hours');

    if (hasError) return; 

    const hours = Math.round(parseFloat(hoursInput));

    const updatedEntry = { 
        id: editingEntryId, 
        type, subtype, date, location: loc, doctor, hours, notes 
    };

    try {
        if (appUser) {
            await window.db_addEntry(appUser, updatedEntry); 
            const idx = entries.findIndex(e => e.id === editingEntryId);
            if(idx !== -1) entries[idx] = updatedEntry;
        } else {
            const idx = entries.findIndex(e => e.id === editingEntryId);
            if (idx !== -1) entries[idx] = updatedEntry;
        }
        
        saveData(); render(); 
        closeEditModal();
    } catch (e) {
        console.error("Error editing entry:", e);
        alert("Error saving changes.");
    }
}

async function confirmDeleteEntry() {
    if (entryToDeleteId) {
        if (appUser) {
            await window.db_deleteEntry(appUser, entryToDeleteId);
            entries = entries.filter(e => e.id !== entryToDeleteId);
        } else {
            entries = entries.filter(e => e.id !== entryToDeleteId);
        }
        saveData(); render();
    }
    closeDeleteModal();
}

window.viewEntry = function(id) {
    const entry = entries.find(e => e.id === String(id));
    if(!entry) return;

    document.getElementById('view-type-title').textContent = entry.type;
    document.getElementById('view-type-title').style.color = entry.type === 'Shadowing' ? '#4da6ff' : '#ffd700';
    document.getElementById('view-subtype').textContent = entry.subtype;
    document.getElementById('view-date').textContent = entry.date;
    document.getElementById('view-hours').textContent = entry.hours;
    document.getElementById('view-doc').textContent = entry.doctor;
    document.getElementById('view-loc').textContent = entry.location;
    
    const notesDiv = document.getElementById('view-notes-container');
    if(entry.notes) {
        notesDiv.textContent = entry.notes;
        notesDiv.style.display = 'block';
    } else {
        notesDiv.style.display = 'none';
    }

    document.getElementById('view-modal').style.display = 'flex';
};

window.toggleFilterMenu = (e) => { 
    e.stopPropagation(); 
    const btn = document.getElementById('btn-filter-toggle');
    const menu = document.getElementById('pd-filter-dropdown');
    document.getElementById('pd-options-dropdown').classList.remove('active');
    document.getElementById('btn-options-toggle').classList.remove('active');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
};

window.toggleOptionsMenu = (e) => { 
    e.stopPropagation(); 
    const btn = document.getElementById('btn-options-toggle');
    const menu = document.getElementById('pd-options-dropdown');
    document.getElementById('pd-filter-dropdown').classList.remove('active');
    document.getElementById('btn-filter-toggle').classList.remove('active');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
};

window.setFilter = setFilter;
window.addEntry = addEntry;
window.exportData = exportData;
window.deleteEntry = (id) => { entryToDeleteId = String(id); document.getElementById('delete-modal').style.display = 'flex'; };
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteEntry = confirmDeleteEntry;
window.editEntry = editEntry;
window.closeEditModal = closeEditModal;
window.saveEditEntry = saveEditEntry;
window.switchTab = switchTab;
window.updateProfileName = updateProfileName;
window.skipProfileSetup = skipProfileSetup; 
window.toggleProfileMenu = () => document.getElementById('profile-dropdown').classList.toggle('active');

function closeAllMenus() {
    document.getElementById('pd-filter-dropdown').classList.remove('active');
    document.getElementById('btn-filter-toggle').classList.remove('active');
    document.getElementById('pd-options-dropdown').classList.remove('active');
    document.getElementById('btn-options-toggle').classList.remove('active');
    document.getElementById('profile-dropdown').classList.remove('active');
}

function skipProfileSetup() {
    localStorage.setItem('pd_profile_setup_done', 'true');
    document.getElementById('lb-profile-box').classList.add('pd-hidden');
}

function updateProfileName() {
    const nameInput = document.getElementById('user-display-name');
    const name = nameInput.value.trim();
    if(!name && !localStorage.getItem('pd_username')) return; 
    if(name) {
        const lowerName = name.toLowerCase();
        const hasProfanity = BLOCKED_WORDS.some(word => lowerName.includes(word));
        if (hasProfanity) { document.getElementById('warning-modal').style.display = 'flex'; nameInput.value = ''; return; }
        localStorage.setItem('pd_username', name);
    }
    const savedName = localStorage.getItem('pd_username');
    if(savedName) document.getElementById('dropdown-name').textContent = savedName;
    localStorage.setItem('pd_profile_setup_done', 'true');
    document.getElementById('lb-profile-box').classList.add('pd-hidden');
    if(window.syncToCloud) window.syncToCloud();
    if(name) alert("Display name updated!");
}

function switchTab(tabName) {
    document.querySelectorAll('.pd-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.pd-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${tabName}`).classList.add('active');
    const btns = document.querySelectorAll('.pd-tab-btn');
    
    if(tabName === 'tracker') { 
        btns[0].classList.add('active'); 
        handleTypeChange(); 
    }
    else if (tabName === 'stats') { 
        btns[1].classList.add('active'); 
        calculateTrends(); 
    }
    else { 
        btns[2].classList.add('active'); 
        if(localStorage.getItem('pd_username')) {
            document.getElementById('dropdown-name').textContent = localStorage.getItem('pd_username');
        }
    }
}

function handleTypeChange() { updateSubtypeOptions('entry-type', 'entry-subtype', 'entry-doctor'); }
function handleEditTypeChange() { updateSubtypeOptions('edit-entry-type', 'edit-entry-subtype', 'edit-entry-doctor'); }
function updateSubtypeOptions(typeId, subtypeId, docId) {
    const mainType = document.getElementById(typeId).value;
    const subSelect = document.getElementById(subtypeId);
    const docInput = document.getElementById(docId);
    subSelect.innerHTML = '';
    const options = mainType === 'Shadowing' ? SUBTYPES_SHADOW : SUBTYPES_VOLUNTEER;
    options.forEach(opt => { const el = document.createElement('option'); el.value = opt; el.textContent = opt; subSelect.appendChild(el); });
    docInput.placeholder = mainType === 'Shadowing' ? "Doctor(s)" : "Organization / Supervisor";
}

function editEntry(id) {
    const entry = entries.find(e => e.id === String(id)); 
    if (!entry) return;
    editingEntryId = String(id);
    document.getElementById('edit-entry-type').value = entry.type;
    handleEditTypeChange();
    document.getElementById('edit-entry-subtype').value = entry.subtype;
    document.getElementById('edit-entry-date').value = entry.date;
    document.getElementById('edit-entry-hours').value = entry.hours;
    document.getElementById('edit-entry-doctor').value = entry.doctor || '';
    document.getElementById('edit-entry-loc').value = entry.location;
    document.getElementById('edit-entry-notes').value = entry.notes || '';
    document.getElementById('edit-modal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; editingEntryId = null; }
function closeDeleteModal() { document.getElementById('delete-modal').style.display = 'none'; entryToDeleteId = null; }
function openResetModal() { document.getElementById('reset-modal').style.display = 'flex'; }
function closeResetModal() { document.getElementById('reset-modal').style.display = 'none'; document.getElementById('reset-confirm-input').value = ''; }

function render() {
    const list = document.getElementById('log-list-ul'); list.innerHTML = '';
    let sTotal = 0, vTotal = 0; entries.forEach(e => { const h = parseInt(e.hours, 10) || 0; if (e.type === 'Shadowing') sTotal += h; else vTotal += h; });
    updateCircleStats('ring-shadow', 'total-shadow', sTotal); updateCircleStats('ring-volunteer', 'total-volunteer', vTotal);
    let displayEntries = entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (currentFilter !== 'All') displayEntries = displayEntries.filter(e => e.type === currentFilter);
    document.getElementById('filter-badge').style.display = currentFilter !== 'All' ? 'inline-block' : 'none';
    if(currentFilter !== 'All') document.getElementById('filter-badge').innerText = currentFilter.toUpperCase();
    if (displayEntries.length === 0) list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:1rem;">No entries found.</div>';
    
    displayEntries.forEach((entry) => {
        const typeClass = entry.type === 'Shadowing' ? 'type-shadow' : 'type-volunteer';
        const displayDate = new Date(entry.date.split('-')[0], entry.date.split('-')[1]-1, entry.date.split('-')[2]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const li = document.createElement('li');
        li.className = `pd-entry-item ${typeClass}`;
        li.setAttribute('onclick', `viewEntry('${entry.id}')`);
        
        li.innerHTML = `
            <div class="pd-entry-content">
                <div class="pd-entry-title">${entry.doctor||entry.location} <span style="font-weight:400; opacity:0.7; font-size:0.9em;">(${entry.subtype})</span></div>
                <div class="pd-entry-meta">${entry.location} • ${displayDate}</div>
            </div>
            <div style="font-weight:700; color:#fff; margin-right:15px; white-space:nowrap;">${entry.hours} hrs</div>
            <div class="pd-entry-actions">
                <button class="pd-entry-btn edit" onclick="event.stopPropagation(); editEntry('${entry.id}')">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="pd-entry-btn delete" onclick="event.stopPropagation(); deleteEntry('${entry.id}')">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        `;
        list.appendChild(li);
    });
}

function calculateTrends() {
    const uniqueDocs = new Set(entries.filter(e => e.type === 'Shadowing').map(e => e.doctor)).size;
    document.getElementById('stat-unique-docs').innerText = uniqueDocs;
    document.getElementById('stat-total-entries').innerText = entries.length;
    const specialties = {}; entries.filter(e => e.type === 'Shadowing').forEach(e => { specialties[e.subtype] = (specialties[e.subtype] || 0) + e.hours; });
    const sortedSpecs = Object.entries(specialties).sort((a,b) => b[1] - a[1]);
    const specList = document.getElementById('list-top-specialties');
    specList.innerHTML = sortedSpecs.length === 0 ? '<div class="pd-trend-empty">No shadowing data available</div>' : '';
    sortedSpecs.slice(0, 5).forEach(([name, hours]) => { specList.innerHTML += `<li><span>${name}</span><span>${hours} hrs</span></li>`; });
    const volEntries = entries.filter(e => e.type === 'Volunteering');
    let dentalHrs = 0, nonDentalHrs = 0; volEntries.forEach(e => { if(e.subtype === 'Dental Related') dentalHrs += parseInt(e.hours); else nonDentalHrs += parseInt(e.hours); });
    const volList = document.getElementById('list-vol-mix');
    if(dentalHrs > 0 || nonDentalHrs > 0) {
        const total = dentalHrs + nonDentalHrs; const dPct = Math.round((dentalHrs / total) * 100); const nPct = 100 - dPct;
        volList.innerHTML = `<li><span style="color:#51cf66;">Dental Related</span><span>${dPct}% (${dentalHrs} hrs)</span></li><li><span style="color:#ff6b6b;">Non-Dental</span><span>${nPct}% (${nonDentalHrs} hrs)</span></li><div class="pd-percent-bar"><div class="pd-fill-dental" style="width:${dPct}%;"></div><div class="pd-fill-non" style="width:${nPct}%;"></div></div>`;
    } else { volList.innerHTML = '<div class="pd-trend-empty">No volunteer data available</div>'; }
}

function updateCircleStats(ringId, textId, hours) {
    const circle = document.getElementById(ringId); const text = document.getElementById(textId);
    if(circle) { const percent = Math.min(hours, 100); const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE; circle.style.strokeDashoffset = offset; }
    if(text) text.innerText = hours;
}

function setFilter(type) {
    currentFilter = type; const badge = document.getElementById('filter-badge'); badge.style.display = type !== 'All' ? 'inline-block' : 'none';
    if(type !== 'All') badge.innerText = type.toUpperCase();
    document.querySelectorAll('#pd-filter-dropdown .pd-menu-item').forEach(btn => { if(btn.innerText.includes(type)) btn.classList.add('selected'); else btn.classList.remove('selected'); });
    render(); document.getElementById('pd-filter-dropdown').classList.remove('active');
    document.getElementById('btn-filter-toggle').classList.remove('active'); 
}

function exportData() {
    if(entries.length === 0) { alert("No data to export!"); return; }
    let csv = "Date,Activity Type,Subtype,Doctor/Supervisor,Location,Hours,Notes\n";
    entries.forEach(e => { const sl = `"${e.location.replace(/"/g, '""')}"`; const sd = `"${(e.doctor || '').replace(/"/g, '""')}"`; const sn = `"${(e.notes || '').replace(/"/g, '""')}"`; csv += `${e.date},"${e.type}","${e.subtype}",${sd},${sl},${e.hours},${sn}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'PreDent_Activity_Log.csv'; a.click();
}
