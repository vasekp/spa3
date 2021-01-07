import {LiveListElement} from './spa-live-list.js';
import {dateFormat} from '../util/datetime.js';
import {recordStore} from '../log-record-store.js';

function formatDiff(diff) {
  diff = Math.floor(diff / 1000);
  const sec = diff % 60;
  const sec02 = sec.toString().padStart(2, '0');
  diff = Math.floor(diff / 60);
  const min = diff % 60;
  const min02 = min.toString().padStart(2, '0');
  diff = Math.floor(diff / 60);
  const hrs = diff % 24;
  const days = Math.floor(diff / 24);
  if(days > 0)
    return `+${days}d ${hrs}:${min02}:${sec02}`;
  else if(hrs > 0)
    return `+${hrs}:${min02}:${sec02}`;
  else
    return `+${min}:${sec02}`;
}

export class ListElement extends LiveListElement {
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
            elm.dataset.day = dateFormat(elm.record.date);
          else
            continue;
        }
        if(elm.hidden)
          continue;
        const day = elm.dataset.day;
        if(day !== prevDay)
          insertMarker(elm, day);
        prevDay = day;
        elm.dataset.timeDiff = prevDate ? formatDiff(elm.record.date - prevDate) : '';
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
