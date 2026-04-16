/* ═══════════════════════════════════════════════════════════
   MISHIE MANGARATEKE — UML PORTFOLIO
   main.js — all interactivity, vanilla JS, no dependencies
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── FOOTER YEAR ─────────────────────────────────────────── */
const footerYear = document.getElementById('footer-year');
if (footerYear) footerYear.textContent = new Date().getFullYear();

/* ── INITIAL VISIBILITY ──────────────────────────────────── */
// Show footer and hint on load via class (avoids inline style/animation conflicts)
requestAnimationFrame(() => {
  document.getElementById('site-footer')?.classList.add('footer-visible');
  // hint appears via its own CSS animation, then class keeps it visible after drillOut
});

/* ── CUSTOM CURSOR ────────────────────────────────────────── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || matchMedia('(pointer: coarse)').matches) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  const LERP = 0.14;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  function tick() {
    cx += (mx - cx) * LERP;
    cy += (my - cy) * LERP;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function addHover(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }
  addHover('a, button, .uml-node, .uc-ellipse, .uc-actor-r, .ds-item, .cls-method, .nav-link, .filter-btn, .comp-btn');
})();

/* ── GRID DOTS ────────────────────────────────────────────── */
(function drawGrid() {
  const layer = document.getElementById('grid-layer');
  if (!layer) return;
  const GAP = 40;
  const W = 1400;
  const H = 900;
  const frag = document.createDocumentFragment();
  for (let x = GAP; x < W; x += GAP) {
    for (let y = GAP; y < H; y += GAP) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', '0.8');
      c.setAttribute('fill', 'rgba(201,160,64,0.12)');
      frag.appendChild(c);
    }
  }
  layer.appendChild(frag);
})();

/* ── NODE MATERIALISATION ─────────────────────────────────── */
(function materialise() {
  const svg = document.getElementById('diagram-canvas');
  if (!svg) return;

  const boundary   = svg.querySelector('.system-boundary');
  const sysTab     = svg.querySelector('.system-tab');
  const sysTabTxt  = svg.querySelector('.system-tab-text');
  const sysTitle   = svg.querySelector('.system-title');
  const sysSubtitle= svg.querySelector('.system-subtitle');
  const nodes      = svg.querySelectorAll('.uml-node');
  const connectors = svg.querySelectorAll('.connector');
  const connLabels = svg.querySelectorAll('.conn-label');

  // Hide everything initially — use will-change to avoid compositor flash
  const fade = 'opacity 500ms ease';
  [boundary, sysTab, sysTabTxt, sysTitle, sysSubtitle].forEach(el => {
    if (el) { el.style.opacity = '0'; el.style.transition = fade; el.style.willChange = 'opacity'; }
  });
  nodes.forEach(n => { n.style.opacity = '0'; n.style.willChange = 'opacity'; });
  connectors.forEach(c => {
    const len = c.getTotalLength ? c.getTotalLength() : 200;
    c.style.strokeDasharray = len;
    c.style.strokeDashoffset = len;
    c.style.opacity = '0';
    c.style.willChange = 'opacity, stroke-dashoffset';
    c.style.transition = 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease';
  });
  connLabels.forEach(l => { l.style.opacity = '0'; l.style.transition = fade; l.style.willChange = 'opacity'; });

  // Sequence: boundary → title → nodes (staggered) → connectors draw on
  setTimeout(() => {
    if (boundary)  { boundary.style.opacity = '1'; }
    if (sysTab)    { sysTab.style.opacity = '1'; }
    if (sysTabTxt) { sysTabTxt.style.opacity = '1'; }
  }, 150);

  setTimeout(() => {
    if (sysTitle)    { sysTitle.style.opacity = '1'; }
    if (sysSubtitle) { sysSubtitle.style.opacity = '1'; }
  }, 500);

  // Nodes appear one by one with a clear stagger
  nodes.forEach((n, i) => {
    n.style.transition = 'opacity 450ms ease';
    setTimeout(() => { n.style.opacity = '1'; }, 800 + i * 140);
  });

  // Connectors draw after all nodes are visible
  connectors.forEach((c, i) => {
    setTimeout(() => {
      c.style.opacity = '1';
      c.style.strokeDashoffset = '0';
    }, 1700 + i * 90);
  });

  connLabels.forEach((l, i) => {
    setTimeout(() => { l.style.opacity = '1'; }, 2200 + i * 60);
  });
})();

