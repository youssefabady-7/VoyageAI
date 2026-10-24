// Main JavaScript for VoyageAI Luxury Travel Agent

// ============================================
// 1. THEME MANAGER (DARK / LIGHT MODE)
// ============================================
class ThemeManager {
  constructor() {
    this.storageKey = 'voyageai_theme';
    this.init();
  }

  init() {
    const saved = localStorage.getItem(this.storageKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme = saved || (prefersDark ? 'dark' : 'light');
    this.applyTheme(this.theme, false);

    // Bind all theme toggle buttons on the page
    this.setupListeners();

    // Listen to OS theme changes if user hasn't set preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.storageKey)) {
          this.applyTheme(e.matches ? 'dark' : 'light', true);
        }
      });
    }
  }

  applyTheme(theme, animate = true) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.toggle('dark-theme', theme === 'dark');
    }
    localStorage.setItem(this.storageKey, theme);
    this.updateIcons();

    if (animate) {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 400);
    }
  }

  toggle() {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(next, true);
  }

  updateIcons() {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      if (this.theme === 'dark') {
        btn.innerHTML = '<i class="fas fa-sun"></i>';
        btn.setAttribute('title', 'Switch to Light Mode');
        btn.setAttribute('aria-label', 'Switch to Light Mode');
      } else {
        btn.innerHTML = '<i class="fas fa-moon"></i>';
        btn.setAttribute('title', 'Switch to Dark Mode');
        btn.setAttribute('aria-label', 'Switch to Dark Mode');
      }
    });
  }

  setupListeners() {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    });
  }
}

// ============================================
// 2. HERO LUXURY PARTICLES ANIMATION
// ============================================
function initHeroParticles() {
  const canvas = document.getElementById('heroParticles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: null, y: null };

  function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  const particleCount = Math.min(Math.floor(width / 30), 45);
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.2,
      gold: Math.random() > 0.4
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Mouse gentle repulsion
      if (mouse.x !== null && mouse.y !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          p.x += (dx / dist) * 0.8;
          p.y += (dy / dist) * 0.8;
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.gold
        ? `rgba(201, 169, 110, ${p.alpha})`
        : `rgba(255, 255, 255, ${p.alpha * 0.8})`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// ============================================
// 3. INITIALIZE SITE FEATURES ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme Manager
  window.voyageTheme = new ThemeManager();

  // Initialize Hero Canvas particles
  initHeroParticles();

  // 1. Mobile Navigation Toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // 2. Navbar scroll & Progress Bar effect
  const navbar = document.querySelector('.navbar');
  const progressBar = document.getElementById('scrollProgressBar');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (navbar) {
      if (scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    if (progressBar) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  });

  // 3. Smooth Scroll Observer for Animations
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  if (animatedElements.length > 0) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible', 'animated');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px 60px 0px'
      });

      animatedElements.forEach(el => observer.observe(el));
    } else {
      // Fallback for browsers without IntersectionObserver
      animatedElements.forEach(el => el.classList.add('visible', 'animated'));
    }

    // Safety fallback: reveal all elements if any stay hidden after 1.2s or upon first user interaction
    setTimeout(() => {
      animatedElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          el.classList.add('visible', 'animated');
        }
      });
    }, 1200);
  }

  // 4. Hero Scroll Indicator Click
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.style.cursor = 'pointer';
    scrollIndicator.addEventListener('click', () => {
      const target = document.querySelector('#how-it-works') || document.querySelector('.section');
      if (target) {
        const navHeight = 75;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  }

  // 5. Interactive Quick Planner Widget (Home Page)
  const quickPlanBtn = document.getElementById('quickPlanSubmitBtn');
  if (quickPlanBtn) {
    quickPlanBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const dest = document.getElementById('quickPlanDestination')?.value || 'europe';
      const party = document.getElementById('quickPlanParty')?.value || 'solo';
      const budget = document.getElementById('quickPlanBudget')?.value || '3000';
      const prompt = `Hello! I would like to plan a trip to ${dest}. We are traveling as a ${party} with a budget of approximately $${budget}. Please help organize our flights, stays, and activities!`;
      window.location.href = `chat.html?plan=${encodeURIComponent(dest)}&message=${encodeURIComponent(prompt)}`;
    });
  }

  // 4. Smooth Anchor Link Scrolling (with 75px offset)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navbarHeight = 75;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 5. Parallax effect for hero sections
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      if (scrolled < window.innerHeight) {
        hero.style.backgroundPositionY = `${scrolled * 0.4}px`;
      }
    });
  }

  // 6. 3D Tilt Effect on Destination Cards & Steps
  const tiltCards = document.querySelectorAll('.destination-card, .feature-card, .step-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // 7. Privacy Page TOC active spy
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length > 0) {
    const sections = document.querySelectorAll('.privacy-section');
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        if (window.pageYOffset >= sectionTop) {
          current = section.getAttribute('id');
        }
      });

      tocLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    });
  }
});
