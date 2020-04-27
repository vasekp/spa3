'use strict';

import '../components/loading.js';
import '../components/colorsel.js';
import '../components/logbook-record.js';
import '../components/logbook-list.js';
import '../components/logbook-game.js';
import {dateFormat} from './datetime.js';

var db;
var gid;
var list;

window.addEventListener('DOMContentLoaded', () => {
  list = document.getElementById('log-list');
  prepareDatabase();
  document.getElementById('plus').addEventListener('click', plus);
  document.getElementById('game-select').addEventListener('click', gameMenu);
  document.getElementById('tag-filter').addEventListener('change', filter);
  list.addEventListener('color-pick', e => materialize(e.target, e.detail.tag));
  list.addEventListener('record-open', e => closeExcept(e.target));
  list.addEventListener('record-save', e => autosave(e.target, e.detail.rev));
  list.addEventListener('move-start', e => closeAll());
  list.addEventListener('move-away', e => deleteRecord(e.target));
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
    let rq = os.getAll();
    rq.onerror = console.log;
    rq.onsuccess = e => {
      let games = e.target.result;
      if(games.length > 0) {
        populateGList(games);
        loadRecords(games[0].id);
      } else
        addTestData();
    }
  };
  rq.onerror = console.log;
}

function populateGList(games) {
  let glist = document.getElementById('game-list');
  games.forEach(game => {
    for(let i = 0; i < 5; i++) {
      let elm = document.createElement('log-game');
      elm.setAttribute('name', game.name);
      elm.setAttribute('date', game.date);
      elm.setAttribute('gid', game.id);
      elm.addEventListener('click', gameClicked);
      glist.appendChild(elm);
    }
  });
}

function addTestData() {
  let tx = db.transaction('log-gid', 'readwrite');
  let os = tx.objectStore('log-gid');
  let rec = {
    name: 'ABC',
    date: Date.now()
  };

  let rq = os.add(rec);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    let gid = e.target.result;
    rec.id = gid;
    populateGList([rec]);
    let tx = db.transaction('log-rec', 'readwrite');
    let os = tx.objectStore('log-rec');
    let date = Date.now()
    let records = [
      { tag: 1, gid, date, text: 'Příchod' },
      { tag: 2, gid, date, text: 'Upřesnítko' },
      { tag: 3, gid, date, text: 'Mezitajenka' },
      { tag: 4, gid, date, text: 'Nápověda' },
      { tag: 5, gid, date, text: 'Adresa' }
    ];
    records.forEach(i => os.add(i));
    tx.onerror = console.log;
    tx.oncomplete = () => loadRecords(gid);
  }
}

function loadRecords(_gid) {
  gid = +_gid;
  {
    let tx = db.transaction('log-gid', 'readonly');
    let os = tx.objectStore('log-gid');
    let rq = os.get(gid);
    rq.onerror = console.log;
    rq.onsuccess = e => {
      let rec = e.target.result;
      document.getElementById('gname').innerText = rec.name;
      document.getElementById('gdate').innerText = '(' + dateFormat(rec.date) + ')';
    };
  }
  {
    let tx = db.transaction('log-rec', 'readonly');
    let os = tx.objectStore('log-rec');
    let ix = os.index('gid');
    let rq = ix.getAll(gid);
    rq.onerror = console.log;
    rq.onsuccess = e => {
      let results = e.target.result;
      while(list.firstChild)
        list.removeChild(list.firstChild);
      results.forEach(record => addRecord(record));
    };
  }
}

function plus(e) {
  closeAll();
  let elm = document.createElement('log-record');
  list.appendChild(elm);
  elm.setAttribute('data-protected', '');
  elm.scrollIntoView();
  e.preventDefault();
}

function addRecord(record) {
  let elm = document.createElement('log-record');
  elm.record = record;
  list.appendChild(elm);
  return elm;
}

function materialize(elm, tag) {
  closeExcept(elm);
  if(elm.classList.contains('processing'))
    return;
  elm.classList.add('processing');
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let date = Date.now();
  let record = { tag, gid, date, text: '' };
  let rq = os.add(record);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    record.id = e.target.result;
    elm.removeAttribute('data-protected');
    elm.classList.remove('processing');
    elm.record = record;
    elm.open();
  };
}

function autosave(elm, rev) {
  elm.classList.add('processing');
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let rq = os.put(elm.record);
  rq.onerror = console.log;
  rq.onsuccess = () => {
    elm.notifySaved(rev);
    elm.classList.remove('processing');
  };
}

function deleteRecord(elm) {
  closeAll();
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let rq = os.delete(elm.record.id);
  rq.onerror = console.log;
  rq.onsuccess = () => elm.remove();
}

function filter(e) {
  let sel = e.detail.selected;
  closeAll();
  [...document.querySelectorAll('log-record')].forEach(elm =>
    elm.classList.toggle('hide', !sel[elm.record.tag]));
}

function closeExcept(elm0) {
  [...list.querySelectorAll('log-record')].forEach(elm => {
    if(elm === elm0)
      return;
    else if(elm.isTemp())
      list.removeChild(elm);
    else
      elm.close();
  });
}

function closeAll() {
  closeExcept(null);
}

function gameMenu() {
  document.getElementById('log-list').classList.add('zeroheight');
  document.getElementById('game-list').classList.remove('zeroheight');
  document.getElementById('log-sel').classList.add('zeroheight');
}

function gameClicked(e) {
  while(list.firstChild)
    list.removeChild(list.firstChild);
  let load = document.createElement('spa-loading');
  list.appendChild(load);
  loadRecords(e.currentTarget.getAttribute('gid'));
  document.getElementById('log-list').classList.remove('zeroheight');
  document.getElementById('game-list').classList.add('zeroheight');
  document.getElementById('log-sel').classList.remove('zeroheight');
}