/* ── PAN / ZOOM ───────────────────────────────────────────── */
(function initPanZoom() {
  const viewport = document.getElementById('canvas-viewport');
  const canvas = document.getElementById('diagram-canvas');
  if (!viewport || !canvas) return;

  let tx = 0, ty = 0, scale = 1;
  let isPanning = false;
  let startX = 0, startY = 0;
  let dirty = false;

  const MIN_SCALE = 0.4;
  const MAX_SCALE = 2.5;

  function applyTransform() {
    canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    canvas.style.transformOrigin = '0 0';
    dirty = false;
  }

  function scheduleRender() {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(applyTransform);
  }

  viewport.addEventListener('mousedown', e => {
    if (e.target.closest('.uml-node')) return;
    isPanning = true;
    startX = e.clientX - tx;
    startY = e.clientY - ty;
    viewport.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!isPanning) return;
    tx = e.clientX - startX;
    ty = e.clientY - startY;
    scheduleRender();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    viewport.style.cursor = '';
  });

  // ── Touch state ──
  let lastTouchX = 0, lastTouchY = 0, lastTouchTime = 0;
  let touchVelX = 0, touchVelY = 0;
  let touchRafId = null;
  let pinchStartDist = 0, pinchStartScale = 1, pinchMidX = 0, pinchMidY = 0;

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  viewport.addEventListener('touchstart', e => {
    cancelAnimationFrame(touchRafId);
    touchVelX = 0; touchVelY = 0;
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = Date.now();
    } else if (e.touches.length === 2) {
      pinchStartDist = getTouchDist(e.touches);
      pinchStartScale = scale;
      pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      const now = Date.now();
      const dt = Math.max(now - lastTouchTime, 1);
      touchVelX = dx / dt;
      touchVelY = dy / dt;
      tx += dx; ty += dy;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = now;
      scheduleRender();
    } else if (e.touches.length === 2 && pinchStartDist > 0) {
      const dist = getTouchDist(e.touches);
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * (dist / pinchStartDist)));
      const rect = viewport.getBoundingClientRect();
      const mx = pinchMidX - rect.left;
      const my = pinchMidY - rect.top;
      tx = mx - (mx - tx) * (newScale / scale);
      ty = my - (my - ty) * (newScale / scale);
      scale = newScale;
      scheduleRender();
    }
  }, { passive: true });

  viewport.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      // Momentum glide
      const FRICTION = 0.92;
      function glide() {
        touchVelX *= FRICTION; touchVelY *= FRICTION;
        if (Math.abs(touchVelX) < 0.05 && Math.abs(touchVelY) < 0.05) return;
        tx += touchVelX * 16; ty += touchVelY * 16;
        scheduleRender();
        touchRafId = requestAnimationFrame(glide);
      }
      touchRafId = requestAnimationFrame(glide);
    } else if (e.touches.length === 1) {
      // Finger lifted during pinch — reset single-touch origin
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = Date.now();
      pinchStartDist = 0;
    }
  }, { passive: true });

  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
    tx = px - (px - tx) * (newScale / scale);
    ty = py - (py - ty) * (newScale / scale);
    scale = newScale;
    scheduleRender();
  }, { passive: false });

  // Expose reset function for nav-home
  window._resetCanvasTransform = () => { tx = 0; ty = 0; scale = 1; scheduleRender(); };
})();

