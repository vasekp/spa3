'use strict';

var db;
var gid;
var list;

window.addEventListener('DOMContentLoaded', () => {
  list = document.getElementById('log-list');
  prepareDatabase();
  document.getElementById('plus').addEventListener('click', plus);
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
    while(list.firstChild)
      list.removeChild(list.firstChild);
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
}

function addRecord(tag, id, text) {
  let div = templateClone('log-rec');
  div.setAttribute('data-id', id);
  div.setAttribute('data-tag', tag);
  div.classList.add('color', 'c' + tag);
  let span = div.querySelector('.rec-text');
  span.innerText = text;
  div.addEventListener('click', () => editRecord(div));
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
    div.click();
  };
}

function editRecord(div) {
  if(div.hasAttribute('data-open'))
    return;
  if(closeOpenItems() > 0)
    return;
  div.setAttribute('data-open', '');
  let span = div.querySelector('.rec-text');
  let ta = document.createElement('textarea');
  if(span) {
    ta.value = span.innerText;
    div.removeChild(span);
  }
  ta.addEventListener('input', () => {
    div.setAttribute('data-changed', '');
    setTimeout(autosave, 300, div);
  });
  div.appendChild(ta);
  ta.focus();
}

function finishEditing(div) {
  autosave(div);
  let ta = div.querySelector('textarea');
  let span = document.createElement('span');
  span.classList.add('rec-text');
  span.innerText = ta.value;
  div.removeChild(ta);
  div.appendChild(span);
  div.removeAttribute('data-open');
}

function autosave(div) {
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
