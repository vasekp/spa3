import {formatDate, formatTimeDiff} from '../util/datetime.js';
import recordStore from '../log-record-store.js';
import LiveListElement from './spa-live-list.js';

class ListElement extends LiveListElement {
  constructor() {
    super();
    this._mo = new MutationObserver(() => this._updateDates());
    this._mo.observe(this, { childList: true });
    this.addEventListener('move-away', e => {
      const tgt = e.target;
      recordStore.delete(tgt.record).then(() => tgt.remove());
    });
  }

  _updateDates() {
    const insertMarker = (elm, day) => {
      const marker = document.createElement('div');
      marker.classList.add('date-marker');
      marker.dataset.protected = 1;
      marker.dataset.day = day;
      marker.innerText = day;
      this.insertBefore(marker, elm);
    }
    let prevDate, prevDay, nonempty, prevMarker;
    for(const elm of this.childNodes) {
      if(elm.nodeName === 'LOG-RECORD') {
        if(!elm.dataset.day) {
          // newly added element
          this._mo.observe(elm, { attributes: true, attributeFilter: ['data-state', 'hidden'] });
          if(elm.record)
            elm.dataset.day = formatDate(elm.record.date);
          else
            continue;
        }
        if(elm.hidden)
          continue;
        const day = elm.dataset.day;
        if(day !== prevDay)
          insertMarker(elm, day);
        prevDay = day;
        elm.dataset.timeDiff = prevDate ? formatTimeDiff(elm.record.date - prevDate) : '';
        prevDate = elm.record.date;
        nonempty = true;
      } else {
        // date marker
        const day = elm.dataset.day;
        if(day === prevDay) {
          elm.remove();
          continue;
        }
        if(!nonempty && prevMarker)
          prevMarker.remove();
        prevMarker = elm;
        prevDay = day;
        nonempty = false;
      }
    }
    if(!nonempty && prevMarker)
      prevMarker.remove();
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
