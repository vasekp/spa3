'use strict';

var db;
var gid;
var list;
var autosaveTimer;
var touch;

window.addEventListener('DOMContentLoaded', () => {
  list = document.getElementById('log-list');
  prepareDatabase();
  document.getElementById('plus').addEventListener('click', plus);
  [...document.querySelectorAll('.log-fil .col-sel')].forEach(elm =>
    elm.addEventListener('click', () => filterTag(elm.getAttribute('data-tag'))));
});

function prepareDatabase() {
  //indexedDB.deleteDatabase('spa');
  let rq = indexedDB.open('spa', 1);
  rq.onupgradeneeded = e => {
    db = e.target.result;
    if(e.oldVersion === 0) {
      let sGames = db.createObjectStore('log-gid', { keyPath: 'id', autoIncrement: true });
      let sNotes = db.createObjectStore('log-rec', { keyPath: 'id', autoIncrement: true });
      sNotes.createIndex('gid', 'gid', { unique: false });
    }
  };
  rq.onsuccess = e => {
    db = e.target.result;
    let tx = db.transaction('log-gid', 'readonly');
    let os = tx.objectStore('log-gid');
    let rq = os.getAllKeys();
    rq.onerror = console.log;
    rq.onsuccess = e => {
      let keys = e.target.result;
      if(keys.length > 0) {
        gid = keys[0];
        console.log('Using gid ' + gid);
        loadRecords();
      } else
        addTestData();
    }
  };
  rq.onerror = console.log;
}

function addTestData() {
  console.log('Adding test data');
  let tx = db.transaction('log-gid', 'readwrite');
  let os = tx.objectStore('log-gid');
  let rec = {
    name: 'ABC',
    date: new Date()
  };

  let rq = os.add(rec);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    gid = e.target.result;
    let tx = db.transaction('log-rec', 'readwrite');
    let os = tx.objectStore('log-rec');
    let records = [
      { tag: 1, gid, text: 'Příchod' },
      { tag: 2, gid, text: 'Upřesnítko' },
      { tag: 3, gid, text: 'Mezitajenka' },
      { tag: 4, gid, text: 'Nápověda' },
      { tag: 5, gid, text: 'Adresa' }
    ];
    records.forEach(i => os.add(i));
    tx.onerror = console.log;
    tx.oncomplete = loadRecords;
  }
}

function loadRecords() {
  let tx = db.transaction('log-rec', 'readonly');
  let os = tx.objectStore('log-rec');
  let ix = os.index('gid');
  let rq = ix.getAll(gid);
  rq.onsuccess = e => {
    let results = e.target.result;
    document.getElementById('loading').remove();
    results.forEach(record => addRecord(record.tag, record.id, record.text));
  };
  rq.onerror = console.log;
}

function closeOpenItems() {
  let count = 0;
  [...document.querySelectorAll('[data-open]')].forEach(div => {
    if(div.classList.contains('processing'))
      return;
    else if(!div.hasAttribute('data-id')) {
      list.removeChild(div);
      count++;
    } else {
      finishEditing(div);
      count++;
    }
  });
  return count;
}

function templateClone(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

function plus(e) {
  closeOpenItems();
  let div = templateClone('log-rec-new');
  div.setAttribute('data-open', '');
  [...div.querySelectorAll('.col-sel')].forEach(elm =>
    elm.addEventListener('click', () => newRecord(elm.getAttribute('data-tag'))));
  list.appendChild(div);
  div.scrollIntoView();
  e.preventDefault();
}

function addRecord(tag, id, text) {
  let div = templateClone('log-rec');
  div.setAttribute('data-id', id);
  div.setAttribute('data-tag', tag);
  div.classList.add('color', 'c' + tag);
  let span = div.querySelector('.rec-text');
  span.innerText = text;
  div.addEventListener('click', () => editRecord(div));
  div.addEventListener('pointerdown', pDown);
  div.addEventListener('pointerup', pUp);
  div.addEventListener('pointermove', pMove);
  div.addEventListener('pointercancel', pCancel);
  list.appendChild(div);
  return div;
}

function newRecord(tag) {
  closeOpenItems();
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let record = { tag, gid, text: '' };
  let rq = os.add(record);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    let id = e.target.result;
    let div = addRecord(tag, id, '');
    editRecord(div);
  };
}

