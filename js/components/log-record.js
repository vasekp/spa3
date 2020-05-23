import {timeFormat} from '../datetime.js';
import {Record} from '../log-record.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="css/components/log-record.css"/>
<div id="content" class="colors-grey color-border" hidden>
  <div id="header" class="color-fainter" hidden>
    <span>
      <span id="timestamp"></span>
      <span id="timediff"></span>
    </span>
    <span id="fill"></span>
    <img class="inline" id="edit" src="images/edit.svg">
  </div>
  <div id="textContainer" hidden>
    <span id="text"></span>
    <textarea id="tedit" hidden></textarea>
  </div>
  <div id="props">
    <spa-color-sel id="colorsel"></spa-color-sel>
  </div>
</div>`;

let states = {
  empty: 'empty',
  closed: 'closed',
  edit: 'edit',
  firstEdit: 'firstedit'
};

export class RecordElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._text = this.shadowRoot.getElementById('text');
    this._edit = this.shadowRoot.getElementById('tedit');
    this._edit.addEventListener('input', () => this._input());
    this._edit.addEventListener('keydown', e => this._keydown(e));
    this.addEventListener('blur', () => this.close());
    this.shadowRoot.getElementById('edit').addEventListener('click', () => this.state = states.edit);
    this.shadowRoot.getElementById('colorsel').addEventListener('color-click', e => this._colorsel(e.detail.color));
    this.shadowRoot.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
    this._state = states.empty;
  }

  static get observedAttributes() {
    return ['timediff', 'state'];
  }

  set record(record) {
    this._record = record;
    this.shadowRoot.getElementById('content').classList.remove('colors-grey');
    this.shadowRoot.getElementById('content').classList.add('colors-param');
    this.shadowRoot.getElementById('content').style.setProperty('--color', record.tag);
    this.shadowRoot.getElementById('timestamp').innerText = timeFormat(record.date);
    this.shadowRoot.getElementById('header').hidden = false;
    this.shadowRoot.getElementById('textContainer').hidden = false;
    this._text.innerText = record.text;
    this.state = states.closed;
  }

  get record() {
    return this._record;
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'timediff')
      this.shadowRoot.getElementById('timediff').innerText = value
        ? '(' + value + ')'
        : '';
    else if(name === 'state')
      this._stateChange(value);
  }

  set state(state) {
    this.setAttribute('state', state);
  }

  _stateChange(state) {
    if(state != states.closed)
      this.parentElement.querySelectorAll('log-record').forEach(elm => {
        if(elm !== this)
          elm.close();
      });
    this._state = state;
    this.toggleAttribute('data-protected', state != states.closed);
    this.shadowRoot.getElementById('edit').hidden = state != states.closed;
    this.shadowRoot.getElementById('props').hidden = state == states.closed || state == states.firstEdit;
    if(state == states.closed)
      this._close();
    if(state == states.edit || state == states.firstEdit)
      this._open();
  }

  _open() {
    this._edit.value = this._text.innerText;
    this._text.style.visibility = 'hidden';
    this._edit.hidden = false;
    this._edit.focus();
  }

  _close() {
    if(!this._record)
      this.remove();
    this._text.style.visibility = 'visible';
    this._edit.hidden = true;
  }

  _colorsel(tag) {
    if(this._state == states.empty)
      this._materialize(tag);
    else {
      this._record.tag = tag;
      this.shadowRoot.getElementById('content').style.setProperty('--color', tag);
      this.close();
    }
  }

  _materialize(tag) {
    let gid = this.closest('log-list').getAttribute('data-gid');
    this.record = new Record(gid, tag);
    this.state = states.firstEdit;
  }

  close() {
    this.state = states.closed;
  }

  _input() {
    this._record.text = this._text.innerText = this._edit.value;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.close();
      e.preventDefault();
    }
  }
}

window.customElements.define('log-record', RecordElement);
