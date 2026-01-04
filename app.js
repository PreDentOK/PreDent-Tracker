// --- MAIN APP LOGIC ---
const STORAGE_KEY = 'pd_tracker_data_v2'; 
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentFilter = 'All';
let editingEntryId = null;

const CIRCLE_RADIUS = 110; 
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const SUBTYPES_SHADOW = ["General Dentistry", "Orthodontics", "Pediatric Dentistry", "Oral Surgery", "Endodontics", "Periodontics", "Prosthodontics", "Dental Public Health", "Other"];
const SUBTYPES_VOLUNTEER = ["Dental Related", "Non-Dental Related"];

// Basic filter list (expand as needed)
const BLOCKED_WORDS = ["damn", "hell", "crap", "suck", "sexy", "hot", "xxx", "stupid", "idiot", "ass", "bitch", "shit", "fuck", "dick", "cock", "pussy"];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("year").textContent = new Date().getFullYear();
    const savedName = localStorage.getItem('pd_username');
    if(savedName) document.getElementById('user-display-name').value = savedName;

    document.querySelectorAll('.pd-progress-ring__circle').forEach(circle => {
        circle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
        circle.style.strokeDashoffset = CIRCUMFERENCE;
    });

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entry-date').value = today;

    let needsSave = false;
    entries = entries.map(e => {
        if (!e.id) { e.id = String(Date.now()) + Math.random().toString(16).slice(2); needsSave = true; }
        else { e.id = String(e.id); }
        if (!e.subtype) { e.subtype = e.type === 'Shadowing' ? 'General Dentistry' : 'Dental Related'; needsSave = true; }
        return e;
    });
    if(needsSave) save();

    document.getElementById('entry-type').addEventListener('change', handleTypeChange);
    
    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pd-menu-btn') && !e.target.closest('.pd-user-profile')) {
            closeAllMenus();
        }
    });

    window.toggleFilterMenu = (e) => { 
        e.stopPropagation(); 
        const btn = document.getElementById('btn-filter-toggle');
        const menu = document.getElementById('pd-filter-dropdown');
        
        // Close others
        document.getElementById('pd-options-dropdown').classList.remove('active');
        document.getElementById('btn-options-toggle').classList.remove('active');
        
        // Toggle current
        menu.classList.toggle('active');
        btn.classList.toggle('active');
    };

    window.toggleOptionsMenu = (e) => { 
        e.stopPropagation(); 
        const btn = document.getElementById('btn-options-toggle');
        const menu = document.getElementById('pd-options-dropdown');
        
        // Close others
        document.getElementById('pd-filter-dropdown').classList.remove('active');
        document.getElementById('btn-filter-toggle').classList.remove('active');
        
        // Toggle current
        menu.classList.toggle('active');
        btn.classList.toggle('active');
    };

    window.setFilter = setFilter;
    window.openResetModal = openResetModal;
    window.closeResetModal = closeResetModal;
    window.checkResetInput = checkResetInput;
    window.confirmReset = confirmReset;
    window.addEntry = addEntry;
    window.exportData = exportData;
    window.deleteEntry = deleteEntry; 
    window.editEntry = editEntry;
    window.cancelEdit = cancelEdit;
    window.switchTab = switchTab;
    window.updateProfileName = updateProfileName;
    window.skipProfileSetup = skipProfileSetup; // Export Skip function

    handleTypeChange(); 
    render();
});

function closeAllMenus() {
    document.getElementById('pd-filter-dropdown').classList.remove('active');
    document.getElementById('btn-filter-toggle').classList.remove('active');
    
    document.getElementById('pd-options-dropdown').classList.remove('active');
    document.getElementById('btn-options-toggle').classList.remove('active');
    
    const profDrop = document.getElementById('profile-dropdown');
    if(profDrop) profDrop.classList.remove('active');
}

// Helper for auth menu
window.toggleProfileMenu = function() {
    document.getElementById('profile-dropdown').classList.toggle('active');
};

function skipProfileSetup() {
    // Mark setup as done forever
    localStorage.setItem('pd_profile_setup_done', 'true');
    // Hide the box
    document.getElementById('lb-profile-box').classList.add('pd-hidden');
}

