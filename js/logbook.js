'use strict';

import '../components/spa-loading.js';
import '../components/spa-colors.js';
import '../components/log-record.js';
import '../components/log-list.js';
import '../components/log-game.js';
import {dateFormat} from './datetime.js';

var db;

let views = {
  records: 0,
  games: 1
};
let curView = views.records;

window.addEventListener('DOMContentLoaded', () => {
  prepareDatabase();
  document.getElementById('plus').addEventListener('click', plus);
  document.getElementById('game-select').addEventListener('click', gameMenu);
  document.getElementById('tag-filter').addEventListener('change', filter);
  window.addEventListener('db-request', e => dbRequest(e.detail));
  document.getElementById('game-list').addEventListener('game-clicked', e => gameClicked(e.detail.gid));
  document.getElementById('game-list').addEventListener('delete-game', e => deleteGame(e.detail.gid));
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

function addTestData() {
  let tx = db.transaction('log-gid', 'readwrite');
  let os = tx.objectStore('log-gid');
  let rec = {
    name: 'Příklad',
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
  let list = document.getElementById('log-list');
  while(list.firstChild)
    list.removeChild(list.firstChild);
  let load = document.createElement('spa-loading');
  list.appendChild(load);
  let gid = +_gid;
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
  list.setAttribute('data-gid', gid);
}

function addRecord(record) {
  let elm = document.createElement('log-record');
  elm.record = record;
  document.getElementById('log-list').appendChild(elm);
  return elm;
}

function populateGList(games) {
  let glist = document.getElementById('game-list');
  games.forEach(game => {
    let elm = document.createElement('log-game');
    elm.record = game;
    glist.appendChild(elm);
  });
}

function plus(e) {
  document.getElementById('tag-filter').selectAll();
  if(curView == views.records) {
    let elm = document.createElement('log-record');
    document.getElementById('log-list').appendChild(elm);
    elm.setAttribute('data-protected', '');
    elm.scrollIntoView();
  } else {
    let elm = document.createElement('log-game');
    document.getElementById('game-list').appendChild(elm);
    elm.scrollIntoView();
    elm.focus();
  }
}

function filter(e) {
  let sel = e.detail.selected;
  if(curView == views.records) {
    document.getElementById('log-list').querySelectorAll('log-record').forEach(elm =>
      elm.classList.toggle('hide', !sel[elm.record.tag]));
  } else {
    document.getElementById('game-list').querySelectorAll('log-game').forEach(elm => {
      let show = elm.record.color ? sel[elm.record.color] : sel.all;
      elm.classList.toggle('hide', !show);
    });
  }
}

function gameMenu() {
  document.getElementById('log-list').classList.add('zeroheight');
  document.getElementById('game-list').classList.remove('zeroheight');
  document.getElementById('log-sel').classList.add('zeroheight');
  document.getElementById('tag-filter').selectAll();
  curView = views.games;
}

function gameClicked(gid) {
  loadRecords(gid);
  document.getElementById('log-list').classList.remove('zeroheight');
  document.getElementById('game-list').classList.add('zeroheight');
  document.getElementById('log-sel').classList.remove('zeroheight');
  document.getElementById('tag-filter').selectAll();
  curView = views.records;
}

function dbRequest(r) {
  let tx = db.transaction(r.store, 'readwrite');
  let os = tx.objectStore(r.store);
  if(r.query === 'update') {
    let rq = os.put(r.record);
    rq.onerror = console.log;
    rq.onsuccess = r.callback;
  } else if(r.query === 'delete') {
    let rq = os.delete(r.record.id);
    rq.onerror = console.log;
    rq.onsuccess = r.callback;
  } else if(r.query === 'add') {
    let rq = os.add(r.record);
    rq.onerror = console.log;
    rq.onsuccess = e => {
      r.record.id = e.target.result;
      r.callback(r.record);
    }
  }
}

function deleteGame(_gid) {
  let gid = +_gid;
  let tx = db.transaction(['log-gid', 'log-rec'], 'readwrite');
  let os = tx.objectStore('log-gid');
  let rq = os.delete(gid);
  rq.onerror = console.log;
  os = tx.objectStore('log-rec');
  let ix = os.index('gid');
  rq = ix.openKeyCursor(IDBKeyRange.only(gid));
  rq.onsuccess = () => {
    let cursor = rq.result;
    if(cursor) {
      os.delete(cursor.primaryKey);
      cursor.continue();
    }
  }
}
