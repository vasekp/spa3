import {LiveListElement} from './spa-live-list.js';
import {dateFormat} from '../datetime.js';
import {recordStore} from '../log-record-store.js';

function formatDiff(diff) {
  let diffText = '+';
  diff = Math.floor(diff / 1000);
  let sec = diff % 60;
  diff = Math.floor(diff / 60);
  let min = diff % 60;
  let hrs = Math.floor(diff / 60);
  if(hrs >= 24)
    diffText += Math.floor(hrs / 24) + 'd ';
  if(hrs >= 1)
    diffText += (hrs % 24) + ':' + min.toString().padStart(2, '0');
  else
    diffText += min;
  diffText += ':' + sec.toString().padStart(2, '0');
  return diffText;
}

export class ListElement extends LiveListElement {
  constructor() {
    super();
    this._mo = new MutationObserver(records => {
      records.forEach(record => this._datesAddRemove(record));
      this._datesShowHide();
    });
    this._mo.observe(this, {childList: true});
    this.addEventListener('move-away', e =>
      recordStore.delete(e.target.record).then(() => e.target.remove()));
  }

  _datesAddRemove(record) {
    let insertMarker = (elm, day) => {
      let marker = document.createElement('div');
      marker.classList.add('date-marker');
      marker.dataset.protected = 1;
      marker.innerText = day;
      this.insertBefore(marker, elm);
    }
    if(record.addedNodes.length > 0) {
      let prevDay = record.previousSibling ? record.previousSibling.dataset.day : null;
      record.addedNodes.forEach(elm => {
        if(elm.nodeName !== 'LOG-RECORD')
          return;
        this._mo.observe(elm, { attributes: true, attributeFilter: ['data-state', 'hidden'] });
        if(!elm.record)
          return;
        let day = dateFormat(elm.record.date);
        elm.dataset.day = day;
        if(day !== prevDay)
          insertMarker(elm, day);
        prevDay = day;
      });
    } else if(record.type == 'attributes' && record.attributeName == 'data-state') {
      let elm = record.target;
      if(elm.dataset.day)
        return;
      let day = dateFormat(elm.record.date);
      elm.dataset.day = day;
      let prev = elm.previousSibling;
      if(!prev || prev.dataset.day !== day)
        insertMarker(elm, day);
    }
  }

  _datesShowHide() {
    let set = new Set();

    // Time differences
    let prevDate = 0;
    this.querySelectorAll('log-record:not([hidden])').forEach(elm => {
      if(!elm.record)
        return;
      set.add(elm.dataset.day);
      elm.dataset.timeDiff = prevDate ? formatDiff(elm.record.date - prevDate) : '';
      prevDate = elm.record.date;
    });

    // Date markers
    this.querySelectorAll('div.date-marker').forEach(elm =>
      elm.hidden = !set.has(elm.textContent));
  }

  set game(game) {
    this._game = game;
  }

  get game() {
    return this._game;
  }

  get gid() {
    return this._game ? this._game.id : null;
  }
}

window.customElements.define('log-record-list', ListElement);
