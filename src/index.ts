interface Initializer<T = any> {
    (item: T): any;
    priority: number;
  }
  
  const key = Symbol("configurable");
  
  function isPromiseLike(t: any): t is PromiseLike<any> {
    return t && typeof t.then === "function";
  }
  
  function configurations(target: any): Array<Initializer> {
    if (typeof target !== "function") {
      return configurations(target.constructor);
    }
  
    return target[key] || (target[key] = []);
  }
  
  export default function configurable(target: any, name: string) {
    Object.defineProperty(target, name, {
      configurable: true,
  
      get() {
        throw new Error(`Property "${name}" is not configured yed`);
      },
  
      set(value: any) {
        Object.defineProperty(this, name, { value });
      }
    });
  }
  
  function configure<T>(target: { new(...args: any): T; } | { instance: T; }, fn: (item: T) => any, priority?: number): void;
  function configure<T, K extends keyof T>(target: { new(...args: any): T; } | { instance: T; }, name: K, fn: (item: T) => T[K] | PromiseLike<T[K]>, priority?: number): void;
  function configure<T>(target: T): T | PromiseLike<T>;
  function configure(target: any): any {
    if (arguments.length === 1) {
      if (typeof target === "function") {
        throw new Error("Bad invokation, expected object instance");
      }
  
      if (target[key] !== undefined) {
        console.error("Configuration already invoked");
        return;
      }
  
      target[key] = 0;
      return callChain(target, configurations(target));
    }
  
    if (typeof arguments[1] === "function") {
      return configureClass(target, arguments[1], typeof arguments[2] === "number" ? arguments[2] : 1);
    }
  
    return configureProperty(target as { new(...args: any[]): any; }, arguments[1], arguments[2], typeof arguments[3] === "number" ? arguments[3] : 1);
  }
  
  function configureClass<T>(target: { new(...args: any[]): T; }, fn: (item: T) => any, priority: number = 1) {
    const initializer = fn as Initializer;
    initializer.priority = priority;
  
    const arr = configurations(target);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].priority > priority) {
        arr.splice(i, 0, initializer);
        return;
      }
    }
  
    arr.push(initializer);
  }
  
  function configureProperty<T, K extends keyof T>(target: { new(...args: any[]): T; }, name: K, fn: (item: T) => T[K] | PromiseLike<T[K]>, priority = 1) {
    configureClass(target, (item: T) => {
      const value: any = fn(item);
      if (isPromiseLike(value)) {
        return value.then(value => (item[name] = value));
      }
  
      item[name] = value;
    }, priority);
  }
  
  function callChain<T>(target: T, arr: Initializer<T>[], from = 0): T | PromiseLike<T> {
    for (let i = from; i < arr.length; i++) {
      const res = arr[i](target);
  
      if (isPromiseLike(res)) {
        from = i + 1;
        return res.then(() => callChain(target, arr, from));
      }
    }
  
    return target;
  }
  
  export { configure };