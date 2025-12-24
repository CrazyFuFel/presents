// ===== Canvas particles (restored repulsion + lines) =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

const DEFAULTS = {
  particleCount: 85,
  connectionDistance: 150,
  mouseRadius: 130,
  speedMul: 0.75
};

const STORAGE_KEY = 'sd_motion';
const STORAGE_LANG = 'sd_lang';

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

let targetParticleCount = DEFAULTS.particleCount;
let connectionDistance = DEFAULTS.connectionDistance;
let mouse = { x: null, y: null, radius: DEFAULTS.mouseRadius };
let particles = [];
let motionEnabled = true;

class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 3.5 + 1.5;
    this.speedX = (Math.random() * 2 - 1) * DEFAULTS.speedMul;
    this.speedY = (Math.random() * 2 - 1) * DEFAULTS.speedMul;
    this.baseSpeedX = this.speedX;
    this.baseSpeedY = this.speedY;
    this.color = `hsl(${Math.random() * 60 + 200}, 70%, 60%)`;
  }

  update() {
    if (!motionEnabled) return;

    if (mouse.x != null && mouse.y != null) {
      let dx = this.x - mouse.x;
      let dy = this.y - mouse.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius) {
        let force = (mouse.radius - distance) / mouse.radius;
        if (distance === 0) distance = 0.001;
        let directionX = dx / distance;
        let directionY = dy / distance;

        this.speedX = directionX * force * 5 + this.baseSpeedX;
        this.speedY = directionY * force * 5 + this.baseSpeedY;
      } else {
        this.speedX += (this.baseSpeedX - this.speedX) * 0.1;
        this.speedY += (this.baseSpeedY - this.speedY) * 0.1;
      }
    } else {
      this.speedX += (this.baseSpeedX - this.speedX) * 0.03;
      this.speedY += (this.baseSpeedY - this.speedY) * 0.03;
    }

    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > width) {
      this.speedX *= -1;
      this.baseSpeedX *= -1;
    }
    if (this.y < 0 || this.y > height) {
      this.speedY *= -1;
      this.baseSpeedY *= -1;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < targetParticleCount; i++) particles.push(new Particle());
}

function connectParticles() {
  if (!motionEnabled) return;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      let dx = particles[i].x - particles[j].x;
      let dy = particles[i].y - particles[j].y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < connectionDistance) {
        ctx.strokeStyle = particles[i].color;
        ctx.lineWidth = 0.7;
        ctx.globalAlpha = (1 - distance / connectionDistance) * 0.4;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  for (let p of particles) {
    p.update();
    p.draw();
  }
  connectParticles();
  requestAnimationFrame(animate);
}

// ===== Motion toggle (expanded: disables tilt/parallax/reveal) =====
function setReducedEffects(enabled) {
  document.body.classList.toggle('reduced-motion', !enabled);
}

function applyMotion(enabled, reason = 'user') {
  motionEnabled = enabled;

  // Also disable additional effects (tilt/parallax/reveal) via class
  setReducedEffects(enabled);

  if (!enabled) {
    targetParticleCount = 45;
    connectionDistance = 0;
    mouse.radius = 0;
  } else {
    targetParticleCount = DEFAULTS.particleCount;
    connectionDistance = DEFAULTS.connectionDistance;
    mouse.radius = DEFAULTS.mouseRadius;
  }

  initParticles();

  const toggle = document.getElementById('motionToggle');
  if (toggle) {
    toggle.classList.toggle('is-on', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
  }

  if (reason === 'user') localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
}

function initMotion() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved && mqReduce.matches) {
    applyMotion(false, 'system');
    return;
  }

  if (saved === 'off') applyMotion(false, 'system');
  else applyMotion(true, 'system');

  mqReduce.addEventListener?.('change', (e) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return;
    applyMotion(!e.matches, 'system');
  });

  const motionToggle = document.getElementById('motionToggle');
  if (motionToggle) motionToggle.addEventListener('click', () => applyMotion(!motionEnabled, 'user'));
}

// ===== Resize + mouse =====
window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initParticles();
});

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// ===== Active section highlight =====
const navLinks = Array.from(document.querySelectorAll('.topnav__link'));
const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

