let isLogged = false;
let userEmail = "";
let currentRating = 0; // Menyimpan pilihan rating bintang

window.onload = () => {
    loadReviews();     // Muat ulasan dari LocalStorage
    initStarRating();  // Aktifkan sistem klik bintang
};

// --- NAVIGATION LOGIC ---
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // Update active state di Navbar
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active-nav');
        if(item.innerText.toLowerCase() === id || (id === 'search' && item.innerText === 'SURVEYOR')) {
            item.classList.add('active-nav');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- STAR RATING INPUT LOGIC ---
function initStarRating() {
    const stars = document.querySelectorAll('.star-rating-input i');
    const status = document.getElementById('ratingStatus');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = star.getAttribute('data-value');
            
            // Nyalakan bintang sampai indeks yang diklik
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
        userEmail = email.split('@')[0]; // Ambil nama depan email
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

// --- REVIEW LOGIC ---
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
        const newReview = {
            id: Date.now(),
            name: userEmail,
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            content: text,
            rating: currentRating
        };

        // Simpan ke LocalStorage
        let reviews = JSON.parse(localStorage.getItem('surveyin_v3_data')) || [];
        reviews.unshift(newReview);
        localStorage.setItem('surveyin_v3_data', JSON.stringify(reviews));

        renderReview(newReview, true);
        
        // Reset form ulasan
        resetReviewForm();
        alert("Ulasan berhasil dikirim!");
    } else {
        alert("Tuliskan ulasanmu dulu ya.");
    }
}

function resetReviewForm() {
    document.getElementById('revText').value = "";
    currentRating = 0;
    document.querySelectorAll('.star-rating-input i').forEach(s => s.classList.remove('active'));
    document.getElementById('ratingStatus').innerText = "Pilih Rating";
    document.getElementById('reviewForm').style.display = 'none';
}

function renderReview(data, isNew = false) {
    const list = document.getElementById('reviewList');
    const box = document.createElement('div');
    box.className = 'review-box';
    
    // Generate bintang berdasarkan rating
    let stars = "";
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="${i <= data.rating ? 'fas' : 'far'} fa-star"></i> `;
    }

    box.innerHTML = `
        <p><strong><i class="fas fa-user-circle"></i> ${data.name}</strong> <small>— ${data.date}</small></p>
        <p class="stars">${stars}</p>
        <p>"${data.content}"</p>
    `;
    
    isNew ? list.prepend(box) : list.appendChild(box);
}

function loadReviews() {
    let saved = JSON.parse(localStorage.getItem('surveyin_v3_data')) || [];
    if (saved.length === 0) {
        // Data contoh jika belum ada ulasan sama sekali
        renderReview({ name: "Andi Wijaya", date: "17 April 2026", content: "Layanannya oke bangeet, surveyor jujur dan detail!", rating: 5 });
    } else {
        saved.forEach(r => renderReview(r));
    }
}
