import {db, ObjectStore} from './log-db.js';
import {recordStore} from './log-record.js';

export const gameStore = new ObjectStore('log-gid');

gameStore.create = function(name) {
  let record = { name, date: Date.now() };
  gameStore.add(record);
  return new Game(record);
}

gameStore.delete = function(game) {
  let tx = db.transaction(['log-gid', 'log-rec'], 'readwrite');
  ObjectStore.prototype.delete.call(this, game, null, tx);
  recordStore.deleteWhere('gid', +game.id, null, tx);
  tx.oncomplete = () => game.notifyRemoved();
  tx.onerror = window.alert;
}

gameStore.getAll = function(callback) {
  ObjectStore.prototype.getAll.call(this, results => callback(results.map(g => new Game(g))));
}

export class Game {
  constructor(record) {
    this._static = record;
  }

  static from(record) {
    return new Game(record);
  }

  get name() { return this._static.name; }
  get date() { return this._static.date; }
  get tag() { return this._static.tag; }
  get id() { return this._static.id; }

  set name(name) {
    if(this.view)
      this.view.name = name;
    this._static.name = name;
    gameStore.update(this._static);
  }

  set date(date) {
    if(this.view)
      this.view.date = date;
  }

  set tag(tag) {
    if(this.view)
      this.view.tag = tag;
    this._static.tag = tag != 'none' ? tag : '';
    gameStore.update(this._static);
  }

  set view(elm) {
    this._view = elm;
    elm.name = this.name;
    elm.tag = this.tag;
  }

  get view() {
    if(this._view) {
      if(this._view.isConnected)
        return this._view;
      else
        return this._view = null;
    } else
      return null;
  }

  notifyRemoved() {
    if(this.view)
      this.view.remove();
  }
};
