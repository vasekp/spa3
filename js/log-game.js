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
    this._static.name = name;
    dbRequest({query: 'update', store: 'log-gid', record: this._static});
  }

  set tag(tag) {
    this._static.tag = tag != 'none' ? tag : '';
    dbRequest({query: 'update', store: 'log-gid', record: this._static});
  }
};
