import {dbRequest} from './log-db.js';

export class Record {
  constructor(gid, tag, date = Date.now(), text = '', geo, id) {
    this._static = { gid: +gid, tag, date, text, geo };
    this._rev = 0;
    this._lastSave = 0;
    this._timer = null;
    this._autosaveRef = () => this._autosave();
    if(id)
      this._static.id = id;
    else
      dbRequest({query: 'add', store: 'log-rec', record: this._static}, id => this._static.id = id);
  }

  static from(record) {
    return new Record(record.gid, record.tag, record.date, record.text, record.geo, record.id);
  }

  get text() { return this._static.text; }
  get date() { return this._static.date; }
  get tag() { return this._static.tag; }
  get geo() { return this._static.geo; }

  set text(text) {
    this._static.text = text;
    this._rev++;
    if(!this._timer)
      this._timer = setInterval(this._autosaveRef, 300);
  }

  set tag(tag) {
    this._static.tag = tag;
    dbRequest({query: 'update', store: 'log-rec', record: this._static});
  }

  set geo(geo) {
    this._static.geo = geo;
    dbRequest({query: 'update', store: 'log-rec', record: this._static});
  }

  _autosave() {
    if(this._lastSave == this._rev || !this._static.id)
      return;
    let rev = this._rev;
    let callback = () => {
      this._lastSave = rev;
      if(rev === this._rev) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }
    dbRequest({query: 'update', store: 'log-rec', record: this._static}, callback);
  }

  delete() {
    dbRequest({query: 'delete', store: 'log-rec', record: this._static});
  }
};
