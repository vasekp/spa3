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
import {types} from './stream/base.js';

const LEN = 200;
const history = new History();
const saveReg = mainReg.child();
const sessReg = saveReg.child();

let browseStream = null;
let browseHandle = 0;

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
        return {...data, type: 'ok'};
      case 'exec':
        {
          let node = parse(data.input);
          if(node.ident === 'equal' && node.token.value === '=' && !node.src && node.args[0] && node.args[0].type === 'symbol')
            node = node.toAssign();
          node = node.timed(n => n.prepare({history, register: sessReg, seed: RNG.seed()}));
          const ev = node.timed(n => n.eval());
          const out = node.timed(n => ev.writeout(LEN))
          const hid = history.add(node);
          return {...data,
            type: 'ok',
            prep: node.toString(),
            dataType: ev.type,
            dataRaw: ev.isAtom ? ev.value.toString() : null,
            output: out,
            history: hid
          };
        }
      case 'browse':
        {
          let node = parse(data.input);
          node = node.timed(n => n.prepare({history, register: sessReg, seed: RNG.seed()}));
          browseStream = node.timed(n => n.eval());
          browseHandle++;
          return {...data,
            type: 'ok',
            handle: browseHandle
          };
        }
      case 'next':
        if(!browseStream || data.handle !== browseHandle)
          return {...data,
            type: 'error',
            msg: 'Browse cancelled'
          };
        const next = browseStream.timed(s => s.next().value?.eval());
        if(!next) {
          browseStream = null;
          return {...data,
            type: 'browse',
            handle: browseHandle,
            done: true
          };
        } else {
          return {...data,
            type: 'browse',
            handle: browseHandle,
            input: next.toString(),
            output: next.timed(n => n.writeout(LEN)),
            dataType: next.type,
            dataRaw: next.isAtom ? next.value.toString() : null
          };
        }
    }
  } catch(err) {
    if(err instanceof ParseError)
      return {...data,
        type: 'error',
        pos: err.pos,
        len: err.len,
        msg: err.msg
      };
    else if(err instanceof StreamError)
      return {...data,
        type: 'error',
        pos: err.pos,
        len: err.len,
        input: err.desc,
        msg: err.msg
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
