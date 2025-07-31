// --- Supabase Setup ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your Supabase project credentials
const SUPABASE_URL = 'https://ynqlxqqeprgxjjusihlg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlucWx4cXFlcHJneGpqdXNpaGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTczMTEsImV4cCI6MjA2OTQzMzMxMX0.CtRdrVjnyy7atnFPwVGAhwpF08yDt-VDmVbJ8gnrVKM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Variables ---
let currentUserProfile = null; // Stores the currently logged-in user's profile data
let html5QrCodeScanner = null; // Html5Qrcode instance
let isScannerActive = false; // Flag to track scanner state
let redeemTimerInterval = null; // To manage the countdown timer

// This is the string from your specific dustbin QR code.
const EXPECTED_FRAME_QR_CONTENT = 'https://qrco.de/bgBWbc';
// Cooldown period for scanning the same QR code (5 minutes)
const QR_SCAN_COOLDOWN_MS = 5 * 60 * 1000;

// Default coupons (can be moved to a Supabase table later)
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

// --- Core App Initialization ---

/**
 * Initializes the application.
 */
async function initApp() {
    console.log("Smart Dust Bin App Initializing with Supabase...");
    setupEventListeners();
    handleAuthStateChange(); // Check user session and listen for changes
    showPage('dashboard');
}

/**
 * Sets up global event listeners.
 */
function setupEventListeners() {
    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
    document.getElementById('passwordResetForm')?.addEventListener('submit', handlePasswordReset);
}

/**
 * Listens for authentication state changes (login, logout) and updates the UI.
 */
function handleAuthStateChange() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            showPage('resetPassword');
        } else if (event === 'SIGNED_IN' && session) {
            // await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUserProfile = null;
            updateUIForGuest();
            if (!window.location.hash.includes('access_token')) {
                authModal.style.display = 'flex';
                showPage('dashboard');
            }
        }
    });
}

/**
 * Loads the user's profile from the 'profiles' table.
 */
async function loadUserProfile(user) {
    showLoading('Waking up the server, please wait...');

    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000) // 10 seconds
        );
        const fetchProfilePromise = supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data, error } = await Promise.race([fetchProfilePromise, timeoutPromise]);
        
        if (error) throw error;

        currentUserProfile = data;
        await updateUI();
        authModal.style.display = 'none';
        document.getElementById('forgotPasswordModal').style.display = 'none';
        showPage('dashboard');

    } catch (error) {
        console.error("Error loading user profile:", error.message);
        if (error.message === 'Timeout') {
            showToast('Loading is taking too long. Please log in manually.', 'warning');
            await logout();
        } else {
            showToast('Could not load your profile. Please try again.', 'error');
            await logout();
        }
    } finally {
        hideLoading();
    }
}


// --- Authentication & Password Functions ---

async function handleRegister(event) {
    event.preventDefault();
    showLoading();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    try {
        const { error } = await supabase.auth.signUp({
            email, password, options: { data: { username: username } }
        });
        if (error) throw error;
        showToast('Registration successful!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
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
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password,
    });
    if (error) throw error;

    // ADD THESE LINES FOR DEVELOPMENT
    // This manually loads your data because the auto-load is off
    if (data.user) {
        await loadUserProfile(data.user);
    }
    } catch (error) {
        showToast('Invalid login credentials.', 'error');
    } finally {
        hideLoading();
    }
}

async function logout() {
    showLoading();
    await supabase.auth.signOut();
    hideLoading();
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
    document.getElementById('forgotPasswordModal').style.display = 'flex';
}

function hideForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
    authModal.style.display = 'flex';
}

async function handleForgotPassword(event) {
    event.preventDefault();
    showLoading();
    const email = document.getElementById('resetEmail').value;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.split('#')[0],
    });
    hideLoading();
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Password reset link sent! Check your email.', 'success');
        document.getElementById('forgotPasswordModal').style.display = 'none';
    }
}

async function handlePasswordReset(event) {
    event.preventDefault();
    showLoading();
    const newPassword = document.getElementById('newPassword').value;
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long.', 'warning');
        hideLoading();
        return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    hideLoading();
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Password updated successfully! Please log in.', 'success');
        window.location.hash = '';
        showPage('dashboard');
        authModal.style.display = 'flex';
    }
}

// --- UI Update & Rendering ---

async function updateUI() {
    if (!currentUserProfile) return updateUIForGuest();
    
    document.getElementById('userName').innerText = currentUserProfile.username;
    document.getElementById('userPoints').innerText = currentUserProfile.points;
    document.getElementById('totalPoints').innerText = currentUserProfile.points;

    const { data: history, error } = await supabase
        .from('points_history')
        .select('*')
        .eq('user_id', currentUserProfile.id)
        .order('created_at', { ascending: false });

    if (error) return console.error("Error fetching history:", error.message);
    
    document.getElementById('totalScans').innerText = history.filter(item => item.action === 'qr_scan').length;
    document.getElementById('totalRedeemed').innerText = history.filter(item => item.action === 'coupon_redeem').length;

    renderRecentActivity(history);
    renderPointsHistory(history);
}

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
        recentActivityDiv.innerHTML += `
            <div class="activity-item">
                <div class="activity-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                <div class="activity-details">
                    <div class="activity-description">${item.description}</div>
                    <div class="activity-time">${new Date(item.created_at).toLocaleString()}</div>
                </div>
                <div class="activity-points ${pointsClass}">${item.points_change > 0 ? '+' : ''}${item.points_change}</div>
            </div>`;
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
        pointsHistoryDiv.innerHTML += `
            <div class="history-item">
                <div class="history-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                <div class="history-details">
                    <div class="history-description">${item.description}</div>
                    <div class="history-time">${new Date(item.created_at).toLocaleString()}</div>
                </div>
                <div class="history-points ${pointsClass}">${item.points_change > 0 ? '+' : ''}${item.points_change}</div>
            </div>`;
    });
}

