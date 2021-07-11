import './stream/filters/lang.js';
import './stream/filters/streams.js';
import './stream/filters/numeric.js';
import './stream/filters/string.js';
import './stream/filters/combi.js';
import './stream/filters/iface.js';
import {StreamError, TimeoutError, ParseError} from './stream/errors.js';
import parse from './stream/parser.js';
import RNG from './stream/random.js';
import mainReg from './stream/register.js';
import History from './stream/history.js';

const LEN = 200;
const history = new History();
const saveReg = mainReg.child();
const sessReg = saveReg.child();

let browseStream = null;

export function exec(data) {
  try {
    if(data.cmd !== 'next')
      browseStream = null;
    switch(data.cmd) {
      case 'ping':
        return data;
      case 'init':
        history.clear();
        saveReg.init(data.vars);
        sessReg.init();
        return data;
      case 'histclear':
        history.clear();
        return data;
      case 'parse':
        parse(data.input);
        return {
          type: 'ok',
          cmd: data.cmd,
          input: data.input};
      case 'exec':
        {
          let node = parse(data.input);
          if(node.ident === 'equal' && node.token.value === '=' && !node.src && node.args[0] && node.args[0].type === 'symbol')
            node = node.toAssign();
          node = node.timed(n => n.prepare({history, register: sessReg, seed: RNG.seed()}));
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
      case 'browse':
        {
          let node = parse(data.input);
          node = node.timed(n => n.prepare({history, register: sessReg, seed: RNG.seed()}));
          browseStream = node.timed(n => n.eval());
          return {
            type: 'ok',
            cmd: data.cmd
          };
        }
      case 'next':
        if(!browseStream)
          return {
            type: 'error',
            msg: 'Browse cancelled'
          };
        const next = browseStream.timed(s => s.next()).value;
        if(!next)
          browseStream = null;
        return {
          type: 'browse',
          cmd: data.cmd,
          input: next ? next.toString() : null,
          output: next ? next.timed(n => n.writeout(LEN)) : null,
          ntype: next ? next.type : null
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

if(self.document === undefined)
  onmessage = e => postMessage(exec(e.data));

export const et = new EventTarget();

function regEvent(e) {
  const register = e.target === saveReg ? 'save' : 'session';
  if(self.document !== undefined)
    et.dispatchEvent(new CustomEvent(e.type, {detail: {...e.detail, register}}));
  else
    postMessage({
      type: e.type,
      ...e.detail,
      register
    });
}

sessReg.addEventListener('register', regEvent);
saveReg.addEventListener('register', regEvent);
