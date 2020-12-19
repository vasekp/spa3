export class TriStateElement extends HTMLInputElement {
  constructor() {
    super();
    this.addEventListener('click', () => {
      // adapted from https://css-tricks.com/almanac/selectors/i/indeterminate/
      if(this.readOnly) {
        this.readOnly = false;
        this.checked = true;
      } else if(this.checked)
        this.readOnly = this.indeterminate = true;
    });
    this.checked = this.readOnly = this.indeterminate = true;
  }
}

window.customElements.define('tri-state', TriStateElement, { extends: 'input' });
