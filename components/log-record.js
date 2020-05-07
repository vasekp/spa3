import {timeFormat} from '../js/datetime.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="components/css/log-record.css"/>
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

let states = {
  empty: 0,
  closed: 1,
  edit: 2
};

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
    this.shadowRoot.getElementById('edit').addEventListener('click', () => this.state = states.edit);
    this.shadowRoot.getElementById('colorsel').addEventListener('color-click', e => this._materialize(e.detail.color));
    this.shadowRoot.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
    this._state = states.empty;
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
    this.state = states.closed;
  }

  get record() {
    return this._record;
  }

  attributeChangedCallback(name, oldValue, value) {
    this.shadowRoot.getElementById('timediff').innerText = value
      ? '(' + value + ')'
      : '';
  }

  set state(_state) {
    if(_state != states.closed)
      this.parentElement.querySelectorAll('log-record').forEach(elm => elm.close());
    if(this._state == states.edit)
      this._autosave();
    this._state = _state;
    this.toggleAttribute('data-protected', _state != states.closed);
    this.shadowRoot.getElementById('edit').hidden = _state != states.closed;
    if(_state == states.closed)
      this._close();
    if(_state == states.edit)
      this._open();
  }

  _open() {
    this._edit.value = this._text.innerText;
    this._text.style.visibility = 'hidden';
    this._edit.hidden = false;
    this._edit.focus();
    this._timer = setInterval(() => this._autosave(), 300);
  }

  _close() {
    if(!this._record)
      this.remove();
    this._text.style.visibility = 'visible';
    this._edit.hidden = true;
  }

  _materialize(tag) {
    let record = {
      tag,
      gid: +this.closest('log-list').getAttribute('data-gid'),
      date: Date.now(),
      text: ''
    };
    let callback = record => {
      this.record = record;
      this.state = states.edit;
      this.dispatchEvent(new CustomEvent('new-record', { bubbles: true }));
    };
    this.dispatchEvent(new CustomEvent('db-request', {
      detail: { store: 'log-rec', query: 'add', record, callback },
      bubbles: true
    }));
  }

  close() {
    this.state = states.closed;
  }

  _autosave() {
    if(this._lastSave == this._rev)
      return;
    let rev = this._rev;
    let callback = () => {
      if(rev === this._rev && this._state != states.edit)
        clearInterval(this._timer);
      this._lastSave = rev;
    }
    this.dispatchEvent(new CustomEvent('db-request', {
      detail: { store: 'log-rec', query: 'update', record: this._record, callback },
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
