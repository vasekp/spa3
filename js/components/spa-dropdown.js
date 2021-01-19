import ContainerElement from './spa-focus-container.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-dropdown.css"/>
<span id="ref"><span id="header" data-active="1"><slot name="header"></slot><button id="arrow" class="no-outline"></button></span>
<div id="ext"><slot></slot></div>
<span>`;

class DropDownElement extends ContainerElement {
  constructor() {
    super();
    this.hidden = true;
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').addEventListener('load', () => this.hidden = false);
    const ref = root.getElementById('ref');
    root.getElementById('header').addEventListener('click', () => ref.classList.toggle('open'));
  }
}

window.customElements.define('spa-dropdown', DropDownElement);
