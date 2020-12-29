const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<style>:not(:defined) { display: none; }</style>
<spa-slideout id="controls" class="corner">
  <button><img class="inline" src="images/move.svg"/></button>
  <button><img class="inline" src="images/settings.svg"/></button>
  <button><img class="inline" src="images/home.svg"/></button>
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
    cont.innerHTML = '';
    const loading = document.createElement('div');
    loading.classList.add('spa-loading');
    cont.appendChild(loading);
    const [response, script] = await Promise.all([
      fetch(`${view}.mod.html`).then(r => r.text()),
      import(`../${view}.js`),
      this.addStyleSheet('css/modules.css'),
      this.addStyleSheet(`css/${view}.css`)
    ]);
    loading.insertAdjacentHTML('afterend', await response);
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
