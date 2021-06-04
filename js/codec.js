const latin = i => String.fromCharCode(0x40 + i);
const digit = i => String.fromCharCode(0x30 + i);
const latinIfGT0 = i => i >= 0 ? latin(i + 1) : null;
const digitIfGT0 = i => i >= 0 ? digit(i) : null;

function Err(e) {
  this.toString = () => e;
}

export { Err as DecodeError };

class Braille {
  static letters = [1, 3, 9, 25, 17, 11, 27, 19, 10, 26, 5, 7, 13, 29, 21, 15, 31, 23, 14, 30, 37, 39, 55, 45, 61, 53];

  static dec = (c, ch) => latinIfGT0(this.letters.indexOf(c)) || new Err(ch);

  static decoder() {
    return this.dec;
  }
}

class Morse {
  static letters = [12, 2111, 2121, 211, 1, 1121, 221, 1111, 11, 1222, 212, 1211, 22, 21, 222, 1221, 2212, 121, 111, 2, 112, 1112, 122, 2112, 2122, 2211];
  static digits = [22222, 12222, 11222, 11122, 11112, 11111, 21111, 22111, 22211, 22221];

  static decoder() {
    const state = {};

    const dec = function(c, ch) {
      if(c === 2 || c === undefined) {
        if(!state.x)
          return ' ';
        /* else */
        state.in = (state.in || '') + (ch || '');
        const ret =
          latinIfGT0(Morse.letters.indexOf(state.x))
            || digitIfGT0(Morse.digits.indexOf(state.x))
            || new Err(state.in);
        state.x = 0;
        state.in = '';
        return ret;
      } else {
        state.x = 10 * (state.x || 0) + c + 1;
        state.in = (state.in || '') + ch;
        return '';
      }
    };

    dec.stateful = true;
    return dec;
  };
}

class Pigpen1 {
  static decCz = (c, ch) => c === 8 ? 'Ch' : c < 8 ? latin(c + 1) : latin(c);
  static decInt = (c, ch) => c < 26 ? latin(c + 1) : ' ';

  static decoder(conf) {
    return conf['pigpen1'] === 'cz' ? this.decCz : this.decInt;
  }
}

class Pigpen2 {
  static decoder(conf) {
    const xyz = conf['pigpen2'] === 'dot-9'
      ? (xy, z) => xy * 3 + z
      : (xy, z) => z * 9 + xy;
    const p1 = Pigpen1.decoder(conf);

    return function(c, ch) {
      const [xy, z] = [Math.trunc(c / 3), c % 3];
      return p1(xyz(xy, z));
    }
  }
}

class Pigpen3 {
  static funcs = {
    '9-dot-4': (x, y, z) => x * 18 + z * (x ? 4 : 9) + y,
    '9-4-dot': (x, y, z) => z * 13 + x * 9 + y,
    'dot-9-4': (x, y, z) => x * 18 + y * 2 + z
  };

  static decoder(conf) {
    const xyz = this.funcs[conf['pigpen3']];
    if(!xyz)
      throw new Error(`Asked for a nonexistent pigpen/3 variant '${conf['pigpen3']}'!`);

    return function(c, ch) {
      const [xy, z] = [c >> 1, c & 1];
      const [x, y] = xy < 9 ? [0, xy] : [1, xy - 9];
      const a = xyz(x, y, z);
      return a < 26 ? latin(a + 1) : new Err(ch);
    };
  }
}

class Polybius {
  static funcs = {
    'q': (c, ch) => c < 16 ? latin(c + 1) : c < 25 ? latin(c + 2) : new Err(ch),
    'j': (c, ch) => c < 9 ? latin(c + 1) : c < 25 ? latin(c + 2) : new Err(ch),
    'k': (c, ch) => c < 10 ? latin(c + 1) : c < 25 ? latin(c + 2) : new Err(ch)
  };

  static decoder(conf) {
    const dec = this.funcs[conf['polybius']];
    if(!dec)
      throw new Error(`Asked for a nonexistent polybius variant '${conf['polybius']}'!`);
    else
      return dec;
  }
};

class Segments {
  static digits = [0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110, 0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111];
  static letters = [0b1110111, 0b1111100, 0b1011000, 0b1011110, 0b1111001, 0b1110001, 0b0111101, 0b1110100, 0b0110000, 0b0011110, 0b1110101, 0b0111000, 0b0110111, 0b1010100, 0b1011100, 0b1110011, 0b1100111, 0b1010000, 0b1101101, 0b1111000, 0b0011100, 0b0111110, 0b1111110, 0b1110110, 0b1101110, 0b1011011]; /* S = 5, Z = 2 */

  static dec = (c, ch) => {
    return digitIfGT0(this.digits.indexOf(c))
      || latinIfGT0(this.letters.indexOf(c))
      || new Err(ch);
  };

  static decoder() {
    return this.dec;
  }
}

class Flags {
  static dec = (c, ch) => {
    if(c >= 1 && c <= 26)
      return latin(c);
    else if(c >= 32 && c < 42)
      return digit(c - 32);
    else if(c >= 48 && c < 58)
      return digit(c - 48);
    else
      return new Err(ch);
  };

  static decoder() {
    return this.dec;
  }
}

class Semaphore {
  static letters = [1, 2, 3, 4, 5, 6, 7, 10, 11, 38, 12, 13, 14, 15, 19, 20, 21, 22, 23, 28, 29, 39, 46, 47, 30, 55];

  static dec = (c, ch) => latinIfGT0(this.letters.indexOf(c)) || new Err(ch);

  static decoder() {
    return this.dec;
  }
}

const map = [
  [0x2800, Braille],
  [0x2840, null],
  [0xF008, Morse],
  [0xF00B, null],
  [0xF100, Pigpen1],
  [0xF120, Pigpen3],
  [0xF140, Pigpen2],
  [0xF15C, Polybius],
  [0xF180, Segments],
  [0xF200, null],
  [0xF800, Flags],
  [0xF840, null],
  [0xF880, Semaphore],
  [0xF8C0, null]
].reduce((() => {
  let lastClass = null;
  let lastStart = 0;
  return (acc, [start, cls]) => {
    acc.push([lastStart, start - 1, lastClass]);
    [lastStart, lastClass] = [start, cls];
    return acc;
  };
})(), []);

function category(c) {
  for(const [start, end, cls] of map)
    if(c <= end)
      return [cls, start];
  /* else */
  return [];
}

const trivialDecoder = (c, ch) => ch;

export function* decode(str, conf) {
  let lastClass = null;
  let decoder = trivialDecoder;
  for(const ch of str) {
    const c = ch.codePointAt(0);
    const [cls, base] = category(c);
    if(cls !== lastClass) {
      if(decoder.stateful)
        yield decoder();
      if(cls)
        decoder = cls.decoder(conf);
      else
        decoder = trivialDecoder;
      lastClass = cls;
    }
    yield decoder(c - base, ch);
  }
  if(decoder.stateful)
    yield decoder();
}
