// --- MAIN APP LOGIC ---
const STORAGE_KEY = 'pd_tracker_data_v2'; 
let entries = []; 
let currentFilter = 'All';
let currentSearch = ''; 
let entryToDeleteId = null; 
let editingEntryId = null;
let appUser = null; 
let isSelectionMode = false;

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
    setupHoursInput('entry-hours');
    setupHoursInput('edit-entry-hours');

    // Global click listener to close menus
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pd-menu-container') && !e.target.closest('.pd-user-profile')) {
            closeAllMenus();
        }
    });

    loadData();
    handleTypeChange();
});

// --- MENUS & TOGGLES (FIXED) ---

// 1. Profile Menu
window.toggleProfileMenu = function(e) {
    if(e) e.stopPropagation();
    closeAllMenus(false); // Close others
    document.getElementById('profile-dropdown').classList.toggle('active');
};

// 2. Filter Menu
window.toggleFilterMenu = function(e) {
    if(e) e.stopPropagation();
    closeAllMenus(false); // Close others
    const menu = document.getElementById('pd-filter-dropdown');
    const btn = document.getElementById('btn-filter-toggle');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
};

// 3. Options Menu (3 Dots)
window.toggleOptionsMenu = function(e) {
    if(e) e.stopPropagation();
    closeAllMenus(false); // Close others
    const menu = document.getElementById('pd-options-dropdown');
    const btn = document.getElementById('btn-options-toggle');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
};

function closeAllMenus(closeProfile = true) {
    document.getElementById('pd-filter-dropdown').classList.remove('active');
    document.getElementById('btn-filter-toggle').classList.remove('active');
    
    document.getElementById('pd-options-dropdown').classList.remove('active');
    document.getElementById('btn-options-toggle').classList.remove('active');
    
    if (closeProfile) {
        document.getElementById('profile-dropdown').classList.remove('active');
    }
}

