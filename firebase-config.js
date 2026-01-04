import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
    
    signInAnonymously(auth).then((userCredential) => {
        currentUser = userCredential.user;
        if(window.syncToCloud) window.syncToCloud();
        if(window.fetchLeaderboard) window.fetchLeaderboard();
    }).catch((e) => console.error("Auth Failed", e));

} catch(e) { console.error("Firebase Init Error", e); }

window.syncToCloud = async function() {
    if(!db || !currentUser) return;
    const entries = JSON.parse(localStorage.getItem('pd_tracker_data_v2')) || [];
    let sTotal = 0, vTotal = 0;
    entries.forEach(e => {
        if(e.type === 'Shadowing') sTotal += parseInt(e.hours);
        else vTotal += parseInt(e.hours);
    });

    const displayName = localStorage.getItem('pd_username');
    if(displayName) {
        try {
            const userRef = doc(db, 'leaderboard', currentUser.uid);
            await setDoc(userRef, {
                name: displayName,
                shadow: sTotal,
                vol: vTotal,
                total: sTotal + vTotal
            });
            window.fetchLeaderboard();
        } catch(e) { console.error("Sync error:", e); }
    }
};

window.fetchLeaderboard = async function() {
    if(!db) return;
    const list = document.getElementById('leaderboard-list');
    const lbRef = collection(db, 'leaderboard');
    try {
        const snapshot = await getDocs(lbRef);
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        users.sort((a,b) => b.total - a.total);
        
        list.innerHTML = '';
        if(users.length === 0) { list.innerHTML = '<div style="padding:2rem; text-align:center;">No students yet. Be the first!</div>'; return; }

        users.forEach((u, i) => {
            const rank = i + 1;
            let rankClass = '';
            if(rank === 1) rankClass = 'rank-1';
            else if(rank === 2) rankClass = 'rank-2';
            else if(rank === 3) rankClass = 'rank-3';
            
            const myName = localStorage.getItem('pd_username');
            const isMe = u.name === myName;
            const html = `
                <div class="pd-lb-item ${isMe ? 'current-user' : ''}">
                    <div class="pd-lb-name"><span class="pd-rank-badge ${rankClass}">${rank}</span>${isMe ? '<strong>YOU</strong>' : u.name}</div>
                    <div class="pd-lb-stat">${u.shadow} <span>hrs</span></div>
                    <div class="pd-lb-stat">${u.vol} <span>hrs</span></div>
                </div>`;
            list.insertAdjacentHTML('beforeend', html);
        });
    } catch(e) { console.error("Fetch LB error:", e); }
};