import ContainerElement from './spa-focus-container.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-dropdown.css"/>
<div id="ref"><span id="header" data-active="1"><slot name="header"></slot><button id="arrow" class="no-outline"></button></span>
<div id="ext" hidden><slot></slot></div>
</div><span id="strut">&#x200B;</span><div id="origin"></div>`;

class DropDownElement extends ContainerElement {
  constructor() {
    super();
    this.hidden = true;
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').addEventListener('load', () => this.hidden = false);
    const ref = root.getElementById('ref');
    root.getElementById('header').addEventListener('click', () => {
      const open = !ref.classList.contains('open');
      this.dispatchEvent(new CustomEvent('pause-scroll', { detail: { pause: open }, bubbles: true }));
      if(open) {
        const rect = ref.getBoundingClientRect();
        const orect = root.getElementById('origin').getBoundingClientRect();
        ref.style.left = `${rect.x - orect.x}px`;
        ref.style.top = `${rect.y - orect.y}px`;
      } else
        ref.style.position = '';
      root.getElementById('ext').hidden = !open;
      ref.style.position = open ? 'fixed' : 'static'; // Must happen before animation
      ref.offsetWidth;
      ref.classList.toggle('open', open);
    });
  }
}

window.customElements.define('spa-dropdown', DropDownElement);
