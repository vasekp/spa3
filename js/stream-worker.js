import './stream/filters/basic.js';
import './stream/filters/arith.js';
import './stream/filters/string.js';
import {parse, ParseError} from './stream/parser.js';
import {StreamError, TimeoutError} from './stream/base.js';

onmessage = function(e) {
  try {
    parse(e.data);
    postMessage({type: 'ok'});
  } catch(err) {
    if(err instanceof ParseError)
      postMessage({
        type: 'error',
        pos: err.pos,
        len: err.len,
        msg: err.msg
      });
    else
      postMessage(err);
  }
}
