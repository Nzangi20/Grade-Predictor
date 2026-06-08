// ================= GLOBAL STATE =================
let token = localStorage.getItem("token") || null;
let currentUser = null;
let predictionHistory = [];

// Chart instances
let historyChart = null;
let distributionChart = null;
let studyChart = null;

// API Base URL (Relative paths for seamless production deployment)
const API_BASE = "";

// ================= DOM ELEMENTS =================
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotForm = document.getElementById("forgot-form");
const authSubtitle = document.getElementById("auth-subtitle");
const switchToRegister = document.getElementById("switch-to-register");
const switchToLogin = document.getElementById("switch-to-login");
const switchToForgot = document.getElementById("switch-to-forgot");
const forgotBackToLogin = document.getElementById("forgot-back-to-login");
const userDisplayName = document.getElementById("user-display-name");
const logoutBtn = document.getElementById("logout-btn");
const themeToggle = document.getElementById("theme-toggle");

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".content-section");
const sectionTitle = document.getElementById("section-title");
const sectionSubtitle = document.getElementById("section-subtitle");
const currentDateSpan = document.getElementById("current-date");

// Form & Stepper Elements
const predictForm = document.getElementById("student-predict-form");
const formSteps = document.querySelectorAll(".form-step");
const stepIndicators = document.querySelectorAll(".step-indicator");
const nextBtns = document.querySelectorAll(".next-step-btn");
const prevBtns = document.querySelectorAll(".prev-step-btn");
const resultPlaceholder = document.getElementById("prediction-result-placeholder");
const resultWidget = document.getElementById("prediction-result-widget");
const resultGradeValue = document.getElementById("result-grade-value");
const resultStatusBadge = document.getElementById("result-status-badge");
const resultRecsList = document.getElementById("result-recommendations-list");

// History Table Elements
const historyTableBody = document.getElementById("history-table-body");

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    // Set current date
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    currentDateSpan.textContent = new Date().toLocaleDateString('en-US', options);

    // Initialize Theme
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    // Check Auth State
    checkAuth();

    // Setup Event Listeners
    setupEventListeners();
});

// ================= THEME TOGGLE =================
function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector("i");
    if (theme === "light") {
        icon.className = "fa-solid fa-moon";
    } else {
        icon.className = "fa-solid fa-sun";
    }
}

themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
    
    // Redraw charts with correct styling if visible
    if (!appView.classList.contains("hidden")) {
        renderCharts();
    }
});

// ================= TOAST NOTIFICATION SYSTEM =================
function showToast(title, message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let iconClass = "fa-info-circle";
    if (type === "success") iconClass = "fa-check-circle";
    if (type === "error") iconClass = "fa-exclamation-circle";
    if (type === "warning") iconClass = "fa-exclamation-triangle";
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%) scale(0.9)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ================= AUTHENTICATION HANDLERS =================
async function checkAuth() {
    if (!token) {
        showAuthView();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            userDisplayName.textContent = currentUser.username;
            showAppView();
            loadDashboardData();
        } else {
            // Token expired or invalid
            logout();
        }
    } catch (err) {
        console.error("Auth check failed:", err);
        showToast("Connection Error", "Could not reach the server. Working offline.", "warning");
        showAuthView();
    }
}

function showAuthView() {
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
}

function showAppView() {
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    switchView("dashboard-section");
}

function logout() {
    token = null;
    currentUser = null;
    predictionHistory = [];
    localStorage.removeItem("token");
    showAuthView();
    showToast("Signed Out", "You have been logged out successfully.", "info");
}

logoutBtn.addEventListener("click", logout);

// Auth view toggles
switchToRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    forgotForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    authSubtitle.textContent = "Create an account to start forecasting student grades";
});

switchToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    forgotForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    authSubtitle.textContent = "Login to access your prediction dashboard";
});

switchToForgot.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    forgotForm.classList.remove("hidden");
    authSubtitle.textContent = "Reset your account password";
});

forgotBackToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    forgotForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    authSubtitle.textContent = "Login to access your prediction dashboard";
});

// Login submission
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.access_token;
            localStorage.setItem("token", token);
            showToast("Welcome Back!", `Successfully logged in as ${username}.`, "success");
            loginForm.reset();
            checkAuth();
        } else {
            showToast("Authentication Failed", data.detail || "Incorrect username or password.", "error");
        }
    } catch (err) {
        console.error("Login request failed:", err);
        showToast("Error", "Login failed. Check server connection.", "error");
    }
});

// Register submission
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast("Registration Success", "Account created successfully. Please login.", "success");
            registerForm.reset();
            // Automatically switch back to login
            registerForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
            authSubtitle.textContent = "Login to access your prediction dashboard";
        } else {
            showToast("Registration Failed", data.detail || "Unable to register account.", "error");
        }
    } catch (err) {
        console.error("Register request failed:", err);
        showToast("Error", "Registration failed. Check server connection.", "error");
    }
});