const obs = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(e => e.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;

  navLinks.forEach(a => a.classList.remove('is-active'));
  const id = '#' + visible.target.id;
  const active = navLinks.find(a => a.getAttribute('href') === id);
  if (active) active.classList.add('is-active');
}, { root: null, threshold: [0.15, 0.25, 0.35, 0.5, 0.7] });

sections.forEach(s => obs.observe(s));

// ===== Reveal on scroll =====
const revealEls = Array.from(document.querySelectorAll('.reveal'));
const revObs = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-in');
}, { threshold: 0.14 });

revealEls.forEach(el => revObs.observe(el));

// ===== Parallax (hero) + tilt (cards) =====
let px = 0, py = 0;
window.addEventListener('mousemove', (e) => {
  px = (e.clientX / window.innerWidth) - 0.5;
  py = (e.clientY / window.innerHeight) - 0.5;
});

function rafEffects() {
  const reduced = mqReduce.matches || document.body.classList.contains('reduced-motion') || !motionEnabled;

  const parallaxEls = document.querySelectorAll('.js-parallax');
  parallaxEls.forEach(el => {
    if (reduced) return (el.style.transform = '');
    const k = parseFloat(el.dataset.parallax || '0.25');
    const tx = px * 18 * k;
    const ty = py * 12 * k;
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  });

  requestAnimationFrame(rafEffects);
}
requestAnimationFrame(rafEffects);

// Tilt on cards (light)
document.addEventListener('mousemove', (e) => {
  const reduced = mqReduce.matches || document.body.classList.contains('reduced-motion') || !motionEnabled;
  if (reduced) return;

  const card = e.target.closest?.('.js-tilt');
  if (!card) return;

  const r = card.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width;
  const my = (e.clientY - r.top) / r.height;
  const tilt = 6 * (parseFloat(card.dataset.tilt || '1'));
  const rx = (my - 0.5) * -tilt;
  const ry = (mx - 0.5) * tilt;

  card.style.transform = `translateY(-6px) scale(1.01) rotateX(${rx}deg) rotateY(${ry}deg)`;
});

document.addEventListener('mouseleave', () => {
  document.querySelectorAll('.js-tilt').forEach(c => c.style.transform = '');
});

// ===== Project filters =====
const filters = Array.from(document.querySelectorAll('.filter'));
const projectsGrid = document.getElementById('projectsGrid');
const projectCards = projectsGrid ? Array.from(projectsGrid.querySelectorAll('.js-case')) : [];

function applyFilter(tag) {
  projectCards.forEach(card => {
    const tags = (card.dataset.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    const show = tag === 'all' ? true : tags.includes(tag);
    card.style.display = show ? '' : 'none';
  });
}

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => {
      b.classList.remove('is-active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-selected', 'true');
    applyFilter(btn.dataset.filter);
  });
});

// ===== Premium hover dim (projects) =====
if (projectsGrid) {
  projectsGrid.addEventListener('mouseover', (e) => {
    const card = e.target.closest?.('.card');
    if (!card) return;
    projectsGrid.classList.add('is-dim');
    projectCards.forEach(c => c.classList.toggle('is-hovered', c === card));
  });

  projectsGrid.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget;
    if (related && projectsGrid.contains(related)) return;
    projectsGrid.classList.remove('is-dim');
    projectCards.forEach(c => c.classList.remove('is-hovered'));
  });
}

// ===== Case modal + media carousel =====
const modal = document.getElementById('caseModal');
const caseTitle = document.getElementById('caseTitle');
const caseRole = document.getElementById('caseRole');
const caseStack = document.getElementById('caseStack');
const caseProblem = document.getElementById('caseProblem');
const caseSolution = document.getElementById('caseSolution');
const caseResult = document.getElementById('caseResult');
const caseLink = document.getElementById('caseLink');

const mediaWrap = document.getElementById('mediaWrap');
const mediaStage = document.getElementById('mediaStage');
const mediaDots = document.getElementById('mediaDots');
const mediaPrev = document.getElementById('mediaPrev');
const mediaNext = document.getElementById('mediaNext');

