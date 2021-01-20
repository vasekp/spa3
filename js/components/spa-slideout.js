const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-slideout.css"/>
<div id="expander" part="expander" tabindex="-1"><div id="container"><slot></slot></div></div>`;

class SlideOutElement extends HTMLElement {
  constructor() {
    super();
    this.hidden = true;
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    root.querySelector('link').addEventListener('load', () => this.hidden = false);
    const cont = root.getElementById('expander');
    this.addEventListener('touchend', e => {
      if(!cont.matches(':focus-within')) {
        cont.focus();
        e.preventDefault();
      }
    });
    const update = () => this.updateCount();
    this.addEventListener('mouseenter', update);
    this.addEventListener('focusin', update);
    root.addEventListener('slotchange', update);
  }

  updateCount() {
    const nodes = this.shadowRoot.querySelector('slot').assignedElements();
    const count = nodes.filter(elm => getComputedStyle(elm).display !== 'none').length;
    this.style.setProperty('--count', count);
  }
}

window.customElements.define('spa-slideout', SlideOutElement);
