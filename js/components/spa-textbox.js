const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-textbox.css"/>
<span></span>
<textarea part="area" spellcheck="false"></textarea>`;

class TextboxElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._area = this.shadowRoot.querySelector('textarea');
    this._span = this.shadowRoot.querySelector('span');
    this._area.addEventListener('input', () => this._span.textContent = this._area.value);
  }

  connectedCallback() {
    /* if value had been set before connecting, it would shadow the property */
    for(const prop of ['value', 'disabled']) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  set value(v) {
    this._span.textContent = this._area.value = v;
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
    return ['disabled'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'disabled') {
      const isDisabled = value !== null;
      this._area.disabled = isDisabled;
      if(isDisabled)
        this._area.blur();
    }
  }

  focus() {
    this._area.focus();
  }
}

window.customElements.define('spa-textbox', TextboxElement);