let lastFocus = null;
let currentMedia = [];
let mediaIndex = 0;

function parseMedia(card) {
  try {
    const raw = card.dataset.media;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function renderMedia() {
  if (!mediaWrap) return;

  mediaStage.innerHTML = '';
  mediaDots.innerHTML = '';

  if (!currentMedia.length) {
    mediaWrap.style.display = 'none';
    return;
  }

  mediaWrap.style.display = '';
  const item = currentMedia[Math.max(0, Math.min(mediaIndex, currentMedia.length - 1))];

  if (item.type === 'video') {
    const v = document.createElement('video');
    v.controls = true;
    v.playsInline = true;
    v.src = item.src;
    if (item.poster) v.poster = item.poster;
    v.setAttribute('aria-label', item.alt || 'Video');
    mediaStage.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt || 'Media';
    mediaStage.appendChild(img);
  }

  currentMedia.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'media__dot' + (i === mediaIndex ? ' is-active' : '');
    mediaDots.appendChild(d);
  });

  if (mediaPrev) mediaPrev.disabled = currentMedia.length <= 1;
  if (mediaNext) mediaNext.disabled = currentMedia.length <= 1;
}

function setMediaFromCard(card) {
  currentMedia = parseMedia(card);
  mediaIndex = 0;
  renderMedia();
}

function openModalFromCard(card) {
  if (!modal) return;
  lastFocus = document.activeElement;

  const lang = getLang();
  const title = (lang === 'en' ? (card.dataset.titleEn || card.dataset.title) : card.dataset.title) || 'Проект';
  const role = (lang === 'en' ? (card.dataset.roleEn || card.dataset.role) : card.dataset.role) || 'Роль';
  const problem = (lang === 'en' ? (card.dataset.problemEn || card.dataset.problem) : card.dataset.problem) || '';
  const solution = (lang === 'en' ? (card.dataset.solutionEn || card.dataset.solution) : card.dataset.solution) || '';
  const result = (lang === 'en' ? (card.dataset.resultEn || card.dataset.result) : card.dataset.result) || '';

  caseTitle.textContent = title;
  caseRole.textContent = role;
  caseStack.textContent = card.dataset.stack || 'Стек';
  caseProblem.textContent = problem;
  caseSolution.textContent = solution;
  caseResult.textContent = result;

  // Требование: любая карточка проекта открывает ссылку на комьюнити
  const communityUrl = 'https://t.me/FD_communit';
  caseLink.setAttribute('href', communityUrl);

  setMediaFromCard(card);

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal__close')?.focus();
}

function closeModalAny(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('is-open');
  modalEl.setAttribute('aria-hidden', 'true');
  lastFocus?.focus?.();
}

document.addEventListener('click', (e) => {
  const card = e.target.closest?.('.js-case');
  if (card) {
    e.preventDefault();
    openModalFromCard(card);
    return;
  }

  const openModals = Array.from(document.querySelectorAll('.modal.is-open'));
  if (openModals.length) {
    const close = e.target.closest?.('[data-close="true"]');
    if (close) openModals.forEach(m => closeModalAny(m));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = Array.from(document.querySelectorAll('.modal.is-open'));
    if (openModals.length) openModals.forEach(m => closeModalAny(m));
    closeConsole();
  }
});

if (mediaPrev) {
  mediaPrev.addEventListener('click', () => {
    if (!currentMedia.length) return;
    mediaIndex = (mediaIndex - 1 + currentMedia.length) % currentMedia.length;
    renderMedia();
  });
}

if (mediaNext) {
  mediaNext.addEventListener('click', () => {
    if (!currentMedia.length) return;
    mediaIndex = (mediaIndex + 1) % currentMedia.length;
    renderMedia();
  });
}

// ===== Resume modal =====
const resumeModal = document.getElementById('resumeModal');
const openResumeModalBtn = document.getElementById('openResumeModal');

if (openResumeModalBtn) {
  openResumeModalBtn.addEventListener('click', () => {
    lastFocus = document.activeElement;
    resumeModal.classList.add('is-open');
    resumeModal.setAttribute('aria-hidden', 'false');
    resumeModal.querySelector('.modal__close')?.focus();
  });
}

