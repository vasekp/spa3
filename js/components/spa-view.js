const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<style>:not(:defined) { display: none; }</style>
<spa-slideout id="controls" class="corner">
  <button><img class="inline" src="images/edit.svg"/></button>
  <button><img class="inline" src="images/edit.svg"/></button>
  <button><img class="inline" src="images/edit.svg"/></button>
</spa-slideout>
<div id="content"></div>`;

export class ViewElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['data-module'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.loadView(newValue);
  }

  async loadView(view) {
    const cont = this.shadowRoot.getElementById('content');
    const response = await fetch(`${view}.mod.html`);
    cont.innerHTML = '';
    await this.addStyleSheet('css/modules.css');
    await this.addStyleSheet(`css/${view}.css`);
    const loading = document.createElement('div');
    loading.classList.add('spa-loading');
    cont.appendChild(loading);
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
