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
<div class="log-record-props"></div>`;

const templateProps = document.createElement('template');
templateProps.innerHTML = `
<spa-color-sel class="log-record-colorsel"></spa-color-sel>
<button class="log-record-geo-button inline"></button>`;

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
    this.dataset.color = 'grey';
    this.appendChild(templateBase.content.cloneNode(true));
    let id = this._id = id => this.querySelector(`.log-record-${id}`);
    id('area').addEventListener('input', () => this._input());
    id('area').addEventListener('keydown', e => this._keydown(e));
    id('edit').addEventListener('click', e => { this.state = states.edit; e.preventDefault(); });
    id('geo-icon').addEventListener('click', () => this._geoShow());
    this.addEventListener('focusout', e => {
      if(!this.contains(e.relatedTarget))
        this._close();
    });
    if(!this.hasAttribute('tabindex'))
      this.setAttribute('tabindex', -1);
    this.dataset.focusContainer = 1;
    this._constructed = construct.base;
  }

  _constructProps() {
    if(this._constructed >= construct.props)
      return;
    this._constructBase();
    this._id('props').appendChild(templateProps.content.cloneNode(true));
    this._id('geo-button').addEventListener('click', e => { this._geoSet(); e.preventDefault(); });
    this._id('colorsel').addEventListener('color-click', e => this._colorsel(e));
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
    if(state === states.base)
      delete this.dataset.protected;
    else
      this.dataset.protected = true;
    if(state === states.nascent)
      this.dataset.hidePlus = true;
    else
      delete this.dataset.hidePlus;
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
    let tag = e.detail.color;
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