// ===== Console widget =====
const consoleEl = document.getElementById('console');
const openConsoleBtn = document.getElementById('openConsole');
const consoleBody = document.getElementById('consoleBody');
const consoleForm = document.getElementById('consoleForm');
const consoleInput = document.getElementById('consoleInput');

function printLine(html, cls = 'console__line') {
  const div = document.createElement('div');
  div.className = cls;
  div.innerHTML = html;
  consoleBody.appendChild(div);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function openConsole() {
  if (!consoleEl) return;
  lastFocus = document.activeElement;
  consoleEl.classList.add('is-open');
  consoleEl.setAttribute('aria-hidden', 'false');

  if (!consoleBody.dataset.booted) {
    consoleBody.dataset.booted = '1';
    printLine(`<span class="console__muted">type</span> <span class="console__cmd">help</span> <span class="console__muted">to see commands</span>`);
  }
  setTimeout(() => consoleInput?.focus(), 30);
}

function closeConsole() {
  if (!consoleEl) return;
  if (!consoleEl.classList.contains('is-open')) return;
  consoleEl.classList.remove('is-open');
  consoleEl.setAttribute('aria-hidden', 'true');
  lastFocus?.focus?.();
}

if (openConsoleBtn) openConsoleBtn.addEventListener('click', openConsole);

document.addEventListener('click', (e) => {
  const close = e.target.closest?.('[data-console-close="true"]');
  if (close) closeConsole();
});

function runCommand(cmdRaw) {
  const cmd = (cmdRaw || '').trim().toLowerCase();
  if (!cmd) return;

  printLine(`<span class="console__muted">$</span> <span class="console__cmd">${cmd}</span>`);

  const lang = getLang();
  const t = (ru, en) => (lang === 'en' ? en : ru);

  if (cmd === 'help') {
    printLine(t(
      `Команды: <span class="console__cmd">projects</span>, <span class="console__cmd">contact</span>, <span class="console__cmd">resume</span>, <span class="console__cmd">lang</span>, <span class="console__cmd">clear</span>`,
      `Commands: <span class="console__cmd">projects</span>, <span class="console__cmd">contact</span>, <span class="console__cmd">resume</span>, <span class="console__cmd">lang</span>, <span class="console__cmd">clear</span>`
    ));
    return;
  }

  if (cmd === 'clear') {
    consoleBody.innerHTML = '';
    return;
  }

  if (cmd === 'projects') {
    closeConsole();
    document.querySelector('#projects')?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto' });
    return;
  }

  if (cmd === 'contact') {
    closeConsole();
    document.querySelector('#contact')?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto' });
    return;
  }

  if (cmd === 'resume') {
    closeConsole();
    document.querySelector('#resume')?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto' });
    return;
  }

  if (cmd === 'lang') {
    toggleLang();
    printLine(`<span class="console__ok">${t('Язык переключён.', 'Language toggled.')}</span>`);
    return;
  }

  printLine(`<span class="console__warn">${t('Неизвестная команда. Напиши help.', 'Unknown command. Type help.')}</span>`);
}

if (consoleForm) {
  consoleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = consoleInput.value;
    consoleInput.value = '';
    runCommand(v);
  });
}

