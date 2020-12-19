import {Enum} from '../util/enum.js';

const NumColors = 9;

const construct = Enum.fromObj({ empty: 0, base: 1, full: 2});

export class ColorSelElement extends HTMLElement {
  connectedCallback() {
    if(this.dataset.delayed === undefined)
      this.construct();
  }

  construct() {
    if(this._constructed)
      return;
    for(let i = 1; i <= NumColors; i++)
      this._addPatch(i);
    if(this.dataset.hasAll !== undefined)
      this._addPatch('all');
    if(this.dataset.hasZero !== undefined)
      this._addPatch('cross');
    this._constructed = true;
  }

  _addPatch(color) {
    let btn = document.createElement('button');
    btn.classList.add('patch');
    btn.dataset.color = color;
    btn.addEventListener('click', e => this._click(e));
    this.appendChild(btn);
    return btn;
  }

  _click(e) {
    let color = e.target.dataset.color !== 'cross' ? e.target.dataset.color : 'none';
    let stop = !this.dispatchEvent(new CustomEvent('color-click', {
      detail: { color },
      cancelable: true,
      bubbles: true
    }));
    if(stop)
      e.preventDefault();
  }
}

export class ColorFilterElement extends HTMLElement {
  constructor() {
    super();
    this._constructed = construct.empty;
  }

  connectedCallback() {
    this._constructBase();
  }

  _constructBase() {
    if(this._constructed >= construct.base)
      return;
    let elm = this._addPatch('all');
    elm.addEventListener('mousedown', () => { this._constructFull(); }, { once: true });
    this._constructed = construct.base;
  }

  _constructFull() {
    if(this._constructed >= construct.full)
      return;
    for(let i = 1; i <= NumColors; i++)
      this._addPatch(i).classList.add('checkbox-simple');
    this.offsetWidth;
    this._constructed = construct.full;
  }

  _click(e) {
    if(this._constructed < construct.full)
      return;
    let color = e.currentTarget.dataset.color;
    let sel = [];
    for(let elm of this.querySelectorAll('.patch:not([data-color="all"])'))
      sel[elm.dataset.color] = elm.checked;
    if(color === 'all') {
      // "All" clicked: select everything else
      for(let c in sel)
        sel[c] = true;
    } else {
      // state before change
      sel[color] = !sel[color];
      if(sel.every(x => x)) {
        // one color clicked when all were on ⇒ filter only this one
        for(let c in sel)
          sel[c] = c == color;
      } else {
        // invert
        sel[color] = !sel[color];
        if(sel.every(x => !x)) {
          // from 1 to 0 selected: invert all (filter all except this one)
          for(let c in sel)
            sel[c] = c != color;
        }
      }
    }
    for(let elm of this.querySelectorAll('.patch:not([data-color="all"])'))
      elm.checked = sel[elm.dataset.color];
    this._notify();
  }

  _addPatch(color) {
    let chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.classList.add('patch');
    chk.dataset.color = color;
    chk.checked = true;
    chk.addEventListener('change', e => this._click(e));
    for(let elm of this.children)
      elm.style.zIndex++;
    chk.style.zIndex = 0;
    this.appendChild(chk);
    return chk;
  }

  selectAll() {
    if(this._constructed < construct.full)
      return;
    for(let elm of this.querySelectorAll('.patch'))
      elm.checked = true;
    this._notify();
  }

  _notify() {
    let selected = {};
    for(let elm of this.querySelectorAll('.patch'))
      selected[elm.dataset.color] = elm.checked;
    this.dispatchEvent(new CustomEvent('filter-change', {
      detail: { selected },
      bubbles: true
    }));
  }
}

window.customElements.define('spa-color-sel', ColorSelElement);
window.customElements.define('spa-color-filter', ColorFilterElement);
