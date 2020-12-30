const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-slideout.css"/>
<div id="container" part="container" tabindex="-1"><slot></slot></div>`;

export class SlideOutElement extends HTMLElement {
  constructor() {
    super();
    this.hidden = true;
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').addEventListener('load', () => this.hidden = false);
    const cont = root.getElementById('container');
    this.addEventListener('touchend', e => {
      if(!cont.matches(':focus-within')) {
        cont.focus();
        e.preventDefault();
      }
    });
    this.addEventListener('mouseenter', () => this.updateCount());
    this.addEventListener('focusin', () => this.updateCount());
  }

  updateCount() {
    const nodes = this.shadowRoot.querySelector('slot').assignedElements();
    const count = nodes.filter(elm => getComputedStyle(elm).display !== 'none').length;
    this.style.setProperty('--count', count);
  }
}

window.customElements.define('spa-slideout', SlideOutElement);
