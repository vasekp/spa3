import './stream/filters/lang.js';
import './stream/filters/streams.js';
import './stream/filters/numeric.js';
import './stream/filters/string.js';
import {StreamError, TimeoutError, ParseError} from './stream/errors.js';
import {parse} from './stream/parser.js';
import {History, Register, mainReg} from './stream/base.js';
import {RNG} from './stream/random.js';

const LEN = 200;
const history = new History();
const userReg = new Register(mainReg);

export function exec(data) {
  try {
    switch(data.cmd) {
      case 'ping':
        return data;
      case 'init':
        history.clear();
        return data;
      case 'parse':
        parse(data.input);
        return {
          type: 'ok',
          cmd: data.cmd,
          input: data.input};
      case 'exec':
        let node = parse(data.input);
        if(node.ident === 'equal' && node.token.value === '=' && !node.src && node.args[0] && node.args[0].type === 'symbol')
          node = node.toAssign();
        const rng = new RNG();
        node = node.timed(n => n.prepare({history, register: userReg, rng}));
        const out = node.timed(n => n.writeout(LEN))
        const hid = history.add(node);
        return {
          type: 'ok',
          cmd: data.cmd,
          input: data.input,
          output: out,
          history: hid
        };
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
        pos: err.pos,
        len: err.len,
        input: err.desc,
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
      return {
        type: 'error',
        msg: err.toString(),
        cmd: data.cmd
      };
  }
}

onmessage = function(e) {
  postMessage(exec(e.data));
}
