const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-scroll.css"/>
<div id="frame"><div id="content"><slot></slot></div></div>`;

/***
 * We need 3 divs:
 * - one to absolute position against (:host),
 * - one to set overlap: auto (#frame),
 * - one to resize-observe (#content).
 * 1 ≠ 2 because otherwise absolutely positioned elements would move when scrolling,
 * 2 ≠ 3 because if 3 had height: 100% it would not fire resize changes.
 ***/

export class ScrollElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._div = this.shadowRoot.querySelector('div');
  }

  connectedCallback() {
    let cb = () => {
      let up = this._div.scrollTop > 0;
      let down = this._div.scrollHeight - this._div.scrollTop > this._div.clientHeight;
      this.dataset.scroll = (up ? 'up ' : '') + (down ? 'down' : '');
    };
    this._div.addEventListener('scroll', cb);
    let ro = new ResizeObserver(cb);
    ro.observe(this);
    ro.observe(this.shadowRoot.querySelector('#content'));
    cb();
  }
}

window.customElements.define('spa-scroll', ScrollElement);