/* ── NODE HOVER TOOLTIP ───────────────────────────────────── */
(function initNodeTooltip() {
  const svg = document.getElementById('diagram-canvas');
  if (!svg) return;
  if (matchMedia('(pointer: coarse)').matches) return; // touch devices: no hover tooltip, no tap flash

  const tipEl = document.createElement('div');
  tipEl.className = 'canvas-node-tip';
  Object.assign(tipEl.style, {
    position: 'fixed',
    background: 'rgba(32,21,16,0.96)',
    border: '1px solid rgba(201,160,64,0.5)',
    color: '#FAF7F2',
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.68rem',
    padding: '0.4rem 0.7rem',
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: '400',
    opacity: '0',
    transition: 'opacity 180ms ease',
    maxWidth: '260px',
    lineHeight: '1.4',
  });
  document.body.appendChild(tipEl);

  const NODE_TIPS = {
    profile:    "Class Diagram — Mishie's attributes and capabilities",
    skills:     'Package Diagram — BA and Technical skill layers',
    experience: 'Sequence Diagram — Career timeline as message flow',
    projects:   'Component Diagram — System architecture of built products',
    designs:    'Use Case Diagram — Design deliverables by client',
    contact:    'State Machine — Contact form as a state transition',
  };

  svg.querySelectorAll('.uml-node').forEach(node => {
    const id = node.dataset.node;
    node.addEventListener('mouseenter', () => {
      tipEl.textContent = NODE_TIPS[id] || '';
      tipEl.style.opacity = '1';
    });
    node.addEventListener('mousemove', e => {
      tipEl.style.left = (e.clientX + 14) + 'px';
      tipEl.style.top = (e.clientY - 28) + 'px';
    });
    node.addEventListener('mouseleave', () => {
      tipEl.style.opacity = '0';
    });
  });
})();

/* ── DRILL-IN / DRILL-OUT ─────────────────────────────────── */
const NODE_LABELS = {
  profile:    '«profile»',
  skills:     '«package»',
  experience: '«sequence»',
  projects:   '«component»',
  designs:    '«usecase»',
  contact:    '«state»',
};

let currentNode = null;
let seqReplayed = false;
let countedUp = false;

function drillIn(nodeId) {
  if (currentNode === nodeId) return;
  currentNode = nodeId;

  const viewport = document.getElementById('canvas-viewport');
  const breadcrumb = document.getElementById('breadcrumb');
  const bcCurrent = document.getElementById('breadcrumb-current');
  const footer = document.getElementById('site-footer');
  const hint = document.getElementById('canvas-hint');

  viewport.classList.add('dimmed');
  if (hint) hint.classList.remove('hint-visible');
  if (footer) footer.classList.remove('footer-visible');

  if (bcCurrent) bcCurrent.textContent = NODE_LABELS[nodeId] || nodeId;
  if (breadcrumb) {
    breadcrumb.hidden = false;
    breadcrumb.offsetHeight; // force reflow so transition fires
  }

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.node === nodeId);
  });

  // Immediately hide all other panels (they're already faded)
  document.querySelectorAll('.detail-panel').forEach(p => {
    if (p.dataset.node !== nodeId) p.hidden = true;
  });

  // Delay panel reveal slightly so canvas dim transition visibly starts first
  setTimeout(() => {
    const panel = document.getElementById(`detail-${nodeId}`);
    if (panel) {
      panel.hidden = false;
      panel.offsetHeight; // force reflow so opacity transition triggers
      const scroll = panel.querySelector('.detail-scroll');
      if (scroll) scroll.scrollTop = 0;
    }
  }, 60);

  // Node-specific triggers
  if (nodeId === 'profile' && !countedUp) {
    setTimeout(runCountUp, 400);
    countedUp = true;
  }
  if (nodeId === 'experience') {
    positionSeqMessages();
    if (!seqReplayed) {
      setTimeout(replaySequence, 400);
      seqReplayed = true;
    }
  }
}

function drillOut() {
  if (!currentNode) return;
  const nodeToHide = currentNode;
  currentNode = null;

  const viewport = document.getElementById('canvas-viewport');
  viewport.classList.remove('dimmed');

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) breadcrumb.hidden = true;

  const footer = document.getElementById('site-footer');
  if (footer) footer.classList.add('footer-visible');

  const hint = document.getElementById('canvas-hint');
  if (hint) hint.classList.add('hint-visible');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Let the panel CSS opacity transition fade out (--t-med = 360ms), then hide it
  const panel = document.getElementById(`detail-${nodeToHide}`);
  if (panel) {
    panel.style.opacity = '0';
    panel.style.pointerEvents = 'none';
    setTimeout(() => {
      panel.hidden = true;
      panel.style.opacity = '';
      panel.style.pointerEvents = '';
    }, 370);
  }

  // Close galleries and BSA panels
  document.querySelectorAll('.uc-gallery').forEach(g => { g.hidden = true; });
  document.querySelectorAll('.comp-bsa').forEach(p => { p.hidden = true; });
  document.querySelectorAll('.comp-btn--bsa').forEach(b => { b.textContent = 'VIEW ANALYSIS ▶'; });
}

