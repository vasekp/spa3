import Enum from '../util/enum.js';

class NumberPickerElement extends HTMLElement {
  connectedCallback() {
    if(!this._constructed)
      this.construct();
  }

  construct() {
    if(this._constructed)
      return;
    const minus = this._minus = document.createElement('button');
    minus.classList.add('patch');
    minus.dataset.content = '–';
    this.appendChild(minus);
    const input = this._val = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    this.appendChild(input);
    const plus = this._plus = document.createElement('button');
    plus.classList.add('patch');
    plus.dataset.content = '+';
    this.appendChild(plus);
    if(this.dataset.min === undefined)
      this.dataset.min = 0;
    if(this.dataset.max === undefined)
      this.dataset.max = 0;
    if(this.dataset.value === undefined)
      this.dataset.value = this.dataset.min;
    plus.addEventListener('click', () => ++this.dataset.value);
    input.addEventListener('change', e => {
      this.value = input.value;
      e.stopPropagation(); // Will convert to our custom change event.
    });
    input.addEventListener('input', e => e.stopPropagation());
    minus.addEventListener('click', () => --this.dataset.value);
    this._update();
    this._constructed = true;
  }

  static get observedAttributes() {
    return ['data-min', 'data-max', 'data-value'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'data-min') {
      if(this.max < this.min)
        this.max = this.min;
      if(this.value < this.min)
        this.value = this.min;
    } else if(name === 'data-max') {
      if(this.min > this.max)
        this.min = this.max;
      if(this.value > this.max)
        this.value = this.max;
    } else if(name === 'data-value') {
      if(this.value < this.min || isNaN(this.value))
        this.value = this.min;
      if(this.value > this.max)
        this.value = this.max;
      this.dispatchEvent(new CustomEvent('input', { bubbles: true }));
    }
    if(this._constructed)
      this._update();
  }

  get min() { return +this.dataset.min; }
  get max() { return +this.dataset.max; }
  get value() { return +this.dataset.value; }
  set min(v) { this.dataset.min = v; }
  set max(v) { this.dataset.max = v; }
  set value(v) { this.dataset.value = v; }

  _update() {
    this._plus.classList.toggle('inactive', this.dataset.value == this.dataset.max);
    this._minus.classList.toggle('inactive', this.dataset.value == this.dataset.min);
    this._val.value = this.dataset.value;
  }
}

window.customElements.define('spa-number-picker', NumberPickerElement);
