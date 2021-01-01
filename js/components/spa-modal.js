import './spa-scroll.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-modal.css"/>
<spa-scroll id="scroll"><div id="content" tabindex="-1" data-focus-container="1" class="no-outline"><slot></slot></div></spa-scroll>`;

export class ModalElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['hidden'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(!value)
      this.shadowRoot.getElementById('content').focus();
  }
}

window.customElements.define('spa-modal', ModalElement);
