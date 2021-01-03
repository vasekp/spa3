import {Enum} from '../util/enum.js';
import {timeFormat} from '../util/datetime.js';
import {recordStore} from '../log-record-store.js';

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

export class RecordElement extends HTMLElement {
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
    let id = this._id = id => this.querySelector(`.log-record-${id}`);
    id('area').addEventListener('input', () => this._input());
    id('area').addEventListener('keydown', e => this._keydown(e));
    id('edit').addEventListener('click', e => this.state = states.edit);
    id('geo-icon').addEventListener('click', () => this._geoShow());
    id('geo-button').addEventListener('click', e => this._geoSet());
    id('colorsel').addEventListener('color-click', e => this._colorsel(e));
    this.addEventListener('focusout', e => {
      if(!this.contains(e.relatedTarget))
        this._close();
    });
    if(!this.hasAttribute('tabindex'))
      this.setAttribute('tabindex', -1);
    this.dataset.focusContainer = 1;
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
    if(state === states.edit || state === states.nascent)
      this.querySelector('spa-color-sel').construct();
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
    let tag = e.detail.color;
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
    let gid = this.closest('log-record-list').gid;
    this.record = await recordStore.create({ gid, tag, text: '', geo: this._preGeo });
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
    if(this._record && this._record.geo) {
      // delete
      this._record.geo = undefined;
    } else {
      this.dataset.geoState = 'waiting';
      navigator.geolocation.getCurrentPosition(
        position => this._geoCallback(position),
        error => this._geoError(error),
        { enableHighAccuracy: true });
    }
    if(this.state !== states.nascent)
      this.state = states.base;
  }

  _geoCallback(position) {
    if(this._record)
      this._record.geo = { lat: position.coords.latitude, lon: position.coords.longitude };
    else {
      this.dataset.geoState = 'success';
      this._preGeo = { lat: position.coords.latitude, lon: position.coords.longitude };
    }
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