// =========================================================
// 🔥 KONFIGURASI FIREBASE (hanya databaseURL)
// GANTI DENGAN URL DATABASE ANDA
// =========================================================
const firebaseConfig = {
    databaseURL: "https://surveyin-eff58-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ========== STATE GLOBAL ==========
let currentUser = null;          // { username, role, surveyorId? }
let currentSurveyorId = null;
let currentSelectedKostId = null;
let currentSurveyorRating = 0;

// ========== NAVIGASI ==========
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'search') loadAllSurveyors();
}

function switchProfileSubPage(subId) {
    document.querySelectorAll('.profile-sub-page').forEach(sp => sp.classList.remove('active-sub'));
    document.getElementById(subId).classList.add('active-sub');
    if (subId === 'profile-portofolio' && currentSurveyorId) loadPortfolio(currentSurveyorId);
    if (subId === 'profile-ulasan' && currentSurveyorId) loadSurveyorReviews(currentSurveyorId);
}

function openProfile(surveyorId, nama, usia, jk, area, rating, noWhatsapp, fotoUrl) {
    currentSurveyorId = surveyorId;
    document.getElementById('p-nama-top').innerText = nama.toUpperCase();
    document.getElementById('p-nama').innerText = nama;
    document.getElementById('p-usia').innerText = usia + " Tahun";
    document.getElementById('p-jk').innerText = jk;
    document.getElementById('p-area').innerText = area;
    let starStr = "";
    for(let i=0; i<Math.floor(rating); i++) starStr += "★";
    for(let i=Math.floor(rating); i<5; i++) starStr += "☆";
    document.getElementById('p-rating').innerText = starStr;
    document.getElementById('p-img').src = fotoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80";
    
    window.currentSurveyorWhatsapp = noWhatsapp;
    // Simpan data surveyor untuk edit
    window.currentSurveyorData = { id: surveyorId, nama, usia, jk, area, noWhatsapp, fotoUrl };
    
    showPage('profile');
    switchProfileSubPage('profile-main');
    loadPortfolio(surveyorId);
    loadSurveyorReviews(surveyorId);
    
    const reviewForm = document.getElementById('reviewFormContainer');
    if (currentUser && currentUser.role !== 'surveyor') {
        reviewForm.style.display = 'block';
    } else {
        reviewForm.style.display = 'none';
    }
    
    // Tampilkan tombol edit profile hanya jika user yang login adalah pemilik surveyor
    const editBtn = document.getElementById('editProfileBtn');
    if (currentUser && currentUser.role === 'surveyor' && currentUser.surveyorId === surveyorId) {
        editBtn.style.display = 'block';
    } else {
        editBtn.style.display = 'none';
    }
}

function contactSurveyor() {
    if (window.currentSurveyorWhatsapp) {
        let waNumber = window.currentSurveyorWhatsapp.replace(/\D/g, '');
        if (!waNumber.startsWith('62')) waNumber = '62' + waNumber;
        window.open(`https://wa.me/${waNumber}?text=Halo%20saya%20tertarik%20dengan%20jasa%20survei%20Anda`, '_blank');
    } else {
        alert("Nomor WhatsApp tidak tersedia.");
    }
}

// ========== EDIT PROFILE ==========
function editProfile() {
    if (!currentUser || currentUser.role !== 'surveyor') {
        alert("Hanya surveyor yang dapat edit profile.");
        return;
    }
    document.getElementById('editNama').value = window.currentSurveyorData.nama || '';
    document.getElementById('editUsia').value = window.currentSurveyorData.usia || '';
    document.getElementById('editJk').value = window.currentSurveyorData.jk || 'Laki-laki';
    document.getElementById('editArea').value = window.currentSurveyorData.area || '';
    document.getElementById('editWhatsapp').value = window.currentSurveyorData.noWhatsapp || '';
    document.getElementById('editFoto').value = '';
    document.getElementById('editProfileModal').style.display = 'block';
}