// --- FILTER LOGIC (FIXED) ---
window.setFilter = function(type) {
    currentFilter = type;
    
    // Update UI Selection state in dropdown
    document.querySelectorAll('#pd-filter-dropdown .pd-menu-item').forEach(btn => {
        // Simple text check
        if(btn.innerText.includes(type) || (type === 'All' && btn.innerText.includes('Show All'))) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    render(); // Re-render list
    closeAllMenus(); // Close dropdown
};

// --- SEARCH LOGIC ---
window.handleSearch = function() {
    currentSearch = document.getElementById('search-input').value.trim().toLowerCase();
    render();
};

// --- DATA LOADING ---
window.refreshApp = async function(user) { appUser = user; await loadData(); };
window.refreshAppPage = function() { window.location.href = 'https://predent.net/#app'; window.location.reload(); };

async function loadData() {
    if (appUser) { entries = await window.db_loadEntries(appUser); } 
    else { entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    render();
}

async function saveData() {
    if (appUser) {
        let sTotal = 0, vTotal = 0;
        entries.forEach(e => { const h = parseInt(e.hours, 10) || 0; if (e.type === 'Shadowing') sTotal += h; else vTotal += h; });
        if(window.updateLeaderboardStats) { await window.updateLeaderboardStats(appUser, sTotal, vTotal); }
    } else { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
    updateDatalists();
}

// --- RENDER LOGIC (UPDATED FOR FILTERING) ---
function render() {
    updateDatalists();
    const list = document.getElementById('log-list-ul'); list.innerHTML = '';
    
    // Stats calculation (always based on ALL entries)
    let sTotal = 0, vTotal = 0; 
    entries.forEach(e => { const h = parseInt(e.hours, 10) || 0; if (e.type === 'Shadowing') sTotal += h; else vTotal += h; });
    updateCircleStats('ring-shadow', 'total-shadow', sTotal); 
    updateCircleStats('ring-volunteer', 'total-volunteer', vTotal);
    
    // Sort
    let displayEntries = entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply Filter
    if (currentFilter !== 'All') {
        displayEntries = displayEntries.filter(e => e.type === currentFilter);
    }
    
    // Apply Search
    if (currentSearch) {
        const term = currentSearch.toLowerCase();
        displayEntries = displayEntries.filter(e => 
            (e.doctor && e.doctor.toLowerCase().includes(term)) ||
            (e.location && e.location.toLowerCase().includes(term)) ||
            (e.notes && e.notes.toLowerCase().includes(term))
        );
    }
    
    // Update Badge UI
    const badge = document.getElementById('filter-badge');
    badge.style.display = currentFilter !== 'All' ? 'inline-block' : 'none';
    
    if(currentFilter === 'Volunteering') {
        badge.classList.add('volunteer');
        badge.innerText = "VOLUNTEERING";
    } else {
        badge.classList.remove('volunteer');
        badge.innerText = currentFilter.toUpperCase();
    }
    
    if (displayEntries.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:1rem;">No entries found.</div>';
    }
    
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

// --- HELPER: UPDATE DELETE BUTTON STATE ---
function updateDeleteButtonState() {
    const count = document.querySelectorAll('.pd-checkbox:checked').length;
    const btn = document.getElementById('btn-delete-selected');
    btn.disabled = count === 0;
    if (count > 0) btn.classList.add('active');
    else btn.classList.remove('active');
}

function setupHoursInput(id) {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('keydown', function(e) { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); });
    el.addEventListener('blur', function() { if (this.value) this.value = Math.round(parseFloat(this.value)); });
}

function updateDatalists() {
    const uniqueDocs = [...new Set(entries.map(e => e.doctor).filter(Boolean))].sort();
    const uniqueLocs = [...new Set(entries.map(e => e.location).filter(Boolean))].sort();
    const docList = document.getElementById('doc-suggestions');
    const locList = document.getElementById('loc-suggestions');
    if(docList) docList.innerHTML = uniqueDocs.map(d => `<option value="${d}">`).join('');
    if(locList) locList.innerHTML = uniqueLocs.map(l => `<option value="${l}">`).join('');
}

// --- ADD/EDIT/DELETE FUNCTIONS (UNCHANGED LOGIC) ---
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
        saveData(); render();
    } catch (e) { console.error("Error adding entry:", e); alert("Connection error."); }
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

// --- BOILERPLATE HELPERS ---
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
function openResetModal() { document.getElementById('reset-modal').style.display = 'flex'; }
function closeResetModal() { document.getElementById('reset-modal').style.display = 'none'; document.getElementById('reset-confirm-input').value = ''; }
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

// --- CSV (RESTORED) ---
window.triggerImport = function() { document.getElementById('import-file-input').click(); closeAllMenus(); };
window.handleCSVImport = function(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) { await processCSV(e.target.result); input.value = ''; };
    reader.readAsText(file);
};
async function processCSV(csvText) {
    const rows = csvText.match(/(?:[^\n"]+|"[^"]*")+/g); 
    if (!rows || rows.length < 2) { alert("CSV appears empty or unreadable."); return; }
    const headerRow = rows[0].toUpperCase();
    let isShadowingSheet = false, isVolunteeringSheet = false;
    if (headerRow.includes("SPECIALTY")) isShadowingSheet = true;
    else if (headerRow.includes("DENTAL RELATED") || headerRow.includes("ORGANIZATION")) isVolunteeringSheet = true;
    if (!isShadowingSheet && !isVolunteeringSheet) { alert("Could not identify sheet type."); return; }
    const dataLines = rows.slice(1);
    let importedCount = 0;
    for (let line of dataLines) {
        if (!line.trim()) continue; 
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, ''));
        const rawDate = cols[0]; if(!rawDate) continue;
        let formattedDate = rawDate;
        if(rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if(parts.length === 3) {
                const m = parts[0].padStart(2, '0'), d = parts[1].padStart(2, '0'); let y = parts[2];
                if (y.length === 2) y = '20' + y;
                formattedDate = `${y}-${m}-${d}`;
            }
        }
        let type, subtype, doctor, location;
        if (isShadowingSheet) { type = "Shadowing"; doctor = cols[1]; subtype = cols[2] || "General Dentistry"; location = cols[3]; } 
        else { type = "Volunteering"; doctor = cols[1]; location = cols[2]; const rawRel = (cols[3] || "").toLowerCase(); subtype = (rawRel.includes("yes") || rawRel.includes("true")) ? "Dental Related" : "Non-Dental Related"; }
        let hrs = Math.round(parseFloat(cols[4])); if(isNaN(hrs) || hrs <= 0) hrs = 0;
        const entry = { id: String(Date.now()) + Math.random().toString(16).slice(2), date: formattedDate, type, subtype, doctor: doctor || "Unknown", location: location || "Unknown", hours: hrs, notes: cols[5] || '' };
        if(entry.date && entry.hours > 0) { if (appUser) { await window.db_addEntry(appUser, entry); entries.push(entry); } else { entries.push(entry); } importedCount++; }
    }
    saveData(); render(); alert(`Successfully imported ${importedCount} entries.`);
}

window.openEditNameModal = function() {
    closeAllMenus();
    document.getElementById('edit-name-input').value = localStorage.getItem('pd_username') || '';
    document.getElementById('edit-name-modal').style.display = 'flex';
};
window.closeEditNameModal = function() { document.getElementById('edit-name-modal').style.display = 'none'; };
window.saveNewName = function() {
    const newName = document.getElementById('edit-name-input').value.trim();
    if (newName) {
        const lowerName = newName.toLowerCase();
        const hasProfanity = BLOCKED_WORDS.some(word => lowerName.includes(word));
        if (hasProfanity) { document.getElementById('warning-modal').style.display = 'flex'; document.getElementById('edit-name-modal').style.display = 'none'; return; }
        localStorage.setItem('pd_username', newName);
        document.getElementById('dropdown-name').textContent = newName;
        saveData(); 
    }
    closeEditNameModal();
};