// Node clicks
document.querySelectorAll('.uml-node').forEach(node => {
  function activate() { drillIn(node.dataset.node); }
  node.addEventListener('click', activate);
  node.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  });
});

// Breadcrumb back
document.getElementById('breadcrumb-back')?.addEventListener('click', drillOut);

// ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (isLightboxOpen()) closeLightbox();
    else drillOut();
  }
});

// Nav links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    drillIn(link.dataset.node);
  });
});

document.getElementById('nav-home')?.addEventListener('click', e => {
  e.preventDefault();
  drillOut();
  if (window._resetCanvasTransform) window._resetCanvasTransform();
});

/* ── COUNT-UP ANIMATION ───────────────────────────────────── */
function runCountUp() {
  document.querySelectorAll('.count-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    if (isNaN(target)) return;

    const duration = 1200;
    const start = performance.now();

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

/* ── SEQUENCE DIAGRAM LAYOUT ──────────────────────────────── */
function positionSeqMessages() {
  document.querySelectorAll('.seq-messages').forEach(container => {
    const lifelines = parseInt(container.dataset.lifelines, 10);
    if (!lifelines) return;

    container.querySelectorAll('.seq-msg').forEach(msg => {
      const from = parseInt(msg.dataset.from, 10);
      const to = parseInt(msg.dataset.to, 10);
      if (isNaN(from) || isNaN(to)) return;

      const left = Math.min(from, to) / lifelines * 100;
      const width = Math.abs(to - from) / lifelines * 100;
      msg.style.setProperty('--msg-left', left + '%');
      msg.style.setProperty('--msg-width', Math.max(width, 10) + '%');
      msg.classList.toggle('seq-msg--rtl', from > to);
    });
  });
}

/* ── SEQUENCE REPLAY ──────────────────────────────────────── */
function replaySequence() {
  document.querySelectorAll('.seq-messages').forEach(container => {
    const msgs = container.querySelectorAll('.seq-msg');
    msgs.forEach(m => {
      m.style.opacity = '0';
      m.style.transform = 'translateY(6px)';
    });

    msgs.forEach((m, i) => {
      setTimeout(() => {
        m.style.transition = 'opacity 350ms ease, transform 350ms cubic-bezier(0.16,1,0.3,1)';
        m.style.opacity = '1';
        m.style.transform = 'translateY(0)';
      }, 200 + i * 220);
    });
  });
}

/* ── SKILLS FILTER ────────────────────────────────────────── */
(function initSkillsFilter() {
  const filterBar = document.querySelector('.filter-bar');
  if (!filterBar) return;

  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    const filter = btn.dataset.filter;
    filterBar.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    const baEl = document.getElementById('pkg-ba');
    const techEl = document.getElementById('pkg-tech');
    const arrow = document.querySelector('.pkg-arrow-row');

    const dim = 'opacity 300ms ease';
    [baEl, techEl, arrow].forEach(el => { if (el) el.style.transition = dim; });

    if (filter === 'all') {
      [baEl, techEl, arrow].forEach(el => { if (el) el.style.opacity = '1'; });
    } else if (filter === 'ba') {
      if (baEl) baEl.style.opacity = '1';
      if (techEl) techEl.style.opacity = '0.2';
      if (arrow) arrow.style.opacity = '0.2';
    } else if (filter === 'tech') {
      if (baEl) baEl.style.opacity = '0.2';
      if (techEl) techEl.style.opacity = '1';
      if (arrow) arrow.style.opacity = '0.2';
    }
  });
})();

/* ── METHOD TOOLTIPS (PROFILE) ────────────────────────────── */
(function initMethodTip() {
  const tipEl = document.getElementById('method-tip');
  if (!tipEl) return;

  let hideTimer = null;

  document.querySelectorAll('.cls-method[data-tip]').forEach(m => {
    m.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      tipEl.textContent = m.dataset.tip;
      tipEl.hidden = false;
    });
    m.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => { tipEl.hidden = true; }, 200);
    });
  });
})();

