/* ==========================================================================
   Something for Ely — components/animations.js
   Everything that moves lives here. script.js decides when to call it.
   Depends on: GSAP 3 (global `gsap`).
   ========================================================================== */

window.ElyMotion = (function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var FLOWERS = {
    peony: [
      'assets/flowers/peony-blush.svg',
      'assets/flowers/peony-pale.svg',
      'assets/flowers/peony-rose.svg'
    ],
    tulip: [
      'assets/flowers/tulip-blush.svg',
      'assets/flowers/tulip-pale.svg',
      'assets/flowers/tulip-rose.svg'
    ],
    petal: 'assets/flowers/petal.svg'
  };

  /* Three depth planes for the unlock burst. Bigger than before. */
  var PLANES = [
    { count: 22, scale: [0.55, 0.95], blur: 4.0, reach: [0.42, 0.72], dur: [2.3, 2.8], z: 1 },
    { count: 22, scale: [0.95, 1.50], blur: 1.4, reach: [0.62, 0.98], dur: [1.95, 2.45], z: 2 },
    { count: 20, scale: [1.40, 2.30], blur: 0,   reach: [0.80, 1.25], dur: [1.65, 2.15], z: 3 }
  ];
  var BURST_TOTAL = PLANES.reduce(function (s, p) { return s + p.count; }, 0);

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  function preload() {
    FLOWERS.peony.concat(FLOWERS.tulip, [FLOWERS.petal]).forEach(function (src) {
      var i = new Image();
      i.src = src;
    });
  }

  /* ------------------------------------------------------------------
     The flower field: a grid of jittered cells, one flower per cell, so the
     whole screen is covered. Each flower sways gently forever.
     ------------------------------------------------------------------ */
  var bloomWidth = 0;

  function bloom(layer) {
    if (!layer) return;
    layer.innerHTML = '';
    var W = window.innerWidth, H = window.innerHeight;
    bloomWidth = W;

    var small = W < 720;
    var cols = small ? 3 : 6;
    var rows = small ? 5 : 4;
    var all = FLOWERS.peony.concat(FLOWERS.tulip);
    var index = 0;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var size = rand(small ? 130 : 180, small ? 215 : 300);
        var cx = (c + rand(0.2, 0.8)) / cols;
        var cy = (r + rand(0.2, 0.8)) / rows;
        var far = Math.random() < 0.4;

        var item = document.createElement('div');
        item.className = 'bloom__item';
        item.style.left = (cx * 100) + '%';
        item.style.top = (cy * 100) + '%';
        item.style.width = size + 'px';
        item.style.height = size + 'px';
        item.style.marginLeft = (-size / 2) + 'px';
        item.style.marginTop = (-size / 2) + 'px';
        item.style.setProperty('--o', far ? rand(0.45, 0.6).toFixed(2) : rand(0.72, 0.92).toFixed(2));
        item.style.animationDelay = (index * 0.045).toFixed(2) + 's';
        if (far) item.style.filter = 'blur(2px)';

        var img = new Image();
        img.src = pick(all);
        img.alt = '';
        img.className = 'bloom__img';
        img.style.setProperty('--r', rand(-40, 40).toFixed(0) + 'deg');
        img.style.animationDuration = rand(8, 15).toFixed(1) + 's';
        img.style.animationDelay = (-rand(0, 12)).toFixed(1) + 's';

        item.appendChild(img);
        layer.appendChild(item);
        index++;
      }
    }
  }

  /* Re-lay the field if the window changes a lot (rotate phone, resize). */
  function rebloomIfNeeded(layer) {
    if (Math.abs(window.innerWidth - bloomWidth) > 140) bloom(layer);
  }

  /* ------------------------------------------------------------------
     The unlock burst: big tulips and peonies thrown out of the button.
     ------------------------------------------------------------------ */
  function burst(origin, layer) {
    var tl = gsap.timeline();

    if (reduced) {
      var calm = document.createElement('div');
      calm.className = 'burst__flower';
      calm.innerHTML = '<img src="' + FLOWERS.peony[1] + '" alt="">';
      layer.appendChild(calm);
      gsap.set(calm, { x: origin.x - 60, y: origin.y - 60, scale: 0.6, opacity: 0 });
      tl.to(calm, { opacity: 1, scale: 1.4, duration: .5, ease: 'power2.out' })
        .to(calm, { opacity: 0, duration: .6 }, '+=.3')
        .add(function () { layer.innerHTML = ''; });
      return tl;
    }

    var diag = Math.hypot(window.innerWidth, window.innerHeight);
    var nodes = [];
    var index = 0;

    PLANES.forEach(function (plane) {
      for (var i = 0; i < plane.count; i++) {
        var src = Math.random() < 0.55 ? pick(FLOWERS.peony) : pick(FLOWERS.tulip);

        var el = document.createElement('div');
        el.className = 'burst__flower';
        el.innerHTML = '<img src="' + src + '" alt="">';
        el.style.zIndex = plane.z;
        if (plane.blur) el.style.filter = 'blur(' + plane.blur + 'px)';
        layer.appendChild(el);

        var angle = (index / BURST_TOTAL) * Math.PI * 2 + rand(-0.26, 0.26);
        var reach = diag * rand(plane.reach[0], plane.reach[1]);

        nodes.push({
          el: el,
          dx: Math.cos(angle) * reach,
          dy: Math.sin(angle) * reach - rand(20, 140),
          spin: rand(-260, 260),
          scale: rand(plane.scale[0], plane.scale[1]),
          dur: rand(plane.dur[0], plane.dur[1]),
          delay: rand(0, 0.30) + (3 - plane.z) * 0.03
        });
        index++;
      }
    });

    nodes.forEach(function (n) {
      gsap.set(n.el, { x: origin.x - 60, y: origin.y - 60, scale: 0.06, rotation: rand(-70, 70), opacity: 0 });

      tl.to(n.el, {
        x: origin.x - 60 + n.dx,
        y: origin.y - 60 + n.dy,
        rotation: '+=' + n.spin,
        scale: n.scale,
        duration: n.dur,
        ease: 'power2.out'
      }, n.delay);

      tl.to(n.el, { opacity: 1, duration: 0.22, ease: 'power1.out' }, n.delay);
      tl.to(n.el, { opacity: 0, duration: n.dur * 0.52, ease: 'power2.in' }, n.delay + n.dur * 0.46);
      tl.to(n.el, { y: '+=' + rand(26, 74), duration: n.dur, ease: 'sine.inOut' }, n.delay + 0.18);
    });

    tl.add(function () { layer.innerHTML = ''; });
    return tl;
  }

  /* ------------------------------------------------------------------
     A few petals drifting down, slowly.
     ------------------------------------------------------------------ */
  function petals(layer, count) {
    if (reduced || !layer) return;
    var n = count || (window.innerWidth < 720 ? 7 : 12);
    for (var i = 0; i < n; i++) {
      var p = document.createElement('img');
      p.className = 'petal';
      p.src = FLOWERS.petal;
      p.alt = '';
      layer.appendChild(p);
      animatePetal(p, i * 1.1);
    }
  }

  function animatePetal(p, delay) {
    gsap.set(p, {
      width: rand(20, 40),
      left: rand(-4, 104) + 'vw',
      y: rand(-200, -40),
      rotation: rand(0, 360),
      opacity: rand(0.4, 0.75)
    });
    gsap.to(p, {
      y: window.innerHeight + 160,
      x: rand(-140, 140),
      rotation: '+=' + rand(180, 620),
      duration: rand(15, 28),
      delay: delay,
      ease: 'none',
      onComplete: function () { animatePetal(p, 0); }
    });
    gsap.to(p, { opacity: 0, duration: 3, delay: delay + rand(10, 20), ease: 'power1.in' });
  }

  /* ------------------------------------------------------------------
     Cover intro / exit, site reveal
     ------------------------------------------------------------------ */
  function introduceCover(els) {
    if (reduced) { gsap.set(els, { opacity: 1, y: 0 }); return; }
    gsap.set(els, { opacity: 0, y: 24 });
    gsap.to(els, { opacity: 1, y: 0, duration: 1.05, stagger: 0.16, delay: 0.25, ease: 'power3.out' });
  }

  function dismissCover(cover) {
    return gsap.to(cover, {
      opacity: 0, scale: 1.07, filter: 'blur(9px)',
      duration: reduced ? 0.25 : 0.85, ease: 'power2.inOut',
      onComplete: function () { cover.style.display = 'none'; }
    });
  }

  function revealSite(site) {
    site.classList.add('is-open');
    site.setAttribute('aria-hidden', 'false');
    return gsap.fromTo(site,
      { opacity: 0, scale: reduced ? 1 : 1.03 },
      { opacity: 1, scale: 1, duration: reduced ? 0.3 : 1.1, ease: 'power2.out', clearProps: 'transform' }
    );
  }

  /* ------------------------------------------------------------------
     Toast + generic modal
     ------------------------------------------------------------------ */
  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
  }

  function openModal(modal) {
    if (!modal) return;
    var panel = modal.querySelector('.modal__panel');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-menu-open');
    if (panel) {
      gsap.fromTo(panel,
        { opacity: 0, y: reduced ? 0 : 22, scale: reduced ? 1 : .96 },
        { opacity: 1, y: 0, scale: 1, duration: reduced ? .01 : .5, ease: 'power3.out' }
      );
    }
    var first = modal.querySelector('input:not([type=file]), textarea, button:not(.modal__close)');
    if (first) window.setTimeout(function () { first.focus(); }, reduced ? 0 : 260);
  }

  function closeModal(modal) {
    if (!modal) return;
    var panel = modal.querySelector('.modal__panel');
    var finish = function () {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-menu-open');
    };
    if (panel && !reduced) {
      gsap.to(panel, { opacity: 0, y: 14, scale: .97, duration: .3, ease: 'power2.in', onComplete: finish });
    } else {
      finish();
    }
  }

  /* ------------------------------------------------------------------
     Confirm dialog — every delete in the site goes through this.
     ------------------------------------------------------------------ */
  var confirmCb = null;

  function confirmBox() { return document.getElementById('confirmModal'); }

  function closeConfirm() {
    var box = confirmBox();
    if (!box) return;
    confirmCb = null;
    var panel = box.querySelector('.modal__panel');
    var finish = function () { box.classList.remove('is-open'); box.setAttribute('aria-hidden', 'true'); };
    if (panel && !reduced) gsap.to(panel, { opacity: 0, y: 10, duration: .2, onComplete: finish });
    else finish();
  }

  function confirmDialog(message, onYes, yesLabel) {
    var box = confirmBox();
    if (!box) { if (window.confirm(message)) onYes(); return; }
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmYes').textContent = yesLabel || 'Delete';
    confirmCb = onYes;
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    var panel = box.querySelector('.modal__panel');
    gsap.fromTo(panel, { opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : .96 }, { opacity: 1, y: 0, scale: 1, duration: reduced ? .01 : .35, ease: 'power3.out' });
    window.setTimeout(function () { document.getElementById('confirmYes').focus(); }, 60);
  }

  (function initConfirm() {
    var box = confirmBox();
    if (!box) return;
    document.getElementById('confirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      closeConfirm();
      if (cb) cb();
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-modal-close="confirmModal"]'), function (el) {
      el.addEventListener('click', closeConfirm);
    });
    /* Registered first, so Escape closes only this dialog and not what's under it. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) {
        e.stopImmediatePropagation();
        closeConfirm();
      }
    });
  })();

  return {
    reduced: reduced,
    preload: preload,
    bloom: bloom,
    rebloomIfNeeded: rebloomIfNeeded,
    burst: burst,
    petals: petals,
    introduceCover: introduceCover,
    dismissCover: dismissCover,
    revealSite: revealSite,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirmDialog
  };
})();
