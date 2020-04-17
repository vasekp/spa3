'use strict';

var db;
var gid;
var list;

window.addEventListener('DOMContentLoaded', () => {
  list = document.getElementById('log-list');
  prepareDatabase();
  document.getElementById('plus').addEventListener('click', plus);
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
    let rq = os.getAllKeys();
    rq.onerror = console.log;
    rq.onsuccess = e => {
      let keys = e.target.result;
      if(keys.length > 0) {
        gid = keys[0];
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
    date: Date.now()
  };

  let rq = os.add(rec);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    gid = e.target.result;
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
    while(list.firstChild)
      list.removeChild(list.firstChild);
    results.forEach(record => addRecord(record));
    updateDiffs();
  };
  rq.onerror = console.log;
}

function plus(e) {
  closeAll();
  let elm = document.createElement('log-record');
  list.appendChild(elm);
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
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let date = Date.now();
  let record = { tag, gid, date, text: '' };
  let rq = os.add(record);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    record.id = e.target.result;
    elm.record = record;
    updateDiffs();
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
    elm.save(rev);
    elm.classList.remove('processing');
  };
}

function deleteRecord(elm) {
  closeAll();
  let tx = db.transaction('log-rec', 'readwrite');
  let os = tx.objectStore('log-rec');
  let rq = os.delete(elm.record.id);
  rq.onerror = console.log;
  rq.onsuccess = () => {
    elm.remove();
    updateDiffs();
  };
}

function filter(e) {
  let sel = e.detail.selected;
  closeAll();
  [...document.querySelectorAll('log-record')].forEach(elm =>
    elm.classList.toggle('hide', !sel[elm.record.tag]));
  updateDiffs();
}

function closeExcept(elm0) {
  [...list.children].forEach(elm => {
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

function updateDiffs() {
  let prev = null;
  [...document.querySelectorAll('log-record:not(.hide)')].forEach(elm => {
    elm.previous = prev;
    prev = elm.record;
  });
}
