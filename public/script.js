// --- Global Variables ---
const API_URL = 'https://smartdustbin-ten.vercel.app/api';
let currentUserProfile = null;
let html5QrCodeScanner = null;
let isScannerActive = false;
let redeemTimerInterval = null;
const EXPECTED_FRAME_QR_CONTENT = 'https://qrco.de/bgBWbc';

const defaultCoupons = [
    { id: 'coupon1', name: '10% Off at Green Mart', points: 100 },
    { id: 'coupon2', name: 'Free Coffee at EcoCafe', points: 50 },
    { id: 'coupon3', name: '20% Off Recycled Clothing', points: 200 },
    { id: 'coupon4', name: 'Free Plant Seedling', points: 75 },
    { id: 'coupon5', name: '15% Off Solar Gadgets', points: 150 },
    { id: 'coupon6', name: 'Free Eco-Bag', points: 30 },
];

// --- UI Element References ---
const authModal = document.getElementById('authModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const passwordResetModal = document.getElementById('passwordResetModal'); // Ensure you have a modal with this ID

// --- Core App Initialization ---
async function initApp() {
    console.log("Smart Dust Bin App Initializing with Node/MongoDB backend...");
    setupEventListeners();
    handlePasswordResetRouting(); // Handle incoming password reset links
    await checkLoginState();
    showPage('dashboard');
}

function setupEventListeners() {
    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
    document.getElementById('passwordResetForm')?.addEventListener('submit', handlePasswordReset);
}

// NEW: This function checks if the user arrived from a reset link
function handlePasswordResetRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    // If a reset token is in the URL, show the reset password modal
    if (token) {
        authModal.style.display = 'none';
        forgotPasswordModal.style.display = 'none';
        passwordResetModal.style.display = 'flex';
        // Clear the token from URL to avoid it being bookmarked
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function checkLoginState() {
    const token = localStorage.getItem('authToken');
    if (token) {
        await loadUserProfile(token);
    } else if (!passwordResetModal || passwordResetModal.style.display !== 'flex') {
        // Only show login modal if not in the middle of a password reset
        updateUIForGuest();
        authModal.style.display = 'flex';
    }
}

// --- API Helper ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const config = {
        method,
        headers,
    };
    if (body) {
        config.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Something went wrong');
        }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        showToast(error.message || 'An API error occurred', 'error');
        throw error;
    }
}


// --- Auth Functions ---
async function handleRegister(event) {
    event.preventDefault();
    showLoading();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    try {
        const data = await apiRequest('/auth/register', 'POST', { username, email, password });
        showToast(data.message, 'success');
        switchTab('login');
    } catch (error) {
        // Error toast is handled by apiRequest
    } finally {
        hideLoading();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    showLoading();
    const email = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const data = await apiRequest('/auth/login', 'POST', { email, password });
        localStorage.setItem('authToken', data.token);
        await loadUserProfile(data.token);
    } catch (error) {
        // Error toast is handled by apiRequest
    } finally {
        hideLoading();
    }
}

async function logout() {
    localStorage.removeItem('authToken');
    currentUserProfile = null;
    updateUIForGuest();
    authModal.style.display = 'flex';
    showPage('dashboard');
    window.location.hash = '';
}

async function loadUserProfile(token) {
    if (!token) return;
    showLoading('Loading your profile...');
    try {
        const data = await apiRequest('/user/profile', 'GET');
        currentUserProfile = data.user;
        await updateUI(data.history);
        authModal.style.display = 'none';
        forgotPasswordModal.style.display = 'none';
        passwordResetModal.style.display = 'none';
        showPage('dashboard');
    } catch (error) {
        logout();
    } finally {
        hideLoading();
    }
}

// --- MODIFIED: Forgot Password Implementation ---
async function handleForgotPassword(event) {
    event.preventDefault();
    showLoading('Sending reset link...');
    const email = document.getElementById('forgotPasswordEmail').value; // Ensure input has this ID
    try {
        // This calls your new backend endpoint
        const data = await apiRequest('/auth/forgot-password', 'POST', { email });
        showToast(data.message, 'success'); // Success message from your API
        hideForgotPasswordModal();
    } catch (error) {
        // Error (e.g., "Email not found") is handled by apiRequest
    } finally {
        hideLoading();
    }
}

// --- MODIFIED: Password Reset Implementation ---
async function handlePasswordReset(event) {
    event.preventDefault();
    showLoading('Resetting password...');

    // 1. Get token from URL (handled by handlePasswordResetRouting on load)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // 2. Get new passwords from the form
    const password = document.getElementById('resetPassword').value; // Ensure input has this ID
    const confirmPassword = document.getElementById('resetConfirmPassword').value; // Ensure input has this ID

    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        hideLoading();
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        hideLoading();
        return;
    }

    try {
        // 3. Call the new backend endpoint with token and new password
        const data = await apiRequest('/auth/reset-password', 'POST', { token, password });
        showToast(data.message, 'success'); // e.g., "Password reset successfully!"

        // 4. Hide reset modal and show the login modal
        passwordResetModal.style.display = 'none';
        authModal.style.display = 'flex';
        switchTab('login');

    } catch (error) {
        // Error (e.g., "Invalid or expired token") is handled by apiRequest
    } finally {
        hideLoading();
    }
}

