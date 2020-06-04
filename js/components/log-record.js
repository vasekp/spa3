import {timeFormat} from '../datetime.js';
import {Record} from '../log-record.js';

const templateBase = document.createElement('template');
templateBase.innerHTML = `
<div data-id="lr.header" class="color-fainter" hidden>
  <span>
    <span data-id="lr.timestamp"></span>
    <span data-id="lr.timediff"></span>
  </span>
  <span data-id="lr.fill"></span>
  <span class="inline" data-id="lr.geo" hidden></span>
  <img class="inline" data-id="lr.edit" src="images/edit.svg">
</div>
<div data-id="lr.textContainer" hidden>
  <span data-id="lr.text"></span>
  <textarea data-id="lr.area" hidden></textarea>
</div>
<div data-id="lr.props"></div>`;

const templateProps = document.createElement('template');
templateProps.innerHTML = `
<spa-color-sel data-id="lr.colorsel"></spa-color-sel>
<span class="inline" data-id="lr.geoButton" tabindex="0"/>`;

let states = Object.freeze({
  empty: 'empty',
  closed: 'closed',
  edit: 'edit',
  firstEdit: 'firstedit'
});

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
      let id = id => this.querySelector(`[data-id="lr.${id}"]`);
      let refs = {
        text: id('text'),
        area: id('area'),
        edit: id('edit'),
        geoIcon: id('geo')
      };
      this._id = id;
      this._refs = refs;
      refs['area'].addEventListener('input', () => this._input());
      refs['area'].addEventListener('keydown', e => this._keydown(e));
      refs['edit'].addEventListener('click', () => this.state = states.edit);
      refs['geoIcon'].addEventListener('click', e => this._geoShow(e.currentTarget));
      this.addEventListener('blur', () => this.close());
      if(this._record)
        this._bindData();
    } else if(level == construct.props) {
      this._id('props').appendChild(templateProps.content.cloneNode(true));
      this._refs.geoButton = this._id('geoButton');
      this._refs['geoButton'].addEventListener('click', () => this._geoSet());
      this._id('colorsel').addEventListener('color-click', e => this._colorsel(e.detail.color));
    }
    this._constructed = level;
  }

  _bindData(record = this._record) {
    this.setAttribute('data-colors', 'param');
    this.style.setProperty('--color', record.tag);
    this._id('timestamp').innerText = timeFormat(record.date);
    this._id('header').hidden = false;
    this._id('textContainer').hidden = false;
    if(record.geo) {
      this._refs['geoIcon'].setAttribute('data-geo-state', 'ok');
      this._refs['geoIcon'].hidden = false;
    }
    this._refs['text'].innerText = record.text;
  }

  static get observedAttributes() {
    return ['timediff', 'state'];
  }

  set record(record) {
    this._record = record;
    if(this._constructed)
      this._bindData(record);
    this.state = states.closed;
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
      this._id('timediff').innerText = value ? '(' + value + ')' : '';
    else if(name === 'state')
      this._stateChange(value);
  }

  set state(state) {
    this.setAttribute('state', state);
  }

  get state() {
    return this.getAttribute('state') || states.empty;
  }

  set timediff(diff) {
    this.setAttribute('timediff', diff);
  }

  get timediff() {
    return this.getAttribute('timediff');
  }

  _stateChange(state = this.state) {
    if(state == states.empty || state == states.edit || state == states.firstEdit)
      this._construct(construct.props);
    if(state != states.closed)
      this.parentElement.querySelectorAll('log-record').forEach(elm => {
        if(elm !== this)
          elm.close();
      });
    this.toggleAttribute('data-protected', state != states.closed);
    this._id('edit').style.visibility = state != states.closed ? 'hidden' : 'visible';
    this._id('props').hidden = state == states.closed || state == states.firstEdit;
    if(state == states.closed)
      this._close();
    if(state == states.edit || state == states.firstEdit)
      this._open();
  }

  _open() {
    if(navigator.geolocation) {
      let hasGeo = !!this._record.geo;
      this._refs['geoButton'].setAttribute('data-geo-state', hasGeo ? 'remove' : 'add');
    } else
      this._refs['geoButton'].hidden = true;
    this._refs['area'].value = this._refs['text'].innerText;
    this._refs['text'].style.visibility = 'hidden';
    this._refs['area'].hidden = false;
    this._refs['area'].focus();
  }

  _close() {
    if(!this._record)
      this.remove();
    this._refs['text'].style.visibility = 'visible';
    this._refs['area'].hidden = true;
  }

  _colorsel(tag) {
    if(this.state == states.empty)
      this._materialize(tag);
    else {
      this._record.tag = tag;
      this.style.setProperty('--color', tag);
      this.close();
    }
  }

  _materialize(tag) {
    let gid = this.closest('log-list').getAttribute('data-gid');
    this.record = new Record(gid, tag, Date.now(), '', this._preGeo);
    this.state = states.firstEdit;
  }

  close() {
    this.state = states.closed;
  }

  _input() {
    this._record.text = this._refs['text'].innerText = this._refs['area'].value;
  }

  _keydown(e) {
    if(e.key === 'Enter') {
      this.close();
      e.preventDefault();
    }
  }

  _geoShow(elm) {
    if(elm.getAttribute('data-geo-state') == 'waiting')
      return;
    else if(elm.getAttribute('data-geo-state') == 'error') {
      alert('Error: ' + elm.getAttribute('data-geo-error'));
      elm.hidden = true;
    } else
      window.open(`https://www.openstreetmap.org/?mlat=${this._record.geo.lat}&mlon=${this._record.geo.lon}&zoom=18`);
  }

  _geoSet() {
    let geoIcon = this._refs['geoIcon'];
    let geoButton = this._refs['geoButton'];
    if(this._record && this._record.geo) {
      // delete
      this._record.geo = undefined;
      geoIcon.hidden = true;
    } else {
      geoIcon.setAttribute('data-geo-state', 'waiting');
      geoButton.setAttribute('data-geo-state', 'waiting');
      geoIcon.hidden = false;
      navigator.geolocation.getCurrentPosition(
        position => this._geoCallback(position),
        error => this._geoError(error),
        { enableHighAccuracy: true });
    }
    if(this.state != states.empty)
      this.close();
  }

  _geoCallback(position) {
    let geoIcon = this._refs['geoIcon'];
    let geoButton = this._refs['geoButton'];
    geoIcon.setAttribute('data-geo-state', '');
    geoButton.setAttribute('data-geo-state', 'success');
    if(this._record)
      this._record.geo = { lat: position.coords.latitude, lon: position.coords.longitude };
    else
      this._preGeo = { lat: position.coords.latitude, lon: position.coords.longitude };
  }

  _geoError(error) {
    let geoIcon = this._refs['geoIcon'];
    let geoButton = this._refs['geoButton'];
    geoIcon.setAttribute('data-geo-state', 'error');
    geoButton.setAttribute('data-geo-state', 'error');
    geoIcon.setAttribute('data-geo-error',
      error.code == error.PERMISSION_DENIED ? 'Permission denied'
      : error.code == error.POSITION_UNAVAILABLE ? 'Location unavailable'
      : 'Unknown error');
  }
}

window.customElements.define('log-record', RecordElement);
