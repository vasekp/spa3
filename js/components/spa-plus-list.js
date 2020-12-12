export class PlusListElement extends HTMLElement {
  connectedCallback() {
    this._construct();
    this._state = new Proxy({
      scrolling: false,
      bottom: false,
      hidden: false
    }, new PlusHandler(this._item, this._button));

    /* Sets _state.scrolling (= content large enough to need scrolling) */
    const ro = new ResizeObserver(() => this._resized());
    ro.observe(this);
    ro.observe(this.parentElement);

    /* Sets _state.bottom (= scrolled low enough for extra "+" item to be visible) */
    const io = new IntersectionObserver(entries =>
      this._state.bottom = entries[0].intersectionRatio >= 0.01,
      { threshold: 0.01 });
    io.observe(this._item);

    /* Sets _state.hidden (= an element with [data-hide-plus] is connected) */
    const mo = new MutationObserver(() =>
      this._state.hidden = Boolean(this.querySelector('[data-hide-plus]')));
    mo.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ 'data-hide-plus' ]
    });
  }

  _construct() {
    if(this._constructed)
      return;
    const item = document.createElement('div');
    item.classList.add('spa-plus-item');
    this.appendChild(item);
    const button = document.createElement('div');
    button.classList.add('spa-plus-button');
    item.appendChild(button);
    this._item = item;
    this._button = button;
    this._constructed = true;
  }

  _resized() {
    let parentSize = this.parentElement.clientHeight;
    let targetSize = this.clientHeight;
    const cstyle = getComputedStyle(this._item);
    let reservedSize = parseFloat(cstyle.height) + parseFloat(cstyle.marginTop);
    this._state.scrolling = targetSize + reservedSize >= parentSize;
  }

  get button() {
    return this._button;
  }
}

class PlusHandler {
  constructor(item, button) {
    this._item = item;
    this._button = button;
  }

  set(target, prop) {
    Reflect.set(...arguments);
    this._item.hidden = target.hidden;
    this._button.dataset.size = target.scrolling ?
        target.bottom ? 'small' : 'big'
      : 'big';
    return true;
  }
}

window.customElements.define('spa-plus-list', PlusListElement);