// --- UI Update & Rendering (Unchanged) ---
async function updateUI(history = null) {
    if (!currentUserProfile) return updateUIForGuest();
    if (!history) {
        try {
            const data = await apiRequest('/user/profile', 'GET');
            currentUserProfile = data.user;
            history = data.history;
        } catch (err) {
            return;
        }
    }
    document.getElementById('userName').innerText = currentUserProfile.username;
    document.getElementById('userPoints').innerText = currentUserProfile.points;
    document.getElementById('totalPoints').innerText = currentUserProfile.points;
    document.getElementById('totalScans').innerText = history.filter(item => item.action === 'qr_scan').length;
    document.getElementById('totalRedeemed').innerText = history.filter(item => item.action === 'coupon_redeem').length;
    renderRecentActivity(history);
    renderPointsHistory(history);
}

// --- Core Features (Unchanged) ---
async function handleQRScan(decodedText) {
    if (!isScannerActive || !currentUserProfile) return;
    await stopScanner();
    showLoading();
    try {
        const data = await apiRequest('/user/scan', 'POST', { qrCode: decodedText });
        currentUserProfile.points = data.points;
        showToast(data.message, "success");
        await updateUI();
    } catch (error) {
        // Error toast handled by apiRequest
    } finally {
        hideLoading();
    }
}

async function redeemCoupon(couponId, pointsRequired) {
    if (!currentUserProfile || currentUserProfile.points < pointsRequired) return;
    showLoading();
    const coupon = defaultCoupons.find(c => c.id === couponId);
    try {
        const data = await apiRequest('/user/redeem', 'POST', {
            couponId,
            pointsRequired,
            couponName: coupon.name,
        });
        currentUserProfile.points = data.points;
        await updateUI();
        loadCoupons();
        document.getElementById('redeemedCouponName').textContent = coupon.name;
        document.getElementById('redeemCodeDisplay').textContent = generateRedeemCode();
        document.getElementById('redeemCodeModal').style.display = 'flex';
        startRedeemTimer();
    } catch (error) {
        // Error toast handled by apiRequest
    } finally {
        hideLoading();
    }
}

// --- Helper Functions (Mostly Unchanged) ---
function updateUIForGuest() {
    document.getElementById('userName').innerText = 'Guest';
    ['userPoints', 'totalPoints', 'totalScans', 'totalRedeemed'].forEach(id => document.getElementById(id).innerText = '0');
    document.getElementById('recentActivity').innerHTML = '<p class="activity-item">Please log in to see your activity.</p>';
    document.getElementById('pointsHistory').innerHTML = '<p class="history-item">Please log in to see your history.</p>';
}

function renderRecentActivity(historyData) {
    const recentActivityDiv = document.getElementById('recentActivity');
    recentActivityDiv.innerHTML = '';
    const recentItems = historyData.slice(0, 5);
    if (recentItems.length === 0) {
        recentActivityDiv.innerHTML = '<p class="activity-item">No recent activity. Start recycling!</p>';
        return;
    }
    recentItems.forEach(item => {
        const pointsClass = item.points_change >= 0 ? 'positive' : 'negative';
        const iconClass = item.action.replace('_', '-');
        const icon = item.points_change >= 0 ? 'fa-plus' : 'fa-gift';
        recentActivityDiv.innerHTML += `<div class="activity-item"><div class="activity-icon ${iconClass}"><i class="fas ${icon}"></i></div><div class="activity-details"><div class="activity-description">${item.description}</div><div class="activity-time">${new Date(item.created_at).toLocaleString()}</div></div><div class="activity-points ${pointsClass}">${item.points_change > 0 ? '+' : ''}${item.points_change}</div></div>`;
    });
}

function renderPointsHistory(historyData) {
    const pointsHistoryDiv = document.getElementById('pointsHistory');
    pointsHistoryDiv.innerHTML = '';
    if (historyData.length === 0) {
        pointsHistoryDiv.innerHTML = '<p class="history-item">No transactions yet.</p>';
        return;
    }
    historyData.forEach(item => {
        const pointsClass = item.points_change >= 0 ? 'positive' : 'negative';
        const iconClass = item.action.replace('_', '-');
        const icon = item.points_change >= 0 ? 'fa-plus' : 'fa-gift';
        pointsHistoryDiv.innerHTML += `<div class="history-item"><div class="history-icon ${iconClass}"><i class="fas ${icon}"></i></div><div class="history-details"><div class="history-description">${item.description}</div><div class="history-time">${new Date(item.created_at).toLocaleString()}</div></div><div class="history-points ${pointsClass}">${item.points_change > 0 ? '+' : ''}${item.points_change}</div></div>`;
    });
}