function editRecord(div) {
  if(div.hasAttribute('data-open'))
    return;
  div.setAttribute('data-open', '');
  let span = div.querySelector('.rec-text');
  let ta = document.createElement('textarea');
  ta.value = span.innerText;
  span.style.visibility = 'hidden';
  ta.addEventListener('input', () => {
    span.innerText = ta.value;
    div.setAttribute('data-changed', '');
    if(autosaveTimer)
      clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosave, 300, div);
  });
  ta.addEventListener('keydown', e => {
    if(e.key === "Enter") {
      finishEditing(div);
      e.preventDefault();
    }
  });
  div.querySelector('.cont-box').appendChild(ta);
  ta.focus();
}

function finishEditing(div) {
  autosave(div);
  let ta = div.querySelector('textarea');
  let span = div.querySelector('.rec-text');
  span.style.visibility = 'visible';
  div.querySelector('.cont-box').removeChild(ta);
  div.removeAttribute('data-open');
}

function autosave(div) {
  autosaveTimer = null;
  if(!div.hasAttribute('data-changed'))
    return;
  div.classList.add('processing');
  let id = +div.getAttribute('data-id');
  let tag = div.getAttribute('data-tag');
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let ta = div.querySelector('textarea');
  let record = { id, tag, gid, text: ta.value };
  let rq = os.put(record);
  rq.onerror = console.log;
  rq.onsuccess = () => {
    div.classList.remove('processing');
    div.removeAttribute('data-changed');
  };
}

function deleteRecord(div) {
  closeOpenItems();
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let id = +div.getAttribute('data-id');
  let rq = os.delete(id);
  rq.onerror = console.log;
  rq.onsuccess = () => div.remove();
}

function filterTag(tag) {
  closeOpenItems();
  let sel = {};
  [...document.querySelectorAll('.log-fil .col-sel')].forEach(elm =>
    sel[elm.getAttribute('data-tag')] = elm.hasAttribute('data-selected'));
  if(tag === 'all') {
    for(let i in sel)
      sel[i] = true;
  } else if(sel.all) {
    for(let i in sel)
      sel[i] = i === tag;
  } else {
    sel[tag] = !sel[tag];
    let empty = Object.values(sel).every(x => !x);
    if(empty) {
      for(let i in sel)
        sel[i] = true;
    }
  }
  [...document.querySelectorAll('.log-fil .col-sel')].forEach(elm =>
    elm.toggleAttribute('data-selected', sel[elm.getAttribute('data-tag')]));

  [...document.querySelectorAll('.log-rec')].forEach(elm =>
    elm.classList.toggle('hide', !sel[elm.getAttribute('data-tag')]));
}

function pActive(elm) {
  return elm.hasAttribute('data-pointer');
}

function pDown(e) {
  let elm = e.currentTarget;
  if(pActive(elm) || elm.hasAttribute('data-open'))
    return;
  elm.setAttribute('data-pointer', e.pointerId);
  elm.setPointerCapture(e.pointerId);
  touch = {
    x: e.x,
    t: e.timeStamp,
    w: elm.clientWidth
  };
}

function pUp(e) {
  let elm = e.currentTarget;
  if(!pActive(elm) || elm.getAttribute('data-pointer') != e.pointerId)
    return;
  elm.removeAttribute('data-pointer');
  elm.releasePointerCapture(e.pointerId);
  let dx = (e.x - touch.x) / touch.w;
  let vx = dx / (e.timeStamp - touch.t) * 1000;
  if(Math.abs(dx) > .5 || (Math.abs(vx) > 1 && dx*vx > 0))
    finishMove(elm, dx);
  else
    revertMove(elm);
}

function pMove(e) {
  let elm = e.currentTarget;
  if(!pActive(elm) || elm.getAttribute('data-pointer') != e.pointerId)
    return;
  closeOpenItems();
  let dx = e.x - touch.x;
  if(Math.abs(dx) < 0.05 * touch.w)
    elm.style.transform = '';
  else
    elm.style.transform = `translateX(${dx}px)`;
}

function pCancel(e) {
  let elm = e.currentTarget;
  if(!pActive(elm) || elm.getAttribute('data-pointer') != e.pointerId)
    return;
  elm.removeAttribute('data-pointer');
  elm.releasePointerCapture(e.pointerId);
  revertMove(elm);
}

function revertMove(div) {
  div.style.transition = 'transform .5s';
  div.style.transform = '';
  let cb = () => {
    div.style.transition = '';
    div.removeEventListener('transitionend', cb);
  };
  div.addEventListener('transitionend', cb);
}

function finishMove(div, dir) {
  div.style.transition = 'transform .5s';
  div.style.transform = `translateX(${dir > 0 ? '120%' : '-120%'})`;
  let cb = () => {
    div.style.transition = '';
    div.removeEventListener('transitionend', cb);
    deleteRecord(div);
  };
  div.addEventListener('transitionend', cb);
}
