import {Enum} from '../util/enum.js';

const NumColors = 9;

const construct = Enum.fromObj({ empty: 0, base: 1, full: 2});

export class ColorSelElement extends HTMLElement {
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
    elm.addEventListener('click', () => this.toggle());
    this._constructed = construct.base;
  }

  _constructFull() {
    if(this._constructed >= construct.full)
      return;
    this._constructBase();
    for(let i = 1; i <= NumColors; i++)
      this._addPatch(i);
    if(this.dataset.zero !== undefined)
      this._addPatch('cross');
    this._constructed = construct.full;
  }

  toggle(force) {
    if(this.dataset.expanded)
      return;
    this._constructFull();
    this.offsetWidth;
    this.classList.toggle('expanded', force);
  }

  static get observedAttributes() {
    return ['data-zero', 'data-expanded'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'data-zero') {
      if(this._constructed == construct.full && !this.querySelector('.patch[data-color="cross"]'))
        this._addPatch('cross');
    } else if(name === 'data-expanded') {
      this._constructFull();
      this.classList.add('expanded');
      this.querySelector('.patch[data-color="all"]').hidden = true;
    }
  }

  _addPatch(color) {
    let btn = document.createElement('button');
    btn.classList.add('patch');
    btn.dataset.color = color;
    btn.addEventListener('click', e => this._click(e));
    for(let elm of this.children)
      elm.style.zIndex++;
    btn.style.zIndex = 0;
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

export class ColorFilterElement extends ColorSelElement {
  constructor() {
    super();
    this._sel = [];
    for(let i = 1; i <= NumColors; i++)
      this._sel[i] = true;
  }

  _click(e) {
    if(this._constructed < construct.full)
      return;
    let color = e.currentTarget.dataset.color;
    let sel = this._sel;
    if(color === 'all') {
      // "All" clicked
      for(let i in sel)
        sel[i] = true;
    } else if(sel.all) {
      // One color clicked when "all" was on
      for(let i in sel)
        sel[i] = i == color;
    } else {
      sel[color] = !sel[color];
      // Only active color clicked: invert
      let empty = sel.every(x => !x);
      if(empty) {
        for(let i in sel)
          sel[i] = i != color;
      }
      // All colors selected: also mark 'all'
      sel.all = sel.every(x => x);
    }
    for(let elm2 of this.querySelectorAll('.patch'))
      elm2.classList.toggle('selected', sel[elm2.dataset.color]);
    this._notify();
  }

  _addPatch(c) {
    let res = ColorSelElement.prototype._addPatch.call(this, ...arguments);
    res.classList.add('filter', 'selected');
    return res;
  }

  selectAll() {
    for(let elm of this.querySelectorAll('.patch')) {
      elm.classList.add('filter', 'selected');
      this._sel[elm.dataset.color] = true;
    }
    this._notify();
  }

  _notify() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { selected: this._sel },
      bubbles: true
    }));
  }
}

window.customElements.define('spa-color-sel', ColorSelElement);
window.customElements.define('spa-color-filter', ColorFilterElement);
