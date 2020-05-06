import {dateFormat} from '../js/datetime.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="components/css/logbook-game.css"/>
<div id="content" hidden>
  <spa-color-sel class="stop-click" zero hidden></spa-color-sel>
  <spa-color-patch color="all"></spa-color-patch>
  <span id="name"></span>
  <input type="text" id="name-edit" class="stop-click" hidden/>&nbsp;
  <span id="date"></span>
  <div id="float" class="color-border stop-click">
    <div id="stash">
      <img id="delete" src="images/delete.svg" alt="delete" tabindex="0"/>
      <spa-color-patch id="colorsel" color="all" tabindex="0"></spa-color-patch>
    </div>
    <div id="edit-bg"></div>
    <img id="edit" alt="edit" src="images/edit.svg" tabindex="0"/>
  </div>
</div>`;

let states = {
  closed: 0,
  edit: 1,
  color: 2
};

export class GameRecord extends HTMLElement {
  constructor() {
    super();
    let root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
    root.getElementById('edit').addEventListener('click',
      () => this.state = states.edit);
    root.getElementById('colorsel').addEventListener('click',
      () => this.state = states.color);
    root.querySelectorAll('.stop-click').forEach(
      elm => elm.addEventListener('click', e => e.stopPropagation()));
    root.getElementById('name-edit').addEventListener('blur',
      () => this.state = closed);
    root.getElementById('name-edit').addEventListener('keydown',
      e => this._keydown(e));
    root.querySelector('spa-color-sel').addEventListener('color-click',
      e => this._colorClicked(e.detail.color));
    this._state = states.closed;
  }

  set record(_record) {
    this._record = _record;
    this._update();
  }

  get record() {
    return this._record;
  }

  _update() {
    let root = this.shadowRoot;
    let patch = root.querySelector('spa-color-patch');
    patch.setAttribute('color', this._record.color || 'none');
    root.getElementById('name').innerText = this._record.name;
    root.getElementById('date').innerText = '(' + dateFormat(this._record.date) + ')';
  }

  get state() {
    return this._state;
  }

  set state(_state) {
    if(_state != states.closed)
      this.parentElement.querySelectorAll('log-game').forEach(elm => elm.close());
    if(this._state == states.edit)
      this._save();
    this._state = _state;
    let root = this.shadowRoot;
    root.querySelector('spa-color-sel').hidden = _state != states.color;
    root.querySelector('spa-color-patch').hidden = _state == states.color;
    root.getElementById('name').hidden = _state != states.closed;
    root.getElementById('date').hidden = _state != states.closed;
    root.getElementById('name-edit').hidden = _state != states.edit;
    if(_state == states.edit)
      this._open();
  }

  _open() {
    let ta = this.shadowRoot.getElementById('name-edit');
    ta.value = this._record.name;
    ta.hidden = false;
    ta.focus();
  }

  _save() {
    let newName = this.shadowRoot.getElementById('name-edit').value;
    this._record.name = newName;
    this._update();
    this._dbUpdate();
  }

  close() {
    this.state = states.closed;
  }

  _colorClicked(color) {
    this._record.color = color;
    this._update();
    this._dbUpdate();
    this.close();
  }

  _dbUpdate() {
    this.dispatchEvent(new CustomEvent('db-request', {
      detail: {
        store: 'log-gid',
        query: 'update',
        record: this._record
      },
      bubbles: true
    }));
  }

  _keydown(e) {
    if(e.key === 'Enter')
      this.close();
  }
}

window.customElements.define('log-game', GameRecord);
