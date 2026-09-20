/* ==========================================================================
   Something for Ely — components/letters.js
   Folded heart letters: read, write, EDIT, DELETE. Saved in Local Storage.
   ========================================================================== */

window.ElyLetters = (function () {
  'use strict';

  var STORAGE_KEY = 'ely_letters_v1';   // same key as before, so old letters carry over
  var M = window.ElyMotion;

  var grid, writeBtn, modal, modalTitle, titleInput, bodyInput, finishBtn;
  var reader, readerSheet, readerTitle, readerDate, readerBody, editBtn, deleteBtn;
  var lastRect = null, lastRot = 0;
  var openId = null;      // letter currently in the reader
  var editingId = null;   // letter currently in the write/edit modal

  function rand(a, b) { return a + Math.random() * (b - a); }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : str;
    return d.innerHTML;
  }

  function seedLetters() {
    var now = Date.now();
    return [
      {
        id: 'seed-1',
        title: 'The first one I never sent',
        date: new Date(now - 1000 * 60 * 60 * 24 * 40).toISOString(),
        body: 'Dear Ely,\n\nI wrote this three times before I let myself keep it. There is nothing dramatic here, just that I noticed you, and kept noticing, and eventually stopped pretending I wasn\u2019t.\n\nMore pages to come.'
      },
      {
        id: 'seed-2',
        title: 'A small one, from a Tuesday',
        date: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
        body: 'Nothing happened today. That is sort of the point \u2014 I just thought of you in the middle of an ordinary afternoon, and it made the afternoon better.'
      },
      {
        id: 'seed-3',
        title: 'For whenever you need it',
        date: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        body: 'If you are reading this on a hard day: it will not stay hard. And if you are reading this on a good one, I hope it stays exactly like this a while longer.\n\nEither way, I am glad you are you.'
      }
    ];
  }

  function load() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) { return null; }
  }
  function save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }
  function getList() {
    var list = load();
    if (!list) { list = seedLetters(); save(list); }
    return list;
  }
  function findById(id) {
    return getList().filter(function (l) { return l.id === id; })[0] || null;
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  /* ---------------- Heart grid ---------------- */
  function buildHeart(letter) {
    var rot = rand(-6, 6);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'heart';
    btn.style.transform = 'rotate(' + rot + 'deg)';
    btn.setAttribute('aria-label', 'Open the letter: ' + letter.title);
    btn.innerHTML =
      '<span class="heart__shape"></span>' +
      '<span class="heart--seal" aria-hidden="true"></span>' +
      '<span class="heart__title">' + escapeHtml(letter.title) + '</span>';
    btn.addEventListener('click', function () { openReader(letter.id, btn, rot); });
    return btn;
  }

  function renderAll() {
    var list = getList();
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="heart-empty">No letters yet. Write the first one.</p>';
      return;
    }
    list.slice().reverse().forEach(function (letter) { grid.appendChild(buildHeart(letter)); });
  }

  function addHeartAnimated(letter) {
    var empty = grid.querySelector('.heart-empty');
    if (empty) empty.remove();
    var el = buildHeart(letter);
    grid.insertBefore(el, grid.firstChild);
    if (M.reduced) return;
    gsap.fromTo(el, { opacity: 0, scale: .2, y: 26 }, { opacity: 1, scale: 1, y: 0, duration: .75, ease: 'back.out(1.6)' });
  }

  /* ---------------- Reader ---------------- */
  function openReader(id, originEl, rot) {
    var letter = findById(id);
    if (!letter) return;
    openId = id;
    lastRect = originEl.getBoundingClientRect();
    lastRot = rot || 0;

    readerTitle.textContent = letter.title;
    readerDate.textContent = formatDate(letter.date);
    readerBody.textContent = letter.body;

    reader.classList.add('is-open');
    reader.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-menu-open');
    readerSheet.scrollTop = 0;

    if (M.reduced) { gsap.set(readerSheet, { clearProps: 'all' }); return; }

    var dx = lastRect.left + lastRect.width / 2 - window.innerWidth / 2;
    var dy = lastRect.top + lastRect.height / 2 - window.innerHeight / 2;

    var tl = gsap.timeline();
    tl.fromTo(readerSheet,
      { x: dx, y: dy - 18, rotation: lastRot * 3, scaleX: .42, scaleY: .06, opacity: 0, transformOrigin: '50% 12%' },
      { opacity: 1, duration: .22, ease: 'power1.out' }, 0)
      .to(readerSheet, { scaleY: 1, duration: .55, ease: 'power3.out' }, .06)
      .to(readerSheet, { x: 0, y: 0, scaleX: 1, rotation: 0, duration: .68, ease: 'power3.out' }, .16)
      .fromTo(readerSheet.querySelector('.letter-reader__inner'),
        { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' }, .55);
  }

  function closeReader(instant) {
    var finish = function () {
      reader.classList.remove('is-open');
      reader.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-menu-open');
      gsap.set(readerSheet, { clearProps: 'all' });
      openId = null;
    };
    if (instant === true || M.reduced || !lastRect) { finish(); return; }

    var dx = lastRect.left + lastRect.width / 2 - window.innerWidth / 2;
    var dy = lastRect.top + lastRect.height / 2 - window.innerHeight / 2;
    gsap.to(readerSheet, {
      x: dx, y: dy, scaleX: .5, scaleY: .08, rotation: lastRot * 3, opacity: 0,
      duration: .45, ease: 'power2.in', onComplete: finish
    });
  }

  /* ---------------- Write / edit ---------------- */
  function openWriteModal(letter) {
    editingId = letter ? letter.id : null;
    modalTitle.textContent = letter ? 'Edit Letter' : 'Write a Letter';
    finishBtn.textContent = letter ? 'Save changes' : 'Finish';
    titleInput.value = letter ? letter.title : '';
    bodyInput.value = letter ? letter.body : '';
    M.openModal(modal);
  }
  function closeWriteModal() { M.closeModal(modal); }

  function finishLetter() {
    var title = titleInput.value.trim();
    var body = bodyInput.value.trim();

    if (!body) {
      bodyInput.focus();
      if (!M.reduced) gsap.fromTo(bodyInput, { x: -6 }, { x: 0, duration: .4, ease: 'elastic.out(1, .3)' });
      return;
    }

    var list = getList();

    if (editingId) {
      list.forEach(function (l) {
        if (l.id === editingId) { l.title = title || 'Untitled'; l.body = body; }
      });
      save(list);
      closeWriteModal();
      renderAll();
      M.toast('Letter updated.');
      return;
    }

    var letter = { id: 'l-' + Date.now(), title: title || 'Untitled', body: body, date: new Date().toISOString() };
    list.push(letter);
    save(list);
    closeWriteModal();
    window.setTimeout(function () {
      addHeartAnimated(letter);
      M.toast('Letter saved.');
    }, M.reduced ? 0 : 260);
  }

  /* ---------------- Delete ---------------- */
  function deleteOpenLetter() {
    var id = openId;
    if (!id) return;
    M.confirm('Delete this letter? This can\u2019t be undone.', function () {
      save(getList().filter(function (l) { return l.id !== id; }));
      closeReader(true);
      renderAll();
      M.toast('Letter deleted.');
    });
  }

  /* ---------------- Init ---------------- */
  function init() {
    grid = document.getElementById('heartGrid');
    if (!grid) return;

    writeBtn   = document.getElementById('writeLetterBtn');
    modal      = document.getElementById('letterModal');
    modalTitle = document.getElementById('letterModalTitle');
    titleInput = document.getElementById('letterTitleInput');
    bodyInput  = document.getElementById('letterBodyInput');
    finishBtn  = document.getElementById('finishLetterBtn');

    reader      = document.getElementById('letterReader');
    readerSheet = document.getElementById('letterReaderSheet');
    readerTitle = document.getElementById('letterReaderTitle');
    readerDate  = document.getElementById('letterReaderDate');
    readerBody  = document.getElementById('letterReaderBody');
    editBtn     = document.getElementById('editLetterBtn');
    deleteBtn   = document.getElementById('deleteLetterBtn');

    renderAll();

    writeBtn.addEventListener('click', function () { openWriteModal(null); });
    finishBtn.addEventListener('click', finishLetter);

    editBtn.addEventListener('click', function () {
      var letter = findById(openId);
      if (!letter) return;
      closeReader(true);
      openWriteModal(letter);
    });
    deleteBtn.addEventListener('click', deleteOpenLetter);

    Array.prototype.forEach.call(modal.querySelectorAll('[data-modal-close="letterModal"]'),
      function (el) { el.addEventListener('click', closeWriteModal); });
    Array.prototype.forEach.call(reader.querySelectorAll('[data-reader-close]'),
      function (el) { el.addEventListener('click', function () { closeReader(); }); });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (reader.classList.contains('is-open')) closeReader();
      else if (modal.classList.contains('is-open')) closeWriteModal();
    });
  }

  return { init: init };
})();
