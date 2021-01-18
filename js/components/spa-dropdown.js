const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-dropdown.css"/>
<span id="ref" tabindex="0" data-active="1"><span id="header"><slot name="header"></span></slot>
<div id="ext"><slot></slot></div>
<span>`;

class DropDownElement extends HTMLElement {
  constructor() {
    super();
    this.hidden = true;
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').addEventListener('load', () => this.hidden = false);
    const ref = root.getElementById('ref');
    this.addEventListener('click', () => ref.classList.toggle('open'));
  }
}

window.customElements.define('spa-dropdown', DropDownElement);
