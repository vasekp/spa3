import ContainerElement from './spa-focus-container.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-dropdown.css"/>
<div id="ref">
  <button id="header" class="no-outline"><slot name="header"></slot></button>
  <div id="ext" class="no-outline" tabindex="-1" hidden><slot></slot></div>
</div>
<div id="placeholder">&#x200B;</div>
<div id="origin"></div>`;

class DropDownElement extends ContainerElement {
  constructor() {
    super();
    this.hidden = true;
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').addEventListener('load', () => this.hidden = false);
    root.getElementById('header').addEventListener('click', e => { this._toggle(); e.preventDefault(); });
    this.addEventListener('focus-leave', () => this._toggle(false));
  }

  _toggle(state) {
    const ref = this.shadowRoot.getElementById('ref');
    const ext = this.shadowRoot.getElementById('ext');
    const ph = this.shadowRoot.getElementById('placeholder');
    const open = state !== undefined ? state : !ref.classList.contains('open');
    this.dispatchEvent(new CustomEvent('pause-scroll', { detail: { pause: open }, bubbles: true }));
    if(open) {
      const rect = ref.getBoundingClientRect();
      const origin = this.shadowRoot.getElementById('origin');
      const orect = origin.getBoundingClientRect();
      ref.style.left = `${rect.x - orect.x}px`;
      ref.style.top = `${rect.y - orect.y}px`;
      ph.style.width = `${rect.width}px`;
      ph.style.height = `${rect.height}px`;
    }
    ph.hidden = !open;
    ext.hidden = !open;
    ref.style.position = open ? 'fixed' : 'static'; // Must happen before animation
    ref.offsetWidth;
    ref.classList.toggle('open', open);
    if(open)
      ext.focus();
  }
}

window.customElements.define('spa-dropdown', DropDownElement);
