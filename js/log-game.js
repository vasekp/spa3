import {dbRequest} from './log-db.js';

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
    dbRequest({query: 'update', store: 'log-gid', record: this._static});
  }

  set date(date) {
    if(this.view)
      this.view.date = date;
  }

  set tag(tag) {
    if(this.view)
      this.view.tag = tag;
    this._static.tag = tag != 'none' ? tag : '';
    dbRequest({query: 'update', store: 'log-gid', record: this._static});
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
};
