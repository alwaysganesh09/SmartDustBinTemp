// leaderboard.js
let usersData = [];
let currentSortBy = 'points'; // Default sort order

/**
 * Renders the leaderboard items on the page.
 */
function renderLeaderboard() {
    usersData.sort((a, b) => {
        return (b[currentSortBy] || 0) - (a[currentSortBy] || 0);
    });

    const leaderboardGrid = document.getElementById('leaderboardGrid');
    if (!leaderboardGrid) {
        console.error('Leaderboard grid element not found!');
        return;
    }
    
    leaderboardGrid.innerHTML = '';

    if (usersData.length === 0) {
        leaderboardGrid.innerHTML = '<p style="text-align:center; color: var(--neutral-500);">No users on the leaderboard yet.</p>';
        return;
    }

    usersData.forEach((user, index) => {
        const userElement = document.createElement('div');
        userElement.classList.add('leaderboard-item');

        const userScore = user[currentSortBy] || 0;
        const scoreLabel = currentSortBy === 'points' ? 'Points' : 'Scans';
        const scoreIcon = currentSortBy === 'points' ? '<i class="fas fa-coins"></i>' : '<i class="fas fa-qrcode"></i>';

        userElement.innerHTML = `
            <span class="leaderboard-rank">${index + 1}</span>
            <div class="leaderboard-info">
                <div class="leaderboard-avatar">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
                <div class="leaderboard-name">${user.username || 'Anonymous'}</div>
            </div>
            <div class="leaderboard-score">
                ${scoreIcon} ${userScore} ${scoreLabel}
            </div>
        `;
        leaderboardGrid.appendChild(userElement);
    });
}

/**
 * Fetches data from the backend API and then renders the leaderboard.
 */
async function fetchAndRenderLeaderboard() {
    const leaderboardGrid = document.getElementById('leaderboardGrid');
    if (leaderboardGrid) {
        leaderboardGrid.innerHTML = '<p style="text-align:center; color: var(--neutral-500);">Loading leaderboard...</p>';
    }

    try {
        const response = await fetch(`/api/leaderboard/top`);
        
        if (response.ok) {
            const data = await response.json();
            usersData = data;
            renderLeaderboard();
        } else {
            const errorData = await response.json();
            leaderboardGrid.innerHTML = `<p style="text-align:center; color: red;">Error loading leaderboard: ${errorData.message}</p>`;
            console.error("Failed to fetch leaderboard:", errorData.message);
        }
    } catch (error) {
        leaderboardGrid.innerHTML = '<p style="text-align:center; color: red;">An unexpected error occurred. Please check your network connection.</p>';
        console.error("Network error fetching leaderboard:", error);
    }
}

/**
 * Sets up event listeners for the sorting buttons.
 */
function setupEventListeners() {
    const sortButtons = document.querySelectorAll('.leaderboard-btn');
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            sortButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentSortBy = button.dataset.sort;
            renderLeaderboard();
        });
    });
}

// Start the app when the window loads
window.onload = function() {
    fetchAndRenderLeaderboard();
    setupEventListeners();
};
