export class TriStateElement extends HTMLInputElement {
  constructor() {
    super();
    this.addEventListener('click', () => {
      // https://css-tricks.com/almanac/selectors/i/indeterminate/
      if(this.readOnly)
        this.checked = this.readOnly = false;
      else if(!this.checked)
        this.readOnly = this.indeterminate = true;
    });
    this.readOnly = this.indeterminate = true;
  }
}

window.customElements.define('tri-state', TriStateElement, { extends: 'input' });