async function updateProfile() {
    const nama = document.getElementById('editNama').value.trim();
    const usia = parseInt(document.getElementById('editUsia').value);
    const jk = document.getElementById('editJk').value;
    const area = document.getElementById('editArea').value.trim();
    const noWhatsapp = document.getElementById('editWhatsapp').value.trim();
    const fotoFile = document.getElementById('editFoto').files[0];
    
    if (!nama || !usia || !area || !noWhatsapp) {
        alert("Semua field harus diisi.");
        return;
    }
    
    let fotoBase64 = window.currentSurveyorData.fotoUrl;
    if (fotoFile) {
        if (fotoFile.size > 2 * 1024 * 1024) {
            alert("Ukuran foto profile maksimal 2 MB.");
            return;
        }
        fotoBase64 = await fileToBase64(fotoFile);
    }
    
    const updateData = {
        nama: nama,
        usia: usia,
        jenisKelamin: jk,
        area: area,
        noWhatsapp: noWhatsapp,
        fotoUrl: fotoBase64
    };
    
    await db.ref('surveyors/' + currentUser.surveyorId).update(updateData);
    alert("Profile berhasil diupdate!");
    closeModal('editProfileModal');
    
    // Refresh tampilan profile
    window.currentSurveyorData = { ...window.currentSurveyorData, ...updateData };
    document.getElementById('p-nama-top').innerText = nama.toUpperCase();
    document.getElementById('p-nama').innerText = nama;
    document.getElementById('p-usia').innerText = usia + " Tahun";
    document.getElementById('p-jk').innerText = jk;
    document.getElementById('p-area').innerText = area;
    document.getElementById('p-img').src = fotoBase64;
    window.currentSurveyorWhatsapp = noWhatsapp;
}

// ========== LOGIN (TANPA SIMPAN AKUN) ==========
async function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passInput').value;
    if (username.length < 3 || password.length < 4) {
        alert("Username minimal 3 karakter, password minimal 4 karakter");
        return;
    }
    
    const snapshot = await db.ref('surveyors').orderByChild('username').equalTo(username).once('value');
    let existingSurveyor = null;
    snapshot.forEach(child => { existingSurveyor = { id: child.key, ...child.val() }; });
    
    if (existingSurveyor) {
        currentUser = {
            username: username,
            role: 'surveyor',
            surveyorId: existingSurveyor.id
        };
        alert(`Selamat datang kembali, Surveyor ${username}!`);
    } else {
        currentUser = {
            username: username,
            role: 'user',
            surveyorId: null
        };
        alert(`Selamat datang, ${username}!`);
    }
    updateUIAfterLogin();
}

function updateUIAfterLogin() {
    document.getElementById('navLoginBtn').innerText = "LOGOUT";
    document.getElementById('navLoginBtn').onclick = logout;
    if (currentUser.role === 'surveyor') {
        document.getElementById('navUploadKost').style.display = 'block';
        document.getElementById('navBecomeSurveyor').style.display = 'none';
    } else {
        document.getElementById('navUploadKost').style.display = 'none';
        document.getElementById('navBecomeSurveyor').style.display = 'block';
    }
    showPage('search');
    loadAllSurveyors();
}

function logout() {
    currentUser = null;
    currentSurveyorId = null;
    document.getElementById('navLoginBtn').innerText = "LOGIN";
    document.getElementById('navLoginBtn').onclick = () => showPage('login');
    document.getElementById('navUploadKost').style.display = 'none';
    document.getElementById('navBecomeSurveyor').style.display = 'none';
    showPage('home');
}

// ========== JADI SURVEYOR ==========
function showBecomeSurveyorForm() {
    if (!currentUser) { alert("Silakan login dulu."); return; }
    if (currentUser.role === 'surveyor') { alert("Anda sudah menjadi surveyor."); return; }
    document.getElementById('becomeSurveyorModal').style.display = 'block';
}

async function registerAsSurveyor() {
    const nama = document.getElementById('surveyorNama').value;
    const usia = parseInt(document.getElementById('surveyorUsia').value);
    const jk = document.getElementById('surveyorJk').value;
    const area = document.getElementById('surveyorArea').value;
    const noWhatsapp = document.getElementById('surveyorWhatsapp').value;
    if (!nama || !usia || !area || !noWhatsapp) { alert("Semua field harus diisi."); return; }
    
    const surveyorsRef = db.ref('surveyors');
    const newSurveyorRef = surveyorsRef.push();
    const surveyorData = {
        username: currentUser.username,
        nama: nama,
        usia: usia,
        jenisKelamin: jk,
        area: area,
        noWhatsapp: noWhatsapp,
        ratingAvg: 0,
        totalReviews: 0,
        fotoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80"
    };
    await newSurveyorRef.set(surveyorData);
    
    currentUser.role = 'surveyor';
    currentUser.surveyorId = newSurveyorRef.key;
    
    alert("Selamat! Anda sekarang menjadi surveyor. Silakan upload kost.");
    document.getElementById('navUploadKost').style.display = 'block';
    document.getElementById('navBecomeSurveyor').style.display = 'none';
    closeModal('becomeSurveyorModal');
    loadAllSurveyors();
}