function loadCoupons() {
    const couponsGrid = document.getElementById('couponsGrid');
    couponsGrid.innerHTML = '';
    defaultCoupons.forEach(coupon => {
        const canRedeem = currentUserProfile && currentUserProfile.points >= coupon.points;
        let buttonText = canRedeem ? 'Redeem Now' : (currentUserProfile ? 'Insufficient Points' : 'Login to Redeem');
        couponsGrid.innerHTML += `
            <div class="card coupon-card">
                <div class="coupon-header">
                    <div class="coupon-name">${coupon.name}</div>
                    <div class="coupon-points"><i class="fas fa-coins"></i> ${coupon.points} Points</div>
                </div>
                <div class="coupon-body">
                    <p class="coupon-description">Redeem for exclusive eco-friendly benefits!</p>
                    <button class="coupon-btn" onclick="redeemCoupon('${coupon.id}', ${coupon.points})" ${!canRedeem ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                </div>
            </div>`;
    });
}

// --- Core Features ---

async function redeemCoupon(couponId, pointsRequired) {
    if (!currentUserProfile || currentUserProfile.points < pointsRequired) return;
    showLoading();
    try {
        const coupon = defaultCoupons.find(c => c.id === couponId);
        const newPoints = currentUserProfile.points - pointsRequired;

        const { error: profileError } = await supabase.from('profiles').update({ points: newPoints }).eq('id', currentUserProfile.id);
        if (profileError) throw profileError;

        const { error: historyError } = await supabase.from('points_history').insert({
            user_id: currentUserProfile.id,
            action: 'coupon_redeem',
            points_change: -pointsRequired,
            description: `Redeemed: ${coupon.name}`
        });
        if (historyError) throw historyError;
        
        currentUserProfile.points = newPoints;
        await updateUI();
        loadCoupons();
        
        document.getElementById('redeemedCouponName').textContent = coupon.name;
        document.getElementById('redeemCodeDisplay').textContent = generateRedeemCode();
        document.getElementById('redeemCodeModal').style.display = 'flex';
        startRedeemTimer();
    } catch (error) {
        console.error("Error redeeming coupon:", error.message);
        showToast("Could not redeem coupon. Please try again.", "error");
    } finally {
        hideLoading();
    }
}

async function handleQRScan(decodedText) {
    if (!isScannerActive || !currentUserProfile) return;
    await stopScanner();
    showLoading();
    try {
        if (decodedText !== EXPECTED_FRAME_QR_CONTENT) {
            return showToast("Invalid QR Code. Scan the one on the dustbin.", "error");
        }

        const { data: existingScan } = await supabase.from('qr_scans').select('last_scanned_at').eq('user_id', currentUserProfile.id).eq('qr_id', decodedText).single();
        
        if (existingScan) {
            const timeSinceLastScan = new Date().getTime() - new Date(existingScan.last_scanned_at).getTime();
            if (timeSinceLastScan < QR_SCAN_COOLDOWN_MS) {
                const remainingMinutes = Math.ceil((QR_SCAN_COOLDOWN_MS - timeSinceLastScan) / 60000);
                return showToast(`Please wait ${remainingMinutes} more minute(s) to scan again.`, "warning");
            }
        }
        
        const pointsEarned = 10;
        const newPoints = currentUserProfile.points + pointsEarned;

        await supabase.from('profiles').update({ points: newPoints }).eq('id', currentUserProfile.id);
        await supabase.from('qr_scans').upsert({ user_id: currentUserProfile.id, qr_id: decodedText, last_scanned_at: new Date().toISOString() }, { onConflict: 'user_id, qr_id' });
        await supabase.from('points_history').insert({ user_id: currentUserProfile.id, action: 'qr_scan', points_change: pointsEarned, description: `Scanned Dust Bin QR` });
        
        currentUserProfile.points = newPoints;
        showToast(`+${pointsEarned} points added!`, "success");
        await updateUI();
    } catch (error) {
        console.error("Error processing QR scan:", error.message);
        showToast("An error occurred during the scan.", "error");
    } finally {
        hideLoading();
    }
}

// --- QR Scanner & Redeem Code Helpers ---

async function startScanner() {
    if (!currentUserProfile || isScannerActive) return;
    isScannerActive = true;
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'block';
    document.getElementById('qr-reader').innerHTML = '';
    document.getElementById('qr-reader').style.display = 'block';
    
    html5QrCodeScanner = new Html5Qrcode("qr-reader");
    try {
        await html5QrCodeScanner.start(
            { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => { if (isScannerActive) handleQRScan(decodedText); },
            () => {}
        );
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


// --- Generic Helpers & Utilities ---

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
}

function showLoading(message = 'Loading...') {
    document.querySelector('#loadingOverlay p').textContent = message;
    loadingOverlay.classList.add('active');
}
function hideLoading() { loadingOverlay.classList.remove('active'); }
function toggleNav() { document.getElementById('navLinks').classList.toggle('active'); }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
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