import {Game} from './log-game.js';
import {Record} from './log-record.js';

let db;

export function prepareDatabase(callback) {
  //indexedDB.deleteDatabase('spa');
  let rq = indexedDB.open('spa', 1);
  let newDB = false;
  rq.onupgradeneeded = e => {
    db = e.target.result;
    if(e.oldVersion === 0) {
      let sGames = db.createObjectStore('log-gid', { keyPath: 'id', autoIncrement: true });
      let sNotes = db.createObjectStore('log-rec', { keyPath: 'id', autoIncrement: true });
      sNotes.createIndex('gid', 'gid', { unique: false });
      newDB = true;
    }
  };
  rq.onerror = e => window.alert(e.target.error);
  rq.onsuccess = e => {
    db = e.target.result;
    db.onerror = e => window.alert(e.target.error);
    if(newDB)
      addTestData(callback);
    else
      callback();
  };
}

function addTestData(callback) {
  let tx = db.transaction('log-gid', 'readwrite');
  let os = tx.objectStore('log-gid');
  let rec = {
    name: 'Příklad',
    date: Date.now()
  };

  let rq = os.add(rec);
  rq.onsuccess = e => {
    let gid = e.target.result;
    rec.id = gid;
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
    tx.oncomplete = callback;
  }
}

export function dbRequest(r, callback) {
  let tx = db.transaction(r.store, 'readwrite');
  let os = tx.objectStore(r.store);
  if(r.query === 'update') {
    let rq = os.put(r.record);
    if(callback)
      rq.onsuccess = () => callback();
  } else if(r.query === 'delete') {
    let rq = os.delete(r.record.id);
    if(callback)
      rq.onsuccess = () => callback();
  } else if(r.query === 'add') {
    let rq = os.add(r.record);
    if(callback)
      rq.onsuccess = e => callback(e.target.result);
  }
}

export function newGame(name) {
  let record = { name, date: Date.now() };
  dbRequest({ query: 'add', store: 'log-gid', record }, id => record.id = id);
  return Game.from(record);
}

export function deleteGame(game) {
  let gid = game.id;
  let tx = db.transaction(['log-gid', 'log-rec'], 'readwrite');
  let os = tx.objectStore('log-gid');
  let rq = os.delete(gid);
  rq.onsuccess = () => game.notifyRemoved();
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

export function newRecord(gid, tag, geo) {
  let record = { gid: +gid, tag, date: Date.now(), text: '', geo };
  dbRequest({query: 'add', store: 'log-rec', record }, id => record.id = id);
  return Record.from(record);
}

export function deleteRecord(record) {
  dbRequest({query: 'delete', store: 'log-rec', record}, () => record.notifyRemoved());
}

export function getAllGames(callback) {
  let tx = db.transaction('log-gid', 'readonly');
  let os = tx.objectStore('log-gid');
  let rq = os.getAll();
  rq.onsuccess = e => callback(e.target.result);
}

export function getAllRecords(gid, callback) {
  let tx = db.transaction('log-rec', 'readonly');
  let os = tx.objectStore('log-rec');
  let ix = os.index('gid');
  let rq = ix.getAll(+gid);
  rq.onsuccess = e => callback(e.target.result);
}