/* ── CAROUSELS ────────────────────────────────────────────── */
(function initCarousels() {
  document.querySelectorAll('.comp-carousel').forEach(carousel => {
    const slides = Array.from(carousel.querySelectorAll('.car-slide'));
    const dots = carousel.querySelectorAll('.car-dot');
    const prev = carousel.querySelector('.car-prev');
    const next = carousel.querySelector('.car-next');
    if (!slides.length) return;

    let idx = 0;

    // Build lightbox item list from all slides
    const lbList = slides.map(s => {
      const img = s.querySelector('img');
      return { src: img ? img.src : '', cap: img ? img.alt : '' };
    });

    function goto(n) {
      slides[idx].classList.remove('active');
      if (dots[idx]) dots[idx].classList.remove('active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('active');
      if (dots[idx]) dots[idx].classList.add('active');
    }

    prev?.addEventListener('click', e => { e.stopPropagation(); goto(idx - 1); });
    next?.addEventListener('click', e => { e.stopPropagation(); goto(idx + 1); });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', e => { e.stopPropagation(); goto(i); });
    });

    // Click active image to open lightbox
    slides.forEach((slide, i) => {
      slide.addEventListener('click', e => {
        // Only open if not dragging / prev-next
        if (e.target.closest('.car-prev, .car-next, .car-dot')) return;
        openLightbox(lbList, i);
      });
    });

    let touchStartX = 0;
    carousel.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goto(dx < 0 ? idx + 1 : idx - 1);
    }, { passive: true });
  });
})();

/* ── BSA ANALYSIS PANELS ──────────────────────────────────── */
(function initBsaPanels() {
  document.querySelectorAll('.comp-btn--bsa').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const panel = document.getElementById(btn.dataset.bsa);
      if (!panel) return;
      const open = panel.hidden;
      panel.hidden = !open;
      btn.textContent = open ? 'HIDE ANALYSIS ▼' : 'VIEW ANALYSIS ▶';
    });
  });
})();

/* ── DRAG-SCROLL (DESIGN STRIPS) ──────────────────────────── */
(function initDragScroll() {
  document.querySelectorAll('[data-drag]').forEach(strip => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let velX = 0;
    let lastX = 0;
    let rafId = null;

    strip.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - strip.offsetLeft;
      scrollLeft = strip.scrollLeft;
      lastX = e.pageX;
      velX = 0;
      strip.style.cursor = 'grabbing';
      cancelAnimationFrame(rafId);
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      strip.style.cursor = '';
      function momentum() {
        velX *= 0.92;
        strip.scrollLeft -= velX;
        if (Math.abs(velX) > 0.5) rafId = requestAnimationFrame(momentum);
      }
      rafId = requestAnimationFrame(momentum);
    });

    window.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      velX = e.pageX - lastX;
      lastX = e.pageX;
      strip.scrollLeft = scrollLeft - (e.pageX - strip.offsetLeft - startX);
    });
  });
})();

/* ── USE CASE GALLERY ─────────────────────────────────────── */
(function initUcGallery() {
  document.querySelectorAll('.uc-ellipse, .uc-actor-r').forEach(el => {
    el.addEventListener('click', () => {
      const client = el.dataset.client;
      const gal = document.getElementById(`gal-${client}`);
      if (!gal) return;
      const wasHidden = gal.hidden;
      document.querySelectorAll('.uc-gallery').forEach(g => { g.hidden = true; });
      if (wasHidden) {
        gal.hidden = false;
        gal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  document.querySelectorAll('.gal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const gal = document.getElementById(btn.dataset.gal);
      if (gal) gal.hidden = true;
    });
  });

  // Lightbox on design strip images
  document.querySelectorAll('.design-strip').forEach(strip => {
    const items = Array.from(strip.querySelectorAll('.ds-item'));
    items.forEach((item, idx) => {
      item.addEventListener('click', () => {
        openLightbox(items.map(s => ({ src: s.dataset.src, cap: s.dataset.cap })), idx);
      });
    });
  });
})();

/* ── LIGHTBOX ─────────────────────────────────────────────── */
let lbItems = [];
let lbIdx = 0;

function isLightboxOpen() {
  const lb = document.getElementById('lightbox');
  return lb ? lb.getAttribute('aria-hidden') === 'false' : false;
}

function openLightbox(items, idx) {
  lbItems = items;
  lbIdx = idx;
  _renderLightbox();
  const lb = document.getElementById('lightbox');
  const bd = document.getElementById('lb-backdrop');
  // Use .open class so CSS opacity transition fires cleanly (no display:none flash)
  if (lb) { lb.setAttribute('aria-hidden', 'false'); lb.classList.add('open'); }
  if (bd) { bd.classList.add('open'); }
  document.body.style.overflow = 'hidden';
  document.getElementById('lb-close')?.focus();
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  const bd = document.getElementById('lb-backdrop');
  if (lb) { lb.setAttribute('aria-hidden', 'true'); lb.classList.remove('open'); }
  if (bd) { bd.classList.remove('open'); }
  document.body.style.overflow = '';
  lbItems = [];
}

function _renderLightbox() {
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-cap');
  const prev = document.getElementById('lb-prev');
  const next = document.getElementById('lb-next');
  if (!img || !lbItems.length) return;

  const item = lbItems[lbIdx];
  img.src = item.src;
  img.alt = item.cap || '';
  if (cap) cap.textContent = item.cap || '';
  const multi = lbItems.length > 1;
  if (prev) prev.style.visibility = multi ? 'visible' : 'hidden';
  if (next) next.style.visibility = multi ? 'visible' : 'hidden';
}

(function initLightbox() {
  document.getElementById('lb-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lb-backdrop')?.addEventListener('click', closeLightbox);

  document.getElementById('lb-prev')?.addEventListener('click', () => {
    lbIdx = (lbIdx - 1 + lbItems.length) % lbItems.length;
    _renderLightbox();
  });
  document.getElementById('lb-next')?.addEventListener('click', () => {
    lbIdx = (lbIdx + 1) % lbItems.length;
    _renderLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!isLightboxOpen()) return;
    if (e.key === 'ArrowLeft') { lbIdx = (lbIdx - 1 + lbItems.length) % lbItems.length; _renderLightbox(); }
    if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % lbItems.length; _renderLightbox(); }
  });
})();

