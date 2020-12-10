import {dateFormat} from '../datetime.js';
import {gameStore} from '../log-game-store.js';

const template = document.createElement('template');
template.innerHTML = `
<spa-color-patch class="log-game-color-patch" color="none"></spa-color-patch>
<spa-color-sel class="log-game-color-sel log-game-stop-action" data-zero="1"></spa-color-sel>
<span class="log-game-name"></span>
<input type="text" class="log-game-name-edit log-game-stop-action">
<span class="log-game-date"></span>
<div class="log-game-confirm" tabindex="0">Klikněte znovu pro potvrzení.</div>
<div class="log-game-tools-container">
  <div class="log-game-tools log-game-stop-action" tabindex="0">
    <img class="log-game-delete inline" src="images/delete.svg" alt="delete" tabindex="0"/>
    <spa-color-patch class="log-game-color-edit" data-color="all" tabindex="0"></spa-color-patch>
    <img class="log-game-edit inline" alt="edit" src="images/edit.svg" tabindex="0"/>
  </div>
</div>`;

export class GameRecordElement extends HTMLElement {
  connectedCallback() {
    this._construct();
  }

  static get observedAttributes() {
    return ['data-state'];
  }

  _construct() {
    if(this._constructed)
      return;
    this._constructed = true;
    this.appendChild(template.content.cloneNode(true));
    let id = this._id = id => this.querySelector(`.log-game-${id}`);
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
    id('tools').addEventListener('touchstart', e => {
      if(!e.currentTarget.contains(document.activeElement)) {
        e.currentTarget.focus();
        // In the ideal world we could just e.preventDefault() the mousedown event on touch devices.
        // However, with Samsung Internet this would mean the simulated mouse would stay hovering
        // over whatever it was before, which has side effects with lg.tools. So we do need the
        // mousemove the happen but need to capture and kill the expected mousedown :-(
        e.currentTarget.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation()
        }, { once: true });
      }
    });
    this.addEventListener('action', e => this._action(e));
    this.querySelectorAll('.log-game-stop-action').forEach(
      elm => elm.addEventListener('action', e => e.preventDefault()));
    this._stateChange(this.state, 'empty');
    if (!this.hasAttribute('tabindex'))
      this.setAttribute('tabindex', 0);
    this.classList.add('innerOutline');
    this.addEventListener('focusout', e => {
      if(!this.contains(e.relatedTarget))
        this.close();
    });
  }

  set name(name) {
    this._id('name').textContent = this._id('name-edit').value = name;
  }

  set tag(tag) {
    this._id('color-patch').dataset.color = tag || 'none';
  }

  set date(date) {
    this._id('date').textContent = '(' + dateFormat(date) + ')';
  }

  attributeChangedCallback(name, oldValue, value) {
    this._construct();
    if(name === 'data-state')
      this._stateChange(value, oldValue);
  }

  set record(record) {
    this._record = record;
    this.state = 'closed';
    record.addView(this);
  }

  get record() {
    return this._record;
  }

  set state(state) {
    this.dataset.state = state;
  }

  get state() {
    return this.dataset.state || 'empty';
  }

  _stateChange(state, oldState) {
    if(oldState == 'empty' && !this._record)
      this._materialize();
    if(oldState == 'edit' || oldState == 'firstEdit')
      this._save();
    if(state == 'edit' || state == 'firstEdit')
      this._open();
    if(state == 'closed' && oldState == 'firstEdit')
      this._choose();
  }

  close() {
    this.state = 'closed';
  }

  _open() {
    this._id('name-edit').focus();
  }

  _save() {
    this._record.name = this._id('name-edit').value;
  }

  async _materialize() {
    this.record = await gameStore.create(this._id('name-edit').value);
  }

  _delete() {
    if(this.state == 'delete') {
      gameStore.delete(this.record).then(() => this.remove());
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
    this.close();
  }

  _keydown(e) {
    if(e.key === 'Enter')
      this.close();
  }
}

window.customElements.define('log-game', GameRecordElement);
