/* ==========================================================================
   Something for Ely — components/memories.js
   Photo memories: add a picture, flip the card, write a note on the back.
   Add, EDIT, FLIP and DELETE. Saved in Local Storage.

   Photos are shrunk in the browser before saving (about 1000px on the long
   side) so plenty of them fit in Local Storage.
   ========================================================================== */

window.ElyMemories = (function () {
  'use strict';

  var STORAGE_KEY = 'ely_memories_v1';
  var M = window.ElyMotion;

  var MAX_SIDE = 1000;     // longest edge of a saved photo, in pixels
  var QUALITY  = 0.8;      // JPEG quality of a saved photo

  var grid, addBtn, modal, modalTitle, saveBtn, errorEl;
  var fileInput, uploadFace, uploadText, captionInput, dateInput, noteInput;
  var pendingPhoto = null;    // data URL of the photo chosen in the modal
  var editingId = null;
  var reading = false;        // true while a chosen photo is being processed

  /* ---------------- Storage ---------------- */
  function load() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) { return null; }
  }
  /* Returns false when the browser has no room left (photos are big). */
  function save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function getList() { return load() || []; }
  function findById(id) {
    return getList().filter(function (m) { return m.id === id; })[0] || null;
  }

  /* ---------------- Helpers ---------------- */
  function formatAdded(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function formatDay(ymd) {           // 'YYYY-MM-DD' -> local date, no timezone shift
    var p = String(ymd).split('-');
    if (p.length !== 3) return '';
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function shownDate(mem) {
    return (mem.when && formatDay(mem.when)) || formatAdded(mem.added);
  }
  /* A steady little tilt per memory, so cards don't re-shuffle on every render. */
  function tiltFor(id) {
    var h = 0, s = String(id);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (((h % 100) + 100) % 100) / 100 * 5 - 2.5;        // -2.5deg .. 2.5deg
  }

  /* ---------------- Photo -> small JPEG data URL ---------------- */
  function shrinkPhoto(file, done) {
    if (!file || !/^image\//.test(file.type)) { done(null); return; }

    var reader = new FileReader();
    reader.onerror = function () { done(null); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { done(null); };
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { done(null); return; }
        var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';                                // PNGs with see-through areas
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try { done(canvas.toDataURL('image/jpeg', QUALITY)); }
        catch (e) { done(null); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- Cards ---------------- */
  function setFlipped(card, flipped) {
    card.classList.toggle('is-flipped', flipped);
    card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    var front = card.querySelector('.memory__face--front');
    var back = card.querySelector('.memory__face--back');
    front.setAttribute('aria-hidden', flipped ? 'true' : 'false');
    back.setAttribute('aria-hidden', flipped ? 'false' : 'true');
  }
  function toggleFlip(card) { setFlipped(card, !card.classList.contains('is-flipped')); }

  function buildItem(mem) {
    var item = document.createElement('div');
    item.className = 'memory-item';
    item.style.setProperty('--tilt', tiltFor(mem.id).toFixed(2) + 'deg');

    var card = document.createElement('div');
    card.className = 'memory';
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-label',
      (mem.caption ? mem.caption + '. ' : '') + 'Press to flip the photo and read the note on the back.');

    var rotator = document.createElement('div');
    rotator.className = 'memory__rotator';

    /* front: the photo */
    var front = document.createElement('div');
    front.className = 'memory__face memory__face--front';
    var tape = document.createElement('span');
    tape.className = 'memory__tape';
    tape.setAttribute('aria-hidden', 'true');
    var photo = document.createElement('div');
    photo.className = 'memory__photo';
    photo.setAttribute('role', 'img');
    photo.setAttribute('aria-label', mem.caption || 'A memory');
    photo.style.backgroundImage = 'url("' + mem.photo + '")';
    var caption = document.createElement('p');
    caption.className = 'memory__caption';
    caption.textContent = mem.caption || '';
    front.appendChild(tape);
    front.appendChild(photo);
    front.appendChild(caption);

    /* back: the date and the note */
    var back = document.createElement('div');
    back.className = 'memory__face memory__face--back';
    var date = document.createElement('p');
    date.className = 'memory__back-date';
    date.textContent = shownDate(mem);
    var note = document.createElement('p');
    note.className = 'memory__back-note' + (mem.note ? '' : ' memory__back-note--empty');
    note.textContent = mem.note || 'Nothing written on the back yet.';
    back.appendChild(date);
    back.appendChild(note);

    rotator.appendChild(front);
    rotator.appendChild(back);
    card.appendChild(rotator);
    setFlipped(card, false);

    card.addEventListener('click', function () { toggleFlip(card); });
    card.addEventListener('keydown', function (e) {
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFlip(card); }
    });

    var actions = document.createElement('div');
    actions.className = 'memory__actions';
    actions.innerHTML =
      '<button type="button" class="chip-btn chip-btn--quiet" data-act="flip">\u21BB Flip</button>' +
      '<button type="button" class="chip-btn" data-act="edit">\u270E Edit</button>' +
      '<button type="button" class="chip-btn chip-btn--danger" data-act="delete">\u2715 Delete</button>';
    actions.querySelector('[data-act="flip"]').addEventListener('click', function () { toggleFlip(card); });
    actions.querySelector('[data-act="edit"]').addEventListener('click', function () { openMemoryModal(mem); });
    actions.querySelector('[data-act="delete"]').addEventListener('click', function () { removeMemory(mem); });

    item.appendChild(card);
    item.appendChild(actions);
    return item;
  }

  function renderAll() {
    var list = getList();
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="memory-empty">No memories yet. Add the first photo.</p>';
      return;
    }
    list.slice().reverse().forEach(function (mem) { grid.appendChild(buildItem(mem)); });
  }

  function addItemAnimated(mem) {
    var empty = grid.querySelector('.memory-empty');
    if (empty) empty.remove();
    var el = buildItem(mem);
    grid.insertBefore(el, grid.firstChild);
    if (M.reduced) return;
    gsap.fromTo(el, { opacity: 0, y: 34, scale: .9 }, { opacity: 1, y: 0, scale: 1, duration: .6, ease: 'back.out(1.5)' });
  }

  function removeMemory(mem) {
    M.confirm('Delete this memory? The photo and its note will be gone.', function () {
      save(getList().filter(function (m) { return m.id !== mem.id; }));
      renderAll();
      M.toast('Memory deleted.');
    });
  }

  /* ---------------- Modal ---------------- */
  function showPhoto(dataUrl) {
    if (dataUrl) {
      uploadFace.style.backgroundImage = 'url("' + dataUrl + '")';
      uploadFace.classList.add('has-image');
      uploadText.textContent = 'Change photo';
    } else {
      uploadFace.style.backgroundImage = '';
      uploadFace.classList.remove('has-image');
      uploadText.textContent = 'Choose a photo';
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function openMemoryModal(mem) {
    editingId = mem ? mem.id : null;
    pendingPhoto = mem ? mem.photo : null;
    reading = false;
    modalTitle.textContent = mem ? 'Edit Memory' : 'Add a Memory';
    saveBtn.textContent = mem ? 'Save changes' : 'Add Memory';
    captionInput.value = mem ? (mem.caption || '') : '';
    dateInput.value = mem ? (mem.when || '') : '';
    noteInput.value = mem ? (mem.note || '') : '';
    fileInput.value = '';
    showPhoto(pendingPhoto);
    showError('');
    M.openModal(modal);
  }
  function closeMemoryModal() { M.closeModal(modal); }

  function onPhotoChosen() {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    reading = true;
    saveBtn.disabled = true;
    uploadText.textContent = 'Getting your photo ready\u2026';
    showError('');

    shrinkPhoto(file, function (dataUrl) {
      reading = false;
      saveBtn.disabled = false;
      fileInput.value = '';                 // lets the same file be picked again
      if (!dataUrl) {
        showPhoto(pendingPhoto);
        showError('That file couldn\u2019t be opened as a photo. Try a JPG or PNG.');
        return;
      }
      pendingPhoto = dataUrl;
      showPhoto(pendingPhoto);
    });
  }

  function saveMemory() {
    if (reading) return;

    if (!pendingPhoto) {
      showError('Choose a photo first.');
      if (!M.reduced) gsap.fromTo(uploadFace, { x: -6 }, { x: 0, duration: .4, ease: 'elastic.out(1, .3)' });
      return;
    }

    var caption = captionInput.value.trim();
    var note = noteInput.value.trim();
    var when = dateInput.value || '';
    var list = getList();

    if (editingId) {
      list.forEach(function (m) {
        if (m.id === editingId) { m.photo = pendingPhoto; m.caption = caption; m.note = note; m.when = when; }
      });
      if (!save(list)) { showError(noRoomMessage()); return; }
      closeMemoryModal();
      renderAll();
      M.toast('Memory updated.');
      return;
    }

    var mem = {
      id: 'm-' + Date.now(),
      photo: pendingPhoto,
      caption: caption,
      note: note,
      when: when,
      added: new Date().toISOString()
    };
    list.push(mem);
    if (!save(list)) { showError(noRoomMessage()); return; }

    closeMemoryModal();
    window.setTimeout(function () {
      addItemAnimated(mem);
      M.toast('Memory saved.');
    }, M.reduced ? 0 : 260);
  }

  function noRoomMessage() {
    return 'There isn\u2019t enough room left in this browser to keep another photo. Delete an older memory and try again.';
  }

  /* ---------------- Init ---------------- */
  function init() {
    grid = document.getElementById('memoryGrid');
    if (!grid) return;

    addBtn       = document.getElementById('addMemoryBtn');
    modal        = document.getElementById('memoryModal');
    modalTitle   = document.getElementById('memoryModalTitle');
    fileInput    = document.getElementById('memoryPhotoInput');
    uploadFace   = document.getElementById('memoryUploadFace');
    uploadText   = document.getElementById('memoryUploadText');
    captionInput = document.getElementById('memoryCaptionInput');
    dateInput    = document.getElementById('memoryDateInput');
    noteInput    = document.getElementById('memoryNoteInput');
    saveBtn      = document.getElementById('saveMemoryBtn');
    errorEl      = document.getElementById('memoryError');

    renderAll();

    addBtn.addEventListener('click', function () { openMemoryModal(null); });
    saveBtn.addEventListener('click', saveMemory);
    fileInput.addEventListener('change', onPhotoChosen);

    Array.prototype.forEach.call(modal.querySelectorAll('[data-modal-close="memoryModal"]'),
      function (el) { el.addEventListener('click', closeMemoryModal); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeMemoryModal();
    });
  }

  return { init: init };
})();
