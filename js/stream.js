import './components/spa-scroll.js';
import './components/spa-textbox.js';
import _, * as i18n from './i18n.js';

const worker = new Worker('./js/stream-worker.js', {type: 'module'});

export default function(root) {
  root._in = root.getElementById('in');
  root._in.addEventListener('input', e => worker.postMessage(root._in.value));

  worker.addEventListener('message', e => {
    if(e.data.type === 'ok')
      root._in.mark();
    else {
      root._in.mark(e.data.pos, e.data.len);
    };
  });
  return {};
}
