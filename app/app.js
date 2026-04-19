'use strict';

// ── Movie clip data ──────────────────────────────────────────────────────────
// Videos: Google's public sample video bucket (Creative Commons licensed test content)
const CLIPS = [
  {
    id: 1,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'The Shawshank Redemption',
    year: 1994,
    director: 'Frank Darabont',
    scene: 'The Great Escape',
    genres: ['Drama', 'Crime'],
    rating: 'R',
    likes: 2400000,
    comments: 18500,
    shares: 95200,
    description: 'Andy Dufresne crawls to freedom through 500 yards of the most foul-smelling sludge imaginable — a testament to hope that refuses to die.',
    streamLink: '#',
  },
  {
    id: 2,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Interstellar',
    year: 2014,
    director: 'Christopher Nolan',
    scene: 'Beyond the Horizon',
    genres: ['Sci-Fi', 'Drama'],
    rating: 'PG-13',
    likes: 3800000,
    comments: 52000,
    shares: 210000,
    description: 'Cooper crosses the event horizon — where time collapses and love becomes the only force that transcends dimensions.',
    streamLink: '#',
  },
  {
    id: 3,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Spirited Away',
    year: 2001,
    director: 'Hayao Miyazaki',
    scene: 'The Spirit World',
    genres: ['Animation', 'Fantasy'],
    rating: 'PG',
    likes: 5100000,
    comments: 87000,
    shares: 340000,
    description: 'Chihiro steps into a world of spirits, gods, and monsters — a breathtaking journey of courage hidden in a bathhouse at the edge of reality.',
    streamLink: '#',
  },
  {
    id: 4,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    title: 'Mad Max: Fury Road',
    year: 2015,
    director: 'George Miller',
    scene: 'Witness Me',
    genres: ['Action', 'Sci-Fi'],
    rating: 'R',
    likes: 4200000,
    comments: 61000,
    shares: 188000,
    description: 'A relentless chrome-and-fire symphony of survival hurtling through a post-apocalyptic wasteland at 100 mph.',
    streamLink: '#',
  },
  {
    id: 5,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'Inception',
    year: 2010,
    director: 'Christopher Nolan',
    scene: 'Dream Within a Dream',
    genres: ['Sci-Fi', 'Thriller'],
    rating: 'PG-13',
    likes: 3600000,
    comments: 44000,
    shares: 156000,
    description: 'The city folds in on itself as Cobb navigates the labyrinth of another man\'s subconscious — reality bends, rules shatter.',
    streamLink: '#',
  },
  {
    id: 6,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    title: 'Pulp Fiction',
    year: 1994,
    director: 'Quentin Tarantino',
    scene: 'Bring Out the Gimp',
    genres: ['Crime', 'Drama'],
    rating: 'R',
    likes: 2900000,
    comments: 38000,
    shares: 121000,
    description: 'Non-linear storytelling at its most electric — where fate, coincidence, and cool collide in Tarantino\'s LA.',
    streamLink: '#',
  },
  {
    id: 7,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    title: 'The Dark Knight',
    year: 2008,
    director: 'Christopher Nolan',
    scene: 'Why So Serious?',
    genres: ['Action', 'Crime'],
    rating: 'PG-13',
    likes: 6700000,
    comments: 112000,
    shares: 490000,
    description: 'Ledger\'s Joker dismantles order with a smile — an agent of chaos who holds Gotham\'s soul at knifepoint.',
    streamLink: '#',
  },
  {
    id: 8,
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    title: 'No Country for Old Men',
    year: 2007,
    director: 'Coen Brothers',
    scene: 'Call It',
    genres: ['Thriller', 'Crime'],
    rating: 'R',
    likes: 1900000,
    comments: 29000,
    shares: 74000,
    description: 'Anton Chigurh flips a coin and the universe holds its breath — fate reduced to a quarter on a gas station counter.',
    streamLink: '#',
  },
];

