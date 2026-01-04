import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCz0-dUukvFHUG6DZR9hGdgduUzTcobt0M",
  authDomain: "dental-tracker-b6242.firebaseapp.com",
  projectId: "dental-tracker-b6242",
  storageBucket: "dental-tracker-b6242.firebasestorage.app",
  messagingSenderId: "418391581928",
  appId: "1:418391581928:web:30fa024c3b71a9858ad55d",
  measurementId: "G-5BFYNLJ8QQ"
};

let db, auth, currentUser, analytics;

try {
    const app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app); 
    db = getFirestore(app);
    auth = getAuth(app);
    
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            onAuthStateChanged(auth, async (user) => {
                currentUser = user;
                updateAuthUI(user);
                
                if (window.refreshApp) window.refreshApp(user);

                if (user) {
                    await migrateLocalToCloud(user);
                    const savedName = localStorage.getItem('pd_username');
                    if(!savedName && user.displayName) {
                        localStorage.setItem('pd_username', user.displayName);
                    }
                    window.syncToCloud(); 
                }
                window.fetchLeaderboard();
            });
        })
        .catch((error) => {
            console.error("Auth Persistence Error:", error);
        });

} catch(e) { console.error("Firebase Init Error", e); }

// --- DATABASE HELPERS ---

window.db_loadEntries = async function(user) {
    if(!user || !db) return [];
    try {
        const colRef = collection(db, 'users', user.uid, 'entries');
        const snapshot = await getDocs(colRef);
        const data = [];
        snapshot.forEach(doc => data.push(doc.data()));
        return data;
    } catch(e) {
        console.error("Error loading entries:", e);
        return [];
    }
};

window.db_addEntry = async function(user, entry) {
    if(!user || !db) return;
    const ref = doc(db, 'users', user.uid, 'entries', entry.id);
    await setDoc(ref, entry);
};

window.db_deleteEntry = async function(user, entryId) {
    if(!user || !db) return;
    const ref = doc(db, 'users', user.uid, 'entries', entryId);
    await deleteDoc(ref);
};

// RESTORED: Batch delete for checkboxes
window.db_batchDelete = async function(user, entryIds) {
    if(!user || !db || entryIds.length === 0) return;
    const batch = writeBatch(db);
    entryIds.forEach(id => {
        const ref = doc(db, 'users', user.uid, 'entries', id);
        batch.delete(ref);
    });
    await batch.commit();
};

// RESTORED: Wipe all entries logic
window.db_wipeAllEntries = async function(user) {
    if(!user || !db) return;
    try {
        const colRef = collection(db, 'users', user.uid, 'entries');
        const snapshot = await getDocs(colRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        // Reset Leaderboard
        const lbRef = doc(db, 'leaderboard', user.uid);
        batch.set(lbRef, {
            shadow: 0,
            vol: 0,
            total: 0
        }, { merge: true });

        await batch.commit();
    } catch (e) {
        console.error("Wipe Error:", e);
        throw e; 
    }
};

window.updateLeaderboardStats = async function(user, shadowTotal, volTotal) {
    if(!user || !db) return;
    try {
        const displayName = localStorage.getItem('pd_username') || user.displayName;
        const userRef = doc(db, 'leaderboard', user.uid);
        
        await setDoc(userRef, {
            name: displayName,
            shadow: shadowTotal,
            vol: volTotal,
            total: shadowTotal + volTotal,
            photo: user.photoURL,
            uid: user.uid
        }, { merge: true });
        
        window.fetchLeaderboard();
    } catch(e) { console.error("LB Update Error", e); }
};

async function migrateLocalToCloud(user) {
    const local = JSON.parse(localStorage.getItem('pd_tracker_data_v2')) || [];
    if (local.length > 0 && db) {
        const batch = writeBatch(db);
        local.forEach(entry => {
            const ref = doc(db, 'users', user.uid, 'entries', entry.id);
            batch.set(ref, entry);
        });
        await batch.commit();
        localStorage.removeItem('pd_tracker_data_v2'); 
    }
}

// --- AUTH ---
window.googleLogin = async function() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Failed", error);
        alert("Sign in failed. Please try again.");
    }
};

