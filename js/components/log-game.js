import {dateFormat} from '../datetime.js';
import {Game} from '../log-game.js';

const template = document.createElement('template');
template.innerHTML = `
<spa-color-patch data-id="lg.color-patch" color="none" hidden></spa-color-patch>
<spa-color-sel data-id="lg.color-sel" class="lg_stop" zero hidden></spa-color-sel>
<span data-id="lg.name" hidden></span>
<input type="text" data-id="lg.name-edit" class="lg_stop">
<span data-id="lg.date" hidden></span>
<div data-id="lg.confirm" tabindex="0" hidden>Klikněte znovu pro potvrzení.</div>
<div data-id="lg.tools-container" hidden>
  <div data-id="lg.tools" class="lg_stop">
    <img data-id="lg.delete" src="images/delete.svg" alt="delete" class="inline" tabindex="0"/>
    <spa-color-patch data-id="lg.color-edit" color="all" tabindex="0"></spa-color-patch>
    <img data-id="lg.edit" alt="edit" src="images/edit.svg" class="inline" tabindex="0"/>
  </div>
</div>`;

export class GameRecordElement extends HTMLElement {
  constructor() {
    super();
    this._constructed = false;
  }

  connectedCallback() {
    if(!this._constructed)
      this._construct();
  }

  static get observedAttributes() {
    return ['state'];
  }

  _construct() {
    this.appendChild(template.content.cloneNode(true));
    let id = id => this.querySelector(`[data-id="lg.${id}"]`);
    this._id = id;
    id('edit').addEventListener('action', () => this.state = 'edit');
    id('color-edit').addEventListener('action', e => {
      this.state = (this.state == 'color' ? 'closed' : 'color')
      e.target.focus()
    });
    id('delete').addEventListener('action', e => {
      this._delete();
      e.target.focus();
      e.preventDefault();
    });
    id('name-edit').addEventListener('keydown', e => this._keydown(e));
    id('color-sel').addEventListener('action', e => this._colorClicked(e.target.color));
    this.addEventListener('action', e => this._action(e));
    this.querySelectorAll('.lg_stop').forEach(
      elm => elm.addEventListener('action', e => e.preventDefault()));
    if(this._record)
      this._update();
    this._stateChange(this.state, 'empty');
    if (!this.hasAttribute('tabindex'))
      this.setAttribute('tabindex', 0);
    this.classList.add('innerOutline');
    this.addEventListener('focusout', e => {
      if(!this.contains(e.relatedTarget))
        this.close();
    });
    this._constructed = true;
  }

  _update() {
    this._id('color-patch').setAttribute('color', this._record.tag || 'none');
    this._id('name').innerText = this._record.name;
    this._id('date').innerText = '(' + dateFormat(this._record.date) + ')';
  }

  attributeChangedCallback(name, oldValue, value) {
    if(!this._constructed)
      return;
    if(name === 'state')
      this._stateChange(value, oldValue);
  }

  set record(record) {
    this._record = record;
    if(this._constructed)
      this._update();
    this.state = 'closed';
  }

  get record() {
    return this._record;
  }

  set state(state) {
    this.setAttribute('state', state);
  }

  get state() {
    return this.getAttribute('state') || 'empty';
  }

  _stateChange(state, oldState) {
    if(oldState == 'empty' && !this._record)
      this._materialize();
    if(oldState == 'edit' || oldState == 'firstEdit')
      this._save();
    this._id('color-sel').hidden = state != 'color';
    this._id('color-patch').hidden = state != 'closed' && state != 'edit' && state != 'firstEdit';
    this._id('name').hidden = state != 'closed';
    this._id('date').hidden = state != 'closed';
    this._id('name-edit').hidden = state != 'edit' && state != 'firstEdit';
    this._id('confirm').hidden = state != 'delete';
    this._id('tools-container').hidden = state == 'edit' || state == 'firstEdit';
    if(state == 'edit' || state == 'firstEdit')
      this._open();
    if(state == 'closed' && oldState == 'firstEdit')
      this._choose();
  }

  close() {
    this.state = 'closed';
  }

  _open() {
    let ta = this._id('name-edit');
    ta.value = this._record.name;
    ta.hidden = false;
    ta.focus();
  }

  _save() {
    let newName = this._id('name-edit').value;
    this._record.name = newName;
    this._update();
  }

  _materialize() {
    let name = this._id('name-edit').value;
    this.record = new Game(name);
  }

  _delete() {
    if(this.state == 'delete') {
      this._record.delete();
      this.remove();
    } else
      this.state = 'delete';
  }

  _action(e) {
    if(!e.defaultPrevented)
      this._choose();
  }

  _choose() {
    this.dispatchEvent(new CustomEvent('game-chosen', {
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
