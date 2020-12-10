import {timeFormat} from '../datetime.js';
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

let construct = Object.freeze({
  empty: 0,
  base: 1,
  props: 2
});

export class RecordElement extends HTMLElement {
  constructor() {
    super();
    this._constructed = construct.empty;
  }

  connectedCallback() {
    this._construct(construct.base);
    this._stateChange();
  }

  _construct(level) {
    if(this._constructed >= level)
      return;
    this._construct(level - 1);
    if(level == construct.base) {
      this.dataset.colors = 'grey';
      this.appendChild(templateBase.content.cloneNode(true));
      let id = this._id = id => this.querySelector(`.log-record-${id}`);
      id('area').addEventListener('input', () => this._input());
      id('area').addEventListener('keydown', e => this._keydown(e));
      id('edit').addEventListener('action', e => { this.state = 'edit'; e.preventDefault(); });
      id('geo-icon').addEventListener('action', () => this._geoShow());
      this.addEventListener('focusout', e => {
        if(!this.contains(e.relatedTarget))
          this.close();
      });
    } else if(level == construct.props) {
      this._id('props').appendChild(templateProps.content.cloneNode(true));
      this._id('geo-button').addEventListener('action', () => this._geoSet());
      this._id('colorsel').addEventListener('action', e => this._colorsel(e));
    }
    this._constructed = level;
  }

  static get observedAttributes() {
    return ['data-time-diff', 'data-state'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(!this._constructed)
      return;
    if(value === oldValue)
      return;
    else if(name === 'data-time-diff')
      this._id('timediff').textContent = value ? `(${value})` : '';
    else if(name === 'data-state')
      this._stateChange(value);
  }

  set record(record) {
    this._record = record;
    this._construct(construct.base);
    record.addView(this);
    this.state = 'closed';
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
    return this.dataset.state || 'empty';
  }

  _stateChange(state = this.state) {
    if(state == 'empty' || state == 'edit' || state == 'firstEdit')
      this._construct(construct.props);
    this.dataset.protected = state === 'closed' ? '' : '1';
    if(state == 'closed')
      this._close();
    if(state == 'edit' || state == 'firstEdit')
      this._open();
  }

  _open() {
    this._id('area').focus();
  }

  _close() {
    if(!this._record)
      this.remove();
  }

  _colorsel(e) {
    let tag = e.target.color;
    if(this.state == 'empty') {
      this._materialize(tag);
      e.preventDefault();
    } else {
      this._record.tag = tag;
      this.close();
    }
  }

  async _materialize(tag) {
    let gid = this.closest('log-record-list').gid;
    this.record = await recordStore.create({ gid, tag, text: '', geo: this._preGeo });
    this.state = 'firstEdit';
  }

  close() {
    this.state = 'closed';
  }

  _input() {
    this._record.text = this._id('area').value;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.close();
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
    if(this.state != 'empty')
      this.close();
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
