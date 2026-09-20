/* ==========================================================================
   Something for Ely — components/lists.js
   Two small editable lists that share one component:
     • Reasons   — things you love about her
     • Our List  — things to do together, with tick-off checkboxes
   Add, EDIT and DELETE. Saved in Local Storage.
   ========================================================================== */

window.ElyLists = (function () {
  'use strict';

  var M = window.ElyMotion;

  var CONFIGS = [
    {
      key: 'ely_reasons_v1', gridId: 'reasonsGrid', btnId: 'addReasonBtn', checkable: false,
      eyebrow: 'small proofs', addTitle: 'Add a Reason', editTitle: 'Edit Reason',
      label: 'The reason', placeholder: 'The way you laugh at your own jokes before the end...',
      empty: 'No reasons yet. Add the first one.', deleteMsg: 'Delete this reason?',
      seeds: [
        'You make ordinary days feel like they were planned.',
        'The way you laugh a second before the joke ends.',
        'You remember the small things I say once and never repeat.',
        'You are kind when nobody is watching.',
        'Being around you is the quietest kind of happy.'
      ]
    },
    {
      key: 'ely_wishes_v1', gridId: 'wishesGrid', btnId: 'addWishBtn', checkable: true,
      eyebrow: 'someday soon', addTitle: 'Add to the List', editTitle: 'Edit List Item',
      label: 'Something to do together', placeholder: 'Watch the sunset from somewhere new...',
      empty: 'The list is empty. Add the first plan.', deleteMsg: 'Remove this from the list?',
      seeds: [
        'Watch a sunset from somewhere neither of us has been.',
        'Cook something far too ambitious together.',
        'A picnic with too much food.',
        'A long drive with the windows down and our song on.',
        'Dance in the kitchen, badly.',
        'Take a photo booth strip of dumb faces.'
      ]
    }
  ];

  /* one shared modal for every list */
  var modal, eyebrowEl, titleEl, labelEl, input, saveBtn;
  var active = null;      // config being edited in the modal
  var editingId = null;

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : str;
    return d.innerHTML;
  }

  function load(cfg) {
    try {
      var parsed = JSON.parse(localStorage.getItem(cfg.key));
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) { return null; }
  }
  function save(cfg, list) {
    try { localStorage.setItem(cfg.key, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function getList(cfg) {
    var list = load(cfg);
    if (!list) {
      list = cfg.seeds.map(function (text, i) { return { id: cfg.gridId + '-seed-' + i, text: text, done: false }; });
      save(cfg, list);
    }
    return list;
  }

  /* ---------------- Rendering ---------------- */
  function buildItem(cfg, item, number) {
    var el = document.createElement('div');
    el.className = 'note' + (item.done ? ' is-done' : '');

    var lead = cfg.checkable
      ? '<button type="button" class="note__check" role="checkbox" aria-checked="' + (!!item.done) + '" aria-label="Mark as done">' + (item.done ? '\u2713' : '') + '</button>'
      : '<span class="note__lead" aria-hidden="true">' + number + '</span>';

    el.innerHTML =
      lead +
      '<div class="note__main">' +
        '<p class="note__text">' + escapeHtml(item.text) + '</p>' +
        '<div class="note__actions">' +
          '<button type="button" class="chip-btn" data-act="edit">\u270E Edit</button>' +
          '<button type="button" class="chip-btn chip-btn--danger" data-act="delete">\u2715 Delete</button>' +
        '</div>' +
      '</div>';

    if (cfg.checkable) {
      el.querySelector('.note__check').addEventListener('click', function () { toggle(cfg, item.id); });
    }
    el.querySelector('[data-act="edit"]').addEventListener('click', function () { openModal(cfg, item); });
    el.querySelector('[data-act="delete"]').addEventListener('click', function () { remove(cfg, item); });
    return el;
  }

  function render(cfg) {
    var grid = document.getElementById(cfg.gridId);
    var list = getList(cfg);
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="note-empty">' + escapeHtml(cfg.empty) + '</p>';
      return;
    }
    list.forEach(function (item, i) { grid.appendChild(buildItem(cfg, item, i + 1)); });
  }

  function animateIn(cfg, id) {
    if (M.reduced) return;
    var grid = document.getElementById(cfg.gridId);
    var list = getList(cfg);
    var idx = list.map(function (l) { return l.id; }).indexOf(id);
    var el = grid.children[idx];
    if (el) gsap.fromTo(el, { opacity: 0, y: 24, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'back.out(1.6)' });
  }

  /* ---------------- Actions ---------------- */
  function toggle(cfg, id) {
    var list = getList(cfg);
    list.forEach(function (l) { if (l.id === id) l.done = !l.done; });
    save(cfg, list);
    render(cfg);
  }

  function remove(cfg, item) {
    M.confirm(cfg.deleteMsg, function () {
      save(cfg, getList(cfg).filter(function (l) { return l.id !== item.id; }));
      render(cfg);
      M.toast('Deleted.');
    });
  }

  /* ---------------- Modal ---------------- */
  function openModal(cfg, item) {
    active = cfg;
    editingId = item ? item.id : null;
    eyebrowEl.textContent = cfg.eyebrow;
    titleEl.textContent = item ? cfg.editTitle : cfg.addTitle;
    labelEl.textContent = cfg.label;
    input.placeholder = cfg.placeholder;
    input.value = item ? item.text : '';
    saveBtn.textContent = item ? 'Save changes' : 'Add';
    M.openModal(modal);
  }
  function closeModal() { M.closeModal(modal); }

  function saveText() {
    var text = input.value.trim();
    if (!text) {
      input.focus();
      if (!M.reduced) gsap.fromTo(input, { x: -6 }, { x: 0, duration: .4, ease: 'elastic.out(1, .3)' });
      return;
    }
    var cfg = active;
    var list = getList(cfg);

    if (editingId) {
      list.forEach(function (l) { if (l.id === editingId) l.text = text; });
      save(cfg, list);
      closeModal();
      render(cfg);
      M.toast('Updated.');
      return;
    }

    var item = { id: cfg.gridId + '-' + Date.now(), text: text, done: false };
    list.push(item);
    save(cfg, list);
    closeModal();
    window.setTimeout(function () {
      render(cfg);
      animateIn(cfg, item.id);
      M.toast('Added.');
    }, M.reduced ? 0 : 260);
  }

  /* ---------------- Init ---------------- */
  function init() {
    modal     = document.getElementById('textModal');
    eyebrowEl = document.getElementById('textModalEyebrow');
    titleEl   = document.getElementById('textModalTitle');
    labelEl   = document.getElementById('textModalLabel');
    input     = document.getElementById('textModalInput');
    saveBtn   = document.getElementById('textModalSave');
    if (!modal) return;

    CONFIGS.forEach(function (cfg) {
      if (!document.getElementById(cfg.gridId)) return;
      render(cfg);
      document.getElementById(cfg.btnId).addEventListener('click', function () { openModal(cfg, null); });
    });

    saveBtn.addEventListener('click', saveText);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveText(); }
    });
    Array.prototype.forEach.call(modal.querySelectorAll('[data-modal-close="textModal"]'),
      function (el) { el.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  return { init: init };
})();