// ── State ────────────────────────────────────────────────────────────────────
let isMuted = true;
let activeCard = null;
let lastTapTime = 0;
let lastTapCard = null;
const likedSet = new Set();
const watchlistSet = new Set();
const rafMap = new Map(); // cardId → requestAnimationFrame id

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── Build card DOM ────────────────────────────────────────────────────────────
function buildCard(clip) {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.dataset.id = clip.id;

  const genreTags = clip.genres.map(g => `<span class="genre-tag">${g}</span>`).join('');

  card.innerHTML = `
    <div class="video-bg">
      <video muted playsinline preload="none" tabindex="-1" aria-hidden="true">
        <source src="${clip.src}" type="video/mp4">
      </video>
    </div>

    <video class="video-main" loop playsinline preload="metadata" tabindex="-1">
      <source src="${clip.src}" type="video/mp4">
    </video>

    <div class="pause-icon" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    </div>

    <div class="video-info">
      <div class="genre-tags">${genreTags}</div>
      <h2 class="movie-title">${clip.title}</h2>
      <div class="movie-meta">
        <span class="year">${clip.year}</span>
        <span class="dot">·</span>
        <span class="director">${clip.director}</span>
        <span class="dot">·</span>
        <span>${clip.rating}</span>
      </div>
      <div class="scene-label">▶ ${clip.scene}</div>
      <p class="movie-desc">${clip.description}</p>
    </div>

    <div class="actions">
      <button class="action-btn like-btn" data-id="${clip.id}" aria-label="Like">
        <div class="action-icon">
          <svg width="26" height="26" viewBox="0 0 24 24">
            <path class="heart-fill" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <span class="count like-count">${formatCount(clip.likes)}</span>
      </button>

      <button class="action-btn comment-btn" data-id="${clip.id}" aria-label="Comments">
        <div class="action-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span class="count">${formatCount(clip.comments)}</span>
      </button>

      <button class="action-btn share-btn" data-id="${clip.id}" aria-label="Share">
        <div class="action-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </div>
        <span class="count">${formatCount(clip.shares)}</span>
      </button>

      <button class="action-btn watchlist-btn" data-id="${clip.id}" aria-label="Save to watchlist">
        <div class="action-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span class="count">Save</span>
      </button>

      <button class="action-btn info-btn" data-id="${clip.id}" aria-label="More info">
        <div class="action-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <span class="count">Info</span>
      </button>
    </div>

    <button class="mute-btn" aria-label="Toggle mute">
      ${muteIcon(isMuted)}
    </button>

    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  `;

  return card;
}

