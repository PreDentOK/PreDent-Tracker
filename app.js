// Add this helper near the top of app.js logic
window.toggleProfileMenu = function() {
    document.getElementById('profile-dropdown').classList.toggle('active');
};

// Also close profile menu when clicking outside (modify the existing click listener)
document.addEventListener('click', (e) => {
    if (!e.target.closest('.pd-menu-btn') && !e.target.closest('.pd-user-profile')) {
        document.getElementById('pd-filter-dropdown').classList.remove('active');
        document.getElementById('pd-options-dropdown').classList.remove('active');
        const profDrop = document.getElementById('profile-dropdown');
        if(profDrop) profDrop.classList.remove('active');
    }
});