window.googleLogout = async function() {
    try {
        await signOut(auth);
        document.getElementById('profile-dropdown').classList.remove('active');
        localStorage.removeItem('pd_username'); 
        window.location.reload(); 
    } catch (error) {
        console.error("Logout Failed", error);
    }
};

function updateAuthUI(user) {
    const loginBtn = document.getElementById('btn-google-login');
    const profileSection = document.getElementById('user-profile');
    const signinPromo = document.getElementById('signin-promo');
    const lbProfileBox = document.getElementById('lb-profile-box');
    const lbMain = document.getElementById('lb-card-main');

    if (user) {
        loginBtn.classList.add('hidden');
        profileSection.classList.remove('hidden');
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/36';
        document.getElementById('dropdown-name').textContent = user.displayName || 'User';
        
        if(signinPromo) signinPromo.style.display = 'none';
        
        const isSetupDone = localStorage.getItem('pd_profile_setup_done') === 'true';
        if (!isSetupDone) {
            if(lbProfileBox) lbProfileBox.classList.remove('pd-hidden');
        } else {
            if(lbProfileBox) lbProfileBox.classList.add('pd-hidden');
        }
        if(lbMain) lbMain.classList.remove('pd-hidden');
    } else {
        loginBtn.classList.remove('hidden');
        profileSection.classList.add('hidden');
        if(signinPromo) signinPromo.style.display = 'block';
        if(lbProfileBox) lbProfileBox.classList.add('pd-hidden');
        if(lbMain) lbMain.classList.add('pd-hidden');
    }
}

// --- LEADERBOARD SYNC ---
window.syncToCloud = async function() {
    if(!db || !currentUser) return;
    
    const entries = await window.db_loadEntries(currentUser);
    
    let sTotal = 0, vTotal = 0;
    entries.forEach(e => {
        if(e.type === 'Shadowing') sTotal += parseInt(e.hours);
        else vTotal += parseInt(e.hours);
    });

    window.updateLeaderboardStats(currentUser, sTotal, vTotal);
};

window.fetchLeaderboard = async function() {
    if(!db) return;
    const list = document.getElementById('leaderboard-list');
    const badge = document.getElementById('nav-rank-badge');
    const lbRef = collection(db, 'leaderboard');
    
    try {
        const snapshot = await getDocs(lbRef);
        const users = [];
        snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        users.sort((a,b) => b.total - a.total);
        
        list.innerHTML = '';
        if(users.length === 0) { 
            list.innerHTML = '<div style="padding:2rem; text-align:center;">No students yet. Be the first!</div>'; 
            if(badge) badge.classList.add('hidden');
            return; 
        }

        let myRank = null;

        users.forEach((u, i) => {
            const rank = i + 1;
            let rankClass = '';
            if(rank === 1) rankClass = 'rank-1';
            else if(rank === 2) rankClass = 'rank-2';
            else if(rank === 3) rankClass = 'rank-3';
            
            const isMe = (currentUser && u.id === currentUser.uid);
            if(isMe) myRank = rank;

            const html = `
                <div class="pd-lb-item ${isMe ? 'current-user' : ''}">
                    <div class="pd-rank-badge ${rankClass}">${rank}</div>
                    <div class="pd-lb-name">${isMe ? '<strong>YOU</strong>' : u.name}</div>
                    <div class="pd-lb-stat">${u.shadow} <span>hrs</span></div>
                    <div class="pd-lb-stat">${u.vol} <span>hrs</span></div>
                </div>`;
            list.insertAdjacentHTML('beforeend', html);
        });

        if (myRank && badge) {
            badge.innerText = `Rank: #${myRank}`;
            badge.classList.remove('hidden');
        } else if (badge) {
            badge.classList.add('hidden');
        }

    } catch(e) { console.error("Fetch LB error:", e); }
};
