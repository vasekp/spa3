import {db, ObjectStore} from './log-db.js';
import {recordStore} from './log-record-store.js';

export const gameStore = new ObjectStore('log-gid');

gameStore.create = async function(name, tx) {
  let record = { name, date: Date.now() };
  await gameStore.add(record, tx);
  return new Game(record);
}

gameStore.delete = async function(game) {
  let tx = (await db).transaction(['log-gid', 'log-rec'], 'readwrite');
  ObjectStore.prototype.delete.call(this, game, tx);
  recordStore.deleteWhere('gid', +game.id, tx);
  tx.onerror = window.alert;
  return new Promise(resolve => tx.oncomplete = resolve);
}

gameStore.getAll = async function() {
  let results = await ObjectStore.prototype.getAll.call(this);
  return results.map(g => new Game(g));
}

gameStore.get = async function(id) {
  let result = await ObjectStore.prototype.get.call(this, id);
  return new Game(result);
}

class Game {
  constructor(record) {
    this._static = record;
    this._views = new Set();
  }

  static from(record) {
    return new Game(record);
  }

  get name() { return this._static.name; }
  get date() { return this._static.date; }
  get tag() { return this._static.tag; }
  get id() { return this._static.id; }

  set name(name) {
    for(let view of this._views)
      view.name = name;
    this._static.name = name;
    gameStore.update(this._static);
  }

  set date(date) {
    for(let view of this._views)
      view.date = date;
  }

  set tag(tag) {
    for(let view of this._views)
      view.tag = tag;
    this._static.tag = tag != 'none' ? tag : '';
    gameStore.update(this._static);
  }

  addView(elm) {
    this._views.add(elm);
    elm.name = this.name;
    elm.date = this.date;
    elm.tag = this.tag;
  }

  removeView(elm) {
    this._views.delete(elm);
  }
};
