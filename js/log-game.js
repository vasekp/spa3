import {dbRequest, deleteGame} from './log-db.js';

export class Game {
  constructor(name, date = Date.now(), tag, id) {
    this._static = { name, date, tag };
    if(id)
      this._static.id = id;
    else
      dbRequest({query: 'add', store: 'log-gid', record: this._static}, id => this._static.id = id);
  }

  static from(record) {
    return new Game(record.name, record.date, record.tag, record.id);
  }

  get name() { return this._static.name; }
  get date() { return this._static.date; }
  get tag() { return this._static.tag; }
  get id() { return this._static.id; }

  set name(name) {
    this._static.name = name;
    dbRequest({query: 'update', store: 'log-gid', record: this._static});
  }

  set tag(tag) {
    this._static.tag = tag;
    dbRequest({query: 'update', store: 'log-gid', record: this._static});
  }

  delete() {
    deleteGame(this._static.id);
  }
};
