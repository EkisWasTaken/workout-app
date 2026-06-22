import { app as Pe, BrowserWindow as Za, ipcMain as j, dialog as Rt } from "electron";
import { fileURLToPath as kt } from "node:url";
import se from "node:path";
import St from "sqlite3";
import * as At from "fs/promises";
import ge from "util";
import X, { Readable as Ct } from "stream";
import gi from "path";
import en from "http";
import an from "https";
import ra from "url";
import Ot from "fs";
import yi from "crypto";
import wi from "http2";
import jt from "assert";
import Ei from "tty";
import Lt from "os";
import pe from "zlib";
import { EventEmitter as Pt } from "events";
const nn = "191118", _i = "b9e9c9a8f821a88aa1e48ac780a71422921871a4";
function Ti(e, a) {
  return function() {
    return e.apply(a, arguments);
  };
}
const { toString: Nt } = Object.prototype, { getPrototypeOf: tn } = Object, { iterator: ca, toStringTag: Ri } = Symbol, pa = /* @__PURE__ */ ((e) => (a) => {
  const n = Nt.call(a);
  return e[n] || (e[n] = n.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null)), ne = (e) => (e = e.toLowerCase(), (a) => pa(a) === e), la = (e) => (a) => typeof a === e, { isArray: Ce } = Array, ke = la("undefined");
function Ue(e) {
  return e !== null && !ke(e) && e.constructor !== null && !ke(e.constructor) && K(e.constructor.isBuffer) && e.constructor.isBuffer(e);
}
const ki = ne("ArrayBuffer");
function Ft(e) {
  let a;
  return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? a = ArrayBuffer.isView(e) : a = e && e.buffer && ki(e.buffer), a;
}
const It = la("string"), K = la("function"), Si = la("number"), De = (e) => e !== null && typeof e == "object", Ut = (e) => e === !0 || e === !1, Ye = (e) => {
  if (pa(e) !== "object")
    return !1;
  const a = tn(e);
  return (a === null || a === Object.prototype || Object.getPrototypeOf(a) === null) && !(Ri in e) && !(ca in e);
}, Dt = (e) => {
  if (!De(e) || Ue(e))
    return !1;
  try {
    return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
  } catch {
    return !1;
  }
}, Bt = ne("Date"), qt = ne("File"), zt = ne("Blob"), Mt = ne("FileList"), $t = (e) => De(e) && K(e.pipe), Ht = (e) => {
  let a;
  return e && (typeof FormData == "function" && e instanceof FormData || K(e.append) && ((a = pa(e)) === "formdata" || // detect form-data instance
  a === "object" && K(e.toString) && e.toString() === "[object FormData]"));
}, Wt = ne("URLSearchParams"), [Vt, Gt, Xt, Kt] = ["ReadableStream", "Request", "Response", "Headers"].map(ne), Jt = (e) => e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function Be(e, a, { allOwnKeys: n = !1 } = {}) {
  if (e === null || typeof e > "u")
    return;
  let i, t;
  if (typeof e != "object" && (e = [e]), Ce(e))
    for (i = 0, t = e.length; i < t; i++)
      a.call(null, e[i], i, e);
  else {
    if (Ue(e))
      return;
    const s = n ? Object.getOwnPropertyNames(e) : Object.keys(e), r = s.length;
    let d;
    for (i = 0; i < r; i++)
      d = s[i], a.call(null, e[d], d, e);
  }
}
function Ai(e, a) {
  if (Ue(e))
    return null;
  a = a.toLowerCase();
  const n = Object.keys(e);
  let i = n.length, t;
  for (; i-- > 0; )
    if (t = n[i], a === t.toLowerCase())
      return t;
  return null;
}
const de = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, Ci = (e) => !ke(e) && e !== de;
function Ha() {
  const { caseless: e, skipUndefined: a } = Ci(this) && this || {}, n = {}, i = (t, s) => {
    const r = e && Ai(n, s) || s;
    Ye(n[r]) && Ye(t) ? n[r] = Ha(n[r], t) : Ye(t) ? n[r] = Ha({}, t) : Ce(t) ? n[r] = t.slice() : (!a || !ke(t)) && (n[r] = t);
  };
  for (let t = 0, s = arguments.length; t < s; t++)
    arguments[t] && Be(arguments[t], i);
  return n;
}
const Yt = (e, a, n, { allOwnKeys: i } = {}) => (Be(a, (t, s) => {
  n && K(t) ? e[s] = Ti(t, n) : e[s] = t;
}, { allOwnKeys: i }), e), Qt = (e) => (e.charCodeAt(0) === 65279 && (e = e.slice(1)), e), Zt = (e, a, n, i) => {
  e.prototype = Object.create(a.prototype, i), e.prototype.constructor = e, Object.defineProperty(e, "super", {
    value: a.prototype
  }), n && Object.assign(e.prototype, n);
}, eo = (e, a, n, i) => {
  let t, s, r;
  const d = {};
  if (a = a || {}, e == null) return a;
  do {
    for (t = Object.getOwnPropertyNames(e), s = t.length; s-- > 0; )
      r = t[s], (!i || i(r, e, a)) && !d[r] && (a[r] = e[r], d[r] = !0);
    e = n !== !1 && tn(e);
  } while (e && (!n || n(e, a)) && e !== Object.prototype);
  return a;
}, ao = (e, a, n) => {
  e = String(e), (n === void 0 || n > e.length) && (n = e.length), n -= a.length;
  const i = e.indexOf(a, n);
  return i !== -1 && i === n;
}, no = (e) => {
  if (!e) return null;
  if (Ce(e)) return e;
  let a = e.length;
  if (!Si(a)) return null;
  const n = new Array(a);
  for (; a-- > 0; )
    n[a] = e[a];
  return n;
}, io = /* @__PURE__ */ ((e) => (a) => e && a instanceof e)(typeof Uint8Array < "u" && tn(Uint8Array)), to = (e, a) => {
  const i = (e && e[ca]).call(e);
  let t;
  for (; (t = i.next()) && !t.done; ) {
    const s = t.value;
    a.call(e, s[0], s[1]);
  }
}, oo = (e, a) => {
  let n;
  const i = [];
  for (; (n = e.exec(a)) !== null; )
    i.push(n);
  return i;
}, so = ne("HTMLFormElement"), ro = (e) => e.toLowerCase().replace(
  /[-_\s]([a-z\d])(\w*)/g,
  function(n, i, t) {
    return i.toUpperCase() + t;
  }
), En = (({ hasOwnProperty: e }) => (a, n) => e.call(a, n))(Object.prototype), co = ne("RegExp"), Oi = (e, a) => {
  const n = Object.getOwnPropertyDescriptors(e), i = {};
  Be(n, (t, s) => {
    let r;
    (r = a(t, s, e)) !== !1 && (i[s] = r || t);
  }), Object.defineProperties(e, i);
}, po = (e) => {
  Oi(e, (a, n) => {
    if (K(e) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
      return !1;
    const i = e[n];
    if (K(i)) {
      if (a.enumerable = !1, "writable" in a) {
        a.writable = !1;
        return;
      }
      a.set || (a.set = () => {
        throw Error("Can not rewrite read-only method '" + n + "'");
      });
    }
  });
}, lo = (e, a) => {
  const n = {}, i = (t) => {
    t.forEach((s) => {
      n[s] = !0;
    });
  };
  return Ce(e) ? i(e) : i(String(e).split(a)), n;
}, uo = () => {
}, mo = (e, a) => e != null && Number.isFinite(e = +e) ? e : a;
function fo(e) {
  return !!(e && K(e.append) && e[Ri] === "FormData" && e[ca]);
}
const xo = (e) => {
  const a = new Array(10), n = (i, t) => {
    if (De(i)) {
      if (a.indexOf(i) >= 0)
        return;
      if (Ue(i))
        return i;
      if (!("toJSON" in i)) {
        a[t] = i;
        const s = Ce(i) ? [] : {};
        return Be(i, (r, d) => {
          const f = n(r, t + 1);
          !ke(f) && (s[d] = f);
        }), a[t] = void 0, s;
      }
    }
    return i;
  };
  return n(e, 0);
}, vo = ne("AsyncFunction"), ho = (e) => e && (De(e) || K(e)) && K(e.then) && K(e.catch), ji = ((e, a) => e ? setImmediate : a ? ((n, i) => (de.addEventListener("message", ({ source: t, data: s }) => {
  t === de && s === n && i.length && i.shift()();
}, !1), (t) => {
  i.push(t), de.postMessage(n, "*");
}))(`axios@${Math.random()}`, []) : (n) => setTimeout(n))(
  typeof setImmediate == "function",
  K(de.postMessage)
), bo = typeof queueMicrotask < "u" ? queueMicrotask.bind(de) : typeof process < "u" && process.nextTick || ji, go = (e) => e != null && K(e[ca]), m = {
  isArray: Ce,
  isArrayBuffer: ki,
  isBuffer: Ue,
  isFormData: Ht,
  isArrayBufferView: Ft,
  isString: It,
  isNumber: Si,
  isBoolean: Ut,
  isObject: De,
  isPlainObject: Ye,
  isEmptyObject: Dt,
  isReadableStream: Vt,
  isRequest: Gt,
  isResponse: Xt,
  isHeaders: Kt,
  isUndefined: ke,
  isDate: Bt,
  isFile: qt,
  isBlob: zt,
  isRegExp: co,
  isFunction: K,
  isStream: $t,
  isURLSearchParams: Wt,
  isTypedArray: io,
  isFileList: Mt,
  forEach: Be,
  merge: Ha,
  extend: Yt,
  trim: Jt,
  stripBOM: Qt,
  inherits: Zt,
  toFlatObject: eo,
  kindOf: pa,
  kindOfTest: ne,
  endsWith: ao,
  toArray: no,
  forEachEntry: to,
  matchAll: oo,
  isHTMLForm: so,
  hasOwnProperty: En,
  hasOwnProp: En,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors: Oi,
  freezeMethods: po,
  toObjectSet: lo,
  toCamelCase: ro,
  noop: uo,
  toFiniteNumber: mo,
  findKey: Ai,
  global: de,
  isContextDefined: Ci,
  isSpecCompliantForm: fo,
  toJSONObject: xo,
  isAsyncFn: vo,
  isThenable: ho,
  setImmediate: ji,
  asap: bo,
  isIterable: go
};
function g(e, a, n, i, t) {
  Error.call(this), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack, this.message = e, this.name = "AxiosError", a && (this.code = a), n && (this.config = n), i && (this.request = i), t && (this.response = t, this.status = t.status ? t.status : null);
}
m.inherits(g, Error, {
  toJSON: function() {
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
      config: m.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
const Li = g.prototype, Pi = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
  // eslint-disable-next-line func-names
].forEach((e) => {
  Pi[e] = { value: e };
});
Object.defineProperties(g, Pi);
Object.defineProperty(Li, "isAxiosError", { value: !0 });
g.from = (e, a, n, i, t, s) => {
  const r = Object.create(Li);
  m.toFlatObject(e, r, function(p) {
    return p !== Error.prototype;
  }, (x) => x !== "isAxiosError");
  const d = e && e.message ? e.message : "Error", f = a == null && e ? e.code : a;
  return g.call(r, d, f, n, i, t), e && r.cause == null && Object.defineProperty(r, "cause", { value: e, configurable: !0 }), r.name = e && e.name || "Error", s && Object.assign(r, s), r;
};
function Ni(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Fi = X.Stream, yo = ge, wo = ie;
function ie() {
  this.source = null, this.dataSize = 0, this.maxDataSize = 1024 * 1024, this.pauseStream = !0, this._maxDataSizeExceeded = !1, this._released = !1, this._bufferedEvents = [];
}
yo.inherits(ie, Fi);
ie.create = function(e, a) {
  var n = new this();
  a = a || {};
  for (var i in a)
    n[i] = a[i];
  n.source = e;
  var t = e.emit;
  return e.emit = function() {
    return n._handleEmit(arguments), t.apply(e, arguments);
  }, e.on("error", function() {
  }), n.pauseStream && e.pause(), n;
};
Object.defineProperty(ie.prototype, "readable", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    return this.source.readable;
  }
});
ie.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};
ie.prototype.resume = function() {
  this._released || this.release(), this.source.resume();
};
ie.prototype.pause = function() {
  this.source.pause();
};
ie.prototype.release = function() {
  this._released = !0, this._bufferedEvents.forEach((function(e) {
    this.emit.apply(this, e);
  }).bind(this)), this._bufferedEvents = [];
};
ie.prototype.pipe = function() {
  var e = Fi.prototype.pipe.apply(this, arguments);
  return this.resume(), e;
};
ie.prototype._handleEmit = function(e) {
  if (this._released) {
    this.emit.apply(this, e);
    return;
  }
  e[0] === "data" && (this.dataSize += e[1].length, this._checkIfMaxDataSizeExceeded()), this._bufferedEvents.push(e);
};
ie.prototype._checkIfMaxDataSizeExceeded = function() {
  if (!this._maxDataSizeExceeded && !(this.dataSize <= this.maxDataSize)) {
    this._maxDataSizeExceeded = !0;
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(e));
  }
};
var Eo = ge, Ii = X.Stream, _n = wo, _o = I;
function I() {
  this.writable = !1, this.readable = !0, this.dataSize = 0, this.maxDataSize = 2 * 1024 * 1024, this.pauseStreams = !0, this._released = !1, this._streams = [], this._currentStream = null, this._insideLoop = !1, this._pendingNext = !1;
}
Eo.inherits(I, Ii);
I.create = function(e) {
  var a = new this();
  e = e || {};
  for (var n in e)
    a[n] = e[n];
  return a;
};
I.isStreamLike = function(e) {
  return typeof e != "function" && typeof e != "string" && typeof e != "boolean" && typeof e != "number" && !Buffer.isBuffer(e);
};
I.prototype.append = function(e) {
  var a = I.isStreamLike(e);
  if (a) {
    if (!(e instanceof _n)) {
      var n = _n.create(e, {
        maxDataSize: 1 / 0,
        pauseStream: this.pauseStreams
      });
      e.on("data", this._checkDataSize.bind(this)), e = n;
    }
    this._handleErrors(e), this.pauseStreams && e.pause();
  }
  return this._streams.push(e), this;
};
I.prototype.pipe = function(e, a) {
  return Ii.prototype.pipe.call(this, e, a), this.resume(), e;
};
I.prototype._getNext = function() {
  if (this._currentStream = null, this._insideLoop) {
    this._pendingNext = !0;
    return;
  }
  this._insideLoop = !0;
  try {
    do
      this._pendingNext = !1, this._realGetNext();
    while (this._pendingNext);
  } finally {
    this._insideLoop = !1;
  }
};
I.prototype._realGetNext = function() {
  var e = this._streams.shift();
  if (typeof e > "u") {
    this.end();
    return;
  }
  if (typeof e != "function") {
    this._pipeNext(e);
    return;
  }
  var a = e;
  a((function(n) {
    var i = I.isStreamLike(n);
    i && (n.on("data", this._checkDataSize.bind(this)), this._handleErrors(n)), this._pipeNext(n);
  }).bind(this));
};
I.prototype._pipeNext = function(e) {
  this._currentStream = e;
  var a = I.isStreamLike(e);
  if (a) {
    e.on("end", this._getNext.bind(this)), e.pipe(this, { end: !1 });
    return;
  }
  var n = e;
  this.write(n), this._getNext();
};
I.prototype._handleErrors = function(e) {
  var a = this;
  e.on("error", function(n) {
    a._emitError(n);
  });
};
I.prototype.write = function(e) {
  this.emit("data", e);
};
I.prototype.pause = function() {
  this.pauseStreams && (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function" && this._currentStream.pause(), this.emit("pause"));
};
I.prototype.resume = function() {
  this._released || (this._released = !0, this.writable = !0, this._getNext()), this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function" && this._currentStream.resume(), this.emit("resume");
};
I.prototype.end = function() {
  this._reset(), this.emit("end");
};
I.prototype.destroy = function() {
  this._reset(), this.emit("close");
};
I.prototype._reset = function() {
  this.writable = !1, this._streams = [], this._currentStream = null;
};
I.prototype._checkDataSize = function() {
  if (this._updateDataSize(), !(this.dataSize <= this.maxDataSize)) {
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(e));
  }
};
I.prototype._updateDataSize = function() {
  this.dataSize = 0;
  var e = this;
  this._streams.forEach(function(a) {
    a.dataSize && (e.dataSize += a.dataSize);
  }), this._currentStream && this._currentStream.dataSize && (this.dataSize += this._currentStream.dataSize);
};
I.prototype._emitError = function(e) {
  this._reset(), this.emit("error", e);
};
var Ui = {};
const To = {
  "application/1d-interleaved-parityfec": {
    source: "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/3gpp-ims+xml": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphal+json": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphalforms+json": {
    source: "iana",
    compressible: !0
  },
  "application/a2l": {
    source: "iana"
  },
  "application/ace+cbor": {
    source: "iana"
  },
  "application/activemessage": {
    source: "iana"
  },
  "application/activity+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-directory+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcost+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcostparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointprop+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointpropparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-error+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamcontrol+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/aml": {
    source: "iana"
  },
  "application/andrew-inset": {
    source: "iana",
    extensions: [
      "ez"
    ]
  },
  "application/applefile": {
    source: "iana"
  },
  "application/applixware": {
    source: "apache",
    extensions: [
      "aw"
    ]
  },
  "application/at+jwt": {
    source: "iana"
  },
  "application/atf": {
    source: "iana"
  },
  "application/atfx": {
    source: "iana"
  },
  "application/atom+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atom"
    ]
  },
  "application/atomcat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomcat"
    ]
  },
  "application/atomdeleted+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomdeleted"
    ]
  },
  "application/atomicmail": {
    source: "iana"
  },
  "application/atomsvc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomsvc"
    ]
  },
  "application/atsc-dwd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dwd"
    ]
  },
  "application/atsc-dynamic-event-message": {
    source: "iana"
  },
  "application/atsc-held+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "held"
    ]
  },
  "application/atsc-rdt+json": {
    source: "iana",
    compressible: !0
  },
  "application/atsc-rsat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsat"
    ]
  },
  "application/atxml": {
    source: "iana"
  },
  "application/auth-policy+xml": {
    source: "iana",
    compressible: !0
  },
  "application/bacnet-xdd+zip": {
    source: "iana",
    compressible: !1
  },
  "application/batch-smtp": {
    source: "iana"
  },
  "application/bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/beep+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/calendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/calendar+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xcs"
    ]
  },
  "application/call-completion": {
    source: "iana"
  },
  "application/cals-1840": {
    source: "iana"
  },
  "application/captive+json": {
    source: "iana",
    compressible: !0
  },
  "application/cbor": {
    source: "iana"
  },
  "application/cbor-seq": {
    source: "iana"
  },
  "application/cccex": {
    source: "iana"
  },
  "application/ccmp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ccxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ccxml"
    ]
  },
  "application/cdfx+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdfx"
    ]
  },
  "application/cdmi-capability": {
    source: "iana",
    extensions: [
      "cdmia"
    ]
  },
  "application/cdmi-container": {
    source: "iana",
    extensions: [
      "cdmic"
    ]
  },
  "application/cdmi-domain": {
    source: "iana",
    extensions: [
      "cdmid"
    ]
  },
  "application/cdmi-object": {
    source: "iana",
    extensions: [
      "cdmio"
    ]
  },
  "application/cdmi-queue": {
    source: "iana",
    extensions: [
      "cdmiq"
    ]
  },
  "application/cdni": {
    source: "iana"
  },
  "application/cea": {
    source: "iana"
  },
  "application/cea-2018+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cellml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cfw": {
    source: "iana"
  },
  "application/city+json": {
    source: "iana",
    compressible: !0
  },
  "application/clr": {
    source: "iana"
  },
  "application/clue+xml": {
    source: "iana",
    compressible: !0
  },
  "application/clue_info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cms": {
    source: "iana"
  },
  "application/cnrp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/coap-group+json": {
    source: "iana",
    compressible: !0
  },
  "application/coap-payload": {
    source: "iana"
  },
  "application/commonground": {
    source: "iana"
  },
  "application/conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cose": {
    source: "iana"
  },
  "application/cose-key": {
    source: "iana"
  },
  "application/cose-key-set": {
    source: "iana"
  },
  "application/cpl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cpl"
    ]
  },
  "application/csrattrs": {
    source: "iana"
  },
  "application/csta+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cstadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/csvm+json": {
    source: "iana",
    compressible: !0
  },
  "application/cu-seeme": {
    source: "apache",
    extensions: [
      "cu"
    ]
  },
  "application/cwt": {
    source: "iana"
  },
  "application/cybercash": {
    source: "iana"
  },
  "application/dart": {
    compressible: !0
  },
  "application/dash+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpd"
    ]
  },
  "application/dash-patch+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpp"
    ]
  },
  "application/dashdelta": {
    source: "iana"
  },
  "application/davmount+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "davmount"
    ]
  },
  "application/dca-rft": {
    source: "iana"
  },
  "application/dcd": {
    source: "iana"
  },
  "application/dec-dx": {
    source: "iana"
  },
  "application/dialog-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dicom": {
    source: "iana"
  },
  "application/dicom+json": {
    source: "iana",
    compressible: !0
  },
  "application/dicom+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dii": {
    source: "iana"
  },
  "application/dit": {
    source: "iana"
  },
  "application/dns": {
    source: "iana"
  },
  "application/dns+json": {
    source: "iana",
    compressible: !0
  },
  "application/dns-message": {
    source: "iana"
  },
  "application/docbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dbk"
    ]
  },
  "application/dots+cbor": {
    source: "iana"
  },
  "application/dskpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dssc+der": {
    source: "iana",
    extensions: [
      "dssc"
    ]
  },
  "application/dssc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdssc"
    ]
  },
  "application/dvcs": {
    source: "iana"
  },
  "application/ecmascript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es",
      "ecma"
    ]
  },
  "application/edi-consent": {
    source: "iana"
  },
  "application/edi-x12": {
    source: "iana",
    compressible: !1
  },
  "application/edifact": {
    source: "iana",
    compressible: !1
  },
  "application/efi": {
    source: "iana"
  },
  "application/elm+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/elm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.cap+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/emergencycalldata.comment+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.deviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.ecall.msd": {
    source: "iana"
  },
  "application/emergencycalldata.providerinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.serviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.subscriberinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.veds+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emma+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emma"
    ]
  },
  "application/emotionml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emotionml"
    ]
  },
  "application/encaprtp": {
    source: "iana"
  },
  "application/epp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/epub+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "epub"
    ]
  },
  "application/eshop": {
    source: "iana"
  },
  "application/exi": {
    source: "iana",
    extensions: [
      "exi"
    ]
  },
  "application/expect-ct-report+json": {
    source: "iana",
    compressible: !0
  },
  "application/express": {
    source: "iana",
    extensions: [
      "exp"
    ]
  },
  "application/fastinfoset": {
    source: "iana"
  },
  "application/fastsoap": {
    source: "iana"
  },
  "application/fdt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fdt"
    ]
  },
  "application/fhir+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fhir+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fido.trusted-apps+json": {
    compressible: !0
  },
  "application/fits": {
    source: "iana"
  },
  "application/flexfec": {
    source: "iana"
  },
  "application/font-sfnt": {
    source: "iana"
  },
  "application/font-tdpfr": {
    source: "iana",
    extensions: [
      "pfr"
    ]
  },
  "application/font-woff": {
    source: "iana",
    compressible: !1
  },
  "application/framework-attributes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/geo+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "geojson"
    ]
  },
  "application/geo+json-seq": {
    source: "iana"
  },
  "application/geopackage+sqlite3": {
    source: "iana"
  },
  "application/geoxacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/gltf-buffer": {
    source: "iana"
  },
  "application/gml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gml"
    ]
  },
  "application/gpx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "gpx"
    ]
  },
  "application/gxf": {
    source: "apache",
    extensions: [
      "gxf"
    ]
  },
  "application/gzip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gz"
    ]
  },
  "application/h224": {
    source: "iana"
  },
  "application/held+xml": {
    source: "iana",
    compressible: !0
  },
  "application/hjson": {
    extensions: [
      "hjson"
    ]
  },
  "application/http": {
    source: "iana"
  },
  "application/hyperstudio": {
    source: "iana",
    extensions: [
      "stk"
    ]
  },
  "application/ibe-key-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pkg-reply+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pp-data": {
    source: "iana"
  },
  "application/iges": {
    source: "iana"
  },
  "application/im-iscomposing+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/index": {
    source: "iana"
  },
  "application/index.cmd": {
    source: "iana"
  },
  "application/index.obj": {
    source: "iana"
  },
  "application/index.response": {
    source: "iana"
  },
  "application/index.vnd": {
    source: "iana"
  },
  "application/inkml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ink",
      "inkml"
    ]
  },
  "application/iotp": {
    source: "iana"
  },
  "application/ipfix": {
    source: "iana",
    extensions: [
      "ipfix"
    ]
  },
  "application/ipp": {
    source: "iana"
  },
  "application/isup": {
    source: "iana"
  },
  "application/its+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "its"
    ]
  },
  "application/java-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    source: "apache",
    compressible: !1,
    extensions: [
      "ser"
    ]
  },
  "application/java-vm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "class"
    ]
  },
  "application/javascript": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "js",
      "mjs"
    ]
  },
  "application/jf2feed+json": {
    source: "iana",
    compressible: !0
  },
  "application/jose": {
    source: "iana"
  },
  "application/jose+json": {
    source: "iana",
    compressible: !0
  },
  "application/jrd+json": {
    source: "iana",
    compressible: !0
  },
  "application/jscalendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "json",
      "map"
    ]
  },
  "application/json-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/json-seq": {
    source: "iana"
  },
  "application/json5": {
    extensions: [
      "json5"
    ]
  },
  "application/jsonml+json": {
    source: "apache",
    compressible: !0,
    extensions: [
      "jsonml"
    ]
  },
  "application/jwk+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwk-set+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwt": {
    source: "iana"
  },
  "application/kpml-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/kpml-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ld+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "jsonld"
    ]
  },
  "application/lgr+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lgr"
    ]
  },
  "application/link-format": {
    source: "iana"
  },
  "application/load-control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lost+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lostxml"
    ]
  },
  "application/lostsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lpf+zip": {
    source: "iana",
    compressible: !1
  },
  "application/lxf": {
    source: "iana"
  },
  "application/mac-binhex40": {
    source: "iana",
    extensions: [
      "hqx"
    ]
  },
  "application/mac-compactpro": {
    source: "apache",
    extensions: [
      "cpt"
    ]
  },
  "application/macwriteii": {
    source: "iana"
  },
  "application/mads+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mads"
    ]
  },
  "application/manifest+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "webmanifest"
    ]
  },
  "application/marc": {
    source: "iana",
    extensions: [
      "mrc"
    ]
  },
  "application/marcxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mrcx"
    ]
  },
  "application/mathematica": {
    source: "iana",
    extensions: [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mathml"
    ]
  },
  "application/mathml-content+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mathml-presentation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-associated-procedure-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-deregister+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-envelope+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-protection-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-reception-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-schedule+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-user-service-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbox": {
    source: "iana",
    extensions: [
      "mbox"
    ]
  },
  "application/media-policy-dataset+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpf"
    ]
  },
  "application/media_control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mediaservercontrol+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mscml"
    ]
  },
  "application/merge-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/metalink+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "metalink"
    ]
  },
  "application/metalink4+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "meta4"
    ]
  },
  "application/mets+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mets"
    ]
  },
  "application/mf4": {
    source: "iana"
  },
  "application/mikey": {
    source: "iana"
  },
  "application/mipc": {
    source: "iana"
  },
  "application/missing-blocks+cbor-seq": {
    source: "iana"
  },
  "application/mmt-aei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "maei"
    ]
  },
  "application/mmt-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musd"
    ]
  },
  "application/mods+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mods"
    ]
  },
  "application/moss-keys": {
    source: "iana"
  },
  "application/moss-signature": {
    source: "iana"
  },
  "application/mosskey-data": {
    source: "iana"
  },
  "application/mosskey-request": {
    source: "iana"
  },
  "application/mp21": {
    source: "iana",
    extensions: [
      "m21",
      "mp21"
    ]
  },
  "application/mp4": {
    source: "iana",
    extensions: [
      "mp4s",
      "m4p"
    ]
  },
  "application/mpeg4-generic": {
    source: "iana"
  },
  "application/mpeg4-iod": {
    source: "iana"
  },
  "application/mpeg4-iod-xmt": {
    source: "iana"
  },
  "application/mrb-consumer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mrb-publish+xml": {
    source: "iana",
    compressible: !0
  },
  "application/msc-ivr+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msc-mixer+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msword": {
    source: "iana",
    compressible: !1,
    extensions: [
      "doc",
      "dot"
    ]
  },
  "application/mud+json": {
    source: "iana",
    compressible: !0
  },
  "application/multipart-core": {
    source: "iana"
  },
  "application/mxf": {
    source: "iana",
    extensions: [
      "mxf"
    ]
  },
  "application/n-quads": {
    source: "iana",
    extensions: [
      "nq"
    ]
  },
  "application/n-triples": {
    source: "iana",
    extensions: [
      "nt"
    ]
  },
  "application/nasdata": {
    source: "iana"
  },
  "application/news-checkgroups": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-groupinfo": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-transmission": {
    source: "iana"
  },
  "application/nlsml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/node": {
    source: "iana",
    extensions: [
      "cjs"
    ]
  },
  "application/nss": {
    source: "iana"
  },
  "application/oauth-authz-req+jwt": {
    source: "iana"
  },
  "application/oblivious-dns-message": {
    source: "iana"
  },
  "application/ocsp-request": {
    source: "iana"
  },
  "application/ocsp-response": {
    source: "iana"
  },
  "application/octet-stream": {
    source: "iana",
    compressible: !1,
    extensions: [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    source: "iana",
    extensions: [
      "oda"
    ]
  },
  "application/odm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/odx": {
    source: "iana"
  },
  "application/oebps-package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "opf"
    ]
  },
  "application/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogx"
    ]
  },
  "application/omdoc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "omdoc"
    ]
  },
  "application/onenote": {
    source: "apache",
    extensions: [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/opc-nodeset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/oscore": {
    source: "iana"
  },
  "application/oxps": {
    source: "iana",
    extensions: [
      "oxps"
    ]
  },
  "application/p21": {
    source: "iana"
  },
  "application/p21+zip": {
    source: "iana",
    compressible: !1
  },
  "application/p2p-overlay+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "relo"
    ]
  },
  "application/parityfec": {
    source: "iana"
  },
  "application/passport": {
    source: "iana"
  },
  "application/patch-ops-error+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xer"
    ]
  },
  "application/pdf": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pdf"
    ]
  },
  "application/pdx": {
    source: "iana"
  },
  "application/pem-certificate-chain": {
    source: "iana"
  },
  "application/pgp-encrypted": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pgp"
    ]
  },
  "application/pgp-keys": {
    source: "iana",
    extensions: [
      "asc"
    ]
  },
  "application/pgp-signature": {
    source: "iana",
    extensions: [
      "asc",
      "sig"
    ]
  },
  "application/pics-rules": {
    source: "apache",
    extensions: [
      "prf"
    ]
  },
  "application/pidf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pidf-diff+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pkcs10": {
    source: "iana",
    extensions: [
      "p10"
    ]
  },
  "application/pkcs12": {
    source: "iana"
  },
  "application/pkcs7-mime": {
    source: "iana",
    extensions: [
      "p7m",
      "p7c"
    ]
  },
  "application/pkcs7-signature": {
    source: "iana",
    extensions: [
      "p7s"
    ]
  },
  "application/pkcs8": {
    source: "iana",
    extensions: [
      "p8"
    ]
  },
  "application/pkcs8-encrypted": {
    source: "iana"
  },
  "application/pkix-attr-cert": {
    source: "iana",
    extensions: [
      "ac"
    ]
  },
  "application/pkix-cert": {
    source: "iana",
    extensions: [
      "cer"
    ]
  },
  "application/pkix-crl": {
    source: "iana",
    extensions: [
      "crl"
    ]
  },
  "application/pkix-pkipath": {
    source: "iana",
    extensions: [
      "pkipath"
    ]
  },
  "application/pkixcmp": {
    source: "iana",
    extensions: [
      "pki"
    ]
  },
  "application/pls+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pls"
    ]
  },
  "application/poc-settings+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/postscript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/ppsp-tracker+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/provenance+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "provx"
    ]
  },
  "application/prs.alvestrand.titrax-sheet": {
    source: "iana"
  },
  "application/prs.cww": {
    source: "iana",
    extensions: [
      "cww"
    ]
  },
  "application/prs.cyn": {
    source: "iana",
    charset: "7-BIT"
  },
  "application/prs.hpub+zip": {
    source: "iana",
    compressible: !1
  },
  "application/prs.nprend": {
    source: "iana"
  },
  "application/prs.plucker": {
    source: "iana"
  },
  "application/prs.rdf-xml-crypt": {
    source: "iana"
  },
  "application/prs.xsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/pskc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pskcxml"
    ]
  },
  "application/pvd+json": {
    source: "iana",
    compressible: !0
  },
  "application/qsig": {
    source: "iana"
  },
  "application/raml+yaml": {
    compressible: !0,
    extensions: [
      "raml"
    ]
  },
  "application/raptorfec": {
    source: "iana"
  },
  "application/rdap+json": {
    source: "iana",
    compressible: !0
  },
  "application/rdf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rdf",
      "owl"
    ]
  },
  "application/reginfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rif"
    ]
  },
  "application/relax-ng-compact-syntax": {
    source: "iana",
    extensions: [
      "rnc"
    ]
  },
  "application/remote-printing": {
    source: "iana"
  },
  "application/reputon+json": {
    source: "iana",
    compressible: !0
  },
  "application/resource-lists+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rl"
    ]
  },
  "application/resource-lists-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rld"
    ]
  },
  "application/rfc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/riscos": {
    source: "iana"
  },
  "application/rlmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/rls-services+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rs"
    ]
  },
  "application/route-apd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rapd"
    ]
  },
  "application/route-s-tsid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sls"
    ]
  },
  "application/route-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rusd"
    ]
  },
  "application/rpki-ghostbusters": {
    source: "iana",
    extensions: [
      "gbr"
    ]
  },
  "application/rpki-manifest": {
    source: "iana",
    extensions: [
      "mft"
    ]
  },
  "application/rpki-publication": {
    source: "iana"
  },
  "application/rpki-roa": {
    source: "iana",
    extensions: [
      "roa"
    ]
  },
  "application/rpki-updown": {
    source: "iana"
  },
  "application/rsd+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rsd"
    ]
  },
  "application/rss+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rss"
    ]
  },
  "application/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "application/rtploopback": {
    source: "iana"
  },
  "application/rtx": {
    source: "iana"
  },
  "application/samlassertion+xml": {
    source: "iana",
    compressible: !0
  },
  "application/samlmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sarif+json": {
    source: "iana",
    compressible: !0
  },
  "application/sarif-external-properties+json": {
    source: "iana",
    compressible: !0
  },
  "application/sbe": {
    source: "iana"
  },
  "application/sbml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sbml"
    ]
  },
  "application/scaip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/scim+json": {
    source: "iana",
    compressible: !0
  },
  "application/scvp-cv-request": {
    source: "iana",
    extensions: [
      "scq"
    ]
  },
  "application/scvp-cv-response": {
    source: "iana",
    extensions: [
      "scs"
    ]
  },
  "application/scvp-vp-request": {
    source: "iana",
    extensions: [
      "spq"
    ]
  },
  "application/scvp-vp-response": {
    source: "iana",
    extensions: [
      "spp"
    ]
  },
  "application/sdp": {
    source: "iana",
    extensions: [
      "sdp"
    ]
  },
  "application/secevent+jwt": {
    source: "iana"
  },
  "application/senml+cbor": {
    source: "iana"
  },
  "application/senml+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "senmlx"
    ]
  },
  "application/senml-etch+cbor": {
    source: "iana"
  },
  "application/senml-etch+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml-exi": {
    source: "iana"
  },
  "application/sensml+cbor": {
    source: "iana"
  },
  "application/sensml+json": {
    source: "iana",
    compressible: !0
  },
  "application/sensml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sensmlx"
    ]
  },
  "application/sensml-exi": {
    source: "iana"
  },
  "application/sep+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sep-exi": {
    source: "iana"
  },
  "application/session-info": {
    source: "iana"
  },
  "application/set-payment": {
    source: "iana"
  },
  "application/set-payment-initiation": {
    source: "iana",
    extensions: [
      "setpay"
    ]
  },
  "application/set-registration": {
    source: "iana"
  },
  "application/set-registration-initiation": {
    source: "iana",
    extensions: [
      "setreg"
    ]
  },
  "application/sgml": {
    source: "iana"
  },
  "application/sgml-open-catalog": {
    source: "iana"
  },
  "application/shf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "shf"
    ]
  },
  "application/sieve": {
    source: "iana",
    extensions: [
      "siv",
      "sieve"
    ]
  },
  "application/simple-filter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/simple-message-summary": {
    source: "iana"
  },
  "application/simplesymbolcontainer": {
    source: "iana"
  },
  "application/sipc": {
    source: "iana"
  },
  "application/slate": {
    source: "iana"
  },
  "application/smil": {
    source: "iana"
  },
  "application/smil+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "smi",
      "smil"
    ]
  },
  "application/smpte336m": {
    source: "iana"
  },
  "application/soap+fastinfoset": {
    source: "iana"
  },
  "application/soap+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sparql-query": {
    source: "iana",
    extensions: [
      "rq"
    ]
  },
  "application/sparql-results+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "srx"
    ]
  },
  "application/spdx+json": {
    source: "iana",
    compressible: !0
  },
  "application/spirits-event+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sql": {
    source: "iana"
  },
  "application/srgs": {
    source: "iana",
    extensions: [
      "gram"
    ]
  },
  "application/srgs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "grxml"
    ]
  },
  "application/sru+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sru"
    ]
  },
  "application/ssdl+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ssdl"
    ]
  },
  "application/ssml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ssml"
    ]
  },
  "application/stix+json": {
    source: "iana",
    compressible: !0
  },
  "application/swid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "swidtag"
    ]
  },
  "application/tamp-apex-update": {
    source: "iana"
  },
  "application/tamp-apex-update-confirm": {
    source: "iana"
  },
  "application/tamp-community-update": {
    source: "iana"
  },
  "application/tamp-community-update-confirm": {
    source: "iana"
  },
  "application/tamp-error": {
    source: "iana"
  },
  "application/tamp-sequence-adjust": {
    source: "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    source: "iana"
  },
  "application/tamp-status-query": {
    source: "iana"
  },
  "application/tamp-status-response": {
    source: "iana"
  },
  "application/tamp-update": {
    source: "iana"
  },
  "application/tamp-update-confirm": {
    source: "iana"
  },
  "application/tar": {
    compressible: !0
  },
  "application/taxii+json": {
    source: "iana",
    compressible: !0
  },
  "application/td+json": {
    source: "iana",
    compressible: !0
  },
  "application/tei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tei",
      "teicorpus"
    ]
  },
  "application/tetra_isi": {
    source: "iana"
  },
  "application/thraud+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tfi"
    ]
  },
  "application/timestamp-query": {
    source: "iana"
  },
  "application/timestamp-reply": {
    source: "iana"
  },
  "application/timestamped-data": {
    source: "iana",
    extensions: [
      "tsd"
    ]
  },
  "application/tlsrpt+gzip": {
    source: "iana"
  },
  "application/tlsrpt+json": {
    source: "iana",
    compressible: !0
  },
  "application/tnauthlist": {
    source: "iana"
  },
  "application/token-introspection+jwt": {
    source: "iana"
  },
  "application/toml": {
    compressible: !0,
    extensions: [
      "toml"
    ]
  },
  "application/trickle-ice-sdpfrag": {
    source: "iana"
  },
  "application/trig": {
    source: "iana",
    extensions: [
      "trig"
    ]
  },
  "application/ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttml"
    ]
  },
  "application/tve-trigger": {
    source: "iana"
  },
  "application/tzif": {
    source: "iana"
  },
  "application/tzif-leap": {
    source: "iana"
  },
  "application/ubjson": {
    compressible: !1,
    extensions: [
      "ubj"
    ]
  },
  "application/ulpfec": {
    source: "iana"
  },
  "application/urc-grpsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/urc-ressheet+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsheet"
    ]
  },
  "application/urc-targetdesc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "td"
    ]
  },
  "application/urc-uisocketdesc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+json": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vemmi": {
    source: "iana"
  },
  "application/vividence.scriptfile": {
    source: "apache"
  },
  "application/vnd.1000minds.decision-model+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "1km"
    ]
  },
  "application/vnd.3gpp-prose+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-prose-pc3ch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-v2x-local-service-information": {
    source: "iana"
  },
  "application/vnd.3gpp.5gnas": {
    source: "iana"
  },
  "application/vnd.3gpp.access-transfer-events+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.bsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gmop+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gtpc": {
    source: "iana"
  },
  "application/vnd.3gpp.interworking-data": {
    source: "iana"
  },
  "application/vnd.3gpp.lpp": {
    source: "iana"
  },
  "application/vnd.3gpp.mc-signalling-ear": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-payload": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-signalling": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-floor-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-signed+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mid-call+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ngap": {
    source: "iana"
  },
  "application/vnd.3gpp.pfcp": {
    source: "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    source: "iana",
    extensions: [
      "plb"
    ]
  },
  "application/vnd.3gpp.pic-bw-small": {
    source: "iana",
    extensions: [
      "psb"
    ]
  },
  "application/vnd.3gpp.pic-bw-var": {
    source: "iana",
    extensions: [
      "pvb"
    ]
  },
  "application/vnd.3gpp.s1ap": {
    source: "iana"
  },
  "application/vnd.3gpp.sms": {
    source: "iana"
  },
  "application/vnd.3gpp.sms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-ext+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.state-and-event-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ussd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.sms": {
    source: "iana"
  },
  "application/vnd.3gpp2.tcap": {
    source: "iana",
    extensions: [
      "tcap"
    ]
  },
  "application/vnd.3lightssoftware.imagescal": {
    source: "iana"
  },
  "application/vnd.3m.post-it-notes": {
    source: "iana",
    extensions: [
      "pwn"
    ]
  },
  "application/vnd.accpac.simply.aso": {
    source: "iana",
    extensions: [
      "aso"
    ]
  },
  "application/vnd.accpac.simply.imp": {
    source: "iana",
    extensions: [
      "imp"
    ]
  },
  "application/vnd.acucobol": {
    source: "iana",
    extensions: [
      "acu"
    ]
  },
  "application/vnd.acucorp": {
    source: "iana",
    extensions: [
      "atc",
      "acutc"
    ]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "air"
    ]
  },
  "application/vnd.adobe.flash.movie": {
    source: "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    source: "iana",
    extensions: [
      "fcdt"
    ]
  },
  "application/vnd.adobe.fxp": {
    source: "iana",
    extensions: [
      "fxp",
      "fxpl"
    ]
  },
  "application/vnd.adobe.partial-upload": {
    source: "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdp"
    ]
  },
  "application/vnd.adobe.xfdf": {
    source: "iana",
    extensions: [
      "xfdf"
    ]
  },
  "application/vnd.aether.imp": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata-pagedef": {
    source: "iana"
  },
  "application/vnd.afpc.cmoca-cmresource": {
    source: "iana"
  },
  "application/vnd.afpc.foca-charset": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codedfont": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codepage": {
    source: "iana"
  },
  "application/vnd.afpc.modca": {
    source: "iana"
  },
  "application/vnd.afpc.modca-cmtable": {
    source: "iana"
  },
  "application/vnd.afpc.modca-formdef": {
    source: "iana"
  },
  "application/vnd.afpc.modca-mediummap": {
    source: "iana"
  },
  "application/vnd.afpc.modca-objectcontainer": {
    source: "iana"
  },
  "application/vnd.afpc.modca-overlay": {
    source: "iana"
  },
  "application/vnd.afpc.modca-pagesegment": {
    source: "iana"
  },
  "application/vnd.age": {
    source: "iana",
    extensions: [
      "age"
    ]
  },
  "application/vnd.ah-barcode": {
    source: "iana"
  },
  "application/vnd.ahead.space": {
    source: "iana",
    extensions: [
      "ahead"
    ]
  },
  "application/vnd.airzip.filesecure.azf": {
    source: "iana",
    extensions: [
      "azf"
    ]
  },
  "application/vnd.airzip.filesecure.azs": {
    source: "iana",
    extensions: [
      "azs"
    ]
  },
  "application/vnd.amadeus+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.amazon.ebook": {
    source: "apache",
    extensions: [
      "azw"
    ]
  },
  "application/vnd.amazon.mobi8-ebook": {
    source: "iana"
  },
  "application/vnd.americandynamics.acc": {
    source: "iana",
    extensions: [
      "acc"
    ]
  },
  "application/vnd.amiga.ami": {
    source: "iana",
    extensions: [
      "ami"
    ]
  },
  "application/vnd.amundsen.maze+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.android.ota": {
    source: "iana"
  },
  "application/vnd.android.package-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "apk"
    ]
  },
  "application/vnd.anki": {
    source: "iana"
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    source: "iana",
    extensions: [
      "cii"
    ]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    source: "apache",
    extensions: [
      "fti"
    ]
  },
  "application/vnd.antix.game-component": {
    source: "iana",
    extensions: [
      "atx"
    ]
  },
  "application/vnd.apache.arrow.file": {
    source: "iana"
  },
  "application/vnd.apache.arrow.stream": {
    source: "iana"
  },
  "application/vnd.apache.thrift.binary": {
    source: "iana"
  },
  "application/vnd.apache.thrift.compact": {
    source: "iana"
  },
  "application/vnd.apache.thrift.json": {
    source: "iana"
  },
  "application/vnd.api+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.aplextor.warrp+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apothekende.reservation+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apple.installer+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpkg"
    ]
  },
  "application/vnd.apple.keynote": {
    source: "iana",
    extensions: [
      "key"
    ]
  },
  "application/vnd.apple.mpegurl": {
    source: "iana",
    extensions: [
      "m3u8"
    ]
  },
  "application/vnd.apple.numbers": {
    source: "iana",
    extensions: [
      "numbers"
    ]
  },
  "application/vnd.apple.pages": {
    source: "iana",
    extensions: [
      "pages"
    ]
  },
  "application/vnd.apple.pkpass": {
    compressible: !1,
    extensions: [
      "pkpass"
    ]
  },
  "application/vnd.arastra.swi": {
    source: "iana"
  },
  "application/vnd.aristanetworks.swi": {
    source: "iana",
    extensions: [
      "swi"
    ]
  },
  "application/vnd.artisan+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.artsquare": {
    source: "iana"
  },
  "application/vnd.astraea-software.iota": {
    source: "iana",
    extensions: [
      "iota"
    ]
  },
  "application/vnd.audiograph": {
    source: "iana",
    extensions: [
      "aep"
    ]
  },
  "application/vnd.autopackage": {
    source: "iana"
  },
  "application/vnd.avalon+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.avistar+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.balsamiq.bmml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmml"
    ]
  },
  "application/vnd.balsamiq.bmpr": {
    source: "iana"
  },
  "application/vnd.banana-accounting": {
    source: "iana"
  },
  "application/vnd.bbf.usp.error": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bekitzur-stech+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bint.med-content": {
    source: "iana"
  },
  "application/vnd.biopax.rdf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.blink-idb-value-wrapper": {
    source: "iana"
  },
  "application/vnd.blueice.multipass": {
    source: "iana",
    extensions: [
      "mpm"
    ]
  },
  "application/vnd.bluetooth.ep.oob": {
    source: "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    source: "iana"
  },
  "application/vnd.bmi": {
    source: "iana",
    extensions: [
      "bmi"
    ]
  },
  "application/vnd.bpf": {
    source: "iana"
  },
  "application/vnd.bpf3": {
    source: "iana"
  },
  "application/vnd.businessobjects": {
    source: "iana",
    extensions: [
      "rep"
    ]
  },
  "application/vnd.byu.uapi+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cab-jscript": {
    source: "iana"
  },
  "application/vnd.canon-cpdl": {
    source: "iana"
  },
  "application/vnd.canon-lips": {
    source: "iana"
  },
  "application/vnd.capasystems-pg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    source: "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    source: "iana"
  },
  "application/vnd.chemdraw+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdxml"
    ]
  },
  "application/vnd.chess-pgn": {
    source: "iana"
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    source: "iana",
    extensions: [
      "mmd"
    ]
  },
  "application/vnd.ciedi": {
    source: "iana"
  },
  "application/vnd.cinderella": {
    source: "iana",
    extensions: [
      "cdy"
    ]
  },
  "application/vnd.cirpack.isdn-ext": {
    source: "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csl"
    ]
  },
  "application/vnd.claymore": {
    source: "iana",
    extensions: [
      "cla"
    ]
  },
  "application/vnd.cloanto.rp9": {
    source: "iana",
    extensions: [
      "rp9"
    ]
  },
  "application/vnd.clonk.c4group": {
    source: "iana",
    extensions: [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    source: "iana",
    extensions: [
      "c11amc"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    source: "iana",
    extensions: [
      "c11amz"
    ]
  },
  "application/vnd.coffeescript": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet-template": {
    source: "iana"
  },
  "application/vnd.collection+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.doc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.next+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.comicbook+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.comicbook-rar": {
    source: "iana"
  },
  "application/vnd.commerce-battelle": {
    source: "iana"
  },
  "application/vnd.commonspace": {
    source: "iana",
    extensions: [
      "csp"
    ]
  },
  "application/vnd.contact.cmsg": {
    source: "iana",
    extensions: [
      "cdbcmsg"
    ]
  },
  "application/vnd.coreos.ignition+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cosmocaller": {
    source: "iana",
    extensions: [
      "cmc"
    ]
  },
  "application/vnd.crick.clicker": {
    source: "iana",
    extensions: [
      "clkx"
    ]
  },
  "application/vnd.crick.clicker.keyboard": {
    source: "iana",
    extensions: [
      "clkk"
    ]
  },
  "application/vnd.crick.clicker.palette": {
    source: "iana",
    extensions: [
      "clkp"
    ]
  },
  "application/vnd.crick.clicker.template": {
    source: "iana",
    extensions: [
      "clkt"
    ]
  },
  "application/vnd.crick.clicker.wordbank": {
    source: "iana",
    extensions: [
      "clkw"
    ]
  },
  "application/vnd.criticaltools.wbs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wbs"
    ]
  },
  "application/vnd.cryptii.pipe+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.crypto-shade-file": {
    source: "iana"
  },
  "application/vnd.cryptomator.encrypted": {
    source: "iana"
  },
  "application/vnd.cryptomator.vault": {
    source: "iana"
  },
  "application/vnd.ctc-posml": {
    source: "iana",
    extensions: [
      "pml"
    ]
  },
  "application/vnd.ctct.ws+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cups-pdf": {
    source: "iana"
  },
  "application/vnd.cups-postscript": {
    source: "iana"
  },
  "application/vnd.cups-ppd": {
    source: "iana",
    extensions: [
      "ppd"
    ]
  },
  "application/vnd.cups-raster": {
    source: "iana"
  },
  "application/vnd.cups-raw": {
    source: "iana"
  },
  "application/vnd.curl": {
    source: "iana"
  },
  "application/vnd.curl.car": {
    source: "apache",
    extensions: [
      "car"
    ]
  },
  "application/vnd.curl.pcurl": {
    source: "apache",
    extensions: [
      "pcurl"
    ]
  },
  "application/vnd.cyan.dean.root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cybank": {
    source: "iana"
  },
  "application/vnd.cyclonedx+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cyclonedx+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.d2l.coursepackage1p0+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.d3m-dataset": {
    source: "iana"
  },
  "application/vnd.d3m-problem": {
    source: "iana"
  },
  "application/vnd.dart": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dart"
    ]
  },
  "application/vnd.data-vision.rdz": {
    source: "iana",
    extensions: [
      "rdz"
    ]
  },
  "application/vnd.datapackage+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dataresource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dbf": {
    source: "iana",
    extensions: [
      "dbf"
    ]
  },
  "application/vnd.debian.binary-package": {
    source: "iana"
  },
  "application/vnd.dece.data": {
    source: "iana",
    extensions: [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uvt",
      "uvvt"
    ]
  },
  "application/vnd.dece.unspecified": {
    source: "iana",
    extensions: [
      "uvx",
      "uvvx"
    ]
  },
  "application/vnd.dece.zip": {
    source: "iana",
    extensions: [
      "uvz",
      "uvvz"
    ]
  },
  "application/vnd.denovo.fcselayout-link": {
    source: "iana",
    extensions: [
      "fe_launch"
    ]
  },
  "application/vnd.desmume.movie": {
    source: "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    source: "iana"
  },
  "application/vnd.dm.delegation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dna": {
    source: "iana",
    extensions: [
      "dna"
    ]
  },
  "application/vnd.document+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dolby.mlp": {
    source: "apache",
    extensions: [
      "mlp"
    ]
  },
  "application/vnd.dolby.mobile.1": {
    source: "iana"
  },
  "application/vnd.dolby.mobile.2": {
    source: "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    source: "iana"
  },
  "application/vnd.dpgraph": {
    source: "iana",
    extensions: [
      "dpg"
    ]
  },
  "application/vnd.dreamfactory": {
    source: "iana",
    extensions: [
      "dfac"
    ]
  },
  "application/vnd.drive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ds-keypoint": {
    source: "apache",
    extensions: [
      "kpxx"
    ]
  },
  "application/vnd.dtg.local": {
    source: "iana"
  },
  "application/vnd.dtg.local.flash": {
    source: "iana"
  },
  "application/vnd.dtg.local.html": {
    source: "iana"
  },
  "application/vnd.dvb.ait": {
    source: "iana",
    extensions: [
      "ait"
    ]
  },
  "application/vnd.dvb.dvbisl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.dvbj": {
    source: "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    source: "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-container+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-generic+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-init+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.pfr": {
    source: "iana"
  },
  "application/vnd.dvb.service": {
    source: "iana",
    extensions: [
      "svc"
    ]
  },
  "application/vnd.dxr": {
    source: "iana"
  },
  "application/vnd.dynageo": {
    source: "iana",
    extensions: [
      "geo"
    ]
  },
  "application/vnd.dzr": {
    source: "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    source: "iana"
  },
  "application/vnd.ecdis-update": {
    source: "iana"
  },
  "application/vnd.ecip.rlp": {
    source: "iana"
  },
  "application/vnd.eclipse.ditto+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ecowin.chart": {
    source: "iana",
    extensions: [
      "mag"
    ]
  },
  "application/vnd.ecowin.filerequest": {
    source: "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    source: "iana"
  },
  "application/vnd.ecowin.series": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    source: "iana"
  },
  "application/vnd.efi.img": {
    source: "iana"
  },
  "application/vnd.efi.iso": {
    source: "iana"
  },
  "application/vnd.emclient.accessrequest+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.enliven": {
    source: "iana",
    extensions: [
      "nml"
    ]
  },
  "application/vnd.enphase.envoy": {
    source: "iana"
  },
  "application/vnd.eprints.data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.epson.esf": {
    source: "iana",
    extensions: [
      "esf"
    ]
  },
  "application/vnd.epson.msf": {
    source: "iana",
    extensions: [
      "msf"
    ]
  },
  "application/vnd.epson.quickanime": {
    source: "iana",
    extensions: [
      "qam"
    ]
  },
  "application/vnd.epson.salt": {
    source: "iana",
    extensions: [
      "slt"
    ]
  },
  "application/vnd.epson.ssf": {
    source: "iana",
    extensions: [
      "ssf"
    ]
  },
  "application/vnd.ericsson.quickcall": {
    source: "iana"
  },
  "application/vnd.espass-espass+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.eszigno3+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es3",
      "et3"
    ]
  },
  "application/vnd.etsi.aoc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.asic-e+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.asic-s+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.cug+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvcommand+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvservice+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mcid+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mheg5": {
    source: "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.pstn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.sci+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.simservs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.timestamp-token": {
    source: "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.tsl.der": {
    source: "iana"
  },
  "application/vnd.eu.kasparian.car+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.eudora.data": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.profile": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.settings": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.theme": {
    source: "iana"
  },
  "application/vnd.exstream-empower+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.exstream-package": {
    source: "iana"
  },
  "application/vnd.ezpix-album": {
    source: "iana",
    extensions: [
      "ez2"
    ]
  },
  "application/vnd.ezpix-package": {
    source: "iana",
    extensions: [
      "ez3"
    ]
  },
  "application/vnd.f-secure.mobile": {
    source: "iana"
  },
  "application/vnd.familysearch.gedcom+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.fastcopy-disk-image": {
    source: "iana"
  },
  "application/vnd.fdf": {
    source: "iana",
    extensions: [
      "fdf"
    ]
  },
  "application/vnd.fdsn.mseed": {
    source: "iana",
    extensions: [
      "mseed"
    ]
  },
  "application/vnd.fdsn.seed": {
    source: "iana",
    extensions: [
      "seed",
      "dataless"
    ]
  },
  "application/vnd.ffsns": {
    source: "iana"
  },
  "application/vnd.ficlab.flb+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.filmit.zfc": {
    source: "iana"
  },
  "application/vnd.fints": {
    source: "iana"
  },
  "application/vnd.firemonkeys.cloudcell": {
    source: "iana"
  },
  "application/vnd.flographit": {
    source: "iana",
    extensions: [
      "gph"
    ]
  },
  "application/vnd.fluxtime.clip": {
    source: "iana",
    extensions: [
      "ftc"
    ]
  },
  "application/vnd.font-fontforge-sfd": {
    source: "iana"
  },
  "application/vnd.framemaker": {
    source: "iana",
    extensions: [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.frogans.fnc": {
    source: "iana",
    extensions: [
      "fnc"
    ]
  },
  "application/vnd.frogans.ltf": {
    source: "iana",
    extensions: [
      "ltf"
    ]
  },
  "application/vnd.fsc.weblaunch": {
    source: "iana",
    extensions: [
      "fsc"
    ]
  },
  "application/vnd.fujifilm.fb.docuworks": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.binder": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.jfi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fujitsu.oasys": {
    source: "iana",
    extensions: [
      "oas"
    ]
  },
  "application/vnd.fujitsu.oasys2": {
    source: "iana",
    extensions: [
      "oa2"
    ]
  },
  "application/vnd.fujitsu.oasys3": {
    source: "iana",
    extensions: [
      "oa3"
    ]
  },
  "application/vnd.fujitsu.oasysgp": {
    source: "iana",
    extensions: [
      "fg5"
    ]
  },
  "application/vnd.fujitsu.oasysprs": {
    source: "iana",
    extensions: [
      "bh2"
    ]
  },
  "application/vnd.fujixerox.art-ex": {
    source: "iana"
  },
  "application/vnd.fujixerox.art4": {
    source: "iana"
  },
  "application/vnd.fujixerox.ddd": {
    source: "iana",
    extensions: [
      "ddd"
    ]
  },
  "application/vnd.fujixerox.docuworks": {
    source: "iana",
    extensions: [
      "xdw"
    ]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    source: "iana",
    extensions: [
      "xbd"
    ]
  },
  "application/vnd.fujixerox.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    source: "iana"
  },
  "application/vnd.fut-misnet": {
    source: "iana"
  },
  "application/vnd.futoin+cbor": {
    source: "iana"
  },
  "application/vnd.futoin+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fuzzysheet": {
    source: "iana",
    extensions: [
      "fzs"
    ]
  },
  "application/vnd.genomatix.tuxedo": {
    source: "iana",
    extensions: [
      "txd"
    ]
  },
  "application/vnd.gentics.grd+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geo+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geocube+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geogebra.file": {
    source: "iana",
    extensions: [
      "ggb"
    ]
  },
  "application/vnd.geogebra.slides": {
    source: "iana"
  },
  "application/vnd.geogebra.tool": {
    source: "iana",
    extensions: [
      "ggt"
    ]
  },
  "application/vnd.geometry-explorer": {
    source: "iana",
    extensions: [
      "gex",
      "gre"
    ]
  },
  "application/vnd.geonext": {
    source: "iana",
    extensions: [
      "gxt"
    ]
  },
  "application/vnd.geoplan": {
    source: "iana",
    extensions: [
      "g2w"
    ]
  },
  "application/vnd.geospace": {
    source: "iana",
    extensions: [
      "g3w"
    ]
  },
  "application/vnd.gerber": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    source: "iana"
  },
  "application/vnd.gmx": {
    source: "iana",
    extensions: [
      "gmx"
    ]
  },
  "application/vnd.google-apps.document": {
    compressible: !1,
    extensions: [
      "gdoc"
    ]
  },
  "application/vnd.google-apps.presentation": {
    compressible: !1,
    extensions: [
      "gslides"
    ]
  },
  "application/vnd.google-apps.spreadsheet": {
    compressible: !1,
    extensions: [
      "gsheet"
    ]
  },
  "application/vnd.google-earth.kml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "kml"
    ]
  },
  "application/vnd.google-earth.kmz": {
    source: "iana",
    compressible: !1,
    extensions: [
      "kmz"
    ]
  },
  "application/vnd.gov.sk.e-form+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.gov.sk.e-form+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.grafeq": {
    source: "iana",
    extensions: [
      "gqf",
      "gqs"
    ]
  },
  "application/vnd.gridmp": {
    source: "iana"
  },
  "application/vnd.groove-account": {
    source: "iana",
    extensions: [
      "gac"
    ]
  },
  "application/vnd.groove-help": {
    source: "iana",
    extensions: [
      "ghf"
    ]
  },
  "application/vnd.groove-identity-message": {
    source: "iana",
    extensions: [
      "gim"
    ]
  },
  "application/vnd.groove-injector": {
    source: "iana",
    extensions: [
      "grv"
    ]
  },
  "application/vnd.groove-tool-message": {
    source: "iana",
    extensions: [
      "gtm"
    ]
  },
  "application/vnd.groove-tool-template": {
    source: "iana",
    extensions: [
      "tpl"
    ]
  },
  "application/vnd.groove-vcard": {
    source: "iana",
    extensions: [
      "vcg"
    ]
  },
  "application/vnd.hal+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hal+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "hal"
    ]
  },
  "application/vnd.handheld-entertainment+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zmm"
    ]
  },
  "application/vnd.hbci": {
    source: "iana",
    extensions: [
      "hbci"
    ]
  },
  "application/vnd.hc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hcl-bireports": {
    source: "iana"
  },
  "application/vnd.hdt": {
    source: "iana"
  },
  "application/vnd.heroku+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hhe.lesson-player": {
    source: "iana",
    extensions: [
      "les"
    ]
  },
  "application/vnd.hl7cda+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hl7v2+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hp-hpgl": {
    source: "iana",
    extensions: [
      "hpgl"
    ]
  },
  "application/vnd.hp-hpid": {
    source: "iana",
    extensions: [
      "hpid"
    ]
  },
  "application/vnd.hp-hps": {
    source: "iana",
    extensions: [
      "hps"
    ]
  },
  "application/vnd.hp-jlyt": {
    source: "iana",
    extensions: [
      "jlt"
    ]
  },
  "application/vnd.hp-pcl": {
    source: "iana",
    extensions: [
      "pcl"
    ]
  },
  "application/vnd.hp-pclxl": {
    source: "iana",
    extensions: [
      "pclxl"
    ]
  },
  "application/vnd.httphone": {
    source: "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    source: "iana",
    extensions: [
      "sfd-hdstx"
    ]
  },
  "application/vnd.hyper+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyper-item+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyperdrive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hzn-3d-crossword": {
    source: "iana"
  },
  "application/vnd.ibm.afplinedata": {
    source: "iana"
  },
  "application/vnd.ibm.electronic-media": {
    source: "iana"
  },
  "application/vnd.ibm.minipay": {
    source: "iana",
    extensions: [
      "mpy"
    ]
  },
  "application/vnd.ibm.modcap": {
    source: "iana",
    extensions: [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    source: "iana",
    extensions: [
      "irm"
    ]
  },
  "application/vnd.ibm.secure-container": {
    source: "iana",
    extensions: [
      "sc"
    ]
  },
  "application/vnd.iccprofile": {
    source: "iana",
    extensions: [
      "icc",
      "icm"
    ]
  },
  "application/vnd.ieee.1905": {
    source: "iana"
  },
  "application/vnd.igloader": {
    source: "iana",
    extensions: [
      "igl"
    ]
  },
  "application/vnd.imagemeter.folder+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.imagemeter.image+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.immervision-ivp": {
    source: "iana",
    extensions: [
      "ivp"
    ]
  },
  "application/vnd.immervision-ivu": {
    source: "iana",
    extensions: [
      "ivu"
    ]
  },
  "application/vnd.ims.imsccv1p1": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    source: "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informedcontrol.rms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informix-visionary": {
    source: "iana"
  },
  "application/vnd.infotech.project": {
    source: "iana"
  },
  "application/vnd.infotech.project+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.innopath.wamp.notification": {
    source: "iana"
  },
  "application/vnd.insors.igm": {
    source: "iana",
    extensions: [
      "igm"
    ]
  },
  "application/vnd.intercon.formnet": {
    source: "iana",
    extensions: [
      "xpw",
      "xpx"
    ]
  },
  "application/vnd.intergeo": {
    source: "iana",
    extensions: [
      "i2g"
    ]
  },
  "application/vnd.intertrust.digibox": {
    source: "iana"
  },
  "application/vnd.intertrust.nncp": {
    source: "iana"
  },
  "application/vnd.intu.qbo": {
    source: "iana",
    extensions: [
      "qbo"
    ]
  },
  "application/vnd.intu.qfx": {
    source: "iana",
    extensions: [
      "qfx"
    ]
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ipunplugged.rcprofile": {
    source: "iana",
    extensions: [
      "rcprofile"
    ]
  },
  "application/vnd.irepository.package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "irp"
    ]
  },
  "application/vnd.is-xpr": {
    source: "iana",
    extensions: [
      "xpr"
    ]
  },
  "application/vnd.isac.fcs": {
    source: "iana",
    extensions: [
      "fcs"
    ]
  },
  "application/vnd.iso11783-10+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.jam": {
    source: "iana",
    extensions: [
      "jam"
    ]
  },
  "application/vnd.japannet-directory-service": {
    source: "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-registration": {
    source: "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-verification": {
    source: "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    source: "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    source: "iana",
    extensions: [
      "rms"
    ]
  },
  "application/vnd.jisp": {
    source: "iana",
    extensions: [
      "jisp"
    ]
  },
  "application/vnd.joost.joda-archive": {
    source: "iana",
    extensions: [
      "joda"
    ]
  },
  "application/vnd.jsk.isdn-ngn": {
    source: "iana"
  },
  "application/vnd.kahootz": {
    source: "iana",
    extensions: [
      "ktz",
      "ktr"
    ]
  },
  "application/vnd.kde.karbon": {
    source: "iana",
    extensions: [
      "karbon"
    ]
  },
  "application/vnd.kde.kchart": {
    source: "iana",
    extensions: [
      "chrt"
    ]
  },
  "application/vnd.kde.kformula": {
    source: "iana",
    extensions: [
      "kfo"
    ]
  },
  "application/vnd.kde.kivio": {
    source: "iana",
    extensions: [
      "flw"
    ]
  },
  "application/vnd.kde.kontour": {
    source: "iana",
    extensions: [
      "kon"
    ]
  },
  "application/vnd.kde.kpresenter": {
    source: "iana",
    extensions: [
      "kpr",
      "kpt"
    ]
  },
  "application/vnd.kde.kspread": {
    source: "iana",
    extensions: [
      "ksp"
    ]
  },
  "application/vnd.kde.kword": {
    source: "iana",
    extensions: [
      "kwd",
      "kwt"
    ]
  },
  "application/vnd.kenameaapp": {
    source: "iana",
    extensions: [
      "htke"
    ]
  },
  "application/vnd.kidspiration": {
    source: "iana",
    extensions: [
      "kia"
    ]
  },
  "application/vnd.kinar": {
    source: "iana",
    extensions: [
      "kne",
      "knp"
    ]
  },
  "application/vnd.koan": {
    source: "iana",
    extensions: [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    source: "iana",
    extensions: [
      "sse"
    ]
  },
  "application/vnd.las": {
    source: "iana"
  },
  "application/vnd.las.las+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.las.las+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lasxml"
    ]
  },
  "application/vnd.laszip": {
    source: "iana"
  },
  "application/vnd.leap+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.liberty-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    source: "iana",
    extensions: [
      "lbd"
    ]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lbe"
    ]
  },
  "application/vnd.logipipe.circuit+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.loom": {
    source: "iana"
  },
  "application/vnd.lotus-1-2-3": {
    source: "iana",
    extensions: [
      "123"
    ]
  },
  "application/vnd.lotus-approach": {
    source: "iana",
    extensions: [
      "apr"
    ]
  },
  "application/vnd.lotus-freelance": {
    source: "iana",
    extensions: [
      "pre"
    ]
  },
  "application/vnd.lotus-notes": {
    source: "iana",
    extensions: [
      "nsf"
    ]
  },
  "application/vnd.lotus-organizer": {
    source: "iana",
    extensions: [
      "org"
    ]
  },
  "application/vnd.lotus-screencam": {
    source: "iana",
    extensions: [
      "scm"
    ]
  },
  "application/vnd.lotus-wordpro": {
    source: "iana",
    extensions: [
      "lwp"
    ]
  },
  "application/vnd.macports.portpkg": {
    source: "iana",
    extensions: [
      "portpkg"
    ]
  },
  "application/vnd.mapbox-vector-tile": {
    source: "iana",
    extensions: [
      "mvt"
    ]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.license+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.mdcf": {
    source: "iana"
  },
  "application/vnd.mason+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.maxar.archive.3tz+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.maxmind.maxmind-db": {
    source: "iana"
  },
  "application/vnd.mcd": {
    source: "iana",
    extensions: [
      "mcd"
    ]
  },
  "application/vnd.medcalcdata": {
    source: "iana",
    extensions: [
      "mc1"
    ]
  },
  "application/vnd.mediastation.cdkey": {
    source: "iana",
    extensions: [
      "cdkey"
    ]
  },
  "application/vnd.meridian-slingshot": {
    source: "iana"
  },
  "application/vnd.mfer": {
    source: "iana",
    extensions: [
      "mwf"
    ]
  },
  "application/vnd.mfmp": {
    source: "iana",
    extensions: [
      "mfm"
    ]
  },
  "application/vnd.micro+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.micrografx.flo": {
    source: "iana",
    extensions: [
      "flo"
    ]
  },
  "application/vnd.micrografx.igx": {
    source: "iana",
    extensions: [
      "igx"
    ]
  },
  "application/vnd.microsoft.portable-executable": {
    source: "iana"
  },
  "application/vnd.microsoft.windows.thumbnail-cache": {
    source: "iana"
  },
  "application/vnd.miele+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.mif": {
    source: "iana",
    extensions: [
      "mif"
    ]
  },
  "application/vnd.minisoft-hp3000-save": {
    source: "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    source: "iana"
  },
  "application/vnd.mobius.daf": {
    source: "iana",
    extensions: [
      "daf"
    ]
  },
  "application/vnd.mobius.dis": {
    source: "iana",
    extensions: [
      "dis"
    ]
  },
  "application/vnd.mobius.mbk": {
    source: "iana",
    extensions: [
      "mbk"
    ]
  },
  "application/vnd.mobius.mqy": {
    source: "iana",
    extensions: [
      "mqy"
    ]
  },
  "application/vnd.mobius.msl": {
    source: "iana",
    extensions: [
      "msl"
    ]
  },
  "application/vnd.mobius.plc": {
    source: "iana",
    extensions: [
      "plc"
    ]
  },
  "application/vnd.mobius.txf": {
    source: "iana",
    extensions: [
      "txf"
    ]
  },
  "application/vnd.mophun.application": {
    source: "iana",
    extensions: [
      "mpn"
    ]
  },
  "application/vnd.mophun.certificate": {
    source: "iana",
    extensions: [
      "mpc"
    ]
  },
  "application/vnd.motorola.flexsuite": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    source: "iana"
  },
  "application/vnd.motorola.iprm": {
    source: "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xul"
    ]
  },
  "application/vnd.ms-3mfdocument": {
    source: "iana"
  },
  "application/vnd.ms-artgalry": {
    source: "iana",
    extensions: [
      "cil"
    ]
  },
  "application/vnd.ms-asf": {
    source: "iana"
  },
  "application/vnd.ms-cab-compressed": {
    source: "iana",
    extensions: [
      "cab"
    ]
  },
  "application/vnd.ms-color.iccprofile": {
    source: "apache"
  },
  "application/vnd.ms-excel": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlam"
    ]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsb"
    ]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsm"
    ]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "xltm"
    ]
  },
  "application/vnd.ms-fontobject": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eot"
    ]
  },
  "application/vnd.ms-htmlhelp": {
    source: "iana",
    extensions: [
      "chm"
    ]
  },
  "application/vnd.ms-ims": {
    source: "iana",
    extensions: [
      "ims"
    ]
  },
  "application/vnd.ms-lrm": {
    source: "iana",
    extensions: [
      "lrm"
    ]
  },
  "application/vnd.ms-office.activex+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-officetheme": {
    source: "iana",
    extensions: [
      "thmx"
    ]
  },
  "application/vnd.ms-opentype": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-outlook": {
    compressible: !1,
    extensions: [
      "msg"
    ]
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    source: "apache"
  },
  "application/vnd.ms-pki.seccat": {
    source: "apache",
    extensions: [
      "cat"
    ]
  },
  "application/vnd.ms-pki.stl": {
    source: "apache",
    extensions: [
      "stl"
    ]
  },
  "application/vnd.ms-playready.initiator+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-powerpoint": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppam"
    ]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    source: "iana",
    extensions: [
      "pptm"
    ]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    source: "iana",
    extensions: [
      "sldm"
    ]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppsm"
    ]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "potm"
    ]
  },
  "application/vnd.ms-printdevicecapabilities+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-printing.printticket+xml": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-printschematicket+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-project": {
    source: "iana",
    extensions: [
      "mpp",
      "mpt"
    ]
  },
  "application/vnd.ms-tnef": {
    source: "iana"
  },
  "application/vnd.ms-windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.nwprinting.oob": {
    source: "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.wsd.oob": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    source: "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    source: "iana",
    extensions: [
      "docm"
    ]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "dotm"
    ]
  },
  "application/vnd.ms-works": {
    source: "iana",
    extensions: [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    source: "iana",
    extensions: [
      "wpl"
    ]
  },
  "application/vnd.ms-xpsdocument": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xps"
    ]
  },
  "application/vnd.msa-disk-image": {
    source: "iana"
  },
  "application/vnd.mseq": {
    source: "iana",
    extensions: [
      "mseq"
    ]
  },
  "application/vnd.msign": {
    source: "iana"
  },
  "application/vnd.multiad.creator": {
    source: "iana"
  },
  "application/vnd.multiad.creator.cif": {
    source: "iana"
  },
  "application/vnd.music-niff": {
    source: "iana"
  },
  "application/vnd.musician": {
    source: "iana",
    extensions: [
      "mus"
    ]
  },
  "application/vnd.muvee.style": {
    source: "iana",
    extensions: [
      "msty"
    ]
  },
  "application/vnd.mynfc": {
    source: "iana",
    extensions: [
      "taglet"
    ]
  },
  "application/vnd.nacamar.ybrid+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ncd.control": {
    source: "iana"
  },
  "application/vnd.ncd.reference": {
    source: "iana"
  },
  "application/vnd.nearst.inv+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nebumind.line": {
    source: "iana"
  },
  "application/vnd.nervana": {
    source: "iana"
  },
  "application/vnd.netfpx": {
    source: "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    source: "iana",
    extensions: [
      "nlu"
    ]
  },
  "application/vnd.nimn": {
    source: "iana"
  },
  "application/vnd.nintendo.nitro.rom": {
    source: "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    source: "iana"
  },
  "application/vnd.nitf": {
    source: "iana",
    extensions: [
      "ntf",
      "nitf"
    ]
  },
  "application/vnd.noblenet-directory": {
    source: "iana",
    extensions: [
      "nnd"
    ]
  },
  "application/vnd.noblenet-sealer": {
    source: "iana",
    extensions: [
      "nns"
    ]
  },
  "application/vnd.noblenet-web": {
    source: "iana",
    extensions: [
      "nnw"
    ]
  },
  "application/vnd.nokia.catalogs": {
    source: "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.conml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.iptv.config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.isds-radio-presets": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ac"
    ]
  },
  "application/vnd.nokia.n-gage.data": {
    source: "iana",
    extensions: [
      "ngdat"
    ]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    source: "iana",
    extensions: [
      "n-gage"
    ]
  },
  "application/vnd.nokia.ncd": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.radio-preset": {
    source: "iana",
    extensions: [
      "rpst"
    ]
  },
  "application/vnd.nokia.radio-presets": {
    source: "iana",
    extensions: [
      "rpss"
    ]
  },
  "application/vnd.novadigm.edm": {
    source: "iana",
    extensions: [
      "edm"
    ]
  },
  "application/vnd.novadigm.edx": {
    source: "iana",
    extensions: [
      "edx"
    ]
  },
  "application/vnd.novadigm.ext": {
    source: "iana",
    extensions: [
      "ext"
    ]
  },
  "application/vnd.ntt-local.content-share": {
    source: "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    source: "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    source: "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    source: "iana",
    extensions: [
      "odc"
    ]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    source: "iana",
    extensions: [
      "otc"
    ]
  },
  "application/vnd.oasis.opendocument.database": {
    source: "iana",
    extensions: [
      "odb"
    ]
  },
  "application/vnd.oasis.opendocument.formula": {
    source: "iana",
    extensions: [
      "odf"
    ]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    source: "iana",
    extensions: [
      "odft"
    ]
  },
  "application/vnd.oasis.opendocument.graphics": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odg"
    ]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    source: "iana",
    extensions: [
      "otg"
    ]
  },
  "application/vnd.oasis.opendocument.image": {
    source: "iana",
    extensions: [
      "odi"
    ]
  },
  "application/vnd.oasis.opendocument.image-template": {
    source: "iana",
    extensions: [
      "oti"
    ]
  },
  "application/vnd.oasis.opendocument.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odp"
    ]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    source: "iana",
    extensions: [
      "otp"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ods"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    source: "iana",
    extensions: [
      "ots"
    ]
  },
  "application/vnd.oasis.opendocument.text": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odt"
    ]
  },
  "application/vnd.oasis.opendocument.text-master": {
    source: "iana",
    extensions: [
      "odm"
    ]
  },
  "application/vnd.oasis.opendocument.text-template": {
    source: "iana",
    extensions: [
      "ott"
    ]
  },
  "application/vnd.oasis.opendocument.text-web": {
    source: "iana",
    extensions: [
      "oth"
    ]
  },
  "application/vnd.obn": {
    source: "iana"
  },
  "application/vnd.ocf+cbor": {
    source: "iana"
  },
  "application/vnd.oci.image.manifest.v1+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oftn.l10n+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.cspg-hexbinary": {
    source: "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.pae.gem": {
    source: "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.spdlist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.ueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.userprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.olpc-sugar": {
    source: "iana",
    extensions: [
      "xo"
    ]
  },
  "application/vnd.oma-scws-config": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-request": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-response": {
    source: "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.imd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.ltkm": {
    source: "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sgdu": {
    source: "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    source: "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sprov+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.stkm": {
    source: "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-pcc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.dcd": {
    source: "iana"
  },
  "application/vnd.oma.dcdc": {
    source: "iana"
  },
  "application/vnd.oma.dd2+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dd2"
    ]
  },
  "application/vnd.oma.drm.risd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.group-usage-list+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+cbor": {
    source: "iana"
  },
  "application/vnd.oma.lwm2m+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+tlv": {
    source: "iana"
  },
  "application/vnd.oma.pal+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.final-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.groups+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.push": {
    source: "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.xcap-directory+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.omads-email+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-file+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-folder+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omaloc-supl-init": {
    source: "iana"
  },
  "application/vnd.onepager": {
    source: "iana"
  },
  "application/vnd.onepagertamp": {
    source: "iana"
  },
  "application/vnd.onepagertamx": {
    source: "iana"
  },
  "application/vnd.onepagertat": {
    source: "iana"
  },
  "application/vnd.onepagertatp": {
    source: "iana"
  },
  "application/vnd.onepagertatx": {
    source: "iana"
  },
  "application/vnd.openblox.game+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "obgx"
    ]
  },
  "application/vnd.openblox.game-binary": {
    source: "iana"
  },
  "application/vnd.openeye.oeb": {
    source: "iana"
  },
  "application/vnd.openofficeorg.extension": {
    source: "apache",
    extensions: [
      "oxt"
    ]
  },
  "application/vnd.openstreetmap.data+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osm"
    ]
  },
  "application/vnd.opentimestamps.ots": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pptx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    source: "iana",
    extensions: [
      "sldx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    source: "iana",
    extensions: [
      "ppsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    source: "iana",
    extensions: [
      "potx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xlsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    source: "iana",
    extensions: [
      "xltx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    source: "iana",
    compressible: !1,
    extensions: [
      "docx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    source: "iana",
    extensions: [
      "dotx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oracle.resource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.orange.indata": {
    source: "iana"
  },
  "application/vnd.osa.netdeploy": {
    source: "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    source: "iana",
    extensions: [
      "mgp"
    ]
  },
  "application/vnd.osgi.bundle": {
    source: "iana"
  },
  "application/vnd.osgi.dp": {
    source: "iana",
    extensions: [
      "dp"
    ]
  },
  "application/vnd.osgi.subsystem": {
    source: "iana",
    extensions: [
      "esa"
    ]
  },
  "application/vnd.otps.ct-kip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oxli.countgraph": {
    source: "iana"
  },
  "application/vnd.pagerduty+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.palm": {
    source: "iana",
    extensions: [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.panoply": {
    source: "iana"
  },
  "application/vnd.paos.xml": {
    source: "iana"
  },
  "application/vnd.patentdive": {
    source: "iana"
  },
  "application/vnd.patientecommsdoc": {
    source: "iana"
  },
  "application/vnd.pawaafile": {
    source: "iana",
    extensions: [
      "paw"
    ]
  },
  "application/vnd.pcos": {
    source: "iana"
  },
  "application/vnd.pg.format": {
    source: "iana",
    extensions: [
      "str"
    ]
  },
  "application/vnd.pg.osasli": {
    source: "iana",
    extensions: [
      "ei6"
    ]
  },
  "application/vnd.piaccess.application-licence": {
    source: "iana"
  },
  "application/vnd.picsel": {
    source: "iana",
    extensions: [
      "efif"
    ]
  },
  "application/vnd.pmi.widget": {
    source: "iana",
    extensions: [
      "wg"
    ]
  },
  "application/vnd.poc.group-advertisement+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.pocketlearn": {
    source: "iana",
    extensions: [
      "plf"
    ]
  },
  "application/vnd.powerbuilder6": {
    source: "iana",
    extensions: [
      "pbd"
    ]
  },
  "application/vnd.powerbuilder6-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder7": {
    source: "iana"
  },
  "application/vnd.powerbuilder7-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder75": {
    source: "iana"
  },
  "application/vnd.powerbuilder75-s": {
    source: "iana"
  },
  "application/vnd.preminet": {
    source: "iana"
  },
  "application/vnd.previewsystems.box": {
    source: "iana",
    extensions: [
      "box"
    ]
  },
  "application/vnd.proteus.magazine": {
    source: "iana",
    extensions: [
      "mgz"
    ]
  },
  "application/vnd.psfs": {
    source: "iana"
  },
  "application/vnd.publishare-delta-tree": {
    source: "iana",
    extensions: [
      "qps"
    ]
  },
  "application/vnd.pvi.ptid1": {
    source: "iana",
    extensions: [
      "ptid"
    ]
  },
  "application/vnd.pwg-multiplexed": {
    source: "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.qualcomm.brew-app-res": {
    source: "iana"
  },
  "application/vnd.quarantainenet": {
    source: "iana"
  },
  "application/vnd.quark.quarkxpress": {
    source: "iana",
    extensions: [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.quobject-quoxdocument": {
    source: "iana"
  },
  "application/vnd.radisys.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rainstor.data": {
    source: "iana"
  },
  "application/vnd.rapid": {
    source: "iana"
  },
  "application/vnd.rar": {
    source: "iana",
    extensions: [
      "rar"
    ]
  },
  "application/vnd.realvnc.bed": {
    source: "iana",
    extensions: [
      "bed"
    ]
  },
  "application/vnd.recordare.musicxml": {
    source: "iana",
    extensions: [
      "mxl"
    ]
  },
  "application/vnd.recordare.musicxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musicxml"
    ]
  },
  "application/vnd.renlearn.rlprint": {
    source: "iana"
  },
  "application/vnd.resilient.logic": {
    source: "iana"
  },
  "application/vnd.restful+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rig.cryptonote": {
    source: "iana",
    extensions: [
      "cryptonote"
    ]
  },
  "application/vnd.rim.cod": {
    source: "apache",
    extensions: [
      "cod"
    ]
  },
  "application/vnd.rn-realmedia": {
    source: "apache",
    extensions: [
      "rm"
    ]
  },
  "application/vnd.rn-realmedia-vbr": {
    source: "apache",
    extensions: [
      "rmvb"
    ]
  },
  "application/vnd.route66.link66+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "link66"
    ]
  },
  "application/vnd.rs-274x": {
    source: "iana"
  },
  "application/vnd.ruckus.download": {
    source: "iana"
  },
  "application/vnd.s3sms": {
    source: "iana"
  },
  "application/vnd.sailingtracker.track": {
    source: "iana",
    extensions: [
      "st"
    ]
  },
  "application/vnd.sar": {
    source: "iana"
  },
  "application/vnd.sbm.cid": {
    source: "iana"
  },
  "application/vnd.sbm.mid2": {
    source: "iana"
  },
  "application/vnd.scribus": {
    source: "iana"
  },
  "application/vnd.sealed.3df": {
    source: "iana"
  },
  "application/vnd.sealed.csf": {
    source: "iana"
  },
  "application/vnd.sealed.doc": {
    source: "iana"
  },
  "application/vnd.sealed.eml": {
    source: "iana"
  },
  "application/vnd.sealed.mht": {
    source: "iana"
  },
  "application/vnd.sealed.net": {
    source: "iana"
  },
  "application/vnd.sealed.ppt": {
    source: "iana"
  },
  "application/vnd.sealed.tiff": {
    source: "iana"
  },
  "application/vnd.sealed.xls": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    source: "iana"
  },
  "application/vnd.seemail": {
    source: "iana",
    extensions: [
      "see"
    ]
  },
  "application/vnd.seis+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.sema": {
    source: "iana",
    extensions: [
      "sema"
    ]
  },
  "application/vnd.semd": {
    source: "iana",
    extensions: [
      "semd"
    ]
  },
  "application/vnd.semf": {
    source: "iana",
    extensions: [
      "semf"
    ]
  },
  "application/vnd.shade-save-file": {
    source: "iana"
  },
  "application/vnd.shana.informed.formdata": {
    source: "iana",
    extensions: [
      "ifm"
    ]
  },
  "application/vnd.shana.informed.formtemplate": {
    source: "iana",
    extensions: [
      "itp"
    ]
  },
  "application/vnd.shana.informed.interchange": {
    source: "iana",
    extensions: [
      "iif"
    ]
  },
  "application/vnd.shana.informed.package": {
    source: "iana",
    extensions: [
      "ipk"
    ]
  },
  "application/vnd.shootproof+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shopkick+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shp": {
    source: "iana"
  },
  "application/vnd.shx": {
    source: "iana"
  },
  "application/vnd.sigrok.session": {
    source: "iana"
  },
  "application/vnd.simtech-mindmapper": {
    source: "iana",
    extensions: [
      "twd",
      "twds"
    ]
  },
  "application/vnd.siren+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.smaf": {
    source: "iana",
    extensions: [
      "mmf"
    ]
  },
  "application/vnd.smart.notebook": {
    source: "iana"
  },
  "application/vnd.smart.teacher": {
    source: "iana",
    extensions: [
      "teacher"
    ]
  },
  "application/vnd.snesdev-page-table": {
    source: "iana"
  },
  "application/vnd.software602.filler.form+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fo"
    ]
  },
  "application/vnd.software602.filler.form-xml-zip": {
    source: "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sdkm",
      "sdkd"
    ]
  },
  "application/vnd.spotfire.dxp": {
    source: "iana",
    extensions: [
      "dxp"
    ]
  },
  "application/vnd.spotfire.sfs": {
    source: "iana",
    extensions: [
      "sfs"
    ]
  },
  "application/vnd.sqlite3": {
    source: "iana"
  },
  "application/vnd.sss-cod": {
    source: "iana"
  },
  "application/vnd.sss-dtf": {
    source: "iana"
  },
  "application/vnd.sss-ntf": {
    source: "iana"
  },
  "application/vnd.stardivision.calc": {
    source: "apache",
    extensions: [
      "sdc"
    ]
  },
  "application/vnd.stardivision.draw": {
    source: "apache",
    extensions: [
      "sda"
    ]
  },
  "application/vnd.stardivision.impress": {
    source: "apache",
    extensions: [
      "sdd"
    ]
  },
  "application/vnd.stardivision.math": {
    source: "apache",
    extensions: [
      "smf"
    ]
  },
  "application/vnd.stardivision.writer": {
    source: "apache",
    extensions: [
      "sdw",
      "vor"
    ]
  },
  "application/vnd.stardivision.writer-global": {
    source: "apache",
    extensions: [
      "sgl"
    ]
  },
  "application/vnd.stepmania.package": {
    source: "iana",
    extensions: [
      "smzip"
    ]
  },
  "application/vnd.stepmania.stepchart": {
    source: "iana",
    extensions: [
      "sm"
    ]
  },
  "application/vnd.street-stream": {
    source: "iana"
  },
  "application/vnd.sun.wadl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wadl"
    ]
  },
  "application/vnd.sun.xml.calc": {
    source: "apache",
    extensions: [
      "sxc"
    ]
  },
  "application/vnd.sun.xml.calc.template": {
    source: "apache",
    extensions: [
      "stc"
    ]
  },
  "application/vnd.sun.xml.draw": {
    source: "apache",
    extensions: [
      "sxd"
    ]
  },
  "application/vnd.sun.xml.draw.template": {
    source: "apache",
    extensions: [
      "std"
    ]
  },
  "application/vnd.sun.xml.impress": {
    source: "apache",
    extensions: [
      "sxi"
    ]
  },
  "application/vnd.sun.xml.impress.template": {
    source: "apache",
    extensions: [
      "sti"
    ]
  },
  "application/vnd.sun.xml.math": {
    source: "apache",
    extensions: [
      "sxm"
    ]
  },
  "application/vnd.sun.xml.writer": {
    source: "apache",
    extensions: [
      "sxw"
    ]
  },
  "application/vnd.sun.xml.writer.global": {
    source: "apache",
    extensions: [
      "sxg"
    ]
  },
  "application/vnd.sun.xml.writer.template": {
    source: "apache",
    extensions: [
      "stw"
    ]
  },
  "application/vnd.sus-calendar": {
    source: "iana",
    extensions: [
      "sus",
      "susp"
    ]
  },
  "application/vnd.svd": {
    source: "iana",
    extensions: [
      "svd"
    ]
  },
  "application/vnd.swiftview-ics": {
    source: "iana"
  },
  "application/vnd.sycle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.syft+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.symbian.install": {
    source: "apache",
    extensions: [
      "sis",
      "sisx"
    ]
  },
  "application/vnd.syncml+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xsm"
    ]
  },
  "application/vnd.syncml.dm+wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "bdm"
    ]
  },
  "application/vnd.syncml.dm+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xdm"
    ]
  },
  "application/vnd.syncml.dm.notification": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "ddf"
    ]
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.syncml.ds.notification": {
    source: "iana"
  },
  "application/vnd.tableschema+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tao.intent-module-archive": {
    source: "iana",
    extensions: [
      "tao"
    ]
  },
  "application/vnd.tcpdump.pcap": {
    source: "iana",
    extensions: [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.think-cell.ppttc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tml": {
    source: "iana"
  },
  "application/vnd.tmobile-livetv": {
    source: "iana",
    extensions: [
      "tmo"
    ]
  },
  "application/vnd.tri.onesource": {
    source: "iana"
  },
  "application/vnd.trid.tpt": {
    source: "iana",
    extensions: [
      "tpt"
    ]
  },
  "application/vnd.triscape.mxs": {
    source: "iana",
    extensions: [
      "mxs"
    ]
  },
  "application/vnd.trueapp": {
    source: "iana",
    extensions: [
      "tra"
    ]
  },
  "application/vnd.truedoc": {
    source: "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    source: "iana"
  },
  "application/vnd.ufdl": {
    source: "iana",
    extensions: [
      "ufd",
      "ufdl"
    ]
  },
  "application/vnd.uiq.theme": {
    source: "iana",
    extensions: [
      "utz"
    ]
  },
  "application/vnd.umajin": {
    source: "iana",
    extensions: [
      "umj"
    ]
  },
  "application/vnd.unity": {
    source: "iana",
    extensions: [
      "unityweb"
    ]
  },
  "application/vnd.uoml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uoml"
    ]
  },
  "application/vnd.uplanet.alert": {
    source: "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.channel": {
    source: "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.list": {
    source: "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.signal": {
    source: "iana"
  },
  "application/vnd.uri-map": {
    source: "iana"
  },
  "application/vnd.valve.source.material": {
    source: "iana"
  },
  "application/vnd.vcx": {
    source: "iana",
    extensions: [
      "vcx"
    ]
  },
  "application/vnd.vd-study": {
    source: "iana"
  },
  "application/vnd.vectorworks": {
    source: "iana"
  },
  "application/vnd.vel+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.verimatrix.vcas": {
    source: "iana"
  },
  "application/vnd.veritone.aion+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.veryant.thin": {
    source: "iana"
  },
  "application/vnd.ves.encrypted": {
    source: "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    source: "iana"
  },
  "application/vnd.visio": {
    source: "iana",
    extensions: [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    source: "iana",
    extensions: [
      "vis"
    ]
  },
  "application/vnd.vividence.scriptfile": {
    source: "iana"
  },
  "application/vnd.vsf": {
    source: "iana",
    extensions: [
      "vsf"
    ]
  },
  "application/vnd.wap.sic": {
    source: "iana"
  },
  "application/vnd.wap.slc": {
    source: "iana"
  },
  "application/vnd.wap.wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "wbxml"
    ]
  },
  "application/vnd.wap.wmlc": {
    source: "iana",
    extensions: [
      "wmlc"
    ]
  },
  "application/vnd.wap.wmlscriptc": {
    source: "iana",
    extensions: [
      "wmlsc"
    ]
  },
  "application/vnd.webturbo": {
    source: "iana",
    extensions: [
      "wtb"
    ]
  },
  "application/vnd.wfa.dpp": {
    source: "iana"
  },
  "application/vnd.wfa.p2p": {
    source: "iana"
  },
  "application/vnd.wfa.wsc": {
    source: "iana"
  },
  "application/vnd.windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.wmc": {
    source: "iana"
  },
  "application/vnd.wmf.bootstrap": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    source: "iana"
  },
  "application/vnd.wolfram.player": {
    source: "iana",
    extensions: [
      "nbp"
    ]
  },
  "application/vnd.wordperfect": {
    source: "iana",
    extensions: [
      "wpd"
    ]
  },
  "application/vnd.wqd": {
    source: "iana",
    extensions: [
      "wqd"
    ]
  },
  "application/vnd.wrq-hp3000-labelled": {
    source: "iana"
  },
  "application/vnd.wt.stf": {
    source: "iana",
    extensions: [
      "stf"
    ]
  },
  "application/vnd.wv.csp+wbxml": {
    source: "iana"
  },
  "application/vnd.wv.csp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.wv.ssp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xacml+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xara": {
    source: "iana",
    extensions: [
      "xar"
    ]
  },
  "application/vnd.xfdl": {
    source: "iana",
    extensions: [
      "xfdl"
    ]
  },
  "application/vnd.xfdl.webform": {
    source: "iana"
  },
  "application/vnd.xmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xmpie.cpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.dpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.plan": {
    source: "iana"
  },
  "application/vnd.xmpie.ppkg": {
    source: "iana"
  },
  "application/vnd.xmpie.xlim": {
    source: "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    source: "iana",
    extensions: [
      "hvd"
    ]
  },
  "application/vnd.yamaha.hv-script": {
    source: "iana",
    extensions: [
      "hvs"
    ]
  },
  "application/vnd.yamaha.hv-voice": {
    source: "iana",
    extensions: [
      "hvp"
    ]
  },
  "application/vnd.yamaha.openscoreformat": {
    source: "iana",
    extensions: [
      "osf"
    ]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osfpvg"
    ]
  },
  "application/vnd.yamaha.remote-setup": {
    source: "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    source: "iana",
    extensions: [
      "saf"
    ]
  },
  "application/vnd.yamaha.smaf-phrase": {
    source: "iana",
    extensions: [
      "spf"
    ]
  },
  "application/vnd.yamaha.through-ngn": {
    source: "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    source: "iana"
  },
  "application/vnd.yaoweme": {
    source: "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    source: "iana",
    extensions: [
      "cmp"
    ]
  },
  "application/vnd.youtube.yt": {
    source: "iana"
  },
  "application/vnd.zul": {
    source: "iana",
    extensions: [
      "zir",
      "zirz"
    ]
  },
  "application/vnd.zzazz.deck+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zaz"
    ]
  },
  "application/voicexml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vxml"
    ]
  },
  "application/voucher-cms+json": {
    source: "iana",
    compressible: !0
  },
  "application/vq-rtcpxr": {
    source: "iana"
  },
  "application/wasm": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wasm"
    ]
  },
  "application/watcherinfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wif"
    ]
  },
  "application/webpush-options+json": {
    source: "iana",
    compressible: !0
  },
  "application/whoispp-query": {
    source: "iana"
  },
  "application/whoispp-response": {
    source: "iana"
  },
  "application/widget": {
    source: "iana",
    extensions: [
      "wgt"
    ]
  },
  "application/winhlp": {
    source: "apache",
    extensions: [
      "hlp"
    ]
  },
  "application/wita": {
    source: "iana"
  },
  "application/wordperfect5.1": {
    source: "iana"
  },
  "application/wsdl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wsdl"
    ]
  },
  "application/wspolicy+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wspolicy"
    ]
  },
  "application/x-7z-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "7z"
    ]
  },
  "application/x-abiword": {
    source: "apache",
    extensions: [
      "abw"
    ]
  },
  "application/x-ace-compressed": {
    source: "apache",
    extensions: [
      "ace"
    ]
  },
  "application/x-amf": {
    source: "apache"
  },
  "application/x-apple-diskimage": {
    source: "apache",
    extensions: [
      "dmg"
    ]
  },
  "application/x-arj": {
    compressible: !1,
    extensions: [
      "arj"
    ]
  },
  "application/x-authorware-bin": {
    source: "apache",
    extensions: [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    source: "apache",
    extensions: [
      "aam"
    ]
  },
  "application/x-authorware-seg": {
    source: "apache",
    extensions: [
      "aas"
    ]
  },
  "application/x-bcpio": {
    source: "apache",
    extensions: [
      "bcpio"
    ]
  },
  "application/x-bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/x-bittorrent": {
    source: "apache",
    extensions: [
      "torrent"
    ]
  },
  "application/x-blorb": {
    source: "apache",
    extensions: [
      "blb",
      "blorb"
    ]
  },
  "application/x-bzip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz"
    ]
  },
  "application/x-bzip2": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz2",
      "boz"
    ]
  },
  "application/x-cbr": {
    source: "apache",
    extensions: [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    source: "apache",
    extensions: [
      "vcd"
    ]
  },
  "application/x-cfs-compressed": {
    source: "apache",
    extensions: [
      "cfs"
    ]
  },
  "application/x-chat": {
    source: "apache",
    extensions: [
      "chat"
    ]
  },
  "application/x-chess-pgn": {
    source: "apache",
    extensions: [
      "pgn"
    ]
  },
  "application/x-chrome-extension": {
    extensions: [
      "crx"
    ]
  },
  "application/x-cocoa": {
    source: "nginx",
    extensions: [
      "cco"
    ]
  },
  "application/x-compress": {
    source: "apache"
  },
  "application/x-conference": {
    source: "apache",
    extensions: [
      "nsc"
    ]
  },
  "application/x-cpio": {
    source: "apache",
    extensions: [
      "cpio"
    ]
  },
  "application/x-csh": {
    source: "apache",
    extensions: [
      "csh"
    ]
  },
  "application/x-deb": {
    compressible: !1
  },
  "application/x-debian-package": {
    source: "apache",
    extensions: [
      "deb",
      "udeb"
    ]
  },
  "application/x-dgc-compressed": {
    source: "apache",
    extensions: [
      "dgc"
    ]
  },
  "application/x-director": {
    source: "apache",
    extensions: [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    source: "apache",
    extensions: [
      "wad"
    ]
  },
  "application/x-dtbncx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ncx"
    ]
  },
  "application/x-dtbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dtb"
    ]
  },
  "application/x-dtbresource+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "res"
    ]
  },
  "application/x-dvi": {
    source: "apache",
    compressible: !1,
    extensions: [
      "dvi"
    ]
  },
  "application/x-envoy": {
    source: "apache",
    extensions: [
      "evy"
    ]
  },
  "application/x-eva": {
    source: "apache",
    extensions: [
      "eva"
    ]
  },
  "application/x-font-bdf": {
    source: "apache",
    extensions: [
      "bdf"
    ]
  },
  "application/x-font-dos": {
    source: "apache"
  },
  "application/x-font-framemaker": {
    source: "apache"
  },
  "application/x-font-ghostscript": {
    source: "apache",
    extensions: [
      "gsf"
    ]
  },
  "application/x-font-libgrx": {
    source: "apache"
  },
  "application/x-font-linux-psf": {
    source: "apache",
    extensions: [
      "psf"
    ]
  },
  "application/x-font-pcf": {
    source: "apache",
    extensions: [
      "pcf"
    ]
  },
  "application/x-font-snf": {
    source: "apache",
    extensions: [
      "snf"
    ]
  },
  "application/x-font-speedo": {
    source: "apache"
  },
  "application/x-font-sunos-news": {
    source: "apache"
  },
  "application/x-font-type1": {
    source: "apache",
    extensions: [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-font-vfont": {
    source: "apache"
  },
  "application/x-freearc": {
    source: "apache",
    extensions: [
      "arc"
    ]
  },
  "application/x-futuresplash": {
    source: "apache",
    extensions: [
      "spl"
    ]
  },
  "application/x-gca-compressed": {
    source: "apache",
    extensions: [
      "gca"
    ]
  },
  "application/x-glulx": {
    source: "apache",
    extensions: [
      "ulx"
    ]
  },
  "application/x-gnumeric": {
    source: "apache",
    extensions: [
      "gnumeric"
    ]
  },
  "application/x-gramps-xml": {
    source: "apache",
    extensions: [
      "gramps"
    ]
  },
  "application/x-gtar": {
    source: "apache",
    extensions: [
      "gtar"
    ]
  },
  "application/x-gzip": {
    source: "apache"
  },
  "application/x-hdf": {
    source: "apache",
    extensions: [
      "hdf"
    ]
  },
  "application/x-httpd-php": {
    compressible: !0,
    extensions: [
      "php"
    ]
  },
  "application/x-install-instructions": {
    source: "apache",
    extensions: [
      "install"
    ]
  },
  "application/x-iso9660-image": {
    source: "apache",
    extensions: [
      "iso"
    ]
  },
  "application/x-iwork-keynote-sffkey": {
    extensions: [
      "key"
    ]
  },
  "application/x-iwork-numbers-sffnumbers": {
    extensions: [
      "numbers"
    ]
  },
  "application/x-iwork-pages-sffpages": {
    extensions: [
      "pages"
    ]
  },
  "application/x-java-archive-diff": {
    source: "nginx",
    extensions: [
      "jardiff"
    ]
  },
  "application/x-java-jnlp-file": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jnlp"
    ]
  },
  "application/x-javascript": {
    compressible: !0
  },
  "application/x-keepass2": {
    extensions: [
      "kdbx"
    ]
  },
  "application/x-latex": {
    source: "apache",
    compressible: !1,
    extensions: [
      "latex"
    ]
  },
  "application/x-lua-bytecode": {
    extensions: [
      "luac"
    ]
  },
  "application/x-lzh-compressed": {
    source: "apache",
    extensions: [
      "lzh",
      "lha"
    ]
  },
  "application/x-makeself": {
    source: "nginx",
    extensions: [
      "run"
    ]
  },
  "application/x-mie": {
    source: "apache",
    extensions: [
      "mie"
    ]
  },
  "application/x-mobipocket-ebook": {
    source: "apache",
    extensions: [
      "prc",
      "mobi"
    ]
  },
  "application/x-mpegurl": {
    compressible: !1
  },
  "application/x-ms-application": {
    source: "apache",
    extensions: [
      "application"
    ]
  },
  "application/x-ms-shortcut": {
    source: "apache",
    extensions: [
      "lnk"
    ]
  },
  "application/x-ms-wmd": {
    source: "apache",
    extensions: [
      "wmd"
    ]
  },
  "application/x-ms-wmz": {
    source: "apache",
    extensions: [
      "wmz"
    ]
  },
  "application/x-ms-xbap": {
    source: "apache",
    extensions: [
      "xbap"
    ]
  },
  "application/x-msaccess": {
    source: "apache",
    extensions: [
      "mdb"
    ]
  },
  "application/x-msbinder": {
    source: "apache",
    extensions: [
      "obd"
    ]
  },
  "application/x-mscardfile": {
    source: "apache",
    extensions: [
      "crd"
    ]
  },
  "application/x-msclip": {
    source: "apache",
    extensions: [
      "clp"
    ]
  },
  "application/x-msdos-program": {
    extensions: [
      "exe"
    ]
  },
  "application/x-msdownload": {
    source: "apache",
    extensions: [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    source: "apache",
    extensions: [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    source: "apache",
    extensions: [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    source: "apache",
    extensions: [
      "mny"
    ]
  },
  "application/x-mspublisher": {
    source: "apache",
    extensions: [
      "pub"
    ]
  },
  "application/x-msschedule": {
    source: "apache",
    extensions: [
      "scd"
    ]
  },
  "application/x-msterminal": {
    source: "apache",
    extensions: [
      "trm"
    ]
  },
  "application/x-mswrite": {
    source: "apache",
    extensions: [
      "wri"
    ]
  },
  "application/x-netcdf": {
    source: "apache",
    extensions: [
      "nc",
      "cdf"
    ]
  },
  "application/x-ns-proxy-autoconfig": {
    compressible: !0,
    extensions: [
      "pac"
    ]
  },
  "application/x-nzb": {
    source: "apache",
    extensions: [
      "nzb"
    ]
  },
  "application/x-perl": {
    source: "nginx",
    extensions: [
      "pl",
      "pm"
    ]
  },
  "application/x-pilot": {
    source: "nginx",
    extensions: [
      "prc",
      "pdb"
    ]
  },
  "application/x-pkcs12": {
    source: "apache",
    compressible: !1,
    extensions: [
      "p12",
      "pfx"
    ]
  },
  "application/x-pkcs7-certificates": {
    source: "apache",
    extensions: [
      "p7b",
      "spc"
    ]
  },
  "application/x-pkcs7-certreqresp": {
    source: "apache",
    extensions: [
      "p7r"
    ]
  },
  "application/x-pki-message": {
    source: "iana"
  },
  "application/x-rar-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "rar"
    ]
  },
  "application/x-redhat-package-manager": {
    source: "nginx",
    extensions: [
      "rpm"
    ]
  },
  "application/x-research-info-systems": {
    source: "apache",
    extensions: [
      "ris"
    ]
  },
  "application/x-sea": {
    source: "nginx",
    extensions: [
      "sea"
    ]
  },
  "application/x-sh": {
    source: "apache",
    compressible: !0,
    extensions: [
      "sh"
    ]
  },
  "application/x-shar": {
    source: "apache",
    extensions: [
      "shar"
    ]
  },
  "application/x-shockwave-flash": {
    source: "apache",
    compressible: !1,
    extensions: [
      "swf"
    ]
  },
  "application/x-silverlight-app": {
    source: "apache",
    extensions: [
      "xap"
    ]
  },
  "application/x-sql": {
    source: "apache",
    extensions: [
      "sql"
    ]
  },
  "application/x-stuffit": {
    source: "apache",
    compressible: !1,
    extensions: [
      "sit"
    ]
  },
  "application/x-stuffitx": {
    source: "apache",
    extensions: [
      "sitx"
    ]
  },
  "application/x-subrip": {
    source: "apache",
    extensions: [
      "srt"
    ]
  },
  "application/x-sv4cpio": {
    source: "apache",
    extensions: [
      "sv4cpio"
    ]
  },
  "application/x-sv4crc": {
    source: "apache",
    extensions: [
      "sv4crc"
    ]
  },
  "application/x-t3vm-image": {
    source: "apache",
    extensions: [
      "t3"
    ]
  },
  "application/x-tads": {
    source: "apache",
    extensions: [
      "gam"
    ]
  },
  "application/x-tar": {
    source: "apache",
    compressible: !0,
    extensions: [
      "tar"
    ]
  },
  "application/x-tcl": {
    source: "apache",
    extensions: [
      "tcl",
      "tk"
    ]
  },
  "application/x-tex": {
    source: "apache",
    extensions: [
      "tex"
    ]
  },
  "application/x-tex-tfm": {
    source: "apache",
    extensions: [
      "tfm"
    ]
  },
  "application/x-texinfo": {
    source: "apache",
    extensions: [
      "texinfo",
      "texi"
    ]
  },
  "application/x-tgif": {
    source: "apache",
    extensions: [
      "obj"
    ]
  },
  "application/x-ustar": {
    source: "apache",
    extensions: [
      "ustar"
    ]
  },
  "application/x-virtualbox-hdd": {
    compressible: !0,
    extensions: [
      "hdd"
    ]
  },
  "application/x-virtualbox-ova": {
    compressible: !0,
    extensions: [
      "ova"
    ]
  },
  "application/x-virtualbox-ovf": {
    compressible: !0,
    extensions: [
      "ovf"
    ]
  },
  "application/x-virtualbox-vbox": {
    compressible: !0,
    extensions: [
      "vbox"
    ]
  },
  "application/x-virtualbox-vbox-extpack": {
    compressible: !1,
    extensions: [
      "vbox-extpack"
    ]
  },
  "application/x-virtualbox-vdi": {
    compressible: !0,
    extensions: [
      "vdi"
    ]
  },
  "application/x-virtualbox-vhd": {
    compressible: !0,
    extensions: [
      "vhd"
    ]
  },
  "application/x-virtualbox-vmdk": {
    compressible: !0,
    extensions: [
      "vmdk"
    ]
  },
  "application/x-wais-source": {
    source: "apache",
    extensions: [
      "src"
    ]
  },
  "application/x-web-app-manifest+json": {
    compressible: !0,
    extensions: [
      "webapp"
    ]
  },
  "application/x-www-form-urlencoded": {
    source: "iana",
    compressible: !0
  },
  "application/x-x509-ca-cert": {
    source: "iana",
    extensions: [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-x509-ca-ra-cert": {
    source: "iana"
  },
  "application/x-x509-next-ca-cert": {
    source: "iana"
  },
  "application/x-xfig": {
    source: "apache",
    extensions: [
      "fig"
    ]
  },
  "application/x-xliff+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/x-xpinstall": {
    source: "apache",
    compressible: !1,
    extensions: [
      "xpi"
    ]
  },
  "application/x-xz": {
    source: "apache",
    extensions: [
      "xz"
    ]
  },
  "application/x-zmachine": {
    source: "apache",
    extensions: [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/x400-bp": {
    source: "iana"
  },
  "application/xacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xaml+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xaml"
    ]
  },
  "application/xcap-att+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xav"
    ]
  },
  "application/xcap-caps+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xca"
    ]
  },
  "application/xcap-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdf"
    ]
  },
  "application/xcap-el+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xel"
    ]
  },
  "application/xcap-error+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcap-ns+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xns"
    ]
  },
  "application/xcon-conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcon-conference-info-diff+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xenc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xenc"
    ]
  },
  "application/xhtml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xhtml",
      "xht"
    ]
  },
  "application/xhtml-voice+xml": {
    source: "apache",
    compressible: !0
  },
  "application/xliff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dtd"
    ]
  },
  "application/xml-external-parsed-entity": {
    source: "iana"
  },
  "application/xml-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xmpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xop+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xop"
    ]
  },
  "application/xproc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xpl"
    ]
  },
  "application/xslt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xsl",
      "xslt"
    ]
  },
  "application/xspf+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xspf"
    ]
  },
  "application/xv+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yang": {
    source: "iana",
    extensions: [
      "yang"
    ]
  },
  "application/yang-data+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yin+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "yin"
    ]
  },
  "application/zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "zip"
    ]
  },
  "application/zlib": {
    source: "iana"
  },
  "application/zstd": {
    source: "iana"
  },
  "audio/1d-interleaved-parityfec": {
    source: "iana"
  },
  "audio/32kadpcm": {
    source: "iana"
  },
  "audio/3gpp": {
    source: "iana",
    compressible: !1,
    extensions: [
      "3gpp"
    ]
  },
  "audio/3gpp2": {
    source: "iana"
  },
  "audio/aac": {
    source: "iana"
  },
  "audio/ac3": {
    source: "iana"
  },
  "audio/adpcm": {
    source: "apache",
    extensions: [
      "adp"
    ]
  },
  "audio/amr": {
    source: "iana",
    extensions: [
      "amr"
    ]
  },
  "audio/amr-wb": {
    source: "iana"
  },
  "audio/amr-wb+": {
    source: "iana"
  },
  "audio/aptx": {
    source: "iana"
  },
  "audio/asc": {
    source: "iana"
  },
  "audio/atrac-advanced-lossless": {
    source: "iana"
  },
  "audio/atrac-x": {
    source: "iana"
  },
  "audio/atrac3": {
    source: "iana"
  },
  "audio/basic": {
    source: "iana",
    compressible: !1,
    extensions: [
      "au",
      "snd"
    ]
  },
  "audio/bv16": {
    source: "iana"
  },
  "audio/bv32": {
    source: "iana"
  },
  "audio/clearmode": {
    source: "iana"
  },
  "audio/cn": {
    source: "iana"
  },
  "audio/dat12": {
    source: "iana"
  },
  "audio/dls": {
    source: "iana"
  },
  "audio/dsr-es201108": {
    source: "iana"
  },
  "audio/dsr-es202050": {
    source: "iana"
  },
  "audio/dsr-es202211": {
    source: "iana"
  },
  "audio/dsr-es202212": {
    source: "iana"
  },
  "audio/dv": {
    source: "iana"
  },
  "audio/dvi4": {
    source: "iana"
  },
  "audio/eac3": {
    source: "iana"
  },
  "audio/encaprtp": {
    source: "iana"
  },
  "audio/evrc": {
    source: "iana"
  },
  "audio/evrc-qcp": {
    source: "iana"
  },
  "audio/evrc0": {
    source: "iana"
  },
  "audio/evrc1": {
    source: "iana"
  },
  "audio/evrcb": {
    source: "iana"
  },
  "audio/evrcb0": {
    source: "iana"
  },
  "audio/evrcb1": {
    source: "iana"
  },
  "audio/evrcnw": {
    source: "iana"
  },
  "audio/evrcnw0": {
    source: "iana"
  },
  "audio/evrcnw1": {
    source: "iana"
  },
  "audio/evrcwb": {
    source: "iana"
  },
  "audio/evrcwb0": {
    source: "iana"
  },
  "audio/evrcwb1": {
    source: "iana"
  },
  "audio/evs": {
    source: "iana"
  },
  "audio/flexfec": {
    source: "iana"
  },
  "audio/fwdred": {
    source: "iana"
  },
  "audio/g711-0": {
    source: "iana"
  },
  "audio/g719": {
    source: "iana"
  },
  "audio/g722": {
    source: "iana"
  },
  "audio/g7221": {
    source: "iana"
  },
  "audio/g723": {
    source: "iana"
  },
  "audio/g726-16": {
    source: "iana"
  },
  "audio/g726-24": {
    source: "iana"
  },
  "audio/g726-32": {
    source: "iana"
  },
  "audio/g726-40": {
    source: "iana"
  },
  "audio/g728": {
    source: "iana"
  },
  "audio/g729": {
    source: "iana"
  },
  "audio/g7291": {
    source: "iana"
  },
  "audio/g729d": {
    source: "iana"
  },
  "audio/g729e": {
    source: "iana"
  },
  "audio/gsm": {
    source: "iana"
  },
  "audio/gsm-efr": {
    source: "iana"
  },
  "audio/gsm-hr-08": {
    source: "iana"
  },
  "audio/ilbc": {
    source: "iana"
  },
  "audio/ip-mr_v2.5": {
    source: "iana"
  },
  "audio/isac": {
    source: "apache"
  },
  "audio/l16": {
    source: "iana"
  },
  "audio/l20": {
    source: "iana"
  },
  "audio/l24": {
    source: "iana",
    compressible: !1
  },
  "audio/l8": {
    source: "iana"
  },
  "audio/lpc": {
    source: "iana"
  },
  "audio/melp": {
    source: "iana"
  },
  "audio/melp1200": {
    source: "iana"
  },
  "audio/melp2400": {
    source: "iana"
  },
  "audio/melp600": {
    source: "iana"
  },
  "audio/mhas": {
    source: "iana"
  },
  "audio/midi": {
    source: "apache",
    extensions: [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/mobile-xmf": {
    source: "iana",
    extensions: [
      "mxmf"
    ]
  },
  "audio/mp3": {
    compressible: !1,
    extensions: [
      "mp3"
    ]
  },
  "audio/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "m4a",
      "mp4a"
    ]
  },
  "audio/mp4a-latm": {
    source: "iana"
  },
  "audio/mpa": {
    source: "iana"
  },
  "audio/mpa-robust": {
    source: "iana"
  },
  "audio/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/mpeg4-generic": {
    source: "iana"
  },
  "audio/musepack": {
    source: "apache"
  },
  "audio/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/opus": {
    source: "iana"
  },
  "audio/parityfec": {
    source: "iana"
  },
  "audio/pcma": {
    source: "iana"
  },
  "audio/pcma-wb": {
    source: "iana"
  },
  "audio/pcmu": {
    source: "iana"
  },
  "audio/pcmu-wb": {
    source: "iana"
  },
  "audio/prs.sid": {
    source: "iana"
  },
  "audio/qcelp": {
    source: "iana"
  },
  "audio/raptorfec": {
    source: "iana"
  },
  "audio/red": {
    source: "iana"
  },
  "audio/rtp-enc-aescm128": {
    source: "iana"
  },
  "audio/rtp-midi": {
    source: "iana"
  },
  "audio/rtploopback": {
    source: "iana"
  },
  "audio/rtx": {
    source: "iana"
  },
  "audio/s3m": {
    source: "apache",
    extensions: [
      "s3m"
    ]
  },
  "audio/scip": {
    source: "iana"
  },
  "audio/silk": {
    source: "apache",
    extensions: [
      "sil"
    ]
  },
  "audio/smv": {
    source: "iana"
  },
  "audio/smv-qcp": {
    source: "iana"
  },
  "audio/smv0": {
    source: "iana"
  },
  "audio/sofa": {
    source: "iana"
  },
  "audio/sp-midi": {
    source: "iana"
  },
  "audio/speex": {
    source: "iana"
  },
  "audio/t140c": {
    source: "iana"
  },
  "audio/t38": {
    source: "iana"
  },
  "audio/telephone-event": {
    source: "iana"
  },
  "audio/tetra_acelp": {
    source: "iana"
  },
  "audio/tetra_acelp_bb": {
    source: "iana"
  },
  "audio/tone": {
    source: "iana"
  },
  "audio/tsvcis": {
    source: "iana"
  },
  "audio/uemclip": {
    source: "iana"
  },
  "audio/ulpfec": {
    source: "iana"
  },
  "audio/usac": {
    source: "iana"
  },
  "audio/vdvi": {
    source: "iana"
  },
  "audio/vmr-wb": {
    source: "iana"
  },
  "audio/vnd.3gpp.iufp": {
    source: "iana"
  },
  "audio/vnd.4sb": {
    source: "iana"
  },
  "audio/vnd.audiokoz": {
    source: "iana"
  },
  "audio/vnd.celp": {
    source: "iana"
  },
  "audio/vnd.cisco.nse": {
    source: "iana"
  },
  "audio/vnd.cmles.radio-events": {
    source: "iana"
  },
  "audio/vnd.cns.anp1": {
    source: "iana"
  },
  "audio/vnd.cns.inf1": {
    source: "iana"
  },
  "audio/vnd.dece.audio": {
    source: "iana",
    extensions: [
      "uva",
      "uvva"
    ]
  },
  "audio/vnd.digital-winds": {
    source: "iana",
    extensions: [
      "eol"
    ]
  },
  "audio/vnd.dlna.adts": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    source: "iana"
  },
  "audio/vnd.dolby.mlp": {
    source: "iana"
  },
  "audio/vnd.dolby.mps": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2x": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2z": {
    source: "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    source: "iana"
  },
  "audio/vnd.dra": {
    source: "iana",
    extensions: [
      "dra"
    ]
  },
  "audio/vnd.dts": {
    source: "iana",
    extensions: [
      "dts"
    ]
  },
  "audio/vnd.dts.hd": {
    source: "iana",
    extensions: [
      "dtshd"
    ]
  },
  "audio/vnd.dts.uhd": {
    source: "iana"
  },
  "audio/vnd.dvb.file": {
    source: "iana"
  },
  "audio/vnd.everad.plj": {
    source: "iana"
  },
  "audio/vnd.hns.audio": {
    source: "iana"
  },
  "audio/vnd.lucent.voice": {
    source: "iana",
    extensions: [
      "lvp"
    ]
  },
  "audio/vnd.ms-playready.media.pya": {
    source: "iana",
    extensions: [
      "pya"
    ]
  },
  "audio/vnd.nokia.mobile-xmf": {
    source: "iana"
  },
  "audio/vnd.nortel.vbk": {
    source: "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    source: "iana",
    extensions: [
      "ecelp4800"
    ]
  },
  "audio/vnd.nuera.ecelp7470": {
    source: "iana",
    extensions: [
      "ecelp7470"
    ]
  },
  "audio/vnd.nuera.ecelp9600": {
    source: "iana",
    extensions: [
      "ecelp9600"
    ]
  },
  "audio/vnd.octel.sbc": {
    source: "iana"
  },
  "audio/vnd.presonus.multitrack": {
    source: "iana"
  },
  "audio/vnd.qcelp": {
    source: "iana"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    source: "iana"
  },
  "audio/vnd.rip": {
    source: "iana",
    extensions: [
      "rip"
    ]
  },
  "audio/vnd.rn-realaudio": {
    compressible: !1
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    source: "iana"
  },
  "audio/vnd.vmx.cvsd": {
    source: "iana"
  },
  "audio/vnd.wave": {
    compressible: !1
  },
  "audio/vorbis": {
    source: "iana",
    compressible: !1
  },
  "audio/vorbis-config": {
    source: "iana"
  },
  "audio/wav": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/wave": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "weba"
    ]
  },
  "audio/x-aac": {
    source: "apache",
    compressible: !1,
    extensions: [
      "aac"
    ]
  },
  "audio/x-aiff": {
    source: "apache",
    extensions: [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    source: "apache",
    compressible: !1,
    extensions: [
      "caf"
    ]
  },
  "audio/x-flac": {
    source: "apache",
    extensions: [
      "flac"
    ]
  },
  "audio/x-m4a": {
    source: "nginx",
    extensions: [
      "m4a"
    ]
  },
  "audio/x-matroska": {
    source: "apache",
    extensions: [
      "mka"
    ]
  },
  "audio/x-mpegurl": {
    source: "apache",
    extensions: [
      "m3u"
    ]
  },
  "audio/x-ms-wax": {
    source: "apache",
    extensions: [
      "wax"
    ]
  },
  "audio/x-ms-wma": {
    source: "apache",
    extensions: [
      "wma"
    ]
  },
  "audio/x-pn-realaudio": {
    source: "apache",
    extensions: [
      "ram",
      "ra"
    ]
  },
  "audio/x-pn-realaudio-plugin": {
    source: "apache",
    extensions: [
      "rmp"
    ]
  },
  "audio/x-realaudio": {
    source: "nginx",
    extensions: [
      "ra"
    ]
  },
  "audio/x-tta": {
    source: "apache"
  },
  "audio/x-wav": {
    source: "apache",
    extensions: [
      "wav"
    ]
  },
  "audio/xm": {
    source: "apache",
    extensions: [
      "xm"
    ]
  },
  "chemical/x-cdx": {
    source: "apache",
    extensions: [
      "cdx"
    ]
  },
  "chemical/x-cif": {
    source: "apache",
    extensions: [
      "cif"
    ]
  },
  "chemical/x-cmdf": {
    source: "apache",
    extensions: [
      "cmdf"
    ]
  },
  "chemical/x-cml": {
    source: "apache",
    extensions: [
      "cml"
    ]
  },
  "chemical/x-csml": {
    source: "apache",
    extensions: [
      "csml"
    ]
  },
  "chemical/x-pdb": {
    source: "apache"
  },
  "chemical/x-xyz": {
    source: "apache",
    extensions: [
      "xyz"
    ]
  },
  "font/collection": {
    source: "iana",
    extensions: [
      "ttc"
    ]
  },
  "font/otf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "otf"
    ]
  },
  "font/sfnt": {
    source: "iana"
  },
  "font/ttf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttf"
    ]
  },
  "font/woff": {
    source: "iana",
    extensions: [
      "woff"
    ]
  },
  "font/woff2": {
    source: "iana",
    extensions: [
      "woff2"
    ]
  },
  "image/aces": {
    source: "iana",
    extensions: [
      "exr"
    ]
  },
  "image/apng": {
    compressible: !1,
    extensions: [
      "apng"
    ]
  },
  "image/avci": {
    source: "iana",
    extensions: [
      "avci"
    ]
  },
  "image/avcs": {
    source: "iana",
    extensions: [
      "avcs"
    ]
  },
  "image/avif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "avif"
    ]
  },
  "image/bmp": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/cgm": {
    source: "iana",
    extensions: [
      "cgm"
    ]
  },
  "image/dicom-rle": {
    source: "iana",
    extensions: [
      "drle"
    ]
  },
  "image/emf": {
    source: "iana",
    extensions: [
      "emf"
    ]
  },
  "image/fits": {
    source: "iana",
    extensions: [
      "fits"
    ]
  },
  "image/g3fax": {
    source: "iana",
    extensions: [
      "g3"
    ]
  },
  "image/gif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gif"
    ]
  },
  "image/heic": {
    source: "iana",
    extensions: [
      "heic"
    ]
  },
  "image/heic-sequence": {
    source: "iana",
    extensions: [
      "heics"
    ]
  },
  "image/heif": {
    source: "iana",
    extensions: [
      "heif"
    ]
  },
  "image/heif-sequence": {
    source: "iana",
    extensions: [
      "heifs"
    ]
  },
  "image/hej2k": {
    source: "iana",
    extensions: [
      "hej2"
    ]
  },
  "image/hsj2": {
    source: "iana",
    extensions: [
      "hsj2"
    ]
  },
  "image/ief": {
    source: "iana",
    extensions: [
      "ief"
    ]
  },
  "image/jls": {
    source: "iana",
    extensions: [
      "jls"
    ]
  },
  "image/jp2": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jp2",
      "jpg2"
    ]
  },
  "image/jpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpeg",
      "jpg",
      "jpe"
    ]
  },
  "image/jph": {
    source: "iana",
    extensions: [
      "jph"
    ]
  },
  "image/jphc": {
    source: "iana",
    extensions: [
      "jhc"
    ]
  },
  "image/jpm": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpm"
    ]
  },
  "image/jpx": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpx",
      "jpf"
    ]
  },
  "image/jxr": {
    source: "iana",
    extensions: [
      "jxr"
    ]
  },
  "image/jxra": {
    source: "iana",
    extensions: [
      "jxra"
    ]
  },
  "image/jxrs": {
    source: "iana",
    extensions: [
      "jxrs"
    ]
  },
  "image/jxs": {
    source: "iana",
    extensions: [
      "jxs"
    ]
  },
  "image/jxsc": {
    source: "iana",
    extensions: [
      "jxsc"
    ]
  },
  "image/jxsi": {
    source: "iana",
    extensions: [
      "jxsi"
    ]
  },
  "image/jxss": {
    source: "iana",
    extensions: [
      "jxss"
    ]
  },
  "image/ktx": {
    source: "iana",
    extensions: [
      "ktx"
    ]
  },
  "image/ktx2": {
    source: "iana",
    extensions: [
      "ktx2"
    ]
  },
  "image/naplps": {
    source: "iana"
  },
  "image/pjpeg": {
    compressible: !1
  },
  "image/png": {
    source: "iana",
    compressible: !1,
    extensions: [
      "png"
    ]
  },
  "image/prs.btif": {
    source: "iana",
    extensions: [
      "btif"
    ]
  },
  "image/prs.pti": {
    source: "iana",
    extensions: [
      "pti"
    ]
  },
  "image/pwg-raster": {
    source: "iana"
  },
  "image/sgi": {
    source: "apache",
    extensions: [
      "sgi"
    ]
  },
  "image/svg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "svg",
      "svgz"
    ]
  },
  "image/t38": {
    source: "iana",
    extensions: [
      "t38"
    ]
  },
  "image/tiff": {
    source: "iana",
    compressible: !1,
    extensions: [
      "tif",
      "tiff"
    ]
  },
  "image/tiff-fx": {
    source: "iana",
    extensions: [
      "tfx"
    ]
  },
  "image/vnd.adobe.photoshop": {
    source: "iana",
    compressible: !0,
    extensions: [
      "psd"
    ]
  },
  "image/vnd.airzip.accelerator.azv": {
    source: "iana",
    extensions: [
      "azv"
    ]
  },
  "image/vnd.cns.inf2": {
    source: "iana"
  },
  "image/vnd.dece.graphic": {
    source: "iana",
    extensions: [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    source: "iana",
    extensions: [
      "djvu",
      "djv"
    ]
  },
  "image/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "image/vnd.dwg": {
    source: "iana",
    extensions: [
      "dwg"
    ]
  },
  "image/vnd.dxf": {
    source: "iana",
    extensions: [
      "dxf"
    ]
  },
  "image/vnd.fastbidsheet": {
    source: "iana",
    extensions: [
      "fbs"
    ]
  },
  "image/vnd.fpx": {
    source: "iana",
    extensions: [
      "fpx"
    ]
  },
  "image/vnd.fst": {
    source: "iana",
    extensions: [
      "fst"
    ]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    source: "iana",
    extensions: [
      "mmr"
    ]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    source: "iana",
    extensions: [
      "rlc"
    ]
  },
  "image/vnd.globalgraphics.pgb": {
    source: "iana"
  },
  "image/vnd.microsoft.icon": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/vnd.mix": {
    source: "iana"
  },
  "image/vnd.mozilla.apng": {
    source: "iana"
  },
  "image/vnd.ms-dds": {
    compressible: !0,
    extensions: [
      "dds"
    ]
  },
  "image/vnd.ms-modi": {
    source: "iana",
    extensions: [
      "mdi"
    ]
  },
  "image/vnd.ms-photo": {
    source: "apache",
    extensions: [
      "wdp"
    ]
  },
  "image/vnd.net-fpx": {
    source: "iana",
    extensions: [
      "npx"
    ]
  },
  "image/vnd.pco.b16": {
    source: "iana",
    extensions: [
      "b16"
    ]
  },
  "image/vnd.radiance": {
    source: "iana"
  },
  "image/vnd.sealed.png": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    source: "iana"
  },
  "image/vnd.svf": {
    source: "iana"
  },
  "image/vnd.tencent.tap": {
    source: "iana",
    extensions: [
      "tap"
    ]
  },
  "image/vnd.valve.source.texture": {
    source: "iana",
    extensions: [
      "vtf"
    ]
  },
  "image/vnd.wap.wbmp": {
    source: "iana",
    extensions: [
      "wbmp"
    ]
  },
  "image/vnd.xiff": {
    source: "iana",
    extensions: [
      "xif"
    ]
  },
  "image/vnd.zbrush.pcx": {
    source: "iana",
    extensions: [
      "pcx"
    ]
  },
  "image/webp": {
    source: "apache",
    extensions: [
      "webp"
    ]
  },
  "image/wmf": {
    source: "iana",
    extensions: [
      "wmf"
    ]
  },
  "image/x-3ds": {
    source: "apache",
    extensions: [
      "3ds"
    ]
  },
  "image/x-cmu-raster": {
    source: "apache",
    extensions: [
      "ras"
    ]
  },
  "image/x-cmx": {
    source: "apache",
    extensions: [
      "cmx"
    ]
  },
  "image/x-freehand": {
    source: "apache",
    extensions: [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/x-jng": {
    source: "nginx",
    extensions: [
      "jng"
    ]
  },
  "image/x-mrsid-image": {
    source: "apache",
    extensions: [
      "sid"
    ]
  },
  "image/x-ms-bmp": {
    source: "nginx",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/x-pcx": {
    source: "apache",
    extensions: [
      "pcx"
    ]
  },
  "image/x-pict": {
    source: "apache",
    extensions: [
      "pic",
      "pct"
    ]
  },
  "image/x-portable-anymap": {
    source: "apache",
    extensions: [
      "pnm"
    ]
  },
  "image/x-portable-bitmap": {
    source: "apache",
    extensions: [
      "pbm"
    ]
  },
  "image/x-portable-graymap": {
    source: "apache",
    extensions: [
      "pgm"
    ]
  },
  "image/x-portable-pixmap": {
    source: "apache",
    extensions: [
      "ppm"
    ]
  },
  "image/x-rgb": {
    source: "apache",
    extensions: [
      "rgb"
    ]
  },
  "image/x-tga": {
    source: "apache",
    extensions: [
      "tga"
    ]
  },
  "image/x-xbitmap": {
    source: "apache",
    extensions: [
      "xbm"
    ]
  },
  "image/x-xcf": {
    compressible: !1
  },
  "image/x-xpixmap": {
    source: "apache",
    extensions: [
      "xpm"
    ]
  },
  "image/x-xwindowdump": {
    source: "apache",
    extensions: [
      "xwd"
    ]
  },
  "message/cpim": {
    source: "iana"
  },
  "message/delivery-status": {
    source: "iana"
  },
  "message/disposition-notification": {
    source: "iana",
    extensions: [
      "disposition-notification"
    ]
  },
  "message/external-body": {
    source: "iana"
  },
  "message/feedback-report": {
    source: "iana"
  },
  "message/global": {
    source: "iana",
    extensions: [
      "u8msg"
    ]
  },
  "message/global-delivery-status": {
    source: "iana",
    extensions: [
      "u8dsn"
    ]
  },
  "message/global-disposition-notification": {
    source: "iana",
    extensions: [
      "u8mdn"
    ]
  },
  "message/global-headers": {
    source: "iana",
    extensions: [
      "u8hdr"
    ]
  },
  "message/http": {
    source: "iana",
    compressible: !1
  },
  "message/imdn+xml": {
    source: "iana",
    compressible: !0
  },
  "message/news": {
    source: "iana"
  },
  "message/partial": {
    source: "iana",
    compressible: !1
  },
  "message/rfc822": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eml",
      "mime"
    ]
  },
  "message/s-http": {
    source: "iana"
  },
  "message/sip": {
    source: "iana"
  },
  "message/sipfrag": {
    source: "iana"
  },
  "message/tracking-status": {
    source: "iana"
  },
  "message/vnd.si.simp": {
    source: "iana"
  },
  "message/vnd.wfa.wsc": {
    source: "iana",
    extensions: [
      "wsc"
    ]
  },
  "model/3mf": {
    source: "iana",
    extensions: [
      "3mf"
    ]
  },
  "model/e57": {
    source: "iana"
  },
  "model/gltf+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gltf"
    ]
  },
  "model/gltf-binary": {
    source: "iana",
    compressible: !0,
    extensions: [
      "glb"
    ]
  },
  "model/iges": {
    source: "iana",
    compressible: !1,
    extensions: [
      "igs",
      "iges"
    ]
  },
  "model/mesh": {
    source: "iana",
    compressible: !1,
    extensions: [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    source: "iana",
    extensions: [
      "mtl"
    ]
  },
  "model/obj": {
    source: "iana",
    extensions: [
      "obj"
    ]
  },
  "model/step": {
    source: "iana"
  },
  "model/step+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "stpx"
    ]
  },
  "model/step+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpz"
    ]
  },
  "model/step-xml+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpxz"
    ]
  },
  "model/stl": {
    source: "iana",
    extensions: [
      "stl"
    ]
  },
  "model/vnd.collada+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dae"
    ]
  },
  "model/vnd.dwf": {
    source: "iana",
    extensions: [
      "dwf"
    ]
  },
  "model/vnd.flatland.3dml": {
    source: "iana"
  },
  "model/vnd.gdl": {
    source: "iana",
    extensions: [
      "gdl"
    ]
  },
  "model/vnd.gs-gdl": {
    source: "apache"
  },
  "model/vnd.gs.gdl": {
    source: "iana"
  },
  "model/vnd.gtw": {
    source: "iana",
    extensions: [
      "gtw"
    ]
  },
  "model/vnd.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "model/vnd.mts": {
    source: "iana",
    extensions: [
      "mts"
    ]
  },
  "model/vnd.opengex": {
    source: "iana",
    extensions: [
      "ogex"
    ]
  },
  "model/vnd.parasolid.transmit.binary": {
    source: "iana",
    extensions: [
      "x_b"
    ]
  },
  "model/vnd.parasolid.transmit.text": {
    source: "iana",
    extensions: [
      "x_t"
    ]
  },
  "model/vnd.pytha.pyox": {
    source: "iana"
  },
  "model/vnd.rosette.annotated-data-model": {
    source: "iana"
  },
  "model/vnd.sap.vds": {
    source: "iana",
    extensions: [
      "vds"
    ]
  },
  "model/vnd.usdz+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "usdz"
    ]
  },
  "model/vnd.valve.source.compiled-map": {
    source: "iana",
    extensions: [
      "bsp"
    ]
  },
  "model/vnd.vtu": {
    source: "iana",
    extensions: [
      "vtu"
    ]
  },
  "model/vrml": {
    source: "iana",
    compressible: !1,
    extensions: [
      "wrl",
      "vrml"
    ]
  },
  "model/x3d+binary": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3db",
      "x3dbz"
    ]
  },
  "model/x3d+fastinfoset": {
    source: "iana",
    extensions: [
      "x3db"
    ]
  },
  "model/x3d+vrml": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3dv",
      "x3dvz"
    ]
  },
  "model/x3d+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "x3d",
      "x3dz"
    ]
  },
  "model/x3d-vrml": {
    source: "iana",
    extensions: [
      "x3dv"
    ]
  },
  "multipart/alternative": {
    source: "iana",
    compressible: !1
  },
  "multipart/appledouble": {
    source: "iana"
  },
  "multipart/byteranges": {
    source: "iana"
  },
  "multipart/digest": {
    source: "iana"
  },
  "multipart/encrypted": {
    source: "iana",
    compressible: !1
  },
  "multipart/form-data": {
    source: "iana",
    compressible: !1
  },
  "multipart/header-set": {
    source: "iana"
  },
  "multipart/mixed": {
    source: "iana"
  },
  "multipart/multilingual": {
    source: "iana"
  },
  "multipart/parallel": {
    source: "iana"
  },
  "multipart/related": {
    source: "iana",
    compressible: !1
  },
  "multipart/report": {
    source: "iana"
  },
  "multipart/signed": {
    source: "iana",
    compressible: !1
  },
  "multipart/vnd.bint.med-plus": {
    source: "iana"
  },
  "multipart/voice-message": {
    source: "iana"
  },
  "multipart/x-mixed-replace": {
    source: "iana"
  },
  "text/1d-interleaved-parityfec": {
    source: "iana"
  },
  "text/cache-manifest": {
    source: "iana",
    compressible: !0,
    extensions: [
      "appcache",
      "manifest"
    ]
  },
  "text/calendar": {
    source: "iana",
    extensions: [
      "ics",
      "ifb"
    ]
  },
  "text/calender": {
    compressible: !0
  },
  "text/cmd": {
    compressible: !0
  },
  "text/coffeescript": {
    extensions: [
      "coffee",
      "litcoffee"
    ]
  },
  "text/cql": {
    source: "iana"
  },
  "text/cql-expression": {
    source: "iana"
  },
  "text/cql-identifier": {
    source: "iana"
  },
  "text/css": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "css"
    ]
  },
  "text/csv": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csv"
    ]
  },
  "text/csv-schema": {
    source: "iana"
  },
  "text/directory": {
    source: "iana"
  },
  "text/dns": {
    source: "iana"
  },
  "text/ecmascript": {
    source: "iana"
  },
  "text/encaprtp": {
    source: "iana"
  },
  "text/enriched": {
    source: "iana"
  },
  "text/fhirpath": {
    source: "iana"
  },
  "text/flexfec": {
    source: "iana"
  },
  "text/fwdred": {
    source: "iana"
  },
  "text/gff3": {
    source: "iana"
  },
  "text/grammar-ref-list": {
    source: "iana"
  },
  "text/html": {
    source: "iana",
    compressible: !0,
    extensions: [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/jade": {
    extensions: [
      "jade"
    ]
  },
  "text/javascript": {
    source: "iana",
    compressible: !0
  },
  "text/jcr-cnd": {
    source: "iana"
  },
  "text/jsx": {
    compressible: !0,
    extensions: [
      "jsx"
    ]
  },
  "text/less": {
    compressible: !0,
    extensions: [
      "less"
    ]
  },
  "text/markdown": {
    source: "iana",
    compressible: !0,
    extensions: [
      "markdown",
      "md"
    ]
  },
  "text/mathml": {
    source: "nginx",
    extensions: [
      "mml"
    ]
  },
  "text/mdx": {
    compressible: !0,
    extensions: [
      "mdx"
    ]
  },
  "text/mizar": {
    source: "iana"
  },
  "text/n3": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "n3"
    ]
  },
  "text/parameters": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/parityfec": {
    source: "iana"
  },
  "text/plain": {
    source: "iana",
    compressible: !0,
    extensions: [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/provenance-notation": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/prs.fallenstein.rst": {
    source: "iana"
  },
  "text/prs.lines.tag": {
    source: "iana",
    extensions: [
      "dsc"
    ]
  },
  "text/prs.prop.logic": {
    source: "iana"
  },
  "text/raptorfec": {
    source: "iana"
  },
  "text/red": {
    source: "iana"
  },
  "text/rfc822-headers": {
    source: "iana"
  },
  "text/richtext": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtx"
    ]
  },
  "text/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "text/rtp-enc-aescm128": {
    source: "iana"
  },
  "text/rtploopback": {
    source: "iana"
  },
  "text/rtx": {
    source: "iana"
  },
  "text/sgml": {
    source: "iana",
    extensions: [
      "sgml",
      "sgm"
    ]
  },
  "text/shaclc": {
    source: "iana"
  },
  "text/shex": {
    source: "iana",
    extensions: [
      "shex"
    ]
  },
  "text/slim": {
    extensions: [
      "slim",
      "slm"
    ]
  },
  "text/spdx": {
    source: "iana",
    extensions: [
      "spdx"
    ]
  },
  "text/strings": {
    source: "iana"
  },
  "text/stylus": {
    extensions: [
      "stylus",
      "styl"
    ]
  },
  "text/t140": {
    source: "iana"
  },
  "text/tab-separated-values": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tsv"
    ]
  },
  "text/troff": {
    source: "iana",
    extensions: [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "ttl"
    ]
  },
  "text/ulpfec": {
    source: "iana"
  },
  "text/uri-list": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vcard"
    ]
  },
  "text/vnd.a": {
    source: "iana"
  },
  "text/vnd.abc": {
    source: "iana"
  },
  "text/vnd.ascii-art": {
    source: "iana"
  },
  "text/vnd.curl": {
    source: "iana",
    extensions: [
      "curl"
    ]
  },
  "text/vnd.curl.dcurl": {
    source: "apache",
    extensions: [
      "dcurl"
    ]
  },
  "text/vnd.curl.mcurl": {
    source: "apache",
    extensions: [
      "mcurl"
    ]
  },
  "text/vnd.curl.scurl": {
    source: "apache",
    extensions: [
      "scurl"
    ]
  },
  "text/vnd.debian.copyright": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.dmclientscript": {
    source: "iana"
  },
  "text/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "text/vnd.esmertec.theme-descriptor": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.familysearch.gedcom": {
    source: "iana",
    extensions: [
      "ged"
    ]
  },
  "text/vnd.ficlab.flt": {
    source: "iana"
  },
  "text/vnd.fly": {
    source: "iana",
    extensions: [
      "fly"
    ]
  },
  "text/vnd.fmi.flexstor": {
    source: "iana",
    extensions: [
      "flx"
    ]
  },
  "text/vnd.gml": {
    source: "iana"
  },
  "text/vnd.graphviz": {
    source: "iana",
    extensions: [
      "gv"
    ]
  },
  "text/vnd.hans": {
    source: "iana"
  },
  "text/vnd.hgl": {
    source: "iana"
  },
  "text/vnd.in3d.3dml": {
    source: "iana",
    extensions: [
      "3dml"
    ]
  },
  "text/vnd.in3d.spot": {
    source: "iana",
    extensions: [
      "spot"
    ]
  },
  "text/vnd.iptc.newsml": {
    source: "iana"
  },
  "text/vnd.iptc.nitf": {
    source: "iana"
  },
  "text/vnd.latex-z": {
    source: "iana"
  },
  "text/vnd.motorola.reflex": {
    source: "iana"
  },
  "text/vnd.ms-mediapackage": {
    source: "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    source: "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    source: "iana"
  },
  "text/vnd.senx.warpscript": {
    source: "iana"
  },
  "text/vnd.si.uricatalogue": {
    source: "iana"
  },
  "text/vnd.sosi": {
    source: "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "jad"
    ]
  },
  "text/vnd.trolltech.linguist": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.wap.si": {
    source: "iana"
  },
  "text/vnd.wap.sl": {
    source: "iana"
  },
  "text/vnd.wap.wml": {
    source: "iana",
    extensions: [
      "wml"
    ]
  },
  "text/vnd.wap.wmlscript": {
    source: "iana",
    extensions: [
      "wmls"
    ]
  },
  "text/vtt": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "vtt"
    ]
  },
  "text/x-asm": {
    source: "apache",
    extensions: [
      "s",
      "asm"
    ]
  },
  "text/x-c": {
    source: "apache",
    extensions: [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    source: "nginx",
    extensions: [
      "htc"
    ]
  },
  "text/x-fortran": {
    source: "apache",
    extensions: [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-gwt-rpc": {
    compressible: !0
  },
  "text/x-handlebars-template": {
    extensions: [
      "hbs"
    ]
  },
  "text/x-java-source": {
    source: "apache",
    extensions: [
      "java"
    ]
  },
  "text/x-jquery-tmpl": {
    compressible: !0
  },
  "text/x-lua": {
    extensions: [
      "lua"
    ]
  },
  "text/x-markdown": {
    compressible: !0,
    extensions: [
      "mkd"
    ]
  },
  "text/x-nfo": {
    source: "apache",
    extensions: [
      "nfo"
    ]
  },
  "text/x-opml": {
    source: "apache",
    extensions: [
      "opml"
    ]
  },
  "text/x-org": {
    compressible: !0,
    extensions: [
      "org"
    ]
  },
  "text/x-pascal": {
    source: "apache",
    extensions: [
      "p",
      "pas"
    ]
  },
  "text/x-processing": {
    compressible: !0,
    extensions: [
      "pde"
    ]
  },
  "text/x-sass": {
    extensions: [
      "sass"
    ]
  },
  "text/x-scss": {
    extensions: [
      "scss"
    ]
  },
  "text/x-setext": {
    source: "apache",
    extensions: [
      "etx"
    ]
  },
  "text/x-sfv": {
    source: "apache",
    extensions: [
      "sfv"
    ]
  },
  "text/x-suse-ymp": {
    compressible: !0,
    extensions: [
      "ymp"
    ]
  },
  "text/x-uuencode": {
    source: "apache",
    extensions: [
      "uu"
    ]
  },
  "text/x-vcalendar": {
    source: "apache",
    extensions: [
      "vcs"
    ]
  },
  "text/x-vcard": {
    source: "apache",
    extensions: [
      "vcf"
    ]
  },
  "text/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml"
    ]
  },
  "text/xml-external-parsed-entity": {
    source: "iana"
  },
  "text/yaml": {
    compressible: !0,
    extensions: [
      "yaml",
      "yml"
    ]
  },
  "video/1d-interleaved-parityfec": {
    source: "iana"
  },
  "video/3gpp": {
    source: "iana",
    extensions: [
      "3gp",
      "3gpp"
    ]
  },
  "video/3gpp-tt": {
    source: "iana"
  },
  "video/3gpp2": {
    source: "iana",
    extensions: [
      "3g2"
    ]
  },
  "video/av1": {
    source: "iana"
  },
  "video/bmpeg": {
    source: "iana"
  },
  "video/bt656": {
    source: "iana"
  },
  "video/celb": {
    source: "iana"
  },
  "video/dv": {
    source: "iana"
  },
  "video/encaprtp": {
    source: "iana"
  },
  "video/ffv1": {
    source: "iana"
  },
  "video/flexfec": {
    source: "iana"
  },
  "video/h261": {
    source: "iana",
    extensions: [
      "h261"
    ]
  },
  "video/h263": {
    source: "iana",
    extensions: [
      "h263"
    ]
  },
  "video/h263-1998": {
    source: "iana"
  },
  "video/h263-2000": {
    source: "iana"
  },
  "video/h264": {
    source: "iana",
    extensions: [
      "h264"
    ]
  },
  "video/h264-rcdo": {
    source: "iana"
  },
  "video/h264-svc": {
    source: "iana"
  },
  "video/h265": {
    source: "iana"
  },
  "video/iso.segment": {
    source: "iana",
    extensions: [
      "m4s"
    ]
  },
  "video/jpeg": {
    source: "iana",
    extensions: [
      "jpgv"
    ]
  },
  "video/jpeg2000": {
    source: "iana"
  },
  "video/jpm": {
    source: "apache",
    extensions: [
      "jpm",
      "jpgm"
    ]
  },
  "video/jxsv": {
    source: "iana"
  },
  "video/mj2": {
    source: "iana",
    extensions: [
      "mj2",
      "mjp2"
    ]
  },
  "video/mp1s": {
    source: "iana"
  },
  "video/mp2p": {
    source: "iana"
  },
  "video/mp2t": {
    source: "iana",
    extensions: [
      "ts"
    ]
  },
  "video/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mp4v-es": {
    source: "iana"
  },
  "video/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/mpeg4-generic": {
    source: "iana"
  },
  "video/mpv": {
    source: "iana"
  },
  "video/nv": {
    source: "iana"
  },
  "video/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogv"
    ]
  },
  "video/parityfec": {
    source: "iana"
  },
  "video/pointer": {
    source: "iana"
  },
  "video/quicktime": {
    source: "iana",
    compressible: !1,
    extensions: [
      "qt",
      "mov"
    ]
  },
  "video/raptorfec": {
    source: "iana"
  },
  "video/raw": {
    source: "iana"
  },
  "video/rtp-enc-aescm128": {
    source: "iana"
  },
  "video/rtploopback": {
    source: "iana"
  },
  "video/rtx": {
    source: "iana"
  },
  "video/scip": {
    source: "iana"
  },
  "video/smpte291": {
    source: "iana"
  },
  "video/smpte292m": {
    source: "iana"
  },
  "video/ulpfec": {
    source: "iana"
  },
  "video/vc1": {
    source: "iana"
  },
  "video/vc2": {
    source: "iana"
  },
  "video/vnd.cctv": {
    source: "iana"
  },
  "video/vnd.dece.hd": {
    source: "iana",
    extensions: [
      "uvh",
      "uvvh"
    ]
  },
  "video/vnd.dece.mobile": {
    source: "iana",
    extensions: [
      "uvm",
      "uvvm"
    ]
  },
  "video/vnd.dece.mp4": {
    source: "iana"
  },
  "video/vnd.dece.pd": {
    source: "iana",
    extensions: [
      "uvp",
      "uvvp"
    ]
  },
  "video/vnd.dece.sd": {
    source: "iana",
    extensions: [
      "uvs",
      "uvvs"
    ]
  },
  "video/vnd.dece.video": {
    source: "iana",
    extensions: [
      "uvv",
      "uvvv"
    ]
  },
  "video/vnd.directv.mpeg": {
    source: "iana"
  },
  "video/vnd.directv.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dlna.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dvb.file": {
    source: "iana",
    extensions: [
      "dvb"
    ]
  },
  "video/vnd.fvt": {
    source: "iana",
    extensions: [
      "fvt"
    ]
  },
  "video/vnd.hns.video": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsavc": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    source: "iana"
  },
  "video/vnd.motorola.video": {
    source: "iana"
  },
  "video/vnd.motorola.videop": {
    source: "iana"
  },
  "video/vnd.mpegurl": {
    source: "iana",
    extensions: [
      "mxu",
      "m4u"
    ]
  },
  "video/vnd.ms-playready.media.pyv": {
    source: "iana",
    extensions: [
      "pyv"
    ]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    source: "iana"
  },
  "video/vnd.nokia.mp4vr": {
    source: "iana"
  },
  "video/vnd.nokia.videovoip": {
    source: "iana"
  },
  "video/vnd.objectvideo": {
    source: "iana"
  },
  "video/vnd.radgamettools.bink": {
    source: "iana"
  },
  "video/vnd.radgamettools.smacker": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg1": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg4": {
    source: "iana"
  },
  "video/vnd.sealed.swf": {
    source: "iana"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    source: "iana"
  },
  "video/vnd.uvvu.mp4": {
    source: "iana",
    extensions: [
      "uvu",
      "uvvu"
    ]
  },
  "video/vnd.vivo": {
    source: "iana",
    extensions: [
      "viv"
    ]
  },
  "video/vnd.youtube.yt": {
    source: "iana"
  },
  "video/vp8": {
    source: "iana"
  },
  "video/vp9": {
    source: "iana"
  },
  "video/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "webm"
    ]
  },
  "video/x-f4v": {
    source: "apache",
    extensions: [
      "f4v"
    ]
  },
  "video/x-fli": {
    source: "apache",
    extensions: [
      "fli"
    ]
  },
  "video/x-flv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "flv"
    ]
  },
  "video/x-m4v": {
    source: "apache",
    extensions: [
      "m4v"
    ]
  },
  "video/x-matroska": {
    source: "apache",
    compressible: !1,
    extensions: [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    source: "apache",
    extensions: [
      "mng"
    ]
  },
  "video/x-ms-asf": {
    source: "apache",
    extensions: [
      "asf",
      "asx"
    ]
  },
  "video/x-ms-vob": {
    source: "apache",
    extensions: [
      "vob"
    ]
  },
  "video/x-ms-wm": {
    source: "apache",
    extensions: [
      "wm"
    ]
  },
  "video/x-ms-wmv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "wmv"
    ]
  },
  "video/x-ms-wmx": {
    source: "apache",
    extensions: [
      "wmx"
    ]
  },
  "video/x-ms-wvx": {
    source: "apache",
    extensions: [
      "wvx"
    ]
  },
  "video/x-msvideo": {
    source: "apache",
    extensions: [
      "avi"
    ]
  },
  "video/x-sgi-movie": {
    source: "apache",
    extensions: [
      "movie"
    ]
  },
  "video/x-smv": {
    source: "apache",
    extensions: [
      "smv"
    ]
  },
  "x-conference/x-cooltalk": {
    source: "apache",
    extensions: [
      "ice"
    ]
  },
  "x-shader/x-fragment": {
    compressible: !0
  },
  "x-shader/x-vertex": {
    compressible: !0
  }
};
/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2022 Douglas Christopher Wilson
 * MIT Licensed
 */
