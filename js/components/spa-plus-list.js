const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="css/components/spa-plus-list.css"/>
<div id="content">
  <slot></slot>
  <div id="plus-item">+</div>
</div>
<div id="plus-button">+</div>`;

export class PlusListElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._plusButton = this.shadowRoot.getElementById('plus-button');
    this._plusItem = this.shadowRoot.getElementById('plus-item');
    let cb = () => this.dispatchEvent(new CustomEvent('plus-click'), { bubbles: true });
    this._plusButton.addEventListener('click', cb);
    this._plusItem.addEventListener('click', cb);
  }

  connectedCallback() {
    let ro = new ResizeObserver(entries => this._resized(entries));
    this.shadowRoot.querySelector('slot').assignedElements().forEach(elm => ro.observe(elm));
    let io = new IntersectionObserver(entries => {
      let bigPlusVisible = entries[0].intersectionRatio <= 0;
      this._plusButton.hidden = !bigPlusVisible;
    });
    io.observe(this._plusItem);
    let mo = new MutationObserver(records =>
      records.forEach(record =>
        record.addedNodes.forEach(elm => this._do(elm))));
    mo.observe(this.shadowRoot.getElementById('content'), { childList: true });
  }

  _resized(entries) {
    entries.forEach(entry => this._do(entry.target));
  }

  _do(elm) {
    let parentSize = this.clientHeight;
    let targetSize = elm.clientHeight;
    let reservedSize = parseFloat(getComputedStyle(this._plusItem).height) + parseFloat(getComputedStyle(this._plusItem).marginTop);
    let smallPlusVisible = targetSize + reservedSize >= parentSize;
    this._plusItem.hidden = !smallPlusVisible;
  }
}

window.customElements.define('spa-plus-list', PlusListElement);
