import {LiveList} from './live-list.js';
import {dateFormat} from '../js/datetime.js';

const dateMarkerTemp = document.createElement('template');
dateMarkerTemp.innerHTML = `
<link rel="stylesheet" href="components/css/date-marker.css"/>
<div id="content" class="new-day colors-def" data-protected="true" hidden>
  <span class="line"></span>
  <span class="text color-fainter"><slot></slot></span>
  <span class="line"></span>
</div>`;


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

class DateMarker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(dateMarkerTemp.content.cloneNode(true));
    this.shadowRoot.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
  }
}

class List extends LiveList {
  constructor() {
    super();
    this._observer = new MutationObserver((rec) => this._applyChanges(rec));
    this._pause = () => this._observer.disconnect();
    this._start = () => this._observer.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
    this._start();
  }

  _applyChanges(rec) {
    this._pause();
    this.querySelectorAll('log-date-marker').forEach(elm => elm.remove());
    let prevDate = 0;
    let prevDay = '';
    this.querySelectorAll('log-record:not(.hide)').forEach(elm => {
      if(!elm.record)
        return;
      let day = dateFormat(elm.record.date);
      if(day !== prevDay) {
        let div = document.createElement('log-date-marker');
        div.setAttribute('data-protected', '');
        div.innerText = day;
        this.insertBefore(div, elm);
      }
      elm.setAttribute('timediff', prevDate ? formatDiff(elm.record.date - prevDate) : '');
      prevDate = elm.record.date;
      prevDay = day;
    });
    this._start();
  }
}

window.customElements.define('log-date-marker', DateMarker);
window.customElements.define('log-list', List);
