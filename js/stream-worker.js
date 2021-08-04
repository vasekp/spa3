import StreamSession from './stream/interface.js';
import {types} from './stream/base.js';

const LEN = 200;
let sess = null;
let intHandle = null;
let extHandle = 0;

export function exec(data) {
  if(data.cmd !== 'next')
    intHandle = null;
  const cmd = data.cmd;
  const id = data.id;
  switch(data.cmd) {
    case 'ping':
      return data;
    case 'init':
      sess = new StreamSession(data.vars);
      return {id, cmd, result: 'ok'};
    case 'histclear':
      return {id, cmd, ...sess.clearHist()};
    case 'parse':
      return {id, cmd, ...sess.parse(data.input)};
    case 'exec':
      return {id, cmd, ...sess.eval(data.input, {length: LEN})};
    case 'browse':
      const res = sess.eval(data.input, {browse: true});
      if(res.result === 'error')
        return {id, cmd, ...res};
      else {
        intHandle = res.handle;
        extHandle++;
        return {id, cmd, ...res, handle: extHandle};
      }
    case 'next':
      if(!intHandle || data.handle !== extHandle)
        return {id, cmd,
          result: 'error',
          error: 'Browse cancelled'
        };
      else
        return {id, cmd, ...intHandle.next({length: LEN})};
  }
}

if(self.document === undefined)
  onmessage = e => postMessage(exec(e.data));
