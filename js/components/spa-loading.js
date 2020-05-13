export class LoadingElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    let link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'css/components/spa-loading.css');
    this.shadowRoot.appendChild(link);
    let span = document.createElement('span');
    span.innerText = '●';
    span.hidden = true;
    this.shadowRoot.appendChild(span.cloneNode(true));
    this.shadowRoot.appendChild(span.cloneNode(true));
    this.shadowRoot.appendChild(span.cloneNode(true));
    link.onload = () => {
      this.shadowRoot.querySelectorAll('span').forEach(e => e.hidden = false);
    }
  }
}

window.customElements.define('spa-loading', LoadingElement);
