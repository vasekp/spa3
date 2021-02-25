import './spa-slideout.js';

const template = document.createElement('template');
template.innerHTML = `<spa-slideout class="corner">
  <button data-mod="braille">&#x2800;</button>
  <button data-mod="morse">&#xF008;&#xF009;</button>
  <button data-mod="pigpen">&#xF121;</button>
  <button data-mod="polyb">&#xF166;</button>
  <button data-mod="segm">&#xF1FF;</button>
  <button data-mod="mobile">&#xF00B;</button>
  <button data-mod="digits">12</button>
  <button data-mod="flags">&#xF801;</button>
  <button data-mod="smph">&#xF883;</button>
</spa-slideout>`;

class TextboxElement extends HTMLElement {
  connectedCallback() {
    if(this._constructed)
      return;
    this._span = document.createElement('span');
    this._area = document.createElement('textarea');
    this._area.setAttribute('spellcheck', false);
    this._area.classList.add('no-outline');
    this._area.addEventListener('input', () => this._span.textContent = this._area.value + '\u200B');
    /* if value was set before connecting, it shadows the property */
    for(const prop of ['value', 'disabled']) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
    this.appendChild(this._span);
    this.appendChild(this._area);
    this.constructed = true;
  }

  set value(v) {
    this._area.value = v;
    this._span.textContent = v + '\u200B';
  }

  get value() {
    return this._area.value;
  }

  set disabled(v) {
    if(v)
      this.setAttribute('disabled', '');
    else
      this.removeAttribute('disabled');
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  static get observedAttributes() {
    return ['disabled', 'ime'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'disabled') {
      const isDisabled = value !== null;
      this._area.disabled = isDisabled;
      if(isDisabled)
        this._area.blur();
    } else if(name === 'ime' && !this._slideout) {
      this._slideout = template.content.firstElementChild.cloneNode(true);
      this._slideout.addEventListener('click', e => {
        const mod = e.target.dataset.mod;
        if(mod)
          document.querySelector('spa-keyboard').openFor(this._area, mod);
      });
      this.appendChild(this._slideout);
    }
  }

  focus() {
    this._area.focus();
  }
}

window.customElements.define('spa-textbox', TextboxElement);
