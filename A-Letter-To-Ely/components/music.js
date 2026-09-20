/* ==========================================================================
   Something for Ely — components/music.js
   Dedicated songs, played in-page via the official Spotify embed.
   Add, EDIT (link or note) and REMOVE.
   ========================================================================== */

window.ElyMusic = (function () {
  'use strict';

  var STORAGE_KEY = 'ely_songs_v1';    // same key as before
  var M = window.ElyMotion;

  var grid, dedicateBtn, modal, modalTitle, linkInput, noteInput, saveBtn, errorEl, previewEl;
  var pendingParsed = null;   // { type, id, url }
  var editingId = null;

  function parseSpotifyUrl(raw) {
    if (!raw) return null;
    var t = raw.trim();
    var m = t.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i);
    if (m) return { type: m[1].toLowerCase(), id: m[2], url: t };
    var m2 = t.match(/spotify:(track|album|playlist|episode):([a-zA-Z0-9]+)/i);
    if (m2) return { type: m2[1].toLowerCase(), id: m2[2], url: t };
    return null;
  }

  function buildIframe(parsed, compact) {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://open.spotify.com/embed/' + parsed.type + '/' + parsed.id + '?utm_source=generator&theme=0';
    iframe.width = '100%';
    iframe.height = compact ? '152' : '352';
    iframe.frameBorder = '0';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.title = 'Spotify player';
    return iframe;
  }

  function seedSongs() {
    return [
      { id: 's-1', type: 'track', spotifyId: '0V3wPSX9ygBnCm8psDIegu', note: 'The one that sounds like the beginning of something.' },
      { id: 's-2', type: 'track', spotifyId: '2XU0IDbvvsk2GkbogcOh1P', note: 'For the long drives, windows down.' }
    ];
  }

  function load() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) { return null; }
  }
  function save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function getList() {
    var list = load();
    if (!list) { list = seedSongs(); save(list); }
    return list;
  }
  function findById(id) {
    return getList().filter(function (s) { return s.id === id; })[0] || null;
  }

  /* ---------------- Rendering ---------------- */
  function buildCard(song) {
    var card = document.createElement('div');
    card.className = 'music-card';

    var frame = document.createElement('div');
    frame.className = 'music-card__frame';
    frame.appendChild(buildIframe({ type: song.type, id: song.spotifyId }, false));
    card.appendChild(frame);

    if (song.note) {
      var note = document.createElement('p');
      note.className = 'music-card__note';
      note.textContent = '\u201C' + song.note + '\u201D';
      card.appendChild(note);
    }

    var actions = document.createElement('div');
    actions.className = 'music-card__actions';
    actions.innerHTML =
      '<button type="button" class="chip-btn" data-act="edit">\u270E Edit</button>' +
      '<button type="button" class="chip-btn chip-btn--danger" data-act="delete">\u2715 Remove</button>';
    actions.querySelector('[data-act="edit"]').addEventListener('click', function () { openDedicateModal(song); });
    actions.querySelector('[data-act="delete"]').addEventListener('click', function () { removeSong(song); });
    card.appendChild(actions);
    return card;
  }

  function renderAll() {
    var list = getList();
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="music-empty">No songs dedicated yet. Add the first one.</p>';
      return;
    }
    list.forEach(function (song) { grid.appendChild(buildCard(song)); });
  }

  function addCardAnimated(song) {
    var empty = grid.querySelector('.music-empty');
    if (empty) empty.remove();
    var card = buildCard(song);
    grid.appendChild(card);
    if (M.reduced) return;
    gsap.fromTo(card, { opacity: 0, y: 34, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: .6, ease: 'power3.out' });
  }

  function removeSong(song) {
    M.confirm('Remove this song from the list?', function () {
      save(getList().filter(function (s) { return s.id !== song.id; }));
      renderAll();
      M.toast('Song removed.');
    }, 'Remove');
  }

  /* ---------------- Modal ---------------- */
  function resetModal() {
    linkInput.value = '';
    noteInput.value = '';
    errorEl.hidden = true;
    previewEl.hidden = true;
    previewEl.innerHTML = '';
    saveBtn.disabled = true;
    pendingParsed = null;
  }

  function openDedicateModal(song) {
    resetModal();
    editingId = song ? song.id : null;
    modalTitle.textContent = song ? 'Edit Song' : 'Dedicate a Song';
    saveBtn.textContent = song ? 'Save changes' : 'Add Song';
    if (song) {
      linkInput.value = 'https://open.spotify.com/' + song.type + '/' + song.spotifyId;
      noteInput.value = song.note || '';
      handleLinkChange();
    }
    M.openModal(modal);
  }
  function closeDedicateModal() { M.closeModal(modal); }

  var debounceTimer = null;
  function onLinkInput() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(handleLinkChange, 260);
  }

  function handleLinkChange() {
    var val = linkInput.value.trim();
    previewEl.innerHTML = '';
    previewEl.hidden = true;
    pendingParsed = null;
    saveBtn.disabled = true;

    if (!val) { errorEl.hidden = true; return; }

    var parsed = parseSpotifyUrl(val);
    if (!parsed) { errorEl.hidden = false; return; }

    errorEl.hidden = true;
    pendingParsed = parsed;
    saveBtn.disabled = false;
    previewEl.appendChild(buildIframe(parsed, true));
    previewEl.hidden = false;
  }

  function saveSong() {
    if (!pendingParsed) return;
    var note = noteInput.value.trim();
    var list = getList();

    if (editingId) {
      list.forEach(function (s) {
        if (s.id === editingId) { s.type = pendingParsed.type; s.spotifyId = pendingParsed.id; s.note = note; }
      });
      save(list);
      closeDedicateModal();
      renderAll();
      M.toast('Song updated.');
      return;
    }

    var song = { id: 's-' + Date.now(), type: pendingParsed.type, spotifyId: pendingParsed.id, note: note };
    list.push(song);
    save(list);
    closeDedicateModal();
    window.setTimeout(function () {
      addCardAnimated(song);
      M.toast('Song dedicated.');
    }, M.reduced ? 0 : 260);
  }

  /* ---------------- Init ---------------- */
  function init() {
    grid = document.getElementById('musicGrid');
    if (!grid) return;

    dedicateBtn = document.getElementById('dedicateSongBtn');
    modal       = document.getElementById('musicModal');
    modalTitle  = document.getElementById('musicModalTitle');
    linkInput   = document.getElementById('spotifyLinkInput');
    noteInput   = document.getElementById('songNoteInput');
    saveBtn     = document.getElementById('saveSongBtn');
    errorEl     = document.getElementById('spotifyError');
    previewEl   = document.getElementById('spotifyPreview');

    renderAll();

    dedicateBtn.addEventListener('click', function () { openDedicateModal(null); });
    saveBtn.addEventListener('click', saveSong);
    linkInput.addEventListener('input', onLinkInput);

    Array.prototype.forEach.call(modal.querySelectorAll('[data-modal-close="musicModal"]'),
      function (el) { el.addEventListener('click', closeDedicateModal); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDedicateModal();
    });
  }

  return { init: init };
})();
