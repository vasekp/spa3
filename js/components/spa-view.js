export class ViewElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
  }

  static get observedAttributes() {
    return ['data-module'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.loadView(newValue);
  }

  async loadView(view) {
    const response = await fetch(`${view}.mod.html`);
    this.shadowRoot.innerHTML = '';
    await this.addStyleSheet('css/modules.css');
    await this.addStyleSheet(`css/${view}.css`);
    const loading = document.createElement('div');
    loading.classList.add('spa-loading');
    this.shadowRoot.appendChild(loading);
    const script = await import(`../${view}.js`);
    loading.insertAdjacentHTML('afterend', await response.text());
    loading.remove();
    script.init(this.shadowRoot);
  }

  async addStyleSheet(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    this.shadowRoot.appendChild(link);
    return new Promise(resolve => link.addEventListener('load', resolve));
  }
}

window.customElements.define('spa-view', ViewElement);