function updateProfileName() {
    const nameInput = document.getElementById('user-display-name');
    const name = nameInput.value.trim();
    
    if(!name) return;

    // PROFANITY FILTER CHECK
    const lowerName = name.toLowerCase();
    const hasProfanity = BLOCKED_WORDS.some(word => lowerName.includes(word));

    if (hasProfanity) {
        document.getElementById('warning-modal').style.display = 'flex';
        nameInput.value = ''; // Clear the input
        return;
    }

    localStorage.setItem('pd_username', name);
    // Force a re-render of the auth UI to update the name in the dropdown immediately
    const dropdownName = document.getElementById('dropdown-name');
    if(dropdownName) dropdownName.textContent = name;

    // Mark setup as done forever since they updated it
    localStorage.setItem('pd_profile_setup_done', 'true');
    document.getElementById('lb-profile-box').classList.add('pd-hidden');
    
    if(window.syncToCloud) window.syncToCloud();
}

function switchTab(tabName) {
    document.querySelectorAll('.pd-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.pd-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${tabName}`).classList.add('active');
    const btns = document.querySelectorAll('.pd-tab-btn');
    if(tabName === 'tracker') {
        btns[0].classList.add('active'); document.getElementById('logo-suffix').innerText = 'TRACKER'; document.getElementById('pd-filter-container').classList.remove('pd-hidden');
    } else if (tabName === 'stats') {
        btns[1].classList.add('active'); document.getElementById('logo-suffix').innerText = 'STATS'; calculateTrends(); document.getElementById('pd-filter-container').classList.add('pd-hidden');
    } else {
        btns[2].classList.add('active'); document.getElementById('logo-suffix').innerText = 'RANKING'; document.getElementById('pd-filter-container').classList.add('pd-hidden');
    }
}

function handleTypeChange() {
    const mainType = document.getElementById('entry-type').value;
    const subSelect = document.getElementById('entry-subtype');
    const docInput = document.getElementById('entry-doctor');
    subSelect.innerHTML = '';
    const options = mainType === 'Shadowing' ? SUBTYPES_SHADOW : SUBTYPES_VOLUNTEER;
    options.forEach(opt => { const el = document.createElement('option'); el.value = opt; el.textContent = opt; subSelect.appendChild(el); });
    
    docInput.placeholder = mainType === 'Shadowing' ? "Doctor(s)" : "Organization / Supervisor";
}

function addEntry() {
    document.querySelectorAll('.pd-input-wrapper').forEach(el => el.classList.remove('error'));
    const type = document.getElementById('entry-type').value;
    const subtype = document.getElementById('entry-subtype').value;
    const date = document.getElementById('entry-date').value;
    const loc = document.getElementById('entry-loc').value.trim();
    const doctor = document.getElementById('entry-doctor').value.trim();
    let hoursInput = document.getElementById('entry-hours').value;
    const notes = document.getElementById('entry-notes').value;
    let hasError = false;
    if (!date) { document.getElementById('entry-date').parentNode.classList.add('error'); hasError = true; }
    if (!hoursInput) { document.getElementById('entry-hours').parentNode.classList.add('error'); hasError = true; }
    if (!loc) { document.getElementById('entry-loc').parentNode.classList.add('error'); hasError = true; }
    if (!doctor) { document.getElementById('entry-doctor').parentNode.classList.add('error'); hasError = true; }
    if (hasError) return;
    let hours = Math.round(parseFloat(hoursInput)) || 1;
    if (editingEntryId) { const index = entries.findIndex(e => e.id === editingEntryId); if (index !== -1) entries[index] = { ...entries[index], type, subtype, date, location: loc, doctor, hours, notes }; cancelEdit(); }
    else { entries.push({ id: String(Date.now()), type, subtype, date, location: loc, doctor, hours, notes }); document.getElementById('entry-loc').value = ''; document.getElementById('entry-doctor').value = ''; document.getElementById('entry-hours').value = ''; document.getElementById('entry-notes').value = ''; }
    save(); render(); if(window.syncToCloud) window.syncToCloud();
}

function editEntry(id) {
    const entry = entries.find(e => e.id === String(id)); if (!entry) return;
    document.getElementById('entry-type').value = entry.type; handleTypeChange(); 
    document.getElementById('entry-subtype').value = entry.subtype;
    document.getElementById('entry-date').value = entry.date;
    document.getElementById('entry-hours').value = entry.hours;
    document.getElementById('entry-doctor').value = entry.doctor || '';
    document.getElementById('entry-loc').value = entry.location;
    document.getElementById('entry-notes').value = entry.notes || '';
    editingEntryId = String(id);
    document.getElementById('btn-add-entry').textContent = "UPDATE ENTRY";
    document.getElementById('btn-cancel-edit').style.display = "block";
    document.querySelector('.pd-form-header').textContent = "Editing Entry";
    document.querySelector('.pd-form-card').scrollIntoView({behavior: 'smooth'});
}

function cancelEdit() {
    editingEntryId = null; document.getElementById('btn-add-entry').textContent = "+ Add Entry"; document.getElementById('btn-cancel-edit').style.display = "none";
    document.querySelector('.pd-form-header').textContent = "Log New Hours";
    document.getElementById('entry-loc').value = ''; document.getElementById('entry-doctor').value = ''; document.getElementById('entry-hours').value = ''; document.getElementById('entry-notes').value = ''; document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
}

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
        const li = document.createElement('li'); li.className = 'swipeout';
        li.innerHTML = `<div class="swipeout-actions-right"><a href="#" class="swipeout-btn swipeout-edit" onclick="editEntry('${entry.id}'); return false;"><svg class="pd-action-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></a><a href="#" class="swipeout-btn swipeout-delete" onclick="deleteEntry('${entry.id}'); return false;"><svg class="pd-action-icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></a></div><div class="swipeout-content ${typeClass}" id="card-${entry.id}"><div class="pd-log-info"><h4>${entry.doctor||entry.location} <span style="font-weight:400; opacity:0.7; font-size:0.9em;">(${entry.subtype})</span></h4><div class="pd-log-meta">${entry.location} • ${displayDate}</div></div><div class="pd-log-hours">${entry.hours} hrs</div></div>`;
        list.appendChild(li); attachSwipeEvents(li.querySelector('.swipeout-content'), entry.id);
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

function attachSwipeEvents(element, id) {
    let startX, currentX, isSwiping = false;
    element.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isSwiping = true; element.style.transition = 'none'; }, {passive: true});
    element.addEventListener('touchmove', (e) => { if(!isSwiping) return; currentX = e.touches[0].clientX; let diff = currentX - startX; if(diff < 0) { if(diff < -140) diff = -140; element.style.transform = `translateX(${diff}px)`; } }, {passive: true});
    element.addEventListener('touchend', (e) => { isSwiping = false; element.style.transition = 'transform 0.3s ease-out'; let diff = currentX - startX; if (diff < -70) element.style.transform = 'translateX(-140px)'; else element.style.transform = 'translateX(0)'; });
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
}

function deleteEntry(id) { entries = entries.filter(e => e.id !== String(id)); save(); render(); if(window.syncToCloud) window.syncToCloud(); }
function openResetModal() { document.getElementById('reset-modal').style.display = 'flex'; }
function closeResetModal() { document.getElementById('reset-modal').style.display = 'none'; document.getElementById('reset-confirm-input').value = ''; }
function checkResetInput() { document.getElementById('reset-confirm-btn').disabled = (document.getElementById('reset-confirm-input').value !== 'DELETE'); }
function confirmReset() { entries = []; save(); render(); closeResetModal(); if(window.syncToCloud) window.syncToCloud(); }

function exportData() {
    if(entries.length === 0) { alert("No data to export!"); return; }
    let csv = "Date,Activity Type,Subtype,Doctor/Supervisor,Location,Hours,Notes\n";
    entries.forEach(e => { const sl = `"${e.location.replace(/"/g, '""')}"`; const sd = `"${(e.doctor || '').replace(/"/g, '""')}"`; const sn = `"${(e.notes || '').replace(/"/g, '""')}"`; csv += `${e.date},"${e.type}","${e.subtype}",${sd},${sl},${e.hours},${sn}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'PreDent_Activity_Log.csv'; a.click();
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
