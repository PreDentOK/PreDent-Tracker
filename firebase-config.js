import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCz0-dUukvFHUG6DZR9hGdgduUzTcobt0M",
    authDomain: "dental-tracker-b6242.firebaseapp.com",
    projectId: "dental-tracker-b6242",
    storageBucket: "dental-tracker-b6242.firebasestorage.app",
    messagingSenderId: "418391581928",
    appId: "1:418391581928:web:30fa024c3b71a9858ad55d",
    measurementId: "G-5BFYNLJ8QQ"
};

let db, auth, currentUser;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            // Check if we have a saved display name override, if not use Google Name
            const savedName = localStorage.getItem('pd_username');
            if(!savedName && user.displayName) {
                localStorage.setItem('pd_username', user.displayName);
            }
            window.syncToCloud();
        }
        window.fetchLeaderboard();
    });

} catch(e) { console.error("Firebase Init Error", e); }

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
        
        // Logged In: Show Profile Edit Box & Leaderboard
        if(signinPromo) signinPromo.style.display = 'none';
        if(lbProfileBox) lbProfileBox.classList.remove('pd-hidden');
        if(lbMain) lbMain.classList.remove('pd-hidden');
    } else {
        loginBtn.classList.remove('hidden');
        profileSection.classList.add('hidden');
        
        // Logged Out: Show Promo, HIDE Profile Edit Box & Leaderboard
        if(signinPromo) signinPromo.style.display = 'block';
        if(lbProfileBox) lbProfileBox.classList.add('pd-hidden');
        if(lbMain) lbMain.classList.add('pd-hidden');
    }
}

window.syncToCloud = async function() {
    if(!db || !currentUser) return;
    const entries = JSON.parse(localStorage.getItem('pd_tracker_data_v2')) || [];
    let sTotal = 0, vTotal = 0;
    entries.forEach(e => {
        if(e.type === 'Shadowing') sTotal += parseInt(e.hours);
        else vTotal += parseInt(e.hours);
    });

    const displayName = localStorage.getItem('pd_username') || currentUser.displayName;
    
    if(displayName) {
        try {
            const userRef = doc(db, 'leaderboard', currentUser.uid);
            await setDoc(userRef, {
                name: displayName,
                shadow: sTotal,
                vol: vTotal,
                total: sTotal + vTotal,
                photo: currentUser.photoURL
            }, { merge: true });
            window.fetchLeaderboard();
        } catch(e) { console.error("Sync error:", e); }
    }
};

window.fetchLeaderboard = async function() {
    if(!db) return;
    const list = document.getElementById('leaderboard-list');
    const badge = document.getElementById('nav-rank-badge');
    const lbRef = collection(db, 'leaderboard');
    
    try {
        const snapshot = await getDocs(lbRef);
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        users.sort((a,b) => b.total - a.total);
        
        list.innerHTML = '';
        if(users.length === 0) { 
            list.innerHTML = '<div style="padding:2rem; text-align:center;">No students yet. Be the first!</div>'; 
            if(badge) badge.classList.add('hidden');
            return; 
        }

        const myName = localStorage.getItem('pd_username') || (currentUser ? currentUser.displayName : '');
        let myRank = null;

        users.forEach((u, i) => {
            const rank = i + 1;
            let rankClass = '';
            if(rank === 1) rankClass = 'rank-1';
            else if(rank === 2) rankClass = 'rank-2';
            else if(rank === 3) rankClass = 'rank-3';
            
            const isMe = (currentUser && u.name === myName);
            if(isMe) myRank = rank;

            const html = `
                <div class="pd-lb-item ${isMe ? 'current-user' : ''}">
                    <div class="pd-lb-name"><span class="pd-rank-badge ${rankClass}">${rank}</span>${isMe ? '<strong>YOU</strong>' : u.name}</div>
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
