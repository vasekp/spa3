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
  <span class="log-record-geo-icon inline" tabindex="0"></span>
  <img class="log-record-edit inline" tabindex="0" src="images/edit.svg">
</div>
<div class="log-record-text-container">
  <span class="log-record-text"></span>
  <textarea class="log-record-area"></textarea>
</div>
<div class="log-record-props"></div>`;

const templateProps = document.createElement('template');
templateProps.innerHTML = `
<spa-color-sel class="log-record-colorsel"></spa-color-sel>
<span class="log-record-geo-button inline" tabindex="0"/>`;

const construct = Enum.fromObj({ empty: 0, base: 1, props: 2 });
const states = Enum.fromArray(['nascent', 'base', 'edit']);

export class RecordElement extends HTMLElement {
  constructor() {
    super();
    this._constructed = construct.empty;
  }

  connectedCallback() {
    if(!this.state) {
      this._constructProps();
      this.state = states.nascent;
    } else
      this._constructBase();
  }

  static get observedAttributes() {
    return ['data-time-diff', 'data-state'];
  }

  _constructBase() {
    if(this._constructed >= construct.base)
      return;
    this.dataset.colors = 'grey';
    this.appendChild(templateBase.content.cloneNode(true));
    let id = this._id = id => this.querySelector(`.log-record-${id}`);
    id('area').addEventListener('input', () => this._input());
    id('area').addEventListener('keydown', e => this._keydown(e));
    id('edit').addEventListener('action', e => { this.state = states.edit; e.preventDefault(); });
    id('geo-icon').addEventListener('action', () => this._geoShow());
    this.addEventListener('focusout', e => {
      if(this.state !== states.nascent && !this.contains(e.relatedTarget))
        this._close();
    });
    this._constructed = construct.base;
  }

  _constructProps() {
    if(this._constructed >= construct.props)
      return;
    this._constructBase();
    this._id('props').appendChild(templateProps.content.cloneNode(true));
    this._id('geo-button').addEventListener('action', () => this._geoSet());
    this._id('colorsel').addEventListener('color-action', e => this._colorsel(e));
    this._constructed = construct.props;
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'data-time-diff')
      this._id('timediff').textContent = value ? `(${value})` : '';
    else if(name === 'data-state')
      this._stateChange(value);
  }

  set record(record) {
    this._constructBase();
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
    this.dataset.colors = 'param';
    this.style.setProperty('--color', tag);
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
    this.dataset.protected = state === states.base ? '' : '1'; // Must be a falsy / truthy string
    if(state === states.edit)
      this._open();
  }

  _open() {
    this._constructProps();
    this._id('area').focus();
  }

  _close() {
    if(this._record)
      this.state = states.base;
    else
      this.remove();
  }

  _colorsel(e) {
    let tag = e.target.color;
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
  }

  _input() {
    this._record.text = this._id('area').value;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.state = states.base;
      e.preventDefault();
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
