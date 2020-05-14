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
  rq.onerror = console.log;
  rq.onsuccess = e => {
    db = e.target.result;
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
  rq.onerror = console.log;
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
    tx.onerror = console.log;
  }
}

export function dbRequest(r, callback) {
  let tx = db.transaction(r.store, 'readwrite');
  let os = tx.objectStore(r.store);
  if(r.query === 'update') {
    let rq = os.put(r.record);
    rq.onerror = console.log;
    if(callback)
      rq.onsuccess = () => callback();
  } else if(r.query === 'delete') {
    let rq = os.delete(r.record.id);
    rq.onerror = console.log;
    if(callback)
      rq.onsuccess = () => callback();
  } else if(r.query === 'add') {
    let rq = os.add(r.record);
    rq.onerror = console.log;
    if(callback)
      rq.onsuccess = e => callback(e.target.result);
  }
}

export function deleteGame(_gid) {
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

export function getAllGames(callback) {
  let tx = db.transaction('log-gid', 'readonly');
  let os = tx.objectStore('log-gid');
  let rq = os.getAll();
  rq.onerror = console.log;
  rq.onsuccess = e => callback(e.target.result);
}

export function getAllRecords(gid, callback) {
  let tx = db.transaction('log-rec', 'readonly');
  let os = tx.objectStore('log-rec');
  let ix = os.index('gid');
  let rq = ix.getAll(+gid);
  rq.onerror = console.log;
  rq.onsuccess = e => callback(e.target.result);
}
