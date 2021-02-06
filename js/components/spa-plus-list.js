const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-plus-list.css"/>
<spa-scroll>
  <div id="content">
    <slot></slot>
    <div id="item"><div id="button"></div></div>
  </div>
</spa-scroll>`;

class PlusListElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._content = this.shadowRoot.getElementById('content');
    this._item = this.shadowRoot.getElementById('item');
    this._button = this.shadowRoot.getElementById('button');
  }

  connectedCallback() {
    this._state = new Proxy({
      scrolling: false,
      bottom: false,
      hidden: false
    }, new PlusHandler(this._item, this._button));

    /* Sets _state.scrolling (= content large enough to need scrolling) */
    const ro = new ResizeObserver(() => this._resized());
    ro.observe(this);
    ro.observe(this._content);

    /* Sets _state.bottom (= scrolled low enough for extra "+" item to be visible) */
    const io = new IntersectionObserver(entries =>
      this._state.bottom = entries[0].intersectionRatio >= 0.01,
      { threshold: 0.01 });
    io.observe(this._item);

    /* Sets _state.hidden (= an element with dataset.hidePlus == 1 is connected) */
    const mo = new MutationObserver(() =>
      this._state.hidden = Boolean(this.querySelector('[data-hide-plus="1"]')));
    mo.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ 'data-hide-plus' ]
    });

    this._button.addEventListener('click', () => this.dispatchEvent(new CustomEvent('plus-click', { bubbles: true })));
  }

  _resized() {
    const parentSize = this.clientHeight;
    const childSize = this._content.clientHeight;
    this._state.scrolling = childSize >= parentSize;
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
