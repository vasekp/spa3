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
    const span = this._span = document.createElement('span');
    this.appendChild(span);
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
      if(this.value < this.min)
        this.value = this.min;
      if(this.value > this.max)
        this.value = this.max;
      this.dispatchEvent(new CustomEvent('change', { bubbles: true }));
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
    this._span.textContent = this.dataset.value;
  }
}

window.customElements.define('spa-number-picker', NumberPickerElement);
