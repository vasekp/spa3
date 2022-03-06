export default class ContainerElement extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('focusout', e => {
      if(window.debugModal)
        return;
      if(!this.contains(e.relatedTarget))
        this.dispatchEvent(new CustomEvent('focus-leave'));
    });
  }
}

window.customElements.define('spa-focus-container', ContainerElement);