// Forgot password submission
forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast("Reset Link Sent", data.message || "Please check your email for a password reset link.", "success");
            forgotForm.reset();
            // Switch back to login
            forgotForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
            authSubtitle.textContent = "Login to access your prediction dashboard";
        } else {
            showToast("Forgot Password Failed", data.detail || "Unable to request password reset.", "error");
        }
    } catch (err) {
        console.error("Forgot password request failed:", err);
        showToast("Error", "Request failed. Check server connection.", "error");
    }
});

// ================= NAVIGATION & VIEW ROUTING =================
function setupEventListeners() {
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const target = link.getAttribute("data-target");
            switchView(target);
        });
    });
}

function switchView(targetId) {
    // Update active nav-link
    navLinks.forEach(link => {
        if (link.getAttribute("data-target") === targetId) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    // Toggle content sections
    sections.forEach(section => {
        if (section.id === targetId) {
            section.classList.remove("hidden");
        } else {
            section.classList.add("hidden");
        }
    });

    // Update Headers
    if (targetId === "dashboard-section") {
        sectionTitle.textContent = "Dashboard Overview";
        sectionSubtitle.textContent = "Real-time performance analytics and prediction summaries.";
        loadDashboardData();
    } else if (targetId === "predict-section") {
        sectionTitle.textContent = "New Grade Prediction";
        sectionSubtitle.textContent = "Evaluate student final grades using scholastic, demographic, and behavioral metrics.";
        resetPredictionWizard();
    } else if (targetId === "history-section") {
        sectionTitle.textContent = "Inference History Logs";
        sectionSubtitle.textContent = "Browse, filter, and audit past grade predictions.";
        loadHistoryLogs();
    }
}

// ================= WIZARD (STEPPER) FORM LOGIC =================
let currentStep = 1;

function resetPredictionWizard() {
    currentStep = 1;
    goToStep(1);
    predictForm.reset();
    resultWidget.classList.add("hidden");
    resultPlaceholder.classList.remove("hidden");
}

function goToStep(stepNum) {
    formSteps.forEach(step => {
        const stepId = parseInt(step.id.replace("step-", ""));
        if (stepId === stepNum) {
            step.classList.remove("hidden");
        } else {
            step.classList.add("hidden");
        }
    });

    stepIndicators.forEach(ind => {
        const indStep = parseInt(ind.getAttribute("data-step"));
        if (indStep === stepNum) {
            ind.className = "step-indicator active";
        } else if (indStep < stepNum) {
            ind.className = "step-indicator completed";
        } else {
            ind.className = "step-indicator";
        }
    });
    
    currentStep = stepNum;
}

// Validation helper
function validateCurrentStep() {
    const activeStepEl = document.getElementById(`step-${currentStep}`);
    const inputs = activeStepEl.querySelectorAll("input, select");
    let isValid = true;
    
    for (let input of inputs) {
        if (!input.checkValidity()) {
            input.reportValidity();
            isValid = false;
            break;
        }
    }
    return isValid;
}

nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        if (validateCurrentStep()) {
            goToStep(currentStep + 1);
        }
    });
});

prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        goToStep(currentStep - 1);
    });
});

// Form submission for prediction
predictForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;
    
    const submitBtn = document.getElementById("submit-prediction-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Processing...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
    
    // Compile inputs payload
    const payload = {
        // Step 1: Academic
        G1: parseInt(document.getElementById("G1").value),
        G2: parseInt(document.getElementById("G2").value),
        failures: parseInt(document.getElementById("failures").value),
        studytime: parseInt(document.getElementById("studytime").value),
        schoolsup: document.getElementById("schoolsup").value,
        famsup: document.getElementById("famsup").value,
        paid: document.getElementById("paid").value,
        higher: document.getElementById("higher").value,
        
        // Step 2: Personal & Family
        age: parseInt(document.getElementById("age").value),
        school: document.getElementById("school").value,
        sex: document.getElementById("sex").value,
        address: document.getElementById("address").value,
        famsize: document.getElementById("famsize").value,
        Pstatus: document.getElementById("Pstatus").value,
        Medu: parseInt(document.getElementById("Medu").value),
        Fedu: parseInt(document.getElementById("Fedu").value),
        Mjob: document.getElementById("Mjob").value,
        Fjob: document.getElementById("Fjob").value,
        guardian: document.getElementById("guardian").value,
        
        // Step 3: Behavior
        absences: parseInt(document.getElementById("absences").value),
        activities: document.getElementById("activities").value,
        nursery: document.getElementById("nursery").value,
        internet: document.getElementById("internet").value,
        romantic: document.getElementById("romantic").value,
        traveltime: parseInt(document.getElementById("traveltime").value),
        reason: document.getElementById("reason").value,
        famrel: parseInt(document.getElementById("famrel").value),
        freetime: parseInt(document.getElementById("freetime").value),
        goout: parseInt(document.getElementById("goout").value),
        Dalc: parseInt(document.getElementById("Dalc").value),
        Walc: parseInt(document.getElementById("Walc").value),
        health: parseInt(document.getElementById("health").value),
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast("Prediction Success", "Student grade has been successfully calculated.", "success");
            displayPredictionResult(data);
        } else {
            showToast("Inference Error", data.detail || "Could not complete prediction.", "error");
        }
    } catch (err) {
        console.error("Prediction request failed:", err);
        showToast("Error", "Server error during model execution.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Run Predictor</span> <i class="fa-solid fa-wand-magic-sparkles"></i>`;
    }
});