// ========== UPLOAD KOST (BASE64) dengan validasi ==========
function showUploadKostForm() {
    if (!currentUser || currentUser.role !== 'surveyor') { alert("Hanya surveyor yang dapat upload kost."); return; }
    document.getElementById('uploadKostModal').style.display = 'block';
}

async function uploadKost() {
    const namaKost = document.getElementById('kostNama').value;
    const alamat = document.getElementById('kostAlamat').value;
    const files = document.getElementById('kostFoto').files;
    if (!namaKost || !alamat || files.length === 0) { alert("Isi nama kost, alamat, dan minimal satu foto."); return; }
    
    if (files.length > 5) {
        alert("Maksimal 5 foto per kost.");
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > 2 * 1024 * 1024) {
            alert(`Foto "${files[i].name}" melebihi 2 MB. Maksimal 2 MB per foto.`);
            return;
        }
    }
    
    const fotoBase64Array = [];
    for (let i = 0; i < files.length; i++) {
        const base64 = await fileToBase64(files[i]);
        fotoBase64Array.push(base64);
    }
    const surveyorId = currentUser.surveyorId;
    if (!surveyorId) { alert("Data surveyor tidak ditemukan."); return; }
    
    const kostsRef = db.ref('kosts');
    const newKostRef = kostsRef.push();
    await newKostRef.set({
        surveyorId: surveyorId,
        namaKost: namaKost,
        alamat: alamat,
        fotoBase64: fotoBase64Array,
        ratingAvg: 0,
        totalReviews: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    alert("Kost berhasil diupload!");
    closeModal('uploadKostModal');
    document.getElementById('kostNama').value = '';
    document.getElementById('kostAlamat').value = '';
    document.getElementById('kostFoto').value = '';
    if (currentSurveyorId === surveyorId) loadPortfolio(surveyorId);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ========== LOAD SEMUA SURVEYOR ==========
async function loadAllSurveyors() {
    const container = document.getElementById('surveyorListContainer');
    container.innerHTML = '<p>Memuat surveyor...</p>';
    const snapshot = await db.ref('surveyors').once('value');
    const surveyors = snapshot.val();
    if (!surveyors) { container.innerHTML = '<p>Belum ada surveyor terdaftar.</p>'; return; }
    container.innerHTML = '';
    for (let [id, data] of Object.entries(surveyors)) {
        const card = document.createElement('div');
        card.className = 'surveyor-row-card';
        card.onclick = () => openProfile(id, data.nama, data.usia, data.jenisKelamin, data.area, data.ratingAvg, data.noWhatsapp, data.fotoUrl);
        card.innerHTML = `
            <div class="surveyor-img-box"><img src="${data.fotoUrl}" alt="Foto"></div>
            <div class="surveyor-details"><ul>
                <li><strong>• NAMA</strong> : ${data.nama}</li>
                <li><strong>• AREA</strong> : ${data.area}</li>
                <li><strong>• RATING</strong> : ${'★'.repeat(Math.floor(data.ratingAvg))}${'☆'.repeat(5-Math.floor(data.ratingAvg))} (${data.ratingAvg})</li>
            </ul></div>
        `;
        container.appendChild(card);
    }
}

// ========== PORTOFOLIO KOST ==========
async function loadPortfolio(surveyorId) {
    const container = document.getElementById('portfolioGridContainer');
    container.innerHTML = '<p>Memuat portofolio...</p>';
    const snapshot = await db.ref('kosts').orderByChild('surveyorId').equalTo(surveyorId).once('value');
    const kosts = snapshot.val();
    if (!kosts) { container.innerHTML = '<p>Belum ada kost yang diupload.</p>'; return; }
    container.innerHTML = '';
    for (let [id, kost] of Object.entries(kosts)) {
        const firstFoto = (kost.fotoBase64 && kost.fotoBase64.length) ? kost.fotoBase64[0] : 'https://via.placeholder.com/300';
        const div = document.createElement('div');
        div.className = 'portfolio-item';
        div.innerHTML = `<img src="${firstFoto}" alt="${kost.namaKost}"><div class="kost-rating-badge">★ ${kost.ratingAvg || 0}</div>`;
        div.onclick = () => showKostDetail(id, kost);
        container.appendChild(div);
    }
}

function showKostDetail(kostId, kostData) {
    currentSelectedKostId = kostId;
    const reviewArea = document.getElementById('kostReviewArea');
    reviewArea.innerHTML = `
        <div class="review-box-custom">
            <h3>${kostData.namaKost}</h3>
            <p><strong>Alamat:</strong> ${kostData.alamat}</p>
            <p><strong>Rating:</strong> ${'★'.repeat(Math.floor(kostData.ratingAvg))} (${kostData.ratingAvg || 0})</p>
            <hr><h4>Ulasan Kost:</h4><div id="kostReviewsList"></div>
            ${currentUser && currentUser.role !== 'surveyor' ? `
                <div class="star-rating-input" id="kostStarRating">
                    <i class="fas fa-star" data-value="1"></i><i class="fas fa-star" data-value="2"></i>
                    <i class="fas fa-star" data-value="3"></i><i class="fas fa-star" data-value="4"></i><i class="fas fa-star" data-value="5"></i>
                    <span id="ratingStatusKost">Pilih Rating</span>
                </div>
                <textarea id="kostReviewText" rows="2" placeholder="Tulis ulasan untuk kost ini..."></textarea>
                <button class="btn-pink-sm" onclick="submitKostReview('${kostId}')">Kirim Ulasan Kost</button>
            ` : '<p>Login sebagai user biasa untuk memberikan ulasan kost.</p>'}
        </div>
    `;
    loadKostReviews(kostId);
    initKostStarRating();
    switchProfileSubPage('profile-ulasan');
    document.getElementById('profile-ulasan').scrollIntoView({ behavior: 'smooth' });
}

async function loadKostReviews(kostId) {
    const container = document.getElementById('kostReviewsList');
    const snapshot = await db.ref('kostReviews').orderByChild('kostId').equalTo(kostId).once('value');
    const reviews = snapshot.val();
    if (!reviews) { container.innerHTML = '<p>Belum ada ulasan untuk kost ini.</p>'; return; }
    container.innerHTML = '';
    const reviewsArray = Object.entries(reviews).map(([id, rev]) => rev);
    reviewsArray.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    for (let rev of reviewsArray) {
        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5-rev.rating);
        const date = rev.createdAt ? new Date(rev.createdAt).toLocaleString() : 'baru saja';
        container.innerHTML += `
            <div class="review-box-custom" style="margin-top:10px;">
                <div class="rev-header"><div class="user-avatar"><i class="fas fa-user-circle"></i></div>
                <div><h4>${rev.username}</h4><small>${date}</small></div></div>
                <div class="stars">${stars}</div><p>${rev.komentar}</p>
            </div>
        `;
    }
}

async function submitKostReview(kostId) {
    if (!currentUser) { alert("Login dulu untuk memberi ulasan."); return; }
    const ratingElem = document.querySelector('#kostStarRating i.active');
    if (!ratingElem) { alert("Pilih rating bintang dulu."); return; }
    const rating = parseInt(ratingElem.getAttribute('data-value'));
    const komentar = document.getElementById('kostReviewText').value;
    if (!komentar.trim()) { alert("Tulis komentar terlebih dahulu."); return; }
    
    const newReviewRef = db.ref('kostReviews').push();
    await newReviewRef.set({ 
        kostId: kostId, 
        username: currentUser.username, 
        rating: rating, 
        komentar: komentar, 
        createdAt: firebase.database.ServerValue.TIMESTAMP 
    });
    
    const snapshot = await db.ref('kostReviews').orderByChild('kostId').equalTo(kostId).once('value');
    const reviews = snapshot.val();
    let total = 0, count = 0;
    if (reviews) for (let rev of Object.values(reviews)) { total += rev.rating; count++; }
    const avg = total / count;
    await db.ref('kosts/' + kostId).update({ ratingAvg: avg, totalReviews: count });
    alert("Ulasan kost terkirim!");
    loadKostReviews(kostId);
    document.getElementById('kostReviewText').value = '';
    document.querySelectorAll('#kostStarRating i').forEach(s => s.classList.remove('active'));
    document.getElementById('ratingStatusKost').innerText = "Pilih Rating";
}

// ========== ULASAN SURVEYOR ==========
async function loadSurveyorReviews(surveyorId) {
    const container = document.getElementById('reviewListSurveyor');
    const snapshot = await db.ref('surveyorReviews').orderByChild('surveyorId').equalTo(surveyorId).once('value');
    const reviews = snapshot.val();
    if (!reviews) { container.innerHTML = '<p>Belum ada ulasan untuk surveyor ini.</p>'; return; }
    container.innerHTML = '';
    const reviewsArray = Object.entries(reviews).map(([id, rev]) => rev);
    reviewsArray.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    for (let rev of reviewsArray) {
        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5-rev.rating);
        const date = rev.createdAt ? new Date(rev.createdAt).toLocaleString() : 'baru saja';
        container.innerHTML += `
            <div class="review-box-custom">
                <div class="rev-header"><div class="user-avatar"><i class="fas fa-user-circle"></i></div>
                <div><h4>${rev.username}</h4><small>${date}</small></div></div>
                <div class="stars">${stars}</div><p>${rev.komentar}</p>
            </div>
        `;
    }
}

