const enumHandler = {
  get(target, prop) {
    if(typeof target[prop] !== 'undefined')
      return target[prop];
    else
      throw new RangeError(`${prop} not defined`);
  }
};

export default class Enum {
  static fromArray(arr) {
    const obj = Object.create(null);
    for(const s of arr)
      obj[s] = s;
    return Object.freeze(new Proxy(obj, enumHandler));
  }

  static fromObj(tmpl) {
    const obj = Object.create(null);
    for(const s in tmpl)
      obj[s] = tmpl[s];
    return Object.freeze(new Proxy(obj, enumHandler));
  }
}
