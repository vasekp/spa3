import {LiveListElement} from './spa-live-list.js';
import {dateFormat} from '../datetime.js';

const dateMarkerTemp = document.createElement('template');
dateMarkerTemp.innerHTML = `
<link rel="stylesheet" href="css/components/log-date-marker.css"/>
<div id="content" class="new-day" data-protected="true" hidden>
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

export class DateMarkerElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(dateMarkerTemp.content.cloneNode(true));
    this.shadowRoot.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
  }
}

export class ListElement extends LiveListElement {
  constructor() {
    super();
    let mo = new MutationObserver(records => {
      records.forEach(record => this._datesAddRemove(record));
      this._datesShowHide();
    });
    mo.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'state']
    });
    this.addEventListener('move-away', e => e.target.record.delete());
  }

  _datesAddRemove(record) {
    let insertMarker = (elm, day) => {
      let marker = document.createElement('log-date-marker');
      marker.setAttribute('data-protected', '');
      marker.innerText = day;
      this.insertBefore(marker, elm);
    }
    if(record.addedNodes.length > 0) {
      let prevDay = record.previousSibling ? record.previousSibling.getAttribute('data-day') : null;
      record.addedNodes.forEach(elm => {
        if(elm.nodeName !== 'LOG-RECORD' || !elm.record)
          return;
        let day = dateFormat(elm.record.date);
        elm.setAttribute('data-day', day);
        if(day !== prevDay)
          insertMarker(elm, day);
        prevDay = day;
      });
    } else if(record.removedNodes.length > 0) {
      if(record.previousSibling && record.previousSibling.nodeName == 'LOG-DATE-MARKER' &&
          (!record.nextSibling || record.nextSibling.nodeName == 'LOG-DATE-MARKER'))
        record.previousSibling.remove();
    } else if(record.type == 'attributes' && record.attributeName == 'state') {
      let elm = record.target;
      if(elm.hasAttribute('data-day'))
        return;
      let day = dateFormat(elm.record.date);
      elm.setAttribute('data-day', day);
      let prev = elm.previousSibling;
      if(!prev || prev.getAttribute('data-day') !== day)
        insertMarker(elm, day);
    }
  }

  _datesShowHide() {
    // Time differences
    let prevDate = 0;
    this.querySelectorAll('log-record:not(.hide)').forEach(elm => {
      if(!elm.record)
        return;
      elm.setAttribute('timediff', prevDate ? formatDiff(elm.record.date - prevDate) : '');
      prevDate = elm.record.date;
    });

    // Date markers
    let seenRecord = false;
    let children = this.children;
    for(let i = children.length - 1; i >= 0; i--) {
      if(children[i].nodeName == 'LOG-RECORD' && children[i].classList.contains('hide'))
        continue;
      if(children[i].nodeName == 'LOG-RECORD')
        seenRecord = true;
      else {
        children[i].hidden = !seenRecord;
        seenRecord = false;
      }
    }
  }
}

window.customElements.define('log-date-marker', DateMarkerElement);
window.customElements.define('log-list', ListElement);
