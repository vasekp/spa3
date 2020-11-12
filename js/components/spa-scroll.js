const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-scroll.css"/>
<div><slot></slot></div>`;

export class ScrollElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    let cb = () => {
      let up = this.scrollTop > 0;
      let down = this.scrollHeight - this.scrollTop > this.clientHeight;
      this.setAttribute('data-scroll', (up ? 'up ' : '') + (down ? 'down' : ''));
    };
    this.addEventListener('scroll', cb);
    let ro = new ResizeObserver(cb);
    ro.observe(this);
    ro.observe(this.shadowRoot.querySelector('div'));
  }
}

window.customElements.define('spa-scroll', ScrollElement);