var Ro = To;
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(e) {
  var a = Ro, n = gi.extname, i = /^\s*([^;\s]*)(?:;|\s|$)/, t = /^text\//i;
  e.charset = s, e.charsets = { lookup: s }, e.contentType = r, e.extension = d, e.extensions = /* @__PURE__ */ Object.create(null), e.lookup = f, e.types = /* @__PURE__ */ Object.create(null), x(e.extensions, e.types);
  function s(p) {
    if (!p || typeof p != "string")
      return !1;
    var o = i.exec(p), c = o && a[o[1].toLowerCase()];
    return c && c.charset ? c.charset : o && t.test(o[1]) ? "UTF-8" : !1;
  }
  function r(p) {
    if (!p || typeof p != "string")
      return !1;
    var o = p.indexOf("/") === -1 ? e.lookup(p) : p;
    if (!o)
      return !1;
    if (o.indexOf("charset") === -1) {
      var c = e.charset(o);
      c && (o += "; charset=" + c.toLowerCase());
    }
    return o;
  }
  function d(p) {
    if (!p || typeof p != "string")
      return !1;
    var o = i.exec(p), c = o && e.extensions[o[1].toLowerCase()];
    return !c || !c.length ? !1 : c[0];
  }
  function f(p) {
    if (!p || typeof p != "string")
      return !1;
    var o = n("x." + p).toLowerCase().substr(1);
    return o && e.types[o] || !1;
  }
  function x(p, o) {
    var c = ["nginx", "apache", void 0, "iana"];
    Object.keys(a).forEach(function(u) {
      var h = a[u], v = h.extensions;
      if (!(!v || !v.length)) {
        p[u] = v;
        for (var b = 0; b < v.length; b++) {
          var y = v[b];
          if (o[y]) {
            var E = c.indexOf(a[o[y]].source), k = c.indexOf(h.source);
            if (o[y] !== "application/octet-stream" && (E > k || E === k && o[y].substr(0, 12) === "application/"))
              continue;
          }
          o[y] = u;
        }
      }
    });
  }
})(Ui);
var ko = So;
function So(e) {
  var a = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
  a ? a(e) : setTimeout(e, 0);
}
var Tn = ko, Di = Ao;
function Ao(e) {
  var a = !1;
  return Tn(function() {
    a = !0;
  }), function(i, t) {
    a ? e(i, t) : Tn(function() {
      e(i, t);
    });
  };
}
var Bi = Co;
function Co(e) {
  Object.keys(e.jobs).forEach(Oo.bind(e)), e.jobs = {};
}
function Oo(e) {
  typeof this.jobs[e] == "function" && this.jobs[e]();
}
var Rn = Di, jo = Bi, qi = Lo;
function Lo(e, a, n, i) {
  var t = n.keyedList ? n.keyedList[n.index] : n.index;
  n.jobs[t] = Po(a, t, e[t], function(s, r) {
    t in n.jobs && (delete n.jobs[t], s ? jo(n) : n.results[t] = r, i(s, n.results));
  });
}
function Po(e, a, n, i) {
  var t;
  return e.length == 2 ? t = e(n, Rn(i)) : t = e(n, a, Rn(i)), t;
}
var zi = No;
function No(e, a) {
  var n = !Array.isArray(e), i = {
    index: 0,
    keyedList: n || a ? Object.keys(e) : null,
    jobs: {},
    results: n ? {} : [],
    size: n ? Object.keys(e).length : e.length
  };
  return a && i.keyedList.sort(n ? a : function(t, s) {
    return a(e[t], e[s]);
  }), i;
}
var Fo = Bi, Io = Di, Mi = Uo;
function Uo(e) {
  Object.keys(this.jobs).length && (this.index = this.size, Fo(this), Io(e)(null, this.results));
}
var Do = qi, Bo = zi, qo = Mi, zo = Mo;
function Mo(e, a, n) {
  for (var i = Bo(e); i.index < (i.keyedList || e).length; )
    Do(e, a, i, function(t, s) {
      if (t) {
        n(t, s);
        return;
      }
      if (Object.keys(i.jobs).length === 0) {
        n(null, i.results);
        return;
      }
    }), i.index++;
  return qo.bind(i, n);
}
var ua = { exports: {} }, kn = qi, $o = zi, Ho = Mi;
ua.exports = Wo;
ua.exports.ascending = $i;
ua.exports.descending = Vo;
function Wo(e, a, n, i) {
  var t = $o(e, n);
  return kn(e, a, t, function s(r, d) {
    if (r) {
      i(r, d);
      return;
    }
    if (t.index++, t.index < (t.keyedList || e).length) {
      kn(e, a, t, s);
      return;
    }
    i(null, t.results);
  }), Ho.bind(t, i);
}
function $i(e, a) {
  return e < a ? -1 : e > a ? 1 : 0;
}
function Vo(e, a) {
  return -1 * $i(e, a);
}
var Hi = ua.exports, Go = Hi, Xo = Ko;
function Ko(e, a, n) {
  return Go(e, a, null, n);
}
var Jo = {
  parallel: zo,
  serial: Xo,
  serialOrdered: Hi
}, Wi = Object, Yo = Error, Qo = EvalError, Zo = RangeError, es = ReferenceError, as = SyntaxError, va, Sn;
function on() {
  return Sn || (Sn = 1, va = TypeError), va;
}
var ns = URIError, is = Math.abs, ts = Math.floor, os = Math.max, ss = Math.min, rs = Math.pow, cs = Math.round, ps = Number.isNaN || function(a) {
  return a !== a;
}, ls = ps, us = function(a) {
  return ls(a) || a === 0 ? a : a < 0 ? -1 : 1;
}, ds = Object.getOwnPropertyDescriptor, Qe = ds;
if (Qe)
  try {
    Qe([], "length");
  } catch {
    Qe = null;
  }