function displayPredictionResult(data) {
    // Hide placeholder, show widget
    resultPlaceholder.classList.add("hidden");
    resultWidget.className = `result-card-widget ${data.evaluation.toLowerCase().replace(" ", "-")}`;
    resultWidget.classList.remove("hidden");
    
    // Set score and badges
    resultGradeValue.textContent = data.predicted_grade.toFixed(1);
    resultStatusBadge.textContent = data.evaluation;
    
    // Set badge classes
    resultStatusBadge.className = `badge ${data.evaluation.toLowerCase().replace(" ", "-")}`;
    
    // Build recommendations list
    resultRecsList.innerHTML = "";
    data.recommendations.forEach(rec => {
        const li = document.createElement("li");
        li.textContent = rec;
        resultRecsList.appendChild(li);
    });
}

// ================= DATA LOGGING & RETRIEVAL =================
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/predictions`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            predictionHistory = await response.json();
            updateDashboardStats();
            renderCharts();
        }
    } catch (err) {
        console.error("Failed to load dashboard logs:", err);
    }
}

async function loadHistoryLogs() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/predictions`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            predictionHistory = await response.json();
            populateHistoryTable(predictionHistory);
        }
    } catch (err) {
        console.error("Failed to load history list:", err);
    }
}

function updateDashboardStats() {
    const totalPredictions = predictionHistory.length;
    document.getElementById("stat-total-predictions").textContent = totalPredictions;
    
    if (totalPredictions === 0) {
        document.getElementById("stat-avg-grade").innerHTML = `0.0<span class="out-of">/20</span>`;
        document.getElementById("stat-risk-percentage").textContent = `0%`;
        return;
    }
    
    // Avg Grade calculation
    const sumGrades = predictionHistory.reduce((sum, item) => sum + item.predicted_grade, 0);
    const avgGrade = sumGrades / totalPredictions;
    document.getElementById("stat-avg-grade").innerHTML = `${avgGrade.toFixed(1)}<span class="out-of">/20</span>`;
    
    // At Risk Percentage calculation (grade < 10)
    const atRiskCount = predictionHistory.filter(item => item.predicted_grade < 10.0).length;
    const riskPct = (atRiskCount / totalPredictions) * 100;
    document.getElementById("stat-risk-percentage").textContent = `${riskPct.toFixed(0)}%`;
}