function muteIcon(muted) {
  return muted
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
       </svg>`;
}

// ── Video playback ────────────────────────────────────────────────────────────
function playCard(card) {
  if (!card) return;
  const vid = card.querySelector('.video-main');
  const bgVid = card.querySelector('.video-bg video');
  vid.muted = isMuted;
  bgVid.muted = true;

  vid.play().catch(() => {});
  bgVid.play().catch(() => {});
  startProgress(card);
}

function pauseCard(card) {
  if (!card) return;
  const vid = card.querySelector('.video-main');
  const bgVid = card.querySelector('.video-bg video');
  vid.pause();
  bgVid.pause();
  stopProgress(card);
}

function startProgress(card) {
  const id = +card.dataset.id;
  stopProgress(card);

  const vid = card.querySelector('.video-main');
  const fill = card.querySelector('.progress-fill');

  function tick() {
    if (!vid.paused && vid.duration) {
      fill.style.width = (vid.currentTime / vid.duration * 100) + '%';
    }
    rafMap.set(id, requestAnimationFrame(tick));
  }
  rafMap.set(id, requestAnimationFrame(tick));
}

function stopProgress(card) {
  const id = +card.dataset.id;
  if (rafMap.has(id)) {
    cancelAnimationFrame(rafMap.get(id));
    rafMap.delete(id);
  }
}

// ── Intersection Observer ─────────────────────────────────────────────────────
function initObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        if (activeCard && activeCard !== entry.target) {
          pauseCard(activeCard);
        }
        activeCard = entry.target;
        playCard(activeCard);
      } else if (!entry.isIntersecting && entry.target === activeCard) {
        pauseCard(activeCard);
      }
    });
  }, { threshold: [0.6] });

  document.querySelectorAll('.video-card').forEach(card => observer.observe(card));
}

// ── Interactions ──────────────────────────────────────────────────────────────
function handleLike(btn) {
  const id = +btn.dataset.id;
  const clip = CLIPS.find(c => c.id === id);
  const isLiked = likedSet.has(id);

  if (isLiked) {
    likedSet.delete(id);
    clip.likes--;
    btn.classList.remove('liked');
  } else {
    likedSet.add(id);
    clip.likes++;
    btn.classList.add('liked');
    btn.classList.add('pop');
    btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
  }

  btn.querySelector('.like-count').textContent = formatCount(clip.likes);
}

function handleWatchlist(btn) {
  const id = +btn.dataset.id;
  if (watchlistSet.has(id)) {
    watchlistSet.delete(id);
    btn.classList.remove('saved');
    btn.querySelector('.count').textContent = 'Save';
    showToast('Removed from Watchlist');
  } else {
    watchlistSet.add(id);
    btn.classList.add('saved');
    btn.querySelector('.count').textContent = 'Saved';
    showToast('Added to Watchlist');
  }
}

function handleShare(btn) {
  const id = +btn.dataset.id;
  const clip = CLIPS.find(c => c.id === id);
  if (navigator.share) {
    navigator.share({ title: clip.title + ' — ' + clip.scene, text: clip.description });
  } else {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    showToast('Link copied to clipboard');
  }
}

function handleInfo(btn) {
  const id = +btn.dataset.id;
  const clip = CLIPS.find(c => c.id === id);
  openInfoPanel(clip);
}

function handleMute(btn) {
  isMuted = !isMuted;
  btn.innerHTML = muteIcon(isMuted);

  if (activeCard) {
    activeCard.querySelector('.video-main').muted = isMuted;
  }

  // sync all mute buttons
  document.querySelectorAll('.mute-btn').forEach(b => { b.innerHTML = muteIcon(isMuted); });
}

function handleTap(card, e) {
  const now = Date.now();
  const isDoubleTap = now - lastTapTime < 300 && lastTapCard === card;

  if (isDoubleTap) {
    const id = +card.dataset.id;
    const likeBtn = card.querySelector('.like-btn');
    if (!likedSet.has(id)) handleLike(likeBtn);
    showDoubleTapHeart(e);
  } else {
    // single tap = toggle play/pause
    const vid = card.querySelector('.video-main');
    const pauseEl = card.querySelector('.pause-icon');
    if (vid.paused) {
      vid.play().catch(() => {});
      card.querySelector('.video-bg video').play().catch(() => {});
      startProgress(card);
      pauseEl.classList.remove('show');
    } else {
      vid.pause();
      card.querySelector('.video-bg video').pause();
      stopProgress(card);
      pauseEl.classList.add('show');
      setTimeout(() => pauseEl.classList.add('hide'), 800);
      setTimeout(() => { pauseEl.classList.remove('show', 'hide'); }, 1000);
    }
  }

  lastTapTime = now;
  lastTapCard = card;
}

function showDoubleTapHeart(e) {
  const heart = document.getElementById('doubletapHeart');
  const x = e.clientX || (e.touches && e.touches[0]?.clientX) || window.innerWidth / 2;
  const y = e.clientY || (e.touches && e.touches[0]?.clientY) || window.innerHeight / 2;

  heart.style.left = x + 'px';
  heart.style.top = y + 'px';
  heart.classList.remove('burst');
  void heart.offsetWidth; // reflow
  heart.classList.add('burst');
}

// ── Info panel ────────────────────────────────────────────────────────────────
function openInfoPanel(clip) {
  const panel = document.getElementById('infoPanel');
  const backdrop = document.getElementById('panelBackdrop');

  panel.querySelector('.info-panel-title').textContent = clip.title;
  panel.querySelector('.info-panel-meta').textContent =
    `${clip.year} · Directed by ${clip.director} · ${clip.rating}`;
  panel.querySelector('.info-panel-desc').textContent = clip.description;

  const tagsEl = panel.querySelector('.info-panel-tags');
  tagsEl.innerHTML = clip.genres.map(g => `<span class="info-tag">${g}</span>`).join('') +
    `<span class="info-tag">Scene: ${clip.scene}</span>`;

  panel.classList.add('open');
  backdrop.classList.add('visible');
}

function closeInfoPanel() {
  document.getElementById('infoPanel').classList.remove('open');
  document.getElementById('panelBackdrop').classList.remove('visible');
}

// ── Event delegation ──────────────────────────────────────────────────────────
function attachFeedListeners(feed) {
  feed.addEventListener('click', e => {
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) { e.stopPropagation(); handleLike(likeBtn); return; }

    const watchBtn = e.target.closest('.watchlist-btn');
    if (watchBtn) { e.stopPropagation(); handleWatchlist(watchBtn); return; }

    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) { e.stopPropagation(); handleShare(shareBtn); return; }

    const infoBtn = e.target.closest('.info-btn');
    if (infoBtn) { e.stopPropagation(); handleInfo(infoBtn); return; }

    const muteBtn = e.target.closest('.mute-btn');
    if (muteBtn) { e.stopPropagation(); handleMute(muteBtn); return; }

    const card = e.target.closest('.video-card');
    if (card) handleTap(card, e);
  });

  feed.addEventListener('touchend', e => {
    const muteBtn = e.target.closest('.mute-btn');
    if (muteBtn) return;
    const btn = e.target.closest('.action-btn');
    if (btn) return;

    const card = e.target.closest('.video-card');
    if (card) handleTap(card, e);
  }, { passive: true });
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.nav === 'add') { showToast('Upload coming soon'); return; }
      if (btn.dataset.nav === 'home') {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const feed = document.getElementById('feed');
        feed.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast('Coming soon');
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function init() {
  const feed = document.getElementById('feed');

  // Build cards
  CLIPS.forEach(clip => {
    const card = buildCard(clip);
    feed.appendChild(card);
  });

  // Info panel skeleton
  const panel = document.createElement('div');
  panel.className = 'info-panel';
  panel.id = 'infoPanel';
  panel.innerHTML = `
    <div class="info-panel-handle"></div>
    <h3 class="info-panel-title"></h3>
    <p class="info-meta info-panel-meta"></p>
    <p class="info-desc info-panel-desc"></p>
    <div class="info-tags info-panel-tags"></div>
    <button class="watch-full-btn">Watch Full Movie</button>
  `;
  document.body.appendChild(panel);

  const backdrop = document.createElement('div');
  backdrop.className = 'panel-backdrop';
  backdrop.id = 'panelBackdrop';
  backdrop.addEventListener('click', closeInfoPanel);
  document.body.appendChild(backdrop);

  panel.querySelector('.watch-full-btn').addEventListener('click', () => {
    showToast('Opening streaming service...');
    closeInfoPanel();
  });

  // Toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.id = 'toast';
  document.body.appendChild(toast);

  // Wire events
  attachFeedListeners(feed);
  initObserver();
  initTabs();
  initNav();

  // Auto-play first card
  const firstCard = feed.querySelector('.video-card');
  if (firstCard) {
    activeCard = firstCard;
    playCard(firstCard);
  }
}

document.addEventListener('DOMContentLoaded', init);
