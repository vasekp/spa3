export const db = new Promise(async resolve => {
  //indexedDB.deleteDatabase('spa');
  let rq = indexedDB.open('spa', 1);
  let newDB = false;
  rq.onupgradeneeded = e => {
    let adb = e.target.result;
    if(e.oldVersion === 0) {
      adb.createObjectStore('log-gid', { keyPath: 'id', autoIncrement: true });
      adb.createObjectStore('log-rec', { keyPath: 'id', autoIncrement: true })
        .createIndex('gid', 'gid', { unique: false });
      newDB = true;
    }
  };
  rq.onerror = e => window.alert(e.target.error);
  rq.onsuccess = async e => {
    let adb = e.target.result;
    adb.onerror = e => window.alert(e.target.error);
    if(newDB)
      await addTestData(adb);
    resolve(adb);
  };
});

async function addTestData(adb) {
  let gid = await new Promise(resolve => {
    let tx = adb.transaction('log-gid', 'readwrite');
    let os = tx.objectStore('log-gid');
    let rec = {
      name: 'Příklad',
      date: Date.now()
    };
    let rq = os.add(rec);
    rq.onsuccess = e => resolve(e.target.result);
  });

  let tx = adb.transaction('log-rec', 'readwrite');
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
  return new Promise(resolve => tx.oncomplete = resolve);
}

export class ObjectStore {
  constructor(name) {
    this.name = name;
  }

  async _request(type, record, callback, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readwrite');
    let os = tx.objectStore(this.name);
    let rq = os[type](record);
    rq.onsuccess = (e) => {
      if(type === 'add')
        record.id = e.target.result;
      if(callback)
        callback(e.target.result);
    }
  }

  add(record, callback, tx) {
    this._request('add', record, callback, tx);
  }

  update(record, callback, tx) {
    this._request('put', record, callback, tx);
  }

  delete(record, callback, tx) {
    this._request('delete', record.id, callback, tx);
  }

  async deleteWhere(index, value, callback, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readwrite');
    let os = tx.objectStore(this.name);
    let ix = os.index(index);
    let rq = ix.openKeyCursor(IDBKeyRange.only(value));
    rq.onsuccess = () => {
      let cursor = rq.result;
      if(cursor) {
        os.delete(cursor.primaryKey);
        cursor.continue();
      } else if(callback)
        callback();
    }
  }

  async getAll(callback, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readonly');
    let os = tx.objectStore(this.name);
    let rq = os.getAll();
    rq.onsuccess = e => callback(e.target.result);
  }

  async getAllWhere(index, value, callback, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readonly');
    let os = tx.objectStore(this.name);
    let ix = os.index(index);
    let rq = ix.getAll(value);
    rq.onsuccess = e => callback(e.target.result);
  }
}
