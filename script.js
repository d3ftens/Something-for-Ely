/* ==========================================================================
   Something for Ely — script.js
   Wiring only. The motion itself lives in components/animations.js.
   ========================================================================== */

(function () {
  'use strict';

  var M = window.ElyMotion;

  var body       = document.body;
  var cover      = document.getElementById('cover');
  var unlockBtn  = document.getElementById('unlockBtn');
  var burstLayer = document.getElementById('burst');
  var bloomLayer = document.getElementById('bloom');
  var site       = document.getElementById('site');
  var petalLayer = document.getElementById('petals');
  var journal    = document.getElementById('journal');
  var nav        = document.getElementById('nav');
  var navTabs    = document.getElementById('navTabs');
  var links      = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections   = Array.prototype.slice.call(document.querySelectorAll('.page'));

  var unlocked = false;
  var petalsSeeded = false;
  var revealsStarted = false;

  /* ---------------- Cover ---------------- */
  M.preload();
  M.bloom(bloomLayer);
  M.introduceCover(document.querySelectorAll('[data-cover-el]'));

  /* A gentle pointer-tilt on the notebook (desktop only). */
  if (journal && !M.reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var tiltX = gsap.quickTo(journal, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    var tiltY = gsap.quickTo(journal, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    gsap.set(journal, { transformPerspective: 800, transformStyle: 'preserve-3d' });

    document.addEventListener('pointermove', function (e) {
      if (unlocked) return;
      var r = journal.getBoundingClientRect();
      var px = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      var py = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      tiltY(px * 22);
      tiltX(py * -22);
    });
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;

    unlockBtn.disabled = true;

    var r = unlockBtn.getBoundingClientRect();
    var origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

    var master = gsap.timeline({
      onComplete: function () {
        body.classList.remove('is-locked');
        document.getElementById('home').focus({ preventScroll: true });
      }
    });

    master.add(M.burst(origin, burstLayer), 0);
    master.add(M.dismissCover(cover), M.reduced ? 0 : 0.34);
    master.add(function () {
      body.classList.remove('is-locked');
      M.revealSite(site);
      if (!petalsSeeded) { petalsSeeded = true; M.petals(petalLayer); }
      startReveals();
    }, M.reduced ? 0.2 : 0.78);
  }

  unlockBtn.addEventListener('click', unlock);

  /* ---------------- Navigation ---------------- */
  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (!target) return;

    var offset = nav.getBoundingClientRect().height + 14;
    var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(top, 0), behavior: M.reduced ? 'auto' : 'smooth' });

    window.setTimeout(function () { target.focus({ preventScroll: true }); }, M.reduced ? 0 : 520);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection(link.getAttribute('href').slice(1));
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection(el.getAttribute('data-nav'));
    });
  });

  /* "Something for Ely" in the top bar closes the journal and returns to the notebook cover. */
  function backToCover() {
    if (!unlocked) return;
    unlocked = false;

    body.classList.add('is-locked');
    unlockBtn.disabled = false;
    if (history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search);

    gsap.killTweensOf(cover);
    cover.style.display = '';
    gsap.fromTo(cover,
      { opacity: 0, scale: M.reduced ? 1 : 1.05, filter: M.reduced ? 'none' : 'blur(8px)' },
      {
        opacity: 1, scale: 1, filter: 'blur(0px)',
        duration: M.reduced ? 0.2 : 0.6, ease: 'power2.out',
        clearProps: 'opacity,filter,transform',
        onComplete: function () {
          /* the cover now hides the journal completely; put it away and reset it */
          site.classList.remove('is-open');
          site.setAttribute('aria-hidden', 'true');
          gsap.set(site, { opacity: 0 });
          window.scrollTo(0, 0);
          unlockBtn.focus({ preventScroll: true });
        }
      }
    );
  }

  document.querySelector('.nav__brand').addEventListener('click', function (e) {
    e.preventDefault();
    backToCover();
  });

  function setActive(id) {
    links.forEach(function (l) {
      var on = l.getAttribute('href') === '#' + id;
      l.classList.toggle('is-active', on);
      if (on) {
        l.setAttribute('aria-current', 'true');
        /* keep the active tab visible in the horizontally scrolling bar */
        if (navTabs.scrollWidth > navTabs.clientWidth) {
          navTabs.scrollTo({ left: l.offsetLeft - navTabs.clientWidth / 2 + l.offsetWidth / 2, behavior: 'smooth' });
        }
      } else {
        l.removeAttribute('aria-current');
      }
    });
  }

  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { if (entry.isIntersecting) setActive(entry.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(function (s) { spy.observe(s); });

  /* ---------------- Reveals ---------------- */
  function startReveals() {
    if (revealsStarted) return;
    revealsStarted = true;
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    items.forEach(function (el) { el.style.setProperty('--d', el.dataset.delay || 0); });

    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        o.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    items.forEach(function (el) { obs.observe(el); });
  }

  /* ---------------- Sections ---------------- */
  if (window.ElyLetters)  window.ElyLetters.init();
  if (window.ElyMusic)    window.ElyMusic.init();
  if (window.ElyMemories) window.ElyMemories.init();
  if (window.ElyLists)    window.ElyLists.init();

  /* ---------------- Housekeeping ---------------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  var resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () { M.rebloomIfNeeded(bloomLayer); }, 250);
  });
})();
