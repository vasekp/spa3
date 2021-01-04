export class ContainerElement extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('focusout', e => {
      if(!this.contains(e.relatedTarget))
        this.dispatchEvent(new CustomEvent('focus-leave'));
    });
  }
}

window.customElements.define('spa-focus-container', ContainerElement);
