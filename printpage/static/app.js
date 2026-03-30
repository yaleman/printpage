"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all3) => {
    for (var name in all3)
      __defProp(target, name, { get: all3[name], enumerable: true });
  };

  // frontend/client/core/params.gen.ts
  var extraPrefixesMap = {
    $body_: "body",
    $headers_: "headers",
    $path_: "path",
    $query_: "query"
  };
  var extraPrefixes = Object.entries(extraPrefixesMap);

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/bind.js
  function bind(fn, thisArg) {
    return function wrap() {
      return fn.apply(thisArg, arguments);
    };
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/utils.js
  var { toString } = Object.prototype;
  var { getPrototypeOf } = Object;
  var { iterator, toStringTag } = Symbol;
  var kindOf = /* @__PURE__ */ ((cache) => (thing) => {
    const str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  })(/* @__PURE__ */ Object.create(null));
  var kindOfTest = (type) => {
    type = type.toLowerCase();
    return (thing) => kindOf(thing) === type;
  };
  var typeOfTest = (type) => (thing) => typeof thing === type;
  var { isArray } = Array;
  var isUndefined = typeOfTest("undefined");
  function isBuffer(val) {
    return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
  }
  var isArrayBuffer = kindOfTest("ArrayBuffer");
  function isArrayBufferView(val) {
    let result;
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
      result = ArrayBuffer.isView(val);
    } else {
      result = val && val.buffer && isArrayBuffer(val.buffer);
    }
    return result;
  }
  var isString = typeOfTest("string");
  var isFunction = typeOfTest("function");
  var isNumber = typeOfTest("number");
  var isObject = (thing) => thing !== null && typeof thing === "object";
  var isBoolean = (thing) => thing === true || thing === false;
  var isPlainObject = (val) => {
    if (kindOf(val) !== "object") {
      return false;
    }
    const prototype2 = getPrototypeOf(val);
    return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
  };
  var isEmptyObject = (val) => {
    if (!isObject(val) || isBuffer(val)) {
      return false;
    }
    try {
      return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
    } catch (e) {
      return false;
    }
  };
  var isDate = kindOfTest("Date");
  var isFile = kindOfTest("File");
  var isReactNativeBlob = (value) => {
    return !!(value && typeof value.uri !== "undefined");
  };
  var isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
  var isBlob = kindOfTest("Blob");
  var isFileList = kindOfTest("FileList");
  var isStream = (val) => isObject(val) && isFunction(val.pipe);
  function getGlobal() {
    if (typeof globalThis !== "undefined") return globalThis;
    if (typeof self !== "undefined") return self;
    if (typeof window !== "undefined") return window;
    if (typeof global !== "undefined") return global;
    return {};
  }
  var G = getGlobal();
  var FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : void 0;
  var isFormData = (thing) => {
    let kind;
    return thing && (FormDataCtor && thing instanceof FormDataCtor || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
    kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
  };
  var isURLSearchParams = kindOfTest("URLSearchParams");
  var [isReadableStream, isRequest, isResponse, isHeaders] = [
    "ReadableStream",
    "Request",
    "Response",
    "Headers"
  ].map(kindOfTest);
  var trim = (str) => {
    return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  };
  function forEach(obj, fn, { allOwnKeys = false } = {}) {
    if (obj === null || typeof obj === "undefined") {
      return;
    }
    let i;
    let l;
    if (typeof obj !== "object") {
      obj = [obj];
    }
    if (isArray(obj)) {
      for (i = 0, l = obj.length; i < l; i++) {
        fn.call(null, obj[i], i, obj);
      }
    } else {
      if (isBuffer(obj)) {
        return;
      }
      const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
      const len = keys.length;
      let key;
      for (i = 0; i < len; i++) {
        key = keys[i];
        fn.call(null, obj[key], key, obj);
      }
    }
  }
  function findKey(obj, key) {
    if (isBuffer(obj)) {
      return null;
    }
    key = key.toLowerCase();
    const keys = Object.keys(obj);
    let i = keys.length;
    let _key;
    while (i-- > 0) {
      _key = keys[i];
      if (key === _key.toLowerCase()) {
        return _key;
      }
    }
    return null;
  }
  var _global = (() => {
    if (typeof globalThis !== "undefined") return globalThis;
    return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
  })();
  var isContextDefined = (context) => !isUndefined(context) && context !== _global;
  function merge() {
    const { caseless, skipUndefined } = isContextDefined(this) && this || {};
    const result = {};
    const assignValue = (val, key) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return;
      }
      const targetKey = caseless && findKey(result, key) || key;
      if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
        result[targetKey] = merge(result[targetKey], val);
      } else if (isPlainObject(val)) {
        result[targetKey] = merge({}, val);
      } else if (isArray(val)) {
        result[targetKey] = val.slice();
      } else if (!skipUndefined || !isUndefined(val)) {
        result[targetKey] = val;
      }
    };
    for (let i = 0, l = arguments.length; i < l; i++) {
      arguments[i] && forEach(arguments[i], assignValue);
    }
    return result;
  }
  var extend = (a, b, thisArg, { allOwnKeys } = {}) => {
    forEach(
      b,
      (val, key) => {
        if (thisArg && isFunction(val)) {
          Object.defineProperty(a, key, {
            value: bind(val, thisArg),
            writable: true,
            enumerable: true,
            configurable: true
          });
        } else {
          Object.defineProperty(a, key, {
            value: val,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      },
      { allOwnKeys }
    );
    return a;
  };
  var stripBOM = (content) => {
    if (content.charCodeAt(0) === 65279) {
      content = content.slice(1);
    }
    return content;
  };
  var inherits = (constructor, superConstructor, props, descriptors) => {
    constructor.prototype = Object.create(superConstructor.prototype, descriptors);
    Object.defineProperty(constructor.prototype, "constructor", {
      value: constructor,
      writable: true,
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(constructor, "super", {
      value: superConstructor.prototype
    });
    props && Object.assign(constructor.prototype, props);
  };
  var toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
    let props;
    let i;
    let prop;
    const merged = {};
    destObj = destObj || {};
    if (sourceObj == null) return destObj;
    do {
      props = Object.getOwnPropertyNames(sourceObj);
      i = props.length;
      while (i-- > 0) {
        prop = props[i];
        if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
          destObj[prop] = sourceObj[prop];
          merged[prop] = true;
        }
      }
      sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
    } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
    return destObj;
  };
  var endsWith = (str, searchString, position) => {
    str = String(str);
    if (position === void 0 || position > str.length) {
      position = str.length;
    }
    position -= searchString.length;
    const lastIndex = str.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
  var toArray = (thing) => {
    if (!thing) return null;
    if (isArray(thing)) return thing;
    let i = thing.length;
    if (!isNumber(i)) return null;
    const arr = new Array(i);
    while (i-- > 0) {
      arr[i] = thing[i];
    }
    return arr;
  };
  var isTypedArray = /* @__PURE__ */ ((TypedArray) => {
    return (thing) => {
      return TypedArray && thing instanceof TypedArray;
    };
  })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
  var forEachEntry = (obj, fn) => {
    const generator = obj && obj[iterator];
    const _iterator = generator.call(obj);
    let result;
    while ((result = _iterator.next()) && !result.done) {
      const pair = result.value;
      fn.call(obj, pair[0], pair[1]);
    }
  };
  var matchAll = (regExp, str) => {
    let matches;
    const arr = [];
    while ((matches = regExp.exec(str)) !== null) {
      arr.push(matches);
    }
    return arr;
  };
  var isHTMLForm = kindOfTest("HTMLFormElement");
  var toCamelCase = (str) => {
    return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    });
  };
  var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
  var isRegExp = kindOfTest("RegExp");
  var reduceDescriptors = (obj, reducer) => {
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const reducedDescriptors = {};
    forEach(descriptors, (descriptor, name) => {
      let ret;
      if ((ret = reducer(descriptor, name, obj)) !== false) {
        reducedDescriptors[name] = ret || descriptor;
      }
    });
    Object.defineProperties(obj, reducedDescriptors);
  };
  var freezeMethods = (obj) => {
    reduceDescriptors(obj, (descriptor, name) => {
      if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
        return false;
      }
      const value = obj[name];
      if (!isFunction(value)) return;
      descriptor.enumerable = false;
      if ("writable" in descriptor) {
        descriptor.writable = false;
        return;
      }
      if (!descriptor.set) {
        descriptor.set = () => {
          throw Error("Can not rewrite read-only method '" + name + "'");
        };
      }
    });
  };
  var toObjectSet = (arrayOrString, delimiter) => {
    const obj = {};
    const define = (arr) => {
      arr.forEach((value) => {
        obj[value] = true;
      });
    };
    isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
    return obj;
  };
  var noop = () => {
  };
  var toFiniteNumber = (value, defaultValue) => {
    return value != null && Number.isFinite(value = +value) ? value : defaultValue;
  };
  function isSpecCompliantForm(thing) {
    return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
  }
  var toJSONObject = (obj) => {
    const stack = new Array(10);
    const visit = (source, i) => {
      if (isObject(source)) {
        if (stack.indexOf(source) >= 0) {
          return;
        }
        if (isBuffer(source)) {
          return source;
        }
        if (!("toJSON" in source)) {
          stack[i] = source;
          const target = isArray(source) ? [] : {};
          forEach(source, (value, key) => {
            const reducedValue = visit(value, i + 1);
            !isUndefined(reducedValue) && (target[key] = reducedValue);
          });
          stack[i] = void 0;
          return target;
        }
      }
      return source;
    };
    return visit(obj, 0);
  };
  var isAsyncFn = kindOfTest("AsyncFunction");
  var isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
  var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
    if (setImmediateSupported) {
      return setImmediate;
    }
    return postMessageSupported ? ((token, callbacks) => {
      _global.addEventListener(
        "message",
        ({ source, data }) => {
          if (source === _global && data === token) {
            callbacks.length && callbacks.shift()();
          }
        },
        false
      );
      return (cb) => {
        callbacks.push(cb);
        _global.postMessage(token, "*");
      };
    })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
  })(typeof setImmediate === "function", isFunction(_global.postMessage));
  var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
  var isIterable = (thing) => thing != null && isFunction(thing[iterator]);
  var utils_default = {
    isArray,
    isArrayBuffer,
    isBuffer,
    isFormData,
    isArrayBufferView,
    isString,
    isNumber,
    isBoolean,
    isObject,
    isPlainObject,
    isEmptyObject,
    isReadableStream,
    isRequest,
    isResponse,
    isHeaders,
    isUndefined,
    isDate,
    isFile,
    isReactNativeBlob,
    isReactNative,
    isBlob,
    isRegExp,
    isFunction,
    isStream,
    isURLSearchParams,
    isTypedArray,
    isFileList,
    forEach,
    merge,
    extend,
    trim,
    stripBOM,
    inherits,
    toFlatObject,
    kindOf,
    kindOfTest,
    endsWith,
    toArray,
    forEachEntry,
    matchAll,
    isHTMLForm,
    hasOwnProperty,
    hasOwnProp: hasOwnProperty,
    // an alias to avoid ESLint no-prototype-builtins detection
    reduceDescriptors,
    freezeMethods,
    toObjectSet,
    toCamelCase,
    noop,
    toFiniteNumber,
    findKey,
    global: _global,
    isContextDefined,
    isSpecCompliantForm,
    toJSONObject,
    isAsyncFn,
    isThenable,
    setImmediate: _setImmediate,
    asap,
    isIterable
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/AxiosError.js
  var AxiosError = class _AxiosError extends Error {
    static from(error, code, config, request, response, customProps) {
      const axiosError = new _AxiosError(error.message, code || error.code, config, request, response);
      axiosError.cause = error;
      axiosError.name = error.name;
      if (error.status != null && axiosError.status == null) {
        axiosError.status = error.status;
      }
      customProps && Object.assign(axiosError, customProps);
      return axiosError;
    }
    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [config] The config.
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     *
     * @returns {Error} The created error.
     */
    constructor(message, code, config, request, response) {
      super(message);
      Object.defineProperty(this, "message", {
        value: message,
        enumerable: true,
        writable: true,
        configurable: true
      });
      this.name = "AxiosError";
      this.isAxiosError = true;
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      if (response) {
        this.response = response;
        this.status = response.status;
      }
    }
    toJSON() {
      return {
        // Standard
        message: this.message,
        name: this.name,
        // Microsoft
        description: this.description,
        number: this.number,
        // Mozilla
        fileName: this.fileName,
        lineNumber: this.lineNumber,
        columnNumber: this.columnNumber,
        stack: this.stack,
        // Axios
        config: utils_default.toJSONObject(this.config),
        code: this.code,
        status: this.status
      };
    }
  };
  AxiosError.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
  AxiosError.ERR_BAD_OPTION = "ERR_BAD_OPTION";
  AxiosError.ECONNABORTED = "ECONNABORTED";
  AxiosError.ETIMEDOUT = "ETIMEDOUT";
  AxiosError.ERR_NETWORK = "ERR_NETWORK";
  AxiosError.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
  AxiosError.ERR_DEPRECATED = "ERR_DEPRECATED";
  AxiosError.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
  AxiosError.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
  AxiosError.ERR_CANCELED = "ERR_CANCELED";
  AxiosError.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
  AxiosError.ERR_INVALID_URL = "ERR_INVALID_URL";
  var AxiosError_default = AxiosError;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/null.js
  var null_default = null;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/toFormData.js
  function isVisitable(thing) {
    return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
  }
  function removeBrackets(key) {
    return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
  }
  function renderKey(path, key, dots) {
    if (!path) return key;
    return path.concat(key).map(function each(token, i) {
      token = removeBrackets(token);
      return !dots && i ? "[" + token + "]" : token;
    }).join(dots ? "." : "");
  }
  function isFlatArray(arr) {
    return utils_default.isArray(arr) && !arr.some(isVisitable);
  }
  var predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
    return /^is[A-Z]/.test(prop);
  });
  function toFormData(obj, formData, options) {
    if (!utils_default.isObject(obj)) {
      throw new TypeError("target must be an object");
    }
    formData = formData || new (null_default || FormData)();
    options = utils_default.toFlatObject(
      options,
      {
        metaTokens: true,
        dots: false,
        indexes: false
      },
      false,
      function defined(option, source) {
        return !utils_default.isUndefined(source[option]);
      }
    );
    const metaTokens = options.metaTokens;
    const visitor = options.visitor || defaultVisitor;
    const dots = options.dots;
    const indexes = options.indexes;
    const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
    const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
    if (!utils_default.isFunction(visitor)) {
      throw new TypeError("visitor must be a function");
    }
    function convertValue(value) {
      if (value === null) return "";
      if (utils_default.isDate(value)) {
        return value.toISOString();
      }
      if (utils_default.isBoolean(value)) {
        return value.toString();
      }
      if (!useBlob && utils_default.isBlob(value)) {
        throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
      }
      if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
        return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
      }
      return value;
    }
    function defaultVisitor(value, key, path) {
      let arr = value;
      if (utils_default.isReactNative(formData) && utils_default.isReactNativeBlob(value)) {
        formData.append(renderKey(path, key, dots), convertValue(value));
        return false;
      }
      if (value && !path && typeof value === "object") {
        if (utils_default.endsWith(key, "{}")) {
          key = metaTokens ? key : key.slice(0, -2);
          value = JSON.stringify(value);
        } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
          key = removeBrackets(key);
          arr.forEach(function each(el, index) {
            !(utils_default.isUndefined(el) || el === null) && formData.append(
              // eslint-disable-next-line no-nested-ternary
              indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
              convertValue(el)
            );
          });
          return false;
        }
      }
      if (isVisitable(value)) {
        return true;
      }
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }
    const stack = [];
    const exposedHelpers = Object.assign(predicates, {
      defaultVisitor,
      convertValue,
      isVisitable
    });
    function build(value, path) {
      if (utils_default.isUndefined(value)) return;
      if (stack.indexOf(value) !== -1) {
        throw Error("Circular reference detected in " + path.join("."));
      }
      stack.push(value);
      utils_default.forEach(value, function each(el, key) {
        const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(formData, el, utils_default.isString(key) ? key.trim() : key, path, exposedHelpers);
        if (result === true) {
          build(el, path ? path.concat(key) : [key]);
        }
      });
      stack.pop();
    }
    if (!utils_default.isObject(obj)) {
      throw new TypeError("data must be an object");
    }
    build(obj);
    return formData;
  }
  var toFormData_default = toFormData;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/AxiosURLSearchParams.js
  function encode(str) {
    const charMap = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\0"
    };
    return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
      return charMap[match];
    });
  }
  function AxiosURLSearchParams(params, options) {
    this._pairs = [];
    params && toFormData_default(params, this, options);
  }
  var prototype = AxiosURLSearchParams.prototype;
  prototype.append = function append(name, value) {
    this._pairs.push([name, value]);
  };
  prototype.toString = function toString2(encoder) {
    const _encode = encoder ? function(value) {
      return encoder.call(this, value, encode);
    } : encode;
    return this._pairs.map(function each(pair) {
      return _encode(pair[0]) + "=" + _encode(pair[1]);
    }, "").join("&");
  };
  var AxiosURLSearchParams_default = AxiosURLSearchParams;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/buildURL.js
  function encode2(val) {
    return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
  }
  function buildURL(url, params, options) {
    if (!params) {
      return url;
    }
    const _encode = options && options.encode || encode2;
    const _options = utils_default.isFunction(options) ? {
      serialize: options
    } : options;
    const serializeFn = _options && _options.serialize;
    let serializedParams;
    if (serializeFn) {
      serializedParams = serializeFn(params, _options);
    } else {
      serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, _options).toString(_encode);
    }
    if (serializedParams) {
      const hashmarkIndex = url.indexOf("#");
      if (hashmarkIndex !== -1) {
        url = url.slice(0, hashmarkIndex);
      }
      url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
    }
    return url;
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/InterceptorManager.js
  var InterceptorManager = class {
    constructor() {
      this.handlers = [];
    }
    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     * @param {Object} options The options for the interceptor, synchronous and runWhen
     *
     * @return {Number} An ID used to remove interceptor later
     */
    use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled,
        rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null
      });
      return this.handlers.length - 1;
    }
    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     *
     * @returns {void}
     */
    eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    }
    /**
     * Clear all interceptors from the stack
     *
     * @returns {void}
     */
    clear() {
      if (this.handlers) {
        this.handlers = [];
      }
    }
    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     *
     * @returns {void}
     */
    forEach(fn) {
      utils_default.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    }
  };
  var InterceptorManager_default = InterceptorManager;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/defaults/transitional.js
  var transitional_default = {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false,
    legacyInterceptorReqResOrdering: true
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/platform/browser/classes/URLSearchParams.js
  var URLSearchParams_default = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams_default;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/platform/browser/classes/FormData.js
  var FormData_default = typeof FormData !== "undefined" ? FormData : null;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/platform/browser/classes/Blob.js
  var Blob_default = typeof Blob !== "undefined" ? Blob : null;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/platform/browser/index.js
  var browser_default = {
    isBrowser: true,
    classes: {
      URLSearchParams: URLSearchParams_default,
      FormData: FormData_default,
      Blob: Blob_default
    },
    protocols: ["http", "https", "file", "blob", "url", "data"]
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/platform/common/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    hasBrowserEnv: () => hasBrowserEnv,
    hasStandardBrowserEnv: () => hasStandardBrowserEnv,
    hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
    navigator: () => _navigator,
    origin: () => origin
  });
  var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
  var _navigator = typeof navigator === "object" && navigator || void 0;
  var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
  var hasStandardBrowserWebWorkerEnv = (() => {
    return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
    self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
  })();
  var origin = hasBrowserEnv && window.location.href || "http://localhost";

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/platform/index.js
  var platform_default = {
    ...utils_exports,
    ...browser_default
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/toURLEncodedForm.js
  function toURLEncodedForm(data, options) {
    return toFormData_default(data, new platform_default.classes.URLSearchParams(), {
      visitor: function(value, key, path, helpers) {
        if (platform_default.isNode && utils_default.isBuffer(value)) {
          this.append(key, value.toString("base64"));
          return false;
        }
        return helpers.defaultVisitor.apply(this, arguments);
      },
      ...options
    });
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/formDataToJSON.js
  function parsePropPath(name) {
    return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
      return match[0] === "[]" ? "" : match[1] || match[0];
    });
  }
  function arrayToObject(arr) {
    const obj = {};
    const keys = Object.keys(arr);
    let i;
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      obj[key] = arr[key];
    }
    return obj;
  }
  function formDataToJSON(formData) {
    function buildPath(path, value, target, index) {
      let name = path[index++];
      if (name === "__proto__") return true;
      const isNumericKey = Number.isFinite(+name);
      const isLast = index >= path.length;
      name = !name && utils_default.isArray(target) ? target.length : name;
      if (isLast) {
        if (utils_default.hasOwnProp(target, name)) {
          target[name] = [target[name], value];
        } else {
          target[name] = value;
        }
        return !isNumericKey;
      }
      if (!target[name] || !utils_default.isObject(target[name])) {
        target[name] = [];
      }
      const result = buildPath(path, value, target[name], index);
      if (result && utils_default.isArray(target[name])) {
        target[name] = arrayToObject(target[name]);
      }
      return !isNumericKey;
    }
    if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
      const obj = {};
      utils_default.forEachEntry(formData, (name, value) => {
        buildPath(parsePropPath(name), value, obj, 0);
      });
      return obj;
    }
    return null;
  }
  var formDataToJSON_default = formDataToJSON;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/defaults/index.js
  function stringifySafely(rawValue, parser, encoder) {
    if (utils_default.isString(rawValue)) {
      try {
        (parser || JSON.parse)(rawValue);
        return utils_default.trim(rawValue);
      } catch (e) {
        if (e.name !== "SyntaxError") {
          throw e;
        }
      }
    }
    return (encoder || JSON.stringify)(rawValue);
  }
  var defaults = {
    transitional: transitional_default,
    adapter: ["xhr", "http", "fetch"],
    transformRequest: [
      function transformRequest(data, headers) {
        const contentType = headers.getContentType() || "";
        const hasJSONContentType = contentType.indexOf("application/json") > -1;
        const isObjectPayload = utils_default.isObject(data);
        if (isObjectPayload && utils_default.isHTMLForm(data)) {
          data = new FormData(data);
        }
        const isFormData2 = utils_default.isFormData(data);
        if (isFormData2) {
          return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
        }
        if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
          return data;
        }
        if (utils_default.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils_default.isURLSearchParams(data)) {
          headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
          return data.toString();
        }
        let isFileList2;
        if (isObjectPayload) {
          if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }
          if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
            const _FormData = this.env && this.env.FormData;
            return toFormData_default(
              isFileList2 ? { "files[]": data } : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }
        if (isObjectPayload || hasJSONContentType) {
          headers.setContentType("application/json", false);
          return stringifySafely(data);
        }
        return data;
      }
    ],
    transformResponse: [
      function transformResponse(data) {
        const transitional2 = this.transitional || defaults.transitional;
        const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
        const JSONRequested = this.responseType === "json";
        if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
          return data;
        }
        if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
          const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;
          try {
            return JSON.parse(data, this.parseReviver);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === "SyntaxError") {
                throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }
        return data;
      }
    ],
    /**
     * A timeout in milliseconds to abort a request. If set to 0 (default) a
     * timeout is not created.
     */
    timeout: 0,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {
      FormData: platform_default.classes.FormData,
      Blob: platform_default.classes.Blob
    },
    validateStatus: function validateStatus(status) {
      return status >= 200 && status < 300;
    },
    headers: {
      common: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": void 0
      }
    }
  };
  utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
    defaults.headers[method] = {};
  });
  var defaults_default = defaults;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/parseHeaders.js
  var ignoreDuplicateOf = utils_default.toObjectSet([
    "age",
    "authorization",
    "content-length",
    "content-type",
    "etag",
    "expires",
    "from",
    "host",
    "if-modified-since",
    "if-unmodified-since",
    "last-modified",
    "location",
    "max-forwards",
    "proxy-authorization",
    "referer",
    "retry-after",
    "user-agent"
  ]);
  var parseHeaders_default = (rawHeaders) => {
    const parsed = {};
    let key;
    let val;
    let i;
    rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
      i = line.indexOf(":");
      key = line.substring(0, i).trim().toLowerCase();
      val = line.substring(i + 1).trim();
      if (!key || parsed[key] && ignoreDuplicateOf[key]) {
        return;
      }
      if (key === "set-cookie") {
        if (parsed[key]) {
          parsed[key].push(val);
        } else {
          parsed[key] = [val];
        }
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
      }
    });
    return parsed;
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/AxiosHeaders.js
  var $internals = /* @__PURE__ */ Symbol("internals");
  function normalizeHeader(header) {
    return header && String(header).trim().toLowerCase();
  }
  function normalizeValue(value) {
    if (value === false || value == null) {
      return value;
    }
    return utils_default.isArray(value) ? value.map(normalizeValue) : String(value).replace(/[\r\n]+$/, "");
  }
  function parseTokens(str) {
    const tokens = /* @__PURE__ */ Object.create(null);
    const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
    let match;
    while (match = tokensRE.exec(str)) {
      tokens[match[1]] = match[2];
    }
    return tokens;
  }
  var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
  function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
    if (utils_default.isFunction(filter2)) {
      return filter2.call(this, value, header);
    }
    if (isHeaderNameFilter) {
      value = header;
    }
    if (!utils_default.isString(value)) return;
    if (utils_default.isString(filter2)) {
      return value.indexOf(filter2) !== -1;
    }
    if (utils_default.isRegExp(filter2)) {
      return filter2.test(value);
    }
  }
  function formatHeader(header) {
    return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
      return char.toUpperCase() + str;
    });
  }
  function buildAccessors(obj, header) {
    const accessorName = utils_default.toCamelCase(" " + header);
    ["get", "set", "has"].forEach((methodName) => {
      Object.defineProperty(obj, methodName + accessorName, {
        value: function(arg1, arg2, arg3) {
          return this[methodName].call(this, header, arg1, arg2, arg3);
        },
        configurable: true
      });
    });
  }
  var AxiosHeaders = class {
    constructor(headers) {
      headers && this.set(headers);
    }
    set(header, valueOrRewrite, rewrite) {
      const self2 = this;
      function setHeader(_value, _header, _rewrite) {
        const lHeader = normalizeHeader(_header);
        if (!lHeader) {
          throw new Error("header name must be a non-empty string");
        }
        const key = utils_default.findKey(self2, lHeader);
        if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
          self2[key || _header] = normalizeValue(_value);
        }
      }
      const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
      if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
        setHeaders(header, valueOrRewrite);
      } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
        setHeaders(parseHeaders_default(header), valueOrRewrite);
      } else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
        let obj = {}, dest, key;
        for (const entry of header) {
          if (!utils_default.isArray(entry)) {
            throw TypeError("Object iterator must return a key-value pair");
          }
          obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
        }
        setHeaders(obj, valueOrRewrite);
      } else {
        header != null && setHeader(valueOrRewrite, header, rewrite);
      }
      return this;
    }
    get(header, parser) {
      header = normalizeHeader(header);
      if (header) {
        const key = utils_default.findKey(this, header);
        if (key) {
          const value = this[key];
          if (!parser) {
            return value;
          }
          if (parser === true) {
            return parseTokens(value);
          }
          if (utils_default.isFunction(parser)) {
            return parser.call(this, value, key);
          }
          if (utils_default.isRegExp(parser)) {
            return parser.exec(value);
          }
          throw new TypeError("parser must be boolean|regexp|function");
        }
      }
    }
    has(header, matcher) {
      header = normalizeHeader(header);
      if (header) {
        const key = utils_default.findKey(this, header);
        return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
      }
      return false;
    }
    delete(header, matcher) {
      const self2 = this;
      let deleted = false;
      function deleteHeader(_header) {
        _header = normalizeHeader(_header);
        if (_header) {
          const key = utils_default.findKey(self2, _header);
          if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
            delete self2[key];
            deleted = true;
          }
        }
      }
      if (utils_default.isArray(header)) {
        header.forEach(deleteHeader);
      } else {
        deleteHeader(header);
      }
      return deleted;
    }
    clear(matcher) {
      const keys = Object.keys(this);
      let i = keys.length;
      let deleted = false;
      while (i--) {
        const key = keys[i];
        if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
          delete this[key];
          deleted = true;
        }
      }
      return deleted;
    }
    normalize(format) {
      const self2 = this;
      const headers = {};
      utils_default.forEach(this, (value, header) => {
        const key = utils_default.findKey(headers, header);
        if (key) {
          self2[key] = normalizeValue(value);
          delete self2[header];
          return;
        }
        const normalized = format ? formatHeader(header) : String(header).trim();
        if (normalized !== header) {
          delete self2[header];
        }
        self2[normalized] = normalizeValue(value);
        headers[normalized] = true;
      });
      return this;
    }
    concat(...targets) {
      return this.constructor.concat(this, ...targets);
    }
    toJSON(asStrings) {
      const obj = /* @__PURE__ */ Object.create(null);
      utils_default.forEach(this, (value, header) => {
        value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
      });
      return obj;
    }
    [Symbol.iterator]() {
      return Object.entries(this.toJSON())[Symbol.iterator]();
    }
    toString() {
      return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
    }
    getSetCookie() {
      return this.get("set-cookie") || [];
    }
    get [Symbol.toStringTag]() {
      return "AxiosHeaders";
    }
    static from(thing) {
      return thing instanceof this ? thing : new this(thing);
    }
    static concat(first, ...targets) {
      const computed = new this(first);
      targets.forEach((target) => computed.set(target));
      return computed;
    }
    static accessor(header) {
      const internals = this[$internals] = this[$internals] = {
        accessors: {}
      };
      const accessors = internals.accessors;
      const prototype2 = this.prototype;
      function defineAccessor(_header) {
        const lHeader = normalizeHeader(_header);
        if (!accessors[lHeader]) {
          buildAccessors(prototype2, _header);
          accessors[lHeader] = true;
        }
      }
      utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
      return this;
    }
  };
  AxiosHeaders.accessor([
    "Content-Type",
    "Content-Length",
    "Accept",
    "Accept-Encoding",
    "User-Agent",
    "Authorization"
  ]);
  utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
    let mapped = key[0].toUpperCase() + key.slice(1);
    return {
      get: () => value,
      set(headerValue) {
        this[mapped] = headerValue;
      }
    };
  });
  utils_default.freezeMethods(AxiosHeaders);
  var AxiosHeaders_default = AxiosHeaders;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/transformData.js
  function transformData(fns, response) {
    const config = this || defaults_default;
    const context = response || config;
    const headers = AxiosHeaders_default.from(context.headers);
    let data = context.data;
    utils_default.forEach(fns, function transform(fn) {
      data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
    });
    headers.normalize();
    return data;
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/cancel/isCancel.js
  function isCancel(value) {
    return !!(value && value.__CANCEL__);
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/cancel/CanceledError.js
  var CanceledError = class extends AxiosError_default {
    /**
     * A `CanceledError` is an object that is thrown when an operation is canceled.
     *
     * @param {string=} message The message.
     * @param {Object=} config The config.
     * @param {Object=} request The request.
     *
     * @returns {CanceledError} The created error.
     */
    constructor(message, config, request) {
      super(message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
      this.name = "CanceledError";
      this.__CANCEL__ = true;
    }
  };
  var CanceledError_default = CanceledError;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/settle.js
  function settle(resolve, reject, response) {
    const validateStatus2 = response.config.validateStatus;
    if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
      resolve(response);
    } else {
      reject(
        new AxiosError_default(
          "Request failed with status code " + response.status,
          [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
          response.config,
          response.request,
          response
        )
      );
    }
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/parseProtocol.js
  function parseProtocol(url) {
    const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
    return match && match[1] || "";
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/speedometer.js
  function speedometer(samplesCount, min) {
    samplesCount = samplesCount || 10;
    const bytes = new Array(samplesCount);
    const timestamps = new Array(samplesCount);
    let head = 0;
    let tail = 0;
    let firstSampleTS;
    min = min !== void 0 ? min : 1e3;
    return function push(chunkLength) {
      const now = Date.now();
      const startedAt = timestamps[tail];
      if (!firstSampleTS) {
        firstSampleTS = now;
      }
      bytes[head] = chunkLength;
      timestamps[head] = now;
      let i = tail;
      let bytesCount = 0;
      while (i !== head) {
        bytesCount += bytes[i++];
        i = i % samplesCount;
      }
      head = (head + 1) % samplesCount;
      if (head === tail) {
        tail = (tail + 1) % samplesCount;
      }
      if (now - firstSampleTS < min) {
        return;
      }
      const passed = startedAt && now - startedAt;
      return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
    };
  }
  var speedometer_default = speedometer;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/throttle.js
  function throttle(fn, freq) {
    let timestamp = 0;
    let threshold = 1e3 / freq;
    let lastArgs;
    let timer;
    const invoke = (args, now = Date.now()) => {
      timestamp = now;
      lastArgs = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fn(...args);
    };
    const throttled = (...args) => {
      const now = Date.now();
      const passed = now - timestamp;
      if (passed >= threshold) {
        invoke(args, now);
      } else {
        lastArgs = args;
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            invoke(lastArgs);
          }, threshold - passed);
        }
      }
    };
    const flush = () => lastArgs && invoke(lastArgs);
    return [throttled, flush];
  }
  var throttle_default = throttle;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/progressEventReducer.js
  var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
    let bytesNotified = 0;
    const _speedometer = speedometer_default(50, 250);
    return throttle_default((e) => {
      const loaded = e.loaded;
      const total = e.lengthComputable ? e.total : void 0;
      const progressBytes = loaded - bytesNotified;
      const rate = _speedometer(progressBytes);
      const inRange = loaded <= total;
      bytesNotified = loaded;
      const data = {
        loaded,
        total,
        progress: total ? loaded / total : void 0,
        bytes: progressBytes,
        rate: rate ? rate : void 0,
        estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
        event: e,
        lengthComputable: total != null,
        [isDownloadStream ? "download" : "upload"]: true
      };
      listener(data);
    }, freq);
  };
  var progressEventDecorator = (total, throttled) => {
    const lengthComputable = total != null;
    return [
      (loaded) => throttled[0]({
        lengthComputable,
        total,
        loaded
      }),
      throttled[1]
    ];
  };
  var asyncDecorator = (fn) => (...args) => utils_default.asap(() => fn(...args));

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/isURLSameOrigin.js
  var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url) => {
    url = new URL(url, platform_default.origin);
    return origin2.protocol === url.protocol && origin2.host === url.host && (isMSIE || origin2.port === url.port);
  })(
    new URL(platform_default.origin),
    platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)
  ) : () => true;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/cookies.js
  var cookies_default = platform_default.hasStandardBrowserEnv ? (
    // Standard browser envs support document.cookie
    {
      write(name, value, expires, path, domain, secure, sameSite) {
        if (typeof document === "undefined") return;
        const cookie = [`${name}=${encodeURIComponent(value)}`];
        if (utils_default.isNumber(expires)) {
          cookie.push(`expires=${new Date(expires).toUTCString()}`);
        }
        if (utils_default.isString(path)) {
          cookie.push(`path=${path}`);
        }
        if (utils_default.isString(domain)) {
          cookie.push(`domain=${domain}`);
        }
        if (secure === true) {
          cookie.push("secure");
        }
        if (utils_default.isString(sameSite)) {
          cookie.push(`SameSite=${sameSite}`);
        }
        document.cookie = cookie.join("; ");
      },
      read(name) {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
        return match ? decodeURIComponent(match[1]) : null;
      },
      remove(name) {
        this.write(name, "", Date.now() - 864e5, "/");
      }
    }
  ) : (
    // Non-standard browser env (web workers, react-native) lack needed support.
    {
      write() {
      },
      read() {
        return null;
      },
      remove() {
      }
    }
  );

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/isAbsoluteURL.js
  function isAbsoluteURL(url) {
    if (typeof url !== "string") {
      return false;
    }
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/combineURLs.js
  function combineURLs(baseURL, relativeURL) {
    return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/buildFullPath.js
  function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
    let isRelativeUrl = !isAbsoluteURL(requestedURL);
    if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
      return combineURLs(baseURL, requestedURL);
    }
    return requestedURL;
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/mergeConfig.js
  var headersToObject = (thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing;
  function mergeConfig(config1, config2) {
    config2 = config2 || {};
    const config = {};
    function getMergedValue(target, source, prop, caseless) {
      if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
        return utils_default.merge.call({ caseless }, target, source);
      } else if (utils_default.isPlainObject(source)) {
        return utils_default.merge({}, source);
      } else if (utils_default.isArray(source)) {
        return source.slice();
      }
      return source;
    }
    function mergeDeepProperties(a, b, prop, caseless) {
      if (!utils_default.isUndefined(b)) {
        return getMergedValue(a, b, prop, caseless);
      } else if (!utils_default.isUndefined(a)) {
        return getMergedValue(void 0, a, prop, caseless);
      }
    }
    function valueFromConfig2(a, b) {
      if (!utils_default.isUndefined(b)) {
        return getMergedValue(void 0, b);
      }
    }
    function defaultToConfig2(a, b) {
      if (!utils_default.isUndefined(b)) {
        return getMergedValue(void 0, b);
      } else if (!utils_default.isUndefined(a)) {
        return getMergedValue(void 0, a);
      }
    }
    function mergeDirectKeys(a, b, prop) {
      if (prop in config2) {
        return getMergedValue(a, b);
      } else if (prop in config1) {
        return getMergedValue(void 0, a);
      }
    }
    const mergeMap = {
      url: valueFromConfig2,
      method: valueFromConfig2,
      data: valueFromConfig2,
      baseURL: defaultToConfig2,
      transformRequest: defaultToConfig2,
      transformResponse: defaultToConfig2,
      paramsSerializer: defaultToConfig2,
      timeout: defaultToConfig2,
      timeoutMessage: defaultToConfig2,
      withCredentials: defaultToConfig2,
      withXSRFToken: defaultToConfig2,
      adapter: defaultToConfig2,
      responseType: defaultToConfig2,
      xsrfCookieName: defaultToConfig2,
      xsrfHeaderName: defaultToConfig2,
      onUploadProgress: defaultToConfig2,
      onDownloadProgress: defaultToConfig2,
      decompress: defaultToConfig2,
      maxContentLength: defaultToConfig2,
      maxBodyLength: defaultToConfig2,
      beforeRedirect: defaultToConfig2,
      transport: defaultToConfig2,
      httpAgent: defaultToConfig2,
      httpsAgent: defaultToConfig2,
      cancelToken: defaultToConfig2,
      socketPath: defaultToConfig2,
      responseEncoding: defaultToConfig2,
      validateStatus: mergeDirectKeys,
      headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
    };
    utils_default.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
      if (prop === "__proto__" || prop === "constructor" || prop === "prototype") return;
      const merge2 = utils_default.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
      const configValue = merge2(config1[prop], config2[prop], prop);
      utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
    });
    return config;
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/resolveConfig.js
  var resolveConfig_default = (config) => {
    const newConfig = mergeConfig({}, config);
    let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
    newConfig.headers = headers = AxiosHeaders_default.from(headers);
    newConfig.url = buildURL(
      buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls),
      config.params,
      config.paramsSerializer
    );
    if (auth) {
      headers.set(
        "Authorization",
        "Basic " + btoa(
          (auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : "")
        )
      );
    }
    if (utils_default.isFormData(data)) {
      if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
        headers.setContentType(void 0);
      } else if (utils_default.isFunction(data.getHeaders)) {
        const formHeaders = data.getHeaders();
        const allowedHeaders = ["content-type", "content-length"];
        Object.entries(formHeaders).forEach(([key, val]) => {
          if (allowedHeaders.includes(key.toLowerCase())) {
            headers.set(key, val);
          }
        });
      }
    }
    if (platform_default.hasStandardBrowserEnv) {
      withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
      if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
        const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
        if (xsrfValue) {
          headers.set(xsrfHeaderName, xsrfValue);
        }
      }
    }
    return newConfig;
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/adapters/xhr.js
  var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
  var xhr_default = isXHRAdapterSupported && function(config) {
    return new Promise(function dispatchXhrRequest(resolve, reject) {
      const _config = resolveConfig_default(config);
      let requestData = _config.data;
      const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
      let { responseType, onUploadProgress, onDownloadProgress } = _config;
      let onCanceled;
      let uploadThrottled, downloadThrottled;
      let flushUpload, flushDownload;
      function done() {
        flushUpload && flushUpload();
        flushDownload && flushDownload();
        _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
        _config.signal && _config.signal.removeEventListener("abort", onCanceled);
      }
      let request = new XMLHttpRequest();
      request.open(_config.method.toUpperCase(), _config.url, true);
      request.timeout = _config.timeout;
      function onloadend() {
        if (!request) {
          return;
        }
        const responseHeaders = AxiosHeaders_default.from(
          "getAllResponseHeaders" in request && request.getAllResponseHeaders()
        );
        const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
        const response = {
          data: responseData,
          status: request.status,
          statusText: request.statusText,
          headers: responseHeaders,
          config,
          request
        };
        settle(
          function _resolve(value) {
            resolve(value);
            done();
          },
          function _reject(err) {
            reject(err);
            done();
          },
          response
        );
        request = null;
      }
      if ("onloadend" in request) {
        request.onloadend = onloadend;
      } else {
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
            return;
          }
          setTimeout(onloadend);
        };
      }
      request.onabort = function handleAbort() {
        if (!request) {
          return;
        }
        reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
        request = null;
      };
      request.onerror = function handleError(event) {
        const msg = event && event.message ? event.message : "Network Error";
        const err = new AxiosError_default(msg, AxiosError_default.ERR_NETWORK, config, request);
        err.event = event || null;
        reject(err);
        request = null;
      };
      request.ontimeout = function handleTimeout() {
        let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
        const transitional2 = _config.transitional || transitional_default;
        if (_config.timeoutErrorMessage) {
          timeoutErrorMessage = _config.timeoutErrorMessage;
        }
        reject(
          new AxiosError_default(
            timeoutErrorMessage,
            transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
            config,
            request
          )
        );
        request = null;
      };
      requestData === void 0 && requestHeaders.setContentType(null);
      if ("setRequestHeader" in request) {
        utils_default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
          request.setRequestHeader(key, val);
        });
      }
      if (!utils_default.isUndefined(_config.withCredentials)) {
        request.withCredentials = !!_config.withCredentials;
      }
      if (responseType && responseType !== "json") {
        request.responseType = _config.responseType;
      }
      if (onDownloadProgress) {
        [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
        request.addEventListener("progress", downloadThrottled);
      }
      if (onUploadProgress && request.upload) {
        [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
        request.upload.addEventListener("progress", uploadThrottled);
        request.upload.addEventListener("loadend", flushUpload);
      }
      if (_config.cancelToken || _config.signal) {
        onCanceled = (cancel) => {
          if (!request) {
            return;
          }
          reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
          request.abort();
          request = null;
        };
        _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
        if (_config.signal) {
          _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
        }
      }
      const protocol = parseProtocol(_config.url);
      if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
        reject(
          new AxiosError_default(
            "Unsupported protocol " + protocol + ":",
            AxiosError_default.ERR_BAD_REQUEST,
            config
          )
        );
        return;
      }
      request.send(requestData || null);
    });
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/composeSignals.js
  var composeSignals = (signals, timeout) => {
    const { length } = signals = signals ? signals.filter(Boolean) : [];
    if (timeout || length) {
      let controller = new AbortController();
      let aborted;
      const onabort = function(reason) {
        if (!aborted) {
          aborted = true;
          unsubscribe();
          const err = reason instanceof Error ? reason : this.reason;
          controller.abort(
            err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err)
          );
        }
      };
      let timer = timeout && setTimeout(() => {
        timer = null;
        onabort(new AxiosError_default(`timeout of ${timeout}ms exceeded`, AxiosError_default.ETIMEDOUT));
      }, timeout);
      const unsubscribe = () => {
        if (signals) {
          timer && clearTimeout(timer);
          timer = null;
          signals.forEach((signal2) => {
            signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
          });
          signals = null;
        }
      };
      signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
      const { signal } = controller;
      signal.unsubscribe = () => utils_default.asap(unsubscribe);
      return signal;
    }
  };
  var composeSignals_default = composeSignals;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/trackStream.js
  var streamChunk = function* (chunk, chunkSize) {
    let len = chunk.byteLength;
    if (!chunkSize || len < chunkSize) {
      yield chunk;
      return;
    }
    let pos = 0;
    let end;
    while (pos < len) {
      end = pos + chunkSize;
      yield chunk.slice(pos, end);
      pos = end;
    }
  };
  var readBytes = async function* (iterable, chunkSize) {
    for await (const chunk of readStream(iterable)) {
      yield* streamChunk(chunk, chunkSize);
    }
  };
  var readStream = async function* (stream) {
    if (stream[Symbol.asyncIterator]) {
      yield* stream;
      return;
    }
    const reader = stream.getReader();
    try {
      for (; ; ) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        yield value;
      }
    } finally {
      await reader.cancel();
    }
  };
  var trackStream = (stream, chunkSize, onProgress, onFinish) => {
    const iterator2 = readBytes(stream, chunkSize);
    let bytes = 0;
    let done;
    let _onFinish = (e) => {
      if (!done) {
        done = true;
        onFinish && onFinish(e);
      }
    };
    return new ReadableStream(
      {
        async pull(controller) {
          try {
            const { done: done2, value } = await iterator2.next();
            if (done2) {
              _onFinish();
              controller.close();
              return;
            }
            let len = value.byteLength;
            if (onProgress) {
              let loadedBytes = bytes += len;
              onProgress(loadedBytes);
            }
            controller.enqueue(new Uint8Array(value));
          } catch (err) {
            _onFinish(err);
            throw err;
          }
        },
        cancel(reason) {
          _onFinish(reason);
          return iterator2.return();
        }
      },
      {
        highWaterMark: 2
      }
    );
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/adapters/fetch.js
  var DEFAULT_CHUNK_SIZE = 64 * 1024;
  var { isFunction: isFunction2 } = utils_default;
  var globalFetchAPI = (({ Request: Request2, Response }) => ({
    Request: Request2,
    Response
  }))(utils_default.global);
  var { ReadableStream: ReadableStream2, TextEncoder } = utils_default.global;
  var test = (fn, ...args) => {
    try {
      return !!fn(...args);
    } catch (e) {
      return false;
    }
  };
  var factory = (env) => {
    env = utils_default.merge.call(
      {
        skipUndefined: true
      },
      globalFetchAPI,
      env
    );
    const { fetch: envFetch, Request: Request2, Response } = env;
    const isFetchSupported = envFetch ? isFunction2(envFetch) : typeof fetch === "function";
    const isRequestSupported = isFunction2(Request2);
    const isResponseSupported = isFunction2(Response);
    if (!isFetchSupported) {
      return false;
    }
    const isReadableStreamSupported = isFetchSupported && isFunction2(ReadableStream2);
    const encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Request2(str).arrayBuffer()));
    const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
      let duplexAccessed = false;
      const body = new ReadableStream2();
      const hasContentType = new Request2(platform_default.origin, {
        body,
        method: "POST",
        get duplex() {
          duplexAccessed = true;
          return "half";
        }
      }).headers.has("Content-Type");
      body.cancel();
      return duplexAccessed && !hasContentType;
    });
    const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
    const resolvers = {
      stream: supportsResponseStream && ((res) => res.body)
    };
    isFetchSupported && (() => {
      ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
        !resolvers[type] && (resolvers[type] = (res, config) => {
          let method = res && res[type];
          if (method) {
            return method.call(res);
          }
          throw new AxiosError_default(
            `Response type '${type}' is not supported`,
            AxiosError_default.ERR_NOT_SUPPORT,
            config
          );
        });
      });
    })();
    const getBodyLength = async (body) => {
      if (body == null) {
        return 0;
      }
      if (utils_default.isBlob(body)) {
        return body.size;
      }
      if (utils_default.isSpecCompliantForm(body)) {
        const _request = new Request2(platform_default.origin, {
          method: "POST",
          body
        });
        return (await _request.arrayBuffer()).byteLength;
      }
      if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
        return body.byteLength;
      }
      if (utils_default.isURLSearchParams(body)) {
        body = body + "";
      }
      if (utils_default.isString(body)) {
        return (await encodeText(body)).byteLength;
      }
    };
    const resolveBodyLength = async (headers, body) => {
      const length = utils_default.toFiniteNumber(headers.getContentLength());
      return length == null ? getBodyLength(body) : length;
    };
    return async (config) => {
      let {
        url,
        method,
        data,
        signal,
        cancelToken,
        timeout,
        onDownloadProgress,
        onUploadProgress,
        responseType,
        headers,
        withCredentials = "same-origin",
        fetchOptions
      } = resolveConfig_default(config);
      let _fetch = envFetch || fetch;
      responseType = responseType ? (responseType + "").toLowerCase() : "text";
      let composedSignal = composeSignals_default(
        [signal, cancelToken && cancelToken.toAbortSignal()],
        timeout
      );
      let request = null;
      const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
        composedSignal.unsubscribe();
      });
      let requestContentLength;
      try {
        if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
          let _request = new Request2(url, {
            method: "POST",
            body: data,
            duplex: "half"
          });
          let contentTypeHeader;
          if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
            headers.setContentType(contentTypeHeader);
          }
          if (_request.body) {
            const [onProgress, flush] = progressEventDecorator(
              requestContentLength,
              progressEventReducer(asyncDecorator(onUploadProgress))
            );
            data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
          }
        }
        if (!utils_default.isString(withCredentials)) {
          withCredentials = withCredentials ? "include" : "omit";
        }
        const isCredentialsSupported = isRequestSupported && "credentials" in Request2.prototype;
        const resolvedOptions = {
          ...fetchOptions,
          signal: composedSignal,
          method: method.toUpperCase(),
          headers: headers.normalize().toJSON(),
          body: data,
          duplex: "half",
          credentials: isCredentialsSupported ? withCredentials : void 0
        };
        request = isRequestSupported && new Request2(url, resolvedOptions);
        let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url, resolvedOptions));
        const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
        if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
          const options = {};
          ["status", "statusText", "headers"].forEach((prop) => {
            options[prop] = response[prop];
          });
          const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
          const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
            responseContentLength,
            progressEventReducer(asyncDecorator(onDownloadProgress), true)
          ) || [];
          response = new Response(
            trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
              flush && flush();
              unsubscribe && unsubscribe();
            }),
            options
          );
        }
        responseType = responseType || "text";
        let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](
          response,
          config
        );
        !isStreamResponse && unsubscribe && unsubscribe();
        return await new Promise((resolve, reject) => {
          settle(resolve, reject, {
            data: responseData,
            headers: AxiosHeaders_default.from(response.headers),
            status: response.status,
            statusText: response.statusText,
            config,
            request
          });
        });
      } catch (err) {
        unsubscribe && unsubscribe();
        if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
          throw Object.assign(
            new AxiosError_default(
              "Network Error",
              AxiosError_default.ERR_NETWORK,
              config,
              request,
              err && err.response
            ),
            {
              cause: err.cause || err
            }
          );
        }
        throw AxiosError_default.from(err, err && err.code, config, request, err && err.response);
      }
    };
  };
  var seedCache = /* @__PURE__ */ new Map();
  var getFetch = (config) => {
    let env = config && config.env || {};
    const { fetch: fetch2, Request: Request2, Response } = env;
    const seeds = [Request2, Response, fetch2];
    let len = seeds.length, i = len, seed, target, map = seedCache;
    while (i--) {
      seed = seeds[i];
      target = map.get(seed);
      target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
      map = target;
    }
    return target;
  };
  var adapter = getFetch();

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/adapters/adapters.js
  var knownAdapters = {
    http: null_default,
    xhr: xhr_default,
    fetch: {
      get: getFetch
    }
  };
  utils_default.forEach(knownAdapters, (fn, value) => {
    if (fn) {
      try {
        Object.defineProperty(fn, "name", { value });
      } catch (e) {
      }
      Object.defineProperty(fn, "adapterName", { value });
    }
  });
  var renderReason = (reason) => `- ${reason}`;
  var isResolvedHandle = (adapter2) => utils_default.isFunction(adapter2) || adapter2 === null || adapter2 === false;
  function getAdapter(adapters, config) {
    adapters = utils_default.isArray(adapters) ? adapters : [adapters];
    const { length } = adapters;
    let nameOrAdapter;
    let adapter2;
    const rejectedReasons = {};
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      let id;
      adapter2 = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter2 = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter2 === void 0) {
          throw new AxiosError_default(`Unknown adapter '${id}'`);
        }
      }
      if (adapter2 && (utils_default.isFunction(adapter2) || (adapter2 = adapter2.get(config)))) {
        break;
      }
      rejectedReasons[id || "#" + i] = adapter2;
    }
    if (!adapter2) {
      const reasons = Object.entries(rejectedReasons).map(
        ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
      );
      let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
      throw new AxiosError_default(
        `There is no suitable adapter to dispatch the request ` + s,
        "ERR_NOT_SUPPORT"
      );
    }
    return adapter2;
  }
  var adapters_default = {
    /**
     * Resolve an adapter from a list of adapter names or functions.
     * @type {Function}
     */
    getAdapter,
    /**
     * Exposes all known adapters
     * @type {Object<string, Function|Object>}
     */
    adapters: knownAdapters
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/dispatchRequest.js
  function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
      config.cancelToken.throwIfRequested();
    }
    if (config.signal && config.signal.aborted) {
      throw new CanceledError_default(null, config);
    }
  }
  function dispatchRequest(config) {
    throwIfCancellationRequested(config);
    config.headers = AxiosHeaders_default.from(config.headers);
    config.data = transformData.call(config, config.transformRequest);
    if (["post", "put", "patch"].indexOf(config.method) !== -1) {
      config.headers.setContentType("application/x-www-form-urlencoded", false);
    }
    const adapter2 = adapters_default.getAdapter(config.adapter || defaults_default.adapter, config);
    return adapter2(config).then(
      function onAdapterResolution(response) {
        throwIfCancellationRequested(config);
        response.data = transformData.call(config, config.transformResponse, response);
        response.headers = AxiosHeaders_default.from(response.headers);
        return response;
      },
      function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
          }
        }
        return Promise.reject(reason);
      }
    );
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/env/data.js
  var VERSION = "1.14.0";

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/validator.js
  var validators = {};
  ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
    validators[type] = function validator(thing) {
      return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
    };
  });
  var deprecatedWarnings = {};
  validators.transitional = function transitional(validator, version, message) {
    function formatMessage(opt, desc) {
      return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
    }
    return (value, opt, opts) => {
      if (validator === false) {
        throw new AxiosError_default(
          formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
          AxiosError_default.ERR_DEPRECATED
        );
      }
      if (version && !deprecatedWarnings[opt]) {
        deprecatedWarnings[opt] = true;
        console.warn(
          formatMessage(
            opt,
            " has been deprecated since v" + version + " and will be removed in the near future"
          )
        );
      }
      return validator ? validator(value, opt, opts) : true;
    };
  };
  validators.spelling = function spelling(correctSpelling) {
    return (value, opt) => {
      console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
      return true;
    };
  };
  function assertOptions(options, schema, allowUnknown) {
    if (typeof options !== "object") {
      throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
    }
    const keys = Object.keys(options);
    let i = keys.length;
    while (i-- > 0) {
      const opt = keys[i];
      const validator = schema[opt];
      if (validator) {
        const value = options[opt];
        const result = value === void 0 || validator(value, opt, options);
        if (result !== true) {
          throw new AxiosError_default(
            "option " + opt + " must be " + result,
            AxiosError_default.ERR_BAD_OPTION_VALUE
          );
        }
        continue;
      }
      if (allowUnknown !== true) {
        throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
      }
    }
  }
  var validator_default = {
    assertOptions,
    validators
  };

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/core/Axios.js
  var validators2 = validator_default.validators;
  var Axios = class {
    constructor(instanceConfig) {
      this.defaults = instanceConfig || {};
      this.interceptors = {
        request: new InterceptorManager_default(),
        response: new InterceptorManager_default()
      };
    }
    /**
     * Dispatch a request
     *
     * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
     * @param {?Object} config
     *
     * @returns {Promise} The Promise to be fulfilled
     */
    async request(configOrUrl, config) {
      try {
        return await this._request(configOrUrl, config);
      } catch (err) {
        if (err instanceof Error) {
          let dummy = {};
          Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
          const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
          try {
            if (!err.stack) {
              err.stack = stack;
            } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
              err.stack += "\n" + stack;
            }
          } catch (e) {
          }
        }
        throw err;
      }
    }
    _request(configOrUrl, config) {
      if (typeof configOrUrl === "string") {
        config = config || {};
        config.url = configOrUrl;
      } else {
        config = configOrUrl || {};
      }
      config = mergeConfig(this.defaults, config);
      const { transitional: transitional2, paramsSerializer, headers } = config;
      if (transitional2 !== void 0) {
        validator_default.assertOptions(
          transitional2,
          {
            silentJSONParsing: validators2.transitional(validators2.boolean),
            forcedJSONParsing: validators2.transitional(validators2.boolean),
            clarifyTimeoutError: validators2.transitional(validators2.boolean),
            legacyInterceptorReqResOrdering: validators2.transitional(validators2.boolean)
          },
          false
        );
      }
      if (paramsSerializer != null) {
        if (utils_default.isFunction(paramsSerializer)) {
          config.paramsSerializer = {
            serialize: paramsSerializer
          };
        } else {
          validator_default.assertOptions(
            paramsSerializer,
            {
              encode: validators2.function,
              serialize: validators2.function
            },
            true
          );
        }
      }
      if (config.allowAbsoluteUrls !== void 0) {
      } else if (this.defaults.allowAbsoluteUrls !== void 0) {
        config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
      } else {
        config.allowAbsoluteUrls = true;
      }
      validator_default.assertOptions(
        config,
        {
          baseUrl: validators2.spelling("baseURL"),
          withXsrfToken: validators2.spelling("withXSRFToken")
        },
        true
      );
      config.method = (config.method || this.defaults.method || "get").toLowerCase();
      let contextHeaders = headers && utils_default.merge(headers.common, headers[config.method]);
      headers && utils_default.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (method) => {
        delete headers[method];
      });
      config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
      const requestInterceptorChain = [];
      let synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
          return;
        }
        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
        const transitional3 = config.transitional || transitional_default;
        const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
        if (legacyInterceptorReqResOrdering) {
          requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
        } else {
          requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        }
      });
      const responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      });
      let promise;
      let i = 0;
      let len;
      if (!synchronousRequestInterceptors) {
        const chain = [dispatchRequest.bind(this), void 0];
        chain.unshift(...requestInterceptorChain);
        chain.push(...responseInterceptorChain);
        len = chain.length;
        promise = Promise.resolve(config);
        while (i < len) {
          promise = promise.then(chain[i++], chain[i++]);
        }
        return promise;
      }
      len = requestInterceptorChain.length;
      let newConfig = config;
      while (i < len) {
        const onFulfilled = requestInterceptorChain[i++];
        const onRejected = requestInterceptorChain[i++];
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected.call(this, error);
          break;
        }
      }
      try {
        promise = dispatchRequest.call(this, newConfig);
      } catch (error) {
        return Promise.reject(error);
      }
      i = 0;
      len = responseInterceptorChain.length;
      while (i < len) {
        promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
      }
      return promise;
    }
    getUri(config) {
      config = mergeConfig(this.defaults, config);
      const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
      return buildURL(fullPath, config.params, config.paramsSerializer);
    }
  };
  utils_default.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
    Axios.prototype[method] = function(url, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data
        })
      );
    };
  });
  utils_default.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
    function generateHTTPMethod(isForm) {
      return function httpMethod(url, data, config) {
        return this.request(
          mergeConfig(config || {}, {
            method,
            headers: isForm ? {
              "Content-Type": "multipart/form-data"
            } : {},
            url,
            data
          })
        );
      };
    }
    Axios.prototype[method] = generateHTTPMethod();
    Axios.prototype[method + "Form"] = generateHTTPMethod(true);
  });
  var Axios_default = Axios;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/cancel/CancelToken.js
  var CancelToken = class _CancelToken {
    constructor(executor) {
      if (typeof executor !== "function") {
        throw new TypeError("executor must be a function.");
      }
      let resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });
      const token = this;
      this.promise.then((cancel) => {
        if (!token._listeners) return;
        let i = token._listeners.length;
        while (i-- > 0) {
          token._listeners[i](cancel);
        }
        token._listeners = null;
      });
      this.promise.then = (onfulfilled) => {
        let _resolve;
        const promise = new Promise((resolve) => {
          token.subscribe(resolve);
          _resolve = resolve;
        }).then(onfulfilled);
        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };
        return promise;
      };
      executor(function cancel(message, config, request) {
        if (token.reason) {
          return;
        }
        token.reason = new CanceledError_default(message, config, request);
        resolvePromise(token.reason);
      });
    }
    /**
     * Throws a `CanceledError` if cancellation has been requested.
     */
    throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    }
    /**
     * Subscribe to the cancel signal
     */
    subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }
      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    }
    /**
     * Unsubscribe from the cancel signal
     */
    unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      const index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    }
    toAbortSignal() {
      const controller = new AbortController();
      const abort = (err) => {
        controller.abort(err);
      };
      this.subscribe(abort);
      controller.signal.unsubscribe = () => this.unsubscribe(abort);
      return controller.signal;
    }
    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    static source() {
      let cancel;
      const token = new _CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token,
        cancel
      };
    }
  };
  var CancelToken_default = CancelToken;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/spread.js
  function spread(callback) {
    return function wrap(arr) {
      return callback.apply(null, arr);
    };
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/isAxiosError.js
  function isAxiosError(payload) {
    return utils_default.isObject(payload) && payload.isAxiosError === true;
  }

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/helpers/HttpStatusCode.js
  var HttpStatusCode = {
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    ImUsed: 226,
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    UseProxy: 305,
    Unused: 306,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableEntity: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511,
    WebServerIsDown: 521,
    ConnectionTimedOut: 522,
    OriginIsUnreachable: 523,
    TimeoutOccurred: 524,
    SslHandshakeFailed: 525,
    InvalidSslCertificate: 526
  };
  Object.entries(HttpStatusCode).forEach(([key, value]) => {
    HttpStatusCode[value] = key;
  });
  var HttpStatusCode_default = HttpStatusCode;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/lib/axios.js
  function createInstance(defaultConfig) {
    const context = new Axios_default(defaultConfig);
    const instance = bind(Axios_default.prototype.request, context);
    utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
    utils_default.extend(instance, context, null, { allOwnKeys: true });
    instance.create = function create(instanceConfig) {
      return createInstance(mergeConfig(defaultConfig, instanceConfig));
    };
    return instance;
  }
  var axios = createInstance(defaults_default);
  axios.Axios = Axios_default;
  axios.CanceledError = CanceledError_default;
  axios.CancelToken = CancelToken_default;
  axios.isCancel = isCancel;
  axios.VERSION = VERSION;
  axios.toFormData = toFormData_default;
  axios.AxiosError = AxiosError_default;
  axios.Cancel = axios.CanceledError;
  axios.all = function all(promises) {
    return Promise.all(promises);
  };
  axios.spread = spread;
  axios.isAxiosError = isAxiosError;
  axios.mergeConfig = mergeConfig;
  axios.AxiosHeaders = AxiosHeaders_default;
  axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
  axios.getAdapter = adapters_default.getAdapter;
  axios.HttpStatusCode = HttpStatusCode_default;
  axios.default = axios;
  var axios_default = axios;

  // node_modules/.pnpm/axios@1.14.0/node_modules/axios/index.js
  var {
    Axios: Axios2,
    AxiosError: AxiosError2,
    CanceledError: CanceledError2,
    isCancel: isCancel2,
    CancelToken: CancelToken2,
    VERSION: VERSION2,
    all: all2,
    Cancel,
    isAxiosError: isAxiosError2,
    spread: spread2,
    toFormData: toFormData2,
    AxiosHeaders: AxiosHeaders2,
    HttpStatusCode: HttpStatusCode2,
    formToJSON,
    getAdapter: getAdapter2,
    mergeConfig: mergeConfig2
  } = axios_default;

  // frontend/client/core/serverSentEvents.gen.ts
  var createSseClient = ({
    onRequest,
    onSseError,
    onSseEvent,
    responseTransformer,
    responseValidator,
    sseDefaultRetryDelay,
    sseMaxRetryAttempts,
    sseMaxRetryDelay,
    sseSleepFn,
    url,
    ...options
  }) => {
    let lastEventId;
    const sleep = sseSleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const createStream = async function* () {
      let retryDelay = sseDefaultRetryDelay ?? 3e3;
      let attempt = 0;
      const signal = options.signal ?? new AbortController().signal;
      while (true) {
        if (signal.aborted) break;
        attempt++;
        const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
        if (lastEventId !== void 0) {
          headers.set("Last-Event-ID", lastEventId);
        }
        try {
          const requestInit = {
            redirect: "follow",
            ...options,
            body: options.serializedBody,
            headers,
            signal
          };
          let request = new Request(url, requestInit);
          if (onRequest) {
            request = await onRequest(url, requestInit);
          }
          const _fetch = options.fetch ?? globalThis.fetch;
          const response = await _fetch(request);
          if (!response.ok) throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
          if (!response.body) throw new Error("No body in SSE response");
          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
          let buffer = "";
          const abortHandler = () => {
            try {
              reader.cancel();
            } catch {
            }
          };
          signal.addEventListener("abort", abortHandler);
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += value;
              buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
              const chunks = buffer.split("\n\n");
              buffer = chunks.pop() ?? "";
              for (const chunk of chunks) {
                const lines = chunk.split("\n");
                const dataLines = [];
                let eventName;
                for (const line of lines) {
                  if (line.startsWith("data:")) {
                    dataLines.push(line.replace(/^data:\s*/, ""));
                  } else if (line.startsWith("event:")) {
                    eventName = line.replace(/^event:\s*/, "");
                  } else if (line.startsWith("id:")) {
                    lastEventId = line.replace(/^id:\s*/, "");
                  } else if (line.startsWith("retry:")) {
                    const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                    if (!Number.isNaN(parsed)) {
                      retryDelay = parsed;
                    }
                  }
                }
                let data;
                let parsedJson = false;
                if (dataLines.length) {
                  const rawData = dataLines.join("\n");
                  try {
                    data = JSON.parse(rawData);
                    parsedJson = true;
                  } catch {
                    data = rawData;
                  }
                }
                if (parsedJson) {
                  if (responseValidator) {
                    await responseValidator(data);
                  }
                  if (responseTransformer) {
                    data = await responseTransformer(data);
                  }
                }
                onSseEvent?.({
                  data,
                  event: eventName,
                  id: lastEventId,
                  retry: retryDelay
                });
                if (dataLines.length) {
                  yield data;
                }
              }
            }
          } finally {
            signal.removeEventListener("abort", abortHandler);
            reader.releaseLock();
          }
          break;
        } catch (error) {
          onSseError?.(error);
          if (sseMaxRetryAttempts !== void 0 && attempt >= sseMaxRetryAttempts) {
            break;
          }
          const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 3e4);
          await sleep(backoff);
        }
      }
    };
    const stream = createStream();
    return { stream };
  };

  // frontend/client/core/pathSerializer.gen.ts
  var separatorArrayExplode = (style) => {
    switch (style) {
      case "label":
        return ".";
      case "matrix":
        return ";";
      case "simple":
        return ",";
      default:
        return "&";
    }
  };
  var separatorArrayNoExplode = (style) => {
    switch (style) {
      case "form":
        return ",";
      case "pipeDelimited":
        return "|";
      case "spaceDelimited":
        return "%20";
      default:
        return ",";
    }
  };
  var separatorObjectExplode = (style) => {
    switch (style) {
      case "label":
        return ".";
      case "matrix":
        return ";";
      case "simple":
        return ",";
      default:
        return "&";
    }
  };
  var serializeArrayParam = ({
    allowReserved,
    explode,
    name,
    style,
    value
  }) => {
    if (!explode) {
      const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
      switch (style) {
        case "label":
          return `.${joinedValues2}`;
        case "matrix":
          return `;${name}=${joinedValues2}`;
        case "simple":
          return joinedValues2;
        default:
          return `${name}=${joinedValues2}`;
      }
    }
    const separator = separatorArrayExplode(style);
    const joinedValues = value.map((v) => {
      if (style === "label" || style === "simple") {
        return allowReserved ? v : encodeURIComponent(v);
      }
      return serializePrimitiveParam({
        allowReserved,
        name,
        value: v
      });
    }).join(separator);
    return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
  };
  var serializePrimitiveParam = ({
    allowReserved,
    name,
    value
  }) => {
    if (value === void 0 || value === null) {
      return "";
    }
    if (typeof value === "object") {
      throw new Error(
        "Deeply-nested arrays/objects aren\u2019t supported. Provide your own `querySerializer()` to handle these."
      );
    }
    return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
  };
  var serializeObjectParam = ({
    allowReserved,
    explode,
    name,
    style,
    value,
    valueOnly
  }) => {
    if (value instanceof Date) {
      return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
    }
    if (style !== "deepObject" && !explode) {
      let values = [];
      Object.entries(value).forEach(([key, v]) => {
        values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
      });
      const joinedValues2 = values.join(",");
      switch (style) {
        case "form":
          return `${name}=${joinedValues2}`;
        case "label":
          return `.${joinedValues2}`;
        case "matrix":
          return `;${name}=${joinedValues2}`;
        default:
          return joinedValues2;
      }
    }
    const separator = separatorObjectExplode(style);
    const joinedValues = Object.entries(value).map(
      ([key, v]) => serializePrimitiveParam({
        allowReserved,
        name: style === "deepObject" ? `${name}[${key}]` : key,
        value: v
      })
    ).join(separator);
    return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
  };

  // frontend/client/core/utils.gen.ts
  var PATH_PARAM_RE = /\{[^{}]+\}/g;
  var defaultPathSerializer = ({ path, url: _url }) => {
    let url = _url;
    const matches = _url.match(PATH_PARAM_RE);
    if (matches) {
      for (const match of matches) {
        let explode = false;
        let name = match.substring(1, match.length - 1);
        let style = "simple";
        if (name.endsWith("*")) {
          explode = true;
          name = name.substring(0, name.length - 1);
        }
        if (name.startsWith(".")) {
          name = name.substring(1);
          style = "label";
        } else if (name.startsWith(";")) {
          name = name.substring(1);
          style = "matrix";
        }
        const value = path[name];
        if (value === void 0 || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
          continue;
        }
        if (typeof value === "object") {
          url = url.replace(
            match,
            serializeObjectParam({
              explode,
              name,
              style,
              value,
              valueOnly: true
            })
          );
          continue;
        }
        if (style === "matrix") {
          url = url.replace(
            match,
            `;${serializePrimitiveParam({
              name,
              value
            })}`
          );
          continue;
        }
        const replaceValue = encodeURIComponent(
          style === "label" ? `.${value}` : value
        );
        url = url.replace(match, replaceValue);
      }
    }
    return url;
  };
  var getUrl = ({
    baseUrl,
    path,
    query,
    querySerializer,
    url: _url
  }) => {
    const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
    let url = (baseUrl ?? "") + pathUrl;
    if (path) {
      url = defaultPathSerializer({ path, url });
    }
    let search = query ? querySerializer(query) : "";
    if (search.startsWith("?")) {
      search = search.substring(1);
    }
    if (search) {
      url += `?${search}`;
    }
    return url;
  };
  function getValidRequestBody(options) {
    const hasBody = options.body !== void 0;
    const isSerializedBody = hasBody && options.bodySerializer;
    if (isSerializedBody) {
      if ("serializedBody" in options) {
        const hasSerializedBody = options.serializedBody !== void 0 && options.serializedBody !== "";
        return hasSerializedBody ? options.serializedBody : null;
      }
      return options.body !== "" ? options.body : null;
    }
    if (hasBody) {
      return options.body;
    }
    return void 0;
  }

  // frontend/client/core/auth.gen.ts
  var getAuthToken = async (auth, callback) => {
    const token = typeof callback === "function" ? await callback(auth) : callback;
    if (!token) {
      return;
    }
    if (auth.scheme === "bearer") {
      return `Bearer ${token}`;
    }
    if (auth.scheme === "basic") {
      return `Basic ${btoa(token)}`;
    }
    return token;
  };

  // frontend/client/client/utils.gen.ts
  var createQuerySerializer = ({
    parameters = {},
    ...args
  } = {}) => {
    const querySerializer = (queryParams) => {
      const search = [];
      if (queryParams && typeof queryParams === "object") {
        for (const name in queryParams) {
          const value = queryParams[name];
          if (value === void 0 || value === null) {
            continue;
          }
          const options = parameters[name] || args;
          if (Array.isArray(value)) {
            const serializedArray = serializeArrayParam({
              allowReserved: options.allowReserved,
              explode: true,
              name,
              style: "form",
              value,
              ...options.array
            });
            if (serializedArray) search.push(serializedArray);
          } else if (typeof value === "object") {
            const serializedObject = serializeObjectParam({
              allowReserved: options.allowReserved,
              explode: true,
              name,
              style: "deepObject",
              value,
              ...options.object
            });
            if (serializedObject) search.push(serializedObject);
          } else {
            const serializedPrimitive = serializePrimitiveParam({
              allowReserved: options.allowReserved,
              name,
              value
            });
            if (serializedPrimitive) search.push(serializedPrimitive);
          }
        }
      }
      return search.join("&");
    };
    return querySerializer;
  };
  var checkForExistence = (options, name) => {
    if (!name) {
      return false;
    }
    if (name in options.headers || options.query?.[name]) {
      return true;
    }
    if ("Cookie" in options.headers && options.headers["Cookie"] && typeof options.headers["Cookie"] === "string") {
      return options.headers["Cookie"].includes(`${name}=`);
    }
    return false;
  };
  var setAuthParams = async ({
    security,
    ...options
  }) => {
    for (const auth of security) {
      if (checkForExistence(options, auth.name)) {
        continue;
      }
      const token = await getAuthToken(auth, options.auth);
      if (!token) {
        continue;
      }
      const name = auth.name ?? "Authorization";
      switch (auth.in) {
        case "query":
          if (!options.query) {
            options.query = {};
          }
          options.query[name] = token;
          break;
        case "cookie": {
          const value = `${name}=${token}`;
          if ("Cookie" in options.headers && options.headers["Cookie"]) {
            options.headers["Cookie"] = `${options.headers["Cookie"]}; ${value}`;
          } else {
            options.headers["Cookie"] = value;
          }
          break;
        }
        case "header":
        default:
          options.headers[name] = token;
          break;
      }
    }
  };
  var buildUrl = (options) => {
    const instanceBaseUrl = options.axios?.defaults?.baseURL;
    const baseUrl = options.baseURL && typeof options.baseURL === "string" ? options.baseURL : instanceBaseUrl;
    return getUrl({
      baseUrl,
      path: options.path,
      // let `paramsSerializer()` handle query params if it exists
      query: !options.paramsSerializer ? options.query : void 0,
      querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer(options.querySerializer),
      url: options.url
    });
  };
  var mergeConfigs = (a, b) => {
    const config = { ...a, ...b };
    config.headers = mergeHeaders(a.headers, b.headers);
    return config;
  };
  var axiosHeadersKeywords = [
    "common",
    "delete",
    "get",
    "head",
    "patch",
    "post",
    "put"
  ];
  var mergeHeaders = (...headers) => {
    const mergedHeaders = {};
    for (const header of headers) {
      if (!header || typeof header !== "object") {
        continue;
      }
      const iterator2 = Object.entries(header);
      for (const [key, value] of iterator2) {
        if (axiosHeadersKeywords.includes(key) && typeof value === "object") {
          mergedHeaders[key] = {
            ...mergedHeaders[key],
            ...value
          };
        } else if (value === null) {
          delete mergedHeaders[key];
        } else if (Array.isArray(value)) {
          for (const v of value) {
            mergedHeaders[key] = [...mergedHeaders[key] ?? [], v];
          }
        } else if (value !== void 0) {
          mergedHeaders[key] = typeof value === "object" ? JSON.stringify(value) : value;
        }
      }
    }
    return mergedHeaders;
  };
  var createConfig = (override = {}) => ({
    ...override
  });

  // frontend/client/client/client.gen.ts
  var createClient = (config = {}) => {
    let _config = mergeConfigs(createConfig(), config);
    let instance;
    if (_config.axios && !("Axios" in _config.axios)) {
      instance = _config.axios;
    } else {
      const { auth, ...configWithoutAuth } = _config;
      instance = axios_default.create(configWithoutAuth);
    }
    const getConfig = () => ({ ..._config });
    const setConfig = (config2) => {
      _config = mergeConfigs(_config, config2);
      instance.defaults = {
        ...instance.defaults,
        ..._config,
        // @ts-expect-error
        headers: mergeHeaders(instance.defaults.headers, _config.headers)
      };
      return getConfig();
    };
    const beforeRequest = async (options) => {
      const opts = {
        ..._config,
        ...options,
        axios: options.axios ?? _config.axios ?? instance,
        headers: mergeHeaders(_config.headers, options.headers)
      };
      if (opts.security) {
        await setAuthParams({
          ...opts,
          security: opts.security
        });
      }
      if (opts.requestValidator) {
        await opts.requestValidator(opts);
      }
      if (opts.body !== void 0 && opts.bodySerializer) {
        opts.body = opts.bodySerializer(opts.body);
      }
      const url = buildUrl(opts);
      return { opts, url };
    };
    const request = async (options) => {
      const { opts, url } = await beforeRequest(options);
      try {
        const _axios = opts.axios;
        const { auth, ...optsWithoutAuth } = opts;
        const response = await _axios({
          ...optsWithoutAuth,
          baseURL: "",
          // the baseURL is already included in `url`
          data: getValidRequestBody(opts),
          headers: opts.headers,
          // let `paramsSerializer()` handle query params if it exists
          params: opts.paramsSerializer ? opts.query : void 0,
          url
        });
        let { data } = response;
        if (opts.responseType === "json") {
          if (opts.responseValidator) {
            await opts.responseValidator(data);
          }
          if (opts.responseTransformer) {
            data = await opts.responseTransformer(data);
          }
        }
        return {
          ...response,
          data: data ?? {}
        };
      } catch (error) {
        const e = error;
        if (opts.throwOnError) {
          throw e;
        }
        e.error = e.response?.data ?? {};
        return e;
      }
    };
    const makeMethodFn = (method) => (options) => request({ ...options, method });
    const makeSseFn = (method) => async (options) => {
      const { opts, url } = await beforeRequest(options);
      return createSseClient({
        ...opts,
        body: opts.body,
        headers: opts.headers,
        method,
        serializedBody: getValidRequestBody(opts),
        // @ts-expect-error
        signal: opts.signal,
        url
      });
    };
    const _buildUrl = (options) => buildUrl({ axios: instance, ..._config, ...options });
    return {
      buildUrl: _buildUrl,
      connect: makeMethodFn("CONNECT"),
      delete: makeMethodFn("DELETE"),
      get: makeMethodFn("GET"),
      getConfig,
      head: makeMethodFn("HEAD"),
      instance,
      options: makeMethodFn("OPTIONS"),
      patch: makeMethodFn("PATCH"),
      post: makeMethodFn("POST"),
      put: makeMethodFn("PUT"),
      request,
      setConfig,
      sse: {
        connect: makeSseFn("CONNECT"),
        delete: makeSseFn("DELETE"),
        get: makeSseFn("GET"),
        head: makeSseFn("HEAD"),
        options: makeSseFn("OPTIONS"),
        patch: makeSseFn("PATCH"),
        post: makeSseFn("POST"),
        put: makeSseFn("PUT"),
        trace: makeSseFn("TRACE")
      },
      trace: makeMethodFn("TRACE")
    };
  };

  // frontend/client/client.gen.ts
  var client = createClient(createConfig());

  // frontend/client/sdk.gen.ts
  var createProfileEndpointApiProfilesPost = (options) => (options.client ?? client).post({
    responseType: "json",
    url: "/api/profiles",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  var deleteProfileEndpointApiProfilesProfileIdDelete = (options) => (options.client ?? client).delete({
    responseType: "json",
    url: "/api/profiles/{profile_id}",
    ...options
  });
  var updateProfileEndpointApiProfilesProfileIdPut = (options) => (options.client ?? client).put({
    responseType: "json",
    url: "/api/profiles/{profile_id}",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  var selectProfileEndpointApiProfilesProfileIdSelectPost = (options) => (options.client ?? client).post({
    responseType: "json",
    url: "/api/profiles/{profile_id}/select",
    ...options
  });
  var getQueueStatusApiQueueStatusGet = (options) => (options?.client ?? client).get({
    responseType: "json",
    url: "/api/queue-status",
    ...options
  });
  var getStateApiStateGet = (options) => (options?.client ?? client).get({
    responseType: "json",
    url: "/api/state",
    ...options
  });
  var generateLabelPdfLabelsPdfPost = (options) => (options.client ?? client).post({
    responseType: "blob",
    url: "/labels.pdf",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  var printLabelPrintPost = (options) => (options.client ?? client).post({
    responseType: "json",
    url: "/print",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  // frontend/src/api.ts
  var isConfigured = false;
  function configureApiClient() {
    if (isConfigured) {
      return;
    }
    client.setConfig({
      axios: axios_default.create({
        baseURL: window.location.origin
      })
    });
    isConfigured = true;
  }
  function getErrorMessage(error) {
    if (axios_default.isAxiosError(error)) {
      const responseData = error.response?.data;
      if (typeof responseData === "string" && responseData.trim()) {
        return responseData;
      }
      if (responseData && typeof responseData === "object") {
        return JSON.stringify(responseData, null, 2);
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  function isCanceledError(error) {
    return axios_default.isAxiosError(error) && error.code === "ERR_CANCELED";
  }

  // frontend/src/stockFit.ts
  var MATCH_TOLERANCE_MM = 0.1;
  function alternateOrientation(orientation) {
    return orientation === "landscape" ? "portrait" : "landscape";
  }
  function dimensionsForOrientation(profile, orientation) {
    return orientation === "landscape" ? {
      width_mm: profile.height_mm,
      height_mm: profile.width_mm
    } : {
      width_mm: profile.width_mm,
      height_mm: profile.height_mm
    };
  }
  function effectiveDimensions(profile) {
    return dimensionsForOrientation(profile, profile.orientation);
  }
  function matchesDimension(left, right) {
    return Math.abs(left - right) <= MATCH_TOLERANCE_MM;
  }
  function chooseBestContinuousOrientation(profile, stockWidthMm) {
    const selectedOrientation = profile.orientation;
    const candidates = [];
    for (const orientation of [
      selectedOrientation,
      alternateOrientation(selectedOrientation)
    ]) {
      const dimensions = dimensionsForOrientation(profile, orientation);
      if (dimensions.width_mm <= stockWidthMm + MATCH_TOLERANCE_MM) {
        candidates.push({
          gap_mm: Math.abs(stockWidthMm - dimensions.width_mm),
          preference: orientation === selectedOrientation ? 0 : 1,
          orientation,
          width_mm: dimensions.width_mm
        });
      }
    }
    if (!candidates.length) {
      const selectedDimensions = effectiveDimensions(profile);
      return {
        applied_orientation: null,
        applied_width_mm: selectedDimensions.width_mm,
        auto_switched_orientation: false
      };
    }
    const best = candidates.reduce((currentBest, candidate) => {
      if (candidate.gap_mm < currentBest.gap_mm) {
        return candidate;
      }
      if (candidate.gap_mm === currentBest.gap_mm && candidate.preference < currentBest.preference) {
        return candidate;
      }
      return currentBest;
    });
    return {
      applied_orientation: best.orientation,
      applied_width_mm: best.width_mm,
      auto_switched_orientation: best.orientation !== selectedOrientation
    };
  }
  function describeStock(stock) {
    return stock.stock_is_continuous ? `continuous ${stock.stock_width_mm}mm roll` : `${stock.stock_width_mm}x${stock.stock_length_mm ?? 0}mm fixed label`;
  }
  function evaluateStockFit(profile, stock) {
    const selectedOrientation = profile.orientation;
    const selectedDimensions = effectiveDimensions(profile);
    if (stock.stock_is_continuous) {
      const continuousChoice = chooseBestContinuousOrientation(
        profile,
        stock.stock_width_mm
      );
      if (continuousChoice.applied_orientation == null) {
        return {
          fit_mode: "cannot_fit",
          fits_loaded_stock: false,
          selected_orientation: selectedOrientation,
          applied_orientation: selectedOrientation,
          auto_switched_orientation: false,
          message: `The ${selectedOrientation} layout is ${selectedDimensions.width_mm} mm wide, but the loaded ${describeStock(stock)} is only ${stock.stock_width_mm} mm wide.`,
          message_level: "warning"
        };
      }
      if (!continuousChoice.auto_switched_orientation) {
        return {
          fit_mode: "fits_selected",
          fits_loaded_stock: true,
          selected_orientation: selectedOrientation,
          applied_orientation: selectedOrientation,
          auto_switched_orientation: false,
          message: null,
          message_level: null
        };
      }
      return {
        fit_mode: "fits_auto_switched",
        fits_loaded_stock: true,
        selected_orientation: selectedOrientation,
        applied_orientation: continuousChoice.applied_orientation,
        auto_switched_orientation: true,
        message: matchesDimension(
          continuousChoice.applied_width_mm,
          stock.stock_width_mm
        ) ? `This ${selectedOrientation} design matches the loaded ${describeStock(stock)} when printed as ${continuousChoice.applied_orientation}. Print output will switch to ${continuousChoice.applied_orientation} automatically.` : `This ${selectedOrientation} design fits the loaded ${describeStock(stock)} better when printed as ${continuousChoice.applied_orientation}. Print output will switch to ${continuousChoice.applied_orientation} automatically.`,
        message_level: "info"
      };
    }
    const fixedLength = Number(stock.stock_length_mm ?? 0);
    const fitsLoadedStock = matchesDimension(selectedDimensions.width_mm, stock.stock_width_mm) && matchesDimension(selectedDimensions.height_mm, fixedLength);
    return fitsLoadedStock ? {
      fit_mode: "fits_selected",
      fits_loaded_stock: true,
      selected_orientation: selectedOrientation,
      applied_orientation: selectedOrientation,
      auto_switched_orientation: false,
      message: null,
      message_level: null
    } : {
      fit_mode: "cannot_fit",
      fits_loaded_stock: false,
      selected_orientation: selectedOrientation,
      applied_orientation: selectedOrientation,
      auto_switched_orientation: false,
      message: `The ${selectedOrientation} layout does not match the loaded ${describeStock(stock)} and may misprint.`,
      message_level: "warning"
    };
  }

  // frontend/src/app.ts
  configureApiClient();
  var DEFAULT_DRAFT = {
    name: "Default label",
    rows: [
      {
        text: "New label",
        level: "h2",
        bold: false,
        italic: false,
        alignment: "center"
      }
    ],
    border: {
      enabled: false,
      thickness_mm: 0.5,
      inset_mm: 1,
      radius_mm: 1.5
    },
    width_mm: 62,
    height_mm: 29,
    orientation: "portrait",
    cut_every: 1,
    quality: "BrQuality",
    quantity: 1
  };
  var DEFAULT_ACTIVE_STOCK = {
    stock_width_mm: 62,
    stock_is_continuous: false,
    stock_length_mm: 29
  };
  var PREVIEW_DEBOUNCE_MS = 250;
  var QUEUE_STATUS_POLL_MS = 1e4;
  var STOCK_NOTICE_INFO_CLASSES = [
    "border-emerald-300",
    "bg-emerald-50",
    "text-emerald-800"
  ];
  var STOCK_NOTICE_WARNING_CLASSES = [
    "border-amber-300",
    "bg-amber-50",
    "text-amber-900"
  ];
  function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  }
  var profilePicker = requireElement("profile-picker");
  var newProfileButton = requireElement("new-profile-button");
  var saveButton = requireElement("save-button");
  var deleteButton = requireElement("delete-button");
  var previewButton = requireElement("preview-button");
  var printButton = requireElement("print-button");
  var generalStatusEl = requireElement("general-status");
  var previewStatusEl = requireElement("preview-status");
  var previewHintEl = requireElement("preview-hint");
  var previewFrame = requireElement("preview-frame");
  var previewOverlay = requireElement("preview-overlay");
  var previewOverlayText = requireElement("preview-overlay-text");
  var previewMeta = requireElement("preview-meta");
  var queueStatusIndicator = requireElement(
    "queue-status-indicator"
  );
  var queueStatusText = requireElement("queue-status-text");
  var rowList = requireElement("row-list");
  var addRowButton = requireElement("add-row-button");
  var deleteRowButton = requireElement("delete-row-button");
  var rowText = requireElement("row-text");
  var rowMeta = requireElement("row-meta");
  var borderToggle = requireElement("border-enabled-toggle");
  var borderInput = requireElement("border_enabled");
  var borderFields = requireElement("border-fields");
  var widthInput = requireElement("width_mm");
  var heightInput = requireElement("height_mm");
  var setWidthToPrinterButton = requireElement(
    "set-width-to-printer-button"
  );
  var setHeightToPrinterButton = requireElement(
    "set-height-to-printer-button"
  );
  var secondaryDimensionLabel = requireElement(
    "secondary-dimension-label"
  );
  var orientationSelect = requireElement("orientation");
  var activeStockSummaryEl = requireElement(
    "active-stock-summary"
  );
  var stockMatchSummaryEl = requireElement("stock-match-summary");
  var stockWarningEl = requireElement("stock-warning");
  var rowBoldButton = requireElement("row-bold-button");
  var rowItalicButton = requireElement("row-italic-button");
  var tabButtons = Array.from(
    document.querySelectorAll("[data-tab-button]")
  );
  var tabPanels = Array.from(
    document.querySelectorAll("[data-tab-panel]")
  );
  var currentPdfBlobUrl = null;
  var currentProfileId = null;
  var activeQueueName = "";
  var currentTab = "profile";
  var draftRows = structuredClone(DEFAULT_DRAFT.rows);
  var activeRowIndex = 0;
  var activeStock = { ...DEFAULT_ACTIVE_STOCK };
  var previewTimer = null;
  var previewRequestToken = 0;
  var previewController = null;
  var queueStatusPollTimer = null;
  var queueStatusRequestInFlight = false;
  var baselinePayloadSnapshot = JSON.stringify(DEFAULT_DRAFT);
  function setQueueStatusIndicator(message, state, title = "") {
    queueStatusIndicator.dataset.state = state;
    queueStatusIndicator.title = title;
    queueStatusText.textContent = message;
  }
  function renderQueueStatus(status) {
    const jobIds = status.job_ids ?? [];
    const queuedJobs = Number(status.queued_jobs ?? jobIds.length);
    const isOnline = Boolean(status.is_online);
    const message = !isOnline ? queuedJobs === 0 ? "Offline" : `Offline \u2022 ${queuedJobs} queued` : queuedJobs === 0 ? "Online" : `Online \u2022 ${queuedJobs} queued`;
    const titleParts = [
      `${status.queue_name}: ${status.status ?? "unknown"}`,
      status.detail,
      jobIds.length ? `Jobs: ${jobIds.join(", ")}` : "No queued jobs."
    ].filter(Boolean);
    setQueueStatusIndicator(
      message,
      !isOnline ? "offline" : queuedJobs === 0 ? "idle" : "queued",
      titleParts.join(" ")
    );
  }
  async function refreshQueueStatus({
    showLoading = false
  } = {}) {
    if (queueStatusRequestInFlight) {
      return;
    }
    queueStatusRequestInFlight = true;
    if (showLoading) {
      setQueueStatusIndicator("Checking...", "loading");
    }
    try {
      const response = await getQueueStatusApiQueueStatusGet({
        query: activeQueueName ? { queue_name: activeQueueName } : void 0,
        throwOnError: true
      });
      renderQueueStatus(response.data);
    } catch (error) {
      console.error(error);
      setQueueStatusIndicator("Unavailable", "error", getErrorMessage(error));
    } finally {
      queueStatusRequestInFlight = false;
    }
  }
  function startQueueStatusPolling() {
    if (queueStatusPollTimer !== null) {
      return;
    }
    void refreshQueueStatus({ showLoading: true });
    queueStatusPollTimer = window.setInterval(() => {
      void refreshQueueStatus();
    }, QUEUE_STATUS_POLL_MS);
  }
  function setStatus(message, isError = false) {
    generalStatusEl.textContent = message;
    generalStatusEl.dataset.state = isError ? "error" : "idle";
  }
  function setPreviewStatus(message, isError = false) {
    previewStatusEl.textContent = message;
    previewStatusEl.dataset.state = isError ? "error" : "idle";
  }
  function setPreviewOverlay(message, isError = false, visible = true) {
    previewOverlayText.textContent = message;
    previewOverlay.dataset.state = isError ? "error" : "idle";
    previewOverlay.classList.toggle("hidden", !visible);
  }
  function updateTabState() {
    for (const button of tabButtons) {
      const isActive = button.dataset.tabButton === currentTab;
      button.dataset.state = isActive ? "on" : "off";
      button.setAttribute("aria-selected", String(isActive));
    }
    for (const panel of tabPanels) {
      const isActive = panel.dataset.tabPanel === currentTab;
      panel.classList.toggle("hidden", !isActive);
    }
  }
  function setToggleState(button, isActive) {
    button.dataset.state = isActive ? "on" : "off";
    button.setAttribute("aria-pressed", String(isActive));
  }
  function updateBorderToggle() {
    setToggleState(borderToggle, borderInput.checked);
    borderFields.classList.toggle("opacity-50", !borderInput.checked);
  }
  function formatMm(value) {
    return `${Number(value ?? 0)} mm`;
  }
  function describeStock2(stock) {
    return stock.stock_is_continuous ? `Continuous ${formatMm(stock.stock_width_mm)} roll` : `${formatMm(stock.stock_width_mm)} x ${formatMm(stock.stock_length_mm)} fixed label stock`;
  }
  function updateDimensionLabels() {
    secondaryDimensionLabel.textContent = activeStock.stock_is_continuous ? "Length (mm)" : "Height (mm)";
  }
  function setDimensionToPrinterWidth(targetInput) {
    targetInput.value = String(activeStock.stock_width_mm);
    schedulePreview();
  }
  function setStockNotice(message, level) {
    stockWarningEl.classList.remove(
      ...STOCK_NOTICE_INFO_CLASSES,
      ...STOCK_NOTICE_WARNING_CLASSES
    );
    if (!message || !level) {
      stockWarningEl.textContent = "";
      stockWarningEl.dataset.state = "";
      stockWarningEl.classList.add("hidden");
      return;
    }
    stockWarningEl.textContent = message;
    stockWarningEl.dataset.state = level;
    stockWarningEl.classList.remove("hidden");
    stockWarningEl.classList.add(
      ...level === "info" ? STOCK_NOTICE_INFO_CLASSES : STOCK_NOTICE_WARNING_CLASSES
    );
  }
  function updateStockIndicators(profile) {
    const stockFit = evaluateStockFit(profile, activeStock);
    const effective = effectiveDimensions(profile);
    activeStockSummaryEl.textContent = describeStock2(activeStock);
    stockMatchSummaryEl.textContent = activeStock.stock_is_continuous ? stockFit.fit_mode === "fits_selected" ? effective.width_mm < activeStock.stock_width_mm - MATCH_TOLERANCE_MM ? `This ${profile.orientation} design is narrower than the loaded roll and will leave unused width.` : "" : stockFit.fit_mode === "fits_auto_switched" ? "" : "The selected orientation is too wide for the loaded roll." : stockFit.fits_loaded_stock ? "" : "Loaded stock may not match this design.";
    setStockNotice(stockFit.message, stockFit.message_level);
  }
  function updatePreviewMeta(profile) {
    const resolved = effectiveDimensions(profile);
    const width = Number(resolved.width_mm || 0);
    const height = Number(resolved.height_mm || 0);
    const quantity = Number(profile.quantity || 0);
    previewMeta.textContent = `${width || 0} x ${height || 0} mm / Qty ${quantity || 0}`;
  }
  function normalizeBorder(border) {
    return {
      enabled: Boolean(border?.enabled),
      thickness_mm: border?.thickness_mm ?? DEFAULT_DRAFT.border.thickness_mm,
      inset_mm: border?.inset_mm ?? DEFAULT_DRAFT.border.inset_mm,
      radius_mm: border?.radius_mm ?? DEFAULT_DRAFT.border.radius_mm
    };
  }
  function cloneRows(rows) {
    const sourceRows = rows?.length ? rows : DEFAULT_DRAFT.rows;
    return sourceRows.map((row) => ({
      text: row.text ?? "",
      level: row.level ?? "normal",
      alignment: row.alignment ?? "left",
      bold: Boolean(row.bold),
      italic: Boolean(row.italic)
    }));
  }
  function normalizeOrientation(value) {
    return value === "landscape" ? "landscape" : "portrait";
  }
  function normalizeProfile(profile) {
    return {
      name: profile.name,
      rows: cloneRows(profile.rows),
      border: normalizeBorder(profile.border),
      width_mm: profile.width_mm,
      height_mm: profile.height_mm,
      orientation: normalizeOrientation(profile.orientation),
      cut_every: profile.cut_every ?? DEFAULT_DRAFT.cut_every,
      quality: profile.quality ?? DEFAULT_DRAFT.quality,
      quantity: profile.quantity ?? DEFAULT_DRAFT.quantity
    };
  }
  function serializeProfile(profile) {
    return JSON.stringify(normalizeProfile(profile));
  }
  function setSaveButtonState(isDirty) {
    saveButton.disabled = !isDirty;
    saveButton.dataset.state = isDirty ? "dirty" : "clean";
    saveButton.classList.toggle("nav-button--save-ready", isDirty);
    saveButton.classList.toggle("nav-button--secondary", !isDirty);
  }
  function updateSaveButtonState() {
    setSaveButtonState(
      serializeProfile(getPayload()) !== baselinePayloadSnapshot
    );
  }
  function setBaselinePayload(profile) {
    baselinePayloadSnapshot = serializeProfile(profile);
    setSaveButtonState(false);
  }
  function ensureActiveRow() {
    if (!draftRows.length) {
      draftRows = cloneRows(DEFAULT_DRAFT.rows);
    }
    if (activeRowIndex >= draftRows.length) {
      activeRowIndex = draftRows.length - 1;
    }
    if (activeRowIndex < 0) {
      activeRowIndex = 0;
    }
  }
  function rowSummary(row, index) {
    const snippet = row.text.trim().replace(/\s+/g, " ");
    return snippet ? snippet.slice(0, 42) : `Row ${index + 1}`;
  }
  function syncActiveRowFromEditor() {
    ensureActiveRow();
    const row = draftRows[activeRowIndex];
    if (!row) {
      return;
    }
    row.text = rowText.value;
    row.level = document.querySelector(
      "[data-row-level][data-state='on']"
    )?.dataset.rowLevel ?? "normal";
    row.alignment = document.querySelector(
      "[data-row-alignment][data-state='on']"
    )?.dataset.rowAlignment ?? "left";
    row.bold = rowBoldButton.dataset.state === "on";
    row.italic = rowItalicButton.dataset.state === "on";
  }
  function renderRowList() {
    rowList.innerHTML = "";
    draftRows.forEach((row, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.active = index === activeRowIndex ? "true" : "false";
      button.className = "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition data-[active=true]:border-stone-900 data-[active=true]:bg-stone-900 data-[active=true]:text-white data-[active=false]:border-stone-200 data-[active=false]:bg-stone-50 data-[active=false]:text-stone-700 data-[active=false]:hover:border-stone-400 data-[active=false]:hover:bg-white";
      button.innerHTML = `
      <span class="text-[10px] font-semibold opacity-70">Row ${index + 1}</span>
      <span class="mt-1 line-clamp-2 text-sm font-medium">${rowSummary(row, index)}</span>
    `;
      button.addEventListener("click", () => {
        syncActiveRowFromEditor();
        activeRowIndex = index;
        renderRowsUI();
      });
      rowList.appendChild(button);
    });
  }
  function setSingleChoice(buttons, activeValue, attributeName) {
    for (const button of buttons) {
      const isActive = button.dataset[attributeName] === activeValue;
      button.dataset.state = isActive ? "on" : "off";
      button.setAttribute("aria-pressed", String(isActive));
    }
  }
  function renderRowsUI() {
    ensureActiveRow();
    renderRowList();
    const row = draftRows[activeRowIndex];
    rowText.value = row.text;
    setSingleChoice(
      Array.from(
        document.querySelectorAll("[data-row-level]")
      ),
      row.level,
      "rowLevel"
    );
    setSingleChoice(
      Array.from(
        document.querySelectorAll("[data-row-alignment]")
      ),
      row.alignment,
      "rowAlignment"
    );
    setToggleState(rowBoldButton, row.bold);
    setToggleState(rowItalicButton, row.italic);
    deleteRowButton.disabled = draftRows.length === 1;
    rowMeta.textContent = `${draftRows.length} row${draftRows.length === 1 ? "" : "s"} on label`;
  }
  function getRowsPayload() {
    syncActiveRowFromEditor();
    return draftRows.map((row) => ({
      text: row.text,
      level: row.level,
      alignment: row.alignment,
      bold: row.bold,
      italic: row.italic
    }));
  }
  function getPayload() {
    const payload = {
      name: requireElement("name").value.trim(),
      rows: getRowsPayload(),
      border: {
        enabled: borderInput.checked,
        thickness_mm: Number(
          requireElement("border_thickness_mm").value
        ),
        inset_mm: Number(
          requireElement("border_inset_mm").value
        ),
        radius_mm: Number(
          requireElement("border_radius_mm").value
        )
      },
      width_mm: Number(widthInput.value),
      height_mm: Number(heightInput.value),
      orientation: requireElement("orientation").value,
      cut_every: Number(requireElement("cut_every").value),
      quality: requireElement("quality").value,
      quantity: Number(requireElement("quantity").value)
    };
    updateStockIndicators(payload);
    updatePreviewMeta(payload);
    return payload;
  }
  function fillForm(profile) {
    const normalizedProfile = normalizeProfile(profile);
    requireElement("name").value = normalizedProfile.name;
    widthInput.value = String(normalizedProfile.width_mm);
    heightInput.value = String(normalizedProfile.height_mm);
    orientationSelect.value = normalizedProfile.orientation;
    requireElement("quality").value = normalizedProfile.quality;
    requireElement("cut_every").value = String(
      normalizedProfile.cut_every
    );
    requireElement("quantity").value = String(
      normalizedProfile.quantity
    );
    const border = normalizedProfile.border;
    requireElement("border_thickness_mm").value = String(
      border.thickness_mm
    );
    requireElement("border_inset_mm").value = String(
      border.inset_mm
    );
    requireElement("border_radius_mm").value = String(
      border.radius_mm
    );
    borderInput.checked = border.enabled;
    updateBorderToggle();
    draftRows = normalizedProfile.rows;
    activeRowIndex = 0;
    renderRowsUI();
    updateStockIndicators(normalizedProfile);
    updatePreviewMeta(normalizedProfile);
    setBaselinePayload(normalizedProfile);
    deleteButton.disabled = !currentProfileId;
  }
  function renderProfilePicker(state) {
    profilePicker.innerHTML = "";
    for (const profile of state.profiles ?? []) {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      if (profile.id === state.selected_profile_id) {
        option.selected = true;
      }
      profilePicker.appendChild(option);
    }
  }
  function selectedProfileFromState(state) {
    const profiles = state.profiles ?? [];
    return profiles.find((profile) => profile.id === state.selected_profile_id) ?? profiles[0];
  }
  function renderState(state) {
    activeQueueName = state.queue_name;
    activeStock = {
      stock_width_mm: state.stock_width_mm ?? DEFAULT_ACTIVE_STOCK.stock_width_mm,
      stock_is_continuous: Boolean(state.stock_is_continuous),
      stock_length_mm: state.stock_length_mm ?? null
    };
    updateDimensionLabels();
    renderProfilePicker(state);
    const selectedProfile = selectedProfileFromState(state);
    currentProfileId = selectedProfile?.id ?? null;
    if (selectedProfile) {
      fillForm(selectedProfile);
    }
  }
  function startNewProfile() {
    currentProfileId = null;
    fillForm(DEFAULT_DRAFT);
    setStatus("Drafting a new profile.");
    void previewPdf({ immediate: true });
  }
  function cancelPreviewTimer() {
    if (previewTimer !== null) {
      window.clearTimeout(previewTimer);
      previewTimer = null;
    }
  }
  function schedulePreview() {
    getPayload();
    updateSaveButtonState();
    cancelPreviewTimer();
    previewHintEl.textContent = "Auto-preview queued";
    previewTimer = window.setTimeout(() => {
      void previewPdf();
    }, PREVIEW_DEBOUNCE_MS);
  }
  async function previewPdf({
    immediate = false
  } = {}) {
    cancelPreviewTimer();
    const payload = getPayload();
    const token = ++previewRequestToken;
    if (previewController) {
      previewController.abort();
    }
    previewController = new AbortController();
    previewHintEl.textContent = immediate ? "Manual refresh" : "Auto-preview";
    setPreviewStatus("Updating preview...");
    setPreviewOverlay("Rendering preview...", false, true);
    try {
      const response = await generateLabelPdfLabelsPdfPost({
        body: payload,
        signal: previewController.signal,
        throwOnError: true
      });
      const blob = response.data;
      if (token !== previewRequestToken) {
        return;
      }
      if (currentPdfBlobUrl) {
        URL.revokeObjectURL(currentPdfBlobUrl);
      }
      currentPdfBlobUrl = URL.createObjectURL(blob);
      previewFrame.src = currentPdfBlobUrl;
      previewFrame.classList.remove("invisible");
      setPreviewStatus("Preview synced.");
      setPreviewOverlay("", false, false);
    } catch (error) {
      if (isCanceledError(error) || token !== previewRequestToken) {
        return;
      }
      console.error(error);
      const message = getErrorMessage(error);
      setPreviewStatus("Preview failed.", true);
      setPreviewOverlay(message, true, true);
    }
  }
  async function saveProfile() {
    if (saveButton.disabled) {
      return;
    }
    setStatus("Saving profile...");
    try {
      const payload = getPayload();
      const response = currentProfileId ? await updateProfileEndpointApiProfilesProfileIdPut({
        body: payload,
        path: { profile_id: currentProfileId },
        throwOnError: true
      }) : await createProfileEndpointApiProfilesPost({
        body: payload,
        throwOnError: true
      });
      renderState(response.data);
      setStatus("Profile saved.");
      await previewPdf({ immediate: true });
    } catch (error) {
      console.error(error);
      setStatus(getErrorMessage(error), true);
    }
  }
  async function deleteProfile() {
    if (!currentProfileId) {
      setStatus("Draft profile is not saved yet.", true);
      return;
    }
    const profileName = requireElement("name").value.trim() || "this profile";
    if (!window.confirm(`Delete "${profileName}"? This cannot be undone.`)) {
      return;
    }
    setStatus("Deleting profile...");
    try {
      const response = await deleteProfileEndpointApiProfilesProfileIdDelete({
        path: { profile_id: currentProfileId },
        throwOnError: true
      });
      renderState(response.data);
      setStatus("Profile deleted.");
      await previewPdf({ immediate: true });
    } catch (error) {
      console.error(error);
      setStatus(getErrorMessage(error), true);
    }
  }
  async function selectProfile(profileId) {
    setStatus("Loading profile...");
    try {
      const response = await selectProfileEndpointApiProfilesProfileIdSelectPost({
        path: { profile_id: profileId },
        throwOnError: true
      });
      renderState(response.data);
      setStatus("Profile loaded.");
      await previewPdf({ immediate: true });
    } catch (error) {
      console.error(error);
      setStatus(getErrorMessage(error), true);
    }
  }
  async function printLabel() {
    setStatus("Applying printer settings and sending job...");
    try {
      const response = await printLabelPrintPost({
        body: getPayload(),
        throwOnError: true
      });
      const result = response.data;
      setStatus(`Print submitted: ${result.stdout || result.queue}`);
      await refreshQueueStatus();
    } catch (error) {
      console.error(error);
      setStatus(`Print failed: ${getErrorMessage(error)}`, true);
    }
  }
  function bindSingleChoiceButtons(selector, targetProperty, datasetProperty) {
    for (const button of Array.from(
      document.querySelectorAll(selector)
    )) {
      button.addEventListener("click", () => {
        syncActiveRowFromEditor();
        draftRows[activeRowIndex][targetProperty] = button.dataset[datasetProperty] ?? "";
        renderRowsUI();
        schedulePreview();
      });
    }
  }
  function bindToggleButton(button, propertyName) {
    button.addEventListener("click", () => {
      syncActiveRowFromEditor();
      draftRows[activeRowIndex][propertyName] = !draftRows[activeRowIndex][propertyName];
      renderRowsUI();
      schedulePreview();
    });
  }
  for (const button of tabButtons) {
    button.addEventListener("click", () => {
      currentTab = button.dataset.tabButton ?? "profile";
      updateTabState();
    });
  }
  newProfileButton.addEventListener("click", startNewProfile);
  saveButton.addEventListener("click", () => {
    void saveProfile();
  });
  deleteButton.addEventListener("click", () => {
    void deleteProfile();
  });
  previewButton.addEventListener("click", () => {
    void previewPdf({ immediate: true });
  });
  printButton.addEventListener("click", () => {
    void printLabel();
  });
  setWidthToPrinterButton.addEventListener("click", () => {
    setDimensionToPrinterWidth(widthInput);
  });
  setHeightToPrinterButton.addEventListener("click", () => {
    setDimensionToPrinterWidth(heightInput);
  });
  profilePicker.addEventListener("change", () => {
    if (profilePicker.value) {
      void selectProfile(profilePicker.value);
    }
  });
  borderToggle.addEventListener("click", () => {
    borderInput.checked = !borderInput.checked;
    updateBorderToggle();
    schedulePreview();
  });
  for (const input of Array.from(
    document.querySelectorAll("[data-autopreview]")
  )) {
    const eventName = input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, schedulePreview);
  }
  addRowButton.addEventListener("click", () => {
    syncActiveRowFromEditor();
    draftRows.push({
      text: "",
      level: "normal",
      bold: false,
      italic: false,
      alignment: "center"
    });
    activeRowIndex = draftRows.length - 1;
    renderRowsUI();
    schedulePreview();
  });
  deleteRowButton.addEventListener("click", () => {
    if (draftRows.length === 1) {
      return;
    }
    syncActiveRowFromEditor();
    draftRows.splice(activeRowIndex, 1);
    activeRowIndex = Math.max(0, activeRowIndex - 1);
    renderRowsUI();
    schedulePreview();
  });
  rowText.addEventListener("input", () => {
    syncActiveRowFromEditor();
    renderRowList();
    schedulePreview();
  });
  bindSingleChoiceButtons("[data-row-level]", "level", "rowLevel");
  bindSingleChoiceButtons("[data-row-alignment]", "alignment", "rowAlignment");
  bindToggleButton(rowBoldButton, "bold");
  bindToggleButton(rowItalicButton, "italic");
  updateTabState();
  setStatus("Loading label profiles...");
  setPreviewStatus("Waiting for preview...");
  setPreviewOverlay("Loading profile...");
  setQueueStatusIndicator("Checking...", "loading");
  async function loadState() {
    try {
      const response = await getStateApiStateGet({ throwOnError: true });
      renderState(response.data);
      setStatus("Profiles loaded.");
      await refreshQueueStatus({ showLoading: true });
      await previewPdf({ immediate: true });
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error);
      setStatus(message, true);
      setPreviewStatus("Preview unavailable.", true);
      setPreviewOverlay(message, true, true);
      setQueueStatusIndicator("Unavailable", "error", message);
    }
  }
  startQueueStatusPolling();
  void loadState();
})();
