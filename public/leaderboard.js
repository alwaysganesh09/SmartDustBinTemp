// This script simulates fetching data from a backend API that connects to MongoDB.
// In a real application, you would replace this mock data with a real API call.

let usersData = [];
let currentSortBy = 'points'; // Default sort order

/**
 * Renders the leaderboard items on the page.
 */
function renderLeaderboard() {
    // Sort the data based on the currentSortBy variable
    usersData.sort((a, b) => {
        return (b[currentSortBy] || 0) - (a[currentSortBy] || 0);
    });

    const leaderboardGrid = document.getElementById('leaderboardGrid');
    if (!leaderboardGrid) {
        console.error('Leaderboard grid element not found!');
        return;
    }
    
    leaderboardGrid.innerHTML = ''; // Clear previous data

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
 * Fetches data from a mock API and then renders the leaderboard.
 * A real application would make a 'fetch' call to a backend here.
 */
function fetchAndRenderLeaderboard() {
    const leaderboardGrid = document.getElementById('leaderboardGrid');
    if (leaderboardGrid) {
        leaderboardGrid.innerHTML = '<p style="text-align:center; color: var(--neutral-500);">Loading leaderboard...</p>';
    }
    
    // Simulate an API call to a MongoDB-connected backend
    setTimeout(() => {
        // Mock data from a MongoDB collection
        const mockDbData = [
            { username: 'EcoChampion', points: 1250, scans: 25 },
            { username: 'GreenMachine', points: 980, scans: 20 },
            { username: 'RecycleHero', points: 750, scans: 18 },
            { username: 'PlanetSaver', points: 500, scans: 15 },
            { username: 'TrashTamer', points: 300, scans: 10 },
        ];
        
        usersData = mockDbData;
        renderLeaderboard();
    }, 1500); // Simulate a 1.5 second network delay
}

/**
 * Sets up event listeners for the sorting buttons.
 */
function setupEventListeners() {
    const sortButtons = document.querySelectorAll('.leaderboard-btn');
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            sortButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to the clicked button
            button.classList.add('active');

            // Update the sort criteria and re-render
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
