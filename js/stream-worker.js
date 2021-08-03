import StreamSession from './stream/interface.js';
import {types} from './stream/base.js';

const LEN = 200;
let sess = null;
let browseStream = null;
let browseHandle = 0;

export function exec(data) {
  if(data.cmd !== 'next')
    browseStream = null;
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
        browseStream = res.output;
        browseHandle++;
        return {id, cmd, ...res, handle: browseHandle};
      }
    case 'next':
      if(!browseStream || data.handle !== browseHandle)
        return {id, cmd,
          result: 'error',
          error: 'Browse cancelled'
        };
      else
        return browseStream.next();
  }
}

if(self.document === undefined)
  onmessage = e => postMessage(exec(e.data));