// ===== Language RU/EN =====
const I18N = {
  ru: {
    nav_about: 'Обо мне',
    nav_skills: 'Навыки',
    nav_projects: 'Проекты',
    nav_resume: 'Резюме',
    nav_contact: 'Контакты',
    hero_subtitle: 'Software developer',
    hero_desc: 'Telegram-боты, web. Python/JS, API, UI/UX.',
    cta_projects: 'Проекты',
    cta_skills: 'Навыки',
    cta_resume: 'Резюме',
    cta_console: 'Консоль',

    about_title: 'Обо мне',
    about_card1_title: 'Фокус',
    about_card1_text: 'Telegram-боты, автоматизация, интеграции с API и web-интерфейсы. Делаю быстро, аккуратно и с упором на стабильность.',
    about_card2_title: 'Подход',
    about_card2_text: 'От идеи до результата: логика, антифлуд/антидетект, хранение данных, админка, WebApp, деплой и поддержка.',
    about_card3_title: 'Цель',
    about_card3_text: 'Собираю портфолио и ищу проекты, где важны автоматизация, скорость разработки и качество UX.',

    numbers_title: 'Цифры',
    numbers_hint: 'Быстро про масштаб',
    numbers_projects: 'Проектов',
    numbers_bots: 'Ботов',
    numbers_integrations: 'Интеграций',
    numbers_deploys: 'Деплоев',
    numbers_years: 'Лет опыта',

    skills_title: 'Навыки',
    skills_1: 'Telegram-боты: aiogram/telethon, JSON/SQLite, прокси, антифлуд/антидетект, админки.',
    skills_2: 'Создаю дизайн, сайты, программы, ботов и скрипты через ИИ: быстро собираю прототип, довожу до рабочего результата и интегрирую с API.',
    skills_3: 'Проектирование интерфейсов: удобство, визуальная чистота, понятный пользовательский опыт.',
    skills_4: 'Современные сайты: интерактив, адаптивность, JS-функционал и аккуратная анимация.',
    skills_5: 'Полный цикл: интерфейс → сервер. React/Node.js для комплексных решений.',
    skills_6_title: 'Скрипты + API',
    skills_6: 'Скрипты и интеграции: Telegram, платёжки, сервисы, API моделей ИИ.',

    projects_title: 'Проекты',
    projects_hint: 'Клик по карточке — подробности + медиа',
    open_case: 'Открыть кейс →',
    filter_all: 'Все',
    filter_automation: 'Automation',

    p1_title: 'Telegram рассылка',
    p1_desc: 'Скрипт рассылки по чатам Telegram с гибкой настройкой, антидетект-логикой и поддержкой прокси.',
    p2_title: 'Лендинг портфолио',
    p2_desc: 'Одностраничный сайт с анимациями, модалками и “dev-вау” фишками.',
    p3_desc: 'Сбор IP и базовой информации, а также установка индивидуального пароля для каждого устройства.',

    resume: 'Резюме',
    resume_aria: 'Открыть резюме',
    resume_title: 'Resume / CV',
    resume_hint: 'PDF внутри страницы + скачать',
    resume_download: 'Скачать PDF',
    resume_open: 'Открыть в модалке',

    quick_contact: 'Связь',
    quick_contact_aria: 'Быстрый контакт (скролл вниз)',

    contact_title: 'Контакты',
    contact_community: 'Комьюнити',

    modal_problem: 'Задача',
    modal_solution: 'Решение',
    modal_result: 'Результат',
    modal_open_link: 'Открыть ссылку',

    motion: 'Motion',
    console_title: 'Командная строка'
  },

  en: {
    nav_about: 'About',
    nav_skills: 'Skills',
    nav_projects: 'Projects',
    nav_resume: 'Resume',
    nav_contact: 'Contact',
    hero_subtitle: 'Software developer',
    hero_desc: 'Telegram bots, web. Python/JS, APIs, UI/UX.',
    cta_projects: 'Projects',
    cta_skills: 'Skills',
    cta_resume: 'Resume',
    cta_console: 'Console',

    about_title: 'About',
    about_card1_title: 'Focus',
    about_card1_text: 'Telegram bots, automation, API integrations and web interfaces. Fast delivery with stability first.',
    about_card2_title: 'Process',
    about_card2_text: 'From idea to result: logic, anti-flood/anti-detect, storage, admin, WebApp, deploy and support.',
    about_card3_title: 'Goal',
    about_card3_text: 'Building a portfolio and looking for projects where automation speed and UX quality matter.',

    numbers_title: 'Numbers',
    numbers_hint: 'Quick scale overview',
    numbers_projects: 'Projects',
    numbers_bots: 'Bots',
    numbers_integrations: 'Integrations',
    numbers_deploys: 'Deploys',
    numbers_years: 'Years exp',

    skills_title: 'Skills',
    skills_1: 'Telegram bots: aiogram/telethon, JSON/SQLite, proxies, anti-flood/anti-detect, admin panels.',
    skills_2: 'Building designs, websites, apps, bots and scripts with AI: fast prototyping, polishing to production-ready results, and integrating with APIs.',
    skills_3: 'Interface design: usability, clean visuals, clear user flow.',
    skills_4: 'Modern websites: interactivity, responsive UI, JS features and clean motion.',
    skills_5: 'Full cycle: UI → server. React/Node.js for complete solutions.',
    skills_6_title: 'Scripts + APIs',
    skills_6: 'Scripts and integrations: Telegram, payments, services, AI model APIs.',

    projects_title: 'Projects',
    projects_hint: 'Click a card — details + media',
    open_case: 'Open case →',
    filter_all: 'All',
    filter_automation: 'Automation',

    p1_title: 'Telegram mailer',
    p1_desc: 'Telegram chat mailer with flexible settings, anti-detect logic and proxy support.',
    p2_title: 'Portfolio landing',
    p2_desc: 'One-page site with animations, modals and dev “wow” features.',
    p3_desc: 'Collects IP/basic info and stores a unique password per device.',

    resume: 'Resume',
    resume_aria: 'Open resume',
    resume_title: 'Resume / CV',
    resume_hint: 'Inline PDF + download',
    resume_download: 'Download PDF',
    resume_open: 'Open in modal',

    quick_contact: 'Contact',
    quick_contact_aria: 'Quick contact (scroll down)',

    contact_title: 'Contact',
    contact_community: 'Community',

    modal_problem: 'Problem',
    modal_solution: 'Solution',
    modal_result: 'Result',
    modal_open_link: 'Open link',

    motion: 'Motion',
    console_title: 'Command console'
  }
};

