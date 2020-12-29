const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<link rel="stylesheet" type="text/css" href="css/modules.css"/>
<style>:not(:defined) { display: none; }</style>
<spa-slideout id="controls" class="corner">
  <button id="move" part="move-icon" draggable="true"><img class="inline" src="images/move.svg"/></button>
  <button id="settings"><img class="inline" src="images/settings.svg"/></button>
  <button id="home"><img class="inline" src="images/home.svg"/></button>
</spa-slideout>
<div id="content"></div>`;

export class ViewElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.getElementById('home').addEventListener('click',
      () => this.dataset.module = "menu");
    this.shadowRoot.getElementById('move').addEventListener('dragstart', e => {
      this.classList.add('dragged');
      e.dataTransfer.setData('application/spa3', this.id);
      e.currentTarget.blur();
    });
    this.shadowRoot.getElementById('move').addEventListener('dragend',
      () => this.classList.remove('dragged'));
    this.addEventListener('dragenter', e => {
      if(e.dataTransfer.types.includes('application/spa3'))
        this.classList.add('dragover');
    });
    this.addEventListener('dragleave', () => this.classList.remove('dragover'));
    this.addEventListener('dragover', e => {
      if(e.dataTransfer.types.includes('application/spa3'))
        e.preventDefault();
    });
    this.addEventListener('drop', e => {
      if(e.dataTransfer.types.includes('application/spa3'))
        this.swap(e.dataTransfer.getData('application/spa3'));
      this.classList.remove('dragover');
    });
  }

  static get observedAttributes() {
    return ['data-module'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(newValue !== oldValue)
      this.loadModule(newValue);
  }

  async loadModule(module) {
    const cont = this.shadowRoot.getElementById('content');
    const prevStyle = this.shadowRoot.getElementById('style');
    if(prevStyle)
      prevStyle.id = '';
    if(module !== 'menu') // switching to menu should look fluid
      cont.innerHTML = '<div class="spa-loading"></div>';
    const [responseText, script] = await Promise.all([
      fetch(`${module}.mod.html`).then(async r => await r.text()),
      import(`../${module}.js`),
      this.addStyleSheet(`css/${module}.css`)
    ]);
    cont.innerHTML = responseText;
    if(prevStyle)
      prevStyle.remove();
    script.init(this.shadowRoot);
    document.dispatchEvent(new CustomEvent('view-change'));
  }

  swap(otherId) {
    if(otherId === this.id)
      return;
    const other = document.getElementById(otherId);
    const otherPos = other.dataset.pos;
    other.dataset.pos = this.dataset.pos;
    this.dataset.pos = otherPos;
  }

  async addStyleSheet(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    link.id = 'style';
    this.shadowRoot.appendChild(link);
    return new Promise(resolve => link.addEventListener('load', resolve));
  }
}

window.customElements.define('spa-view', ViewElement);