function loadCoupons() {
    const couponsGrid = document.getElementById('couponsGrid');
    couponsGrid.innerHTML = '';
    defaultCoupons.forEach(coupon => {
        const canRedeem = currentUserProfile && currentUserProfile.points >= coupon.points;
        let buttonText = canRedeem ? 'Redeem Now' : (currentUserProfile ? 'Insufficient Points' : 'Login to Redeem');
        couponsGrid.innerHTML += `<div class="card coupon-card"><div class="coupon-header"><div class="coupon-name">${coupon.name}</div><div class="coupon-points"><i class="fas fa-coins"></i> ${coupon.points} Points</div></div><div class="coupon-body"><p class="coupon-description">Redeem for exclusive eco-friendly benefits!</p><button class="coupon-btn" onclick="redeemCoupon('${coupon.id}', ${coupon.points})" ${!canRedeem ? 'disabled' : ''}>${buttonText}</button></div></div>`;
    });
}

async function startScanner() {
    if (!currentUserProfile || isScannerActive) return;
    isScannerActive = true;
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'block';
    document.getElementById('qr-reader').innerHTML = '';
    document.getElementById('qr-reader').style.display = 'block';
    html5QrCodeScanner = new Html5Qrcode("qr-reader");
    try {
        await html5QrCodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => { if (isScannerActive) handleQRScan(decodedText); }, () => { });
    } catch (err) {
        isScannerActive = false;
        document.getElementById('startScanBtn').style.display = 'block';
        document.getElementById('stopScanBtn').style.display = 'none';
        showToast("Could not start camera. Check permissions.", "error");
    }
}

async function stopScanner() {
    if (html5QrCodeScanner && isScannerActive) {
        try {
            await html5QrCodeScanner.stop();
        } catch (err) {
            console.error("Error stopping scanner:", err);
        } finally {
            isScannerActive = false;
            document.getElementById('startScanBtn').style.display = 'block';
            document.getElementById('stopScanBtn').style.display = 'none';
            document.getElementById('qr-reader').style.display = 'none';
        }
    }
}

function generateDemoQR() {
    const demoQRContainer = document.getElementById('demoQRContainer');
    demoQRContainer.innerHTML = '';
    new QRCode(demoQRContainer, { text: EXPECTED_FRAME_QR_CONTENT, width: 200, height: 200 });
    demoQRContainer.innerHTML += `<p style="margin-top:1rem;">Scan this QR code to test the feature.</p>`;
    showToast("Demo QR generated!", "info");
}

function generateRedeemCode() {
    return `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function startRedeemTimer() {
    let timeLeft = 60;
    const timerElement = document.getElementById('redeemTimer');
    clearInterval(redeemTimerInterval);
    redeemTimerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(redeemTimerInterval);
            hideRedeemCodeModal();
            showToast('Redemption code has expired.', 'warning');
        } else {
            timerElement.textContent = `00:${(--timeLeft).toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function hideRedeemCodeModal() {
    clearInterval(redeemTimerInterval);
    document.getElementById('redeemCodeModal').style.display = 'none';
}

function togglePasswordVisibility(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function showForgotPasswordModal() {
    authModal.style.display = 'none';
    forgotPasswordModal.style.display = 'flex';
}

function hideForgotPasswordModal() {
    forgotPasswordModal.style.display = 'none';
    authModal.style.display = 'flex';
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}Page`)?.classList.add('active');
    document.getElementById('navLinks').classList.remove('active');
    if (pageId !== 'scan' && isScannerActive) stopScanner();
    if (currentUserProfile) {
        if (pageId === 'dashboard' || pageId === 'history') updateUI();
        else if (pageId === 'coupons') loadCoupons();
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

function showLoading(message = 'Loading...') {
    document.querySelector('#loadingOverlay p').textContent = message;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function toggleNav() {
    document.getElementById('navLinks').classList.toggle('active');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${iconMap[type]} toast-icon"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', initApp);

// Expose functions to global scope for HTML onclick attributes
window.showPage = showPage;
window.toggleNav = toggleNav;
window.logout = logout;
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.generateDemoQR = generateDemoQR;
window.redeemCoupon = redeemCoupon;
window.switchTab = switchTab;
window.togglePasswordVisibility = togglePasswordVisibility;
window.showForgotPasswordModal = showForgotPasswordModal;
window.hideForgotPasswordModal = hideForgotPasswordModal;
window.hideRedeemCodeModal = hideRedeemCodeModal;