function initSurveyorStarRating() {
    const stars = document.querySelectorAll('#surveyorStarRating i');
    stars.forEach(star => {
        star.onclick = () => {
            currentSurveyorRating = parseInt(star.getAttribute('data-value'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= currentSurveyorRating) s.classList.add('active');
                else s.classList.remove('active');
            });
            document.getElementById('ratingStatusSurveyor').innerText = `Rating: ${currentSurveyorRating}/5`;
        };
    });
}

async function submitReviewSurveyor() {
    if (!currentUser) { alert("Login dulu."); return; }
    if (currentSurveyorRating === 0) { alert("Pilih rating bintang dulu."); return; }
    const komentar = document.getElementById('revTextSurveyor').value;
    if (!komentar.trim()) { alert("Tulis ulasan terlebih dahulu."); return; }
    
    const newReviewRef = db.ref('surveyorReviews').push();
    await newReviewRef.set({ 
        surveyorId: currentSurveyorId, 
        username: currentUser.username, 
        rating: currentSurveyorRating, 
        komentar: komentar, 
        createdAt: firebase.database.ServerValue.TIMESTAMP 
    });
    
    const snapshot = await db.ref('surveyorReviews').orderByChild('surveyorId').equalTo(currentSurveyorId).once('value');
    const reviews = snapshot.val();
    let total = 0, count = 0;
    if (reviews) for (let rev of Object.values(reviews)) { total += rev.rating; count++; }
    const avg = total / count;
    await db.ref('surveyors/' + currentSurveyorId).update({ ratingAvg: avg, totalReviews: count });
    alert("Ulasan surveyor terkirim!");
    loadSurveyorReviews(currentSurveyorId);
    document.getElementById('revTextSurveyor').value = '';
    currentSurveyorRating = 0;
    document.querySelectorAll('#surveyorStarRating i').forEach(s => s.classList.remove('active'));
    document.getElementById('ratingStatusSurveyor').innerText = "Pilih Rating";
}

function initKostStarRating() {
    const stars = document.querySelectorAll('#kostStarRating i');
    stars.forEach(star => {
        star.onclick = () => {
            const val = parseInt(star.getAttribute('data-value'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= val) s.classList.add('active');
                else s.classList.remove('active');
            });
            document.getElementById('ratingStatusKost').innerText = `Rating: ${val}/5`;
        };
    });
}

// ========== EVENT LISTENER ==========
document.addEventListener('DOMContentLoaded', () => {
    const toggleIcon = document.getElementById('togglePasswordIcon');
    const passwordInput = document.getElementById('passInput');
    if (toggleIcon) {
        toggleIcon.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleIcon.classList.toggle('fa-eye-slash');
            toggleIcon.classList.toggle('fa-eye');
        });
    }
    initSurveyorStarRating();
});

function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal')) event.target.style.display = 'none'; }