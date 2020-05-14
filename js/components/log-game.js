import {dateFormat} from '../datetime.js';
import {Game} from '../log-game.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="css/components/log-game.css"/>
<div id="content" hidden>
  <spa-color-patch id="patch" hidden></spa-color-patch>
  <spa-color-sel class="stop-click" zero hidden></spa-color-sel>
  <span id="name" hidden></span>
  <input type="text" id="name-edit" class="stop-click">
  <span id="date" hidden></span>
  <div id="confirm" tabindex="0" hidden>Klikněte znovu pro potvrzení.</div>
  <div id="tools-container" hidden>
    <div id="tools" class="color-border stop-click">
      <img id="delete" src="images/delete.svg" alt="delete" tabindex="0"/>
      <spa-color-patch id="colorsel" color="all" tabindex="0"></spa-color-patch>
      <img id="edit" alt="edit" src="images/edit.svg" tabindex="0"/>
    </div>
  </div>
</div>`;

let states = {
  empty: 0,
  closed: 1,
  edit: 2,
  color: 3
};

export class GameRecordElement extends HTMLElement {
  constructor() {
    super();
    let root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').onload = () => this.shadowRoot.getElementById('content').hidden = false;
    root.getElementById('edit').addEventListener('click', () => this.state = states.edit);
    root.getElementById('colorsel').addEventListener('click', () =>
      this.state = (this.state == states.color ? states.closed : states.color));
    root.getElementById('delete').addEventListener('click', () => this._delete());
    root.getElementById('delete').addEventListener('blur', () => this.close());
    root.getElementById('name-edit').addEventListener('blur', () => this.close());
    root.getElementById('name-edit').addEventListener('keydown', e => this._keydown(e));
    root.querySelector('spa-color-sel').addEventListener('color-click', e => this._colorClicked(e.detail.color));
    this.addEventListener('click', () => this._clicked());
    root.querySelectorAll('.stop-click').forEach(
      elm => elm.addEventListener('click', e => e.stopPropagation()));
    this._state = states.empty;
  }

  set record(record) {
    this._record = record;
    this._update();
    this.state = states.closed;
  }

  get record() {
    return this._record;
  }

  _update() {
    let root = this.shadowRoot;
    root.getElementById('patch').setAttribute('color', this._record.tag || 'none');
    root.getElementById('name').innerText = this._record.name;
    root.getElementById('date').innerText = '(' + dateFormat(this._record.date) + ')';
  }

  get state() {
    return this._state;
  }

  set state(state) {
    if(state != states.closed)
      this.parentElement.querySelectorAll('log-game').forEach(elm => elm.close());
    if(this._state == states.empty && !this._record)
      this._materialize();
    if(this._state == states.edit)
      this._save();
    this._state = state;
    let root = this.shadowRoot;
    root.querySelector('spa-color-sel').hidden = state != states.color;
    root.querySelector('spa-color-patch').hidden = state != states.closed && state != states.edit;
    root.getElementById('name').hidden = state != states.closed;
    root.getElementById('date').hidden = state != states.closed;
    root.getElementById('name-edit').hidden = state != states.edit;
    root.getElementById('confirm').hidden = state != states.delete;
    root.getElementById('tools-container').hidden = false;
    if(state == states.edit)
      this._open();
  }

  close() {
    this.state = states.closed;
  }

  focus() {
    setTimeout(() => this.shadowRoot.getElementById('name-edit').focus(), 100);
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
  }

  _materialize() {
    let name = this.shadowRoot.getElementById('name-edit').value;
    this.record = new Game(name);
  }

  _delete() {
    if(this.state == states.delete) {
      this._record.delete();
      this.remove();
    } else
      this.state = states.delete;
  }

  _clicked() {
    this.dispatchEvent(new CustomEvent('game-clicked', {
      detail: { game: this._record },
      bubbles: true
    }));
  }

  _colorClicked(color) {
    this._record.tag = color;
    this._update();
    this.close();
  }

  _keydown(e) {
    if(e.key === 'Enter')
      this.close();
  }
}

window.customElements.define('log-game', GameRecordElement);
