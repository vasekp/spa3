export class Loading extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    let link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'components/css/loading.css');
    this.shadowRoot.appendChild(link);
    let span = document.createElement('span');
    span.innerText = '●';
    this.shadowRoot.appendChild(span.cloneNode(true));
    this.shadowRoot.appendChild(span.cloneNode(true));
    this.shadowRoot.appendChild(span.cloneNode(true));
  }
}

export default function() {
  window.customElements.define('spa-loading', Loading);
};
