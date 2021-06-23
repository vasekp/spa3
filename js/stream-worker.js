import './stream/filters/basic.js';
import './stream/filters/arith.js';
import './stream/filters/string.js';
import {parse, ParseError} from './stream/parser.js';
import {StreamError, TimeoutError} from './stream/base.js';

const LEN = 200;

export function exec(data) {
  try {
    switch(data.cmd) {
      case 'parse':
        parse(data.input);
        return {
          type: 'ok',
          cmd: data.cmd,
          input: data.input};
        break;
      case 'exec':
        const st = parse(data.input);
        const out = st.prepareT().writeoutT(LEN);
        return {
          type: 'ok',
          cmd: data.cmd,
          input: data.input,
          output: out
        };
        break;
    }
  } catch(err) {
    if(err instanceof ParseError)
      return {
        type: 'error',
        pos: err.pos,
        len: err.len,
        msg: err.msg,
        cmd: data.cmd
      };
    else if(err instanceof StreamError)
      return {
        type: 'error',
        pos: err.node ? err.node.token.pos : null,
        len: err.node ? err.node.token.value.length : null,
        input: err.node ? err.node.desc() : null,
        msg: err.msg,
        cmd: data.cmd
      };
    else if(err instanceof TimeoutError)
      return {
        type: 'error',
        msg: 'Timed out',
        cmd: data.cmd
      };
    else
      console.error(err);
  }
}

onmessage = function(e) {
  postMessage(exec(e.data));
}
