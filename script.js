let isLogged = false;
let userEmail = "";
let currentRating = 0;

window.onload = () => {
    initStarRating();  
};

// --- NAVIGATION UTAMAA ---
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // Kelola status Navigasi Atas
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active-nav');
        if(item.innerText.toLowerCase() === id || (id === 'search' && item.innerText === 'SURVEYOR')) {
            item.classList.add('active-nav');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- SUB-PAGES UNTUK MENU PROFIL (TAB SYSTEM) ---
function switchProfileSubPage(subId) {
    // Sembunyikan semua sub halaman profil
    document.querySelectorAll('.profile-sub-page').forEach(sp => sp.classList.remove('active-sub'));
    // Tampilkan sub halaman terpilih
    document.getElementById(subId).classList.add('active-sub');

    // Atur kelas aktif pada tombol tab
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
        if (subId.includes(tab.innerText.toLowerCase())) {
            tab.classList.add('active-tab');
        }
    });
}

// --- MEMBUKA PROFIL DINAMIS ---
function openProfile(nama, usia, jk, area, ratingVal) {
    // Isi data ke elemen profil
    document.getElementById('p-nama-top').innerText = nama.toUpperCase();
    document.getElementById('p-nama').innerText = nama;
    document.getElementById('p-usia').innerText = usia + " Tahun";
    document.getElementById('p-jk').innerText = jk;
    document.getElementById('p-area').innerText = area;
    
    let starStr = "";
    for(let i=0; i<ratingVal; i++) { starStr += "★"; }
    for(let i=ratingVal; i<5; i++) { starStr += "☆"; }
    document.getElementById('p-rating').innerText = starStr;

    // Ganti foto profil berdasarkan nama secara acak/statis terarah
    const imgEl = document.getElementById('p-img');
    if (nama.includes("Rizky")) imgEl.src = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80";
    else if (nama.includes("Siska")) imgEl.src = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80";
    else imgEl.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80";

    // Arahkan ke halaman utama profil terlebih dahulu
    showPage('profile');
    switchProfileSubPage('profile-main');
}

// --- VALIDASI RATING BINTANG ---
function initStarRating() {
    const stars = document.querySelectorAll('.star-rating-input i');
    const status = document.getElementById('ratingStatus');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.getAttribute('data-value');
            stars.forEach(s => {
                s.classList.remove('active');
                if (s.getAttribute('data-value') <= currentRating) {
                    s.classList.add('active');
                }
            });
            status.innerText = `Rating: ${currentRating}/5`;
        });
    });
}

// --- AUTH LOGIC ---
function validateGmail() {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    
    if (gmailPattern.test(email) && pass.length >= 4) {
        isLogged = true;
        userEmail = email.split('@')[0];
        alert(`Halo ${userEmail}, Selamat Datang di SurveyIN!`);
        
        document.getElementById('navLoginBtn').innerText = "LOGOUT";
        document.getElementById('navLoginBtn').onclick = logout;
        showPage('search');
    } else {
        alert("Gunakan email @gmail.com yang valid dan password minimal 4 karakter.");
    }
}

function logout() {
    isLogged = false;
    document.getElementById('navLoginBtn').innerText = "LOGIN";
    document.getElementById('navLoginBtn').onclick = () => showPage('login');
    alert("Berhasil keluar.");
    showPage('home');
}

// --- ULASAN AKSI ---
function checkReviewAccess() {
    if (isLogged) {
        const form = document.getElementById('reviewForm');
        form.style.display = (form.style.display === 'none') ? 'block' : 'none';
    } else {
        alert("Silakan LOGIN terlebih dahulu untuk memberikan ulasan.");
        showPage('login');
    }
}

function submitReview() {
    const text = document.getElementById('revText').value;
    
    if (currentRating === 0) {
        alert("Silakan pilih rating bintang terlebih dahulu!");
        return;
    }

    if (text.trim() !== "") {
        const list = document.getElementById('reviewList');
        const box = document.createElement('div');
        box.className = 'review-box-custom';
        
        let starsStr = "";
        for (let i = 1; i <= 5; i++) {
            starsStr += i <= currentRating ? '★' : '☆';
        }

        box.innerHTML = `
            <div class="rev-header">
                <div class="user-avatar"><i class="fas fa-user-circle"></i></div>
                <div>
                    <h4>${userEmail}</h4>
                    <small>Baru saja</small>
                </div>
            </div>
            <div class="stars mb-1">${starsStr}</div>
            <p>${text}</p>
        `;
        
        list.prepend(box);
        
        // Reset Form
        document.getElementById('revText').value = "";
        currentRating = 0;
        document.querySelectorAll('.star-rating-input i').forEach(s => s.classList.remove('active'));
        document.getElementById('ratingStatus').innerText = "Pilih Rating";
        document.getElementById('reviewForm').style.display = 'none';
        
        alert("Ulasan berhasil dikirim!");
    } else {
        alert("Tuliskan ulasanmu dulu ya.");
    }
}
