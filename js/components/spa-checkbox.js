import {Enum} from '../util/enum.js';

const states = Enum.fromArray(['checked', 'unchecked', 'unset']);

const next_2state = {
  [states.checked]: states.unchecked,
  [states.unchecked]: states.checked
};

const next_3state = {
  [states.checked]: states.unchecked,
  [states.unchecked]: states.unset,
  [states.unset]: states.checked
};

export class CheckBoxElement extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', () => this._toggle());
    this.addEventListener('keydown', e => { if(e.key === ' ') this._toggle(); });
  }

  connectedCallback() {
    if(!this.dataset.state)
      this.dataset.state = this.dataset.states === "3" ? states.unset : states.checked;
    if(!this.hasAttribute('tabindex'))
      this.setAttribute('tabindex', 0);
  }

  get stateBool() {
    return this.dataset.state === states.unset ? null : this.dataset.state === states.checked;
  }

  _toggle() {
    const sw = this.dataset.states === "3" ? next_3state : next_2state;
    this.dataset.state = sw[this.dataset.state] || states.checked;
    this.dispatchEvent(new CustomEvent('input', { bubbles: true }));
    this.dispatchEvent(new CustomEvent('changed', { bubbles: true }));
  }
}

window.customElements.define('spa-checkbox', CheckBoxElement);
