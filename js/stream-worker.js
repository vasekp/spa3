import './stream/filters/basic.js';
import './stream/filters/arith.js';
import './stream/filters/string.js';
import {parse, ParseError} from './stream/parser.js';
import {StreamError, TimeoutError} from './stream/base.js';

onmessage = function(e) {
  try {
    parse(e.data.input);
    postMessage({type: 'ok', cmd: e.data.cmd});
  } catch(err) {
    if(err instanceof ParseError)
      postMessage({
        type: 'error',
        pos: err.pos,
        len: err.len,
        msg: err.msg,
        cmd: e.data.cmd
      });
    else
      console.error(err);
  }
}
