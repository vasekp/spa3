import {timeFormat} from '../js/datetime.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="components/css/logbook-record.css"/>
<div id="content" class="colors-grey color-border" hidden>
  <div id="header" class="color-fainter" hidden>
    <span>
      <span id="timestamp"></span>
      <span id="timediff"></span>
    </span>
    <span id="fill"></span>
    <span id="edit"><img class="inline" src="images/edit.svg"></span>
  </div>
  <div id="container">
    <spa-color-sel id="colorsel"></spa-color-sel>
    <span id="text" hidden></span>
    <textarea id="tedit" hidden></textarea>
  </div>
</div>`;

export class Record extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._text = this.shadowRoot.getElementById('text');
    this._edit = this.shadowRoot.getElementById('tedit');
    this._edit.addEventListener('input', () => this._input());
    this._edit.addEventListener('keydown', e => this._keydown(e));
    this._edit.addEventListener('blur', () => this.close());
    this.shadowRoot.getElementById('edit').addEventListener('click', () => this.open());
    this.shadowRoot.getElementById('colorsel').addEventListener('color-click', e => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('color-pick', {
        detail: { tag: e.detail.color },
        bubbles: true
      }));
    });
    this.shadowRoot.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
  }

  static get observedAttributes() {
    return ['timediff'];
  }

  set record(record) {
    this._record = record;
    this.shadowRoot.getElementById('content').classList.remove('colors-grey');
    this.shadowRoot.getElementById('content').classList.add('colors-param');
    this.shadowRoot.getElementById('content').style.setProperty('--color', record.tag);
    this.shadowRoot.getElementById('timestamp').innerText = timeFormat(record.date);
    this.shadowRoot.getElementById('header').hidden = false;
    this.shadowRoot.getElementById('text').hidden = false;
    this.shadowRoot.getElementById('colorsel').remove();
    this._text.innerText = record.text;
    this._rev = this._lastSave = 0;
  }

  get record() {
    return this._record;
  }

  attributeChangedCallback(name, oldValue, value) {
    this.shadowRoot.getElementById('timediff').innerText = value
      ? '(' + value + ')'
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
    this.shadowRoot.getElementById('edit').visibility = 'hidden';
    this.setAttribute('data-protected', '');
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
    this.removeAttribute('data-protected');
    this.shadowRoot.getElementById('edit').visibility = 'visible';
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

window.customElements.define('log-record', Record);
