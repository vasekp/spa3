const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-slideout.css"/>
<div id="container" tabindex="0"><slot></slot></div>`;

export class SlideOutElement extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    const cont = root.getElementById('container');
    root.addEventListener('touchend', e => {
      if(!root.host.matches(':focus-within')) {
        cont.focus();
        e.preventDefault();
      }
    });
    const mo = new MutationObserver(() => this.updateCount());
    root.addEventListener('slotchange', e => {
      for(const elm of this.shadowRoot.querySelector('slot').assignedElements())
        mo.observe(elm, { attributes: true, attributeFilter: ['hidden'] });
      this.updateCount();
    });
  }

  updateCount() {
    const nodes = this.shadowRoot.querySelector('slot').assignedElements();
    const count = nodes.filter(elm => !elm.hidden).length;
    this.style.setProperty('--count', count);
  }
}

window.customElements.define('spa-slideout', SlideOutElement);
