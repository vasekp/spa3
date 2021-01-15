export const db = new Promise(async resolve => {
  //indexedDB.deleteDatabase('spa');
  const rq = indexedDB.open('spa', 1);
  let dataOldVersion;
  rq.onupgradeneeded = e => {
    const adb = e.target.result;
    dataOldVersion = e.oldVersion;
    if(e.oldVersion === 0) {
      adb.createObjectStore('log-gid', { keyPath: 'id', autoIncrement: true });
      adb.createObjectStore('log-rec', { keyPath: 'id', autoIncrement: true })
        .createIndex('gid', 'gid', { unique: false });
    }
  };
  rq.onerror = e => window.alert(e.target.error);
  rq.onsuccess = async e => {
    const adb = e.target.result;
    adb.dataOldVersion = dataOldVersion;
    adb.onerror = e => window.alert(e.target.error);
    resolve(adb);
  };
});

export class ObjectStore {
  constructor(name) {
    this.name = name;
  }

  async _request(type, record, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readwrite');
    const os = tx.objectStore(this.name);
    const rq = os[type](record);
    return new Promise(resolve => {
      rq.onsuccess = (e) => {
        if(type === 'add')
          record.id = e.target.result;
        resolve(e.target.result);
      };
    });
  }

  add(record, tx) {
    return this._request('add', record, tx);
  }

  update(record, tx) {
    return this._request('put', record, tx);
  }

  delete(record, tx) {
    return this._request('delete', record.id, tx);
  }

  get(id, tx) {
    return new Promise((resolve, reject) =>
      this._request('get', id, tx)
        .then(record => record ? resolve(record) : reject())
        .catch(err => reject(err)));
  }

  async deleteWhere(index, value, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readwrite');
    const os = tx.objectStore(this.name);
    const ix = os.index(index);
    const rq = ix.openKeyCursor(IDBKeyRange.only(value));
    return new Promise(resolve => {
      rq.onsuccess = () => {
        const cursor = rq.result;
        if(cursor) {
          os.delete(cursor.primaryKey);
          cursor.continue();
        } else resolve();
      };
    });
  }

  async getAll(tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readonly');
    const os = tx.objectStore(this.name);
    const rq = os.getAll();
    return new Promise(resolve => rq.onsuccess = e => resolve(e.target.result));
  }

  async getAllWhere(index, value, tx) {
    if(!tx)
      tx = (await db).transaction(this.name, 'readonly');
    const os = tx.objectStore(this.name);
    const ix = os.index(index);
    const rq = ix.getAll(value);
    return new Promise(resolve => rq.onsuccess = e => resolve(e.target.result));
  }
}