function getLang() {
  return localStorage.getItem(STORAGE_LANG) || 'ru';
}

function applyLang(lang) {
  const dict = I18N[lang] || I18N.ru;

  document.documentElement.setAttribute('lang', lang);

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    if (dict[key]) el.setAttribute('aria-label', dict[key]);
  });

  const langBtn = document.getElementById('langToggle');
  const langText = document.getElementById('langToggleText');
  if (langBtn && langText) {
    const isEn = lang === 'en';
    langBtn.classList.toggle('is-on', isEn);
    langBtn.setAttribute('aria-pressed', String(isEn));
    langText.textContent = isEn ? 'EN' : 'RU';
  }
}

function toggleLang() {
  const cur = getLang();
  const next = cur === 'ru' ? 'en' : 'ru';
  localStorage.setItem(STORAGE_LANG, next);
  applyLang(next);
}

// Bind toggle
const langToggle = document.getElementById('langToggle');
if (langToggle) langToggle.addEventListener('click', toggleLang);

// ===== Update modal content on language switch (if open) =====
function refreshOpenCaseLang() {
  if (!modal?.classList.contains('is-open')) return;
}

// keep last opened card to rerender on language switch
let lastOpenedCard = null;
const originalOpen = openModalFromCard;
openModalFromCard = function (card) {
  lastOpenedCard = card;
  return originalOpen(card);
};

function rerenderOpenCaseForLang() {
  if (modal?.classList.contains('is-open') && lastOpenedCard) {
    const oldIndex = mediaIndex;
    openModalFromCard(lastOpenedCard);
    mediaIndex = Math.min(oldIndex, Math.max(0, currentMedia.length - 1));
    renderMedia();
  }
}

// ===== Reduced motion class styling hook =====
mqReduce.addEventListener?.('change', (e) => {
  setReducedEffects(!e.matches);
});

// ===== Bind media keyboard navigation inside modal =====
document.addEventListener('keydown', (e) => {
  if (!modal?.classList.contains('is-open')) return;
  if (!currentMedia.length) return;

  if (e.key === 'ArrowLeft') {
    mediaIndex = (mediaIndex - 1 + currentMedia.length) % currentMedia.length;
    renderMedia();
  }

  if (e.key === 'ArrowRight') {
    mediaIndex = (mediaIndex + 1) % currentMedia.length;
    renderMedia();
  }
});

// ===== Init =====
initMotion();
applyLang(getLang());
initParticles();
animate();

if (langToggle) {
  langToggle.addEventListener('click', () => {
    setTimeout(rerenderOpenCaseForLang, 0);
  });
}
