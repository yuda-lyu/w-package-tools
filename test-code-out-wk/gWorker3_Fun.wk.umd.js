(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('worker_threads')) :
	typeof define === 'function' && define.amd ? define(['worker_threads'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.gWorker3_Fun = factory(global.worker_threads));
}(this, (function (require$$0) { 'use strict';

	function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

	var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn) {
	  var module = { exports: {} };
		return fn(module, module.exports), module.exports;
	}

	var tempJJN6UxosVRHiu7TKPmcYCcQ7s3XqhgD0Nw = createCommonjsModule(function (module, exports) {
	  (function (global, factory) {
	    module.exports = factory(require$$0__default['default']) ;
	  })(commonjsGlobal, function (worker_threads) {

	    function _arrayLikeToArray(arr, len) {
	      if (len == null || len > arr.length) len = arr.length;

	      for (var i = 0, arr2 = new Array(len); i < len; i++) {
	        arr2[i] = arr[i];
	      }

	      return arr2;
	    }

	    function _arrayWithoutHoles(arr) {
	      if (Array.isArray(arr)) return _arrayLikeToArray(arr);
	    }

	    function _iterableToArray(iter) {
	      if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
	    }

	    function _unsupportedIterableToArray(o, minLen) {
	      if (!o) return;
	      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	      var n = Object.prototype.toString.call(o).slice(8, -1);
	      if (n === "Object" && o.constructor) n = o.constructor.name;
	      if (n === "Map" || n === "Set") return Array.from(o);
	      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
	    }

	    function _nonIterableSpread() {
	      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	    }

	    function _toConsumableArray(arr) {
	      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
	    }

	    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
	      try {
	        var info = gen[key](arg);
	        var value = info.value;
	      } catch (error) {
	        reject(error);
	        return;
	      }

	      if (info.done) {
	        resolve(value);
	      } else {
	        Promise.resolve(value).then(_next, _throw);
	      }
	    }

	    function _asyncToGenerator(fn) {
	      return function () {
	        var self = this,
	            args = arguments;
	        return new Promise(function (resolve, reject) {
	          var gen = fn.apply(self, args);

	          function _next(value) {
	            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
	          }

	          function _throw(err) {
	            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
	          }

	          _next(undefined);
	        });
	      };
	    }

	    function _typeof(obj) {
	      "@babel/helpers - typeof";

	      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
	        _typeof = function _typeof(obj) {
	          return typeof obj;
	        };
	      } else {
	        _typeof = function _typeof(obj) {
	          return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	        };
	      }

	      return _typeof(obj);
	    }

	    function createCommonjsModule(fn) {
	      var module = {
	        exports: {}
	      };
	      return fn(module, module.exports), module.exports;
	    }

	    var runtime_1 = createCommonjsModule(function (module) {
	      var runtime = function (exports) {
	        var Op = Object.prototype;
	        var hasOwn = Op.hasOwnProperty;
	        var undefined$1; // More compressible than void 0.

	        var $Symbol = typeof Symbol === "function" ? Symbol : {};
	        var iteratorSymbol = $Symbol.iterator || "@@iterator";
	        var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
	        var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

	        function define(obj, key, value) {
	          Object.defineProperty(obj, key, {
	            value: value,
	            enumerable: true,
	            configurable: true,
	            writable: true
	          });
	          return obj[key];
	        }

	        try {
	          // IE 8 has a broken Object.defineProperty that only works on DOM objects.
	          define({}, "");
	        } catch (err) {
	          define = function define(obj, key, value) {
	            return obj[key] = value;
	          };
	        }

	        function wrap(innerFn, outerFn, self, tryLocsList) {
	          // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
	          var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
	          var generator = Object.create(protoGenerator.prototype);
	          var context = new Context(tryLocsList || []); // The ._invoke method unifies the implementations of the .next,
	          // .throw, and .return methods.

	          generator._invoke = makeInvokeMethod(innerFn, self, context);
	          return generator;
	        }

	        exports.wrap = wrap; // Try/catch helper to minimize deoptimizations. Returns a completion
	        // record like context.tryEntries[i].completion. This interface could
	        // have been (and was previously) designed to take a closure to be
	        // invoked without arguments, but in all the cases we care about we
	        // already have an existing method we want to call, so there's no need
	        // to create a new function object. We can even get away with assuming
	        // the method takes exactly one argument, since that happens to be true
	        // in every case, so we don't have to touch the arguments object. The
	        // only additional allocation required is the completion record, which
	        // has a stable shape and so hopefully should be cheap to allocate.

	        function tryCatch(fn, obj, arg) {
	          try {
	            return {
	              type: "normal",
	              arg: fn.call(obj, arg)
	            };
	          } catch (err) {
	            return {
	              type: "throw",
	              arg: err
	            };
	          }
	        }

	        var GenStateSuspendedStart = "suspendedStart";
	        var GenStateSuspendedYield = "suspendedYield";
	        var GenStateExecuting = "executing";
	        var GenStateCompleted = "completed"; // Returning this object from the innerFn has the same effect as
	        // breaking out of the dispatch switch statement.

	        var ContinueSentinel = {}; // Dummy constructor functions that we use as the .constructor and
	        // .constructor.prototype properties for functions that return Generator
	        // objects. For full spec compliance, you may wish to configure your
	        // minifier not to mangle the names of these two functions.

	        function Generator() {}

	        function GeneratorFunction() {}

	        function GeneratorFunctionPrototype() {} // This is a polyfill for %IteratorPrototype% for environments that
	        // don't natively support it.


	        var IteratorPrototype = {};

	        IteratorPrototype[iteratorSymbol] = function () {
	          return this;
	        };

	        var getProto = Object.getPrototypeOf;
	        var NativeIteratorPrototype = getProto && getProto(getProto(values([])));

	        if (NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
	          // This environment has a native %IteratorPrototype%; use it instead
	          // of the polyfill.
	          IteratorPrototype = NativeIteratorPrototype;
	        }

	        var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
	        GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
	        GeneratorFunctionPrototype.constructor = GeneratorFunction;
	        GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"); // Helper for defining the .next, .throw, and .return methods of the
	        // Iterator interface in terms of a single ._invoke method.

	        function defineIteratorMethods(prototype) {
	          ["next", "throw", "return"].forEach(function (method) {
	            define(prototype, method, function (arg) {
	              return this._invoke(method, arg);
	            });
	          });
	        }

	        exports.isGeneratorFunction = function (genFun) {
	          var ctor = typeof genFun === "function" && genFun.constructor;
	          return ctor ? ctor === GeneratorFunction || // For the native GeneratorFunction constructor, the best we can
	          // do is to check its .name property.
	          (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
	        };

	        exports.mark = function (genFun) {
	          if (Object.setPrototypeOf) {
	            Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
	          } else {
	            genFun.__proto__ = GeneratorFunctionPrototype;
	            define(genFun, toStringTagSymbol, "GeneratorFunction");
	          }

	          genFun.prototype = Object.create(Gp);
	          return genFun;
	        }; // Within the body of any async function, `await x` is transformed to
	        // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
	        // `hasOwn.call(value, "__await")` to determine if the yielded value is
	        // meant to be awaited.


	        exports.awrap = function (arg) {
	          return {
	            __await: arg
	          };
	        };

	        function AsyncIterator(generator, PromiseImpl) {
	          function invoke(method, arg, resolve, reject) {
	            var record = tryCatch(generator[method], generator, arg);

	            if (record.type === "throw") {
	              reject(record.arg);
	            } else {
	              var result = record.arg;
	              var value = result.value;

	              if (value && _typeof(value) === "object" && hasOwn.call(value, "__await")) {
	                return PromiseImpl.resolve(value.__await).then(function (value) {
	                  invoke("next", value, resolve, reject);
	                }, function (err) {
	                  invoke("throw", err, resolve, reject);
	                });
	              }

	              return PromiseImpl.resolve(value).then(function (unwrapped) {
	                // When a yielded Promise is resolved, its final value becomes
	                // the .value of the Promise<{value,done}> result for the
	                // current iteration.
	                result.value = unwrapped;
	                resolve(result);
	              }, function (error) {
	                // If a rejected Promise was yielded, throw the rejection back
	                // into the async generator function so it can be handled there.
	                return invoke("throw", error, resolve, reject);
	              });
	            }
	          }

	          var previousPromise;

	          function enqueue(method, arg) {
	            function callInvokeWithMethodAndArg() {
	              return new PromiseImpl(function (resolve, reject) {
	                invoke(method, arg, resolve, reject);
	              });
	            }

	            return previousPromise = // If enqueue has been called before, then we want to wait until
	            // all previous Promises have been resolved before calling invoke,
	            // so that results are always delivered in the correct order. If
	            // enqueue has not been called before, then it is important to
	            // call invoke immediately, without waiting on a callback to fire,
	            // so that the async generator function has the opportunity to do
	            // any necessary setup in a predictable way. This predictability
	            // is why the Promise constructor synchronously invokes its
	            // executor callback, and why async functions synchronously
	            // execute code before the first await. Since we implement simple
	            // async functions in terms of async generators, it is especially
	            // important to get this right, even though it requires care.
	            previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, // Avoid propagating failures to Promises returned by later
	            // invocations of the iterator.
	            callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
	          } // Define the unified helper method that is used to implement .next,
	          // .throw, and .return (see defineIteratorMethods).


	          this._invoke = enqueue;
	        }

	        defineIteratorMethods(AsyncIterator.prototype);

	        AsyncIterator.prototype[asyncIteratorSymbol] = function () {
	          return this;
	        };

	        exports.AsyncIterator = AsyncIterator; // Note that simple async functions are implemented on top of
	        // AsyncIterator objects; they just return a Promise for the value of
	        // the final result produced by the iterator.

	        exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
	          if (PromiseImpl === void 0) PromiseImpl = Promise;
	          var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
	          return exports.isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
	          : iter.next().then(function (result) {
	            return result.done ? result.value : iter.next();
	          });
	        };

	        function makeInvokeMethod(innerFn, self, context) {
	          var state = GenStateSuspendedStart;
	          return function invoke(method, arg) {
	            if (state === GenStateExecuting) {
	              throw new Error("Generator is already running");
	            }

	            if (state === GenStateCompleted) {
	              if (method === "throw") {
	                throw arg;
	              } // Be forgiving, per 25.3.3.3.3 of the spec:
	              // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume


	              return doneResult();
	            }

	            context.method = method;
	            context.arg = arg;

	            while (true) {
	              var delegate = context.delegate;

	              if (delegate) {
	                var delegateResult = maybeInvokeDelegate(delegate, context);

	                if (delegateResult) {
	                  if (delegateResult === ContinueSentinel) continue;
	                  return delegateResult;
	                }
	              }

	              if (context.method === "next") {
	                // Setting context._sent for legacy support of Babel's
	                // function.sent implementation.
	                context.sent = context._sent = context.arg;
	              } else if (context.method === "throw") {
	                if (state === GenStateSuspendedStart) {
	                  state = GenStateCompleted;
	                  throw context.arg;
	                }

	                context.dispatchException(context.arg);
	              } else if (context.method === "return") {
	                context.abrupt("return", context.arg);
	              }

	              state = GenStateExecuting;
	              var record = tryCatch(innerFn, self, context);

	              if (record.type === "normal") {
	                // If an exception is thrown from innerFn, we leave state ===
	                // GenStateExecuting and loop back for another invocation.
	                state = context.done ? GenStateCompleted : GenStateSuspendedYield;

	                if (record.arg === ContinueSentinel) {
	                  continue;
	                }

	                return {
	                  value: record.arg,
	                  done: context.done
	                };
	              } else if (record.type === "throw") {
	                state = GenStateCompleted; // Dispatch the exception by looping back around to the
	                // context.dispatchException(context.arg) call above.

	                context.method = "throw";
	                context.arg = record.arg;
	              }
	            }
	          };
	        } // Call delegate.iterator[context.method](context.arg) and handle the
	        // result, either by returning a { value, done } result from the
	        // delegate iterator, or by modifying context.method and context.arg,
	        // setting context.delegate to null, and returning the ContinueSentinel.


	        function maybeInvokeDelegate(delegate, context) {
	          var method = delegate.iterator[context.method];

	          if (method === undefined$1) {
	            // A .throw or .return when the delegate iterator has no .throw
	            // method always terminates the yield* loop.
	            context.delegate = null;

	            if (context.method === "throw") {
	              // Note: ["return"] must be used for ES3 parsing compatibility.
	              if (delegate.iterator["return"]) {
	                // If the delegate iterator has a return method, give it a
	                // chance to clean up.
	                context.method = "return";
	                context.arg = undefined$1;
	                maybeInvokeDelegate(delegate, context);

	                if (context.method === "throw") {
	                  // If maybeInvokeDelegate(context) changed context.method from
	                  // "return" to "throw", let that override the TypeError below.
	                  return ContinueSentinel;
	                }
	              }

	              context.method = "throw";
	              context.arg = new TypeError("The iterator does not provide a 'throw' method");
	            }

	            return ContinueSentinel;
	          }

	          var record = tryCatch(method, delegate.iterator, context.arg);

	          if (record.type === "throw") {
	            context.method = "throw";
	            context.arg = record.arg;
	            context.delegate = null;
	            return ContinueSentinel;
	          }

	          var info = record.arg;

	          if (!info) {
	            context.method = "throw";
	            context.arg = new TypeError("iterator result is not an object");
	            context.delegate = null;
	            return ContinueSentinel;
	          }

	          if (info.done) {
	            // Assign the result of the finished delegate to the temporary
	            // variable specified by delegate.resultName (see delegateYield).
	            context[delegate.resultName] = info.value; // Resume execution at the desired location (see delegateYield).

	            context.next = delegate.nextLoc; // If context.method was "throw" but the delegate handled the
	            // exception, let the outer generator proceed normally. If
	            // context.method was "next", forget context.arg since it has been
	            // "consumed" by the delegate iterator. If context.method was
	            // "return", allow the original .return call to continue in the
	            // outer generator.

	            if (context.method !== "return") {
	              context.method = "next";
	              context.arg = undefined$1;
	            }
	          } else {
	            // Re-yield the result returned by the delegate method.
	            return info;
	          } // The delegate iterator is finished, so forget it and continue with
	          // the outer generator.


	          context.delegate = null;
	          return ContinueSentinel;
	        } // Define Generator.prototype.{next,throw,return} in terms of the
	        // unified ._invoke helper method.


	        defineIteratorMethods(Gp);
	        define(Gp, toStringTagSymbol, "Generator"); // A Generator should always return itself as the iterator object when the
	        // @@iterator function is called on it. Some browsers' implementations of the
	        // iterator prototype chain incorrectly implement this, causing the Generator
	        // object to not be returned from this call. This ensures that doesn't happen.
	        // See https://github.com/facebook/regenerator/issues/274 for more details.

	        Gp[iteratorSymbol] = function () {
	          return this;
	        };

	        Gp.toString = function () {
	          return "[object Generator]";
	        };

	        function pushTryEntry(locs) {
	          var entry = {
	            tryLoc: locs[0]
	          };

	          if (1 in locs) {
	            entry.catchLoc = locs[1];
	          }

	          if (2 in locs) {
	            entry.finallyLoc = locs[2];
	            entry.afterLoc = locs[3];
	          }

	          this.tryEntries.push(entry);
	        }

	        function resetTryEntry(entry) {
	          var record = entry.completion || {};
	          record.type = "normal";
	          delete record.arg;
	          entry.completion = record;
	        }

	        function Context(tryLocsList) {
	          // The root entry object (effectively a try statement without a catch
	          // or a finally block) gives us a place to store values thrown from
	          // locations where there is no enclosing try statement.
	          this.tryEntries = [{
	            tryLoc: "root"
	          }];
	          tryLocsList.forEach(pushTryEntry, this);
	          this.reset(true);
	        }

	        exports.keys = function (object) {
	          var keys = [];

	          for (var key in object) {
	            keys.push(key);
	          }

	          keys.reverse(); // Rather than returning an object with a next method, we keep
	          // things simple and return the next function itself.

	          return function next() {
	            while (keys.length) {
	              var key = keys.pop();

	              if (key in object) {
	                next.value = key;
	                next.done = false;
	                return next;
	              }
	            } // To avoid creating an additional object, we just hang the .value
	            // and .done properties off the next function object itself. This
	            // also ensures that the minifier will not anonymize the function.


	            next.done = true;
	            return next;
	          };
	        };

	        function values(iterable) {
	          if (iterable) {
	            var iteratorMethod = iterable[iteratorSymbol];

	            if (iteratorMethod) {
	              return iteratorMethod.call(iterable);
	            }

	            if (typeof iterable.next === "function") {
	              return iterable;
	            }

	            if (!isNaN(iterable.length)) {
	              var i = -1,
	                  next = function next() {
	                while (++i < iterable.length) {
	                  if (hasOwn.call(iterable, i)) {
	                    next.value = iterable[i];
	                    next.done = false;
	                    return next;
	                  }
	                }

	                next.value = undefined$1;
	                next.done = true;
	                return next;
	              };

	              return next.next = next;
	            }
	          } // Return an iterator with no values.


	          return {
	            next: doneResult
	          };
	        }

	        exports.values = values;

	        function doneResult() {
	          return {
	            value: undefined$1,
	            done: true
	          };
	        }

	        Context.prototype = {
	          constructor: Context,
	          reset: function reset(skipTempReset) {
	            this.prev = 0;
	            this.next = 0; // Resetting context._sent for legacy support of Babel's
	            // function.sent implementation.

	            this.sent = this._sent = undefined$1;
	            this.done = false;
	            this.delegate = null;
	            this.method = "next";
	            this.arg = undefined$1;
	            this.tryEntries.forEach(resetTryEntry);

	            if (!skipTempReset) {
	              for (var name in this) {
	                // Not sure about the optimal order of these conditions:
	                if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
	                  this[name] = undefined$1;
	                }
	              }
	            }
	          },
	          stop: function stop() {
	            this.done = true;
	            var rootEntry = this.tryEntries[0];
	            var rootRecord = rootEntry.completion;

	            if (rootRecord.type === "throw") {
	              throw rootRecord.arg;
	            }

	            return this.rval;
	          },
	          dispatchException: function dispatchException(exception) {
	            if (this.done) {
	              throw exception;
	            }

	            var context = this;

	            function handle(loc, caught) {
	              record.type = "throw";
	              record.arg = exception;
	              context.next = loc;

	              if (caught) {
	                // If the dispatched exception was caught by a catch block,
	                // then let that catch block handle the exception normally.
	                context.method = "next";
	                context.arg = undefined$1;
	              }

	              return !!caught;
	            }

	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];
	              var record = entry.completion;

	              if (entry.tryLoc === "root") {
	                // Exception thrown outside of any try block that could handle
	                // it, so set the completion value of the entire function to
	                // throw the exception.
	                return handle("end");
	              }

	              if (entry.tryLoc <= this.prev) {
	                var hasCatch = hasOwn.call(entry, "catchLoc");
	                var hasFinally = hasOwn.call(entry, "finallyLoc");

	                if (hasCatch && hasFinally) {
	                  if (this.prev < entry.catchLoc) {
	                    return handle(entry.catchLoc, true);
	                  } else if (this.prev < entry.finallyLoc) {
	                    return handle(entry.finallyLoc);
	                  }
	                } else if (hasCatch) {
	                  if (this.prev < entry.catchLoc) {
	                    return handle(entry.catchLoc, true);
	                  }
	                } else if (hasFinally) {
	                  if (this.prev < entry.finallyLoc) {
	                    return handle(entry.finallyLoc);
	                  }
	                } else {
	                  throw new Error("try statement without catch or finally");
	                }
	              }
	            }
	          },
	          abrupt: function abrupt(type, arg) {
	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];

	              if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
	                var finallyEntry = entry;
	                break;
	              }
	            }

	            if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
	              // Ignore the finally entry if control is not jumping to a
	              // location outside the try/catch block.
	              finallyEntry = null;
	            }

	            var record = finallyEntry ? finallyEntry.completion : {};
	            record.type = type;
	            record.arg = arg;

	            if (finallyEntry) {
	              this.method = "next";
	              this.next = finallyEntry.finallyLoc;
	              return ContinueSentinel;
	            }

	            return this.complete(record);
	          },
	          complete: function complete(record, afterLoc) {
	            if (record.type === "throw") {
	              throw record.arg;
	            }

	            if (record.type === "break" || record.type === "continue") {
	              this.next = record.arg;
	            } else if (record.type === "return") {
	              this.rval = this.arg = record.arg;
	              this.method = "return";
	              this.next = "end";
	            } else if (record.type === "normal" && afterLoc) {
	              this.next = afterLoc;
	            }

	            return ContinueSentinel;
	          },
	          finish: function finish(finallyLoc) {
	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];

	              if (entry.finallyLoc === finallyLoc) {
	                this.complete(entry.completion, entry.afterLoc);
	                resetTryEntry(entry);
	                return ContinueSentinel;
	              }
	            }
	          },
	          "catch": function _catch(tryLoc) {
	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];

	              if (entry.tryLoc === tryLoc) {
	                var record = entry.completion;

	                if (record.type === "throw") {
	                  var thrown = record.arg;
	                  resetTryEntry(entry);
	                }

	                return thrown;
	              }
	            } // The context.catch method must only be called with a location
	            // argument that corresponds to a known catch block.


	            throw new Error("illegal catch attempt");
	          },
	          delegateYield: function delegateYield(iterable, resultName, nextLoc) {
	            this.delegate = {
	              iterator: values(iterable),
	              resultName: resultName,
	              nextLoc: nextLoc
	            };

	            if (this.method === "next") {
	              // Deliberately forget the last sent value so that we don't
	              // accidentally pass it on to the delegate.
	              this.arg = undefined$1;
	            }

	            return ContinueSentinel;
	          }
	        }; // Regardless of whether this script is executing as a CommonJS module
	        // or not, return the runtime object so that we can declare the variable
	        // regeneratorRuntime in the outer scope, which allows this module to be
	        // injected easily by `bin/regenerator --include-runtime script.js`.

	        return exports;
	      }( // If this script is executing as a CommonJS module, use module.exports
	      // as the regeneratorRuntime namespace. Otherwise create a new empty
	      // object. Either way, the resulting object will be used to initialize
	      // the regeneratorRuntime variable at the top of this file.
	      module.exports);

	      try {
	        regeneratorRuntime = runtime;
	      } catch (accidentalStrictMode) {
	        // This module should not be running in strict mode, so the above
	        // assignment should always work unless something is misconfigured. Just
	        // in case runtime.js accidentally runs in strict mode, we can escape
	        // strict mode using a global Function call. This could conceivably fail
	        // if a Content Security Policy forbids using Function, but in that case
	        // the proper solution is to fix the accidental strict mode problem. If
	        // you've misconfigured your bundler to force strict mode and applied a
	        // CSP to forbid Function, and you're not willing to fix either of those
	        // problems, please detail your unique predicament in a GitHub issue.
	        Function("r", "regeneratorRuntime = r")(runtime);
	      }
	    });
	    var regenerator = runtime_1;
	    var eventemitter3 = createCommonjsModule(function (module) {
	      var has = Object.prototype.hasOwnProperty,
	          prefix = '~';
	      /**
	       * Constructor to create a storage for our `EE` objects.
	       * An `Events` instance is a plain object whose properties are event names.
	       *
	       * @constructor
	       * @private
	       */

	      function Events() {} //
	      // We try to not inherit from `Object.prototype`. In some engines creating an
	      // instance in this way is faster than calling `Object.create(null)` directly.
	      // If `Object.create(null)` is not supported we prefix the event names with a
	      // character to make sure that the built-in object properties are not
	      // overridden or used as an attack vector.
	      //


	      if (Object.create) {
	        Events.prototype = Object.create(null); //
	        // This hack is needed because the `__proto__` property is still inherited in
	        // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	        //

	        if (!new Events().__proto__) prefix = false;
	      }
	      /**
	       * Representation of a single event listener.
	       *
	       * @param {Function} fn The listener function.
	       * @param {*} context The context to invoke the listener with.
	       * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	       * @constructor
	       * @private
	       */


	      function EE(fn, context, once) {
	        this.fn = fn;
	        this.context = context;
	        this.once = once || false;
	      }
	      /**
	       * Add a listener for a given event.
	       *
	       * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn The listener function.
	       * @param {*} context The context to invoke the listener with.
	       * @param {Boolean} once Specify if the listener is a one-time listener.
	       * @returns {EventEmitter}
	       * @private
	       */


	      function addListener(emitter, event, fn, context, once) {
	        if (typeof fn !== 'function') {
	          throw new TypeError('The listener must be a function');
	        }

	        var listener = new EE(fn, context || emitter, once),
	            evt = prefix ? prefix + event : event;
	        if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);else emitter._events[evt] = [emitter._events[evt], listener];
	        return emitter;
	      }
	      /**
	       * Clear event by name.
	       *
	       * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	       * @param {(String|Symbol)} evt The Event name.
	       * @private
	       */


	      function clearEvent(emitter, evt) {
	        if (--emitter._eventsCount === 0) emitter._events = new Events();else delete emitter._events[evt];
	      }
	      /**
	       * Minimal `EventEmitter` interface that is molded against the Node.js
	       * `EventEmitter` interface.
	       *
	       * @constructor
	       * @public
	       */


	      function EventEmitter() {
	        this._events = new Events();
	        this._eventsCount = 0;
	      }
	      /**
	       * Return an array listing the events for which the emitter has registered
	       * listeners.
	       *
	       * @returns {Array}
	       * @public
	       */


	      EventEmitter.prototype.eventNames = function eventNames() {
	        var names = [],
	            events,
	            name;
	        if (this._eventsCount === 0) return names;

	        for (name in events = this._events) {
	          if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	        }

	        if (Object.getOwnPropertySymbols) {
	          return names.concat(Object.getOwnPropertySymbols(events));
	        }

	        return names;
	      };
	      /**
	       * Return the listeners registered for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @returns {Array} The registered listeners.
	       * @public
	       */


	      EventEmitter.prototype.listeners = function listeners(event) {
	        var evt = prefix ? prefix + event : event,
	            handlers = this._events[evt];
	        if (!handlers) return [];
	        if (handlers.fn) return [handlers.fn];

	        for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	          ee[i] = handlers[i].fn;
	        }

	        return ee;
	      };
	      /**
	       * Return the number of listeners listening to a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @returns {Number} The number of listeners.
	       * @public
	       */


	      EventEmitter.prototype.listenerCount = function listenerCount(event) {
	        var evt = prefix ? prefix + event : event,
	            listeners = this._events[evt];
	        if (!listeners) return 0;
	        if (listeners.fn) return 1;
	        return listeners.length;
	      };
	      /**
	       * Calls each of the listeners registered for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @returns {Boolean} `true` if the event had listeners, else `false`.
	       * @public
	       */


	      EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	        var evt = prefix ? prefix + event : event;
	        if (!this._events[evt]) return false;
	        var listeners = this._events[evt],
	            len = arguments.length,
	            args,
	            i;

	        if (listeners.fn) {
	          if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	          switch (len) {
	            case 1:
	              return listeners.fn.call(listeners.context), true;

	            case 2:
	              return listeners.fn.call(listeners.context, a1), true;

	            case 3:
	              return listeners.fn.call(listeners.context, a1, a2), true;

	            case 4:
	              return listeners.fn.call(listeners.context, a1, a2, a3), true;

	            case 5:
	              return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;

	            case 6:
	              return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	          }

	          for (i = 1, args = new Array(len - 1); i < len; i++) {
	            args[i - 1] = arguments[i];
	          }

	          listeners.fn.apply(listeners.context, args);
	        } else {
	          var length = listeners.length,
	              j;

	          for (i = 0; i < length; i++) {
	            if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	            switch (len) {
	              case 1:
	                listeners[i].fn.call(listeners[i].context);
	                break;

	              case 2:
	                listeners[i].fn.call(listeners[i].context, a1);
	                break;

	              case 3:
	                listeners[i].fn.call(listeners[i].context, a1, a2);
	                break;

	              case 4:
	                listeners[i].fn.call(listeners[i].context, a1, a2, a3);
	                break;

	              default:
	                if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
	                  args[j - 1] = arguments[j];
	                }
	                listeners[i].fn.apply(listeners[i].context, args);
	            }
	          }
	        }

	        return true;
	      };
	      /**
	       * Add a listener for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn The listener function.
	       * @param {*} [context=this] The context to invoke the listener with.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.on = function on(event, fn, context) {
	        return addListener(this, event, fn, context, false);
	      };
	      /**
	       * Add a one-time listener for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn The listener function.
	       * @param {*} [context=this] The context to invoke the listener with.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.once = function once(event, fn, context) {
	        return addListener(this, event, fn, context, true);
	      };
	      /**
	       * Remove the listeners of a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn Only remove the listeners that match this function.
	       * @param {*} context Only remove the listeners that have this context.
	       * @param {Boolean} once Only remove one-time listeners.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	        var evt = prefix ? prefix + event : event;
	        if (!this._events[evt]) return this;

	        if (!fn) {
	          clearEvent(this, evt);
	          return this;
	        }

	        var listeners = this._events[evt];

	        if (listeners.fn) {
	          if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
	            clearEvent(this, evt);
	          }
	        } else {
	          for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	            if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
	              events.push(listeners[i]);
	            }
	          } //
	          // Reset the array, or remove it completely if we have no more listeners.
	          //


	          if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;else clearEvent(this, evt);
	        }

	        return this;
	      };
	      /**
	       * Remove all listeners, or those of the specified event.
	       *
	       * @param {(String|Symbol)} [event] The event name.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	        var evt;

	        if (event) {
	          evt = prefix ? prefix + event : event;
	          if (this._events[evt]) clearEvent(this, evt);
	        } else {
	          this._events = new Events();
	          this._eventsCount = 0;
	        }

	        return this;
	      }; //
	      // Alias methods names because people roll like that.
	      //


	      EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	      EventEmitter.prototype.addListener = EventEmitter.prototype.on; //
	      // Expose the prefix.
	      //

	      EventEmitter.prefixed = prefix; //
	      // Allow `EventEmitter` to be imported as module namespace.
	      //

	      EventEmitter.EventEmitter = EventEmitter; //
	      // Expose the module.
	      //

	      {
	        module.exports = EventEmitter;
	      }
	    });

	    function isWindow() {
	      return typeof window !== 'undefined' && typeof window.document !== 'undefined';
	    } //ww


	    var ww;

	    function protectShell() {
	      //cEnv
	      var cEnv = isWindow() ? 'browser' : 'nodejs'; //check, 後續會有Nodejs或瀏覽器依賴的API例如window.atob或Buffer, 於import階段時就先行偵測跳出

	      if (cEnv !== 'nodejs') {
	        return null;
	      }

	      function evem() {
	        return new eventemitter3();
	      }

	      function genPm() {
	        var resolve;
	        var reject;
	        var p = new Promise(function () {
	          resolve = arguments[0];
	          reject = arguments[1];
	        });
	        p.resolve = resolve;
	        p.reject = reject;
	        return p;
	      }

	      function genID() {
	        var len = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
	        var uuid = [];
	        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
	        var radix = chars.length;

	        for (var i = 0; i < len; i++) {
	          uuid[i] = chars[0 | Math.random() * radix];
	        }

	        var r = uuid.join('');
	        return r;
	      }

	      function b642str(b64) {
	        return Buffer.from(b64, 'base64').toString('utf8'); //Nodejs端使用Buffer
	      } //codeShow
	      //codeB64, 此處需提供worker執行程式碼, 因有特殊符號編譯困難, 故需先轉base64再使用


	      var codeB64 = 'CgogICAgICAgIGxldCB7IHBhcmVudFBvcnQgfSA9IHJlcXVpcmUoJ3dvcmtlcl90aHJlYWRzJykKICAgICAgICAKCmFzeW5jIGZ1bmN0aW9uIGdXb3JrZXIzX0Z1bihwMSwgcDIpIHsKICAvLyB0aHJvdyBuZXcgRXJyb3IoJ2dXb3JrZXIzX0Z1biBlcnJvcicpCiAgcmV0dXJuICdwMTonICsgcDEgKyAnLCBwMjonICsgcDIgKyAnLCDmuKzoqabkuK3mlocnOwp9CgoKCmxldCBpbnN0YW5jZSA9IG51bGwKZnVuY3Rpb24gaW5pdChpbnB1dCl7CgogICAgLy9pbml0CiAgICBsZXQgcgogICAgCiAgICAgICAgciA9IHsKICAgICAgICAgICAgbWFpbjogZ1dvcmtlcjNfRnVuCiAgICAgICAgfQogICAgICAgIAoKICAgIC8vb24KICAgIAoKICAgIC8vc2F2ZQogICAgaW5zdGFuY2UgPSByCgp9CgpmdW5jdGlvbiBzZW5kTWVzc2FnZShkYXRhKSB7CiAgICAKICAgICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKGRhdGEpCiAgICAgICAgCn0KCmFzeW5jIGZ1bmN0aW9uIHJ1bihkYXRhKSB7CiAgICAvLyBjb25zb2xlLmxvZygnaW5uZXIgd29ya2VyIHJ1bicsZGF0YSkKCiAgICAvL21vZGUKICAgIGxldCBtb2RlID0gZGF0YS5tb2RlCgogICAgLy9jaGVjawogICAgaWYobW9kZSAhPT0gJ2luaXQnICYmIG1vZGUgIT09ICdjYWxsJyl7CiAgICAgICAgcmV0dXJuCiAgICB9CgogICAgLy9pbml0CiAgICBpZihtb2RlID09PSAnaW5pdCcpewogICAgICAgIAogICAgICAgIHRyeXsKCiAgICAgICAgICAgIC8vdHlwZQogICAgICAgICAgICBsZXQgdHlwZSA9IGRhdGEudHlwZQoKICAgICAgICAgICAgLy9pbnB1dAogICAgICAgICAgICBsZXQgaW5wdXQgPSBkYXRhLmlucHV0CiAgICAKICAgICAgICAgICAgLy9pbnN0YW5jZQogICAgICAgICAgICBpZih0eXBlID09PSAnZnVuY3Rpb24nKXsKICAgICAgICAgICAgICAgIGluaXQoLi4uaW5wdXQpCiAgICAgICAgICAgIH0KICAgICAgICAgICAgZWxzZSBpZih0eXBlID09PSAnb2JqZWN0Jyl7CiAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGdXb3JrZXIzX0Z1bgogICAgICAgICAgICB9CgogICAgICAgIH0KICAgICAgICBjYXRjaChlcnIpewogICAgICAgIAogICAgICAgICAgICAvL3NlbmRNZXNzYWdlCiAgICAgICAgICAgIGxldCByZXMgPSB7CiAgICAgICAgICAgICAgICBtb2RlOiAnZW1pdCcsCiAgICAgICAgICAgICAgICBldk5hbWU6ICdlcnJvcicsCiAgICAgICAgICAgICAgICBtc2c6IGVyciwKICAgICAgICAgICAgfQogICAgICAgICAgICBzZW5kTWVzc2FnZShyZXMpCgogICAgICAgIH0KICAgICAgICAgICAgCiAgICB9CgogICAgLy9jaGVjawogICAgaWYobW9kZSA9PT0gJ2NhbGwnKXsKICAgICAgICBsZXQgc3RhdGUgPSAnJwogICAgICAgIGxldCBtc2cgPSBudWxsCgogICAgICAgIHRyeXsKCiAgICAgICAgICAgIC8vZnVuCiAgICAgICAgICAgIGxldCBmdW4gPSBpbnN0YW5jZVtkYXRhLmZ1bl0KCiAgICAgICAgICAgIC8vaW5wdXQKICAgICAgICAgICAgbGV0IGlucHV0ID0gZGF0YS5pbnB1dAoKICAgICAgICAgICAgLy9leGVjCiAgICAgICAgICAgIGF3YWl0IGZ1biguLi5pbnB1dCkKICAgICAgICAgICAgICAgIC50aGVuKChzdWMpID0+IHsKICAgICAgICAgICAgICAgICAgICBzdGF0ZT0nc3VjY2VzcycKICAgICAgICAgICAgICAgICAgICBtc2c9c3VjCiAgICAgICAgICAgICAgICB9KQogICAgICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHsKICAgICAgICAgICAgICAgICAgICBzdGF0ZT0nZXJyb3InCiAgICAgICAgICAgICAgICAgICAgbXNnPWVycgogICAgICAgICAgICAgICAgfSkKCiAgICAgICAgfQogICAgICAgIGNhdGNoKGVycil7CiAgICAgICAgICAgIHN0YXRlID0gJ2Vycm9yJwogICAgICAgICAgICBtc2cgPSBlcnIKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLy9zZW5kTWVzc2FnZQogICAgICAgIGxldCByZXMgPSB7CiAgICAgICAgICAgIG1vZGU6ICdyZXR1cm4nLAogICAgICAgICAgICBpZDogZGF0YS5pZCwKICAgICAgICAgICAgZnVuOiBkYXRhLmZ1biwKICAgICAgICAgICAgc3RhdGUsCiAgICAgICAgICAgIG1zZywKICAgICAgICB9CiAgICAgICAgc2VuZE1lc3NhZ2UocmVzKQoKICAgIH0KCn0KCmZ1bmN0aW9uIHJlY3ZNZXNzYWdlKGRhdGEpIHsKICAgIC8vIGNvbnNvbGUubG9nKCdpbm5lciB3b3JrZXIgcmVjdjonLCBkYXRhKQoKICAgIC8vZGF0YVJlY3YKICAgIGxldCBkYXRhUmVjdiA9IGRhdGEKCiAgICAvL3J1bgogICAgcnVuKGRhdGFSZWN2KQoKfQoKCiAgICAgICAgcGFyZW50UG9ydC5vbignbWVzc2FnZScsIHJlY3ZNZXNzYWdlKQogICAgICAgIAoK'; //code

	      var code = b642str(codeB64);

	      function wrapWorker() {
	        //evem
	        var ev = evem();

	        function genWorker(code) {
	          //new Worker
	          try {
	            return new worker_threads.Worker(code, {
	              eval: true
	            });
	          } catch (err) {
	            emitError(err);
	          }
	        } //genWorker


	        var wk = genWorker(code); //check, 於瀏覽器端可能會遭遇IE11安全性問題, 或被CSP的worker-src或script-src設定阻擋

	        if (!wk) {
	          emitError('invalid worker');
	          return null;
	        }

	        function terminate() {
	          if (wk) {
	            wk.terminate();
	            wk = undefined;
	          } else {
	            emitError('worker has been terminated');
	          }
	        }

	        function init() {
	          //dataSend
	          var dataSend = {
	            mode: 'init',
	            type: 'function',
	            input: Array.prototype.slice.call(arguments) //若直接用arguments會無法編譯

	          }; //postMessage

	          wk.postMessage(dataSend);
	        }

	        function main() {
	          //pm
	          var pm = genPm(); //id

	          var id = genID(); //dataSend

	          var dataSend = {
	            mode: 'call',
	            id: id,
	            fun: 'main',
	            input: Array.prototype.slice.call(arguments) //若直接用arguments會無法編譯

	          }; //postMessage

	          wk.postMessage(dataSend); //once

	          ev.once(id, function (res) {
	            if (res.state === 'success') {
	              pm.resolve(res.msg);
	            } else {
	              pm.reject(res.msg);
	            }
	          });
	          return pm;
	        }

	        function recvMessage(data) {
	          // console.log('outer worker recv:', data)
	          //dataRecv
	          var dataRecv = data; //mode

	          var mode = dataRecv.mode; //check

	          if (mode !== 'emit' && mode !== 'return') {
	            return;
	          } //emit


	          if (mode === 'emit') {
	            //emit
	            ev.emit(dataRecv.evName, dataRecv.msg);
	          } //return


	          if (mode === 'return') {
	            //emit
	            ev.emit(dataRecv.id, dataRecv);
	          }
	        } //bind recvMessage


	        wk.on('message', recvMessage);

	        function emitError(err) {
	          ev.emit('error', err);
	        } //bind emitError


	        wk.on('error', emitError); //init

	        init(Array.prototype.slice.call(arguments)); //若直接用arguments會無法編譯

	        ev.main = main;
	        ev.main = main;
	        ev.terminate = terminate;
	        return ev;
	      } //set ww


	      ww = /*#__PURE__*/function () {
	        var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
	          var input,
	              nww,
	              r,
	              _args = arguments;
	          return regenerator.wrap(function _callee$(_context) {
	            while (1) {
	              switch (_context.prev = _context.next) {
	                case 0:
	                  input = Array.prototype.slice.call(_args);
	                  nww = wrapWorker();
	                  _context.next = 4;
	                  return nww.main.apply(nww, _toConsumableArray(input)) //nww.main需跟cmain一致
	                  . //nww.main需跟cmain一致
	                  finally(function () {
	                    nww.terminate(); //每次執行完不論成功失敗都要中止worker
	                  });

	                case 4:
	                  r = _context.sent;
	                  return _context.abrupt("return", r);

	                case 6:
	                case "end":
	                  return _context.stop();
	              }
	            }
	          }, _callee);
	        }));

	        return function ww() {
	          return _ref.apply(this, arguments);
	        };
	      }();
	    }

	    protectShell();
	    var ww$1 = ww;
	    return ww$1;
	  });
	});

	var tempJJN6UxosVRHiu7TKPmcYCcQ7s3XqhgD0Ww = createCommonjsModule(function (module, exports) {
	  (function (global, factory) {
	    module.exports = factory() ;
	  })(commonjsGlobal, function () {

	    function _arrayLikeToArray(arr, len) {
	      if (len == null || len > arr.length) len = arr.length;

	      for (var i = 0, arr2 = new Array(len); i < len; i++) {
	        arr2[i] = arr[i];
	      }

	      return arr2;
	    }

	    function _arrayWithoutHoles(arr) {
	      if (Array.isArray(arr)) return _arrayLikeToArray(arr);
	    }

	    function _iterableToArray(iter) {
	      if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
	    }

	    function _unsupportedIterableToArray(o, minLen) {
	      if (!o) return;
	      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	      var n = Object.prototype.toString.call(o).slice(8, -1);
	      if (n === "Object" && o.constructor) n = o.constructor.name;
	      if (n === "Map" || n === "Set") return Array.from(o);
	      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
	    }

	    function _nonIterableSpread() {
	      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	    }

	    function _toConsumableArray(arr) {
	      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
	    }

	    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
	      try {
	        var info = gen[key](arg);
	        var value = info.value;
	      } catch (error) {
	        reject(error);
	        return;
	      }

	      if (info.done) {
	        resolve(value);
	      } else {
	        Promise.resolve(value).then(_next, _throw);
	      }
	    }

	    function _asyncToGenerator(fn) {
	      return function () {
	        var self = this,
	            args = arguments;
	        return new Promise(function (resolve, reject) {
	          var gen = fn.apply(self, args);

	          function _next(value) {
	            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
	          }

	          function _throw(err) {
	            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
	          }

	          _next(undefined);
	        });
	      };
	    }

	    function _typeof(obj) {
	      "@babel/helpers - typeof";

	      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
	        _typeof = function _typeof(obj) {
	          return typeof obj;
	        };
	      } else {
	        _typeof = function _typeof(obj) {
	          return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	        };
	      }

	      return _typeof(obj);
	    }

	    function createCommonjsModule(fn) {
	      var module = {
	        exports: {}
	      };
	      return fn(module, module.exports), module.exports;
	    }

	    var runtime_1 = createCommonjsModule(function (module) {
	      var runtime = function (exports) {
	        var Op = Object.prototype;
	        var hasOwn = Op.hasOwnProperty;
	        var undefined$1; // More compressible than void 0.

	        var $Symbol = typeof Symbol === "function" ? Symbol : {};
	        var iteratorSymbol = $Symbol.iterator || "@@iterator";
	        var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
	        var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

	        function define(obj, key, value) {
	          Object.defineProperty(obj, key, {
	            value: value,
	            enumerable: true,
	            configurable: true,
	            writable: true
	          });
	          return obj[key];
	        }

	        try {
	          // IE 8 has a broken Object.defineProperty that only works on DOM objects.
	          define({}, "");
	        } catch (err) {
	          define = function define(obj, key, value) {
	            return obj[key] = value;
	          };
	        }

	        function wrap(innerFn, outerFn, self, tryLocsList) {
	          // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
	          var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
	          var generator = Object.create(protoGenerator.prototype);
	          var context = new Context(tryLocsList || []); // The ._invoke method unifies the implementations of the .next,
	          // .throw, and .return methods.

	          generator._invoke = makeInvokeMethod(innerFn, self, context);
	          return generator;
	        }

	        exports.wrap = wrap; // Try/catch helper to minimize deoptimizations. Returns a completion
	        // record like context.tryEntries[i].completion. This interface could
	        // have been (and was previously) designed to take a closure to be
	        // invoked without arguments, but in all the cases we care about we
	        // already have an existing method we want to call, so there's no need
	        // to create a new function object. We can even get away with assuming
	        // the method takes exactly one argument, since that happens to be true
	        // in every case, so we don't have to touch the arguments object. The
	        // only additional allocation required is the completion record, which
	        // has a stable shape and so hopefully should be cheap to allocate.

	        function tryCatch(fn, obj, arg) {
	          try {
	            return {
	              type: "normal",
	              arg: fn.call(obj, arg)
	            };
	          } catch (err) {
	            return {
	              type: "throw",
	              arg: err
	            };
	          }
	        }

	        var GenStateSuspendedStart = "suspendedStart";
	        var GenStateSuspendedYield = "suspendedYield";
	        var GenStateExecuting = "executing";
	        var GenStateCompleted = "completed"; // Returning this object from the innerFn has the same effect as
	        // breaking out of the dispatch switch statement.

	        var ContinueSentinel = {}; // Dummy constructor functions that we use as the .constructor and
	        // .constructor.prototype properties for functions that return Generator
	        // objects. For full spec compliance, you may wish to configure your
	        // minifier not to mangle the names of these two functions.

	        function Generator() {}

	        function GeneratorFunction() {}

	        function GeneratorFunctionPrototype() {} // This is a polyfill for %IteratorPrototype% for environments that
	        // don't natively support it.


	        var IteratorPrototype = {};

	        IteratorPrototype[iteratorSymbol] = function () {
	          return this;
	        };

	        var getProto = Object.getPrototypeOf;
	        var NativeIteratorPrototype = getProto && getProto(getProto(values([])));

	        if (NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
	          // This environment has a native %IteratorPrototype%; use it instead
	          // of the polyfill.
	          IteratorPrototype = NativeIteratorPrototype;
	        }

	        var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
	        GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
	        GeneratorFunctionPrototype.constructor = GeneratorFunction;
	        GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"); // Helper for defining the .next, .throw, and .return methods of the
	        // Iterator interface in terms of a single ._invoke method.

	        function defineIteratorMethods(prototype) {
	          ["next", "throw", "return"].forEach(function (method) {
	            define(prototype, method, function (arg) {
	              return this._invoke(method, arg);
	            });
	          });
	        }

	        exports.isGeneratorFunction = function (genFun) {
	          var ctor = typeof genFun === "function" && genFun.constructor;
	          return ctor ? ctor === GeneratorFunction || // For the native GeneratorFunction constructor, the best we can
	          // do is to check its .name property.
	          (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
	        };

	        exports.mark = function (genFun) {
	          if (Object.setPrototypeOf) {
	            Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
	          } else {
	            genFun.__proto__ = GeneratorFunctionPrototype;
	            define(genFun, toStringTagSymbol, "GeneratorFunction");
	          }

	          genFun.prototype = Object.create(Gp);
	          return genFun;
	        }; // Within the body of any async function, `await x` is transformed to
	        // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
	        // `hasOwn.call(value, "__await")` to determine if the yielded value is
	        // meant to be awaited.


	        exports.awrap = function (arg) {
	          return {
	            __await: arg
	          };
	        };

	        function AsyncIterator(generator, PromiseImpl) {
	          function invoke(method, arg, resolve, reject) {
	            var record = tryCatch(generator[method], generator, arg);

	            if (record.type === "throw") {
	              reject(record.arg);
	            } else {
	              var result = record.arg;
	              var value = result.value;

	              if (value && _typeof(value) === "object" && hasOwn.call(value, "__await")) {
	                return PromiseImpl.resolve(value.__await).then(function (value) {
	                  invoke("next", value, resolve, reject);
	                }, function (err) {
	                  invoke("throw", err, resolve, reject);
	                });
	              }

	              return PromiseImpl.resolve(value).then(function (unwrapped) {
	                // When a yielded Promise is resolved, its final value becomes
	                // the .value of the Promise<{value,done}> result for the
	                // current iteration.
	                result.value = unwrapped;
	                resolve(result);
	              }, function (error) {
	                // If a rejected Promise was yielded, throw the rejection back
	                // into the async generator function so it can be handled there.
	                return invoke("throw", error, resolve, reject);
	              });
	            }
	          }

	          var previousPromise;

	          function enqueue(method, arg) {
	            function callInvokeWithMethodAndArg() {
	              return new PromiseImpl(function (resolve, reject) {
	                invoke(method, arg, resolve, reject);
	              });
	            }

	            return previousPromise = // If enqueue has been called before, then we want to wait until
	            // all previous Promises have been resolved before calling invoke,
	            // so that results are always delivered in the correct order. If
	            // enqueue has not been called before, then it is important to
	            // call invoke immediately, without waiting on a callback to fire,
	            // so that the async generator function has the opportunity to do
	            // any necessary setup in a predictable way. This predictability
	            // is why the Promise constructor synchronously invokes its
	            // executor callback, and why async functions synchronously
	            // execute code before the first await. Since we implement simple
	            // async functions in terms of async generators, it is especially
	            // important to get this right, even though it requires care.
	            previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, // Avoid propagating failures to Promises returned by later
	            // invocations of the iterator.
	            callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
	          } // Define the unified helper method that is used to implement .next,
	          // .throw, and .return (see defineIteratorMethods).


	          this._invoke = enqueue;
	        }

	        defineIteratorMethods(AsyncIterator.prototype);

	        AsyncIterator.prototype[asyncIteratorSymbol] = function () {
	          return this;
	        };

	        exports.AsyncIterator = AsyncIterator; // Note that simple async functions are implemented on top of
	        // AsyncIterator objects; they just return a Promise for the value of
	        // the final result produced by the iterator.

	        exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
	          if (PromiseImpl === void 0) PromiseImpl = Promise;
	          var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
	          return exports.isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
	          : iter.next().then(function (result) {
	            return result.done ? result.value : iter.next();
	          });
	        };

	        function makeInvokeMethod(innerFn, self, context) {
	          var state = GenStateSuspendedStart;
	          return function invoke(method, arg) {
	            if (state === GenStateExecuting) {
	              throw new Error("Generator is already running");
	            }

	            if (state === GenStateCompleted) {
	              if (method === "throw") {
	                throw arg;
	              } // Be forgiving, per 25.3.3.3.3 of the spec:
	              // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume


	              return doneResult();
	            }

	            context.method = method;
	            context.arg = arg;

	            while (true) {
	              var delegate = context.delegate;

	              if (delegate) {
	                var delegateResult = maybeInvokeDelegate(delegate, context);

	                if (delegateResult) {
	                  if (delegateResult === ContinueSentinel) continue;
	                  return delegateResult;
	                }
	              }

	              if (context.method === "next") {
	                // Setting context._sent for legacy support of Babel's
	                // function.sent implementation.
	                context.sent = context._sent = context.arg;
	              } else if (context.method === "throw") {
	                if (state === GenStateSuspendedStart) {
	                  state = GenStateCompleted;
	                  throw context.arg;
	                }

	                context.dispatchException(context.arg);
	              } else if (context.method === "return") {
	                context.abrupt("return", context.arg);
	              }

	              state = GenStateExecuting;
	              var record = tryCatch(innerFn, self, context);

	              if (record.type === "normal") {
	                // If an exception is thrown from innerFn, we leave state ===
	                // GenStateExecuting and loop back for another invocation.
	                state = context.done ? GenStateCompleted : GenStateSuspendedYield;

	                if (record.arg === ContinueSentinel) {
	                  continue;
	                }

	                return {
	                  value: record.arg,
	                  done: context.done
	                };
	              } else if (record.type === "throw") {
	                state = GenStateCompleted; // Dispatch the exception by looping back around to the
	                // context.dispatchException(context.arg) call above.

	                context.method = "throw";
	                context.arg = record.arg;
	              }
	            }
	          };
	        } // Call delegate.iterator[context.method](context.arg) and handle the
	        // result, either by returning a { value, done } result from the
	        // delegate iterator, or by modifying context.method and context.arg,
	        // setting context.delegate to null, and returning the ContinueSentinel.


	        function maybeInvokeDelegate(delegate, context) {
	          var method = delegate.iterator[context.method];

	          if (method === undefined$1) {
	            // A .throw or .return when the delegate iterator has no .throw
	            // method always terminates the yield* loop.
	            context.delegate = null;

	            if (context.method === "throw") {
	              // Note: ["return"] must be used for ES3 parsing compatibility.
	              if (delegate.iterator["return"]) {
	                // If the delegate iterator has a return method, give it a
	                // chance to clean up.
	                context.method = "return";
	                context.arg = undefined$1;
	                maybeInvokeDelegate(delegate, context);

	                if (context.method === "throw") {
	                  // If maybeInvokeDelegate(context) changed context.method from
	                  // "return" to "throw", let that override the TypeError below.
	                  return ContinueSentinel;
	                }
	              }

	              context.method = "throw";
	              context.arg = new TypeError("The iterator does not provide a 'throw' method");
	            }

	            return ContinueSentinel;
	          }

	          var record = tryCatch(method, delegate.iterator, context.arg);

	          if (record.type === "throw") {
	            context.method = "throw";
	            context.arg = record.arg;
	            context.delegate = null;
	            return ContinueSentinel;
	          }

	          var info = record.arg;

	          if (!info) {
	            context.method = "throw";
	            context.arg = new TypeError("iterator result is not an object");
	            context.delegate = null;
	            return ContinueSentinel;
	          }

	          if (info.done) {
	            // Assign the result of the finished delegate to the temporary
	            // variable specified by delegate.resultName (see delegateYield).
	            context[delegate.resultName] = info.value; // Resume execution at the desired location (see delegateYield).

	            context.next = delegate.nextLoc; // If context.method was "throw" but the delegate handled the
	            // exception, let the outer generator proceed normally. If
	            // context.method was "next", forget context.arg since it has been
	            // "consumed" by the delegate iterator. If context.method was
	            // "return", allow the original .return call to continue in the
	            // outer generator.

	            if (context.method !== "return") {
	              context.method = "next";
	              context.arg = undefined$1;
	            }
	          } else {
	            // Re-yield the result returned by the delegate method.
	            return info;
	          } // The delegate iterator is finished, so forget it and continue with
	          // the outer generator.


	          context.delegate = null;
	          return ContinueSentinel;
	        } // Define Generator.prototype.{next,throw,return} in terms of the
	        // unified ._invoke helper method.


	        defineIteratorMethods(Gp);
	        define(Gp, toStringTagSymbol, "Generator"); // A Generator should always return itself as the iterator object when the
	        // @@iterator function is called on it. Some browsers' implementations of the
	        // iterator prototype chain incorrectly implement this, causing the Generator
	        // object to not be returned from this call. This ensures that doesn't happen.
	        // See https://github.com/facebook/regenerator/issues/274 for more details.

	        Gp[iteratorSymbol] = function () {
	          return this;
	        };

	        Gp.toString = function () {
	          return "[object Generator]";
	        };

	        function pushTryEntry(locs) {
	          var entry = {
	            tryLoc: locs[0]
	          };

	          if (1 in locs) {
	            entry.catchLoc = locs[1];
	          }

	          if (2 in locs) {
	            entry.finallyLoc = locs[2];
	            entry.afterLoc = locs[3];
	          }

	          this.tryEntries.push(entry);
	        }

	        function resetTryEntry(entry) {
	          var record = entry.completion || {};
	          record.type = "normal";
	          delete record.arg;
	          entry.completion = record;
	        }

	        function Context(tryLocsList) {
	          // The root entry object (effectively a try statement without a catch
	          // or a finally block) gives us a place to store values thrown from
	          // locations where there is no enclosing try statement.
	          this.tryEntries = [{
	            tryLoc: "root"
	          }];
	          tryLocsList.forEach(pushTryEntry, this);
	          this.reset(true);
	        }

	        exports.keys = function (object) {
	          var keys = [];

	          for (var key in object) {
	            keys.push(key);
	          }

	          keys.reverse(); // Rather than returning an object with a next method, we keep
	          // things simple and return the next function itself.

	          return function next() {
	            while (keys.length) {
	              var key = keys.pop();

	              if (key in object) {
	                next.value = key;
	                next.done = false;
	                return next;
	              }
	            } // To avoid creating an additional object, we just hang the .value
	            // and .done properties off the next function object itself. This
	            // also ensures that the minifier will not anonymize the function.


	            next.done = true;
	            return next;
	          };
	        };

	        function values(iterable) {
	          if (iterable) {
	            var iteratorMethod = iterable[iteratorSymbol];

	            if (iteratorMethod) {
	              return iteratorMethod.call(iterable);
	            }

	            if (typeof iterable.next === "function") {
	              return iterable;
	            }

	            if (!isNaN(iterable.length)) {
	              var i = -1,
	                  next = function next() {
	                while (++i < iterable.length) {
	                  if (hasOwn.call(iterable, i)) {
	                    next.value = iterable[i];
	                    next.done = false;
	                    return next;
	                  }
	                }

	                next.value = undefined$1;
	                next.done = true;
	                return next;
	              };

	              return next.next = next;
	            }
	          } // Return an iterator with no values.


	          return {
	            next: doneResult
	          };
	        }

	        exports.values = values;

	        function doneResult() {
	          return {
	            value: undefined$1,
	            done: true
	          };
	        }

	        Context.prototype = {
	          constructor: Context,
	          reset: function reset(skipTempReset) {
	            this.prev = 0;
	            this.next = 0; // Resetting context._sent for legacy support of Babel's
	            // function.sent implementation.

	            this.sent = this._sent = undefined$1;
	            this.done = false;
	            this.delegate = null;
	            this.method = "next";
	            this.arg = undefined$1;
	            this.tryEntries.forEach(resetTryEntry);

	            if (!skipTempReset) {
	              for (var name in this) {
	                // Not sure about the optimal order of these conditions:
	                if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
	                  this[name] = undefined$1;
	                }
	              }
	            }
	          },
	          stop: function stop() {
	            this.done = true;
	            var rootEntry = this.tryEntries[0];
	            var rootRecord = rootEntry.completion;

	            if (rootRecord.type === "throw") {
	              throw rootRecord.arg;
	            }

	            return this.rval;
	          },
	          dispatchException: function dispatchException(exception) {
	            if (this.done) {
	              throw exception;
	            }

	            var context = this;

	            function handle(loc, caught) {
	              record.type = "throw";
	              record.arg = exception;
	              context.next = loc;

	              if (caught) {
	                // If the dispatched exception was caught by a catch block,
	                // then let that catch block handle the exception normally.
	                context.method = "next";
	                context.arg = undefined$1;
	              }

	              return !!caught;
	            }

	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];
	              var record = entry.completion;

	              if (entry.tryLoc === "root") {
	                // Exception thrown outside of any try block that could handle
	                // it, so set the completion value of the entire function to
	                // throw the exception.
	                return handle("end");
	              }

	              if (entry.tryLoc <= this.prev) {
	                var hasCatch = hasOwn.call(entry, "catchLoc");
	                var hasFinally = hasOwn.call(entry, "finallyLoc");

	                if (hasCatch && hasFinally) {
	                  if (this.prev < entry.catchLoc) {
	                    return handle(entry.catchLoc, true);
	                  } else if (this.prev < entry.finallyLoc) {
	                    return handle(entry.finallyLoc);
	                  }
	                } else if (hasCatch) {
	                  if (this.prev < entry.catchLoc) {
	                    return handle(entry.catchLoc, true);
	                  }
	                } else if (hasFinally) {
	                  if (this.prev < entry.finallyLoc) {
	                    return handle(entry.finallyLoc);
	                  }
	                } else {
	                  throw new Error("try statement without catch or finally");
	                }
	              }
	            }
	          },
	          abrupt: function abrupt(type, arg) {
	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];

	              if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
	                var finallyEntry = entry;
	                break;
	              }
	            }

	            if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
	              // Ignore the finally entry if control is not jumping to a
	              // location outside the try/catch block.
	              finallyEntry = null;
	            }

	            var record = finallyEntry ? finallyEntry.completion : {};
	            record.type = type;
	            record.arg = arg;

	            if (finallyEntry) {
	              this.method = "next";
	              this.next = finallyEntry.finallyLoc;
	              return ContinueSentinel;
	            }

	            return this.complete(record);
	          },
	          complete: function complete(record, afterLoc) {
	            if (record.type === "throw") {
	              throw record.arg;
	            }

	            if (record.type === "break" || record.type === "continue") {
	              this.next = record.arg;
	            } else if (record.type === "return") {
	              this.rval = this.arg = record.arg;
	              this.method = "return";
	              this.next = "end";
	            } else if (record.type === "normal" && afterLoc) {
	              this.next = afterLoc;
	            }

	            return ContinueSentinel;
	          },
	          finish: function finish(finallyLoc) {
	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];

	              if (entry.finallyLoc === finallyLoc) {
	                this.complete(entry.completion, entry.afterLoc);
	                resetTryEntry(entry);
	                return ContinueSentinel;
	              }
	            }
	          },
	          "catch": function _catch(tryLoc) {
	            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	              var entry = this.tryEntries[i];

	              if (entry.tryLoc === tryLoc) {
	                var record = entry.completion;

	                if (record.type === "throw") {
	                  var thrown = record.arg;
	                  resetTryEntry(entry);
	                }

	                return thrown;
	              }
	            } // The context.catch method must only be called with a location
	            // argument that corresponds to a known catch block.


	            throw new Error("illegal catch attempt");
	          },
	          delegateYield: function delegateYield(iterable, resultName, nextLoc) {
	            this.delegate = {
	              iterator: values(iterable),
	              resultName: resultName,
	              nextLoc: nextLoc
	            };

	            if (this.method === "next") {
	              // Deliberately forget the last sent value so that we don't
	              // accidentally pass it on to the delegate.
	              this.arg = undefined$1;
	            }

	            return ContinueSentinel;
	          }
	        }; // Regardless of whether this script is executing as a CommonJS module
	        // or not, return the runtime object so that we can declare the variable
	        // regeneratorRuntime in the outer scope, which allows this module to be
	        // injected easily by `bin/regenerator --include-runtime script.js`.

	        return exports;
	      }( // If this script is executing as a CommonJS module, use module.exports
	      // as the regeneratorRuntime namespace. Otherwise create a new empty
	      // object. Either way, the resulting object will be used to initialize
	      // the regeneratorRuntime variable at the top of this file.
	      module.exports);

	      try {
	        regeneratorRuntime = runtime;
	      } catch (accidentalStrictMode) {
	        // This module should not be running in strict mode, so the above
	        // assignment should always work unless something is misconfigured. Just
	        // in case runtime.js accidentally runs in strict mode, we can escape
	        // strict mode using a global Function call. This could conceivably fail
	        // if a Content Security Policy forbids using Function, but in that case
	        // the proper solution is to fix the accidental strict mode problem. If
	        // you've misconfigured your bundler to force strict mode and applied a
	        // CSP to forbid Function, and you're not willing to fix either of those
	        // problems, please detail your unique predicament in a GitHub issue.
	        Function("r", "regeneratorRuntime = r")(runtime);
	      }
	    });
	    var regenerator = runtime_1;
	    var eventemitter3 = createCommonjsModule(function (module) {
	      var has = Object.prototype.hasOwnProperty,
	          prefix = '~';
	      /**
	       * Constructor to create a storage for our `EE` objects.
	       * An `Events` instance is a plain object whose properties are event names.
	       *
	       * @constructor
	       * @private
	       */

	      function Events() {} //
	      // We try to not inherit from `Object.prototype`. In some engines creating an
	      // instance in this way is faster than calling `Object.create(null)` directly.
	      // If `Object.create(null)` is not supported we prefix the event names with a
	      // character to make sure that the built-in object properties are not
	      // overridden or used as an attack vector.
	      //


	      if (Object.create) {
	        Events.prototype = Object.create(null); //
	        // This hack is needed because the `__proto__` property is still inherited in
	        // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	        //

	        if (!new Events().__proto__) prefix = false;
	      }
	      /**
	       * Representation of a single event listener.
	       *
	       * @param {Function} fn The listener function.
	       * @param {*} context The context to invoke the listener with.
	       * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	       * @constructor
	       * @private
	       */


	      function EE(fn, context, once) {
	        this.fn = fn;
	        this.context = context;
	        this.once = once || false;
	      }
	      /**
	       * Add a listener for a given event.
	       *
	       * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn The listener function.
	       * @param {*} context The context to invoke the listener with.
	       * @param {Boolean} once Specify if the listener is a one-time listener.
	       * @returns {EventEmitter}
	       * @private
	       */


	      function addListener(emitter, event, fn, context, once) {
	        if (typeof fn !== 'function') {
	          throw new TypeError('The listener must be a function');
	        }

	        var listener = new EE(fn, context || emitter, once),
	            evt = prefix ? prefix + event : event;
	        if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);else emitter._events[evt] = [emitter._events[evt], listener];
	        return emitter;
	      }
	      /**
	       * Clear event by name.
	       *
	       * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	       * @param {(String|Symbol)} evt The Event name.
	       * @private
	       */


	      function clearEvent(emitter, evt) {
	        if (--emitter._eventsCount === 0) emitter._events = new Events();else delete emitter._events[evt];
	      }
	      /**
	       * Minimal `EventEmitter` interface that is molded against the Node.js
	       * `EventEmitter` interface.
	       *
	       * @constructor
	       * @public
	       */


	      function EventEmitter() {
	        this._events = new Events();
	        this._eventsCount = 0;
	      }
	      /**
	       * Return an array listing the events for which the emitter has registered
	       * listeners.
	       *
	       * @returns {Array}
	       * @public
	       */


	      EventEmitter.prototype.eventNames = function eventNames() {
	        var names = [],
	            events,
	            name;
	        if (this._eventsCount === 0) return names;

	        for (name in events = this._events) {
	          if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	        }

	        if (Object.getOwnPropertySymbols) {
	          return names.concat(Object.getOwnPropertySymbols(events));
	        }

	        return names;
	      };
	      /**
	       * Return the listeners registered for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @returns {Array} The registered listeners.
	       * @public
	       */


	      EventEmitter.prototype.listeners = function listeners(event) {
	        var evt = prefix ? prefix + event : event,
	            handlers = this._events[evt];
	        if (!handlers) return [];
	        if (handlers.fn) return [handlers.fn];

	        for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	          ee[i] = handlers[i].fn;
	        }

	        return ee;
	      };
	      /**
	       * Return the number of listeners listening to a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @returns {Number} The number of listeners.
	       * @public
	       */


	      EventEmitter.prototype.listenerCount = function listenerCount(event) {
	        var evt = prefix ? prefix + event : event,
	            listeners = this._events[evt];
	        if (!listeners) return 0;
	        if (listeners.fn) return 1;
	        return listeners.length;
	      };
	      /**
	       * Calls each of the listeners registered for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @returns {Boolean} `true` if the event had listeners, else `false`.
	       * @public
	       */


	      EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	        var evt = prefix ? prefix + event : event;
	        if (!this._events[evt]) return false;
	        var listeners = this._events[evt],
	            len = arguments.length,
	            args,
	            i;

	        if (listeners.fn) {
	          if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	          switch (len) {
	            case 1:
	              return listeners.fn.call(listeners.context), true;

	            case 2:
	              return listeners.fn.call(listeners.context, a1), true;

	            case 3:
	              return listeners.fn.call(listeners.context, a1, a2), true;

	            case 4:
	              return listeners.fn.call(listeners.context, a1, a2, a3), true;

	            case 5:
	              return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;

	            case 6:
	              return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	          }

	          for (i = 1, args = new Array(len - 1); i < len; i++) {
	            args[i - 1] = arguments[i];
	          }

	          listeners.fn.apply(listeners.context, args);
	        } else {
	          var length = listeners.length,
	              j;

	          for (i = 0; i < length; i++) {
	            if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	            switch (len) {
	              case 1:
	                listeners[i].fn.call(listeners[i].context);
	                break;

	              case 2:
	                listeners[i].fn.call(listeners[i].context, a1);
	                break;

	              case 3:
	                listeners[i].fn.call(listeners[i].context, a1, a2);
	                break;

	              case 4:
	                listeners[i].fn.call(listeners[i].context, a1, a2, a3);
	                break;

	              default:
	                if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
	                  args[j - 1] = arguments[j];
	                }
	                listeners[i].fn.apply(listeners[i].context, args);
	            }
	          }
	        }

	        return true;
	      };
	      /**
	       * Add a listener for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn The listener function.
	       * @param {*} [context=this] The context to invoke the listener with.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.on = function on(event, fn, context) {
	        return addListener(this, event, fn, context, false);
	      };
	      /**
	       * Add a one-time listener for a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn The listener function.
	       * @param {*} [context=this] The context to invoke the listener with.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.once = function once(event, fn, context) {
	        return addListener(this, event, fn, context, true);
	      };
	      /**
	       * Remove the listeners of a given event.
	       *
	       * @param {(String|Symbol)} event The event name.
	       * @param {Function} fn Only remove the listeners that match this function.
	       * @param {*} context Only remove the listeners that have this context.
	       * @param {Boolean} once Only remove one-time listeners.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	        var evt = prefix ? prefix + event : event;
	        if (!this._events[evt]) return this;

	        if (!fn) {
	          clearEvent(this, evt);
	          return this;
	        }

	        var listeners = this._events[evt];

	        if (listeners.fn) {
	          if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
	            clearEvent(this, evt);
	          }
	        } else {
	          for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	            if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
	              events.push(listeners[i]);
	            }
	          } //
	          // Reset the array, or remove it completely if we have no more listeners.
	          //


	          if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;else clearEvent(this, evt);
	        }

	        return this;
	      };
	      /**
	       * Remove all listeners, or those of the specified event.
	       *
	       * @param {(String|Symbol)} [event] The event name.
	       * @returns {EventEmitter} `this`.
	       * @public
	       */


	      EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	        var evt;

	        if (event) {
	          evt = prefix ? prefix + event : event;
	          if (this._events[evt]) clearEvent(this, evt);
	        } else {
	          this._events = new Events();
	          this._eventsCount = 0;
	        }

	        return this;
	      }; //
	      // Alias methods names because people roll like that.
	      //


	      EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	      EventEmitter.prototype.addListener = EventEmitter.prototype.on; //
	      // Expose the prefix.
	      //

	      EventEmitter.prefixed = prefix; //
	      // Allow `EventEmitter` to be imported as module namespace.
	      //

	      EventEmitter.EventEmitter = EventEmitter; //
	      // Expose the module.
	      //

	      {
	        module.exports = EventEmitter;
	      }
	    });

	    function isWindow() {
	      return typeof window !== 'undefined' && typeof window.document !== 'undefined';
	    } //ww


	    var ww;

	    function protectShell() {
	      //cEnv
	      var cEnv = isWindow() ? 'browser' : 'nodejs'; //check, 後續會有Nodejs或瀏覽器依賴的API例如window.atob或Buffer, 於import階段時就先行偵測跳出

	      if (cEnv !== 'browser') {
	        return null;
	      }

	      function evem() {
	        return new eventemitter3();
	      }

	      function genPm() {
	        var resolve;
	        var reject;
	        var p = new Promise(function () {
	          resolve = arguments[0];
	          reject = arguments[1];
	        });
	        p.resolve = resolve;
	        p.reject = reject;
	        return p;
	      }

	      function genID() {
	        var len = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
	        var uuid = [];
	        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
	        var radix = chars.length;

	        for (var i = 0; i < len; i++) {
	          uuid[i] = chars[0 | Math.random() * radix];
	        }

	        var r = uuid.join('');
	        return r;
	      }

	      function b642str(b64) {
	        return window.atob(b64); //瀏覽器端執行使用atob
	      } //codeShow
	      //codeB64, 此處需提供worker執行程式碼, 因有特殊符號編譯困難, 故需先轉base64再使用


	      var codeB64 = 'CgoKYXN5bmMgZnVuY3Rpb24gZ1dvcmtlcjNfRnVuKHAxLCBwMikgewogIC8vIHRocm93IG5ldyBFcnJvcignZ1dvcmtlcjNfRnVuIGVycm9yJykKICByZXR1cm4gJ3AxOicgKyBwMSArICcsIHAyOicgKyBwMiArICcsIOa4rOippuS4reaWhyc7Cn0KCgoKbGV0IGluc3RhbmNlID0gbnVsbApmdW5jdGlvbiBpbml0KGlucHV0KXsKCiAgICAvL2luaXQKICAgIGxldCByCiAgICAKICAgICAgICByID0gewogICAgICAgICAgICBtYWluOiBnV29ya2VyM19GdW4KICAgICAgICB9CiAgICAgICAgCgogICAgLy9vbgogICAgCgogICAgLy9zYXZlCiAgICBpbnN0YW5jZSA9IHIKCn0KCmZ1bmN0aW9uIHNlbmRNZXNzYWdlKGRhdGEpIHsKICAgIAogICAgICAgIHNlbGYucG9zdE1lc3NhZ2UoZGF0YSkKICAgICAgICAKfQoKYXN5bmMgZnVuY3Rpb24gcnVuKGRhdGEpIHsKICAgIC8vIGNvbnNvbGUubG9nKCdpbm5lciB3b3JrZXIgcnVuJyxkYXRhKQoKICAgIC8vbW9kZQogICAgbGV0IG1vZGUgPSBkYXRhLm1vZGUKCiAgICAvL2NoZWNrCiAgICBpZihtb2RlICE9PSAnaW5pdCcgJiYgbW9kZSAhPT0gJ2NhbGwnKXsKICAgICAgICByZXR1cm4KICAgIH0KCiAgICAvL2luaXQKICAgIGlmKG1vZGUgPT09ICdpbml0Jyl7CiAgICAgICAgCiAgICAgICAgdHJ5ewoKICAgICAgICAgICAgLy90eXBlCiAgICAgICAgICAgIGxldCB0eXBlID0gZGF0YS50eXBlCgogICAgICAgICAgICAvL2lucHV0CiAgICAgICAgICAgIGxldCBpbnB1dCA9IGRhdGEuaW5wdXQKICAgIAogICAgICAgICAgICAvL2luc3RhbmNlCiAgICAgICAgICAgIGlmKHR5cGUgPT09ICdmdW5jdGlvbicpewogICAgICAgICAgICAgICAgaW5pdCguLi5pbnB1dCkKICAgICAgICAgICAgfQogICAgICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdvYmplY3QnKXsKICAgICAgICAgICAgICAgIGluc3RhbmNlID0gZ1dvcmtlcjNfRnVuCiAgICAgICAgICAgIH0KCiAgICAgICAgfQogICAgICAgIGNhdGNoKGVycil7CiAgICAgICAgCiAgICAgICAgICAgIC8vc2VuZE1lc3NhZ2UKICAgICAgICAgICAgbGV0IHJlcyA9IHsKICAgICAgICAgICAgICAgIG1vZGU6ICdlbWl0JywKICAgICAgICAgICAgICAgIGV2TmFtZTogJ2Vycm9yJywKICAgICAgICAgICAgICAgIG1zZzogZXJyLAogICAgICAgICAgICB9CiAgICAgICAgICAgIHNlbmRNZXNzYWdlKHJlcykKCiAgICAgICAgfQogICAgICAgICAgICAKICAgIH0KCiAgICAvL2NoZWNrCiAgICBpZihtb2RlID09PSAnY2FsbCcpewogICAgICAgIGxldCBzdGF0ZSA9ICcnCiAgICAgICAgbGV0IG1zZyA9IG51bGwKCiAgICAgICAgdHJ5ewoKICAgICAgICAgICAgLy9mdW4KICAgICAgICAgICAgbGV0IGZ1biA9IGluc3RhbmNlW2RhdGEuZnVuXQoKICAgICAgICAgICAgLy9pbnB1dAogICAgICAgICAgICBsZXQgaW5wdXQgPSBkYXRhLmlucHV0CgogICAgICAgICAgICAvL2V4ZWMKICAgICAgICAgICAgYXdhaXQgZnVuKC4uLmlucHV0KQogICAgICAgICAgICAgICAgLnRoZW4oKHN1YykgPT4gewogICAgICAgICAgICAgICAgICAgIHN0YXRlPSdzdWNjZXNzJwogICAgICAgICAgICAgICAgICAgIG1zZz1zdWMKICAgICAgICAgICAgICAgIH0pCiAgICAgICAgICAgICAgICAuY2F0Y2goKGVycikgPT4gewogICAgICAgICAgICAgICAgICAgIHN0YXRlPSdlcnJvcicKICAgICAgICAgICAgICAgICAgICBtc2c9ZXJyCiAgICAgICAgICAgICAgICB9KQoKICAgICAgICB9CiAgICAgICAgY2F0Y2goZXJyKXsKICAgICAgICAgICAgc3RhdGUgPSAnZXJyb3InCiAgICAgICAgICAgIG1zZyA9IGVycgogICAgICAgIH0KICAgICAgICAKICAgICAgICAvL3NlbmRNZXNzYWdlCiAgICAgICAgbGV0IHJlcyA9IHsKICAgICAgICAgICAgbW9kZTogJ3JldHVybicsCiAgICAgICAgICAgIGlkOiBkYXRhLmlkLAogICAgICAgICAgICBmdW46IGRhdGEuZnVuLAogICAgICAgICAgICBzdGF0ZSwKICAgICAgICAgICAgbXNnLAogICAgICAgIH0KICAgICAgICBzZW5kTWVzc2FnZShyZXMpCgogICAgfQoKfQoKZnVuY3Rpb24gcmVjdk1lc3NhZ2UoZGF0YSkgewogICAgLy8gY29uc29sZS5sb2coJ2lubmVyIHdvcmtlciByZWN2OicsIGRhdGEpCgogICAgLy9kYXRhUmVjdgogICAgbGV0IGRhdGFSZWN2ID0gZGF0YQoKICAgIC8vcnVuCiAgICBydW4oZGF0YVJlY3YpCgp9CgoKICAgICAgICBzZWxmLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChlKSB7CiAgICAgICAgICAgIHJlY3ZNZXNzYWdlKGUuZGF0YSkKICAgICAgICB9CiAgICAgICAgCgo='; //code

	      var code = b642str(codeB64);

	      function wrapWorker() {
	        //evem
	        var ev = evem();

	        function genWorker(code) {
	          //new Worker
	          try {
	            var blob = new Blob([code]); //blob for Chrome 8+, Firefox 6+, Safari 6.0+, Opera 15+

	            var URL = window.URL || window.webkitURL;
	            return new Worker(URL.createObjectURL(blob));
	          } catch (err) {
	            emitError(err);
	          }
	        } //genWorker


	        var wk = genWorker(code); //check, 於瀏覽器端可能會遭遇IE11安全性問題, 或被CSP的worker-src或script-src設定阻擋

	        if (!wk) {
	          emitError('invalid worker');
	          return null;
	        }

	        function terminate() {
	          if (wk) {
	            wk.terminate();
	            wk = undefined;
	          } else {
	            emitError('worker has been terminated');
	          }
	        }

	        function init() {
	          //dataSend
	          var dataSend = {
	            mode: 'init',
	            type: 'function',
	            input: Array.prototype.slice.call(arguments) //若直接用arguments會無法編譯

	          }; //postMessage

	          wk.postMessage(dataSend);
	        }

	        function main() {
	          //pm
	          var pm = genPm(); //id

	          var id = genID(); //dataSend

	          var dataSend = {
	            mode: 'call',
	            id: id,
	            fun: 'main',
	            input: Array.prototype.slice.call(arguments) //若直接用arguments會無法編譯

	          }; //postMessage

	          wk.postMessage(dataSend); //once

	          ev.once(id, function (res) {
	            if (res.state === 'success') {
	              pm.resolve(res.msg);
	            } else {
	              pm.reject(res.msg);
	            }
	          });
	          return pm;
	        }

	        function recvMessage(data) {
	          // console.log('outer worker recv:', data)
	          //dataRecv
	          var dataRecv = data; //mode

	          var mode = dataRecv.mode; //check

	          if (mode !== 'emit' && mode !== 'return') {
	            return;
	          } //emit


	          if (mode === 'emit') {
	            //emit
	            ev.emit(dataRecv.evName, dataRecv.msg);
	          } //return


	          if (mode === 'return') {
	            //emit
	            ev.emit(dataRecv.id, dataRecv);
	          }
	        } //bind recvMessage


	        wk.onmessage = function (e) {
	          recvMessage(e.data);
	        };

	        function emitError(err) {
	          ev.emit('error', err);
	        } //bind emitError


	        wk.onerror = emitError; //init

	        init(Array.prototype.slice.call(arguments)); //若直接用arguments會無法編譯

	        ev.main = main;
	        ev.main = main;
	        ev.terminate = terminate;
	        return ev;
	      } //set ww


	      ww = /*#__PURE__*/function () {
	        var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
	          var input,
	              nww,
	              r,
	              _args = arguments;
	          return regenerator.wrap(function _callee$(_context) {
	            while (1) {
	              switch (_context.prev = _context.next) {
	                case 0:
	                  input = Array.prototype.slice.call(_args);
	                  nww = wrapWorker();
	                  _context.next = 4;
	                  return nww.main.apply(nww, _toConsumableArray(input)) //nww.main需跟cmain一致
	                  . //nww.main需跟cmain一致
	                  finally(function () {
	                    nww.terminate(); //每次執行完不論成功失敗都要中止worker
	                  });

	                case 4:
	                  r = _context.sent;
	                  return _context.abrupt("return", r);

	                case 6:
	                case "end":
	                  return _context.stop();
	              }
	            }
	          }, _callee);
	        }));

	        return function ww() {
	          return _ref.apply(this, arguments);
	        };
	      }();
	    }

	    protectShell();
	    var ww$1 = ww;
	    return ww$1;
	  });
	});

	function isWindow() {
	  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
	}

	var wk;

	if (isWindow()) {
	  wk = tempJJN6UxosVRHiu7TKPmcYCcQ7s3XqhgD0Ww;
	} else {
	  wk = tempJJN6UxosVRHiu7TKPmcYCcQ7s3XqhgD0Nw;
	}

	var wk$1 = wk;

	return wk$1;

})));