function populateHistoryTable(historyData) {
    historyTableBody.innerHTML = "";
    
    if (historyData.length === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>No predictions logged yet. Run a prediction to see history here.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    historyData.forEach(item => {
        const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        let evalStr = "At Risk";
        let evalClass = "risk";
        if (item.predicted_grade >= 16) {
            evalStr = "Excellent";
            evalClass = "excellent";
        } else if (item.predicted_grade >= 12) {
            evalStr = "Good";
            evalClass = "good";
        } else if (item.predicted_grade >= 10) {
            evalStr = "Satisfactory";
            evalClass = "satisfactory";
        }
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td style="font-weight: 700;">${item.predicted_grade.toFixed(2)}</td>
            <td><span class="badge ${evalClass}">${evalStr}</span></td>
            <td>G1: ${item.inputs.G1} / G2: ${item.inputs.G2}</td>
            <td>Abs: ${item.inputs.absences} / Fail: ${item.inputs.failures}</td>
            <td>
                <button class="btn-delete" data-id="${item.id}" title="Delete Log">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </td>
        `;
        
        // Add delete listener
        tr.querySelector(".btn-delete").addEventListener("click", () => {
            deletePredictionLog(item.id);
        });
        
        historyTableBody.appendChild(tr);
    });
}

async function deletePredictionLog(id) {
    if (!confirm("Are you sure you want to delete this prediction log?")) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/predictions/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast("Log Deleted", "The inference history record has been removed.", "success");
            // Refresh current view list
            if (!appView.classList.contains("hidden")) {
                const activeNav = document.querySelector(".nav-link.active");
                const currentView = activeNav ? activeNav.getAttribute("data-target") : "dashboard-section";
                
                if (currentView === "dashboard-section") {
                    loadDashboardData();
                } else if (currentView === "history-section") {
                    loadHistoryLogs();
                }
            }
        } else {
            showToast("Deletion Failed", "Unable to remove log from records.", "error");
        }
    } catch (err) {
        console.error("Deletion request failed:", err);
        showToast("Error", "Could not complete deletion. Server connection issue.", "error");
    }
}

// ================= DYNAMIC DATA VISUALIZATION (CHARTS) =================
function renderCharts() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textThemeColor = isDark ? "#94a3b8" : "#64748b";
    const gridThemeColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    
    // Destroy previous charts if they exist
    if (historyChart) historyChart.destroy();
    if (distributionChart) distributionChart.destroy();
    if (studyChart) studyChart.destroy();
    
    if (predictionHistory.length === 0) {
        // Draw empty/placeholder charts
        drawEmptyCharts(textThemeColor, gridThemeColor);
        return;
    }
    
    // 1. Prediction History Trend Chart (Timeline)
    const historyData = [...predictionHistory].reverse(); // oldest first
    const labels = historyData.map((item, idx) => `Student #${idx + 1}`);
    const grades = historyData.map(item => item.predicted_grade);
    
    const ctxHistory = document.getElementById("predictionHistoryChart").getContext("2d");
    historyChart = new Chart(ctxHistory, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted Final Grade',
                data: grades,
                borderColor: '#1A365D',
                backgroundColor: 'rgba(26, 54, 93, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridThemeColor },
                    ticks: { color: textThemeColor }
                },
                y: {
                    min: 0,
                    max: 20,
                    grid: { color: gridThemeColor },
                    ticks: { color: textThemeColor }
                }
            }
        }
    });

    // 2. Grade Risk Distribution Chart
    const counts = { "Excellent": 0, "Good": 0, "Satisfactory": 0, "At Risk": 0 };
    predictionHistory.forEach(item => {
        if (item.predicted_grade >= 16) counts["Excellent"]++;
        else if (item.predicted_grade >= 12) counts["Good"]++;
        else if (item.predicted_grade >= 10) counts["Satisfactory"]++;
        else counts["At Risk"]++;
    });
    
    const ctxDist = document.getElementById("gradeDistributionChart").getContext("2d");
    distributionChart = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#10b981', '#1A365D', '#FFC300', '#ef4444'],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#141523' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textThemeColor,
                        padding: 15,
                        boxWidth: 12,
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                }
            },
            cutout: '65%'
        }
    });

    // 3. Study Time habits impact
    // studytime ranges from 1 to 4: 1 (<2h), 2 (2-5h), 3 (5-10h), 4 (>10h)
    const studyHoursSums = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const studyHoursCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    predictionHistory.forEach(item => {
        const st = item.inputs.studytime;
        if (studyHoursSums[st] !== undefined) {
            studyHoursSums[st] += item.predicted_grade;
            studyHoursCounts[st]++;
        }
    });
    
    const avgGradesByStudy = [1, 2, 3, 4].map(st => {
        return studyHoursCounts[st] > 0 ? (studyHoursSums[st] / studyHoursCounts[st]) : 0;
    });
    
    const ctxStudy = document.getElementById("studyHabitsChart").getContext("2d");
    studyChart = new Chart(ctxStudy, {
        type: 'bar',
        data: {
            labels: ['< 2h', '2-5h', '5-10h', '>10h'],
            datasets: [{
                label: 'Average Grade',
                data: avgGradesByStudy,
                backgroundColor: 'rgba(26, 54, 93, 0.85)',
                borderRadius: 4,
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textThemeColor }
                },
                y: {
                    min: 0,
                    max: 20,
                    grid: { color: gridThemeColor },
                    ticks: { color: textThemeColor }
                }
            }
        }
    });
}

function drawEmptyCharts(textColor, gridColor) {
    const ctxHistory = document.getElementById("predictionHistoryChart").getContext("2d");
    historyChart = new Chart(ctxHistory, {
        type: 'line',
        data: { labels: ['No Data'], datasets: [{ data: [0], borderColor: '#1A365D', fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
    });
    
    const ctxDist = document.getElementById("gradeDistributionChart").getContext("2d");
    distributionChart = new Chart(ctxDist, {
        type: 'doughnut',
        data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#1A365D'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } } }
    });
    
    const ctxStudy = document.getElementById("studyHabitsChart").getContext("2d");
    studyChart = new Chart(ctxStudy, {
        type: 'bar',
        data: { labels: ['No Data'], datasets: [{ data: [0] }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
    });
}