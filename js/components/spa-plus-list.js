import './spa-scroll.js';

const template = document.createElement('template');
template.innerHTML = `
<div part="plus-button" id="plus-button" tabindex="0">+</div>
<spa-scroll id="content">
  <slot></slot>
  <div part="plus-item" id="plus-item" tabindex="0">+</div>
</spa-scroll>`;

export class PlusListElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open', delegatesFocus: true});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._plusButton = this.shadowRoot.getElementById('plus-button');
    this._plusItem = this.shadowRoot.getElementById('plus-item');
    let cb = () => this.dispatchEvent(new CustomEvent('plus-action'), { bubbles: true });
    this._plusButton.addEventListener('action', cb);
    this._plusItem.addEventListener('action', cb);
  }

  connectedCallback() {
    let ro = new ResizeObserver(() => this._resized());
    ro.observe(this);
    ro.observe(this.shadowRoot.getElementById('content'));
    let io = new IntersectionObserver(entries => {
      let bigPlusVisible = entries[0].intersectionRatio <= 0;
      this._plusButton.hidden = !bigPlusVisible;
    });
    io.observe(this._plusItem);
  }

  _resized() {
    let parentSize = this.clientHeight;
    let targetSize = this.shadowRoot.getElementById('content').clientHeight;
    let reservedSize = parseFloat(getComputedStyle(this._plusItem).height) + parseFloat(getComputedStyle(this._plusItem).marginTop);
    let smallPlusVisible = targetSize + reservedSize >= parentSize;
    this._plusItem.hidden = !smallPlusVisible;
    document.activeElement.scrollIntoView({block: 'nearest'});
  }

  scrollToTop() {
    this.shadowRoot.getElementById('content').scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  }
}

window.customElements.define('spa-plus-list', PlusListElement);
