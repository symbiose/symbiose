!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.smtp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":3}],2:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],3:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":2,"_process":28,"inherits":25}],4:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
var TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str.toString()
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.compare = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Arguments must be Buffers')
  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}

// BUFFER INSTANCE METHODS
// =======================

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end === undefined) ? self.length : Number(end)

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = asciiSlice(self, start, end)
      break
    case 'binary':
      ret = binarySlice(self, start, end)
      break
    case 'base64':
      ret = base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

Buffer.prototype.equals = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.compare = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return readUInt16(this, offset, false, noAssert)
}

function readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return readInt16(this, offset, false, noAssert)
}

function readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return readInt32(this, offset, false, noAssert)
}

function readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return readFloat(this, offset, false, noAssert)
}

function readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
  return offset + 1
}

function writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
  return offset + 2
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, false, noAssert)
}

function writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
  return offset + 4
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
  return offset + 1
}

function writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  return offset + 2
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, false, noAssert)
}

function writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  return offset + 4
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, false, noAssert)
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":5,"ieee754":6}],5:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],6:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],7:[function(require,module,exports){
(function (Buffer){
var createHash = require('sha.js')

var md5 = toConstructor(require('./md5'))
var rmd160 = toConstructor(require('ripemd160'))

function toConstructor (fn) {
  return function () {
    var buffers = []
    var m= {
      update: function (data, enc) {
        if(!Buffer.isBuffer(data)) data = new Buffer(data, enc)
        buffers.push(data)
        return this
      },
      digest: function (enc) {
        var buf = Buffer.concat(buffers)
        var r = fn(buf)
        buffers = null
        return enc ? r.toString(enc) : r
      }
    }
    return m
  }
}

module.exports = function (alg) {
  if('md5' === alg) return new md5()
  if('rmd160' === alg) return new rmd160()
  return createHash(alg)
}

}).call(this,require("buffer").Buffer)
},{"./md5":11,"buffer":4,"ripemd160":12,"sha.js":14}],8:[function(require,module,exports){
(function (Buffer){
var createHash = require('./create-hash')

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)

module.exports = Hmac

function Hmac (alg, key) {
  if(!(this instanceof Hmac)) return new Hmac(alg, key)
  this._opad = opad
  this._alg = alg

  key = this._key = !Buffer.isBuffer(key) ? new Buffer(key) : key

  if(key.length > blocksize) {
    key = createHash(alg).update(key).digest()
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = this._ipad = new Buffer(blocksize)
  var opad = this._opad = new Buffer(blocksize)

  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  this._hash = createHash(alg).update(ipad)
}

Hmac.prototype.update = function (data, enc) {
  this._hash.update(data, enc)
  return this
}

Hmac.prototype.digest = function (enc) {
  var h = this._hash.digest()
  return createHash(this._alg).update(this._opad).update(h).digest(enc)
}


}).call(this,require("buffer").Buffer)
},{"./create-hash":7,"buffer":4}],9:[function(require,module,exports){
(function (Buffer){
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

}).call(this,require("buffer").Buffer)
},{"buffer":4}],10:[function(require,module,exports){
(function (Buffer){
var rng = require('./rng')

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = require('./create-hash')

exports.createHmac = require('./create-hmac')

exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

exports.getHashes = function () {
  return ['sha1', 'sha256', 'md5', 'rmd160']

}

var p = require('./pbkdf2')(exports.createHmac)
exports.pbkdf2 = p.pbkdf2
exports.pbkdf2Sync = p.pbkdf2Sync


// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

}).call(this,require("buffer").Buffer)
},{"./create-hash":7,"./create-hmac":8,"./pbkdf2":18,"./rng":19,"buffer":4}],11:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = require('./helpers');

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":9}],12:[function(require,module,exports){
(function (Buffer){

module.exports = ripemd160



/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
/** @preserve
(c) 2012 by Cédric Mesnil. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Constants table
var zl = [
    0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
    7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
    3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
    1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
    4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13];
var zr = [
    5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
    6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
    15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
    8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
    12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11];
var sl = [
     11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
    7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
    11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
      11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
    9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
var sr = [
    8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
    9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
    9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
    15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
    8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

var hl =  [ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
var hr =  [ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

var bytesToWords = function (bytes) {
  var words = [];
  for (var i = 0, b = 0; i < bytes.length; i++, b += 8) {
    words[b >>> 5] |= bytes[i] << (24 - b % 32);
  }
  return words;
};

var wordsToBytes = function (words) {
  var bytes = [];
  for (var b = 0; b < words.length * 32; b += 8) {
    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
  }
  return bytes;
};

var processBlock = function (H, M, offset) {

  // Swap endian
  for (var i = 0; i < 16; i++) {
    var offset_i = offset + i;
    var M_offset_i = M[offset_i];

    // Swap
    M[offset_i] = (
        (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
        (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
    );
  }

  // Working variables
  var al, bl, cl, dl, el;
  var ar, br, cr, dr, er;

  ar = al = H[0];
  br = bl = H[1];
  cr = cl = H[2];
  dr = dl = H[3];
  er = el = H[4];
  // Computation
  var t;
  for (var i = 0; i < 80; i += 1) {
    t = (al +  M[offset+zl[i]])|0;
    if (i<16){
        t +=  f1(bl,cl,dl) + hl[0];
    } else if (i<32) {
        t +=  f2(bl,cl,dl) + hl[1];
    } else if (i<48) {
        t +=  f3(bl,cl,dl) + hl[2];
    } else if (i<64) {
        t +=  f4(bl,cl,dl) + hl[3];
    } else {// if (i<80) {
        t +=  f5(bl,cl,dl) + hl[4];
    }
    t = t|0;
    t =  rotl(t,sl[i]);
    t = (t+el)|0;
    al = el;
    el = dl;
    dl = rotl(cl, 10);
    cl = bl;
    bl = t;

    t = (ar + M[offset+zr[i]])|0;
    if (i<16){
        t +=  f5(br,cr,dr) + hr[0];
    } else if (i<32) {
        t +=  f4(br,cr,dr) + hr[1];
    } else if (i<48) {
        t +=  f3(br,cr,dr) + hr[2];
    } else if (i<64) {
        t +=  f2(br,cr,dr) + hr[3];
    } else {// if (i<80) {
        t +=  f1(br,cr,dr) + hr[4];
    }
    t = t|0;
    t =  rotl(t,sr[i]) ;
    t = (t+er)|0;
    ar = er;
    er = dr;
    dr = rotl(cr, 10);
    cr = br;
    br = t;
  }
  // Intermediate hash value
  t    = (H[1] + cl + dr)|0;
  H[1] = (H[2] + dl + er)|0;
  H[2] = (H[3] + el + ar)|0;
  H[3] = (H[4] + al + br)|0;
  H[4] = (H[0] + bl + cr)|0;
  H[0] =  t;
};

function f1(x, y, z) {
  return ((x) ^ (y) ^ (z));
}

function f2(x, y, z) {
  return (((x)&(y)) | ((~x)&(z)));
}

function f3(x, y, z) {
  return (((x) | (~(y))) ^ (z));
}

function f4(x, y, z) {
  return (((x) & (z)) | ((y)&(~(z))));
}

function f5(x, y, z) {
  return ((x) ^ ((y) |(~(z))));
}

function rotl(x,n) {
  return (x<<n) | (x>>>(32-n));
}

function ripemd160(message) {
  var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

  if (typeof message == 'string')
    message = new Buffer(message, 'utf8');

  var m = bytesToWords(message);

  var nBitsLeft = message.length * 8;
  var nBitsTotal = message.length * 8;

  // Add padding
  m[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
  m[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
      (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
      (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
  );

  for (var i=0 ; i<m.length; i += 16) {
    processBlock(H, m, i);
  }

  // Swap endian
  for (var i = 0; i < 5; i++) {
      // Shortcut
    var H_i = H[i];

    // Swap
    H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
          (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
  }

  var digestbytes = wordsToBytes(H);
  return new Buffer(digestbytes);
}



}).call(this,require("buffer").Buffer)
},{"buffer":4}],13:[function(require,module,exports){
var u = require('./util')
var write = u.write
var fill = u.zeroFill

module.exports = function (Buffer) {

  //prototype class for hash functions
  function Hash (blockSize, finalSize) {
    this._block = new Buffer(blockSize) //new Uint32Array(blockSize/4)
    this._finalSize = finalSize
    this._blockSize = blockSize
    this._len = 0
    this._s = 0
  }

  Hash.prototype.init = function () {
    this._s = 0
    this._len = 0
  }

  function lengthOf(data, enc) {
    if(enc == null)     return data.byteLength || data.length
    if(enc == 'ascii' || enc == 'binary')  return data.length
    if(enc == 'hex')    return data.length/2
    if(enc == 'base64') return data.length/3
  }

  Hash.prototype.update = function (data, enc) {
    var bl = this._blockSize

    //I'd rather do this with a streaming encoder, like the opposite of
    //http://nodejs.org/api/string_decoder.html
    var length
      if(!enc && 'string' === typeof data)
        enc = 'utf8'

    if(enc) {
      if(enc === 'utf-8')
        enc = 'utf8'

      if(enc === 'base64' || enc === 'utf8')
        data = new Buffer(data, enc), enc = null

      length = lengthOf(data, enc)
    } else
      length = data.byteLength || data.length

    var l = this._len += length
    var s = this._s = (this._s || 0)
    var f = 0
    var buffer = this._block
    while(s < l) {
      var t = Math.min(length, f + bl - s%bl)
      write(buffer, data, enc, s%bl, f, t)
      var ch = (t - f);
      s += ch; f += ch

      if(!(s%bl))
        this._update(buffer)
    }
    this._s = s

    return this

  }

  Hash.prototype.digest = function (enc) {
    var bl = this._blockSize
    var fl = this._finalSize
    var len = this._len*8

    var x = this._block

    var bits = len % (bl*8)

    //add end marker, so that appending 0's creats a different hash.
    x[this._len % bl] = 0x80
    fill(this._block, this._len % bl + 1)

    if(bits >= fl*8) {
      this._update(this._block)
      u.zeroFill(this._block, 0)
    }

    //TODO: handle case where the bit length is > Math.pow(2, 29)
    x.writeInt32BE(len, fl + 4) //big endian

    var hash = this._update(this._block) || this._hash()
    if(enc == null) return hash
    return hash.toString(enc)
  }

  Hash.prototype._update = function () {
    throw new Error('_update must be implemented by subclass')
  }

  return Hash
}

},{"./util":17}],14:[function(require,module,exports){
var exports = module.exports = function (alg) {
  var Alg = exports[alg]
  if(!Alg) throw new Error(alg + ' is not supported (we accept pull requests)')
  return new Alg()
}

var Buffer = require('buffer').Buffer
var Hash   = require('./hash')(Buffer)

exports.sha =
exports.sha1 = require('./sha1')(Buffer, Hash)
exports.sha256 = require('./sha256')(Buffer, Hash)

},{"./hash":13,"./sha1":15,"./sha256":16,"buffer":4}],15:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */
module.exports = function (Buffer, Hash) {

  var inherits = require('util').inherits

  inherits(Sha1, Hash)

  var A = 0|0
  var B = 4|0
  var C = 8|0
  var D = 12|0
  var E = 16|0

  var BE = false
  var LE = true

  var W = new Int32Array(80)

  var POOL = []

  function Sha1 () {
    if(POOL.length)
      return POOL.pop().init()

    if(!(this instanceof Sha1)) return new Sha1()
    this._w = W
    Hash.call(this, 16*4, 14*4)
  
    this._h = null
    this.init()
  }

  Sha1.prototype.init = function () {
    this._a = 0x67452301
    this._b = 0xefcdab89
    this._c = 0x98badcfe
    this._d = 0x10325476
    this._e = 0xc3d2e1f0

    Hash.prototype.init.call(this)
    return this
  }

  Sha1.prototype._POOL = POOL

  // assume that array is a Uint32Array with length=16,
  // and that if it is the last block, it already has the length and the 1 bit appended.


  var isDV = new Buffer(1) instanceof DataView
  function readInt32BE (X, i) {
    return isDV
      ? X.getInt32(i, false)
      : X.readInt32BE(i)
  }

  Sha1.prototype._update = function (array) {

    var X = this._block
    var h = this._h
    var a, b, c, d, e, _a, _b, _c, _d, _e

    a = _a = this._a
    b = _b = this._b
    c = _c = this._c
    d = _d = this._d
    e = _e = this._e

    var w = this._w

    for(var j = 0; j < 80; j++) {
      var W = w[j]
        = j < 16
        //? X.getInt32(j*4, false)
        //? readInt32BE(X, j*4) //*/ X.readInt32BE(j*4) //*/
        ? X.readInt32BE(j*4)
        : rol(w[j - 3] ^ w[j -  8] ^ w[j - 14] ^ w[j - 16], 1)

      var t =
        add(
          add(rol(a, 5), sha1_ft(j, b, c, d)),
          add(add(e, W), sha1_kt(j))
        );

      e = d
      d = c
      c = rol(b, 30)
      b = a
      a = t
    }

    this._a = add(a, _a)
    this._b = add(b, _b)
    this._c = add(c, _c)
    this._d = add(d, _d)
    this._e = add(e, _e)
  }

  Sha1.prototype._hash = function () {
    if(POOL.length < 100) POOL.push(this)
    var H = new Buffer(20)
    //console.log(this._a|0, this._b|0, this._c|0, this._d|0, this._e|0)
    H.writeInt32BE(this._a|0, A)
    H.writeInt32BE(this._b|0, B)
    H.writeInt32BE(this._c|0, C)
    H.writeInt32BE(this._d|0, D)
    H.writeInt32BE(this._e|0, E)
    return H
  }

  /*
   * Perform the appropriate triplet combination function for the current
   * iteration
   */
  function sha1_ft(t, b, c, d) {
    if(t < 20) return (b & c) | ((~b) & d);
    if(t < 40) return b ^ c ^ d;
    if(t < 60) return (b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
  }

  /*
   * Determine the appropriate additive constant for the current iteration
   */
  function sha1_kt(t) {
    return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
           (t < 60) ? -1894007588 : -899497514;
  }

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   * //dominictarr: this is 10 years old, so maybe this can be dropped?)
   *
   */
  function add(x, y) {
    return (x + y ) | 0
  //lets see how this goes on testling.
  //  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  //  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  //  return (msw << 16) | (lsw & 0xFFFF);
  }

  /*
   * Bitwise rotate a 32-bit number to the left.
   */
  function rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  return Sha1
}

},{"util":50}],16:[function(require,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('util').inherits
var BE       = false
var LE       = true
var u        = require('./util')

module.exports = function (Buffer, Hash) {

  var K = [
      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
      0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
      0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
      0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
      0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
      0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
      0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
      0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
      0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
      0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
      0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
      0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
      0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
      0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
      0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
    ]

  inherits(Sha256, Hash)
  var W = new Array(64)
  var POOL = []
  function Sha256() {
    if(POOL.length) {
      //return POOL.shift().init()
    }
    //this._data = new Buffer(32)

    this.init()

    this._w = W //new Array(64)

    Hash.call(this, 16*4, 14*4)
  };

  Sha256.prototype.init = function () {

    this._a = 0x6a09e667|0
    this._b = 0xbb67ae85|0
    this._c = 0x3c6ef372|0
    this._d = 0xa54ff53a|0
    this._e = 0x510e527f|0
    this._f = 0x9b05688c|0
    this._g = 0x1f83d9ab|0
    this._h = 0x5be0cd19|0

    this._len = this._s = 0

    return this
  }

  var safe_add = function(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function S (X, n) {
    return (X >>> n) | (X << (32 - n));
  }

  function R (X, n) {
    return (X >>> n);
  }

  function Ch (x, y, z) {
    return ((x & y) ^ ((~x) & z));
  }

  function Maj (x, y, z) {
    return ((x & y) ^ (x & z) ^ (y & z));
  }

  function Sigma0256 (x) {
    return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
  }

  function Sigma1256 (x) {
    return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
  }

  function Gamma0256 (x) {
    return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
  }

  function Gamma1256 (x) {
    return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
  }

  Sha256.prototype._update = function(m) {
    var M = this._block
    var W = this._w
    var a, b, c, d, e, f, g, h
    var T1, T2

    a = this._a | 0
    b = this._b | 0
    c = this._c | 0
    d = this._d | 0
    e = this._e | 0
    f = this._f | 0
    g = this._g | 0
    h = this._h | 0

    for (var j = 0; j < 64; j++) {
      var w = W[j] = j < 16
        ? M.readInt32BE(j * 4)
        : Gamma1256(W[j - 2]) + W[j - 7] + Gamma0256(W[j - 15]) + W[j - 16]

      T1 = h + Sigma1256(e) + Ch(e, f, g) + K[j] + w

      T2 = Sigma0256(a) + Maj(a, b, c);
      h = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
    }

    this._a = (a + this._a) | 0
    this._b = (b + this._b) | 0
    this._c = (c + this._c) | 0
    this._d = (d + this._d) | 0
    this._e = (e + this._e) | 0
    this._f = (f + this._f) | 0
    this._g = (g + this._g) | 0
    this._h = (h + this._h) | 0

  };

  Sha256.prototype._hash = function () {
    if(POOL.length < 10)
      POOL.push(this)

    var H = new Buffer(32)

    H.writeInt32BE(this._a,  0)
    H.writeInt32BE(this._b,  4)
    H.writeInt32BE(this._c,  8)
    H.writeInt32BE(this._d, 12)
    H.writeInt32BE(this._e, 16)
    H.writeInt32BE(this._f, 20)
    H.writeInt32BE(this._g, 24)
    H.writeInt32BE(this._h, 28)

    return H
  }

  return Sha256

}

},{"./util":17,"util":50}],17:[function(require,module,exports){
exports.write = write
exports.zeroFill = zeroFill

exports.toString = toString

function write (buffer, string, enc, start, from, to, LE) {
  var l = (to - from)
  if(enc === 'ascii' || enc === 'binary') {
    for( var i = 0; i < l; i++) {
      buffer[start + i] = string.charCodeAt(i + from)
    }
  }
  else if(enc == null) {
    for( var i = 0; i < l; i++) {
      buffer[start + i] = string[i + from]
    }
  }
  else if(enc === 'hex') {
    for(var i = 0; i < l; i++) {
      var j = from + i
      buffer[start + i] = parseInt(string[j*2] + string[(j*2)+1], 16)
    }
  }
  else if(enc === 'base64') {
    throw new Error('base64 encoding not yet supported')
  }
  else
    throw new Error(enc +' encoding not yet supported')
}

//always fill to the end!
function zeroFill(buf, from) {
  for(var i = from; i < buf.length; i++)
    buf[i] = 0
}


},{}],18:[function(require,module,exports){
(function (Buffer){
// JavaScript PBKDF2 Implementation
// Based on http://git.io/qsv2zw
// Licensed under LGPL v3
// Copyright (c) 2013 jduncanator

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)

module.exports = function (createHmac, exports) {
  exports = exports || {}

  exports.pbkdf2 = function(password, salt, iterations, keylen, cb) {
    if('function' !== typeof cb)
      throw new Error('No callback provided to pbkdf2');
    setTimeout(function () {
      cb(null, exports.pbkdf2Sync(password, salt, iterations, keylen))
    })
  }

  exports.pbkdf2Sync = function(key, salt, iterations, keylen) {
    if('number' !== typeof iterations)
      throw new TypeError('Iterations not a number')
    if(iterations < 0)
      throw new TypeError('Bad iterations')
    if('number' !== typeof keylen)
      throw new TypeError('Key length not a number')
    if(keylen < 0)
      throw new TypeError('Bad key length')

    //stretch key to the correct length that hmac wants it,
    //otherwise this will happen every time hmac is called
    //twice per iteration.
    var key = !Buffer.isBuffer(key) ? new Buffer(key) : key

    if(key.length > blocksize) {
      key = createHash(alg).update(key).digest()
    } else if(key.length < blocksize) {
      key = Buffer.concat([key, zeroBuffer], blocksize)
    }

    var HMAC;
    var cplen, p = 0, i = 1, itmp = new Buffer(4), digtmp;
    var out = new Buffer(keylen);
    out.fill(0);
    while(keylen) {
      if(keylen > 20)
        cplen = 20;
      else
        cplen = keylen;

      /* We are unlikely to ever use more than 256 blocks (5120 bits!)
         * but just in case...
         */
        itmp[0] = (i >> 24) & 0xff;
        itmp[1] = (i >> 16) & 0xff;
          itmp[2] = (i >> 8) & 0xff;
          itmp[3] = i & 0xff;

          HMAC = createHmac('sha1', key);
          HMAC.update(salt)
          HMAC.update(itmp);
        digtmp = HMAC.digest();
        digtmp.copy(out, p, 0, cplen);

        for(var j = 1; j < iterations; j++) {
          HMAC = createHmac('sha1', key);
          HMAC.update(digtmp);
          digtmp = HMAC.digest();
          for(var k = 0; k < cplen; k++) {
            out[k] ^= digtmp[k];
          }
        }
      keylen -= cplen;
      i++;
      p += cplen;
    }

    return out;
  }

  return exports
}

}).call(this,require("buffer").Buffer)
},{"buffer":4}],19:[function(require,module,exports){
(function (Buffer){
(function() {
  module.exports = function(size) {
    var bytes = new Buffer(size); //in browserify, this is an extended Uint8Array
    /* This will not work in older browsers.
     * See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
     */
    crypto.getRandomValues(bytes);
    return bytes;
  }
}())

}).call(this,require("buffer").Buffer)
},{"buffer":4}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],21:[function(require,module,exports){
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');
var url = require('url')

http.request = function (params, cb) {
    if (typeof params === 'string') {
        params = url.parse(params)
    }
    if (!params) params = {};
    if (!params.host && !params.port) {
        params.port = parseInt(window.location.port, 10);
    }
    if (!params.host && params.hostname) {
        params.host = params.hostname;
    }
    
    if (!params.scheme) params.scheme = window.location.protocol.split(':')[0];
    if (!params.host) {
        params.host = window.location.hostname || window.location.host;
    }
    if (/:/.test(params.host)) {
        if (!params.port) {
            params.port = params.host.split(':')[1];
        }
        params.host = params.host.split(':')[0];
    }
    if (!params.port) params.port = params.scheme == 'https' ? 443 : 80;
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();

http.STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',               // RFC 4918
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Moved Temporarily',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Time-out',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Requested Range Not Satisfiable',
    417 : 'Expectation Failed',
    418 : 'I\'m a teapot',              // RFC 2324
    422 : 'Unprocessable Entity',       // RFC 4918
    423 : 'Locked',                     // RFC 4918
    424 : 'Failed Dependency',          // RFC 4918
    425 : 'Unordered Collection',       // RFC 4918
    426 : 'Upgrade Required',           // RFC 2817
    428 : 'Precondition Required',      // RFC 6585
    429 : 'Too Many Requests',          // RFC 6585
    431 : 'Request Header Fields Too Large',// RFC 6585
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Time-out',
    505 : 'HTTP Version Not Supported',
    506 : 'Variant Also Negotiates',    // RFC 2295
    507 : 'Insufficient Storage',       // RFC 4918
    509 : 'Bandwidth Limit Exceeded',
    510 : 'Not Extended',               // RFC 2774
    511 : 'Network Authentication Required' // RFC 6585
};
},{"./lib/request":22,"events":20,"url":48}],22:[function(require,module,exports){
var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.writable = true;
    self.xhr = xhr;
    self.body = [];
    
    self.uri = (params.scheme || 'http') + '://'
        + params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    if (typeof params.withCredentials === 'undefined') {
        params.withCredentials = true;
    }

    try { xhr.withCredentials = params.withCredentials }
    catch (e) {}
    
    if (params.responseType) try { xhr.responseType = params.responseType }
    catch (e) {}
    
    xhr.open(
        params.method || 'GET',
        self.uri,
        true
    );

    xhr.onerror = function(event) {
        self.emit('error', new Error('Network error'));
    };

    self._headers = {};
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!self.isSafeRequestHeader(key)) continue;
            var value = params.headers[key];
            self.setHeader(key, value);
        }
    }
    
    if (params.auth) {
        //basic auth
        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
    }

    var res = new Response;
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });

    res.on('error', function (err) {
        self.emit('error', err);
    });
    
    xhr.onreadystatechange = function () {
        // Fix for IE9 bug
        // SCRIPT575: Could not complete the operation due to error c00c023f
        // It happens when a request is aborted, calling the success callback anyway with readyState === 4
        if (xhr.__aborted) return;
        res.handle(xhr);
    };
};

inherits(Request, Stream);

Request.prototype.setHeader = function (key, value) {
    this._headers[key.toLowerCase()] = value
};

Request.prototype.getHeader = function (key) {
    return this._headers[key.toLowerCase()]
};

Request.prototype.removeHeader = function (key) {
    delete this._headers[key.toLowerCase()]
};

Request.prototype.write = function (s) {
    this.body.push(s);
};

Request.prototype.destroy = function (s) {
    this.xhr.__aborted = true;
    this.xhr.abort();
    this.emit('close');
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.push(s);

    var keys = objectKeys(this._headers);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = this._headers[key];
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                this.xhr.setRequestHeader(key, value[j]);
            }
        }
        else this.xhr.setRequestHeader(key, value)
    }

    if (this.body.length === 0) {
        this.xhr.send('');
    }
    else if (typeof this.body[0] === 'string') {
        this.xhr.send(this.body.join(''));
    }
    else if (isArray(this.body[0])) {
        var body = [];
        for (var i = 0; i < this.body.length; i++) {
            body.push.apply(body, this.body[i]);
        }
        this.xhr.send(body);
    }
    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
        var len = 0;
        for (var i = 0; i < this.body.length; i++) {
            len += this.body[i].length;
        }
        var body = new(this.body[0].constructor)(len);
        var k = 0;
        
        for (var i = 0; i < this.body.length; i++) {
            var b = this.body[i];
            for (var j = 0; j < b.length; j++) {
                body[k++] = b[j];
            }
        }
        this.xhr.send(body);
    }
    else {
        var body = '';
        for (var i = 0; i < this.body.length; i++) {
            body += this.body[i].toString();
        }
        this.xhr.send(body);
    }
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};

},{"./response":23,"Base64":24,"inherits":25,"stream":45}],23:[function(require,module,exports){
var Stream = require('stream');
var util = require('util');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

util.inherits(Response, Stream);

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
            
                if (isArray(headers[key])) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = String(xhr.responseType).toLowerCase();
    if (respType === 'blob') return xhr.responseBlob || xhr.response;
    if (respType === 'arraybuffer') return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this._emitData(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this._emitData(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
        
        this.emit('close');
    }
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{"stream":45,"util":50}],24:[function(require,module,exports){
;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}],25:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],26:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],27:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}],28:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],29:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],30:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],31:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],32:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":30,"./encode":31}],33:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":34}],34:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":36,"./_stream_writable":38,"_process":28,"core-util-is":39,"inherits":25}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":37,"core-util-is":39,"inherits":25}],36:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"_process":28,"buffer":4,"core-util-is":39,"events":20,"inherits":25,"isarray":26,"stream":45,"string_decoder/":40}],37:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":34,"core-util-is":39,"inherits":25}],38:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":34,"_process":28,"buffer":4,"core-util-is":39,"inherits":25,"stream":45}],39:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":4}],40:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  this.charBuffer = new Buffer(6);
  this.charReceived = 0;
  this.charLength = 0;
};


StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  var offset = 0;

  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var i = (buffer.length >= this.charLength - this.charReceived) ?
                this.charLength - this.charReceived :
                buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, offset, i);
    this.charReceived += (i - offset);
    offset = i;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (i == buffer.length) return charStr;

    // otherwise cut off the characters end from the beginning of this buffer
    buffer = buffer.slice(i, buffer.length);
    break;
  }

  var lenIncomplete = this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - lenIncomplete, end);
    this.charReceived = lenIncomplete;
    end -= lenIncomplete;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    this.charBuffer.write(charStr.charAt(charStr.length - 1), this.encoding);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }

  return i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 2;
  this.charLength = incomplete ? 2 : 0;
  return incomplete;
}

function base64DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 3;
  this.charLength = incomplete ? 3 : 0;
  return incomplete;
}

},{"buffer":4}],41:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":35}],42:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":34,"./lib/_stream_passthrough.js":35,"./lib/_stream_readable.js":36,"./lib/_stream_transform.js":37,"./lib/_stream_writable.js":38}],43:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":37}],44:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":38}],45:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":20,"inherits":25,"readable-stream/duplex.js":33,"readable-stream/passthrough.js":41,"readable-stream/readable.js":42,"readable-stream/transform.js":43,"readable-stream/writable.js":44}],46:[function(require,module,exports){
// DOM APIs, for completeness

if (typeof setTimeout !== 'undefined') exports.setTimeout = function() { return setTimeout.apply(window, arguments); };
if (typeof clearTimeout !== 'undefined') exports.clearTimeout = function() { clearTimeout.apply(window, arguments); };
if (typeof setInterval !== 'undefined') exports.setInterval = function() { return setInterval.apply(window, arguments); };
if (typeof clearInterval !== 'undefined') exports.clearInterval = function() { clearInterval.apply(window, arguments); };

// TODO: Change to more effiecient list approach used in Node.js
// For now, we just implement the APIs using the primitives above.

exports.enroll = function(item, delay) {
  item._timeoutID = setTimeout(item._onTimeout, delay);
};

exports.unenroll = function(item) {
  clearTimeout(item._timeoutID);
};

exports.active = function(item) {
  // our naive impl doesn't care (correctness is still preserved)
};

exports.setImmediate = require('process/browser.js').nextTick;

},{"process/browser.js":47}],47:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],48:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":29,"querystring":32}],49:[function(require,module,exports){
module.exports=require(2)
},{}],50:[function(require,module,exports){
module.exports=require(3)
},{"./support/isBuffer":49,"_process":28,"inherits":25}],51:[function(require,module,exports){
var net = require('net');
var tls = require('tls');

var proto = exports.protocol = {
    client : require('./lib/client/proto'),
    server : require('./lib/server/proto'),
};

exports.createServer = function (opts, cb) {
    if (typeof opts === 'string') {
        opts = { domain: opts };
    }
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};;
    }
    
    return net.createServer(function (stream) {
        var req = proto.client(opts, stream);
        req.on('error', function () {});
        stream.on('error', function (err) {});
        
        req.on('_tlsNext', function (write) {
            //return write(503, 'Bad sequence: already using TLS.');
            
            var tserver = tls.createServer(opts);
            tserver.listen(0, '127.0.0.1', function () {
                var s = net.connect(tserver.address().port, '127.0.0.1');
                s.on('error', function (err) { stream.end() });
                s.pipe(stream).pipe(s);
                write(220, 'Ready to start TLS.');
            });
            
            var index = 0;
            tserver.on('secureConnection', function (sec) {
                if (index ++ > 0) return sec.end();
                req._swapStream(sec);
                req.emit('tls', sec);
            });
            stream.on('close', function () {
                tserver.close();
            });
        });
        cb(req);
    });
};

exports.connect = function () {
    var args = [].slice.call(arguments).reduce(function (acc, arg) {
        acc[typeof arg] = arg;
        return acc;
    }, {});

    var stream;
    var cb = args.function;
    var options = args.object || {};
    
    var tlsOpts = options.tls;
    options.port = args.number || 25;
    options.host = args.string || 'localhost';
    
    if (args.string && args.string.match(/^[.\/]/)) {
        // unix socket
        stream = net.createConnection(args.string);
    }
    else if (tlsOpts) {
        stream = tls.connect(options.port, options.host, tlsOpts, function () {
            var pending = stream.listeners('secure').length;
            var allOk = true;
            if (pending === 0 && !stream.authorized
            && tlsOpts.rejectUnauthorized !== false) {
                allOk = false;
            }
            if (pending === 0) return done()
            
            var ack = {
                accept : function (ok) {
                    allOk = allOk && (ok !== false);
                    if (--pending === 0) done();
                },
                reject : function () {
                    allOk = false;
                    if (--pending === 0) done();
                }
            };
            stream.emit('secure', ack);
            
            function done () {
                if (!allOk) {
                    stream.end();
                    stream.emit('error', new Error(stream.authorizationError));
                }
                else cb(proto.server(stream));
            }
        });
    }
    else if (options.stream) {
        cb(proto.server(options.stream));
    }
    else {
        stream = net.connect(options);
        stream.on('connect', function () {
            cb(proto.server(stream));
        });
    }
    
    return stream;
};

},{"./lib/client/proto":53,"./lib/server/proto":57,"net":65,"tls":63}],52:[function(require,module,exports){
module.exports = function (stream) {
    return new ClientParser(stream);
};

function ClientParser (stream) {
    var self = this;
    self.stream = stream;
    self.lines = [];
    self.queue = [];
    
    self.parseData(function (line) {
        if (self.queue.length) {
            self.queue.shift()(line);
        }
        else {
            self.lines.push(line);
        }
    });
}

ClientParser.prototype = require('../parse_data');

ClientParser.prototype.getLine = function (cb) {
    this.queue.push(cb);
};

ClientParser.prototype.getUntil = function getUntil (terminal, target) {
    var self = this;
    self.getLine(function getLine (line) {
        if (line === terminal) target.end()
        else {
            target.write(line + '\r\n');
            self.getLine(getLine);
        }
    });
};

ClientParser.prototype.getCommand = function (cb) {
    this.getLine(function (line) {
        var m = line.match(/^(\S+)(?:\s+(.*))?$/);
        if (!m) cb('syntax error')
        else {
            var cmd = parse(m[1].toLowerCase(), m[2]);
            if (cmd instanceof Error) cb(cmd)
            else cb(null, cmd)
        }
    });
};

function parse (cmd, data) {
    var res = { name : cmd, data : data };
    
    switch (cmd) {
        case 'helo' :
        case 'ehlo' :
        case 'lhlo' :
            res.name = 'greeting';
            res.greeting = cmd;
            res.hostname = data;
            break;
        
        case 'mail' :
            if (!data) return error(501, 'incomplete mail command');
            
            var m = data.match(/^from\s*:\s*(\S+)(?:\s+(.*))?/i);
            if (!m) return error(501, 'parse error in mail command');
            res.from = m[1].replace(/^</, '').replace(/>$/, '');
            res.ext = m[2];
            
            break;
        
        case 'rcpt' :
            if (!data) return error(501, 'incomplete rcpt command');
            
            var m = data.match(/^to\s*:\s*(\S+)(?:\s+(.*))?/i);
            if (!m) return error(501, 'parse error in rcpt command');
            res.to = m[1].replace(/^</, '').replace(/>$/, '');
            res.ext = m[2];
            
            break;
        
        case 'quit' :
        case 'data' :
            break;
        
        case 'rset' :
        case 'send' :
        case 'soml' :
        case 'saml' :
        case 'vrfy' :
        case 'expn' :
        case 'help' :
        case 'noop' :
        case 'turn' :
        case 'starttls' :
            break;
        
        default :
            res.recognized = false;
            break;
    }
    return res;
}

function error (code, msg) {
    var err = new Error(msg);
    err.code = code;
    return err;
}

},{"../parse_data":55}],53:[function(require,module,exports){
var parser = require('./parser.js');
var writer = require('../write.js');
var through = require('through');
var os = require('os');
var EventEmitter = require('events').EventEmitter;
var undot = require('../dot.js').undot;

module.exports = function (opts, stream) {
    if (stream === undefined) {
        stream = opts;
        opts = {};
    }
    
    var p = parser(stream);
    var write = writer(stream);
    write(220, opts.domain || os.hostname());
    
    function createAck (cb, okCode, raw) {
        return {
            accept : function (code, msg) {
                write(code, msg, okCode || 250);
                if (cb) cb();
                if (!raw) next();
            },
            reject : function (code, msg) {
                write(code, msg, 500);
                next();
            }
        };
    }
    
    function emit (name, x) {
        var fn = arguments[arguments.length - 1];
        var ack = arguments[arguments.length - 1] = createAck(fn);
        if (req.listeners(name).length === 0) {
            if (name === 'greeting' && x.greeting === 'ehlo') {
                ack.accept(250, [ x.hostname || remoteIp, 'STARTTLS' ]);
            }
            else if (name === 'greeting') {
                ack.accept(250, x.hostname);
            }
            else ack.accept();
        }
        req.emit.apply(req, arguments);
    }
    
    var req = new EventEmitter;
    req._swapStream = function (s) {
        write = writer(s);
        p = parser(s);
        stream = s;
        s.on('error', req.emit.bind(req, 'error'));
        next();
    };
    
    stream.on('error', req.emit.bind(req, 'error'));
    req.socket = stream;
    var remoteIp = stream.remoteAddress || 'unknown';
    
    var next = (function next () {
        p.getCommand(function (err, cmd) {
            if (err) {
                if (err.code) write(err.code, err.message || err.toString())
                else write(501, err.message || err.toString())
                return next();
            }
            var prevented = false;
            req.emit('command', cmd, {
                preventDefault: function () { prevented = true },
                write: write,
                next: next
            });
            if (prevented) return;
            
            if (cmd.name === 'quit') {
                write(221, 'Bye!');
                req.emit('quit');
                stream.end();
            }
            else if (cmd.name === 'rset') {
                write(250);
                req.to = undefined;
                req.from = undefined;
                req.emit('rset');
                next();
            }
            else if (!req.greeting) {
                if (cmd.name === 'greeting') {
                    emit('greeting', cmd, function () {
                        req.greeting = cmd.greeting;
                        req.hostname = cmd.hostname;
                    });
                }
                else {
                    write(503, 'Bad sequence: HELO, EHLO, or LHLO expected.');
                    next();
                }
            }
            else if (cmd.name === 'mail') {
                emit('from', cmd.from, function () {
                    req.fromExt = cmd.ext;
                    req.from = cmd.from;
                });
            }
            else if (cmd.name === 'rcpt') {
                emit('to', cmd.to, function () {
                    if (req.toExt == undefined) {
                        req.toExt = [];
                    }
                    req.toExt.push(cmd.ext);
                    if (req.to == undefined) {
                        req.to = [];
                    }
                    req.to.push(cmd.to);

                });
            }
            else if (cmd.name === 'data') {
                if (!req.from) {
                    write(503, 'Bad sequence: MAIL expected');
                    next();
                }
                else if (!req.to) {
                    write(503, 'Bad sequence: RCPT expected');
                    next();
                }
                else {
                    var target = makeTarget(write, next, emit);
                    var messageAck = createAck(function () {
                        p.getUntil('.', undot(target));
                    }, 354, true);
                    req.emit('message', target, messageAck);
                }
            }
            else if (cmd.name === 'starttls' && opts.key) {
                req.emit('_tlsNext', write);
            }
            else if (cmd.name === 'starttls') {
                write(502, 'TLS not configured.');
                next();
            }
            else if (cmd.recognized === false) {
                write(500, 'Unrecognized command.');
                next();
            }
            else {
                write(502, 'Not implemented.');
                next();
            }
        });
        
        return next;
    })();
    
    return req;
};

function makeTarget (write, next, emit) {
    var target = through(write, end);
    target.aborted = false;
    
    target.abort = function (code, msg) {
        if (!msg && typeof code !== 'number') {
            msg = code;
            code = undefined;
        }
        if (code === undefined) code = 554
        
        target.readable = false;
        target.emit('abort', code, msg);
    };
    
    return target;
    
    function write (buf) {
        if (!this.aborted) this.queue(buf);
    }
    
    function end () {
        this.queue(null);
        
        if (this.aborted) {
            write(target.aborted.code, target.aborted.message);
            next();
        }
        else emit('received', function () {});
    }
}

},{"../dot.js":54,"../write.js":58,"./parser.js":52,"events":20,"os":27,"through":62}],54:[function(require,module,exports){
var through = require('through');
var combine = require('stream-combiner');

exports.dot = function (source) {
    var first = true;
    var dot = through(function (buf) {
        var data = buf.toString();
        var s = first
            ? data.replace(/(^|\n)\./g, '$1..')
            : data.replace(/\n\./g, '\n..')
        ;
        first = data.charCodeAt(data.length - 1) === 10;
        this.queue(s);
    });
    source.pipe(dot);
    return dot;
};

exports.undot = function (target) {
    var first = true;
    var dot = through(function (data) {
        var s = first
            ? data.replace(/(^|\n)\.\./g, '$1.')
            : data.replace(/\n\.\./g, '\n.')
        ;
        first = data.charCodeAt(data.length - 1) === 10;
        this.queue(s);
    });
    return combine(dot, target);
};

},{"stream-combiner":60,"through":62}],55:[function(require,module,exports){
exports.parseData = function (cb) {
    var self = this;
    var line = '';
    
    self.stream.on('data', function ondata (buf, offset) {
        if (offset === undefined) offset = 0;
        
        if (self.bytes) {
            var ix = Math.min(buf.length, offset + self.bytes);
            var chunk = buf.slice(offset, ix);
            self.target.write(chunk);
            
            self.bytes -= chunk.length;
            if (self.bytes === 0) {
                if (buf.length > offset + chunk.length) {
                    ondata(buf, offset + chunk.length);
                }
                self.target.end();
            }
        }
        else {
            for (var i = offset; i < buf.length; i++) {
                if (buf[i] === 10) {
                    cb(line.replace(/\r$/, ''));
                    line = '';
                    if (buf.length > i + 1) ondata(buf, i + 1);
                    break;
                }
                else line += String.fromCharCode(buf[i])
            }
        }
    });
}

exports.getBytes = function (n, target) {
    this.bytes = n;
    this.target = target;
};

},{}],56:[function(require,module,exports){
module.exports = function (stream, cb) {
    return new ServerParser(stream, cb);
};

function ServerParser (stream, cb) {
    this.stream = stream;
    this.bytes = 0;
    this.target = null;
    
    this.parseLines(cb);
}

ServerParser.prototype = require('../parse_data');

ServerParser.prototype.getBytes = function (n, target) {
    this.bytes = n;
    this.target = target;
};

ServerParser.prototype.parseLines = function (cb) {
    var self = this;
    var continuation = null;
    
    self.parseData(function (line) {
        var m = line.match(/^(\d+)(?:([- ])(.+))?$/);
        var code = m && parseInt(m[1], 10);
        
        if (!m) {
            cb(new Error('syntax error parsing: ' + line));
        }
        else if (continuation) {
            if (code !== continuation.code) {
                cb(new Error('inconsistent code in line continuation'));
            }
            else {
                continuation.lines.push(m[3]);
                if (m[2] !== '-') {
                    cb(null, continuation.code, continuation.lines);
                    continuation = null;
                }
            }
        }
        else if (m[2] === '-') {
            continuation = { code : code, lines : [ m[3] ] };
        }
        else if (m[3] === undefined) {
            cb(null, code, []);
        }
        else cb(null, code, [ m[3] ]);
    });
}

},{"../parse_data":55}],57:[function(require,module,exports){
(function (Buffer){
var parser = require('./parser');
var EventEmitter = require('events').EventEmitter;
var dot = require('../dot.js').dot;
var crypto = require('crypto');
var util = require('util');
var through = require('through');
var copy = require('shallow-copy');
var tls = require('tls');

module.exports = function (stream) {
    return new Client(stream);
};

function Client (stream) {
    EventEmitter.call(this);
    var self = this;
    self.stream = stream;
    self.queue = [
        function (err, code, lines) {
            if (err) self.emit('error', err);
            else {
                self.greeting = [code, lines];
                self.emit('greeting', code, lines)
            }
        }
    ];
    self._writeQueue = [];
    
    parser(stream, function (err, code, lines) {
        if (!self.queue.length) return;
        
        var cb = self.queue.shift();
        if (cb) cb(err, code, lines);
        
        self._nextWrite();
    });
    
    self.on('newListener', function(event, listener) {

        if (event === 'greeting' && this.greeting) {
            listener(this.greeting[0], this.greeting[1])
        }

    });

    return self;
}

util.inherits(Client, EventEmitter);

Client.prototype._nextWrite = function next () {
    var self = this;
    
    if (!self._writeQueue.length) return;
    var r = self._writeQueue.shift();
    var msg = r[0];
    if (msg && typeof msg === 'object'
    && typeof msg.pipe === 'function') {
        msg.on('data', function () {});
        msg.on('end', next);
        msg.pipe(self.stream, { end: false });
        msg.resume();
    }
    else {
        self.stream.write(msg);
        if (r[1]) next();
    }
};

Client.prototype._write = function (msg, cb) {
    this._writeQueue.push([ msg, !cb ]);
    if (cb) this.queue.push(cb);
    this._nextWrite();
};

Client.prototype.login = function (username, password, type, cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    var supportedTypes =  ['PLAIN','LOGIN','CRAM-MD5'];
    type = (type) ? type.toUpperCase() : 'PLAIN';
    if(supportedTypes.indexOf(type) < 0){
        cb('Unsupported login type', 451);
    }
    switch(type){
        case 'PLAIN':
            var buf = new Buffer(username + "\0" + username + "\0" + password);
            self._write("AUTH PLAIN " + buf.toString("base64") + "\r\n", cb);
            break;
        case "LOGIN":
		case "CRAM-MD5":
            self.authtype = type;
            self.username = username;
            self.password = password;
            self._write("AUTH " + type + "\r\n", function(err,code,lines){
                if(err){
                    cb(err,code,lines);
                    return true;
                }
                if(code != 334){
                    cb(type+' Auth Failed',code,lines);
                    return true;
                }
                switch (self.authtype) {
                    case "LOGIN":
                        var buf = new Buffer(self.username);
                        self._write(buf.toString("base64") + "\r\n");
                        self.queue.push(function(erro,code,lines){
                            if(erro){
                                cb(erro,code,lines);
                                return true;
                            }
                            if(code != 334){
                                cb('LOGIN Auth Failed at username',code,lines);
                                return true;
                            }
                            var buf = new Buffer(self.password);
                            self._write(buf.toString("base64") + "\r\n", cb);
                        });
                        break;
                    case "CRAM-MD5":
                        var hmac = crypto.createHmac('md5', self.password);
                        msg = (new Buffer(msg, "base64")).toString("ascii");
                        hmac.update(msg);
                        self._write(
                            (new Buffer(self.username + " "
                            + hmac.digest("hex")).toString("base64")) + "\r\n",
                            cb
                        );
                        break;
                }
            });
    }
};

Client.prototype.helo = function (hostname, cb) {
    var self = this;
    
    if (typeof hostname === 'function') {
        cb = hostname;
        hostname = undefined;
    }
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    this._write(
        'HELO'
        + (hostname !== undefined ? ' ' + hostname : '')
        + '\r\n',
        cb
    );
    this.hostname = hostname;
};

Client.prototype.ehlo = function (hostname, cb) {
    var self = this;
    
    if (typeof hostname === 'function') {
        cb = hostname;
        hostname = undefined;
    }
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    this.hostname = hostname;
    this._write(
        'EHLO'
        + (hostname !== undefined ? ' ' + hostname : '')
        + '\r\n',
        cb
    );
};

Client.prototype.startTLS = function (opts, cb) {
    var self = this;
    
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    opts = copy(opts || {});
    
    if (!opts.servername) {
        opts.servername = opts.hostname || self.hostname;
    }
    opts.socket = self.stream;
    
    this._write('STARTTLS\r\n', function (err) {
        if (err) return self.emit('error', err);
        if (cb) cb.apply(this, arguments);
        
        self.stream = tls.connect(opts, function (err) {
            if (err) self.emit('error', err)
            else self.emit('tls')
        });
        self.stream.on('error', function (err) {
            self.emit('error', err);
        });
    });
};

Client.prototype.verify = function (username, cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    this._write('VRFY ' + username + '\r\n', cb);
};

Client.prototype.to = function (addr, ext, cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    if (typeof ext === 'function') {
        cb = ext;
        ext = undefined;
    }
    this._write(
        'RCPT TO: <' + addr + '>'
        + (ext ? ' ' + ext : '')
        + '\r\n',
        cb
    );
};

Client.prototype.from = function (addr, ext, cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    if (typeof ext === 'function') {
        cb = ext;
        ext = undefined;
    }
    this._write(
        'MAIL FROM: <' + addr + '>'
        + (ext ? ' ' + ext : '')
        + '\r\n',
        cb
    );
};

Client.prototype.data = function (cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    
    this._write('DATA\r\n', cb);
};

Client.prototype.message = function (source, cb) {
    var self = this;
    if (!cb) cb = function (err) {
        if (err) self.emit('error', err)
    };
    
    var newline = true;
    
    if (!source || typeof source === 'function') {
        cb = source;
        source = through();
    }
    var tr = through(null, end);
    tr.pause();
    
    self._write(dot(source).pipe(tr), cb);
    
    return source;
    
    function end () {
        this.queue('\r\n.\r\n');
    }
};

Client.prototype.quit = function (cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    this._write('QUIT\r\n', cb);
};

Client.prototype.reset = function (cb) {
    var self = this;
    if (!cb) cb = function (err) { if (err) self.emit('error', err) };
    this._write('RSET\r\n', cb);
};

}).call(this,require("buffer").Buffer)
},{"../dot.js":54,"./parser":56,"buffer":4,"crypto":10,"events":20,"shallow-copy":59,"through":62,"tls":63,"util":50}],58:[function(require,module,exports){
module.exports = function (stream) {
    return function (code, lines, defaultCode) {
        if (typeof code === 'string' && code.match(/^\d+$/)) {
            code = parseInt(code, 10);
        }
        else if (typeof code !== 'number' && !lines) {
            lines = code;
            code = undefined;
        }
        if (code === undefined) code = defaultCode;
        
        if (lines === undefined) lines = [];
        if (lines.length === 0) lines = [ '' ];
        
        if (typeof lines === 'string') lines = [ lines ];
        lines = lines.reduce(function (acc, line) {
            return acc.concat(line.split(/\r?\n/));
        }, []);
        
        lines.forEach(function (line, i) {
            var blank = line.length === 0 ? '' : ' ';
            stream.write(
                code
                + (i === lines.length - 1 ? blank : '-')
                + line
                + '\r\n'
            );
        });
    };
};

},{}],59:[function(require,module,exports){
module.exports = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    var copy;
    
    if (isArray(obj)) {
        var len = obj.length;
        copy = Array(len);
        for (var i = 0; i < len; i++) {
            copy[i] = obj[i];
        }
    }
    else {
        var keys = objectKeys(obj);
        copy = {};
        
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            copy[key] = obj[key];
        }
    }
    return copy;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) {
        if ({}.hasOwnProperty.call(obj, key)) keys.push(key);
    }
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return {}.toString.call(xs) === '[object Array]';
};

},{}],60:[function(require,module,exports){
var duplexer = require('duplexer')

module.exports = function () {

  var streams = [].slice.call(arguments)
    , first = streams[0]
    , last = streams[streams.length - 1]
    , thepipe = duplexer(first, last)

  if(streams.length == 1)
    return streams[0]
  else if (!streams.length)
    throw new Error('connect called with empty args')

  //pipe all the streams together

  function recurse (streams) {
    if(streams.length < 2)
      return
    streams[0].pipe(streams[1])
    recurse(streams.slice(1))  
  }
  
  recurse(streams)
 
  function onerror () {
    var args = [].slice.call(arguments)
    args.unshift('error')
    thepipe.emit.apply(thepipe, args)
  }
  
  //es.duplex already reemits the error from the first and last stream.
  //add a listener for the inner streams in the pipeline.
  for(var i = 1; i < streams.length - 1; i ++)
    streams[i].on('error', onerror)

  return thepipe
}


},{"duplexer":61}],61:[function(require,module,exports){
var Stream = require("stream")
var writeMethods = ["write", "end", "destroy"]
var readMethods = ["resume", "pause"]
var readEvents = ["data", "close"]
var slice = Array.prototype.slice

module.exports = duplex

function forEach (arr, fn) {
    if (arr.forEach) {
        return arr.forEach(fn)
    }

    for (var i = 0; i < arr.length; i++) {
        fn(arr[i], i)
    }
}

function duplex(writer, reader) {
    var stream = new Stream()
    var ended = false

    forEach(writeMethods, proxyWriter)

    forEach(readMethods, proxyReader)

    forEach(readEvents, proxyStream)

    reader.on("end", handleEnd)

    writer.on("drain", function() {
      stream.emit("drain")
    })

    writer.on("error", reemit)
    reader.on("error", reemit)

    stream.writable = writer.writable
    stream.readable = reader.readable

    return stream

    function proxyWriter(methodName) {
        stream[methodName] = method

        function method() {
            return writer[methodName].apply(writer, arguments)
        }
    }

    function proxyReader(methodName) {
        stream[methodName] = method

        function method() {
            stream.emit(methodName)
            var func = reader[methodName]
            if (func) {
                return func.apply(reader, arguments)
            }
            reader.emit(methodName)
        }
    }

    function proxyStream(methodName) {
        reader.on(methodName, reemit)

        function reemit() {
            var args = slice.call(arguments)
            args.unshift(methodName)
            stream.emit.apply(stream, args)
        }
    }

    function handleEnd() {
        if (ended) {
            return
        }
        ended = true
        var args = slice.call(arguments)
        args.unshift("end")
        stream.emit.apply(stream, args)
    }

    function reemit(err) {
        stream.emit("error", err)
    }
}

},{"stream":45}],62:[function(require,module,exports){
(function (process){
var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data == null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


}).call(this,require('_process'))
},{"_process":28,"stream":45}],63:[function(require,module,exports){
(function (process,Buffer){
var net = require('net');
var util = require('util');
var assert = require('assert');
var Stream = require('stream');
var forge = require('node-forge').forge; // TODO: this is not working in Node

function TLSSocket(socket, options) {
	if (!(this instanceof TLSSocket)) return new TLSSocket(socket, options);

	var self = this;

	// Disallow wrapping TLSSocket in TLSSocket
	assert(!(socket instanceof TLSSocket));

	net.Socket.call(this);

	this._tlsOptions = options;
	this._secureEstablished = false;

	// Just a documented property to make secure sockets
	// distinguishable from regular ones.
	this.encrypted = true;

	if (!socket) { // connect() will be called later
		this.once('connect', function() {
			self._init(null);
		});
	} else {
		this._connecting = socket._connecting;

		this._socket = socket;
		this._init(socket);
	}

	// Make sure to setup all required properties like: `_connecting` before
	// starting the flow of the data
	this.readable = true;
	this.writable = true;
	this.read(0);
}
util.inherits(TLSSocket, net.Socket);

exports.TLSSocket = TLSSocket;

TLSSocket.prototype._init = function(socket) {
	var self = this;
	var options = this._tlsOptions;

	this.ssl = forge.tls.createConnection({
		server: false,
		verify: function(connection, verified, depth, certs) {
			if (!options.rejectUnauthorized || !options.servername) {
				console.log('[tls] server certificate verification skipped');
				return true;
			}

			console.log('[tls] skipping certificate trust verification');
			verified = true;

			if (depth === 0) {
				var cn = certs[0].subject.getField('CN').value;
				if (cn !== options.servername) {
					verified = {
						alert: forge.tls.Alert.Description.bad_certificate,
						message: 'Certificate common name does not match hostname.'
					};
					console.warn('[tls] '+cn+' !== '+options.servername);
				}
				console.log('[tls] server certificate verified');
			}

			return verified;
		},
		connected: function(connection) {
			console.log('[tls] connected', self);
			// prepare some data to send (note that the string is interpreted as
			// 'binary' encoded, which works for HTTP which only uses ASCII, use
			// forge.util.encodeUtf8(str) otherwise
			//client.prepare('GET / HTTP/1.0\r\n\r\n');

			self._secureEstablished = true;
			self.emit('secure');
		},
		tlsDataReady: function(connection) {
			// encrypted data is ready to be sent to the server
			var data = connection.tlsData.getBytes();
			//console.log('[tls] sending encrypted: ', data, data.length);
			//self._socket.write(data, 'binary'); // encoding should be 'binary'
			net.Socket.prototype.write.call(self._socket, data, 'binary'); // encoding should be 'binary'
		},
		dataReady: function(connection) {
			// clear data from the server is ready
			var data = connection.data.getBytes(),
				buffer = new Buffer(data);

			console.log('[tls] received: ', data);
			self.push(buffer);
		},
		closed: function() {
			console.log('[tls] disconnected');
			self.end();
		},
		error: function(connection, error) {
			console.log('[tls] error', error);
			error.toString = function () {
				return 'TLS error: '+error.message;
			};
			self.emit('error', error);
		}
	});

	this._socket.push = function (data) {
		self.ssl.process(data.toString('binary')); // encoding should be 'binary'
	};

	// Socket already has some buffered data - emulate receiving it
	if (socket && socket._readableState.length) {
		var buf;
		while ((buf = socket.read()) !== null) {
			this.ssl.process(buf); // Do we need this?
		}
	}

	console.log('[tls] init');

	// Start handshaking if connected
	if (this._socket.readyState != 'open') {
		this._socket.once('connect', function () {
			self.emit('connect');
			self._start();
		});
	} else {
		this._start();
	}
};

TLSSocket.prototype._start = function () {
	console.log('[tls] handshaking');
	this.ssl.handshake();
};

TLSSocket.prototype._read = function () {};

TLSSocket.prototype._write = function (data, encoding, cb) {
	cb = cb || function () {};

	console.log('[tls] sending: ', data.toString('utf8'));
	var result = this.ssl.prepare(data.toString('binary'));

	process.nextTick(function () {
		var err = (result !== false) ? null : 'Error while packaging data into a TLS record';
		cb(err);
	});
};

TLSSocket.prototype.connect = function () {
	var self = this;

	self._connecting = true;

	this._socket = new net.Socket();
	this._socket.on('connect', function () {
		self._connecting = false;
		self._init(null);
	});
	this._socket.connect.apply(this._socket, arguments);

	return this;
};

TLSSocket.prototype.push = function () {
	net.Socket.prototype.push.apply(this, arguments);
	net.Socket.prototype.push.apply(this._socket, arguments);
};

function normalizeConnectArgs(listArgs) {
	var args = net._normalizeConnectArgs(listArgs);
	var options = args[0];
	var cb = args[1];
	if (util.isObject(listArgs[1])) {
		options = util._extend(options, listArgs[1]);
	} else if (util.isObject(listArgs[2])) {
		options = util._extend(options, listArgs[2]);
	}
	return (cb) ? [options, cb] : [options];
}

exports.connect = function (/* [port, host], options, cb */) {
	var args = normalizeConnectArgs(arguments);
	var options = args[0];
	var cb = args[1];

	var defaults = {
		rejectUnauthorized: '0' !== process.env.NODE_TLS_REJECT_UNAUTHORIZED,
		ciphers: null //tls.DEFAULT_CIPHERS
	};
	options = util._extend(defaults, options || {});

	var hostname = options.servername ||
		options.host ||
		options.socket && options.socket._host;

	var socket = new TLSSocket(options.socket, {
		rejectUnauthorized: options.rejectUnauthorized
	});

	// Not even started connecting yet (or probably resolving dns address),
	// catch socket errors and assign handle.
	if (options.socket) {
		options.socket.once('connect', function() {
			/*assert(options.socket._handle);
			socket._handle = options.socket._handle;
			socket._handle.owner = socket;
			socket.emit('connect');*/
		});
	}

	if (options.servername) {
		//socket.setServername(options.servername);
	}

	if (cb)
		socket.once('secure', cb);

	if (!options.socket) {
		socket.connect({
			host: options.host,
			port: options.port
		});
	}

	return socket;
};
}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":28,"assert":1,"buffer":4,"net":65,"node-forge":64,"stream":45,"util":50}],64:[function(require,module,exports){
(function (process){
(function(e,t){typeof define=="function"&&define.amd?define([],t):e.forge=t()})(this,function(){var e,t,n;return function(r){function v(e,t){return h.call(e,t)}function m(e,t){var n,r,i,s,o,u,a,f,c,h,p,v=t&&t.split("/"),m=l.map,g=m&&m["*"]||{};if(e&&e.charAt(0)===".")if(t){v=v.slice(0,v.length-1),e=e.split("/"),o=e.length-1,l.nodeIdCompat&&d.test(e[o])&&(e[o]=e[o].replace(d,"")),e=v.concat(e);for(c=0;c<e.length;c+=1){p=e[c];if(p===".")e.splice(c,1),c-=1;else if(p===".."){if(c===1&&(e[2]===".."||e[0]===".."))break;c>0&&(e.splice(c-1,2),c-=2)}}e=e.join("/")}else e.indexOf("./")===0&&(e=e.substring(2));if((v||g)&&m){n=e.split("/");for(c=n.length;c>0;c-=1){r=n.slice(0,c).join("/");if(v)for(h=v.length;h>0;h-=1){i=m[v.slice(0,h).join("/")];if(i){i=i[r];if(i){s=i,u=c;break}}}if(s)break;!a&&g&&g[r]&&(a=g[r],f=c)}!s&&a&&(s=a,u=f),s&&(n.splice(0,u,s),e=n.join("/"))}return e}function g(e,t){return function(){return s.apply(r,p.call(arguments,0).concat([e,t]))}}function y(e){return function(t){return m(t,e)}}function b(e){return function(t){a[e]=t}}function w(e){if(v(f,e)){var t=f[e];delete f[e],c[e]=!0,i.apply(r,t)}if(!v(a,e)&&!v(c,e))throw new Error("No "+e);return a[e]}function E(e){var t,n=e?e.indexOf("!"):-1;return n>-1&&(t=e.substring(0,n),e=e.substring(n+1,e.length)),[t,e]}function S(e){return function(){return l&&l.config&&l.config[e]||{}}}var i,s,o,u,a={},f={},l={},c={},h=Object.prototype.hasOwnProperty,p=[].slice,d=/\.js$/;o=function(e,t){var n,r=E(e),i=r[0];return e=r[1],i&&(i=m(i,t),n=w(i)),i?n&&n.normalize?e=n.normalize(e,y(t)):e=m(e,t):(e=m(e,t),r=E(e),i=r[0],e=r[1],i&&(n=w(i))),{f:i?i+"!"+e:e,n:e,pr:i,p:n}},u={require:function(e){return g(e)},exports:function(e){var t=a[e];return typeof t!="undefined"?t:a[e]={}},module:function(e){return{id:e,uri:"",exports:a[e],config:S(e)}}},i=function(e,t,n,i){var s,l,h,p,d,m=[],y=typeof n,E;i=i||e;if(y==="undefined"||y==="function"){t=!t.length&&n.length?["require","exports","module"]:t;for(d=0;d<t.length;d+=1){p=o(t[d],i),l=p.f;if(l==="require")m[d]=u.require(e);else if(l==="exports")m[d]=u.exports(e),E=!0;else if(l==="module")s=m[d]=u.module(e);else if(v(a,l)||v(f,l)||v(c,l))m[d]=w(l);else{if(!p.p)throw new Error(e+" missing "+l);p.p.load(p.n,g(i,!0),b(l),{}),m[d]=a[l]}}h=n?n.apply(a[e],m):undefined;if(e)if(s&&s.exports!==r&&s.exports!==a[e])a[e]=s.exports;else if(h!==r||!E)a[e]=h}else e&&(a[e]=n)},e=t=s=function(e,t,n,a,f){if(typeof e=="string")return u[e]?u[e](t):w(o(e,t).f);if(!e.splice){l=e,l.deps&&s(l.deps,l.callback);if(!t)return;t.splice?(e=t,t=n,n=null):e=r}return t=t||function(){},typeof n=="function"&&(n=a,a=f),a?i(r,e,t,n):setTimeout(function(){i(r,e,t,n)},4),s},s.config=function(e){return s(e)},e._defined=a,n=function(e,t,n){t.splice||(n=t,t=[]),!v(a,e)&&!v(f,e)&&(f[e]=[e,t,n])},n.amd={jQuery:!0}}(),n("node_modules/almond/almond",function(){}),function(){function e(e){function r(e){this.data="",this.read=0;if(typeof e=="string")this.data=e;else if(t.isArrayBuffer(e)||t.isArrayBufferView(e)){var n=new Uint8Array(e);try{this.data=String.fromCharCode.apply(null,n)}catch(i){for(var s=0;s<n.length;++s)this.putByte(n[s])}}else if(e instanceof r||typeof e=="object"&&typeof e.data=="string"&&typeof e.read=="number")this.data=e.data,this.read=e.read}function i(e,n){n=n||{},this.read=n.readOffset||0,this.growSize=n.growSize||1024;var r=t.isArrayBuffer(e),i=t.isArrayBufferView(e);if(r||i){r?this.data=new DataView(e):this.data=new DataView(e.buffer,e.byteOffset,e.byteLength),this.write="writeOffset"in n?n.writeOffset:this.data.byteLength;return}this.data=new DataView(new ArrayBuffer(0)),this.write=0,e!==null&&e!==undefined&&this.putBytes(e),"writeOffset"in n&&(this.write=n.writeOffset)}var t=e.util=e.util||{};typeof process=="undefined"||!process.nextTick?typeof setImmediate=="function"?(t.setImmediate=setImmediate,t.nextTick=function(e){return setImmediate(e)}):(t.setImmediate=function(e){setTimeout(e,0)},t.nextTick=t.setImmediate):(t.nextTick=process.nextTick,typeof setImmediate=="function"?t.setImmediate=setImmediate:t.setImmediate=t.nextTick),t.isArray=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"},t.isArrayBuffer=function(e){return typeof ArrayBuffer!="undefined"&&e instanceof ArrayBuffer};var n=[];typeof DataView!="undefined"&&n.push(DataView),typeof Int8Array!="undefined"&&n.push(Int8Array),typeof Uint8Array!="undefined"&&n.push(Uint8Array),typeof Uint8ClampedArray!="undefined"&&n.push(Uint8ClampedArray),typeof Int16Array!="undefined"&&n.push(Int16Array),typeof Uint16Array!="undefined"&&n.push(Uint16Array),typeof Int32Array!="undefined"&&n.push(Int32Array),typeof Uint32Array!="undefined"&&n.push(Uint32Array),typeof Float32Array!="undefined"&&n.push(Float32Array),typeof Float64Array!="undefined"&&n.push(Float64Array),t.isArrayBufferView=function(e){for(var t=0;t<n.length;++t)if(e instanceof n[t])return!0;return!1},t.ByteBuffer=r,t.ByteStringBuffer=r,t.ByteStringBuffer.prototype.length=function(){return this.data.length-this.read},t.ByteStringBuffer.prototype.isEmpty=function(){return this.length()<=0},t.ByteStringBuffer.prototype.putByte=function(e){return this.data+=String.fromCharCode(e),this},t.ByteStringBuffer.prototype.fillWithByte=function(e,t){e=String.fromCharCode(e);var n=this.data;while(t>0)t&1&&(n+=e),t>>>=1,t>0&&(e+=e);return this.data=n,this},t.ByteStringBuffer.prototype.putBytes=function(e){return this.data+=e,this},t.ByteStringBuffer.prototype.putString=function(e){return this.data+=t.encodeUtf8(e),this},t.ByteStringBuffer.prototype.putInt16=function(e){return this.data+=String.fromCharCode(e>>8&255)+String.fromCharCode(e&255),this},t.ByteStringBuffer.prototype.putInt24=function(e){return this.data+=String.fromCharCode(e>>16&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(e&255),this},t.ByteStringBuffer.prototype.putInt32=function(e){return this.data+=String.fromCharCode(e>>24&255)+String.fromCharCode(e>>16&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(e&255),this},t.ByteStringBuffer.prototype.putInt16Le=function(e){return this.data+=String.fromCharCode(e&255)+String.fromCharCode(e>>8&255),this},t.ByteStringBuffer.prototype.putInt24Le=function(e){return this.data+=String.fromCharCode(e&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(e>>16&255),this},t.ByteStringBuffer.prototype.putInt32Le=function(e){return this.data+=String.fromCharCode(e&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(e>>16&255)+String.fromCharCode(e>>24&255),this},t.ByteStringBuffer.prototype.putInt=function(e,t){do t-=8,this.data+=String.fromCharCode(e>>t&255);while(t>0);return this},t.ByteStringBuffer.prototype.putSignedInt=function(e,t){return e<0&&(e+=2<<t-1),this.putInt(e,t)},t.ByteStringBuffer.prototype.putBuffer=function(e){return this.data+=e.getBytes(),this},t.ByteStringBuffer.prototype.getByte=function(){return this.data.charCodeAt(this.read++)},t.ByteStringBuffer.prototype.getInt16=function(){var e=this.data.charCodeAt(this.read)<<8^this.data.charCodeAt(this.read+1);return this.read+=2,e},t.ByteStringBuffer.prototype.getInt24=function(){var e=this.data.charCodeAt(this.read)<<16^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2);return this.read+=3,e},t.ByteStringBuffer.prototype.getInt32=function(){var e=this.data.charCodeAt(this.read)<<24^this.data.charCodeAt(this.read+1)<<16^this.data.charCodeAt(this.read+2)<<8^this.data.charCodeAt(this.read+3);return this.read+=4,e},t.ByteStringBuffer.prototype.getInt16Le=function(){var e=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8;return this.read+=2,e},t.ByteStringBuffer.prototype.getInt24Le=function(){var e=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2)<<16;return this.read+=3,e},t.ByteStringBuffer.prototype.getInt32Le=function(){var e=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2)<<16^this.data.charCodeAt(this.read+3)<<24;return this.read+=4,e},t.ByteStringBuffer.prototype.getInt=function(e){var t=0;do t=(t<<8)+this.data.charCodeAt(this.read++),e-=8;while(e>0);return t},t.ByteStringBuffer.prototype.getSignedInt=function(e){var t=this.getInt(e),n=2<<e-2;return t>=n&&(t-=n<<1),t},t.ByteStringBuffer.prototype.getBytes=function(e){var t;return e?(e=Math.min(this.length(),e),t=this.data.slice(this.read,this.read+e),this.read+=e):e===0?t="":(t=this.read===0?this.data:this.data.slice(this.read),this.clear()),t},t.ByteStringBuffer.prototype.bytes=function(e){return typeof e=="undefined"?this.data.slice(this.read):this.data.slice(this.read,this.read+e)},t.ByteStringBuffer.prototype.at=function(e){return this.data.charCodeAt(this.read+e)},t.ByteStringBuffer.prototype.setAt=function(e,t){return this.data=this.data.substr(0,this.read+e)+String.fromCharCode(t)+this.data.substr(this.read+e+1),this},t.ByteStringBuffer.prototype.last=function(){return this.data.charCodeAt(this.data.length-1)},t.ByteStringBuffer.prototype.copy=function(){var e=t.createBuffer(this.data);return e.read=this.read,e},t.ByteStringBuffer.prototype.compact=function(){return this.read>0&&(this.data=this.data.slice(this.read),this.read=0),this},t.ByteStringBuffer.prototype.clear=function(){return this.data="",this.read=0,this},t.ByteStringBuffer.prototype.truncate=function(e){var t=Math.max(0,this.length()-e);return this.data=this.data.substr(this.read,t),this.read=0,this},t.ByteStringBuffer.prototype.toHex=function(){var e="";for(var t=this.read;t<this.data.length;++t){var n=this.data.charCodeAt(t);n<16&&(e+="0"),e+=n.toString(16)}return e},t.ByteStringBuffer.prototype.toString=function(){return t.decodeUtf8(this.bytes())},t.DataBuffer=i,t.DataBuffer.prototype.length=function(){return this.write-this.read},t.DataBuffer.prototype.isEmpty=function(){return this.length()<=0},t.DataBuffer.prototype.accommodate=function(e,t){if(this.length()>=e)return this;t=Math.max(t||this.growSize,e);var n=new Uint8Array(this.data.buffer,this.data.byteOffset,this.data.byteLength),r=new Uint8Array(this.length()+t);return r.set(n),this.data=new DataView(r.buffer),this},t.DataBuffer.prototype.putByte=function(e){return this.accommodate(1),this.data.setUint8(this.write++,e),this},t.DataBuffer.prototype.fillWithByte=function(e,t){this.accommodate(t);for(var n=0;n<t;++n)this.data.setUint8(e);return this},t.DataBuffer.prototype.putBytes=function(e,n){if(t.isArrayBufferView(e)){var r=new Uint8Array(e.buffer,e.byteOffset,e.byteLength),i=r.byteLength-r.byteOffset;this.accommodate(i);var s=new Uint8Array(this.data.buffer,this.write);return s.set(r),this.write+=i,this}if(t.isArrayBuffer(e)){var r=new Uint8Array(e);this.accommodate(r.byteLength);var s=new Uint8Array(this.data.buffer);return s.set(r,this.write),this.write+=r.byteLength,this}if(e instanceof t.DataBuffer||typeof e=="object"&&typeof e.read=="number"&&typeof e.write=="number"&&t.isArrayBufferView(e.data)){var r=new Uint8Array(e.data.byteLength,e.read,e.length());this.accommodate(r.byteLength);var s=new Uint8Array(e.data.byteLength,this.write);return s.set(r),this.write+=r.byteLength,this}e instanceof t.ByteStringBuffer&&(e=e.data,n="binary"),n=n||"binary";if(typeof e=="string"){var o;if(n==="hex")return this.accommodate(Math.ceil(e.length/2)),o=new Uint8Array(this.data.buffer,this.write),this.write+=t.binary.hex.decode(e,o,this.write),this;if(n==="base64")return this.accommodate(Math.ceil(e.length/4)*3),o=new Uint8Array(this.data.buffer,this.write),this.write+=t.binary.base64.decode(e,o,this.write),this;n==="utf8"&&(e=t.encodeUtf8(e),n="binary");if(n==="binary"||n==="raw")return this.accommodate(e.length),o=new Uint8Array(this.data.buffer,this.write),this.write+=t.binary.raw.decode(o),this;if(n==="utf16")return this.accommodate(e.length*2),o=new Uint16Array(this.data.buffer,this.write),this.write+=t.text.utf16.encode(o),this;throw new Error("Invalid encoding: "+n)}throw Error("Invalid parameter: "+e)},t.DataBuffer.prototype.putBuffer=function(e){return this.putBytes(e),e.clear(),this},t.DataBuffer.prototype.putString=function(e){return this.putBytes(e,"utf16")},t.DataBuffer.prototype.putInt16=function(e){return this.accommodate(2),this.data.setInt16(this.write,e),this.write+=2,this},t.DataBuffer.prototype.putInt24=function(e){return this.accommodate(3),this.data.setInt16(this.write,e>>8&65535),this.data.setInt8(this.write,e>>16&255),this.write+=3,this},t.DataBuffer.prototype.putInt32=function(e){return this.accommodate(4),this.data.setInt32(this.write,e),this.write+=4,this},t.DataBuffer.prototype.putInt16Le=function(e){return this.accommodate(2),this.data.setInt16(this.write,e,!0),this.write+=2,this},t.DataBuffer.prototype.putInt24Le=function(e){return this.accommodate(3),this.data.setInt8(this.write,e>>16&255),this.data.setInt16(this.write,e>>8&65535,!0),this.write+=3,this},t.DataBuffer.prototype.putInt32Le=function(e){return this.accommodate(4),this.data.setInt32(this.write,e,!0),this.write+=4,this},t.DataBuffer.prototype.putInt=function(e,t){this.accommodate(t/8);do t-=8,this.data.setInt8(this.write++,e>>t&255);while(t>0);return this},t.DataBuffer.prototype.putSignedInt=function(e,t){return this.accommodate(t/8),e<0&&(e+=2<<t-1),this.putInt(e,t)},t.DataBuffer.prototype.getByte=function(){return this.data.getInt8(this.read++)},t.DataBuffer.prototype.getInt16=function(){var e=this.data.getInt16(this.read);return this.read+=2,e},t.DataBuffer.prototype.getInt24=function(){var e=this.data.getInt16(this.read)<<8^this.data.getInt8(this.read+2);return this.read+=3,e},t.DataBuffer.prototype.getInt32=function(){var e=this.data.getInt32(this.read);return this.read+=4,e},t.DataBuffer.prototype.getInt16Le=function(){var e=this.data.getInt16(this.read,!0);return this.read+=2,e},t.DataBuffer.prototype.getInt24Le=function(){var e=this.data.getInt8(this.read)^this.data.getInt16(this.read+1,!0)<<8;return this.read+=3,e},t.DataBuffer.prototype.getInt32Le=function(){var e=this.data.getInt32(this.read,!0);return this.read+=4,e},t.DataBuffer.prototype.getInt=function(e){var t=0;do t=(t<<8)+this.data.getInt8(this.read++),e-=8;while(e>0);return t},t.DataBuffer.prototype.getSignedInt=function(e){var t=this.getInt(e),n=2<<e-2;return t>=n&&(t-=n<<1),t},t.DataBuffer.prototype.getBytes=function(e){var t;return e?(e=Math.min(this.length(),e),t=this.data.slice(this.read,this.read+e),this.read+=e):e===0?t="":(t=this.read===0?this.data:this.data.slice(this.read),this.clear()),t},t.DataBuffer.prototype.bytes=function(e){return typeof e=="undefined"?this.data.slice(this.read):this.data.slice(this.read,this.read+e)},t.DataBuffer.prototype.at=function(e){return this.data.getUint8(this.read+e)},t.DataBuffer.prototype.setAt=function(e,t){return this.data.setUint8(e,t),this},t.DataBuffer.prototype.last=function(){return this.data.getUint8(this.write-1)},t.DataBuffer.prototype.copy=function(){return new t.DataBuffer(this)},t.DataBuffer.prototype.compact=function(){if(this.read>0){var e=new Uint8Array(this.data.buffer,this.read),t=new Uint8Array(e.byteLength);t.set(e),this.data=new DataView(t),this.write-=this.read,this.read=0}return this},t.DataBuffer.prototype.clear=function(){return this.data=new DataView(new ArrayBuffer(0)),this.read=this.write=0,this},t.DataBuffer.prototype.truncate=function(e){return this.write=Math.max(0,this.length()-e),this.read=Math.min(this.read,this.write),this},t.DataBuffer.prototype.toHex=function(){var e="";for(var t=this.read;t<this.data.byteLength;++t){var n=this.data.getUint8(t);n<16&&(e+="0"),e+=n.toString(16)}return e},t.DataBuffer.prototype.toString=function(e){var n=new Uint8Array(this.data,this.read,this.length());e=e||"utf8";if(e==="binary"||e==="raw")return t.binary.raw.encode(n);if(e==="hex")return t.binary.hex.encode(n);if(e==="base64")return t.binary.base64.encode(n);if(e==="utf8")return t.text.utf8.decode(n);if(e==="utf16")return t.text.utf16.decode(n);throw new Error("Invalid encoding: "+e)},t.createBuffer=function(e,n){return n=n||"raw",e!==undefined&&n==="utf8"&&(e=t.encodeUtf8(e)),new t.ByteBuffer(e)},t.fillString=function(e,t){var n="";while(t>0)t&1&&(n+=e),t>>>=1,t>0&&(e+=e);return n},t.xorBytes=function(e,t,n){var r="",i="",s="",o=0,u=0;for(;n>0;--n,++o)i=e.charCodeAt(o)^t.charCodeAt(o),u>=10&&(r+=s,s="",u=0),s+=String.fromCharCode(i),++u;return r+=s,r},t.hexToBytes=function(e){var t="",n=0;e.length&!0&&(n=1,t+=String.fromCharCode(parseInt(e[0],16)));for(;n<e.length;n+=2)t+=String.fromCharCode(parseInt(e.substr(n,2),16));return t},t.bytesToHex=function(e){return t.createBuffer(e).toHex()},t.int32ToBytes=function(e){return String.fromCharCode(e>>24&255)+String.fromCharCode(e>>16&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(e&255)};var s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",o=[62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,64,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51];t.encode64=function(e,t){var n="",r="",i,o,u,a=0;while(a<e.length)i=e.charCodeAt(a++),o=e.charCodeAt(a++),u=e.charCodeAt(a++),n+=s.charAt(i>>2),n+=s.charAt((i&3)<<4|o>>4),isNaN(o)?n+="==":(n+=s.charAt((o&15)<<2|u>>6),n+=isNaN(u)?"=":s.charAt(u&63)),t&&n.length>t&&(r+=n.substr(0,t)+"\r\n",n=n.substr(t));return r+=n,r},t.decode64=function(e){e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");var t="",n,r,i,s,u=0;while(u<e.length)n=o[e.charCodeAt(u++)-43],r=o[e.charCodeAt(u++)-43],i=o[e.charCodeAt(u++)-43],s=o[e.charCodeAt(u++)-43],t+=String.fromCharCode(n<<2|r>>4),i!==64&&(t+=String.fromCharCode((r&15)<<4|i>>2),s!==64&&(t+=String.fromCharCode((i&3)<<6|s)));return t},t.encodeUtf8=function(e){return unescape(encodeURIComponent(e))},t.decodeUtf8=function(e){return decodeURIComponent(escape(e))},t.binary={raw:{},hex:{},base64:{}},t.binary.raw.encode=function(e){return String.fromCharCode.apply(null,e)},t.binary.raw.decode=function(e,t,n){var r=t;r||(r=new Uint8Array(e.length)),n=n||0;var i=n;for(var s=0;s<e.length;++s)r[i++]=e.charCodeAt(s);return t?i-n:r},t.binary.hex.encode=t.bytesToHex,t.binary.hex.decode=function(e,t,n){var r=t;r||(r=new Uint8Array(Math.ceil(e.length/2))),n=n||0;var i=0,s=n;e.length&1&&(i=1,r[s++]=parseInt(e[0],16));for(;i<e.length;i+=2)r[s++]=parseInt(e.substr(i,2),16);return t?s-n:r},t.binary.base64.encode=function(e,t){var n="",r="",i,o,u,a=0;while(a<e.byteLength)i=e[a++],o=e[a++],u=e[a++],n+=s.charAt(i>>2),n+=s.charAt((i&3)<<4|o>>4),isNaN(o)?n+="==":(n+=s.charAt((o&15)<<2|u>>6),n+=isNaN(u)?"=":s.charAt(u&63)),t&&n.length>t&&(r+=n.substr(0,t)+"\r\n",n=n.substr(t));return r+=n,r},t.binary.base64.decode=function(e,t,n){var r=t;r||(r=new Uint8Array(Math.ceil(e.length/4)*3)),e=e.replace(/[^A-Za-z0-9\+\/\=]/g,""),n=n||0;var i,s,u,a,f=0,l=n;while(f<e.length)i=o[e.charCodeAt(f++)-43],s=o[e.charCodeAt(f++)-43],u=o[e.charCodeAt(f++)-43],a=o[e.charCodeAt(f++)-43],r[l++]=i<<2|s>>4,u!==64&&(r[l++]=(s&15)<<4|u>>2,a!==64&&(r[l++]=(u&3)<<6|a));return t?l-n:r},t.text={utf8:{},utf16:{}},t.text.utf8.encode=function(e,n,r){e=t.encodeUtf8(e);var i=n;i||(i=new Uint8Array(e.length)),r=r||0;var s=r;for(var o=0;o<e.length;++o)i[s++]=e.charCodeAt(o);return n?s-r:i},t.text.utf8.decode=function(e){return t.decodeUtf8(String.fromCharCode.apply(null,e))},t.text.utf16.encode=function(e,t,n){var r=t;r||(r=new Uint8Array(e.length));var i=new Uint16Array(r);n=n||0;var s=n,o=n;for(var u=0;u<e.length;++u)i[o++]=e.charCodeAt(u),s+=2;return t?s-n:r},t.text.utf16.decode=function(e){return String.fromCharCode.apply(null,new Uint16Array(e))},t.deflate=function(e,n,r){n=t.decode64(e.deflate(t.encode64(n)).rval);if(r){var i=2,s=n.charCodeAt(1);s&32&&(i=6),n=n.substring(i,n.length-4)}return n},t.inflate=function(e,n,r){var i=e.inflate(t.encode64(n)).rval;return i===null?null:t.decode64(i)};var u=function(e,n,r){if(!e)throw new Error("WebStorage not available.");var i;r===null?i=e.removeItem(n):(r=t.encode64(JSON.stringify(r)),i=e.setItem(n,r));if(typeof i!="undefined"&&i.rval!==!0){var s=new Error(i.error.message);throw s.id=i.error.id,s.name=i.error.name,s}},a=function(e,n){if(!e)throw new Error("WebStorage not available.");var r=e.getItem(n);if(e.init)if(r.rval===null){if(r.error){var i=new Error(r.error.message);throw i.id=r.error.id,i.name=r.error.name,i}r=null}else r=r.rval;return r!==null&&(r=JSON.parse(t.decode64(r))),r},f=function(e,t,n,r){var i=a(e,t);i===null&&(i={}),i[n]=r,u(e,t,i)},l=function(e,t,n){var r=a(e,t);return r!==null&&(r=n in r?r[n]:null),r},c=function(e,t,n){var r=a(e,t);if(r!==null&&n in r){delete r[n];var i=!0;for(var s in r){i=!1;break}i&&(r=null),u(e,t,r)}},h=function(e,t){u(e,t,null)},p=function(e,t,n){var r=null;typeof n=="undefined"&&(n=["web","flash"]);var i,s=!1,o=null;for(var u in n){i=n[u];try{if(i==="flash"||i==="both"){if(t[0]===null)throw new Error("Flash local storage not available.");r=e.apply(this,t),s=i==="flash"}if(i==="web"||i==="both")t[0]=localStorage,r=e.apply(this,t),s=!0}catch(a){o=a}if(s)break}if(!s)throw o;return r};t.setItem=function(e,t,n,r,i){p(f,arguments,i)},t.getItem=function(e,t,n,r){return p(l,arguments,r)},t.removeItem=function(e,t,n,r){p(c,arguments,r)},t.clearItems=function(e,t,n){p(h,arguments,n)},t.parseUrl=function(e){var t=/^(https?):\/\/([^:&^\/]*):?(\d*)(.*)$/g;t.lastIndex=0;var n=t.exec(e),r=n===null?null:{full:e,scheme:n[1],host:n[2],port:n[3],path:n[4]};return r&&(r.fullHost=r.host,r.port?r.port!==80&&r.scheme==="http"?r.fullHost+=":"+r.port:r.port!==443&&r.scheme==="https"&&(r.fullHost+=":"+r.port):r.scheme==="http"?r.port=80:r.scheme==="https"&&(r.port=443),r.full=r.scheme+"://"+r.fullHost),r};var d=null;t.getQueryVariables=function(e){var t=function(e){var t={},n=e.split("&");for(var r=0;r<n.length;r++){var i=n[r].indexOf("="),s,o;i>0?(s=n[r].substring(0,i),o=n[r].substring(i+1)):(s=n[r],o=null),s in t||(t[s]=[]),!(s in Object.prototype)&&o!==null&&t[s].push(unescape(o))}return t},n;return typeof e=="undefined"?(d===null&&(typeof window=="undefined"?d={}:d=t(window.location.search.substring(1))),n=d):n=t(e),n},t.parseFragment=function(e){var n=e,r="",i=e.indexOf("?");i>0&&(n=e.substring(0,i),r=e.substring(i+1));var s=n.split("/");s.length>0&&s[0]===""&&s.shift();var o=r===""?{}:t.getQueryVariables(r);return{pathString:n,queryString:r,path:s,query:o}},t.makeRequest=function(e){var n=t.parseFragment(e),r={path:n.pathString,query:n.queryString,getPath:function(e){return typeof e=="undefined"?n.path:n.path[e]},getQuery:function(e,t){var r;return typeof e=="undefined"?r=n.query:(r=n.query[e],r&&typeof t!="undefined"&&(r=r[t])),r},getQueryLast:function(e,t){var n,i=r.getQuery(e);return i?n=i[i.length-1]:n=t,n}};return r},t.makeLink=function(e,t,n){e=jQuery.isArray(e)?e.join("/"):e;var r=jQuery.param(t||{});return n=n||"",e+(r.length>0?"?"+r:"")+(n.length>0?"#"+n:"")},t.setPath=function(e,t,n){if(typeof e=="object"&&e!==null){var r=0,i=t.length;while(r<i){var s=t[r++];if(r==i)e[s]=n;else{var o=s in e;if(!o||o&&typeof e[s]!="object"||o&&e[s]===null)e[s]={};e=e[s]}}}},t.getPath=function(e,t,n){var r=0,i=t.length,s=!0;while(s&&r<i&&typeof e=="object"&&e!==null){var o=t[r++];s=o in e,s&&(e=e[o])}return s?e:n},t.deletePath=function(e,t){if(typeof e=="object"&&e!==null){var n=0,r=t.length;while(n<r){var i=t[n++];if(n==r)delete e[i];else{if(!(i in e&&typeof e[i]=="object"&&e[i]!==null))break;e=e[i]}}}},t.isEmpty=function(e){for(var t in e)if(e.hasOwnProperty(t))return!1;return!0},t.format=function(e){var t=/%./g,n,r,i=0,s=[],o=0;while(n=t.exec(e)){r=e.substring(o,t.lastIndex-2),r.length>0&&s.push(r),o=t.lastIndex;var u=n[0][1];switch(u){case"s":case"o":i<arguments.length?s.push(arguments[i++ +1]):s.push("<?>");break;case"%":s.push("%");break;default:s.push("<%"+u+"?>")}}return s.push(e.substring(o)),s.join("")},t.formatNumber=function(e,t,n,r){var i=e,s=isNaN(t=Math.abs(t))?2:t,o=n===undefined?",":n,u=r===undefined?".":r,a=i<0?"-":"",f=parseInt(i=Math.abs(+i||0).toFixed(s),10)+"",l=f.length>3?f.length%3:0;return a+(l?f.substr(0,l)+u:"")+f.substr(l).replace(/(\d{3})(?=\d)/g,"$1"+u)+(s?o+Math.abs(i-f).toFixed(s).slice(2):"")},t.formatSize=function(e){return e>=1073741824?e=t.formatNumber(e/1073741824,2,".","")+" GiB":e>=1048576?e=t.formatNumber(e/1048576,2,".","")+" MiB":e>=1024?e=t.formatNumber(e/1024,0)+" KiB":e=t.formatNumber(e,0)+" bytes",e},t.bytesFromIP=function(e){return e.indexOf(".")!==-1?t.bytesFromIPv4(e):e.indexOf(":")!==-1?t.bytesFromIPv6(e):null},t.bytesFromIPv4=function(e){e=e.split(".");if(e.length!==4)return null;var n=t.createBuffer();for(var r=0;r<e.length;++r){var i=parseInt(e[r],10);if(isNaN(i))return null;n.putByte(i)}return n.getBytes()},t.bytesFromIPv6=function(e){var n=0;e=e.split(":").filter(function(e){return e.length===0&&++n,!0});var r=(8-e.length+n)*2,i=t.createBuffer();for(var s=0;s<8;++s){if(!e[s]||e[s].length===0){i.fillWithByte(0,r),r=0;continue}var o=t.hexToBytes(e[s]);o.length<2&&i.putByte(0),i.putBytes(o)}return i.getBytes()},t.bytesToIP=function(e){return e.length===4?t.bytesToIPv4(e):e.length===16?t.bytesToIPv6(e):null},t.bytesToIPv4=function(e){if(e.length!==4)return null;var t=[];for(var n=0;n<e.length;++n)t.push(e.charCodeAt(n));return t.join(".")},t.bytesToIPv6=function(e){if(e.length!==16)return null;var n=[],r=[],i=0;for(var s=0;s<e.length;s+=2){var o=t.bytesToHex(e[s]+e[s+1]);while(o[0]==="0"&&o!=="0")o=o.substr(1);if(o==="0"){var u=r[r.length-1],a=n.length;!u||a!==u.end+1?r.push({start:a,end:a}):(u.end=a,u.end-u.start>r[i].end-r[i].start&&(i=r.length-1))}n.push(o)}if(r.length>0){var f=r[i];f.end-f.start>0&&(n.splice(f.start,f.end-f.start+1,""),f.start===0&&n.unshift(""),f.end===7&&n.push(""))}return n.join(":")},t.estimateCores=function(e,n){function i(e,u,a){if(u===0){var f=Math.floor(e.reduce(function(e,t){return e+t},0)/e.length);return t.cores=Math.max(1,f),URL.revokeObjectURL(r),n(null,t.cores)}s(a,function(t,n){e.push(o(a,n)),i(e,u-1,a)})}function s(e,t){var n=[],i=[];for(var s=0;s<e;++s){var o=new Worker(r);o.addEventListener("message",function(r){i.push(r.data);if(i.length===e){for(var s=0;s<e;++s)n[s].terminate();t(null,i)}}),n.push(o)}for(var s=0;s<e;++s)n[s].postMessage(s)}function o(e,t){var n=[];for(var r=0;r<e;++r){var i=t[r],s=n[r]=[];for(var o=0;o<e;++o){if(r===o)continue;var u=t[o];(i.st>u.st&&i.st<u.et||u.st>i.st&&u.st<i.et)&&s.push(o)}}return n.reduce(function(e,t){return Math.max(e,t.length)},0)}typeof e=="function"&&(n=e,e={}),e=e||{};if("cores"in t&&!e.update)return n(null,t.cores);if(typeof Worker===undefined)return t.cores=1,n(null,t.cores);if(typeof Blob===undefined)return t.cores=2,n(null,t.cores);var r=URL.createObjectURL(new Blob(["(",function(){self.addEventListener("message",function(e){var t=Date.now(),n=t+4;while(Date.now()<n);self.postMessage({st:t,et:n})})}.toString(),")()"],{type:"application/javascript"}));i([],5,16)}}var r="util";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/util",["require","module"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.cipher=e.cipher||{},e.cipher.algorithms=e.cipher.algorithms||{},e.cipher.createCipher=function(t,n){var r=t;typeof r=="string"&&(r=e.cipher.getAlgorithm(r),r&&(r=r()));if(!r)throw new Error("Unsupported algorithm: "+t);return new e.cipher.BlockCipher({algorithm:r,key:n,decrypt:!1})},e.cipher.createDecipher=function(t,n){var r=t;typeof r=="string"&&(r=e.cipher.getAlgorithm(r),r&&(r=r()));if(!r)throw new Error("Unsupported algorithm: "+t);return new e.cipher.BlockCipher({algorithm:r,key:n,decrypt:!0})},e.cipher.registerAlgorithm=function(t,n){t=t.toUpperCase(),e.cipher.algorithms[t]=n},e.cipher.getAlgorithm=function(t){return t=t.toUpperCase(),t in e.cipher.algorithms?e.cipher.algorithms[t]:null};var t=e.cipher.BlockCipher=function(e){this.algorithm=e.algorithm,this.mode=this.algorithm.mode,this.blockSize=this.mode.blockSize,this._finish=!1,this._input=null,this.output=null,this._op=e.decrypt?this.mode.decrypt:this.mode.encrypt,this._decrypt=e.decrypt,this.algorithm.initialize(e)};t.prototype.start=function(t){t=t||{};var n={};for(var r in t)n[r]=t[r];n.decrypt=this._decrypt,this._finish=!1,this._input=e.util.createBuffer(),this.output=t.output||e.util.createBuffer(),this.mode.start(n)},t.prototype.update=function(e){this._finish||this._input.putBuffer(e);while(this._input.length()>=this.blockSize||this._input.length()>0&&this._finish)this._op.call(this.mode,this._input,this.output);this._input.compact()},t.prototype.finish=function(e){e&&this.mode.name==="CBC"&&(this.mode.pad=function(t){return e(this.blockSize,t,!1)},this.mode.unpad=function(t){return e(this.blockSize,t,!0)});var t={};return t.decrypt=this._decrypt,t.overflow=this._input.length()%this.blockSize,!this._decrypt&&this.mode.pad&&!this.mode.pad(this._input,t)?!1:(this._finish=!0,this.update(),this._decrypt&&this.mode.unpad&&!this.mode.unpad(this.output,t)?!1:this.mode.afterFinish&&!this.mode.afterFinish(this.output,t)?!1:!0)}}var r="cipher";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/cipher",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function n(t){typeof t=="string"&&(t=e.util.createBuffer(t));if(e.util.isArray(t)&&t.length>4){var n=t;t=e.util.createBuffer();for(var r=0;r<t.length;++r)t.putByte(n[r])}return e.util.isArray(t)||(t=[t.getInt32(),t.getInt32(),t.getInt32(),t.getInt32()]),t}function r(e){e[e.length-1]=e[e.length-1]+1&4294967295}function i(e){return[e/4294967296|0,e&4294967295]}e.cipher=e.cipher||{};var t=e.cipher.modes=e.cipher.modes||{};t.ecb=function(e){e=e||{},this.name="ECB",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._blocks=this.blockSize/4,this._inBlock=new Array(this._blocks),this._outBlock=new Array(this._blocks)},t.ecb.prototype.start=function(e){},t.ecb.prototype.encrypt=function(e,t){for(var n=0;n<this._blocks;++n)this._inBlock[n]=e.getInt32();this.cipher.encrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)t.putInt32(this._outBlock[n])},t.ecb.prototype.decrypt=function(e,t){for(var n=0;n<this._blocks;++n)this._inBlock[n]=e.getInt32();this.cipher.decrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)t.putInt32(this._outBlock[n])},t.ecb.prototype.pad=function(e,t){var n=e.length()===this.blockSize?this.blockSize:this.blockSize-e.length();return e.fillWithByte(n,n),!0},t.ecb.prototype.unpad=function(e,t){if(t.overflow>0)return!1;var n=e.length(),r=e.at(n-1);return r>this.blockSize<<2?!1:(e.truncate(r),!0)},t.cbc=function(e){e=e||{},this.name="CBC",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._blocks=this.blockSize/4,this._inBlock=new Array(this._blocks),this._outBlock=new Array(this._blocks)},t.cbc.prototype.start=function(e){if(e.iv===null){if(!this._prev)throw new Error("Invalid IV parameter.");this._iv=this._prev.slice(0)}else{if(!("iv"in e))throw new Error("Invalid IV parameter.");this._iv=n(e.iv),this._prev=this._iv.slice(0)}},t.cbc.prototype.encrypt=function(e,t){for(var n=0;n<this._blocks;++n)this._inBlock[n]=this._prev[n]^e.getInt32();this.cipher.encrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)t.putInt32(this._outBlock[n]);this._prev=this._outBlock},t.cbc.prototype.decrypt=function(e,t){for(var n=0;n<this._blocks;++n)this._inBlock[n]=e.getInt32();this.cipher.decrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)t.putInt32(this._prev[n]^this._outBlock[n]);this._prev=this._inBlock.slice(0)},t.cbc.prototype.pad=function(e,t){var n=e.length()===this.blockSize?this.blockSize:this.blockSize-e.length();return e.fillWithByte(n,n),!0},t.cbc.prototype.unpad=function(e,t){if(t.overflow>0)return!1;var n=e.length(),r=e.at(n-1);return r>this.blockSize<<2?!1:(e.truncate(r),!0)},t.cfb=function(e){e=e||{},this.name="CFB",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._blocks=this.blockSize/4,this._inBlock=null,this._outBlock=new Array(this._blocks)},t.cfb.prototype.start=function(e){if(!("iv"in e))throw new Error("Invalid IV parameter.");this._iv=n(e.iv),this._inBlock=this._iv.slice(0)},t.cfb.prototype.encrypt=function(e,t){this.cipher.encrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)this._inBlock[n]=e.getInt32()^this._outBlock[n],t.putInt32(this._inBlock[n])},t.cfb.prototype.decrypt=function(e,t){this.cipher.encrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)this._inBlock[n]=e.getInt32(),t.putInt32(this._inBlock[n]^this._outBlock[n])},t.cfb.prototype.afterFinish=function(e,t){return t.overflow>0&&e.truncate(this.blockSize-t.overflow),!0},t.ofb=function(e){e=e||{},this.name="OFB",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._blocks=this.blockSize/4,this._inBlock=null,this._outBlock=new Array(this._blocks)},t.ofb.prototype.start=function(e){if(!("iv"in e))throw new Error("Invalid IV parameter.");this._iv=n(e.iv),this._inBlock=this._iv.slice(0)},t.ofb.prototype.encrypt=function(e,t){this.cipher.encrypt(this._inBlock,this._outBlock);for(var n=0;n<this._blocks;++n)t.putInt32(e.getInt32()^this._outBlock[n]),this._inBlock[n]=this._outBlock[n]},t.ofb.prototype.decrypt=t.ofb.prototype.encrypt,t.ofb.prototype.afterFinish=function(e,t){return t.overflow>0&&e.truncate(this.blockSize-t.overflow),!0},t.ctr=function(e){e=e||{},this.name="CTR",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._blocks=this.blockSize/4,this._inBlock=null,this._outBlock=new Array(this._blocks)},t.ctr.prototype.start=function(e){if(!("iv"in e))throw new Error("Invalid IV parameter.");this._iv=n(e.iv),this._inBlock=this._iv.slice(0)},t.ctr.prototype.encrypt=function(e,t){this.cipher.encrypt(this._inBlock,this._outBlock),r(this._inBlock);for(var n=0;n<this._blocks;++n)t.putInt32(e.getInt32()^this._outBlock[n])},t.ctr.prototype.decrypt=t.ctr.prototype.encrypt,t.ctr.prototype.afterFinish=function(e,t){return t.overflow>0&&e.truncate(this.blockSize-t.overflow),!0},t.gcm=function(e){e=e||{},this.name="GCM",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._blocks=this.blockSize/4,this._inBlock=new Array(this._blocks),this._outBlock=new Array(this._blocks),this._R=3774873600},t.gcm.prototype.start=function(t){if(!("iv"in t))throw new Error("Invalid IV parameter.");var n=e.util.createBuffer(t.iv);this._cipherLength=0;var s;"additionalData"in t?s=e.util.createBuffer(t.additionalData):s=e.util.createBuffer(),"tagLength"in t?this._tagLength=t.tagLength:this._tagLength=128,this._tag=null;if(t.decrypt){this._tag=e.util.createBuffer(t.tag).getBytes();if(this._tag.length!==this._tagLength/8)throw new Error("Authentication tag does not match tag length.")}this._hashBlock=new Array(this._blocks),this.tag=null,this._hashSubkey=new Array(this._blocks),this.cipher.encrypt([0,0,0,0],this._hashSubkey),this.componentBits=4,this._m=this.generateHashTable(this._hashSubkey,this.componentBits);var o=n.length();if(o===12)this._j0=[n.getInt32(),n.getInt32(),n.getInt32(),1];else{this._j0=[0,0,0,0];while(n.length()>0)this._j0=this.ghash(this._hashSubkey,this._j0,[n.getInt32(),n.getInt32(),n.getInt32(),n.getInt32()]);this._j0=this.ghash(this._hashSubkey,this._j0,[0,0].concat(i(o*8)))}this._inBlock=this._j0.slice(0),r(this._inBlock),s=e.util.createBuffer(s),this._aDataLength=i(s.length()*8);var u=s.length()%this.blockSize;u&&s.fillWithByte(0,this.blockSize-u),this._s=[0,0,0,0];while(s.length()>0)this._s=this.ghash(this._hashSubkey,this._s,[s.getInt32(),s.getInt32(),s.getInt32(),s.getInt32()])},t.gcm.prototype.encrypt=function(t,n){this.cipher.encrypt(this._inBlock,this._outBlock),r(this._inBlock);var i=t.length();for(var s=0;s<this._blocks;++s)this._outBlock[s]^=t.getInt32();if(i<this.blockSize){var o=i%this.blockSize;this._cipherLength+=o;var u=e.util.createBuffer();u.putInt32(this._outBlock[0]),u.putInt32(this._outBlock[1]),u.putInt32(this._outBlock[2]),u.putInt32(this._outBlock[3]),u.truncate(this.blockSize-o),this._outBlock[0]=u.getInt32(),this._outBlock[1]=u.getInt32(),this._outBlock[2]=u.getInt32(),this._outBlock[3]=u.getInt32()}else this._cipherLength+=this.blockSize;for(var s=0;s<this._blocks;++s)n.putInt32(this._outBlock[s]);this._s=this.ghash(this._hashSubkey,this._s,this._outBlock)},t.gcm.prototype.decrypt=function(e,t){this.cipher.encrypt(this._inBlock,this._outBlock),r(this._inBlock);var n=e.length();this._hashBlock[0]=e.getInt32(),this._hashBlock[1]=e.getInt32(),this._hashBlock[2]=e.getInt32(),this._hashBlock[3]=e.getInt32(),this._s=this.ghash(this._hashSubkey,this._s,this._hashBlock);for(var i=0;i<this._blocks;++i)t.putInt32(this._outBlock[i]^this._hashBlock[i]);n<this.blockSize?this._cipherLength+=n%this.blockSize:this._cipherLength+=this.blockSize},t.gcm.prototype.afterFinish=function(t,n){var r=!0;n.overflow&&t.truncate(this.blockSize-n.overflow),this.tag=e.util.createBuffer();var s=this._aDataLength.concat(i(this._cipherLength*8));this._s=this.ghash(this._hashSubkey,this._s,s);var o=[];this.cipher.encrypt(this._j0,o);for(var u=0;u<this._blocks;++u)this.tag.putInt32(this._s[u]^o[u]);return this.tag.truncate(this.tag.length()%(this._tagLength/8)),n.decrypt&&this.tag.bytes()!==this._tag&&(r=!1),r},t.gcm.prototype.multiply=function(e,t){var n=[0,0,0,0],r=t.slice(0);for(var i=0;i<128;++i){var s=e[i/32|0]&1<<31-i%32;s&&(n[0]^=r[0],n[1]^=r[1],n[2]^=r[2],n[3]^=r[3]),this.pow(r,r)}return n},t.gcm.prototype.pow=function(e,t){var n=e[3]&1;for(var r=3;r>0;--r)t[r]=e[r]>>>1|(e[r-1]&1)<<31;t[0]=e[0]>>>1,n&&(t[0]^=this._R)},t.gcm.prototype.tableMultiply=function(e){var t=[0,0,0,0];for(var n=0;n<32;++n){var r=n/8|0,i=e[r]>>>(7-n%8)*4&15,s=this._m[n][i];t[0]^=s[0],t[1]^=s[1],t[2]^=s[2],t[3]^=s[3]}return t},t.gcm.prototype.ghash=function(e,t,n){return t[0]^=n[0],t[1]^=n[1],t[2]^=n[2],t[3]^=n[3],this.tableMultiply(t)},t.gcm.prototype.generateHashTable=function(e,t){var n=8/t,r=4*n,i=16*n,s=new Array(i);for(var o=0;o<i;++o){var u=[0,0,0,0],a=o/r|0,f=(r-1-o%r)*t;u[a]=1<<t-1<<f,s[o]=this.generateSubHashTable(this.multiply(u,e),t)}return s},t.gcm.prototype.generateSubHashTable=function(e,t){var n=1<<t,r=n>>>1,i=new Array(n);i[r]=e.slice(0);var s=r>>>1;while(s>0)this.pow(i[2*s],i[s]=[]),s>>=1;s=2;while(s<r){for(var o=1;o<s;++o){var u=i[s],a=i[o];i[s+o]=[u[0]^a[0],u[1]^a[1],u[2]^a[2],u[3]^a[3]]}s*=2}i[0]=[0,0,0,0];for(s=r+1;s<n;++s){var f=i[s^r];i[s]=[e[0]^f[0],e[1]^f[1],e[2]^f[2],e[3]^f[3]]}return i}}var r="cipherModes";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/cipherModes",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function t(t,n){var r=function(){return new e.aes.Algorithm(t,n)};e.cipher.registerAlgorithm(t,r)}function f(){n=!0,o=[0,1,2,4,8,16,32,64,128,27,54];var e=new Array(256);for(var t=0;t<128;++t)e[t]=t<<1,e[t+128]=t+128<<1^283;i=new Array(256),s=new Array(256),u=new Array(4),a=new Array(4);for(var t=0;t<4;++t)u[t]=new Array(256),a[t]=new Array(256);var r=0,f=0,l,c,h,p,d,v,m;for(var t=0;t<256;++t){p=f^f<<1^f<<2^f<<3^f<<4,p=p>>8^p&255^99,i[r]=p,s[p]=r,d=e[p],l=e[r],c=e[l],h=e[c],v=d<<24^p<<16^p<<8^(p^d),m=(l^c^h)<<24^(r^h)<<16^(r^c^h)<<8^(r^l^h);for(var g=0;g<4;++g)u[g][r]=v,a[g][p]=m,v=v<<24|v>>>8,m=m<<24|m>>>8;r===0?r=f=1:(r=l^e[e[e[l^h]]],f^=e[e[f]])}}function l(e,t){var n=e.slice(0),s,u=1,f=n.length,l=f+6+1,c=r*l;for(var h=f;h<c;++h)s=n[h-1],h%f===0?(s=i[s>>>16&255]<<24^i[s>>>8&255]<<16^i[s&255]<<8^i[s>>>24]^o[u]<<24,u++):f>6&&h%f===4&&(s=i[s>>>24]<<24^i[s>>>16&255]<<16^i[s>>>8&255]<<8^i[s&255]),n[h]=n[h-f]^s;if(t){var p,d=a[0],v=a[1],m=a[2],g=a[3],y=n.slice(0);c=n.length;for(var h=0,b=c-r;h<c;h+=r,b-=r)if(h===0||h===c-r)y[h]=n[b],y[h+1]=n[b+3],y[h+2]=n[b+2],y[h+3]=n[b+1];else for(var w=0;w<r;++w)p=n[b+w],y[h+(3&-w)]=d[i[p>>>24]]^v[i[p>>>16&255]]^m[i[p>>>8&255]]^g[i[p&255]];n=y}return n}function c(e,t,n,r){var o=e.length/4-1,f,l,c,h,p;r?(f=a[0],l=a[1],c=a[2],h=a[3],p=s):(f=u[0],l=u[1],c=u[2],h=u[3],p=i);var d,v,m,g,y,b,w;d=t[0]^e[0],v=t[r?3:1]^e[1],m=t[2]^e[2],g=t[r?1:3]^e[3];var E=3;for(var S=1;S<o;++S)y=f[d>>>24]^l[v>>>16&255]^c[m>>>8&255]^h[g&255]^e[++E],b=f[v>>>24]^l[m>>>16&255]^c[g>>>8&255]^h[d&255]^e[++E],w=f[m>>>24]^l[g>>>16&255]^c[d>>>8&255]^h[v&255]^e[++E],g=f[g>>>24]^l[d>>>16&255]^c[v>>>8&255]^h[m&255]^e[++E],d=y,v=b,m=w;n[0]=p[d>>>24]<<24^p[v>>>16&255]<<16^p[m>>>8&255]<<8^p[g&255]^e[++E],n[r?3:1]=p[v>>>24]<<24^p[m>>>16&255]<<16^p[g>>>8&255]<<8^p[d&255]^e[++E],n[2]=p[m>>>24]<<24^p[g>>>16&255]<<16^p[d>>>8&255]<<8^p[v&255]^e[++E],n[r?1:3]=p[g>>>24]<<24^p[d>>>16&255]<<16^p[v>>>8&255]<<8^p[m&255]^e[++E]}function h(t){t=t||{};var n=(t.mode||"CBC").toUpperCase(),r="AES-"+n,i;t.decrypt?i=e.cipher.createDecipher(r,t.key):i=e.cipher.createCipher(r,t.key);var s=i.start;return i.start=function(t,n){var r=null;n instanceof e.util.ByteBuffer&&(r=n,n={}),n=n||{},n.output=r,n.iv=t,s.call(i,n)},i}e.aes=e.aes||{},e.aes.startEncrypting=function(e,t,n,r){var i=h({key:e,output:n,decrypt:!1,mode:r});return i.start(t),i},e.aes.createEncryptionCipher=function(e,t){return h({key:e,output:null,decrypt:!1,mode:t})},e.aes.startDecrypting=function(e,t,n,r){var i=h({key:e,output:n,decrypt:!0,mode:r});return i.start(t),i},e.aes.createDecryptionCipher=function(e,t){return h({key:e,output:null,decrypt:!0,mode:t})},e.aes.Algorithm=function(e,t){n||f();var r=this;r.name=e,r.mode=new t({blockSize:16,cipher:{encrypt:function(e,t){return c(r._w,e,t,!1)},decrypt:function(e,t){return c(r._w,e,t,!0)}}}),r._init=!1},e.aes.Algorithm.prototype.initialize=function(t){if(this._init)return;var n=t.key,r;if(typeof n!="string"||n.length!==16&&n.length!==24&&n.length!==32){if(e.util.isArray(n)&&(n.length===16||n.length===24||n.length===32)){r=n,n=e.util.createBuffer();for(var i=0;i<r.length;++i)n.putByte(r[i])}}else n=e.util.createBuffer(n);if(!e.util.isArray(n)){r=n,n=[];var s=r.length();if(s===16||s===24||s===32){s>>>=2;for(var i=0;i<s;++i)n.push(r.getInt32())}}if(!e.util.isArray(n)||n.length!==4&&n.length!==6&&n.length!==8)throw new Error("Invalid key parameter.");var o=this.mode.name,u=["CFB","OFB","CTR","GCM"].indexOf(o)!==-1;this._w=l(n,t.decrypt&&!u),this._init=!0},e.aes._expandKey=function(e,t){return n||f(),l(e,t)},e.aes._updateBlock=c,t("AES-CBC",e.cipher.modes.cbc),t("AES-CFB",e.cipher.modes.cfb),t("AES-OFB",e.cipher.modes.ofb),t("AES-CTR",e.cipher.modes.ctr),t("AES-GCM",e.cipher.modes.gcm);var n=!1,r=4,i,s,o,u,a}var r="aes";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/aes",["require","module","./cipher","./cipherModes","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.pki=e.pki||{};var t=e.pki.oids=e.oids=e.oids||{};t["1.2.840.113549.1.1.1"]="rsaEncryption",t.rsaEncryption="1.2.840.113549.1.1.1",t["1.2.840.113549.1.1.4"]="md5WithRSAEncryption",t.md5WithRSAEncryption="1.2.840.113549.1.1.4",t["1.2.840.113549.1.1.5"]="sha1WithRSAEncryption",t.sha1WithRSAEncryption="1.2.840.113549.1.1.5",t["1.2.840.113549.1.1.7"]="RSAES-OAEP",t["RSAES-OAEP"]="1.2.840.113549.1.1.7",t["1.2.840.113549.1.1.8"]="mgf1",t.mgf1="1.2.840.113549.1.1.8",t["1.2.840.113549.1.1.9"]="pSpecified",t.pSpecified="1.2.840.113549.1.1.9",t["1.2.840.113549.1.1.10"]="RSASSA-PSS",t["RSASSA-PSS"]="1.2.840.113549.1.1.10",t["1.2.840.113549.1.1.11"]="sha256WithRSAEncryption",t.sha256WithRSAEncryption="1.2.840.113549.1.1.11",t["1.2.840.113549.1.1.12"]="sha384WithRSAEncryption",t.sha384WithRSAEncryption="1.2.840.113549.1.1.12",t["1.2.840.113549.1.1.13"]="sha512WithRSAEncryption",t.sha512WithRSAEncryption="1.2.840.113549.1.1.13",t["1.3.14.3.2.7"]="desCBC",t.desCBC="1.3.14.3.2.7",t["1.3.14.3.2.26"]="sha1",t.sha1="1.3.14.3.2.26",t["2.16.840.1.101.3.4.2.1"]="sha256",t.sha256="2.16.840.1.101.3.4.2.1",t["2.16.840.1.101.3.4.2.2"]="sha384",t.sha384="2.16.840.1.101.3.4.2.2",t["2.16.840.1.101.3.4.2.3"]="sha512",t.sha512="2.16.840.1.101.3.4.2.3",t["1.2.840.113549.2.5"]="md5",t.md5="1.2.840.113549.2.5",t["1.2.840.113549.1.7.1"]="data",t.data="1.2.840.113549.1.7.1",t["1.2.840.113549.1.7.2"]="signedData",t.signedData="1.2.840.113549.1.7.2",t["1.2.840.113549.1.7.3"]="envelopedData",t.envelopedData="1.2.840.113549.1.7.3",t["1.2.840.113549.1.7.4"]="signedAndEnvelopedData",t.signedAndEnvelopedData="1.2.840.113549.1.7.4",t["1.2.840.113549.1.7.5"]="digestedData",t.digestedData="1.2.840.113549.1.7.5",t["1.2.840.113549.1.7.6"]="encryptedData",t.encryptedData="1.2.840.113549.1.7.6",t["1.2.840.113549.1.9.1"]="emailAddress",t.emailAddress="1.2.840.113549.1.9.1",t["1.2.840.113549.1.9.2"]="unstructuredName",t.unstructuredName="1.2.840.113549.1.9.2",t["1.2.840.113549.1.9.3"]="contentType",t.contentType="1.2.840.113549.1.9.3",t["1.2.840.113549.1.9.4"]="messageDigest",t.messageDigest="1.2.840.113549.1.9.4",t["1.2.840.113549.1.9.5"]="signingTime",t.signingTime="1.2.840.113549.1.9.5",t["1.2.840.113549.1.9.6"]="counterSignature",t.counterSignature="1.2.840.113549.1.9.6",t["1.2.840.113549.1.9.7"]="challengePassword",t.challengePassword="1.2.840.113549.1.9.7",t["1.2.840.113549.1.9.8"]="unstructuredAddress",t.unstructuredAddress="1.2.840.113549.1.9.8",t["1.2.840.113549.1.9.20"]="friendlyName",t.friendlyName="1.2.840.113549.1.9.20",t["1.2.840.113549.1.9.21"]="localKeyId",t.localKeyId="1.2.840.113549.1.9.21",t["1.2.840.113549.1.9.22.1"]="x509Certificate",t.x509Certificate="1.2.840.113549.1.9.22.1",t["1.2.840.113549.1.12.10.1.1"]="keyBag",t.keyBag="1.2.840.113549.1.12.10.1.1",t["1.2.840.113549.1.12.10.1.2"]="pkcs8ShroudedKeyBag",t.pkcs8ShroudedKeyBag="1.2.840.113549.1.12.10.1.2",t["1.2.840.113549.1.12.10.1.3"]="certBag",t.certBag="1.2.840.113549.1.12.10.1.3",t["1.2.840.113549.1.12.10.1.4"]="crlBag",t.crlBag="1.2.840.113549.1.12.10.1.4",t["1.2.840.113549.1.12.10.1.5"]="secretBag",t.secretBag="1.2.840.113549.1.12.10.1.5",t["1.2.840.113549.1.12.10.1.6"]="safeContentsBag",t.safeContentsBag="1.2.840.113549.1.12.10.1.6",t["1.2.840.113549.1.5.13"]="pkcs5PBES2",t.pkcs5PBES2="1.2.840.113549.1.5.13",t["1.2.840.113549.1.5.12"]="pkcs5PBKDF2",t.pkcs5PBKDF2="1.2.840.113549.1.5.12",t["1.2.840.113549.1.12.1.1"]="pbeWithSHAAnd128BitRC4",t.pbeWithSHAAnd128BitRC4="1.2.840.113549.1.12.1.1",t["1.2.840.113549.1.12.1.2"]="pbeWithSHAAnd40BitRC4",t.pbeWithSHAAnd40BitRC4="1.2.840.113549.1.12.1.2",t["1.2.840.113549.1.12.1.3"]="pbeWithSHAAnd3-KeyTripleDES-CBC",t["pbeWithSHAAnd3-KeyTripleDES-CBC"]="1.2.840.113549.1.12.1.3",t["1.2.840.113549.1.12.1.4"]="pbeWithSHAAnd2-KeyTripleDES-CBC",t["pbeWithSHAAnd2-KeyTripleDES-CBC"]="1.2.840.113549.1.12.1.4",t["1.2.840.113549.1.12.1.5"]="pbeWithSHAAnd128BitRC2-CBC",t["pbeWithSHAAnd128BitRC2-CBC"]="1.2.840.113549.1.12.1.5",t["1.2.840.113549.1.12.1.6"]="pbewithSHAAnd40BitRC2-CBC",t["pbewithSHAAnd40BitRC2-CBC"]="1.2.840.113549.1.12.1.6",t["1.2.840.113549.3.7"]="des-EDE3-CBC",t["des-EDE3-CBC"]="1.2.840.113549.3.7",t["2.16.840.1.101.3.4.1.2"]="aes128-CBC",t["aes128-CBC"]="2.16.840.1.101.3.4.1.2",t["2.16.840.1.101.3.4.1.22"]="aes192-CBC",t["aes192-CBC"]="2.16.840.1.101.3.4.1.22",t["2.16.840.1.101.3.4.1.42"]="aes256-CBC",t["aes256-CBC"]="2.16.840.1.101.3.4.1.42",t["2.5.4.3"]="commonName",t.commonName="2.5.4.3",t["2.5.4.5"]="serialName",t.serialName="2.5.4.5",t["2.5.4.6"]="countryName",t.countryName="2.5.4.6",t["2.5.4.7"]="localityName",t.localityName="2.5.4.7",t["2.5.4.8"]="stateOrProvinceName",t.stateOrProvinceName="2.5.4.8",t["2.5.4.10"]="organizationName",t.organizationName="2.5.4.10",t["2.5.4.11"]="organizationalUnitName",t.organizationalUnitName="2.5.4.11",t["2.16.840.1.113730.1.1"]="nsCertType",t.nsCertType="2.16.840.1.113730.1.1",t["2.5.29.1"]="authorityKeyIdentifier",t["2.5.29.2"]="keyAttributes",t["2.5.29.3"]="certificatePolicies",t["2.5.29.4"]="keyUsageRestriction",t["2.5.29.5"]="policyMapping",t["2.5.29.6"]="subtreesConstraint",t["2.5.29.7"]="subjectAltName",t["2.5.29.8"]="issuerAltName",t["2.5.29.9"]="subjectDirectoryAttributes",t["2.5.29.10"]="basicConstraints",t["2.5.29.11"]="nameConstraints",t["2.5.29.12"]="policyConstraints",t["2.5.29.13"]="basicConstraints",t["2.5.29.14"]="subjectKeyIdentifier",t.subjectKeyIdentifier="2.5.29.14",t["2.5.29.15"]="keyUsage",t.keyUsage="2.5.29.15",t["2.5.29.16"]="privateKeyUsagePeriod",t["2.5.29.17"]="subjectAltName",t.subjectAltName="2.5.29.17",t["2.5.29.18"]="issuerAltName",t.issuerAltName="2.5.29.18",t["2.5.29.19"]="basicConstraints",t.basicConstraints="2.5.29.19",t["2.5.29.20"]="cRLNumber",t["2.5.29.21"]="cRLReason",t["2.5.29.22"]="expirationDate",t["2.5.29.23"]="instructionCode",t["2.5.29.24"]="invalidityDate",t["2.5.29.25"]="cRLDistributionPoints",t["2.5.29.26"]="issuingDistributionPoint",t["2.5.29.27"]="deltaCRLIndicator",t["2.5.29.28"]="issuingDistributionPoint",t["2.5.29.29"]="certificateIssuer",t["2.5.29.30"]="nameConstraints",t["2.5.29.31"]="cRLDistributionPoints",t["2.5.29.32"]="certificatePolicies",t["2.5.29.33"]="policyMappings",t["2.5.29.34"]="policyConstraints",t["2.5.29.35"]="authorityKeyIdentifier",t["2.5.29.36"]="policyConstraints",t["2.5.29.37"]="extKeyUsage",t.extKeyUsage="2.5.29.37",t["2.5.29.46"]="freshestCRL",t["2.5.29.54"]="inhibitAnyPolicy",t["1.3.6.1.5.5.7.3.1"]="serverAuth",t.serverAuth="1.3.6.1.5.5.7.3.1",t["1.3.6.1.5.5.7.3.2"]="clientAuth",t.clientAuth="1.3.6.1.5.5.7.3.2",t["1.3.6.1.5.5.7.3.3"]="codeSigning",t.codeSigning="1.3.6.1.5.5.7.3.3",t["1.3.6.1.5.5.7.3.4"]="emailProtection",t.emailProtection="1.3.6.1.5.5.7.3.4",t["1.3.6.1.5.5.7.3.8"]="timeStamping",t.timeStamping="1.3.6.1.5.5.7.3.8"}var r="oids";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/oids",["require","module"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.asn1=e.asn1||{};t.Class={UNIVERSAL:0,APPLICATION:64,CONTEXT_SPECIFIC:128,PRIVATE:192},t.Type={NONE:0,BOOLEAN:1,INTEGER:2,BITSTRING:3,OCTETSTRING:4,NULL:5,OID:6,ODESC:7,EXTERNAL:8,REAL:9,ENUMERATED:10,EMBEDDED:11,UTF8:12,ROID:13,SEQUENCE:16,SET:17,PRINTABLESTRING:19,IA5STRING:22,UTCTIME:23,GENERALIZEDTIME:24,BMPSTRING:30},t.create=function(t,n,r,i){if(e.util.isArray(i)){var s=[];for(var o=0;o<i.length;++o)i[o]!==undefined&&s.push(i[o]);i=s}return{tagClass:t,type:n,constructed:r,composed:r||e.util.isArray(i),value:i}};var n=function(e){var t=e.getByte();if(t===128)return undefined;var n,r=t&128;return r?n=e.getInt((t&127)<<3):n=t,n};t.fromDer=function(r,i){i===undefined&&(i=!0),typeof r=="string"&&(r=e.util.createBuffer(r));if(r.length()<2){var s=new Error("Too few bytes to parse DER.");throw s.bytes=r.length(),s}var o=r.getByte(),u=o&192,a=o&31,f=n(r);if(r.length()<f){if(i){var s=new Error("Too few bytes to read ASN.1 value.");throw s.detail=r.length()+" < "+f,s}f=r.length()}var l,c=(o&32)===32,h=c;if(!h&&u===t.Class.UNIVERSAL&&a===t.Type.BITSTRING&&f>1){var p=r.read,d=r.getByte();if(d===0){o=r.getByte();var v=o&192;if(v===t.Class.UNIVERSAL||v===t.Class.CONTEXT_SPECIFIC)try{var m=n(r);h=m===f-(r.read-p),h&&(++p,--f)}catch(g){}}r.read=p}if(h){l=[];if(f===undefined)for(;;){if(r.bytes(2)===String.fromCharCode(0,0)){r.getBytes(2);break}l.push(t.fromDer(r,i))}else{var y=r.length();while(f>0)l.push(t.fromDer(r,i)),f-=y-r.length(),y=r.length()}}else{if(f===undefined){if(i)throw new Error("Non-constructed ASN.1 object of indefinite length.");f=r.length()}if(a===t.Type.BMPSTRING){l="";for(var b=0;b<f;b+=2)l+=String.fromCharCode(r.getInt16())}else l=r.getBytes(f)}return t.create(u,a,c,l)},t.toDer=function(n){var r=e.util.createBuffer(),i=n.tagClass|n.type,s=e.util.createBuffer();if(n.composed){n.constructed?i|=32:s.putByte(0);for(var o=0;o<n.value.length;++o)n.value[o]!==undefined&&s.putBuffer(t.toDer(n.value[o]))}else if(n.type===t.Type.BMPSTRING)for(var o=0;o<n.value.length;++o)s.putInt16(n.value.charCodeAt(o));else s.putBytes(n.value);r.putByte(i);if(s.length()<=127)r.putByte(s.length()&127);else{var u=s.length(),a="";do a+=String.fromCharCode(u&255),u>>>=8;while(u>0);r.putByte(a.length|128);for(var o=a.length-1;o>=0;--o)r.putByte(a.charCodeAt(o))}return r.putBuffer(s),r},t.oidToDer=function(t){var n=t.split("."),r=e.util.createBuffer();r.putByte(40*parseInt(n[0],10)+parseInt(n[1],10));var i,s,o,u;for(var a=2;a<n.length;++a){i=!0,s=[],o=parseInt(n[a],10);do u=o&127,o>>>=7,i||(u|=128),s.push(u),i=!1;while(o>0);for(var f=s.length-1;f>=0;--f)r.putByte(s[f])}return r},t.derToOid=function(t){var n;typeof t=="string"&&(t=e.util.createBuffer(t));var r=t.getByte();n=Math.floor(r/40)+"."+r%40;var i=0;while(t.length()>0)r=t.getByte(),i<<=7,r&128?i+=r&127:(n+="."+(i+r),i=0);return n},t.utcTimeToDate=function(e){var t=new Date,n=parseInt(e.substr(0,2),10);n=n>=50?1900+n:2e3+n;var r=parseInt(e.substr(2,2),10)-1,i=parseInt(e.substr(4,2),10),s=parseInt(e.substr(6,2),10),o=parseInt(e.substr(8,2),10),u=0;if(e.length>11){var a=e.charAt(10),f=10;a!=="+"&&a!=="-"&&(u=parseInt(e.substr(10,2),10),f+=2)}t.setUTCFullYear(n,r,i),t.setUTCHours(s,o,u,0);if(f){a=e.charAt(f);if(a==="+"||a==="-"){var l=parseInt(e.substr(f+1,2),10),c=parseInt(e.substr(f+4,2),10),h=l*60+c;h*=6e4,a==="+"?t.setTime(+t-h):t.setTime(+t+h)}}return t},t.generalizedTimeToDate=function(e){var t=new Date,n=parseInt(e.substr(0,4),10),r=parseInt(e.substr(4,2),10)-1,i=parseInt(e.substr(6,2),10),s=parseInt(e.substr(8,2),10),o=parseInt(e.substr(10,2),10),u=parseInt(e.substr(12,2),10),a=0,f=0,l=!1;e.charAt(e.length-1)==="Z"&&(l=!0);var c=e.length-5,h=e.charAt(c);if(h==="+"||h==="-"){var p=parseInt(e.substr(c+1,2),10),d=parseInt(e.substr(c+4,2),10);f=p*60+d,f*=6e4,h==="+"&&(f*=-1),l=!0}return e.charAt(14)==="."&&(a=parseFloat(e.substr(14),10)*1e3),l?(t.setUTCFullYear(n,r,i),t.setUTCHours(s,o,u,a),t.setTime(+t+f)):(t.setFullYear(n,r,i),t.setHours(s,o,u,a)),t},t.dateToUtcTime=function(e){var t="",n=[];n.push((""+e.getUTCFullYear()).substr(2)),n.push(""+(e.getUTCMonth()+1)),n.push(""+e.getUTCDate()),n.push(""+e.getUTCHours()),n.push(""+e.getUTCMinutes()),n.push(""+e.getUTCSeconds());for(var r=0;r<n.length;++r)n[r].length<2&&(t+="0"),t+=n[r];return t+="Z",t},t.integerToDer=function(t){var n=e.util.createBuffer();if(t>=-128&&t<128)return n.putSignedInt(t,8);if(t>=-32768&&t<32768)return n.putSignedInt(t,16);if(t>=-8388608&&t<8388608)return n.putSignedInt(t,24);if(t>=-2147483648&&t<2147483648)return n.putSignedInt(t,32);var r=new Error("Integer too large; max is 32-bits.");throw r.integer=t,r},t.derToInteger=function(t){typeof t=="string"&&(t=e.util.createBuffer(t));var n=t.length()*8;if(n>32)throw new Error("Integer too large; max is 32-bits.");return t.getSignedInt(n)},t.validate=function(n,r,i,s){var o=!1;if(n.tagClass!==r.tagClass&&typeof r.tagClass!="undefined"||n.type!==r.type&&typeof r.type!="undefined")s&&(n.tagClass!==r.tagClass&&s.push("["+r.name+"] "+'Expected tag class "'+r.tagClass+'", got "'+n.tagClass+'"'),n.type!==r.type&&s.push("["+r.name+"] "+'Expected type "'+r.type+'", got "'+n.type+'"'));else if(n.constructed===r.constructed||typeof r.constructed=="undefined"){o=!0;if(r.value&&e.util.isArray(r.value)){var u=0;for(var a=0;o&&a<r.value.length;++a)o=r.value[a].optional||!1,n.value[u]&&(o=t.validate(n.value[u],r.value[a],i,s),o?++u:r.value[a].optional&&(o=!0)),!o&&s&&s.push("["+r.name+"] "+'Tag class "'+r.tagClass+'", type "'+r.type+'" expected value length "'+r.value.length+'", got "'+n.value.length+'"')}o&&i&&(r.capture&&(i[r.capture]=n.value),r.captureAsn1&&(i[r.captureAsn1]=n))}else s&&s.push("["+r.name+"] "+'Expected constructed "'+r.constructed+'", got "'+n.constructed+'"');return o};var r=/[^\\u0000-\\u00ff]/;t.prettyPrint=function(n,i,s){var o="";i=i||0,s=s||2,i>0&&(o+="\n");var u="";for(var a=0;a<i*s;++a)u+=" ";o+=u+"Tag: ";switch(n.tagClass){case t.Class.UNIVERSAL:o+="Universal:";break;case t.Class.APPLICATION:o+="Application:";break;case t.Class.CONTEXT_SPECIFIC:o+="Context-Specific:";break;case t.Class.PRIVATE:o+="Private:"}if(n.tagClass===t.Class.UNIVERSAL){o+=n.type;switch(n.type){case t.Type.NONE:o+=" (None)";break;case t.Type.BOOLEAN:o+=" (Boolean)";break;case t.Type.BITSTRING:o+=" (Bit string)";break;case t.Type.INTEGER:o+=" (Integer)";break;case t.Type.OCTETSTRING:o+=" (Octet string)";break;case t.Type.NULL:o+=" (Null)";break;case t.Type.OID:o+=" (Object Identifier)";break;case t.Type.ODESC:o+=" (Object Descriptor)";break;case t.Type.EXTERNAL:o+=" (External or Instance of)";break;case t.Type.REAL:o+=" (Real)";break;case t.Type.ENUMERATED:o+=" (Enumerated)";break;case t.Type.EMBEDDED:o+=" (Embedded PDV)";break;case t.Type.UTF8:o+=" (UTF8)";break;case t.Type.ROID:o+=" (Relative Object Identifier)";break;case t.Type.SEQUENCE:o+=" (Sequence)";break;case t.Type.SET:o+=" (Set)";break;case t.Type.PRINTABLESTRING:o+=" (Printable String)";break;case t.Type.IA5String:o+=" (IA5String (ASCII))";break;case t.Type.UTCTIME:o+=" (UTC time)";break;case t.Type.GENERALIZEDTIME:o+=" (Generalized time)";break;case t.Type.BMPSTRING:o+=" (BMP String)"}}else o+=n.type;o+="\n",o+=u+"Constructed: "+n.constructed+"\n";if(n.composed){var f=0,l="";for(var a=0;a<n.value.length;++a)n.value[a]!==undefined&&(f+=1,l+=t.prettyPrint(n.value[a],i+1,s),a+1<n.value.length&&(l+=","));o+=u+"Sub values: "+f+l}else{o+=u+"Value: ";if(n.type===t.Type.OID){var c=t.derToOid(n.value);o+=c,e.pki&&e.pki.oids&&c in e.pki.oids&&(o+=" ("+e.pki.oids[c]+") ")}if(n.type===t.Type.INTEGER)try{o+=t.derToInteger(n.value)}catch(h){o+="0x"+e.util.bytesToHex(n.value)}else n.type===t.Type.OCTETSTRING?(r.test(n.value)||(o+="("+n.value+") "),o+="0x"+e.util.bytesToHex(n.value)):n.type===t.Type.UTF8?o+=e.util.decodeUtf8(n.value):n.type===t.Type.PRINTABLESTRING||n.type===t.Type.IA5String?o+=n.value:r.test(n.value)?o+="0x"+e.util.bytesToHex(n.value):n.value.length===0?o+="[null]":o+=n.value}return o}}var r="asn1";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/asn1",["require","module","./util","./oids"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function u(){n=String.fromCharCode(128),n+=e.util.fillString(String.fromCharCode(0),64),r=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,1,6,11,0,5,10,15,4,9,14,3,8,13,2,7,12,5,8,11,14,1,4,7,10,13,0,3,6,9,12,15,2,0,7,14,5,12,3,10,1,8,15,6,13,4,11,2,9],i=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],s=new Array(64);for(var t=0;t<64;++t)s[t]=Math.floor(Math.abs(Math.sin(t+1))*4294967296);o=!0}function a(e,t,n){var o,u,a,f,l,c,h,p,d=n.length();while(d>=64){u=e.h0,a=e.h1,f=e.h2,l=e.h3;for(p=0;p<16;++p)t[p]=n.getInt32Le(),c=l^a&(f^l),o=u+c+s[p]+t[p],h=i[p],u=l,l=f,f=a,a+=o<<h|o>>>32-h;for(;p<32;++p)c=f^l&(a^f),o=u+c+s[p]+t[r[p]],h=i[p],u=l,l=f,f=a,a+=o<<h|o>>>32-h;for(;p<48;++p)c=a^f^l,o=u+c+s[p]+t[r[p]],h=i[p],u=l,l=f,f=a,a+=o<<h|o>>>32-h;for(;p<64;++p)c=f^(a|~l),o=u+c+s[p]+t[r[p]],h=i[p],u=l,l=f,f=a,a+=o<<h|o>>>32-h;e.h0=e.h0+u|0,e.h1=e.h1+a|0,e.h2=e.h2+f|0,e.h3=e.h3+l|0,d-=64}}var t=e.md5=e.md5||{};e.md=e.md||{},e.md.algorithms=e.md.algorithms||{},e.md.md5=e.md.algorithms.md5=t,t.create=function(){o||u();var t=null,r=e.util.createBuffer(),i=new Array(16),s={algorithm:"md5",blockLength:64,digestLength:16,messageLength:0,messageLength64:[0,0]};return s.start=function(){return s.messageLength=0,s.messageLength64=[0,0],r=e.util.createBuffer(),t={h0:1732584193,h1:4023233417,h2:2562383102,h3:271733878},s},s.start(),s.update=function(n,o){return o==="utf8"&&(n=e.util.encodeUtf8(n)),s.messageLength+=n.length,s.messageLength64[0]+=n.length/4294967296>>>0,s.messageLength64[1]+=n.length>>>0,r.putBytes(n),a(t,i,r),(r.read>2048||r.length()===0)&&r.compact(),s},s.digest=function(){var o=e.util.createBuffer();o.putBytes(r.bytes()),o.putBytes(n.substr(0,64-(s.messageLength64[1]+8&63))),o.putInt32Le(s.messageLength64[1]<<3),o.putInt32Le(s.messageLength64[0]<<3|s.messageLength64[0]>>>28);var u={h0:t.h0,h1:t.h1,h2:t.h2,h3:t.h3};a(u,i,o);var f=e.util.createBuffer();return f.putInt32Le(u.h0),f.putInt32Le(u.h1),f.putInt32Le(u.h2),f.putInt32Le(u.h3),f},s};var n=null,r=null,i=null,s=null,o=!1}var r="md5";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/md5",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function i(){n=String.fromCharCode(128),n+=e.util.fillString(String.fromCharCode(0),64),r=!0}function s(e,t,n){var r,i,s,o,u,a,f,l,c=n.length();while(c>=64){i=e.h0,s=e.h1,o=e.h2,u=e.h3,a=e.h4;for(l=0;l<16;++l)r=n.getInt32(),t[l]=r,f=u^s&(o^u),r=(i<<5|i>>>27)+f+a+1518500249+r,a=u,u=o,o=s<<30|s>>>2,s=i,i=r;for(;l<20;++l)r=t[l-3]^t[l-8]^t[l-14]^t[l-16],r=r<<1|r>>>31,t[l]=r,f=u^s&(o^u),r=(i<<5|i>>>27)+f+a+1518500249+r,a=u,u=o,o=s<<30|s>>>2,s=i,i=r;for(;l<32;++l)r=t[l-3]^t[l-8]^t[l-14]^t[l-16],r=r<<1|r>>>31,t[l]=r,f=s^o^u,r=(i<<5|i>>>27)+f+a+1859775393+r,a=u,u=o,o=s<<30|s>>>2,s=i,i=r;for(;l<40;++l)r=t[l-6]^t[l-16]^t[l-28]^t[l-32],r=r<<2|r>>>30,t[l]=r,f=s^o^u,r=(i<<5|i>>>27)+f+a+1859775393+r,a=u,u=o,o=s<<30|s>>>2,s=i,i=r;for(;l<60;++l)r=t[l-6]^t[l-16]^t[l-28]^t[l-32],r=r<<2|r>>>30,t[l]=r,f=s&o|u&(s^o),r=(i<<5|i>>>27)+f+a+2400959708+r,a=u,u=o,o=s<<30|s>>>2,s=i,i=r;for(;l<80;++l)r=t[l-6]^t[l-16]^t[l-28]^t[l-32],r=r<<2|r>>>30,t[l]=r,f=s^o^u,r=(i<<5|i>>>27)+f+a+3395469782+r,a=u,u=o,o=s<<30|s>>>2,s=i,i=r;e.h0=e.h0+i|0,e.h1=e.h1+s|0,e.h2=e.h2+o|0,e.h3=e.h3+u|0,e.h4=e.h4+a|0,c-=64}}var t=e.sha1=e.sha1||{};e.md=e.md||{},e.md.algorithms=e.md.algorithms||{},e.md.sha1=e.md.algorithms.sha1=t,t.create=function(){r||i();var t=null,o=e.util.createBuffer(),u=new Array(80),a={algorithm:"sha1",blockLength:64,digestLength:20,messageLength:0,messageLength64:[0,0]};return a.start=function(){return a.messageLength=0,a.messageLength64=[0,0],o=e.util.createBuffer(),t={h0:1732584193,h1:4023233417,h2:2562383102,h3:271733878,h4:3285377520},a},a.start(),a.update=function(n,r){return r==="utf8"&&(n=e.util.encodeUtf8(n)),a.messageLength+=n.length,a.messageLength64[0]+=n.length/4294967296>>>0,a.messageLength64[1]+=n.length>>>0,o.putBytes(n),s(t,u,o),(o.read>2048||o.length()===0)&&o.compact(),a},a.digest=function(){var r=e.util.createBuffer();r.putBytes(o.bytes()),r.putBytes(n.substr(0,64-(a.messageLength64[1]+8&63))),r.putInt32(a.messageLength64[0]<<3|a.messageLength64[0]>>>28),r.putInt32(a.messageLength64[1]<<3);var i={h0:t.h0,h1:t.h1,h2:t.h2,h3:t.h3,h4:t.h4};s(i,u,r);var f=e.util.createBuffer();return f.putInt32(i.h0),f.putInt32(i.h1),f.putInt32(i.h2),f.putInt32(i.h3),f.putInt32(i.h4),f},a};var n=null,r=!1}var r="sha1";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/sha1",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function s(){n=String.fromCharCode(128),n+=e.util.fillString(String.fromCharCode(0),64),i=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298],r=!0}function o(e,t,n){var r,s,o,u,a,f,l,c,h,p,d,v,m,g,y,b=n.length();while(b>=64){for(l=0;l<16;++l)t[l]=n.getInt32();for(;l<64;++l)r=t[l-2],r=(r>>>17|r<<15)^(r>>>19|r<<13)^r>>>10,s=t[l-15],s=(s>>>7|s<<25)^(s>>>18|s<<14)^s>>>3,t[l]=r+t[l-7]+s+t[l-16]|0;c=e.h0,h=e.h1,p=e.h2,d=e.h3,v=e.h4,m=e.h5,g=e.h6,y=e.h7;for(l=0;l<64;++l)u=(v>>>6|v<<26)^(v>>>11|v<<21)^(v>>>25|v<<7),a=g^v&(m^g),o=(c>>>2|c<<30)^(c>>>13|c<<19)^(c>>>22|c<<10),f=c&h|p&(c^h),r=y+u+a+i[l]+t[l],s=o+f,y=g,g=m,m=v,v=d+r|0,d=p,p=h,h=c,c=r+s|0;e.h0=e.h0+c|0,e.h1=e.h1+h|0,e.h2=e.h2+p|0,e.h3=e.h3+d|0,e.h4=e.h4+v|0,e.h5=e.h5+m|0,e.h6=e.h6+g|0,e.h7=e.h7+y|0,b-=64}}var t=e.sha256=e.sha256||{};e.md=e.md||{},e.md.algorithms=e.md.algorithms||{},e.md.sha256=e.md.algorithms.sha256=t,t.create=function(){r||s();var t=null,i=e.util.createBuffer(),u=new Array(64),a={algorithm:"sha256",blockLength:64,digestLength:32,messageLength:0,messageLength64:[0,0]};return a.start=function(){return a.messageLength=0,a.messageLength64=[0,0],i=e.util.createBuffer(),t={h0:1779033703,h1:3144134277,h2:1013904242,h3:2773480762,h4:1359893119,h5:2600822924,h6:528734635,h7:1541459225},a},a.start(),a.update=function(n,r){return r==="utf8"&&(n=e.util.encodeUtf8(n)),a.messageLength+=n.length,a.messageLength64[0]+=n.length/4294967296>>>0,a.messageLength64[1]+=n.length>>>0,i.putBytes(n),o(t,u,i),(i.read>2048||i.length()===0)&&i.compact(),a},a.digest=function(){var r=e.util.createBuffer();r.putBytes(i.bytes()),r.putBytes(n.substr(0,64-(a.messageLength64[1]+8&63))),r.putInt32(a.messageLength64[0]<<3|a.messageLength64[0]>>>28),r.putInt32(a.messageLength64[1]<<3);var s={h0:t.h0,h1:t.h1,h2:t.h2,h3:t.h3,h4:t.h4,h5:t.h5,h6:t.h6,h7:t.h7};o(s,u,r);var f=e.util.createBuffer();return f.putInt32(s.h0),f.putInt32(s.h1),f.putInt32(s.h2),f.putInt32(s.h3),f.putInt32(s.h4),f.putInt32(s.h5),f.putInt32(s.h6),f.putInt32(s.h7),f},a};var n=null,r=!1,i=null}var r="sha256";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/sha256",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function u(){r=String.fromCharCode(128),r+=e.util.fillString(String.fromCharCode(0),128),s=[[1116352408,3609767458],[1899447441,602891725],[3049323471,3964484399],[3921009573,2173295548],[961987163,4081628472],[1508970993,3053834265],[2453635748,2937671579],[2870763221,3664609560],[3624381080,2734883394],[310598401,1164996542],[607225278,1323610764],[1426881987,3590304994],[1925078388,4068182383],[2162078206,991336113],[2614888103,633803317],[3248222580,3479774868],[3835390401,2666613458],[4022224774,944711139],[264347078,2341262773],[604807628,2007800933],[770255983,1495990901],[1249150122,1856431235],[1555081692,3175218132],[1996064986,2198950837],[2554220882,3999719339],[2821834349,766784016],[2952996808,2566594879],[3210313671,3203337956],[3336571891,1034457026],[3584528711,2466948901],[113926993,3758326383],[338241895,168717936],[666307205,1188179964],[773529912,1546045734],[1294757372,1522805485],[1396182291,2643833823],[1695183700,2343527390],[1986661051,1014477480],[2177026350,1206759142],[2456956037,344077627],[2730485921,1290863460],[2820302411,3158454273],[3259730800,3505952657],[3345764771,106217008],[3516065817,3606008344],[3600352804,1432725776],[4094571909,1467031594],[275423344,851169720],[430227734,3100823752],[506948616,1363258195],[659060556,3750685593],[883997877,3785050280],[958139571,3318307427],[1322822218,3812723403],[1537002063,2003034995],[1747873779,3602036899],[1955562222,1575990012],[2024104815,1125592928],[2227730452,2716904306],[2361852424,442776044],[2428436474,593698344],[2756734187,3733110249],[3204031479,2999351573],[3329325298,3815920427],[3391569614,3928383900],[3515267271,566280711],[3940187606,3454069534],[4118630271,4000239992],[116418474,1914138554],[174292421,2731055270],[289380356,3203993006],[460393269,320620315],[685471733,587496836],[852142971,1086792851],[1017036298,365543100],[1126000580,2618297676],[1288033470,3409855158],[1501505948,4234509866],[1607167915,987167468],[1816402316,1246189591]],o={},o["SHA-512"]=[[1779033703,4089235720],[3144134277,2227873595],[1013904242,4271175723],[2773480762,1595750129],[1359893119,2917565137],[2600822924,725511199],[528734635,4215389547],[1541459225,327033209]],o["SHA-384"]=[[3418070365,3238371032],[1654270250,914150663],[2438529370,812702999],[355462360,4144912697],[1731405415,4290775857],[2394180231,1750603025],[3675008525,1694076839],[1203062813,3204075428]],o["SHA-512/256"]=[[573645204,4230739756],[2673172387,3360449730],[596883563,1867755857],[2520282905,1497426621],[2519219938,2827943907],[3193839141,1401305490],[721525244,746961066],[246885852,2177182882]],o["SHA-512/224"]=[[2352822216,424955298],[1944164710,2312950998],[502970286,855612546],[1738396948,1479516111],[258812777,2077511080],[2011393907,79989058],[1067287976,1780299464],[286451373,2446758561]],i=!0}function a(e,t,n){var r,i,o,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T,N,C,k,L,A,O,M,_,D,P,H,B,j,F,I=n.length();while(I>=128){for(_=0;_<16;++_)t[_][0]=n.getInt32()>>>0,t[_][1]=n.getInt32()>>>0;for(;_<80;++_)H=t[_-2],D=H[0],P=H[1],r=((D>>>19|P<<13)^(P>>>29|D<<3)^D>>>6)>>>0,i=((D<<13|P>>>19)^(P<<3|D>>>29)^(D<<26|P>>>6))>>>0,j=t[_-15],D=j[0],P=j[1],o=((D>>>1|P<<31)^(D>>>8|P<<24)^D>>>7)>>>0,u=((D<<31|P>>>1)^(D<<24|P>>>8)^(D<<25|P>>>7))>>>0,B=t[_-7],F=t[_-16],P=i+B[1]+u+F[1],t[_][0]=r+B[0]+o+F[0]+(P/4294967296>>>0)>>>0,t[_][1]=P>>>0;m=e[0][0],g=e[0][1],y=e[1][0],b=e[1][1],w=e[2][0],E=e[2][1],S=e[3][0],x=e[3][1],T=e[4][0],N=e[4][1],C=e[5][0],k=e[5][1],L=e[6][0],A=e[6][1],O=e[7][0],M=e[7][1];for(_=0;_<80;++_)l=((T>>>14|N<<18)^(T>>>18|N<<14)^(N>>>9|T<<23))>>>0,c=((T<<18|N>>>14)^(T<<14|N>>>18)^(N<<23|T>>>9))>>>0,h=(L^T&(C^L))>>>0,p=(A^N&(k^A))>>>0,a=((m>>>28|g<<4)^(g>>>2|m<<30)^(g>>>7|m<<25))>>>0,f=((m<<4|g>>>28)^(g<<30|m>>>2)^(g<<25|m>>>7))>>>0,d=(m&y|w&(m^y))>>>0,v=(g&b|E&(g^b))>>>0,P=M+c+p+s[_][1]+t[_][1],r=O+l+h+s[_][0]+t[_][0]+(P/4294967296>>>0)>>>0,i=P>>>0,P=f+v,o=a+d+(P/4294967296>>>0)>>>0,u=P>>>0,O=L,M=A,L=C,A=k,C=T,k=N,P=x+i,T=S+r+(P/4294967296>>>0)>>>0,N=P>>>0,S=w,x=E,w=y,E=b,y=m,b=g,P=i+u,m=r+o+(P/4294967296>>>0)>>>0,g=P>>>0;P=e[0][1]+g,e[0][0]=e[0][0]+m+(P/4294967296>>>0)>>>0,e[0][1]=P>>>0,P=e[1][1]+b,e[1][0]=e[1][0]+y+(P/4294967296>>>0)>>>0,e[1][1]=P>>>0,P=e[2][1]+E,e[2][0]=e[2][0]+w+(P/4294967296>>>0)>>>0,e[2][1]=P>>>0,P=e[3][1]+x,e[3][0]=e[3][0]+S+(P/4294967296>>>0)>>>0,e[3][1]=P>>>0,P=e[4][1]+N,e[4][0]=e[4][0]+T+(P/4294967296>>>0)>>>0,e[4][1]=P>>>0,P=e[5][1]+k,e[5][0]=e[5][0]+C+(P/4294967296>>>0)>>>0,e[5][1]=P>>>0,P=e[6][1]+A,e[6][0]=e[6][0]+L+(P/4294967296>>>0)>>>0,e[6][1]=P>>>0,P=e[7][1]+M,e[7][0]=e[7][0]+O+(P/4294967296>>>0)>>>0,e[7][1]=P>>>0,I-=128}}var t=e.sha512=e.sha512||{};e.md=e.md||{},e.md.algorithms=e.md.algorithms||{},e.md.sha512=e.md.algorithms.sha512=t;var n=e.sha384=e.sha512.sha384=e.sha512.sha384||{};n.create=function(){return t.create("SHA-384")},e.md.sha384=e.md.algorithms.sha384=n,e.sha512.sha256=e.sha512.sha256||{create:function(){return t.create("SHA-512/256")}},e.md["sha512/256"]=e.md.algorithms["sha512/256"]=e.sha512.sha256,e.sha512.sha224=e.sha512.sha224||{create:function(){return t.create("SHA-512/224")}},e.md["sha512/224"]=e.md.algorithms["sha512/224"]=e.sha512.sha224,t.create=function(t){i||u(),typeof t=="undefined"&&(t="SHA-512");if(t in o){var n=o[t],s=null,f=e.util.createBuffer(),l=new Array(80);for(var c=0;c<80;++c)l[c]=new Array(2);var h={algorithm:t.replace("-","").toLowerCase(),blockLength:128,digestLength:64,messageLength:0,messageLength128:[0,0,0,0]};return h.start=function(){h.messageLength=0,h.messageLength128=[0,0,0,0],f=e.util.createBuffer(),s=new Array(n.length);for(var t=0;t<n.length;++t)s[t]=n[t].slice(0);return h},h.start(),h.update=function(t,n){n==="utf8"&&(t=e.util.encodeUtf8(t)),h.messageLength+=t.length;var r=t.length;r=[r/4294967296>>>0,r>>>0];for(var i=3;i>=0;--i)h.messageLength128[i]+=r[1],r[1]=r[0]+(h.messageLength128[i]/4294967296>>>0),h.messageLength128[i]=h.messageLength128[i]>>>0,r[0]=r[1]/4294967296>>>0;return f.putBytes(t),a(s,l,f),(f.read>2048||f.length()===0)&&f.compact(),h},h.digest=function(){var n=e.util.createBuffer();n.putBytes(f.bytes()),n.putBytes(r.substr(0,128-(h.messageLength128[3]+16&127)));var i=[];for(var o=0;o<3;++o)i[o]=h.messageLength128[o]<<3|h.messageLength128[o-1]>>>28;i[3]=h.messageLength128[3]<<3,n.putInt32(i[0]),n.putInt32(i[1]),n.putInt32(i[2]),n.putInt32(i[3]);var u=new Array(s.length);for(var o=0;o<s.length;++o)u[o]=s[o].slice(0);a(u,l,n);var c=e.util.createBuffer(),p;t==="SHA-512"?p=u.length:t==="SHA-384"?p=u.length-2:p=u.length-4;for(var o=0;o<p;++o)c.putInt32(u[o][0]),(o!==p-1||t!=="SHA-512/224")&&c.putInt32(u[o][1]);return c},h}throw new Error("Invalid SHA-512 algorithm: "+t)};var r=null,i=!1,s=null,o=null}var r="sha512";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/sha512",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.md=e.md||{},e.md.algorithms={md5:e.md5,sha1:e.sha1,sha256:e.sha256},e.md.md5=e.md5,e.md.sha1=e.sha1,e.md.sha256=e.sha256}var r="md";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/md",["require","module","./md5","./sha1","./sha256","./sha512"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.hmac=e.hmac||{};t.create=function(){var t=null,n=null,r=null,i=null,s={};return s.start=function(s,o){if(s!==null)if(typeof s=="string"){s=s.toLowerCase();if(!(s in e.md.algorithms))throw new Error('Unknown hash algorithm "'+s+'"');n=e.md.algorithms[s].create()}else n=s;if(o===null)o=t;else{if(typeof o=="string")o=e.util.createBuffer(o);else if(e.util.isArray(o)){var u=o;o=e.util.createBuffer();for(var a=0;a<u.length;++a)o.putByte(u[a])}var f=o.length();f>n.blockLength&&(n.start(),n.update(o.bytes()),o=n.digest()),r=e.util.createBuffer(),i=e.util.createBuffer(),f=o.length();for(var a=0;a<f;++a){var u=o.at(a);r.putByte(54^u),i.putByte(92^u)}if(f<n.blockLength){var u=n.blockLength-f;for(var a=0;a<u;++a)r.putByte(54),i.putByte(92)}t=o,r=r.bytes(),i=i.bytes()}n.start(),n.update(r)},s.update=function(e){n.update(e)},s.getMac=function(){var e=n.digest().bytes();return n.start(),n.update(i),n.update(e),n.digest()},s.digest=s.getMac,s}}var r="hmac";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/hmac",["require","module","./md","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function n(e){var t=e.name+": ",n=[],r=function(e,t){return" "+t};for(var i=0;i<e.values.length;++i)n.push(e.values[i].replace(/^(\S+\r\n)/,r));t+=n.join(",")+"\r\n";var s=0,o=-1;for(var i=0;i<t.length;++i,++s)if(s>65&&o!==-1){var u=t[o];u===","?(++o,t=t.substr(0,o)+"\r\n "+t.substr(o)):t=t.substr(0,o)+"\r\n"+u+t.substr(o+1),s=i-o-1,o=-1,++i}else if(t[i]===" "||t[i]==="	"||t[i]===",")o=i;return t}function r(e){return e.replace(/^\s+/,"")}var t=e.pem=e.pem||{};t.encode=function(t,r){r=r||{};var i="-----BEGIN "+t.type+"-----\r\n",s;t.procType&&(s={name:"Proc-Type",values:[String(t.procType.version),t.procType.type]},i+=n(s)),t.contentDomain&&(s={name:"Content-Domain",values:[t.contentDomain]},i+=n(s)),t.dekInfo&&(s={name:"DEK-Info",values:[t.dekInfo.algorithm]},t.dekInfo.parameters&&s.values.push(t.dekInfo.parameters),i+=n(s));if(t.headers)for(var o=0;o<t.headers.length;++o)i+=n(t.headers[o]);return t.procType&&(i+="\r\n"),i+=e.util.encode64(t.body,r.maxline||64)+"\r\n",i+="-----END "+t.type+"-----\r\n",i},t.decode=function(t){var n=[],i=/\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g,s=/([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/,o=/\r?\n/,u;for(;;){u=i.exec(t);if(!u)break;var a={type:u[1],procType:null,contentDomain:null,dekInfo:null,headers:[],body:e.util.decode64(u[3])};n.push(a);if(!u[2])continue;var f=u[2].split(o),l=0;while(u&&l<f.length){var c=f[l].replace(/\s+$/,"");for(var h=l+1;h<f.length;++h){var p=f[h];if(!/\s/.test(p[0]))break;c+=p,l=h}u=c.match(s);if(u){var d={name:u[1],values:[]},v=u[2].split(",");for(var m=0;m<v.length;++m)d.values.push(r(v[m]));if(!a.procType){if(d.name!=="Proc-Type")throw new Error('Invalid PEM formatted message. The first encapsulated header must be "Proc-Type".');if(d.values.length!==2)throw new Error('Invalid PEM formatted message. The "Proc-Type" header must have two subfields.');a.procType={version:v[0],type:v[1]}}else if(!a.contentDomain&&d.name==="Content-Domain")a.contentDomain=v[0]||"";else if(!a.dekInfo&&d.name==="DEK-Info"){if(d.values.length===0)throw new Error('Invalid PEM formatted message. The "DEK-Info" header must have at least one subfield.');a.dekInfo={algorithm:v[0],parameters:v[1]||null}}else a.headers.push(d)}++l}if(a.procType==="ENCRYPTED"&&!a.dekInfo)throw new Error('Invalid PEM formatted message. The "DEK-Info" header must be present if "Proc-Type" is "ENCRYPTED".')}if(n.length===0)throw new Error("Invalid PEM formatted message.");return n}}var r="pem";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pem",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function t(t,n){var r=function(){return new e.des.Algorithm(t,n)};e.cipher.registerAlgorithm(t,r)}function l(e){var t=[0,4,536870912,536870916,65536,65540,536936448,536936452,512,516,536871424,536871428,66048,66052,536936960,536936964],n=[0,1,1048576,1048577,67108864,67108865,68157440,68157441,256,257,1048832,1048833,67109120,67109121,68157696,68157697],r=[0,8,2048,2056,16777216,16777224,16779264,16779272,0,8,2048,2056,16777216,16777224,16779264,16779272],i=[0,2097152,134217728,136314880,8192,2105344,134225920,136323072,131072,2228224,134348800,136445952,139264,2236416,134356992,136454144],s=[0,262144,16,262160,0,262144,16,262160,4096,266240,4112,266256,4096,266240,4112,266256],o=[0,1024,32,1056,0,1024,32,1056,33554432,33555456,33554464,33555488,33554432,33555456,33554464,33555488],u=[0,268435456,524288,268959744,2,268435458,524290,268959746,0,268435456,524288,268959744,2,268435458,524290,268959746],a=[0,65536,2048,67584,536870912,536936448,536872960,536938496,131072,196608,133120,198656,537001984,537067520,537004032,537069568],f=[0,262144,0,262144,2,262146,2,262146,33554432,33816576,33554432,33816576,33554434,33816578,33554434,33816578],l=[0,268435456,8,268435464,0,268435456,8,268435464,1024,268436480,1032,268436488,1024,268436480,1032,268436488],c=[0,32,0,32,1048576,1048608,1048576,1048608,8192,8224,8192,8224,1056768,1056800,1056768,1056800],h=[0,16777216,512,16777728,2097152,18874368,2097664,18874880,67108864,83886080,67109376,83886592,69206016,85983232,69206528,85983744],p=[0,4096,134217728,134221824,524288,528384,134742016,134746112,16,4112,134217744,134221840,524304,528400,134742032,134746128],d=[0,4,256,260,0,4,256,260,1,5,257,261,1,5,257,261],v=e.length()>8?3:1,m=[],g=[0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],y=0,b;for(var w=0;w<v;w++){var E=e.getInt32(),S=e.getInt32();b=(E>>>4^S)&252645135,S^=b,E^=b<<4,b=(S>>>-16^E)&65535,E^=b,S^=b<<-16,b=(E>>>2^S)&858993459,S^=b,E^=b<<2,b=(S>>>-16^E)&65535,E^=b,S^=b<<-16,b=(E>>>1^S)&1431655765,S^=b,E^=b<<1,b=(S>>>8^E)&16711935,E^=b,S^=b<<8,b=(E>>>1^S)&1431655765,S^=b,E^=b<<1,b=E<<8|S>>>20&240,E=S<<24|S<<8&16711680|S>>>8&65280|S>>>24&240,S=b;for(var x=0;x<g.length;++x){g[x]?(E=E<<2|E>>>26,S=S<<2|S>>>26):(E=E<<1|E>>>27,S=S<<1|S>>>27),E&=-15,S&=-15;var T=t[E>>>28]|n[E>>>24&15]|r[E>>>20&15]|i[E>>>16&15]|s[E>>>12&15]|o[E>>>8&15]|u[E>>>4&15],N=a[S>>>28]|f[S>>>24&15]|l[S>>>20&15]|c[S>>>16&15]|h[S>>>12&15]|p[S>>>8&15]|d[S>>>4&15];b=(N>>>16^T)&65535,m[y++]=T^b,m[y++]=N^b<<16}}return m}function c(e,t,l,c){var h=e.length===32?3:9,p;h===3?p=c?[30,-2,-2]:[0,32,2]:p=c?[94,62,-2,32,64,2,30,-2,-2]:[0,32,2,62,30,-2,64,96,2];var d,v=t[0],m=t[1];d=(v>>>4^m)&252645135,m^=d,v^=d<<4,d=(v>>>16^m)&65535,m^=d,v^=d<<16,d=(m>>>2^v)&858993459,v^=d,m^=d<<2,d=(m>>>8^v)&16711935,v^=d,m^=d<<8,d=(v>>>1^m)&1431655765,m^=d,v^=d<<1,v=v<<1|v>>>31,m=m<<1|m>>>31;for(var g=0;g<h;g+=3){var y=p[g+1],b=p[g+2];for(var w=p[g];w!=y;w+=b){var E=m^e[w],S=(m>>>4|m<<28)^e[w+1];d=v,v=m,m=d^(r[E>>>24&63]|s[E>>>16&63]|u[E>>>8&63]|f[E&63]|n[S>>>24&63]|i[S>>>16&63]|o[S>>>8&63]|a[S&63])}d=v,v=m,m=d}v=v>>>1|v<<31,m=m>>>1|m<<31,d=(v>>>1^m)&1431655765,m^=d,v^=d<<1,d=(m>>>8^v)&16711935,v^=d,m^=d<<8,d=(m>>>2^v)&858993459,v^=d,m^=d<<2,d=(v>>>16^m)&65535,m^=d,v^=d<<16,d=(v>>>4^m)&252645135,m^=d,v^=d<<4,l[0]=v,l[1]=m}function h(t){t=t||{};var n=(t.mode||"CBC").toUpperCase(),r="DES-"+n,i;t.decrypt?i=e.cipher.createDecipher(r,t.key):i=e.cipher.createCipher(r,t.key);var s=i.start;return i.start=function(t,n){var r=null;n instanceof e.util.ByteBuffer&&(r=n,n={}),n=n||{},n.output=r,n.iv=t,s.call(i,n)},i}e.des=e.des||{},e.des.startEncrypting=function(e,t,n,r){var i=h({key:e,output:n,decrypt:!1,mode:r||(t===null?"ECB":"CBC")});return i.start(t),i},e.des.createEncryptionCipher=function(e,t){return h({key:e,output:null,decrypt:!1,mode:t})},e.des.startDecrypting=function(e,t,n,r){var i=h({key:e,output:n,decrypt:!0,mode:r||(t===null?"ECB":"CBC")});return i.start(t),i},e.des.createDecryptionCipher=function(e,t){return h({key:e,output:null,decrypt:!0,mode:t})},e.des.Algorithm=function(e,t){var n=this;n.name=e,n.mode=new t({blockSize:8,cipher:{encrypt:function(e,t){return c(n._keys,e,t,!1)},decrypt:function(e,t){return c(n._keys,e,t,!0)}}}),n._init=!1},e.des.Algorithm.prototype.initialize=function(t){if(this._init)return;var n=e.util.createBuffer(t.key);if(this.name.indexOf("3DES")===0&&n.length()!==24)throw new Error("Invalid Triple-DES key size: "+n.length()*8);this._keys=l(n),this._init=!0},t("DES-ECB",e.cipher.modes.ecb),t("DES-CBC",e.cipher.modes.cbc),t("DES-CFB",e.cipher.modes.cfb),t("DES-OFB",e.cipher.modes.ofb),t("DES-CTR",e.cipher.modes.ctr),t("3DES-ECB",e.cipher.modes.ecb),t("3DES-CBC",e.cipher.modes.cbc),t("3DES-CFB",e.cipher.modes.cfb),t("3DES-OFB",e.cipher.modes.ofb),t("3DES-CTR",e.cipher.modes.ctr);var n=[16843776,0,65536,16843780,16842756,66564,4,65536,1024,16843776,16843780,1024,16778244,16842756,16777216,4,1028,16778240,16778240,66560,66560,16842752,16842752,16778244,65540,16777220,16777220,65540,0,1028,66564,16777216,65536,16843780,4,16842752,16843776,16777216,16777216,1024,16842756,65536,66560,16777220,1024,4,16778244,66564,16843780,65540,16842752,16778244,16777220,1028,66564,16843776,1028,16778240,16778240,0,65540,66560,0,16842756],r=[-2146402272,-2147450880,32768,1081376,1048576,32,-2146435040,-2147450848,-2147483616,-2146402272,-2146402304,-2147483648,-2147450880,1048576,32,-2146435040,1081344,1048608,-2147450848,0,-2147483648,32768,1081376,-2146435072,1048608,-2147483616,0,1081344,32800,-2146402304,-2146435072,32800,0,1081376,-2146435040,1048576,-2147450848,-2146435072,-2146402304,32768,-2146435072,-2147450880,32,-2146402272,1081376,32,32768,-2147483648,32800,-2146402304,1048576,-2147483616,1048608,-2147450848,-2147483616,1048608,1081344,0,-2147450880,32800,-2147483648,-2146435040,-2146402272,1081344],i=[520,134349312,0,134348808,134218240,0,131592,134218240,131080,134217736,134217736,131072,134349320,131080,134348800,520,134217728,8,134349312,512,131584,134348800,134348808,131592,134218248,131584,131072,134218248,8,134349320,512,134217728,134349312,134217728,131080,520,131072,134349312,134218240,0,512,131080,134349320,134218240,134217736,512,0,134348808,134218248,131072,134217728,134349320,8,131592,131584,134217736,134348800,134218248,520,134348800,131592,8,134348808,131584],s=[8396801,8321,8321,128,8396928,8388737,8388609,8193,0,8396800,8396800,8396929,129,0,8388736,8388609,1,8192,8388608,8396801,128,8388608,8193,8320,8388737,1,8320,8388736,8192,8396928,8396929,129,8388736,8388609,8396800,8396929,129,0,0,8396800,8320,8388736,8388737,1,8396801,8321,8321,128,8396929,129,1,8192,8388609,8193,8396928,8388737,8193,8320,8388608,8396801,128,8388608,8192,8396928],o=[256,34078976,34078720,1107296512,524288,256,1073741824,34078720,1074266368,524288,33554688,1074266368,1107296512,1107820544,524544,1073741824,33554432,1074266112,1074266112,0,1073742080,1107820800,1107820800,33554688,1107820544,1073742080,0,1107296256,34078976,33554432,1107296256,524544,524288,1107296512,256,33554432,1073741824,34078720,1107296512,1074266368,33554688,1073741824,1107820544,34078976,1074266368,256,33554432,1107820544,1107820800,524544,1107296256,1107820800,34078720,0,1074266112,1107296256,524544,33554688,1073742080,524288,0,1074266112,34078976,1073742080],u=[536870928,541065216,16384,541081616,541065216,16,541081616,4194304,536887296,4210704,4194304,536870928,4194320,536887296,536870912,16400,0,4194320,536887312,16384,4210688,536887312,16,541065232,541065232,0,4210704,541081600,16400,4210688,541081600,536870912,536887296,16,541065232,4210688,541081616,4194304,16400,536870928,4194304,536887296,536870912,16400,536870928,541081616,4210688,541065216,4210704,541081600,0,541065232,16,16384,541065216,4210704,16384,4194320,536887312,0,541081600,536870912,4194320,536887312],a=[2097152,69206018,67110914,0,2048,67110914,2099202,69208064,69208066,2097152,0,67108866,2,67108864,69206018,2050,67110912,2099202,2097154,67110912,67108866,69206016,69208064,2097154,69206016,2048,2050,69208066,2099200,2,67108864,2099200,67108864,2099200,2097152,67110914,67110914,69206018,69206018,2,2097154,67108864,67110912,2097152,69208064,2050,2099202,69208064,2050,67108866,69208066,69206016,2099200,0,2,69208066,0,2099202,69206016,2048,67108866,67110912,2048,2097154],f=[268439616,4096,262144,268701760,268435456,268439616,64,268435456,262208,268697600,268701760,266240,268701696,266304,4096,64,268697600,268435520,268439552,4160,266240,262208,268697664,268701696,4160,0,0,268697664,268435520,268439552,266304,262144,266304,262144,268701696,4096,64,268697664,4096,266304,268439552,64,268435520,268697600,268697664,268435456,262144,268439616,0,268701760,262208,268435520,268697600,268439552,268439616,0,268701760,266240,266240,4160,4160,262208,268435456,268701696]}var r="des";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/des",["require","module","./cipher","./cipherModes","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.pkcs5=e.pkcs5||{};e.pbkdf2=t.pbkdf2=function(t,n,r,i,s){if(typeof s=="undefined"||s===null)s=e.md.sha1.create();var o=s.digestLength;if(i>4294967295*o)throw new Error("Derived key is too long.");var u=Math.ceil(i/o),a=i-(u-1)*o,f=e.hmac.create();f.start(s,t);var l="",c,h,p;for(var d=1;d<=u;++d){f.start(null,null),f.update(n),f.update(e.util.int32ToBytes(d)),c=p=f.digest().getBytes();for(var v=2;v<=r;++v)f.start(null,null),f.update(p),h=f.digest().getBytes(),c=e.util.xorBytes(c,h,o),p=h;l+=d<u?c:c.substr(0,a)}return l}}var r="pbkdf2";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pbkdf2",["require","module","./hmac","./md","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var n=typeof process!="undefined"&&process.versions&&process.versions.node,r=null;!e.disableNativeCode&&n&&!process.versions["node-webkit"]&&(r=t("crypto"));var i=e.prng=e.prng||{};i.create=function(t){function u(e){if(n.pools[0].messageLength>=32)return f(),e();var t=32-n.pools[0].messageLength<<5;n.seedFile(t,function(t,r){if(t)return e(t);n.collect(r),f(),e()})}function a(){if(n.pools[0].messageLength>=32)return f();var e=32-n.pools[0].messageLength<<5;n.collect(n.seedFileSync(e)),f()}function f(){var e=n.plugin.md.create();e.update(n.pools[0].digest().getBytes()),n.pools[0].start();var t=1;for(var r=1;r<32;++r)t=t===31?2147483648:t<<2,t%n.reseeds===0&&(e.update(n.pools[r].digest().getBytes()),n.pools[r].start());var i=e.digest().getBytes();e.start(),e.update(i);var s=e.digest().getBytes();n.key=n.plugin.formatKey(i),n.seed=n.plugin.formatSeed(s),n.reseeds=n.reseeds===4294967295?0:n.reseeds+1,n.generated=0}function l(t){var n=null;if(typeof window!="undefined"){var r=window.crypto||window.msCrypto;r&&r.getRandomValues&&(n=function(e){return r.getRandomValues(e)})}var i=e.util.createBuffer();if(n)while(i.length()<t){var s=Math.max(1,Math.min(t-i.length(),65536)/4),o=new Uint32Array(Math.floor(s));try{n(o);for(var u=0;u<o.length;++u)i.putInt32(o[u])}catch(a){if(!(typeof QuotaExceededError!="undefined"&&a instanceof QuotaExceededError))throw a}}if(i.length()<t){var f,l,c,h=Math.floor(Math.random()*65536);while(i.length()<t){l=16807*(h&65535),f=16807*(h>>16),l+=(f&32767)<<16,l+=f>>15,l=(l&2147483647)+(l>>31),h=l&4294967295;for(var u=0;u<3;++u)c=h>>>(u<<3),c^=Math.floor(Math.random()*256),i.putByte(String.fromCharCode(c&255))}}return i.getBytes(t)}var n={plugin:t,key:null,seed:null,time:null,reseeds:0,generated:0},i=t.md,s=new Array(32);for(var o=0;o<32;++o)s[o]=i.create();return n.pools=s,n.pool=0,n.generate=function(t,r){function l(c){if(c)return r(c);if(f.length()>=t)return r(null,f.getBytes(t));n.generated>1048575&&(n.key=null);if(n.key===null)return e.util.nextTick(function(){u(l)});var h=i(n.key,n.seed);n.generated+=h.length,f.putBytes(h),n.key=o(i(n.key,s(n.seed))),n.seed=a(i(n.key,n.seed)),e.util.setImmediate(l)}if(!r)return n.generateSync(t);var i=n.plugin.cipher,s=n.plugin.increment,o=n.plugin.formatKey,a=n.plugin.formatSeed,f=e.util.createBuffer();n.key=null,l()},n.generateSync=function(t){var r=n.plugin.cipher,i=n.plugin.increment,s=n.plugin.formatKey,o=n.plugin.formatSeed;n.key=null;var u=e.util.createBuffer();while(u.length()<t){n.generated>1048575&&(n.key=null),n.key===null&&a();var f=r(n.key,n.seed);n.generated+=f.length,u.putBytes(f),n.key=s(r(n.key,i(n.seed))),n.seed=o(r(n.key,n.seed))}return u.getBytes(t)},r?(n.seedFile=function(e,t){r.randomBytes(e,function(e,n){if(e)return t(e);t(null,n.toString())})},n.seedFileSync=function(e){return r.randomBytes(e).toString()}):(n.seedFile=function(e,t){try{t(null,l(e))}catch(n){t(n)}},n.seedFileSync=l),n.collect=function(e){var t=e.length;for(var r=0;r<t;++r)n.pools[n.pool].update(e.substr(r,1)),n.pool=n.pool===31?0:n.pool+1},n.collectInt=function(e,t){var r="";for(var i=0;i<t;i+=8)r+=String.fromCharCode(e>>i&255);n.collect(r)},n.registerWorker=function(e){if(e===self)n.seedFile=function(e,t){function n(e){var r=e.data;r.forge&&r.forge.prng&&(self.removeEventListener("message",n),t(r.forge.prng.err,r.forge.prng.bytes))}self.addEventListener("message",n),self.postMessage({forge:{prng:{needed:e}}})};else{var t=function(t){var r=t.data;r.forge&&r.forge.prng&&n.seedFile(r.forge.prng.needed,function(t,n){e.postMessage({forge:{prng:{err:t,bytes:n}}})})};e.addEventListener("message",t)}},n}}var r="prng";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/prng",["require","module","./md","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){if(e.random&&e.random.getBytes)return;(function(t){function s(){var t=e.prng.create(n);return t.getBytes=function(e,n){return t.generate(e,n)},t.getBytesSync=function(e){return t.generate(e)},t}var n={},r=new Array(4),i=e.util.createBuffer();n.formatKey=function(t){var n=e.util.createBuffer(t);return t=new Array(4),t[0]=n.getInt32(),t[1]=n.getInt32(),t[2]=n.getInt32(),t[3]=n.getInt32(),e.aes._expandKey(t,!1)},n.formatSeed=function(t){var n=e.util.createBuffer(t);return t=new Array(4),t[0]=n.getInt32(),t[1]=n.getInt32(),t[2]=n.getInt32(),t[3]=n.getInt32(),t},n.cipher=function(t,n){return e.aes._updateBlock(t,n,r,!1),i.putInt32(r[0]),i.putInt32(r[1]),i.putInt32(r[2]),i.putInt32(r[3]),i.getBytes()},n.increment=function(e){return++e[3],e},n.md=e.md.sha256;var o=s(),u=typeof process!="undefined"&&process.versions&&process.versions.node,a=null;if(typeof window!="undefined"){var f=window.crypto||window.msCrypto;f&&f.getRandomValues&&(a=function(e){return f.getRandomValues(e)})}if(e.disableNativeCode||!u&&!a){typeof window=="undefined"||window.document===undefined,o.collectInt(+(new Date),32);if(typeof navigator!="undefined"){var l="";for(var c in navigator)try{typeof navigator[c]=="string"&&(l+=navigator[c])}catch(h){}o.collect(l),l=null}t&&(t().mousemove(function(e){o.collectInt(e.clientX,16),o.collectInt(e.clientY,16)}),t().keypress(function(e){o.collectInt(e.charCode,8)}))}if(!e.random)e.random=o;else for(var c in o)e.random[c]=o[c];e.random.createInstance=s})(typeof jQuery!="undefined"?jQuery:null)}var r="random";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/random",["require","module","./aes","./md","./prng","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=[217,120,249,196,25,221,181,237,40,233,253,121,74,160,216,157,198,126,55,131,43,118,83,142,98,76,100,136,68,139,251,162,23,154,89,245,135,179,79,19,97,69,109,141,9,129,125,50,189,143,64,235,134,183,123,11,240,149,33,34,92,107,78,130,84,214,101,147,206,96,178,28,115,86,192,20,167,140,241,220,18,117,202,31,59,190,228,209,66,61,212,48,163,60,182,38,111,191,14,218,70,105,7,87,39,242,29,155,188,148,67,3,248,17,199,246,144,239,62,231,6,195,213,47,200,102,30,215,8,232,234,222,128,82,238,247,132,170,114,172,53,77,106,42,150,26,210,113,90,21,73,116,75,159,208,94,4,24,164,236,194,224,65,110,15,81,203,204,36,145,175,80,161,244,112,57,153,124,58,133,35,184,180,122,252,2,54,91,37,85,151,49,45,93,250,152,227,138,146,174,5,223,41,16,103,108,186,201,211,0,230,207,225,158,168,44,99,22,1,63,88,226,137,169,13,56,52,27,171,51,255,176,187,72,12,95,185,177,205,46,197,243,219,71,229,165,156,119,10,166,32,104,254,127,193,173],n=[1,2,3,5],r=function(e,t){return e<<t&65535|(e&65535)>>16-t},i=function(e,t){return(e&65535)>>t|e<<16-t&65535};e.rc2=e.rc2||{},e.rc2.expandKey=function(n,r){typeof n=="string"&&(n=e.util.createBuffer(n)),r=r||128;var i=n,s=n.length(),o=r,u=Math.ceil(o/8),a=255>>(o&7),f;for(f=s;f<128;f++)i.putByte(t[i.at(f-1)+i.at(f-s)&255]);i.setAt(128-u,t[i.at(128-u)&a]);for(f=127-u;f>=0;f--)i.setAt(f,t[i.at(f+1)^i.at(f+u)]);return i};var s=function(t,s,o){var u=!1,a=null,f=null,l=null,c,h,p,d,v=[];t=e.rc2.expandKey(t,s);for(p=0;p<64;p++)v.push(t.getInt16Le());o?(c=function(e){for(p=0;p<4;p++)e[p]+=v[d]+(e[(p+3)%4]&e[(p+2)%4])+(~e[(p+3)%4]&e[(p+1)%4]),e[p]=r(e[p],n[p]),d++},h=function(e){for(p=0;p<4;p++)e[p]+=v[e[(p+3)%4]&63]}):(c=function(e){for(p=3;p>=0;p--)e[p]=i(e[p],n[p]),e[p]-=v[d]+(e[(p+3)%4]&e[(p+2)%4])+(~e[(p+3)%4]&e[(p+1)%4]),d--},h=function(e){for(p=3;p>=0;p--)e[p]-=v[e[(p+3)%4]&63]});var m=function(e){var t=[];for(p=0;p<4;p++){var n=a.getInt16Le();l!==null&&(o?n^=l.getInt16Le():l.putInt16Le(n)),t.push(n&65535)}d=o?0:63;for(var r=0;r<e.length;r++)for(var i=0;i<e[r][0];i++)e[r][1](t);for(p=0;p<4;p++)l!==null&&(o?l.putInt16Le(t[p]):t[p]^=l.getInt16Le()),f.putInt16Le(t[p])},g=null;return g={start:function(t,n){t&&typeof t=="string"&&(t=e.util.createBuffer(t)),u=!1,a=e.util.createBuffer(),f=n||new e.util.createBuffer,l=t,g.output=f},update:function(e){u||a.putBuffer(e);while(a.length()>=8)m([[5,c],[1,h],[6,c],[1,h],[5,c]])},finish:function(e){var t=!0;if(o)if(e)t=e(8,a,!o);else{var n=a.length()===8?8:8-a.length();a.fillWithByte(n,n)}t&&(u=!0,g.update());if(!o){t=a.length()===0;if(t)if(e)t=e(8,f,!o);else{var r=f.length(),i=f.at(r-1);i>r?t=!1:f.truncate(i)}}return t}},g};e.rc2.startEncrypting=function(t,n,r){var i=e.rc2.createEncryptionCipher(t,128);return i.start(n,r),i},e.rc2.createEncryptionCipher=function(e,t){return s(e,t,!0)},e.rc2.startDecrypting=function(t,n,r){var i=e.rc2.createDecryptionCipher(t,128);return i.start(n,r),i},e.rc2.createDecryptionCipher=function(e,t){return s(e,t,!1)}}var r="rc2";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/rc2",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function i(e,t,n){this.data=[],e!=null&&("number"==typeof e?this.fromNumber(e,t,n):t==null&&"string"!=typeof e?this.fromString(e,256):this.fromString(e,t))}function s(){return new i(null)}function o(e,t,n,r,i,s){while(--s>=0){var o=t*this.data[e++]+n.data[r]+i;i=Math.floor(o/67108864),n.data[r++]=o&67108863}return i}function u(e,t,n,r,i,s){var o=t&32767,u=t>>15;while(--s>=0){var a=this.data[e]&32767,f=this.data[e++]>>15,l=u*a+f*o;a=o*a+((l&32767)<<15)+n.data[r]+(i&1073741823),i=(a>>>30)+(l>>>15)+u*f+(i>>>30),n.data[r++]=a&1073741823}return i}function a(e,t,n,r,i,s){var o=t&16383,u=t>>14;while(--s>=0){var a=this.data[e]&16383,f=this.data[e++]>>14,l=u*a+f*o;a=o*a+((l&16383)<<14)+n.data[r]+i,i=(a>>28)+(l>>14)+u*f,n.data[r++]=a&268435455}return i}function d(e){return l.charAt(e)}function v(e,t){var n=c[e.charCodeAt(t)];return n==null?-1:n}function m(e){for(var t=this.t-1;t>=0;--t)e.data[t]=this.data[t];e.t=this.t,e.s=this.s}function g(e){this.t=1,this.s=e<0?-1:0,e>0?this.data[0]=e:e<-1?this.data[0]=e+this.DV:this.t=0}function y(e){var t=s();return t.fromInt(e),t}function b(e,t){var n;if(t==16)n=4;else if(t==8)n=3;else if(t==256)n=8;else if(t==2)n=1;else if(t==32)n=5;else{if(t!=4){this.fromRadix(e,t);return}n=2}this.t=0,this.s=0;var r=e.length,s=!1,o=0;while(--r>=0){var u=n==8?e[r]&255:v(e,r);if(u<0){e.charAt(r)=="-"&&(s=!0);continue}s=!1,o==0?this.data[this.t++]=u:o+n>this.DB?(this.data[this.t-1]|=(u&(1<<this.DB-o)-1)<<o,this.data[this.t++]=u>>this.DB-o):this.data[this.t-1]|=u<<o,o+=n,o>=this.DB&&(o-=this.DB)}n==8&&(e[0]&128)!=0&&(this.s=-1,o>0&&(this.data[this.t-1]|=(1<<this.DB-o)-1<<o)),this.clamp(),s&&i.ZERO.subTo(this,this)}function w(){var e=this.s&this.DM;while(this.t>0&&this.data[this.t-1]==e)--this.t}function E(e){if(this.s<0)return"-"+this.negate().toString(e);var t;if(e==16)t=4;else if(e==8)t=3;else if(e==2)t=1;else if(e==32)t=5;else{if(e!=4)return this.toRadix(e);t=2}var n=(1<<t)-1,r,i=!1,s="",o=this.t,u=this.DB-o*this.DB%t;if(o-->0){u<this.DB&&(r=this.data[o]>>u)>0&&(i=!0,s=d(r));while(o>=0)u<t?(r=(this.data[o]&(1<<u)-1)<<t-u,r|=this.data[--o]>>(u+=this.DB-t)):(r=this.data[o]>>(u-=t)&n,u<=0&&(u+=this.DB,--o)),r>0&&(i=!0),i&&(s+=d(r))}return i?s:"0"}function S(){var e=s();return i.ZERO.subTo(this,e),e}function x(){return this.s<0?this.negate():this}function T(e){var t=this.s-e.s;if(t!=0)return t;var n=this.t;t=n-e.t;if(t!=0)return this.s<0?-t:t;while(--n>=0)if((t=this.data[n]-e.data[n])!=0)return t;return 0}function N(e){var t=1,n;return(n=e>>>16)!=0&&(e=n,t+=16),(n=e>>8)!=0&&(e=n,t+=8),(n=e>>4)!=0&&(e=n,t+=4),(n=e>>2)!=0&&(e=n,t+=2),(n=e>>1)!=0&&(e=n,t+=1),t}function C(){return this.t<=0?0:this.DB*(this.t-1)+N(this.data[this.t-1]^this.s&this.DM)}function k(e,t){var n;for(n=this.t-1;n>=0;--n)t.data[n+e]=this.data[n];for(n=e-1;n>=0;--n)t.data[n]=0;t.t=this.t+e,t.s=this.s}function L(e,t){for(var n=e;n<this.t;++n)t.data[n-e]=this.data[n];t.t=Math.max(this.t-e,0),t.s=this.s}function A(e,t){var n=e%this.DB,r=this.DB-n,i=(1<<r)-1,s=Math.floor(e/this.DB),o=this.s<<n&this.DM,u;for(u=this.t-1;u>=0;--u)t.data[u+s+1]=this.data[u]>>r|o,o=(this.data[u]&i)<<n;for(u=s-1;u>=0;--u)t.data[u]=0;t.data[s]=o,t.t=this.t+s+1,t.s=this.s,t.clamp()}function O(e,t){t.s=this.s;var n=Math.floor(e/this.DB);if(n>=this.t){t.t=0;return}var r=e%this.DB,i=this.DB-r,s=(1<<r)-1;t.data[0]=this.data[n]>>r;for(var o=n+1;o<this.t;++o)t.data[o-n-1]|=(this.data[o]&s)<<i,t.data[o-n]=this.data[o]>>r;r>0&&(t.data[this.t-n-1]|=(this.s&s)<<i),t.t=this.t-n,t.clamp()}function M(e,t){var n=0,r=0,i=Math.min(e.t,this.t);while(n<i)r+=this.data[n]-e.data[n],t.data[n++]=r&this.DM,r>>=this.DB;if(e.t<this.t){r-=e.s;while(n<this.t)r+=this.data[n],t.data[n++]=r&this.DM,r>>=this.DB;r+=this.s}else{r+=this.s;while(n<e.t)r-=e.data[n],t.data[n++]=r&this.DM,r>>=this.DB;r-=e.s}t.s=r<0?-1:0,r<-1?t.data[n++]=this.DV+r:r>0&&(t.data[n++]=r),t.t=n,t.clamp()}function _(e,t){var n=this.abs(),r=e.abs(),s=n.t;t.t=s+r.t;while(--s>=0)t.data[s]=0;for(s=0;s<r.t;++s)t.data[s+n.t]=n.am(0,r.data[s],t,s,0,n.t);t.s=0,t.clamp(),this.s!=e.s&&i.ZERO.subTo(t,t)}function D(e){var t=this.abs(),n=e.t=2*t.t;while(--n>=0)e.data[n]=0;for(n=0;n<t.t-1;++n){var r=t.am(n,t.data[n],e,2*n,0,1);(e.data[n+t.t]+=t.am(n+1,2*t.data[n],e,2*n+1,r,t.t-n-1))>=t.DV&&(e.data[n+t.t]-=t.DV,e.data[n+t.t+1]=1)}e.t>0&&(e.data[e.t-1]+=t.am(n,t.data[n],e,2*n,0,1)),e.s=0,e.clamp()}function P(e,t,n){var r=e.abs();if(r.t<=0)return;var o=this.abs();if(o.t<r.t){t!=null&&t.fromInt(0),n!=null&&this.copyTo(n);return}n==null&&(n=s());var u=s(),a=this.s,f=e.s,l=this.DB-N(r.data[r.t-1]);l>0?(r.lShiftTo(l,u),o.lShiftTo(l,n)):(r.copyTo(u),o.copyTo(n));var c=u.t,h=u.data[c-1];if(h==0)return;var p=h*(1<<this.F1)+(c>1?u.data[c-2]>>this.F2:0),d=this.FV/p,v=(1<<this.F1)/p,m=1<<this.F2,g=n.t,y=g-c,b=t==null?s():t;u.dlShiftTo(y,b),n.compareTo(b)>=0&&(n.data[n.t++]=1,n.subTo(b,n)),i.ONE.dlShiftTo(c,b),b.subTo(u,u);while(u.t<c)u.data[u.t++]=0;while(--y>=0){var w=n.data[--g]==h?this.DM:Math.floor(n.data[g]*d+(n.data[g-1]+m)*v);if((n.data[g]+=u.am(0,w,n,y,0,c))<w){u.dlShiftTo(y,b),n.subTo(b,n);while(n.data[g]<--w)n.subTo(b,n)}}t!=null&&(n.drShiftTo(c,t),a!=f&&i.ZERO.subTo(t,t)),n.t=c,n.clamp(),l>0&&n.rShiftTo(l,n),a<0&&i.ZERO.subTo(n,n)}function H(e){var t=s();return this.abs().divRemTo(e,null,t),this.s<0&&t.compareTo(i.ZERO)>0&&e.subTo(t,t),t}function B(e){this.m=e}function j(e){return e.s<0||e.compareTo(this.m)>=0?e.mod(this.m):e}function F(e){return e}function I(e){e.divRemTo(this.m,null,e)}function q(e,t,n){e.multiplyTo(t,n),this.reduce(n)}function R(e,t){e.squareTo(t),this.reduce(t)}function U(){if(this.t<1)return 0;var e=this.data[0];if((e&1)==0)return 0;var t=e&3;return t=t*(2-(e&15)*t)&15,t=t*(2-(e&255)*t)&255,t=t*(2-((e&65535)*t&65535))&65535,t=t*(2-e*t%this.DV)%this.DV,t>0?this.DV-t:-t}function z(e){this.m=e,this.mp=e.invDigit(),this.mpl=this.mp&32767,this.mph=this.mp>>15,this.um=(1<<e.DB-15)-1,this.mt2=2*e.t}function W(e){var t=s();return e.abs().dlShiftTo(this.m.t,t),t.divRemTo(this.m,null,t),e.s<0&&t.compareTo(i.ZERO)>0&&this.m.subTo(t,t),t}function X(e){var t=s();return e.copyTo(t),this.reduce(t),t}function V(e){while(e.t<=this.mt2)e.data[e.t++]=0;for(var t=0;t<this.m.t;++t){var n=e.data[t]&32767,r=n*this.mpl+((n*this.mph+(e.data[t]>>15)*this.mpl&this.um)<<15)&e.DM;n=t+this.m.t,e.data[n]+=this.m.am(0,r,e,t,0,this.m.t);while(e.data[n]>=e.DV)e.data[n]-=e.DV,e.data[++n]++}e.clamp(),e.drShiftTo(this.m.t,e),e.compareTo(this.m)>=0&&e.subTo(this.m,e)}function $(e,t){e.squareTo(t),this.reduce(t)}function J(e,t,n){e.multiplyTo(t,n),this.reduce(n)}function K(){return(this.t>0?this.data[0]&1:this.s)==0}function Q(e,t){if(e>4294967295||e<1)return i.ONE;var n=s(),r=s(),o=t.convert(this),u=N(e)-1;o.copyTo(n);while(--u>=0){t.sqrTo(n,r);if((e&1<<u)>0)t.mulTo(r,o,n);else{var a=n;n=r,r=a}}return t.revert(n)}function G(e,t){var n;return e<256||t.isEven()?n=new B(t):n=new z(t),this.exp(e,n)}function Y(){var e=s();return this.copyTo(e),e}function Z(){if(this.s<0){if(this.t==1)return this.data[0]-this.DV;if(this.t==0)return-1}else{if(this.t==1)return this.data[0];if(this.t==0)return 0}return(this.data[1]&(1<<32-this.DB)-1)<<this.DB|this.data[0]}function et(){return this.t==0?this.s:this.data[0]<<24>>24}function tt(){return this.t==0?this.s:this.data[0]<<16>>16}function nt(e){return Math.floor(Math.LN2*this.DB/Math.log(e))}function rt(){return this.s<0?-1:this.t<=0||this.t==1&&this.data[0]<=0?0:1}function it(e){e==null&&(e=10);if(this.signum()==0||e<2||e>36)return"0";var t=this.chunkSize(e),n=Math.pow(e,t),r=y(n),i=s(),o=s(),u="";this.divRemTo(r,i,o);while(i.signum()>0)u=(n+o.intValue()).toString(e).substr(1)+u,i.divRemTo(r,i,o);return o.intValue().toString(e)+u}function st(e,t){this.fromInt(0),t==null&&(t=10);var n=this.chunkSize(t),r=Math.pow(t,n),s=!1,o=0,u=0;for(var a=0;a<e.length;++a){var f=v(e,a);if(f<0){e.charAt(a)=="-"&&this.signum()==0&&(s=!0);continue}u=t*u+f,++o>=n&&(this.dMultiply(r),this.dAddOffset(u,0),o=0,u=0)}o>0&&(this.dMultiply(Math.pow(t,o)),this.dAddOffset(u,0)),s&&i.ZERO.subTo(this,this)}function ot(e,t,n){if("number"==typeof t)if(e<2)this.fromInt(1);else{this.fromNumber(e,n),this.testBit(e-1)||this.bitwiseTo(i.ONE.shiftLeft(e-1),dt,this),this.isEven()&&this.dAddOffset(1,0);while(!this.isProbablePrime(t))this.dAddOffset(2,0),this.bitLength()>e&&this.subTo(i.ONE.shiftLeft(e-1),this)}else{var r=new Array,s=e&7;r.length=(e>>3)+1,t.nextBytes(r),s>0?r[0]&=(1<<s)-1:r[0]=0,this.fromString(r,256)}}function ut(){var e=this.t,t=new Array;t[0]=this.s;var n=this.DB-e*this.DB%8,r,i=0;if(e-->0){n<this.DB&&(r=this.data[e]>>n)!=(this.s&this.DM)>>n&&(t[i++]=r|this.s<<this.DB-n);while(e>=0){n<8?(r=(this.data[e]&(1<<n)-1)<<8-n,r|=this.data[--e]>>(n+=this.DB-8)):(r=this.data[e]>>(n-=8)&255,n<=0&&(n+=this.DB,--e)),(r&128)!=0&&(r|=-256),i==0&&(this.s&128)!=(r&128)&&++i;if(i>0||r!=this.s)t[i++]=r}}return t}function at(e){return this.compareTo(e)==0}function ft(e){return this.compareTo(e)<0?this:e}function lt(e){return this.compareTo(e)>0?this:e}function ct(e,t,n){var r,i,s=Math.min(e.t,this.t);for(r=0;r<s;++r)n.data[r]=t(this.data[r],e.data[r]);if(e.t<this.t){i=e.s&this.DM;for(r=s;r<this.t;++r)n.data[r]=t(this.data[r],i);n.t=this.t}else{i=this.s&this.DM;for(r=s;r<e.t;++r)n.data[r]=t(i,e.data[r]);n.t=e.t}n.s=t(this.s,e.s),n.clamp()}function ht(e,t){return e&t}function pt(e){var t=s();return this.bitwiseTo(e,ht,t),t}function dt(e,t){return e|t}function vt(e){var t=s();return this.bitwiseTo(e,dt,t),t}function mt(e,t){return e^t}function gt(e){var t=s();return this.bitwiseTo(e,mt,t),t}function yt(e,t){return e&~t}function bt(e){var t=s();return this.bitwiseTo(e,yt,t),t}function wt(){var e=s();for(var t=0;t<this.t;++t)e.data[t]=this.DM&~this.data[t];return e.t=this.t,e.s=~this.s,e}function Et(e){var t=s();return e<0?this.rShiftTo(-e,t):this.lShiftTo(e,t),t}function St(e){var t=s();return e<0?this.lShiftTo(-e,t):this.rShiftTo(e,t),t}function xt(e){if(e==0)return-1;var t=0;return(e&65535)==0&&(e>>=16,t+=16),(e&255)==0&&(e>>=8,t+=8),(e&15)==0&&(e>>=4,t+=4),(e&3)==0&&(e>>=2,t+=2),(e&1)==0&&++t,t}function Tt(){for(var e=0;e<this.t;++e)if(this.data[e]!=0)return e*this.DB+xt(this.data[e]);return this.s<0?this.t*this.DB:-1}function Nt(e){var t=0;while(e!=0)e&=e-1,++t;return t}function Ct(){var e=0,t=this.s&this.DM;for(var n=0;n<this.t;++n)e+=Nt(this.data[n]^t);return e}function kt(e){var t=Math.floor(e/this.DB);return t>=this.t?this.s!=0:(this.data[t]&1<<e%this.DB)!=0}function Lt(e,t){var n=i.ONE.shiftLeft(e);return this.bitwiseTo(n,t,n),n}function At(e){return this.changeBit(e,dt)}function Ot(e){return this.changeBit(e,yt)}function Mt(e){return this.changeBit(e,mt)}function _t(e,t){var n=0,r=0,i=Math.min(e.t,this.t);while(n<i)r+=this.data[n]+e.data[n],t.data[n++]=r&this.DM,r>>=this.DB;if(e.t<this.t){r+=e.s;while(n<this.t)r+=this.data[n],t.data[n++]=r&this.DM,r>>=this.DB;r+=this.s}else{r+=this.s;while(n<e.t)r+=e.data[n],t.data[n++]=r&this.DM,r>>=this.DB;r+=e.s}t.s=r<0?-1:0,r>0?t.data[n++]=r:r<-1&&(t.data[n++]=this.DV+r),t.t=n,t.clamp()}function Dt(e){var t=s();return this.addTo(e,t),t}function Pt(e){var t=s();return this.subTo(e,t),t}function Ht(e){var t=s();return this.multiplyTo(e,t),t}function Bt(e){var t=s();return this.divRemTo(e,t,null),t}function jt(e){var t=s();return this.divRemTo(e,null,t),t}function Ft(e){var t=s(),n=s();return this.divRemTo(e,t,n),new Array(t,n)}function It(e){this.data[this.t]=this.am(0,e-1,this,0,0,this.t),++this.t,this.clamp()}function qt(e,t){if(e==0)return;while(this.t<=t)this.data[this.t++]=0;this.data[t]+=e;while(this.data[t]>=this.DV)this.data[t]-=this.DV,++t>=this.t&&(this.data[this.t++]=0),++this.data[t]}function Rt(){}function Ut(e){return e}function zt(e,t,n){e.multiplyTo(t,n)}function Wt(e,t){e.squareTo(t)}function Xt(e){return this.exp(e,new Rt)}function Vt(e,t,n){var r=Math.min(this.t+e.t,t);n.s=0,n.t=r;while(r>0)n.data[--r]=0;var i;for(i=n.t-this.t;r<i;++r)n.data[r+this.t]=this.am(0,e.data[r],n,r,0,this.t);for(i=Math.min(e.t,t);r<i;++r)this.am(0,e.data[r],n,r,0,t-r);n.clamp()}function $t(e,t,n){--t;var r=n.t=this.t+e.t-t;n.s=0;while(--r>=0)n.data[r]=0;for(r=Math.max(t-this.t,0);r<e.t;++r)n.data[this.t+r-t]=this.am(t-r,e.data[r],n,0,0,this.t+r-t);n.clamp(),n.drShiftTo(1,n)}function Jt(e){this.r2=s(),this.q3=s(),i.ONE.dlShiftTo(2*e.t,this.r2),this.mu=this.r2.divide(e),this.m=e}function Kt(e){if(e.s<0||e.t>2*this.m.t)return e.mod(this.m);if(e.compareTo(this.m)<0)return e;var t=s();return e.copyTo(t),this.reduce(t),t}function Qt(e){return e}function Gt(e){e.drShiftTo(this.m.t-1,this.r2),e.t>this.m.t+1&&(e.t=this.m.t+1,e.clamp()),this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3),this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);while(e.compareTo(this.r2)<0)e.dAddOffset(1,this.m.t+1);e.subTo(this.r2,e);while(e.compareTo(this.m)>=0)e.subTo(this.m,e)}function Yt(e,t){e.squareTo(t),this.reduce(t)}function Zt(e,t,n){e.multiplyTo(t,n),this.reduce(n)}function en(e,t){var n=e.bitLength(),r,i=y(1),o;if(n<=0)return i;n<18?r=1:n<48?r=3:n<144?r=4:n<768?r=5:r=6,n<8?o=new B(t):t.isEven()?o=new Jt(t):o=new z(t);var u=new Array,a=3,f=r-1,l=(1<<r)-1;u[1]=o.convert(this);if(r>1){var c=s();o.sqrTo(u[1],c);while(a<=l)u[a]=s(),o.mulTo(c,u[a-2],u[a]),a+=2}var h=e.t-1,p,d=!0,v=s(),m;n=N(e.data[h])-1;while(h>=0){n>=f?p=e.data[h]>>n-f&l:(p=(e.data[h]&(1<<n+1)-1)<<f-n,h>0&&(p|=e.data[h-1]>>this.DB+n-f)),a=r;while((p&1)==0)p>>=1,--a;(n-=a)<0&&(n+=this.DB,--h);if(d)u[p].copyTo(i),d=!1;else{while(a>1)o.sqrTo(i,v),o.sqrTo(v,i),a-=2;a>0?o.sqrTo(i,v):(m=i,i=v,v=m),o.mulTo(v,u[p],i)}while(h>=0&&(e.data[h]&1<<n)==0)o.sqrTo(i,v),m=i,i=v,v=m,--n<0&&(n=this.DB-1,--h)}return o.revert(i)}function tn(e){var t=this.s<0?this.negate():this.clone(),n=e.s<0?e.negate():e.clone();if(t.compareTo(n)<0){var r=t;t=n,n=r}var i=t.getLowestSetBit(),s=n.getLowestSetBit();if(s<0)return t;i<s&&(s=i),s>0&&(t.rShiftTo(s,t),n.rShiftTo(s,n));while(t.signum()>0)(i=t.getLowestSetBit())>0&&t.rShiftTo(i,t),(i=n.getLowestSetBit())>0&&n.rShiftTo(i,n),t.compareTo(n)>=0?(t.subTo(n,t),t.rShiftTo(1,t)):(n.subTo(t,n),n.rShiftTo(1,n));return s>0&&n.lShiftTo(s,n),n}function nn(e){if(e<=0)return 0;var t=this.DV%e,n=this.s<0?e-1:0;if(this.t>0)if(t==0)n=this.data[0]%e;else for(var r=this.t-1;r>=0;--r)n=(t*n+this.data[r])%e;return n}function rn(e){var t=e.isEven();if(this.isEven()&&t||e.signum()==0)return i.ZERO;var n=e.clone(),r=this.clone(),s=y(1),o=y(0),u=y(0),a=y(1);while(n.signum()!=0){while(n.isEven()){n.rShiftTo(1,n);if(t){if(!s.isEven()||!o.isEven())s.addTo(this,s),o.subTo(e,o);s.rShiftTo(1,s)}else o.isEven()||o.subTo(e,o);o.rShiftTo(1,o)}while(r.isEven()){r.rShiftTo(1,r);if(t){if(!u.isEven()||!a.isEven())u.addTo(this,u),a.subTo(e,a);u.rShiftTo(1,u)}else a.isEven()||a.subTo(e,a);a.rShiftTo(1,a)}n.compareTo(r)>=0?(n.subTo(r,n),t&&s.subTo(u,s),o.subTo(a,o)):(r.subTo(n,r),t&&u.subTo(s,u),a.subTo(o,a))}return r.compareTo(i.ONE)!=0?i.ZERO:a.compareTo(e)>=0?a.subtract(e):a.signum()<0?(a.addTo(e,a),a.signum()<0?a.add(e):a):a}function un(e){var t,n=this.abs();if(n.t==1&&n.data[0]<=sn[sn.length-1]){for(t=0;t<sn.length;++t)if(n.data[0]==sn[t])return!0;return!1}if(n.isEven())return!1;t=1;while(t<sn.length){var r=sn[t],i=t+1;while(i<sn.length&&r<on)r*=sn[i++];r=n.modInt(r);while(t<i)if(r%sn[t++]==0)return!1}return n.millerRabin(e)}function an(e){var t=this.subtract(i.ONE),n=t.getLowestSetBit();if(n<=0)return!1;var r=t.shiftRight(n),s=fn(),o;for(var u=0;u<e;++u){do o=new i(this.bitLength(),s);while(o.compareTo(i.ONE)<=0||o.compareTo(t)>=0);var a=o.modPow(r,this);if(a.compareTo(i.ONE)!=0&&a.compareTo(t)!=0){var f=1;while(f++<n&&a.compareTo(t)!=0){a=a.modPowInt(2,this);if(a.compareTo(i.ONE)==0)return!1}if(a.compareTo(t)!=0)return!1}}return!0}function fn(){return{nextBytes:function(e){for(var t=0;t<e.length;++t)e[t]=Math.floor(Math.random()*255)}}}var t,n=0xdeadbeefcafe,r=(n&16777215)==15715070;typeof navigator=="undefined"?(i.prototype.am=a,t=28):r&&navigator.appName=="Microsoft Internet Explorer"?(i.prototype.am=u,t=30):r&&navigator.appName!="Netscape"?(i.prototype.am=o,t=26):(i.prototype.am=a,t=28),i.prototype.DB=t,i.prototype.DM=(1<<t)-1,i.prototype.DV=1<<t;var f=52;i.prototype.FV=Math.pow(2,f),i.prototype.F1=f-t,i.prototype.F2=2*t-f;var l="0123456789abcdefghijklmnopqrstuvwxyz",c=new Array,h,p;h="0".charCodeAt(0);for(p=0;p<=9;++p)c[h++]=p;h="a".charCodeAt(0);for(p=10;p<36;++p)c[h++]=p;h="A".charCodeAt(0);for(p=10;p<36;++p)c[h++]=p;B.prototype.convert=j,B.prototype.revert=F,B.prototype.reduce=I,B.prototype.mulTo=q,B.prototype.sqrTo=R,z.prototype.convert=W,z.prototype.revert=X,z.prototype.reduce=V,z.prototype.mulTo=J,z.prototype.sqrTo=$,i.prototype.copyTo=m,i.prototype.fromInt=g,i.prototype.fromString=b,i.prototype.clamp=w,i.prototype.dlShiftTo=k,i.prototype.drShiftTo=L,i.prototype.lShiftTo=A,i.prototype.rShiftTo=O,i.prototype.subTo=M,i.prototype.multiplyTo=_,i.prototype.squareTo=D,i.prototype.divRemTo=P,i.prototype.invDigit=U,i.prototype.isEven=K,i.prototype.exp=Q,i.prototype.toString=E,i.prototype.negate=S,i.prototype.abs=x,i.prototype.compareTo=T,i.prototype.bitLength=C,i.prototype.mod=H,i.prototype.modPowInt=G,i.ZERO=y(0),i.ONE=y(1),Rt.prototype.convert=Ut,Rt.prototype.revert=Ut,Rt.prototype.mulTo=zt,Rt.prototype.sqrTo=Wt,Jt.prototype.convert=Kt,Jt.prototype.revert=Qt,Jt.prototype.reduce=Gt,Jt.prototype.mulTo=Zt,Jt.prototype.sqrTo=Yt;var sn=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509],on=(1<<26)/sn[sn.length-1];i.prototype.chunkSize=nt,i.prototype.toRadix=it,i.prototype.fromRadix=st,i.prototype.fromNumber=ot,i.prototype.bitwiseTo=ct,i.prototype.changeBit=Lt,i.prototype.addTo=_t,i.prototype.dMultiply=It,i.prototype.dAddOffset=qt,i.prototype.multiplyLowerTo=Vt,i.prototype.multiplyUpperTo=$t,i.prototype.modInt=nn,i.prototype.millerRabin=an,i.prototype.clone=Y,i.prototype.intValue=Z,i.prototype.byteValue=et,i.prototype.shortValue=tt,i.prototype.signum=rt,i.prototype.toByteArray=ut,i.prototype.equals=at,i.prototype.min=ft,i.prototype.max=lt,i.prototype.and=pt,i.prototype.or=vt,i.prototype.xor=gt,i.prototype.andNot=bt,i.prototype.not=wt,i.prototype.shiftLeft=Et,i.prototype.shiftRight=St,i.prototype.getLowestSetBit=Tt,i.prototype.bitCount=Ct,i.prototype.testBit=kt,i.prototype.setBit=At,i.prototype.clearBit=Ot,i.prototype.flipBit=Mt,i.prototype.add=Dt,i.prototype.subtract=Pt,i.prototype.multiply=Ht,i.prototype.divide=Bt,i.prototype.remainder=jt,i.prototype.divideAndRemainder=Ft,i.prototype.modPow=en,i.prototype.modInverse=rn,i.prototype.pow=Xt,i.prototype.gcd=tn,i.prototype.isProbablePrime=un,e.jsbn=e.jsbn||{},e.jsbn.BigInteger=i}var r="jsbn";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/jsbn",["require","module"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function n(t,n,r){r||(r=e.md.sha1.create());var i="",s=Math.ceil(n/r.digestLength);for(var o=0;o<s;++o){var u=String.fromCharCode(o>>24&255,o>>16&255,o>>8&255,o&255);r.start(),r.update(t+u),i+=r.digest().getBytes()}return i.substring(0,n)}var t=e.pkcs1=e.pkcs1||{};t.encode_rsa_oaep=function(t,r,i){var s,o,u,a;typeof i=="string"?(s=i,o=arguments[3]||undefined,u=arguments[4]||undefined):i&&(s=i.label||undefined,o=i.seed||undefined,u=i.md||undefined,i.mgf1&&i.mgf1.md&&(a=i.mgf1.md)),u?u.start():u=e.md.sha1.create(),a||(a=u);var f=Math.ceil(t.n.bitLength()/8),l=f-2*u.digestLength-2;if(r.length>l){var c=new Error("RSAES-OAEP input message length is too long.");throw c.length=r.length,c.maxLength=l,c}s||(s=""),u.update(s,"raw");var h=u.digest(),p="",d=l-r.length;for(var v=0;v<d;v++)p+="\0";var m=h.getBytes()+p+""+r;if(!o)o=e.random.getBytes(u.digestLength);else if(o.length!==u.digestLength){var c=new Error("Invalid RSAES-OAEP seed. The seed length must match the digest length.");throw c.seedLength=o.length,c.digestLength=u.digestLength,c}var g=n(o,f-u.digestLength-1,a),y=e.util.xorBytes(m,g,m.length),b=n(y,u.digestLength,a),w=e.util.xorBytes(o,b,o.length);return"\0"+w+y},t.decode_rsa_oaep=function(t,r,i){var s,o,u;typeof i=="string"?(s=i,o=arguments[3]||undefined):i&&(s=i.label||undefined,o=i.md||undefined,i.mgf1&&i.mgf1.md&&(u=i.mgf1.md));var a=Math.ceil(t.n.bitLength()/8);if(r.length!==a){var f=new Error("RSAES-OAEP encoded message length is invalid.");throw f.length=r.length,f.expectedLength=a,f}o===undefined?o=e.md.sha1.create():o.start(),u||(u=o);if(a<2*o.digestLength+2)throw new Error("RSAES-OAEP key is too short for the hash function.");s||(s=""),o.update(s,"raw");var l=o.digest().getBytes(),c=r.charAt(0),h=r.substring(1,o.digestLength+1),p=r.substring(1+o.digestLength),d=n(p,o.digestLength,u),v=e.util.xorBytes(h,d,h.length),m=n(v,a-o.digestLength-1,u),g=e.util.xorBytes(p,m,p.length),y=g.substring(0,o.digestLength),f=c!=="\0";for(var b=0;b<o.digestLength;++b)f|=l.charAt(b)!==y.charAt(b);var w=1,E=o.digestLength;for(var S=o.digestLength;S<g.length;S++){var x=g.charCodeAt(S),T=x&1^1,N=w?65534:0;f|=x&N,w&=T,E+=w}if(f||g.charCodeAt(E)!==1)throw new Error("Invalid RSAES-OAEP padding.");return g.substring(E+1)}}var r="pkcs1";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pkcs1",["require","module","./util","./random","./sha1"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function o(e,t,n,r){return"workers"in n?a(e,t,n,r):u(e,t,n,r)}function u(t,n,i,s){var o=f(t,n),a=0,c=l(o.bitLength());"millerRabinTests"in i&&(c=i.millerRabinTests);var h=10;"maxBlockTime"in i&&(h=i.maxBlockTime);var p=+(new Date);do{o.bitLength()>t&&(o=f(t,n));if(o.isProbablePrime(c))return s(null,o);o.dAddOffset(r[a++%8],0)}while(h<0||+(new Date)-p<h);e.util.setImmediate(function(){u(t,n,i,s)})}function a(t,r,i,s){function p(){function d(i){if(p)return;--u;var a=i.data;if(a.found){for(var h=0;h<e.length;++h)e[h].terminate();return p=!0,s(null,new n(a.prime,16))}o.bitLength()>t&&(o=f(t,r));var d=o.toString(16);i.target.postMessage({hex:d,workLoad:l}),o.dAddOffset(c,0)}a=Math.max(1,a);var e=[];for(var i=0;i<a;++i)e[i]=new Worker(h);var u=a;for(var i=0;i<a;++i)e[i].addEventListener("message",d);var p=!1}if(typeof Worker=="undefined")return u(t,r,i,s);var o=f(t,r),a=i.workers,l=i.workLoad||100,c=l*30/8,h=i.workerScript||"forge/prime.worker.js";if(a===-1)return e.util.estimateCores(function(e,t){e&&(t=2),a=t-1,p()});p()}function f(e,t){var r=new n(e,t),o=e-1;return r.testBit(o)||r.bitwiseTo(n.ONE.shiftLeft(o),s,r),r.dAddOffset(31-r.mod(i).byteValue(),0),r}function l(e){return e<=100?27:e<=150?18:e<=200?15:e<=250?12:e<=300?9:e<=350?8:e<=400?7:e<=500?6:e<=600?5:e<=800?4:e<=1250?3:2}if(e.prime)return;var t=e.prime=e.prime||{},n=e.jsbn.BigInteger,r=[6,4,2,4,2,4,6,2],i=new n(null);i.fromInt(30);var s=function(e,t){return e|t};t.generateProbablePrime=function(t,n,r){typeof n=="function"&&(r=n,n={}),n=n||{};var i=n.algorithm||"PRIMEINC";typeof i=="string"&&(i={name:i}),i.options=i.options||{};var s=n.prng||e.random,u={nextBytes:function(e){var t=s.getBytesSync(e.length);for(var n=0;n<e.length;++n)e[n]=t.charCodeAt(n)}};if(i.name==="PRIMEINC")return o(t,u,i.options,r);throw new Error("Invalid prime generation algorithm: "+i.name)}}var r="prime";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/prime",["require","module","./util","./jsbn","./random"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function c(t,n,r){var i=e.util.createBuffer(),s=Math.ceil(n.n.bitLength()/8);if(t.length>s-11){var o=new Error("Message is too long for PKCS#1 v1.5 padding.");throw o.length=t.length,o.max=s-11,o}i.putByte(0),i.putByte(r);var u=s-3-t.length,a;if(r===0||r===1){a=r===0?0:255;for(var f=0;f<u;++f)i.putByte(a)}else while(u>0){var l=0,c=e.random.getBytes(u);for(var f=0;f<u;++f)a=c.charCodeAt(f),a===0?++l:i.putByte(a);u=l}return i.putByte(0),i.putBytes(t),i}function h(t,n,r,i){var s=Math.ceil(n.n.bitLength()/8),o=e.util.createBuffer(t),u=o.getByte(),a=o.getByte();if(u!==0||r&&a!==0&&a!==1||!r&&a!=2||r&&a===0&&typeof i=="undefined")throw new Error("Encryption block is invalid.");var f=0;if(a===0){f=s-3-i;for(var l=0;l<f;++l)if(o.getByte()!==0)throw new Error("Encryption block is invalid.")}else if(a===1){f=0;while(o.length()>1){if(o.getByte()!==255){--o.read;break}++f}}else if(a===2){f=0;while(o.length()>1){if(o.getByte()===0){--o.read;break}++f}}var c=o.getByte();if(c!==0||f!==s-3-o.length())throw new Error("Encryption block is invalid.");return o.getBytes()}function p(n,i,s){function u(){a(n.pBits,function(e,t){if(e)return s(e);n.p=t;if(n.q!==null)return f(e,n.q);a(n.qBits,f)})}function a(t,n){e.prime.generateProbablePrime(t,o,n)}function f(e,i){if(e)return s(e);n.q=i;if(n.p.compareTo(n.q)<0){var o=n.p;n.p=n.q,n.q=o}if(n.p.subtract(t.ONE).gcd(n.e).compareTo(t.ONE)!==0){n.p=null,u();return}if(n.q.subtract(t.ONE).gcd(n.e).compareTo(t.ONE)!==0){n.q=null,a(n.qBits,f);return}n.p1=n.p.subtract(t.ONE),n.q1=n.q.subtract(t.ONE),n.phi=n.p1.multiply(n.q1);if(n.phi.gcd(n.e).compareTo(t.ONE)!==0){n.p=n.q=null,u();return}n.n=n.p.multiply(n.q);if(n.n.bitLength()!==n.bits){n.q=null,a(n.qBits,f);return}var l=n.e.modInverse(n.phi);n.keys={privateKey:r.rsa.setPrivateKey(n.n,n.e,l,n.p,n.q,l.mod(n.p1),l.mod(n.q1),n.q.modInverse(n.p)),publicKey:r.rsa.setPublicKey(n.n,n.e)},s(null,n.keys)}typeof i=="function"&&(s=i,i={}),i=i||{};var o={algorithm:{name:i.algorithm||"PRIMEINC",options:{workers:i.workers||2,workLoad:i.workLoad||100,workerScript:i.workerScript}}};"prng"in i&&(o.prng=i.prng),u()}function d(t){var n=t.toString(16);return n[0]>="8"&&(n="00"+n),e.util.hexToBytes(n)}function v(e){return e<=100?27:e<=150?18:e<=200?15:e<=250?12:e<=300?9:e<=350?8:e<=400?7:e<=500?6:e<=600?5:e<=800?4:e<=1250?3:2}if(typeof t=="undefined")var t=e.jsbn.BigInteger;var n=e.asn1;e.pki=e.pki||{},e.pki.rsa=e.rsa=e.rsa||{};var r=e.pki,i=[6,4,2,4,2,4,6,2],s={name:"PrivateKeyInfo",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"PrivateKeyInfo.version",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"PrivateKeyInfo.privateKeyAlgorithm",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:n.Class.UNIVERSAL,type:n.Type.OID,constructed:!1,capture:"privateKeyOid"}]},{name:"PrivateKeyInfo",tagClass:n.Class.UNIVERSAL,type:n.Type.OCTETSTRING,constructed:!1,capture:"privateKey"}]},o={name:"RSAPrivateKey",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"RSAPrivateKey.version",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"RSAPrivateKey.modulus",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyModulus"},{name:"RSAPrivateKey.publicExponent",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyPublicExponent"},{name:"RSAPrivateKey.privateExponent",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyPrivateExponent"},{name:"RSAPrivateKey.prime1",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyPrime1"},{name:"RSAPrivateKey.prime2",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyPrime2"},{name:"RSAPrivateKey.exponent1",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyExponent1"},{name:"RSAPrivateKey.exponent2",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyExponent2"},{name:"RSAPrivateKey.coefficient",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"privateKeyCoefficient"}]},u={name:"RSAPublicKey",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"RSAPublicKey.modulus",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"publicKeyModulus"},{name:"RSAPublicKey.exponent",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"publicKeyExponent"}]},a=e.pki.rsa.publicKeyValidator={name:"SubjectPublicKeyInfo",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,captureAsn1:"subjectPublicKeyInfo",value:[{name:"SubjectPublicKeyInfo.AlgorithmIdentifier",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:n.Class.UNIVERSAL,type:n.Type.OID,constructed:!1,capture:"publicKeyOid"}]},{name:"SubjectPublicKeyInfo.subjectPublicKey",tagClass:n.Class.UNIVERSAL,type:n.Type.BITSTRING,constructed:!1,value:[{name:"SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,optional:!0,captureAsn1:"rsaPublicKey"}]}]},f=function(e){var t;if(e.algorithm in r.oids){t=r.oids[e.algorithm];var s=n.oidToDer(t).getBytes(),o=n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[]),u=n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[]);u.value.push(n.create(n.Class.UNIVERSAL,n.Type.OID,!1,s)),u.value.push(n.create(n.Class.UNIVERSAL,n.Type.NULL,!1,""));var a=n.create(n.Class.UNIVERSAL,n.Type.OCTETSTRING,!1,e.digest().getBytes());return o.value.push(u),o.value.push(a),n.toDer(o).getBytes()}var i=new Error("Unknown message digest algorithm.");throw i.algorithm=e.algorithm,i},l=function(n,r,i){if(i)return n.modPow(r.e,r.n);if(!r.p||!r.q)return n.modPow(r.d,r.n);r.dP||(r.dP=r.d.mod(r.p.subtract(t.ONE))),r.dQ||(r.dQ=r.d.mod(r.q.subtract(t.ONE))),r.qInv||(r.qInv=r.q.modInverse(r.p));var s;do s=(new t(e.util.bytesToHex(e.random.getBytes(r.n.bitLength()/8)),16)).mod(r.n);while(s.equals(t.ZERO));n=n.multiply(s.modPow(r.e,r.n)).mod(r.n);var o=n.mod(r.p).modPow(r.dP,r.p),u=n.mod(r.q).modPow(r.dQ,r.q);while(o.compareTo(u)<0)o=o.add(r.p);var a=o.subtract(u).multiply(r.qInv).mod(r.p).multiply(r.q).add(u);return a=a.multiply(s.modInverse(r.n)).mod(r.n),a};r.rsa.encrypt=function(n,r,i){var s=i,o,u=Math.ceil(r.n.bitLength()/8);i!==!1&&i!==!0?(s=i===2,o=c(n,r,i)):(o=e.util.createBuffer(),o.putBytes(n));var a=new t(o.toHex(),16),f=l(a,r,s),h=f.toString(16),p=e.util.createBuffer(),d=u-Math.ceil(h.length/2);while(d>0)p.putByte(0),--d;return p.putBytes(e.util.hexToBytes(h)),p.getBytes()},r.rsa.decrypt=function(n,r,i,s){var o=Math.ceil(r.n.bitLength()/8);if(n.length!==o){var u=new Error("Encrypted message length is invalid.");throw u.length=n.length,u.expected=o,u}var a=new t(e.util.createBuffer(n).toHex(),16);if(a.compareTo(r.n)>=0)throw new Error("Encrypted message is invalid.");var f=l(a,r,i),c=f.toString(16),p=e.util.createBuffer(),d=o-Math.ceil(c.length/2);while(d>0)p.putByte(0),--d;return p.putBytes(e.util.hexToBytes(c)),s!==!1?h(p.getBytes(),r,i):p.getBytes()},r.rsa.createKeyPairGenerationState=function(n,r,i){typeof n=="string"&&(n=parseInt(n,10)),n=n||2048,i=i||{};var s=i.prng||e.random,o={nextBytes:function(e){var t=s.getBytesSync(e.length);for(var n=0;n<e.length;++n)e[n]=t.charCodeAt(n)}},u=i.algorithm||"PRIMEINC",a;if(u!=="PRIMEINC")throw new Error("Invalid key generation algorithm: "+u);return a={algorithm:u,state:0,bits:n,rng:o,eInt:r||65537,e:new t(null),p:null,q:null,qBits:n>>1,pBits:n-(n>>1),pqState:0,num:null,keys:null},a.e.fromInt(a.eInt),a},r.rsa.stepKeyPairGenerationState=function(e,n){"algorithm"in e||(e.algorithm="PRIMEINC");var s=new t(null);s.fromInt(30);var o=0,u=function(e,t){return e|t},a=+(new Date),f,l=0;while(e.keys===null&&(n<=0||l<n)){if(e.state===0){var c=e.p===null?e.pBits:e.qBits,h=c-1;e.pqState===0?(e.num=new t(c,e.rng),e.num.testBit(h)||e.num.bitwiseTo(t.ONE.shiftLeft(h),u,e.num),e.num.dAddOffset(31-e.num.mod(s).byteValue(),0),o=0,++e.pqState):e.pqState===1?e.num.bitLength()>c?e.pqState=0:e.num.isProbablePrime(v(e.num.bitLength()))?++e.pqState:e.num.dAddOffset(i[o++%8],0):e.pqState===2?e.pqState=e.num.subtract(t.ONE).gcd(e.e).compareTo(t.ONE)===0?3:0:e.pqState===3&&(e.pqState=0,e.p===null?e.p=e.num:e.q=e.num,e.p!==null&&e.q!==null&&++e.state,e.num=null)}else if(e.state===1)e.p.compareTo(e.q)<0&&(e.num=e.p,e.p=e.q,e.q=e.num),++e.state;else if(e.state===2)e.p1=e.p.subtract(t.ONE),e.q1=e.q.subtract(t.ONE),e.phi=e.p1.multiply(e.q1),++e.state;else if(e.state===3)e.phi.gcd(e.e).compareTo(t.ONE)===0?++e.state:(e.p=null,e.q=null,e.state=0);else if(e.state===4)e.n=e.p.multiply(e.q),e.n.bitLength()===e.bits?++e.state:(e.q=null,e.state=0);else if(e.state===5){var p=e.e.modInverse(e.phi);e.keys={privateKey:r.rsa.setPrivateKey(e.n,e.e,p,e.p,e.q,p.mod(e.p1),p.mod(e.q1),e.q.modInverse(e.p)),publicKey:r.rsa.setPublicKey(e.n,e.e)}}f=+(new Date),l+=f-a,a=f}return e.keys!==null},r.rsa.generateKeyPair=function(e,t,n,i){arguments.length===1?typeof e=="object"?(n=e,e=undefined):typeof e=="function"&&(i=e,e=undefined):arguments.length===2?typeof e=="number"?typeof t=="function"?(i=t,t=undefined):typeof t!="number"&&(n=t,t=undefined):(n=e,i=t,e=undefined,t=undefined):arguments.length===3&&(typeof t=="number"?typeof n=="function"&&(i=n,n=undefined):(i=n,n=t,t=undefined)),n=n||{},e===undefined&&(e=n.bits||2048),t===undefined&&(t=n.e||65537);var s=r.rsa.createKeyPairGenerationState(e,t,n);if(!i)return r.rsa.stepKeyPairGenerationState(s,0),s.keys;p(s,n,i)},r.setRsaPublicKey=r.rsa.setPublicKey=function(t,i){var s={n:t,e:i};return s.encrypt=function(t,n,i){typeof n=="string"?n=n.toUpperCase():n===undefined&&(n="RSAES-PKCS1-V1_5");if(n==="RSAES-PKCS1-V1_5")n={encode:function(e,t,n){return c(e,t,2).getBytes()}};else if(n==="RSA-OAEP"||n==="RSAES-OAEP")n={encode:function(t,n){return e.pkcs1.encode_rsa_oaep(n,t,i)}};else if(["RAW","NONE","NULL",null].indexOf(n)!==-1)n={encode:function(e){return e}};else if(typeof n=="string")throw new Error('Unsupported encryption scheme: "'+n+'".');var o=n.encode(t,s,!0);return r.rsa.encrypt(o,s,!0)},s.verify=function(e,t,i){typeof i=="string"?i=i.toUpperCase():i===undefined&&(i="RSASSA-PKCS1-V1_5");if(i==="RSASSA-PKCS1-V1_5")i={verify:function(e,t){t=h(t,s,!0);var r=n.fromDer(t);return e===r.value[1].value}};else if(i==="NONE"||i==="NULL"||i===null)i={verify:function(e,t){return t=h(t,s,!0),e===t}};var o=r.rsa.decrypt(t,s,!0,!1);return i.verify(e,o,s.n.bitLength())},s},r.setRsaPrivateKey=r.rsa.setPrivateKey=function(t,n,i,s,o,u,a,l){var c={n:t,e:n,d:i,p:s,q:o,dP:u,dQ:a,qInv:l};return c.decrypt=function(t,n,i){typeof n=="string"?n=n.toUpperCase():n===undefined&&(n="RSAES-PKCS1-V1_5");var s=r.rsa.decrypt(t,c,!1,!1);if(n==="RSAES-PKCS1-V1_5")n={decode:h};else if(n==="RSA-OAEP"||n==="RSAES-OAEP")n={decode:function(t,n){return e.pkcs1.decode_rsa_oaep(n,t,i)}};else{if(["RAW","NONE","NULL",null].indexOf(n)===-1)throw new Error('Unsupported encryption scheme: "'+n+'".');n={decode:function(e){return e}}}return n.decode(s,c,!1)},c.sign=function(e,t){var n=!1;typeof t=="string"&&(t=t.toUpperCase());if(t===undefined||t==="RSASSA-PKCS1-V1_5")t={encode:f},n=1;else if(t==="NONE"||t==="NULL"||t===null)t={encode:function(){return e}},n=1;var i=t.encode(e,c.n.bitLength());return r.rsa.encrypt(i,c,n)},c},r.wrapRsaPrivateKey=function(e){return n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,n.integerToDer(0).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OID,!1,n.oidToDer(r.oids.rsaEncryption).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.NULL,!1,"")]),n.create(n.Class.UNIVERSAL,n.Type.OCTETSTRING,!1,n.toDer(e).getBytes())])},r.privateKeyFromAsn1=function(i){var u={},a=[];n.validate(i,s,u,a)&&(i=n.fromDer(e.util.createBuffer(u.privateKey))),u={},a=[];if(!n.validate(i,o,u,a)){var f=new Error("Cannot read private key. ASN.1 object does not contain an RSAPrivateKey.");throw f.errors=a,f}var l,c,h,p,d,v,m,g;return l=e.util.createBuffer(u.privateKeyModulus).toHex(),c=e.util.createBuffer(u.privateKeyPublicExponent).toHex(),h=e.util.createBuffer(u.privateKeyPrivateExponent).toHex(),p=e.util.createBuffer(u.privateKeyPrime1).toHex(),d=e.util.createBuffer(u.privateKeyPrime2).toHex(),v=e.util.createBuffer(u.privateKeyExponent1).toHex(),m=e.util.createBuffer(u.privateKeyExponent2).toHex(),g=e.util.createBuffer(u.privateKeyCoefficient).toHex(),r.setRsaPrivateKey(new t(l,16),new t(c,16),new t(h,16),new t(p,16),new t(d,16),new t(v,16),new t(m,16),new t(g,16))},r.privateKeyToAsn1=r.privateKeyToRSAPrivateKey=function(e){return n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,n.integerToDer(0).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.n)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.e)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.d)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.p)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.q)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.dP)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.dQ)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.qInv))])},r.publicKeyFromAsn1=function(i){var s={},o=[];if(n.validate(i,a,s,o)){var f=n.derToOid(s.publicKeyOid);if(f!==r.oids.rsaEncryption){var l=new Error("Cannot read public key. Unknown OID.");throw l.oid=f,l}i=s.rsaPublicKey}o=[];if(!n.validate(i,u,s,o)){var l=new Error("Cannot read public key. ASN.1 object does not contain an RSAPublicKey.");throw l.errors=o,l}var c=e.util.createBuffer(s.publicKeyModulus).toHex(),h=e.util.createBuffer(s.publicKeyExponent).toHex();return r.setRsaPublicKey(new t(c,16),new t(h,16))},r.publicKeyToAsn1=r.publicKeyToSubjectPublicKeyInfo=function(e){return n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OID,!1,n.oidToDer(r.oids.rsaEncryption).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.NULL,!1,"")]),n.create(n.Class.UNIVERSAL,n.Type.BITSTRING,!1,[r.publicKeyToRSAPublicKey(e)])])},r.publicKeyToRSAPublicKey=function(e){return n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.n)),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,d(e.e))])}}var r="rsa";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/rsa",["require","module","./asn1","./jsbn","./oids","./pkcs1","./prime","./random","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function a(e,t,n){var r=[f(e+t)];for(var i=16,s=1;i<n;++s,i+=16)r.push(f(r[s-1]+e+t));return r.join("").substr(0,n)}function f(t){return e.md.md5.create().update(t).digest().getBytes()}if(typeof t=="undefined")var t=e.jsbn.BigInteger;var n=e.asn1,r=e.pki=e.pki||{};r.pbe=e.pbe=e.pbe||{};var i=r.oids,s={name:"EncryptedPrivateKeyInfo",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedPrivateKeyInfo.encryptionAlgorithm",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:n.Class.UNIVERSAL,type:n.Type.OID,constructed:!1,capture:"encryptionOid"},{name:"AlgorithmIdentifier.parameters",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,captureAsn1:"encryptionParams"}]},{name:"EncryptedPrivateKeyInfo.encryptedData",tagClass:n.Class.UNIVERSAL,type:n.Type.OCTETSTRING,constructed:!1,capture:"encryptedData"}]},o={name:"PBES2Algorithms",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.keyDerivationFunc",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.keyDerivationFunc.oid",tagClass:n.Class.UNIVERSAL,type:n.Type.OID,constructed:!1,capture:"kdfOid"},{name:"PBES2Algorithms.params",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.params.salt",tagClass:n.Class.UNIVERSAL,type:n.Type.OCTETSTRING,constructed:!1,capture:"kdfSalt"},{name:"PBES2Algorithms.params.iterationCount",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,onstructed:!0,capture:"kdfIterationCount"}]}]},{name:"PBES2Algorithms.encryptionScheme",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.encryptionScheme.oid",tagClass:n.Class.UNIVERSAL,type:n.Type.OID,constructed:!1,capture:"encOid"},{name:"PBES2Algorithms.encryptionScheme.iv",tagClass:n.Class.UNIVERSAL,type:n.Type.OCTETSTRING,constructed:!1,capture:"encIv"}]}]},u={name:"pkcs-12PbeParams",tagClass:n.Class.UNIVERSAL,type:n.Type.SEQUENCE,constructed:!0,value:[{name:"pkcs-12PbeParams.salt",tagClass:n.Class.UNIVERSAL,type:n.Type.OCTETSTRING,constructed:!1,capture:"salt"},{name:"pkcs-12PbeParams.iterations",tagClass:n.Class.UNIVERSAL,type:n.Type.INTEGER,constructed:!1,capture:"iterations"}]};r.encryptPrivateKeyInfo=function(t,s,o){o=o||{},o.saltSize=o.saltSize||8,o.count=o.count||2048,o.algorithm=o.algorithm||"aes128";var u=e.random.getBytesSync(o.saltSize),a=o.count,f=n.integerToDer(a),l,c,h;if(o.algorithm.indexOf("aes")===0||o.algorithm==="des"){var p,d,v;switch(o.algorithm){case"aes128":l=16,p=16,d=i["aes128-CBC"],v=e.aes.createEncryptionCipher;break;case"aes192":l=24,p=16,d=i["aes192-CBC"],v=e.aes.createEncryptionCipher;break;case"aes256":l=32,p=16,d=i["aes256-CBC"],v=e.aes.createEncryptionCipher;break;case"des":l=8,p=8,d=i.desCBC,v=e.des.createEncryptionCipher;break;default:var m=new Error("Cannot encrypt private key. Unknown encryption algorithm.");throw m.algorithm=o.algorithm,m}var g=e.pkcs5.pbkdf2(s,u,a,l),y=e.random.getBytesSync(p),b=v(g);b.start(y),b.update(n.toDer(t)),b.finish(),h=b.output.getBytes(),c=n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OID,!1,n.oidToDer(i.pkcs5PBES2).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OID,!1,n.oidToDer(i.pkcs5PBKDF2).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OCTETSTRING,!1,u),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,f.getBytes())])]),n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OID,!1,n.oidToDer(d).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.OCTETSTRING,!1,y)])])])}else{if(o.algorithm!=="3des"){var m=new Error("Cannot encrypt private key. Unknown encryption algorithm.");throw m.algorithm=o.algorithm,m}l=24;var w=new e.util.ByteBuffer(u),g=r.pbe.generatePkcs12Key(s,w,1,a,l),y=r.pbe.generatePkcs12Key(s,w,2,a,l),b=e.des.createEncryptionCipher(g);b.start(y),b.update(n.toDer(t)),b.finish(),h=b.output.getBytes(),c=n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OID,!1,n.oidToDer(i["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes()),n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[n.create(n.Class.UNIVERSAL,n.Type.OCTETSTRING,!1,u),n.create(n.Class.UNIVERSAL,n.Type.INTEGER,!1,f.getBytes())])])}var E=n.create(n.Class.UNIVERSAL,n.Type.SEQUENCE,!0,[c,n.create(n.Class.UNIVERSAL,n.Type.OCTETSTRING,!1,h)]);return E},r.decryptPrivateKeyInfo=function(t,i){var o=null,u={},a=[];if(!n.validate(t,s,u,a)){var f=new Error("Cannot read encrypted private key. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");throw f.errors=a,f}var l=n.derToOid(u.encryptionOid),c=r.pbe.getCipher(l,u.encryptionParams,i),h=e.util.createBuffer(u.encryptedData);return c.update(h),c.finish()&&(o=n.fromDer(c.output)),o},r.encryptedPrivateKeyToPem=function(t,r){var i={type:"ENCRYPTED PRIVATE KEY",body:n.toDer(t).getBytes()};return e.pem.encode(i,{maxline:r})},r.encryptedPrivateKeyFromPem=function(t){var r=e.pem.decode(t)[0];if(r.type!=="ENCRYPTED PRIVATE KEY"){var i=new Error('Could not convert encrypted private key from PEM; PEM header type is "ENCRYPTED PRIVATE KEY".');throw i.headerType=r.type,i}if(r.procType&&r.procType.type==="ENCRYPTED")throw new Error("Could not convert encrypted private key from PEM; PEM is encrypted.");return n.fromDer(r.body)},r.encryptRsaPrivateKey=function(t,i,s){s=s||{};if(!s.legacy){var o=r.wrapRsaPrivateKey(r.privateKeyToAsn1(t));return o=r.encryptPrivateKeyInfo(o,i,s),r.encryptedPrivateKeyToPem(o)}var u,f,l,c;switch(s.algorithm){case"aes128":u="AES-128-CBC",l=16,f=e.random.getBytesSync(16),c=e.aes.createEncryptionCipher;break;case"aes192":u="AES-192-CBC",l=24,f=e.random.getBytesSync(16),c=e.aes.createEncryptionCipher;break;case"aes256":u="AES-256-CBC",l=32,f=e.random.getBytesSync(16),c=e.aes.createEncryptionCipher;break;case"3des":u="DES-EDE3-CBC",l=24,f=e.random.getBytesSync(8),c=e.des.createEncryptionCipher;break;case"des":u="DES-CBC",l=8,f=e.random.getBytesSync(8),c=e.des.createEncryptionCipher;break;default:var h=new Error('Could not encrypt RSA private key; unsupported encryption algorithm "'+s.algorithm+'".');throw h.algorithm=s.algorithm,h}var p=a(i,f.substr(0,8),l),d=c(p);d.start(f),d.update(n.toDer(r.privateKeyToAsn1(t))),d.finish();var v={type:"RSA PRIVATE KEY",procType:{version:"4",type:"ENCRYPTED"},dekInfo:{algorithm:u,parameters:e.util.bytesToHex(f).toUpperCase()},body:d.output.getBytes()};return e.pem.encode(v)},r.decryptRsaPrivateKey=function(t,i){var s=null,o=e.pem.decode(t)[0];if(o.type!=="ENCRYPTED PRIVATE KEY"&&o.type!=="PRIVATE KEY"&&o.type!=="RSA PRIVATE KEY"){var u=new Error('Could not convert private key from PEM; PEM header type is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".');throw u.headerType=u,u}if(o.procType&&o.procType.type==="ENCRYPTED"){var f,l;switch(o.dekInfo.algorithm){case"DES-CBC":f=8,l=e.des.createDecryptionCipher;break;case"DES-EDE3-CBC":f=24,l=e.des.createDecryptionCipher;break;case"AES-128-CBC":f=16,l=e.aes.createDecryptionCipher;break;case"AES-192-CBC":f=24,l=e.aes.createDecryptionCipher;break;case"AES-256-CBC":f=32,l=e.aes.createDecryptionCipher;break;case"RC2-40-CBC":f=5,l=function(t){return e.rc2.createDecryptionCipher(t,40)};break;case"RC2-64-CBC":f=8,l=function(t){return e.rc2.createDecryptionCipher(t,64)};break;case"RC2-128-CBC":f=16,l=function(t){return e.rc2.createDecryptionCipher(t,128)};break;default:var u=new Error('Could not decrypt private key; unsupported encryption algorithm "'+o.dekInfo.algorithm+'".');throw u.algorithm=o.dekInfo.algorithm,u}var c=e.util.hexToBytes(o.dekInfo.parameters),h=a(i,c.substr(0,8),f),p=l(h);p.start(c),p.update(e.util.createBuffer(o.body));if(!p.finish())return s;s=p.output.getBytes()}else s=o.body;return o.type==="ENCRYPTED PRIVATE KEY"?s=r.decryptPrivateKeyInfo(n.fromDer(s),i):s=n.fromDer(s),s!==null&&(s=r.privateKeyFromAsn1(s)),s},r.pbe.generatePkcs12Key=function(t,n,r,i,s,o){var u,a;if(typeof o=="undefined"||o===null)o=e.md.sha1.create();var f=o.digestLength,l=o.blockLength,c=new e.util.ByteBuffer,h=new e.util.ByteBuffer;if(t!==null&&t!==undefined){for(a=0;a<t.length;a++)h.putInt16(t.charCodeAt(a));h.putInt16(0)}var p=h.length(),d=n.length(),v=new e.util.ByteBuffer;v.fillWithByte(r,l);var m=l*Math.ceil(d/l),g=new e.util.ByteBuffer;for(a=0;a<m;a++)g.putByte(n.at(a%d));var y=l*Math.ceil(p/l),b=new e.util.ByteBuffer;for(a=0;a<y;a++)b.putByte(h.at(a%p));var w=g;w.putBuffer(b);var E=Math.ceil(s/f);for(var S=1;S<=E;S++){var x=new e.util.ByteBuffer;x.putBytes(v.bytes()),x.putBytes(w.bytes());for(var T=0;T<i;T++)o.start(),o.update(x.getBytes()),x=o.digest();var N=new e.util.ByteBuffer;for(a=0;a<l;a++)N.putByte(x.at(a%f));var C=Math.ceil(d/l)+Math.ceil(p/l),k=new e.util.ByteBuffer;for(u=0;u<C;u++){var L=new e.util.ByteBuffer(w.getBytes(l)),A=511;for(a=N.length()-1;a>=0;a--)A>>=8,A+=N.at(a)+L.at(a),L.setAt(a,A&255);k.putBuffer(L)}w=k,c.putBuffer(x)}return c.truncate(c.length()-s),c},r.pbe.getCipher=function(e,t,n){switch(e){case r.oids.pkcs5PBES2:return r.pbe.getCipherForPBES2(e,t,n);case r.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:case r.oids["pbewithSHAAnd40BitRC2-CBC"]:return r.pbe.getCipherForPKCS12PBE(e,t,n);default:var i=new Error("Cannot read encrypted PBE data block. Unsupported OID.");throw i.oid=e,i.supportedOids=["pkcs5PBES2","pbeWithSHAAnd3-KeyTripleDES-CBC","pbewithSHAAnd40BitRC2-CBC"],i}},r.pbe.getCipherForPBES2=function(t,i,s){var u={},a=[];if(!n.validate(i,o,u,a)){var f=new Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");throw f.errors=a,f}t=n.derToOid(u.kdfOid);if(t!==r.oids.pkcs5PBKDF2){var f=new Error("Cannot read encrypted private key. Unsupported key derivation function OID.");throw f.oid=t,f.supportedOids=["pkcs5PBKDF2"],f}t=n.derToOid(u.encOid);if(t!==r.oids["aes128-CBC"]&&t!==r.oids["aes192-CBC"]&&t!==r.oids["aes256-CBC"]&&t!==r.oids["des-EDE3-CBC"]&&t!==r.oids.desCBC){var f=new Error("Cannot read encrypted private key. Unsupported encryption scheme OID.");throw f.oid=t,f.supportedOids=["aes128-CBC","aes192-CBC","aes256-CBC","des-EDE3-CBC","desCBC"],f}var l=u.kdfSalt,c=e.util.createBuffer(u.kdfIterationCount);c=c.getInt(c.length()<<3);var h,p;switch(r.oids[t]){case"aes128-CBC":h=16,p=e.aes.createDecryptionCipher;break;case"aes192-CBC":h=24,p=e.aes.createDecryptionCipher;break;case"aes256-CBC":h=32,p=e.aes.createDecryptionCipher;break;case"des-EDE3-CBC":h=24,p=e.des.createDecryptionCipher;break;case"desCBC":h=8,p=e.des.createDecryptionCipher}var d=e.pkcs5.pbkdf2(s,l,c,h),v=u.encIv,m=p(d);return m.start(v),m},r.pbe.getCipherForPKCS12PBE=function(t,i,s){var o={},a=[];if(!n.validate(i,u,o,a)){var f=new Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");throw f.errors=a,f}var l=e.util.createBuffer(o.salt),c=e.util.createBuffer(o.iterations);c=c.getInt(c.length()<<3);var h,p,d;switch(t){case r.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:h=24,p=8,d=e.des.startDecrypting;break;case r.oids["pbewithSHAAnd40BitRC2-CBC"]:h=5,p=8,d=function(t,n){var r=e.rc2.createDecryptionCipher(t,40);return r.start(n,null),r};break;default:var f=new Error("Cannot read PKCS #12 PBE data block. Unsupported OID.");throw f.oid=t,f}var v=r.pbe.generatePkcs12Key(s,l,1,c,h),m=r.pbe.generatePkcs12Key(s,l,2,c,p);return d(v,m)}}var r="pbe";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pbe",["require","module","./aes","./asn1","./des","./md","./oids","./pem","./pbkdf2","./random","./rc2","./rsa","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.asn1,n=e.pkcs7asn1=e.pkcs7asn1||{};e.pkcs7=e.pkcs7||{},e.pkcs7.asn1=n;var r={name:"ContentInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"ContentInfo.ContentType",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"contentType"},{name:"ContentInfo.content",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,captureAsn1:"content"}]};n.contentInfoValidator=r;var i={name:"EncryptedContentInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedContentInfo.contentType",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"contentType"},{name:"EncryptedContentInfo.contentEncryptionAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedContentInfo.contentEncryptionAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"encAlgorithm"},{name:"EncryptedContentInfo.contentEncryptionAlgorithm.parameter",tagClass:t.Class.UNIVERSAL,captureAsn1:"encParameter"}]},{name:"EncryptedContentInfo.encryptedContent",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,capture:"encryptedContent",captureAsn1:"encryptedContentAsn1"}]};n.envelopedDataValidator={name:"EnvelopedData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EnvelopedData.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},{name:"EnvelopedData.RecipientInfos",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,captureAsn1:"recipientInfos"}].concat(i)},n.encryptedDataValidator={name:"EncryptedData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedData.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"}].concat(i)};var s={name:"SignerInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1},{name:"SignerInfo.IssuerAndSerialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0},{name:"SignerInfo.DigestAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0},{name:"SignerInfo.AuthenticatedAttributes",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,capture:"authenticatedAttributes"},{name:"SignerInfo.DigestEncryptionAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0},{name:"SignerInfo.EncryptedDigest",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"signature"},{name:"SignerInfo.UnauthenticatedAttributes",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,optional:!0}]};n.signedDataValidator={name:"SignedData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SignedData.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},{name:"SignedData.DigestAlgorithms",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,captureAsn1:"digestAlgorithms"},r,{name:"SignedData.Certificates",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,optional:!0,captureAsn1:"certificates"},{name:"SignedData.CertificateRevocationLists",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,optional:!0,captureAsn1:"crls"},{name:"SignedData.SignerInfos",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,capture:"signerInfos",optional:!0,value:[s]}]},n.recipientInfoValidator={name:"RecipientInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},{name:"RecipientInfo.issuerAndSerial",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.issuerAndSerial.issuer",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"issuer"},{name:"RecipientInfo.issuerAndSerial.serialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"serial"}]},{name:"RecipientInfo.keyEncryptionAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.keyEncryptionAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"encAlgorithm"},{name:"RecipientInfo.keyEncryptionAlgorithm.parameter",tagClass:t.Class.UNIVERSAL,constructed:!1,captureAsn1:"encParameter"}]},{name:"RecipientInfo.encryptedKey",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"encKey"}]}}var r="pkcs7asn1";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pkcs7asn1",["require","module","./asn1","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.mgf=e.mgf||{};var t=e.mgf.mgf1=e.mgf1=e.mgf1||{};t.create=function(t){var n={generate:function(n,r){var i=new e.util.ByteBuffer,s=Math.ceil(r/t.digestLength);for(var o=0;o<s;o++){var u=new e.util.ByteBuffer;u.putInt32(o),t.start(),t.update(n+u.getBytes()),i.putBuffer(t.digest())}return i.truncate(i.length()-r),i.getBytes()}};return n}}var r="mgf1";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/mgf1",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.mgf=e.mgf||{},e.mgf.mgf1=e.mgf1}var r="mgf";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/mgf",["require","module","./mgf1"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.pss=e.pss||{};t.create=function(t){arguments.length===3&&(t={md:arguments[0],mgf:arguments[1],saltLength:arguments[2]});var n=t.md,r=t.mgf,i=n.digestLength,s=t.salt||null;typeof s=="string"&&(s=e.util.createBuffer(s));var o;if("saltLength"in t)o=t.saltLength;else{if(s===null)throw new Error("Salt length not specified or specific salt not given.");o=s.length()}if(s!==null&&s.length()!==o)throw new Error("Given salt length does not match length of given salt.");var u=t.prng||e.random,a={};return a.encode=function(t,a){var f,l=a-1,c=Math.ceil(l/8),h=t.digest().getBytes();if(c<i+o+2)throw new Error("Message is too long to encrypt.");var p;s===null?p=u.getBytesSync(o):p=s.bytes();var d=new e.util.ByteBuffer;d.fillWithByte(0,8),d.putBytes(h),d.putBytes(p),n.start(),n.update(d.getBytes());var v=n.digest().getBytes(),m=new e.util.ByteBuffer;m.fillWithByte(0,c-o-i-2),m.putByte(1),m.putBytes(p);var g=m.getBytes(),y=c-i-1,b=r.generate(v,y),w="";for(f=0;f<y;f++)w+=String.fromCharCode(g.charCodeAt(f)^b.charCodeAt(f));var E=65280>>8*c-l&255;return w=String.fromCharCode(w.charCodeAt(0)&~E)+w.substr(1),w+v+String.fromCharCode(188)},a.verify=function(t,s,u){var a,f=u-1,l=Math.ceil(f/8);s=s.substr(-l);if(l<i+o+2)throw new Error("Inconsistent parameters to PSS signature verification.");if(s.charCodeAt(l-1)!==188)throw new Error("Encoded message does not end in 0xBC.");var c=l-i-1,h=s.substr(0,c),p=s.substr(c,i),d=65280>>8*l-f&255;if((h.charCodeAt(0)&d)!==0)throw new Error("Bits beyond keysize not zero as expected.");var v=r.generate(p,c),m="";for(a=0;a<c;a++)m+=String.fromCharCode(h.charCodeAt(a)^v.charCodeAt(a));m=String.fromCharCode(m.charCodeAt(0)&~d)+m.substr(1);var g=l-i-o-2;for(a=0;a<g;a++)if(m.charCodeAt(a)!==0)throw new Error("Leftmost octets not zero as expected");if(m.charCodeAt(g)!==1)throw new Error("Inconsistent PSS signature, 0x01 marker not found");var y=m.substr(-o),b=new e.util.ByteBuffer;b.fillWithByte(0,8),b.putBytes(t),b.putBytes(y),n.start(),n.update(b.getBytes());var w=n.digest().getBytes();return p===w},a}}var r="pss";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pss",["require","module","./random","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function l(e,t){typeof t=="string"&&(t={shortName:t});var n=null,r;for(var i=0;n===null&&i<e.attributes.length;++i)r=e.attributes[i],t.type&&t.type===r.type?n=r:t.name&&t.name===r.name?n=r:t.shortName&&t.shortName===r.shortName&&(n=r);return n}function p(n){var r=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),i,s,o=n.attributes;for(var u=0;u<o.length;++u){i=o[u];var a=i.value,f=t.Type.PRINTABLESTRING;"valueTagClass"in i&&(f=i.valueTagClass,f===t.Type.UTF8&&(a=e.util.encodeUtf8(a))),s=t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(i.type).getBytes()),t.create(t.Class.UNIVERSAL,f,!1,a)])]),r.value.push(s)}return r}function d(e){var n=t.create(t.Class.CONTEXT_SPECIFIC,3,!0,[]),r=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);n.value.push(r);var i,s;for(var o=0;o<e.length;++o){i=e[o],s=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),r.value.push(s),s.value.push(t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(i.id).getBytes())),i.critical&&s.value.push(t.create(t.Class.UNIVERSAL,t.Type.BOOLEAN,!1,String.fromCharCode(255)));var u=i.value;typeof i.value!="string"&&(u=t.toDer(u).getBytes()),s.value.push(t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,u))}return n}function v(n){var r={};for(var i=0;i<n.length;++i){var s=n[i];if(s.shortName&&(s.valueTagClass===t.Type.UTF8||s.valueTagClass===t.Type.PRINTABLESTRING||s.valueTagClass===t.Type.IA5STRING)){var o=s.value;s.valueTagClass===t.Type.UTF8&&(o=e.util.encodeUtf8(s.value)),s.shortName in r?e.util.isArray(r[s.shortName])?r[s.shortName].push(o):r[s.shortName]=[r[s.shortName],o]:r[s.shortName]=o}}return r}function m(e){var t;for(var r=0;r<e.length;++r){t=e[r],typeof t.name=="undefined"&&(t.type&&t.type in n.oids?t.name=n.oids[t.type]:t.shortName&&t.shortName in i&&(t.name=n.oids[i[t.shortName]]));if(typeof t.type=="undefined"){if(!(t.name&&t.name in n.oids)){var s=new Error("Attribute type not specified.");throw s.attribute=t,s}t.type=n.oids[t.name]}typeof t.shortName=="undefined"&&t.name&&t.name in i&&(t.shortName=i[t.name]);if(typeof t.value=="undefined"){var s=new Error("Attribute value not specified.");throw s.attribute=t,s}}}function g(e,n){switch(e){case r["RSASSA-PSS"]:var i=[];return n.hash.algorithmOid!==undefined&&i.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.hash.algorithmOid).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")])])),n.mgf.algorithmOid!==undefined&&i.push(t.create(t.Class.CONTEXT_SPECIFIC,1,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.mgf.algorithmOid).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.mgf.hash.algorithmOid).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")])])])),n.saltLength!==undefined&&i.push(t.create(t.Class.CONTEXT_SPECIFIC,2,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(n.saltLength).getBytes())])),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,i);default:return t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")}}function y(n){var r=t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[]);if(n.attributes.length===0)return r;var i=n.attributes;for(var s=0;s<i.length;++s){var o=i[s],u=o.value,a=t.Type.UTF8;"valueTagClass"in o&&(a=o.valueTagClass),a===t.Type.UTF8&&(u=e.util.encodeUtf8(u));var f=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(o.type).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,a,!1,u)])]);r.value.push(f)}return r}var t=e.asn1,n=e.pki=e.pki||{},r=n.oids,i={};i.CN=r.commonName,i.commonName="CN",i.C=r.countryName,i.countryName="C",i.L=r.localityName,i.localityName="L",i.ST=r.stateOrProvinceName,i.stateOrProvinceName="ST",i.O=r.organizationName,i.organizationName="O",i.OU=r.organizationalUnitName,i.organizationalUnitName="OU",i.E=r.emailAddress,i.emailAddress="E";var s=e.pki.rsa.publicKeyValidator,o={name:"Certificate",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"tbsCertificate",value:[{name:"Certificate.TBSCertificate.version",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.version.integer",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"certVersion"}]},{name:"Certificate.TBSCertificate.serialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"certSerialNumber"},{name:"Certificate.TBSCertificate.signature",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate.signature.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"certinfoSignatureOid"},{name:"Certificate.TBSCertificate.signature.parameters",tagClass:t.Class.UNIVERSAL,optional:!0,captureAsn1:"certinfoSignatureParams"}]},{name:"Certificate.TBSCertificate.issuer",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certIssuer"},{name:"Certificate.TBSCertificate.validity",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate.validity.notBefore (utc)",tagClass:t.Class.UNIVERSAL,type:t.Type.UTCTIME,constructed:!1,optional:!0,capture:"certValidity1UTCTime"},{name:"Certificate.TBSCertificate.validity.notBefore (generalized)",tagClass:t.Class.UNIVERSAL,type:t.Type.GENERALIZEDTIME,constructed:!1,optional:!0,capture:"certValidity2GeneralizedTime"},{name:"Certificate.TBSCertificate.validity.notAfter (utc)",tagClass:t.Class.UNIVERSAL,type:t.Type.UTCTIME,constructed:!1,optional:!0,capture:"certValidity3UTCTime"},{name:"Certificate.TBSCertificate.validity.notAfter (generalized)",tagClass:t.Class.UNIVERSAL,type:t.Type.GENERALIZEDTIME,constructed:!1,optional:!0,capture:"certValidity4GeneralizedTime"}]},{name:"Certificate.TBSCertificate.subject",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certSubject"},s,{name:"Certificate.TBSCertificate.issuerUniqueID",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.issuerUniqueID.id",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,capture:"certIssuerUniqueId"}]},{name:"Certificate.TBSCertificate.subjectUniqueID",tagClass:t.Class.CONTEXT_SPECIFIC,type:2,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.subjectUniqueID.id",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,capture:"certSubjectUniqueId"}]},{name:"Certificate.TBSCertificate.extensions",tagClass:t.Class.CONTEXT_SPECIFIC,type:3,constructed:!0,captureAsn1:"certExtensions",optional:!0}]},{name:"Certificate.signatureAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.signatureAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"certSignatureOid"},{name:"Certificate.TBSCertificate.signature.parameters",tagClass:t.Class.UNIVERSAL,optional:!0,captureAsn1:"certSignatureParams"}]},{name:"Certificate.signatureValue",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,capture:"certSignature"}]},u={name:"rsapss",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"rsapss.hashAlgorithm",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,value:[{name:"rsapss.hashAlgorithm.AlgorithmIdentifier",tagClass:t.Class.UNIVERSAL,type:t.Class.SEQUENCE,constructed:!0,optional:!0,value:[{name:"rsapss.hashAlgorithm.AlgorithmIdentifier.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"hashOid"}]}]},{name:"rsapss.maskGenAlgorithm",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier",tagClass:t.Class.UNIVERSAL,type:t.Class.SEQUENCE,constructed:!0,optional:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"maskGenOid"},{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.params",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.params.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"maskGenHashOid"}]}]}]},{name:"rsapss.saltLength",tagClass:t.Class.CONTEXT_SPECIFIC,type:2,optional:!0,value:[{name:"rsapss.saltLength.saltLength",tagClass:t.Class.UNIVERSAL,type:t.Class.INTEGER,constructed:!1,capture:"saltLength"}]},{name:"rsapss.trailerField",tagClass:t.Class.CONTEXT_SPECIFIC,type:3,optional:!0,value:[{name:"rsapss.trailer.trailer",tagClass:t.Class.UNIVERSAL,type:t.Class.INTEGER,constructed:!1,capture:"trailer"}]}]},a={name:"CertificationRequestInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certificationRequestInfo",value:[{name:"CertificationRequestInfo.integer",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"certificationRequestInfoVersion"},{name:"CertificationRequestInfo.subject",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certificationRequestInfoSubject"},s,{name:"CertificationRequestInfo.attributes",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,capture:"certificationRequestInfoAttributes",value:[{name:"CertificationRequestInfo.attributes",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"CertificationRequestInfo.attributes.type",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1},{name:"CertificationRequestInfo.attributes.value",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0}]}]}]},f={name:"CertificationRequest",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"csr",value:[a,{name:"CertificationRequest.signatureAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"CertificationRequest.signatureAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"csrSignatureOid"},{name:"CertificationRequest.signatureAlgorithm.parameters",tagClass:t.Class.UNIVERSAL,optional:!0,captureAsn1:"csrSignatureParams"}]},{name:"CertificationRequest.signature",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,capture:"csrSignature"}]};n.RDNAttributesAsArray=function(e,n){var s=[],o,u,a;for(var f=0;f<e.value.length;++f){o=e.value[f];for(var l=0;l<o.value.length;++l)a={},u=o.value[l],a.type=t.derToOid(u.value[0].value),a.value=u.value[1].value,a.valueTagClass=u.value[1].type,a.type in r&&(a.name=r[a.type],a.name in i&&(a.shortName=i[a.name])),n&&(n.update(a.type),n.update(a.value)),s.push(a)}return s},n.CRIAttributesAsArray=function(e){var n=[];for(var s=0;s<e.length;++s){var o=e[s],u=t.derToOid(o.value[0].value),a=o.value[1].value;for(var f=0;f<a.length;++f){var l={};l.type=u,l.value=a[f].value,l.valueTagClass=a[f].type,l.type in r&&(l.name=r[l.type],l.name in i&&(l.shortName=i[l.name])),n.push(l)}}return n};var c=function(n){var i=[],s,o,u;for(var a=0;a<n.value.length;++a){u=n.value[a];for(var f=0;f<u.value.length;++f){o=u.value[f],s={},s.id=t.derToOid(o.value[0].value),s.critical=!1,o.value[1].type===t.Type.BOOLEAN?(s.critical=o.value[1].value.charCodeAt(0)!==0,s.value=o.value[2].value):s.value=o.value[1].value;if(s.id in r){s.name=r[s.id];if(s.name==="keyUsage"){var l=t.fromDer(s.value),c=0,h=0;l.value.length>1&&(c=l.value.charCodeAt(1),h=l.value.length>2?l.value.charCodeAt(2):0),s.digitalSignature=(c&128)===128,s.nonRepudiation=(c&64)===64,s.keyEncipherment=(c&32)===32,s.dataEncipherment=(c&16)===16,s.keyAgreement=(c&8)===8,s.keyCertSign=(c&4)===4,s.cRLSign=(c&2)===2,s.encipherOnly=(c&1)===1,s.decipherOnly=(h&128)===128}else if(s.name==="basicConstraints"){var l=t.fromDer(s.value);l.value.length>0&&l.value[0].type===t.Type.BOOLEAN?s.cA=l.value[0].value.charCodeAt(0)!==0:s.cA=!1;var p=null;l.value.length>0&&l.value[0].type===t.Type.INTEGER?p=l.value[0].value:l.value.length>1&&(p=l.value[1].value),p!==null&&(s.pathLenConstraint=t.derToInteger(p))}else if(s.name==="extKeyUsage"){var l=t.fromDer(s.value);for(var d=0;d<l.value.length;++d){var v=t.derToOid(l.value[d].value);v in r?s[r[v]]=!0:s[v]=!0}}else if(s.name==="nsCertType"){var l=t.fromDer(s.value),c=0;l.value.length>1&&(c=l.value.charCodeAt(1)),s.client=(c&128)===128,s.server=(c&64)===64,s.email=(c&32)===32,s.objsign=(c&16)===16,s.reserved=(c&8)===8,s.sslCA=(c&4)===4,s.emailCA=(c&2)===2,s.objCA=(c&1)===1}else if(s.name==="subjectAltName"||s.name==="issuerAltName"){s.altNames=[];var m,l=t.fromDer(s.value);for(var g=0;g<l.value.length;++g){m=l.value[g];var y={type:m.type,value:m.value};s.altNames.push(y);switch(m.type){case 1:case 2:case 6:break;case 7:y.ip=e.util.bytesToIP(m.value);break;case 8:y.oid=t.derToOid(m.value);break;default:}}}else if(s.name==="subjectKeyIdentifier"){var l=t.fromDer(s.value);s.subjectKeyIdentifier=e.util.bytesToHex(l.value)}}i.push(s)}}return i},h=function(e,n,i){var s={};if(e!==r["RSASSA-PSS"])return s;i&&(s={hash:{algorithmOid:r.sha1},mgf:{algorithmOid:r.mgf1,hash:{algorithmOid:r.sha1}},saltLength:20});var o={},a=[];if(!t.validate(n,u,o,a)){var f=new Error("Cannot read RSASSA-PSS parameter block.");throw f.errors=a,f}return o.hashOid!==undefined&&(s.hash=s.hash||{},s.hash.algorithmOid=t.derToOid(o.hashOid)),o.maskGenOid!==undefined&&(s.mgf=s.mgf||{},s.mgf.algorithmOid=t.derToOid(o.maskGenOid),s.mgf.hash=s.mgf.hash||{},s.mgf.hash.algorithmOid=t.derToOid(o.maskGenHashOid)),o.saltLength!==undefined&&(s.saltLength=o.saltLength.charCodeAt(0)),s};n.certificateFromPem=function(r,i,s){var o=e.pem.decode(r)[0];if(o.type!=="CERTIFICATE"&&o.type!=="X509 CERTIFICATE"&&o.type!=="TRUSTED CERTIFICATE"){var u=new Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');throw u.headerType=o.type,u}if(o.procType&&o.procType.type==="ENCRYPTED")throw new Error("Could not convert certificate from PEM; PEM is encrypted.");var a=t.fromDer(o.body,s);return n.certificateFromAsn1(a,i)},n.certificateToPem=function(r,i){var s={type:"CERTIFICATE",body:t.toDer(n.certificateToAsn1(r)).getBytes()};return e.pem.encode(s,{maxline:i})},n.publicKeyFromPem=function(r){var i=e.pem.decode(r)[0];if(i.type!=="PUBLIC KEY"&&i.type!=="RSA PUBLIC KEY"){var s=new Error('Could not convert public key from PEM; PEM header type is not "PUBLIC KEY" or "RSA PUBLIC KEY".');throw s.headerType=i.type,s}if(i.procType&&i.procType.type==="ENCRYPTED")throw new Error("Could not convert public key from PEM; PEM is encrypted.");var o=t.fromDer(i.body);return n.publicKeyFromAsn1(o)},n.publicKeyToPem=function(r,i){var s={type:"PUBLIC KEY",body:t.toDer(n.publicKeyToAsn1(r)).getBytes()};return e.pem.encode(s,{maxline:i})},n.publicKeyToRSAPublicKeyPem=function(r,i){var s={type:"RSA PUBLIC KEY",body:t.toDer(n.publicKeyToRSAPublicKey(r)).getBytes()};return e.pem.encode(s,{maxline:i})},n.getPublicKeyFingerprint=function(r,i){i=i||{};var s=i.md||e.md.sha1.create(),o=i.type||"RSAPublicKey",u;switch(o){case"RSAPublicKey":u=t.toDer(n.publicKeyToRSAPublicKey(r)).getBytes();break;case"SubjectPublicKeyInfo":u=t.toDer(n.publicKeyToAsn1(r)).getBytes();break;default:throw new Error('Unknown fingerprint type "'+i.type+'".')}s.start(),s.update(u);var a=s.digest();if(i.encoding==="hex"){var f=a.toHex();return i.delimiter?f.match(/.{2}/g).join(i.delimiter):f}if(i.encoding==="binary")return a.getBytes();if(i.encoding)throw new Error('Unknown encoding "'+i.encoding+'".');return a},n.certificationRequestFromPem=function(r,i,s){var o=e.pem.decode(r)[0];if(o.type!=="CERTIFICATE REQUEST"){var u=new Error('Could not convert certification request from PEM; PEM header type is not "CERTIFICATE REQUEST".');throw u.headerType=o.type,u}if(o.procType&&o.procType.type==="ENCRYPTED")throw new Error("Could not convert certification request from PEM; PEM is encrypted.");var a=t.fromDer(o.body,s);return n.certificationRequestFromAsn1(a,i)},n.certificationRequestToPem=function(r,i){var s={type:"CERTIFICATE REQUEST",body:t.toDer(n.certificationRequestToAsn1(r)).getBytes()};return e.pem.encode(s,{maxline:i})},n.createCertificate=function(){var i={};return i.version=2,i.serialNumber="00",i.signatureOid=null,i.signature=null,i.siginfo={},i.siginfo.algorithmOid=null,i.validity={},i.validity.notBefore=new Date,i.validity.notAfter=new Date,i.issuer={},i.issuer.getField=function(e){return l(i.issuer,e)},i.issuer.addField=function(e){m([e]),i.issuer.attributes.push(e)},i.issuer.attributes=[],i.issuer.hash=null,i.subject={},i.subject.getField=function(e){return l(i.subject,e)},i.subject.addField=function(e){m([e]),i.subject.attributes.push(e)},i.subject.attributes=[],i.subject.hash=null,i.extensions=[],i.publicKey=null,i.md=null,i.setSubject=function(e,t){m(e),i.subject.attributes=e,delete i.subject.uniqueId,t&&(i.subject.uniqueId=t),i.subject.hash=null},i.setIssuer=function(e,t){m(e),i.issuer.attributes=e,delete i.issuer.uniqueId,t&&(i.issuer.uniqueId=t),i.issuer.hash=null},i.setExtensions=function(s){var o;for(var u=0;u<s.length;++u){o=s[u],typeof o.name=="undefined"&&o.id&&o.id in n.oids&&(o.name=n.oids[o.id]);if(typeof o.id=="undefined"){if(!(o.name&&o.name in n.oids)){var a=new Error("Extension ID not specified.");throw a.extension=o,a}o.id=n.oids[o.name]}if(typeof o.value=="undefined"){if(o.name==="keyUsage"){var f=0,l=0,c=0;o.digitalSignature&&(l|=128,f=7),o.nonRepudiation&&(l|=64,f=6),o.keyEncipherment&&(l|=32,f=5),o.dataEncipherment&&(l|=16,f=4),o.keyAgreement&&(l|=8,f=3),o.keyCertSign&&(l|=4,f=2),o.cRLSign&&(l|=2,f=1),o.encipherOnly&&(l|=1,f=0),o.decipherOnly&&(c|=128,f=7);var h=String.fromCharCode(f);c!==0?h+=String.fromCharCode(l)+String.fromCharCode(c):l!==0&&(h+=String.fromCharCode(l)),o.value=t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,h)}else if(o.name==="basicConstraints")o.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),o.cA&&o.value.value.push(t.create(t.Class.UNIVERSAL,t.Type.BOOLEAN,!1,String.fromCharCode(255))),"pathLenConstraint"in o&&o.value.value.push(t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(o.pathLenConstraint).getBytes()));else if(o.name==="extKeyUsage"){o.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);var p=o.value.value;for(var d in o){if(o[d]!==!0)continue;d in r?p.push(t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r[d]).getBytes())):d.indexOf(".")!==-1&&p.push(t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(d).getBytes()))}}else if(o.name==="nsCertType"){var f=0,l=0;o.client&&(l|=128,f=7),o.server&&(l|=64,f=6),o.email&&(l|=32,f=5),o.objsign&&(l|=16,f=4),o.reserved&&(l|=8,f=3),o.sslCA&&(l|=4,f=2),o.emailCA&&(l|=2,f=1),o.objCA&&(l|=1,f=0);var h=String.fromCharCode(f);l!==0&&(h+=String.fromCharCode(l)),o.value=t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,h)}else if(o.name==="subjectAltName"||o.name==="issuerAltName"){o.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);var v;for(var m=0;m<o.altNames.length;++m){v=o.altNames[m];var h=v.value;if(v.type===7&&v.ip){h=e.util.bytesFromIP(v.ip);if(h===null){var a=new Error('Extension "ip" value is not a valid IPv4 or IPv6 address.');throw a.extension=o,a}}else v.type===8&&(v.oid?h=t.oidToDer(t.oidToDer(v.oid)):h=t.oidToDer(h));o.value.value.push(t.create(t.Class.CONTEXT_SPECIFIC,v.type,!1,h))}}else if(o.name==="subjectKeyIdentifier"){var g=i.generateSubjectKeyIdentifier();o.subjectKeyIdentifier=g.toHex(),o.value=t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,g.getBytes())}if(typeof o.value=="undefined"){var a=new Error("Extension value not specified.");throw a.extension=o,a}}}i.extensions=s},i.getExtension=function(e){typeof e=="string"&&(e={name:e});var t=null,n;for(var r=0;t===null&&r<i.extensions.length;++r)n=i.extensions[r],e.id&&n.id===e.id?t=n:e.name&&n.name===e.name&&(t=n);return t},i.sign=function(s,o){i.md=o||e.md.sha1.create();var u=r[i.md.algorithm+"WithRSAEncryption"];if(!u){var a=new Error("Could not compute certificate digest. Unknown message digest algorithm OID.");throw a.algorithm=i.md.algorithm,a}i.signatureOid=i.siginfo.algorithmOid=u,i.tbsCertificate=n.getTBSCertificate(i);var f=t.toDer(i.tbsCertificate);i.md.update(f.getBytes()),i.signature=s.sign(i.md)},i.verify=function(s){var o=!1;if(!i.issued(s)){var u=s.issuer,a=i.subject,f=new Error("The parent certificate did not issue the given child certificate; the child certificate's issuer does not match the parent's subject.");throw f.expectedIssuer=u.attributes,f.actualIssuer=a.attributes,f}var l=s.md;if(l===null){if(s.signatureOid in r){var c=r[s.signatureOid];switch(c){case"sha1WithRSAEncryption":l=e.md.sha1.create();break;case"md5WithRSAEncryption":l=e.md.md5.create();break;case"sha256WithRSAEncryption":l=e.md.sha256.create();break;case"RSASSA-PSS":l=e.md.sha256.create()}}if(l===null){var f=new Error("Could not compute certificate digest. Unknown signature OID.");throw f.signatureOid=s.signatureOid,f}var h=s.tbsCertificate||n.getTBSCertificate(s),p=t.toDer(h);l.update(p.getBytes())}if(l!==null){var d;switch(s.signatureOid){case r.sha1WithRSAEncryption:d=undefined;break;case r["RSASSA-PSS"]:var v,m;v=r[s.signatureParameters.mgf.hash.algorithmOid];if(v===undefined||e.md[v]===undefined){var f=new Error("Unsupported MGF hash function.");throw f.oid=s.signatureParameters.mgf.hash.algorithmOid,f.name=v,f}m=r[s.signatureParameters.mgf.algorithmOid];if(m===undefined||e.mgf[m]===undefined){var f=new Error("Unsupported MGF function.");throw f.oid=s.signatureParameters.mgf.algorithmOid,f.name=m,f}m=e.mgf[m].create(e.md[v].create()),v=r[s.signatureParameters.hash.algorithmOid];if(v===undefined||e.md[v]===undefined)throw{message:"Unsupported RSASSA-PSS hash function.",oid:s.signatureParameters.hash.algorithmOid,name:v};d=e.pss.create(e.md[v].create(),m,s.signatureParameters.saltLength)}o=i.publicKey.verify(l.digest().getBytes(),s.signature,d)}return o},i.isIssuer=function(e){var t=!1,n=i.issuer,r=e.subject;if(n.hash&&r.hash)t=n.hash===r.hash;else if(n.attributes.length===r.attributes.length){t=!0;var s,o;for(var u=0;t&&u<n.attributes.length;++u){s=n.attributes[u],o=r.attributes[u];if(s.type!==o.type||s.value!==o.value)t=!1}}return t},i.issued=function(e){return e.isIssuer(i)},i.generateSubjectKeyIdentifier=function(){return n.getPublicKeyFingerprint(i.publicKey,{type:"RSAPublicKey"})},i.verifySubjectKeyIdentifier=function(){var t=r.subjectKeyIdentifier;for(var n=0;n<i.extensions.length;++n){var s=i.extensions[n];if(s.id===t){var o=i.generateSubjectKeyIdentifier().getBytes();return e.util.hexToBytes(s.subjectKeyIdentifier)===o}}return!1},i},n.certificateFromAsn1=function(i,s){var u={},a=[];if(!t.validate(i,o,u,a)){var f=new Error("Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.");throw f.errors=a,f}if(typeof u.certSignature!="string"){var p="\0";for(var d=0;d<u.certSignature.length;++d)p+=t.toDer(u.certSignature[d]).getBytes();u.certSignature=p}var v=t.derToOid(u.publicKeyOid);if(v!==n.oids.rsaEncryption)throw new Error("Cannot read public key. OID is not RSA.");var g=n.createCertificate();g.version=u.certVersion?u.certVersion.charCodeAt(0):0;var y=e.util.createBuffer(u.certSerialNumber);g.serialNumber=y.toHex(),g.signatureOid=e.asn1.derToOid(u.certSignatureOid),g.signatureParameters=h(g.signatureOid,u.certSignatureParams,!0),g.siginfo.algorithmOid=e.asn1.derToOid(u.certinfoSignatureOid),g.siginfo.parameters=h(g.siginfo.algorithmOid,u.certinfoSignatureParams,!1);var b=e.util.createBuffer(u.certSignature);++b.read,g.signature=b.getBytes();var w=[];u.certValidity1UTCTime!==undefined&&w.push(t.utcTimeToDate(u.certValidity1UTCTime)),u.certValidity2GeneralizedTime!==undefined&&w.push(t.generalizedTimeToDate(u.certValidity2GeneralizedTime)),u.certValidity3UTCTime!==undefined&&w.push(t.utcTimeToDate(u.certValidity3UTCTime)),u.certValidity4GeneralizedTime!==undefined&&w.push(t.generalizedTimeToDate(u.certValidity4GeneralizedTime));if(w.length>2)throw new Error("Cannot read notBefore/notAfter validity times; more than two times were provided in the certificate.");if(w.length<2)throw new Error("Cannot read notBefore/notAfter validity times; they were not provided as either UTCTime or GeneralizedTime.");g.validity.notBefore=w[0],g.validity.notAfter=w[1],g.tbsCertificate=u.tbsCertificate;if(s){g.md=null;if(g.signatureOid in r){var v=r[g.signatureOid];switch(v){case"sha1WithRSAEncryption":g.md=e.md.sha1.create();break;case"md5WithRSAEncryption":g.md=e.md.md5.create();break;case"sha256WithRSAEncryption":g.md=e.md.sha256.create();break;case"RSASSA-PSS":g.md=e.md.sha256.create()}}if(g.md===null){var f=new Error("Could not compute certificate digest. Unknown signature OID.");throw f.signatureOid=g.signatureOid,f}var E=t.toDer(g.tbsCertificate);g.md.update(E.getBytes())}var S=e.md.sha1.create();g.issuer.getField=function(e){return l(g.issuer,e)},g.issuer.addField=function(e){m([e]),g.issuer.attributes.push(e)},g.issuer.attributes=n.RDNAttributesAsArray(u.certIssuer,S),u.certIssuerUniqueId&&(g.issuer.uniqueId=u.certIssuerUniqueId),g.issuer.hash=S.digest().toHex();var x=e.md.sha1.create();return g.subject.getField=function(e){return l(g.subject,e)},g.subject.addField=function(e){m([e]),g.subject.attributes.push(e)},g.subject.attributes=n.RDNAttributesAsArray(u.certSubject,x),u.certSubjectUniqueId&&(g.subject.uniqueId=u.certSubjectUniqueId),g.subject.hash=x.digest().toHex(),u.certExtensions?g.extensions=c(u.certExtensions):g.extensions=[],g.publicKey=n.publicKeyFromAsn1(u.subjectPublicKeyInfo),g},n.certificationRequestFromAsn1=function(i,s){var o={},u=[];if(!t.validate(i,f,o,u)){var a=new Error("Cannot read PKCS#10 certificate request. ASN.1 object is not a PKCS#10 CertificationRequest.");throw a.errors=u,a}if(typeof o.csrSignature!="string"){var c="\0";for(var p=0;p<o.csrSignature.length;++p)c+=t.toDer(o.csrSignature[p]).getBytes();o.csrSignature=c}var d=t.derToOid(o.publicKeyOid);if(d!==n.oids.rsaEncryption)throw new Error("Cannot read public key. OID is not RSA.");var v=n.createCertificationRequest();v.version=o.csrVersion?o.csrVersion.charCodeAt(0):0,v.signatureOid=e.asn1.derToOid(o.csrSignatureOid),v.signatureParameters=h(v.signatureOid,o.csrSignatureParams,!0),v.siginfo.algorithmOid=e.asn1.derToOid(o.csrSignatureOid),v.siginfo.parameters=h(v.siginfo.algorithmOid,o.csrSignatureParams,!1);var g=e.util.createBuffer(o.csrSignature);++g.read,v.signature=g.getBytes(),v.certificationRequestInfo=o.certificationRequestInfo;if(s){v.md=null;if(v.signatureOid in r){var d=r[v.signatureOid];switch(d){case"sha1WithRSAEncryption":v.md=e.md.sha1.create();break;case"md5WithRSAEncryption":v.md=e.md.md5.create();break;case"sha256WithRSAEncryption":v.md=e.md.sha256.create();break;case"RSASSA-PSS":v.md=e.md.sha256.create()}}if(v.md===null){var a=new Error("Could not compute certification request digest. Unknown signature OID.");throw a.signatureOid=v.signatureOid,a}var y=t.toDer(v.certificationRequestInfo);v.md.update(y.getBytes())}var b=e.md.sha1.create();return v.subject.getField=function(e){return l(v.subject,e)},v.subject.addField=function(e){m([e]),v.subject.attributes.push(e)},v.subject.attributes=n.RDNAttributesAsArray(o.certificationRequestInfoSubject,b),v.subject.hash=b.digest().toHex(),v.publicKey=n.publicKeyFromAsn1(o.subjectPublicKeyInfo),v.getAttribute=function(e){return l(v.attributes,e)},v.addAttribute=function(e){m([e]),v.attributes.push(e)},v.attributes=n.CRIAttributesAsArray(o.certificationRequestInfoAttributes||[]),v},n.createCertificationRequest=function(){var i={};return i.version=0,i.signatureOid=null,i.signature=null,i.siginfo={},i.siginfo.algorithmOid=null,i.subject={},i.subject.getField=function(e){return l(i.subject,e)},i.subject.addField=function(e){m([e]),i.subject.attributes.push(e)},i.subject.attributes=[],i.subject.hash=null,i.publicKey=null,i.attributes=[],i.getAttribute=function(e){return l(i.attributes,e)},i.addAttribute=function(e){m([e]),i.attributes.push(e)},i.md=null,i.setSubject=function(e){m(e),i.subject.attributes=e,i.subject.hash=null},i.setAttributes=function(e){m(e),i.attributes=e},i.sign=function(s,o){i.md=o||e.md.sha1.create();var u=r[i.md.algorithm+"WithRSAEncryption"];if(!u){var a=new Error("Could not compute certification request digest. Unknown message digest algorithm OID.");throw a.algorithm=i.md.algorithm,a}i.signatureOid=i.siginfo.algorithmOid=u,i.certificationRequestInfo=n.getCertificationRequestInfo(i);var f=t.toDer(i.certificationRequestInfo);i.md.update(f.getBytes()),i.signature=s.sign(i.md)},i.verify=function(){var s=!1,o=i.md;if(o===null){if(i.signatureOid in r){var u=r[i.signatureOid];switch(u){case"sha1WithRSAEncryption":o=e.md.sha1.create();break;case"md5WithRSAEncryption":o=e.md.md5.create();break;case"sha256WithRSAEncryption":o=e.md.sha256.create();break;case"RSASSA-PSS":o=e.md.sha256.create()}}if(o===null){var a=new Error("Could not compute certification request digest. Unknown signature OID.");throw a.signatureOid=i.signatureOid,a}var f=i.certificationRequestInfo||n.getCertificationRequestInfo(i),l=t.toDer(f);o.update(l.getBytes())}if(o!==null){var c;switch(i.signatureOid){case r.sha1WithRSAEncryption:break;case r["RSASSA-PSS"]:var h,p;h=r[i.signatureParameters.mgf.hash.algorithmOid];if(h===undefined||e.md[h]===undefined){var a=new Error("Unsupported MGF hash function.");throw a.oid=i.signatureParameters.mgf.hash.algorithmOid,a.name=h,a}p=r[i.signatureParameters.mgf.algorithmOid];if(p===undefined||e.mgf[p]===undefined){var a=new Error("Unsupported MGF function.");throw a.oid=i.signatureParameters.mgf.algorithmOid,a.name=p,a}p=e.mgf[p].create(e.md[h].create()),h=r[i.signatureParameters.hash.algorithmOid];if(h===undefined||e.md[h]===undefined){var a=new Error("Unsupported RSASSA-PSS hash function.");throw a.oid=i.signatureParameters.hash.algorithmOid,a.name=h,a}c=e.pss.create(e.md[h].create(),p,i.signatureParameters.saltLength)}s=i.publicKey.verify(o.digest().getBytes(),i.signature,c)}return s},i},n.getTBSCertificate=function(r){var i=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(r.version).getBytes())]),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,e.util.hexToBytes(r.serialNumber)),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.siginfo.algorithmOid).getBytes()),g(r.siginfo.algorithmOid,r.siginfo.parameters)]),p(r.issuer),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.UTCTIME,!1,t.dateToUtcTime(r.validity.notBefore)),t.create(t.Class.UNIVERSAL,t.Type.UTCTIME,!1,t.dateToUtcTime(r.validity.notAfter))]),p(r.subject),n.publicKeyToAsn1(r.publicKey)]);return r.issuer.uniqueId&&i.value.push(t.create(t.Class.CONTEXT_SPECIFIC,1,!0,[t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,String.fromCharCode(0)+r.issuer.uniqueId)])),r.subject.uniqueId&&i.value.push(t.create(t.Class.CONTEXT_SPECIFIC,2,!0,[t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,String.fromCharCode(0)+r.subject.uniqueId)])),r.extensions.length>0&&i.value.push(d(r.extensions)),i},n.getCertificationRequestInfo=function(e){var r=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.version).getBytes()),p(e.subject),n.publicKeyToAsn1(e.publicKey),y(e)]);return r},n.distinguishedNameToAsn1=function(e){return p(e)},n.certificateToAsn1=function(e){var r=e.tbsCertificate||n.getTBSCertificate(e);return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[r,t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.signatureOid).getBytes()),g(e.signatureOid,e.signatureParameters)]),t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,String.fromCharCode(0)+e.signature)])},n.certificationRequestToAsn1=function(e){var r=e.certificationRequestInfo||n.getCertificationRequestInfo(e);return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[r,t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.signatureOid).getBytes()),g(e.signatureOid,e.signatureParameters)]),t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,String.fromCharCode(0)+e.signature)])},n.createCaStore=function(t){var r={certs:{}};r.getIssuer=function(t){var i=null;if(!t.issuer.hash){var s=e.md.sha1.create();t.issuer.attributes=n.RDNAttributesAsArray(p(t.issuer),s),t.issuer.hash=s.digest().toHex()}if(t.issuer.hash in r.certs){i=r.certs[t.issuer.hash];if(e.util.isArray(i))throw new Error("Resolving multiple issuer matches not implemented yet.")}return i},r.addCertificate=function(t){typeof t=="string"&&(t=e.pki.certificateFromPem(t));if(!t.subject.hash){var i=e.md.sha1.create();t.subject.attributes=n.RDNAttributesAsArray(p(t.subject),i),t.subject.hash=i.digest().toHex()}if(t.subject.hash in r.certs){var s=r.certs[t.subject.hash];e.util.isArray(s)||(s=[s]),s.push(t)}else r.certs[t.subject.hash]=t};if(t)for(var i=0;i<t.length;++i){var s=t[i];r.addCertificate(s)}return r},n.certificateError={bad_certificate:"forge.pki.BadCertificate",unsupported_certificate:"forge.pki.UnsupportedCertificate",certificate_revoked:"forge.pki.CertificateRevoked",certificate_expired:"forge.pki.CertificateExpired",certificate_unknown:"forge.pki.CertificateUnknown",unknown_ca:"forge.pki.UnknownCertificateAuthority"},n.verifyCertificateChain=function(t,r,i){r=r.slice(0);var s=r.slice(0),o=new Date,u=!0,a=null,f=0,l=null;do{var c=r.shift();if(o<c.validity.notBefore||o>c.validity.notAfter)a={message:"Certificate is not valid yet or has expired.",error:n.certificateError.certificate_expired,notBefore:c.validity.notBefore,notAfter:c.validity.notAfter,now:o};else{var h=!1;if(r.length>0){l=r[0];try{h=l.verify(c)}catch(p){}}else{var d=t.getIssuer(c);if(d===null)a={message:"Certificate is not trusted.",error:n.certificateError.unknown_ca};else{e.util.isArray(d)||(d=[d]);while(!h&&d.length>0){l=d.shift();try{h=l.verify(c)}catch(p){}}}}a===null&&!h&&(a={message:"Certificate signature is invalid.",error:n.certificateError.bad_certificate})}a===null&&!c.isIssuer(l)&&(a={message:"Certificate issuer is invalid.",error:n.certificateError.bad_certificate});if(a===null){var v={keyUsage:!0,basicConstraints:!0};for(var m=0;a===null&&m<c.extensions.length;++m){var g=c.extensions[m];g.critical&&!(g.name in v)&&(a={message:"Certificate has an unsupported critical extension.",error:n.certificateError.unsupported_certificate})}}if(!u||r.length===0&&!l){var y=c.getExtension("basicConstraints"),b=c.getExtension("keyUsage");b!==null&&(!b.keyCertSign||y===null)&&(a={message:"Certificate keyUsage or basicConstraints conflict or indicate that the certificate is not a CA. If the certificate is the only one in the chain or isn't the first then the certificate must be a valid CA.",error:n.certificateError.bad_certificate}),a===null&&y!==null&&!y.cA&&(a={message:"Certificate basicConstraints indicates the certificate is not a CA.",error:n.certificateError.bad_certificate});if(a===null&&b!==null&&"pathLenConstraint"in y){var w=0;for(var m=1;m<r.length-1;++m)r[m].isIssuer(r[m])&&++w;var E=y.pathLenConstraint+1;r.length-w>E&&(a={message:"Certificate basicConstraints pathLenConstraint violated.",error:n.certificateError.bad_certificate})}}var S=a===null?!0:a.error,x=i?i(S,f,s):S;if(x!==!0){S===!0&&(a={message:"The application rejected the certificate.",error:n.certificateError.bad_certificate});if(x||x===0)typeof x=="object"&&!e.util.isArray(x)?(x.message&&(a.message=x.message),x.error&&(a.error=x.error)):typeof x=="string"&&(a.error=x);throw a}a=null,u=!1,++f}while(r.length>0);return!0}}var r="x509";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n.pki}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/x509",["require","module","./aes","./asn1","./des","./md","./mgf","./oids","./pem","./pss","./rsa","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function f(e,t,n,r){var i=[];for(var s=0;s<e.length;s++)for(var o=0;o<e[s].safeBags.length;o++){var u=e[s].safeBags[o];if(r!==undefined&&u.type!==r)continue;if(t===null){i.push(u);continue}u.attributes[t]!==undefined&&u.attributes[t].indexOf(n)>=0&&i.push(u)}return i}function l(t){if(t.composed||t.constructed){var n=e.util.createBuffer();for(var r=0;r<t.value.length;++r)n.putBytes(t.value[r].value);t.composed=t.constructed=!1,t.value=n.getBytes()}return t}function c(e,r,s,o){r=t.fromDer(r,s);if(r.tagClass!==t.Class.UNIVERSAL||r.type!==t.Type.SEQUENCE||r.constructed!==!0)throw new Error("PKCS#12 AuthenticatedSafe expected to be a SEQUENCE OF ContentInfo");for(var u=0;u<r.value.length;u++){var a=r.value[u],f={},c=[];if(!t.validate(a,i,f,c)){var d=new Error("Cannot read ContentInfo.");throw d.errors=c,d}var v={encrypted:!1},m=null,g=f.content.value[0];switch(t.derToOid(f.contentType)){case n.oids.data:if(g.tagClass!==t.Class.UNIVERSAL||g.type!==t.Type.OCTETSTRING)throw new Error("PKCS#12 SafeContents Data is not an OCTET STRING.");m=l(g).value;break;case n.oids.encryptedData:m=h(g,o),v.encrypted=!0;break;default:var d=new Error("Unsupported PKCS#12 contentType.");throw d.contentType=t.derToOid(f.contentType),d}v.safeBags=p(m,s,o),e.safeContents.push(v)}}function h(r,i){var s={},o=[];if(!t.validate(r,e.pkcs7.asn1.encryptedDataValidator,s,o)){var u=new Error("Cannot read EncryptedContentInfo.");throw u.errors=o,u}var a=t.derToOid(s.contentType);if(a!==n.oids.data){var u=new Error("PKCS#12 EncryptedContentInfo ContentType is not Data.");throw u.oid=a,u}a=t.derToOid(s.encAlgorithm);var f=n.pbe.getCipher(a,s.encParameter,i),c=l(s.encryptedContentAsn1),h=e.util.createBuffer(c.value);f.update(h);if(!f.finish())throw new Error("Failed to decrypt PKCS#12 SafeContents.");return f.output.getBytes()}function p(e,r,i){if(!r&&e.length===0)return[];e=t.fromDer(e,r);if(e.tagClass!==t.Class.UNIVERSAL||e.type!==t.Type.SEQUENCE||e.constructed!==!0)throw new Error("PKCS#12 SafeContents expected to be a SEQUENCE OF SafeBag.");var s=[];for(var u=0;u<e.value.length;u++){var f=e.value[u],l={},c=[];if(!t.validate(f,o,l,c)){var h=new Error("Cannot read SafeBag.");throw h.errors=c,h}var p={type:t.derToOid(l.bagId),attributes:d(l.bagAttributes)};s.push(p);var v,m,g=l.bagValue.value[0];switch(p.type){case n.oids.pkcs8ShroudedKeyBag:g=n.decryptPrivateKeyInfo(g,i);if(g===null)throw new Error("Unable to decrypt PKCS#8 ShroudedKeyBag, wrong password?");case n.oids.keyBag:p.key=n.privateKeyFromAsn1(g);continue;case n.oids.certBag:v=a,m=function(){if(t.derToOid(l.certId)!==n.oids.x509Certificate){var e=new Error("Unsupported certificate type, only X.509 supported.");throw e.oid=t.derToOid(l.certId),e}p.cert=n.certificateFromAsn1(t.fromDer(l.cert,r),!0)};break;default:var h=new Error("Unsupported PKCS#12 SafeBag type.");throw h.oid=p.type,h}if(v!==undefined&&!t.validate(g,v,l,c)){var h=new Error("Cannot read PKCS#12 "+v.name);throw h.errors=c,h}m()}return s}function d(e){var r={};if(e!==undefined)for(var i=0;i<e.length;++i){var s={},o=[];if(!t.validate(e[i],u,s,o)){var a=new Error("Cannot read PKCS#12 BagAttribute.");throw a.errors=o,a}var f=t.derToOid(s.oid);if(n.oids[f]===undefined)continue;r[n.oids[f]]=[];for(var l=0;l<s.values.length;++l)r[n.oids[f]].push(s.values[l].value)}return r}var t=e.asn1,n=e.pki,r=e.pkcs12=e.pkcs12||{},i={name:"ContentInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"ContentInfo.contentType",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"contentType"},{name:"ContentInfo.content",tagClass:t.Class.CONTEXT_SPECIFIC,constructed:!0,captureAsn1:"content"}]},s={name:"PFX",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},i,{name:"PFX.macData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,optional:!0,captureAsn1:"mac",value:[{name:"PFX.macData.mac",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.macData.mac.digestAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.macData.mac.digestAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"macAlgorithm"},{name:"PFX.macData.mac.digestAlgorithm.parameters",tagClass:t.Class.UNIVERSAL,captureAsn1:"macAlgorithmParameters"}]},{name:"PFX.macData.mac.digest",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"macDigest"}]},{name:"PFX.macData.macSalt",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"macSalt"},{name:"PFX.macData.iterations",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,optional:!0,capture:"macIterations"}]}]},o={name:"SafeBag",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SafeBag.bagId",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"bagId"},{name:"SafeBag.bagValue",tagClass:t.Class.CONTEXT_SPECIFIC,constructed:!0,captureAsn1:"bagValue"},{name:"SafeBag.bagAttributes",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,optional:!0,capture:"bagAttributes"}]},u={name:"Attribute",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Attribute.attrId",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"oid"},{name:"Attribute.attrValues",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,capture:"values"}]},a={name:"CertBag",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"CertBag.certId",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"certId"},{name:"CertBag.certValue",tagClass:t.Class.CONTEXT_SPECIFIC,constructed:!0,value:[{name:"CertBag.certValue[0]",tagClass:t.Class.UNIVERSAL,type:t.Class.OCTETSTRING,constructed:!1,capture:"cert"}]}]};r.pkcs12FromAsn1=function(i,o,u){typeof o=="string"?(u=o,o=!0):o===undefined&&(o=!0);var a={},h=[];if(!t.validate(i,s,a,h)){var p=new Error("Cannot read PKCS#12 PFX. ASN.1 object is not an PKCS#12 PFX.");throw p.errors=p,p}var d={version:a.version.charCodeAt(0),safeContents:[],getBags:function(t){var n={},r;return"localKeyId"in t?r=t.localKeyId:"localKeyIdHex"in t&&(r=e.util.hexToBytes(t.localKeyIdHex)),r===undefined&&!("friendlyName"in t)&&"bagType"in t&&(n[t.bagType]=f(d.safeContents,null,null,t.bagType)),r!==undefined&&(n.localKeyId=f(d.safeContents,"localKeyId",r,t.bagType)),"friendlyName"in t&&(n.friendlyName=f(d.safeContents,"friendlyName",t.friendlyName,t.bagType)),n},getBagsByFriendlyName:function(e,t){return f(d.safeContents,"friendlyName",e,t)},getBagsByLocalKeyId:function(e,t){return f(d.safeContents,"localKeyId",e,t)}};if(a.version.charCodeAt(0)!==3){var p=new Error("PKCS#12 PFX of version other than 3 not supported.");throw p.version=a.version.charCodeAt(0),p}if(t.derToOid(a.contentType)!==n.oids.data){var p=new Error("Only PKCS#12 PFX in password integrity mode supported.");throw p.oid=t.derToOid(a.contentType),p}var v=a.content.value[0];if(v.tagClass!==t.Class.UNIVERSAL||v.type!==t.Type.OCTETSTRING)throw new Error("PKCS#12 authSafe content data is not an OCTET STRING.");v=l(v);if(a.mac){var m=null,g=0,y=t.derToOid(a.macAlgorithm);switch(y){case n.oids.sha1:m=e.md.sha1.create(),g=20;break;case n.oids.sha256:m=e.md.sha256.create(),g=32;break;case n.oids.sha384:m=e.md.sha384.create(),g=48;break;case n.oids.sha512:m=e.md.sha512.create(),g=64;break;case n.oids.md5:m=e.md.md5.create(),g=16}if(m===null)throw new Error("PKCS#12 uses unsupported MAC algorithm: "+y);var b=new e.util.ByteBuffer(a.macSalt),w="macIterations"in a?parseInt(e.util.bytesToHex(a.macIterations),16):1,E=r.generateKey(u,b,3,w,g,m),S=e.hmac.create();S.start(m,E),S.update(v.value);var x=S.getMac();if(x.getBytes()!==a.macDigest)throw new Error("PKCS#12 MAC could not be verified. Invalid password?")}return c(d,v.value,o,u),d},r.toPkcs12Asn1=function(i,s,o,u){u=u||{},u.saltSize=u.saltSize||8,u.count=u.count||2048,u.algorithm=u.algorithm||u.encAlgorithm||"aes128","useMac"in u||(u.useMac=!0),"localKeyId"in u||(u.localKeyId=null),"generateLocalKeyId"in u||(u.generateLocalKeyId=!0);var a=u.localKeyId,f;if(a!==null)a=e.util.hexToBytes(a);else if(u.generateLocalKeyId)if(s){var l=e.util.isArray(s)?s[0]:s;typeof l=="string"&&(l=n.certificateFromPem(l));var c=e.md.sha1.create();c.update(t.toDer(n.certificateToAsn1(l)).getBytes()),a=c.digest().getBytes()}else a=e.random.getBytes(20);var h=[];a!==null&&h.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.localKeyId).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,a)])])),"friendlyName"in u&&h.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.friendlyName).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,t.Type.BMPSTRING,!1,u.friendlyName)])])),h.length>0&&(f=t.create(t.Class.UNIVERSAL,t.Type.SET,!0,h));var p=[],d=[];s!==null&&(e.util.isArray(s)?d=s:d=[s]);var v=[];for(var m=0;m<d.length;++m){s=d[m],typeof s=="string"&&(s=n.certificateFromPem(s));var g=m===0?f:undefined,y=n.certificateToAsn1(s),b=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.certBag).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.x509Certificate).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(y).getBytes())])])]),g]);v.push(b)}if(v.length>0){var w=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,v),E=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.data).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(w).getBytes())])]);p.push(E)}var S=null;if(i!==null){var x=n.wrapRsaPrivateKey(n.privateKeyToAsn1(i));o===null?S=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.keyBag).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[x]),f]):S=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.pkcs8ShroudedKeyBag).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[n.encryptPrivateKeyInfo(x,o,u)]),f]);var T=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[S]),N=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.data).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(T).getBytes())])]);p.push(N)}var C=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,p),k;if(u.useMac){var c=e.md.sha1.create(),L=new e.util.ByteBuffer(e.random.getBytes(u.saltSize)),A=u.count,i=r.generateKey(o,L,3,A,20),O=e.hmac.create();O.start(c,i),O.update(t.toDer(C).getBytes());var M=O.getMac();k=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.sha1).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")]),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,M.getBytes())]),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,L.getBytes()),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(A).getBytes())])}return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(3).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.oids.data).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(C).getBytes())])]),k])},r.generateKey=e.pbe.generatePkcs12Key}var r="pkcs12";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pkcs12",["require","module","./asn1","./hmac","./oids","./pkcs7asn1","./pbe","./random","./rsa","./sha1","./util","./x509"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.asn1,n=e.pki=e.pki||{};n.pemToDer=function(t){var n=e.pem.decode(t)[0];if(n.procType&&n.procType.type==="ENCRYPTED")throw new Error("Could not convert PEM to DER; PEM is encrypted.");return e.util.createBuffer(n.body)},n.privateKeyFromPem=function(r){var i=e.pem.decode(r)[0];if(i.type!=="PRIVATE KEY"&&i.type!=="RSA PRIVATE KEY"){var s=new Error('Could not convert private key from PEM; PEM header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".');throw s.headerType=i.type,s}if(i.procType&&i.procType.type==="ENCRYPTED")throw new Error("Could not convert private key from PEM; PEM is encrypted.");var o=t.fromDer(i.body);return n.privateKeyFromAsn1(o)},n.privateKeyToPem=function(r,i){var s={type:"RSA PRIVATE KEY",body:t.toDer(n.privateKeyToAsn1(r)).getBytes()};return e.pem.encode(s,{maxline:i})},n.privateKeyInfoToPem=function(n,r){var i={type:"PRIVATE KEY",body:t.toDer(n).getBytes()};return e.pem.encode(i,{maxline:r})}}var r="pki";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pki",["require","module","./asn1","./oids","./pbe","./pem","./pbkdf2","./pkcs12","./pss","./rsa","./util","./x509"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=function(t,n,r,i){var s=e.util.createBuffer(),o=t.length>>1,u=o+(t.length&1),a=t.substr(0,u),f=t.substr(o,u),l=e.util.createBuffer(),c=e.hmac.create();r=n+r;var h=Math.ceil(i/16),p=Math.ceil(i/20);c.start("MD5",a);var d=e.util.createBuffer();l.putBytes(r);for(var v=0;v<h;++v)c.start(null,null),c.update(l.getBytes()),l.putBuffer(c.digest()),c.start(null,null),c.update(l.bytes()+r),d.putBuffer(c.digest());c.start("SHA1",f);var m=e.util.createBuffer();l.clear(),l.putBytes(r);for(var v=0;v<p;++v)c.start(null,null),c.update(l.getBytes()),l.putBuffer(c.digest()),c.start(null,null),c.update(l.bytes()+r),m.putBuffer(c.digest());return s.putBytes(e.util.xorBytes(d.getBytes(),m.getBytes(),i)),s},n=function(e,t,n,r){},r=function(t,n,r){var i=e.hmac.create();i.start("SHA1",t);var s=e.util.createBuffer();return s.putInt32(n[0]),s.putInt32(n[1]),s.putByte(r.type),s.putByte(r.version.major),s.putByte(r.version.minor),s.putInt16(r.length),s.putBytes(r.fragment.bytes()),i.update(s.getBytes()),i.digest().getBytes()},i=function(t,n,r){var i=!1;try{var s=t.deflate(n.fragment.getBytes());n.fragment=e.util.createBuffer(s),n.length=s.length,i=!0}catch(o){}return i},s=function(t,n,r){var i=!1;try{var s=t.inflate(n.fragment.getBytes());n.fragment=e.util.createBuffer(s),n.length=s.length,i=!0}catch(o){}return i},o=function(t,n){var r=0;switch(n){case 1:r=t.getByte();break;case 2:r=t.getInt16();break;case 3:r=t.getInt24();break;case 4:r=t.getInt32()}return e.util.createBuffer(t.getBytes(r))},u=function(e,t,n){e.putInt(n.length(),t<<3),e.putBuffer(n)},a={};a.Versions={TLS_1_0:{major:3,minor:1},TLS_1_1:{major:3,minor:2},TLS_1_2:{major:3,minor:3}},a.SupportedVersions=[a.Versions.TLS_1_1,a.Versions.TLS_1_0],a.Version=a.SupportedVersions[0],a.MaxFragment=15360,a.ConnectionEnd={server:0,client:1},a.PRFAlgorithm={tls_prf_sha256:0},a.BulkCipherAlgorithm={none:null,rc4:0,des3:1,aes:2},a.CipherType={stream:0,block:1,aead:2},a.MACAlgorithm={none:null,hmac_md5:0,hmac_sha1:1,hmac_sha256:2,hmac_sha384:3,hmac_sha512:4},a.CompressionMethod={none:0,deflate:1},a.ContentType={change_cipher_spec:20,alert:21,handshake:22,application_data:23,heartbeat:24},a.HandshakeType={hello_request:0,client_hello:1,server_hello:2,certificate:11,server_key_exchange:12,certificate_request:13,server_hello_done:14,certificate_verify:15,client_key_exchange:16,finished:20},a.Alert={},a.Alert.Level={warning:1,fatal:2},a.Alert.Description={close_notify:0,unexpected_message:10,bad_record_mac:20,decryption_failed:21,record_overflow:22,decompression_failure:30,handshake_failure:40,bad_certificate:42,unsupported_certificate:43,certificate_revoked:44,certificate_expired:45,certificate_unknown:46,illegal_parameter:47,unknown_ca:48,access_denied:49,decode_error:50,decrypt_error:51,export_restriction:60,protocol_version:70,insufficient_security:71,internal_error:80,user_canceled:90,no_renegotiation:100},a.HeartbeatMessageType={heartbeat_request:1,heartbeat_response:2},a.CipherSuites={},a.getCipherSuite=function(e){var t=null;for(var n in a.CipherSuites){var r=a.CipherSuites[n];if(r.id[0]===e.charCodeAt(0)&&r.id[1]===e.charCodeAt(1)){t=r;break}}return t},a.handleUnexpected=function(e,t){var n=!e.open&&e.entity===a.ConnectionEnd.client;n||e.error(e,{message:"Unexpected message. Received TLS record out of order.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.unexpected_message}})},a.handleHelloRequest=function(e,t,n){!e.handshaking&&e.handshakes>0&&(a.queue(e,a.createAlert(e,{level:a.Alert.Level.warning,description:a.Alert.Description.no_renegotiation})),a.flush(e)),e.process()},a.parseHelloMessage=function(t,n,r){var i=null,s=t.entity===a.ConnectionEnd.client;if(r<38)t.error(t,{message:s?"Invalid ServerHello message. Message too short.":"Invalid ClientHello message. Message too short.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.illegal_parameter}});else{var u=n.fragment,f=u.length();i={version:{major:u.getByte(),minor:u.getByte()},random:e.util.createBuffer(u.getBytes(32)),session_id:o(u,1),extensions:[]},s?(i.cipher_suite=u.getBytes(2),i.compression_method=u.getByte()):(i.cipher_suites=o(u,2),i.compression_methods=o(u,1)),f=r-(f-u.length());if(f>0){var l=o(u,2);while(l.length()>0)i.extensions.push({type:[l.getByte(),l.getByte()],data:o(l,2)});if(!s)for(var c=0;c<i.extensions.length;++c){var h=i.extensions[c];if(h.type[0]===0&&h.type[1]===0){var p=o(h.data,2);while(p.length()>0){var d=p.getByte();if(d!==0)break;t.session.extensions.server_name.serverNameList.push(o(p,2).getBytes())}}}}if(t.session.version)if(i.version.major!==t.session.version.major||i.version.minor!==t.session.version.minor)return t.error(t,{message:"TLS version change is disallowed during renegotiation.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.protocol_version}});if(s)t.session.cipherSuite=a.getCipherSuite(i.cipher_suite);else{var v=e.util.createBuffer(i.cipher_suites.bytes());while(v.length()>0){t.session.cipherSuite=a.getCipherSuite(v.getBytes(2));if(t.session.cipherSuite!==null)break}}if(t.session.cipherSuite===null)return t.error(t,{message:"No cipher suites in common.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.handshake_failure},cipherSuite:e.util.bytesToHex(i.cipher_suite)});s?t.session.compressionMethod=i.compression_method:t.session.compressionMethod=a.CompressionMethod.none}return i},a.createSecurityParameters=function(e,t){var n=e.entity===a.ConnectionEnd.client,r=t.random.bytes(),i=n?e.session.sp.client_random:r,s=n?r:a.createRandom().getBytes();e.session.sp={entity:e.entity,prf_algorithm:a.PRFAlgorithm.tls_prf_sha256,bulk_cipher_algorithm:null,cipher_type:null,enc_key_length:null,block_length:null,fixed_iv_length:null,record_iv_length:null,mac_algorithm:null,mac_length:null,mac_key_length:null,compression_algorithm:e.session.compressionMethod,pre_master_secret:null,master_secret:null,client_random:i,server_random:s}},a.handleServerHello=function(e,t,n){var r=a.parseHelloMessage(e,t,n);if(e.fail)return;if(!(r.version.minor<=e.version.minor))return e.error(e,{message:"Incompatible TLS version.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.protocol_version}});e.version.minor=r.version.minor,e.session.version=e.version;var i=r.session_id.bytes();i.length>0&&i===e.session.id?(e.expect=d,e.session.resuming=!0,e.session.sp.server_random=r.random.bytes()):(e.expect=l,e.session.resuming=!1,a.createSecurityParameters(e,r)),e.session.id=i,e.process()},a.handleClientHello=function(t,n,r){var i=a.parseHelloMessage(t,n,r);if(t.fail)return;var s=i.session_id.bytes(),o=null;if(t.sessionCache){o=t.sessionCache.getSession(s);if(o===null)s="";else if(o.version.major!==i.version.major||o.version.minor>i.version.minor)o=null,s=""}s.length===0&&(s=e.random.getBytes(32)),t.session.id=s,t.session.clientHelloVersion=i.version,t.session.sp={};if(o)t.version=t.session.version=o.version,t.session.sp=o.sp;else{var u;for(var f=1;f<a.SupportedVersions.length;++f){u=a.SupportedVersions[f];if(u.minor<=i.version.minor)break}t.version={major:u.major,minor:u.minor},t.session.version=t.version}o!==null?(t.expect=S,t.session.resuming=!0,t.session.sp.client_random=i.random.bytes()):(t.expect=t.verifyClient!==!1?b:w,t.session.resuming=!1,a.createSecurityParameters(t,i)),t.open=!0,a.queue(t,a.createRecord(t,{type:a.ContentType.handshake,data:a.createServerHello(t)})),t.session.resuming?(a.queue(t,a.createRecord(t,{type:a.ContentType.change_cipher_spec,data:a.createChangeCipherSpec()})),t.state.pending=a.createConnectionState(t),t.state.current.write=t.state.pending.write,a.queue(t,a.createRecord(t,{type:a.ContentType.handshake,data:a.createFinished(t)}))):(a.queue(t,a.createRecord(t,{type:a.ContentType.handshake,data:a.createCertificate(t)})),t.fail||(a.queue(t,a.createRecord(t,{type:a.ContentType.handshake,data:a.createServerKeyExchange(t)})),t.verifyClient!==!1&&a.queue(t,a.createRecord(t,{type:a.ContentType.handshake,data:a.createCertificateRequest(t)})),a.queue(t,a.createRecord(t,{type:a.ContentType.handshake,data:a.createServerHelloDone(t)})))),a.flush(t),t.process()},a.handleCertificate=function(t,n,r){if(r<3)return t.error(t,{message:"Invalid Certificate message. Message too short.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.illegal_parameter}});var i=n.fragment,s={certificate_list:o(i,3)},u,f,l=[];try{while(s.certificate_list.length()>0)u=o(s.certificate_list,3),f=e.asn1.fromDer(u),u=e.pki.certificateFromAsn1(f,!0),l.push(u)}catch(h){return t.error(t,{message:"Could not parse certificate list.",cause:h,send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.bad_certificate}})}var p=t.entity===a.ConnectionEnd.client;!p&&t.verifyClient!==!0||l.length!==0?l.length===0?t.expect=p?c:w:(p?t.session.serverCertificate=l[0]:t.session.clientCertificate=l[0],a.verifyCertificateChain(t,l)&&(t.expect=p?c:w)):t.error(t,{message:p?"No server certificate provided.":"No client certificate provided.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.illegal_parameter}}),t.process()},a.handleServerKeyExchange=function(e,t,n){if(n>0)return e.error(e,{message:"Invalid key parameters. Only RSA is supported.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.unsupported_certificate}});e.expect=h,e.process()},a.handleClientKeyExchange=function(t,n,r){if(r<48)return t.error(t,{message:"Invalid key parameters. Only RSA is supported.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.unsupported_certificate}});var i=n.fragment,s={enc_pre_master_secret:o(i,2).getBytes()},u=null;if(t.getPrivateKey)try{u=t.getPrivateKey(t,t.session.serverCertificate),u=e.pki.privateKeyFromPem(u)}catch(f){t.error(t,{message:"Could not get private key.",cause:f,send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.internal_error}})}if(u===null)return t.error(t,{message:"No private key set.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.internal_error}});try{var l=t.session.sp;l.pre_master_secret=u.decrypt(s.enc_pre_master_secret);var c=t.session.clientHelloVersion;if(c.major!==l.pre_master_secret.charCodeAt(0)||c.minor!==l.pre_master_secret.charCodeAt(1))throw new Error("TLS version rollback attack detected.")}catch(f){l.pre_master_secret=e.random.getBytes(48)}t.expect=S,t.session.clientCertificate!==null&&(t.expect=E),t.process()},a.handleCertificateRequest=function(e,t,n){if(n<3)return e.error(e,{message:"Invalid CertificateRequest. Message too short.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.illegal_parameter}});var r=t.fragment,i={certificate_types:o(r,1),certificate_authorities:o(r,2)};e.session.certificateRequest=i,e.expect=p,e.process()},a.handleCertificateVerify=function(t,n,r){if(r<2)return t.error(t,{message:"Invalid CertificateVerify. Message too short.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.illegal_parameter}});var i=n.fragment;i.read-=4;var s=i.bytes();i.read+=4;var u={signature:o(i,2).getBytes()},f=e.util.createBuffer();f.putBuffer(t.session.md5.digest()),f.putBuffer(t.session.sha1.digest()),f=f.getBytes();try{var l=t.session.clientCertificate;if(!l.publicKey.verify(f,u.signature,"NONE"))throw new Error("CertificateVerify signature does not match.");t.session.md5.update(s),t.session.sha1.update(s)}catch(c){return t.error(t,{message:"Bad signature in CertificateVerify.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.handshake_failure}})}t.expect=S,t.process()},a.handleServerHelloDone=function(t,n,r){if(r>0)return t.error(t,{message:"Invalid ServerHelloDone message. Invalid length.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.record_overflow}});if(t.serverCertificate===null){var i={message:"No server certificate provided. Not enough security.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.insufficient_security}},s=0,o=t.verify(t,i.alert.description,s,[]);if(o!==!0){if(o||o===0)typeof o=="object"&&!e.util.isArray(o)?(o.message&&(i.message=o.message),o.alert&&(i.alert.description=o.alert)):typeof o=="number"&&(i.alert.description=o);return t.error(t,i)}}t.session.certificateRequest!==null&&(n=a.createRecord(t,{type:a.ContentType.handshake,data:a.createCertificate(t)}),a.queue(t,n)),n=a.createRecord(t,{type:a.ContentType.handshake,data:a.createClientKeyExchange(t)}),a.queue(t,n),t.expect=g;var u=function(e,t){e.session.certificateRequest!==null&&e.session.clientCertificate!==null&&a.queue(e,a.createRecord(e,{type:a.ContentType.handshake,data:a.createCertificateVerify(e,t)})),a.queue(e,a.createRecord(e,{type:a.ContentType.change_cipher_spec,data:a.createChangeCipherSpec()})),e.state.pending=a.createConnectionState(e),e.state.current.write=e.state.pending.write,a.queue(e,a.createRecord(e,{type:a.ContentType.handshake,data:a.createFinished(e)})),e.expect=d,a.flush(e),e.process()};if(t.session.certificateRequest===null||t.session.clientCertificate===null)return u(t,null);a.getClientSignature(t,u)},a.handleChangeCipherSpec=function(e,t){if(t.fragment.getByte()!==1)return e.error(e,{message:"Invalid ChangeCipherSpec message received.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.illegal_parameter}});var n=e.entity===a.ConnectionEnd.client;if(e.session.resuming&&n||!e.session.resuming&&!n)e.state.pending=a.createConnectionState(e);e.state.current.read=e.state.pending.read;if(!e.session.resuming&&n||e.session.resuming&&!n)e.state.pending=null;e.expect=n?v:x,e.process()},a.handleFinished=function(n,r,i){var s=r.fragment;s.read-=4;var o=s.bytes();s.read+=4;var u=r.fragment.getBytes();s=e.util.createBuffer(),s.putBuffer(n.session.md5.digest()),s.putBuffer(n.session.sha1.digest());var f=n.entity===a.ConnectionEnd.client,l=f?"server finished":"client finished",c=n.session.sp,h=12,p=t;s=p(c.master_secret,l,s.getBytes(),h);if(s.getBytes()!==u)return n.error(n,{message:"Invalid verify_data in Finished message.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.decrypt_error}});n.session.md5.update(o),n.session.sha1.update(o);if(n.session.resuming&&f||!n.session.resuming&&!f)a.queue(n,a.createRecord(n,{type:a.ContentType.change_cipher_spec,data:a.createChangeCipherSpec()})),n.state.current.write=n.state.pending.write,n.state.pending=null,a.queue(n,a.createRecord(n,{type:a.ContentType.handshake,data:a.createFinished(n)}));n.expect=f?m:T,n.handshaking=!1,++n.handshakes,n.peerCertificate=f?n.session.serverCertificate:n.session.clientCertificate,a.flush(n),n.isConnected=!0,n.connected(n),n.process()},a.handleAlert=function(e,t){var n=t.fragment,r={level:n.getByte(),description:n.getByte()},i;switch(r.description){case a.Alert.Description.close_notify:i="Connection closed.";break;case a.Alert.Description.unexpected_message:i="Unexpected message.";break;case a.Alert.Description.bad_record_mac:i="Bad record MAC.";break;case a.Alert.Description.decryption_failed:i="Decryption failed.";break;case a.Alert.Description.record_overflow:i="Record overflow.";break;case a.Alert.Description.decompression_failure:i="Decompression failed.";break;case a.Alert.Description.handshake_failure:i="Handshake failure.";break;case a.Alert.Description.bad_certificate:i="Bad certificate.";break;case a.Alert.Description.unsupported_certificate:i="Unsupported certificate.";break;case a.Alert.Description.certificate_revoked:i="Certificate revoked.";break;case a.Alert.Description.certificate_expired:i="Certificate expired.";break;case a.Alert.Description.certificate_unknown:i="Certificate unknown.";break;case a.Alert.Description.illegal_parameter:i="Illegal parameter.";break;case a.Alert.Description.unknown_ca:i="Unknown certificate authority.";break;case a.Alert.Description.access_denied:i="Access denied.";break;case a.Alert.Description.decode_error:i="Decode error.";break;case a.Alert.Description.decrypt_error:i="Decrypt error.";break;case a.Alert.Description.export_restriction:i="Export restriction.";break;case a.Alert.Description.protocol_version:i="Unsupported protocol version.";break;case a.Alert.Description.insufficient_security:i="Insufficient security.";break;case a.Alert.Description.internal_error:i="Internal error.";break;case a.Alert.Description.user_canceled:i="User canceled.";break;case a.Alert.Description.no_renegotiation:i="Renegotiation not supported.";break;default:i="Unknown error."}if(r.description===a.Alert.Description.close_notify)return e.close();e.error(e,{message:i,send:!1,origin:e.entity===a.ConnectionEnd.client?"server":"client",alert:r}),e.process()},a.handleHandshake=function(t,n){var r=n.fragment,i=r.getByte(),s=r.getInt24();if(s>r.length())return t.fragmented=n,n.fragment=e.util.createBuffer(),r.read-=4,t.process();t.fragmented=null,r.read-=4;var o=r.bytes(s+4);r.read+=4,i in q[t.entity][t.expect]?(t.entity===a.ConnectionEnd.server&&!t.open&&!t.fail&&(t.handshaking=!0,t.session={version:null,extensions:{server_name:{serverNameList:[]}},cipherSuite:null,compressionMethod:null,serverCertificate:null,clientCertificate:null,md5:e.md.md5.create(),sha1:e.md.sha1.create()}),i!==a.HandshakeType.hello_request&&i!==a.HandshakeType.certificate_verify&&i!==a.HandshakeType.finished&&(t.session.md5.update(o),t.session.sha1.update(o)),q[t.entity][t.expect][i](t,n,s)):a.handleUnexpected(t,n)},a.handleApplicationData=function(e,t){e.data.putBuffer(t.fragment),e.dataReady(e),e.process()},a.handleHeartbeat=function(t,n){var r=n.fragment,i=r.getByte(),s=r.getInt16(),o=r.getBytes(s);if(i===a.HeartbeatMessageType.heartbeat_request){if(t.handshaking||s>o.length)return t.process();a.queue(t,a.createRecord(t,{type:a.ContentType.heartbeat,data:a.createHeartbeat(a.HeartbeatMessageType.heartbeat_response,o)})),a.flush(t)}else if(i===a.HeartbeatMessageType.heartbeat_response){if(o!==t.expectedHeartbeatPayload)return t.process();t.heartbeatReceived&&t.heartbeatReceived(t,e.util.createBuffer(o))}t.process()};var f=0,l=1,c=2,h=3,p=4,d=5,v=6,m=7,g=8,y=0,b=1,w=2,E=3,S=4,x=5,T=6,N=7,C=a.handleUnexpected,k=a.handleChangeCipherSpec,L=a.handleAlert,A=a.handleHandshake,O=a.handleApplicationData,M=a.handleHeartbeat,_=[];_[a.ConnectionEnd.client]=[[C,L,A,C,M],[C,L,A,C,M],[C,L,A,C,M],[C,L,A,C,M],[C,L,A,C,M],[k,L,C,C,M],[C,L,A,C,M],[C,L,A,O,M],[C,L,A,C,M]],_[a.ConnectionEnd.server]=[[C,L,A,C,M],[C,L,A,C,M],[C,L,A,C,M],[C,L,A,C,M],[k,L,C,C,M],[C,L,A,C,M],[C,L,A,O,M],[C,L,A,C,M]];var D=a.handleHelloRequest,P=a.handleServerHello,H=a.handleCertificate,B=a.handleServerKeyExchange,j=a.handleCertificateRequest,F=a.handleServerHelloDone,I=a.handleFinished,q=[];q[a.ConnectionEnd.client]=[[C,C,P,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,H,B,j,F,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,C,B,j,F,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,C,C,j,F,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,C,C,C,F,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,I],[D,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],[D,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C]];var R=a.handleClientHello,U=a.handleClientKeyExchange,z=a.handleCertificateVerify;q[a.ConnectionEnd.server]=[[C,R,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],[C,C,C,C,C,C,C,C,C,C,C,H,C,C,C,C,C,C,C,C,C],[C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,U,C,C,C,C],[C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,z,C,C,C,C,C],[C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],[C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,I],[C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],[C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C]],a.generateKeys=function(e,n){var r=t,i=n.client_random+n.server_random;e.session.resuming||(n.master_secret=r(n.pre_master_secret,"master secret",i,48).bytes(),n.pre_master_secret=null),i=n.server_random+n.client_random;var s=2*n.mac_key_length+2*n.enc_key_length,o=e.version.major===a.Versions.TLS_1_0.major&&e.version.minor===a.Versions.TLS_1_0.minor;o&&(s+=2*n.fixed_iv_length);var u=r(n.master_secret,"key expansion",i,s),f={client_write_MAC_key:u.getBytes(n.mac_key_length),server_write_MAC_key:u.getBytes(n.mac_key_length),client_write_key:u.getBytes(n.enc_key_length),server_write_key:u.getBytes(n.enc_key_length)};return o&&(f.client_write_IV=u.getBytes(n.fixed_iv_length),f.server_write_IV=u.getBytes(n.fixed_iv_length)),f},a.createConnectionState=function(e){var t=e.entity===a.ConnectionEnd.client,n=function(){var e={sequenceNumber:[0,0],macKey:null,macLength:0,macFunction:null,cipherState:null,cipherFunction:function(e){return!0},compressionState:null,compressFunction:function(e){return!0},updateSequenceNumber:function(){e.sequenceNumber[1]===4294967295?(e.sequenceNumber[1]=0,++e.sequenceNumber[0]):++e.sequenceNumber[1]}};return e},r={read:n(),write:n()};r.read.update=function(e,t){return r.read.cipherFunction(t,r.read)?r.read.compressFunction(e,t,r.read)||e.error(e,{message:"Could not decompress record.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.decompression_failure}}):e.error(e,{message:"Could not decrypt record or bad MAC.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.bad_record_mac}}),!e.fail},r.write.update=function(e,t){return r.write.compressFunction(e,t,r.write)?r.write.cipherFunction(t,r.write)||e.error(e,{message:"Could not encrypt record.",send:!1,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.internal_error}}):e.error(e,{message:"Could not compress record.",send:!1,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.internal_error}}),!e.fail};if(e.session){var o=e.session.sp;e.session.cipherSuite.initSecurityParameters(o),o.keys=a.generateKeys(e,o),r.read.macKey=t?o.keys.server_write_MAC_key:o.keys.client_write_MAC_key,r.write.macKey=t?o.keys.client_write_MAC_key:o.keys.server_write_MAC_key,e.session.cipherSuite.initConnectionState(r,e,o);switch(o.compression_algorithm){case a.CompressionMethod.none:break;case a.CompressionMethod.deflate:r.read.compressFunction=s,r.write.compressFunction=i;break;default:throw new Error("Unsupported compression algorithm.")}}return r},a.createRandom=function(){var t=new Date,n=+t+t.getTimezoneOffset()*6e4,r=e.util.createBuffer();return r.putInt32(n),r.putBytes(e.random.getBytes(28)),r},a.createRecord=function(e,t){if(!t.data)return null;var n={type:t.type,version:{major:e.version.major,minor:e.version.minor},length:t.data.length(),fragment:t.data};return n},a.createAlert=function(t,n){var r=e.util.createBuffer();return r.putByte(n.level),r.putByte(n.description),a.createRecord(t,{type:a.ContentType.alert,data:r})},a.createClientHello=function(t){t.session.clientHelloVersion={major:t.version.major,minor:t.version.minor};var n=e.util.createBuffer();for(var r=0;r<t.cipherSuites.length;++r){var i=t.cipherSuites[r];n.putByte(i.id[0]),n.putByte(i.id[1])}var s=n.length(),o=e.util.createBuffer();o.putByte(a.CompressionMethod.none);var f=o.length(),l=e.util.createBuffer();if(t.virtualHost){var c=e.util.createBuffer();c.putByte(0),c.putByte(0);var h=e.util.createBuffer();h.putByte(0),u(h,2,e.util.createBuffer(t.virtualHost));var p=e.util.createBuffer();u(p,2,h),u(c,2,p),l.putBuffer(c)}var d=l.length();d>0&&(d+=2);var v=t.session.id,m=v.length+1+2+4+28+2+s+1+f+d,g=e.util.createBuffer();return g.putByte(a.HandshakeType.client_hello),g.putInt24(m),g.putByte(t.version.major),g.putByte(t.version.minor),g.putBytes(t.session.sp.client_random),u(g,1,e.util.createBuffer(v)),u(g,2,n),u(g,1,o),d>0&&u(g,2,l),g},a.createServerHello=function(t){var n=t.session.id,r=n.length+1+2+4+28+2+1,i=e.util.createBuffer();return i.putByte(a.HandshakeType.server_hello),i.putInt24(r),i.putByte(t.version.major),i.putByte(t.version.minor),i.putBytes(t.session.sp.server_random),u(i,1,e.util.createBuffer(n)),i.putByte(t.session.cipherSuite.id[0]),i.putByte(t.session.cipherSuite.id[1]),i.putByte(t.session.compressionMethod),i},a.createCertificate=function(t){var n=t.entity===a.ConnectionEnd.client,r=null;if(t.getCertificate){var i;n?i=t.session.certificateRequest:i=t.session.extensions.server_name.serverNameList,r=t.getCertificate(t,i)}var s=e.util.createBuffer();if(r!==null)try{e.util.isArray(r)||(r=[r]);var o=null;for(var f=0;f<r.length;++f){var l=e.pem.decode(r[f])[0];if(l.type!=="CERTIFICATE"&&l.type!=="X509 CERTIFICATE"&&l.type!=="TRUSTED CERTIFICATE"){var c=new Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');throw c.headerType=l.type,c}if(l.procType&&l.procType.type==="ENCRYPTED")throw new Error("Could not convert certificate from PEM; PEM is encrypted.");var h=e.util.createBuffer(l.body);o===null&&(o=e.asn1.fromDer(h.bytes(),!1));var p=e.util.createBuffer();u(p,3,h),s.putBuffer(p)}r=e.pki.certificateFromAsn1(o),n?t.session.clientCertificate=r:t.session.serverCertificate=r}catch(d){return t.error(t,{message:"Could not send certificate list.",cause:d,send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.bad_certificate}})}var v=3+s.length(),m=e.util.createBuffer();return m.putByte(a.HandshakeType.certificate),m.putInt24(v),u(m,3,s),m},a.createClientKeyExchange=function(t){var n=e.util.createBuffer();n.putByte(t.session.clientHelloVersion.major),n.putByte(t.session.clientHelloVersion.minor),n.putBytes(e.random.getBytes(46));var r=t.session.sp;r.pre_master_secret=n.getBytes();var i=t.session.serverCertificate.publicKey;n=i.encrypt(r.pre_master_secret);var s=n.length+2,o=e.util.createBuffer();return o.putByte(a.HandshakeType.client_key_exchange),o.putInt24(s),o.putInt16(n.length),o.putBytes(n),o},a.createServerKeyExchange=function(t){var n=0,r=e.util.createBuffer();return n>0&&(r.putByte(a.HandshakeType.server_key_exchange),r.putInt24(n)),r},a.getClientSignature=function(t,n){var r=e.util.createBuffer();r.putBuffer(t.session.md5.digest()),r.putBuffer(t.session.sha1.digest()),r=r.getBytes(),t.getSignature=t.getSignature||function(t,n,r){var i=null;if(t.getPrivateKey)try{i=t.getPrivateKey(t,t.session.clientCertificate),i=e.pki.privateKeyFromPem(i)}catch(s){t.error(t,{message:"Could not get private key.",cause:s,send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.internal_error}})}i===null?t.error(t,{message:"No private key set.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.internal_error}}):n=i.sign(n,null),r(t,n)},t.getSignature(t,r,n)},a.createCertificateVerify=function(t,n){var r=n.length+2,i=e.util.createBuffer();return i.putByte(a.HandshakeType.certificate_verify),i.putInt24(r),i.putInt16(n.length),i.putBytes(n),i},a.createCertificateRequest=function(t){var n=e.util.createBuffer();n.putByte(1);var r=e.util.createBuffer();for(var i in t.caStore.certs){var s=t.caStore.certs[i],o=e.pki.distinguishedNameToAsn1(s.subject);r.putBuffer(e.asn1.toDer(o))}var f=1+n.length()+2+r.length(),l=e.util.createBuffer();return l.putByte(a.HandshakeType.certificate_request),l.putInt24(f),u(l,1,n),u(l,2,r),l},a.createServerHelloDone=function(t){var n=e.util.createBuffer();return n.putByte(a.HandshakeType.server_hello_done),n.putInt24(0),n},a.createChangeCipherSpec=function(){var t=e.util.createBuffer();return t.putByte(1),t},a.createFinished=function(n){var r=e.util.createBuffer();r.putBuffer(n.session.md5.digest()),r.putBuffer(n.session.sha1.digest());var i=n.entity===a.ConnectionEnd.client,s=n.session.sp,o=12,u=t,f=i?"client finished":"server finished";r=u(s.master_secret,f,r.getBytes(),o);var l=e.util.createBuffer();return l.putByte(a.HandshakeType.finished),l.putInt24(r.length()),l.putBuffer(r),l},a.createHeartbeat=function(t,n,r){typeof r=="undefined"&&(r=n.length);var i=e.util.createBuffer();i.putByte(t),i.putInt16(r),i.putBytes(n);var s=i.length(),o=Math.max(16,s-r-3);return i.putBytes(e.random.getBytes(o)),i},a.queue=function(t,n){if(!n)return;if(n.type===a.ContentType.handshake){var r=n.fragment.bytes();t.session.md5.update(r),t.session.sha1.update(r),r=null}var i;if(n.fragment.length()<=a.MaxFragment)i=[n];else{i=[];var s=n.fragment.bytes();while(s.length>a.MaxFragment)i.push(a.createRecord(t,{type:n.type,data:e.util.createBuffer(s.slice(0,a.MaxFragment))})),s=s.slice(a.MaxFragment);s.length>0&&i.push(a.createRecord(t,{type:n.type,data:e.util.createBuffer(s)}))}for(var o=0;o<i.length&&!t.fail;++o){var u=i[o],f=t.state.current.write;f.update(t,u)&&t.records.push(u)}},a.flush=function(e){for(var t=0;t<e.records.length;++t){var n=e.records[t];e.tlsData.putByte(n.type),e.tlsData.putByte(n.version.major),e.tlsData.putByte(n.version.minor),e.tlsData.putInt16(n.fragment.length()),e.tlsData.putBuffer(e.records[t].fragment)}return e.records=[],e.tlsDataReady(e)};var W=function(t){switch(t){case!0:return!0;case e.pki.certificateError.bad_certificate:return a.Alert.Description.bad_certificate;case e.pki.certificateError.unsupported_certificate:return a.Alert.Description.unsupported_certificate;case e.pki.certificateError.certificate_revoked:return a.Alert.Description.certificate_revoked;case e.pki.certificateError.certificate_expired:return a.Alert.Description.certificate_expired;case e.pki.certificateError.certificate_unknown:return a.Alert.Description.certificate_unknown;case e.pki.certificateError.unknown_ca:return a.Alert.Description.unknown_ca;default:return a.Alert.Description.bad_certificate}},X=function(t){switch(t){case!0:return!0;case a.Alert.Description.bad_certificate:return e.pki.certificateError.bad_certificate;case a.Alert.Description.unsupported_certificate:return e.pki.certificateError.unsupported_certificate;case a.Alert.Description.certificate_revoked:return e.pki.certificateError.certificate_revoked;case a.Alert.Description.certificate_expired:return e.pki.certificateError.certificate_expired;case a.Alert.Description.certificate_unknown:return e.pki.certificateError.certificate_unknown;case a.Alert.Description.unknown_ca:return e.pki.certificateError.unknown_ca;default:return e.pki.certificateError.bad_certificate}};a.verifyCertificateChain=function(t,n){try{e.pki.verifyCertificateChain(t.caStore,n,function(r,i,s){var o=W(r),u=t.verify(t,r,i,s);if(u!==!0){if(typeof u=="object"&&!e.util.isArray(u)){var f=new Error("The application rejected the certificate.");throw f.send=!0,f.alert={level:a.Alert.Level.fatal,description:a.Alert.Description.bad_certificate},u.message&&(f.message=u.message),u.alert&&(f.alert.description=u.alert),f}u!==r&&(u=X(u))}return u})}catch(r){var i=r;if(typeof i!="object"||e.util.isArray(i))i={send:!0,alert:{level:a.Alert.Level.fatal,description:W(r)}};"send"in i||(i.send=!0),"alert"in i||(i.alert={level:a.Alert.Level.fatal,description:W(i.error)}),t.error(t,i)}return!t.fail},a.createSessionCache=function(t,n){var r=null;if(t&&t.getSession&&t.setSession&&t.order)r=t;else{r={},r.cache=t||{},r.capacity=Math.max(n||100,1),r.order=[];for(var i in t)r.order.length<=n?r.order.push(i):delete t[i];r.getSession=function(t){var n=null,i=null;t?i=e.util.bytesToHex(t):r.order.length>0&&(i=r.order[0]);if(i!==null&&i in r.cache){n=r.cache[i],delete r.cache[i];for(var s in r.order)if(r.order[s]===i){r.order.splice(s,1);break}}return n},r.setSession=function(t,n){if(r.order.length===r.capacity){var i=r.order.shift();delete r.cache[i]}var i=e.util.bytesToHex(t);r.order.push(i),r.cache[i]=n}}return r},a.createConnection=function(t){var n=null;t.caStore?e.util.isArray(t.caStore)?n=e.pki.createCaStore(t.caStore):n=t.caStore:n=e.pki.createCaStore();var r=t.cipherSuites||null;if(r===null){r=[];for(var i in a.CipherSuites)r.push(a.CipherSuites[i])}var s=t.server||!1?a.ConnectionEnd.server:a.ConnectionEnd.client,o=t.sessionCache?a.createSessionCache(t.sessionCache):null,u={version:{major:a.Version.major,minor:a.Version.minor},entity:s,sessionId:t.sessionId,caStore:n,sessionCache:o,cipherSuites:r,connected:t.connected,virtualHost:t.virtualHost||null,verifyClient:t.verifyClient||!1,verify:t.verify||function(e,t,n,r){return t},getCertificate:t.getCertificate||null,getPrivateKey:t.getPrivateKey||null,getSignature:t.getSignature||null,input:e.util.createBuffer(),tlsData:e.util.createBuffer(),data:e.util.createBuffer(),tlsDataReady:t.tlsDataReady,dataReady:t.dataReady,heartbeatReceived:t.heartbeatReceived,closed:t.closed,error:function(e,n){n.origin=n.origin||(e.entity===a.ConnectionEnd.client?"client":"server"),n.send&&(a.queue(e,a.createAlert(e,n.alert)),a.flush(e));var r=n.fatal!==!1;r&&(e.fail=!0),t.error(e,n),r&&e.close(!1)},deflate:t.deflate||null,inflate:t.inflate||null};u.reset=function(e){u.version={major:a.Version.major,minor:a.Version.minor},u.record=null,u.session=null,u.peerCertificate=null,u.state={pending:null,current:null},u.expect=u.entity===a.ConnectionEnd.client?f:y,u.fragmented=null,u.records=[],u.open=!1,u.handshakes=0,u.handshaking=!1,u.isConnected=!1,u.fail=!e&&typeof e!="undefined",u.input.clear(),u.tlsData.clear(),u.data.clear(),u.state.current=a.createConnectionState(u)},u.reset();var l=function(e,t){var n=t.type-a.ContentType.change_cipher_spec,r=_[e.entity][e.expect];n in r?r[n](e,t):a.handleUnexpected(e,t)},c=function(t){var n=0,r=t.input,i=r.length();if(i<5)n=5-i;else{t.record={type:r.getByte(),version:{major:r.getByte(),minor:r.getByte()},length:r.getInt16(),fragment:e.util.createBuffer(),ready:!1};var s=t.record.version.major===t.version.major;s&&t.session&&t.session.version&&(s=t.record.version.minor===t.version.minor),s||t.error(t,{message:"Incompatible TLS version.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.protocol_version}})}return n},h=function(e){var t=0,n=e.input,r=n.length();if(r<e.record.length)t=e.record.length-r;else{e.record.fragment.putBytes(n.getBytes(e.record.length)),n.compact();var i=e.state.current.read;i.update(e,e.record)&&(e.fragmented!==null&&(e.fragmented.type===e.record.type?(e.fragmented.fragment.putBuffer(e.record.fragment),e.record=e.fragmented):e.error(e,{message:"Invalid fragmented record.",send:!0,alert:{level:a.Alert.Level.fatal,description:a.Alert.Description.unexpected_message}})),e.record.ready=!0)}return t};return u.handshake=function(t){if(u.entity!==a.ConnectionEnd.client)u.error(u,{message:"Cannot initiate handshake as a server.",fatal:!1});else if(u.handshaking)u.error(u,{message:"Handshake already in progress.",fatal:!1});else{u.fail&&!u.open&&u.handshakes===0&&(u.fail=!1),u.handshaking=!0,t=t||"";var n=null;t.length>0&&(u.sessionCache&&(n=u.sessionCache.getSession(t)),n===null&&(t="")),t.length===0&&u.sessionCache&&(n=u.sessionCache.getSession(),n!==null&&(t=n.id)),u.session={id:t,version:null,cipherSuite:null,compressionMethod:null,serverCertificate:null,certificateRequest:null,clientCertificate:null,sp:{},md5:e.md.md5.create(),sha1:e.md.sha1.create()},n&&(u.version=n.version,u.session.sp=n.sp),u.session.sp.client_random=a.createRandom().getBytes(),u.open=!0,a.queue(u,a.createRecord(u,{type:a.ContentType.handshake,data:a.createClientHello(u)})),a.flush(u)}},u.process=function(e){var t=0;return e&&u.input.putBytes(e),u.fail||(u.record!==null&&u.record.ready&&u.record.fragment.isEmpty()&&(u.record=null),u.record===null&&(t=c(u)),!u.fail&&u.record!==null&&!u.record.ready&&(t=h(u)),!u.fail&&u.record!==null&&u.record.ready&&l(u,u.record)),t},u.prepare=function(t){return a.queue(u,a.createRecord(u,{type:a.ContentType.application_data,data:e.util.createBuffer(t)})),a.flush(u)},u.prepareHeartbeatRequest=function(t,n){return t instanceof e.util.ByteBuffer&&(t=t.bytes()),typeof n=="undefined"&&(n=t.length),u.expectedHeartbeatPayload=t,a.queue(u,a.createRecord(u,{type:a.ContentType.heartbeat,data:a.createHeartbeat(a.HeartbeatMessageType.heartbeat_request,t,n)})),a.flush(u)},u.close=function(e){if(!u.fail&&u.sessionCache&&u.session){var t={id:u.session.id,version:u.session.version,sp:u.session.sp};t.sp.keys=null,u.sessionCache.setSession(t.id,t)}if(u.open){u.open=!1,u.input.clear();if(u.isConnected||u.handshaking)u.isConnected=u.handshaking=!1,a.queue(u,a.createAlert(u,{level:a.Alert.Level.warning,description:a.Alert.Description.close_notify})),a.flush(u);u.closed(u)}u.reset(e)},u},e.tls=e.tls||{};for(var V in a)typeof a[V]!="function"&&(e.tls[V]=a[V]);e.tls.prf_tls1=t,e.tls.hmac_sha1=r,e.tls.createSessionCache=a.createSessionCache,e.tls.createConnection=a.createConnection}var r="tls";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/tls",["require","module","./asn1","./hmac","./md","./pem","./pki","./random","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function n(n,i,s){var o=i.entity===e.tls.ConnectionEnd.client;n.read.cipherState={init:!1,cipher:e.cipher.createDecipher("AES-CBC",o?s.keys.server_write_key:s.keys.client_write_key),iv:o?s.keys.server_write_IV:s.keys.client_write_IV},n.write.cipherState={init:!1,cipher:e.cipher.createCipher("AES-CBC",o?s.keys.client_write_key:s.keys.server_write_key),iv:o?s.keys.client_write_IV:s.keys.server_write_IV},n.read.cipherFunction=u,n.write.cipherFunction=r,n.read.macLength=n.write.macLength=s.mac_length,n.read.macFunction=n.write.macFunction=t.hmac_sha1}function r(n,r){var s=!1,o=r.macFunction(r.macKey,r.sequenceNumber,n);n.fragment.putBytes(o),r.updateSequenceNumber();var u;n.version.minor===t.Versions.TLS_1_0.minor?u=r.cipherState.init?null:r.cipherState.iv:u=e.random.getBytesSync(16),r.cipherState.init=!0;var a=r.cipherState.cipher;return a.start({iv:u}),n.version.minor>=t.Versions.TLS_1_1.minor&&a.output.putBytes(u),a.update(n.fragment),a.finish(i)&&(n.fragment=a.output,n.length=n.fragment.length(),s=!0),s}function i(e,t,n){if(!n){var r=e-t.length()%e;t.fillWithByte(r-1,r)}return!0}function s(e,t,n){var r=!0;if(n){var i=t.length(),s=t.last();for(var o=i-1-s;o<i-1;++o)r=r&&t.at(o)==s;r&&t.truncate(s+1)}return r}function u(n,r){var i=!1;++o;var u;n.version.minor===t.Versions.TLS_1_0.minor?u=r.cipherState.init?null:r.cipherState.iv:u=n.fragment.getBytes(16),r.cipherState.init=!0;var a=r.cipherState.cipher;a.start({iv:u}),a.update(n.fragment),i=a.finish(s);var f=r.macLength,l="";for(var c=0;c<f;++c)l+=String.fromCharCode(0);var h=a.output.length();h>=f?(n.fragment=a.output.getBytes(h-f),l=a.output.getBytes(f)):n.fragment=a.output.getBytes(),n.fragment=e.util.createBuffer(n.fragment),n.length=n.fragment.length();var p=r.macFunction(r.macKey,r.sequenceNumber,n);return r.updateSequenceNumber(),i=p===l&&i,i}var t=e.tls;t.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA={id:[0,47],name:"TLS_RSA_WITH_AES_128_CBC_SHA",initSecurityParameters:function(e){e.bulk_cipher_algorithm=t.BulkCipherAlgorithm.aes,e.cipher_type=t.CipherType.block,e.enc_key_length=16,e.block_length=16,e.fixed_iv_length=16,e.record_iv_length=16,e.mac_algorithm=t.MACAlgorithm.hmac_sha1,e.mac_length=20,e.mac_key_length=20},initConnectionState:n},t.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA={id:[0,53],name:"TLS_RSA_WITH_AES_256_CBC_SHA",initSecurityParameters:function(e){e.bulk_cipher_algorithm=t.BulkCipherAlgorithm.aes,e.cipher_type=t.CipherType.block,e.enc_key_length=32,e.block_length=16,e.fixed_iv_length=16,e.record_iv_length=16,e.mac_algorithm=t.MACAlgorithm.hmac_sha1,e.mac_length=20,e.mac_key_length=20},initConnectionState:n};var o=0}var r="aesCipherSuites";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/aesCipherSuites",["require","module","./aes","./tls"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.debug=e.debug||{},e.debug.storage={},e.debug.get=function(t,n){var r;return typeof t=="undefined"?r=e.debug.storage:t in e.debug.storage&&(typeof n=="undefined"?r=e.debug.storage[t]:r=e.debug.storage[t][n]),r},e.debug.set=function(t,n,r){t in e.debug.storage||(e.debug.storage[t]={}),e.debug.storage[t][n]=r},e.debug.clear=function(t,n){typeof t=="undefined"?e.debug.storage={}:t in e.debug.storage&&(typeof n=="undefined"?delete e.debug.storage[t]:delete e.debug.storage[t][n])}}var r="debug";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/debug",["require","module"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function n(t,n,r,i){t.generate=function(t,s){var o=new e.util.ByteBuffer,u=Math.ceil(s/i)+r,a=new e.util.ByteBuffer;for(var f=r;f<u;++f){a.putInt32(f),n.start(),n.update(t+a.getBytes());var l=n.digest();o.putBytes(l.getBytes(i))}return o.truncate(o.length()-s),o.getBytes()}}e.kem=e.kem||{};var t=e.jsbn.BigInteger;e.kem.rsa={},e.kem.rsa.create=function(n,r){r=r||{};var i=r.prng||e.random,s={};return s.encrypt=function(r,s){var o=Math.ceil(r.n.bitLength()/8),u;do u=(new t(e.util.bytesToHex(i.getBytesSync(o)),16)).mod(r.n);while(u.equals(t.ZERO));u=e.util.hexToBytes(u.toString(16));var a=o-u.length;a>0&&(u=e.util.fillString(String.fromCharCode(0),a)+u);var f=r.encrypt(u,"NONE"),l=n.generate(u,s);return{encapsulation:f,key:l}},s.decrypt=function(e,t,r){var i=e.decrypt(t,"NONE");return n.generate(i,r)},s},e.kem.kdf1=function(e,t){n(this,e,0,t||e.digestLength)},e.kem.kdf2=function(e,t){n(this,e,1,t||e.digestLength)}}var r="kem";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/kem",["require","module","./util","./random","./jsbn"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){e.log=e.log||{},e.log.levels=["none","error","warning","info","debug","verbose","max"];var t={},n=[],r=null;e.log.LEVEL_LOCKED=2,e.log.NO_LEVEL_CHECK=4,e.log.INTERPOLATE=8;for(var i=0;i<e.log.levels.length;++i){var s=e.log.levels[i];t[s]={index:i,name:s.toUpperCase()}}e.log.logMessage=function(r){var i=t[r.level].index;for(var s=0;s<n.length;++s){var o=n[s];if(o.flags&e.log.NO_LEVEL_CHECK)o.f(r);else{var u=t[o.level].index;i<=u&&o.f(o,r)}}},e.log.prepareStandard=function(e){"standard"in e||(e.standard=t[e.level].name+" ["+e.category+"] "+e.message)},e.log.prepareFull=function(t){if(!("full"in t)){var n=[t.message];n=n.concat([]||t.arguments),t.full=e.util.format.apply(this,n)}},e.log.prepareStandardFull=function(t){"standardFull"in t||(e.log.prepareStandard(t),t.standardFull=t.standard)};var o=["error","warning","info","debug","verbose"];for(var i=0;i<o.length;++i)(function(t){e.log[t]=function(n,r){var i=Array.prototype.slice.call(arguments).slice(2),s={timestamp:new Date,level:t,category:n,message:r,arguments:i};e.log.logMessage(s)}})(o[i]);e.log.makeLogger=function(t){var n={flags:0,f:t};return e.log.setLevel(n,"none"),n},e.log.setLevel=function(t,n){var r=!1;if(t&&!(t.flags&e.log.LEVEL_LOCKED))for(var i=0;i<e.log.levels.length;++i){var s=e.log.levels[i];if(n==s){t.level=n,r=!0;break}}return r},e.log.lock=function(t,n){typeof n=="undefined"||n?t.flags|=e.log.LEVEL_LOCKED:t.flags&=~e.log.LEVEL_LOCKED},e.log.addLogger=function(e){n.push(e)};if(typeof console!="undefined"&&"log"in console){var u;if(console.error&&console.warn&&console.info&&console.debug){var a={error:console.error,warning:console.warn,info:console.info,debug:console.debug,verbose:console.debug},f=function(t,n){e.log.prepareStandard(n);var r=a[n.level],i=[n.standard];i=i.concat(n.arguments.slice()),r.apply(console,i)};u=e.log.makeLogger(f)}else{var f=function(t,n){e.log.prepareStandardFull(n),console.log(n.standardFull)};u=e.log.makeLogger(f)}e.log.setLevel(u,"debug"),e.log.addLogger(u),r=u}else console={log:function(){}};if(r!==null){var l=e.util.getQueryVariables();"console.level"in l&&e.log.setLevel(r,l["console.level"].slice(-1)[0]);if("console.lock"in l){var c=l["console.lock"].slice(-1)[0];c=="true"&&e.log.lock(r)}}e.log.consoleLogger=r}var r="log";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/log",["require","module","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t=e.asn1,n=e.pkcs7=e.pkcs7||{};n.messageFromPem=function(r){var i=e.pem.decode(r)[0];if(i.type!=="PKCS7"){var s=new Error('Could not convert PKCS#7 message from PEM; PEM header type is not "PKCS#7".');throw s.headerType=i.type,s}if(i.procType&&i.procType.type==="ENCRYPTED")throw new Error("Could not convert PKCS#7 message from PEM; PEM is encrypted.");var o=t.fromDer(i.body);return n.messageFromAsn1(o)},n.messageToPem=function(n,r){var i={type:"PKCS7",body:t.toDer(n.toAsn1()).getBytes()};return e.pem.encode(i,{maxline:r})},n.messageFromAsn1=function(r){var i={},s=[];if(!t.validate(r,n.asn1.contentInfoValidator,i,s)){var o=new Error("Cannot read PKCS#7 message. ASN.1 object is not an PKCS#7 ContentInfo.");throw o.errors=s,o}var u=t.derToOid(i.contentType),a;switch(u){case e.pki.oids.envelopedData:a=n.createEnvelopedData();break;case e.pki.oids.encryptedData:a=n.createEncryptedData();break;case e.pki.oids.signedData:a=n.createSignedData();break;default:throw new Error("Cannot read PKCS#7 message. ContentType with OID "+u+" is not (yet) supported.")}return a.fromAsn1(i.content.value[0]),a};var r=function(r){var i={},s=[];if(!t.validate(r,n.asn1.recipientInfoValidator,i,s)){var o=new Error("Cannot read PKCS#7 message. ASN.1 object is not an PKCS#7 EnvelopedData.");throw o.errors=s,o}return{version:i.version.charCodeAt(0),issuer:e.pki.RDNAttributesAsArray(i.issuer),serialNumber:e.util.createBuffer(i.serial).toHex(),encryptedContent:{algorithm:t.derToOid(i.encAlgorithm),parameter:i.encParameter.value,content:i.encKey}}},i=function(n){return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(n.version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[e.pki.distinguishedNameToAsn1({attributes:n.issuer}),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,e.util.hexToBytes(n.serialNumber))]),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.encryptedContent.algorithm).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")]),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,n.encryptedContent.content)])},s=function(e){var t=[];for(var n=0;n<e.length;n++)t.push(r(e[n]));return t},o=function(e){var t=[];for(var n=0;n<e.length;n++)t.push(i(e[n]));return t},u=function(n){return[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.pki.oids.data).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.algorithm).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,n.parameter.getBytes())]),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,n.content.getBytes())])]},a=function(n,r,i){var s={},o=[];if(!t.validate(r,i,s,o)){var u=new Error("Cannot read PKCS#7 message. ASN.1 object is not a supported PKCS#7 message.");throw u.errors=u,u}var a=t.derToOid(s.contentType);if(a!==e.pki.oids.data)throw new Error("Unsupported PKCS#7 message. Only wrapped ContentType Data supported.");if(s.encryptedContent){var f="";if(e.util.isArray(s.encryptedContent))for(var l=0;l<s.encryptedContent.length;++l){if(s.encryptedContent[l].type!==t.Type.OCTETSTRING)throw new Error("Malformed PKCS#7 message, expecting encrypted content constructed of only OCTET STRING objects.");f+=s.encryptedContent[l].value}else f=s.encryptedContent;n.encryptedContent={algorithm:t.derToOid(s.encAlgorithm),parameter:e.util.createBuffer(s.encParameter.value),content:e.util.createBuffer(f)}}if(s.content){var f="";if(e.util.isArray(s.content))for(var l=0;l<s.content.length;++l){if(s.content[l].type!==t.Type.OCTETSTRING)throw new Error("Malformed PKCS#7 message, expecting content constructed of only OCTET STRING objects.");f+=s.content[l].value}else f=s.content;n.content=e.util.createBuffer(f)}return n.version=s.version.charCodeAt(0),n.rawCapture=s,s},f=function(t){if(t.encryptedContent.key===undefined)throw new Error("Symmetric key not available.");if(t.content===undefined){var n;switch(t.encryptedContent.algorithm){case e.pki.oids["aes128-CBC"]:case e.pki.oids["aes192-CBC"]:case e.pki.oids["aes256-CBC"]:n=e.aes.createDecryptionCipher(t.encryptedContent.key);break;case e.pki.oids.desCBC:case e.pki.oids["des-EDE3-CBC"]:n=e.des.createDecryptionCipher(t.encryptedContent.key);break;default:throw new Error("Unsupported symmetric cipher, OID "+t.encryptedContent.algorithm)}n.start(t.encryptedContent.parameter),n.update(t.encryptedContent.content);if(!n.finish())throw new Error("Symmetric decryption failed.");t.content=n.output}};n.createSignedData=function(){var r=null;return r={type:e.pki.oids.signedData,version:1,certificates:[],crls:[],digestAlgorithmIdentifiers:[],contentInfo:null,signerInfos:[],fromAsn1:function(t){a(r,t,n.asn1.signedDataValidator),r.certificates=[],r.crls=[],r.digestAlgorithmIdentifiers=[],r.contentInfo=null,r.signerInfos=[];var i=r.rawCapture.certificates.value;for(var s=0;s<i.length;++s)r.certificates.push(e.pki.certificateFromAsn1(i[s]))},toAsn1:function(){if("content"in r)throw new Error("Signing PKCS#7 content not yet implemented.");r.contentInfo||r.sign();var n=[];for(var i=0;i<r.certificates.length;++i)n.push(e.pki.certificateToAsn1(r.certificates[0]));var s=[];return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.type).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(r.version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,r.digestAlgorithmIdentifiers),r.contentInfo,t.create(t.Class.CONTEXT_SPECIFIC,0,!0,n),t.create(t.Class.CONTEXT_SPECIFIC,1,!0,s),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,r.signerInfos)])])])},sign:function(n){if("content"in r)throw new Error("PKCS#7 signing not yet implemented.");typeof r.content!="object"&&(r.contentInfo=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.pki.oids.data).getBytes())]),"content"in r&&r.contentInfo.value.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,r.content)])))},verify:function(){throw new Error("PKCS#7 signature verification not yet implemented.")},addCertificate:function(t){typeof t=="string"&&(t=e.pki.certificateFromPem(t)),r.certificates.push(t)},addCertificateRevokationList:function(e){throw new Error("PKCS#7 CRL support not yet implemented.")}},r},n.createEncryptedData=function(){var t=null;return t={type:e.pki.oids.encryptedData,version:0,encryptedContent:{algorithm:e.pki.oids["aes256-CBC"]},fromAsn1:function(e){a(t,e,n.asn1.encryptedDataValidator)},decrypt:function(e){e!==undefined&&(t.encryptedContent.key=e),f(t)}},t},n.createEnvelopedData=function(){var r=null;return r={type:e.pki.oids.envelopedData,version:0,recipients:[],encryptedContent:{algorithm:e.pki.oids["aes256-CBC"]},fromAsn1:function(e){var t=a(r,e,n.asn1.envelopedDataValidator);r.recipients=s(t.recipientInfos.value)},toAsn1:function(){return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.type).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(r.version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,o(r.recipients)),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,u(r.encryptedContent))])])])},findRecipient:function(e){var t=e.issuer.attributes;for(var n=0;n<r.recipients.length;++n){var i=r.recipients[n],s=i.issuer;if(i.serialNumber!==e.serialNumber)continue;if(s.length!==t.length)continue;var o=!0;for(var u=0;u<t.length;++u)if(s[u].type!==t[u].type||s[u].value!==t[u].value){o=!1;break}if(o)return i}return null},decrypt:function(t,n){if(r.encryptedContent.key===undefined&&t!==undefined&&n!==undefined)switch(t.encryptedContent.algorithm){case e.pki.oids.rsaEncryption:case e.pki.oids.desCBC:var i=n.decrypt(t.encryptedContent.content);r.encryptedContent.key=e.util.createBuffer(i);break;default:throw new Error("Unsupported asymmetric cipher, OID "+t.encryptedContent.algorithm)}f(r)},addRecipient:function(t){r.recipients.push({version:0,issuer:t.issuer.attributes,serialNumber:t.serialNumber,encryptedContent:{algorithm:e.pki.oids.rsaEncryption,key:t.publicKey}})},encrypt:function(t,n){if(r.encryptedContent.content===undefined){n=n||r.encryptedContent.algorithm,t=t||r.encryptedContent.key;var i,s,o;switch(n){case e.pki.oids["aes128-CBC"]:i=16,s=16,o=e.aes.createEncryptionCipher;break;case e.pki.oids["aes192-CBC"]:i=24,s=16,o=e.aes.createEncryptionCipher;break;case e.pki.oids["aes256-CBC"]:i=32,s=16,o=e.aes.createEncryptionCipher;break;case e.pki.oids["des-EDE3-CBC"]:i=24,s=8,o=e.des.createEncryptionCipher;break;default:throw new Error("Unsupported symmetric cipher, OID "+n)}if(t===undefined)t=e.util.createBuffer(e.random.getBytes(i));else if(t.length()!=i)throw new Error("Symmetric key has wrong length; got "+t.length()+" bytes, expected "+i+".");r.encryptedContent.algorithm=n,r.encryptedContent.key=t,r.encryptedContent.parameter=e.util.createBuffer(e.random.getBytes(s));var u=o(t);u.start(r.encryptedContent.parameter.copy()),u.update(r.content);if(!u.finish())throw new Error("Symmetric encryption failed.");r.encryptedContent.content=u.output}for(var a=0;a<r.recipients.length;a++){var f=r.recipients[a];if(f.encryptedContent.content!==undefined)continue;switch(f.encryptedContent.algorithm){case e.pki.oids.rsaEncryption:f.encryptedContent.content=f.encryptedContent.key.encrypt(r.encryptedContent.key.data);break;default:throw new Error("Unsupported asymmetric cipher, OID "+f.encryptedContent.algorithm)}}}},r}}var r="pkcs7";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/pkcs7",["require","module","./aes","./asn1","./des","./oids","./pem","./pkcs7asn1","./random","./util","./x509"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){function n(t,n){var r=n.toString(16);r[0]>="8"&&(r="00"+r);var i=e.util.hexToBytes(r);t.putInt32(i.length),t.putBytes(i)}function r(e,t){e.putInt32(t.length),e.putString(t)}function i(){var t=e.md.sha1.create(),n=arguments.length;for(var r=0;r<n;++r)t.update(arguments[r]);return t.digest()}var t=e.ssh=e.ssh||{};t.privateKeyToPutty=function(t,s,o){o=o||"",s=s||"";var u="ssh-rsa",a=s===""?"none":"aes256-cbc",f="PuTTY-User-Key-File-2: "+u+"\r\n";f+="Encryption: "+a+"\r\n",f+="Comment: "+o+"\r\n";var l=e.util.createBuffer();r(l,u),n(l,t.e),n(l,t.n);var c=e.util.encode64(l.bytes(),64),h=Math.floor(c.length/66)+1;f+="Public-Lines: "+h+"\r\n",f+=c;var p=e.util.createBuffer();n(p,t.d),n(p,t.p),n(p,t.q),n(p,t.qInv);var d;if(!s)d=e.util.encode64(p.bytes(),64);else{var v=p.length()+16-1;v-=v%16;var m=i(p.bytes());m.truncate(m.length()-v+p.length()),p.putBuffer(m);var g=e.util.createBuffer();g.putBuffer(i("\0\0\0\0",s)),g.putBuffer(i("\0\0\0",s));var y=e.aes.createEncryptionCipher(g.truncate(8),"CBC");y.start(e.util.createBuffer().fillWithByte(0,16)),y.update(p.copy()),y.finish();var b=y.output;b.truncate(16),d=e.util.encode64(b.bytes(),64)}h=Math.floor(d.length/66)+1,f+="\r\nPrivate-Lines: "+h+"\r\n",f+=d;var w=i("putty-private-key-file-mac-key",s),E=e.util.createBuffer();r(E,u),r(E,a),r(E,o),E.putInt32(l.length()),E.putBuffer(l),E.putInt32(p.length()),E.putBuffer(p);var S=e.hmac.create();return S.start("sha1",w),S.update(E.bytes()),f+="\r\nPrivate-MAC: "+S.digest().toHex()+"\r\n",f},t.publicKeyToOpenSSH=function(t,i){var s="ssh-rsa";i=i||"";var o=e.util.createBuffer();return r(o,s),n(o,t.e),n(o,t.n),s+" "+e.util.encode64(o.bytes())+" "+i},t.privateKeyToOpenSSH=function(t,n){return n?e.pki.encryptRsaPrivateKey(t,n,{legacy:!0,algorithm:"aes128"}):e.pki.privateKeyToPem(t)},t.getPublicKeyFingerprint=function(t,i){i=i||{};var s=i.md||e.md.md5.create(),o="ssh-rsa",u=e.util.createBuffer();r(u,o),n(u,t.e),n(u,t.n),s.start(),s.update(u.getBytes());var a=s.digest();if(i.encoding==="hex"){var f=a.toHex();return i.delimiter?f.match(/.{2}/g).join(i.delimiter):f}if(i.encoding==="binary")return a.getBytes();if(i.encoding)throw new Error('Unknown encoding "'+i.encoding+'".');return a}}var r="ssh";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/ssh",["require","module","./aes","./hmac","./md5","./sha1","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){function e(e){var t="forge.task",n=0,r={},i=0;e.debug.set(t,"tasks",r);var s={};e.debug.set(t,"queues",s);var o="?",u=30,a=20,f="ready",l="running",c="blocked",h="sleeping",p="done",d="error",v="stop",m="start",g="block",y="unblock",b="sleep",w="wakeup",E="cancel",S="fail",x={};x[f]={},x[f][v]=f,x[f][m]=l,x[f][E]=p,x[f][S]=d,x[l]={},x[l][v]=f,x[l][m]=l,x[l][g]=c,x[l][y]=l,x[l][b]=h,x[l][w]=l,x[l][E]=p,x[l][S]=d,x[c]={},x[c][v]=c,x[c][m]=c,x[c][g]=c,x[c][y]=c,x[c][b]=c,x[c][w]=c,x[c][E]=p,x[c][S]=d,x[h]={},x[h][v]=h,x[h][m]=h,x[h][g]=h,x[h][y]=h,x[h][b]=h,x[h][w]=h,x[h][E]=p,x[h][S]=d,x[p]={},x[p][v]=p,x[p][m]=p,x[p][g]=p,x[p][y]=p,x[p][b]=p,x[p][w]=p,x[p][E]=p,x[p][S]=d,x[d]={},x[d][v]=d,x[d][m]=d,x[d][g]=d,x[d][y]=d,x[d][b]=d,x[d][w]=d,x[d][E]=d,x[d][S]=d;var T=function(s){this.id=-1,this.name=s.name||o,this.parent=s.parent||null,this.run=s.run,this.subtasks=[],this.error=!1,this.state=f,this.blocks=0,this.timeoutId=null,this.swapTime=null,this.userData=null,this.id=i++,r[this.id]=this,n>=1&&e.log.verbose(t,"[%s][%s] init",this.id,this.name,this)};T.prototype.debug=function(n){n=n||"",e.log.debug(t,n,"[%s][%s] task:",this.id,this.name,this,"subtasks:",this.subtasks.length,"queue:",s)},T.prototype.next=function(e,t){typeof e=="function"&&(t=e,e=this.name);var n=new T({run:t,name:e,parent:this});return n.state=l,n.type=this.type,n.successCallback=this.successCallback||null,n.failureCallback=this.failureCallback||null,this.subtasks.push(n),this},T.prototype.parallel=function(t,n){return e.util.isArray(t)&&(n=t,t=this.name),this.next(t,function(r){var i=r;i.block(n.length);var s=function(t,r){e.task.start({type:t,run:function(e){n[r](e)},success:function(e){i.unblock()},failure:function(e){i.unblock()}})};for(var o=0;o<n.length;o++){var u=t+"__parallel-"+r.id+"-"+o,a=o;s(u,a)}})},T.prototype.stop=function(){this.state=x[this.state][v]},T.prototype.start=function(){this.error=!1,this.state=x[this.state][m],this.state===l&&(this.start=new Date,this.run(this),C(this,0))},T.prototype.block=function(e){e=typeof e=="undefined"?1:e,this.blocks+=e,this.blocks>0&&(this.state=x[this.state][g])},T.prototype.unblock=function(e){return e=typeof e=="undefined"?1:e,this.blocks-=e,this.blocks===0&&this.state!==p&&(this.state=l,C(this,0)),this.blocks},T.prototype.sleep=function(e){e=typeof e=="undefined"?0:e,this.state=x[this.state][b];var t=this;this.timeoutId=setTimeout(function(){t.timeoutId=null,t.state=l,C(t,0)},e)},T.prototype.wait=function(e){e.wait(this)},T.prototype.wakeup=function(){this.state===h&&(cancelTimeout(this.timeoutId),this.timeoutId=null,this.state=l,C(this,0))},T.prototype.cancel=function(){this.state=x[this.state][E],this.permitsNeeded=0,this.timeoutId!==null&&(cancelTimeout(this.timeoutId),this.timeoutId=null),this.subtasks=[]},T.prototype.fail=function(e){this.error=!0,k(this,!0);if(e)e.error=this.error,e.swapTime=this.swapTime,e.userData=this.userData,C(e,0);else{if(this.parent!==null){var t=this.parent;while(t.parent!==null)t.error=this.error,t.swapTime=this.swapTime,t.userData=this.userData,t=t.parent;k(t,!0)}this.failureCallback&&this.failureCallback(this)}};var N=function(e){e.error=!1,e.state=x[e.state][m],setTimeout(function(){e.state===l&&(e.swapTime=+(new Date),e.run(e),C(e,0))},0)},C=function(e,t){var n=t>u||+(new Date)-e.swapTime>a,r=function(t){t++;if(e.state===l){n&&(e.swapTime=+(new Date));if(e.subtasks.length>0){var r=e.subtasks.shift();r.error=e.error,r.swapTime=e.swapTime,r.userData=e.userData,r.run(r),r.error||C(r,t)}else k(e),e.error||e.parent!==null&&(e.parent.error=e.error,e.parent.swapTime=e.swapTime,e.parent.userData=e.userData,C(e.parent,t))}};n?setTimeout(r,0):r(t)},k=function(i,o){i.state=p,delete r[i.id],n>=1&&e.log.verbose(t,"[%s][%s] finish",i.id,i.name,i),i.parent===null&&(i.type in s?s[i.type].length===0?e.log.error(t,"[%s][%s] task queue empty [%s]",i.id,i.name,i.type):s[i.type][0]!==i?e.log.error(t,"[%s][%s] task not first in queue [%s]",i.id,i.name,i.type):(s[i.type].shift(),s[i.type].length===0?(n>=1&&e.log.verbose(t,"[%s][%s] delete queue [%s]",i.id,i.name,i.type),delete s[i.type]):(n>=1&&e.log.verbose(t,"[%s][%s] queue start next [%s] remain:%s",i.id,i.name,i.type,s[i.type].length),s[i.type][0].start())):e.log.error(t,"[%s][%s] task queue missing [%s]",i.id,i.name,i.type),o||(i.error&&i.failureCallback?i.failureCallback(i):!i.error&&i.successCallback&&i.successCallback(i)))};e.task=e.task||{},e.task.start=function(r){var i=new T({run:r.run,name:r.name||o});i.type=r.type,i.successCallback=r.success||null,i.failureCallback=r.failure||null,i.type in s?s[r.type].push(i):(n>=1&&e.log.verbose(t,"[%s][%s] create queue [%s]",i.id,i.name,i.type),s[i.type]=[i],N(i))},e.task.cancel=function(e){e in s&&(s[e]=[s[e][0]])},e.task.createCondition=function(){var e={tasks:{}};return e.wait=function(t){t.id in e.tasks||(t.block(),e.tasks[t.id]=t)},e.notify=function(){var t=e.tasks;e.tasks={};for(var n in t)t[n].unblock()},e}}var r="task";if(typeof n!="function"){if(typeof module!="object"||!module.exports)return typeof forge=="undefined"&&(forge={}),e(forge);var i=!0;n=function(e,n){n(t,module)}}var s,o=function(t,n){n.exports=function(n){var i=s.map(function(e){return t(e)}).concat(e);n=n||{},n.defined=n.defined||{};if(n.defined[r])return n[r];n.defined[r]=!0;for(var o=0;o<i.length;++o)i[o](n);return n[r]}},u=n;n=function(e,t){return s=typeof e=="string"?t.slice(2):e.slice(2),i?(delete n,u.apply(null,Array.prototype.slice.call(arguments,0))):(n=u,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/task",["require","module","./debug","./log","./util"],function(){o.apply(null,Array.prototype.slice.call(arguments,0))})}(),function(){var e="forge";if(typeof n!="function"){if(typeof module!="object"||!module.exports){typeof forge=="undefined"&&(forge={disableNativeCode:!1});return}var r=!0;n=function(e,n){n(t,module)}}var i,s=function(t,n){n.exports=function(n){var r=i.map(function(e){return t(e)});n=n||{},n.defined=n.defined||{};if(n.defined[e])return n[e];n.defined[e]=!0;for(var s=0;s<r.length;++s)r[s](n);return n},n.exports.disableNativeCode=!1,n.exports(n.exports)},o=n;n=function(e,t){return i=typeof e=="string"?t.slice(2):e.slice(2),r?(delete n,o.apply(null,Array.prototype.slice.call(arguments,0))):(n=o,n.apply(null,Array.prototype.slice.call(arguments,0)))},n("js/forge",["require","module","./aes","./aesCipherSuites","./asn1","./cipher","./cipherModes","./debug","./des","./hmac","./kem","./log","./md","./mgf1","./pbkdf2","./pem","./pkcs7","./pkcs1","./pkcs12","./pki","./prime","./prng","./pss","./random","./rc2","./ssh","./task","./tls","./util"],function(){s.apply(null,Array.prototype.slice.call(arguments,0))})}(),t("js/forge")});
}).call(this,require('_process'))
},{"_process":28}],65:[function(require,module,exports){
(function (process,Buffer){
var stream = require('stream');
var util = require('util');
var timers = require('timers');
var http = require('http');

var debug = util.debuglog('net');

exports.createServer = function () {
	throw new Error('Cannot create server in a browser');
};

exports.connect = exports.createConnection = function (/* options, connectListener */) {
	var args = normalizeConnectArgs(arguments);
	debug('createConnection', args);
	var s = new Socket(args[0]);
	return Socket.prototype.connect.apply(s, args);
};

function toNumber(x) { return (x = Number(x)) >= 0 ? x : false; }

function isPipeName(s) {
	return util.isString(s) && toNumber(s) === false;
}

// Returns an array [options] or [options, cb]
// It is the same as the argument of Socket.prototype.connect().
function normalizeConnectArgs(args) {
	var options = {};
	if (util.isObject(args[0])) {
		// connect(options, [cb])
		options = args[0];
	} else if (isPipeName(args[0])) {
		// connect(path, [cb]);
		options.path = args[0];
	} else {
		// connect(port, [host], [cb])
		options.port = args[0];
		if (util.isString(args[1])) {
			options.host = args[1];
		}
	}
	var cb = args[args.length - 1];
	return util.isFunction(cb) ? [options, cb] : [options];
}
exports._normalizeConnectArgs = normalizeConnectArgs;

function Socket(options) {
	if (!(this instanceof Socket)) return new Socket(options);

	this._connecting = false;
	this._host = null;

	if (util.isNumber(options))
		options = { fd: options }; // Legacy interface.
	else if (util.isUndefined(options))
		options = {};

	stream.Duplex.call(this, options);

	// these will be set once there is a connection
	this.readable = this.writable = false;

	//this._pendingData = null;
	//this._pendingEncoding = '';

	// handle strings directly
	this._writableState.decodeStrings = false;

	// default to *not* allowing half open sockets
	this.allowHalfOpen = options && options.allowHalfOpen || false;
}
util.inherits(Socket, stream.Duplex);

exports.Socket = Socket;
exports.Stream = Socket; // Legacy naming.

Socket.prototype.listen = function () {
	throw new Error('Cannot listen in a browser');
};

Socket.prototype.setTimeout = function (msecs, callback) {
	if (msecs > 0 && isFinite(msecs)) {
		timers.enroll(this, msecs);
		//timers._unrefActive(this);
		if (callback) {
			this.once('timeout', callback);
		}
	} else if (msecs === 0) {
		timers.unenroll(this);
		if (callback) {
			this.removeListener('timeout', callback);
		}
	}
};

Socket.prototype._onTimeout = function () {
	debug('_onTimeout');
	this.emit('timeout');
};

Socket.prototype.setNoDelay = function (enable) {};

Socket.prototype.setKeepAlive = function (setting, msecs) {};

Socket.prototype.address = function () {}; //TODO

Object.defineProperty(Socket.prototype, 'readyState', {
	get: function() {
		if (this._connecting) {
			return 'opening';
		} else if (this.readable && this.writable) {
			return 'open';
		} else if (this.readable && !this.writable) {
			return 'readOnly';
		} else if (!this.readable && this.writable) {
			return 'writeOnly';
		} else {
			return 'closed';
		}
	}
});

Socket.prototype.bufferSize = undefined;

Socket.prototype._read = function () {};

Socket.prototype.end = function(data, encoding) {
	stream.Duplex.prototype.end.call(this, data, encoding);
	this.writable = false;

	// just in case we're waiting for an EOF.
	if (this.readable && !this._readableState.endEmitted)
		this.read(0);
	else
		maybeDestroy(this);
};

// Call whenever we set writable=false or readable=false
function maybeDestroy(socket) {
	if (!socket.readable &&
		!socket.writable &&
		!socket.destroyed &&
		!socket._connecting &&
		!socket._writableState.length) {
		socket.destroy();
	}
}

Socket.prototype.destroySoon = function() {
	if (this.writable)
		this.end();
	if (this._writableState.finished)
		this.destroy();
	else
		this.once('finish', this.destroy);
};

Socket.prototype.destroy = function(exception) {
	debug('destroy', exception);
	
	if (this.destroyed) {
		return;
	}

	self._connecting = false;

	this.readable = this.writable = false;

	timers.unenroll(this);

	debug('close');

	this.destroyed = true;
};

//TODO
Socket.prototype.remoteAddress = undefined;
Socket.prototype.remoteFamily = undefined;
Socket.prototype.remotePort = undefined;

Socket.prototype.localAddress = '127.0.0.1';
Socket.prototype.localPort = '80';

Socket.prototype._write = function (data, encoding, cb) {
	cb = cb || function () {};

	// If we are still connecting, then buffer this for later.
	// The Writable logic will buffer up any more writes while
	// waiting for this one to be done.
	if (this._connecting) {
		this._pendingData = data;
		this._pendingEncoding = encoding;
		this.once('connect', function() {
			this._write(data, encoding, cb);
		});
		return;
	}
	this._pendingData = null;
	this._pendingEncoding = '';

	if (encoding == 'binary' && typeof data == 'string') {
		data = new Buffer(data, encoding); // Setting encoding is very important for binary data - otherwise the data gets modified
	}

	this._ws.send(data);

	process.nextTick(function () {
		//console.log('[tcp] sent: ', data.toString(), data.length);
		cb();
	});
};

Socket.prototype.write = function(chunk, encoding, cb) {
	if (!util.isString(chunk) && !util.isBuffer(chunk))
		throw new TypeError('invalid data');
	return stream.Duplex.prototype.write.apply(this, arguments);
};

//TODO
Socket.prototype.bytesWritten = 0;

Socket.prototype.connect = function(options, cb) {
	var self = this;
	
	if (!util.isObject(options)) {
		// Old API:
		// connect(port, [host], [cb])
		// connect(path, [cb]);
		var args = normalizeConnectArgs(arguments);
		return Socket.prototype.connect.apply(this, args);
	}

	cb = cb || function () {};

	if (this.write !== Socket.prototype.write)
		this.write = Socket.prototype.write;

	if (options.path) {
		throw new Error('options.path not supported in the browser');
	}

	self._connecting = true;
	self.writable = true;
	self._host = options.host;

	var req = http.request({
		hostname: 'localhost',
		port: '3000',
		path: '/api/vm/net/connect',
		method: 'POST',
    withCredentials: false
	}, function (res) {
		var json = '';
		res.on('data', function (buf) {
			json += buf;
		});
		res.on('end', function () {
			var data = JSON.parse(json);

			if (data.error) {
				self.emit('error', data.error);
				self.destroy();
				return;
			}

			self._connectWebSocket(data.token, function (err) {
				if (err) {
					cb(err);
					return;
				}

				cb();
			});
		});
 	});

	req.setHeader('Content-Type', 'application/json');
	req.write(JSON.stringify(options));
	req.end();

	return this;
};

Socket.prototype._connectWebSocket = function (token, cb) {
	var self = this;

	if (self._ws) {
		process.nextTick(function () {
			cb();
		});
		return;
	}

	this._ws = new WebSocket('ws://localhost:3000/api/vm/net/socket?token='+token);
	this._handleWebsocket();

	if (cb) {
		self.on('connect', cb);
	}
};

Socket.prototype._handleWebsocket = function () {
	var self = this;

	this._ws.addEventListener('open', function () {
		console.log('TCP OK');

		self._connecting = false;
		self.readable = true;

		self.emit('connect');

		self.read(0);
	});
	this._ws.addEventListener('error', function (e) {
		console.log('TCP error', e);
	});
	this._ws.addEventListener('message', function (e) {
		var contents = e.data;

		var gotBuffer = function (buffer) {
			//console.log('[tcp] received: ' + buffer.toString(), buffer.length);
			self.push(buffer);
		};

		if (typeof contents == 'string') {
			var buffer = new Buffer(contents);
			gotBuffer(buffer);
		} else if (window.Blob && contents instanceof Blob) {
			var fileReader = new FileReader();
			fileReader.addEventListener('load', function (e) {
				var buf = fileReader.result;
				var arr = new Uint8Array(buf);
				gotBuffer(new Buffer(arr));
			});
			fileReader.readAsArrayBuffer(contents);
		} else {
			console.warn('Cannot read TCP stream: unsupported message type', contents);
		}
	});
	this._ws.addEventListener('close', function () {
		console.log('TCP closed');
		//TODO
	});
};
}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":28,"buffer":4,"http":21,"stream":45,"timers":46,"util":50}]},{},[51])(51)
});