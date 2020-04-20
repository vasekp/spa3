const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="css/colors.css"/>
<link rel="stylesheet" href="components/css/logbook-record.css"/>
<div id="content" class="colors-temp">
<div id="header" hidden>
  <span>
    <span id="timestamp"></span>
    <span id="timediff"></span>
  </span>
  <span id="fill"></span>
  <span id="edit"><img class="inline" src="../images/edit.svg"></span>
</div>
<div id="container">
  <spa-color-sel id="colorsel"></spa-color-sel>
  <span id="text" hidden></span>
  <textarea id="tedit" hidden></textarea>
</div>
</div>`;

const dateFormat = new Intl.DateTimeFormat('cs', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).format;

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

export class Record extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._text = this.shadowRoot.getElementById('text');
    this._edit = this.shadowRoot.getElementById('tedit');
    this._edit.addEventListener('input', () => this._input());
    this._edit.addEventListener('keydown', e => this._keydown(e));
    this.shadowRoot.getElementById('edit').addEventListener('click', () => this.open());
    this.shadowRoot.getElementById('colorsel').addEventListener('color-click', e => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('color-pick', {
        detail: { tag: e.detail.color },
        bubbles: true
      }));
    });
  }

  set record(record) {
    this._record = record;
    this.shadowRoot.getElementById('content').classList.remove('colors-temp');
    this.shadowRoot.getElementById('content').classList.add('colors-var');
    this.shadowRoot.getElementById('content').style.setProperty('--color', record.tag);
    this.shadowRoot.getElementById('timestamp').innerText = dateFormat(record.date);
    this.shadowRoot.getElementById('header').hidden = false;
    this.shadowRoot.getElementById('text').hidden = false;
    this.shadowRoot.getElementById('colorsel').remove();
    this._text.innerText = record.text;
    this._rev = this._lastSave = 0;
  }

  get record() {
    return this._record;
  }

  set previous(prevRecord) {
    if(this.isTemp())
      return;
    let span = this.shadowRoot.getElementById('timediff');
    span.innerText = prevRecord
      ? '(' + formatDiff(this._record.date - prevRecord.date) + ')'
      : '';
  }

  open() {
    if(this._open)
      return;
    this._open = true;
    this._edit.value = this._text.innerText;
    this._text.style.visibility = 'hidden';
    this._edit.hidden = false;
    this._edit.focus();
    this._timer = setInterval(() => this._autosave(), 300);
    this.shadowRoot.getElementById('edit').hidden = true;
    this.dispatchEvent(new CustomEvent('record-open', {
      bubbles: true
    }));
  }

  close() {
    if(!this._open)
      return;
    this._autosave();
    this._open = false;
    this._text.style.visibility = 'visible';
    this._edit.hidden = true;
    this.shadowRoot.getElementById('edit').hidden = false;
  }

  isTemp() {
    return !this._record;
  }

  notifySaved(rev) {
    if(rev === this._rev && !this._open)
      clearInterval(this._timer);
    this._lastSave = rev;
  }

  _autosave() {
    if(this._lastSave == this._rev)
      return;
    this.dispatchEvent(new CustomEvent('record-save', {
      detail: { rev: this._rev },
      bubbles: true
    }));
  }

  _input() {
    this._record.text = this._text.innerText = this._edit.value;
    this._rev++;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.close();
      e.preventDefault();
    }
  }
}

export default function() {
  window.customElements.define('log-record', Record);
};
