import {Enum} from '../util/enum.js';
import {timeFormat} from '../util/datetime.js';
import {recordStore} from '../log-record-store.js';
import {lsKeys, getGameLabels} from '../logbook.js';
import {ContainerElement} from './spa-focus-container.js';

const templateBase = document.createElement('template');
templateBase.innerHTML = `
<div class="log-record-header color-fainter">
  <span>
    <span class="log-record-timestamp"></span>
    <span class="log-record-timediff"></span>
  </span>
  <span class="log-record-fill"></span>
  <button class="log-record-geo-icon inline"></button>
  <button class="log-record-edit"><img class="inline" src="images/edit.svg"></button>
</div>
<div class="log-record-text-container">
  <span class="log-record-text"></span>
  <textarea class="log-record-area"></textarea>
</div>
<div class="log-record-props">
  <spa-color-sel class="log-record-colorsel" data-delayed="1"></spa-color-sel>
  <button class="log-record-geo-button inline"></button>
</div>`;

const states = Enum.fromArray(['nascent', 'base', 'edit']);

export class RecordElement extends ContainerElement {
  connectedCallback() {
    this._construct();
    if(!this.state)
      this.state = states.nascent;
  }

  static get observedAttributes() {
    return ['data-time-diff', 'data-state'];
  }

  _construct() {
    if(this._constructed)
      return;
    this.dataset.color = 'grey';
    this.appendChild(templateBase.content.cloneNode(true));
    const id = this._id = id => this.querySelector(`.log-record-${id}`);
    id('area').addEventListener('input', () => this._input());
    id('area').addEventListener('keydown', e => this._keydown(e));
    id('edit').addEventListener('click', e => this.state = states.edit);
    id('geo-icon').addEventListener('click', () => this._geoShow());
    id('geo-button').addEventListener('click', e => this._geoSet());
    id('colorsel').addEventListener('color-click', e => this._colorsel(e));
    this.addEventListener('focus-leave', () => this._close());
    this._constructed = true
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'data-time-diff')
      this._id('timediff').textContent = value ? `(${value})` : '';
    else if(name === 'data-state')
      this._stateChange(value);
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

  set text(text) {
    this._id('area').value = this._id('text').textContent = text;
  }

  set tag(tag) {
    this.dataset.color = tag;
  }

  set date(date) {
    this._id('timestamp').textContent = timeFormat(date);
  }

  set geo(geo) {
    this.dataset.geoState = geo ? 'ok' : 'none';
  }

  set state(state) {
    this.dataset.state = state;
  }

  get state() {
    return this.dataset.state;
  }

  _stateChange(state = this.state) {
    this.dataset.protected = state === states.base ? 0 : 1;
    this.dataset.hidePlus = state === states.nascent ? 1 : 0;
    if(state === states.edit || state === states.nascent) {
      const colorsel = this.querySelector('spa-color-sel');
      const game = this.closest('log-record-list').game;
      colorsel.construct();
      colorsel.labels = getGameLabels(game)[1];
      colorsel.dataset.count = localStorage[lsKeys.ccount];
    }
    if(state === states.edit)
      this._open();
  }

  _open() {
    this._oldText = this._record.text;
    this._id('area').focus();
  }

  _close() {
    if(this._record)
      this.state = states.base;
    else
      this.remove();
  }

  _colorsel(e) {
    const tag = e.detail.color;
    if(tag === 'all')
      return;
    if(this.state === states.nascent)
      this._materialize(tag);
    else {
      this._record.tag = tag;
      this.state = states.base;
    }
  }

  async _materialize(tag) {
    const gid = this.closest('log-record-list').gid;
    this.record = await recordStore.create({ gid, tag, text: '' });
    /* The above line causes set geo. If we have a promise let's restore the reflection here. */
    if(this._geoPromise)
      this.geoPromise = this._geoPromise;
    this.state = states.edit;
    setTimeout(() => this.scrollIntoView(), 0);
  }

  _input() {
    this._record.text = this._id('area').value;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.state = states.base;
      e.preventDefault();
    } else if(e.key === 'Escape') {
      this._record.text = this._oldText;
      this.state = states.base;
    }
  }

  _geoShow() {
    if(this.dataset.geoState == 'waiting')
      return;
    else if(this.dataset.geoState == 'error') {
      alert(`Error: ${this.dataset.geoError}`);
    } else
      window.open(`https://www.openstreetmap.org/?mlat=${this._record.geo.lat}&mlon=${this._record.geo.lon}&zoom=18`);
  }

  _geoSet() {
    this._geoPromise = null;
    if(this._record && this._record.geo) {
      // delete
      this._record.geo = undefined;
    } else {
      this.geoPromise = new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject,
          { enableHighAccuracy: true })
      });
    }
    if(this.state !== states.nascent)
      this.state = states.base;
  }

  set geoPromise(promise) {
    this.dataset.geoState = 'waiting';
    this._geoPromise = promise;
    promise
      .then(position => this._geoResolve(position))
      .catch(error => this._geoError(error));
  }

  _geoResolve(position) {
    if(this._record) // will set geoState = 'ok'
      this._record.geo = { lat: position.coords.latitude, lon: position.coords.longitude };
    else
      this.dataset.geoState = 'success';
  }

  _geoError(error) {
    this.dataset.geoState = 'error';
    this.dataset.geoError =
      error.code == error.PERMISSION_DENIED ? 'Permission denied'
      : error.code == error.POSITION_UNAVAILABLE ? 'Location unavailable'
      : 'Unknown error';
  }
}

window.customElements.define('log-record', RecordElement);