/* ── STATE MACHINE FORM ───────────────────────────────────── */
(function initStateMachineForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const fields = {
    name:    document.getElementById('cf-name'),
    email:   document.getElementById('cf-email'),
    subject: document.getElementById('cf-subject'),
    message: document.getElementById('cf-message'),
  };

  const submitBtn = document.getElementById('sm-submit');
  const formOk = document.getElementById('form-ok');
  const formErr = document.getElementById('form-err');

  const states = {
    idle:       document.getElementById('sm-idle'),
    composing:  document.getElementById('sm-composing'),
    reviewing:  document.getElementById('sm-reviewing'),
    sent:       document.getElementById('sm-sent'),
    error:      document.getElementById('sm-error'),
  };

  function setState(s) {
    Object.values(states).forEach(el => el?.classList.remove('active'));
    states[s]?.classList.add('active');
  }

  function updateState() {
    const filled = Object.values(fields).filter(f => f && f.value.trim().length > 0).length;
    if (filled === 0) setState('idle');
    else if (filled < 4) setState('composing');
    else setState('reviewing');
  }

  setState('idle');
  Object.values(fields).forEach(f => {
    f?.addEventListener('input', updateState);
    f?.addEventListener('change', updateState);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'sending...'; }
    if (formOk) formOk.hidden = true;
    if (formErr) formErr.hidden = true;

    try {
      const resp = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
      });
      if (resp.ok) {
        setState('sent');
        if (formOk) formOk.hidden = false;
        form.reset();
      } else {
        throw new Error('Server error');
      }
    } catch {
      setState('error');
      if (formErr) formErr.hidden = false;
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'send() : void'; }
    }
  });
})();

/* ── MOBILE NAV ───────────────────────────────────────────── */
(function initMobileNav() {
  const burger = document.getElementById('nav-burger');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileClose = document.getElementById('mobile-close');
  if (!burger || !mobileNav) return;

  function openMenu() {
    mobileNav.hidden = false;
    mobileNav.offsetHeight; // force reflow so opacity transition fires from 0
    mobileNav.style.opacity = '1';
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    mobileClose?.focus();
  }

  function closeMenu() {
    mobileNav.style.opacity = '0';
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    burger.focus();
    setTimeout(() => {
      mobileNav.hidden = true;
      mobileNav.style.opacity = '';
    }, 230);
  }

  burger.addEventListener('click', openMenu);
  mobileClose?.addEventListener('click', closeMenu);

  mobileNav.querySelectorAll('.mn-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      closeMenu();
      drillIn(link.dataset.node);
    });
  });

  // Close on backdrop (click outside nav content)
  mobileNav.addEventListener('click', e => {
    if (e.target === mobileNav) closeMenu();
  });
})();
