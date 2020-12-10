const enumHandler = {
  get(target, prop) {
    if(target[prop])
      return target[prop];
    else
      throw new RangeError(`${prop} not defined`);
  }
};

export class Enum {
  static fromArray(arr) {
    const obj = Object.create(null);
    for(let s of arr)
      obj[s] = s;
    return Object.freeze(new Proxy(obj, enumHandler));
  }

  static fromObj(tmpl) {
    const obj = Object.create(null);
    for(let s in tmpl)
      obj[s] = tmpl[s];
    return Object.freeze(new Proxy(obj, enumHandler));
  }
}
