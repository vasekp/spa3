import {Enum} from '../util/enum.js';
import {dateFormat} from '../util/datetime.js';
import {gameStore} from '../log-game-store.js';

const template = document.createElement('template');
template.innerHTML = `
<spa-color-patch class="log-game-color-patch" color="none"></spa-color-patch>
<spa-color-sel class="log-game-color-sel" data-zero="1"></spa-color-sel>
<span class="log-game-name"></span>
<input type="text" class="log-game-name-edit">
<span class="log-game-date"></span>
<div class="log-game-confirm" tabindex="0">Klikněte znovu pro potvrzení.</div>
<div class="log-game-tools-container">
  <div class="log-game-tools" tabindex="0">
    <img class="log-game-delete inline" src="images/delete.svg" alt="delete" tabindex="0"/>
    <spa-color-patch class="log-game-color-edit" data-color="all" tabindex="0"></spa-color-patch>
    <img class="log-game-edit inline" alt="edit" src="images/edit.svg" tabindex="0"/>
  </div>
</div>`;

const states = Enum.fromArray(['nascent', 'disabled', 'base', 'edit', 'color', 'confirm']);

export class GameRecordElement extends HTMLElement {
  connectedCallback() {
    this._construct();
    if(!this.state)
      this.state = states.nascent;
  }

  static get observedAttributes() {
    return ['data-state'];
  }

  _construct() {
    if(this._constructed)
      return;
    this.appendChild(template.content.cloneNode(true));
    const id = this._id = id => this.querySelector(`.log-game-${id}`);
    id('edit').addEventListener('click', () => this.state = states.edit);
    id('color-edit').addEventListener('click', e => {
      this.state = states.color;
      e.target.focus()
    });
    id('delete').addEventListener('click', e => {
      this._delete();
      e.target.focus();
      e.preventDefault();
    });
    id('name-edit').addEventListener('keydown', e => this._keydown(e));
    id('color-sel').addEventListener('color-click', e => { this._colorClicked(e.detail.color); e.preventDefault(); });
    id('tools').addEventListener('touchend', e => {
      if(!e.currentTarget.contains(document.activeElement)) {
        e.currentTarget.focus();
        e.preventDefault();
      }
    });
    id('tools').addEventListener('click', e => e.preventDefault());
    this.addEventListener('click', e => this._click(e));
    if (!this.hasAttribute('tabindex'))
      this.setAttribute('tabindex', 0);
    this.classList.add('innerOutline');
    this.addEventListener('focusout', e => {
      if(!this.contains(e.relatedTarget))
        this._close();
    });
    this._constructed = true;
  }

  // Called only after record.addView: guaranteed to be _constructed
  set name(name) {
    this._id('name').textContent = this._id('name-edit').value = name;
  }

  set tag(tag) {
    this._id('color-patch').dataset.color = tag || 'none';
  }

  set date(date) {
    this._id('date').textContent = `(${dateFormat(date)})`;
  }

  attributeChangedCallback(name, oldValue, value) {
    this._stateChange(value, oldValue);
  }

  set record(record) {
    this._construct();
    this._record = record;
    record.addView(this);
    this.state = states.base;
  }

  get record() {
    return this._record;
  }

  set state(state) {
    this.dataset.state = state;
  }

  get state() {
    return this.dataset.state;
  }

  _stateChange(state, oldState) {
    if(state === states.nascent)
      this.dataset.hidePlus = true;
    else
      delete this.dataset.hidePlus;
    if(state === states.nascent || state === states.edit)
      this._id('name-edit').focus();
  }

  _close() {
    let name = this._id('name-edit').value;
    switch(this.state) {
      case states.nascent:
        if(name)
          this._materialize(name);
        else
          this.remove();
        break;
      case states.edit:
        if(name) {
          this.record.name = name;
          this.state = states.base;
        } else // revert edit
          this._id('name-edit').value = this.record.name;
        // fall through
      default:
        this.state = states.base;
    }
  }

  _gameRecord() {
    if(this.state === states.nascent) {
      let name = this._id('name-edit').value;
      return name ? this._materialize(name) : null;
    } else
      return this.record;
  }

  _materialize(name) {
    if(this.dataset.disabled) // already in progress
      return;
    this.dataset.disabled = 1;
    let promise = gameStore.create(name);
    promise.then(record => {
      this.record = record;
      delete this.dataset.disabled;
    });
    return promise;
  }

  _delete() {
    if(this.state === states.confirm) {
      gameStore.delete(this.record).then(() => this.remove());
    } else
      this.state = states.confirm;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      if(this.state === states.nascent)
        this._choose();
      else
        this._close();
    }
  }

  _click(e) {
    if(this.state === states.base && !e.defaultPrevented)
      this._choose();
  }

  _choose() {
    let gameAwaitable = this._gameRecord();
    document.activeElement.blur();
    if(!gameAwaitable) // cancelled
      return;
    this.dispatchEvent(new CustomEvent('game-chosen', {
      detail: { gameAwaitable },
      bubbles: true
    }));
  }

  _colorClicked(color) {
    this.record.tag = color;
    this._close();
    if(document.activeElement)
      document.activeElement.blur();
  }
}

window.customElements.define('log-game', GameRecordElement);
