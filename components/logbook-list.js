import {LiveList} from './live-list.js';

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

class List extends LiveList {
  constructor() {
    super();
    this._observer = new MutationObserver((rec) => this._applyChanges(rec));
    this._pause = () => this._observer.disconnect();
    this._start = () => this._observer.observe(this, {
      childList: true,
      attributes: true,
      subtree: true
    });
    this._start();
  }

  _applyChanges(rec) {
    this._pause();
    let prev = null;
    [...this.querySelectorAll('log-record:not(.hide)')].forEach(elm => {
      elm.setAttribute('timediff', prev ? formatDiff(elm.record.date - prev.date) : '');
      prev = elm.record;
    });
    this._start();
  }
}

export default function() {
  window.customElements.define('log-list', List);
}