var Vi = Qe, Ze = Object.defineProperty || !1;
if (Ze)
  try {
    Ze({}, "a", { value: 1 });
  } catch {
    Ze = !1;
  }
var ms = Ze, ha, An;
function Gi() {
  return An || (An = 1, ha = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var a = {}, n = Symbol("test"), i = Object(n);
    if (typeof n == "string" || Object.prototype.toString.call(n) !== "[object Symbol]" || Object.prototype.toString.call(i) !== "[object Symbol]")
      return !1;
    var t = 42;
    a[n] = t;
    for (var s in a)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(a).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(a).length !== 0)
      return !1;
    var r = Object.getOwnPropertySymbols(a);
    if (r.length !== 1 || r[0] !== n || !Object.prototype.propertyIsEnumerable.call(a, n))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var d = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(a, n)
      );
      if (d.value !== t || d.enumerable !== !0)
        return !1;
    }
    return !0;
  }), ha;
}
var ba, Cn;
function fs() {
  if (Cn) return ba;
  Cn = 1;
  var e = typeof Symbol < "u" && Symbol, a = Gi();
  return ba = function() {
    return typeof e != "function" || typeof Symbol != "function" || typeof e("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : a();
  }, ba;
}
var ga, On;
function Xi() {
  return On || (On = 1, ga = typeof Reflect < "u" && Reflect.getPrototypeOf || null), ga;
}
var ya, jn;
function Ki() {
  if (jn) return ya;
  jn = 1;
  var e = Wi;
  return ya = e.getPrototypeOf || null, ya;
}
var xs = "Function.prototype.bind called on incompatible ", vs = Object.prototype.toString, hs = Math.max, bs = "[object Function]", Ln = function(a, n) {
  for (var i = [], t = 0; t < a.length; t += 1)
    i[t] = a[t];
  for (var s = 0; s < n.length; s += 1)
    i[s + a.length] = n[s];
  return i;
}, gs = function(a, n) {
  for (var i = [], t = n, s = 0; t < a.length; t += 1, s += 1)
    i[s] = a[t];
  return i;
}, ys = function(e, a) {
  for (var n = "", i = 0; i < e.length; i += 1)
    n += e[i], i + 1 < e.length && (n += a);
  return n;
}, ws = function(a) {
  var n = this;
  if (typeof n != "function" || vs.apply(n) !== bs)
    throw new TypeError(xs + n);
  for (var i = gs(arguments, 1), t, s = function() {
    if (this instanceof t) {
      var p = n.apply(
        this,
        Ln(i, arguments)
      );
      return Object(p) === p ? p : this;
    }
    return n.apply(
      a,
      Ln(i, arguments)
    );
  }, r = hs(0, n.length - i.length), d = [], f = 0; f < r; f++)
    d[f] = "$" + f;
  if (t = Function("binder", "return function (" + ys(d, ",") + "){ return binder.apply(this,arguments); }")(s), n.prototype) {
    var x = function() {
    };
    x.prototype = n.prototype, t.prototype = new x(), x.prototype = null;
  }
  return t;
}, Es = ws, da = Function.prototype.bind || Es, wa, Pn;
function sn() {
  return Pn || (Pn = 1, wa = Function.prototype.call), wa;
}
var Ea, Nn;
function Ji() {
  return Nn || (Nn = 1, Ea = Function.prototype.apply), Ea;
}
var _a, Fn;
function _s() {
  return Fn || (Fn = 1, _a = typeof Reflect < "u" && Reflect && Reflect.apply), _a;
}
var Ta, In;
function Ts() {
  if (In) return Ta;
  In = 1;
  var e = da, a = Ji(), n = sn(), i = _s();
  return Ta = i || e.call(n, a), Ta;
}
var Ra, Un;
function Rs() {
  if (Un) return Ra;
  Un = 1;
  var e = da, a = on(), n = sn(), i = Ts();
  return Ra = function(s) {
    if (s.length < 1 || typeof s[0] != "function")
      throw new a("a function is required");
    return i(e, n, s);
  }, Ra;
}
var ka, Dn;
function ks() {
  if (Dn) return ka;
  Dn = 1;
  var e = Rs(), a = Vi, n;
  try {
    n = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (r) {
    if (!r || typeof r != "object" || !("code" in r) || r.code !== "ERR_PROTO_ACCESS")
      throw r;
  }
  var i = !!n && a && a(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), t = Object, s = t.getPrototypeOf;
  return ka = i && typeof i.get == "function" ? e([i.get]) : typeof s == "function" ? (
    /** @type {import('./get')} */
    function(d) {
      return s(d == null ? d : t(d));
    }
  ) : !1, ka;
}
var Sa, Bn;
function Ss() {
  if (Bn) return Sa;
  Bn = 1;
  var e = Xi(), a = Ki(), n = ks();
  return Sa = e ? function(t) {
    return e(t);
  } : a ? function(t) {
    if (!t || typeof t != "object" && typeof t != "function")
      throw new TypeError("getProto: not an object");
    return a(t);
  } : n ? function(t) {
    return n(t);
  } : null, Sa;
}
var As = Function.prototype.call, Cs = Object.prototype.hasOwnProperty, Os = da, rn = Os.call(As, Cs), R, js = Wi, Ls = Yo, Ps = Qo, Ns = Zo, Fs = es, Se = as, Re = on(), Is = ns, Us = is, Ds = ts, Bs = os, qs = ss, zs = rs, Ms = cs, $s = us, Yi = Function, Aa = function(e) {
  try {
    return Yi('"use strict"; return (' + e + ").constructor;")();
  } catch {
  }
}, Ne = Vi, Hs = ms, Ca = function() {
  throw new Re();
}, Ws = Ne ? function() {
  try {
    return arguments.callee, Ca;
  } catch {
    try {
      return Ne(arguments, "callee").get;
    } catch {
      return Ca;
    }
  }
}() : Ca, we = fs()(), B = Ss(), Vs = Ki(), Gs = Xi(), Qi = Ji(), qe = sn(), Ee = {}, Xs = typeof Uint8Array > "u" || !B ? R : B(Uint8Array), fe = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError > "u" ? R : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer > "u" ? R : ArrayBuffer,
  "%ArrayIteratorPrototype%": we && B ? B([][Symbol.iterator]()) : R,
  "%AsyncFromSyncIteratorPrototype%": R,
  "%AsyncFunction%": Ee,
  "%AsyncGenerator%": Ee,
  "%AsyncGeneratorFunction%": Ee,
  "%AsyncIteratorPrototype%": Ee,
  "%Atomics%": typeof Atomics > "u" ? R : Atomics,
  "%BigInt%": typeof BigInt > "u" ? R : BigInt,
  "%BigInt64Array%": typeof BigInt64Array > "u" ? R : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array > "u" ? R : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView > "u" ? R : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": Ls,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": Ps,
  "%Float16Array%": typeof Float16Array > "u" ? R : Float16Array,
  "%Float32Array%": typeof Float32Array > "u" ? R : Float32Array,
  "%Float64Array%": typeof Float64Array > "u" ? R : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? R : FinalizationRegistry,
  "%Function%": Yi,
  "%GeneratorFunction%": Ee,
  "%Int8Array%": typeof Int8Array > "u" ? R : Int8Array,
  "%Int16Array%": typeof Int16Array > "u" ? R : Int16Array,
  "%Int32Array%": typeof Int32Array > "u" ? R : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": we && B ? B(B([][Symbol.iterator]())) : R,
  "%JSON%": typeof JSON == "object" ? JSON : R,
  "%Map%": typeof Map > "u" ? R : Map,
  "%MapIteratorPrototype%": typeof Map > "u" || !we || !B ? R : B((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": js,
  "%Object.getOwnPropertyDescriptor%": Ne,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise > "u" ? R : Promise,
  "%Proxy%": typeof Proxy > "u" ? R : Proxy,
  "%RangeError%": Ns,
  "%ReferenceError%": Fs,
  "%Reflect%": typeof Reflect > "u" ? R : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set > "u" ? R : Set,
  "%SetIteratorPrototype%": typeof Set > "u" || !we || !B ? R : B((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? R : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": we && B ? B(""[Symbol.iterator]()) : R,
  "%Symbol%": we ? Symbol : R,
  "%SyntaxError%": Se,
  "%ThrowTypeError%": Ws,
  "%TypedArray%": Xs,
  "%TypeError%": Re,
  "%Uint8Array%": typeof Uint8Array > "u" ? R : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? R : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array > "u" ? R : Uint16Array,
  "%Uint32Array%": typeof Uint32Array > "u" ? R : Uint32Array,
  "%URIError%": Is,
  "%WeakMap%": typeof WeakMap > "u" ? R : WeakMap,
  "%WeakRef%": typeof WeakRef > "u" ? R : WeakRef,
  "%WeakSet%": typeof WeakSet > "u" ? R : WeakSet,
  "%Function.prototype.call%": qe,
  "%Function.prototype.apply%": Qi,
  "%Object.defineProperty%": Hs,
  "%Object.getPrototypeOf%": Vs,
  "%Math.abs%": Us,
  "%Math.floor%": Ds,
  "%Math.max%": Bs,
  "%Math.min%": qs,
  "%Math.pow%": zs,
  "%Math.round%": Ms,
  "%Math.sign%": $s,
  "%Reflect.getPrototypeOf%": Gs
};
if (B)
  try {
    null.error;
  } catch (e) {
    var Ks = B(B(e));
    fe["%Error.prototype%"] = Ks;
  }
var Js = function e(a) {
  var n;
  if (a === "%AsyncFunction%")
    n = Aa("async function () {}");
  else if (a === "%GeneratorFunction%")
    n = Aa("function* () {}");
  else if (a === "%AsyncGeneratorFunction%")
    n = Aa("async function* () {}");
  else if (a === "%AsyncGenerator%") {
    var i = e("%AsyncGeneratorFunction%");
    i && (n = i.prototype);
  } else if (a === "%AsyncIteratorPrototype%") {
    var t = e("%AsyncGenerator%");
    t && B && (n = B(t.prototype));
  }
  return fe[a] = n, n;
}, qn = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
}, ze = da, na = rn, Ys = ze.call(qe, Array.prototype.concat), Qs = ze.call(Qi, Array.prototype.splice), zn = ze.call(qe, String.prototype.replace), ia = ze.call(qe, String.prototype.slice), Zs = ze.call(qe, RegExp.prototype.exec), er = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, ar = /\\(\\)?/g, nr = function(a) {
  var n = ia(a, 0, 1), i = ia(a, -1);
  if (n === "%" && i !== "%")
    throw new Se("invalid intrinsic syntax, expected closing `%`");
  if (i === "%" && n !== "%")
    throw new Se("invalid intrinsic syntax, expected opening `%`");
  var t = [];
  return zn(a, er, function(s, r, d, f) {
    t[t.length] = d ? zn(f, ar, "$1") : r || s;
  }), t;
}, ir = function(a, n) {
  var i = a, t;
  if (na(qn, i) && (t = qn[i], i = "%" + t[0] + "%"), na(fe, i)) {
    var s = fe[i];
    if (s === Ee && (s = Js(i)), typeof s > "u" && !n)
      throw new Re("intrinsic " + a + " exists, but is not available. Please file an issue!");
    return {
      alias: t,
      name: i,
      value: s
    };
  }
  throw new Se("intrinsic " + a + " does not exist!");
}, tr = function(a, n) {
  if (typeof a != "string" || a.length === 0)
    throw new Re("intrinsic name must be a non-empty string");
  if (arguments.length > 1 && typeof n != "boolean")
    throw new Re('"allowMissing" argument must be a boolean');
  if (Zs(/^%?[^%]*%?$/, a) === null)
    throw new Se("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  var i = nr(a), t = i.length > 0 ? i[0] : "", s = ir("%" + t + "%", n), r = s.name, d = s.value, f = !1, x = s.alias;
  x && (t = x[0], Qs(i, Ys([0, 1], x)));
  for (var p = 1, o = !0; p < i.length; p += 1) {
    var c = i[p], l = ia(c, 0, 1), u = ia(c, -1);
    if ((l === '"' || l === "'" || l === "`" || u === '"' || u === "'" || u === "`") && l !== u)
      throw new Se("property names with quotes must have matching quotes");
    if ((c === "constructor" || !o) && (f = !0), t += "." + c, r = "%" + t + "%", na(fe, r))
      d = fe[r];
    else if (d != null) {
      if (!(c in d)) {
        if (!n)
          throw new Re("base intrinsic for " + a + " exists, but the property is not available.");
        return;
      }
      if (Ne && p + 1 >= i.length) {
        var h = Ne(d, c);
        o = !!h, o && "get" in h && !("originalValue" in h.get) ? d = h.get : d = d[c];
      } else
        o = na(d, c), d = d[c];
      o && !f && (fe[r] = d);
    }
  }
  return d;
}, Oa, Mn;
function or() {
  if (Mn) return Oa;
  Mn = 1;
  var e = Gi();
  return Oa = function() {
    return e() && !!Symbol.toStringTag;
  }, Oa;
}
var sr = tr, $n = sr("%Object.defineProperty%", !0), rr = or()(), cr = rn, pr = on(), Ve = rr ? Symbol.toStringTag : null, lr = function(a, n) {
  var i = arguments.length > 2 && !!arguments[2] && arguments[2].force, t = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
  if (typeof i < "u" && typeof i != "boolean" || typeof t < "u" && typeof t != "boolean")
    throw new pr("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
  Ve && (i || !cr(a, Ve)) && ($n ? $n(a, Ve, {
    configurable: !t,
    enumerable: !1,
    value: n,
    writable: !1
  }) : a[Ve] = n);
}, ur = function(e, a) {
  return Object.keys(a).forEach(function(n) {
    e[n] = e[n] || a[n];
  }), e;
}, cn = _o, dr = ge, ja = gi, mr = en, fr = an, xr = ra.parse, vr = Ot, hr = X.Stream, br = yi, La = Ui, gr = Jo, yr = lr, le = rn, Wa = ur;
function S(e) {
  if (!(this instanceof S))
    return new S(e);
  this._overheadLength = 0, this._valueLength = 0, this._valuesToMeasure = [], cn.call(this), e = e || {};
  for (var a in e)
    this[a] = e[a];
}
dr.inherits(S, cn);
S.LINE_BREAK = `\r
`;
S.DEFAULT_CONTENT_TYPE = "application/octet-stream";
S.prototype.append = function(e, a, n) {
  n = n || {}, typeof n == "string" && (n = { filename: n });
  var i = cn.prototype.append.bind(this);
  if ((typeof a == "number" || a == null) && (a = String(a)), Array.isArray(a)) {
    this._error(new Error("Arrays are not supported."));
    return;
  }
  var t = this._multiPartHeader(e, a, n), s = this._multiPartFooter();
  i(t), i(a), i(s), this._trackLength(t, a, n);
};
S.prototype._trackLength = function(e, a, n) {
  var i = 0;
  n.knownLength != null ? i += Number(n.knownLength) : Buffer.isBuffer(a) ? i = a.length : typeof a == "string" && (i = Buffer.byteLength(a)), this._valueLength += i, this._overheadLength += Buffer.byteLength(e) + S.LINE_BREAK.length, !(!a || !a.path && !(a.readable && le(a, "httpVersion")) && !(a instanceof hr)) && (n.knownLength || this._valuesToMeasure.push(a));
};
S.prototype._lengthRetriever = function(e, a) {
  le(e, "fd") ? e.end != null && e.end != 1 / 0 && e.start != null ? a(null, e.end + 1 - (e.start ? e.start : 0)) : vr.stat(e.path, function(n, i) {
    if (n) {
      a(n);
      return;
    }
    var t = i.size - (e.start ? e.start : 0);
    a(null, t);
  }) : le(e, "httpVersion") ? a(null, Number(e.headers["content-length"])) : le(e, "httpModule") ? (e.on("response", function(n) {
    e.pause(), a(null, Number(n.headers["content-length"]));
  }), e.resume()) : a("Unknown stream");
};
S.prototype._multiPartHeader = function(e, a, n) {
  if (typeof n.header == "string")
    return n.header;
  var i = this._getContentDisposition(a, n), t = this._getContentType(a, n), s = "", r = {
    // add custom disposition as third element or keep it two elements if not
    "Content-Disposition": ["form-data", 'name="' + e + '"'].concat(i || []),
    // if no content type. allow it to be empty array
    "Content-Type": [].concat(t || [])
  };
  typeof n.header == "object" && Wa(r, n.header);
  var d;
  for (var f in r)
    if (le(r, f)) {
      if (d = r[f], d == null)
        continue;
      Array.isArray(d) || (d = [d]), d.length && (s += f + ": " + d.join("; ") + S.LINE_BREAK);
    }
  return "--" + this.getBoundary() + S.LINE_BREAK + s + S.LINE_BREAK;
};
S.prototype._getContentDisposition = function(e, a) {
  var n;
  if (typeof a.filepath == "string" ? n = ja.normalize(a.filepath).replace(/\\/g, "/") : a.filename || e && (e.name || e.path) ? n = ja.basename(a.filename || e && (e.name || e.path)) : e && e.readable && le(e, "httpVersion") && (n = ja.basename(e.client._httpMessage.path || "")), n)
    return 'filename="' + n + '"';
};
S.prototype._getContentType = function(e, a) {
  var n = a.contentType;
  return !n && e && e.name && (n = La.lookup(e.name)), !n && e && e.path && (n = La.lookup(e.path)), !n && e && e.readable && le(e, "httpVersion") && (n = e.headers["content-type"]), !n && (a.filepath || a.filename) && (n = La.lookup(a.filepath || a.filename)), !n && e && typeof e == "object" && (n = S.DEFAULT_CONTENT_TYPE), n;
};
S.prototype._multiPartFooter = function() {
  return (function(e) {
    var a = S.LINE_BREAK, n = this._streams.length === 0;
    n && (a += this._lastBoundary()), e(a);
  }).bind(this);
};
S.prototype._lastBoundary = function() {
  return "--" + this.getBoundary() + "--" + S.LINE_BREAK;
};
S.prototype.getHeaders = function(e) {
  var a, n = {
    "content-type": "multipart/form-data; boundary=" + this.getBoundary()
  };
  for (a in e)
    le(e, a) && (n[a.toLowerCase()] = e[a]);
  return n;
};
S.prototype.setBoundary = function(e) {
  if (typeof e != "string")
    throw new TypeError("FormData boundary must be a string");
  this._boundary = e;
};
S.prototype.getBoundary = function() {
  return this._boundary || this._generateBoundary(), this._boundary;
};
S.prototype.getBuffer = function() {
  for (var e = new Buffer.alloc(0), a = this.getBoundary(), n = 0, i = this._streams.length; n < i; n++)
    typeof this._streams[n] != "function" && (Buffer.isBuffer(this._streams[n]) ? e = Buffer.concat([e, this._streams[n]]) : e = Buffer.concat([e, Buffer.from(this._streams[n])]), (typeof this._streams[n] != "string" || this._streams[n].substring(2, a.length + 2) !== a) && (e = Buffer.concat([e, Buffer.from(S.LINE_BREAK)])));
  return Buffer.concat([e, Buffer.from(this._lastBoundary())]);
};
S.prototype._generateBoundary = function() {
  this._boundary = "--------------------------" + br.randomBytes(12).toString("hex");
};
S.prototype.getLengthSync = function() {
  var e = this._overheadLength + this._valueLength;
  return this._streams.length && (e += this._lastBoundary().length), this.hasKnownLength() || this._error(new Error("Cannot calculate proper length in synchronous way.")), e;
};
S.prototype.hasKnownLength = function() {
  var e = !0;
  return this._valuesToMeasure.length && (e = !1), e;
};
S.prototype.getLength = function(e) {
  var a = this._overheadLength + this._valueLength;
  if (this._streams.length && (a += this._lastBoundary().length), !this._valuesToMeasure.length) {
    process.nextTick(e.bind(this, null, a));
    return;
  }
  gr.parallel(this._valuesToMeasure, this._lengthRetriever, function(n, i) {
    if (n) {
      e(n);
      return;
    }
    i.forEach(function(t) {
      a += t;
    }), e(null, a);
  });
};
S.prototype.submit = function(e, a) {
  var n, i, t = { method: "post" };
  return typeof e == "string" ? (e = xr(e), i = Wa({
    port: e.port,
    path: e.pathname,
    host: e.hostname,
    protocol: e.protocol
  }, t)) : (i = Wa(e, t), i.port || (i.port = i.protocol === "https:" ? 443 : 80)), i.headers = this.getHeaders(e.headers), i.protocol === "https:" ? n = fr.request(i) : n = mr.request(i), this.getLength((function(s, r) {
    if (s && s !== "Unknown stream") {
      this._error(s);
      return;
    }
    if (r && n.setHeader("Content-Length", r), this.pipe(n), a) {
      var d, f = function(x, p) {
        return n.removeListener("error", f), n.removeListener("response", d), a.call(this, x, p);
      };
      d = f.bind(this, null), n.on("error", f), n.on("response", d);
    }
  }).bind(this)), n;
};
S.prototype._error = function(e) {
  this.error || (this.error = e, this.pause(), this.emit("error", e));
};
S.prototype.toString = function() {
  return "[object FormData]";
};
yr(S.prototype, "FormData");
var wr = S;
const Zi = /* @__PURE__ */ Ni(wr);
function Va(e) {
  return m.isPlainObject(e) || m.isArray(e);
}
function et(e) {
  return m.endsWith(e, "[]") ? e.slice(0, -2) : e;
}
function Hn(e, a, n) {
  return e ? e.concat(a).map(function(t, s) {
    return t = et(t), !n && s ? "[" + t + "]" : t;
  }).join(n ? "." : "") : a;
}
function Er(e) {
  return m.isArray(e) && !e.some(Va);
}
const _r = m.toFlatObject(m, {}, null, function(a) {
  return /^is[A-Z]/.test(a);
});
function ma(e, a, n) {
  if (!m.isObject(e))
    throw new TypeError("target must be an object");
  a = a || new (Zi || FormData)(), n = m.toFlatObject(n, {
    metaTokens: !0,
    dots: !1,
    indexes: !1
  }, !1, function(h, v) {
    return !m.isUndefined(v[h]);
  });
  const i = n.metaTokens, t = n.visitor || p, s = n.dots, r = n.indexes, f = (n.Blob || typeof Blob < "u" && Blob) && m.isSpecCompliantForm(a);
  if (!m.isFunction(t))
    throw new TypeError("visitor must be a function");
  function x(u) {
    if (u === null) return "";
    if (m.isDate(u))
      return u.toISOString();
    if (m.isBoolean(u))
      return u.toString();
    if (!f && m.isBlob(u))
      throw new g("Blob is not supported. Use a Buffer instead.");
    return m.isArrayBuffer(u) || m.isTypedArray(u) ? f && typeof Blob == "function" ? new Blob([u]) : Buffer.from(u) : u;
  }
  function p(u, h, v) {
    let b = u;
    if (u && !v && typeof u == "object") {
      if (m.endsWith(h, "{}"))
        h = i ? h : h.slice(0, -2), u = JSON.stringify(u);
      else if (m.isArray(u) && Er(u) || (m.isFileList(u) || m.endsWith(h, "[]")) && (b = m.toArray(u)))
        return h = et(h), b.forEach(function(E, k) {
          !(m.isUndefined(E) || E === null) && a.append(
            // eslint-disable-next-line no-nested-ternary
            r === !0 ? Hn([h], k, s) : r === null ? h : h + "[]",
            x(E)
          );
        }), !1;
    }
    return Va(u) ? !0 : (a.append(Hn(v, h, s), x(u)), !1);
  }
  const o = [], c = Object.assign(_r, {
    defaultVisitor: p,
    convertValue: x,
    isVisitable: Va
  });
  function l(u, h) {
    if (!m.isUndefined(u)) {
      if (o.indexOf(u) !== -1)
        throw Error("Circular reference detected in " + h.join("."));
      o.push(u), m.forEach(u, function(b, y) {
        (!(m.isUndefined(b) || b === null) && t.call(
          a,
          b,
          m.isString(y) ? y.trim() : y,
          h,
          c
        )) === !0 && l(b, h ? h.concat(y) : [y]);
      }), o.pop();
    }
  }
  if (!m.isObject(e))
    throw new TypeError("data must be an object");
  return l(e), a;
}
function Wn(e) {
  const a = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(e).replace(/[!'()~]|%20|%00/g, function(i) {
    return a[i];
  });
}
function at(e, a) {
  this._pairs = [], e && ma(e, this, a);
}
const nt = at.prototype;
nt.append = function(a, n) {
  this._pairs.push([a, n]);
};
nt.toString = function(a) {
  const n = a ? function(i) {
    return a.call(this, i, Wn);
  } : Wn;
  return this._pairs.map(function(t) {
    return n(t[0]) + "=" + n(t[1]);
  }, "").join("&");
};
function Tr(e) {
  return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function pn(e, a, n) {
  if (!a)
    return e;
  const i = n && n.encode || Tr;
  m.isFunction(n) && (n = {
    serialize: n
  });
  const t = n && n.serialize;
  let s;
  if (t ? s = t(a, n) : s = m.isURLSearchParams(a) ? a.toString() : new at(a, n).toString(i), s) {
    const r = e.indexOf("#");
    r !== -1 && (e = e.slice(0, r)), e += (e.indexOf("?") === -1 ? "?" : "&") + s;
  }
  return e;
}
class Vn {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(a, n, i) {
    return this.handlers.push({
      fulfilled: a,
      rejected: n,
      synchronous: i ? i.synchronous : !1,
      runWhen: i ? i.runWhen : null
    }), this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(a) {
    this.handlers[a] && (this.handlers[a] = null);
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    this.handlers && (this.handlers = []);
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
  forEach(a) {
    m.forEach(this.handlers, function(i) {
      i !== null && a(i);
    });
  }
}
const ln = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1
}, Rr = ra.URLSearchParams, Pa = "abcdefghijklmnopqrstuvwxyz", Gn = "0123456789", it = {
  DIGIT: Gn,
  ALPHA: Pa,
  ALPHA_DIGIT: Pa + Pa.toUpperCase() + Gn
}, kr = (e = 16, a = it.ALPHA_DIGIT) => {
  let n = "";
  const { length: i } = a, t = new Uint32Array(e);
  yi.randomFillSync(t);
  for (let s = 0; s < e; s++)
    n += a[t[s] % i];
  return n;
}, Sr = {
  isNode: !0,
  classes: {
    URLSearchParams: Rr,
    FormData: Zi,
    Blob: typeof Blob < "u" && Blob || null
  },
  ALPHABET: it,
  generateString: kr,
  protocols: ["http", "https", "file", "data"]
}, un = typeof window < "u" && typeof document < "u", Ga = typeof navigator == "object" && navigator || void 0, Ar = un && (!Ga || ["ReactNative", "NativeScript", "NS"].indexOf(Ga.product) < 0), Cr = typeof WorkerGlobalScope < "u" && // eslint-disable-next-line no-undef
self instanceof WorkerGlobalScope && typeof self.importScripts == "function", Or = un && window.location.href || "http://localhost", jr = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv: un,
  hasStandardBrowserEnv: Ar,
  hasStandardBrowserWebWorkerEnv: Cr,
  navigator: Ga,
  origin: Or
}, Symbol.toStringTag, { value: "Module" })), F = {
  ...jr,
  ...Sr
};
function Lr(e, a) {
  return ma(e, new F.classes.URLSearchParams(), {
    visitor: function(n, i, t, s) {
      return F.isNode && m.isBuffer(n) ? (this.append(i, n.toString("base64")), !1) : s.defaultVisitor.apply(this, arguments);
    },
    ...a
  });
}
function Pr(e) {
  return m.matchAll(/\w+|\[(\w*)]/g, e).map((a) => a[0] === "[]" ? "" : a[1] || a[0]);
}
function Nr(e) {
  const a = {}, n = Object.keys(e);
  let i;
  const t = n.length;
  let s;
  for (i = 0; i < t; i++)
    s = n[i], a[s] = e[s];
  return a;
}
function tt(e) {
  function a(n, i, t, s) {
    let r = n[s++];
    if (r === "__proto__") return !0;
    const d = Number.isFinite(+r), f = s >= n.length;
    return r = !r && m.isArray(t) ? t.length : r, f ? (m.hasOwnProp(t, r) ? t[r] = [t[r], i] : t[r] = i, !d) : ((!t[r] || !m.isObject(t[r])) && (t[r] = []), a(n, i, t[r], s) && m.isArray(t[r]) && (t[r] = Nr(t[r])), !d);
  }
  if (m.isFormData(e) && m.isFunction(e.entries)) {
    const n = {};
    return m.forEachEntry(e, (i, t) => {
      a(Pr(i), t, n, 0);
    }), n;
  }
  return null;
}
function Fr(e, a, n) {
  if (m.isString(e))
    try {
      return (a || JSON.parse)(e), m.trim(e);
    } catch (i) {
      if (i.name !== "SyntaxError")
        throw i;
    }
  return (n || JSON.stringify)(e);
}
const Me = {
  transitional: ln,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function(a, n) {
    const i = n.getContentType() || "", t = i.indexOf("application/json") > -1, s = m.isObject(a);
    if (s && m.isHTMLForm(a) && (a = new FormData(a)), m.isFormData(a))
      return t ? JSON.stringify(tt(a)) : a;
    if (m.isArrayBuffer(a) || m.isBuffer(a) || m.isStream(a) || m.isFile(a) || m.isBlob(a) || m.isReadableStream(a))
      return a;
    if (m.isArrayBufferView(a))
      return a.buffer;
    if (m.isURLSearchParams(a))
      return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), a.toString();
    let d;
    if (s) {
      if (i.indexOf("application/x-www-form-urlencoded") > -1)
        return Lr(a, this.formSerializer).toString();
      if ((d = m.isFileList(a)) || i.indexOf("multipart/form-data") > -1) {
        const f = this.env && this.env.FormData;
        return ma(
          d ? { "files[]": a } : a,
          f && new f(),
          this.formSerializer
        );
      }
    }
    return s || t ? (n.setContentType("application/json", !1), Fr(a)) : a;
  }],
  transformResponse: [function(a) {
    const n = this.transitional || Me.transitional, i = n && n.forcedJSONParsing, t = this.responseType === "json";
    if (m.isResponse(a) || m.isReadableStream(a))
      return a;
    if (a && m.isString(a) && (i && !this.responseType || t)) {
      const r = !(n && n.silentJSONParsing) && t;
      try {
        return JSON.parse(a, this.parseReviver);
      } catch (d) {
        if (r)
          throw d.name === "SyntaxError" ? g.from(d, g.ERR_BAD_RESPONSE, this, null, this.response) : d;
      }
    }
    return a;
  }],
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
    FormData: F.classes.FormData,
    Blob: F.classes.Blob
  },
  validateStatus: function(a) {
    return a >= 200 && a < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
m.forEach(["delete", "get", "head", "post", "put", "patch"], (e) => {
  Me.headers[e] = {};
});
const Ir = m.toObjectSet([
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
]), Ur = (e) => {
  const a = {};
  let n, i, t;
  return e && e.split(`
`).forEach(function(r) {
    t = r.indexOf(":"), n = r.substring(0, t).trim().toLowerCase(), i = r.substring(t + 1).trim(), !(!n || a[n] && Ir[n]) && (n === "set-cookie" ? a[n] ? a[n].push(i) : a[n] = [i] : a[n] = a[n] ? a[n] + ", " + i : i);
  }), a;
}, Xn = Symbol("internals");
function Oe(e) {
  return e && String(e).trim().toLowerCase();
}
function ea(e) {
  return e === !1 || e == null ? e : m.isArray(e) ? e.map(ea) : String(e);
}
function Dr(e) {
  const a = /* @__PURE__ */ Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let i;
  for (; i = n.exec(e); )
    a[i[1]] = i[2];
  return a;
}
const Br = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
function Na(e, a, n, i, t) {
  if (m.isFunction(i))
    return i.call(this, a, n);
  if (t && (a = n), !!m.isString(a)) {
    if (m.isString(i))
      return a.indexOf(i) !== -1;
    if (m.isRegExp(i))
      return i.test(a);
  }
}
function qr(e) {
  return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (a, n, i) => n.toUpperCase() + i);
}
function zr(e, a) {
  const n = m.toCamelCase(" " + a);
  ["get", "set", "has"].forEach((i) => {
    Object.defineProperty(e, i + n, {
      value: function(t, s, r) {
        return this[i].call(this, a, t, s, r);
      },
      configurable: !0
    });
  });
}
let $ = class {
  constructor(a) {
    a && this.set(a);
  }
  set(a, n, i) {
    const t = this;
    function s(d, f, x) {
      const p = Oe(f);
      if (!p)
        throw new Error("header name must be a non-empty string");
      const o = m.findKey(t, p);
      (!o || t[o] === void 0 || x === !0 || x === void 0 && t[o] !== !1) && (t[o || f] = ea(d));
    }
    const r = (d, f) => m.forEach(d, (x, p) => s(x, p, f));
    if (m.isPlainObject(a) || a instanceof this.constructor)
      r(a, n);
    else if (m.isString(a) && (a = a.trim()) && !Br(a))
      r(Ur(a), n);
    else if (m.isObject(a) && m.isIterable(a)) {
      let d = {}, f, x;
      for (const p of a) {
        if (!m.isArray(p))
          throw TypeError("Object iterator must return a key-value pair");
        d[x = p[0]] = (f = d[x]) ? m.isArray(f) ? [...f, p[1]] : [f, p[1]] : p[1];
      }
      r(d, n);
    } else
      a != null && s(n, a, i);
    return this;
  }
  get(a, n) {
    if (a = Oe(a), a) {
      const i = m.findKey(this, a);
      if (i) {
        const t = this[i];
        if (!n)
          return t;
        if (n === !0)
          return Dr(t);
        if (m.isFunction(n))
          return n.call(this, t, i);
        if (m.isRegExp(n))
          return n.exec(t);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(a, n) {
    if (a = Oe(a), a) {
      const i = m.findKey(this, a);
      return !!(i && this[i] !== void 0 && (!n || Na(this, this[i], i, n)));
    }
    return !1;
  }
  delete(a, n) {
    const i = this;
    let t = !1;
    function s(r) {
      if (r = Oe(r), r) {
        const d = m.findKey(i, r);
        d && (!n || Na(i, i[d], d, n)) && (delete i[d], t = !0);
      }
    }
    return m.isArray(a) ? a.forEach(s) : s(a), t;
  }
  clear(a) {
    const n = Object.keys(this);
    let i = n.length, t = !1;
    for (; i--; ) {
      const s = n[i];
      (!a || Na(this, this[s], s, a, !0)) && (delete this[s], t = !0);
    }
    return t;
  }
  normalize(a) {
    const n = this, i = {};
    return m.forEach(this, (t, s) => {
      const r = m.findKey(i, s);
      if (r) {
        n[r] = ea(t), delete n[s];
        return;
      }
      const d = a ? qr(s) : String(s).trim();
      d !== s && delete n[s], n[d] = ea(t), i[d] = !0;
    }), this;
  }
  concat(...a) {
    return this.constructor.concat(this, ...a);
  }
  toJSON(a) {
    const n = /* @__PURE__ */ Object.create(null);
    return m.forEach(this, (i, t) => {
      i != null && i !== !1 && (n[t] = a && m.isArray(i) ? i.join(", ") : i);
    }), n;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([a, n]) => a + ": " + n).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(a) {
    return a instanceof this ? a : new this(a);
  }
  static concat(a, ...n) {
    const i = new this(a);
    return n.forEach((t) => i.set(t)), i;
  }
  static accessor(a) {
    const i = (this[Xn] = this[Xn] = {
      accessors: {}
    }).accessors, t = this.prototype;
    function s(r) {
      const d = Oe(r);
      i[d] || (zr(t, r), i[d] = !0);
    }
    return m.isArray(a) ? a.forEach(s) : s(a), this;
  }
};
$.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
m.reduceDescriptors($.prototype, ({ value: e }, a) => {
  let n = a[0].toUpperCase() + a.slice(1);
  return {
    get: () => e,
    set(i) {
      this[n] = i;
    }
  };
});
m.freezeMethods($);
function Fa(e, a) {
  const n = this || Me, i = a || n, t = $.from(i.headers);
  let s = i.data;
  return m.forEach(e, function(d) {
    s = d.call(n, s, t.normalize(), a ? a.status : void 0);
  }), t.normalize(), s;
}
function ot(e) {
  return !!(e && e.__CANCEL__);
}
function ue(e, a, n) {
  g.call(this, e ?? "canceled", g.ERR_CANCELED, a, n), this.name = "CanceledError";
}
m.inherits(ue, g, {
  __CANCEL__: !0
});
function _e(e, a, n) {
  const i = n.config.validateStatus;
  !n.status || !i || i(n.status) ? e(n) : a(new g(
    "Request failed with status code " + n.status,
    [g.ERR_BAD_REQUEST, g.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4],
    n.config,
    n.request,
    n
  ));
}
function Mr(e) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
function $r(e, a) {
  return a ? e.replace(/\/?\/$/, "") + "/" + a.replace(/^\/+/, "") : e;
}
function dn(e, a, n) {
  let i = !Mr(a);
  return e && (i || n == !1) ? $r(e, a) : a;
}
var st = {}, Hr = ra.parse, Wr = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
}, Vr = String.prototype.endsWith || function(e) {
  return e.length <= this.length && this.indexOf(e, this.length - e.length) !== -1;
};
function Gr(e) {
  var a = typeof e == "string" ? Hr(e) : e || {}, n = a.protocol, i = a.host, t = a.port;
  if (typeof i != "string" || !i || typeof n != "string" || (n = n.split(":", 1)[0], i = i.replace(/:\d*$/, ""), t = parseInt(t) || Wr[n] || 0, !Xr(i, t)))
    return "";
  var s = Te("npm_config_" + n + "_proxy") || Te(n + "_proxy") || Te("npm_config_proxy") || Te("all_proxy");
  return s && s.indexOf("://") === -1 && (s = n + "://" + s), s;
}
function Xr(e, a) {
  var n = (Te("npm_config_no_proxy") || Te("no_proxy")).toLowerCase();
  return n ? n === "*" ? !1 : n.split(/[,\s]/).every(function(i) {
    if (!i)
      return !0;
    var t = i.match(/^(.+):(\d+)$/), s = t ? t[1] : i, r = t ? parseInt(t[2]) : 0;
    return r && r !== a ? !0 : /^[.*]/.test(s) ? (s.charAt(0) === "*" && (s = s.slice(1)), !Vr.call(e, s)) : e !== s;
  }) : !0;
}
function Te(e) {
  return process.env[e.toLowerCase()] || process.env[e.toUpperCase()] || "";
}
st.getProxyForUrl = Gr;
var mn = { exports: {} }, Ge = { exports: {} }, Xe = { exports: {} }, Ia, Kn;
function Kr() {
  if (Kn) return Ia;
  Kn = 1;
  var e = 1e3, a = e * 60, n = a * 60, i = n * 24, t = i * 7, s = i * 365.25;
  Ia = function(p, o) {
    o = o || {};
    var c = typeof p;
    if (c === "string" && p.length > 0)
      return r(p);
    if (c === "number" && isFinite(p))
      return o.long ? f(p) : d(p);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(p)
    );
  };
  function r(p) {
    if (p = String(p), !(p.length > 100)) {
      var o = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        p
      );
      if (o) {
        var c = parseFloat(o[1]), l = (o[2] || "ms").toLowerCase();
        switch (l) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return c * s;
          case "weeks":
          case "week":
          case "w":
            return c * t;
          case "days":
          case "day":
          case "d":
            return c * i;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return c * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return c * a;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return c * e;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return c;
          default:
            return;
        }
      }
    }
  }
  function d(p) {
    var o = Math.abs(p);
    return o >= i ? Math.round(p / i) + "d" : o >= n ? Math.round(p / n) + "h" : o >= a ? Math.round(p / a) + "m" : o >= e ? Math.round(p / e) + "s" : p + "ms";
  }
  function f(p) {
    var o = Math.abs(p);
    return o >= i ? x(p, o, i, "day") : o >= n ? x(p, o, n, "hour") : o >= a ? x(p, o, a, "minute") : o >= e ? x(p, o, e, "second") : p + " ms";
  }
  function x(p, o, c, l) {
    var u = o >= c * 1.5;
    return Math.round(p / c) + " " + l + (u ? "s" : "");
  }
  return Ia;
}
var Ua, Jn;
function rt() {
  if (Jn) return Ua;
  Jn = 1;
  function e(a) {
    i.debug = i, i.default = i, i.coerce = x, i.disable = d, i.enable = s, i.enabled = f, i.humanize = Kr(), i.destroy = p, Object.keys(a).forEach((o) => {
      i[o] = a[o];
    }), i.names = [], i.skips = [], i.formatters = {};
    function n(o) {
      let c = 0;
      for (let l = 0; l < o.length; l++)
        c = (c << 5) - c + o.charCodeAt(l), c |= 0;
      return i.colors[Math.abs(c) % i.colors.length];
    }
    i.selectColor = n;
    function i(o) {
      let c, l = null, u, h;
      function v(...b) {
        if (!v.enabled)
          return;
        const y = v, E = Number(/* @__PURE__ */ new Date()), k = E - (c || E);
        y.diff = k, y.prev = c, y.curr = E, c = E, b[0] = i.coerce(b[0]), typeof b[0] != "string" && b.unshift("%O");
        let A = 0;
        b[0] = b[0].replace(/%([a-zA-Z%])/g, (O, P) => {
          if (O === "%%")
            return "%";
          A++;
          const D = i.formatters[P];
          if (typeof D == "function") {
            const q = b[A];
            O = D.call(y, q), b.splice(A, 1), A--;
          }
          return O;
        }), i.formatArgs.call(y, b), (y.log || i.log).apply(y, b);
      }
      return v.namespace = o, v.useColors = i.useColors(), v.color = i.selectColor(o), v.extend = t, v.destroy = i.destroy, Object.defineProperty(v, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => l !== null ? l : (u !== i.namespaces && (u = i.namespaces, h = i.enabled(o)), h),
        set: (b) => {
          l = b;
        }
      }), typeof i.init == "function" && i.init(v), v;
    }
    function t(o, c) {
      const l = i(this.namespace + (typeof c > "u" ? ":" : c) + o);
      return l.log = this.log, l;
    }
    function s(o) {
      i.save(o), i.namespaces = o, i.names = [], i.skips = [];
      const c = (typeof o == "string" ? o : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const l of c)
        l[0] === "-" ? i.skips.push(l.slice(1)) : i.names.push(l);
    }
    function r(o, c) {
      let l = 0, u = 0, h = -1, v = 0;
      for (; l < o.length; )
        if (u < c.length && (c[u] === o[l] || c[u] === "*"))
          c[u] === "*" ? (h = u, v = l, u++) : (l++, u++);
        else if (h !== -1)
          u = h + 1, v++, l = v;
        else
          return !1;
      for (; u < c.length && c[u] === "*"; )
        u++;
      return u === c.length;
    }
    function d() {
      const o = [
        ...i.names,
        ...i.skips.map((c) => "-" + c)
      ].join(",");
      return i.enable(""), o;
    }
    function f(o) {
      for (const c of i.skips)
        if (r(o, c))
          return !1;
      for (const c of i.names)
        if (r(o, c))
          return !0;
      return !1;
    }
    function x(o) {
      return o instanceof Error ? o.stack || o.message : o;
    }
    function p() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return i.enable(i.load()), i;
  }
  return Ua = e, Ua;
}
var Yn;
function Jr() {
  return Yn || (Yn = 1, function(e, a) {
    a.formatArgs = i, a.save = t, a.load = s, a.useColors = n, a.storage = r(), a.destroy = /* @__PURE__ */ (() => {
      let f = !1;
      return () => {
        f || (f = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), a.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let f;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (f = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(f[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function i(f) {
      if (f[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + f[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors)
        return;
      const x = "color: " + this.color;
      f.splice(1, 0, x, "color: inherit");
      let p = 0, o = 0;
      f[0].replace(/%[a-zA-Z%]/g, (c) => {
        c !== "%%" && (p++, c === "%c" && (o = p));
      }), f.splice(o, 0, x);
    }
    a.log = console.debug || console.log || (() => {
    });
    function t(f) {
      try {
        f ? a.storage.setItem("debug", f) : a.storage.removeItem("debug");
      } catch {
      }
    }
    function s() {
      let f;
      try {
        f = a.storage.getItem("debug") || a.storage.getItem("DEBUG");
      } catch {
      }
      return !f && typeof process < "u" && "env" in process && (f = process.env.DEBUG), f;
    }
    function r() {
      try {
        return localStorage;
      } catch {
      }
    }
    e.exports = rt()(a);
    const { formatters: d } = e.exports;
    d.j = function(f) {
      try {
        return JSON.stringify(f);
      } catch (x) {
        return "[UnexpectedJSONParseError]: " + x.message;
      }
    };
  }(Xe, Xe.exports)), Xe.exports;
}
var Ke = { exports: {} }, Da, Qn;
function Yr() {
  return Qn || (Qn = 1, Da = (e, a = process.argv) => {
    const n = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", i = a.indexOf(n + e), t = a.indexOf("--");
    return i !== -1 && (t === -1 || i < t);
  }), Da;
}
var Ba, Zn;
function Qr() {
  if (Zn) return Ba;
  Zn = 1;
  const e = Lt, a = Ei, n = Yr(), { env: i } = process;
  let t;
  n("no-color") || n("no-colors") || n("color=false") || n("color=never") ? t = 0 : (n("color") || n("colors") || n("color=true") || n("color=always")) && (t = 1), "FORCE_COLOR" in i && (i.FORCE_COLOR === "true" ? t = 1 : i.FORCE_COLOR === "false" ? t = 0 : t = i.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(i.FORCE_COLOR, 10), 3));
  function s(f) {
    return f === 0 ? !1 : {
      level: f,
      hasBasic: !0,
      has256: f >= 2,
      has16m: f >= 3
    };
  }
  function r(f, x) {
    if (t === 0)
      return 0;
    if (n("color=16m") || n("color=full") || n("color=truecolor"))
      return 3;
    if (n("color=256"))
      return 2;
    if (f && !x && t === void 0)
      return 0;
    const p = t || 0;
    if (i.TERM === "dumb")
      return p;
    if (process.platform === "win32") {
      const o = e.release().split(".");
      return Number(o[0]) >= 10 && Number(o[2]) >= 10586 ? Number(o[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in i)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((o) => o in i) || i.CI_NAME === "codeship" ? 1 : p;
    if ("TEAMCITY_VERSION" in i)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(i.TEAMCITY_VERSION) ? 1 : 0;
    if (i.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in i) {
      const o = parseInt((i.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (i.TERM_PROGRAM) {
        case "iTerm.app":
          return o >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(i.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(i.TERM) || "COLORTERM" in i ? 1 : p;
  }
  function d(f) {
    const x = r(f, f && f.isTTY);
    return s(x);
  }
  return Ba = {
    supportsColor: d,
    stdout: s(r(!0, a.isatty(1))),
    stderr: s(r(!0, a.isatty(2)))
  }, Ba;
}
var ei;
function Zr() {
  return ei || (ei = 1, function(e, a) {
    const n = Ei, i = ge;
    a.init = p, a.log = d, a.formatArgs = s, a.save = f, a.load = x, a.useColors = t, a.destroy = i.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), a.colors = [6, 2, 3, 4, 5, 1];
    try {
      const c = Qr();
      c && (c.stderr || c).level >= 2 && (a.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    a.inspectOpts = Object.keys(process.env).filter((c) => /^debug_/i.test(c)).reduce((c, l) => {
      const u = l.substring(6).toLowerCase().replace(/_([a-z])/g, (v, b) => b.toUpperCase());
      let h = process.env[l];
      return /^(yes|on|true|enabled)$/i.test(h) ? h = !0 : /^(no|off|false|disabled)$/i.test(h) ? h = !1 : h === "null" ? h = null : h = Number(h), c[u] = h, c;
    }, {});
    function t() {
      return "colors" in a.inspectOpts ? !!a.inspectOpts.colors : n.isatty(process.stderr.fd);
    }
    function s(c) {
      const { namespace: l, useColors: u } = this;
      if (u) {
        const h = this.color, v = "\x1B[3" + (h < 8 ? h : "8;5;" + h), b = `  ${v};1m${l} \x1B[0m`;
        c[0] = b + c[0].split(`
`).join(`
` + b), c.push(v + "m+" + e.exports.humanize(this.diff) + "\x1B[0m");
      } else
        c[0] = r() + l + " " + c[0];
    }
    function r() {
      return a.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function d(...c) {
      return process.stderr.write(i.formatWithOptions(a.inspectOpts, ...c) + `
`);
    }
    function f(c) {
      c ? process.env.DEBUG = c : delete process.env.DEBUG;
    }
    function x() {
      return process.env.DEBUG;
    }
    function p(c) {
      c.inspectOpts = {};
      const l = Object.keys(a.inspectOpts);
      for (let u = 0; u < l.length; u++)
        c.inspectOpts[l[u]] = a.inspectOpts[l[u]];
    }
    e.exports = rt()(a);
    const { formatters: o } = e.exports;
    o.o = function(c) {
      return this.inspectOpts.colors = this.useColors, i.inspect(c, this.inspectOpts).split(`
`).map((l) => l.trim()).join(" ");
    }, o.O = function(c) {
      return this.inspectOpts.colors = this.useColors, i.inspect(c, this.inspectOpts);
    };
  }(Ke, Ke.exports)), Ke.exports;
}
var ai;
function ec() {
  return ai || (ai = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? Ge.exports = Jr() : Ge.exports = Zr()), Ge.exports;
}
var je, ac = function() {
  if (!je) {
    try {
      je = ec()("follow-redirects");
    } catch {
    }
    typeof je != "function" && (je = function() {
    });
  }
  je.apply(null, arguments);
}, $e = ra, Fe = $e.URL, nc = en, ic = an, fn = X.Writable, xn = jt, ct = ac;
(function() {
  var a = typeof process < "u", n = typeof window < "u" && typeof document < "u", i = he(Error.captureStackTrace);
  !a && (n || !i) && console.warn("The follow-redirects package should be excluded from browser builds.");
})();
var vn = !1;
try {
  xn(new Fe(""));
} catch (e) {
  vn = e.code === "ERR_INVALID_URL";
}
var tc = [
  "auth",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "hash"
], hn = ["abort", "aborted", "connect", "error", "socket", "timeout"], bn = /* @__PURE__ */ Object.create(null);
hn.forEach(function(e) {
  bn[e] = function(a, n, i) {
    this._redirectable.emit(e, a, n, i);
  };
});
var Xa = He(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
), Ka = He(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
), oc = He(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  Ka
), sc = He(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
), rc = He(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
), cc = fn.prototype.destroy || lt;
function J(e, a) {
  fn.call(this), this._sanitizeOptions(e), this._options = e, this._ended = !1, this._ending = !1, this._redirectCount = 0, this._redirects = [], this._requestBodyLength = 0, this._requestBodyBuffers = [], a && this.on("response", a);
  var n = this;
  this._onNativeResponse = function(i) {
    try {
      n._processResponse(i);
    } catch (t) {
      n.emit("error", t instanceof Ka ? t : new Ka({ cause: t }));
    }
  }, this._performRequest();
}
J.prototype = Object.create(fn.prototype);
J.prototype.abort = function() {
  yn(this._currentRequest), this._currentRequest.abort(), this.emit("abort");
};
J.prototype.destroy = function(e) {
  return yn(this._currentRequest, e), cc.call(this, e), this;
};
J.prototype.write = function(e, a, n) {
  if (this._ending)
    throw new rc();
  if (!xe(e) && !uc(e))
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  if (he(a) && (n = a, a = null), e.length === 0) {
    n && n();
    return;
  }
  this._requestBodyLength + e.length <= this._options.maxBodyLength ? (this._requestBodyLength += e.length, this._requestBodyBuffers.push({ data: e, encoding: a }), this._currentRequest.write(e, a, n)) : (this.emit("error", new sc()), this.abort());
};
J.prototype.end = function(e, a, n) {
  if (he(e) ? (n = e, e = a = null) : he(a) && (n = a, a = null), !e)
    this._ended = this._ending = !0, this._currentRequest.end(null, null, n);
  else {
    var i = this, t = this._currentRequest;
    this.write(e, a, function() {
      i._ended = !0, t.end(null, null, n);
    }), this._ending = !0;
  }
};
J.prototype.setHeader = function(e, a) {
  this._options.headers[e] = a, this._currentRequest.setHeader(e, a);
};
J.prototype.removeHeader = function(e) {
  delete this._options.headers[e], this._currentRequest.removeHeader(e);
};
J.prototype.setTimeout = function(e, a) {
  var n = this;
  function i(r) {
    r.setTimeout(e), r.removeListener("timeout", r.destroy), r.addListener("timeout", r.destroy);
  }
  function t(r) {
    n._timeout && clearTimeout(n._timeout), n._timeout = setTimeout(function() {
      n.emit("timeout"), s();
    }, e), i(r);
  }
  function s() {
    n._timeout && (clearTimeout(n._timeout), n._timeout = null), n.removeListener("abort", s), n.removeListener("error", s), n.removeListener("response", s), n.removeListener("close", s), a && n.removeListener("timeout", a), n.socket || n._currentRequest.removeListener("socket", t);
  }
  return a && this.on("timeout", a), this.socket ? t(this.socket) : this._currentRequest.once("socket", t), this.on("socket", i), this.on("abort", s), this.on("error", s), this.on("response", s), this.on("close", s), this;
};
[
  "flushHeaders",
  "getHeader",
  "setNoDelay",
  "setSocketKeepAlive"
].forEach(function(e) {
  J.prototype[e] = function(a, n) {
    return this._currentRequest[e](a, n);
  };
});
["aborted", "connection", "socket"].forEach(function(e) {
  Object.defineProperty(J.prototype, e, {
    get: function() {
      return this._currentRequest[e];
    }
  });
});
J.prototype._sanitizeOptions = function(e) {
  if (e.headers || (e.headers = {}), e.host && (e.hostname || (e.hostname = e.host), delete e.host), !e.pathname && e.path) {
    var a = e.path.indexOf("?");
    a < 0 ? e.pathname = e.path : (e.pathname = e.path.substring(0, a), e.search = e.path.substring(a));
  }
};
J.prototype._performRequest = function() {
  var e = this._options.protocol, a = this._options.nativeProtocols[e];
  if (!a)
    throw new TypeError("Unsupported protocol " + e);
  if (this._options.agents) {
    var n = e.slice(0, -1);
    this._options.agent = this._options.agents[n];
  }
  var i = this._currentRequest = a.request(this._options, this._onNativeResponse);
  i._redirectable = this;
  for (var t of hn)
    i.on(t, bn[t]);
  if (this._currentUrl = /^\//.test(this._options.path) ? $e.format(this._options) : (
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path
  ), this._isRedirect) {
    var s = 0, r = this, d = this._requestBodyBuffers;
    (function f(x) {
      if (i === r._currentRequest)
        if (x)
          r.emit("error", x);
        else if (s < d.length) {
          var p = d[s++];
          i.finished || i.write(p.data, p.encoding, f);
        } else r._ended && i.end();
    })();
  }
};
J.prototype._processResponse = function(e) {
  var a = e.statusCode;
  this._options.trackRedirects && this._redirects.push({
    url: this._currentUrl,
    headers: e.headers,
    statusCode: a
  });
  var n = e.headers.location;
  if (!n || this._options.followRedirects === !1 || a < 300 || a >= 400) {
    e.responseUrl = this._currentUrl, e.redirects = this._redirects, this.emit("response", e), this._requestBodyBuffers = [];
    return;
  }
  if (yn(this._currentRequest), e.destroy(), ++this._redirectCount > this._options.maxRedirects)
    throw new oc();
  var i, t = this._options.beforeRedirect;
  t && (i = Object.assign({
    // The Host header was set by nativeProtocol.request
    Host: e.req.getHeader("host")
  }, this._options.headers));
  var s = this._options.method;
  ((a === 301 || a === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
  // the server is redirecting the user agent to a different resource […]
  // A user agent can perform a retrieval request targeting that URI
  // (a GET or HEAD request if using HTTP) […]
  a === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) && (this._options.method = "GET", this._requestBodyBuffers = [], qa(/^content-/i, this._options.headers));
  var r = qa(/^host$/i, this._options.headers), d = gn(this._currentUrl), f = r || d.host, x = /^\w+:/.test(n) ? this._currentUrl : $e.format(Object.assign(d, { host: f })), p = pc(n, x);
  if (ct("redirecting to", p.href), this._isRedirect = !0, Ja(p, this._options), (p.protocol !== d.protocol && p.protocol !== "https:" || p.host !== f && !lc(p.host, f)) && qa(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers), he(t)) {
    var o = {
      headers: e.headers,
      statusCode: a
    }, c = {
      url: x,
      method: s,
      headers: i
    };
    t(this._options, o, c), this._sanitizeOptions(this._options);
  }
  this._performRequest();
};
function pt(e) {
  var a = {
    maxRedirects: 21,
    maxBodyLength: 10485760
  }, n = {};
  return Object.keys(e).forEach(function(i) {
    var t = i + ":", s = n[t] = e[i], r = a[i] = Object.create(s);
    function d(x, p, o) {
      return dc(x) ? x = Ja(x) : xe(x) ? x = Ja(gn(x)) : (o = p, p = ut(x), x = { protocol: t }), he(p) && (o = p, p = null), p = Object.assign({
        maxRedirects: a.maxRedirects,
        maxBodyLength: a.maxBodyLength
      }, x, p), p.nativeProtocols = n, !xe(p.host) && !xe(p.hostname) && (p.hostname = "::1"), xn.equal(p.protocol, t, "protocol mismatch"), ct("options", p), new J(p, o);
    }
    function f(x, p, o) {
      var c = r.request(x, p, o);
      return c.end(), c;
    }
    Object.defineProperties(r, {
      request: { value: d, configurable: !0, enumerable: !0, writable: !0 },
      get: { value: f, configurable: !0, enumerable: !0, writable: !0 }
    });
  }), a;
}
function lt() {
}
function gn(e) {
  var a;
  if (vn)
    a = new Fe(e);
  else if (a = ut($e.parse(e)), !xe(a.protocol))
    throw new Xa({ input: e });
  return a;
}
function pc(e, a) {
  return vn ? new Fe(e, a) : gn($e.resolve(a, e));
}
function ut(e) {
  if (/^\[/.test(e.hostname) && !/^\[[:0-9a-f]+\]$/i.test(e.hostname))
    throw new Xa({ input: e.href || e });
  if (/^\[/.test(e.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(e.host))
    throw new Xa({ input: e.href || e });
  return e;
}
function Ja(e, a) {
  var n = a || {};
  for (var i of tc)
    n[i] = e[i];
  return n.hostname.startsWith("[") && (n.hostname = n.hostname.slice(1, -1)), n.port !== "" && (n.port = Number(n.port)), n.path = n.search ? n.pathname + n.search : n.pathname, n;
}
function qa(e, a) {
  var n;
  for (var i in a)
    e.test(i) && (n = a[i], delete a[i]);
  return n === null || typeof n > "u" ? void 0 : String(n).trim();
}
function He(e, a, n) {
  function i(t) {
    he(Error.captureStackTrace) && Error.captureStackTrace(this, this.constructor), Object.assign(this, t || {}), this.code = e, this.message = this.cause ? a + ": " + this.cause.message : a;
  }
  return i.prototype = new (n || Error)(), Object.defineProperties(i.prototype, {
    constructor: {
      value: i,
      enumerable: !1
    },
    name: {
      value: "Error [" + e + "]",
      enumerable: !1
    }
  }), i;
}
function yn(e, a) {
  for (var n of hn)
    e.removeListener(n, bn[n]);
  e.on("error", lt), e.destroy(a);
}
function lc(e, a) {
  xn(xe(e) && xe(a));
  var n = e.length - a.length - 1;
  return n > 0 && e[n] === "." && e.endsWith(a);
}
function xe(e) {
  return typeof e == "string" || e instanceof String;
}
function he(e) {
  return typeof e == "function";
}
function uc(e) {
  return typeof e == "object" && "length" in e;
}
function dc(e) {
  return Fe && e instanceof Fe;
}
mn.exports = pt({ http: nc, https: ic });
mn.exports.wrap = pt;
var mc = mn.exports;
const fc = /* @__PURE__ */ Ni(mc), ta = "1.13.2";
function dt(e) {
  const a = /^([-+\w]{1,25})(:?\/\/|:)/.exec(e);
  return a && a[1] || "";
}
const xc = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function vc(e, a, n) {
  const i = n && n.Blob || F.classes.Blob, t = dt(e);
  if (a === void 0 && i && (a = !0), t === "data") {
    e = t.length ? e.slice(t.length + 1) : e;
    const s = xc.exec(e);
    if (!s)
      throw new g("Invalid URL", g.ERR_INVALID_URL);
    const r = s[1], d = s[2], f = s[3], x = Buffer.from(decodeURIComponent(f), d ? "base64" : "utf8");
    if (a) {
      if (!i)
        throw new g("Blob is not supported", g.ERR_NOT_SUPPORT);
      return new i([x], { type: r });
    }
    return x;
  }
  throw new g("Unsupported protocol " + t, g.ERR_NOT_SUPPORT);
}
const za = Symbol("internals");
class ni extends X.Transform {
  constructor(a) {
    a = m.toFlatObject(a, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (i, t) => !m.isUndefined(t[i])), super({
      readableHighWaterMark: a.chunkSize
    });
    const n = this[za] = {
      timeWindow: a.timeWindow,
      chunkSize: a.chunkSize,
      maxRate: a.maxRate,
      minChunkSize: a.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (i) => {
      i === "progress" && (n.isCaptured || (n.isCaptured = !0));
    });
  }
  _read(a) {
    const n = this[za];
    return n.onReadCallback && n.onReadCallback(), super._read(a);
  }
  _transform(a, n, i) {
    const t = this[za], s = t.maxRate, r = this.readableHighWaterMark, d = t.timeWindow, f = 1e3 / d, x = s / f, p = t.minChunkSize !== !1 ? Math.max(t.minChunkSize, x * 0.01) : 0, o = (l, u) => {
      const h = Buffer.byteLength(l);
      t.bytesSeen += h, t.bytes += h, t.isCaptured && this.emit("progress", t.bytesSeen), this.push(l) ? process.nextTick(u) : t.onReadCallback = () => {
        t.onReadCallback = null, process.nextTick(u);
      };
    }, c = (l, u) => {
      const h = Buffer.byteLength(l);
      let v = null, b = r, y, E = 0;
      if (s) {
        const k = Date.now();
        (!t.ts || (E = k - t.ts) >= d) && (t.ts = k, y = x - t.bytes, t.bytes = y < 0 ? -y : 0, E = 0), y = x - t.bytes;
      }
      if (s) {
        if (y <= 0)
          return setTimeout(() => {
            u(null, l);
          }, d - E);
        y < b && (b = y);
      }
      b && h > b && h - b > p && (v = l.subarray(b), l = l.subarray(0, b)), o(l, v ? () => {
        process.nextTick(u, null, v);
      } : u);
    };
    c(a, function l(u, h) {
      if (u)
        return i(u);
      h ? c(h, l) : i(null);
    });
  }
}
const { asyncIterator: ii } = Symbol, mt = async function* (e) {
  e.stream ? yield* e.stream() : e.arrayBuffer ? yield await e.arrayBuffer() : e[ii] ? yield* e[ii]() : yield e;
}, hc = F.ALPHABET.ALPHA_DIGIT + "-_", Ie = typeof TextEncoder == "function" ? new TextEncoder() : new ge.TextEncoder(), me = `\r
`, bc = Ie.encode(me), gc = 2;
class yc {
  constructor(a, n) {
    const { escapeName: i } = this.constructor, t = m.isString(n);
    let s = `Content-Disposition: form-data; name="${i(a)}"${!t && n.name ? `; filename="${i(n.name)}"` : ""}${me}`;
    t ? n = Ie.encode(String(n).replace(/\r?\n|\r\n?/g, me)) : s += `Content-Type: ${n.type || "application/octet-stream"}${me}`, this.headers = Ie.encode(s + me), this.contentLength = t ? n.byteLength : n.size, this.size = this.headers.byteLength + this.contentLength + gc, this.name = a, this.value = n;
  }
  async *encode() {
    yield this.headers;
    const { value: a } = this;
    m.isTypedArray(a) ? yield a : yield* mt(a), yield bc;
  }
  static escapeName(a) {
    return String(a).replace(/[\r\n"]/g, (n) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[n]);
  }
}
const wc = (e, a, n) => {
  const {
    tag: i = "form-data-boundary",
    size: t = 25,
    boundary: s = i + "-" + F.generateString(t, hc)
  } = n || {};
  if (!m.isFormData(e))
    throw TypeError("FormData instance required");
  if (s.length < 1 || s.length > 70)
    throw Error("boundary must be 10-70 characters long");
  const r = Ie.encode("--" + s + me), d = Ie.encode("--" + s + "--" + me);
  let f = d.byteLength;
  const x = Array.from(e.entries()).map(([o, c]) => {
    const l = new yc(o, c);
    return f += l.size, l;
  });
  f += r.byteLength * x.length, f = m.toFiniteNumber(f);
  const p = {
    "Content-Type": `multipart/form-data; boundary=${s}`
  };
  return Number.isFinite(f) && (p["Content-Length"] = f), a && a(p), Ct.from(async function* () {
    for (const o of x)
      yield r, yield* o.encode();
    yield d;
  }());
};
class Ec extends X.Transform {
  __transform(a, n, i) {
    this.push(a), i();
  }
  _transform(a, n, i) {
    if (a.length !== 0 && (this._transform = this.__transform, a[0] !== 120)) {
      const t = Buffer.alloc(2);
      t[0] = 120, t[1] = 156, this.push(t, n);
    }
    this.__transform(a, n, i);
  }
}
const _c = (e, a) => m.isAsyncFn(e) ? function(...n) {
  const i = n.pop();
  e.apply(this, n).then((t) => {
    try {
      a ? i(null, ...a(t)) : i(null, t);
    } catch (s) {
      i(s);
    }
  }, i);
} : e;
function Tc(e, a) {
  e = e || 10;
  const n = new Array(e), i = new Array(e);
  let t = 0, s = 0, r;
  return a = a !== void 0 ? a : 1e3, function(f) {
    const x = Date.now(), p = i[s];
    r || (r = x), n[t] = f, i[t] = x;
    let o = s, c = 0;
    for (; o !== t; )
      c += n[o++], o = o % e;
    if (t = (t + 1) % e, t === s && (s = (s + 1) % e), x - r < a)
      return;
    const l = p && x - p;
    return l ? Math.round(c * 1e3 / l) : void 0;
  };
}
function Rc(e, a) {
  let n = 0, i = 1e3 / a, t, s;
  const r = (x, p = Date.now()) => {
    n = p, t = null, s && (clearTimeout(s), s = null), e(...x);
  };
  return [(...x) => {
    const p = Date.now(), o = p - n;
    o >= i ? r(x, p) : (t = x, s || (s = setTimeout(() => {
      s = null, r(t);
    }, i - o)));
  }, () => t && r(t)];
}
const Ae = (e, a, n = 3) => {
  let i = 0;
  const t = Tc(50, 250);
  return Rc((s) => {
    const r = s.loaded, d = s.lengthComputable ? s.total : void 0, f = r - i, x = t(f), p = r <= d;
    i = r;
    const o = {
      loaded: r,
      total: d,
      progress: d ? r / d : void 0,
      bytes: f,
      rate: x || void 0,
      estimated: x && d && p ? (d - r) / x : void 0,
      event: s,
      lengthComputable: d != null,
      [a ? "download" : "upload"]: !0
    };
    e(o);
  }, n);
}, oa = (e, a) => {
  const n = e != null;
  return [(i) => a[0]({
    lengthComputable: n,
    total: e,
    loaded: i
  }), a[1]];
}, sa = (e) => (...a) => m.asap(() => e(...a));
function kc(e) {
  if (!e || typeof e != "string" || !e.startsWith("data:")) return 0;
  const a = e.indexOf(",");
  if (a < 0) return 0;
  const n = e.slice(5, a), i = e.slice(a + 1);
  if (/;base64/i.test(n)) {
    let s = i.length;
    const r = i.length;
    for (let c = 0; c < r; c++)
      if (i.charCodeAt(c) === 37 && c + 2 < r) {
        const l = i.charCodeAt(c + 1), u = i.charCodeAt(c + 2);
        (l >= 48 && l <= 57 || l >= 65 && l <= 70 || l >= 97 && l <= 102) && (u >= 48 && u <= 57 || u >= 65 && u <= 70 || u >= 97 && u <= 102) && (s -= 2, c += 2);
      }
    let d = 0, f = r - 1;
    const x = (c) => c >= 2 && i.charCodeAt(c - 2) === 37 && // '%'
    i.charCodeAt(c - 1) === 51 && // '3'
    (i.charCodeAt(c) === 68 || i.charCodeAt(c) === 100);
    f >= 0 && (i.charCodeAt(f) === 61 ? (d++, f--) : x(f) && (d++, f -= 3)), d === 1 && f >= 0 && (i.charCodeAt(f) === 61 || x(f)) && d++;
    const o = Math.floor(s / 4) * 3 - (d || 0);
    return o > 0 ? o : 0;
  }
  return Buffer.byteLength(i, "utf8");
}
const ti = {
  flush: pe.constants.Z_SYNC_FLUSH,
  finishFlush: pe.constants.Z_SYNC_FLUSH
}, Sc = {
  flush: pe.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: pe.constants.BROTLI_OPERATION_FLUSH
}, oi = m.isFunction(pe.createBrotliDecompress), { http: Ac, https: Cc } = fc, Oc = /https:?/, si = F.protocols.map((e) => e + ":"), ri = (e, [a, n]) => (e.on("end", n).on("error", n), a);
class jc {
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(a, n) {
    n = Object.assign({
      sessionTimeout: 1e3
    }, n);
    let i = this.sessions[a];
    if (i) {
      let p = i.length;
      for (let o = 0; o < p; o++) {
        const [c, l] = i[o];
        if (!c.destroyed && !c.closed && ge.isDeepStrictEqual(l, n))
          return c;
      }
    }
    const t = wi.connect(a, n);
    let s;
    const r = () => {
      if (s)
        return;
      s = !0;
      let p = i, o = p.length, c = o;
      for (; c--; )
        if (p[c][0] === t) {
          o === 1 ? delete this.sessions[a] : p.splice(c, 1);
          return;
        }
    }, d = t.request, { sessionTimeout: f } = n;
    if (f != null) {
      let p, o = 0;
      t.request = function() {
        const c = d.apply(this, arguments);
        return o++, p && (clearTimeout(p), p = null), c.once("close", () => {
          --o || (p = setTimeout(() => {
            p = null, r();
          }, f));
        }), c;
      };
    }
    t.once("close", r);
    let x = [
      t,
      n
    ];
    return i ? i.push(x) : i = this.sessions[a] = [x], t;
  }
}
const Lc = new jc();
function Pc(e, a) {
  e.beforeRedirects.proxy && e.beforeRedirects.proxy(e), e.beforeRedirects.config && e.beforeRedirects.config(e, a);
}
function ft(e, a, n) {
  let i = a;
  if (!i && i !== !1) {
    const t = st.getProxyForUrl(n);
    t && (i = new URL(t));
  }
  if (i) {
    if (i.username && (i.auth = (i.username || "") + ":" + (i.password || "")), i.auth) {
      (i.auth.username || i.auth.password) && (i.auth = (i.auth.username || "") + ":" + (i.auth.password || ""));
      const s = Buffer.from(i.auth, "utf8").toString("base64");
      e.headers["Proxy-Authorization"] = "Basic " + s;
    }
    e.headers.host = e.hostname + (e.port ? ":" + e.port : "");
    const t = i.hostname || i.host;
    e.hostname = t, e.host = t, e.port = i.port, e.path = n, i.protocol && (e.protocol = i.protocol.includes(":") ? i.protocol : `${i.protocol}:`);
  }
  e.beforeRedirects.proxy = function(s) {
    ft(s, a, s.href);
  };
}
const Nc = typeof process < "u" && m.kindOf(process) === "process", Fc = (e) => new Promise((a, n) => {
  let i, t;
  const s = (f, x) => {
    t || (t = !0, i && i(f, x));
  }, r = (f) => {
    s(f), a(f);
  }, d = (f) => {
    s(f, !0), n(f);
  };
  e(r, d, (f) => i = f).catch(d);
}), Ic = ({ address: e, family: a }) => {
  if (!m.isString(e))
    throw TypeError("address must be a string");
  return {
    address: e,
    family: a || (e.indexOf(".") < 0 ? 6 : 4)
  };
}, ci = (e, a) => Ic(m.isObject(e) ? e : { address: e, family: a }), Uc = {
  request(e, a) {
    const n = e.protocol + "//" + e.hostname + ":" + (e.port || 80), { http2Options: i, headers: t } = e, s = Lc.getSession(n, i), {
      HTTP2_HEADER_SCHEME: r,
      HTTP2_HEADER_METHOD: d,
      HTTP2_HEADER_PATH: f,
      HTTP2_HEADER_STATUS: x
    } = wi.constants, p = {
      [r]: e.protocol.replace(":", ""),
      [d]: e.method,
      [f]: e.path
    };
    m.forEach(t, (c, l) => {
      l.charAt(0) !== ":" && (p[l] = c);
    });
    const o = s.request(p);
    return o.once("response", (c) => {
      const l = o;
      c = Object.assign({}, c);
      const u = c[x];
      delete c[x], l.headers = c, l.statusCode = +u, a(l);
    }), o;
  }
}, Dc = Nc && function(a) {
  return Fc(async function(i, t, s) {
    let { data: r, lookup: d, family: f, httpVersion: x = 1, http2Options: p } = a;
    const { responseType: o, responseEncoding: c } = a, l = a.method.toUpperCase();
    let u, h = !1, v;
    if (x = +x, Number.isNaN(x))
      throw TypeError(`Invalid protocol version: '${a.httpVersion}' is not a number`);
    if (x !== 1 && x !== 2)
      throw TypeError(`Unsupported protocol version '${x}'`);
    const b = x === 2;
    if (d) {
      const T = _c(d, (_) => m.isArray(_) ? _ : [_]);
      d = (_, L, Z) => {
        T(_, L, (U, ae, ce) => {
          if (U)
            return Z(U);
          const V = m.isArray(ae) ? ae.map((We) => ci(We)) : [ci(ae, ce)];
          L.all ? Z(U, V) : Z(U, V[0].address, V[0].family);
        });
      };
    }
    const y = new Pt();
    function E(T) {
      try {
        y.emit("abort", !T || T.type ? new ue(null, a, v) : T);
      } catch (_) {
        console.warn("emit error", _);
      }
    }
    y.once("abort", t);
    const k = () => {
      a.cancelToken && a.cancelToken.unsubscribe(E), a.signal && a.signal.removeEventListener("abort", E), y.removeAllListeners();
    };
    (a.cancelToken || a.signal) && (a.cancelToken && a.cancelToken.subscribe(E), a.signal && (a.signal.aborted ? E() : a.signal.addEventListener("abort", E))), s((T, _) => {
      if (u = !0, _) {
        h = !0, k();
        return;
      }
      const { data: L } = T;
      if (L instanceof X.Readable || L instanceof X.Duplex) {
        const Z = X.finished(L, () => {
          Z(), k();
        });
      } else
        k();
    });
    const A = dn(a.baseURL, a.url, a.allowAbsoluteUrls), C = new URL(A, F.hasBrowserEnv ? F.origin : void 0), O = C.protocol || si[0];
    if (O === "data:") {
      if (a.maxContentLength > -1) {
        const _ = String(a.url || A || "");
        if (kc(_) > a.maxContentLength)
          return t(new g(
            "maxContentLength size of " + a.maxContentLength + " exceeded",
            g.ERR_BAD_RESPONSE,
            a
          ));
      }
      let T;
      if (l !== "GET")
        return _e(i, t, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config: a
        });
      try {
        T = vc(a.url, o === "blob", {
          Blob: a.env && a.env.Blob
        });
      } catch (_) {
        throw g.from(_, g.ERR_BAD_REQUEST, a);
      }
      return o === "text" ? (T = T.toString(c), (!c || c === "utf8") && (T = m.stripBOM(T))) : o === "stream" && (T = X.Readable.from(T)), _e(i, t, {
        data: T,
        status: 200,
        statusText: "OK",
        headers: new $(),
        config: a
      });
    }
    if (si.indexOf(O) === -1)
      return t(new g(
        "Unsupported protocol " + O,
        g.ERR_BAD_REQUEST,
        a
      ));
    const P = $.from(a.headers).normalize();
    P.set("User-Agent", "axios/" + ta, !1);
    const { onUploadProgress: D, onDownloadProgress: q } = a, z = a.maxRate;
    let ee, Y;
    if (m.isSpecCompliantForm(r)) {
      const T = P.getContentType(/boundary=([-_\w\d]{10,70})/i);
      r = wc(r, (_) => {
        P.set(_);
      }, {
        tag: `axios-${ta}-boundary`,
        boundary: T && T[1] || void 0
      });
    } else if (m.isFormData(r) && m.isFunction(r.getHeaders)) {
      if (P.set(r.getHeaders()), !P.hasContentLength())
        try {
          const T = await ge.promisify(r.getLength).call(r);
          Number.isFinite(T) && T >= 0 && P.setContentLength(T);
        } catch {
        }
    } else if (m.isBlob(r) || m.isFile(r))
      r.size && P.setContentType(r.type || "application/octet-stream"), P.setContentLength(r.size || 0), r = X.Readable.from(mt(r));
    else if (r && !m.isStream(r)) {
      if (!Buffer.isBuffer(r)) if (m.isArrayBuffer(r))
        r = Buffer.from(new Uint8Array(r));
      else if (m.isString(r))
        r = Buffer.from(r, "utf-8");
      else
        return t(new g(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          g.ERR_BAD_REQUEST,
          a
        ));
      if (P.setContentLength(r.length, !1), a.maxBodyLength > -1 && r.length > a.maxBodyLength)
        return t(new g(
          "Request body larger than maxBodyLength limit",
          g.ERR_BAD_REQUEST,
          a
        ));
    }
    const oe = m.toFiniteNumber(P.getContentLength());
    m.isArray(z) ? (ee = z[0], Y = z[1]) : ee = Y = z, r && (D || ee) && (m.isStream(r) || (r = X.Readable.from(r, { objectMode: !1 })), r = X.pipeline([r, new ni({
      maxRate: m.toFiniteNumber(ee)
    })], m.noop), D && r.on("progress", ri(
      r,
      oa(
        oe,
        Ae(sa(D), !1, 3)
      )
    )));
    let re;
    if (a.auth) {
      const T = a.auth.username || "", _ = a.auth.password || "";
      re = T + ":" + _;
    }
    if (!re && C.username) {
      const T = C.username, _ = C.password;
      re = T + ":" + _;
    }
    re && P.delete("authorization");
    let Q;
    try {
      Q = pn(
        C.pathname + C.search,
        a.params,
        a.paramsSerializer
      ).replace(/^\?/, "");
    } catch (T) {
      const _ = new Error(T.message);
      return _.config = a, _.url = a.url, _.exists = !0, t(_);
    }
    P.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (oi ? ", br" : ""),
      !1
    );
    const M = {
      path: Q,
      method: l,
      headers: P.toJSON(),
      agents: { http: a.httpAgent, https: a.httpsAgent },
      auth: re,
      protocol: O,
      family: f,
      beforeRedirect: Pc,
      beforeRedirects: {},
      http2Options: p
    };
    !m.isUndefined(d) && (M.lookup = d), a.socketPath ? M.socketPath = a.socketPath : (M.hostname = C.hostname.startsWith("[") ? C.hostname.slice(1, -1) : C.hostname, M.port = C.port, ft(M, a.proxy, O + "//" + C.hostname + (C.port ? ":" + C.port : "") + M.path));
    let W;
    const ye = Oc.test(M.protocol);
    if (M.agent = ye ? a.httpsAgent : a.httpAgent, b ? W = Uc : a.transport ? W = a.transport : a.maxRedirects === 0 ? W = ye ? an : en : (a.maxRedirects && (M.maxRedirects = a.maxRedirects), a.beforeRedirect && (M.beforeRedirects.config = a.beforeRedirect), W = ye ? Cc : Ac), a.maxBodyLength > -1 ? M.maxBodyLength = a.maxBodyLength : M.maxBodyLength = 1 / 0, a.insecureHTTPParser && (M.insecureHTTPParser = a.insecureHTTPParser), v = W.request(M, function(_) {
      if (v.destroyed) return;
      const L = [_], Z = m.toFiniteNumber(_.headers["content-length"]);
      if (q || Y) {
        const V = new ni({
          maxRate: m.toFiniteNumber(Y)
        });
        q && V.on("progress", ri(
          V,
          oa(
            Z,
            Ae(sa(q), !0, 3)
          )
        )), L.push(V);
      }
      let U = _;
      const ae = _.req || v;
      if (a.decompress !== !1 && _.headers["content-encoding"])
        switch ((l === "HEAD" || _.statusCode === 204) && delete _.headers["content-encoding"], (_.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            L.push(pe.createUnzip(ti)), delete _.headers["content-encoding"];
            break;
          case "deflate":
            L.push(new Ec()), L.push(pe.createUnzip(ti)), delete _.headers["content-encoding"];
            break;
          case "br":
            oi && (L.push(pe.createBrotliDecompress(Sc)), delete _.headers["content-encoding"]);
        }
      U = L.length > 1 ? X.pipeline(L, m.noop) : L[0];
      const ce = {
        status: _.statusCode,
        statusText: _.statusMessage,
        headers: new $(_.headers),
        config: a,
        request: ae
      };
      if (o === "stream")
        ce.data = U, _e(i, t, ce);
      else {
        const V = [];
        let We = 0;
        U.on("data", function(H) {
          V.push(H), We += H.length, a.maxContentLength > -1 && We > a.maxContentLength && (h = !0, U.destroy(), E(new g(
            "maxContentLength size of " + a.maxContentLength + " exceeded",
            g.ERR_BAD_RESPONSE,
            a,
            ae
          )));
        }), U.on("aborted", function() {
          if (h)
            return;
          const H = new g(
            "stream has been aborted",
            g.ERR_BAD_RESPONSE,
            a,
            ae
          );
          U.destroy(H), t(H);
        }), U.on("error", function(H) {
          v.destroyed || t(g.from(H, null, a, ae));
        }), U.on("end", function() {
          try {
            let H = V.length === 1 ? V[0] : Buffer.concat(V);
            o !== "arraybuffer" && (H = H.toString(c), (!c || c === "utf8") && (H = m.stripBOM(H))), ce.data = H;
          } catch (H) {
            return t(g.from(H, null, a, ce.request, ce));
          }
          _e(i, t, ce);
        });
      }
      y.once("abort", (V) => {
        U.destroyed || (U.emit("error", V), U.destroy());
      });
    }), y.once("abort", (T) => {
      v.close ? v.close() : v.destroy(T);
    }), v.on("error", function(_) {
      t(g.from(_, null, a, v));
    }), v.on("socket", function(_) {
      _.setKeepAlive(!0, 1e3 * 60);
    }), a.timeout) {
      const T = parseInt(a.timeout, 10);
      if (Number.isNaN(T)) {
        E(new g(
          "error trying to parse `config.timeout` to int",
          g.ERR_BAD_OPTION_VALUE,
          a,
          v
        ));
        return;
      }
      v.setTimeout(T, function() {
        if (u) return;
        let L = a.timeout ? "timeout of " + a.timeout + "ms exceeded" : "timeout exceeded";
        const Z = a.transitional || ln;
        a.timeoutErrorMessage && (L = a.timeoutErrorMessage), E(new g(
          L,
          Z.clarifyTimeoutError ? g.ETIMEDOUT : g.ECONNABORTED,
          a,
          v
        ));
      });
    } else
      v.setTimeout(0);
    if (m.isStream(r)) {
      let T = !1, _ = !1;
      r.on("end", () => {
        T = !0;
      }), r.once("error", (L) => {
        _ = !0, v.destroy(L);
      }), r.on("close", () => {
        !T && !_ && E(new ue("Request stream has been aborted", a, v));
      }), r.pipe(v);
    } else
      r && v.write(r), v.end();
  });
}, Bc = F.hasStandardBrowserEnv ? /* @__PURE__ */ ((e, a) => (n) => (n = new URL(n, F.origin), e.protocol === n.protocol && e.host === n.host && (a || e.port === n.port)))(
  new URL(F.origin),
  F.navigator && /(msie|trident)/i.test(F.navigator.userAgent)
) : () => !0, qc = F.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(e, a, n, i, t, s, r) {
      if (typeof document > "u") return;
      const d = [`${e}=${encodeURIComponent(a)}`];
      m.isNumber(n) && d.push(`expires=${new Date(n).toUTCString()}`), m.isString(i) && d.push(`path=${i}`), m.isString(t) && d.push(`domain=${t}`), s === !0 && d.push("secure"), m.isString(r) && d.push(`SameSite=${r}`), document.cookie = d.join("; ");
    },
    read(e) {
      if (typeof document > "u") return null;
      const a = document.cookie.match(new RegExp("(?:^|; )" + e + "=([^;]*)"));
      return a ? decodeURIComponent(a[1]) : null;
    },
    remove(e) {
      this.write(e, "", Date.now() - 864e5, "/");
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
), pi = (e) => e instanceof $ ? { ...e } : e;
function be(e, a) {
  a = a || {};
  const n = {};
  function i(x, p, o, c) {
    return m.isPlainObject(x) && m.isPlainObject(p) ? m.merge.call({ caseless: c }, x, p) : m.isPlainObject(p) ? m.merge({}, p) : m.isArray(p) ? p.slice() : p;
  }
  function t(x, p, o, c) {
    if (m.isUndefined(p)) {
      if (!m.isUndefined(x))
        return i(void 0, x, o, c);
    } else return i(x, p, o, c);
  }
  function s(x, p) {
    if (!m.isUndefined(p))
      return i(void 0, p);
  }
  function r(x, p) {
    if (m.isUndefined(p)) {
      if (!m.isUndefined(x))
        return i(void 0, x);
    } else return i(void 0, p);
  }
  function d(x, p, o) {
    if (o in a)
      return i(x, p);
    if (o in e)
      return i(void 0, x);
  }
  const f = {
    url: s,
    method: s,
    data: s,
    baseURL: r,
    transformRequest: r,
    transformResponse: r,
    paramsSerializer: r,
    timeout: r,
    timeoutMessage: r,
    withCredentials: r,
    withXSRFToken: r,
    adapter: r,
    responseType: r,
    xsrfCookieName: r,
    xsrfHeaderName: r,
    onUploadProgress: r,
    onDownloadProgress: r,
    decompress: r,
    maxContentLength: r,
    maxBodyLength: r,
    beforeRedirect: r,
    transport: r,
    httpAgent: r,
    httpsAgent: r,
    cancelToken: r,
    socketPath: r,
    responseEncoding: r,
    validateStatus: d,
    headers: (x, p, o) => t(pi(x), pi(p), o, !0)
  };
  return m.forEach(Object.keys({ ...e, ...a }), function(p) {
    const o = f[p] || t, c = o(e[p], a[p], p);
    m.isUndefined(c) && o !== d || (n[p] = c);
  }), n;
}
const xt = (e) => {
  const a = be({}, e);
  let { data: n, withXSRFToken: i, xsrfHeaderName: t, xsrfCookieName: s, headers: r, auth: d } = a;
  if (a.headers = r = $.from(r), a.url = pn(dn(a.baseURL, a.url, a.allowAbsoluteUrls), e.params, e.paramsSerializer), d && r.set(
    "Authorization",
    "Basic " + btoa((d.username || "") + ":" + (d.password ? unescape(encodeURIComponent(d.password)) : ""))
  ), m.isFormData(n)) {
    if (F.hasStandardBrowserEnv || F.hasStandardBrowserWebWorkerEnv)
      r.setContentType(void 0);
    else if (m.isFunction(n.getHeaders)) {
      const f = n.getHeaders(), x = ["content-type", "content-length"];
      Object.entries(f).forEach(([p, o]) => {
        x.includes(p.toLowerCase()) && r.set(p, o);
      });
    }
  }
  if (F.hasStandardBrowserEnv && (i && m.isFunction(i) && (i = i(a)), i || i !== !1 && Bc(a.url))) {
    const f = t && s && qc.read(s);
    f && r.set(t, f);
  }
  return a;
}, zc = typeof XMLHttpRequest < "u", Mc = zc && function(e) {
  return new Promise(function(n, i) {
    const t = xt(e);
    let s = t.data;
    const r = $.from(t.headers).normalize();
    let { responseType: d, onUploadProgress: f, onDownloadProgress: x } = t, p, o, c, l, u;
    function h() {
      l && l(), u && u(), t.cancelToken && t.cancelToken.unsubscribe(p), t.signal && t.signal.removeEventListener("abort", p);
    }
    let v = new XMLHttpRequest();
    v.open(t.method.toUpperCase(), t.url, !0), v.timeout = t.timeout;
    function b() {
      if (!v)
        return;
      const E = $.from(
        "getAllResponseHeaders" in v && v.getAllResponseHeaders()
      ), A = {
        data: !d || d === "text" || d === "json" ? v.responseText : v.response,
        status: v.status,
        statusText: v.statusText,
        headers: E,
        config: e,
        request: v
      };
      _e(function(O) {
        n(O), h();
      }, function(O) {
        i(O), h();
      }, A), v = null;
    }
    "onloadend" in v ? v.onloadend = b : v.onreadystatechange = function() {
      !v || v.readyState !== 4 || v.status === 0 && !(v.responseURL && v.responseURL.indexOf("file:") === 0) || setTimeout(b);
    }, v.onabort = function() {
      v && (i(new g("Request aborted", g.ECONNABORTED, e, v)), v = null);
    }, v.onerror = function(k) {
      const A = k && k.message ? k.message : "Network Error", C = new g(A, g.ERR_NETWORK, e, v);
      C.event = k || null, i(C), v = null;
    }, v.ontimeout = function() {
      let k = t.timeout ? "timeout of " + t.timeout + "ms exceeded" : "timeout exceeded";
      const A = t.transitional || ln;
      t.timeoutErrorMessage && (k = t.timeoutErrorMessage), i(new g(
        k,
        A.clarifyTimeoutError ? g.ETIMEDOUT : g.ECONNABORTED,
        e,
        v
      )), v = null;
    }, s === void 0 && r.setContentType(null), "setRequestHeader" in v && m.forEach(r.toJSON(), function(k, A) {
      v.setRequestHeader(A, k);
    }), m.isUndefined(t.withCredentials) || (v.withCredentials = !!t.withCredentials), d && d !== "json" && (v.responseType = t.responseType), x && ([c, u] = Ae(x, !0), v.addEventListener("progress", c)), f && v.upload && ([o, l] = Ae(f), v.upload.addEventListener("progress", o), v.upload.addEventListener("loadend", l)), (t.cancelToken || t.signal) && (p = (E) => {
      v && (i(!E || E.type ? new ue(null, e, v) : E), v.abort(), v = null);
    }, t.cancelToken && t.cancelToken.subscribe(p), t.signal && (t.signal.aborted ? p() : t.signal.addEventListener("abort", p)));
    const y = dt(t.url);
    if (y && F.protocols.indexOf(y) === -1) {
      i(new g("Unsupported protocol " + y + ":", g.ERR_BAD_REQUEST, e));
      return;
    }
    v.send(s || null);
  });
}, $c = (e, a) => {
  const { length: n } = e = e ? e.filter(Boolean) : [];
  if (a || n) {
    let i = new AbortController(), t;
    const s = function(x) {
      if (!t) {
        t = !0, d();
        const p = x instanceof Error ? x : this.reason;
        i.abort(p instanceof g ? p : new ue(p instanceof Error ? p.message : p));
      }
    };
    let r = a && setTimeout(() => {
      r = null, s(new g(`timeout ${a} of ms exceeded`, g.ETIMEDOUT));
    }, a);
    const d = () => {
      e && (r && clearTimeout(r), r = null, e.forEach((x) => {
        x.unsubscribe ? x.unsubscribe(s) : x.removeEventListener("abort", s);
      }), e = null);
    };
    e.forEach((x) => x.addEventListener("abort", s));
    const { signal: f } = i;
    return f.unsubscribe = () => m.asap(d), f;
  }
}, Hc = function* (e, a) {
  let n = e.byteLength;
  if (n < a) {
    yield e;
    return;
  }
  let i = 0, t;
  for (; i < n; )
    t = i + a, yield e.slice(i, t), i = t;
}, Wc = async function* (e, a) {
  for await (const n of Vc(e))
    yield* Hc(n, a);
}, Vc = async function* (e) {
  if (e[Symbol.asyncIterator]) {
    yield* e;
    return;
  }
  const a = e.getReader();
  try {
    for (; ; ) {
      const { done: n, value: i } = await a.read();
      if (n)
        break;
      yield i;
    }
  } finally {
    await a.cancel();
  }
}, li = (e, a, n, i) => {
  const t = Wc(e, a);
  let s = 0, r, d = (f) => {
    r || (r = !0, i && i(f));
  };
  return new ReadableStream({
    async pull(f) {
      try {
        const { done: x, value: p } = await t.next();
        if (x) {
          d(), f.close();
          return;
        }
        let o = p.byteLength;
        if (n) {
          let c = s += o;
          n(c);
        }
        f.enqueue(new Uint8Array(p));
      } catch (x) {
        throw d(x), x;
      }
    },
    cancel(f) {
      return d(f), t.return();
    }
  }, {
    highWaterMark: 2
  });
}, ui = 64 * 1024, { isFunction: Je } = m, Gc = (({ Request: e, Response: a }) => ({
  Request: e,
  Response: a
}))(m.global), {
  ReadableStream: di,
  TextEncoder: mi
} = m.global, fi = (e, ...a) => {
  try {
    return !!e(...a);
  } catch {
    return !1;
  }
}, Xc = (e) => {
  e = m.merge.call({
    skipUndefined: !0
  }, Gc, e);
  const { fetch: a, Request: n, Response: i } = e, t = a ? Je(a) : typeof fetch == "function", s = Je(n), r = Je(i);
  if (!t)
    return !1;
  const d = t && Je(di), f = t && (typeof mi == "function" ? /* @__PURE__ */ ((u) => (h) => u.encode(h))(new mi()) : async (u) => new Uint8Array(await new n(u).arrayBuffer())), x = s && d && fi(() => {
    let u = !1;
    const h = new n(F.origin, {
      body: new di(),
      method: "POST",
      get duplex() {
        return u = !0, "half";
      }
    }).headers.has("Content-Type");
    return u && !h;
  }), p = r && d && fi(() => m.isReadableStream(new i("").body)), o = {
    stream: p && ((u) => u.body)
  };
  t && ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((u) => {
    !o[u] && (o[u] = (h, v) => {
      let b = h && h[u];
      if (b)
        return b.call(h);
      throw new g(`Response type '${u}' is not supported`, g.ERR_NOT_SUPPORT, v);
    });
  });
  const c = async (u) => {
    if (u == null)
      return 0;
    if (m.isBlob(u))
      return u.size;
    if (m.isSpecCompliantForm(u))
      return (await new n(F.origin, {
        method: "POST",
        body: u
      }).arrayBuffer()).byteLength;
    if (m.isArrayBufferView(u) || m.isArrayBuffer(u))
      return u.byteLength;
    if (m.isURLSearchParams(u) && (u = u + ""), m.isString(u))
      return (await f(u)).byteLength;
  }, l = async (u, h) => {
    const v = m.toFiniteNumber(u.getContentLength());
    return v ?? c(h);
  };
  return async (u) => {
    let {
      url: h,
      method: v,
      data: b,
      signal: y,
      cancelToken: E,
      timeout: k,
      onDownloadProgress: A,
      onUploadProgress: C,
      responseType: O,
      headers: P,
      withCredentials: D = "same-origin",
      fetchOptions: q
    } = xt(u), z = a || fetch;
    O = O ? (O + "").toLowerCase() : "text";
    let ee = $c([y, E && E.toAbortSignal()], k), Y = null;
    const oe = ee && ee.unsubscribe && (() => {
      ee.unsubscribe();
    });
    let re;
    try {
      if (C && x && v !== "get" && v !== "head" && (re = await l(P, b)) !== 0) {
        let _ = new n(h, {
          method: "POST",
          body: b,
          duplex: "half"
        }), L;
        if (m.isFormData(b) && (L = _.headers.get("content-type")) && P.setContentType(L), _.body) {
          const [Z, U] = oa(
            re,
            Ae(sa(C))
          );
          b = li(_.body, ui, Z, U);
        }
      }
      m.isString(D) || (D = D ? "include" : "omit");
      const Q = s && "credentials" in n.prototype, M = {
        ...q,
        signal: ee,
        method: v.toUpperCase(),
        headers: P.normalize().toJSON(),
        body: b,
        duplex: "half",
        credentials: Q ? D : void 0
      };
      Y = s && new n(h, M);
      let W = await (s ? z(Y, q) : z(h, M));
      const ye = p && (O === "stream" || O === "response");
      if (p && (A || ye && oe)) {
        const _ = {};
        ["status", "statusText", "headers"].forEach((ae) => {
          _[ae] = W[ae];
        });
        const L = m.toFiniteNumber(W.headers.get("content-length")), [Z, U] = A && oa(
          L,
          Ae(sa(A), !0)
        ) || [];
        W = new i(
          li(W.body, ui, Z, () => {
            U && U(), oe && oe();
          }),
          _
        );
      }
      O = O || "text";
      let T = await o[m.findKey(o, O) || "text"](W, u);
      return !ye && oe && oe(), await new Promise((_, L) => {
        _e(_, L, {
          data: T,
          headers: $.from(W.headers),
          status: W.status,
          statusText: W.statusText,
          config: u,
          request: Y
        });
      });
    } catch (Q) {
      throw oe && oe(), Q && Q.name === "TypeError" && /Load failed|fetch/i.test(Q.message) ? Object.assign(
        new g("Network Error", g.ERR_NETWORK, u, Y),
        {
          cause: Q.cause || Q
        }
      ) : g.from(Q, Q && Q.code, u, Y);
    }
  };
}, Kc = /* @__PURE__ */ new Map(), vt = (e) => {
  let a = e && e.env || {};
  const { fetch: n, Request: i, Response: t } = a, s = [
    i,
    t,
    n
  ];
  let r = s.length, d = r, f, x, p = Kc;
  for (; d--; )
    f = s[d], x = p.get(f), x === void 0 && p.set(f, x = d ? /* @__PURE__ */ new Map() : Xc(a)), p = x;
  return x;
};
vt();
const wn = {
  http: Dc,
  xhr: Mc,
  fetch: {
    get: vt
  }
};
m.forEach(wn, (e, a) => {
  if (e) {
    try {
      Object.defineProperty(e, "name", { value: a });
    } catch {
    }
    Object.defineProperty(e, "adapterName", { value: a });
  }
});
const xi = (e) => `- ${e}`, Jc = (e) => m.isFunction(e) || e === null || e === !1;
function Yc(e, a) {
  e = m.isArray(e) ? e : [e];
  const { length: n } = e;
  let i, t;
  const s = {};
  for (let r = 0; r < n; r++) {
    i = e[r];
    let d;
    if (t = i, !Jc(i) && (t = wn[(d = String(i)).toLowerCase()], t === void 0))
      throw new g(`Unknown adapter '${d}'`);
    if (t && (m.isFunction(t) || (t = t.get(a))))
      break;
    s[d || "#" + r] = t;
  }
  if (!t) {
    const r = Object.entries(s).map(
      ([f, x]) => `adapter ${f} ` + (x === !1 ? "is not supported by the environment" : "is not available in the build")
    );
    let d = n ? r.length > 1 ? `since :
` + r.map(xi).join(`
`) : " " + xi(r[0]) : "as no adapter specified";
    throw new g(
      "There is no suitable adapter to dispatch the request " + d,
      "ERR_NOT_SUPPORT"
    );
  }
  return t;
}
const ht = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: Yc,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: wn
};
function Ma(e) {
  if (e.cancelToken && e.cancelToken.throwIfRequested(), e.signal && e.signal.aborted)
    throw new ue(null, e);
}
function vi(e) {
  return Ma(e), e.headers = $.from(e.headers), e.data = Fa.call(
    e,
    e.transformRequest
  ), ["post", "put", "patch"].indexOf(e.method) !== -1 && e.headers.setContentType("application/x-www-form-urlencoded", !1), ht.getAdapter(e.adapter || Me.adapter, e)(e).then(function(i) {
    return Ma(e), i.data = Fa.call(
      e,
      e.transformResponse,
      i
    ), i.headers = $.from(i.headers), i;
  }, function(i) {
    return ot(i) || (Ma(e), i && i.response && (i.response.data = Fa.call(
      e,
      e.transformResponse,
      i.response
    ), i.response.headers = $.from(i.response.headers))), Promise.reject(i);
  });
}
const fa = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((e, a) => {
  fa[e] = function(i) {
    return typeof i === e || "a" + (a < 1 ? "n " : " ") + e;
  };
});
const hi = {};
fa.transitional = function(a, n, i) {
  function t(s, r) {
    return "[Axios v" + ta + "] Transitional option '" + s + "'" + r + (i ? ". " + i : "");
  }
  return (s, r, d) => {
    if (a === !1)
      throw new g(
        t(r, " has been removed" + (n ? " in " + n : "")),
        g.ERR_DEPRECATED
      );
    return n && !hi[r] && (hi[r] = !0, console.warn(
      t(
        r,
        " has been deprecated since v" + n + " and will be removed in the near future"
      )
    )), a ? a(s, r, d) : !0;
  };
};
fa.spelling = function(a) {
  return (n, i) => (console.warn(`${i} is likely a misspelling of ${a}`), !0);
};
function Qc(e, a, n) {
  if (typeof e != "object")
    throw new g("options must be an object", g.ERR_BAD_OPTION_VALUE);
  const i = Object.keys(e);
  let t = i.length;
  for (; t-- > 0; ) {
    const s = i[t], r = a[s];
    if (r) {
      const d = e[s], f = d === void 0 || r(d, s, e);
      if (f !== !0)
        throw new g("option " + s + " must be " + f, g.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (n !== !0)
      throw new g("Unknown option " + s, g.ERR_BAD_OPTION);
  }
}
const aa = {
  assertOptions: Qc,
  validators: fa
}, te = aa.validators;
let ve = class {
  constructor(a) {
    this.defaults = a || {}, this.interceptors = {
      request: new Vn(),
      response: new Vn()
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
  async request(a, n) {
    try {
      return await this._request(a, n);
    } catch (i) {
      if (i instanceof Error) {
        let t = {};
        Error.captureStackTrace ? Error.captureStackTrace(t) : t = new Error();
        const s = t.stack ? t.stack.replace(/^.+\n/, "") : "";
        try {
          i.stack ? s && !String(i.stack).endsWith(s.replace(/^.+\n.+\n/, "")) && (i.stack += `
` + s) : i.stack = s;
        } catch {
        }
      }
      throw i;
    }
  }
  _request(a, n) {
    typeof a == "string" ? (n = n || {}, n.url = a) : n = a || {}, n = be(this.defaults, n);
    const { transitional: i, paramsSerializer: t, headers: s } = n;
    i !== void 0 && aa.assertOptions(i, {
      silentJSONParsing: te.transitional(te.boolean),
      forcedJSONParsing: te.transitional(te.boolean),
      clarifyTimeoutError: te.transitional(te.boolean)
    }, !1), t != null && (m.isFunction(t) ? n.paramsSerializer = {
      serialize: t
    } : aa.assertOptions(t, {
      encode: te.function,
      serialize: te.function
    }, !0)), n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0), aa.assertOptions(n, {
      baseUrl: te.spelling("baseURL"),
      withXsrfToken: te.spelling("withXSRFToken")
    }, !0), n.method = (n.method || this.defaults.method || "get").toLowerCase();
    let r = s && m.merge(
      s.common,
      s[n.method]
    );
    s && m.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (u) => {
        delete s[u];
      }
    ), n.headers = $.concat(r, s);
    const d = [];
    let f = !0;
    this.interceptors.request.forEach(function(h) {
      typeof h.runWhen == "function" && h.runWhen(n) === !1 || (f = f && h.synchronous, d.unshift(h.fulfilled, h.rejected));
    });
    const x = [];
    this.interceptors.response.forEach(function(h) {
      x.push(h.fulfilled, h.rejected);
    });
    let p, o = 0, c;
    if (!f) {
      const u = [vi.bind(this), void 0];
      for (u.unshift(...d), u.push(...x), c = u.length, p = Promise.resolve(n); o < c; )
        p = p.then(u[o++], u[o++]);
      return p;
    }
    c = d.length;
    let l = n;
    for (; o < c; ) {
      const u = d[o++], h = d[o++];
      try {
        l = u(l);
      } catch (v) {
        h.call(this, v);
        break;
      }
    }
    try {
      p = vi.call(this, l);
    } catch (u) {
      return Promise.reject(u);
    }
    for (o = 0, c = x.length; o < c; )
      p = p.then(x[o++], x[o++]);
    return p;
  }
  getUri(a) {
    a = be(this.defaults, a);
    const n = dn(a.baseURL, a.url, a.allowAbsoluteUrls);
    return pn(n, a.params, a.paramsSerializer);
  }
};
m.forEach(["delete", "get", "head", "options"], function(a) {
  ve.prototype[a] = function(n, i) {
    return this.request(be(i || {}, {
      method: a,
      url: n,
      data: (i || {}).data
    }));
  };
});
m.forEach(["post", "put", "patch"], function(a) {
  function n(i) {
    return function(s, r, d) {
      return this.request(be(d || {}, {
        method: a,
        headers: i ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: s,
        data: r
      }));
    };
  }
  ve.prototype[a] = n(), ve.prototype[a + "Form"] = n(!0);
});
let Zc = class bt {
  constructor(a) {
    if (typeof a != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function(s) {
      n = s;
    });
    const i = this;
    this.promise.then((t) => {
      if (!i._listeners) return;
      let s = i._listeners.length;
      for (; s-- > 0; )
        i._listeners[s](t);
      i._listeners = null;
    }), this.promise.then = (t) => {
      let s;
      const r = new Promise((d) => {
        i.subscribe(d), s = d;
      }).then(t);
      return r.cancel = function() {
        i.unsubscribe(s);
      }, r;
    }, a(function(s, r, d) {
      i.reason || (i.reason = new ue(s, r, d), n(i.reason));
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason)
      throw this.reason;
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(a) {
    if (this.reason) {
      a(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(a) : this._listeners = [a];
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(a) {
    if (!this._listeners)
      return;
    const n = this._listeners.indexOf(a);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const a = new AbortController(), n = (i) => {
      a.abort(i);
    };
    return this.subscribe(n), a.signal.unsubscribe = () => this.unsubscribe(n), a.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let a;
    return {
      token: new bt(function(t) {
        a = t;
      }),
      cancel: a
    };
  }
};
function ep(e) {
  return function(n) {
    return e.apply(null, n);
  };
}
function ap(e) {
  return m.isObject(e) && e.isAxiosError === !0;
}
const Ya = {
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
Object.entries(Ya).forEach(([e, a]) => {
  Ya[a] = e;
});
function gt(e) {
  const a = new ve(e), n = Ti(ve.prototype.request, a);
  return m.extend(n, ve.prototype, a, { allOwnKeys: !0 }), m.extend(n, a, null, { allOwnKeys: !0 }), n.create = function(t) {
    return gt(be(e, t));
  }, n;
}
const N = gt(Me);
N.Axios = ve;
N.CanceledError = ue;
N.CancelToken = Zc;
N.isCancel = ot;
N.VERSION = ta;
N.toFormData = ma;
N.AxiosError = g;
N.Cancel = N.CanceledError;
N.all = function(a) {
  return Promise.all(a);
};
N.spread = ep;
N.isAxiosError = ap;
N.mergeConfig = be;
N.AxiosHeaders = $;
N.formToJSON = (e) => tt(m.isHTMLForm(e) ? new FormData(e) : e);
N.getAdapter = ht.getAdapter;
N.HttpStatusCode = Ya;
N.default = N;
const {
  Axios: Cp,
  AxiosError: Op,
  CanceledError: jp,
  isCancel: Lp,
  CancelToken: Pp,
  VERSION: Np,
  all: Fp,
  Cancel: Ip,
  isAxiosError: Up,
  spread: Dp,
  toFormData: Bp,
  AxiosHeaders: qp,
  HttpStatusCode: zp,
  formToJSON: Mp,
  getAdapter: $p,
  mergeConfig: Hp
} = N, np = "http://localhost:5173/strava-callback";
function bi() {
  return `https://www.strava.com/oauth/authorize?${new URLSearchParams({
    client_id: nn,
    redirect_uri: np,
    response_type: "code",
    approval_prompt: "force",
    // Changed to force to ensure fresh scope approval
    scope: "read,activity:read,activity:read_all"
  }).toString()}`;
}
async function ip(e) {
  var a;
  try {
    return console.log("Strava: Exchanging code for token..."), (await N.post("https://www.strava.com/oauth/token", {
      client_id: nn,
      client_secret: _i,
      code: e,
      grant_type: "authorization_code"
    })).data;
  } catch (n) {
    throw console.error("Strava: Error exchanging code for token:", ((a = n.response) == null ? void 0 : a.data) || n.message), n;
  }
}
async function tp(e, a = 1, n = 30) {
  var i;
  try {
    return (await N.get("https://www.strava.com/api/v3/athlete/activities", {
      headers: { Authorization: `Bearer ${e}` },
      params: { page: a, per_page: n }
    })).data;
  } catch (t) {
    throw console.error("Strava: Error fetching athlete activities:", ((i = t.response) == null ? void 0 : i.data) || t.message), t;
  }
}
async function $a(e, a) {
  try {
    return (await N.get(`https://www.strava.com/api/v3/activities/${a}`, {
      headers: {
        Authorization: `Bearer ${e}`
      }
    })).data;
  } catch (n) {
    throw console.error(`Error fetching Strava activity ${a}:`, n), n;
  }
}
async function op(e) {
  try {
    return (await N.post("https://www.strava.com/oauth/token", {
      client_id: nn,
      client_secret: _i,
      grant_type: "refresh_token",
      refresh_token: e
    })).data;
  } catch (a) {
    throw console.error("Error refreshing Strava access token:", a), a;
  }
}
let G = null;
const sp = se.join(Pe.getPath("userData"), "workouts.db"), w = new St.Database(sp, (e) => {
  e ? console.error("Database opening error: ", e) : (console.log("Database opened successfully"), w.serialize(() => {
    w.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT,
        targetPace TEXT,
        gymType TEXT,
        isCompleted INTEGER DEFAULT 0
      )`, (a) => {
      a ? console.error("Error creating workouts table:", a) : (console.log("Workouts table checked/created successfully."), w.all("PRAGMA table_info(workouts)", (n, i) => {
        if (n) {
          console.error("Error getting table info:", n);
          return;
        }
        Array.isArray(i) && (i.some((l) => l.name === "stravaActivityId") || w.run("ALTER TABLE workouts ADD COLUMN stravaActivityId TEXT", (l) => {
          l ? console.error("Error adding stravaActivityId column:", l) : console.log("stravaActivityId column added successfully.");
        }), i.some((l) => l.name === "isDeleted") || w.run("ALTER TABLE workouts ADD COLUMN isDeleted INTEGER DEFAULT 0", (l) => {
          l ? console.error("Error adding isDeleted column:", l) : console.log("isDeleted column added successfully.");
        }), i.some((l) => l.name === "actualDuration") || w.run("ALTER TABLE workouts ADD COLUMN actualDuration INTEGER", (l) => {
          l ? console.error("Error adding actualDuration column:", l) : console.log("actualDuration column added successfully.");
        }), i.some((l) => l.name === "duration") || w.run("ALTER TABLE workouts ADD COLUMN duration INTEGER", (l) => {
          l ? console.error("Error adding duration column:", l) : console.log("duration column added successfully.");
        }), i.some((l) => l.name === "caloriesBurned") || w.run("ALTER TABLE workouts ADD COLUMN caloriesBurned INTEGER", (l) => {
          l ? console.error("Error adding caloriesBurned column:", l) : console.log("caloriesBurned column added successfully.");
        }), i.some((l) => l.name === "rpe") || w.run("ALTER TABLE workouts ADD COLUMN rpe INTEGER", (l) => {
          l ? console.error("Error adding rpe column:", l) : console.log("rpe column added successfully.");
        }), i.some((l) => l.name === "notes") || w.run("ALTER TABLE workouts ADD COLUMN notes TEXT", (l) => {
          l ? console.error("Error adding notes column:", l) : console.log("notes column added successfully.");
        }), i.some((l) => l.name === "totalWeightLifted") || w.run("ALTER TABLE workouts ADD COLUMN totalWeightLifted INTEGER", (l) => {
          l ? console.error("Error adding totalWeightLifted column:", l) : console.log("totalWeightLifted column added successfully.");
        }), i.some((l) => l.name === "distance") || w.run("ALTER TABLE workouts ADD COLUMN distance REAL", (l) => {
          l ? console.error("Error adding distance column:", l) : console.log("distance column added successfully.");
        }));
      }), w.run(`CREATE TABLE IF NOT EXISTS strava_tokens (
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          athlete_id TEXT PRIMARY KEY
        )`, (n) => {
        n ? console.error("Error creating strava_tokens table:", n) : console.log("strava_tokens table checked/created successfully.");
      }), w.run(`CREATE TABLE IF NOT EXISTS workout_type_colors (
          type TEXT PRIMARY KEY,
          color TEXT NOT NULL
        )`, (n) => {
        n ? console.error("Error creating workout_type_colors table:", n) : (console.log("Workout_type_colors table checked/created successfully."), w.get("SELECT COUNT(*) as count FROM workout_type_colors", (i, t) => {
          if (i) {
            console.error("Error checking workout_type_colors count:", i);
            return;
          }
          t.count === 0 && (w.run("INSERT INTO workout_type_colors (type, color) VALUES (?, ?)", ["gym", "#3f88c5"]), w.run("INSERT INTO workout_type_colors (type, color) VALUES (?, ?)", ["running", "#5cb85c"]), w.run("INSERT INTO workout_type_colors (type, color) VALUES (?, ?)", ["bike", "#fb8c00"]), w.run("INSERT INTO workout_type_colors (type, color) VALUES (?, ?)", ["rest", "#757575"]), w.run("INSERT INTO workout_type_colors (type, color) VALUES (?, ?)", ["other", "#FFA726"]), console.log("Default workout type colors inserted."));
        }));
      }), w.run(`CREATE TABLE IF NOT EXISTS nutritions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          energyTarget_kcal REAL,
          proteinTarget_g REAL,
          carbTarget_g REAL,
          fatTarget_g REAL,
          mealsPerDay INTEGER,
          preWorkoutCarbs_g REAL,
          postWorkoutProtein_g REAL,
          hydration_ml REAL,
          fiber_g REAL,
          bodyWeightTarget_kg REAL,
          notes TEXT
        )`, (n) => {
        n ? console.error("Error creating nutritions table:", n) : console.log("Nutritions table checked/created successfully.");
      }), w.run(`CREATE TABLE IF NOT EXISTS daily_weights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          weight REAL NOT NULL
        )`, (n) => {
        n ? console.error("Error creating daily_weights table:", n) : console.log("Daily_weights table checked/created successfully.");
      }), w.run(`CREATE TABLE IF NOT EXISTS workout_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`, (n) => {
        n ? console.error("Error creating workout_templates table:", n) : console.log("workout_templates table checked/created successfully.");
      }), w.run(`CREATE TABLE IF NOT EXISTS workout_template_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER NOT NULL,
          exercise_name TEXT NOT NULL,
          sets INTEGER,
          reps TEXT,
          notes TEXT,
          FOREIGN KEY (template_id) REFERENCES workout_templates(id)
        )`, (n) => {
        n ? console.error("Error creating workout_template_exercises table:", n) : console.log("workout_template_exercises table checked/created successfully.");
      }), w.run(`CREATE TABLE IF NOT EXISTS exercises (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    body_part TEXT NOT NULL
                  )`, (n) => {
      }), w.run(`CREATE TABLE IF NOT EXISTS strava_cache (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL
          )`, (n) => {
        n ? console.error("Error creating strava_cache table:", n) : console.log("strava_cache table checked/created successfully.");
      }), w.run(`CREATE TABLE IF NOT EXISTS race_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            date TEXT NOT NULL
          )`, (n) => {
        n ? console.error("Error creating race_goals table:", n) : console.log("race_goals table checked/created successfully.");
      }));
    });
  }));
}), yt = se.dirname(kt(import.meta.url));
process.env.APP_ROOT = se.join(yt, "..");
const Qa = process.env.VITE_DEV_SERVER_URL, Wp = se.join(process.env.APP_ROOT, "dist-electron"), wt = se.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Qa ? se.join(process.env.APP_ROOT, "public") : wt;
async function Le() {
  let e = await _t();
  if (!e)
    return null;
  const a = Math.floor(Date.now() / 1e3);
  if (e.expires_at > a + 60)
    return e.access_token;
  try {
    console.log("Refreshing Strava access token...");
    const n = await op(e.refresh_token), i = Math.floor(Date.now() / 1e3) + n.expires_in, t = {
      access_token: n.access_token,
      refresh_token: n.refresh_token || e.refresh_token,
      // Use new refresh token if provided, otherwise old one
      expires_at: i,
      athlete_id: e.athlete_id
      // Athlete ID remains the same
    };
    return await Et(t), t.access_token;
  } catch (n) {
    return console.error("Failed to refresh Strava access token:", n), await rp(), null;
  }
}
function Et(e) {
  return new Promise((a, n) => {
    w.run(
      `INSERT OR REPLACE INTO strava_tokens (access_token, refresh_token, expires_at, athlete_id)
       VALUES (?, ?, ?, ?)`,
      [e.access_token, e.refresh_token, e.expires_at, e.athlete_id],
      function(i) {
        i ? (console.error("Error saving Strava tokens:", i), n(i)) : (console.log("Strava tokens saved/updated."), a());
      }
    );
  });
}
function _t() {
  return new Promise((e, a) => {
    w.get(
      "SELECT access_token, refresh_token, expires_at, athlete_id FROM strava_tokens LIMIT 1",
      (n, i) => {
        n ? (console.error("Error retrieving Strava tokens:", n), a(n)) : e(i || null);
      }
    );
  });
}
function rp() {
  return new Promise((e, a) => {
    w.run("DELETE FROM strava_tokens", function(n) {
      n ? (console.error("Error deleting Strava tokens:", n), a(n)) : (console.log("Strava tokens deleted."), e());
    });
  });
}
function Tt() {
  G = new Za({
    icon: se.join(process.env.VITE_PUBLIC || ".", "electron-vite.svg"),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: se.join(yt, "preload.mjs")
    }
  }), G.webContents.on("did-finish-load", () => {
    G == null || G.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Qa ? G.loadURL(Qa) : G.loadFile(se.join(wt, "index.html")), G.on("closed", () => {
    G = null;
  });
}
function cp() {
  console.log("Creating Strava auth window...");
  const e = new Za({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  e.loadURL(bi()), console.log("Strava auth window loading URL:", bi());
  const a = (n, i) => {
    console.log("Auth window navigation:", i), i.startsWith("http://localhost:5173/strava-callback") && (console.log("Strava redirect intercepted:", i), G && (G.focus(), G.webContents.send("strava-auth-callback", i)), e.close(), console.log("Strava auth window closed."));
  };
  e.webContents.on("will-navigate", a), e.webContents.on("did-navigate", a), e.on("closed", () => {
    console.log("Strava auth window was closed by user or script.");
  });
}
Pe.on("window-all-closed", () => {
  process.platform !== "darwin" && Pe.quit();
});
Pe.on("activate", () => {
  Za.getAllWindows().length === 0 && Tt();
});
Pe.whenReady().then(async () => {
  Tt();
  try {
    await _t() && console.log("Strava tokens loaded from DB.");
  } catch (p) {
    console.error("Error loading Strava tokens on startup:", p);
  }
  j.handle("get-strava-auth-url", () => {
    cp();
  }), j.handle("strava-exchange-code", async (p, o) => {
    try {
      const c = await ip(o), l = Math.floor(Date.now() / 1e3) + c.expires_in, u = {
        access_token: c.access_token,
        refresh_token: c.refresh_token,
        expires_at: l,
        athlete_id: c.athlete.id.toString()
        // Assuming athlete.id exists and is unique
      };
      return await Et(u), c.access_token;
    } catch (c) {
      return console.error("Failed to exchange code for token:", c), null;
    }
  });
  let e = null, a = 0;
  const n = 15 * 60 * 1e3, i = /* @__PURE__ */ new Map(), t = 30 * 60 * 1e3;
  let s = 0;
  const r = 2e3;
  async function d() {
    const o = Date.now() - s;
    if (o < r) {
      const c = r - o;
      await new Promise((l) => setTimeout(l, c));
    }
    s = Date.now();
  }
  async function f(p) {
    return new Promise((o) => {
      w.get("SELECT data, timestamp FROM strava_cache WHERE id = ?", [p], (c, l) => {
        if (c || !l) return o(null);
        const u = Date.now() - l.timestamp, h = p.startsWith("list_") ? n : 7 * 24 * 60 * 60 * 1e3;
        if (u < h)
          try {
            o(JSON.parse(l.data));
          } catch {
            o(null);
          }
        else
          o(null);
      });
    });
  }
  async function x(p, o, c) {
    const l = JSON.stringify(c), u = Date.now();
    w.run("INSERT OR REPLACE INTO strava_cache (id, type, data, timestamp) VALUES (?, ?, ?, ?)", [p, o, l, u]);
  }
  j.handle("strava-get-activities", async (p, o, c) => {
    var b;
    console.log("Main: strava-get-activities called", { page: o, per_page: c });
    const l = (o === void 0 || o === 1) && (c === void 0 || c === 30), u = `list_${o || 1}_${c || 30}`;
    if (l && e && Date.now() - a < n)
      return console.log("Main: Returning in-memory cached activities."), e;
    const h = await f(u);
    if (h)
      return console.log("Main: Returning persistent cached activities."), l && (e = h, a = Date.now()), h;
    const v = await Le();
    if (!v) return { error: "NO_ACCESS_TOKEN" };
    try {
      await d(), console.log("Main: Fetching activities from Strava API...");
      const y = await tp(v, o, c);
      return Array.isArray(y) && (await x(u, "list", y), l && (e = y, a = Date.now())), y;
    } catch (y) {
      return console.error("Main: Failed to fetch Strava activities:", y.message), { error: "API_ERROR", details: ((b = y.response) == null ? void 0 : b.data) || y.message };
    }
  }), j.handle("get-strava-activity-by-id", async (p, o) => {
    var v;
    console.log("Main: get-strava-activity-by-id called for", o);
    const c = Date.now(), l = i.get(o);
    if (l && c - l.timestamp < t)
      return l.data;
    const u = await f(o);
    if (u)
      return i.set(o, { data: u, timestamp: c }), u;
    if (e && Array.isArray(e)) {
      const b = e.find((y) => y.id.toString() === o);
      if (b) return b;
    }
    const h = await Le();
    if (!h) return { error: "NO_ACCESS_TOKEN" };
    try {
      await d();
      const b = await $a(h, o);
      return await x(o, "detail", b), i.set(o, { data: b, timestamp: Date.now() }), b;
    } catch (b) {
      return console.error(`Main: Failed to fetch Strava activity ${o}:`, b.message), { error: "API_ERROR", details: ((v = b.response) == null ? void 0 : v.data) || b.message };
    }
  }), j.handle("strava-is-connected", async () => !!await Le()), j.handle("link-strava-activity", async (p, { workoutId: o, stravaActivityId: c }) => {
    try {
      const l = await Le();
      if (!l)
        throw new Error("No valid Strava access token available.");
      let u = 0, h = "", v = !1;
      const b = i.get(c);
      if (b && (u = b.data.distance, h = b.data.sport_type || b.data.type, v = !0), !v && e && Array.isArray(e)) {
        const E = e.find((k) => k.id.toString() === c.toString());
        E && (u = E.distance, h = E.sport_type || E.type, v = !0);
      }
      if (v)
        u = u / 1e3;
      else {
        const E = await $a(l, c);
        u = E.distance / 1e3, h = E.sport_type || E.type, i.set(c, { data: E, timestamp: Date.now() });
      }
      let y = "";
      return h === "Run" ? y = "running" : ["Ride", "VirtualRide", "GravelRide", "MountainBikeRide", "EBikeRide"].includes(h) && (y = "bike"), new Promise((E, k) => {
        let A = "UPDATE workouts SET stravaActivityId = ?, distance = ?";
        const C = [c, u];
        y && (A += ", type = ?", C.push(y)), A += " WHERE id = ?", C.push(o), w.run(A, C, function(O) {
          O ? k(O) : E(this.changes);
        });
      });
    } catch (l) {
      return console.error("Main: Failed to link Strava activity:", l), { error: "LINK_FAILED", message: l instanceof Error ? l.message : String(l) };
    }
  }), j.handle("get-workouts", async () => new Promise((p, o) => {
    const c = "SELECT * FROM workouts WHERE isDeleted = 0";
    console.log("Executing SQL for get-workouts:", c), w.all(c, [], (l, u) => {
      l ? (console.error("Error in get-workouts:", l), o(l)) : p(u);
    });
  })), j.handle("add-workout", async (p, o) => new Promise((c, l) => {
    w.run(
      "INSERT INTO workouts (name, date, type, targetPace, gymType, isCompleted, duration, caloriesBurned, actualDuration, rpe, notes, totalWeightLifted, distance, stravaActivityId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        o.name,
        o.date,
        o.type,
        o.targetPace,
        o.gymType,
        o.isCompleted ?? 0,
        o.duration,
        o.caloriesBurned,
        o.actualDuration,
        o.rpe,
        o.notes,
        o.totalWeightLifted,
        o.distance,
        o.stravaActivityId
      ],
      function(u) {
        u ? l(u) : c(this.lastID);
      }
    );
  })), j.handle("update-workout", async (p, o) => new Promise((c, l) => {
    w.run(
      "UPDATE workouts SET name = ?, date = ?, type = ?, targetPace = ?, gymType = ?, isCompleted = ?, duration = ?, caloriesBurned = ?, actualDuration = ?, rpe = ?, notes = ?, totalWeightLifted = ?, distance = ?, stravaActivityId = ? WHERE id = ?",
      [
        o.name,
        o.date,
        o.type,
        o.targetPace,
        o.gymType,
        o.isCompleted ?? 0,
        o.duration,
        o.caloriesBurned,
        o.actualDuration,
        o.rpe,
        o.notes,
        o.totalWeightLifted,
        o.distance,
        o.stravaActivityId,
        o.id
      ],
      function(u) {
        u ? l(u) : c(this.changes);
      }
    );
  })), j.handle("delete-workout", async (p, o) => (console.log("Main process received delete-workout request for ID:", o), new Promise((c, l) => {
    w.run("UPDATE workouts SET isDeleted = 1 WHERE id = ?", o, function(u) {
      u ? (console.error(`Error soft-deleting workout ${o}:`, u), l(u)) : (console.log(`Workout ${o} soft-deleted. Changes: ${this.changes}`), c(this.changes));
    });
  }))), j.handle("delete-workouts", async (p, o) => (console.log("Main process received delete-workouts request for IDs:", o), new Promise((c, l) => {
    if (!o || o.length === 0) {
      console.log("No IDs provided for bulk delete, resolving with 0 changes."), c(0);
      return;
    }
    const u = o.map(() => "?").join(",");
    w.run(`UPDATE workouts SET isDeleted = 1 WHERE id IN (${u})`, o, function(h) {
      h ? (console.error(`Error soft-deleting workouts with IDs ${o}:`, h), l(h)) : (console.log(`Workouts with IDs ${o} soft-deleted. Changes: ${this.changes}`), c(this.changes));
    });
  }))), j.handle("get-completed-workouts", async (p, o, c) => new Promise((l, u) => {
    let h = "SELECT * FROM workouts WHERE isCompleted = 1 AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY date DESC";
    const v = [];
    o !== void 0 && (h += " LIMIT ?", v.push(o)), c !== void 0 && (h += " OFFSET ?", v.push(c)), w.all(h, v, (b, y) => {
      b ? u(b) : l(y);
    });
  })), j.handle("complete-workout", async (p, o) => {
    const { id: c, isCompleted: l, actualDuration: u, rpe: h, notes: v, totalWeightLifted: b, stravaActivityId: y, distance: E } = o;
    let k = E, A = u, C = "";
    if (y) {
      console.log("Attempting to sync Strava activity:", y);
      try {
        const P = await Le();
        if (P) {
          const D = await $a(P, String(y));
          console.log("Successfully fetched Strava activity. Distance (m):", D.distance), k = D.distance / 1e3, D.moving_time && (A = Math.round(D.moving_time / 60)), C = D.sport_type || D.type;
        } else
          console.error("No valid Strava access token found.");
      } catch (P) {
        console.error("Failed to fetch Strava activity for distance:", P);
      }
    }
    let O = "";
    return C === "Run" ? O = "running" : ["Ride", "VirtualRide", "GravelRide", "MountainBikeRide", "EBikeRide"].includes(C) && (O = "bike"), new Promise((P, D) => {
      const q = ["isCompleted = ?"], z = [l];
      A !== void 0 && (q.push("actualDuration = ?"), z.push(A)), h !== void 0 && (q.push("rpe = ?"), z.push(h)), v !== void 0 && (q.push("notes = ?"), z.push(v)), b !== void 0 && (q.push("totalWeightLifted = ?"), z.push(b)), y !== void 0 && (q.push("stravaActivityId = ?"), z.push(y)), k !== void 0 && (q.push("distance = ?"), z.push(k)), O && (q.push("type = ?"), z.push(O)), z.push(c);
      const ee = `UPDATE workouts SET ${q.join(", ")} WHERE id = ?`;
      w.run(ee, z, function(Y) {
        Y ? D(Y) : P(this.changes);
      });
    });
  }), j.handle("open-file-dialog", async () => {
    if (!G)
      return { canceled: !0, filePaths: [] };
    const { canceled: p, filePaths: o } = await Rt.showOpenDialog(G, {
      properties: ["openFile"],
      filters: [
        { name: "CSV Files", extensions: ["csv"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return { canceled: p, filePaths: o };
  }), j.handle("read-file", async (p, o) => {
    try {
      return { success: !0, content: await At.readFile(o, { encoding: "utf-8" }) };
    } catch (c) {
      return console.error("Failed to read file:", c), { success: !1, error: c.message };
    }
  }), j.handle("get-workout-by-id", async (p, o) => new Promise((c, l) => {
    w.get("SELECT * FROM workouts WHERE id = ?", o, (u, h) => {
      u ? l(u) : c(h);
    });
  })), j.handle("get-workout-type-colors", async () => new Promise((p, o) => {
    w.all("SELECT type, color FROM workout_type_colors", [], (c, l) => {
      c ? o(c) : p(l);
    });
  })), j.handle("set-workout-type-color", async (p, { type: o, color: c }) => new Promise((l, u) => {
    w.run("INSERT OR REPLACE INTO workout_type_colors (type, color) VALUES (?, ?)", [o, c], function(h) {
      h ? u(h) : l(this.changes);
    });
  })), j.handle("get-nutritions", async () => new Promise((p, o) => {
    w.all("SELECT * FROM nutritions", [], (c, l) => {
      c ? o(c) : p(l);
    });
  })), j.handle("add-nutrition", async (p, o) => new Promise((c, l) => {
    w.run(
      "INSERT INTO nutritions (name, date, energyTarget_kcal, proteinTarget_g, carbTarget_g, fatTarget_g, mealsPerDay, preWorkoutCarbs_g, postWorkoutProtein_g, hydration_ml, fiber_g, bodyWeightTarget_kg, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        o.name,
        o.date,
        o.energyTarget_kcal,
        o.proteinTarget_g,
        o.carbTarget_g,
        o.fatTarget_g,
        o.mealsPerDay,
        o.preWorkoutCarbs_g,
        o.postWorkoutProtein_g,
        o.hydration_ml,
        o.fiber_g,
        o.bodyWeightTarget_kg,
        o.notes
      ],
      function(u) {
        u ? l(u) : c(this.lastID);
      }
    );
  })), j.handle("add-daily-weight", async (p, o) => new Promise((c, l) => {
    w.run(
      "INSERT OR REPLACE INTO daily_weights (date, weight) VALUES (?, ?)",
      [
        o.date,
        o.weight
      ],
      function(u) {
        u ? l(u) : c(this.lastID);
      }
    );
  })), j.handle("get-daily-weights", async () => new Promise((p, o) => {
    w.all("SELECT * FROM daily_weights", [], (c, l) => {
      c ? o(c) : p(l);
    });
  })), j.handle("get-workout-templates", async () => new Promise((p, o) => {
    w.all("SELECT * FROM workout_templates", [], (c, l) => {
      c ? o(c) : p(l);
    });
  })), j.handle("get-workout-template-exercises", async (p, o) => new Promise((c, l) => {
    w.all("SELECT * FROM workout_template_exercises WHERE template_id = ?", [o], (u, h) => {
      u ? l(u) : c(h);
    });
  })), j.handle("add-workout-template", async (p, { name: o, exercises: c }) => new Promise((l, u) => {
    w.run("INSERT INTO workout_templates (name) VALUES (?)", [o], function(h) {
      if (h)
        return u(h);
      const v = this.lastID, b = c.map((y) => new Promise((E, k) => {
        w.run(
          "INSERT INTO workout_template_exercises (template_id, exercise_name, sets, reps, notes) VALUES (?, ?, ?, ?, ?)",
          [v, y.exercise_name, y.sets, y.reps, y.notes],
          (A) => {
            A ? k(A) : E(this.lastID);
          }
        );
      }));
      Promise.all(b).then(() => l(v)).catch(u);
    });
  })), j.handle("delete-workout-template", async (p, o) => new Promise((c, l) => {
    w.serialize(() => {
      w.run("BEGIN TRANSACTION"), w.run("DELETE FROM workout_template_exercises WHERE template_id = ?", [o], (u) => {
        if (u)
          return w.run("ROLLBACK"), l(u);
      }), w.run("DELETE FROM workout_templates WHERE id = ?", [o], (u) => {
        if (u)
          return w.run("ROLLBACK"), l(u);
      }), w.run("COMMIT", (u) => {
        u ? l(u) : c(!0);
      });
    });
  })), j.handle("get-exercises", async () => new Promise((p, o) => {
    w.all("SELECT * FROM exercises", [], (c, l) => {
      c ? o(c) : p(l);
    });
  })), j.handle("get-race-goals", async () => new Promise((p, o) => {
    w.all("SELECT * FROM race_goals ORDER BY date ASC", [], (c, l) => {
      c ? o(c) : p(l);
    });
  })), j.handle("add-race-goal", async (p, o) => new Promise((c, l) => {
    w.run(
      "INSERT INTO race_goals (name, date) VALUES (?, ?)",
      [o.name, o.date],
      function(u) {
        u ? l(u) : c(this.lastID);
      }
    );
  })), j.handle("delete-race-goal", async (p, o) => new Promise((c, l) => {
    w.run("DELETE FROM race_goals WHERE id = ?", [o], function(u) {
      u ? l(u) : c(this.changes);
    });
  }));
});
export {
  Wp as MAIN_DIST,
  wt as RENDERER_DIST,
  Qa as VITE_DEV_SERVER_URL
};
