import {dateFormat} from '../js/datetime.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="components/css/logbook-game.css"/>
<div id="content" hidden>
  <spa-color-sel class="stop-click" zero hidden></spa-color-sel>
  <spa-color-patch hidden></spa-color-patch>
  <span id="name" hidden></span>
  <input type="text" id="name-edit" class="stop-click">&nbsp;
  <span id="date" hidden></span>
  <div id="confirm" tabindex="0" hidden>Klikněte znovu pro potvrzení.</div>
  <div id="float" class="color-border stop-click" hidden>
    <div id="stash">
      <img id="delete" src="images/delete.svg" alt="delete" tabindex="0"/>
      <spa-color-patch id="colorsel" color="all" tabindex="0"></spa-color-patch>
    </div>
    <div id="edit-bg"></div>
    <img id="edit" alt="edit" src="images/edit.svg" tabindex="0"/>
  </div>
</div>`;

let states = {
  empty: 0,
  closed: 1,
  edit: 2,
  color: 3
};

export class GameRecord extends HTMLElement {
  constructor() {
    super();
    let root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').onload = () => this.shadowRoot.getElementById('content').hidden = false;
    root.getElementById('edit').addEventListener('click', () => this.state = states.edit);
    root.getElementById('colorsel').addEventListener('click', () => this.state = states.color);
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

  set record(_record) {
    this._record = _record;
    this._update();
    this.state = states.closed;
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
    if(this._state == states.empty)
      this._materialize();
    if(this._state == states.edit)
      this._save();
    this._state = _state;
    let root = this.shadowRoot;
    root.querySelector('spa-color-sel').hidden = _state != states.color;
    root.querySelector('spa-color-patch').hidden = _state == states.color;
    root.getElementById('name').hidden = _state != states.closed;
    root.getElementById('date').hidden = _state != states.closed;
    root.getElementById('name-edit').hidden = _state != states.edit;
    root.getElementById('confirm').hidden = _state != states.delete;
    root.getElementById('float').hidden = false;
    if(_state == states.edit)
      this._open();
  }

  close() {
    this.state = states.closed;
  }

  focus() {
    this.shadowRoot.getElementById('name-edit').focus();
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

  _materialize() {
    let record = {
      name: this.shadowRoot.getElementById('name-edit').value,
      date: Date.now()
    };
    let callback = record => {
      this.record = record;
      this.state = states.closed;
    }
    this.dispatchEvent(new CustomEvent('db-request', {
      detail: { store: 'log-gid', query: 'add', record, callback },
      bubbles: true
    }));
  }

  _delete() {
    if(this.state == states.delete) {
      this.dispatchEvent(new CustomEvent('delete-game', {
        detail: { gid: this._record.id },
        bubbles: true
      }));
      this.remove();
    } else
      this.state = states.delete;
  }

  _clicked() {
    this.dispatchEvent(new CustomEvent('game-clicked', {
      detail: { gid: this._record.id },
      bubbles: true
    }));
  }

  _colorClicked(color) {
    this._record.color = color;
    this._update();
    this._dbUpdate();
    this.close();
  }

  _dbUpdate() {
    this.dispatchEvent(new CustomEvent('db-request', {
      detail: { store: 'log-gid', query: 'update', record: this._record },
      bubbles: true
    }));
  }

  _keydown(e) {
    if(e.key === 'Enter')
      this.close();
  }
}

window.customElements.define('log-game', GameRecord);
