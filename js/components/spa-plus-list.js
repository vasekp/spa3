export class PlusListElement extends HTMLElement {
  connectedCallback() {
    this._construct();
    this._state = new Proxy({
      scrolling: false,
      bottom: false
    }, new PlusHandler(this._button));
    const ro = new ResizeObserver(() => this._resized());
    ro.observe(this);
    ro.observe(this.parentElement);
    const io = new IntersectionObserver(entries => this._state.bottom = entries[0].intersectionRatio > 0);
    io.observe(this._item);
  }

  _construct() {
    if(this._constructed)
      return;
    const plusAction = e => {
      this.dispatchEvent(new CustomEvent('plus-action'), { bubbles: true });
      e.preventDefault();
    };
    const item = document.createElement('div');
    item.classList.add('spa-plus-item');
    this.appendChild(item);
    const button = document.createElement('div');
    button.classList.add('spa-plus-button');
    button.addEventListener('action', plusAction);
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
}

class PlusHandler {
  constructor(elm) {
    this._elm = elm;
  }

  set(target, prop) {
    Reflect.set(...arguments);
    this._elm.dataset.size = target.scrolling ?
        target.bottom ? 'small' : 'big'
      : 'big';
    return true;
  }
}

window.customElements.define('spa-plus-list', PlusListElement);
