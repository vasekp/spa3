import './stream/filters/basic.js';
import './stream/filters/arith.js';
import './stream/filters/string.js';
import {parse, ParseError} from './stream/parser.js';
import {StreamError, TimeoutError} from './stream/base.js';

const LEN = 200;

onmessage = function(e) {
  try {
    switch(e.data.cmd) {
      case 'parse':
        parse(e.data.input);
        postMessage({
          type: 'ok',
          cmd: e.data.cmd,
          input: e.data.input});
        break;
      case 'exec':
        const st = parse(e.data.input);
        const out = st.prepareT().writeoutT(LEN);
        postMessage({
          type: 'ok',
          cmd: e.data.cmd,
          input: e.data.input,
          output: out
        });
        break;
    }
  } catch(err) {
    if(err instanceof ParseError)
      postMessage({
        type: 'error',
        pos: err.pos,
        len: err.len,
        msg: err.msg,
        cmd: e.data.cmd
      });
    else if(err instanceof StreamError)
      postMessage({
        type: 'error',
        pos: err.node ? err.node.token.pos : null,
        len: err.node ? err.node.token.value.length : null,
        input: err.node ? err.node.desc() : null,
        msg: err.msg,
        cmd: e.data.cmd
      });
    else if(err instanceof TimeoutError)
      postMessage({
        type: 'error',
        msg: err.msg,
        cmd: e.data.cmd
      });
    else
      console.error(err);
  }
}
