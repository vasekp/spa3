import {timeFormat} from '../datetime.js';
import {Record} from '../log-record.js';
import {newRecord} from '../log-db.js';

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
      this.setAttribute('data-colors', 'grey');
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
      if(this._record)
        this._bindData();
    } else if(level == construct.props) {
      this._id('props').appendChild(templateProps.content.cloneNode(true));
      this._id('geo-button').addEventListener('action', () => this._geoSet());
      this._id('colorsel').addEventListener('action', e => this._colorsel(e));
    }
    this._constructed = level;
  }

  _bindData(record = this._record) {
    this.setAttribute('data-colors', 'param');
    this.style.setProperty('--color', record.tag);
    this._id('timestamp').textContent = timeFormat(record.date);
    this.setAttribute('data-geo-state', record.geo ? 'ok' : 'none');
    this._id('area').value = this._id('text').textContent = record.text;
  }

  static get observedAttributes() {
    return ['timediff', 'state'];
  }

  set record(record) {
    this._record = record;
    if(this._constructed)
      this._bindData(record);
    this.state = 'closed';
  }

  get record() {
    return this._record;
  }

  attributeChangedCallback(name, oldValue, value) {
    if(!this._constructed)
      return;
    if(value === oldValue)
      return;
    if(name === 'timediff')
      this._id('timediff').textContent = value ? '(' + value + ')' : '';
    else if(name === 'state')
      this._stateChange(value);
  }

  set state(state) {
    this.setAttribute('state', state);
  }

  get state() {
    return this.getAttribute('state') || 'empty';
  }

  set timediff(diff) {
    this.setAttribute('timediff', diff);
  }

  get timediff() {
    return this.getAttribute('timediff');
  }

  _stateChange(state = this.state) {
    if(state == 'empty' || state == 'edit' || state == 'firstEdit')
      this._construct(construct.props);
    this.toggleAttribute('data-protected', state != 'closed');
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
      this.style.setProperty('--color', tag);
      this.close();
    }
  }

  _materialize(tag) {
    let gid = this.closest('log-list').getAttribute('data-gid');
    this.record = newRecord(gid, tag, this._preGeo);
    this.state = 'firstEdit';
  }

  close() {
    this.state = 'closed';
  }

  _input() {
    this._record.text = this._id('text').textContent = this._id('area').value;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.close();
      e.preventDefault();
    }
  }

  _geoShow() {
    if(this.getAttribute('data-geo-state') == 'waiting')
      return;
    else if(this.getAttribute('data-geo-state') == 'error') {
      alert('Error: ' + this.getAttribute('data-geo-error'));
    } else
      window.open(`https://www.openstreetmap.org/?mlat=${this._record.geo.lat}&mlon=${this._record.geo.lon}&zoom=18`);
  }

  _geoSet() {
    if(this._record && this._record.geo) {
      // delete
      this._record.geo = undefined;
      this.setAttribute('data-geo-state', 'none');
    } else {
      this.setAttribute('data-geo-state', 'waiting');
      navigator.geolocation.getCurrentPosition(
        position => this._geoCallback(position),
        error => this._geoError(error),
        { enableHighAccuracy: true });
    }
    if(this.state != 'empty')
      this.close();
  }

  _geoCallback(position) {
    this.setAttribute('data-geo-state', 'success');
    if(this._record)
      this._record.geo = { lat: position.coords.latitude, lon: position.coords.longitude };
    else
      this._preGeo = { lat: position.coords.latitude, lon: position.coords.longitude };
  }

  _geoError(error) {
    this.setAttribute('data-geo-state', 'error');
    this.setAttribute('data-geo-error',
      error.code == error.PERMISSION_DENIED ? 'Permission denied'
      : error.code == error.POSITION_UNAVAILABLE ? 'Location unavailable'
      : 'Unknown error');
  }
}

window.customElements.define('log-record', RecordElement);
