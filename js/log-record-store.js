import {ObjectStore} from './log-db.js';

export const recordStore = new ObjectStore('log-rec');

recordStore.create = async function(record, tx) {
  record.date = Date.now();
  await recordStore.add(record, tx);
  return new Record(record);
}

recordStore.getAll = async function(gid) {
  let results = await ObjectStore.prototype.getAllWhere.call(this, 'gid', +gid);
  return results.map(r => new Record(r));
}

class Record {
  constructor(record) {
    this._static = record;
    this._rev = 0;
    this._lastSave = 0;
    this._timer = null;
    this._autosaveRef = () => this._autosave();
    this._views = new Set();
  }

  static from(record) {
    return new Record(record);
  }

  get id() { return this._static.id; }
  get text() { return this._static.text; }
  get date() { return this._static.date; }
  get tag() { return this._static.tag; }
  get geo() { return this._static.geo; }

  set text(text) {
    for(let view of this._views)
      view.text = text;
    this._static.text = text;
    this._rev++;
    if(!this._timer)
      this._timer = setInterval(this._autosaveRef, 300);
  }

  set tag(tag) {
    for(let view of this._views)
      view.tag = tag;
    this._static.tag = tag;
    recordStore.update(this._static);
  }

  set geo(geo) {
    for(let view of this._views)
      view.geo = geo;
    this._static.geo = geo;
    recordStore.update(this._static);
  }

  addView(elm) {
    this._views.add(elm);
    elm.date = this.date;
    elm.text = this.text;
    elm.tag = this.tag;
    elm.geo = this.geo;
  }

  removeView(elm) {
    this._views.delete(elm);
  }

  async _autosave() {
    if(this._lastSave == this._rev || !this._static.id)
      return;
    let rev = this._rev;
    await recordStore.update(this._static);
    this._lastSave = rev;
    if(rev === this._rev) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
};
