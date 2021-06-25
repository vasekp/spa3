import './stream/filters/basic.js';
import './stream/filters/arith.js';
import './stream/filters/string.js';
import {parse, ParseError} from './stream/parser.js';
import {History, Register, StreamError, TimeoutError, mainReg} from './stream/base.js';

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
        if(node.ident === 'equal')
          node = node.toAssign();
        node = node
          .withScope({history, register: userReg})
          .timeConstr().prepare();
        const out = node.timeConstr().writeout(LEN);
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
