export class PlusListElement extends HTMLElement {
  connectedCallback() {
    if(!this._constructed) {
      const plusAction = e => {
        this.dispatchEvent(new CustomEvent('plus-action'), { bubbles: true });
        e.preventDefault();
      };
      for(name of ['spa-plus-button', 'spa-plus-item']) {
        const d = document.createElement('div');
        d.classList.add(name);
        d.setAttribute('tabindex', 0);
        d.addEventListener('action', plusAction);
        this.insertBefore(d, name === 'spa-plus-button' ? this.firstChild : null);
        this[name] = d;
      }
      this._constructed = true;
    }
    const ro = new ResizeObserver(() => this._resized());
    ro.observe(this);
    const io = new IntersectionObserver(entries => {
      let bigPlusVisible = entries[0].intersectionRatio <= 0;
      this['spa-plus-button'].hidden = !bigPlusVisible;
    });
    io.observe(this['spa-plus-item']);
  }

  _resized() {
    let parentSize = this.parentElement.clientHeight;
    let targetSize = this.clientHeight;
    let reservedSize = parseFloat(getComputedStyle(this['spa-plus-item']).height) + parseFloat(getComputedStyle(this['spa-plus-item']).marginTop);
    let smallPlusVisible = targetSize + reservedSize >= parentSize;
    this['spa-plus-item'].hidden = !smallPlusVisible;
    document.activeElement.scrollIntoView({block: 'nearest'});
  }
}

window.customElements.define('spa-plus-list', PlusListElement);
