(function() {
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Pipeable.js
	/**
	* The `Pipeable` module defines the shared interface and implementation helpers
	* for values that support Effect-style method chaining with `.pipe(...)`.
	*
	* A `Pipeable` value can pass itself through a sequence of unary functions from
	* left to right, so code can be written as `value.pipe(f, g, h)` instead of
	* deeply nesting calls. This is the method form used by many Effect data types
	* to compose transformations, validations, and effectful operations while
	* keeping the original value as the starting point of the pipeline.
	*
	* @since 2.0.0
	*/
	/**
	* Applies a `pipe` method's variadic arguments to an initial value from left
	* to right.
	*
	* **When to use**
	*
	* Use to implement a custom `.pipe(...)` method from JavaScript's `arguments`
	* object.
	*
	* **Details**
	*
	* This helper is intended for implementing `Pipeable.pipe` methods that
	* receive JavaScript's `arguments` object. With no functions it returns the
	* original value; otherwise it feeds each result into the next function.
	*
	* **Example** (Implementing a pipe method)
	*
	* ```ts
	* import { Pipeable } from "effect"
	*
	* class NumberBox {
	*   constructor(readonly value: number) {}
	*
	*   pipe(..._fns: ReadonlyArray<(value: number) => number>): number {
	*     return Pipeable.pipeArguments(this.value, arguments) as number
	*   }
	* }
	*
	* const result = new NumberBox(5).pipe(
	*   (n) => n + 2,
	*   (n) => n * 3
	* )
	* console.log(result) // 21
	* ```
	*
	* @category combinators
	* @since 2.0.0
	*/
	var pipeArguments = (self, args) => {
		switch (args.length) {
			case 0: return self;
			case 1: return args[0](self);
			case 2: return args[1](args[0](self));
			case 3: return args[2](args[1](args[0](self)));
			case 4: return args[3](args[2](args[1](args[0](self))));
			case 5: return args[4](args[3](args[2](args[1](args[0](self)))));
			case 6: return args[5](args[4](args[3](args[2](args[1](args[0](self))))));
			case 7: return args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))));
			case 8: return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self))))))));
			case 9: return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))));
			default: {
				let ret = self;
				for (let i = 0, len = args.length; i < len; i++) ret = args[i](ret);
				return ret;
			}
		}
	};
	/**
	* Reusable prototype that implements `Pipeable.pipe`.
	*
	* **When to use**
	*
	* Use when classes or object prototypes can reuse this value when they need the
	* standard pipe implementation backed by `pipeArguments`.
	*
	* @category prototypes
	* @since 3.15.0
	*/
	var Prototype$1 = { pipe() {
		return pipeArguments(this, arguments);
	} };
	/**
	* Provides a base constructor whose instances implement the standard `Pipeable.pipe`
	* method.
	*
	* **When to use**
	*
	* Use when you need to define a class that supports Effect-style method
	* chaining through `.pipe(...)`.
	*
	* @category constructors
	* @since 3.15.0
	*/
	var Class$1 = /*#__PURE__*/ function() {
		function PipeableBase() {}
		PipeableBase.prototype = Prototype$1;
		return PipeableBase;
	}();
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Function.js
	/**
	* Creates a function that can be called in data-first style or data-last
	* (`pipe`-friendly) style.
	*
	* **When to use**
	*
	* Use to expose one implementation through both direct and `pipe`-friendly
	* call styles.
	*
	* **Details**
	*
	* Pass either the arity of the uncurried function or a predicate that decides
	* whether the current call is data-first. Arity is the common case. Use a
	* predicate when optional arguments make arity ambiguous.
	*
	* **Example** (Selecting data-first or data-last style by arity)
	*
	* ```ts
	* import { Function, pipe } from "effect"
	*
	* const sum = Function.dual<
	*   (that: number) => (self: number) => number,
	*   (self: number, that: number) => number
	* >(2, (self, that) => self + that)
	*
	* console.log(sum(2, 3)) // 5
	* console.log(pipe(2, sum(3))) // 5
	* ```
	*
	* **Example** (Defining overloads with call signatures)
	*
	* ```ts
	* import { Function, pipe } from "effect"
	*
	* const sum: {
	*   (that: number): (self: number) => number
	*   (self: number, that: number): number
	* } = Function.dual(2, (self: number, that: number): number => self + that)
	*
	* console.log(sum(2, 3)) // 5
	* console.log(pipe(2, sum(3))) // 5
	* ```
	*
	* **Example** (Selecting data-first or data-last style with a predicate)
	*
	* ```ts
	* import { Function, pipe } from "effect"
	*
	* const sum = Function.dual<
	*   (that: number) => (self: number) => number,
	*   (self: number, that: number) => number
	* >(
	*   (args) => args.length === 2,
	*   (self, that) => self + that
	* )
	*
	* console.log(sum(2, 3)) // 5
	* console.log(pipe(2, sum(3))) // 5
	* ```
	*
	* @category combinators
	* @since 2.0.0
	*/
	var dual = function(arity, body) {
		if (typeof arity === "function") return function() {
			return arity(arguments) ? body.apply(this, arguments) : (self) => body(self, ...arguments);
		};
		switch (arity) {
			case 0:
			case 1: throw new RangeError(`Invalid arity ${arity}`);
			case 2: return function(a, b) {
				if (arguments.length >= 2) return body(a, b);
				return function(self) {
					return body(self, a);
				};
			};
			case 3: return function(a, b, c) {
				if (arguments.length >= 3) return body(a, b, c);
				return function(self) {
					return body(self, a, b);
				};
			};
			default: return function() {
				if (arguments.length >= arity) return body.apply(this, arguments);
				const args = arguments;
				return function(self) {
					return body(self, ...args);
				};
			};
		}
	};
	/**
	* Returns its input argument unchanged.
	*
	* **When to use**
	*
	* Use to return a value unchanged where a function is required.
	*
	* **Example** (Returning the same value)
	*
	* ```ts
	* import { identity } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(identity(5), 5)
	* ```
	*
	* @category combinators
	* @since 2.0.0
	*/
	var identity = (a) => a;
	/**
	* Creates a zero-argument function that always returns the provided value.
	*
	* **When to use**
	*
	* Use when you need a thunk or callback that returns the same value on every
	* invocation.
	*
	* **Example** (Creating a constant thunk)
	*
	* ```ts
	* import { Function } from "effect"
	* import * as assert from "node:assert"
	*
	* const constNull = Function.constant(null)
	*
	* assert.deepStrictEqual(constNull(), null)
	* assert.deepStrictEqual(constNull(), null)
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var constant = (value) => () => value;
	/**
	* Returns `true` when called.
	*
	* **When to use**
	*
	* Use when you need a thunk that returns `true` on every invocation.
	*
	* **Example** (Returning true from a thunk)
	*
	* ```ts
	* import { Function } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(Function.constTrue(), true)
	* ```
	*
	* @category constants
	* @since 2.0.0
	*/
	var constTrue = /*#__PURE__*/ constant(true);
	/**
	* Returns `false` when called.
	*
	* **When to use**
	*
	* Use when you need a thunk that returns `false` on every invocation.
	*
	* **Example** (Returning false from a thunk)
	*
	* ```ts
	* import { Function } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(Function.constFalse(), false)
	* ```
	*
	* @category constants
	* @since 2.0.0
	*/
	var constFalse = /*#__PURE__*/ constant(false);
	/**
	* Returns `undefined` when called.
	*
	* **When to use**
	*
	* Use when you need a thunk that returns `undefined` on every invocation.
	*
	* **Example** (Returning undefined from a thunk)
	*
	* ```ts
	* import { Function } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(Function.constUndefined(), undefined)
	* ```
	*
	* @category constants
	* @since 2.0.0
	*/
	var constUndefined = /*#__PURE__*/ constant(void 0);
	/**
	* Returns no meaningful value when called.
	*
	* **When to use**
	*
	* Use when you need a thunk that is called only for its effect and has no
	* meaningful return value.
	*
	* **Example** (Returning void from a thunk)
	*
	* ```ts
	* import { Function } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(Function.constVoid(), undefined)
	* ```
	*
	* @category constants
	* @since 2.0.0
	*/
	var constVoid = constUndefined;
	/**
	* Creates a memoized function whose input is an object, caching results by
	* object identity.
	*
	* **When to use**
	*
	* Use to reuse the result of a synchronous computation whose output is stable
	* for a given object reference.
	*
	* **Details**
	*
	* Each memoized wrapper owns a private `WeakMap` keyed by object identity.
	* Cached `undefined` results are still returned because the cache is checked
	* with `WeakMap.has`.
	*
	* **Gotchas**
	*
	* Structurally equal objects do not share cache entries. If the same object is
	* mutated after its first call, later calls still return the cached result for
	* that reference.
	*
	* @category caching
	* @since 4.0.0
	*/
	function memoize(f) {
		const cache = /* @__PURE__ */ new WeakMap();
		return (a) => {
			if (cache.has(a)) return cache.get(a);
			const result = f(a);
			cache.set(a, result);
			return result;
		};
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/equal.js
	/** @internal */
	var getAllObjectKeys = (obj) => {
		const keys = new Set(Reflect.ownKeys(obj));
		if (obj.constructor === Object) return keys;
		if (obj instanceof Error) keys.delete("stack");
		const proto = Object.getPrototypeOf(obj);
		let current = proto;
		while (current !== null && current !== Object.prototype) {
			const ownKeys = Reflect.ownKeys(current);
			for (let i = 0; i < ownKeys.length; i++) keys.add(ownKeys[i]);
			current = Object.getPrototypeOf(current);
		}
		if (keys.has("constructor") && typeof obj.constructor === "function" && proto === obj.constructor.prototype) keys.delete("constructor");
		return keys;
	};
	/** @internal */
	var byReferenceInstances = /*#__PURE__*/ new WeakSet();
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Predicate.js
	/**
	* Defines runtime checks for values.
	*
	* A `Predicate<A>` returns `true` or `false` for an `A`. A
	* `Refinement<A, B>` is a predicate that also narrows the TypeScript type when
	* it succeeds. This module includes guards for common JavaScript values,
	* property and tag checks, tuple and struct checks, boolean combinators, and
	* helpers for composing predicates and refinements.
	*
	* @since 2.0.0
	*/
	/**
	* Checks whether a value is a `string`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard to narrow an `unknown` value to a
	* string.
	*
	* **Details**
	*
	* Uses `typeof input === "string"`.
	*
	* **Example** (Guarding strings)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const data: unknown = "hi"
	*
	* if (Predicate.isString(data)) {
	*   console.log(data.toUpperCase())
	* }
	* ```
	*
	* @see {@link isNumber}
	* @see {@link isBoolean}
	* @see {@link Refinement}
	* @category guards
	* @since 2.0.0
	*/
	function isString(input) {
		return typeof input === "string";
	}
	/**
	* Checks whether a value is a `number`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard to narrow an `unknown` value to a
	* number.
	*
	* **Details**
	*
	* Uses `typeof input === "number"` and does not exclude `NaN` or `Infinity`.
	*
	* **Example** (Guarding numbers)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const data: unknown = 42
	*
	* if (Predicate.isNumber(data)) {
	*   console.log(data + 1)
	* }
	* ```
	*
	* @see {@link isBigInt}
	* @see {@link isString}
	* @category guards
	* @since 2.0.0
	*/
	function isNumber(input) {
		return typeof input === "number";
	}
	/**
	* Checks whether a value is a `boolean`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard to narrow an `unknown` value to a
	* boolean.
	*
	* **Details**
	*
	* Uses `typeof input === "boolean"`.
	*
	* **Example** (Guarding booleans)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const data: unknown = true
	*
	* if (Predicate.isBoolean(data)) {
	*   console.log(data ? "yes" : "no")
	* }
	* ```
	*
	* @see {@link isString}
	* @see {@link isNumber}
	* @category guards
	* @since 2.0.0
	*/
	function isBoolean(input) {
		return typeof input === "boolean";
	}
	/**
	* Checks whether a value is a `symbol`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard to narrow an `unknown` value to a
	* symbol.
	*
	* **Details**
	*
	* Uses `typeof input === "symbol"`.
	*
	* **Example** (Guarding symbols)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const data: unknown = Symbol.for("id")
	*
	* if (Predicate.isSymbol(data)) {
	*   console.log(data.description)
	* }
	* ```
	*
	* @see {@link isPropertyKey}
	* @category guards
	* @since 2.0.0
	*/
	function isSymbol(input) {
		return typeof input === "symbol";
	}
	/**
	* Checks whether a value is a valid `PropertyKey` (string, number, or symbol).
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard for unknown property keys before
	* indexing.
	*
	* **Details**
	*
	* Uses `isString`, `isNumber`, and `isSymbol`.
	*
	* **Example** (Guarding property keys)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const key: unknown = "name"
	* const obj: Record<PropertyKey, unknown> = { name: "Ada" }
	*
	* if (Predicate.isPropertyKey(key) && key in obj) {
	*   console.log(obj[key])
	* }
	* ```
	*
	* @see {@link isString}
	* @see {@link isNumber}
	* @see {@link isSymbol}
	* @category guards
	* @since 4.0.0
	*/
	function isPropertyKey(u) {
		return isString(u) || isNumber(u) || isSymbol(u);
	}
	/**
	* Checks whether a value is a `function`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard to narrow an `unknown` value to a
	* callable function.
	*
	* **Details**
	*
	* Uses `typeof input === "function"`.
	*
	* **Example** (Guarding functions)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const data: unknown = () => 1
	*
	* if (Predicate.isFunction(data)) {
	*   console.log(data())
	* }
	* ```
	*
	* @see {@link isObjectKeyword}
	* @category guards
	* @since 2.0.0
	*/
	function isFunction(input) {
		return typeof input === "function";
	}
	/**
	* Checks whether a value is not `undefined`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` refinement that filters out `undefined`
	* while preserving other falsy values.
	*
	* **Details**
	*
	* Returns a refinement that excludes `undefined`.
	*
	* **Example** (Filtering undefined values)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const values = [1, undefined, 2]
	* const defined = values.filter(Predicate.isNotUndefined)
	*
	* console.log(defined)
	* ```
	*
	* @see {@link isUndefined}
	* @see {@link isNotNullish}
	* @category guards
	* @since 2.0.0
	*/
	function isNotUndefined(input) {
		return input !== void 0;
	}
	/**
	* Checks whether a value is not `null` and not `undefined`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` refinement that filters out nullish values
	* but keeps other falsy ones.
	*
	* **Details**
	*
	* Uses `input != null`.
	*
	* **Example** (Filtering non-nullish values)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const values = [0, null, "", undefined]
	* const present = values.filter(Predicate.isNotNullish)
	*
	* console.log(present)
	* ```
	*
	* @see {@link isNullish}
	* @see {@link isNotNull}
	* @see {@link isNotUndefined}
	* @category guards
	* @since 4.0.0
	*/
	function isNotNullish(input) {
		return input != null;
	}
	/**
	* Type guard that always returns `false`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` that never accepts, e.g. in default branches.
	*
	* **Example** (Matching no values)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* console.log(Predicate.isNever("anything"))
	* ```
	*
	* @see {@link isUnknown}
	* @category guards
	* @since 2.0.0
	*/
	function isNever$1(_) {
		return false;
	}
	/**
	* Type guard that always returns `true`.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` that always accepts, e.g. as a placeholder.
	*
	* **Example** (Matching every value)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* console.log(Predicate.isUnknown(123))
	* ```
	*
	* @see {@link isNever}
	* @category guards
	* @since 2.0.0
	*/
	function isUnknown(_) {
		return true;
	}
	/**
	* Checks whether a value is a non-null object value that is not an array.
	*
	* **When to use**
	*
	* Use to narrow unknown input to a non-null, non-array object with a
	* `Predicate` guard.
	*
	* **Details**
	*
	* This is a structural runtime check using `typeof input === "object"`, so it
	* also accepts object instances such as `Date`, `Map`, class instances, and
	* typed arrays. It excludes `null` and arrays.
	*
	* **Example** (Guarding objects)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* console.log(Predicate.isObject({ a: 1 }))
	* console.log(Predicate.isObject([1, 2]))
	* ```
	*
	* @see {@link isObjectOrArray}
	* @see {@link isReadonlyObject}
	* @category guards
	* @since 2.0.0
	*/
	function isObject(input) {
		return typeof input === "object" && input !== null && !Array.isArray(input);
	}
	/**
	* Checks whether a value is an `object` in the JavaScript sense (objects, arrays, functions).
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard that accepts arrays and functions as
	* well as objects.
	*
	* **Details**
	*
	* Returns `true` for arrays and functions, and `false` for `null`.
	*
	* **Example** (Checking object keywords)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* console.log(Predicate.isObjectKeyword(() => 1))
	* console.log(Predicate.isObjectKeyword(null))
	* ```
	*
	* @see {@link isObject}
	* @see {@link isObjectOrArray}
	* @category guards
	* @since 4.0.0
	*/
	function isObjectKeyword(input) {
		return typeof input === "object" && input !== null || isFunction(input);
	}
	/**
	* Checks whether a value has a given property key.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard for property access on `unknown`
	* values with a simple structural object check.
	*
	* **Details**
	*
	* Uses the `in` operator and `isObjectKeyword`. This does not check property
	* value types.
	*
	* **Example** (Guarding object properties)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const hasName = Predicate.hasProperty("name")
	* const data: unknown = { name: "Ada" }
	*
	* if (hasName(data)) {
	*   console.log(data.name)
	* }
	* ```
	*
	* @see {@link isTagged}
	* @see {@link isObjectKeyword}
	* @category guards
	* @since 2.0.0
	*/
	var hasProperty = /*#__PURE__*/ dual(2, (self, property) => isObjectKeyword(self) && property in self);
	/**
	* Checks whether a value is iterable.
	*
	* **When to use**
	*
	* Use when you need a `Predicate` guard before iterating an unknown value.
	*
	* **Details**
	*
	* Accepts strings as iterable and uses `hasProperty` for `Symbol.iterator`.
	*
	* **Example** (Guarding iterables)
	*
	* ```ts
	* import { Predicate } from "effect"
	*
	* const data: unknown = [1, 2, 3]
	*
	* console.log(Predicate.isIterable(data))
	* ```
	*
	* @see {@link isSet}
	* @see {@link isMap}
	* @category guards
	* @since 2.0.0
	*/
	function isIterable(input) {
		return hasProperty(input, Symbol.iterator) || isString(input);
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Hash.js
	/**
	* Computes Effect hash values and defines the interface for objects that want
	* to provide their own hash implementation. Hashes are small numeric
	* fingerprints used by Effect data structures to bucket values quickly; they
	* are not cryptographic digests and they are not proof that two values are
	* equal. The module also includes helpers for primitive, structure, array, and
	* reference-based hashes, plus functions for combining and optimizing numeric
	* hash values.
	*
	* @since 2.0.0
	*/
	/**
	* Defines the unique identifier used to identify objects that implement the Hash interface.
	*
	* **When to use**
	*
	* Use as the computed property key for the method that supplies a custom hash
	* value on a `Hash` implementor.
	*
	* @see {@link Hash} for the interface implemented with this symbol
	* @see {@link isHash} for checking whether a value implements `Hash`
	* @see {@link hash} for computing hash values
	*
	* @category symbols
	* @since 2.0.0
	*/
	var symbol$1 = "~effect/interfaces/Hash";
	/**
	* Computes a hash value for any given value.
	*
	* **When to use**
	*
	* Use to compute an Effect hash for primitives, collections, and hashable
	* objects.
	*
	* **Details**
	*
	* This function can hash primitives (numbers, strings, booleans, etc.) as well as
	* objects, arrays, and other complex data structures. It automatically handles
	* different types and provides a consistent hash value for equivalent inputs.
	*
	* **Gotchas**
	*
	* Objects being hashed must be treated as immutable after their first hash
	* computation. Hash results are cached, so mutating an object after hashing will
	* lead to stale cached values and broken hash-based operations. For mutable
	* objects, implement a custom `Hash` interface that hashes the object reference
	* rather than its content.
	*
	* **Example** (Hashing different values)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* // Hash primitive values
	* console.log(Hash.hash(42)) // numeric hash
	* console.log(Hash.hash("hello")) // string hash
	* console.log(Hash.hash(true)) // boolean hash
	*
	* // Hash objects and arrays
	* console.log(Hash.hash({ name: "John", age: 30 }))
	* console.log(Hash.hash([1, 2, 3]))
	* console.log(Hash.hash({ id: "user-1", roles: ["admin", "editor"] }))
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var hash = (self) => {
		switch (typeof self) {
			case "number": return number$1(self);
			case "bigint": return string$1(self.toString(10));
			case "boolean": return string$1(String(self));
			case "symbol": return string$1(String(self));
			case "string": return string$1(self);
			case "undefined": return string$1("undefined");
			case "function":
			case "object": if (self === null) return string$1("null");
			else if (self instanceof Date) return string$1(self.toISOString());
			else if (self instanceof RegExp) return string$1(self.toString());
			else {
				if (byReferenceInstances.has(self)) return random(self);
				if (hashCache.has(self)) return hashCache.get(self);
				const h = withVisitedTracking$1(self, () => {
					if (isHash(self)) return self[symbol$1]();
					else if (typeof self === "function") return random(self);
					else if (Array.isArray(self) || ArrayBuffer.isView(self)) return array(self);
					else if (self instanceof Map) return hashMap(self);
					else if (self instanceof Set) return hashSet(self);
					return structure(self);
				});
				hashCache.set(self, h);
				return h;
			}
			default: throw new Error(`BUG: unhandled typeof ${typeof self} - please report an issue at https://github.com/Effect-TS/effect/issues`);
		}
	};
	/**
	* Generates a random hash value for an object and caches it.
	*
	* **When to use**
	*
	* Use to hash an object by reference identity instead of structural content.
	*
	* **Details**
	*
	* This function creates a random hash value for objects that don't have their own
	* hash implementation. The hash value is cached using a WeakMap, so the same object
	* will always return the same hash value during its lifetime.
	*
	* **Example** (Hashing objects by reference)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* const obj1 = { a: 1 }
	* const obj2 = { a: 1 }
	*
	* // Same object always returns the same hash
	* console.log(Hash.random(obj1) === Hash.random(obj1)) // true
	*
	* // Different objects get different hashes
	* console.log(Hash.random(obj1) === Hash.random(obj2)) // false
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var random = (self) => {
		if (!randomHashCache.has(self)) randomHashCache.set(self, number$1(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
		return randomHashCache.get(self);
	};
	/**
	* Combines two hash values into a single hash value.
	*
	* **When to use**
	*
	* Use to build a hash for a composite value by folding together hash values for
	* its parts.
	*
	* **Details**
	*
	* Supports both direct and pipeable usage. The implementation combines two
	* hash values with `(self * 53) ^ b`.
	*
	* **Example** (Combining hash values)
	*
	* ```ts
	* import { Hash, pipe } from "effect"
	*
	* // Can also be used with pipe
	*
	* const hash1 = Hash.hash("hello")
	* const hash2 = Hash.hash("world")
	*
	* // Combine two hash values
	* const combined = Hash.combine(hash2)(hash1)
	* console.log(combined)
	* const result = pipe(hash1, Hash.combine(hash2))
	* ```
	*
	* @see {@link hash} for computing hash values from arbitrary inputs
	* @see {@link structureKeys} for hashing selected object fields without manual combination
	*
	* @category hashing
	* @since 2.0.0
	*/
	var combine = /*#__PURE__*/ dual(2, (self, b) => self * 53 ^ b);
	/**
	* Applies bit manipulation techniques to optimize a hash value.
	*
	* **When to use**
	*
	* Use to improve the bit distribution of a raw numeric hash value.
	*
	* **Details**
	*
	* This function takes a hash value and applies bitwise operations to improve
	* the distribution of hash values, reducing the likelihood of collisions.
	*
	* **Example** (Optimizing a hash value)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* const rawHash = 1234567890
	* const optimizedHash = Hash.optimize(rawHash)
	* console.log(optimizedHash) // optimized hash value
	*
	* // Often used internally by other hash functions
	* const stringHash = Hash.optimize(Hash.string("hello"))
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var optimize = (n) => n & 3221225471 | n >>> 1 & 1073741824;
	/**
	* Checks whether a value implements the Hash interface.
	*
	* **When to use**
	*
	* Use to detect whether an unknown value provides a custom hash implementation.
	*
	* **Details**
	*
	* This function determines whether a given value has the Hash symbol property,
	* indicating that it can provide its own hash value implementation.
	*
	* **Example** (Checking for Hash support)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* class MyHashable implements Hash.Hash {
	*   [Hash.symbol]() {
	*     return 42
	*   }
	* }
	*
	* const obj = new MyHashable()
	* console.log(Hash.isHash(obj)) // true
	* console.log(Hash.isHash({})) // false
	* console.log(Hash.isHash("string")) // false
	* ```
	*
	* @category guards
	* @since 2.0.0
	*/
	var isHash = (u) => hasProperty(u, symbol$1);
	/**
	* Computes a hash value for a number.
	*
	* **When to use**
	*
	* Use to hash a JavaScript number with Effect's numeric hash semantics.
	*
	* **Details**
	*
	* This function creates a hash value for numeric inputs, handling special cases
	* like NaN, Infinity, and -Infinity with distinct hash values. It uses bitwise operations to ensure good distribution
	* of hash values across different numeric inputs.
	*
	* **Example** (Hashing numbers)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* console.log(Hash.number(42)) // hash of 42
	* console.log(Hash.number(3.14)) // hash of 3.14
	* console.log(Hash.number(NaN)) // hash of "NaN"
	* console.log(Hash.number(Infinity)) // 0 (special case)
	*
	* // Same numbers produce the same hash
	* console.log(Hash.number(100) === Hash.number(100)) // true
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var number$1 = (n) => {
		if (n !== n) return string$1("NaN");
		if (n === Infinity) return string$1("Infinity");
		if (n === -Infinity) return string$1("-Infinity");
		let h = n | 0;
		if (h !== n) h ^= n * 4294967295;
		while (n > 4294967295) h ^= n /= 4294967295;
		return optimize(h);
	};
	/**
	* Computes a hash value for a string using the djb2 algorithm.
	*
	* **When to use**
	*
	* Use when you need a string field to contribute to a custom structural hash
	* implementation.
	*
	* **Details**
	*
	* This function implements a variation of the djb2 hash algorithm, which is
	* known for its good distribution properties and speed. It processes each
	* character of the string to produce a consistent hash value.
	*
	* **Example** (Hashing strings)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* console.log(Hash.string("hello")) // hash of "hello"
	* console.log(Hash.string("world")) // hash of "world"
	* console.log(Hash.string("")) // hash of empty string
	*
	* // Same strings produce the same hash
	* console.log(Hash.string("test") === Hash.string("test")) // true
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var string$1 = (str) => {
		let h = 5381, i = str.length;
		while (i) h = h * 33 ^ str.charCodeAt(--i);
		return optimize(h);
	};
	/**
	* Computes a hash value for an object using only the specified keys.
	*
	* **When to use**
	*
	* Use to hash an object by a selected set of property keys.
	*
	* **Details**
	*
	* This function allows you to hash an object by considering only specific keys,
	* which is useful when you want to create a hash based on a subset of an object's
	* properties.
	*
	* **Example** (Hashing selected object keys)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* const person = { name: "John", age: 30, city: "New York" }
	*
	* // Hash only specific keys
	* const hash1 = Hash.structureKeys(person, ["name", "age"])
	* const hash2 = Hash.structureKeys(person, ["name", "city"])
	*
	* console.log(hash1) // hash based on name and age
	* console.log(hash2) // hash based on name and city
	*
	* // Same keys produce the same hash
	* const person2 = { name: "John", age: 30, city: "Boston" }
	* const hash3 = Hash.structureKeys(person2, ["name", "age"])
	* console.log(hash1 === hash3) // true
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var structureKeys = (o, keys) => {
		let h = 12289;
		for (const key of keys) h ^= combine(hash(key), hash(o[key]));
		return optimize(h);
	};
	/**
	* Computes a structural hash for an object using Effect's object key collection.
	*
	* **When to use**
	*
	* Use to hash an object from all structural keys collected by Effect.
	*
	* **Details**
	*
	* The hash is based on the object's structural keys and their values, including
	* symbol keys and relevant prototype keys for non-plain objects.
	*
	* **Example** (Hashing object structures)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* const obj1 = { name: "John", age: 30 }
	* const obj2 = { name: "Jane", age: 25 }
	* const obj3 = { name: "John", age: 30 }
	*
	* console.log(Hash.structure(obj1)) // hash of obj1
	* console.log(Hash.structure(obj2)) // different hash
	* console.log(Hash.structure(obj3)) // same as obj1
	*
	* // Objects with same properties produce same hash
	* console.log(Hash.structure(obj1) === Hash.structure(obj3)) // true
	* ```
	*
	* @category hashing
	* @since 2.0.0
	*/
	var structure = (o) => structureKeys(o, getAllObjectKeys(o));
	var iterableWith = (seed, f) => (iter) => {
		let h = seed;
		for (const element of iter) h ^= f(element);
		return optimize(h);
	};
	/**
	* Computes a hash value for an iterable by hashing all of its elements.
	*
	* **When to use**
	*
	* Use to hash the values yielded by an iterable with Effect hash semantics.
	*
	* **Details**
	*
	* The implementation folds element hashes from the seed `6151` with XOR and
	* then optimizes the final hash.
	*
	* **Gotchas**
	*
	* A hash is not an equality proof. Because this implementation uses XOR,
	* reordered inputs can produce the same hash.
	*
	* **Example** (Hashing arrays)
	*
	* ```ts
	* import { Hash } from "effect"
	*
	* const arr1 = [1, 2, 3]
	* const arr2 = [1, 2, 3]
	* const arr3 = [3, 2, 1]
	*
	* console.log(Hash.array(arr1)) // hash of [1, 2, 3]
	* console.log(Hash.array(arr2)) // same hash as arr1
	* console.log(Hash.array(arr3)) // may match reordered inputs
	*
	* console.log(Hash.array(arr1) === Hash.array(arr2)) // true
	* console.log(Hash.array(arr1) === Hash.array(arr3)) // true
	* ```
	*
	* @see {@link hash} for the general-purpose hash dispatcher
	*
	* @category hashing
	* @since 2.0.0
	*/
	var array = /*#__PURE__*/ iterableWith(6151, hash);
	var hashMap = /*#__PURE__*/ iterableWith(/*#__PURE__*/ string$1("Map"), ([k, v]) => combine(hash(k), hash(v)));
	var hashSet = /*#__PURE__*/ iterableWith(/*#__PURE__*/ string$1("Set"), hash);
	var randomHashCache = /*#__PURE__*/ new WeakMap();
	var hashCache = /*#__PURE__*/ new WeakMap();
	var visitedObjects = /*#__PURE__*/ new WeakSet();
	function withVisitedTracking$1(obj, fn) {
		if (visitedObjects.has(obj)) return string$1("[Circular]");
		visitedObjects.add(obj);
		const result = fn();
		visitedObjects.delete(obj);
		return result;
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Equal.js
	/**
	* Defines the unique string identifier for the `Equal` interface.
	*
	* **When to use**
	*
	* Use when you implement custom equality and need the computed property key for
	* the equality method.
	*
	* **Details**
	*
	* This is a pure constant with no allocation or side effects.
	*
	* **Example** (Implementing Equal on a class)
	*
	* ```ts
	* import { Equal, Hash } from "effect"
	*
	* class UserId implements Equal.Equal {
	*   constructor(readonly id: string) {}
	*
	*   [Equal.symbol](that: Equal.Equal): boolean {
	*     return that instanceof UserId && this.id === that.id
	*   }
	*
	*   [Hash.symbol](): number {
	*     return Hash.string(this.id)
	*   }
	* }
	* ```
	*
	* @see {@link Equal} — the interface that uses this symbol
	* @see {@link isEqual} — type guard for `Equal` implementors
	* @category symbols
	* @since 2.0.0
	*/
	var symbol = "~effect/interfaces/Equal";
	function equals$2() {
		if (arguments.length === 1) return (self) => compareBoth(self, arguments[0]);
		return compareBoth(arguments[0], arguments[1]);
	}
	function compareBoth(self, that) {
		if (self === that) return true;
		if (self == null || that == null) return false;
		const selfType = typeof self;
		if (selfType !== typeof that) return false;
		if (selfType === "number" && self !== self && that !== that) return true;
		if (selfType !== "object" && selfType !== "function") return false;
		if (byReferenceInstances.has(self) || byReferenceInstances.has(that)) return false;
		return withCache(self, that, compareObjects);
	}
	/** Helper to run comparison with proper visited tracking */
	function withVisitedTracking(self, that, fn) {
		const hasLeft = visitedLeft.has(self);
		const hasRight = visitedRight.has(that);
		if (hasLeft && hasRight) return true;
		if (hasLeft || hasRight) return false;
		visitedLeft.add(self);
		visitedRight.add(that);
		const result = fn();
		visitedLeft.delete(self);
		visitedRight.delete(that);
		return result;
	}
	var visitedLeft = /*#__PURE__*/ new WeakSet();
	var visitedRight = /*#__PURE__*/ new WeakSet();
	/** Helper to perform cached object comparison */
	function compareObjects(self, that) {
		if (hash(self) !== hash(that)) return false;
		else if (self instanceof Date) {
			if (!(that instanceof Date)) return false;
			return self.toISOString() === that.toISOString();
		} else if (self instanceof RegExp) {
			if (!(that instanceof RegExp)) return false;
			return self.toString() === that.toString();
		}
		const selfIsEqual = isEqual(self);
		const thatIsEqual = isEqual(that);
		if (selfIsEqual !== thatIsEqual) return false;
		const bothEquals = selfIsEqual && thatIsEqual;
		if (typeof self === "function" && !bothEquals) return false;
		return withVisitedTracking(self, that, () => {
			if (bothEquals) return self[symbol](that);
			else if (Array.isArray(self)) {
				if (!Array.isArray(that) || self.length !== that.length) return false;
				return compareArrays(self, that);
			} else if (ArrayBuffer.isView(self)) {
				if (!ArrayBuffer.isView(that) || self.byteLength !== that.byteLength) return false;
				return compareTypedArrays(self, that);
			} else if (self instanceof Map) {
				if (!(that instanceof Map) || self.size !== that.size) return false;
				return compareMaps(self, that);
			} else if (self instanceof Set) {
				if (!(that instanceof Set) || self.size !== that.size) return false;
				return compareSets(self, that);
			}
			return compareRecords(self, that);
		});
	}
	function withCache(self, that, f) {
		let selfMap = equalityCache.get(self);
		if (!selfMap) {
			selfMap = /* @__PURE__ */ new WeakMap();
			equalityCache.set(self, selfMap);
		} else if (selfMap.has(that)) return selfMap.get(that);
		const result = f(self, that);
		selfMap.set(that, result);
		let thatMap = equalityCache.get(that);
		if (!thatMap) {
			thatMap = /* @__PURE__ */ new WeakMap();
			equalityCache.set(that, thatMap);
		}
		thatMap.set(self, result);
		return result;
	}
	var equalityCache = /*#__PURE__*/ new WeakMap();
	function compareArrays(self, that) {
		for (let i = 0; i < self.length; i++) if (!compareBoth(self[i], that[i])) return false;
		return true;
	}
	function compareTypedArrays(self, that) {
		if (self.length !== that.length) return false;
		for (let i = 0; i < self.length; i++) if (self[i] !== that[i]) return false;
		return true;
	}
	function compareRecords(self, that) {
		const selfKeys = getAllObjectKeys(self);
		const thatKeys = getAllObjectKeys(that);
		if (selfKeys.size !== thatKeys.size) return false;
		for (const key of selfKeys) if (!thatKeys.has(key) || !compareBoth(self[key], that[key])) return false;
		return true;
	}
	/** @internal */
	function makeCompareMap(keyEquivalence, valueEquivalence) {
		return function compareMaps(self, that) {
			for (const [selfKey, selfValue] of self) {
				let found = false;
				for (const [thatKey, thatValue] of that) if (keyEquivalence(selfKey, thatKey) && valueEquivalence(selfValue, thatValue)) {
					found = true;
					break;
				}
				if (!found) return false;
			}
			return true;
		};
	}
	var compareMaps = /*#__PURE__*/ makeCompareMap(compareBoth, compareBoth);
	/** @internal */
	function makeCompareSet(equivalence) {
		return function compareSets(self, that) {
			for (const selfValue of self) {
				let found = false;
				for (const thatValue of that) if (equivalence(selfValue, thatValue)) {
					found = true;
					break;
				}
				if (!found) return false;
			}
			return true;
		};
	}
	var compareSets = /*#__PURE__*/ makeCompareSet(compareBoth);
	/**
	* Checks whether a value implements the {@link Equal} interface.
	*
	* **When to use**
	*
	* Use when you need generic utility code to distinguish `Equal` implementors
	* from plain values before calling `[Equal.symbol]` directly.
	*
	* **Details**
	*
	* - Pure function, no side effects.
	* - Returns `true` if and only if `u` has a property keyed by
	*   {@link symbol}.
	* - Acts as a TypeScript type guard, narrowing the input to {@link Equal}.
	*
	* **Example** (Checking Equal values)
	*
	* ```ts
	* import { Equal, Hash } from "effect"
	*
	* class Token implements Equal.Equal {
	*   constructor(readonly value: string) {}
	*   [Equal.symbol](that: Equal.Equal): boolean {
	*     return that instanceof Token && this.value === that.value
	*   }
	*   [Hash.symbol](): number {
	*     return Hash.string(this.value)
	*   }
	* }
	*
	* console.log(Equal.isEqual(new Token("abc"))) // true
	* console.log(Equal.isEqual({ x: 1 }))         // false
	* console.log(Equal.isEqual(42))                // false
	* ```
	*
	* @see {@link Equal} — the interface being checked
	* @see {@link symbol} — the property key that signals `Equal` support
	* @category guards
	* @since 2.0.0
	*/
	var isEqual = (u) => hasProperty(u, symbol);
	/**
	* Wraps {@link equals} as an `Equivalence<A>`.
	*
	* **When to use**
	*
	* Use when you want to pass `Equal.equals` to APIs that require an
	* `Equivalence`.
	*
	* **Details**
	*
	* - Returns a function `(a: A, b: A) => boolean` that delegates to
	*   {@link equals}.
	* - Pure; allocates a thin wrapper on each call.
	*
	* **Example** (Deduplicating with Equal semantics)
	*
	* ```ts
	* import { Array, Equal } from "effect"
	*
	* const eq = Equal.asEquivalence<number>()
	* const result = Array.dedupeWith([1, 2, 2, 3, 1], eq)
	* console.log(result) // [1, 2, 3]
	* ```
	*
	* @see {@link equals} — the underlying comparison function
	* @category instances
	* @since 4.0.0
	*/
	var asEquivalence = () => equals$2;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Equivalence.js
	/**
	* Creates a custom equivalence relation with an optimized reference equality check.
	*
	* **When to use**
	*
	* Use when you need an equality rule that the built-in instances and input
	* mapping helpers cannot express, and you can provide a law-abiding comparison.
	*
	* **Details**
	*
	* The returned equivalence first checks reference equality (`===`) for
	* performance. If the values are not the same reference, it falls back to the
	* provided equivalence function, which must satisfy reflexive, symmetric, and
	* transitive properties.
	*
	* **Example** (Case-insensitive string equivalence)
	*
	* ```ts
	* import { Equivalence } from "effect"
	*
	* const caseInsensitive = Equivalence.make<string>((a, b) =>
	*   a.toLowerCase() === b.toLowerCase()
	* )
	*
	* console.log(caseInsensitive("Hello", "HELLO")) // true
	* console.log(caseInsensitive("foo", "bar")) // false
	*
	* // Same reference optimization
	* const str = "test"
	* console.log(caseInsensitive(str, str)) // true (fast path)
	* ```
	*
	* **Example** (Comparing numbers with tolerance)
	*
	* ```ts
	* import { Equivalence } from "effect"
	*
	* const tolerance = Equivalence.make<number>((a, b) => Math.abs(a - b) < 0.0001)
	*
	* console.log(tolerance(1.0, 1.001)) // false
	* console.log(tolerance(1.0, 1.00001)) // true
	* ```
	*
	* @see {@link strictEqual}
	* @see {@link mapInput}
	* @category constructors
	* @since 2.0.0
	*/
	var make$13 = (isEquivalent) => (self, that) => self === that || isEquivalent(self, that);
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/array.js
	/**
	* @since 2.0.0
	*/
	/** @internal */
	var isArrayNonEmpty$1 = (self) => self.length > 0;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Redactable.js
	/**
	* Defines the symbol used to identify objects that implement the {@link Redactable}
	* protocol.
	*
	* **When to use**
	*
	* Use as the property key when implementing the `Redactable` protocol.
	*
	* **Details**
	*
	* Add a method under this key to make an object redactable. The method receives
	* the current `Context` and must return the replacement value. The symbol is
	* registered globally via `Symbol.for("~effect/Redactable")`, so it is
	* identical across multiple copies of the library at runtime.
	*
	* **Example** (Masking an API key)
	*
	* ```ts
	* import { Context, Redactable } from "effect"
	*
	* class ApiKey {
	*   constructor(readonly raw: string) {}
	*
	*   [Redactable.symbolRedactable](_ctx: Context.Context<never>) {
	*     return this.raw.slice(0, 4) + "..."
	*   }
	* }
	* ```
	*
	* @see {@link Redactable} for the interface this symbol belongs to
	* @see {@link isRedactable} to check whether a value has this symbol
	* @category symbols
	* @since 3.10.0
	*/
	var symbolRedactable = /*#__PURE__*/ Symbol.for("~effect/Redactable");
	/**
	* Type guard that checks whether a value implements the {@link Redactable}
	* interface.
	*
	* **When to use**
	*
	* Use to narrow an unknown value before calling redaction-specific helpers.
	*
	* @see {@link Redactable} for the interface being checked
	* @see {@link redact} to apply redaction if the value is redactable
	* @category guards
	* @since 3.10.0
	*/
	var isRedactable = (u) => hasProperty(u, symbolRedactable);
	/**
	* Returns a redacted value if it implements {@link Redactable}, otherwise returns it
	* unchanged.
	*
	* **When to use**
	*
	* Use as the general-purpose entry point for redaction when the input may
	* or may not implement the redaction protocol.
	*
	* **Details**
	*
	* This function calls {@link isRedactable} and, when it returns `true`,
	* delegates to {@link getRedacted}.
	*
	* **Gotchas**
	*
	* Redaction is not recursive. Nested redactable values inside the returned
	* object are not automatically redacted.
	*
	* @see {@link isRedactable} to check before redacting
	* @see {@link getRedacted} for the lower-level variant for known redactables
	* @category destructors
	* @since 3.10.0
	*/
	function redact(u) {
		if (isRedactable(u)) return getRedacted(u);
		return u;
	}
	/**
	* Returns the result of calling `[symbolRedactable]` on a value that is
	* already known to be {@link Redactable}.
	*
	* **When to use**
	*
	* Use when you need to read the redacted representation from a value already
	* verified as `Redactable`.
	*
	* **Details**
	*
	* This function reads the current fiber's `Context` from the global fiber
	* reference and passes it to the redaction method.
	*
	* **Gotchas**
	*
	* If no fiber is active, an empty `Context` is passed to the redaction method.
	*
	* @see {@link redact} for the higher-level variant that handles non-redactable values
	* @see {@link isRedactable} for the type guard to verify before calling this
	* @category destructors
	* @since 4.0.0
	*/
	function getRedacted(redactable) {
		return redactable[symbolRedactable](globalThis["~effect/Fiber/currentFiber"]?.context ?? emptyContext$1);
	}
	/** @internal */
	var currentFiberTypeId = "~effect/Fiber/currentFiber";
	var emptyContext$1 = {
		"~effect/Context": {},
		mapUnsafe: /*#__PURE__*/ new Map(),
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Formatter.js
	/**
	* Formats JavaScript values into readable strings.
	*
	* `format` is intended for logs, diagnostics, and error messages. It handles
	* primitives, objects, arrays, dates, regular expressions, maps, sets, class
	* instances, errors, circular references, and redactable values. `formatJson`
	* wraps JSON formatting with redaction and circular-reference handling, and the
	* module also includes helpers for property keys, paths, and dates.
	*
	* @since 4.0.0
	*/
	/**
	* Converts any JavaScript value into a human-readable string.
	*
	* **When to use**
	*
	* Use when you need to format arbitrary JavaScript values for debugging,
	* logging, or error messages.
	*
	* **Details**
	*
	* - Output is **not** valid JSON; use {@link formatJson} when you need
	*   parseable JSON.
	* - Handles `BigInt`, `Symbol`, `Set`, `Map`, `Date`, `RegExp`, and class
	*   instances that `JSON.stringify` cannot represent.
	* - Circular references are shown as `"[Circular]"` instead of throwing.
	* - Primitives: stringified naturally (`null`, `undefined`, `123`, `true`).
	*   Strings are JSON-quoted.
	* - Objects with a custom `toString` (not `Object.prototype.toString`):
	*   `toString()` is called unless `ignoreToString` is `true`.
	* - Errors with a `cause`: formatted as `"<message> (cause: <cause>)"`.
	* - Iterables (`Set`, `Map`, etc.): formatted as
	*   `ClassName([...elements])`.
	* - Class instances: wrapped as `ClassName({...})`.
	* - `Redactable` values are automatically redacted.
	* - Arrays/objects with 0–1 entries are inline; larger ones are
	*   pretty-printed when `space` is set.
	* - `space` — indentation unit (number of spaces, or a string like
	*   `"\t"`). Defaults to `0` (compact).
	* - `ignoreToString` — skip calling `toString()`. Defaults to `false`.
	*
	* **Example** (Formatting compact output)
	*
	* ```ts
	* import { Formatter } from "effect"
	*
	* console.log(Formatter.format({ a: 1, b: [2, 3] }))
	* // {"a":1,"b":[2,3]}
	* ```
	*
	* **Example** (Pretty-printed output)
	*
	* ```ts
	* import { Formatter } from "effect"
	*
	* console.log(Formatter.format({ a: 1, b: [2, 3] }, { space: 2 }))
	* // {
	* //   "a": 1,
	* //   "b": [
	* //     2,
	* //     3
	* //   ]
	* // }
	* ```
	*
	* **Example** (Handling circular references)
	*
	* ```ts
	* import { Formatter } from "effect"
	*
	* const obj: any = { name: "loop" }
	* obj.self = obj
	* console.log(Formatter.format(obj))
	* // {"name":"loop","self":[Circular]}
	* ```
	*
	* @see {@link formatJson}
	* @see {@link Formatter}
	* @category formatting
	* @since 2.0.0
	*/
	function format$1(input, options) {
		const space = options?.space ?? 0;
		const seen = /* @__PURE__ */ new WeakSet();
		const gap = !space ? "" : typeof space === "number" ? " ".repeat(space) : space;
		const ind = (d) => gap.repeat(d);
		const wrap = (v, body) => {
			const ctor = v?.constructor;
			return ctor && ctor !== Object.prototype.constructor && ctor.name ? `${ctor.name}(${body})` : body;
		};
		const ownKeys = (o) => {
			try {
				return Reflect.ownKeys(o);
			} catch {
				return ["[ownKeys threw]"];
			}
		};
		function recur(v, d = 0) {
			if (Array.isArray(v)) {
				if (seen.has(v)) return CIRCULAR;
				seen.add(v);
				if (!gap || v.length <= 1) return `[${v.map((x) => recur(x, d)).join(",")}]`;
				const inner = v.map((x) => recur(x, d + 1)).join(",\n" + ind(d + 1));
				return `[\n${ind(d + 1)}${inner}\n${ind(d)}]`;
			}
			if (v instanceof Date) return formatDate(v);
			if (!options?.ignoreToString && hasProperty(v, "toString") && typeof v["toString"] === "function" && v["toString"] !== Object.prototype.toString && v["toString"] !== Array.prototype.toString) {
				const s = safeToString(v);
				if (v instanceof Error && v.cause) return `${s} (cause: ${recur(v.cause, d)})`;
				return s;
			}
			if (typeof v === "string") return JSON.stringify(v);
			if (typeof v === "number" || v == null || typeof v === "boolean" || typeof v === "symbol") return String(v);
			if (typeof v === "bigint") return String(v) + "n";
			if (typeof v === "object" || typeof v === "function") {
				if (seen.has(v)) return CIRCULAR;
				seen.add(v);
				if (symbolRedactable in v) return format$1(getRedacted(v));
				if (Symbol.iterator in v) return `${v.constructor.name}(${recur(Array.from(v), d)})`;
				const keys = ownKeys(v);
				if (!gap || keys.length <= 1) {
					const body = `{${keys.map((k) => `${formatPropertyKey(k)}:${recur(v[k], d)}`).join(",")}}`;
					return wrap(v, body);
				}
				const body = `{\n${keys.map((k) => `${ind(d + 1)}${formatPropertyKey(k)}: ${recur(v[k], d + 1)}`).join(",\n")}\n${ind(d)}}`;
				return wrap(v, body);
			}
			return String(v);
		}
		return recur(input, 0);
	}
	var CIRCULAR = "[Circular]";
	/**
	* @internal
	*/
	function formatPropertyKey(name) {
		return typeof name === "string" ? JSON.stringify(name) : String(name);
	}
	/**
	* Formats an array of property keys as a bracket-notation path string.
	*
	* @internal
	*/
	function formatPath(path) {
		return path.map((key) => `[${formatPropertyKey(key)}]`).join("");
	}
	/**
	* Formats a `Date` as an ISO 8601 string, returning `"Invalid Date"` for
	* invalid dates instead of throwing.
	*
	* @internal
	*/
	function formatDate(date) {
		try {
			return date.toISOString();
		} catch {
			return "Invalid Date";
		}
	}
	function safeToString(input) {
		try {
			const s = input.toString();
			return typeof s === "string" ? s : String(s);
		} catch {
			return "[toString threw]";
		}
	}
	/**
	* Stringifies a value to JSON safely, silently dropping circular references.
	*
	* **When to use**
	*
	* Use when you need valid JSON output, unlike `format`, and the input may
	* contain circular references that should be silently omitted rather than
	* throwing a `TypeError`.
	*
	* **Details**
	*
	* Uses `JSON.stringify` internally with a replacer that tracks the current
	* object ancestry. Circular references are replaced with `undefined`, which
	* omits them from object output. `Redactable` values are automatically redacted
	* before serialization. Values not supported by JSON, such as `BigInt`,
	* `Symbol`, `undefined`, and functions, follow standard `JSON.stringify`
	* behavior. The `space` parameter controls indentation and defaults to `0`.
	*
	* **Example** (Formatting compact JSON)
	*
	* ```ts
	* import { Formatter } from "effect"
	*
	* console.log(Formatter.formatJson({ name: "Alice", age: 30 }))
	* // {"name":"Alice","age":30}
	* ```
	*
	* **Example** (Handling circular references)
	*
	* ```ts
	* import { Formatter } from "effect"
	*
	* const obj: any = { name: "test" }
	* obj.self = obj
	* console.log(Formatter.formatJson(obj))
	* // {"name":"test"}
	* ```
	*
	* **Example** (Pretty-printed JSON)
	*
	* ```ts
	* import { Formatter } from "effect"
	*
	* console.log(Formatter.formatJson({ name: "Alice", age: 30 }, { space: 2 }))
	* // {
	* //   "name": "Alice",
	* //   "age": 30
	* // }
	* ```
	*
	* @see {@link format}
	* @see {@link Formatter}
	* @category serialization
	* @since 4.0.0
	*/
	function formatJson(input, options) {
		const ancestors = [];
		return JSON.stringify(input, function(_key, value) {
			const redacted = redact(value);
			if (typeof redacted !== "object" || redacted === null) return redacted;
			while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
			if (ancestors.includes(redacted)) return;
			ancestors.push(redacted);
			return redacted;
		}, options?.space);
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Inspectable.js
	/**
	* Controls how values appear in logs and debugging output.
	*
	* Effect data types use `Inspectable` to provide stable string, JSON, and
	* Node.js inspection output. This keeps custom values readable in logs, REPLs,
	* test failures, and diagnostics. This module defines the Node inspect symbol,
	* the `Inspectable` interface, safe conversion helpers, and shared prototype or
	* class implementations for custom values.
	*
	* @since 2.0.0
	*/
	/**
	* Defines the symbol used by Node.js for custom object inspection.
	*
	* **When to use**
	*
	* Use to implement Node.js custom inspection for a value.
	*
	* **Details**
	*
	* This symbol is recognized by Node.js's `util.inspect()` function and the REPL
	* for custom object representation. When an object has a method with this symbol,
	* it will be called to determine how the object should be displayed.
	*
	* **Example** (Defining custom Node inspection)
	*
	* ```ts
	* import { Inspectable } from "effect"
	*
	* class CustomObject {
	*   constructor(private value: string) {}
	*
	*   [Inspectable.NodeInspectSymbol]() {
	*     return `CustomObject(${this.value})`
	*   }
	* }
	*
	* const obj = new CustomObject("hello")
	* console.log(obj) // Displays: CustomObject(hello)
	* ```
	*
	* @category symbols
	* @since 2.0.0
	*/
	var NodeInspectSymbol = /*#__PURE__*/ Symbol.for("nodejs.util.inspect.custom");
	/**
	* Converts a value to a JSON-serializable representation safely.
	*
	* **When to use**
	*
	* Use when you need a safe, JSON-serializable representation of a value
	* without risking unhandled errors.
	*
	* **Details**
	*
	* This function attempts to extract JSON data from objects that implement the
	* `toJSON` method, recursively processes arrays, and handles errors gracefully.
	* For objects that don't have a `toJSON` method, it applies redaction to
	* protect sensitive information.
	*
	* @see {@link toStringUnknown} for converting unknown values to strings
	*
	* @category converting
	* @since 4.0.0
	*/
	var toJson = (input) => {
		try {
			if (hasProperty(input, "toJSON") && isFunction(input["toJSON"]) && input["toJSON"].length === 0) return input.toJSON();
			else if (Array.isArray(input)) return input.map(toJson);
		} catch {
			return "[toJSON threw]";
		}
		return redact(input);
	};
	/**
	* Converts an unknown value to a string for diagnostics.
	*
	* **When to use**
	*
	* Use to produce a diagnostic string from a value whose runtime type is unknown.
	*
	* **Details**
	*
	* Strings are returned unchanged. Objects are formatted as JSON using the
	* provided whitespace setting when possible, and values that cannot be
	* formatted are converted with `String`.
	*
	* @category converting
	* @since 2.0.0
	*/
	var toStringUnknown = (u, whitespace = 2) => {
		if (typeof u === "string") return u;
		try {
			return typeof u === "object" ? formatJson(u, { space: whitespace }) : String(u);
		} catch {
			return String(u);
		}
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Utils.js
	/**
	* Yields its wrapped value exactly once through an `IterableIterator`.
	*
	* **When to use**
	*
	* Use to implement `[Symbol.iterator]()` on Effect-like types so they can be
	* `yield*`-ed inside generator functions, such as `Effect.gen` and
	* `Option.gen`.
	*
	* **Details**
	*
	* The first call to `next()` returns `{ value: self, done: false }`. Every
	* subsequent call returns `{ value: a, done: true }` where `a` is the argument
	* passed to `next()`. `[Symbol.iterator]()` returns a **new** `SingleShotGen`
	* wrapping the same value, so the outer type can be iterated multiple times.
	*
	* **Example** (Yielding a wrapped value in a generator)
	*
	* ```ts
	* import { Utils } from "effect"
	*
	* const gen = new Utils.SingleShotGen<string, number>("hello")
	*
	* // First call yields the wrapped value
	* console.log(gen.next(0))
	* // { value: "hello", done: false }
	*
	* // Second call signals completion with the provided value
	* console.log(gen.next(42))
	* // { value: 42, done: true }
	* ```
	*
	* @see {@link Gen} for the type-level signature that relies on `SingleShotGen`
	* @category constructors
	* @since 2.0.0
	*/
	var SingleShotGen = class SingleShotGen {
		called = false;
		self;
		constructor(self) {
			this.self = self;
		}
		/**
		* Yields the stored value once, then completes with the value sent back in.
		*
		* **When to use**
		*
		* Use to advance a `SingleShotGen` through its single yield and completion
		* step.
		*
		* @since 2.0.0
		*/
		next(a) {
			return this.called ? {
				value: a,
				done: true
			} : (this.called = true, {
				value: this.self,
				done: false
			});
		}
		/**
		* Creates a fresh single-shot iterator over the stored value.
		*
		* **When to use**
		*
		* Use to iterate the wrapped value again without reusing the consumed
		* iterator state.
		*
		* @since 2.0.0
		*/
		[Symbol.iterator]() {
			return new SingleShotGen(this.self);
		}
	};
	var pickInternalCall = () => {
		const InternalTypeId = "~effect/Utils/internal";
		const standard = { [InternalTypeId]: (body) => {
			return body();
		} };
		const forced = { [InternalTypeId]: (body) => {
			try {
				return body();
			} finally {}
		} };
		return standard[InternalTypeId](() => (/* @__PURE__ */ new Error()).stack)?.includes(InternalTypeId) === true ? standard[InternalTypeId] : forced[InternalTypeId];
	};
	/** @internal */
	var internalCall = /*#__PURE__*/ pickInternalCall();
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/core.js
	/** @internal */
	var EffectTypeId = `~effect/Effect`;
	/** @internal */
	var ExitTypeId = `~effect/Exit`;
	var effectVariance = {
		_A: identity,
		_E: identity,
		_R: identity
	};
	/** @internal */
	var identifier = `${EffectTypeId}/identifier`;
	/** @internal */
	var args = `${EffectTypeId}/args`;
	/** @internal */
	var evaluate = `${EffectTypeId}/evaluate`;
	/** @internal */
	var contA = `${EffectTypeId}/successCont`;
	/** @internal */
	var contE = `${EffectTypeId}/failureCont`;
	/** @internal */
	var contAll = `${EffectTypeId}/ensureCont`;
	/** @internal */
	var Yield = /*#__PURE__*/ Symbol.for("effect/Effect/Yield");
	/** @internal */
	var PipeInspectableProto = {
		pipe() {
			return pipeArguments(this, arguments);
		},
		toJSON() {
			return { ...this };
		},
		toString() {
			return format$1(this.toJSON(), {
				ignoreToString: true,
				space: 2
			});
		},
		[NodeInspectSymbol]() {
			return this.toJSON();
		}
	};
	/** @internal */
	var EffectProto = {
		[EffectTypeId]: effectVariance,
		...PipeInspectableProto,
		[Symbol.iterator]() {
			return new SingleShotGen(this);
		},
		toJSON() {
			return {
				_id: "Effect",
				op: this[identifier],
				...args in this ? { args: this[args] } : void 0
			};
		}
	};
	/** @internal */
	var isEffect = (u) => hasProperty(u, EffectTypeId);
	/** @internal */
	var isExit = (u) => hasProperty(u, ExitTypeId);
	/** @internal */
	var CauseTypeId = "~effect/Cause";
	/** @internal */
	var CauseReasonTypeId = "~effect/Cause/Reason";
	/** @internal */
	var isCause = (self) => hasProperty(self, CauseTypeId);
	/** @internal */
	var CauseImpl = class {
		[CauseTypeId];
		reasons;
		constructor(failures) {
			this[CauseTypeId] = CauseTypeId;
			this.reasons = failures;
		}
		pipe() {
			return pipeArguments(this, arguments);
		}
		toJSON() {
			return {
				_id: "Cause",
				failures: this.reasons.map((f) => f.toJSON())
			};
		}
		toString() {
			return `Cause(${format$1(this.reasons)})`;
		}
		[NodeInspectSymbol]() {
			return this.toJSON();
		}
		[symbol](that) {
			return isCause(that) && this.reasons.length === that.reasons.length && this.reasons.every((e, i) => equals$2(e, that.reasons[i]));
		}
		[symbol$1]() {
			return array(this.reasons);
		}
	};
	var annotationsMap = /*#__PURE__*/ new WeakMap();
	/** @internal */
	var ReasonBase = class {
		[CauseReasonTypeId];
		annotations;
		_tag;
		constructor(_tag, annotations, originalError) {
			this[CauseReasonTypeId] = CauseReasonTypeId;
			this._tag = _tag;
			if (annotations !== constEmptyAnnotations && typeof originalError === "object" && originalError !== null && annotations.size > 0) {
				const prevAnnotations = annotationsMap.get(originalError);
				if (prevAnnotations) annotations = new Map([...prevAnnotations, ...annotations]);
				annotationsMap.set(originalError, annotations);
			}
			this.annotations = annotations;
		}
		annotate(annotations, options) {
			if (annotations.mapUnsafe.size === 0) return this;
			const newAnnotations = new Map(this.annotations);
			annotations.mapUnsafe.forEach((value, key) => {
				if (options?.overwrite !== true && newAnnotations.has(key)) return;
				newAnnotations.set(key, value);
			});
			const self = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
			self.annotations = newAnnotations;
			return self;
		}
		pipe() {
			return pipeArguments(this, arguments);
		}
		toString() {
			return format$1(this);
		}
		[NodeInspectSymbol]() {
			return this.toString();
		}
	};
	/** @internal */
	var constEmptyAnnotations = /*#__PURE__*/ new Map();
	/** @internal */
	var Fail = class extends ReasonBase {
		error;
		constructor(error, annotations = constEmptyAnnotations) {
			super("Fail", annotations, error);
			this.error = error;
		}
		toString() {
			return `Fail(${format$1(this.error)})`;
		}
		toJSON() {
			return {
				_tag: "Fail",
				error: this.error
			};
		}
		[symbol](that) {
			return isFailReason$1(that) && equals$2(this.error, that.error) && equals$2(this.annotations, that.annotations);
		}
		[symbol$1]() {
			return combine(string$1(this._tag))(combine(hash(this.error))(hash(this.annotations)));
		}
	};
	/** @internal */
	var causeFromReasons = (reasons) => new CauseImpl(reasons);
	/** @internal */
	var causeEmpty = /*#__PURE__*/ new CauseImpl([]);
	/** @internal */
	var causeFail = (error) => new CauseImpl([new Fail(error)]);
	/** @internal */
	var Die = class extends ReasonBase {
		defect;
		constructor(defect, annotations = constEmptyAnnotations) {
			super("Die", annotations, defect);
			this.defect = defect;
		}
		toString() {
			return `Die(${format$1(this.defect)})`;
		}
		toJSON() {
			return {
				_tag: "Die",
				defect: this.defect
			};
		}
		[symbol](that) {
			return isDieReason(that) && equals$2(this.defect, that.defect) && equals$2(this.annotations, that.annotations);
		}
		[symbol$1]() {
			return combine(string$1(this._tag))(combine(hash(this.defect))(hash(this.annotations)));
		}
	};
	/** @internal */
	var causeDie = (defect) => new CauseImpl([new Die(defect)]);
	/** @internal */
	var causeAnnotate = /*#__PURE__*/ dual((args) => isCause(args[0]), (self, annotations, options) => {
		if (annotations.mapUnsafe.size === 0) return self;
		return new CauseImpl(self.reasons.map((f) => f.annotate(annotations, options)));
	});
	/** @internal */
	var isFailReason$1 = (self) => self._tag === "Fail";
	/** @internal */
	var isDieReason = (self) => self._tag === "Die";
	/** @internal */
	var isInterruptReason = (self) => self._tag === "Interrupt";
	function defaultEvaluate(_fiber) {
		return exitDie(`Effect.evaluate: Not implemented`);
	}
	/** @internal */
	var makePrimitiveProto = (options) => ({
		...EffectProto,
		[identifier]: options.op,
		[evaluate]: options[evaluate] ?? defaultEvaluate,
		[contA]: options[contA],
		[contE]: options[contE],
		[contAll]: options[contAll]
	});
	/** @internal */
	var makePrimitive = (options) => {
		const Proto = makePrimitiveProto(options);
		return function() {
			const self = Object.create(Proto);
			self[args] = options.single === false ? arguments : arguments[0];
			return self;
		};
	};
	/** @internal */
	var makeExit = (options) => {
		const Proto = {
			...makePrimitiveProto(options),
			[ExitTypeId]: ExitTypeId,
			_tag: options.op,
			get [options.prop]() {
				return this[args];
			},
			toString() {
				return `${options.op}(${format$1(this[args])})`;
			},
			toJSON() {
				return {
					_id: "Exit",
					_tag: options.op,
					[options.prop]: this[args]
				};
			},
			[symbol](that) {
				return isExit(that) && that._tag === this._tag && equals$2(this[args], that[args]);
			},
			[symbol$1]() {
				return combine(string$1(options.op), hash(this[args]));
			}
		};
		return function(value) {
			const self = Object.create(Proto);
			self[args] = value;
			return self;
		};
	};
	/** @internal */
	var exitSucceed = /*#__PURE__*/ makeExit({
		op: "Success",
		prop: "value",
		[evaluate](fiber) {
			const cont = fiber.getCont(contA);
			return cont ? cont[contA](this[args], fiber, this) : fiber.yieldWith(this);
		}
	});
	/** @internal */
	var StackTraceKey = { key: "effect/Cause/StackTrace" };
	/** @internal */
	var InterruptorStackTrace$1 = { key: "effect/Cause/InterruptorStackTrace" };
	/** @internal */
	var exitFailCause = /*#__PURE__*/ makeExit({
		op: "Failure",
		prop: "cause",
		[evaluate](fiber) {
			let cause = this[args];
			let annotated = false;
			if (fiber.currentStackFrame) {
				cause = causeAnnotate(cause, { mapUnsafe: /* @__PURE__ */ new Map([[StackTraceKey.key, fiber.currentStackFrame]]) });
				annotated = true;
			}
			let cont = fiber.getCont(contE);
			while (fiber.interruptible && fiber._interruptedCause && cont) cont = fiber.getCont(contE);
			return cont ? cont[contE](cause, fiber, annotated ? void 0 : this) : fiber.yieldWith(annotated ? this : exitFailCause(cause));
		}
	});
	/** @internal */
	var exitFail = (e) => exitFailCause(causeFail(e));
	/** @internal */
	var exitDie = (defect) => exitFailCause(causeDie(defect));
	/** @internal */
	var withFiber$1 = /*#__PURE__*/ makePrimitive({
		op: "WithFiber",
		[evaluate](fiber) {
			return this[args](fiber);
		}
	});
	/** @internal */
	var YieldableError = /*#__PURE__*/ function() {
		class YieldableError extends globalThis.Error {}
		const proto = /*#__PURE__*/ makePrimitiveProto({
			op: "YieldableError",
			[evaluate]() {
				return exitFail(this);
			}
		});
		delete proto.toString;
		Object.assign(YieldableError.prototype, proto);
		return YieldableError;
	}();
	/** @internal */
	var Error$1 = /*#__PURE__*/ function() {
		const plainArgsSymbol = /*#__PURE__*/ Symbol.for("effect/Data/Error/plainArgs");
		return class Base extends YieldableError {
			constructor(args) {
				super(args?.message, args?.cause ? { cause: args.cause } : void 0);
				if (args) {
					Object.assign(this, args);
					Object.defineProperty(this, plainArgsSymbol, {
						value: args,
						enumerable: false
					});
				}
			}
			toJSON() {
				return {
					...this[plainArgsSymbol],
					...this
				};
			}
		};
	}();
	/** @internal */
	var TaggedError$1 = (tag) => {
		class Base extends Error$1 {
			_tag = tag;
		}
		Base.prototype.name = tag;
		return Base;
	};
	TaggedError$1("NoSuchElementError");
	/** @internal */
	var DoneTypeId = "~effect/Cause/Done";
	/** @internal */
	var isDone$1 = (u) => hasProperty(u, DoneTypeId);
	var DoneVoid = {
		[DoneTypeId]: DoneTypeId,
		_tag: "Done",
		value: void 0
	};
	/** @internal */
	var Done = (value) => {
		if (value === void 0) return DoneVoid;
		return {
			[DoneTypeId]: DoneTypeId,
			_tag: "Done",
			value
		};
	};
	var doneVoid = /*#__PURE__*/ exitFail(DoneVoid);
	/** @internal */
	var done$2 = (value) => {
		if (value === void 0) return doneVoid;
		return exitFail(Done(value));
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/option.js
	/**
	* @since 2.0.0
	*/
	var TypeId$16 = "~effect/data/Option";
	var CommonProto$1 = {
		[TypeId$16]: { _A: (_) => _ },
		...PipeInspectableProto,
		[Symbol.iterator]() {
			return new SingleShotGen(this);
		}
	};
	var SomeProto = /*#__PURE__*/ Object.defineProperty(/*#__PURE__*/ Object.assign(/*#__PURE__*/ Object.create(CommonProto$1), {
		_tag: "Some",
		_op: "Some",
		[symbol](that) {
			return isOption(that) && isSome$1(that) && equals$2(this.value, that.value);
		},
		[symbol$1]() {
			return combine(hash(this._tag))(hash(this.value));
		},
		toString() {
			return `some(${format$1(this.value)})`;
		},
		toJSON() {
			return {
				_id: "Option",
				_tag: this._tag,
				value: toJson(this.value)
			};
		}
	}), "valueOrUndefined", { get() {
		return this.value;
	} });
	var NoneHash = /*#__PURE__*/ hash("None");
	var NoneProto = /*#__PURE__*/ Object.assign(/*#__PURE__*/ Object.create(CommonProto$1), {
		_tag: "None",
		_op: "None",
		valueOrUndefined: void 0,
		[symbol](that) {
			return isOption(that) && isNone$1(that);
		},
		[symbol$1]() {
			return NoneHash;
		},
		toString() {
			return `none()`;
		},
		toJSON() {
			return {
				_id: "Option",
				_tag: this._tag
			};
		}
	});
	/** @internal */
	var isOption = (input) => hasProperty(input, TypeId$16);
	/** @internal */
	var isNone$1 = (fa) => fa._tag === "None";
	/** @internal */
	var isSome$1 = (fa) => fa._tag === "Some";
	/** @internal */
	var none$1 = /*#__PURE__*/ Object.create(NoneProto);
	/** @internal */
	var some$1 = (value) => {
		const a = Object.create(SomeProto);
		a.value = value;
		return a;
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/result.js
	var TypeId$15 = "~effect/data/Result";
	var CommonProto = {
		[TypeId$15]: {
			/* v8 ignore next 2 */
			_A: (_) => _,
			_E: (_) => _
		},
		...PipeInspectableProto,
		[Symbol.iterator]() {
			return new SingleShotGen(this);
		}
	};
	var SuccessProto = /*#__PURE__*/ Object.assign(/*#__PURE__*/ Object.create(CommonProto), {
		_tag: "Success",
		_op: "Success",
		[symbol](that) {
			return isResult(that) && isSuccess$2(that) && equals$2(this.success, that.success);
		},
		[symbol$1]() {
			return combine(hash(this._tag))(hash(this.success));
		},
		toString() {
			return `success(${format$1(this.success)})`;
		},
		toJSON() {
			return {
				_id: "Result",
				_tag: this._tag,
				value: toJson(this.success)
			};
		}
	});
	var FailureProto = /*#__PURE__*/ Object.assign(/*#__PURE__*/ Object.create(CommonProto), {
		_tag: "Failure",
		_op: "Failure",
		[symbol](that) {
			return isResult(that) && isFailure$1(that) && equals$2(this.failure, that.failure);
		},
		[symbol$1]() {
			return combine(hash(this._tag))(hash(this.failure));
		},
		toString() {
			return `failure(${format$1(this.failure)})`;
		},
		toJSON() {
			return {
				_id: "Result",
				_tag: this._tag,
				failure: toJson(this.failure)
			};
		}
	});
	/** @internal */
	var isResult = (input) => hasProperty(input, TypeId$15);
	/** @internal */
	var isFailure$1 = (result) => result._tag === "Failure";
	/** @internal */
	var isSuccess$2 = (result) => result._tag === "Success";
	/** @internal */
	var fail$4 = (failure) => {
		const a = Object.create(FailureProto);
		a.failure = failure;
		return a;
	};
	/** @internal */
	var succeed$3 = (success) => {
		const a = Object.create(SuccessProto);
		a.success = success;
		return a;
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Order.js
	/**
	* Defines comparison functions for ordered values.
	*
	* An `Order<A>` compares two `A` values and returns whether the first is less
	* than, equal to, or greater than the second. Orders are used for sorting,
	* choosing minimum or maximum values, checking ranges, and building ordered data
	* structures. This module includes built-in orders, constructors for custom
	* orders, tools for reversing and combining comparisons, tuple and struct
	* helpers, comparison predicates, clamping, and reducer support.
	*
	* @since 2.0.0
	*/
	/**
	* Creates a new `Order` instance from a comparison function.
	*
	* **When to use**
	*
	* Use when you need a sorting rule not covered by the built-in orders or input
	* mapping helpers, and you can provide a total comparison.
	*
	* **Details**
	*
	* Uses reference equality (`===`) as a shortcut: if `self === that`, it returns
	* `0` without calling the comparison function. The comparison function should
	* return `-1`, `0`, or `1`, and the returned order satisfies total ordering
	* laws when the comparison function does.
	*
	* **Example** (Creating an Order)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const byAge = Order.make<{ name: string; age: number }>((self, that) => {
	*   if (self.age < that.age) return -1
	*   if (self.age > that.age) return 1
	*   return 0
	* })
	*
	* console.log(byAge({ name: "Alice", age: 30 }, { name: "Bob", age: 25 })) // 1
	* console.log(byAge({ name: "Alice", age: 25 }, { name: "Bob", age: 30 })) // -1
	* ```
	*
	* @see {@link mapInput} to transform an order by mapping the input type
	* @see {@link combine} to combine multiple orders
	* @category constructors
	* @since 2.0.0
	*/
	function make$12(compare) {
		return (self, that) => self === that ? 0 : compare(self, that);
	}
	/**
	* Order instance for numbers that compares them numerically.
	*
	* **When to use**
	*
	* Use when you need numeric ordering for numbers.
	*
	* **Details**
	*
	* `0` is considered equal to `-0`. All `NaN` values are considered equal to
	* each other, and any `NaN` is considered less than any non-`NaN` number. All
	* other values use standard numeric comparison.
	*
	* **Example** (Ordering numbers)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* console.log(Order.Number(1, 1)) // 0
	* console.log(Order.Number(1, 2)) // -1
	* console.log(Order.Number(2, 1)) // 1
	*
	* console.log(Order.Number(0, -0)) // 0
	* console.log(Order.Number(NaN, 1)) // -1
	* ```
	*
	* @see {@link mapInput} to compare objects by a number property
	* @see {@link BigInt} for bigint comparisons
	* @category instances
	* @since 4.0.0
	*/
	var Number$4 = /*#__PURE__*/ make$12((self, that) => {
		if (globalThis.Number.isNaN(self) && globalThis.Number.isNaN(that)) return 0;
		if (globalThis.Number.isNaN(self)) return -1;
		if (globalThis.Number.isNaN(that)) return 1;
		return self < that ? -1 : 1;
	});
	/**
	* Transforms an `Order` on type `A` into an `Order` on type `B` by providing a function that
	* maps values of type `B` to values of type `A`.
	*
	* **When to use**
	*
	* Use when you need to adapt an `Order` to compare a larger value by one
	* derived property.
	*
	* **Details**
	*
	* Applies the mapping function to both values before comparison. The mapping
	* function should be pure and not have side effects so the ordering properties
	* of the original order are preserved.
	*
	* **Example** (Mapping Input)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const byLength = Order.mapInput(Order.Number, (s: string) => s.length)
	*
	* console.log(byLength("a", "bb")) // -1
	* console.log(byLength("bb", "a")) // 1
	* console.log(byLength("aa", "bb")) // 0
	* ```
	*
	* @see {@link combine} to combine mapped orders for multi-criteria comparison
	* @see {@link Struct} to create orders for structs with multiple fields
	* @category mapping
	* @since 2.0.0
	*/
	var mapInput = /*#__PURE__*/ dual(2, (self, f) => make$12((b1, b2) => self(f(b1), f(b2))));
	/**
	* Checks whether one value is strictly less than another according to the given order.
	*
	* **When to use**
	*
	* Use when you need a boolean less-than predicate using an `Order`.
	*
	* **Details**
	*
	* Returns `true` if the order returns `-1`, meaning the first value is less
	* than the second. Equal or greater values return `false`.
	*
	* **Example** (Checking less-than comparisons)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const isLessThanNumber = Order.isLessThan(Order.Number)
	*
	* console.log(isLessThanNumber(1, 2)) // true
	* console.log(isLessThanNumber(2, 1)) // false
	* console.log(isLessThanNumber(1, 1)) // false
	* ```
	*
	* @see {@link isLessThanOrEqualTo} for non-strict less than or equal
	* @see {@link isGreaterThan} for strict greater than
	* @category predicates
	* @since 4.0.0
	*/
	var isLessThan$1 = (O) => dual(2, (self, that) => O(self, that) === -1);
	/**
	* Checks whether one value is strictly greater than another according to the given order.
	*
	* **When to use**
	*
	* Use when you need a boolean greater-than predicate using an `Order`.
	*
	* **Details**
	*
	* Returns `true` if the order returns `1`, meaning the first value is greater
	* than the second. Equal or lesser values return `false`.
	*
	* **Example** (Checking greater-than comparisons)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const isGreaterThanNumber = Order.isGreaterThan(Order.Number)
	*
	* console.log(isGreaterThanNumber(2, 1)) // true
	* console.log(isGreaterThanNumber(1, 2)) // false
	* console.log(isGreaterThanNumber(1, 1)) // false
	* ```
	*
	* @see {@link isGreaterThanOrEqualTo} for non-strict greater than or equal
	* @see {@link isLessThan} for strict less than
	* @category predicates
	* @since 4.0.0
	*/
	var isGreaterThan$1 = (O) => dual(2, (self, that) => O(self, that) === 1);
	/**
	* Checks whether one value is less than or equal to another according to the given order.
	*
	* **When to use**
	*
	* Use when you need a boolean less-than-or-equal predicate using an `Order`.
	*
	* **Details**
	*
	* Returns `true` if the order returns `-1` or `0`, and returns `false` only if
	* the order returns `1`.
	*
	* **Example** (Checking less-than-or-equal comparisons)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const isLessThanOrEqualToNumber = Order.isLessThanOrEqualTo(Order.Number)
	*
	* console.log(isLessThanOrEqualToNumber(1, 2)) // true
	* console.log(isLessThanOrEqualToNumber(1, 1)) // true
	* console.log(isLessThanOrEqualToNumber(2, 1)) // false
	* ```
	*
	* @see {@link isLessThan} for strict less than
	* @see {@link isGreaterThan} for strict greater than
	* @category predicates
	* @since 4.0.0
	*/
	var isLessThanOrEqualTo$1 = (O) => dual(2, (self, that) => O(self, that) !== 1);
	/**
	* Checks whether one value is greater than or equal to another according to the given order.
	*
	* **When to use**
	*
	* Use when you need a boolean greater-than-or-equal predicate using an
	* `Order`.
	*
	* **Details**
	*
	* Returns `true` if the order returns `1` or `0`, and returns `false` only if
	* the order returns `-1`.
	*
	* **Example** (Checking greater-than-or-equal comparisons)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const isGreaterThanOrEqualToNumber = Order.isGreaterThanOrEqualTo(Order.Number)
	*
	* console.log(isGreaterThanOrEqualToNumber(2, 1)) // true
	* console.log(isGreaterThanOrEqualToNumber(1, 1)) // true
	* console.log(isGreaterThanOrEqualToNumber(1, 2)) // false
	* ```
	*
	* @see {@link isGreaterThan} for strict greater than
	* @see {@link isLessThanOrEqualTo} for less than or equal
	* @category predicates
	* @since 4.0.0
	*/
	var isGreaterThanOrEqualTo$1 = (O) => dual(2, (self, that) => O(self, that) !== -1);
	/**
	* Returns the minimum of two values according to the given order. If they are equal, returns the first argument.
	*
	* **When to use**
	*
	* Use when you need to select the smaller of two values according to an
	* `Order`.
	*
	* **Details**
	*
	* Returns the value that compares as less than or equal to the other value. If
	* values are equal, the first argument is returned.
	*
	* **Example** (Selecting the minimum value)
	*
	* ```ts
	* import { Order } from "effect"
	*
	* const minNumber = Order.min(Order.Number)
	*
	* console.log(minNumber(1, 2)) // 1
	* console.log(minNumber(2, 1)) // 1
	* console.log(minNumber(1, 1)) // 1
	* ```
	*
	* @see {@link max} for the maximum of two values
	* @see {@link clamp} to clamp a value between min and max
	* @category comparisons
	* @since 2.0.0
	*/
	var min$2 = (O) => dual(2, (self, that) => self === that || O(self, that) < 1 ? self : that);
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Option.js
	/**
	* Creates an `Option` representing the absence of a value.
	*
	* **When to use**
	*
	* Use to represent a missing or uninitialized value, such as returning "no
	* result" from a function.
	*
	* **Details**
	*
	* - Returns `Option<never>`, which is a subtype of `Option<A>` for any `A`
	* - Always returns the same singleton instance
	*
	* **Example** (Creating an empty Option)
	*
	* ```ts
	* import { Option } from "effect"
	*
	* //      ┌─── Option<never>
	* //      ▼
	* const noValue = Option.none()
	*
	* console.log(noValue)
	* // Output: { _id: 'Option', _tag: 'None' }
	* ```
	*
	* @see {@link some} for the opposite operation.
	*
	* @category constructors
	* @since 2.0.0
	*/
	var none = () => none$1;
	/**
	* Wraps the given value into an `Option` to represent its presence.
	*
	* **When to use**
	*
	* Use to wrap a known present value as `Option`
	* - Returning a successful result from a partial function
	*
	* **Details**
	*
	* - Always returns `Some<A>`
	* - Does not filter `null` or `undefined`; use {@link fromNullishOr} for that
	*
	* **Example** (Wrapping a value)
	*
	* ```ts
	* import { Option } from "effect"
	*
	* //      ┌─── Option<number>
	* //      ▼
	* const value = Option.some(1)
	*
	* console.log(value)
	* // Output: { _id: 'Option', _tag: 'Some', value: 1 }
	* ```
	*
	* @see {@link none} for the opposite operation.
	*
	* @category constructors
	* @since 2.0.0
	*/
	var some = some$1;
	/**
	* Checks whether an `Option` is `None` (absent).
	*
	* **When to use**
	*
	* Use when you need to branch on an absent `Option` before accessing `.value`.
	*
	* **Details**
	*
	* - Acts as a type guard, narrowing to `None<A>`
	*
	* **Example** (Checking for None)
	*
	* ```ts
	* import { Option } from "effect"
	*
	* console.log(Option.isNone(Option.some(1)))
	* // Output: false
	*
	* console.log(Option.isNone(Option.none()))
	* // Output: true
	* ```
	*
	* @see {@link isSome} for the opposite check.
	*
	* @category guards
	* @since 2.0.0
	*/
	var isNone = isNone$1;
	/**
	* Checks whether an `Option` contains a value (`Some`).
	*
	* **When to use**
	*
	* Use when you need to branch on a present `Option` before accessing `.value`.
	*
	* **Details**
	*
	* - Acts as a type guard, narrowing to `Some<A>`
	*
	* **Example** (Checking for Some)
	*
	* ```ts
	* import { Option } from "effect"
	*
	* console.log(Option.isSome(Option.some(1)))
	* // Output: true
	*
	* console.log(Option.isSome(Option.none()))
	* // Output: false
	* ```
	*
	* @see {@link isNone} for the opposite check.
	*
	* @category guards
	* @since 2.0.0
	*/
	var isSome = isSome$1;
	/**
	* Transforms the value inside a `Some` using the provided function, leaving
	* `None` unchanged.
	*
	* **When to use**
	*
	* Use to apply a pure transformation to an `Option`'s present value, especially
	* when chaining transformations in a pipeline.
	*
	* **Details**
	*
	* - `Some` → applies `f` and wraps the result in a new `Some`
	* - `None` → returns `None` unchanged
	*
	* **Example** (Mapping over an Option)
	*
	* ```ts
	* import { Option } from "effect"
	*
	* console.log(Option.map(Option.some(2), (n) => n * 2))
	* // Output: { _id: 'Option', _tag: 'Some', value: 4 }
	*
	* console.log(Option.map(Option.none(), (n: number) => n * 2))
	* // Output: { _id: 'Option', _tag: 'None' }
	* ```
	*
	* @see {@link flatMap} when `f` returns an `Option`
	* @see {@link as} to replace the value with a constant
	*
	* @category mapping
	* @since 2.0.0
	*/
	var map$5 = /*#__PURE__*/ dual(2, (self, f) => isNone(self) ? none() : some(f(self.value)));
	/**
	* Filters an `Option` using a predicate. Returns `None` if the predicate is
	* not satisfied or the input is `None`.
	*
	* **When to use**
	*
	* Use when you need to discard an `Option`'s present value when it does not
	* meet a condition, while narrowing the type via a refinement predicate.
	*
	* **Details**
	*
	* - `None` → `None`
	* - `Some` where `predicate(value)` is `true` → `Some(value)`
	* - `Some` where `predicate(value)` is `false` → `None`
	* - Supports refinements for type narrowing
	*
	* **Example** (Filtering with a predicate)
	*
	* ```ts
	* import { Option } from "effect"
	*
	* const removeEmpty = (input: Option.Option<string>) =>
	*   Option.filter(input, (value) => value !== "")
	*
	* console.log(removeEmpty(Option.some("hello")))
	* // Output: { _id: 'Option', _tag: 'Some', value: 'hello' }
	*
	* console.log(removeEmpty(Option.some("")))
	* // Output: { _id: 'Option', _tag: 'None' }
	*
	* console.log(removeEmpty(Option.none()))
	* // Output: { _id: 'Option', _tag: 'None' }
	* ```
	*
	* @see {@link filterMap} to transform and filter simultaneously
	* @see {@link exists} to test without filtering
	*
	* @category filtering
	* @since 2.0.0
	*/
	var filter$1 = /*#__PURE__*/ dual(2, (self, predicate) => isNone(self) ? none() : predicate(self.value) ? some(self.value) : none());
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Result.js
	/**
	* Creates a `Result` holding a `Success` value.
	*
	* **Details**
	*
	* - Use when you have a value and want to lift it into the `Result` type
	* - The error type `E` defaults to `never`
	*
	* **Example** (Wrapping a value)
	*
	* ```ts
	* import { Result } from "effect"
	*
	* const result = Result.succeed(42)
	*
	* console.log(Result.isSuccess(result))
	* // Output: true
	* ```
	*
	* @see {@link fail} to create a Failure
	* @see {@link void_ void} for a pre-built `Success<void>`
	*
	* @category constructors
	* @since 4.0.0
	*/
	var succeed$2 = succeed$3;
	/**
	* Creates a `Result` holding a `Failure` value.
	*
	* **When to use**
	*
	* Use to represent a failed `Result` with a typed failure value.
	*
	* **Details**
	*
	* - The success type `A` defaults to `never`
	*
	* **Example** (Creating a failure)
	*
	* ```ts
	* import { Result } from "effect"
	*
	* const result = Result.fail("Something went wrong")
	*
	* console.log(Result.isFailure(result))
	* // Output: true
	* ```
	*
	* @see {@link succeed} to create a Success
	* @see {@link mapError} to transform the error
	*
	* @category constructors
	* @since 4.0.0
	*/
	var fail$3 = fail$4;
	/**
	* Checks whether a `Result` is a `Failure`.
	*
	* **When to use**
	*
	* Use to narrow a known `Result` to the `Failure` variant.
	*
	* **Details**
	*
	* - Acts as a TypeScript type guard, narrowing to `Failure<A, E>`
	* - After narrowing, you can access `.failure` to read the error value
	*
	* **Example** (Narrowing to failure)
	*
	* ```ts
	* import { Result } from "effect"
	*
	* const result = Result.fail("oops")
	*
	* if (Result.isFailure(result)) {
	*   console.log(result.failure)
	*   // Output: "oops"
	* }
	* ```
	*
	* @see {@link isSuccess} for the opposite check
	* @see {@link isResult} to check if a value is any Result
	*
	* @category guards
	* @since 4.0.0
	*/
	var isFailure = isFailure$1;
	/**
	* Checks whether a `Result` is a `Success`.
	*
	* **When to use**
	*
	* Use to narrow a known `Result` to the `Success` variant.
	*
	* **Details**
	*
	* - Acts as a TypeScript type guard, narrowing to `Success<A, E>`
	* - After narrowing, you can access `.success` to read the value
	*
	* **Example** (Narrowing to success)
	*
	* ```ts
	* import { Result } from "effect"
	*
	* const result = Result.succeed(42)
	*
	* if (Result.isSuccess(result)) {
	*   console.log(result.success)
	*   // Output: 42
	* }
	* ```
	*
	* @see {@link isFailure} for the opposite check
	* @see {@link isResult} to check if a value is any Result
	*
	* @category guards
	* @since 4.0.0
	*/
	var isSuccess$1 = isSuccess$2;
	/**
	* Transforms the failure channel of a `Result`, leaving the success channel unchanged.
	*
	* **When to use**
	*
	* Use to transform only the failure channel while preserving success values.
	*
	* **Details**
	*
	* - If the result is a `Failure`, applies `f` to the error and returns a new `Failure`
	* - If the result is a `Success`, returns it as-is
	*
	* **Example** (Adding context to an error)
	*
	* ```ts
	* import { pipe, Result } from "effect"
	*
	* const result = pipe(
	*   Result.fail("not found"),
	*   Result.mapError((e) => `Error: ${e}`)
	* )
	* console.log(result)
	* // Output: { _tag: "Failure", failure: "Error: not found", ... }
	* ```
	*
	* @see {@link map} to transform only the success value
	* @see {@link mapBoth} to transform both channels
	*
	* @category mapping
	* @since 4.0.0
	*/
	var mapError$2 = /*#__PURE__*/ dual(2, (self, f) => isFailure(self) ? fail$3(f(self.failure)) : succeed$2(self.success));
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Record.js
	/**
	* Creates a new, empty record.
	*
	* **Example** (Creating an empty record)
	*
	* ```ts
	* import { Record } from "effect"
	*
	* // Create an empty record
	* const emptyRecord = Record.empty<string, number>()
	* console.log(emptyRecord) // {}
	*
	* // The type ensures type safety for future operations
	* const withValue = Record.set(emptyRecord, "count", 42)
	* console.log(withValue) // { count: 42 }
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var empty$3 = () => ({});
	/**
	* Determines if a mutable record is empty.
	*
	* **Example** (Checking for an empty record)
	*
	* ```ts
	* import { Record } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(Record.isEmptyRecord({}), true)
	* assert.deepStrictEqual(Record.isEmptyRecord({ a: 3 }), false)
	* ```
	*
	* @category guards
	* @since 2.0.0
	*/
	var isEmptyRecord = (self) => Object.keys(self).length === 0;
	/**
	* Maps a record into another record by applying a transformation function to each of its values.
	*
	* **Example** (Mapping record values)
	*
	* ```ts
	* import { Record } from "effect"
	* import * as assert from "node:assert"
	*
	* const f = (n: number) => `-${n}`
	*
	* assert.deepStrictEqual(Record.map({ a: 3, b: 5 }, f), { a: "-3", b: "-5" })
	*
	* const g = (n: number, key: string) => `${key.toUpperCase()}-${n}`
	*
	* assert.deepStrictEqual(Record.map({ a: 3, b: 5 }, g), { a: "A-3", b: "B-5" })
	* ```
	*
	* @category mapping
	* @since 2.0.0
	*/
	var map$4 = /*#__PURE__*/ dual(2, (self, f) => {
		const out = { ...self };
		for (const key of keys(self)) out[key] = f(self[key], key);
		return out;
	});
	/**
	* Selects properties from a record whose values match the given predicate.
	*
	* **Example** (Filtering record values)
	*
	* ```ts
	* import { Record } from "effect"
	* import * as assert from "node:assert"
	*
	* const x = { a: 1, b: 2, c: 3, d: 4 }
	* assert.deepStrictEqual(Record.filter(x, (n) => n > 2), { c: 3, d: 4 })
	* ```
	*
	* @category filtering
	* @since 2.0.0
	*/
	var filter = /*#__PURE__*/ dual(2, (self, predicate) => {
		const out = empty$3();
		for (const key of keys(self)) if (predicate(self[key], key)) out[key] = self[key];
		return out;
	});
	/**
	* Retrieves the keys of a given record as an array.
	*
	* **Example** (Getting record keys)
	*
	* ```ts
	* import { Record } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(Record.keys({ a: 1, b: 2, c: 3 }), ["a", "b", "c"])
	* ```
	*
	* @category getters
	* @since 2.0.0
	*/
	var keys = (self) => Object.keys(self);
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Array.js
	/**
	* Works with JavaScript arrays, readonly arrays, and non-empty arrays.
	*
	* The helpers cover common collection work such as creating arrays, reading
	* elements, transforming values, sorting, grouping, splitting, combining, and
	* reducing many values to one result. Helpers that change contents return new
	* arrays and preserve non-empty array types when the result is guaranteed to
	* contain values.
	*
	* @since 2.0.0
	*/
	/**
	* Exposes the global array constructor.
	*
	* **When to use**
	*
	* Use to access native JavaScript array constructor methods such as `isArray`
	* or `from` from the Effect module namespace.
	*
	* **Example** (Accessing the Array constructor)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* const arr = new Array.Array(3)
	* console.log(arr) // [undefined, undefined, undefined]
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var Array$1 = globalThis.Array;
	/**
	* Converts an `Iterable` to an `Array`.
	*
	* **When to use**
	*
	* Use to convert any `Iterable` (Set, Generator, etc.) into an array.
	*
	* **Details**
	*
	* If the input is already an array, this returns it by reference without
	* copying. Otherwise, it creates a new array from the iterable. Use `copy` if
	* you need a fresh array even when the input is already an array.
	*
	* **Example** (Converting a Set to an array)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* const result = Array.fromIterable(new Set([1, 2, 3]))
	* console.log(result) // [1, 2, 3]
	* ```
	*
	* @see {@link ensure} — wrap a single value or return an existing array
	* @see {@link copy} — create a shallow copy of an array
	*
	* @category constructors
	* @since 2.0.0
	*/
	var fromIterable = (collection) => Array$1.isArray(collection) ? collection : Array$1.from(collection);
	/**
	* Adds a single element to the end of an iterable, returning a `NonEmptyArray`.
	*
	* **When to use**
	*
	* Use when you need to guarantee a non-empty result after adding a required
	* trailing value.
	*
	* **Example** (Appending an element)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* const result = Array.append([1, 2, 3], 4)
	* console.log(result) // [1, 2, 3, 4]
	* ```
	*
	* @see {@link prepend} — add to the front
	* @see {@link appendAll} — append multiple elements
	*
	* @category combining
	* @since 2.0.0
	*/
	var append = /*#__PURE__*/ dual(2, (self, last) => [...self, last]);
	/**
	* Concatenates two iterables into a single array.
	*
	* **When to use**
	*
	* Use to combine two iterable inputs into a new array with the second input's
	* elements after the first.
	*
	* **Details**
	*
	* If either input is non-empty, the result is a `NonEmptyArray`.
	*
	* **Example** (Concatenating arrays)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* const result = Array.appendAll([1, 2], [3, 4])
	* console.log(result) // [1, 2, 3, 4]
	* ```
	*
	* @see {@link append} — add a single element to the end
	* @see {@link prependAll} — add elements to the front
	*
	* @category combining
	* @since 2.0.0
	*/
	var appendAll = /*#__PURE__*/ dual(2, (self, that) => fromIterable(self).concat(fromIterable(that)));
	Array$1.isArray;
	/**
	* Checks whether a mutable `Array` is non-empty, narrowing the type to
	* `NonEmptyArray`.
	*
	* **When to use**
	*
	* Use when you need the narrowed value to remain a mutable `Array` after proving
	* it has at least one element.
	*
	* **Example** (Checking for a non-empty array)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.isArrayNonEmpty([])) // false
	* console.log(Array.isArrayNonEmpty([1, 2, 3])) // true
	* ```
	*
	* @see {@link isReadonlyArrayNonEmpty} — readonly variant
	* @see {@link isArrayEmpty} — opposite check
	*
	* @category guards
	* @since 4.0.0
	*/
	var isArrayNonEmpty = isArrayNonEmpty$1;
	/**
	* Checks whether a `ReadonlyArray` is non-empty, narrowing the type to
	* `NonEmptyReadonlyArray`.
	*
	* **When to use**
	*
	* Use when you need to prove a readonly array has at least one element without
	* requiring mutable array methods afterward.
	*
	* **Example** (Checking for a non-empty readonly array)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.isReadonlyArrayNonEmpty([])) // false
	* console.log(Array.isReadonlyArrayNonEmpty([1, 2, 3])) // true
	* ```
	*
	* @see {@link isArrayNonEmpty} — mutable variant
	* @see {@link isReadonlyArrayEmpty} — opposite check
	*
	* @category guards
	* @since 4.0.0
	*/
	var isReadonlyArrayNonEmpty = isArrayNonEmpty$1;
	/** @internal */
	function isOutOfBounds(i, as) {
		return i < 0 || i >= as.length;
	}
	/**
	* Returns the first element of a `NonEmptyReadonlyArray` directly (no `Option`
	* wrapper).
	*
	* **When to use**
	*
	* Use to get the first element without `Option` wrapping when the array is known
	* to be non-empty.
	*
	* **Example** (Getting the head of a non-empty array)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.headNonEmpty([1, 2, 3, 4])) // 1
	* ```
	*
	* @see {@link head} — safe version for possibly-empty arrays
	*
	* @category getters
	* @since 2.0.0
	*/
	var headNonEmpty = /*#__PURE__*/ (/* @__PURE__ */ dual(2, (self, index) => {
		const i = Math.floor(index);
		if (isOutOfBounds(i, self)) throw new Error(`Index out of bounds: ${i}`);
		return self[i];
	}))(0);
	/**
	* Returns all elements except the first of a `NonEmptyReadonlyArray`.
	*
	* **When to use**
	*
	* Use to get all elements after the first when the array is known to be non-empty.
	*
	* **Example** (Getting the tail of a non-empty array)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.tailNonEmpty([1, 2, 3, 4])) // [2, 3, 4]
	* ```
	*
	* @see {@link tail} — safe version for possibly-empty arrays
	* @see {@link initNonEmpty} — all elements except the last
	*
	* @category getters
	* @since 2.0.0
	*/
	var tailNonEmpty = (self) => self.slice(1);
	/**
	* Computes the union of two arrays using a custom equivalence, removing
	* duplicates.
	*
	* **When to use**
	*
	* Use when you need the union of two arrays but duplicate detection must use a
	* custom equivalence instead of the default `Equal.equivalence()`.
	*
	* **Example** (Computing unions with custom equality)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.unionWith([1, 2], [2, 3], (a, b) => a === b)) // [1, 2, 3]
	* ```
	*
	* @see {@link union} for the `Equal.equivalence()` variant
	* @see {@link intersectionWith} for keeping elements present in both arrays
	* @see {@link differenceWith} for keeping elements present only in the first array
	*
	* @category elements
	* @since 2.0.0
	*/
	var unionWith = /*#__PURE__*/ dual(3, (self, that, isEquivalent) => {
		const a = fromIterable(self);
		const b = fromIterable(that);
		if (isReadonlyArrayNonEmpty(a)) {
			if (isReadonlyArrayNonEmpty(b)) return dedupeWith(isEquivalent)(appendAll(a, b));
			return a;
		}
		return b;
	});
	/**
	* Computes the union of two arrays, removing duplicates using
	* `Equal.equivalence()`.
	*
	* **Example** (Computing array unions)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.union([1, 2], [2, 3])) // [1, 2, 3]
	* ```
	*
	* @see {@link unionWith} — use custom equality
	* @see {@link intersection} — elements in both arrays
	* @see {@link difference} — elements only in the first array
	*
	* @category elements
	* @since 2.0.0
	*/
	var union$1 = /*#__PURE__*/ dual(2, (self, that) => unionWith(self, that, asEquivalence()));
	/**
	* Creates an empty array.
	*
	* **When to use**
	*
	* Use to create a typed empty array without allocating placeholder elements.
	*
	* **Example** (Creating an empty array)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* const result = Array.empty<number>()
	* console.log(result) // []
	* ```
	*
	* @see {@link of} — create a single-element array
	* @see {@link make} — create from multiple values
	*
	* @category constructors
	* @since 2.0.0
	*/
	var empty$2 = () => [];
	/**
	* Transforms each element using a function, returning a new array.
	*
	* **When to use**
	*
	* Use to transform each element independently while preserving the array shape.
	*
	* **Details**
	*
	* The function receives `(element, index)`. The return type preserves
	* `NonEmptyArray`.
	*
	* **Example** (Doubling values)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.map([1, 2, 3], (x) => x * 2)) // [2, 4, 6]
	* ```
	*
	* @see {@link flatMap} — map and flatten
	*
	* @category mapping
	* @since 2.0.0
	*/
	var map$3 = /*#__PURE__*/ dual(2, (self, f) => self.map(f));
	/**
	* Removes duplicates using a custom equivalence, preserving the order of the
	* first occurrence.
	*
	* **When to use**
	*
	* Use to remove all duplicate elements with a custom equivalence when default
	* equality is not appropriate.
	*
	* **Example** (Deduplicating with custom equality)
	*
	* ```ts
	* import { Array } from "effect"
	*
	* console.log(Array.dedupeWith([1, 2, 2, 3, 3, 3], (a, b) => a === b)) // [1, 2, 3]
	* ```
	*
	* @see {@link dedupe} — uses default equality
	* @see {@link dedupeAdjacentWith} — only dedupes consecutive elements
	*
	* @category elements
	* @since 2.0.0
	*/
	var dedupeWith = /*#__PURE__*/ dual(2, (self, isEquivalent) => {
		const input = fromIterable(self);
		if (isReadonlyArrayNonEmpty(input)) {
			const out = [headNonEmpty(input)];
			const rest = tailNonEmpty(input);
			for (const r of rest) if (out.every((a) => !isEquivalent(r, a))) out.push(r);
			return out;
		}
		return [];
	});
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Effectable.js
	/**
	* Create a low-level `Effect` prototype.
	*
	* **When to use**
	*
	* Use when you need to create a custom Effect-like value without extending a
	* class, by providing a label and an evaluate function that receives the
	* current fiber.
	*
	* **Details**
	*
	* When the effect is evaluated, it calls `evaluate` with the current fiber.
	*
	* @see {@link Class} for a class-based approach to defining custom Effect values
	*
	* @category prototypes
	* @since 4.0.0
	*/
	var Prototype = (options) => makePrimitiveProto({
		op: options.label,
		[evaluate]: options.evaluate
	});
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/stackTraceLimit.js
	var ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	var ObjectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty;
	var ObjectIsExtensible = Object.isExtensible;
	/**
	* Check if `Error.stackTraceLimit` is writable.
	* Returns `false` if the property is frozen, non-writable, or `Error` is non-extensible.
	*
	* @internal
	*/
	var isStackTraceLimitWritable = () => {
		const desc = ObjectGetOwnPropertyDescriptor(Error, "stackTraceLimit");
		if (desc === void 0) return ObjectIsExtensible(Error);
		return ObjectPrototypeHasOwnProperty.call(desc, "writable") ? desc.writable === true : desc.set !== void 0;
	};
	var canWriteStackTraceLimit = /*#__PURE__*/ isStackTraceLimitWritable();
	/**
	* Get the current `Error.stackTraceLimit` value.
	* Returns `undefined` if the property doesn't exist.
	*
	* @internal
	*/
	var getStackTraceLimit = () => Error.stackTraceLimit;
	/**
	* Safely set `Error.stackTraceLimit` if possible, otherwise no-op.
	*
	* Accepts `undefined` so a value read via {@link getStackTraceLimit} can be
	* restored faithfully.
	*
	* @internal
	*/
	var setStackTraceLimit = (value) => {
		if (canWriteStackTraceLimit) Error.stackTraceLimit = value;
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Context.js
	/**
	* Runtime type identifier attached to `Context` service keys and used by
	* `isKey` to recognize them.
	*
	* @category type IDs
	* @since 4.0.0
	*/
	var ServiceTypeId = "~effect/Context/Service";
	/**
	* Creates a `Context` service key.
	*
	* **When to use**
	*
	* Use when you need to define a context service key for a dependency that must
	* be provided by the surrounding context.
	*
	* **Details**
	*
	* Call `Context.Service("Key")` for a function-style key, or use the two-stage
	* form `Context.Service<Self, Shape>()("Key")` for class-style service
	* declarations. The returned key can be yielded as an Effect and passed to
	* `Context.make`, `Context.add`, and the Context getter functions.
	*
	* **Gotchas**
	*
	* The string key is the runtime identity of the service. Reusing the same key
	* string for unrelated services makes them occupy the same slot in a
	* `Context`.
	*
	* **Example** (Creating service keys)
	*
	* ```ts
	* import { Context } from "effect"
	*
	* // Create a simple service
	* const Database = Context.Service<{
	*   query: (sql: string) => string
	* }>("Database")
	*
	* // Create a service class
	* class Config extends Context.Service<Config, {
	*   port: number
	* }>()("Config") {}
	*
	* // Use the services to create contexts
	* const db = Context.make(Database, {
	*   query: (sql) => `Result: ${sql}`
	* })
	* const config = Context.make(Config, { port: 8080 })
	* ```
	*
	* @see {@link Reference} for service keys with default values
	*
	* @category constructors
	* @since 4.0.0
	*/
	var Service = function() {
		const prevLimit = getStackTraceLimit();
		setStackTraceLimit(2);
		const err = /* @__PURE__ */ new Error();
		setStackTraceLimit(prevLimit);
		function KeyClass() {}
		const self = KeyClass;
		Object.setPrototypeOf(self, ServiceProto);
		Object.defineProperty(self, "stack", { get() {
			return err.stack;
		} });
		if (arguments.length > 0) {
			self.key = arguments[0];
			if (arguments[1]?.defaultValue) {
				self[ReferenceTypeId] = ReferenceTypeId;
				self.defaultValue = arguments[1].defaultValue;
			}
			return self;
		}
		return function(key, options) {
			self.key = key;
			if (options?.make) self.make = options.make;
			return self;
		};
	};
	var ServiceProto = {
		[ServiceTypeId]: ServiceTypeId,
		.../*#__PURE__*/ Prototype({
			label: "Service",
			evaluate(fiber) {
				return exitSucceed(get$1(fiber.context, this));
			}
		}),
		toJSON() {
			return {
				_id: "Service",
				key: this.key,
				stack: this.stack
			};
		},
		of(self) {
			return self;
		},
		context(self) {
			return make$11(this, self);
		},
		use(f) {
			return withFiber$1((fiber) => f(get$1(fiber.context, this)));
		},
		useSync(f) {
			return withFiber$1((fiber) => exitSucceed(f(get$1(fiber.context, this))));
		}
	};
	var ReferenceTypeId = "~effect/Context/Reference";
	var TypeId$14 = "~effect/Context";
	/**
	* Creates a `Context` from an existing service map.
	*
	* **When to use**
	*
	* Use when constructing a low-level `Context` from a trusted map whose lifecycle
	* you control.
	*
	* **Gotchas**
	*
	* This is unsafe because later mutation of the provided map can affect the
	* created `Context`. Prefer `empty`, `make`, `add`, or `merge` for normal
	* Context construction.
	*
	* **Example** (Creating a context from a map)
	*
	* ```ts
	* import { Context } from "effect"
	*
	* // Create a context from a Map (unsafe)
	* const map = new Map([
	*   ["Logger", { log: (msg: string) => console.log(msg) }]
	* ])
	*
	* const context = Context.makeUnsafe(map)
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var makeUnsafe$5 = (mapUnsafe) => {
		const self = Object.create(Proto$1);
		self.mapUnsafe = mapUnsafe;
		self.mutable = false;
		return self;
	};
	var Proto$1 = {
		...PipeInspectableProto,
		[TypeId$14]: { _Services: (_) => _ },
		toJSON() {
			return {
				_id: "Context",
				services: Array.from(this.mapUnsafe).map(([key, value]) => ({
					key,
					value
				}))
			};
		},
		[symbol](that) {
			if (!isContext(that) || this.mapUnsafe.size !== that.mapUnsafe.size) return false;
			for (const k of this.mapUnsafe.keys()) if (!that.mapUnsafe.has(k) || !equals$2(this.mapUnsafe.get(k), that.mapUnsafe.get(k))) return false;
			return true;
		},
		[symbol$1]() {
			return number$1(this.mapUnsafe.size);
		}
	};
	/**
	* Checks whether the provided argument is a `Context`.
	*
	* **When to use**
	*
	* Use to narrow an unknown value before passing it to APIs that require a
	* `Context`.
	*
	* **Details**
	*
	* This checks the runtime `Context` marker and does not inspect which services
	* the context contains.
	*
	* **Gotchas**
	*
	* This guard only proves that the value is a `Context`; it does not prove that
	* any specific service is present.
	*
	* **Example** (Checking for contexts)
	*
	* ```ts
	* import { Context } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.strictEqual(Context.isContext(Context.empty()), true)
	* ```
	*
	* @see {@link isKey} for checking service keys
	* @see {@link isReference} for checking references with defaults
	*
	* @category guards
	* @since 2.0.0
	*/
	var isContext = (u) => hasProperty(u, TypeId$14);
	/**
	* Returns an empty `Context`.
	*
	* **Example** (Creating an empty context)
	*
	* ```ts
	* import { Context } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.strictEqual(Context.isContext(Context.empty()), true)
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var empty$1 = () => emptyContext;
	var emptyContext = /*#__PURE__*/ makeUnsafe$5(/*#__PURE__*/ new Map());
	/**
	* Creates a new `Context` with a single service associated to the key.
	*
	* **Example** (Creating a context with one service)
	*
	* ```ts
	* import { Context } from "effect"
	* import * as assert from "node:assert"
	*
	* const Port = Context.Service<{ PORT: number }>("Port")
	*
	* const context = Context.make(Port, { PORT: 8080 })
	*
	* assert.deepStrictEqual(Context.get(context, Port), { PORT: 8080 })
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var make$11 = (key, service) => makeUnsafe$5(/* @__PURE__ */ new Map([[key.key, service]]));
	/**
	* Adds a service to a given `Context`.
	*
	* **When to use**
	*
	* Use when you need to store a known service value in a `Context`.
	*
	* **Details**
	*
	* If the context already contains the same service key, the new service
	* replaces the previous one.
	*
	* **Example** (Adding a service to a context)
	*
	* ```ts
	* import { Context, pipe } from "effect"
	* import * as assert from "node:assert"
	*
	* const Port = Context.Service<{ PORT: number }>("Port")
	* const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
	*
	* const someContext = Context.make(Port, { PORT: 8080 })
	*
	* const context = pipe(
	*   someContext,
	*   Context.add(Timeout, { TIMEOUT: 5000 })
	* )
	*
	* assert.deepStrictEqual(Context.get(context, Port), { PORT: 8080 })
	* assert.deepStrictEqual(Context.get(context, Timeout), { TIMEOUT: 5000 })
	* ```
	*
	* @see {@link addOrOmit} for adding or removing a service from an `Option`
	*
	* @category adders
	* @since 2.0.0
	*/
	var add = /*#__PURE__*/ dual(3, (self, key, service) => withMapUnsafe(self, (map) => {
		map.set(key.key, service);
	}));
	/**
	* Returns the service currently stored for a key, or `undefined` when the key
	* is absent.
	*
	* **When to use**
	*
	* Use when you need to read the service stored for a key without resolving
	* `Context.Reference` defaults.
	*
	* **Gotchas**
	*
	* This is a raw lookup and does not resolve default values for
	* `Context.Reference` keys.
	*
	* @see {@link getOption} for a reference-aware optional lookup
	*
	* @category getters
	* @since 4.0.0
	*/
	var getOrUndefined = /*#__PURE__*/ dual(2, (self, key) => self.mapUnsafe.get(key.key));
	/**
	* Gets a service from the context that corresponds to the given key.
	*
	* **When to use**
	*
	* Use when you need type-checked access to a service already included in the
	* context type.
	*
	* **Example** (Getting a service from a context)
	*
	* ```ts
	* import { Context, pipe } from "effect"
	* import * as assert from "node:assert"
	*
	* const Port = Context.Service<{ PORT: number }>("Port")
	* const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
	*
	* const context = pipe(
	*   Context.make(Port, { PORT: 8080 }),
	*   Context.add(Timeout, { TIMEOUT: 5000 })
	* )
	*
	* assert.deepStrictEqual(Context.get(context, Timeout), { TIMEOUT: 5000 })
	* ```
	*
	* @see {@link getOption} for optional service access
	* @see {@link getOrElse} for fallback values
	*
	* @category getters
	* @since 2.0.0
	*/
	var get$1 = /* @__PURE__ */ dual(2, (self, service) => {
		if (!self.mapUnsafe.has(service.key)) {
			if (ReferenceTypeId in service) return getDefaultValue(service);
			throw serviceNotFoundError(service);
		}
		return self.mapUnsafe.get(service.key);
	});
	/**
	* Gets the value for a `Context.Reference`, returning its cached default when
	* the context does not contain an override.
	*
	* **When to use**
	*
	* Use when you need a `Context.Reference` value resolved from either a stored
	* override or the reference's default value.
	*
	* **Details**
	*
	* Stored overrides take precedence. If no override is present, the reference's
	* default value is computed lazily and cached on the reference itself.
	*
	* **Gotchas**
	*
	* Mutable default values can be shared across contexts unless an override is
	* provided, because the default is cached on the `Context.Reference`.
	*
	* **Example** (Getting reference defaults unsafely)
	*
	* ```ts
	* import { Context } from "effect"
	*
	* const LoggerRef = Context.Reference("Logger", {
	*   defaultValue: () => ({ log: (msg: string) => console.log(msg) })
	* })
	*
	* const context = Context.empty()
	* const logger = Context.getReferenceUnsafe(context, LoggerRef)
	*
	* console.log(typeof logger.log) // "function"
	* ```
	*
	* @see {@link getUnsafe} for unsafe access with any service key
	* @see {@link get} for type-checked reference-aware access
	* @see {@link getOption} for optional access to non-reference keys
	*
	* @category unsafe
	* @since 4.0.0
	*/
	var getReferenceUnsafe = (self, service) => {
		if (!self.mapUnsafe.has(service.key)) return getDefaultValue(service);
		return self.mapUnsafe.get(service.key);
	};
	var defaultValueCacheKey = "~effect/Context/defaultValue";
	var getDefaultValue = (ref) => {
		if (defaultValueCacheKey in ref) return ref[defaultValueCacheKey];
		return ref[defaultValueCacheKey] = ref.defaultValue();
	};
	var serviceNotFoundError = (service) => {
		const error = /* @__PURE__ */ new Error(`Service not found${service.key ? `: ${String(service.key)}` : ""}`);
		if (service.stack) {
			const lines = service.stack.split("\n");
			if (lines.length > 2) {
				const afterAt = lines[2].match(/at (.*)/);
				if (afterAt) error.message = error.message + ` (defined at ${afterAt[1]})`;
			}
		}
		if (error.stack) {
			const lines = error.stack.split("\n");
			lines.splice(1, 3);
			error.stack = lines.join("\n");
		}
		return error;
	};
	/**
	* Merges two `Context`s into one.
	*
	* **When to use**
	*
	* Use when you need to combine two contexts.
	*
	* **Details**
	*
	* When both contexts contain the same service key, the service from `that`
	* overrides the service from `self`.
	*
	* **Example** (Merging two contexts)
	*
	* ```ts
	* import { Context } from "effect"
	* import * as assert from "node:assert"
	*
	* const Port = Context.Service<{ PORT: number }>("Port")
	* const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
	*
	* const firstContext = Context.make(Port, { PORT: 8080 })
	* const secondContext = Context.make(Timeout, { TIMEOUT: 5000 })
	*
	* const context = Context.merge(firstContext, secondContext)
	*
	* assert.deepStrictEqual(Context.get(context, Port), { PORT: 8080 })
	* assert.deepStrictEqual(Context.get(context, Timeout), { TIMEOUT: 5000 })
	* ```
	*
	* @see {@link mergeAll} for merging more than two contexts at once
	*
	* @category combining
	* @since 2.0.0
	*/
	var merge = /*#__PURE__*/ dual(2, (self, that) => {
		if (self.mapUnsafe.size === 0) return that;
		if (that.mapUnsafe.size === 0) return self;
		return withMapUnsafe(self, (map) => {
			that.mapUnsafe.forEach((value, key) => map.set(key, value));
		});
	});
	var withMapUnsafe = (self, f) => {
		if (self.mutable) {
			f(self.mapUnsafe);
			return self;
		}
		const map = new Map(self.mapUnsafe);
		f(map);
		return makeUnsafe$5(map);
	};
	/**
	* Creates a context key with a default value.
	*
	* **When to use**
	*
	* Use when you need to define a context key with a lazily computed default
	* value.
	*
	* **Details**
	*
	* `Context.Reference` allows you to create a key that can hold a value. You
	* can provide a default value for the service, which will automatically be used
	* when the context is accessed, or override it with a custom implementation
	* when needed. The default value is computed lazily and cached on the
	* reference.
	*
	* **Example** (Creating references with default values)
	*
	* ```ts
	* import { Context } from "effect"
	*
	* // Create a reference with a default value
	* const LoggerRef = Context.Reference("Logger", {
	*   defaultValue: () => ({ log: (msg: string) => console.log(msg) })
	* })
	*
	* // The reference provides the default value when accessed from an empty context
	* const context = Context.empty()
	* const logger = Context.get(context, LoggerRef)
	*
	* // You can also override the default value
	* const customContext = Context.make(LoggerRef, {
	*   log: (msg: string) => `Custom: ${msg}`
	* })
	* const customLogger = Context.get(customContext, LoggerRef)
	* ```
	*
	* @see {@link Service} for required services without default values
	*
	* @category references
	* @since 3.11.0
	*/
	var Reference = Service;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Duration.js
	var TypeId$13 = "~effect/time/Duration";
	var bigint0$1 = /*#__PURE__*/ BigInt(0);
	var bigint1 = /*#__PURE__*/ BigInt(1);
	var bigint1e3 = /*#__PURE__*/ BigInt(1e3);
	var roundTiesAwayFromZero = (input) => BigInt(input < 0 ? Math.ceil(input - .5) : Math.floor(input + .5));
	var roundMillisToNanos = (millis) => roundTiesAwayFromZero(millis * 1e6);
	var parseNanos = (input, scale) => input.includes(".") ? roundTiesAwayFromZero(Number(input) * Number(scale)) : BigInt(input) * scale;
	var DURATION_REGEXP = /^(-?\d+(?:\.\d+)?)\s+(nanos?|micros?|millis?|seconds?|minutes?|hours?|days?|weeks?)$/;
	/**
	* Decodes a `Duration.Input` into a `Duration`.
	*
	* **When to use**
	*
	* Use when the input has already been validated or comes from a trusted source
	* and throwing is acceptable for invalid duration syntax.
	*
	* **Gotchas**
	*
	* If the input is not a valid `Duration.Input`, it throws an error.
	*
	* **Example** (Decoding duration inputs)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration1 = Duration.fromInputUnsafe(1000) // 1000 milliseconds
	* const duration2 = Duration.fromInputUnsafe("5 seconds")
	* const duration3 = Duration.fromInputUnsafe("Infinity")
	* const duration4 = Duration.fromInputUnsafe([2, 500_000_000]) // 2 seconds and 500ms
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var fromInputUnsafe = (input) => {
		switch (typeof input) {
			case "number": return millis(input);
			case "bigint": return nanos(input);
			case "string": {
				if (input === "Infinity") return infinity;
				if (input === "-Infinity") return negativeInfinity;
				const match = DURATION_REGEXP.exec(input);
				if (!match) break;
				const [_, valueStr, unit] = match;
				if (unit === "nano" || unit === "nanos") return nanos(parseNanos(valueStr, bigint1));
				if (unit === "micro" || unit === "micros") return nanos(parseNanos(valueStr, bigint1e3));
				const value = Number(valueStr);
				switch (unit) {
					case "milli":
					case "millis": return millis(value);
					case "second":
					case "seconds": return seconds(value);
					case "minute":
					case "minutes": return minutes(value);
					case "hour":
					case "hours": return hours(value);
					case "day":
					case "days": return days(value);
					case "week":
					case "weeks": return weeks(value);
				}
				break;
			}
			case "object": {
				if (input === null) break;
				if (TypeId$13 in input) return input;
				if (Array.isArray(input)) {
					if (input.length !== 2 || !input.every(isNumber)) return invalid(input);
					if (Number.isNaN(input[0]) || Number.isNaN(input[1])) return zero$1;
					if (input[0] === -Infinity || input[1] === -Infinity) return negativeInfinity;
					if (input[0] === Infinity || input[1] === Infinity) return infinity;
					return make$10(roundTiesAwayFromZero(input[0] * 1e9 + input[1]));
				}
				const obj = input;
				let millis = 0;
				if (obj.weeks) millis += obj.weeks * 6048e5;
				if (obj.days) millis += obj.days * 864e5;
				if (obj.hours) millis += obj.hours * 36e5;
				if (obj.minutes) millis += obj.minutes * 6e4;
				if (obj.seconds) millis += obj.seconds * 1e3;
				if (obj.milliseconds) millis += obj.milliseconds;
				if (!obj.microseconds && !obj.nanoseconds) return make$10(millis);
				return make$10(roundTiesAwayFromZero(millis * 1e6 + (obj.microseconds ?? 0) * 1e3 + (obj.nanoseconds ?? 0)));
			}
		}
		return invalid(input);
	};
	var invalid = (input) => {
		throw new Error(`Invalid Input: ${input}`);
	};
	var zeroDurationValue = {
		_tag: "Millis",
		millis: 0
	};
	var infinityDurationValue = { _tag: "Infinity" };
	var negativeInfinityDurationValue = { _tag: "NegativeInfinity" };
	var DurationProto = {
		[TypeId$13]: TypeId$13,
		[symbol$1]() {
			return structure(this.value);
		},
		[symbol](that) {
			return isDuration(that) && equals$1(this, that);
		},
		toString() {
			switch (this.value._tag) {
				case "Infinity": return "Infinity";
				case "NegativeInfinity": return "-Infinity";
				case "Nanos": return `${this.value.nanos} nanos`;
				case "Millis": return `${this.value.millis} millis`;
			}
		},
		toJSON() {
			switch (this.value._tag) {
				case "Millis": return {
					_id: "Duration",
					_tag: "Millis",
					millis: this.value.millis
				};
				case "Nanos": return {
					_id: "Duration",
					_tag: "Nanos",
					nanos: String(this.value.nanos)
				};
				case "Infinity": return {
					_id: "Duration",
					_tag: "Infinity"
				};
				case "NegativeInfinity": return {
					_id: "Duration",
					_tag: "NegativeInfinity"
				};
			}
		},
		[NodeInspectSymbol]() {
			return this.toJSON();
		},
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	var make$10 = (input) => {
		const duration = Object.create(DurationProto);
		if (typeof input === "number") if (isNaN(input) || input === 0 || Object.is(input, -0)) duration.value = zeroDurationValue;
		else if (!Number.isFinite(input)) duration.value = input > 0 ? infinityDurationValue : negativeInfinityDurationValue;
		else if (!Number.isInteger(input)) duration.value = {
			_tag: "Nanos",
			nanos: roundMillisToNanos(input)
		};
		else duration.value = {
			_tag: "Millis",
			millis: input
		};
		else if (input === bigint0$1) duration.value = zeroDurationValue;
		else duration.value = {
			_tag: "Nanos",
			nanos: input
		};
		return duration;
	};
	/**
	* Checks whether a value is a Duration.
	*
	* **Example** (Checking for durations)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* console.log(Duration.isDuration(Duration.seconds(1))) // true
	* console.log(Duration.isDuration(1000)) // false
	* ```
	*
	* @category guards
	* @since 2.0.0
	*/
	var isDuration = (u) => hasProperty(u, TypeId$13);
	/**
	* A Duration representing zero time.
	*
	* **Example** (Referencing the zero duration)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* console.log(Duration.toMillis(Duration.zero)) // 0
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var zero$1 = /*#__PURE__*/ make$10(0);
	/**
	* A Duration representing infinite time.
	*
	* **Example** (Referencing infinite duration)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* console.log(Duration.toMillis(Duration.infinity)) // Infinity
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var infinity = /*#__PURE__*/ make$10(Infinity);
	/**
	* A Duration representing negative infinite time.
	*
	* **Example** (Referencing negative infinite duration)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* console.log(Duration.toMillis(Duration.negativeInfinity)) // -Infinity
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var negativeInfinity = /*#__PURE__*/ make$10(-Infinity);
	/**
	* Creates a Duration from nanoseconds.
	*
	* **Example** (Creating durations from nanoseconds)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.nanos(BigInt(500_000_000))
	* console.log(Duration.toMillis(duration)) // 500
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var nanos = (nanos) => make$10(nanos);
	/**
	* Creates a Duration from milliseconds.
	*
	* **Example** (Creating durations from milliseconds)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.millis(1000)
	* console.log(Duration.toMillis(duration)) // 1000
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var millis = (millis) => make$10(millis);
	/**
	* Creates a Duration from seconds.
	*
	* **Example** (Creating durations from seconds)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.seconds(30)
	* console.log(Duration.toMillis(duration)) // 30000
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var seconds = (seconds) => make$10(seconds * 1e3);
	/**
	* Creates a Duration from minutes.
	*
	* **Example** (Creating durations from minutes)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.minutes(5)
	* console.log(Duration.toMillis(duration)) // 300000
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var minutes = (minutes) => make$10(minutes * 6e4);
	/**
	* Creates a Duration from hours.
	*
	* **Example** (Creating durations from hours)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.hours(2)
	* console.log(Duration.toMillis(duration)) // 7200000
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var hours = (hours) => make$10(hours * 36e5);
	/**
	* Creates a Duration from days.
	*
	* **Example** (Creating durations from days)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.days(1)
	* console.log(Duration.toMillis(duration)) // 86400000
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var days = (days) => make$10(days * 864e5);
	/**
	* Creates a Duration from weeks.
	*
	* **Example** (Creating durations from weeks)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.weeks(1)
	* console.log(Duration.toMillis(duration)) // 604800000
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var weeks = (weeks) => make$10(weeks * 6048e5);
	/**
	* Converts a Duration to milliseconds.
	*
	* **Example** (Converting durations to milliseconds)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* console.log(Duration.toMillis(Duration.seconds(5))) // 5000
	* console.log(Duration.toMillis(Duration.minutes(2))) // 120000
	* ```
	*
	* @category getters
	* @since 2.0.0
	*/
	var toMillis = (self) => match$2(fromInputUnsafe(self), {
		onMillis: identity,
		onNanos: (nanos) => Number(nanos) / 1e6,
		onInfinity: () => Infinity,
		onNegativeInfinity: () => -Infinity
	});
	/**
	* Gets the duration in nanoseconds as a bigint.
	*
	* **When to use**
	*
	* Use when the duration is known to be finite and you need the nanosecond value
	* as a `bigint`.
	*
	* **Details**
	*
	* Millisecond-backed fractional durations are rounded to the nearest
	* nanosecond, with ties away from zero.
	*
	* **Gotchas**
	*
	* If the duration is infinite, it throws an error.
	*
	* **Example** (Reading nanoseconds unsafely)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const duration = Duration.seconds(2)
	* const nanos = Duration.toNanosUnsafe(duration)
	* console.log(nanos) // 2000000000n
	*
	* // Duration.toNanosUnsafe(Duration.infinity)
	* // throws Error: "Cannot convert infinite duration to nanos"
	* ```
	*
	* @category getters
	* @since 4.0.0
	*/
	var toNanosUnsafe = (input) => {
		const self = fromInputUnsafe(input);
		switch (self.value._tag) {
			case "Infinity":
			case "NegativeInfinity": throw new Error("Cannot convert infinite duration to nanos");
			case "Nanos": return self.value.nanos;
			case "Millis": return roundMillisToNanos(self.value.millis);
		}
	};
	/**
	* Pattern matches on the representation of a `Duration`.
	*
	* **Details**
	*
	* Provide handlers for millisecond-backed values, nanosecond-backed values,
	* and positive infinity. Use `onNegativeInfinity` to handle negative infinity
	* separately; otherwise negative infinity is handled by `onInfinity`.
	*
	* **Example** (Pattern matching on duration representations)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const result = Duration.match(Duration.seconds(5), {
	*   onMillis: (millis) => `${millis} milliseconds`,
	*   onNanos: (nanos) => `${nanos} nanoseconds`,
	*   onInfinity: () => "infinite"
	* })
	* console.log(result) // "5000 milliseconds"
	* ```
	*
	* @category pattern matching
	* @since 2.0.0
	*/
	var match$2 = /*#__PURE__*/ dual(2, (self, options) => {
		switch (self.value._tag) {
			case "Millis": return options.onMillis(self.value.millis);
			case "Nanos": return options.onNanos(self.value.nanos);
			case "Infinity": return options.onInfinity();
			case "NegativeInfinity": return (options.onNegativeInfinity ?? options.onInfinity)();
		}
	});
	/**
	* Pattern matches on two `Duration`s, providing handlers that receive both values.
	*
	* **Example** (Pattern matching on duration pairs)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const sum = Duration.matchPair(Duration.seconds(3), Duration.seconds(2), {
	*   onMillis: (a, b) => a + b,
	*   onNanos: (a, b) => Number(a + b),
	*   onInfinity: () => Infinity
	* })
	* console.log(sum) // 5000
	* ```
	*
	* @category pattern matching
	* @since 4.0.0
	*/
	var matchPair = /*#__PURE__*/ dual(3, (self, that, options) => {
		if (self.value._tag === "Infinity" || self.value._tag === "NegativeInfinity" || that.value._tag === "Infinity" || that.value._tag === "NegativeInfinity") return options.onInfinity(self, that);
		if (self.value._tag === "Millis") return that.value._tag === "Millis" ? options.onMillis(self.value.millis, that.value.millis) : options.onNanos(toNanosUnsafe(self), that.value.nanos);
		else return options.onNanos(self.value.nanos, toNanosUnsafe(that));
	});
	/**
	* Provides an `Order` instance for comparing `Duration` values.
	*
	* **Details**
	*
	* `NegativeInfinity` < any finite value < `Infinity`.
	*
	* **Example** (Sorting durations)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const durations = [
	*   Duration.seconds(3),
	*   Duration.seconds(1),
	*   Duration.seconds(2)
	* ]
	* const sorted = durations.sort((a, b) => Duration.Order(a, b))
	* console.log(sorted.map(Duration.toSeconds)) // [1, 2, 3]
	* ```
	*
	* @category instances
	* @since 2.0.0
	*/
	var Order$3 = /*#__PURE__*/ make$12((self, that) => matchPair(self, that, {
		onMillis: (self, that) => self < that ? -1 : self > that ? 1 : 0,
		onNanos: (self, that) => self < that ? -1 : self > that ? 1 : 0,
		onInfinity: (self, that) => {
			if (self.value._tag === that.value._tag) return 0;
			if (self.value._tag === "Infinity") return 1;
			if (self.value._tag === "NegativeInfinity") return -1;
			if (that.value._tag === "Infinity") return -1;
			return 1;
		}
	}));
	/**
	* Provides an `Equivalence` instance for comparing `Duration` values.
	*
	* **Example** (Comparing durations for equivalence)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const isEqual = Duration.Equivalence(Duration.seconds(5), Duration.millis(5000))
	* console.log(isEqual) // true
	* ```
	*
	* @category instances
	* @since 2.0.0
	*/
	var Equivalence$3 = (self, that) => matchPair(self, that, {
		onMillis: (self, that) => self === that,
		onNanos: (self, that) => self === that,
		onInfinity: (self, that) => self.value._tag === that.value._tag
	});
	/**
	* Returns the smaller of two Durations.
	*
	* **Example** (Selecting the shorter duration)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const shorter = Duration.min(Duration.seconds(5), Duration.seconds(3))
	* console.log(Duration.toSeconds(shorter)) // 3
	* ```
	*
	* @category ordering
	* @since 2.0.0
	*/
	var min$1 = /*#__PURE__*/ min$2(Order$3);
	/**
	* Checks whether two Durations are equal.
	*
	* **Example** (Checking duration equality)
	*
	* ```ts
	* import { Duration } from "effect"
	*
	* const isEqual = Duration.equals(Duration.seconds(5), Duration.millis(5000))
	* console.log(isEqual) // true
	* ```
	*
	* @category predicates
	* @since 2.0.0
	*/
	var equals$1 = /*#__PURE__*/ dual(2, (self, that) => Equivalence$3(self, that));
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Filter.js
	/**
	* Composes two filters sequentially, passing the successful output of the first
	* filter to the second.
	*
	* **Details**
	*
	* If either filter fails, the returned filter fails with the original input
	* instead of the intermediate failure value.
	*
	* @category combinators
	* @since 4.0.0
	*/
	var composePassthrough = /*#__PURE__*/ dual(2, (left, right) => (input) => {
		const leftOut = left(input);
		if (isFailure(leftOut)) return fail$3(input);
		const rightOut = right(leftOut.success);
		if (isFailure(rightOut)) return fail$3(input);
		return rightOut;
	});
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Scheduler.js
	/**
	* Controls how runnable Effect fiber tasks are dispatched.
	*
	* A scheduler decides how tasks are queued, when queued tasks run, and when a
	* fiber should pause so other work can continue. This module includes the
	* scheduler service reference, the default `MixedScheduler`, dispatcher types
	* for queued tasks, and references for tuning or disabling automatic scheduler
	* yields.
	*
	* @since 2.0.0
	*/
	/**
	* Context reference for the scheduler used by the Effect runtime.
	*
	* **When to use**
	*
	* Use when you need to replace scheduling behavior globally in tests or runtime
	* setup, such as forcing deterministic task dispatch.
	*
	* **Details**
	*
	* The default value creates a `MixedScheduler`. Provide this service to
	* customize execution mode, task dispatching, or yield behavior.
	*
	* @category references
	* @since 2.0.0
	*/
	var Scheduler = /*#__PURE__*/ Reference("effect/Scheduler", { defaultValue: () => new MixedScheduler() });
	var setImmediate = "setImmediate" in globalThis ? (f) => {
		const timer = globalThis.setImmediate(f);
		return () => globalThis.clearImmediate(timer);
	} : (f) => {
		const timer = setTimeout(f, 0);
		return () => clearTimeout(timer);
	};
	var PriorityBuckets = class {
		buckets = [];
		scheduleTask(task, priority) {
			const buckets = this.buckets;
			const len = buckets.length;
			let bucket;
			let index = 0;
			for (; index < len; index++) {
				if (buckets[index][0] > priority) break;
				bucket = buckets[index];
			}
			if (bucket && bucket[0] === priority) bucket[1].push(task);
			else if (index === len) buckets.push([priority, [task]]);
			else buckets.splice(index, 0, [priority, [task]]);
		}
		drain() {
			const buckets = this.buckets;
			this.buckets = [];
			return buckets;
		}
	};
	/**
	* Provides a scheduler implementation that batches queued tasks and dispatches them by
	* priority.
	*
	* **When to use**
	*
	* Use when you need the default runtime scheduler directly, including a
	* scheduler that batches queued work by priority and preserves FIFO order within
	* each priority.
	*
	* **Details**
	*
	* `MixedScheduler` supports synchronous and asynchronous execution modes, uses
	* operation counts to decide when fibers should yield, and is the default
	* scheduler implementation.
	*
	* @category schedulers
	* @since 2.0.0
	*/
	var MixedScheduler = class {
		executionMode;
		setImmediate;
		constructor(executionMode = "async", setImmediateFn = setImmediate) {
			this.executionMode = executionMode;
			this.setImmediate = setImmediateFn;
		}
		/**
		* Returns whether the fiber has reached its operation budget and should yield.
		*
		* **When to use**
		*
		* Use to decide whether a fiber should yield after consuming its current
		* operation budget.
		*
		* @since 2.0.0
		*/
		shouldYield(fiber) {
			return fiber.currentOpCount >= fiber.maxOpsBeforeYield;
		}
		/**
		* Creates a dispatcher that schedules work through this scheduler.
		*
		* **When to use**
		*
		* Use when you need a standalone dispatcher from a scheduler instance, for
		* example in tests that enqueue tasks and then flush them deterministically.
		*
		* @since 4.0.0
		*/
		makeDispatcher() {
			return new MixedSchedulerDispatcher(this.setImmediate);
		}
	};
	var MixedSchedulerDispatcher = class {
		tasks = /*#__PURE__*/ new PriorityBuckets();
		running = void 0;
		setImmediate;
		constructor(setImmediateFn = setImmediate) {
			this.setImmediate = setImmediateFn;
		}
		/**
		* @since 2.0.0
		*/
		scheduleTask(task, priority) {
			this.tasks.scheduleTask(task, priority);
			if (this.running === void 0) this.running = this.setImmediate(this.afterScheduled);
		}
		/**
		* @since 2.0.0
		*/
		afterScheduled = () => {
			this.running = void 0;
			this.runTasks();
		};
		/**
		* @since 2.0.0
		*/
		runTasks() {
			const buckets = this.tasks.drain();
			for (let i = 0; i < buckets.length; i++) {
				const toRun = buckets[i][1];
				for (let j = 0; j < toRun.length; j++) toRun[j]();
			}
		}
		/**
		* @since 2.0.0
		*/
		flush() {
			while (this.tasks.buckets.length > 0) {
				if (this.running !== void 0) {
					this.running();
					this.running = void 0;
				}
				this.runTasks();
			}
		}
	};
	/**
	* Context reference that controls the maximum number of operations a fiber
	* can perform before yielding control back to the scheduler.
	*
	* **When to use**
	*
	* Use to tune scheduler fairness for CPU-bound fibers by changing the scheduler
	* operation budget that triggers a yield.
	*
	* **Details**
	*
	* The default value is `2048` operations, which balances performance and
	* fairness by helping prevent long-running fibers from monopolizing the
	* execution thread.
	*
	* @see {@link PreventSchedulerYield} for bypassing scheduler yield checks entirely rather than tuning the operation budget
	*
	* @category references
	* @since 4.0.0
	*/
	var MaxOpsBeforeYield = /*#__PURE__*/ Reference("effect/Scheduler/MaxOpsBeforeYield", { defaultValue: () => 2048 });
	/**
	* Context reference that controls whether the runtime should bypass scheduler
	* yield checks. When set to `true`, the fiber run loop won't call
	* `Scheduler.shouldYield`.
	*
	* **When to use**
	*
	* Use to bypass scheduler yield checks for controlled runtime workloads where
	* cooperative yielding should be disabled.
	*
	* **Gotchas**
	*
	* Setting this reference to `true` can let long-running fibers monopolize the
	* JavaScript thread.
	*
	* @see {@link MaxOpsBeforeYield} for tuning yield frequency without disabling yield checks
	* @see {@link Scheduler} for providing custom scheduler yield behavior
	*
	* @category references
	* @since 4.0.0
	*/
	var PreventSchedulerYield = /*#__PURE__*/ Reference("effect/Scheduler/PreventSchedulerYield", { defaultValue: () => false });
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Tracer.js
	/**
	* Defines the low-level tracing model used by Effect.
	*
	* A span records the lifetime of an operation, including its name, parent,
	* attributes, links, annotations, sampling decision, kind, and completion
	* status. The module also defines the tracer service, parent-span context,
	* external span support, trace propagation settings, and the default in-memory
	* span implementation.
	*
	* @since 2.0.0
	*/
	/**
	* Defines the string key for the parent-span context service.
	*
	* **When to use**
	*
	* Use when you need the raw context key for parent span lookup in lower-level
	* tracing code.
	*
	* **Example** (Reading the parent span key)
	*
	* ```ts
	* import { Tracer } from "effect"
	*
	* // The key used to identify parent spans in the context
	* console.log(Tracer.ParentSpanKey) // "effect/Tracer/ParentSpan"
	* ```
	*
	* @category constants
	* @since 4.0.0
	*/
	var ParentSpanKey = "effect/Tracer/ParentSpan";
	Service()(ParentSpanKey);
	/**
	* Defines the string key for the active tracer context reference.
	*
	* **When to use**
	*
	* Use when you need the raw context key for active tracer lookup in lower-level
	* tracing code.
	*
	* @category references
	* @since 4.0.0
	*/
	var TracerKey = "effect/Tracer";
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/metric.js
	/** @internal */
	var FiberRuntimeMetricsKey = "effect/observability/Metric/FiberRuntimeMetricsKey";
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/references.js
	/** @internal */
	var CurrentConcurrency = /*#__PURE__*/ Reference("effect/References/CurrentConcurrency", { defaultValue: () => "unbounded" });
	/** @internal */
	var CurrentStackFrame = /*#__PURE__*/ Reference("effect/References/CurrentStackFrame", { defaultValue: constUndefined });
	/** @internal */
	var CurrentLogAnnotations = /*#__PURE__*/ Reference("effect/References/CurrentLogAnnotations", { defaultValue: () => ({}) });
	/** @internal */
	var CurrentLogLevel = /*#__PURE__*/ Reference("effect/References/CurrentLogLevel", { defaultValue: () => "Info" });
	/** @internal */
	var MinimumLogLevel = /*#__PURE__*/ Reference("effect/References/MinimumLogLevel", { defaultValue: () => "Info" });
	/** @internal */
	var CurrentLogSpans = /*#__PURE__*/ Reference("effect/References/CurrentLogSpans", { defaultValue: () => [] });
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/effect.js
	/** @internal */
	var Interrupt = class extends ReasonBase {
		fiberId;
		constructor(fiberId, annotations = constEmptyAnnotations) {
			super("Interrupt", annotations, "Interrupted");
			this.fiberId = fiberId;
		}
		toString() {
			return `Interrupt(${this.fiberId})`;
		}
		toJSON() {
			return {
				_tag: "Interrupt",
				fiberId: this.fiberId
			};
		}
		[symbol](that) {
			return isInterruptReason(that) && this.fiberId === that.fiberId && this.annotations === that.annotations;
		}
		[symbol$1]() {
			return combine(string$1(`${this._tag}:${this.fiberId}`))(random(this.annotations));
		}
	};
	/** @internal */
	var causeInterrupt = (fiberId) => new CauseImpl([new Interrupt(fiberId)]);
	/** @internal */
	var findError$1 = (self) => {
		for (let i = 0; i < self.reasons.length; i++) {
			const reason = self.reasons[i];
			if (reason._tag === "Fail") return succeed$2(reason.error);
		}
		return fail$3(self);
	};
	/** @internal */
	var hasInterrupts = (self) => self.reasons.some(isInterruptReason);
	/** @internal */
	var causeCombine = /*#__PURE__*/ dual(2, (self, that) => {
		if (self.reasons.length === 0) return that;
		else if (that.reasons.length === 0) return self;
		const newCause = new CauseImpl(union$1(self.reasons, that.reasons));
		return equals$2(self, newCause) ? self : newCause;
	});
	/** @internal */
	var causeMap = /*#__PURE__*/ dual(2, (self, f) => {
		let hasFail = false;
		const failures = self.reasons.map((failure) => {
			if (isFailReason$1(failure)) {
				hasFail = true;
				return new Fail(f(failure.error));
			}
			return failure;
		});
		return hasFail ? causeFromReasons(failures) : self;
	});
	/** @internal */
	var causePartition = (self) => {
		const obj = {
			Fail: [],
			Die: [],
			Interrupt: []
		};
		for (let i = 0; i < self.reasons.length; i++) obj[self.reasons[i]._tag].push(self.reasons[i]);
		return obj;
	};
	/** @internal */
	var causeSquash = (self) => {
		const partitioned = causePartition(self);
		if (partitioned.Fail.length > 0) return partitioned.Fail[0].error;
		else if (partitioned.Die.length > 0) return partitioned.Die[0].defect;
		else if (partitioned.Interrupt.length > 0) return new globalThis.Error("All fibers interrupted without error");
		return new globalThis.Error("Empty cause");
	};
	/** @internal */
	var causePrettyErrors = (self, options) => {
		const errors = [];
		const interrupts = [];
		if (self.reasons.length === 0) return errors;
		const prevStackLimit = getStackTraceLimit();
		setStackTraceLimit(1);
		for (const failure of self.reasons) {
			if (failure._tag === "Interrupt") {
				interrupts.push(failure);
				continue;
			}
			errors.push(causePrettyError(failure._tag === "Die" ? failure.defect : failure.error, failure.annotations, options));
		}
		if (errors.length === 0) {
			const cause = /* @__PURE__ */ new Error("The fiber was interrupted by:");
			cause.name = "InterruptCause";
			cause.stack = interruptCauseStack(cause, interrupts);
			const error = new globalThis.Error("All fibers interrupted without error", { cause });
			error.name = "InterruptError";
			error.stack = `${error.name}: ${error.message}`;
			errors.push(causePrettyError(error, interrupts[0].annotations, options));
		}
		setStackTraceLimit(prevStackLimit);
		return errors;
	};
	/** @internal */
	var causePrettyError = (original, annotations, options) => {
		const kind = typeof original;
		let error;
		if (original && kind === "object") {
			error = new globalThis.Error(causePrettyMessage(original), { cause: original.cause ? causePrettyError(original.cause) : void 0 });
			if (typeof original.name === "string") error.name = original.name;
			if (typeof original.stack === "string") error.stack = cleanErrorStack(original.stack, error, annotations);
			else {
				const stack = `${error.name}: ${error.message}`;
				error.stack = annotations ? addStackAnnotations(stack, annotations) : stack;
			}
			if (options?.includeCauseInStack) error.stack = renderPrettyError(error);
			for (const key of Object.keys(original)) if (!(key in error)) error[key] = original[key];
		} else error = new globalThis.Error(!original ? `Unknown error: ${original}` : kind === "string" ? original : formatJson(original));
		return error;
	};
	var causePrettyMessage = (u) => {
		if (typeof u.message === "string") return u.message;
		else if (typeof u.toString === "function" && u.toString !== Object.prototype.toString && u.toString !== Array.prototype.toString) try {
			return u.toString();
		} catch {}
		return formatJson(u);
	};
	var locationRegExp = /\((.*)\)/g;
	var cleanErrorStack = (stack, error, annotations) => {
		const message = `${error.name}: ${error.message}`;
		const lines = (stack.startsWith(message) ? stack.slice(message.length) : stack).split("\n");
		const out = [message];
		for (let i = 1; i < lines.length; i++) {
			if (/(?:Generator\.next|~effect\/Effect)/.test(lines[i])) break;
			out.push(lines[i]);
		}
		return annotations ? addStackAnnotations(out.join("\n"), annotations) : out.join("\n");
	};
	var addStackAnnotations = (stack, annotations) => {
		const frame = annotations?.get(StackTraceKey.key);
		if (frame) stack = `${stack}\n${currentStackTrace(frame)}`;
		return stack;
	};
	var interruptCauseStack = (error, interrupts) => {
		const out = [`${error.name}: ${error.message}`];
		for (const current of interrupts) {
			const fiberId = current.fiberId !== void 0 ? `#${current.fiberId}` : "unknown";
			const frame = current.annotations.get(InterruptorStackTrace$1.key);
			out.push(`    at fiber (${fiberId})`);
			if (frame) out.push(currentStackTrace(frame));
		}
		return out.join("\n");
	};
	var currentStackTrace = (frame) => {
		const out = [];
		let current = frame;
		let i = 0;
		while (current && i < 10) {
			const stack = current.stack();
			if (stack) {
				const locationMatchAll = stack.matchAll(locationRegExp);
				let match = false;
				for (const [, location] of locationMatchAll) {
					match = true;
					out.push(`    at ${current.name} (${location})`);
				}
				if (!match) out.push(`    at ${current.name} (${stack.replace(/^at /, "")})`);
			} else out.push(`    at ${current.name}`);
			current = current.parent;
			i++;
		}
		return out.join("\n");
	};
	/** @internal */
	var causePretty = (cause) => causePrettyErrors(cause).map(renderPrettyError).join("\n");
	var renderPrettyError = (e) => e.cause ? `${e.stack} {\n${renderErrorCause(e.cause, "  ")}\n}` : e.stack;
	var renderErrorCause = (cause, prefix) => {
		const lines = cause.stack.split("\n");
		let stack = `${prefix}[cause]: ${lines[0]}`;
		for (let i = 1, len = lines.length; i < len; i++) stack += `\n${prefix}${lines[i]}`;
		if (cause.cause) stack += ` {\n${renderErrorCause(cause.cause, `${prefix}  `)}\n${prefix}}`;
		return stack;
	};
	/** @internal */
	var FiberTypeId = `~effect/Fiber/dev`;
	var fiberVariance = {
		_A: identity,
		_E: identity
	};
	var fiberIdStore = { id: 0 };
	/** @internal */
	var getCurrentFiber = () => globalThis[currentFiberTypeId];
	/** @internal */
	var FiberImpl = class {
		constructor(context, interruptible = true) {
			this[FiberTypeId] = fiberVariance;
			this.setContext(context);
			this.id = ++fiberIdStore.id;
			this.currentOpCount = 0;
			this.currentLoopCount = 0;
			this.interruptible = interruptible;
			this._stack = [];
			this._observers = [];
			this._exit = void 0;
			this._children = void 0;
			this._interruptedCause = void 0;
			this._yielded = void 0;
			this.runtimeMetrics?.recordFiberStart(this.context);
		}
		[FiberTypeId];
		id;
		interruptible;
		currentOpCount;
		currentLoopCount;
		_stack;
		_observers;
		_exit;
		_currentExit;
		_children;
		_interruptedCause;
		_yielded;
		context;
		currentScheduler;
		currentTracerContext;
		currentSpan;
		currentLogLevel;
		minimumLogLevel;
		currentStackFrame;
		runtimeMetrics;
		maxOpsBeforeYield;
		currentPreventYield;
		_dispatcher = void 0;
		get currentDispatcher() {
			return this._dispatcher ??= this.currentScheduler.makeDispatcher();
		}
		getRef(ref) {
			return getReferenceUnsafe(this.context, ref);
		}
		addObserver(cb) {
			if (this._exit) {
				cb(this._exit);
				return constVoid;
			}
			this._observers.push(cb);
			return () => {
				const index = this._observers.indexOf(cb);
				if (index >= 0) this._observers.splice(index, 1);
			};
		}
		interruptUnsafe(fiberId, annotations) {
			if (this._exit) return;
			let cause = causeInterrupt(fiberId);
			if (this.currentStackFrame) cause = causeAnnotate(cause, make$11(StackTraceKey, this.currentStackFrame));
			if (annotations) cause = causeAnnotate(cause, annotations);
			this._interruptedCause = this._interruptedCause ? causeCombine(this._interruptedCause, cause) : cause;
			if (this.interruptible) this.evaluate(failCause$1(this._interruptedCause));
		}
		pollUnsafe() {
			return this._exit;
		}
		evaluate(effect) {
			if (this._exit) return;
			else if (this._yielded !== void 0) {
				const yielded = this._yielded;
				this._yielded = void 0;
				yielded();
			}
			const exit = this.runLoop(effect);
			if (exit === Yield) return;
			const interruptChildren = fiberMiddleware.interruptChildren && fiberMiddleware.interruptChildren(this);
			if (interruptChildren !== void 0) return this.evaluate(flatMap$1(interruptChildren, () => exit));
			this._exit = exit;
			this.runtimeMetrics?.recordFiberEnd(this.context, this._exit);
			for (let i = 0; i < this._observers.length; i++) this._observers[i](exit);
			this._observers.length = 0;
		}
		runLoop(effect) {
			const prevFiber = globalThis[currentFiberTypeId];
			globalThis[currentFiberTypeId] = this;
			let yielding = false;
			let current = effect;
			this.currentOpCount = 0;
			const currentLoop = ++this.currentLoopCount;
			try {
				while (true) {
					this.currentOpCount++;
					if (!yielding && !this.currentPreventYield && this.currentScheduler.shouldYield(this)) {
						yielding = true;
						const prev = current;
						current = flatMap$1(yieldNow, () => prev);
					}
					current = this.currentTracerContext ? this.currentTracerContext(current, this) : current[evaluate](this);
					if (currentLoop !== this.currentLoopCount) return Yield;
					else if (current === Yield) {
						const yielded = this._yielded;
						if (ExitTypeId in yielded) {
							this._yielded = void 0;
							return yielded;
						}
						return Yield;
					}
				}
			} catch (error) {
				if (!hasProperty(current, evaluate)) return exitDie(`Fiber.runLoop: Not a valid effect: ${String(current)}`);
				return this.runLoop(exitDie(error));
			} finally {
				globalThis[currentFiberTypeId] = prevFiber;
			}
		}
		getCont(symbol) {
			while (true) {
				const op = this._stack.pop();
				if (!op) return void 0;
				const cont = op[contAll] && op[contAll](this);
				if (cont) {
					cont[symbol] = cont;
					return cont;
				}
				if (op[symbol]) return op;
			}
		}
		yieldWith(value) {
			this._yielded = value;
			return Yield;
		}
		children() {
			return this._children ??= /* @__PURE__ */ new Set();
		}
		pipe() {
			return pipeArguments(this, arguments);
		}
		setContext(context) {
			this.context = context;
			const scheduler = this.getRef(Scheduler);
			if (scheduler !== this.currentScheduler) {
				this.currentScheduler = scheduler;
				this._dispatcher = void 0;
			}
			this.currentSpan = context.mapUnsafe.get(ParentSpanKey);
			this.currentLogLevel = this.getRef(CurrentLogLevel);
			this.minimumLogLevel = this.getRef(MinimumLogLevel);
			this.currentStackFrame = context.mapUnsafe.get(CurrentStackFrame.key);
			this.maxOpsBeforeYield = this.getRef(MaxOpsBeforeYield);
			this.currentPreventYield = this.getRef(PreventSchedulerYield);
			this.runtimeMetrics = context.mapUnsafe.get(FiberRuntimeMetricsKey);
			const currentTracer = context.mapUnsafe.get(TracerKey);
			this.currentTracerContext = currentTracer ? currentTracer["context"] : void 0;
		}
		get currentSpanLocal() {
			return this.currentSpan?._tag === "Span" ? this.currentSpan : void 0;
		}
	};
	var fiberMiddleware = { interruptChildren: void 0 };
	var fiberStackAnnotations = (fiber) => {
		if (!fiber.currentStackFrame) return void 0;
		const annotations = /* @__PURE__ */ new Map();
		annotations.set(StackTraceKey.key, fiber.currentStackFrame);
		return makeUnsafe$5(annotations);
	};
	/** @internal */
	var fiberAwait = (self) => {
		const impl = self;
		if (impl._exit) return succeed$1(impl._exit);
		return callback$1((resume) => {
			if (impl._exit) return resume(succeed$1(impl._exit));
			return sync$1(self.addObserver((exit) => resume(succeed$1(exit))));
		});
	};
	/** @internal */
	var fiberAwaitAll = (self) => callback$1((resume) => {
		const iter = self[Symbol.iterator]();
		const exits = [];
		let cancel = void 0;
		function loop() {
			let result = iter.next();
			while (!result.done) {
				if (result.value._exit) {
					exits.push(result.value._exit);
					result = iter.next();
					continue;
				}
				cancel = result.value.addObserver((exit) => {
					exits.push(exit);
					loop();
				});
				return;
			}
			resume(succeed$1(exits));
		}
		loop();
		return sync$1(() => cancel?.());
	});
	/** @internal */
	var fiberInterrupt = (self) => withFiber$1((fiber) => fiberInterruptAs(self, fiber.id));
	/** @internal */
	var fiberInterruptAs = /*#__PURE__*/ dual((args) => hasProperty(args[0], FiberTypeId), (self, fiberId, annotations) => withFiber$1((parent) => {
		let ann = fiberStackAnnotations(parent);
		ann = ann && annotations ? merge(ann, annotations) : ann ?? annotations;
		self.interruptUnsafe(fiberId, ann);
		return asVoid(fiberAwait(self));
	}));
	/** @internal */
	var fiberInterruptAll = (fibers) => withFiber$1((parent) => {
		const annotations = fiberStackAnnotations(parent);
		for (const fiber of fibers) fiber.interruptUnsafe(parent.id, annotations);
		return asVoid(fiberAwaitAll(fibers));
	});
	/** @internal */
	var succeed$1 = exitSucceed;
	/** @internal */
	var failCause$1 = exitFailCause;
	/** @internal */
	var fail$2 = exitFail;
	/** @internal */
	var sync$1 = /*#__PURE__*/ makePrimitive({
		op: "Sync",
		[evaluate](fiber) {
			const value = this[args]();
			const cont = fiber.getCont(contA);
			return cont ? cont[contA](value, fiber) : fiber.yieldWith(exitSucceed(value));
		}
	});
	/** @internal */
	var suspend$2 = /*#__PURE__*/ makePrimitive({
		op: "Suspend",
		[evaluate](_fiber) {
			return this[args]();
		}
	});
	/** @internal */
	var yieldNow = /*#__PURE__*/ (/* @__PURE__ */ makePrimitive({
		op: "Yield",
		[evaluate](fiber) {
			let resumed = false;
			fiber.currentDispatcher.scheduleTask(() => {
				if (resumed) return;
				fiber.evaluate(exitVoid);
			}, this[args] ?? 0);
			return fiber.yieldWith(() => {
				resumed = true;
			});
		}
	}))(0);
	/** @internal */
	var succeedSome$1 = (a) => succeed$1(some(a));
	/** @internal */
	var succeedNone$1 = /*#__PURE__*/ succeed$1(/*#__PURE__*/ none());
	/** @internal */
	var failCauseSync$1 = (evaluate) => suspend$2(() => failCause$1(internalCall(evaluate)));
	/** @internal */
	var die$1 = (defect) => exitDie(defect);
	/** @internal */
	var failSync = (error) => suspend$2(() => fail$2(internalCall(error)));
	/** @internal */
	var void_$2 = /*#__PURE__*/ succeed$1(void 0);
	/** @internal */
	var try_$1 = (options) => {
		const evaluate = typeof options === "function" ? options : options.try;
		const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.try") : options.catch;
		return suspend$2(() => {
			try {
				return succeed$1(internalCall(evaluate));
			} catch (err) {
				return fail$2(internalCall(() => catcher(err)));
			}
		});
	};
	/** @internal */
	var promise$1 = (evaluate) => callbackOptions(function(resume, signal) {
		internalCall(() => evaluate(signal)).then((a) => resume(succeed$1(a)), (e) => resume(die$1(e)));
	}, evaluate.length !== 0);
	/** @internal */
	var tryPromise$1 = (options) => {
		const f = typeof options === "function" ? options : options.try;
		const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.tryPromise") : options.catch;
		return callbackOptions(function(resume, signal) {
			const failWithCatch = (cause) => {
				try {
					resume(fail$2(internalCall(() => catcher(cause))));
				} catch (err) {
					resume(die$1(err));
				}
			};
			try {
				internalCall(() => f(signal)).then((a) => resume(succeed$1(a)), failWithCatch);
			} catch (err) {
				failWithCatch(err);
			}
		}, f.length !== 0);
	};
	var callbackOptions = /*#__PURE__*/ makePrimitive({
		op: "Async",
		single: false,
		[evaluate](fiber) {
			const register = internalCall(() => this[args][0].bind(fiber.currentScheduler));
			let resumed = false;
			let yielded = false;
			const controller = this[args][1] ? new AbortController() : void 0;
			const onCancel = register((effect) => {
				if (resumed) return;
				resumed = true;
				if (yielded) fiber.evaluate(effect);
				else yielded = effect;
			}, controller?.signal);
			if (yielded !== false) return yielded;
			yielded = true;
			fiber._yielded = () => {
				resumed = true;
			};
			if (controller === void 0 && onCancel === void 0) return Yield;
			fiber._stack.push(asyncFinalizer(() => {
				resumed = true;
				controller?.abort();
				return onCancel ?? exitVoid;
			}));
			return Yield;
		}
	});
	var asyncFinalizer = /*#__PURE__*/ makePrimitive({
		op: "AsyncFinalizer",
		[contAll](fiber) {
			if (fiber.interruptible) {
				fiber.interruptible = false;
				fiber._stack.push(setInterruptibleTrue);
			}
		},
		[contE](cause, _fiber) {
			return hasInterrupts(cause) ? flatMap$1(this[args](), () => failCause$1(cause)) : failCause$1(cause);
		}
	});
	/** @internal */
	var callback$1 = (register) => callbackOptions(register, register.length >= 2);
	/** @internal */
	var never$1 = /*#__PURE__*/ callback$1(constVoid);
	/** @internal */
	var gen$1 = (...args) => suspend$2(() => fromIteratorUnsafe(args.length === 1 ? args[0]() : args[1].call(args[0].self)));
	/** @internal */
	var fnUntraced = (body, ...pipeables) => {
		const fn = pipeables.length === 0 ? function() {
			return suspend$2(() => fromIteratorUnsafe(body.apply(this, arguments)));
		} : function() {
			let effect = suspend$2(() => fromIteratorUnsafe(body.apply(this, arguments)));
			for (let i = 0; i < pipeables.length; i++) effect = pipeables[i](effect, ...arguments);
			return effect;
		};
		return defineFunctionLength(body.length, fn);
	};
	var defineFunctionLength = (length, fn) => Object.defineProperty(fn, "length", {
		value: length,
		configurable: true
	});
	/** @internal */
	var fnUntracedEager$1 = (body, ...pipeables) => defineFunctionLength(body.length, pipeables.length === 0 ? function() {
		return fromIteratorEagerUnsafe(() => body.apply(this, arguments));
	} : function() {
		let effect = fromIteratorEagerUnsafe(() => body.apply(this, arguments));
		for (const pipeable of pipeables) effect = pipeable(effect);
		return effect;
	});
	var fromIteratorEagerUnsafe = (evaluate) => {
		try {
			const iterator = evaluate();
			let value = void 0;
			while (true) {
				const state = iterator.next(value);
				if (state.done) return succeed$1(state.value);
				const primitive = state.value;
				if (primitive && primitive._tag === "Success") {
					value = primitive.value;
					continue;
				} else if (primitive && primitive._tag === "Failure") return state.value;
				else {
					let isFirstExecution = true;
					return suspend$2(() => {
						if (isFirstExecution) {
							isFirstExecution = false;
							return flatMap$1(state.value, (value) => fromIteratorUnsafe(iterator, value));
						} else return suspend$2(() => fromIteratorUnsafe(evaluate()));
					});
				}
			}
		} catch (error) {
			return die$1(error);
		}
	};
	var fromIteratorUnsafe = /*#__PURE__*/ makePrimitive({
		op: "Iterator",
		single: false,
		[contA](value, fiber) {
			const iter = this[args][0];
			while (true) {
				const state = iter.next(value);
				if (state.done) return succeed$1(state.value);
				if (!effectIsExit(state.value)) {
					fiber._stack.push(this);
					return state.value;
				} else if (state.value._tag === "Failure") return state.value;
				value = state.value.value;
			}
		},
		[evaluate](fiber) {
			return this[contA](this[args][1], fiber);
		}
	});
	/** @internal */
	var as$1 = /*#__PURE__*/ dual(2, (self, value) => {
		const b = succeed$1(value);
		return flatMap$1(self, (_) => b);
	});
	/** @internal */
	var asSome = (self) => map$2(self, some);
	/** @internal */
	var andThen$1 = /*#__PURE__*/ dual(2, (self, f) => flatMap$1(self, (a) => isEffect(f) ? f : internalCall(() => f(a))));
	/** @internal */
	var tap$1 = /*#__PURE__*/ dual(2, (self, f) => flatMap$1(self, (a) => as$1(isEffect(f) ? f : internalCall(() => f(a)), a)));
	/** @internal */
	var asVoid = (self) => flatMap$1(self, (_) => exitVoid);
	/** @internal */
	var raceAllFirst = (all, options) => withFiber$1((parent) => callback$1((resume) => {
		let done = false;
		const fibers = /* @__PURE__ */ new Set();
		const onExit = (exit) => {
			done = true;
			resume(fibers.size === 0 ? exit : flatMap$1(uninterruptible(fiberInterruptAll(fibers)), () => exit));
		};
		let i = 0;
		for (const effect of all) {
			if (done) break;
			const index = i++;
			const fiber = forkUnsafe$1(parent, effect, true, true, false);
			fibers.add(fiber);
			fiber.addObserver((exit) => {
				fibers.delete(fiber);
				const isWinner = !done;
				onExit(exit);
				if (isWinner && options?.onWinner) options.onWinner({
					fiber,
					index,
					parentFiber: parent
				});
			});
		}
		return fiberInterruptAll(fibers);
	}));
	/** @internal */
	var raceFirst = /*#__PURE__*/ dual((args) => isEffect(args[1]), (self, that, options) => raceAllFirst([self, that], options));
	/** @internal */
	var flatMap$1 = /*#__PURE__*/ dual(2, (self, f) => {
		const onSuccess = Object.create(OnSuccessProto);
		onSuccess[args] = self;
		onSuccess[contA] = f.length !== 1 ? (a) => f(a) : f;
		return onSuccess;
	});
	var OnSuccessProto = /*#__PURE__*/ makePrimitiveProto({
		op: "OnSuccess",
		[evaluate](fiber) {
			fiber._stack.push(this);
			return this[args];
		}
	});
	/** @internal */
	var effectIsExit = (effect) => ExitTypeId in effect;
	/** @internal */
	var flatMapEager$1 = /*#__PURE__*/ dual(2, (self, f) => {
		if (effectIsExit(self)) return self._tag === "Success" ? f(self.value) : self;
		return flatMap$1(self, f);
	});
	/** @internal */
	var flatten$1 = (self) => flatMap$1(self, identity);
	/** @internal */
	var map$2 = /*#__PURE__*/ dual(2, (self, f) => flatMap$1(self, (a) => succeed$1(internalCall(() => f(a)))));
	/** @internal */
	var mapEager$1 = /*#__PURE__*/ dual(2, (self, f) => effectIsExit(self) ? exitMap(self, f) : map$2(self, f));
	/** @internal */
	var exitIsSuccess = (self) => self._tag === "Success";
	/** @internal */
	var exitVoid = /*#__PURE__*/ exitSucceed(void 0);
	/** @internal */
	var exitMap = /*#__PURE__*/ dual(2, (self, f) => self._tag === "Success" ? exitSucceed(f(self.value)) : self);
	/** @internal */
	var exitAsVoidAll = (exits) => {
		const failures = [];
		for (const exit of exits) if (exit._tag === "Failure") failures.push(...exit.cause.reasons);
		return failures.length === 0 ? exitVoid : exitFailCause(causeFromReasons(failures));
	};
	/** @internal */
	var updateContext = /*#__PURE__*/ dual(2, (self, f) => withFiber$1((fiber) => {
		const prevContext = fiber.context;
		const nextContext = f(prevContext);
		if (prevContext === nextContext) return self;
		fiber.setContext(nextContext);
		return onExitPrimitive(self, () => {
			fiber.setContext(prevContext);
		});
	}));
	/** @internal */
	var provideContext$1 = /*#__PURE__*/ dual(2, (self, context) => {
		if (effectIsExit(self)) return self;
		return updateContext(self, merge(context));
	});
	/** @internal */
	var provideService = function() {
		if (arguments.length === 1) return dual(2, (self, impl) => provideServiceImpl(self, arguments[0], impl));
		return dual(3, (self, service, impl) => provideServiceImpl(self, service, impl)).apply(this, arguments);
	};
	var provideServiceImpl = (self, service, implementation) => updateContext(self, (s) => {
		if (s.mapUnsafe.get(service.key) === implementation) return s;
		return add(s, service, implementation);
	});
	/** @internal */
	var forever$2 = /*#__PURE__*/ dual((args) => isEffect(args[0]), (self, options) => whileLoop({
		while: constTrue,
		body: constant(options?.disableYield ? self : flatMap$1(self, (_) => yieldNow)),
		step: constVoid
	}));
	/** @internal */
	var catchCause$1 = /*#__PURE__*/ dual(2, (self, f) => {
		const onFailure = Object.create(OnFailureProto);
		onFailure[args] = self;
		onFailure[contE] = f.length !== 1 ? (cause) => f(cause) : f;
		return onFailure;
	});
	var OnFailureProto = /*#__PURE__*/ makePrimitiveProto({
		op: "OnFailure",
		[evaluate](fiber) {
			fiber._stack.push(this);
			return this[args];
		}
	});
	/** @internal */
	var catchCauseFilter = /*#__PURE__*/ dual(3, (self, filter, f) => catchCause$1(self, (cause) => {
		const eb = filter(cause);
		return isFailure(eb) ? failCause$1(eb.failure) : internalCall(() => f(eb.success, cause));
	}));
	/** @internal */
	var catch_$1 = /*#__PURE__*/ dual(2, (self, f) => catchCauseFilter(self, findError$1, (e) => f(e)));
	/** @internal */
	var tapCauseFilter = /*#__PURE__*/ dual(3, (self, filter, f) => catchCause$1(self, (cause) => {
		const result = filter(cause);
		if (isFailure(result)) return failCause$1(cause);
		return andThen$1(internalCall(() => f(result.success, cause)), failCause$1(cause));
	}));
	/** @internal */
	var tapError$1 = /*#__PURE__*/ dual(2, (self, f) => tapCauseFilter(self, findError$1, (e) => f(e)));
	/** @internal */
	var mapError$1 = /*#__PURE__*/ dual(2, (self, f) => catch_$1(self, (error) => failSync(() => f(error))));
	/** @internal */
	var result$1 = (self) => matchEager(self, {
		onFailure: fail$3,
		onSuccess: succeed$2
	});
	/** @internal */
	var matchCauseEffect = /*#__PURE__*/ dual(2, (self, options) => {
		const primitive = Object.create(OnSuccessAndFailureProto);
		primitive[args] = self;
		primitive[contA] = options.onSuccess.length !== 1 ? (a) => options.onSuccess(a) : options.onSuccess;
		primitive[contE] = options.onFailure.length !== 1 ? (cause) => options.onFailure(cause) : options.onFailure;
		return primitive;
	});
	var OnSuccessAndFailureProto = /*#__PURE__*/ makePrimitiveProto({
		op: "OnSuccessAndFailure",
		[evaluate](fiber) {
			fiber._stack.push(this);
			return this[args];
		}
	});
	/** @internal */
	var matchEffect$2 = /*#__PURE__*/ dual(2, (self, options) => matchCauseEffect(self, {
		onFailure: (cause) => {
			const fail = cause.reasons.find(isFailReason$1);
			return fail ? internalCall(() => options.onFailure(fail.error)) : failCause$1(cause);
		},
		onSuccess: options.onSuccess
	}));
	/** @internal */
	var match$1 = /*#__PURE__*/ dual(2, (self, options) => matchEffect$2(self, {
		onFailure: (error) => sync$1(() => options.onFailure(error)),
		onSuccess: (value) => sync$1(() => options.onSuccess(value))
	}));
	/** @internal */
	var matchEager = /*#__PURE__*/ dual(2, (self, options) => {
		if (effectIsExit(self)) {
			if (self._tag === "Success") return exitSucceed(options.onSuccess(self.value));
			const error = findError$1(self.cause);
			if (isFailure(error)) return self;
			return exitSucceed(options.onFailure(error.success));
		}
		return match$1(self, options);
	});
	/** @internal */
	var exit$1 = (self) => effectIsExit(self) ? exitSucceed(self) : exitPrimitive(self);
	var exitPrimitive = /*#__PURE__*/ makePrimitive({
		op: "Exit",
		[evaluate](fiber) {
			fiber._stack.push(this);
			return this[args];
		},
		[contA](value, _, exit) {
			return succeed$1(exit ?? exitSucceed(value));
		},
		[contE](cause, _, exit) {
			return succeed$1(exit ?? exitFailCause(cause));
		}
	});
	/** @internal */
	var timeoutOrElse$1 = /*#__PURE__*/ dual(2, (self, options) => raceFirst(self, flatMap$1(sleep$1(options.duration), options.orElse)));
	/** @internal */
	var ScopeTypeId = "~effect/Scope";
	/** @internal */
	var ScopeCloseableTypeId = "~effect/Scope/Closeable";
	/** @internal */
	var scopeClose = (self, exit_) => suspend$2(() => scopeCloseUnsafe(self, exit_) ?? void_$2);
	/** @internal */
	var scopeCloseUnsafe = (self, exit_) => {
		if (self.state._tag === "Closed") return;
		const closed = {
			_tag: "Closed",
			exit: exit_
		};
		if (self.state._tag === "Empty") {
			self.state = closed;
			return;
		}
		const { finalizers } = self.state;
		self.state = closed;
		if (finalizers.size === 0) return;
		else if (finalizers.size === 1) return finalizers.values().next().value(exit_);
		return scopeCloseFinalizers(self, finalizers, exit_);
	};
	var scopeCloseFinalizers = /*#__PURE__*/ fnUntraced(function* (self, finalizers, exit_) {
		let exits = [];
		const fibers = [];
		const arr = Array.from(finalizers.values());
		const parent = getCurrentFiber();
		for (let i = arr.length - 1; i >= 0; i--) {
			const finalizer = arr[i];
			if (self.strategy === "sequential") exits.push(yield* exit$1(finalizer(exit_)));
			else fibers.push(forkUnsafe$1(parent, finalizer(exit_), true, true, "inherit"));
		}
		if (fibers.length > 0) exits = yield* fiberAwaitAll(fibers);
		return yield* exitAsVoidAll(exits);
	});
	/** @internal */
	var scopeForkUnsafe = (scope, finalizerStrategy) => {
		const newScope = scopeMakeUnsafe(finalizerStrategy);
		if (scope.state._tag === "Closed") {
			newScope.state = scope.state;
			return newScope;
		}
		const key = {};
		scopeAddFinalizerUnsafe(scope, key, (exit) => scopeClose(newScope, exit));
		scopeAddFinalizerUnsafe(newScope, key, (_) => sync$1(() => scopeRemoveFinalizerUnsafe(scope, key)));
		return newScope;
	};
	/** @internal */
	var scopeAddFinalizerExit = (scope, finalizer) => {
		return suspend$2(() => {
			if (scope.state._tag === "Closed") return finalizer(scope.state.exit);
			scopeAddFinalizerUnsafe(scope, {}, finalizer);
			return void_$2;
		});
	};
	/** @internal */
	var scopeAddFinalizerUnsafe = (scope, key, finalizer) => {
		if (scope.state._tag === "Empty") scope.state = {
			_tag: "Open",
			finalizers: /* @__PURE__ */ new Map([[key, finalizer]])
		};
		else if (scope.state._tag === "Open") scope.state.finalizers.set(key, finalizer);
	};
	/** @internal */
	var scopeRemoveFinalizerUnsafe = (scope, key) => {
		if (scope.state._tag === "Open") scope.state.finalizers.delete(key);
	};
	/** @internal */
	var scopeMakeUnsafe = (finalizerStrategy = "sequential") => ({
		[ScopeCloseableTypeId]: ScopeCloseableTypeId,
		[ScopeTypeId]: ScopeTypeId,
		strategy: finalizerStrategy,
		state: constScopeEmpty
	});
	var constScopeEmpty = { _tag: "Empty" };
	/** @internal */
	var onExitPrimitive = /*#__PURE__*/ makePrimitive({
		op: "OnExit",
		single: false,
		[evaluate](fiber) {
			fiber._stack.push(this);
			return this[args][0];
		},
		[contAll](fiber) {
			if (fiber.interruptible && this[args][2] !== true) {
				fiber._stack.push(setInterruptibleTrue);
				fiber.interruptible = false;
			}
		},
		[contA](value, _, exit) {
			exit ??= exitSucceed(value);
			const eff = this[args][1](exit);
			return eff ? flatMap$1(eff, (_) => exit) : exit;
		},
		[contE](cause, _, exit) {
			exit ??= exitFailCause(cause);
			const eff = this[args][1](exit);
			return eff ? flatMap$1(eff, (_) => exit) : exit;
		}
	});
	/** @internal */
	var onExit = /*#__PURE__*/ dual(2, onExitPrimitive);
	/** @internal */
	var uninterruptible = (self) => withFiber$1((fiber) => {
		if (!fiber.interruptible) return self;
		fiber.interruptible = false;
		fiber._stack.push(setInterruptibleTrue);
		return self;
	});
	var setInterruptible = /*#__PURE__*/ makePrimitive({
		op: "SetInterruptible",
		[contAll](fiber) {
			fiber.interruptible = this[args];
			if (fiber._interruptedCause && fiber.interruptible) return () => failCause$1(fiber._interruptedCause);
		}
	});
	var setInterruptibleTrue = /*#__PURE__*/ setInterruptible(true);
	var setInterruptibleFalse = /*#__PURE__*/ setInterruptible(false);
	/** @internal */
	var interruptible = (self) => withFiber$1((fiber) => {
		if (fiber.interruptible) return self;
		fiber.interruptible = true;
		fiber._stack.push(setInterruptibleFalse);
		if (fiber._interruptedCause) return failCause$1(fiber._interruptedCause);
		return self;
	});
	/** @internal */
	var uninterruptibleMask$1 = (f) => withFiber$1((fiber) => {
		if (!fiber.interruptible) return f(identity);
		fiber.interruptible = false;
		fiber._stack.push(setInterruptibleTrue);
		return f(interruptible);
	});
	/** @internal */
	var all$1 = (arg, options) => {
		if (isIterable(arg)) return options?.mode === "result" ? forEach(arg, result$1, options) : forEach(arg, identity, options);
		else if (options?.discard) return options.mode === "result" ? forEach(Object.values(arg), result$1, options) : forEach(Object.values(arg), identity, options);
		return suspend$2(() => {
			const out = {};
			return as$1(forEach(Object.entries(arg), ([key, effect]) => map$2(options?.mode === "result" ? result$1(effect) : effect, (value) => {
				out[key] = value;
			}), {
				discard: true,
				concurrency: options?.concurrency
			}), out);
		});
	};
	/** @internal */
	var whileLoop = /*#__PURE__*/ makePrimitive({
		op: "While",
		[contA](value, fiber) {
			this[args].step(value);
			if (this[args].while()) {
				fiber._stack.push(this);
				return this[args].body();
			}
			return exitVoid;
		},
		[evaluate](fiber) {
			if (this[args].while()) {
				fiber._stack.push(this);
				return this[args].body();
			}
			return exitVoid;
		}
	});
	/** @internal */
	var forEach = /*#__PURE__*/ dual((args) => typeof args[1] === "function", (iterable, f, options) => withFiber$1((parent) => {
		const concurrencyOption = options?.concurrency === "inherit" ? parent.getRef(CurrentConcurrency) : options?.concurrency ?? 1;
		const concurrency = concurrencyOption === "unbounded" ? Number.POSITIVE_INFINITY : Math.max(1, concurrencyOption);
		if (concurrency === 1) return forEachSequential(iterable, f, options);
		const items = fromIterable(iterable);
		let length = items.length;
		if (length === 0) return options?.discard ? void_$2 : succeed$1([]);
		const out = options?.discard ? void 0 : new Array(length);
		const eff = forEachConcurrent({
			f,
			out
		}, items, { concurrency });
		return eff ? as$1(eff, out) : succeed$1(out);
	}));
	var forEachSequential = (iterable, f, options) => suspend$2(() => {
		const out = options?.discard ? void 0 : [];
		const iterator = iterable[Symbol.iterator]();
		let state = iterator.next();
		let index = 0;
		return as$1(whileLoop({
			while: () => !state.done,
			body: () => f(state.value, index++),
			step: (b) => {
				if (out) out.push(b);
				state = iterator.next();
			}
		}), out);
	});
	var iterateEagerImpl = (options) => {
		const onItem = options.onItem;
		const step = options.step;
		return (state, items, opts) => {
			let index = opts?.start ?? 0;
			const end = opts?.end ?? items.length;
			const concurrency = opts?.concurrency ?? 1;
			const orderedStep = opts?.orderedStep === true && concurrency > 1;
			let done = false;
			let parentFiber;
			let fibers;
			let resume;
			let interrupted = false;
			let terminal;
			let effect;
			let nextIndex = index;
			const exits = orderedStep ? new Array(end) : void 0;
			const runStep = (item, exit, currentIndex) => {
				if (!orderedStep) return step(state, item, exit, currentIndex);
				if (terminal) return terminal;
				exits[currentIndex] = exit;
				while (nextIndex < end) {
					const nextExit = exits[nextIndex];
					if (nextExit === void 0) return;
					exits[nextIndex] = void 0;
					const index = nextIndex++;
					const result = step(state, items[index], nextExit, index);
					if (result) return result;
				}
			};
			const go = () => {
				let paused = false;
				for (; !terminal && index < end; index++) {
					const item = items[index];
					const eff = effect ?? onItem(state, item, index);
					if (effectIsExit(eff)) {
						terminal = runStep(item, eff, index);
						if (terminal) break;
					} else if (concurrency === 1) return flatMap$1(exit$1(eff), (exit) => {
						terminal = runStep(item, exit, index);
						index++;
						return terminal ?? go() ?? void_$2;
					});
					else if (!parentFiber) return callback$1((cb) => {
						parentFiber = getCurrentFiber();
						effect = eff;
						resume = cb;
						const result = go();
						if (result) return cb(result);
						return suspend$2(() => {
							terminal = exitVoid;
							interrupted = true;
							return fibers ? fiberInterruptAll(fibers) : void_$2;
						});
					});
					else {
						effect = void 0;
						const fiber = forkUnsafe$1(parentFiber, eff, true, true, "inherit");
						if (fiber._exit) {
							terminal = runStep(item, fiber._exit, index);
							if (terminal) break;
							continue;
						}
						if (fibers) fibers.add(fiber);
						else fibers = /* @__PURE__ */ new Set([fiber]);
						const currentIndex = index;
						fiber.addObserver((exit) => {
							fibers.delete(fiber);
							if (terminal) {
								if (!interrupted && exit._tag === "Failure") for (const reason of exit.cause.reasons) if (reason._tag === "Interrupt") continue;
								else if (terminal._tag === "Failure") terminal.cause.reasons.push(reason);
								else terminal = exitFailCause(causeFromReasons([reason]));
							} else {
								const result = runStep(item, exit, currentIndex);
								if (result) {
									terminal = result._tag === "Failure" ? exitFailCause(causeFromReasons(result.cause.reasons.slice())) : result;
									go();
								}
							}
							if (paused) {
								const eff = go();
								if (eff) resume(eff);
							} else if (done && fibers.size === 0) resume(terminal ?? void_$2);
						});
						if (fibers.size < concurrency) continue;
						paused = true;
						index++;
						return;
					}
				}
				done = true;
				if (terminal) {
					if (fibers && fibers.size > 0) {
						const annotations = fiberStackAnnotations(parentFiber);
						fibers.forEach((f) => f.interruptUnsafe(parentFiber.id, annotations));
						return;
					}
					if (resume || terminal._tag === "Failure") return terminal;
				} else if (resume) {
					if (!fibers) return exitVoid;
					else if (fibers.size === 0) resume(void_$2);
				}
			};
			return go();
		};
	};
	/** @internal */
	var iterateEager = () => iterateEagerImpl;
	var forEachConcurrent = /*#__PURE__*/ iterateEagerImpl({
		onItem(state, item, index) {
			return state.f(item, index);
		},
		step(state, _, exit, index) {
			if (exit._tag === "Failure") return exit;
			else if (state.out) state.out[index] = exit.value;
		}
	});
	/** @internal */
	var forkUnsafe$1 = (parent, effect, immediate = false, daemon = false, uninterruptible = false) => {
		const interruptible = uninterruptible === "inherit" ? parent.interruptible : !uninterruptible;
		const child = new FiberImpl(parent.context, interruptible);
		if (immediate) child.evaluate(effect);
		else parent.currentDispatcher.scheduleTask(() => child.evaluate(effect), 0);
		if (!daemon && !child._exit) {
			parent.children().add(child);
			child.addObserver(() => parent._children.delete(child));
		}
		return child;
	};
	/** @internal */
	var runForkWith$1 = (context) => (effect, options) => {
		const fiber = new FiberImpl(options?.scheduler ? add(context, Scheduler, options.scheduler) : context, options?.uninterruptible !== true);
		fiber.evaluate(effect);
		if (fiber._exit) return fiber;
		if (options?.signal) if (options.signal.aborted) fiber.interruptUnsafe();
		else {
			const abort = () => fiber.interruptUnsafe();
			options.signal.addEventListener("abort", abort, { once: true });
			fiber.addObserver(() => options.signal.removeEventListener("abort", abort));
		}
		if (options?.onFiberStart) options.onFiberStart(fiber);
		return fiber;
	};
	/** @internal */
	var fiberRunIn = /*#__PURE__*/ dual(2, (self, scope) => {
		if (self._exit) return self;
		else if (scope.state._tag === "Closed") {
			self.interruptUnsafe(self.id);
			return self;
		}
		const key = {};
		scopeAddFinalizerUnsafe(scope, key, () => fiberInterrupt(self));
		self.addObserver(() => scopeRemoveFinalizerUnsafe(scope, key));
		return self;
	});
	/** @internal */
	var runFork$1 = /*#__PURE__*/ runForkWith$1(/*#__PURE__*/ empty$1());
	/** @internal */
	var runCallbackWith$1 = (context) => {
		const runFork = runForkWith$1(context);
		return (effect, options) => {
			const fiber = runFork(effect, options);
			if (options?.onExit) fiber.addObserver(options.onExit);
			return (interruptor) => {
				return fiber.interruptUnsafe(interruptor);
			};
		};
	};
	/** @internal */
	var runCallback$1 = /*#__PURE__*/ runCallbackWith$1(/*#__PURE__*/ empty$1());
	/** @internal */
	var runPromiseExitWith$1 = (context) => {
		const runFork = runForkWith$1(context);
		return (effect, options) => {
			const fiber = runFork(effect, options);
			return new Promise((resolve) => {
				fiber.addObserver((exit) => resolve(exit));
			});
		};
	};
	/** @internal */
	var runPromiseExit$1 = /*#__PURE__*/ runPromiseExitWith$1(/*#__PURE__*/ empty$1());
	/** @internal */
	var runPromiseWith$1 = (context) => {
		const runPromiseExit = runPromiseExitWith$1(context);
		return (effect, options) => runPromiseExit(effect, options).then((exit) => {
			if (exit._tag === "Failure") throw causeSquash(exit.cause);
			return exit.value;
		});
	};
	/** @internal */
	var runPromise$1 = /*#__PURE__*/ runPromiseWith$1(/*#__PURE__*/ empty$1());
	/** @internal */
	var runSyncExitWith$1 = (context) => {
		const runFork = runForkWith$1(context);
		return (effect) => {
			if (effectIsExit(effect)) return effect;
			const scheduler = new MixedScheduler("sync");
			const fiber = runFork(effect, { scheduler });
			fiber.currentDispatcher?.flush();
			return fiber._exit ?? exitDie(new AsyncFiberError(fiber));
		};
	};
	/** @internal */
	var runSyncExit$1 = /*#__PURE__*/ runSyncExitWith$1(/*#__PURE__*/ empty$1());
	/** @internal */
	var runSyncWith$1 = (context) => {
		const runSyncExit = runSyncExitWith$1(context);
		return (effect) => {
			const exit = runSyncExit(effect);
			if (exit._tag === "Failure") throw causeSquash(exit.cause);
			return exit.value;
		};
	};
	/** @internal */
	var runSync$1 = /*#__PURE__*/ runSyncWith$1(/*#__PURE__*/ empty$1());
	/** @internal */
	var ClockRef = /*#__PURE__*/ Reference("effect/Clock", { defaultValue: () => new ClockImpl() });
	var MAX_TIMER_MILLIS = 2 ** 31 - 1;
	var ClockImpl = class {
		currentTimeMillisUnsafe() {
			return Date.now();
		}
		currentTimeMillis = /*#__PURE__*/ sync$1(() => this.currentTimeMillisUnsafe());
		currentTimeNanosUnsafe() {
			return processOrPerformanceNow();
		}
		currentTimeNanos = /*#__PURE__*/ sync$1(() => this.currentTimeNanosUnsafe());
		sleep(duration) {
			return this.sleepMillis(toMillis(duration));
		}
		sleepMillis(millis) {
			if (millis <= 0) return yieldNow;
			else if (!Number.isFinite(millis)) return never$1;
			return callback$1((resume) => {
				const continuation = millis > MAX_TIMER_MILLIS ? this.sleepMillis(millis - MAX_TIMER_MILLIS) : void_$2;
				const handle = setTimeout(() => resume(continuation), Math.min(millis, MAX_TIMER_MILLIS));
				return sync$1(() => clearTimeout(handle));
			});
		}
	};
	var performanceNowNanos = /*#__PURE__*/ function() {
		const bigint1e6 = /*#__PURE__*/ BigInt(1e6);
		if (typeof performance === "undefined" || typeof performance.now === "undefined") return () => BigInt(Date.now()) * bigint1e6;
		let origin;
		return () => {
			origin ??= BigInt(Date.now()) * bigint1e6 - BigInt(Math.round(performance.now() * 1e6));
			return origin + BigInt(Math.round(performance.now() * 1e6));
		};
	}();
	var processOrPerformanceNow = /*#__PURE__*/ function() {
		const processHrtime = typeof process === "object" && "hrtime" in process && typeof process.hrtime.bigint === "function" ? process.hrtime : void 0;
		if (!processHrtime) return performanceNowNanos;
		const origin = /*#__PURE__*/ BigInt(/*#__PURE__*/ Date.now()) * /*#__PURE__*/ BigInt(1e6) - /*#__PURE__*/ processHrtime.bigint();
		return () => origin + processHrtime.bigint();
	}();
	/** @internal */
	var clockWith = (f) => withFiber$1((fiber) => f(fiber.getRef(ClockRef)));
	/** @internal */
	var sleep$1 = (duration) => clockWith((clock) => clock.sleep(fromInputUnsafe(duration)));
	/** @internal */
	var currentTimeMillis$1 = /*#__PURE__*/ clockWith((clock) => clock.currentTimeMillis);
	TaggedError$1("TimeoutError");
	TaggedError$1("IllegalArgumentError");
	TaggedError$1("ExceededCapacityError");
	/** @internal */
	var AsyncFiberErrorTypeId = "~effect/Cause/AsyncFiberError";
	/** @internal */
	var AsyncFiberError = class extends TaggedError$1("AsyncFiberError") {
		[AsyncFiberErrorTypeId] = AsyncFiberErrorTypeId;
		constructor(fiber) {
			super({
				message: "An asynchronous Effect was executed with Effect.runSync",
				fiber
			});
		}
	};
	/** @internal */
	var UnknownErrorTypeId = "~effect/Cause/UnknownError";
	/** @internal */
	var UnknownError = class extends TaggedError$1("UnknownError") {
		[UnknownErrorTypeId] = UnknownErrorTypeId;
		constructor(cause, message) {
			super({
				message,
				cause
			});
		}
	};
	/** @internal */
	var ConsoleRef = /*#__PURE__*/ Reference("effect/Console/CurrentConsole", { defaultValue: () => globalThis.console });
	/** @internal */
	var logLevelToOrder = (level) => {
		switch (level) {
			case "All": return Number.MIN_SAFE_INTEGER;
			case "Fatal": return 5e4;
			case "Error": return 4e4;
			case "Warn": return 3e4;
			case "Info": return 2e4;
			case "Debug": return 1e4;
			case "Trace": return 0;
			case "None": return Number.MAX_SAFE_INTEGER;
		}
	};
	/** @internal */
	var isLogLevelGreaterThan = /*#__PURE__*/ isGreaterThan$1(/* @__PURE__ */ mapInput(Number$4, logLevelToOrder));
	/** @internal */
	var CurrentLoggers = /*#__PURE__*/ Reference("effect/Loggers/CurrentLoggers", { defaultValue: () => /* @__PURE__ */ new Set([defaultLogger, tracerLogger]) });
	/** @internal */
	var LogToStderr = /*#__PURE__*/ Reference("effect/Logger/LogToStderr", { defaultValue: constFalse });
	var LoggerProto = {
		["~effect/Logger"]: {
			_Message: identity,
			_Output: identity
		},
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	/** @internal */
	var loggerMake = (log) => {
		const self = Object.create(LoggerProto);
		self.log = log;
		return self;
	};
	/**
	* Sanitize a given string by replacing spaces, equal signs, and double quotes
	* with underscores.
	*
	* @internal
	*/
	var formatLabel = (key) => key.replace(/[\s="]/g, "_");
	/**
	* Formats a log span into a `<label>=<value>ms` string.
	*
	* @internal
	*/
	var formatLogSpan = (self, now) => {
		return `${formatLabel(self[0])}=${now - self[1]}ms`;
	};
	/** @internal */
	var logWithLevel = (level) => (...message) => {
		let cause = void 0;
		for (let i = 0, len = message.length; i < len; i++) {
			const msg = message[i];
			if (isCause(msg)) {
				if (cause) message.splice(i, 1);
				else message = message.slice(0, i).concat(message.slice(i + 1));
				cause = cause ? causeFromReasons(cause.reasons.concat(msg.reasons)) : msg;
				i--;
			}
		}
		if (cause === void 0) cause = causeEmpty;
		return withFiber$1((fiber) => {
			const logLevel = level ?? fiber.currentLogLevel;
			if (isLogLevelGreaterThan(fiber.minimumLogLevel, logLevel)) return void_$2;
			const clock = fiber.getRef(ClockRef);
			const loggers = fiber.getRef(CurrentLoggers);
			if (loggers.size > 0) {
				const date = new Date(clock.currentTimeMillisUnsafe());
				for (const logger of loggers) logger.log({
					cause,
					fiber,
					date,
					logLevel,
					message
				});
			}
			return void_$2;
		});
	};
	var colors = {
		bold: "1",
		red: "31",
		green: "32",
		yellow: "33",
		blue: "34",
		cyan: "36",
		white: "37",
		gray: "90",
		black: "30",
		bgBrightRed: "101"
	};
	colors.gray, colors.blue, colors.green, colors.yellow, colors.red, colors.bgBrightRed, colors.black;
	var defaultDateFormat = (date) => `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}.${date.getMilliseconds().toString().padStart(3, "0")}`;
	/** @internal */
	var defaultLogger = /*#__PURE__*/ loggerMake(({ cause, date, fiber, logLevel, message }) => {
		const message_ = Array.isArray(message) ? message.slice() : [message];
		if (cause.reasons.length > 0) message_.push(causePretty(cause));
		const now = date.getTime();
		const spans = fiber.getRef(CurrentLogSpans);
		let spanString = "";
		for (const span of spans) spanString += ` ${formatLogSpan(span, now)}`;
		const annotations = fiber.getRef(CurrentLogAnnotations);
		if (Object.keys(annotations).length > 0) message_.push(annotations);
		const console = fiber.getRef(ConsoleRef);
		(fiber.getRef(LogToStderr) ? console.error : console.log)(`[${defaultDateFormat(date)}] ${logLevel.toUpperCase()} (#${fiber.id})${spanString}:`, ...message_);
	});
	/** @internal */
	var tracerLogger = /*#__PURE__*/ loggerMake(({ cause, fiber, logLevel, message }) => {
		const clock = fiber.getRef(ClockRef);
		const annotations = fiber.getRef(CurrentLogAnnotations);
		const span = fiber.currentSpan;
		if (span === void 0 || span._tag === "ExternalSpan") return;
		const attributes = {};
		for (const [key, value] of Object.entries(annotations)) attributes[key] = value;
		attributes["effect.fiberId"] = fiber.id;
		attributes["effect.logLevel"] = logLevel.toUpperCase();
		if (cause.reasons.length > 0) attributes["effect.cause"] = causePretty(cause);
		span.event(toStringUnknown(Array.isArray(message) && message.length === 1 ? message[0] : message), clock.currentTimeNanosUnsafe(), attributes);
	});
	/** @internal */
	var undefined_$1 = /*#__PURE__*/ succeed$1(void 0);
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Clock.js
	/**
	* Returns an Effect that succeeds with the current time in milliseconds.
	*
	* **When to use**
	*
	* Use to read wall-clock time from the active Clock service with millisecond
	* precision.
	*
	* **Example** (Reading milliseconds)
	*
	* ```ts
	* import { Clock, Effect } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   const currentTime = yield* Clock.currentTimeMillis
	*   console.log(`Current time: ${currentTime}ms`)
	*   return currentTime
	* })
	* ```
	*
	* @see {@link currentTimeNanos} for nanosecond precision
	* @see {@link clockWith} for accessing the full Clock service
	*
	* @category constructors
	* @since 2.0.0
	*/
	var currentTimeMillis = currentTimeMillis$1;
	/**
	* Creates a tagged error class with a `_tag` discriminator.
	*
	* **When to use**
	*
	* Use when you need domain errors with discriminated-union handling.
	*
	* **Details**
	*
	* Like {@link Error}, but instances also carry a `readonly _tag` property,
	* enabling `Effect.catchTag` and `Effect.catchTags` for tag-based recovery.
	* The `_tag` is excluded from the constructor argument. Yielding an instance
	* inside `Effect.gen` fails the effect with this error.
	*
	* **Example** (Recovering by tag)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class NotFound extends Data.TaggedError("NotFound")<{
	*   readonly resource: string
	* }> {}
	*
	* class Forbidden extends Data.TaggedError("Forbidden")<{
	*   readonly reason: string
	* }> {}
	*
	* const program = Effect.gen(function*() {
	*   return yield* new NotFound({ resource: "/users/42" })
	* })
	*
	* const recovered = program.pipe(
	*   Effect.catchTag("NotFound", (e) =>
	*     Effect.succeed(`missing: ${e.resource}`))
	* )
	* ```
	*
	* @see {@link Error} — without a `_tag`
	* @see {@link TaggedClass} — tagged class that is not an error
	*
	* @category constructors
	* @since 2.0.0
	*/
	var TaggedError = TaggedError$1;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Exit.js
	/**
	* Creates a failed Exit from a Cause.
	*
	* **When to use**
	*
	* Use when you already have a `Cause<E>` and want to wrap it in an Exit
	* for advanced error handling where you need full control over the Cause
	* structure.
	*
	* **Details**
	*
	* Returns a `Failure<never, E>`. If you only have an error value, use
	* {@link fail} instead.
	*
	* **Example** (Creating a failed Exit from a Cause)
	*
	* ```ts
	* import { Cause, Exit } from "effect"
	*
	* const cause = Cause.fail("Something went wrong")
	* const exit = Exit.failCause(cause)
	* console.log(Exit.isFailure(exit)) // true
	* ```
	*
	* @see {@link fail} to create a Failure from a plain error value
	* @see {@link die} to create a Failure from a defect
	*
	* @category constructors
	* @since 2.0.0
	*/
	var failCause = exitFailCause;
	/**
	* Creates a failed Exit from a typed error value.
	*
	* **When to use**
	*
	* Use when you need to represent an expected typed failure as an `Exit`.
	*
	* **Details**
	*
	* The error is wrapped in a `Cause.Fail` internally.
	*
	* Returns a `Failure<never, E>`.
	*
	* **Example** (Creating a failed Exit)
	*
	* ```ts
	* import { Exit } from "effect"
	*
	* const exit = Exit.fail("Something went wrong")
	* console.log(Exit.isFailure(exit)) // true
	* ```
	*
	* @see {@link succeed} to create a successful Exit
	* @see {@link die} to create a Failure from an unexpected defect
	* @see {@link failCause} to create a Failure from a full Cause
	*
	* @category constructors
	* @since 2.0.0
	*/
	var fail$1 = exitFail;
	var void_$1 = exitVoid;
	/**
	* Checks whether an Exit is a Success.
	*
	* **When to use**
	*
	* Use as a type guard to narrow `Exit<A, E>` to `Success<A, E>` and access the
	* `value` property.
	*
	* **Example** (Narrowing to success)
	*
	* ```ts
	* import { Exit } from "effect"
	*
	* const exit = Exit.succeed(42)
	*
	* if (Exit.isSuccess(exit)) {
	*   console.log(exit.value) // 42
	* }
	* ```
	*
	* @see {@link isFailure} for the opposite check
	* @see {@link match} for exhaustive pattern matching
	*
	* @category guards
	* @since 2.0.0
	*/
	var isSuccess = exitIsSuccess;
	var DeferredProto = {
		["~effect/Deferred"]: {
			_A: identity,
			_E: identity
		},
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	/**
	* Creates an empty `Deferred` synchronously outside the `Effect` runtime.
	*
	* **When to use**
	*
	* Use to allocate a `Deferred` synchronously when direct allocation outside
	* `Effect` is required.
	*
	* **Example** (Creating a Deferred unsafely)
	*
	* ```ts
	* import { Deferred } from "effect"
	*
	* const deferred = Deferred.makeUnsafe<number>()
	* console.log(deferred)
	* ```
	*
	* @category unsafe
	* @since 4.0.0
	*/
	var makeUnsafe$4 = () => {
		const self = Object.create(DeferredProto);
		self.resumes = void 0;
		self.effect = void 0;
		return self;
	};
	var _await = (self) => callback$1((resume) => {
		if (self.effect) return resume(self.effect);
		self.resumes ??= [];
		self.resumes.push(resume);
		return sync$1(() => {
			const index = self.resumes.indexOf(resume);
			self.resumes.splice(index, 1);
		});
	});
	/**
	* Completes the `Deferred` with the specified `Exit` value, which will be
	* propagated to all fibers waiting on the value of the `Deferred`.
	*
	* **When to use**
	*
	* Use to complete a `Deferred` from an already computed `Exit`.
	*
	* **Details**
	*
	* The returned effect succeeds with `true` when this call completed the
	* `Deferred`, or `false` if it was already completed.
	*
	* **Example** (Completing a Deferred with an Exit)
	*
	* ```ts
	* import { Deferred, Effect, Exit } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   const deferred = yield* Deferred.make<number>()
	*   yield* Deferred.done(deferred, Exit.succeed(42))
	*
	*   const value = yield* Deferred.await(deferred)
	*   console.log(value) // 42
	* })
	* ```
	*
	* @see {@link complete} for completing from an effect and memoizing its result
	* @see {@link completeWith} for storing an effect directly
	* @see {@link succeed} for completing with a success value
	* @see {@link failCause} for completing with a failure cause
	*
	* @category completion
	* @since 2.0.0
	*/
	var done$1 = /* @__PURE__ */ dual(2, (self, effect) => sync$1(() => doneUnsafe(self, effect)));
	/**
	* Attempts to complete the `Deferred` synchronously with the specified
	* completion effect.
	*
	* **When to use**
	*
	* Use to complete a `Deferred` synchronously in low-level code that already has
	* the completion effect.
	*
	* **Details**
	*
	* This mutates the `Deferred` directly and should be reserved for low-level
	* code; prefer the effectful completion APIs when possible. Returns `true` if
	* this call completed the `Deferred`, or `false` if it was already completed.
	*
	* **Example** (Completing a Deferred unsafely)
	*
	* ```ts
	* import { Deferred, Effect } from "effect"
	*
	* const deferred = Deferred.makeUnsafe<number>()
	* const success = Deferred.doneUnsafe(deferred, Effect.succeed(42))
	* console.log(success) // true
	* ```
	*
	* @category unsafe
	* @since 4.0.0
	*/
	var doneUnsafe = (self, effect) => {
		if (self.effect) return false;
		self.effect = effect;
		if (self.resumes) {
			for (let i = 0; i < self.resumes.length; i++) self.resumes[i](effect);
			self.resumes = void 0;
		}
		return true;
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Scope.js
	/**
	* Controls how long resources stay open.
	*
	* A scope is a lifetime boundary. Code can register cleanup effects on it, and
	* closing the scope runs those cleanups with the `Exit` value that ended the
	* work. Most application code uses higher-level APIs such as `Effect.scoped`
	* and `Layer`, while this module is useful when code needs to create, provide,
	* fork, close, or inspect scopes directly.
	*
	* @since 2.0.0
	*/
	/**
	* Creates a new `Scope` synchronously without wrapping it in an `Effect`.
	* This is useful when you need a scope immediately but should be used with caution
	* as it doesn't provide the same safety guarantees as the `Effect`-wrapped version.
	*
	* **When to use**
	*
	* Use when a scope must be allocated synchronously and the caller will close it
	* manually.
	*
	* **Example** (Creating a scope synchronously)
	*
	* ```ts
	* import { Console, Effect, Exit, Scope } from "effect"
	*
	* // Create a scope immediately
	* const scope = Scope.makeUnsafe("sequential")
	*
	* // Use it in an Effect program
	* const program = Effect.gen(function*() {
	*   yield* Scope.addFinalizer(scope, Console.log("Cleanup"))
	*   yield* Scope.close(scope, Exit.void)
	* })
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var makeUnsafe$3 = scopeMakeUnsafe;
	/**
	* Creates a closeable child scope synchronously and registers it with a parent scope.
	*
	* **When to use**
	*
	* Use when a child scope must be created synchronously and the caller controls
	* both parent and child scope lifetimes.
	*
	* **Details**
	*
	* Closing the parent closes the child with the same exit value, and closing the
	* child detaches it from the parent. The optional finalizer strategy configures
	* the child scope and defaults to `"sequential"` when omitted.
	*
	* **Example** (Creating a child scope synchronously)
	*
	* ```ts
	* import { Console, Effect, Exit, Scope } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   const parentScope = Scope.makeUnsafe("sequential")
	*   const childScope = Scope.forkUnsafe(parentScope, "parallel")
	*
	*   // Add finalizers to both scopes
	*   yield* Scope.addFinalizer(parentScope, Console.log("Parent cleanup"))
	*   yield* Scope.addFinalizer(childScope, Console.log("Child cleanup"))
	*
	*   // Close child first, then parent
	*   yield* Scope.close(childScope, Exit.void)
	*   yield* Scope.close(parentScope, Exit.void)
	* })
	* ```
	*
	* @category combinators
	* @since 4.0.0
	*/
	var forkUnsafe = scopeForkUnsafe;
	/**
	* Closes a scope and runs its registered finalizers.
	*
	* **When to use**
	*
	* Use to close a scope manually with a specific exit value.
	*
	* **Details**
	*
	* Finalizers run in the scope's configured order and receive the supplied
	* `Exit`.
	*
	* **Example** (Running scope finalizers)
	*
	* ```ts
	* import { Console, Effect, Exit, Scope } from "effect"
	*
	* const resourceManagement = Effect.gen(function*() {
	*   const scope = yield* Scope.make("sequential")
	*
	*   // Add multiple finalizers
	*   yield* Scope.addFinalizer(scope, Console.log("Close database connection"))
	*   yield* Scope.addFinalizer(scope, Console.log("Close file handle"))
	*   yield* Scope.addFinalizer(scope, Console.log("Release memory"))
	*
	*   // Do some work...
	*   yield* Console.log("Performing operations...")
	*
	*   // Close scope - finalizers run in reverse order of registration
	*   yield* Scope.close(scope, Exit.succeed("Success!"))
	*   // Output: "Release memory", "Close file handle", "Close database connection"
	* })
	* ```
	*
	* @category combinators
	* @since 2.0.0
	*/
	var close = scopeClose;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Layer.js
	var TypeId$11 = "~effect/Layer";
	var MemoMapTypeId = "~effect/Layer/MemoMap";
	var memoMapReuse = (entry, scope) => {
		entry.observers++;
		return andThen$1(scopeAddFinalizerExit(scope, (exit) => entry.finalizer(exit)), entry.effect);
	};
	var LayerProto = {
		[TypeId$11]: {
			_ROut: identity,
			_E: identity,
			_RIn: identity
		},
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	var fromBuildUnsafe = (build) => {
		const self = Object.create(LayerProto);
		self.build = build;
		return self;
	};
	var memoMapBuild = (memoMap, layer, scope, build) => {
		const layerScope = makeUnsafe$3();
		const deferred = makeUnsafe$4();
		const entry = {
			observers: 1,
			effect: _await(deferred),
			finalizer: (exit) => suspend$2(() => {
				entry.observers--;
				if (entry.observers === 0) {
					memoMap.map.delete(layer);
					return close(layerScope, exit);
				}
				return void_$2;
			})
		};
		memoMap.map.set(layer, entry);
		return scopeAddFinalizerExit(scope, entry.finalizer).pipe(flatMap$1(() => build(memoMap, layerScope)), onExit((exit) => {
			entry.effect = exit;
			return done$1(deferred, exit);
		}));
	};
	var MemoMapImpl = class {
		get [MemoMapTypeId]() {
			return MemoMapTypeId;
		}
		parent;
		constructor(parent) {
			this.parent = parent;
		}
		map = /*#__PURE__*/ new Map();
		get(layer, scope) {
			const local = this.map.get(layer);
			if (local) return memoMapReuse(local, scope);
			return this.parent?.get(layer, scope);
		}
		getOrElseMemoize(layer, scope, build) {
			const existing = this.get(layer, scope);
			if (existing) return existing;
			return memoMapBuild(this, layer, scope, build);
		}
	};
	/**
	* Constructs a `MemoMap` synchronously so it can be used to build additional layers.
	*
	* **Example** (Creating a memo map unsafely)
	*
	* ```ts
	* import { Context, Effect, Layer } from "effect"
	*
	* class Database extends Context.Service<Database, {
	*   readonly query: (sql: string) => Effect.Effect<string>
	* }>()("Database") {}
	*
	* // Create a memo map for manual layer building
	* const program = Effect.gen(function*() {
	*   const memoMap = Layer.makeMemoMapUnsafe()
	*   const scope = yield* Effect.scope
	*
	*   const dbLayer = Layer.succeed(Database, {
	*     query: Effect.fn("Database.query")((sql: string) => Effect.succeed("result"))
	*   })
	*   const context = yield* Layer.buildWithMemoMap(dbLayer, memoMap, scope)
	*
	*   return Context.get(context, Database)
	* })
	* ```
	*
	* @category memo map
	* @since 4.0.0
	*/
	var makeMemoMapUnsafe = () => new MemoMapImpl();
	/**
	* Constructs a child `MemoMap` synchronously, allowing it to reuse layers
	* already memoized in the parent while isolating any new layer allocations to
	* the child map.
	*
	* **When to use**
	*
	* Use to synchronously fork a memo map for manual layer building when child
	* builds should see parent memoized layers without writing newly built layers
	* back to the parent.
	*
	* @see {@link forkMemoMap} for allocating the child memo map inside `Effect`
	* @see {@link makeMemoMapUnsafe} for creating a root memo map without a parent
	*
	* @category memo map
	* @since 4.0.0
	*/
	var forkMemoMapUnsafe = (parent) => new MemoMapImpl(parent);
	/**
	* Context service for the current `MemoMap` used in layer construction.
	*
	* **When to use**
	*
	* Use when building custom layer operations that need to access the current
	* memoization map from the fiber context.
	*
	* **Details**
	*
	* This service wraps a `MemoMap` as a `Context.Service`, making it available
	* for dependency injection during layer construction.
	*
	* @see {@link MemoMap} the memoization map type wrapped by this service
	*
	* @category models
	* @since 3.13.0
	*/
	var CurrentMemoMap = class CurrentMemoMap extends Service()("effect/Layer/CurrentMemoMap") {
		static forkOrCreate(self) {
			const current = getOrUndefined(self, CurrentMemoMap);
			return current ? forkMemoMapUnsafe(current) : makeMemoMapUnsafe();
		}
	};
	/**
	* Builds a layer into an `Effect` value, using the specified `MemoMap` to memoize
	* the layer construction.
	*
	* **Example** (Building layers with an explicit memo map)
	*
	* ```ts
	* import { Context, Effect, Layer } from "effect"
	*
	* class Database extends Context.Service<Database, {
	*   readonly query: (sql: string) => Effect.Effect<string>
	* }>()("Database") {}
	*
	* class Logger extends Context.Service<Logger, {
	*   readonly log: (msg: string) => Effect.Effect<void>
	* }>()("Logger") {}
	*
	* // Build layers with explicit memoization control
	* const program = Effect.gen(function*() {
	*   const memoMap = yield* Layer.makeMemoMap
	*   const scope = yield* Effect.scope
	*
	*   // Build database layer with memoization
	*   const dbLayer = Layer.succeed(Database, {
	*     query: Effect.fn("Database.query")((sql: string) => Effect.succeed("result"))
	*   })
	*   const dbContext = yield* Layer.buildWithMemoMap(dbLayer, memoMap, scope)
	*
	*   // Build logger layer with same memoization (reuses memo if same layer)
	*   const loggerLayer = Layer.succeed(Logger, {
	*     log: Effect.fn("Logger.log")((msg: string) => Effect.sync(() => console.log(msg)))
	*   })
	*   const loggerContext = yield* Layer.buildWithMemoMap(
	*     loggerLayer,
	*     memoMap,
	*     scope
	*   )
	*
	*   return {
	*     database: Context.get(dbContext, Database),
	*     logger: Context.get(loggerContext, Logger)
	*   }
	* })
	* ```
	*
	* @category memo map
	* @since 2.0.0
	*/
	var buildWithMemoMap = /*#__PURE__*/ dual(3, (self, memoMap, scope) => provideService(map$2(self.build(memoMap, scope), add(CurrentMemoMap, memoMap)), CurrentMemoMap, memoMap));
	/**
	* Constructs a layer that provides all services in an already available
	* `Context`.
	*
	* **When to use**
	*
	* Use when you need a `Layer` built from an existing `Context`, including when
	* you need to provide multiple services at once.
	*
	* **Details**
	*
	* This is a more general version of `succeed` that allows you to provide
	* multiple services at once through a `Context`.
	*
	* **Example** (Providing multiple services from a context)
	*
	* ```ts
	* import { Context, Effect, Layer } from "effect"
	*
	* class Database extends Context.Service<Database, {
	*   readonly query: (sql: string) => Effect.Effect<string>
	* }>()("Database") {}
	*
	* class Logger extends Context.Service<Logger, {
	*   readonly log: (msg: string) => Effect.Effect<void>
	* }>()("Logger") {}
	*
	* const context = Context.make(Database, {
	*   query: Effect.fn("Database.query")((sql: string) => Effect.succeed("result"))
	* }).pipe(
	*   Context.add(Logger, {
	*     log: (msg: string) => Effect.sync(() => console.log(msg))
	*   })
	* )
	*
	* const layer = Layer.succeedContext(context)
	* ```
	*
	* @see {@link succeed} for providing a single service from a value
	*
	* @category constructors
	* @since 2.0.0
	*/
	var succeedContext = (context) => fromBuildUnsafe(constant(succeed$1(context)));
	/**
	* An empty layer that provides no services, cannot fail, has no requirements,
	* and performs no construction or finalization work.
	*
	* **When to use**
	*
	* Use as the no-op branch when conditionally composing layers.
	*
	* **Example** (Disabling optional lifecycle work)
	*
	* ```ts
	* import { Console, Layer } from "effect"
	*
	* declare const flag: boolean
	*
	* const StartupLogLive = flag
	*   ? Layer.effectDiscard(Console.log("application starting"))
	*   : Layer.empty
	* ```
	*
	* @see {@link effectDiscard} for running an effect while providing no services
	*
	* @category constructors
	* @since 2.0.0
	*/
	var empty = /*#__PURE__*/ succeedContext(/*#__PURE__*/ empty$1());
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Cause.js
	/**
	* Records the full reason an `Effect` failed.
	*
	* A `Cause<E>` can contain typed failures, unexpected defects, interruptions,
	* and annotations. Keeping those details together lets code inspect or format
	* failures without first collapsing them to a single error value. This module
	* includes the `Cause` and `Reason` data types, helpers for building and
	* checking causes, and small error types used by several Effect APIs.
	*
	* @since 2.0.0
	*/
	/**
	* Narrows a `Reason` to `Fail`.
	*
	* **When to use**
	*
	* Use as a predicate for `Array.filter` to pick out typed `Fail` reasons when
	* iterating over `cause.reasons`.
	*
	* **Example** (Filtering fail reasons)
	*
	* ```ts
	* import { Cause } from "effect"
	*
	* const cause = Cause.fail("error")
	* const fails = cause.reasons.filter(Cause.isFailReason)
	* console.log(fails[0].error) // "error"
	* ```
	*
	* @see {@link isDieReason} — narrow to `Die`
	* @see {@link isInterruptReason} — narrow to `Interrupt`
	*
	* @category guards
	* @since 4.0.0
	*/
	var isFailReason = isFailReason$1;
	/**
	* Transforms the typed error values inside a `Cause` using the
	* provided function. Only `Fail` reasons are affected; `Die` and `Interrupt`
	* reasons pass through unchanged.
	*
	* **When to use**
	*
	* Use to transform expected typed failures while preserving defects and
	* interruptions unchanged.
	*
	* **Details**
	*
	* If at least one `Fail` reason exists, this returns a new `Cause`
	* containing the mapped failures. If the cause has no `Fail` reasons, the
	* original cause is returned unchanged.
	*
	* **Example** (Mapping errors to uppercase)
	*
	* ```ts
	* import { Cause } from "effect"
	*
	* const cause = Cause.fail("error")
	* const mapped = Cause.map(cause, (e) => e.toUpperCase())
	* const reason = mapped.reasons[0]
	* if (Cause.isFailReason(reason)) {
	*   console.log(reason.error) // "ERROR"
	* }
	* ```
	*
	* @category mapping
	* @since 2.0.0
	*/
	var map$1 = causeMap;
	/**
	* Returns a `Result` whose success value is the first typed error value `E`
	* from a `Fail` reason in the cause. If the cause has no `Fail` reason,
	* the failure value is the original cause narrowed to `Cause<never>`, because
	* it contains no typed error reasons.
	*
	* **When to use**
	*
	* Use when you need the first typed error value from a `Cause` as a `Result`
	* that preserves the original cause when no match is found.
	*
	* **Example** (Extracting the first error value)
	*
	* ```ts
	* import { Cause, Result } from "effect"
	*
	* const result = Cause.findError(Cause.fail("error"))
	* if (!Result.isFailure(result)) {
	*   console.log(result.success) // "error"
	* }
	* ```
	*
	* @see {@link findFail} — extract the full `Fail` reason
	* @see {@link findErrorOption} — `Option`-based variant
	*
	* @category filtering
	* @since 4.0.0
	*/
	var findError = findError$1;
	/**
	* Checks whether an arbitrary value is a `Done` signal.
	*
	* **Example** (Checking the runtime type)
	*
	* ```ts
	* import { Cause } from "effect"
	*
	* console.log(Cause.isDone(Cause.Done())) // true
	* console.log(Cause.isDone("not done"))   // false
	* ```
	*
	* @category guards
	* @since 4.0.0
	*/
	var isDone = isDone$1;
	/**
	* Creates an Effect that fails with a `Done` error. Shorthand for
	* `Effect.fail(Cause.Done(value))`.
	*
	* **When to use**
	*
	* Use when you model stream or queue completion through the error channel.
	*
	* **Example** (Failing with Done)
	*
	* ```ts
	* import { Cause, Effect } from "effect"
	*
	* const program = Cause.done("finished")
	*
	* Effect.runPromiseExit(program).then((exit) => {
	*   console.log(exit._tag) // "Failure"
	* })
	* ```
	*
	* @see {@link Done} — create the signal value without an Effect
	*
	* @category constructors
	* @since 4.0.0
	*/
	var done = done$2;
	Service()("effect/Cause/StackTrace");
	Service()("effect/Cause/InterruptorStackTrace");
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/dateTime.js
	/** @internal */
	var TypeId$10 = "~effect/time/DateTime";
	/** @internal */
	var TimeZoneTypeId = "~effect/time/DateTime/TimeZone";
	var Proto = {
		[TypeId$10]: TypeId$10,
		pipe() {
			return pipeArguments(this, arguments);
		},
		[NodeInspectSymbol]() {
			return this.toString();
		},
		toJSON() {
			return toDateUtc$1(this).toJSON();
		}
	};
	({ ...Proto });
	({ ...Proto });
	var ProtoTimeZone = {
		[TimeZoneTypeId]: TimeZoneTypeId,
		[NodeInspectSymbol]() {
			return this.toString();
		}
	};
	({ ...ProtoTimeZone });
	({ ...ProtoTimeZone });
	/** @internal */
	var toDateUtc$1 = (self) => new Date(self.epochMilliseconds);
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/random.js
	/** @internal */
	var Random = /*#__PURE__*/ Reference("effect/Random", { defaultValue: () => ({
		nextIntUnsafe() {
			return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER + 1)) + Number.MIN_SAFE_INTEGER;
		},
		nextDoubleUnsafe() {
			return Math.random();
		}
	}) });
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Pull.js
	/**
	* Models one low-level pull step for stream-like consumers.
	*
	* A `Pull<A, E, Done, R>` is an `Effect` that can produce one `A`, fail with an
	* ordinary error `E`, or signal end-of-input with `Cause.Done<Done>`. The
	* separate done signal lets low-level consumers distinguish normal completion
	* from failure. This module includes type extractors and helpers for detecting,
	* filtering, catching, converting, and matching done signals separately from
	* ordinary failures.
	*
	* @since 4.0.0
	*/
	/**
	* Handles `Cause.Done` failures in an effect while leaving ordinary failures
	* in the error channel.
	*
	* **When to use**
	*
	* Use to recover from a `Cause.Done` completion signal in an effect, such as
	* turning a pull leftover value into a successful recovery effect while
	* preserving ordinary failures.
	*
	* **Details**
	*
	* The handler receives the done leftover value and may recover with a new
	* effect. Non-done errors are preserved.
	*
	* @see {@link matchEffect} for handling success, ordinary failure, and done outcomes explicitly
	* @see {@link filterDoneLeftover} for extracting a done leftover from an existing `Cause`
	*
	* @category Done
	* @since 4.0.0
	*/
	var catchDone = /*#__PURE__*/ dual(2, (effect, f) => catchCauseFilter(effect, filterDoneLeftover, (l) => f(l)));
	/**
	* Finds a `Cause.Done` failure in a `Cause`.
	*
	* **When to use**
	*
	* Use to separate `Cause.Done` completion from ordinary causes while preserving
	* the typed done value.
	*
	* **Details**
	*
	* Returns a successful `Result` with the `Cause.Done` value when one is
	* present, otherwise returns a failed `Result` containing the non-done cause.
	*
	* @category Done
	* @since 4.0.0
	*/
	var filterDone = /*#__PURE__*/ composePassthrough(findError, (e) => isDone(e) ? succeed$2(e) : fail$3(e));
	/**
	* Filters a Cause to extract the leftover value from done errors.
	*
	* **When to use**
	*
	* Use to extract only the leftover value carried by a `Cause.Done` completion
	* signal.
	*
	* @category Done
	* @since 4.0.0
	*/
	var filterDoneLeftover = /*#__PURE__*/ composePassthrough(findError, (e) => isDone(e) ? succeed$2(e.value) : fail$3(e));
	/**
	* Pattern matches on a Pull, handling success, failure, and done cases.
	*
	* **When to use**
	*
	* Use to handle all three `Pull` outcomes with effectful handlers.
	*
	* **Example** (Matching Pull outcomes)
	*
	* ```ts
	* import { Cause, Effect, Pull } from "effect"
	*
	* const pull = Cause.done("stream ended")
	*
	* const result = Pull.matchEffect(pull, {
	*   onSuccess: (value) => Effect.succeed(`Got value: ${value}`),
	*   onFailure: (cause) => Effect.succeed(`Got error: ${cause}`),
	*   onDone: (leftover) => Effect.succeed(`Stream halted with: ${leftover}`)
	* })
	* ```
	*
	* @category pattern matching
	* @since 4.0.0
	*/
	var matchEffect$1 = /*#__PURE__*/ dual(2, (self, options) => matchCauseEffect(self, {
		onSuccess: options.onSuccess,
		onFailure: (cause) => {
			const halt = filterDone(cause);
			return !isFailure(halt) ? options.onDone(halt.success.value) : options.onFailure(halt.failure);
		}
	}));
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Schedule.js
	var TypeId$9 = "~effect/Schedule";
	var randomNext = /*#__PURE__*/ Random.useSync((random) => random.nextDoubleUnsafe());
	/**
	* Context reference containing metadata for the currently running schedule step.
	*
	* **Details**
	*
	* Repeat, retry, stream, and channel scheduling operations provide this service
	* to effects run between schedule steps. The default value contains undefined
	* input and output values, zero duration, and zeroed timing fields before any
	* schedule step has produced metadata.
	*
	* @category metadata
	* @since 4.0.0
	*/
	var CurrentMetadata = /*#__PURE__*/ Reference("effect/Schedule/CurrentMetadata", { defaultValue: /*#__PURE__*/ constant({
		input: void 0,
		output: void 0,
		duration: zero$1,
		attempt: 0,
		start: 0,
		now: 0,
		elapsed: 0,
		elapsedSincePrevious: 0
	}) });
	var ScheduleProto = {
		[TypeId$9]: {
			_Out: identity,
			_In: identity,
			_Env: identity
		},
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	/**
	* Type guard that checks if a value is a Schedule.
	*
	* **Example** (Checking for schedules)
	*
	* ```ts
	* import { Schedule } from "effect"
	*
	* const schedule = Schedule.exponential("100 millis")
	* const notSchedule = { foo: "bar" }
	*
	* console.log(Schedule.isSchedule(schedule)) // true
	* console.log(Schedule.isSchedule(notSchedule)) // false
	* console.log(Schedule.isSchedule(null)) // false
	* console.log(Schedule.isSchedule(undefined)) // false
	* ```
	*
	* @category guards
	* @since 2.0.0
	*/
	var isSchedule = (u) => hasProperty(u, TypeId$9);
	/**
	* Creates a Schedule from a step function that returns a Pull.
	*
	* **Example** (Creating a custom schedule from a step function)
	*
	* ```ts
	* import { Cause, Duration, Effect, Schedule } from "effect"
	*
	* const schedule = Schedule.fromStep(Effect.sync(() => {
	*   let count = 0
	*
	*   return (_now: number, _input: string) => {
	*     if (count >= 3) {
	*       return Cause.done(count)
	*     }
	*     return Effect.succeed([count++, Duration.millis(100)] as [number, Duration.Duration])
	*   }
	* }))
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var fromStep = (step) => {
		const self = Object.create(ScheduleProto);
		self.step = step;
		return self;
	};
	var metadataFn = () => {
		let n = 0;
		let previous;
		let start;
		return (now, input) => {
			if (start === void 0) start = now;
			const elapsed = now - start;
			const elapsedSincePrevious = previous === void 0 ? 0 : now - previous;
			previous = now;
			return {
				input,
				attempt: ++n,
				start,
				now,
				elapsed,
				elapsedSincePrevious
			};
		};
	};
	/**
	* Creates a Schedule from a step function that receives metadata about the schedule's execution.
	*
	* **Example** (Creating a metadata-aware schedule)
	*
	* ```ts
	* import { Cause, Duration, Effect, Schedule } from "effect"
	*
	* const firstThreeInputs = Schedule.fromStepWithMetadata(Effect.succeed((metadata: Schedule.InputMetadata<string>) => {
	*   if (metadata.attempt > 3) {
	*     return Cause.done("finished")
	*   }
	*
	*   return Effect.succeed([
	*     `attempt ${metadata.attempt}: ${metadata.input}`,
	*     Duration.millis(250)
	*   ] as [string, Duration.Duration])
	* }))
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var fromStepWithMetadata = (step) => fromStep(map$2(step, (f) => {
		const meta = metadataFn();
		return (now, input) => f(meta(now, input));
	}));
	/**
	* Extracts the step function from a Schedule.
	*
	* **Example** (Extracting a schedule step function)
	*
	* ```ts
	* import { Effect, Schedule } from "effect"
	*
	* // Extract step function from an existing schedule
	* const schedule = Schedule.exponential("100 millis").pipe(Schedule.upTo({ times: 3 }))
	*
	* const program = Effect.gen(function*() {
	*   const stepFn = yield* Schedule.toStep(schedule)
	*
	*   // Use the step function directly for custom logic. The timestamp is
	*   // supplied by the caller, so tests can pass a deterministic value.
	*   const now = 0
	*   const result = yield* stepFn(now, "input")
	*
	*   console.log(`Step result: ${result}`)
	* })
	* ```
	*
	* @category destructors
	* @since 4.0.0
	*/
	var toStep = (schedule) => catchCause$1(schedule.step, (cause) => succeed$1(() => failCause$1(cause)));
	/**
	* Extracts a step function from a `Schedule` that sleeps for each computed
	* delay and returns metadata for the completed step.
	*
	* **When to use**
	*
	* Use to drive a schedule manually while preserving the computed output,
	* delay, input, attempt, and elapsed timing metadata for each step.
	*
	* **Details**
	*
	* The returned step reads the current time from `Clock` when invoked, calls the
	* schedule step with that timestamp and input, sleeps for the returned
	* duration, and then yields `Metadata`.
	*
	* @see {@link toStep} for manually supplying the timestamp and handling the returned delay yourself
	* @see {@link toStepWithSleep} for the same automatic sleeping behavior when only the schedule output is needed
	*
	* @category destructors
	* @since 4.0.0
	*/
	var toStepWithMetadata = (schedule) => clockWith((clock) => map$2(toStep(schedule), (step) => {
		const metaFn = metadataFn();
		return (input) => suspend$2(() => {
			const now = clock.currentTimeMillisUnsafe();
			return flatMap$1(step(now, input), ([output, duration]) => {
				const meta = metaFn(now, input);
				meta.output = output;
				meta.duration = duration;
				return as$1(sleep$1(duration), meta);
			});
		});
	}));
	/**
	* Combines schedules by recurring while at least one schedule wants to recur,
	* using the minimum delay between recurrences and outputting that minimum delay.
	*
	* **When to use**
	*
	* Use when a combined policy should continue while any schedule still recurs,
	* and should wait for the fastest schedule between recurrences.
	*
	* **Example** (Combining retry schedules by their minimum delay)
	*
	* ```ts
	* import { Console, Data, Effect, Schedule } from "effect"
	*
	* class RetryAttemptError extends Data.TaggedError("RetryAttemptError")<{ readonly message: string }> {}
	*
	* const retrySchedule = Schedule.min([
	*   Schedule.fixed("5 seconds"),
	*   Schedule.exponential("5 seconds"),
	*   Schedule.spaced("10 seconds")
	* ])
	*
	* const program = Effect.gen(function*() {
	*   let attempt = 0
	*
	*   yield* Effect.retry(
	*     Effect.gen(function*() {
	*       attempt++
	*       yield* Console.log(`Retry attempt ${attempt}`)
	*       if (attempt < 3) {
	*         return yield* Effect.fail(new RetryAttemptError({ message: `Attempt ${attempt} failed` }))
	*       }
	*       return "success"
	*     }),
	*     retrySchedule.pipe(
	*       Schedule.tap(({ output: duration }) =>
	*         Console.log(`Waiting for the fastest schedule: ${duration}`)
	*       )
	*     )
	*   )
	* })
	* ```
	*
	* @category combining
	* @since 4.0.0
	*/
	var min = (schedules) => fromStep(map$2(all$1(schedules.map(toStep)), (steps) => (now, input) => flatMap$1(forEach(steps, (step) => matchEffect$1(step(now, input), {
		onSuccess: (result) => succeed$1(result[1]),
		onDone: () => undefined_$1,
		onFailure: failCause$1
	})), (results) => {
		const duration = minDuration(results);
		if (duration === void 0) return done(zero$1);
		return succeed$1([duration, duration]);
	})));
	var minDuration = (results) => {
		let min = void 0;
		for (let i = 0; i < results.length; i++) {
			const duration = results[i];
			if (duration !== void 0) min = min === void 0 ? duration : min$1(min, duration);
		}
		return min;
	};
	/**
	* Schedule that always recurs, but will wait a certain amount between
	* repetitions, given by `base * factor.pow(n)`, where `n` is the number of
	* repetitions so far. Returns the current duration between recurrences.
	*
	* **Example** (Retrying with exponential backoff)
	*
	* ```ts
	* import { Console, Data, Effect, Schedule } from "effect"
	*
	* class RetryFailure extends Data.TaggedError("RetryFailure")<{ readonly message: string }> {}
	*
	* // Basic exponential backoff with default factor of 2
	* const basicExponential = Schedule.exponential("100 millis")
	* // Delays: 100ms, 200ms, 400ms, 800ms, 1600ms, ...
	*
	* // Custom exponential backoff with factor 1.5
	* const gentleExponential = Schedule.exponential("200 millis", 1.5)
	* // Delays: 200ms, 300ms, 450ms, 675ms, 1012ms, ...
	*
	* // Retry with exponential backoff (limited to 5 attempts)
	* const retryPolicy = Schedule.max([
	*   Schedule.exponential("50 millis"),
	*   Schedule.recurs(5)
	* ])
	*
	* const program = Effect.gen(function*() {
	*   let attempt = 0
	*
	*   const result = yield* Effect.retry(
	*     Effect.gen(function*() {
	*       attempt++
	*       if (attempt < 4) {
	*         yield* Console.log(`Attempt ${attempt} failed, retrying...`)
	*         return yield* Effect.fail(new RetryFailure({ message: `Failure ${attempt}` }))
	*       }
	*       return `Success on attempt ${attempt}`
	*     }),
	*     retryPolicy
	*   )
	*
	*   yield* Console.log(`Final result: ${result}`)
	* })
	*
	* // Will retry with delays: 50ms, 100ms, 200ms before success
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var exponential = (base, factor = 2) => {
		const baseMillis = toMillis(fromInputUnsafe(base));
		return fromStepWithMetadata(succeed$1((meta) => {
			const duration = millis(baseMillis * Math.pow(factor, meta.attempt - 1));
			return succeed$1([duration, duration]);
		}));
	};
	/**
	* Returns a new `Schedule` that modifies the delay of the next recurrence
	* of the schedule using the specified effectful function.
	*
	* **Example** (Modifying delays from schedule metadata)
	*
	* ```ts
	* import { Console, Duration, Effect, Schedule } from "effect"
	*
	* // Modify delays based on output - increase delay on high iteration counts
	* const adaptiveDelay = Schedule.recurs(10).pipe(
	*   Schedule.modifyDelay(({ output, duration }) => {
	*     // Double the delay if we're seeing high iteration counts
	*     return Effect.succeed(output > 5 ? Duration.times(duration, 2) : duration)
	*   })
	* )
	*
	* const program = Effect.gen(function*() {
	*   let counter = 0
	*   yield* Effect.repeat(
	*     Effect.gen(function*() {
	*       counter++
	*       yield* Console.log(`Attempt ${counter}`)
	*       return counter
	*     }),
	*     adaptiveDelay.pipe(Schedule.upTo({ times: 8 }))
	*   )
	* })
	* ```
	*
	* @category delays & timeouts
	* @since 2.0.0
	*/
	var modifyDelay = /*#__PURE__*/ dual(2, (self, f) => fromStep(map$2(toStep(self), (step) => {
		const meta = metadataFn();
		return (now, input) => flatMap$1(step(now, input), ([output, duration]) => map$2(f({
			...meta(now, input),
			output,
			duration
		}), (replacement) => [output, fromInputUnsafe(replacement)]));
	})));
	/**
	* Returns a new `Schedule` that randomly adjusts each recurrence delay.
	*
	* **When to use**
	*
	* Use to add random variation to an existing schedule's recurrence delays while
	* preserving its output and completion behavior.
	*
	* **Details**
	*
	* Each recurrence delay is scaled by a random factor between `0.8` and `1.2`.
	*
	* @see {@link modifyDelay} for replacing recurrence delays with a custom effectful transformation
	*
	* @category delays & timeouts
	* @since 2.0.0
	*/
	var jittered = (self) => modifyDelay(self, ({ duration }) => map$2(randomNext, (random) => {
		const millis$1 = toMillis(duration);
		return millis(millis$1 * .8 * (1 - random) + millis$1 * 1.2 * random);
	}));
	/**
	* Returns a new `Schedule` that outputs the inputs of the specified schedule.
	*
	* **Example** (Passing inputs through as outputs)
	*
	* ```ts
	* import { Console, Effect, Schedule } from "effect"
	*
	* // Create a schedule that outputs the inputs instead of original outputs
	* const inputSchedule = Schedule.passthrough(
	*   Schedule.exponential("100 millis").pipe(Schedule.upTo({ times: 3 }))
	* )
	*
	* const program = Effect.gen(function*() {
	*   let counter = 0
	*   yield* Effect.repeat(
	*     Effect.gen(function*() {
	*       counter++
	*       yield* Console.log(`Task ${counter} executed`)
	*       return `result-${counter}`
	*     }),
	*     inputSchedule
	*   )
	* })
	* ```
	*
	* @category mapping
	* @since 2.0.0
	*/
	var passthrough$2 = (self) => fromStep(map$2(toStep(self), (step) => (now, input) => matchEffect$1(step(now, input), {
		onSuccess: (result) => succeed$1([input, result[1]]),
		onFailure: failCause$1,
		onDone: () => done(input)
	})));
	/**
	* Returns a schedule that recurs continuously, each repetition spaced the
	* specified duration from the last run.
	*
	* **When to use**
	*
	* Use when each delay should start after the previous action completes.
	*
	* **Example** (Repeating with fixed spacing)
	*
	* ```ts
	* import { Console, Effect, Schedule } from "effect"
	*
	* // Basic spaced schedule - runs every 2 seconds
	* const everyTwoSeconds = Schedule.spaced("2 seconds")
	*
	* // Heartbeat that runs indefinitely with fixed spacing
	* const heartbeat = Effect.gen(function*() {
	*   yield* Console.log("Heartbeat")
	* }).pipe(
	*   Effect.repeat(everyTwoSeconds)
	* )
	*
	* // Limited repeat - run only 5 times with 1-second spacing
	* const limitedTask = Effect.gen(function*() {
	*   yield* Console.log("Executing scheduled task...")
	*   yield* Effect.sleep("500 millis") // simulate work
	*   return "Task completed"
	* }).pipe(
	*   Effect.repeat(
	*     Schedule.spaced("1 second").pipe(Schedule.upTo({ times: 5 }))
	*   )
	* )
	*
	* // Simple spaced schedule with limited repetitions
	* const limitedSpaced = Schedule.max([
	*   Schedule.spaced("100 millis"),
	*   Schedule.recurs(5) // at most 5 times
	* ])
	*
	* const program = Effect.gen(function*() {
	*   yield* Console.log("Starting spaced execution...")
	*
	*   yield* Effect.repeat(
	*     Effect.succeed("work item"),
	*     limitedSpaced
	*   )
	*
	*   yield* Console.log("Completed executions")
	* })
	* ```
	*
	* @see {@link fixed} for recurrence aligned to a regular cadence
	*
	* @category constructors
	* @since 2.0.0
	*/
	var spaced = (duration) => {
		const decoded = fromInputUnsafe(duration);
		return fromStepWithMetadata(succeed$1((meta) => succeed$1([meta.attempt - 1, decoded])));
	};
	var while_ = /*#__PURE__*/ dual(2, (self, predicate) => fromStep(map$2(toStep(self), (step) => {
		const meta = metadataFn();
		return (now, input) => flatMap$1(step(now, input), (result) => {
			const [output, duration] = result;
			const eff = predicate({
				...meta(now, input),
				output,
				duration
			});
			return flatMap$1(isEffect(eff) ? eff : succeed$1(eff), (check) => check ? succeed$1(result) : done(output));
		});
	})));
	/**
	* Returns a new `Schedule` that will recur forever.
	*
	* **Details**
	*
	* The output of the schedule is the current count of its repetitions thus far
	* (i.e. `0, 1, 2, ...`).
	*
	* **Example** (Repeating forever)
	*
	* ```ts
	* import { Console, Effect, Schedule } from "effect"
	*
	* // A schedule that runs forever with no delay
	* const infiniteSchedule = Schedule.forever
	*
	* const program = Effect.gen(function*() {
	*   yield* Effect.repeat(
	*     Effect.gen(function*() {
	*       yield* Console.log("Running forever...")
	*       return "continuous-task"
	*     }),
	*     infiniteSchedule.pipe(Schedule.upTo({ times: 5 })) // Limit for demo
	*   )
	* })
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var forever$1 = /*#__PURE__*/ spaced(zero$1);
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/schedule.js
	/** @internal */
	var repeatOrElse = /*#__PURE__*/ dual(3, (self, schedule, orElse) => flatMap$1(toStepWithMetadata(schedule), (step) => {
		let meta = CurrentMetadata.defaultValue();
		return catch_$1(forever$2(tap$1(flatMap$1(suspend$2(() => provideService(self, CurrentMetadata, meta)), step), (meta_) => sync$1(() => {
			meta = meta_;
		})), { disableYield: true }), (error) => isDone$1(error) ? succeed$1(error.value) : orElse(error, meta.attempt === 0 ? none() : some(meta)));
	}));
	/** @internal */
	var retryOrElse = /*#__PURE__*/ dual(3, (self, policy, orElse) => flatMap$1(toStepWithMetadata(policy), (step) => {
		let meta = CurrentMetadata.defaultValue();
		let lastError;
		const loop = catch_$1(suspend$2(() => provideService(self, CurrentMetadata, meta)), (error) => {
			lastError = error;
			return flatMap$1(step(error), (meta_) => {
				meta = meta_;
				return loop;
			});
		});
		return catchDone(loop, (out) => internalCall(() => orElse(lastError, out)));
	}));
	/** @internal */
	var repeat$1 = /*#__PURE__*/ dual(2, (self, options) => {
		return repeatOrElse(self, typeof options === "function" ? options(identity) : isSchedule(options) ? options : buildFromOptions(options), fail$2);
	});
	/** @internal */
	var retry$1 = /*#__PURE__*/ dual(2, (self, options) => {
		return retryOrElse(self, typeof options === "function" ? options(identity) : isSchedule(options) ? options : buildFromOptions(options), fail$2);
	});
	var passthroughForever = /*#__PURE__*/ passthrough$2(forever$1);
	/** @internal */
	var buildFromOptions = (options) => {
		let schedule = options.schedule ? passthrough$2(options.schedule) : passthroughForever;
		if (options.while) schedule = while_(schedule, ({ input }) => {
			const applied = options.while(input);
			return isEffect(applied) ? applied : succeed$1(applied);
		});
		if (options.until) schedule = while_(schedule, ({ input }) => {
			const applied = options.until(input);
			return isEffect(applied) ? map$2(applied, (b) => !b) : succeed$1(!applied);
		});
		if (options.times !== void 0) schedule = while_(schedule, ({ attempt }) => succeed$1(attempt <= options.times));
		return schedule;
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Effect.js
	/**
	* Combines an iterable or record of effects into one effect whose success shape
	* follows the input.
	*
	* **When to use**
	*
	* Use to run a known collection of effects and collect results in the same
	* tuple, iterable, or record shape.
	*
	* **Details**
	*
	* Tuple and iterable inputs collect results in order. Record inputs collect
	* results under the same keys. By default, the combined effect fails on the
	* first failure; with concurrent execution, effects that have already started
	* may be interrupted, while effects not yet started are skipped.
	*
	* Options:
	*
	* Use `concurrency` to control sequential or concurrent execution. Use
	* `mode: "result"` to run every effect and collect each success or failure as a
	* `Result` in the same output shape. Use `discard: true` to ignore successful
	* values and return `void`.
	*
	* **Example** (Collecting tuple results in order)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const tupleOfEffects = [
	*   Effect.succeed(42).pipe(Effect.tap(Console.log)),
	*   Effect.succeed("Hello").pipe(Effect.tap(Console.log))
	* ] as const
	*
	* //      ┌─── Effect<[number, string], never, never>
	* //      ▼
	* const resultsAsTuple = Effect.all(tupleOfEffects)
	*
	* Effect.runPromise(resultsAsTuple).then(console.log)
	* // Output:
	* // 42
	* // Hello
	* // [ 42, 'Hello' ]
	* ```
	*
	* **Example** (Collecting iterable results in order)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const iterableOfEffects: Iterable<Effect.Effect<number>> = [1, 2, 3].map(
	*   (n) => Effect.succeed(n).pipe(Effect.tap(Console.log))
	* )
	*
	* //      ┌─── Effect<number[], never, never>
	* //      ▼
	* const resultsAsArray = Effect.all(iterableOfEffects)
	*
	* Effect.runPromise(resultsAsArray).then(console.log)
	* // Output:
	* // 1
	* // 2
	* // 3
	* // [ 1, 2, 3 ]
	* ```
	*
	* **Example** (Collecting struct results by key)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const structOfEffects = {
	*   a: Effect.succeed(42).pipe(Effect.tap(Console.log)),
	*   b: Effect.succeed("Hello").pipe(Effect.tap(Console.log))
	* }
	*
	* //      ┌─── Effect<{ a: number; b: string; }, never, never>
	* //      ▼
	* const resultsAsStruct = Effect.all(structOfEffects)
	*
	* Effect.runPromise(resultsAsStruct).then(console.log)
	* // Output:
	* // 42
	* // Hello
	* // { a: 42, b: 'Hello' }
	* ```
	*
	* **Example** (Collecting record results by key)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const recordOfEffects: Record<string, Effect.Effect<number>> = {
	*   key1: Effect.succeed(1).pipe(Effect.tap(Console.log)),
	*   key2: Effect.succeed(2).pipe(Effect.tap(Console.log))
	* }
	*
	* //      ┌─── Effect<{ [x: string]: number; }, never, never>
	* //      ▼
	* const resultsAsRecord = Effect.all(recordOfEffects)
	*
	* Effect.runPromise(resultsAsRecord).then(console.log)
	* // Output:
	* // 1
	* // 2
	* // { key1: 1, key2: 2 }
	* ```
	*
	* **Example** (Stopping on the first failure)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const program = Effect.all([
	*   Effect.succeed("Task1").pipe(Effect.tap(Console.log)),
	*   Effect.fail("Task2: Oh no!").pipe(Effect.tap(Console.log)),
	*   // Won't execute due to earlier failure
	*   Effect.succeed("Task3").pipe(Effect.tap(Console.log))
	* ])
	*
	* Effect.runPromiseExit(program).then(console.log)
	* // Output:
	* // Task1
	* // {
	* //   _id: 'Exit',
	* //   _tag: 'Failure',
	* //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'Task2: Oh no!' }
	* // }
	* ```
	*
	* @see {@link forEach} for iterating over elements and applying an effect.
	* @category collecting
	* @since 2.0.0
	*/
	var all = all$1;
	/**
	* Creates an `Effect` that represents an asynchronous computation guaranteed to
	* succeed.
	*
	* **When to use**
	*
	* Use to convert a `Promise` into an `Effect` when the async operation is
	* guaranteed to succeed and will not reject.
	*
	* **Details**
	*
	* An optional `AbortSignal` can be provided to allow for interruption of the
	* wrapped `Promise` API.
	*
	* **Gotchas**
	*
	* The `Promise` must not reject. If it rejects, the rejection is treated as a
	* defect, not as a typed failure. Use `tryPromise` when rejection is expected.
	*
	* Interruption aborts the provided `AbortSignal`, but the underlying
	* asynchronous operation only stops if it observes that signal.
	*
	* **Example** (Wrapping a non-rejecting Promise)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const delay = (message: string) =>
	*   Effect.promise<string>(
	*     () =>
	*       new Promise((resolve) => {
	*         setTimeout(() => {
	*           resolve(message)
	*         }, 2000)
	*       })
	*   )
	*
	* //      ┌─── Effect<string, never, never>
	* //      ▼
	* const program = delay("Async operation completed successfully!")
	* ```
	*
	* @see {@link tryPromise} for a version that can handle failures.
	* @category constructors
	* @since 2.0.0
	*/
	var promise = promise$1;
	/**
	* Creates an `Effect` from an asynchronous computation that may throw or
	* reject, mapping failures into the error channel.
	*
	* **When to use**
	*
	* Use when you need to perform asynchronous operations that might fail, such
	* as fetching data from an API, and want thrown exceptions or rejected promises
	* captured as Effect errors.
	*
	* **Details**
	*
	* The promise thunk is evaluated when the effect runs. If it returns a promise
	* that resolves, the resolved value becomes the success value. If the thunk
	* throws before returning a promise, or if the returned promise rejects, the
	* thrown or rejected value is mapped into the error channel.
	*
	* Passing the thunk directly maps failures to {@link Cause.UnknownError}.
	* Passing `{ try, catch }` uses `catch` to map failures to an error of type
	* `E`.
	*
	* The thunk receives an `AbortSignal` that is aborted if the effect is
	* interrupted. The underlying asynchronous operation only stops if it observes
	* that signal.
	*
	* **Gotchas**
	*
	* If `catch` throws while mapping the error, that thrown value is treated as a
	* defect. Return the error value you want in the error channel instead of
	* throwing it.
	*
	* **Example** (Wrapping a fetch request that may fail)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const getTodo = (id: number) =>
	*   // Will catch any errors and propagate them as UnknownError
	*   Effect.tryPromise(() =>
	*     fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
	*   )
	*
	* //      ┌─── Effect<Response, UnknownError, never>
	* //      ▼
	* const program = getTodo(1)
	* ```
	*
	* **Example** (Mapping Promise rejections to a tagged error)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class TodoFetchError extends Data.TaggedError("TodoFetchError")<{ readonly cause: unknown }> {}
	*
	* const getTodo = (id: number) =>
	*   Effect.tryPromise({
	*     try: () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
	*     // remap the error
	*     catch: (cause) => new TodoFetchError({ cause })
	*   })
	*
	* //      ┌─── Effect<Response, TodoFetchError, never>
	* //      ▼
	* const program = getTodo(1)
	* ```
	*
	* @see {@link promise} if the effectful computation is asynchronous and does not throw errors.
	* @category constructors
	* @since 2.0.0
	*/
	var tryPromise = tryPromise$1;
	/**
	* Creates an `Effect` that always succeeds with a given value.
	*
	* **When to use**
	*
	* Use when an effect should complete successfully with a specific value without any errors
	* or external dependencies.
	*
	* **Example** (Creating a successful effect)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* // Creating an effect that represents a successful scenario
	* //
	* //      ┌─── Effect<number, never, never>
	* //      ▼
	* const success = Effect.succeed(42)
	* ```
	*
	* @see {@link fail} to create an effect that represents a failure.
	* @category constructors
	* @since 2.0.0
	*/
	var succeed = succeed$1;
	/**
	* Returns an effect which succeeds with `None`.
	*
	* **Example** (Succeeding with Option.none)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const program = Effect.succeedNone
	*
	* Effect.runPromise(program).then(console.log)
	* // Output: { _id: 'Option', _tag: 'None' }
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var succeedNone = succeedNone$1;
	/**
	* Returns an effect which succeeds with the value wrapped in a `Some`.
	*
	* **Example** (Succeeding with Option.some)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const program = Effect.succeedSome(42)
	*
	* Effect.runPromise(program).then(console.log)
	* // Output: { _id: 'Option', _tag: 'Some', value: 42 }
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var succeedSome = succeedSome$1;
	/**
	* Creates an `Effect` lazily, delaying construction until it is needed.
	*
	* **When to use**
	*
	* Use when you need to defer the evaluation of an effect until it is required.
	*
	* **Details**
	*
	* `suspend` takes a thunk that represents an effect and delays creating it
	* until the suspended effect is evaluated. This is useful for optimizing
	* expensive computations, managing circular dependencies such as recursive
	* functions, and helping TypeScript unify return types when branches construct
	* different effects. Any side effects or scoped captures inside the thunk are
	* re-executed on each invocation.
	*
	* **Example** (Lazily evaluating side effects)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* let i = 0
	*
	* const bad = Effect.succeed(i++)
	*
	* const good = Effect.suspend(() => Effect.succeed(i++))
	*
	* console.log(Effect.runSync(bad)) // Output: 0
	* console.log(Effect.runSync(bad)) // Output: 0
	*
	* console.log(Effect.runSync(good)) // Output: 1
	* console.log(Effect.runSync(good)) // Output: 2
	* ```
	*
	* **Example** (Suspending recursive Fibonacci evaluation)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const blowsUp = (n: number): Effect.Effect<number> =>
	*   n < 2
	*     ? Effect.succeed(1)
	*     : Effect.zipWith(blowsUp(n - 1), blowsUp(n - 2), (a, b) => a + b)
	*
	* // console.log(Effect.runSync(blowsUp(32)))
	* // crash: JavaScript heap out of memory
	*
	* const allGood = (n: number): Effect.Effect<number> =>
	*   n < 2
	*     ? Effect.succeed(1)
	*     : Effect.zipWith(
	*         Effect.suspend(() => allGood(n - 1)),
	*         Effect.suspend(() => allGood(n - 2)),
	*         (a, b) => a + b
	*       )
	*
	* console.log(Effect.runSync(allGood(32)))
	* // Output: 3524578
	* ```
	*
	* **Example** (Helping TypeScript infer recursive effect types)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* //   Without suspend, TypeScript may struggle with type inference.
	* //   Inferred type:
	* //     (a: number, b: number) =>
	* //       Effect<never, Error, never> | Effect<number, never, never>
	* const withoutSuspend = (a: number, b: number) =>
	*   b === 0
	*     ? Effect.fail(new Error("Cannot divide by zero"))
	*     : Effect.succeed(a / b)
	*
	* //   Using suspend to unify return types.
	* //   Inferred type:
	* //     (a: number, b: number) => Effect<number, Error, never>
	* const withSuspend = (a: number, b: number) =>
	*   Effect.suspend(() =>
	*     b === 0
	*       ? Effect.fail(new Error("Cannot divide by zero"))
	*       : Effect.succeed(a / b)
	*   )
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var suspend$1 = suspend$2;
	/**
	* Creates an `Effect` that represents a synchronous side-effectful computation.
	*
	* **When to use**
	*
	* Use when you need to wrap a synchronous side-effectful operation that is not
	* expected to throw.
	*
	* **Details**
	*
	* The provided function is evaluated lazily when the effect runs.
	*
	* **Gotchas**
	*
	* The function must not throw. If it throws, the thrown value is treated as a
	* defect, not as a typed failure. Use `try` when throwing is expected.
	*
	* **Example** (Capturing synchronous logging in an Effect)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const log = (message: string) =>
	*   Effect.sync(() => {
	*     console.log(message) // side effect
	*   })
	*
	* //      ┌─── Effect<void, never, never>
	* //      ▼
	* const program = log("Hello, World!")
	* ```
	*
	* @see {@link try_ | try} for a version that can handle failures.
	* @category constructors
	* @since 2.0.0
	*/
	var sync = sync$1;
	var void_ = void_$2;
	/**
	* Creates an `Effect` from a callback-based asynchronous API.
	*
	* **When to use**
	*
	* Use when you need to integrate APIs that complete through callbacks instead
	* of returning a `Promise`.
	*
	* **Details**
	*
	* The registration function receives a `resume` callback and, when requested,
	* an `AbortSignal`. Call `resume` at most once with the effect that should
	* complete the fiber; later calls are ignored. Return an optional cleanup
	* effect from the registration function to run if the fiber is interrupted.
	*
	* **Example** (Integrating callback APIs)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const delay = (ms: number) =>
	*   Effect.callback<void>((resume) => {
	*     const timeoutId = setTimeout(() => {
	*       resume(Effect.void)
	*     }, ms)
	*     // Cleanup function for interruption
	*     return Effect.sync(() => clearTimeout(timeoutId))
	*   })
	*
	* const program = delay(1000)
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var callback = callback$1;
	/**
	* Provides a way to write effectful code using generator functions, simplifying
	* control flow and error handling.
	*
	* **When to use**
	*
	* Use when you want to write effectful code that looks and behaves like
	* synchronous code, while still handling asynchronous tasks, errors, and complex
	* control flow such as loops and conditions.
	*
	* Generator functions work similarly to `async/await` but keep errors,
	* requirements, and interruption in the Effect type. You can `yield*` values
	* from effects and return the final result at the end.
	*
	* **Example** (Sequencing effects with generators)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class DiscountRateError extends Data.TaggedError("DiscountRateError")<{}> {}
	*
	* const addServiceCharge = (amount: number) => amount + 1
	*
	* const applyDiscount = (
	*   total: number,
	*   discountRate: number
	* ): Effect.Effect<number, DiscountRateError> =>
	*   discountRate === 0
	*     ? Effect.fail(new DiscountRateError())
	*     : Effect.succeed(total - (total * discountRate) / 100)
	*
	* const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
	*
	* const fetchDiscountRate = Effect.promise(() => Promise.resolve(5))
	*
	* export const program = Effect.gen(function*() {
	*   const transactionAmount = yield* fetchTransactionAmount
	*   const discountRate = yield* fetchDiscountRate
	*   const discountedAmount = yield* applyDiscount(
	*     transactionAmount,
	*     discountRate
	*   )
	*   const finalAmount = addServiceCharge(discountedAmount)
	*   return `Final amount to charge: ${finalAmount}`
	* })
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var gen = gen$1;
	/**
	* Creates an `Effect` that represents a recoverable error.
	*
	* **When to use**
	*
	* Use to explicitly signal a recoverable error in an `Effect`.
	*
	* **Details**
	*
	* The error keeps propagating unless it is handled. You can handle tagged
	* errors with functions like {@link catchTag} or {@link catchTags}.
	*
	* **Example** (Creating a failed effect)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class OperationFailedError extends Data.TaggedError("OperationFailedError")<{}> {}
	*
	* //      ┌─── Effect<never, OperationFailedError, never>
	* //      ▼
	* const failure = Effect.fail(
	*   new OperationFailedError()
	* )
	* ```
	*
	* @see {@link succeed} to create an effect that represents a successful value.
	* @category constructors
	* @since 2.0.0
	*/
	var fail = fail$2;
	/**
	* Creates an `Effect` that represents a failure with a `Cause` computed lazily.
	*
	* **When to use**
	*
	* Use to defer computing a full `Cause` until the effect is run.
	*
	* **Details**
	*
	* The cause-producing function is evaluated each time the effect is executed.
	*
	* **Example** (Lazily creating a Cause)
	*
	* ```ts
	* import { Cause, Effect } from "effect"
	*
	* const program = Effect.failCauseSync(() =>
	*   Cause.fail("Error computed at runtime")
	* )
	*
	* Effect.runPromiseExit(program).then(console.log)
	* // Output: { _id: 'Exit', _tag: 'Failure', cause: ... }
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var failCauseSync = failCauseSync$1;
	/**
	* Creates an effect that terminates a fiber with a specified error.
	*
	* **When to use**
	*
	* Use when you need an `Effect` to report an unrecoverable defect instead of a
	* typed error.
	*
	* **Details**
	*
	* The `die` function is used to signal a defect, which represents a critical
	* and unexpected error in the code. When invoked, it produces an effect that
	* does not handle the error and instead terminates the fiber.
	*
	* The error channel of the resulting effect is of type `never`, indicating that
	* it cannot recover from this failure.
	*
	* **Example** (Failing on division by zero)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const divide = (a: number, b: number) =>
	*   b === 0
	*     ? Effect.die(new Error("Cannot divide by zero"))
	*     : Effect.succeed(a / b)
	*
	* //      ┌─── Effect<number, never, never>
	* //      ▼
	* const program = divide(1, 0)
	*
	* Effect.runPromise(program).catch(console.error)
	* // Output:
	* // (FiberFailure) Error: Cannot divide by zero
	* //   ...stack trace...
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var die = die$1;
	var try_ = try_$1;
	/**
	* Provides access to the current fiber within an effect computation.
	*
	* **Example** (Reading the current fiber)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const program = Effect.withFiber((fiber) =>
	*   Effect.succeed(`Fiber ID: ${fiber.id}`)
	* )
	*
	* Effect.runPromise(program).then(console.log)
	* // Output: Fiber ID: 1
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var withFiber = withFiber$1;
	/**
	* Chains effects to produce new `Effect` instances, useful for combining
	* operations that depend on previous results.
	*
	* **When to use**
	*
	* Use when you need to chain multiple effects, ensuring that each
	* step produces a new `Effect` while flattening any nested effects that may
	* occur.
	*
	* **Details**
	*
	* `flatMap` lets you sequence effects so that the result of one effect can be
	* used in the next step. It is similar to `flatMap` used with arrays but works
	* specifically with `Effect` instances, allowing you to avoid deeply nested
	* effect structures.
	*
	* Since effects are immutable, `flatMap` always returns a new effect instead of
	* changing the original one.
	*
	* **Example** (Choosing flatMap syntax variants)
	*
	* ```ts
	* import { Effect, pipe } from "effect"
	*
	* const myEffect = Effect.succeed(1)
	* const transformation = (n: number) => Effect.succeed(n + 1)
	*
	* const flatMappedWithPipe = pipe(myEffect, Effect.flatMap(transformation))
	* const flatMappedWithDataFirst = Effect.flatMap(myEffect, transformation)
	* const flatMappedWithMethod = myEffect.pipe(Effect.flatMap(transformation))
	* ```
	*
	* **Example** (Sequencing dependent effects)
	*
	* ```ts
	* import { Data, Effect, pipe } from "effect"
	*
	* class DiscountRateError extends Data.TaggedError("DiscountRateError")<{}> {}
	*
	* // Function to apply a discount safely to a transaction amount
	* const applyDiscount = (
	*   total: number,
	*   discountRate: number
	* ): Effect.Effect<number, DiscountRateError> =>
	*   discountRate === 0
	*     ? Effect.fail(new DiscountRateError())
	*     : Effect.succeed(total - (total * discountRate) / 100)
	*
	* // Simulated asynchronous task to fetch a transaction amount from database
	* const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
	*
	* // Chaining the fetch and discount application using `flatMap`
	* const finalAmount = pipe(
	*   fetchTransactionAmount,
	*   Effect.flatMap((amount) => applyDiscount(amount, 5))
	* )
	*
	* Effect.runPromise(finalAmount).then(console.log)
	* // Output: 95
	* ```
	*
	* @see {@link tap} for a version that ignores the result of the effect.
	* @category sequencing
	* @since 2.0.0
	*/
	var flatMap = flatMap$1;
	/**
	* Flattens an `Effect` that produces another `Effect` into a single effect.
	*
	* **Example** (Flattening nested effects)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const nested = Effect.succeed(Effect.succeed("hello"))
	*
	* const program = Effect.gen(function*() {
	*   const value = yield* Effect.flatten(nested)
	*   yield* Console.log(value)
	*   // Output: hello
	* })
	* ```
	*
	* @category sequencing
	* @since 2.0.0
	*/
	var flatten = flatten$1;
	/**
	* Runs this effect and then runs another effect, optionally using the first
	* effect's success value to choose the next effect.
	*
	* **When to use**
	*
	* Use when you need one effect to run after another and the second effect may
	* depend on the first effect's success value.
	*
	* **Details**
	*
	* When the second argument is an `Effect`, the first success value is discarded
	* and the returned effect produces the second effect's value. When the second
	* argument is a function, it receives the first success value and must return
	* the next `Effect`.
	*
	* Failures or requirements from either effect are preserved in the returned
	* effect.
	*
	* **Example** (Choosing andThen syntax variants)
	*
	* ```ts
	* import { Effect, pipe } from "effect"
	*
	* const myEffect = Effect.succeed(1)
	* const anotherEffect = Effect.succeed("done")
	*
	* const transformedWithPipe = pipe(myEffect, Effect.andThen(anotherEffect))
	* const transformedWithDataFirst = Effect.andThen(myEffect, anotherEffect)
	* const transformedWithMethod = myEffect.pipe(Effect.andThen(anotherEffect))
	* ```
	*
	* **Example** (Sequencing a discount calculation after fetching a total)
	*
	* ```ts
	* import { Data, Effect, pipe } from "effect"
	*
	* class DiscountRateError extends Data.TaggedError("DiscountRateError")<{}> {}
	*
	* // Function to apply a discount safely to a transaction amount
	* const applyDiscount = (
	*   total: number,
	*   discountRate: number
	* ): Effect.Effect<number, DiscountRateError> =>
	*   discountRate === 0
	*     ? Effect.fail(new DiscountRateError())
	*     : Effect.succeed(total - (total * discountRate) / 100)
	*
	* // Simulated asynchronous task to fetch a transaction amount from database
	* const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
	*
	* // Using Effect.map and Effect.flatMap
	* const result1 = pipe(
	*   fetchTransactionAmount,
	*   Effect.map((amount) => amount * 2),
	*   Effect.flatMap((amount) => applyDiscount(amount, 5))
	* )
	*
	* Effect.runPromise(result1).then(console.log)
	* // Output: 190
	*
	* // Using Effect.andThen
	* const result2 = pipe(
	*   fetchTransactionAmount,
	*   Effect.andThen((amount) => Effect.succeed(amount * 2)),
	*   Effect.andThen((amount) => applyDiscount(amount, 5))
	* )
	*
	* Effect.runPromise(result2).then(console.log)
	* // Output: 190
	* ```
	*
	* @category sequencing
	* @since 2.0.0
	*/
	var andThen = andThen$1;
	/**
	* Runs a side effect with the result of an effect without changing the original
	* value.
	*
	* **When to use**
	*
	* Use when you need to run an effectful observation, such as logging or
	* tracking, while passing the original success value to the next step.
	*
	* **Details**
	*
	* `tap` works similarly to `flatMap`, but it ignores the result of the function
	* passed to it. The value from the previous effect remains available for the
	* next part of the chain. Note that if the side effect fails, the entire chain
	* will fail too.
	*
	* **Example** (Logging a step in a pipeline)
	*
	* ```ts
	* import { Console, Data, Effect, pipe } from "effect"
	*
	* class DiscountRateError extends Data.TaggedError("DiscountRateError")<{}> {}
	*
	* // Function to apply a discount safely to a transaction amount
	* const applyDiscount = (
	*   total: number,
	*   discountRate: number
	* ): Effect.Effect<number, DiscountRateError> =>
	*   discountRate === 0
	*     ? Effect.fail(new DiscountRateError())
	*     : Effect.succeed(total - (total * discountRate) / 100)
	*
	* // Simulated asynchronous task to fetch a transaction amount from database
	* const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
	*
	* const finalAmount = pipe(
	*   fetchTransactionAmount,
	*   // Log the fetched transaction amount
	*   Effect.tap((amount) => Console.log(`Apply a discount to: ${amount}`)),
	*   // `amount` is still available!
	*   Effect.flatMap((amount) => applyDiscount(amount, 5))
	* )
	*
	* Effect.runPromise(finalAmount).then(console.log)
	* // Output:
	* // Apply a discount to: 100
	* // 95
	* ```
	*
	* @category sequencing
	* @since 2.0.0
	*/
	var tap = tap$1;
	/**
	* Transforms an effect to encapsulate both failure and success using the `Exit`
	* data type.
	*
	* **When to use**
	*
	* Use when you need to inspect the full outcome, including typed failures, defects,
	* and interruptions.
	*
	* **Details**
	*
	* `exit` wraps an effect's success or failure inside an `Exit` type, allowing
	* you to handle both cases explicitly.
	*
	* The resulting effect cannot fail because the failure is encapsulated within
	* the `Exit.Failure` type. The error type is set to `never`, indicating that
	* the effect is structured to never fail directly.
	*
	* **Example** (Capturing completion as Exit)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const success = Effect.succeed(42)
	* const failure = Effect.fail("Something went wrong")
	*
	* const program1 = Effect.exit(success)
	* const program2 = Effect.exit(failure)
	*
	* Effect.runPromise(program1).then(console.log)
	* // { _id: 'Exit', _tag: 'Success', value: 42 }
	*
	* Effect.runPromise(program2).then(console.log)
	* // { _id: 'Exit', _tag: 'Failure', cause: { _id: 'Cause', _tag: 'Fail', failure: 'Something went wrong' } }
	* ```
	*
	* @see {@link option} for a version that uses `Option` instead.
	* @see {@link result} for a version that uses `Result` instead.
	*
	* @category outcome encapsulation
	* @since 2.0.0
	*/
	var exit = exit$1;
	/**
	* Transforms the value inside an effect by applying a function to it.
	*
	* **When to use**
	*
	* Use to transform an effect's success value with a function that returns a
	* plain value, producing a new effect without changing the original effect's
	* typed error or context requirements.
	*
	* **Details**
	*
	* `map` takes a function and applies it to the value contained within an
	* effect, creating a new effect with the transformed value.
	*
	* It's important to note that effects are immutable, meaning that the original
	* effect is not modified. Instead, a new effect is returned with the updated
	* value.
	*
	* **Example** (Choosing map syntax variants)
	*
	* ```ts
	* import { Effect, pipe } from "effect"
	*
	* const myEffect = Effect.succeed(1)
	* const transformation = (n: number) => n + 1
	*
	* const mappedWithPipe = pipe(myEffect, Effect.map(transformation))
	* const mappedWithDataFirst = Effect.map(myEffect, transformation)
	* const mappedWithMethod = myEffect.pipe(Effect.map(transformation))
	* ```
	*
	* **Example** (Adding a service charge)
	*
	* ```ts
	* import { Effect, pipe } from "effect"
	*
	* const addServiceCharge = (amount: number) => amount + 1
	*
	* const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
	*
	* const finalAmount = pipe(
	*   fetchTransactionAmount,
	*   Effect.map(addServiceCharge)
	* )
	*
	* Effect.runPromise(finalAmount).then(console.log)
	* // Output: 101
	* ```
	*
	* @see {@link mapError} for a version that operates on the error channel.
	* @see {@link mapBoth} for a version that operates on both channels.
	* @see {@link flatMap} or {@link andThen} for a version that can return a new effect.
	* @category mapping
	* @since 2.0.0
	*/
	var map = map$2;
	/**
	* Replaces the value inside an effect with a constant value.
	*
	* **When to use**
	*
	* Use to replace a successful value with a constant while preserving failures
	* and requirements.
	*
	* **Details**
	*
	* `as` allows you to ignore the original value inside an effect and
	* replace it with a new constant value.
	*
	* **Example** (Replacing a success value)
	*
	* ```ts
	* import { Effect, pipe } from "effect"
	*
	* // Replaces the value 5 with the constant "new value"
	* const program = pipe(Effect.succeed(5), Effect.as("new value"))
	*
	* Effect.runPromise(program).then(console.log)
	* // Output: "new value"
	* ```
	*
	* @see {@link map} for deriving the replacement value from the success value
	* @see {@link asVoid} for replacing the success value with `void`
	*
	* @category mapping
	* @since 2.0.0
	*/
	var as = as$1;
	var catch_ = catch_$1;
	/**
	* Handles both recoverable and unrecoverable errors by providing a recovery
	* effect.
	*
	* **When to use**
	*
	* Use when you need to recover from an `Effect` by inspecting the full `Cause`,
	* including recoverable failures, defects, and interruptions, instead of only
	* the typed error value.
	*
	* **Details**
	*
	* When to Recover from Defects:
	*
	* Defects are unexpected errors that typically shouldn't be recovered from, as
	* they often indicate serious issues. However, in some cases, such as
	* dynamically loaded plugins, controlled recovery might be needed.
	*
	* **Example** (Recovering from full failure causes)
	*
	* ```ts
	* import { Cause, Console, Effect } from "effect"
	*
	* // An effect that might fail in different ways
	* const program = Effect.die("Something went wrong")
	*
	* // Recover from any cause (including defects)
	* const recovered = Effect.catchCause(program, (cause) => {
	*   if (Cause.hasDies(cause)) {
	*     return Console.log("Caught defect").pipe(
	*       Effect.as("Recovered from defect")
	*     )
	*   }
	*   return Effect.succeed("Unknown error")
	* })
	* ```
	*
	* @category error handling
	* @since 4.0.0
	*/
	var catchCause = catchCause$1;
	/**
	* Transforms the failure value of an effect without changing its success value.
	*
	* **When to use**
	*
	* Use to translate an `Effect`'s typed failures while leaving successful values
	* unchanged.
	*
	* **Details**
	*
	* Only the failure channel is transformed. The success channel and requirements
	* are preserved.
	*
	* **Example** (Transforming the error channel)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class TaskError extends Data.TaggedError("TaskError")<{ readonly message: string }> {}
	*
	* //      ┌─── Effect<number, string, never>
	* //      ▼
	* const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))
	*
	* //      ┌─── Effect<number, TaskError, never>
	* //      ▼
	* const mapped = Effect.mapError(
	*   simulatedTask,
	*   (message) => new TaskError({ message })
	* )
	* ```
	*
	* @see {@link map} for a version that operates on the success channel.
	* @see {@link mapBoth} for a version that operates on both channels.
	*
	* @category error handling
	* @since 2.0.0
	*/
	var mapError = mapError$1;
	/**
	* Runs an effectful operation when the source effect fails, while preserving
	* the original failure when the operation succeeds.
	*
	* **Details**
	*
	* Use this for logging, metrics, or other failure-side observations. If the
	* operation passed to `tapError` fails, that error is also represented in the
	* returned effect's error channel.
	*
	* **Example** (Running effects on failure)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* // Simulate a task that fails with an error
	* const task: Effect.Effect<number, string> = Effect.fail("NetworkError")
	*
	* // Use tapError to log the error message when the task fails
	* const tapping = Effect.tapError(
	*   task,
	*   (error) => Console.log(`expected error: ${error}`)
	* )
	*
	* Effect.runFork(tapping)
	* // Output:
	* // expected error: NetworkError
	* ```
	*
	* @category sequencing
	* @since 2.0.0
	*/
	var tapError = tapError$1;
	/**
	* Retries typed failures from an effect according to a retry policy.
	*
	* **When to use**
	*
	* Use when you need to rerun an effect after transient typed failures, such as
	* network issues or temporary resource unavailability.
	*
	* **Details**
	*
	* The policy can be a `Schedule`, a schedule builder, or a `Retry.Options`
	* object using `schedule`, `times`, `while`, or `until`. If a retry eventually
	* succeeds, the returned effect succeeds with that value. If the policy stops
	* while the effect is still failing, the last failure is propagated.
	*
	* **Gotchas**
	*
	* The source effect is always evaluated once before any retry policy is
	* applied. For example, `Schedule.recurs(3)` allows up to three retries after
	* the initial attempt.
	*
	* Defects and interruptions are not retried.
	*
	* **Example** (Retrying with a schedule)
	*
	* ```ts
	* import { Data, Effect, Schedule } from "effect"
	*
	* class AttemptError extends Data.TaggedError("AttemptError")<{ readonly attempt: number }> {}
	*
	* let attempt = 0
	* const task = Effect.callback<string, AttemptError>((resume) => {
	*   attempt++
	*   if (attempt <= 2) {
	*     resume(Effect.fail(new AttemptError({ attempt })))
	*   } else {
	*     resume(Effect.succeed("Success!"))
	*   }
	* })
	*
	* const policy = Schedule.addDelay(Schedule.recurs(5), () => Effect.succeed("100 millis"))
	* const program = Effect.retry(task, policy)
	*
	* Effect.runPromise(program).then(console.log)
	* // Output: "Success!" (after 2 retries)
	* ```
	*
	* @see {@link retryOrElse} for a version that allows you to run a fallback.
	* @see {@link repeat} if your retry condition is based on successful outcomes rather than errors.
	* @category error handling
	* @since 2.0.0
	*/
	var retry = retry$1;
	/**
	* Applies a timeout to an effect, with a fallback effect executed if the timeout is reached.
	*
	* **When to use**
	*
	* Use when a timeout of an `Effect` should switch to a fallback effect.
	*
	* **Details**
	*
	* The fallback effect is created lazily by `orElse` and may introduce its own
	* success, failure, and requirement types.
	*
	* **Gotchas**
	*
	* If the timeout wins, the source effect is interrupted before the fallback is
	* run.
	*
	* **Example** (Falling back on timeout)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const slowQuery = Effect.gen(function*() {
	*   yield* Console.log("Starting database query...")
	*   yield* Effect.sleep("5 seconds")
	*   return "Database result"
	* })
	*
	* // Use cached data as fallback when timeout is reached
	* const program = Effect.timeoutOrElse(slowQuery, {
	*   duration: "2 seconds",
	*   orElse: () =>
	*     Effect.gen(function*() {
	*       yield* Console.log("Query timed out, using cached data")
	*       return "Cached result"
	*     })
	* })
	*
	* Effect.runPromise(program).then(console.log)
	* // Output:
	* // Starting database query...
	* // Query timed out, using cached data
	* // Cached result
	* ```
	*
	* @see {@link timeout} for failing with a `TimeoutException`.
	* @see {@link timeoutOption} for returning `Option.none` on timeout.
	*
	* @category delays & timeouts
	* @since 4.0.0
	*/
	var timeoutOrElse = timeoutOrElse$1;
	/**
	* Handles both success and failure cases of an effect without performing side
	* effects.
	*
	* **When to use**
	*
	* Use when you need to fold an `Effect` into a value by handling success and
	* failure differently without triggering side effects.
	*
	* **Details**
	*
	* `match` lets you define custom handlers for both success and failure
	* scenarios. You provide separate functions to handle each case, allowing you
	* to process the result if the effect succeeds, or handle the error if the
	* effect fails.
	*
	* **Example** (Matching success and failure values)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class ExampleError extends Data.TaggedError("ExampleError")<{ readonly message: string }> {}
	*
	* const success: Effect.Effect<number, ExampleError> = Effect.succeed(42)
	*
	* const program1 = Effect.match(success, {
	*   onFailure: (error) => `failure: ${error.message}`,
	*   onSuccess: (value) => `success: ${value}`
	* })
	*
	* // Run and log the result of the successful effect
	* Effect.runPromise(program1).then(console.log)
	* // Output: "success: 42"
	*
	* const failure: Effect.Effect<number, ExampleError> = Effect.fail(
	*   new ExampleError({ message: "Uh oh!" })
	* )
	*
	* const program2 = Effect.match(failure, {
	*   onFailure: (error) => `failure: ${error.message}`,
	*   onSuccess: (value) => `success: ${value}`
	* })
	*
	* // Run and log the result of the failed effect
	* Effect.runPromise(program2).then(console.log)
	* // Output: "failure: Uh oh!"
	* ```
	*
	* @see {@link matchEffect} if you need to perform side effects in the handlers.
	* @category pattern matching
	* @since 2.0.0
	*/
	var match = match$1;
	/**
	* Handles both success and failure by running effectful handlers.
	*
	* **When to use**
	*
	* Use when you need to handle an `Effect`'s failure or success with handlers
	* that return effects.
	*
	* **Details**
	*
	* Use `matchEffect` when either branch needs to return an `Effect`, such as
	* performing logging, recovery, notification, or other effectful work. The
	* returned effect succeeds or fails according to the handler that is run.
	*
	* **Example** (Matching success and failure with effectful handlers)
	*
	* ```ts
	* import { Data, Effect } from "effect"
	*
	* class ExampleError extends Data.TaggedError("ExampleError")<{ readonly message: string }> {}
	*
	* const success: Effect.Effect<number, ExampleError> = Effect.succeed(42)
	* const failure: Effect.Effect<number, ExampleError> = Effect.fail(
	*   new ExampleError({ message: "Uh oh!" })
	* )
	*
	* const program1 = Effect.matchEffect(success, {
	*   onFailure: (error) =>
	*     Effect.succeed(`failure: ${error.message}`).pipe(
	*       Effect.tap(Effect.log)
	*     ),
	*   onSuccess: (value) =>
	*     Effect.succeed(`success: ${value}`).pipe(Effect.tap(Effect.log))
	* })
	*
	* console.log(Effect.runSync(program1))
	* // Output:
	* // timestamp=... level=INFO fiber=#0 message="success: 42"
	* // success: 42
	*
	* const program2 = Effect.matchEffect(failure, {
	*   onFailure: (error) =>
	*     Effect.succeed(`failure: ${error.message}`).pipe(
	*       Effect.tap(Effect.log)
	*     ),
	*   onSuccess: (value) =>
	*     Effect.succeed(`success: ${value}`).pipe(Effect.tap(Effect.log))
	* })
	*
	* console.log(Effect.runSync(program2))
	* // Output:
	* // timestamp=... level=INFO fiber=#1 message="failure: Uh oh!"
	* // failure: Uh oh!
	* ```
	*
	* @see {@link match} if you don't need side effects and only want to handle the
	* result or failure.
	* @category pattern matching
	* @since 2.0.0
	*/
	var matchEffect = matchEffect$2;
	/**
	* Provides a context to an effect, fulfilling its service requirements.
	*
	* **Details**
	*
	* This function provides multiple services at once by supplying a context
	* that contains all the required services. It removes the provided services
	* from the effect's requirements, making them available to the effect.
	*
	* **Example** (Providing a complete context)
	*
	* ```ts
	* import { Context, Effect } from "effect"
	*
	* // Define service keys
	* const Logger = Context.Service<{
	*   log: (msg: string) => void
	* }>("Logger")
	* const Database = Context.Service<{
	*   query: (sql: string) => string
	* }>("Database")
	*
	* // Create a context with multiple services
	* const context = Context.make(Logger, { log: console.log })
	*   .pipe(Context.add(Database, { query: () => "result" }))
	*
	* // An effect that requires both services
	* const program = Effect.gen(function*() {
	*   const logger = yield* Effect.service(Logger)
	*   const db = yield* Effect.service(Database)
	*   logger.log("Querying database")
	*   return db.query("SELECT * FROM users")
	* })
	*
	* const provided = Effect.provideContext(program, context)
	* ```
	*
	* @category environment
	* @since 4.0.0
	*/
	var provideContext = provideContext$1;
	/**
	* Disables interruption and provides a restore function to restore the
	* interruptible state within the effect.
	*
	* **Example** (Restoring interruption in protected regions)
	*
	* ```ts
	* import { Console, Effect } from "effect"
	*
	* const program = Effect.uninterruptibleMask((restore) =>
	*   Effect.gen(function*() {
	*     yield* Console.log("Uninterruptible phase...")
	*     yield* Effect.sleep("1 second")
	*
	*     // Restore interruptibility for this part
	*     yield* restore(
	*       Effect.gen(function*() {
	*         yield* Console.log("Interruptible phase...")
	*         yield* Effect.sleep("2 seconds")
	*       })
	*     )
	*
	*     yield* Console.log("Back to uninterruptible")
	*   })
	* )
	* ```
	*
	* @category interruption
	* @since 2.0.0
	*/
	var uninterruptibleMask = uninterruptibleMask$1;
	/**
	* Repeats this effect forever (until the first error).
	*
	* **Example** (Repeating forever)
	*
	* ```ts
	* import { Console, Effect, Fiber } from "effect"
	*
	* const task = Effect.gen(function*() {
	*   yield* Console.log("Task running...")
	*   yield* Effect.sleep("1 second")
	* })
	*
	* // This will run forever, printing every second
	* const program = task.pipe(Effect.forever)
	*
	* // This will run forever, without yielding every iteration
	* const programNoYield = task.pipe(Effect.forever({ disableYield: true }))
	*
	* // Run for 5 seconds then interrupt
	* const timedProgram = Effect.gen(function*() {
	*   const fiber = yield* Effect.forkChild(program)
	*   yield* Effect.sleep("5 seconds")
	*   yield* Fiber.interrupt(fiber)
	* })
	* ```
	*
	* @category repetition
	* @since 2.0.0
	*/
	var forever = forever$2;
	/**
	* Repeats an effect based on a specified schedule or until the first failure.
	*
	* **When to use**
	*
	* Use to rerun an effect after successful executions.
	*
	* **Details**
	*
	* This function executes an effect repeatedly according to the given schedule.
	* Each repetition occurs after the initial execution of the effect, meaning
	* that the schedule determines the number of additional repetitions. For
	* example, using `Schedule.once` will result in the effect being executed twice
	* (once initially and once as part of the repetition).
	*
	* If the effect succeeds, it is repeated according to the schedule. If it
	* fails, the repetition stops immediately, and the failure is returned.
	*
	* The schedule can also specify delays between repetitions, making it useful
	* for tasks like retrying operations with backoff, periodic execution, or
	* performing a series of dependent actions.
	*
	* You can combine schedules for more advanced repetition logic, such as adding
	* delays, limiting recursions, or dynamically adjusting based on the outcome of
	* each execution.
	*
	* **Gotchas**
	*
	* The source effect is always evaluated once before the schedule is stepped.
	* The schedule controls additional repetitions, not the initial execution.
	*
	* **Example** (Repeating successful effects with a schedule)
	*
	* ```ts
	* // Success Example
	* import { Console, Effect, Schedule } from "effect"
	*
	* const action = Console.log("success")
	* const policy = Schedule.addDelay(Schedule.recurs(2), () => Effect.succeed("100 millis"))
	* const program = Effect.repeat(action, policy)
	*
	* // Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
	* ```
	*
	* **Example** (Stopping repetition on failure)
	*
	* ```ts
	* // Failure Example
	* import { Effect, Schedule } from "effect"
	*
	* let count = 0
	*
	* // Define a callback effect that simulates an action with possible failures
	* const action = Effect.callback<string, string>((resume) => {
	*   if (count > 1) {
	*     console.log("failure")
	*     resume(Effect.fail("Uh oh!"))
	*   } else {
	*     count++
	*     console.log("success")
	*     resume(Effect.succeed("yay!"))
	*   }
	* })
	*
	* const policy = Schedule.addDelay(Schedule.recurs(2), () => Effect.succeed("100 millis"))
	* const program = Effect.repeat(action, policy)
	*
	* // Effect.runPromiseExit(program).then(console.log)
	* ```
	*
	* @see {@link retry} for failure-based repetition
	* @see {@link repeatOrElse} for fallback handling when repetition fails
	*
	* @category repetition
	* @since 2.0.0
	*/
	var repeat = repeat$1;
	/**
	* Runs an effect in the background, returning a fiber that can
	* be observed or interrupted.
	*
	* **When to use**
	*
	* Use when you need to start an effect in the background and receive a fiber.
	*
	* **Example** (Running an effect in the background)
	*
	* ```ts
	* import { Console, Effect, Fiber, Schedule } from "effect"
	*
	* //      ┌─── Effect<number, never, never>
	* //      ▼
	* const program = Effect.repeat(
	*   Console.log("running..."),
	*   Schedule.spaced("200 millis")
	* )
	*
	* //      ┌─── RuntimeFiber<number, never>
	* //      ▼
	* const fiber = Effect.runFork(program)
	*
	* setTimeout(() => {
	*   Effect.runFork(Fiber.interrupt(fiber))
	* }, 500)
	* ```
	*
	* @category running
	* @since 2.0.0
	*/
	var runFork = runFork$1;
	/**
	* Runs an effect in the background with the provided services.
	*
	* **When to use**
	*
	* Use when an effect still requires services, you already have a `Context`, and
	* you want a background fiber.
	*
	* **Example** (Running with services in the background)
	*
	* ```ts
	* import { Context, Effect } from "effect"
	*
	* interface Logger {
	*   log: (message: string) => void
	* }
	*
	* const Logger = Context.Service<Logger>("Logger")
	*
	* const services = Context.make(Logger, {
	*   log: (message) => console.log(message)
	* })
	*
	* const program = Effect.gen(function*() {
	*   const logger = yield* Logger
	*   logger.log("Hello from service!")
	*   return "done"
	* })
	*
	* const fiber = Effect.runForkWith(services)(program)
	* ```
	*
	* @category running
	* @since 4.0.0
	*/
	var runForkWith = runForkWith$1;
	/**
	* Forks an effect with the provided services, registers `onExit` as a fiber observer, and returns an interruptor.
	*
	* **When to use**
	*
	* Use when embedding an effect into callback-style code with explicit services
	* and a synchronous interruptor.
	*
	* **Details**
	*
	* The returned interruptor calls `fiber.interruptUnsafe`, optionally with an interruptor id.
	*
	* **Example** (Running with services and a callback)
	*
	* ```ts
	* import { Console, Context, Effect, Exit } from "effect"
	*
	* interface Logger {
	*   log: (message: string) => Effect.Effect<void>
	* }
	*
	* const Logger = Context.Service<Logger>("Logger")
	*
	* const services = Context.make(Logger, {
	*   log: (message) => Console.log(message)
	* })
	*
	* const program = Effect.gen(function*() {
	*   const logger = yield* Logger
	*   yield* logger.log("Started")
	*   return "done"
	* })
	*
	* const interrupt = Effect.runCallbackWith(services)(program, {
	*   onExit: (exit) => {
	*     if (Exit.isFailure(exit)) {
	*       // handle failure or interruption
	*     }
	*   }
	* })
	*
	* // Use the interruptor if you need to cancel the fiber later.
	* interrupt()
	* ```
	*
	* @category running
	* @since 4.0.0
	*/
	var runCallbackWith = runCallbackWith$1;
	/**
	* Runs an effect asynchronously, registering `onExit` as a fiber observer and
	* returning an interruptor.
	*
	* **Details**
	*
	* The interruptor calls `fiber.interruptUnsafe` with the optional interruptor
	* id.
	*
	* **Example** (Running with a callback)
	*
	* ```ts
	* import { Console, Effect, Exit } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   yield* Console.log("working")
	*   return "done"
	* })
	*
	* const interrupt = Effect.runCallback(program, {
	*   onExit: (exit) => {
	*     Effect.runSync(
	*       Exit.match(exit, {
	*         onFailure: () => Console.log("failed"),
	*         onSuccess: (value) => Console.log(`success: ${value}`)
	*       })
	*     )
	*   }
	* })
	*
	* // Output:
	* // working
	* // success: done
	*
	* // interrupt() to cancel the fiber if needed
	* ```
	*
	* @category running
	* @since 2.0.0
	*/
	var runCallback = runCallback$1;
	/**
	* Executes an effect and returns the result as a `Promise`.
	*
	* **When to use**
	*
	* Use when you need to execute an effect and work with the
	* result using `Promise` syntax, typically for compatibility with other
	* promise-based code.
	*
	* If the effect succeeds, the promise will resolve with the result. If the
	* effect fails, the promise will reject with an error.
	*
	* **Example** (Running a successful effect as a Promise)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* Effect.runPromise(Effect.succeed(1)).then(console.log)
	* // Output: 1
	* ```
	*
	* **Example** (Running effects as promises)
	*
	* ```ts
	* //Example: Handling a Failing Effect as a Rejected Promise
	* import { Effect } from "effect"
	*
	* Effect.runPromise(Effect.fail("my error")).catch(console.error)
	* // Output:
	* // (FiberFailure) Error: my error
	* ```
	*
	* @see {@link runPromiseExit} for a version that returns an `Exit` type instead of rejecting.
	* @category running
	* @since 2.0.0
	*/
	var runPromise = runPromise$1;
	/**
	* Executes an effect as a Promise with the provided services.
	*
	* **When to use**
	*
	* Use when you already have a `Context` and need Promise interop that rejects on
	* effect failure.
	*
	* **Example** (Running with services as a promise)
	*
	* ```ts
	* import { Context, Effect } from "effect"
	*
	* interface Config {
	*   apiUrl: string
	* }
	*
	* const Config = Context.Service<Config>("Config")
	*
	* const context = Context.make(Config, {
	*   apiUrl: "https://api.example.com"
	* })
	*
	* const program = Effect.gen(function*() {
	*   const config = yield* Config
	*   return `Connecting to ${config.apiUrl}`
	* })
	*
	* Effect.runPromiseWith(context)(program).then(console.log)
	* ```
	*
	* @category running
	* @since 4.0.0
	*/
	var runPromiseWith = runPromiseWith$1;
	/**
	* Runs an effect and returns a `Promise` that resolves to an `Exit`, which
	* represents the outcome (success or failure) of the effect.
	*
	* **When to use**
	*
	* Use when you need to determine if an effect succeeded
	* or failed, including any defects, and you want to work with a `Promise`.
	*
	* **Details**
	*
	* The `Exit` type represents the result of the effect. Successful effects are
	* wrapped in `Success`, and failed effects are wrapped in `Failure` with a
	* `Cause`.
	*
	* **Example** (Observing promise results as Exit)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* // Execute a successful effect and get the Exit result as a Promise
	* Effect.runPromiseExit(Effect.succeed(1)).then(console.log)
	* // Output:
	* // {
	* //   _id: "Exit",
	* //   _tag: "Success",
	* //   value: 1
	* // }
	*
	* // Execute a failing effect and get the Exit result as a Promise
	* Effect.runPromiseExit(Effect.fail("my error")).then(console.log)
	* // Output:
	* // {
	* //   _id: "Exit",
	* //   _tag: "Failure",
	* //   cause: {
	* //     _id: "Cause",
	* //     _tag: "Fail",
	* //     failure: "my error"
	* //   }
	* // }
	* ```
	*
	* @see {@link runPromise} for a version that rejects on failure.
	*
	* @category running
	* @since 2.0.0
	*/
	var runPromiseExit = runPromiseExit$1;
	/**
	* Runs an effect and returns a Promise of Exit with provided services.
	*
	* **When to use**
	*
	* Use when you already have a `Context` and need Promise interop that preserves
	* success and failure as an `Exit`.
	*
	* **Example** (Running with services as an Exit promise)
	*
	* ```ts
	* import { Context, Effect, Exit } from "effect"
	*
	* interface Database {
	*   query: (sql: string) => string
	* }
	*
	* const Database = Context.Service<Database>("Database")
	*
	* const services = Context.make(Database, {
	*   query: (sql) => `Result for: ${sql}`
	* })
	*
	* const program = Effect.gen(function*() {
	*   const db = yield* Database
	*   return db.query("SELECT * FROM users")
	* })
	*
	* Effect.runPromiseExitWith(services)(program).then((exit) => {
	*   if (Exit.isSuccess(exit)) {
	*     console.log("Success:", exit.value)
	*   }
	* })
	* ```
	*
	* @category running
	* @since 4.0.0
	*/
	var runPromiseExitWith = runPromiseExitWith$1;
	/**
	* Executes an effect synchronously and returns its success value.
	*
	* **When to use**
	*
	* Use when you need to execute an effect that is guaranteed to complete
	* synchronously.
	*
	* **Details**
	*
	* If the effect fails, dies, is interrupted, or performs asynchronous work,
	* `runSync` throws a `FiberFailure` instead of returning a value. Use
	* `runSyncExit` when you want the failure captured as an `Exit`.
	*
	* **Example** (Running a synchronous effect)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const program = Effect.sync(() => {
	*   console.log("Hello, World!")
	*   return 1
	* })
	*
	* const result = Effect.runSync(program)
	* // Output: Hello, World!
	*
	* console.log(result)
	* // Output: 1
	* ```
	*
	* **Example** (Throwing for failed or async effects)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* try {
	*   // Attempt to run an effect that fails
	*   Effect.runSync(Effect.fail("my error"))
	* } catch (e) {
	*   console.error(e)
	* }
	* // Output:
	* // (FiberFailure) Error: my error
	*
	* try {
	*   // Attempt to run an effect that involves async work
	*   Effect.runSync(Effect.promise(() => Promise.resolve(1)))
	* } catch (e) {
	*   console.error(e)
	* }
	* // Output:
	* // (FiberFailure) AsyncFiberException: Fiber #0 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
	* ```
	*
	* @see {@link runSyncExit} for a version that returns an `Exit` type instead of
	* throwing an error.
	* @category running
	* @since 2.0.0
	*/
	var runSync = runSync$1;
	/**
	* Executes an effect synchronously with provided services.
	*
	* **When to use**
	*
	* Use when you already have a `Context`, the effect is known to complete
	* synchronously, and failures should throw.
	*
	* **Example** (Running synchronously with services)
	*
	* ```ts
	* import { Context, Effect } from "effect"
	*
	* interface MathService {
	*   add: (a: number, b: number) => number
	* }
	*
	* const MathService = Context.Service<MathService>("MathService")
	*
	* const context = Context.make(MathService, {
	*   add: (a, b) => a + b
	* })
	*
	* const program = Effect.gen(function*() {
	*   const math = yield* MathService
	*   return math.add(2, 3)
	* })
	*
	* const result = Effect.runSyncWith(context)(program)
	* console.log(result) // 5
	* ```
	*
	* @category running
	* @since 4.0.0
	*/
	var runSyncWith = runSyncWith$1;
	/**
	* Runs an effect synchronously and captures the outcome safely as an `Exit` type, which
	* represents the outcome (success or failure) of the effect.
	*
	* **When to use**
	*
	* Use to find out whether an effect succeeded or failed,
	* including any defects, without dealing with asynchronous operations.
	*
	* **Details**
	*
	* The `Exit` type represents the result of the effect. Successful effects are
	* wrapped in `Success`, and failed effects are wrapped in `Failure` with a
	* `Cause`.
	*
	* If the effect contains asynchronous operations, `runSyncExit` will
	* return an `Failure` with a `Die` cause, indicating that the effect cannot be
	* resolved synchronously.
	*
	* **Example** (Observing synchronous results as Exit)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* console.log(Effect.runSyncExit(Effect.succeed(1)))
	* // Output:
	* // {
	* //   _id: "Exit",
	* //   _tag: "Success",
	* //   value: 1
	* // }
	*
	* console.log(Effect.runSyncExit(Effect.fail("my error")))
	* // Output:
	* // {
	* //   _id: "Exit",
	* //   _tag: "Failure",
	* //   cause: {
	* //     _id: "Cause",
	* //     _tag: "Fail",
	* //     failure: "my error"
	* //   }
	* // }
	* ```
	*
	* **Example** (Capturing async work as a Die cause)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* console.log(Effect.runSyncExit(Effect.promise(() => Promise.resolve(1))))
	* // Output:
	* // {
	* //   _id: 'Exit',
	* //   _tag: 'Failure',
	* //   cause: {
	* //     _id: 'Cause',
	* //     _tag: 'Die',
	* //     defect: [Fiber #0 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work] {
	* //       fiber: [FiberRuntime],
	* //       _tag: 'AsyncFiberException',
	* //       name: 'AsyncFiberException'
	* //     }
	* //   }
	* // }
	* ```
	*
	* @see {@link runSync} for a version that throws on failure.
	*
	* @category running
	* @since 2.0.0
	*/
	var runSyncExit = runSyncExit$1;
	/**
	* Runs an effect synchronously with provided services, returning an Exit result safely.
	*
	* **When to use**
	*
	* Use when you already have a `Context` and need a synchronous `Exit` instead of
	* throwing on failure.
	*
	* **Example** (Running synchronously with services as Exit)
	*
	* ```ts
	* import { Context, Effect, Exit } from "effect"
	*
	* // Define a logger service
	* const Logger = Context.Service<{
	*   log: (msg: string) => void
	* }>("Logger")
	*
	* const program = Effect.gen(function*() {
	*   const logger = yield* Effect.service(Logger)
	*   logger.log("Computing result...")
	*   return 42
	* })
	*
	* // Prepare context
	* const context = Context.make(Logger, {
	*   log: (msg) => console.log(`[LOG] ${msg}`)
	* })
	*
	* const exit = Effect.runSyncExitWith(context)(program)
	*
	* if (Exit.isSuccess(exit)) {
	*   console.log(`Success: ${exit.value}`)
	* } else {
	*   console.log(`Failure: ${exit.cause}`)
	* }
	* // Output:
	* // [LOG] Computing result...
	* // Success: 42
	* ```
	*
	* @category running
	* @since 4.0.0
	*/
	var runSyncExitWith = runSyncExitWith$1;
	/**
	* Logs one or more messages at the WARNING level.
	*
	* **Example** (Logging warnings)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   yield* Effect.logWarning("API rate limit approaching")
	*   yield* Effect.logWarning("Retries remaining:", 2, "Operation:", "fetchData")
	*
	*   // Useful for non-critical issues
	*   const deprecated = true
	*   if (deprecated) {
	*     yield* Effect.logWarning("Using deprecated API endpoint")
	*   }
	* })
	*
	* Effect.runPromise(program)
	* // Output:
	* // timestamp=2023-... level=WARN message="API rate limit approaching"
	* // timestamp=2023-... level=WARN message="Retries remaining: 2 Operation: fetchData"
	* // timestamp=2023-... level=WARN message="Using deprecated API endpoint"
	* ```
	*
	* @category logging
	* @since 2.0.0
	*/
	var logWarning = /*#__PURE__*/ logWithLevel("Warn");
	Service()("effect/Effect/Transaction");
	/**
	* Applies `map` eagerly when an effect is already resolved.
	*
	* **When to use**
	*
	* Use when an already-resolved effect should apply a success transformation
	* immediately while pending effects still use regular mapping.
	*
	* **Details**
	*
	* Success effects apply the mapping function immediately. Failure effects pass
	* through unchanged, and pending effects fall back to regular `map` behavior.
	*
	* **Example** (Mapping already completed effects)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* // For resolved effects, the mapping is applied immediately
	* const resolved = Effect.succeed(5)
	* const mapped = Effect.mapEager(resolved, (n) => n * 2) // Applied eagerly
	*
	* // For pending effects, behaves like regular map
	* const pending = Effect.delay(Effect.succeed(5), "100 millis")
	* const mappedPending = Effect.mapEager(pending, (n) => n * 2) // Uses regular map
	* ```
	*
	* @category eager
	* @since 4.0.0
	*/
	var mapEager = mapEager$1;
	/**
	* Applies `flatMap` eagerly when an effect is already resolved.
	*
	* **When to use**
	*
	* Use when an already-resolved successful effect should bind immediately to the
	* next effect while pending effects still use regular flat mapping.
	*
	* **Details**
	*
	* Success effects apply the flatMap function immediately. Failure effects pass
	* through unchanged, and pending effects fall back to regular `flatMap`
	* behavior.
	*
	* **Example** (Flat mapping eagerly when possible)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* // For resolved effects, the flatMap is applied immediately
	* const resolved = Effect.succeed(5)
	* const flatMapped = Effect.flatMapEager(resolved, (n) => Effect.succeed(n * 2)) // Applied eagerly
	*
	* // For pending effects, behaves like regular flatMap
	* const pending = Effect.delay(Effect.succeed(5), "100 millis")
	* const flatMappedPending = Effect.flatMapEager(
	*   pending,
	*   (n) => Effect.succeed(n * 2)
	* ) // Uses regular flatMap
	* ```
	*
	* @category eager
	* @since 4.0.0
	*/
	var flatMapEager = flatMapEager$1;
	/**
	* Creates untraced function effects with eager evaluation optimization.
	*
	* **Details**
	*
	* Executes generator functions eagerly when all yielded effects are synchronous,
	* stopping at the first async effect and deferring to normal execution.
	*
	* **Example** (Defining eager untraced effect functions)
	*
	* ```ts
	* import { Effect } from "effect"
	*
	* const computation = Effect.fnUntracedEager(function*() {
	*   yield* Effect.succeed(1)
	*   yield* Effect.succeed(2)
	*   return "computed eagerly"
	* })
	*
	* const effect = computation() // Executed immediately if all effects are sync
	* ```
	*
	* @category eager
	* @since 4.0.0
	*/
	var fnUntracedEager = fnUntracedEager$1;
	var await_ = fiberAwait;
	/**
	* Interrupts a fiber, causing it to stop executing and clean up any
	* acquired resources.
	*
	* **When to use**
	*
	* Use when you need to cancel a forked fiber and wait for its cleanup to
	* complete.
	*
	* **Details**
	*
	* The returned Effect completes only after the interrupted fiber has completed.
	*
	* **Gotchas**
	*
	* Interruption is cooperative. A fiber can continue running while it is inside
	* uninterruptible work or finalizers.
	*
	* **Example** (Interrupting a fiber)
	*
	* ```ts
	* import { Effect, Fiber } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   const fiber = yield* Effect.forkChild(
	*     Effect.delay("1 second")(Effect.succeed(42))
	*   )
	*   yield* Fiber.interrupt(fiber)
	*   console.log("Fiber interrupted")
	* })
	* ```
	*
	* @see {@link interruptAs} for specifying the interrupting fiber ID
	* @see {@link await_ await} for observing the interrupted fiber's Exit
	*
	* @category interruption
	* @since 2.0.0
	*/
	var interrupt = fiberInterrupt;
	/**
	* Adds a fiber to a `Scope` and returns the same fiber.
	*
	* **When to use**
	*
	* Use when a manually managed fiber should be interrupted when a Scope closes.
	*
	* **Details**
	*
	* When the scope is closed, the fiber is interrupted. If the scope is already
	* closed, the fiber is interrupted immediately.
	*
	* **Gotchas**
	*
	* This does not wait for the fiber to complete. It only registers the
	* interruption finalizer and returns the same fiber.
	*
	* @see {@link interrupt} for interrupting and waiting for completion
	*
	* @category resource management
	* @since 4.0.0
	*/
	var runIn = fiberRunIn;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/ManagedRuntime.js
	var TypeId$8 = "~effect/ManagedRuntime";
	/**
	* Creates a `ManagedRuntime` from a layer.
	*
	* **When to use**
	*
	* Use to create a reusable runtime from a `Layer` for application entry points
	* or integration code that runs many effects without rebuilding services.
	*
	* **Details**
	*
	* The layer is built lazily on first use and its context is cached for
	* subsequent runs. Resources acquired by the layer are owned by the runtime and
	* are released when `dispose` or `disposeEffect` is run. `options.memoMap` can
	* be used to share layer memoization with other layer builds.
	*
	* **Gotchas**
	*
	* Dispose the runtime when it is no longer needed. A runtime cannot be reused
	* after disposal.
	*
	* **Example** (Creating a managed runtime)
	*
	* ```ts
	* import { Context, Effect, Layer, ManagedRuntime } from "effect"
	*
	* class Notifications extends Context.Service<Notifications, {
	*   readonly notify: (message: string) => Effect.Effect<void>
	* }>()("Notifications") {
	*   static readonly layer = Layer.succeed(this)({
	*     notify: Effect.fn("Notifications.notify")((message) =>
	*       Effect.sync(() => console.log(message))
	*     )
	*   })
	* }
	*
	* const runtime = ManagedRuntime.make(Notifications.layer)
	*
	* const program = Effect.flatMap(
	*   Notifications,
	*   (_) => _.notify("Hello, world!")
	* ).pipe(Effect.ensuring(runtime.disposeEffect))
	*
	* runtime.runPromise(program)
	* // Hello, world!
	* ```
	*
	* @see {@link ManagedRuntime} for the returned runtime interface
	* @see {@link Layer.MemoMap} for shared layer memoization
	* @see {@link Layer.build} for lower-level scoped layer construction
	*
	* @category runtime class
	* @since 2.0.0
	*/
	var make$8 = (layer, options) => {
		const memoMap = options?.memoMap ?? makeMemoMapUnsafe();
		const scope = makeUnsafe$3("parallel");
		const layerScope = forkUnsafe(scope, "sequential");
		const defaultRunOptions = { onFiberStart: runIn(scope) };
		const mergeRunOptions = (options) => options ? {
			...options,
			onFiberStart: options.onFiberStart ? (fiber) => {
				defaultRunOptions.onFiberStart(fiber);
				options.onFiberStart(fiber);
			} : defaultRunOptions.onFiberStart
		} : defaultRunOptions;
		let buildFiber;
		const contextEffect = withFiber((fiber) => {
			if (!buildFiber) buildFiber = runFork(tap(buildWithMemoMap(layer, memoMap, layerScope), (context) => sync(() => {
				self.cachedContext = context;
			})), {
				...defaultRunOptions,
				scheduler: fiber.currentScheduler
			});
			return flatten(await_(buildFiber));
		});
		const self = {
			[TypeId$8]: TypeId$8,
			memoMap,
			scope,
			contextEffect,
			cachedContext: void 0,
			context() {
				return self.cachedContext === void 0 ? runPromise(self.contextEffect) : Promise.resolve(self.cachedContext);
			},
			dispose() {
				return runPromise(self.disposeEffect);
			},
			disposeEffect: suspend$1(() => {
				self.contextEffect = die("ManagedRuntime disposed");
				self.cachedContext = void 0;
				return close(self.scope, void_$1);
			}),
			runFork(effect, options) {
				return self.cachedContext === void 0 ? runFork(provide(self, effect), mergeRunOptions(options)) : runForkWith(self.cachedContext)(effect, mergeRunOptions(options));
			},
			runCallback(effect, options) {
				return self.cachedContext === void 0 ? runCallback(provide(self, effect), mergeRunOptions(options)) : runCallbackWith(self.cachedContext)(effect, mergeRunOptions(options));
			},
			runSyncExit(effect) {
				return self.cachedContext === void 0 ? runSyncExit(provide(self, effect)) : runSyncExitWith(self.cachedContext)(effect);
			},
			runSync(effect) {
				return self.cachedContext === void 0 ? runSync(provide(self, effect)) : runSyncWith(self.cachedContext)(effect);
			},
			runPromiseExit(effect, options) {
				return self.cachedContext === void 0 ? runPromiseExit(provide(self, effect), mergeRunOptions(options)) : runPromiseExitWith(self.cachedContext)(effect, mergeRunOptions(options));
			},
			runPromise(effect, options) {
				return self.cachedContext === void 0 ? runPromise(provide(self, effect), mergeRunOptions(options)) : runPromiseWith(self.cachedContext)(effect, mergeRunOptions(options));
			}
		};
		return self;
	};
	function provide(managed, effect) {
		return flatMap(managed.contextEffect, (context) => provideContext(effect, context));
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/BigDecimal.js
	/**
	* Decimal numbers and arithmetic for cases where JavaScript `number` rounding
	* is not precise enough. A `BigDecimal` stores digits as a `bigint` plus a
	* decimal scale, which lets the module parse, compare, add, subtract, multiply,
	* divide, round, and format decimal values such as money, quantities, and
	* measurements.
	*
	* @since 2.0.0
	*/
	var TypeId$7 = "~effect/BigDecimal";
	var BigDecimalProto = {
		[TypeId$7]: TypeId$7,
		[symbol$1]() {
			const normalized = normalize(this);
			return combine(hash(normalized.value), number$1(normalized.scale));
		},
		[symbol](that) {
			return isBigDecimal(that) && equals(this, that);
		},
		toString() {
			return `BigDecimal(${format(this)})`;
		},
		toJSON() {
			return {
				_id: "BigDecimal",
				value: String(this.value),
				scale: this.scale
			};
		},
		[NodeInspectSymbol]() {
			return this.toJSON();
		},
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	/**
	* Checks whether a given value is a `BigDecimal`.
	*
	* **When to use**
	*
	* Use to validate unknown input and narrow it to `BigDecimal`.
	*
	* **Example** (Checking BigDecimal values)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	*
	* const decimal = BigDecimal.fromNumber(123.45)
	* console.log(BigDecimal.isBigDecimal(decimal)) // true
	* console.log(BigDecimal.isBigDecimal(123.45)) // false
	* console.log(BigDecimal.isBigDecimal("123.45")) // false
	* ```
	*
	* @category guards
	* @since 2.0.0
	*/
	var isBigDecimal = (u) => hasProperty(u, TypeId$7);
	/**
	* Creates a `BigDecimal` from a `bigint` value and a scale.
	*
	* **When to use**
	*
	* Use to construct a decimal directly from its unscaled integer value and
	* decimal scale.
	*
	* **Example** (Creating decimals from bigint and scale)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	*
	* // Create 123.45 (12345 with scale 2)
	* const decimal = BigDecimal.make(12345n, 2)
	* console.log(BigDecimal.format(decimal)) // "123.45"
	*
	* // Create 42 (42 with scale 0)
	* const integer = BigDecimal.make(42n, 0)
	* console.log(BigDecimal.format(integer)) // "42"
	* ```
	*
	* @see {@link fromBigInt} for constructing an integer decimal from a `bigint`
	*
	* @category constructors
	* @since 2.0.0
	*/
	var make$7 = (value, scale) => {
		const o = Object.create(BigDecimalProto);
		o.value = value;
		o.scale = scale;
		return o;
	};
	/**
	* Internal function used to create pre-normalized `BigDecimal`s.
	*
	* @internal
	*/
	var makeNormalizedUnsafe = (value, scale) => {
		if (value !== bigint0 && value % bigint10 === bigint0) throw new RangeError("Value must be normalized");
		const o = make$7(value, scale);
		o.normalized = o;
		return o;
	};
	var bigint0 = /*#__PURE__*/ BigInt(0);
	var bigint10 = /*#__PURE__*/ BigInt(10);
	var zero = /*#__PURE__*/ makeNormalizedUnsafe(bigint0, 0);
	/**
	* Normalizes a given `BigDecimal` by removing trailing zeros.
	*
	* **When to use**
	*
	* Use to canonicalize decimals that have equivalent values but different
	* internal scales.
	*
	* **Example** (Normalizing trailing zeros)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(
	*   BigDecimal.normalize(BigDecimal.fromStringUnsafe("123.00000")),
	*   BigDecimal.normalize(BigDecimal.make(123n, 0))
	* )
	* assert.deepStrictEqual(
	*   BigDecimal.normalize(BigDecimal.fromStringUnsafe("12300000")),
	*   BigDecimal.normalize(BigDecimal.make(123n, -5))
	* )
	* ```
	*
	* @see {@link format} for rendering normalized decimals as strings
	*
	* @category scaling
	* @since 2.0.0
	*/
	var normalize = (self) => {
		if (self.normalized === void 0) if (self.value === bigint0) self.normalized = zero;
		else {
			const digits = `${self.value}`;
			let trail = 0;
			for (let i = digits.length - 1; i >= 0; i--) if (digits[i] === "0") trail++;
			else break;
			if (trail === 0) self.normalized = self;
			self.normalized = makeNormalizedUnsafe(BigInt(digits.substring(0, digits.length - trail)), self.scale - trail);
		}
		return self.normalized;
	};
	/**
	* Changes a `BigDecimal` to the specified scale.
	*
	* **When to use**
	*
	* Use to change how many decimal places are represented by a `BigDecimal`.
	*
	* **Details**
	*
	* Increasing the scale appends decimal zeros. Decreasing the scale discards
	* digits beyond the target scale by `bigint` division, which truncates toward
	* zero.
	*
	* **Example** (Scaling decimal precision)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	*
	* const decimal = BigDecimal.fromNumberUnsafe(123.45)
	*
	* // Increase scale (add more precision)
	* const scaled = BigDecimal.scale(decimal, 4)
	* console.log(BigDecimal.format(scaled)) // "123.4500"
	*
	* // Decrease scale (reduce precision, rounds down)
	* const reduced = BigDecimal.scale(decimal, 1)
	* console.log(BigDecimal.format(reduced)) // "123.4"
	* ```
	*
	* @see {@link round} for changing scale with configurable rounding
	*
	* @category scaling
	* @since 2.0.0
	*/
	var scale = /*#__PURE__*/ dual(2, (self, scale) => {
		if (scale > self.scale) return make$7(self.value * bigint10 ** BigInt(scale - self.scale), scale);
		if (scale < self.scale) return make$7(self.value / bigint10 ** BigInt(self.scale - scale), scale);
		return self;
	});
	/**
	* Determines the absolute value of a given `BigDecimal`.
	*
	* **When to use**
	*
	* Use to remove the sign from a `BigDecimal` while preserving its magnitude.
	*
	* **Example** (Calculating absolute values)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(BigDecimal.abs(BigDecimal.fromStringUnsafe("-5")), BigDecimal.fromStringUnsafe("5"))
	* assert.deepStrictEqual(BigDecimal.abs(BigDecimal.fromStringUnsafe("0")), BigDecimal.fromStringUnsafe("0"))
	* assert.deepStrictEqual(BigDecimal.abs(BigDecimal.fromStringUnsafe("5")), BigDecimal.fromStringUnsafe("5"))
	* ```
	*
	* @category math
	* @since 2.0.0
	*/
	var abs = (n) => n.value < bigint0 ? make$7(-n.value, n.scale) : n;
	/**
	* Provides an `Equivalence` instance for `BigDecimal` that determines equality between BigDecimal values.
	*
	* **When to use**
	*
	* Use when comparing decimal values through APIs that accept an equivalence
	* relation.
	*
	* **Example** (Checking decimal equivalence)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	*
	* const a = BigDecimal.fromStringUnsafe("1.50")
	* const b = BigDecimal.fromStringUnsafe("1.5")
	* const c = BigDecimal.fromStringUnsafe("2.0")
	*
	* console.log(BigDecimal.Equivalence(a, b)) // true (1.50 === 1.5)
	* console.log(BigDecimal.Equivalence(a, c)) // false (1.50 !== 2.0)
	* ```
	*
	* @category instances
	* @since 2.0.0
	*/
	var Equivalence$1 = /*#__PURE__*/ make$13((self, that) => {
		if (self.scale > that.scale) return scale(that, self.scale).value === self.value;
		if (self.scale < that.scale) return scale(self, that.scale).value === that.value;
		return self.value === that.value;
	});
	/**
	* Checks whether two `BigDecimal`s are equal.
	*
	* **When to use**
	*
	* Use to compare two `BigDecimal` values for numeric equality.
	*
	* **Example** (Checking decimal equality)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	*
	* const a = BigDecimal.fromStringUnsafe("1.5")
	* const b = BigDecimal.fromStringUnsafe("1.50")
	* const c = BigDecimal.fromStringUnsafe("2.0")
	*
	* console.log(BigDecimal.equals(a, b)) // true
	* console.log(BigDecimal.equals(a, c)) // false
	* ```
	*
	* @see {@link Equivalence} for passing decimal equality to APIs that require an `Equivalence`
	*
	* @category predicates
	* @since 2.0.0
	*/
	var equals = /*#__PURE__*/ dual(2, (self, that) => Equivalence$1(self, that));
	/**
	* Formats a `BigDecimal` as a string.
	*
	* **When to use**
	*
	* Use to render a `BigDecimal` as plain decimal text when possible.
	*
	* **Details**
	*
	* The value is normalized before formatting. Scientific notation is used when
	* the absolute value of the normalized scale is at least `16`; otherwise plain
	* decimal notation is used.
	*
	* **Example** (Formatting decimals)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(BigDecimal.format(BigDecimal.fromStringUnsafe("-5")), "-5")
	* assert.deepStrictEqual(BigDecimal.format(BigDecimal.fromStringUnsafe("123.456")), "123.456")
	* assert.deepStrictEqual(BigDecimal.format(BigDecimal.fromStringUnsafe("-0.00000123")), "-0.00000123")
	* ```
	*
	* @see {@link toExponential} for always rendering scientific notation
	*
	* @category converting
	* @since 2.0.0
	*/
	var format = (n) => {
		const normalized = normalize(n);
		if (Math.abs(normalized.scale) >= 16) return toExponential(normalized);
		const negative = normalized.value < bigint0;
		const absolute = negative ? `${normalized.value}`.substring(1) : `${normalized.value}`;
		let before;
		let after;
		if (normalized.scale >= absolute.length) {
			before = "0";
			after = "0".repeat(normalized.scale - absolute.length) + absolute;
		} else {
			const location = absolute.length - normalized.scale;
			if (location > absolute.length) {
				const zeros = location - absolute.length;
				before = `${absolute}${"0".repeat(zeros)}`;
				after = "";
			} else {
				after = absolute.slice(location);
				before = absolute.slice(0, location);
			}
		}
		const complete = after === "" ? before : `${before}.${after}`;
		return negative ? `-${complete}` : complete;
	};
	/**
	* Formats a given `BigDecimal` as a `string` in scientific notation.
	*
	* **When to use**
	*
	* Use to render a `BigDecimal` in scientific notation.
	*
	* **Example** (Formatting decimals exponentially)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(BigDecimal.toExponential(BigDecimal.make(123456n, -5)), "1.23456e+10")
	* ```
	*
	* @see {@link format} for plain decimal formatting when possible
	*
	* @category converting
	* @since 3.11.0
	*/
	var toExponential = (n) => {
		if (isZero(n)) return "0e+0";
		const normalized = normalize(n);
		const digits = `${abs(normalized).value}`;
		const head = digits.slice(0, 1);
		const tail = digits.slice(1);
		let output = `${isNegative(normalized) ? "-" : ""}${head}`;
		if (tail !== "") output += `.${tail}`;
		const exp = tail.length - normalized.scale;
		return `${output}e${exp >= 0 ? "+" : ""}${exp}`;
	};
	/**
	* Checks whether a given `BigDecimal` is `0`.
	*
	* **When to use**
	*
	* Use to test whether a `BigDecimal` is exactly zero.
	*
	* **Example** (Checking zero decimals)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(BigDecimal.isZero(BigDecimal.fromStringUnsafe("0")), true)
	* assert.deepStrictEqual(BigDecimal.isZero(BigDecimal.fromStringUnsafe("1")), false)
	* ```
	*
	* @category predicates
	* @since 2.0.0
	*/
	var isZero = (n) => n.value === bigint0;
	/**
	* Checks whether a given `BigDecimal` is negative.
	*
	* **When to use**
	*
	* Use to test whether a `BigDecimal` is less than zero.
	*
	* **Example** (Checking negative decimals)
	*
	* ```ts
	* import { BigDecimal } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(BigDecimal.isNegative(BigDecimal.fromStringUnsafe("-1")), true)
	* assert.deepStrictEqual(BigDecimal.isNegative(BigDecimal.fromStringUnsafe("0")), false)
	* assert.deepStrictEqual(BigDecimal.isNegative(BigDecimal.fromStringUnsafe("1")), false)
	* ```
	*
	* @category predicates
	* @since 2.0.0
	*/
	var isNegative = (n) => n.value < bigint0;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/record.js
	/**
	* @since 4.0.0
	*/
	/** @internal */
	function set$2(self, key, value) {
		if (key === "__proto__") Object.defineProperty(self, key, {
			value,
			writable: true,
			enumerable: true,
			configurable: true
		});
		else self[key] = value;
		return self;
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/schema/annotations.js
	/** @internal */
	function resolve(ast) {
		return ast.checks ? ast.checks[ast.checks.length - 1].annotations : ast.annotations;
	}
	/** @internal */
	function resolveAt(key) {
		return (ast) => resolve(ast)?.[key];
	}
	/** @internal */
	var resolveIdentifier$1 = /*#__PURE__*/ resolveAt("identifier");
	/** @internal */
	var getExpected = /*#__PURE__*/ memoize((ast) => {
		const identifier = resolveIdentifier$1(ast);
		if (typeof identifier === "string") return identifier;
		return ast.getExpected(getExpected);
	});
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/SchemaIssue.js
	var TypeId$6 = "~effect/SchemaIssue/Issue";
	/**
	* Returns `true` if the given value is an {@link Issue}.
	*
	* **When to use**
	*
	* Use when you need to narrow an `unknown` value to `Issue` in error-handling
	* code, such as distinguishing an `Issue` from other error types in a catch-all
	* handler.
	*
	* **Details**
	*
	* - Checks for the internal `TypeId` brand on the value.
	*
	* **Example** (Type-guarding an unknown error)
	*
	* ```ts
	* import { SchemaIssue } from "effect"
	*
	* const issue = new SchemaIssue.MissingKey(undefined)
	* console.log(SchemaIssue.isIssue(issue))
	* // true
	* console.log(SchemaIssue.isIssue("not an issue"))
	* // false
	* ```
	*
	* @see {@link Issue}
	*
	* @category guards
	* @since 4.0.0
	*/
	function isIssue(u) {
		return hasProperty(u, TypeId$6);
	}
	var Base$1 = class {
		[TypeId$6] = TypeId$6;
		toString() {
			return defaultFormatter(this);
		}
	};
	/**
	* Represents a schema issue produced when a schema filter (refinement check) fails.
	*
	* **When to use**
	*
	* Use when you need to inspect a schema issue that records which refinement
	* check rejected the value.
	*
	* **Details**
	*
	* - `actual` is the raw input value that was tested (plain `unknown`, not
	*   wrapped in `Option`).
	* - `filter` is the AST filter node that produced this issue.
	* - `issue` is the inner issue describing the failure reason.
	*
	* **Example** (Matching a Filter issue)
	*
	* ```ts
	* import { SchemaIssue } from "effect"
	*
	* function describe(issue: SchemaIssue.Issue): string {
	*   if (issue._tag === "Filter") {
	*     return `Filter failed on: ${JSON.stringify(issue.actual)}`
	*   }
	*   return String(issue)
	* }
	* ```
	*
	* @see {@link Leaf} — terminal issue types that commonly appear as the inner `issue`
	* @see {@link CheckHook} — formatter hook for `Filter` issues
	*
	* @category models
	* @since 4.0.0
	*/
	var Filter$1 = class extends Base$1 {
		_tag = "Filter";
		/**
		* The input value that caused the issue.
		*/
		actual;
		/**
		* The filter that failed.
		*/
		filter;
		/**
		* The issue that occurred.
		*/
		issue;
		constructor(actual, filter, issue) {
			super();
			this.actual = actual;
			this.filter = filter;
			this.issue = issue;
		}
	};
	/**
	* Represents a schema issue produced when a schema transformation (encode/decode step) fails.
	*
	* **When to use**
	*
	* Use when you need to inspect failures from `Schema.decodeTo` / `Schema.encodeTo`
	*   transformations.
	*
	* **Details**
	*
	* - `ast` is the AST node for the transformation that failed.
	* - `actual` is `Option.some(value)` when the input was present, or
	*   `Option.none()` when it was absent.
	* - `issue` is the inner issue describing the failure.
	*
	* @see {@link Filter} — failure from a refinement check (not a transformation)
	* @see {@link Composite} — multiple issues from a single schema node
	*
	* @category models
	* @since 4.0.0
	*/
	var Encoding = class extends Base$1 {
		_tag = "Encoding";
		/**
		* The schema that caused the issue.
		*/
		ast;
		/**
		* The input value that caused the issue.
		*/
		actual;
		/**
		* The issue that occurred.
		*/
		issue;
		constructor(ast, actual, issue) {
			super();
			this.ast = ast;
			this.actual = actual;
			this.issue = issue;
		}
	};
	/**
	* Wraps an inner {@link Issue} with a property-key path, indicating *where* in
	* a nested structure the error occurred.
	*
	* **When to use**
	*
	* Use when you need to walk the issue tree to accumulate path segments for error
	* reporting.
	*
	* **Details**
	*
	* - `path` is an array of property keys (strings, numbers, or symbols).
	* - Has no `actual` value — {@link getActual} returns `Option.none()`.
	* - Formatters concatenate nested `Pointer` paths into a single path like
	*   `["a"]["b"][0]`.
	*
	* @see {@link getActual} — returns `Option.none()` for `Pointer`
	* @see {@link Composite} — groups multiple issues under one schema node
	*
	* @category models
	* @since 3.10.0
	*/
	var Pointer = class extends Base$1 {
		_tag = "Pointer";
		/**
		* The path to the location in the input that caused the issue.
		*/
		path;
		/**
		* The issue that occurred.
		*/
		issue;
		constructor(path, issue) {
			super();
			this.path = path;
			this.issue = issue;
		}
	};
	/**
	* Represents a schema issue produced when a required key or tuple index is missing from the input.
	*
	* **When to use**
	*
	* Use when you need to detect absent fields in struct/tuple validation.
	*
	* **Details**
	*
	* - Has no `actual` value — {@link getActual} returns `Option.none()`.
	* - `annotations` may contain a custom `messageMissingKey` for formatting.
	*
	* @see {@link Pointer} — wraps this issue with the missing key's path
	* @see {@link UnexpectedKey} — the opposite case (extra key present)
	*
	* @category models
	* @since 4.0.0
	*/
	var MissingKey = class extends Base$1 {
		_tag = "MissingKey";
		/**
		* The metadata for the issue.
		*/
		annotations;
		constructor(annotations) {
			super();
			this.annotations = annotations;
		}
	};
	/**
	* Represents a schema issue produced when an input object or tuple contains a key/index not
	* declared by the schema.
	*
	* **When to use**
	*
	* Use when you need to detect excess properties during strict struct/tuple
	* validation.
	*
	* **Details**
	*
	* - `actual` is the raw value at the unexpected key (plain `unknown`).
	* - `ast` is the schema that was being validated against.
	* - `annotations` on `ast` may contain a custom `messageUnexpectedKey`.
	*
	* @see {@link MissingKey} — the opposite case (required key absent)
	* @see {@link Pointer} — wraps this issue with the unexpected key's path
	*
	* @category models
	* @since 4.0.0
	*/
	var UnexpectedKey = class extends Base$1 {
		_tag = "UnexpectedKey";
		/**
		* The schema that caused the issue.
		*/
		ast;
		/**
		* The input value that caused the issue.
		*/
		actual;
		constructor(ast, actual) {
			super();
			this.ast = ast;
			this.actual = actual;
		}
	};
	/**
	* Represents a schema issue that groups multiple child issues under a single schema node.
	*
	* **When to use**
	*
	* Use when you need to walk the issue tree for struct/tuple schemas that collect
	* all field errors rather than failing on the first.
	*
	* **Details**
	*
	* - `issues` is a non-empty readonly array (at least one child).
	* - `actual` is `Option.some(value)` when the input was present, or
	*   `Option.none()` when absent.
	* - Formatters flatten `Composite` by recursing into each child.
	*
	* @see {@link AnyOf} — used for union no-match errors (similar but different semantics)
	* @see {@link Pointer} — adds path context to individual issues
	*
	* @category models
	* @since 3.10.0
	*/
	var Composite = class extends Base$1 {
		_tag = "Composite";
		/**
		* The schema that caused the issue.
		*/
		ast;
		/**
		* The input value that caused the issue.
		*/
		actual;
		/**
		* The issues that occurred.
		*/
		issues;
		constructor(ast, actual, issues) {
			super();
			this.ast = ast;
			this.actual = actual;
			this.issues = issues;
		}
	};
	/**
	* Represents a schema issue produced when the runtime type of the input does not match the type
	* expected by the schema (e.g. got `null` when `string` was expected).
	*
	* **When to use**
	*
	* Use when you need to detect basic type mismatches, such as a wrong primitive
	* or `null` where an object was expected.
	*
	* **Details**
	*
	* - `ast` is the schema node that expected a different type.
	* - `actual` is `Option.some(value)` when the input was present, or
	*   `Option.none()` when no value was provided.
	* - The default formatter renders this as `"Expected <type>, got <actual>"`.
	*
	* **Example** (Formatting output)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* try {
	*   Schema.decodeUnknownSync(Schema.String)(42)
	* } catch (e) {
	*   if (Schema.isSchemaError(e)) {
	*     console.log(String(e.issue))
	*     // "Expected string, got 42"
	*   }
	* }
	* ```
	*
	* @see {@link InvalidValue} — the input has the right type but fails a value constraint
	*
	* @category models
	* @since 4.0.0
	*/
	var InvalidType = class extends Base$1 {
		_tag = "InvalidType";
		/**
		* The schema that caused the issue.
		*/
		ast;
		/**
		* The input value that caused the issue.
		*/
		actual;
		constructor(ast, actual) {
			super();
			this.ast = ast;
			this.actual = actual;
		}
	};
	/**
	* Represents a schema issue produced when the input has the correct type but its value violates a
	* constraint (e.g. a string that is too short, a number out of range).
	*
	* **When to use**
	*
	* Use when you need to detect constraint violations from `Schema.filter`,
	* `Schema.minLength`, `Schema.greaterThan`, or similar checks.
	*
	* **Details**
	*
	* - `actual` is `Option.some(value)` when the failing value is known, or
	*   `Option.none()` when absent.
	* - `annotations` optionally carries a `message` string for formatting.
	* - The default formatter renders this as `"Invalid data <actual>"` unless a
	*   custom `message` annotation is provided.
	*
	* **Example** (Returning InvalidValue from a custom filter)
	*
	* ```ts
	* import { Option, SchemaIssue } from "effect"
	*
	* const issue = new SchemaIssue.InvalidValue(
	*   Option.some(""),
	*   { message: "must not be empty" }
	* )
	* console.log(String(issue))
	* // "must not be empty"
	* ```
	*
	* @see {@link InvalidType} — the input has the wrong type entirely
	* @see {@link Filter} — composite wrapper when a schema filter produces this issue
	*
	* @category models
	* @since 4.0.0
	*/
	var InvalidValue = class extends Base$1 {
		_tag = "InvalidValue";
		/**
		* The value that caused the issue.
		*/
		actual;
		/**
		* The metadata for the issue.
		*/
		annotations;
		constructor(actual, annotations) {
			super();
			this.actual = actual;
			this.annotations = annotations;
		}
	};
	/**
	* Represents a schema issue produced when a value does not match *any* member of a union schema.
	*
	* **When to use**
	*
	* Use when you need to inspect which union members were attempted and why each
	* failed.
	*
	* **Details**
	*
	* - `ast` is the `Union` AST node.
	* - `actual` is the raw input value (plain `unknown`).
	* - `issues` contains per-member failures. When empty, the formatter falls
	*   back to the union's `expected` annotation.
	*
	* @see {@link OneOf} — the opposite: *too many* members matched
	* @see {@link Composite} — groups multiple issues under a non-union schema
	*
	* @category models
	* @since 4.0.0
	*/
	var AnyOf = class extends Base$1 {
		_tag = "AnyOf";
		/**
		* The schema that caused the issue.
		*/
		ast;
		/**
		* The input value that caused the issue.
		*/
		actual;
		/**
		* The issues that occurred.
		*/
		issues;
		constructor(ast, actual, issues) {
			super();
			this.ast = ast;
			this.actual = actual;
			this.issues = issues;
		}
	};
	/**
	* Represents a schema issue produced when a value matches *multiple* members of a union that is
	* configured to allow exactly one match (oneOf mode).
	*
	* **When to use**
	*
	* Use when you need to detect ambiguous union matches when `oneOf` validation is
	* enabled.
	*
	* **Details**
	*
	* - `ast` is the `Union` AST node.
	* - `actual` is the raw input value (plain `unknown`).
	* - `successes` lists the AST nodes of each member that accepted the input.
	* - The default formatter renders this as
	*   `"Expected exactly one member to match the input <actual>"`.
	*
	* @see {@link AnyOf} — the opposite: *no* members matched
	*
	* @category models
	* @since 4.0.0
	*/
	var OneOf = class extends Base$1 {
		_tag = "OneOf";
		/**
		* The schema that caused the issue.
		*/
		ast;
		/**
		* The input value that caused the issue.
		*/
		actual;
		/**
		* The schemas that were successful.
		*/
		successes;
		constructor(ast, actual, successes) {
			super();
			this.ast = ast;
			this.actual = actual;
			this.successes = successes;
		}
	};
	function makeFilterIssue(input, entry) {
		if (isIssue(entry)) return entry;
		if (typeof entry === "string") return new InvalidValue(some(input), { message: entry });
		const inner = typeof entry.issue === "string" ? new InvalidValue(some(input), { message: entry.issue }) : entry.issue;
		return new Pointer(entry.path, inner);
	}
	/** @internal */
	function makeSingle(input, out) {
		if (out === void 0) return;
		if (typeof out === "boolean") return out ? void 0 : new InvalidValue(some(input));
		return makeFilterIssue(input, out);
	}
	/** @internal */
	function make$6(input, ast, out) {
		if (Array.isArray(out)) {
			if (isReadonlyArrayNonEmpty(out)) {
				if (out.length === 1) return makeFilterIssue(input, out[0]);
				return new Composite(ast, some(input), map$3(out, (entry) => makeFilterIssue(input, entry)));
			}
			return;
		}
		return makeSingle(input, out);
	}
	/**
	* Returns the built-in {@link LeafHook} used by default formatters.
	*
	* **When to use**
	*
	* Use as the default leaf renderer when customizing only the {@link CheckHook}.
	*
	* **Details**
	*
	* - Checks for a `message` annotation first; returns it if present.
	* - Otherwise generates a default message per `_tag`:
	*   - `InvalidType` → `"Expected <type>, got <actual>"`
	*   - `InvalidValue` → `"Invalid data <actual>"`
	*   - `MissingKey` → `"Missing key"`
	*   - `UnexpectedKey` → `"Unexpected key with value <actual>"`
	*   - `Forbidden` → `"Forbidden operation"`
	*   - `OneOf` → `"Expected exactly one member to match the input <actual>"`
	*
	* **Example** (Formatting Standard Schema issues with defaultLeafHook)
	*
	* ```ts
	* import { SchemaIssue } from "effect"
	*
	* const formatter = SchemaIssue.makeFormatterStandardSchemaV1({
	*   leafHook: SchemaIssue.defaultLeafHook
	* })
	* ```
	*
	* @see {@link LeafHook}
	* @see {@link makeFormatterStandardSchemaV1}
	*
	* @category Formatter
	* @since 4.0.0
	*/
	var defaultLeafHook = (issue) => {
		const message = findMessage(issue);
		if (message !== void 0) return message;
		switch (issue._tag) {
			case "InvalidType": return getExpectedMessage(getExpected(issue.ast), formatOption(issue.actual));
			case "InvalidValue": return `Invalid data ${formatOption(issue.actual)}`;
			case "MissingKey": return "Missing key";
			case "UnexpectedKey": return `Unexpected key with value ${format$1(issue.actual)}`;
			case "Forbidden": return "Forbidden operation";
			case "OneOf": return `Expected exactly one member to match the input ${format$1(issue.actual)}`;
		}
	};
	/**
	* Returns the built-in {@link CheckHook} used by default formatters.
	*
	* **When to use**
	*
	* Use as the default filter renderer when customizing only the {@link LeafHook}.
	*
	* **Details**
	*
	* - Looks for a `message` annotation on the inner issue first, then on the
	*   filter itself.
	* - Returns `undefined` when no annotation is found, causing the formatter to
	*   fall back to `"Expected <filter>, got <actual>"`.
	*
	* @see {@link CheckHook}
	* @see {@link makeFormatterStandardSchemaV1}
	*
	* @category Formatter
	* @since 4.0.0
	*/
	var defaultCheckHook = (issue) => {
		return findMessage(issue.issue) ?? findMessage(issue);
	};
	function getExpectedMessage(expected, actual) {
		return `Expected ${expected}, got ${actual}`;
	}
	function toDefaultIssues(issue, path, leafHook, checkHook) {
		switch (issue._tag) {
			case "Filter": {
				const message = checkHook(issue);
				if (message !== void 0) return [{
					path,
					message
				}];
				switch (issue.issue._tag) {
					case "InvalidValue": return [{
						path,
						message: getExpectedMessage(formatCheck(issue.filter), format$1(issue.actual))
					}];
					default: return toDefaultIssues(issue.issue, path, leafHook, checkHook);
				}
			}
			case "Encoding": return toDefaultIssues(issue.issue, path, leafHook, checkHook);
			case "Pointer": return toDefaultIssues(issue.issue, [...path, ...issue.path], leafHook, checkHook);
			case "Composite": return issue.issues.flatMap((issue) => toDefaultIssues(issue, path, leafHook, checkHook));
			case "AnyOf": {
				const message = findMessage(issue);
				if (issue.issues.length === 0) {
					if (message !== void 0) return [{
						path,
						message
					}];
					return [{
						path,
						message: getExpectedMessage(getExpected(issue.ast), format$1(issue.actual))
					}];
				}
				return issue.issues.flatMap((issue) => toDefaultIssues(issue, path, leafHook, checkHook));
			}
			default: return [{
				path,
				message: leafHook(issue)
			}];
		}
	}
	function formatCheck(check) {
		const expected = check.annotations?.expected;
		if (typeof expected === "string") return expected;
		switch (check._tag) {
			case "Filter": return "<filter>";
			case "FilterGroup": return check.checks.map((check) => formatCheck(check)).join(" & ");
		}
	}
	/**
	* Creates a {@link Formatter} that converts an {@link Issue} into a
	* human-readable multi-line string.
	*
	* **When to use**
	*
	* Use when you need to format a `SchemaIssue.Issue` as error messages for
	* logging, CLI output, or developer-facing diagnostics.
	*
	* **Details**
	*
	* This is the default formatter used by `SchemaIssue.toString()`.
	*
	* - Flattens the issue tree into `{ message, path }` entries using
	*   {@link defaultLeafHook} and {@link defaultCheckHook}.
	* - Each entry is rendered as `"<message>"` or `"<message>\n  at <path>"`.
	* - Multiple entries are joined with newlines.
	*
	* **Example** (Formatting an issue as a string)
	*
	* ```ts
	* import { SchemaIssue } from "effect"
	*
	* const formatter = SchemaIssue.makeFormatterDefault()
	* ```
	*
	* @see {@link makeFormatterStandardSchemaV1} — produces Standard Schema V1 format instead
	* @see {@link Formatter}
	*
	* @category Formatter
	* @since 4.0.0
	*/
	function makeFormatterDefault() {
		return (issue) => toDefaultIssues(issue, [], defaultLeafHook, defaultCheckHook).map(formatDefaultIssue).join("\n");
	}
	/** @internal */
	var defaultFormatter = /*#__PURE__*/ makeFormatterDefault();
	function formatDefaultIssue(issue) {
		let out = issue.message;
		if (issue.path && issue.path.length > 0) {
			const path = formatPath(issue.path);
			out += `\n  at ${path}`;
		}
		return out;
	}
	function findMessage(issue) {
		switch (issue._tag) {
			case "InvalidType":
			case "OneOf":
			case "Composite":
			case "AnyOf": return getMessageAnnotation(issue.ast.annotations);
			case "InvalidValue":
			case "Forbidden": return getMessageAnnotation(issue.annotations);
			case "MissingKey": return getMessageAnnotation(issue.annotations, "messageMissingKey");
			case "UnexpectedKey": return getMessageAnnotation(issue.ast.annotations, "messageUnexpectedKey");
			case "Filter": return getMessageAnnotation(issue.filter.annotations);
			case "Encoding": return findMessage(issue.issue);
		}
	}
	function getMessageAnnotation(annotations, type = "message") {
		const message = annotations?.[type];
		if (typeof message === "string") return message;
	}
	function formatOption(actual) {
		if (isNone(actual)) return "no value provided";
		return format$1(actual.value);
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/schema/cause.js
	/** @internal */
	function getSchemaIssue(cause) {
		let issue;
		for (const reason of cause.reasons) {
			if (!isFailReason(reason) || !isIssue(reason.error)) return;
			issue ??= reason.error;
		}
		return issue;
	}
	/** @internal */
	function getSchemaIssueOrThrow(cause, message) {
		const issue = getSchemaIssue(cause);
		if (issue === void 0) throw new Error(message, { cause });
		return issue;
	}
	Service()("effect/DateTime/CurrentTimeZone");
	TaggedError("EncodingError");
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/SchemaGetter.js
	/**
	* Builds one-way conversions used by schemas.
	*
	* A `Getter<T, E, R>` receives an optional encoded value and returns an
	* optional decoded value. It can also report a schema issue or require Effect
	* services. Schema transformations use getters to describe one direction of a
	* conversion, for example decoding a field from input data. This module
	* includes basic getters, validation helpers, pure and effectful conversions,
	* and ready-made conversions for common string, number, binary, date, form, and
	* URL-related values.
	*
	* @since 4.0.0
	*/
	/**
	* Represents a composable transformation from an encoded type `E` to a decoded type `T`.
	*
	* **When to use**
	*
	* Use when you need a schema getter to build and compose custom transformations
	* for `Schema.decodeTo` or `Schema.decode`.
	*
	* **Details**
	*
	* A getter wraps a function `Option<E> -> Effect<Option<T>, Issue, R>`. It
	* receives `Option.None` when the encoded key is absent, such as a missing
	* struct field, and returns `Option.None` to omit the value from the decoded
	* output. It fails with `Issue` on invalid input and may require Effect
	* services via `R`. `.map(f)` applies `f` to the decoded value inside `Some`
	* while leaving `None` unchanged. `.compose(other)` chains two getters by
	* feeding the output of `this` into `other`; passthrough getters on either side
	* are optimized away.
	*
	* **Example** (Creating and composing getters)
	*
	* ```ts
	* import { SchemaGetter } from "effect"
	*
	* const parseNumber = SchemaGetter.transform<number, string>((s) => Number(s))
	* const double = SchemaGetter.transform<number, number>((n) => n * 2)
	* const composed = parseNumber.compose(double)
	* // composed: Getter<number, string> — parses then doubles
	* ```
	*
	* @see {@link transform} to create a getter from a pure function
	* @see {@link passthrough} for the identity getter
	* @see {@link transformOrFail} for fallible transformation
	*
	* @category models
	* @since 4.0.0
	*/
	var Getter = class Getter extends Class$1 {
		run;
		constructor(run) {
			super();
			this.run = run;
		}
		map(f) {
			return new Getter((oe, options) => this.run(oe, options).pipe(mapEager(map$5(f))));
		}
		compose(other) {
			if (isPassthrough(this)) return other;
			if (isPassthrough(other)) return this;
			return new Getter((oe, options) => this.run(oe, options).pipe(flatMapEager((ot) => other.run(ot, options))));
		}
	};
	var passthrough_$1 = /*#__PURE__*/ new Getter(succeed);
	function isPassthrough(getter) {
		return getter.run === passthrough_$1.run;
	}
	function passthrough$1() {
		return passthrough_$1;
	}
	/**
	* Creates a getter that handles present values (`Option.Some`), passing `None` through.
	*
	* **When to use**
	*
	* Use when you need a schema getter to transform or validate only when a field
	* value is present.
	* - Missing keys should remain absent in the output.
	*
	* **Details**
	*
	* - When input is `None`, returns `None` (no-op).
	* - When input is `Some(e)`, calls `f(e, options)` to produce the result.
	* - `f` may return `None` to omit the value, or fail with an `Issue`.
	*
	* **Example** (Transforming only present values)
	*
	* ```ts
	* import { Effect, Option, SchemaGetter } from "effect"
	*
	* const parseIfPresent = SchemaGetter.onSome<number, string>(
	*   (s) => Effect.succeed(Option.some(Number(s)))
	* )
	* ```
	*
	* @see {@link onNone} to handle only absent values
	* @see {@link transform} for a simpler pure transformation of present values
	* @see {@link transformOrFail} for fallible transformation of present values
	*
	* @category constructors
	* @since 4.0.0
	*/
	function onSome(f) {
		return new Getter((oe, options) => isNone(oe) ? succeedNone : f(oe.value, options));
	}
	/**
	* Creates a getter that applies a pure function to present values.
	*
	* **When to use**
	*
	* Use when you need a schema getter for a pure, infallible transformation
	* between types.
	* - Building encode/decode pairs for `Schema.decodeTo`.
	*
	* **Details**
	*
	* - This is the most commonly used constructor.
	* - Transforms `Some(e)` to `Some(f(e))` and leaves `None` unchanged.
	* - Skips `None` inputs — only called when a value is present.
	* - Never fails.
	*
	* **Example** (Transforming strings to numbers)
	*
	* ```ts
	* import { Schema, SchemaGetter } from "effect"
	*
	* const NumberFromString = Schema.String.pipe(
	*   Schema.decodeTo(Schema.Number, {
	*     decode: SchemaGetter.transform((s) => Number(s)),
	*     encode: SchemaGetter.transform((n) => String(n))
	*   })
	* )
	* ```
	*
	* @see {@link transformOrFail} when the transformation can fail
	* @see {@link transformOptional} when you need to handle `None` inputs
	* @see {@link passthrough} when no transformation is needed
	*
	* @category constructors
	* @since 4.0.0
	*/
	function transform$1(f) {
		return transformOptional(map$5(f));
	}
	/**
	* Creates a getter that transforms the full `Option` — both present and absent values.
	*
	* **When to use**
	*
	* Use when you need a schema getter to handle both `Some` and `None` cases.
	*
	* **Details**
	*
	* The getter is pure and never fails. It receives the full `Option<E>` and
	* must return `Option<T>`, so it can turn a present value into absent or an
	* absent value into present.
	*
	* **Example** (Filtering out empty strings)
	*
	* ```ts
	* import { Option, SchemaGetter } from "effect"
	*
	* const skipEmpty = SchemaGetter.transformOptional<string, string>((o) =>
	*   Option.filter(o, (s) => s.length > 0)
	* )
	* ```
	*
	* @see {@link transform} when you only need to transform present values
	* @see {@link omit} when you always want `None`
	*
	* @category constructors
	* @since 4.0.0
	*/
	function transformOptional(f) {
		return new Getter((oe) => succeed(f(oe)));
	}
	/**
	* Creates a getter that replaces `undefined` values with a default.
	*
	* **When to use**
	*
	* Use when you need a schema getter to provide a fallback for a field that may
	* be `undefined` in the encoded input.
	*
	* **Details**
	*
	* - If the input is `Some(undefined)` or `None`, produces `Some(T)`.
	* - If the input is `Some(value)` where value is not `undefined`, passes it through.
	* - `defaultValue` is an `Effect` that will be executed each time a default is needed.
	*
	* **Example** (Providing a default value for an optional field)
	*
	* ```ts
	* import { Effect, SchemaGetter } from "effect"
	*
	* const withZero = SchemaGetter.withDefault(Effect.succeed(0))
	* // Getter<number, number | undefined>
	* ```
	*
	* @see {@link onNone} to handle only absent keys (not `undefined` values)
	* @see {@link required} when absent input should fail instead of using a default
	*
	* @category constructors
	* @since 4.0.0
	*/
	function withDefault(defaultValue) {
		return new Getter((o) => {
			const filtered = filter$1(o, isNotUndefined);
			return isSome(filtered) ? succeed(filtered) : mapEager(defaultValue, some);
		});
	}
	/**
	* Coerces any value to a `string` using the global `String()` constructor.
	*
	* **When to use**
	*
	* Use when you need a schema getter to coerce a present encoded value to a
	* string with `String()`.
	*
	* **Details**
	*
	* The getter is pure, never fails, and delegates to `globalThis.String`.
	*
	* **Example** (Coercing to a string)
	*
	* ```ts
	* import { SchemaGetter } from "effect"
	*
	* const toString = SchemaGetter.String<number>()
	* // Getter<string, number>
	* ```
	*
	* @see {@link transform} for custom string conversions
	*
	* @category Coercions
	* @since 4.0.0
	*/
	function String$3() {
		return transform$1(globalThis.String);
	}
	/**
	* Coerces any value to a `number` using the global `Number()` constructor.
	*
	* **When to use**
	*
	* Use when you need a schema getter to coerce a present encoded value to a
	* number with `Number()`.
	*
	* **Details**
	*
	* The getter is pure, never fails, and delegates to `globalThis.Number`. It may
	* produce `NaN` for non-numeric inputs.
	*
	* **Example** (Coercing to a number)
	*
	* ```ts
	* import { SchemaGetter } from "effect"
	*
	* const toNumber = SchemaGetter.Number<string>()
	* // Getter<number, string>
	* ```
	*
	* @see {@link transformOrFail} for validated number parsing
	*
	* @category Coercions
	* @since 4.0.0
	*/
	function Number$3() {
		return transform$1(globalThis.Number);
	}
	function parseJson(options) {
		return onSome((input) => try_({
			try: () => some(JSON.parse(input, options?.reviver)),
			catch: (e) => new InvalidValue(some(input), { message: globalThis.String(e) })
		}));
	}
	/**
	* Stringifies a present value using `JSON.stringify`.
	*
	* **When to use**
	*
	* Use when you need a schema getter to serialize a present decoded value to
	* JSON text during encoding.
	*
	* **Details**
	*
	* - Skips `None` inputs.
	* - On thrown stringify failures, such as circular references, fails with
	*   `SchemaIssue.InvalidValue`.
	* - Supports optional `replacer` and `space` options, matching
	*   `JSON.stringify`.
	* - If `JSON.stringify` returns `undefined`, such as for `undefined`,
	*   functions, symbols, or a replacer that removes the root value, that
	*   `undefined` result is returned rather than converted into an `Issue`.
	*
	* **Example** (Stringifying JSON)
	*
	* ```ts
	* import { SchemaGetter } from "effect"
	*
	* const stringify = SchemaGetter.stringifyJson()
	* // Getter<string, unknown>
	* ```
	*
	* @see {@link parseJson} for the inverse operation
	*
	* @category JSON getters
	* @since 4.0.0
	*/
	function stringifyJson(options) {
		return onSome((input) => try_({
			try: () => some(JSON.stringify(input, options?.replacer, options?.space)),
			catch: (e) => new InvalidValue(some(input), { message: globalThis.String(e) })
		}));
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/SchemaTransformation.js
	var TypeId$5 = "~effect/SchemaTransformation/Transformation";
	/**
	* Represents a bidirectional transformation between a decoded type `T` and an encoded
	* type `E`, built from a pair of `Getter`s.
	*
	* **When to use**
	*
	* Use when you need a schema transformation that defines how a schema converts
	* between two representations.
	* - You want to compose multiple transformations into a pipeline.
	* - You want to flip a transformation to swap decode/encode.
	*
	* **Details**
	*
	* This is the primary building block for `Schema.decodeTo`, `Schema.encodeTo`,
	* `Schema.decode`, `Schema.encode`, and `Schema.link`. Each direction is a
	* `SchemaGetter.Getter` that handles optionality, failure, and Effect services.
	*
	* - Immutable — `flip()` and `compose()` return new instances.
	* - `flip()` swaps the decode and encode getters.
	* - `compose(other)` chains: `this.decode` then `other.decode` for decoding,
	*   `other.encode` then `this.encode` for encoding.
	*
	* **Example** (Composing two transformations)
	*
	* ```ts
	* import { SchemaTransformation } from "effect"
	*
	* const trimAndLower = SchemaTransformation.trim().compose(
	*   SchemaTransformation.toLowerCase()
	* )
	* // decode: trim then lowercase
	* // encode: passthrough (both directions)
	* ```
	*
	* @see {@link make} — construct from `{ decode, encode }` getters
	* @see {@link transform} — construct from pure functions
	* @see {@link transformOrFail} — construct from effectful functions
	* @see {@link Middleware} — effect-pipeline-level alternative
	*
	* @category models
	* @since 4.0.0
	*/
	var Transformation = class Transformation {
		[TypeId$5] = TypeId$5;
		_tag = "Transformation";
		decode;
		encode;
		constructor(decode, encode) {
			this.decode = decode;
			this.encode = encode;
		}
		flip() {
			return new Transformation(this.encode, this.decode);
		}
		compose(other) {
			return new Transformation(this.decode.compose(other.decode), other.encode.compose(this.encode));
		}
	};
	/**
	* Returns `true` if `u` is a `Transformation` instance.
	*
	* **When to use**
	*
	* Use to check whether a value is already a schema transformation before
	* wrapping it.
	*
	* **Details**
	*
	* - Pure predicate, no side effects.
	* - Acts as a TypeScript type guard.
	*
	* **Example** (Checking a value)
	*
	* ```ts
	* import { SchemaTransformation } from "effect"
	*
	* SchemaTransformation.isTransformation(SchemaTransformation.trim())
	* // true
	*
	* SchemaTransformation.isTransformation({ decode: null, encode: null })
	* // false
	* ```
	*
	* @see {@link Transformation}
	* @see {@link make}
	*
	* @category guards
	* @since 4.0.0
	*/
	function isTransformation(u) {
		return hasProperty(u, TypeId$5);
	}
	/**
	* Constructs a `Transformation` from an object with `decode` and `encode`
	* `Getter`s. If the input is already a `Transformation`, returns it as-is.
	*
	* **When to use**
	*
	* Use when you already have schema getter instances and want to pair them into
	* a schema transformation.
	* - You want idempotent wrapping (won't double-wrap).
	*
	* **Details**
	*
	* - Returns the input unchanged if it is already a `Transformation`.
	*
	* **Example** (Wrapping existing getters)
	*
	* ```ts
	* import { SchemaGetter, SchemaTransformation } from "effect"
	*
	* const t = SchemaTransformation.make({
	*   decode: SchemaGetter.transform<number, string>((s) => Number(s)),
	*   encode: SchemaGetter.transform<string, number>((n) => String(n))
	* })
	* ```
	*
	* @see {@link transform} — simpler constructor from pure functions
	* @see {@link transformOrFail} — constructor from effectful functions
	* @see {@link Transformation}
	*
	* @category constructors
	* @since 3.10.0
	*/
	var make$4 = (options) => {
		if (isTransformation(options)) return options;
		return new Transformation(options.decode, options.encode);
	};
	var passthrough_ = /*#__PURE__*/ new Transformation(/*#__PURE__*/ passthrough$1(), /*#__PURE__*/ passthrough$1());
	function passthrough() {
		return passthrough_;
	}
	/**
	* Decodes a `string` into a `number` and encodes a `number` back to a
	* `string`.
	*
	* **When to use**
	*
	* Use when you need a schema transformation to parse numeric strings from APIs,
	* form data, or URL parameters.
	*
	* **Details**
	*
	* Decoding coerces the string to a number like `Number(s)`. Encoding coerces
	* the number to a string like `String(n)`. This does not validate that the
	* result is finite; combine with `Schema.Finite` or `Schema.Int` for stricter
	* checks.
	*
	* **Example** (Converting a string to a number)
	*
	* ```ts
	* import { Schema, SchemaTransformation } from "effect"
	*
	* const schema = Schema.String.pipe(
	*   Schema.decodeTo(Schema.Number, SchemaTransformation.numberFromString)
	* )
	* ```
	*
	* @see {@link bigintFromString}
	* @see {@link transform}
	*
	* @category Coercions
	* @since 4.0.0
	*/
	var numberFromString = /*#__PURE__*/ new Transformation(/*#__PURE__*/ Number$3(), /*#__PURE__*/ String$3());
	/**
	* Decodes a JSON string with `JSON.parse` and encodes a value with
	* `JSON.stringify`.
	*
	* **When to use**
	*
	* Use when you need a schema transformation to decode JSON stored or
	* transmitted as a string, usually before composing with another schema that
	* validates the parsed structure.
	*
	* **Details**
	*
	* Decode fails with `InvalidValue` for invalid JSON, and encode can fail with
	* `InvalidValue` when `JSON.stringify` cannot serialize the value.
	*
	* **Example** (Parsing JSON)
	*
	* ```ts
	* import { Schema, SchemaTransformation } from "effect"
	*
	* const schema = Schema.String.pipe(
	*   Schema.decodeTo(Schema.Unknown, SchemaTransformation.fromJsonString)
	* )
	* ```
	*
	* @see {@link uint8ArrayFromBase64String}
	* @see {@link fromFormData}
	*
	* @category decoding
	* @since 4.0.0
	*/
	var fromJsonString$1 = /*#__PURE__*/ new Transformation(/*#__PURE__*/ parseJson(), /*#__PURE__*/ stringifyJson());
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/SchemaAST.js
	/**
	* Represents Effect schemas as runtime trees.
	*
	* Every `Schema` has an AST made from nodes for declarations, primitives,
	* literals, arrays, objects, unions, suspended schemas, checks, annotations,
	* encoding links, and parsing context. Most users work with the higher-level
	* `Schema` module. Use `SchemaAST` when you need to inspect schema nodes, build
	* ASTs programmatically, change encoded or decoded views, collect issues, or
	* run low-level schema checks.
	*
	* @since 4.0.0
	*/
	function makeGuard(tag) {
		return (ast) => ast._tag === tag;
	}
	/**
	* Returns `true` if the value is an {@link AST} node (any variant).
	*
	* **Details**
	*
	* Uses the internal `TypeId` brand to distinguish AST nodes from arbitrary
	* objects.
	*
	* @see {@link AST}
	* @category guards
	* @since 4.0.0
	*/
	function isAST(u) {
		return hasProperty(u, TypeId$4) && u[TypeId$4] === TypeId$4;
	}
	/**
	* Narrows an {@link AST} to {@link Declaration}.
	*
	* **When to use**
	*
	* Use to recognize declaration AST nodes before running declaration-specific
	* handling.
	*
	* @see {@link Declaration} for the AST node type narrowed by this guard
	*
	* @category guards
	* @since 3.10.0
	*/
	var isDeclaration = /*#__PURE__*/ makeGuard("Declaration");
	/**
	* Narrows an {@link AST} to {@link Never}.
	*
	* **When to use**
	*
	* Use to detect the AST node for a schema that can never match before handling
	* other schema variants.
	*
	* @see {@link Never} for the AST node type narrowed by this guard
	* @see {@link never} for the singleton `Never` AST instance
	*
	* @category guards
	* @since 4.0.0
	*/
	var isNever = /*#__PURE__*/ makeGuard("Never");
	/**
	* Narrows an {@link AST} to {@link Literal}.
	*
	* **When to use**
	*
	* Use to recognize exact string, number, boolean, or bigint literal AST nodes.
	*
	* @see {@link Literal} for the AST node type narrowed by this guard
	* @see {@link LiteralValue} for the values stored by literal nodes
	*
	* @category guards
	* @since 3.10.0
	*/
	var isLiteral = /*#__PURE__*/ makeGuard("Literal");
	/**
	* Narrows an {@link AST} to {@link UniqueSymbol}.
	*
	* @category guards
	* @since 3.10.0
	*/
	var isUniqueSymbol = /*#__PURE__*/ makeGuard("UniqueSymbol");
	/**
	* Narrows an {@link AST} to {@link Arrays}.
	*
	* **When to use**
	*
	* Use to recognize array-like AST nodes before reading their element, rest, or
	* mutability metadata.
	*
	* @see {@link Arrays} for the AST node type narrowed by this guard
	*
	* @category guards
	* @since 4.0.0
	*/
	var isArrays = /*#__PURE__*/ makeGuard("Arrays");
	/**
	* Narrows an {@link AST} to {@link Objects}.
	*
	* @category guards
	* @since 4.0.0
	*/
	var isObjects = /*#__PURE__*/ makeGuard("Objects");
	/**
	* Represents a single step in an {@link Encoding} chain.
	*
	* **Details**
	*
	* A link pairs a target {@link AST} with a `Transformation` or `Middleware`
	* that converts values between the current node and the target.
	*
	* - `to` — the AST node on the other side of this transformation step.
	* - `transformation` — the bidirectional conversion logic (decode/encode).
	*
	* Links are composed into a non-empty array ({@link Encoding}) attached to
	* AST nodes that have a different encoded representation.
	*
	* @see {@link Encoding}
	* @see {@link decodeTo}
	* @category models
	* @since 4.0.0
	*/
	var Link = class {
		to;
		transformation;
		constructor(to, transformation) {
			this.to = to;
			this.transformation = transformation;
		}
	};
	/** @internal */
	var defaultParseOptions = {};
	/**
	* Represents per-property metadata attached to AST nodes via {@link Base.context}.
	*
	* **Details**
	*
	* Tracks whether a property key is optional, mutable, has a constructor
	* default, or carries key-level annotations. Typically set by helpers like
	* {@link optionalKey} and `Schema.mutableKey`.
	*
	* - `isOptional` — the property key may be absent from the input.
	* - `isMutable` — the property is `readonly` when `false`.
	* - `defaultValue` — an {@link Encoding} applied during construction to
	*   supply missing values.
	* - `annotations` — key-level annotations (e.g. description of the key
	*   itself).
	*
	* @see {@link optionalKey}
	* @see {@link isOptional}
	* @category models
	* @since 4.0.0
	*/
	var Context = class {
		isOptional;
		isMutable;
		/** Used for constructor default values (e.g. `withConstructorDefault` API) */
		defaultValue;
		annotations;
		constructor(isOptional, isMutable, defaultValue = void 0, annotations = void 0) {
			this.isOptional = isOptional;
			this.isMutable = isMutable;
			this.defaultValue = defaultValue;
			this.annotations = annotations;
		}
	};
	var TypeId$4 = "~effect/Schema";
	/**
	* Represents the abstract base class for all {@link AST} node variants.
	*
	* **Details**
	*
	* Every AST node extends `Base` and inherits these fields:
	*
	* - `annotations` — user-supplied metadata (identifier, title, description,
	*   arbitrary keys).
	* - `checks` — optional {@link Checks} for post-type-match validation.
	* - `encoding` — optional {@link Encoding} chain for type ↔ wire
	*   transformations.
	* - `context` — optional {@link Context} for per-property metadata.
	*
	* Subclasses add a `_tag` discriminant and variant-specific data.
	*
	* @see {@link AST}
	* @category models
	* @since 4.0.0
	*/
	var Base = class {
		[TypeId$4] = TypeId$4;
		annotations;
		checks;
		encoding;
		context;
		constructor(annotations = void 0, checks = void 0, encoding = void 0, context = void 0) {
			this.annotations = annotations;
			this.checks = checks;
			this.encoding = encoding;
			this.context = context;
		}
		toString() {
			return `<${this._tag}>`;
		}
	};
	/**
	* AST node matching the `null` literal value.
	*
	* **Details**
	*
	* Parsing succeeds only when the input is exactly `null`.
	*
	* @see {@link null_ null}
	* @see {@link isNull}
	* @category models
	* @since 4.0.0
	*/
	var Null$1 = class extends Base {
		_tag = "Null";
		/** @internal */
		getParser() {
			return fromConst(this, null);
		}
		/** @internal */
		getExpected() {
			return "null";
		}
	};
	var null_ = /*#__PURE__*/ new Null$1();
	/**
	* AST node representing the `never` type — no value matches.
	*
	* **Details**
	*
	* Parsing always fails. Useful as a placeholder in unions or as the result
	* of narrowing that eliminates all options.
	*
	* @see {@link never}
	* @see {@link isNever}
	* @category models
	* @since 4.0.0
	*/
	var Never$1 = class extends Base {
		_tag = "Never";
		/** @internal */
		getParser() {
			return fromRefinement(this, isNever$1);
		}
		/** @internal */
		getExpected() {
			return "never";
		}
	};
	/**
	* Provides the singleton {@link Never} AST instance.
	*
	* **When to use**
	*
	* Use to reuse the canonical bottom-type AST node when constructing,
	* comparing, or returning ASTs.
	*
	* @see {@link Never} for the AST node class
	* @see {@link isNever} for narrowing an AST to a `Never` node
	*
	* @category constructors
	* @since 4.0.0
	*/
	var never = /*#__PURE__*/ new Never$1();
	/**
	* AST node representing the `unknown` type — every value matches.
	*
	* **Details**
	*
	* Unlike {@link Any}, this is type-safe: the parsed result is typed as
	* `unknown` rather than `any`.
	*
	* @see {@link unknown}
	* @see {@link isUnknown}
	* @category models
	* @since 4.0.0
	*/
	var Unknown$1 = class extends Base {
		_tag = "Unknown";
		/** @internal */
		getParser() {
			return fromRefinement(this, isUnknown);
		}
		/** @internal */
		getExpected() {
			return "unknown";
		}
	};
	/**
	* Provides the singleton {@link Unknown} AST instance.
	*
	* **When to use**
	*
	* Use when you need the reusable AST singleton for a schema node that accepts
	* every value while keeping parsed values opaque.
	*
	* @see {@link any} for the singleton that accepts every value as `any`
	*
	* @category constructors
	* @since 4.0.0
	*/
	var unknown = /*#__PURE__*/ new Unknown$1();
	/**
	* AST node matching an exact primitive value (string, number, boolean, or
	* bigint).
	*
	* **Details**
	*
	* Parsing succeeds only when the input is strictly equal (`===`) to the
	* stored `literal`. Numeric literals must be finite — `Infinity`, `-Infinity`,
	* and `NaN` are rejected at construction time.
	*
	* **Example** (Creating a literal AST)
	*
	* ```ts
	* import { SchemaAST } from "effect"
	*
	* const ast = new SchemaAST.Literal("active")
	* console.log(ast.literal) // "active"
	* ```
	*
	* @see {@link LiteralValue}
	* @see {@link isLiteral}
	* @category models
	* @since 3.10.0
	*/
	var Literal$1 = class extends Base {
		_tag = "Literal";
		literal;
		constructor(literal, annotations, checks, encoding, context) {
			super(annotations, checks, encoding, context);
			if (typeof literal === "number" && !globalThis.Number.isFinite(literal)) throw new Error(`A numeric literal must be finite, got ${format$1(literal)}`);
			this.literal = literal;
		}
		/** @internal */
		getParser() {
			return fromConst(this, this.literal);
		}
		/** @internal */
		matchPart(s, _options) {
			return s === globalThis.String(this.literal) ? this.literal : void 0;
		}
		/** @internal */
		toCodecJson() {
			return typeof this.literal === "bigint" ? literalToString(this) : this;
		}
		/** @internal */
		toCodecStringTree() {
			return typeof this.literal === "string" ? this : literalToString(this);
		}
		/** @internal */
		getExpected() {
			return typeof this.literal === "string" ? JSON.stringify(this.literal) : globalThis.String(this.literal);
		}
	};
	function literalToString(ast) {
		const literalAsString = globalThis.String(ast.literal);
		return replaceEncoding(ast, [new Link(new Literal$1(literalAsString), new Transformation(transform$1(() => ast.literal), transform$1(() => literalAsString)))]);
	}
	/**
	* AST node matching any `string` value.
	*
	* @see {@link string}
	* @see {@link isString}
	*
	* @category models
	* @since 4.0.0
	*/
	var String$2 = class extends Base {
		_tag = "String";
		/** @internal */
		getParser() {
			return fromRefinement(this, isString);
		}
		/** @internal */
		matchPart(s, options) {
			return applyTemplateLiteralPartChecks(this, s, options);
		}
		/** @internal */
		getExpected() {
			return "string";
		}
	};
	/**
	* Provides the singleton {@link String} AST instance.
	*
	* **When to use**
	*
	* Use as the shared `SchemaAST` node for unconstrained JavaScript strings.
	*
	* @see {@link String} for the AST node class
	* @see {@link isString} for narrowing an AST to a string node
	*
	* @category constructors
	* @since 4.0.0
	*/
	var string = /*#__PURE__*/ new String$2();
	/**
	* AST node matching any `number` value (including `NaN`, `Infinity`,
	* `-Infinity`).
	*
	* **Details**
	*
	* Default JSON serialization:
	*
	* - Finite numbers are serialized as JSON numbers.
	* - `Infinity`, `-Infinity`, and `NaN` are serialized as JSON strings.
	*
	* If the node has an `isFinite` or `isInt` check, the string fallback is
	* skipped since non-finite values cannot occur.
	*
	* @see {@link number}
	* @see {@link isNumber}
	* @category models
	* @since 4.0.0
	*/
	var Number$2 = class extends Base {
		_tag = "Number";
		/** @internal */
		getParser() {
			return fromRefinement(this, isNumber);
		}
		/** @internal */
		matchKey(s, options) {
			return this._match(isStringNumberRegExp, s, options);
		}
		/** @internal */
		matchPart(s, options) {
			return this._match(isStringFiniteRegExp, s, options);
		}
		_match(regexp, s, options) {
			return regexp.test(s) ? applyTemplateLiteralPartChecks(this, globalThis.Number(s), options) : void 0;
		}
		/** @internal */
		toCodecJson() {
			if (this.checks && (hasCheck$1(this.checks, "isFinite") || hasCheck$1(this.checks, "isInt"))) return this;
			return replaceEncoding(this, [numberToJson]);
		}
		/** @internal */
		toCodecStringTree() {
			if (this.checks && (hasCheck$1(this.checks, "isFinite") || hasCheck$1(this.checks, "isInt"))) return replaceEncoding(this, [finiteToString]);
			return replaceEncoding(this, [numberToString]);
		}
		/** @internal */
		getExpected() {
			return "number";
		}
	};
	function hasCheck$1(checks, tag) {
		return checks.some((c) => {
			switch (c._tag) {
				case "Filter": return c.annotations?.meta?._tag === tag;
				case "FilterGroup": return hasCheck$1(c.checks, tag);
			}
		});
	}
	/**
	* Provides the singleton {@link Number} AST instance.
	*
	* **When to use**
	*
	* Use when you need the canonical `SchemaAST` node for schemas that accept any
	* JavaScript number value.
	*
	* @see {@link Number} for the AST node class and serialization behavior
	* @see {@link Literal} for exact finite numeric literal AST nodes
	*
	* @category constructors
	* @since 4.0.0
	*/
	var number = /*#__PURE__*/ new Number$2();
	/**
	* AST node matching any `boolean` value (`true` or `false`).
	*
	* @see {@link boolean}
	* @see {@link isBoolean}
	*
	* @category models
	* @since 4.0.0
	*/
	var Boolean$2 = class extends Base {
		_tag = "Boolean";
		/** @internal */
		getParser() {
			return fromRefinement(this, isBoolean);
		}
		/** @internal */
		getExpected() {
			return "boolean";
		}
	};
	/**
	* Provides the singleton {@link Boolean} AST instance.
	*
	* **When to use**
	*
	* Use to reuse the standard AST node that accepts either `true` or `false` when
	* constructing schema ASTs directly.
	*
	* @see {@link Boolean} for the AST node class
	* @see {@link Literal} for exact boolean literal AST nodes
	*
	* @category constructors
	* @since 4.0.0
	*/
	var boolean = /*#__PURE__*/ new Boolean$2();
	/**
	* AST node for array-like types — both tuples and arrays.
	*
	* **When to use**
	*
	* Use when constructing or inspecting AST nodes for tuple or array-like schemas,
	* including rest elements.
	*
	* **Details**
	*
	* - `elements` — positional element types (tuple elements). An element is
	*   optional if its {@link Context.isOptional} is `true`.
	* - `rest` — the rest/variadic element types. When non-empty, the first
	*   entry is the "spread" type (e.g. `...Array<string>`), and subsequent
	*   entries are trailing positional elements after the spread.
	* - `isMutable` — whether the resulting array is `readonly` (`false`) or
	*   mutable (`true`).
	*
	* **Gotchas**
	*
	* Construction enforces TypeScript ordering rules: a required element
	* cannot follow an optional one, and an optional element cannot follow a
	* rest element.
	*
	* **Example** (Inspecting a tuple AST)
	*
	* ```ts
	* import { Schema, SchemaAST } from "effect"
	*
	* const schema = Schema.Tuple([Schema.String, Schema.Number])
	* const ast = schema.ast
	*
	* if (SchemaAST.isArrays(ast)) {
	*   console.log(ast.elements.length) // 2
	*   console.log(ast.rest.length)     // 0
	* }
	* ```
	*
	* @see {@link isArrays}
	* @see {@link Objects}
	* @category models
	* @since 4.0.0
	*/
	var Arrays = class Arrays extends Base {
		_tag = "Arrays";
		isMutable;
		elements;
		rest;
		encodingChecks;
		constructor(isMutable, elements, rest, annotations, checks, encoding, context, encodingChecks) {
			super(annotations, checks, encoding, context);
			this.isMutable = isMutable;
			this.elements = elements;
			this.rest = rest;
			this.encodingChecks = encodingChecks;
			const i = elements.findIndex(isOptional);
			if (i !== -1 && (elements.slice(i + 1).some((e) => !isOptional(e)) || rest.length > 1)) throw new Error("A required element cannot follow an optional element. ts(1257)");
			if (rest.length > 1 && rest.slice(1).some(isOptional)) throw new Error("An optional element cannot follow a rest element. ts(1266)");
		}
		/** @internal */
		getParser(recur) {
			const ast = this;
			const elements = ast.elements.map((ast) => ({
				ast,
				parser: recur(ast)
			}));
			const rest = ast.rest.map((ast) => ({
				ast,
				parser: recur(ast)
			}));
			const elementLen = elements.length;
			const [head, ...tail] = rest;
			const tailLen = tail.length;
			function getParser(tailThreshold, index) {
				if (index < elementLen) return elements[index];
				else if (index >= tailThreshold) return tail[index - tailThreshold];
				return head;
			}
			return fnUntracedEager(function* (oinput, options) {
				if (oinput._tag === "None") return oinput;
				const input = oinput.value;
				if (!Array.isArray(input)) return yield* fail(new InvalidType(ast, oinput));
				const len = input.length;
				const state = {
					ast,
					getParser,
					oinput,
					len,
					tailThreshold: resolveTailThreshold(len, elementLen, tailLen),
					output: new globalThis.Array(len),
					issues: void 0,
					options
				};
				const eff = parseArray(state, input, {
					concurrency: resolveConcurrency(options?.concurrency)?.concurrency,
					end: ast.rest.length === 0 ? elementLen : Math.max(len, elementLen + tailLen)
				});
				if (eff) yield* eff;
				if (ast.rest.length === 0 && len > elementLen) for (let i = elementLen; i <= len - 1; i++) {
					const issue = new Pointer([i], new UnexpectedKey(ast, input[i]));
					if (options.errors === "all") if (state.issues) state.issues.push(issue);
					else state.issues = [issue];
					else return yield* fail(new Composite(ast, oinput, [issue]));
				}
				if (state.issues) return yield* fail(new Composite(ast, oinput, state.issues));
				return some(state.output);
			});
		}
		_rebuild(recur, checks, encodingChecks) {
			const elements = mapOrSame(this.elements, recur);
			const rest = mapOrSame(this.rest, recur);
			return elements === this.elements && rest === this.rest && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Arrays(this.isMutable, elements, rest, this.annotations, checks, void 0, this.context, encodingChecks);
		}
		/** @internal */
		recur(recur) {
			return this._rebuild(recur, this.checks, this.encodingChecks);
		}
		/** @internal */
		flip(recur) {
			return this._rebuild(recur, this.encodingChecks, this.checks);
		}
		/** @internal */
		getExpected() {
			return "array";
		}
	};
	var parseArray = /*#__PURE__*/ iterateEager()({
		onItem(s, item, i) {
			const value = i < s.len ? some(item) : none();
			return s.getParser(s.tailThreshold, i).parser(value, s.options);
		},
		step(s, _, exit, i) {
			if (exit._tag === "Failure") return wrapPropertyKeyIssue(s, s.ast, i, exit);
			else if (exit.value._tag === "Some") s.output[i] = exit.value.value;
			else {
				const p = s.getParser(s.tailThreshold, i);
				if (isOptional(p.ast)) return;
				const issue = new Pointer([i], new MissingKey(p.ast.context?.annotations));
				if (s.options.errors === "all") if (s.issues) s.issues.push(issue);
				else s.issues = [issue];
				else return fail$1(new Composite(s.ast, s.oinput, [issue]));
			}
		}
	});
	function resolveTailThreshold(inputLen, elementLen, tailLen) {
		return Math.max(elementLen, inputLen - tailLen);
	}
	var resolveConcurrency = (value) => {
		value = value === "unbounded" ? Infinity : value ?? 1;
		return value > 1 ? { concurrency: value } : void 0;
	};
	var wrapPropertyKeyIssue = (s, ast, key, exit) => {
		if (exit.cause.reasons.length === 0) return exit;
		const issue = getSchemaIssue(exit.cause);
		if (issue === void 0) return failCause(map$1(exit.cause, (issue) => new Composite(ast, s.oinput, [new Pointer([key], issue)])));
		const pointer = new Pointer([key], issue);
		if (s.options.errors === "all") if (s.issues) s.issues.push(pointer);
		else s.issues = [pointer];
		else return fail$1(new Composite(ast, s.oinput, [pointer]));
	};
	/**
	* floating point or integer, with optional exponent
	* @internal
	*/
	var FINITE_PATTERN = "[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?";
	/**
	* Returns the object keys that match the index signature parameter schema.
	* @internal
	*/
	function getIndexSignatureKeys(input, parameter, options = defaultParseOptions) {
		let stringKeys;
		let symbolKeys;
		function go(parameter) {
			switch (parameter._tag) {
				case "String":
				case "TemplateLiteral": return (stringKeys ??= Object.keys(input)).filter((k) => parameter.matchPart(k, options) !== void 0);
				case "Number": return (stringKeys ??= Object.keys(input)).filter((k) => parameter.matchKey(k, options) !== void 0);
				case "Symbol": return (symbolKeys ??= Object.getOwnPropertySymbols(input)).filter((k) => parameter.matchKey(k, options) !== void 0);
				case "Union": return [...new Set(parameter.types.flatMap(go))];
				default: return [];
			}
		}
		return go(parameterFromPropertyKey(toEncoded(parameter)));
	}
	/**
	* Represents a named property within an {@link Objects} node.
	*
	* **Details**
	*
	* Pairs a `name` (any `PropertyKey`) with a `type` ({@link AST}). The
	* property's optionality and mutability are determined by the `type`'s
	* {@link Context}.
	*
	* @see {@link Objects}
	* @category models
	* @since 3.10.0
	*/
	var PropertySignature = class {
		name;
		type;
		constructor(name, type) {
			this.name = name;
			this.type = type;
		}
	};
	/**
	* Represents a bidirectional merge strategy for index signature key-value pairs.
	*
	* **Details**
	*
	* Used by {@link IndexSignature} when the same key appears multiple times
	* (e.g. from `Schema.extend` or overlapping records). Provides separate
	* `decode` and `encode` combiners that determine how duplicate entries are
	* merged.
	*
	* @see {@link IndexSignature}
	* @category models
	* @since 4.0.0
	*/
	var KeyValueCombiner = class KeyValueCombiner {
		decode;
		encode;
		constructor(decode, encode) {
			this.decode = decode;
			this.encode = encode;
		}
		/** @internal */
		flip() {
			return new KeyValueCombiner(this.encode, this.decode);
		}
	};
	function isIndexSignatureParameterSide(ast) {
		switch (ast._tag) {
			case "String":
			case "Number":
			case "Symbol":
			case "TemplateLiteral": return true;
			case "Union": return ast.types.every(isIndexSignatureParameterSide);
			default: return false;
		}
	}
	function isIndexSignatureParameter(ast) {
		return isIndexSignatureParameterSide(ast) && isIndexSignatureParameterSide(toEncoded(ast));
	}
	/**
	* Represents an index signature entry within an {@link Objects} node.
	*
	* **When to use**
	*
	* Use when constructing or inspecting object AST entries for record-like keys
	* and values.
	*
	* **Details**
	*
	* - `parameter` — the key type AST (e.g. {@link String} for `string` keys,
	*   {@link TemplateLiteral} for patterned keys).
	* - `type` — the value type SchemaAST.
	* - `merge` — optional {@link KeyValueCombiner} for handling duplicate keys.
	*
	* **Gotchas**
	*
	* Using `Schema.optionalKey` on the value type is not allowed for index
	* signatures (throws at construction); use `Schema.optional` instead.
	*
	* @see {@link Objects}
	* @see {@link PropertySignature}
	* @category models
	* @since 3.10.0
	*/
	var IndexSignature = class {
		parameter;
		type;
		merge;
		constructor(parameter, type, merge) {
			if (!isIndexSignatureParameter(parameter)) throw new Error(`Invalid index signature parameter ${parameter._tag}`);
			this.parameter = parameter;
			this.type = type;
			this.merge = merge;
			if (isOptional(type) && !containsUndefined(type)) throw new Error("Cannot use `Schema.optionalKey` with index signatures, use `Schema.optional` instead.");
		}
	};
	/**
	* AST node for object-like schemas, including structs and records.
	*
	* **When to use**
	*
	* Use when constructing or inspecting AST nodes for structs or records rather
	* than array-like schemas.
	*
	* **Details**
	*
	* - `propertySignatures` — named properties with their types (struct fields).
	* - `indexSignatures` — index signature entries (record patterns), each with
	*   a `parameter` AST for matching keys and a `type` AST for values.
	*
	* An `Objects` node with no properties and no index signatures performs only a
	* non-nullish check: it accepts any value except `null` and `undefined`,
	* including primitive values.
	*
	* **Gotchas**
	*
	* Duplicate property names throw at construction time.
	*
	* **Example** (Inspecting a struct AST)
	*
	* ```ts
	* import { Schema, SchemaAST } from "effect"
	*
	* const schema = Schema.Struct({ name: Schema.String })
	* const ast = schema.ast
	*
	* if (SchemaAST.isObjects(ast)) {
	*   for (const ps of ast.propertySignatures) {
	*     console.log(ps.name, ps.type._tag)
	*   }
	*   // "name" "String"
	* }
	* ```
	*
	* @see {@link isObjects}
	* @see {@link PropertySignature}
	* @see {@link IndexSignature}
	* @see {@link Arrays}
	* @category models
	* @since 4.0.0
	*/
	var Objects = class Objects extends Base {
		_tag = "Objects";
		propertySignatures;
		indexSignatures;
		encodingChecks;
		constructor(propertySignatures, indexSignatures, annotations, checks, encoding, context, encodingChecks) {
			super(annotations, checks, encoding, context);
			this.propertySignatures = propertySignatures;
			this.indexSignatures = indexSignatures;
			this.encodingChecks = encodingChecks;
			const duplicates = propertySignatures.map((ps) => ps.name).filter((name, i, arr) => arr.indexOf(name) !== i);
			if (duplicates.length > 0) throw new Error(`Duplicate identifiers: ${JSON.stringify(duplicates)}. ts(2300)`);
		}
		/** @internal */
		getParser(recur) {
			const ast = this;
			const expectedKeys = [];
			const expectedKeysSet = /* @__PURE__ */ new Set();
			const properties = [];
			for (const ps of ast.propertySignatures) {
				expectedKeys.push(ps.name);
				expectedKeysSet.add(ps.name);
				properties.push({
					ps,
					parser: recur(ps.type),
					name: ps.name,
					type: ps.type
				});
			}
			const indexCount = ast.indexSignatures.length;
			if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) return fromRefinement(ast, isNotNullish);
			const parseIndexes = indexCount > 0 ? iterateEager()({
				onItem: fnUntracedEager(function* (s, [key, is]) {
					const effKey = recur(parameterFromPropertyKey(is.parameter))(some(key), s.options);
					const exitKey = effectIsExit(effKey) ? effKey : yield* exit(effKey);
					if (exitKey._tag === "Failure") {
						const eff = wrapPropertyKeyIssue(s, ast, key, exitKey);
						if (eff) yield* eff;
						return;
					}
					const value = some(s.input[key]);
					const effValue = recur(is.type)(value, s.options);
					const exitValue = effectIsExit(effValue) ? effValue : yield* exit(effValue);
					if (exitValue._tag === "Failure") {
						const eff = wrapPropertyKeyIssue(s, ast, key, exitValue);
						if (eff) yield* eff;
						return;
					} else if (exitKey.value._tag === "Some" && exitValue.value._tag === "Some") {
						const k2 = exitKey.value.value;
						if (expectedKeysSet.has(key) || expectedKeysSet.has(k2)) return;
						const v2 = exitValue.value.value;
						if (is.merge && is.merge.decode && Object.hasOwn(s.out, k2)) {
							const [k, v] = is.merge.decode.combine([k2, s.out[k2]], [k2, v2]);
							set$2(s.out, k, v);
						} else set$2(s.out, k2, v2);
					}
				}),
				step: (_s, _, exit) => exit._tag === "Failure" ? exit : void 0
			}) : void 0;
			return fnUntracedEager(function* (oinput, options) {
				if (oinput._tag === "None") return oinput;
				const input = oinput.value;
				if (!(typeof input === "object" && input !== null && !Array.isArray(input))) return yield* fail(new InvalidType(ast, oinput));
				const out = {};
				const state = {
					ast,
					oinput,
					input,
					out,
					issues: void 0,
					options
				};
				const errorsAllOption = options.errors === "all";
				const onExcessPropertyError = options.onExcessProperty === "error";
				const onExcessPropertyPreserve = options.onExcessProperty === "preserve";
				let inputKeys;
				if (ast.indexSignatures.length === 0 && (onExcessPropertyError || onExcessPropertyPreserve)) {
					inputKeys = Reflect.ownKeys(input);
					for (let i = 0; i < inputKeys.length; i++) {
						const key = inputKeys[i];
						if (!expectedKeysSet.has(key)) if (onExcessPropertyError) {
							const issue = new Pointer([key], new UnexpectedKey(ast, input[key]));
							if (errorsAllOption) {
								if (state.issues) state.issues.push(issue);
								else state.issues = [issue];
								continue;
							} else return yield* fail(new Composite(ast, oinput, [issue]));
						} else set$2(out, key, input[key]);
					}
				}
				const concurrency = resolveConcurrency(options?.concurrency);
				const eff = parseProperties(state, properties, concurrency);
				if (eff) yield* eff;
				if (parseIndexes) {
					const keyPairs = empty$2();
					for (let i = 0; i < indexCount; i++) {
						const is = ast.indexSignatures[i];
						const keys = getIndexSignatureKeys(input, is.parameter, options);
						for (let j = 0; j < keys.length; j++) {
							const key = keys[j];
							keyPairs.push([key, is]);
						}
					}
					const eff = parseIndexes(state, keyPairs, concurrency);
					if (eff) yield* eff;
				}
				if (state.issues) return yield* fail(new Composite(ast, oinput, state.issues));
				if (options.propertyOrder === "original") {
					const keys = (inputKeys ?? Reflect.ownKeys(input)).concat(expectedKeys);
					const preserved = {};
					for (const key of keys) if (Object.hasOwn(out, key)) set$2(preserved, key, out[key]);
					return some(preserved);
				}
				return some(out);
			});
		}
		_rebuild(recur, recurParameter, flipMerge, checks, encodingChecks) {
			const props = mapOrSame(this.propertySignatures, (ps) => {
				const t = recur(ps.type);
				return t === ps.type ? ps : new PropertySignature(ps.name, t);
			});
			const indexes = mapOrSame(this.indexSignatures, (is) => {
				const p = recurParameter(is.parameter);
				const t = recur(is.type);
				const merge = flipMerge ? is.merge?.flip() : is.merge;
				return p === is.parameter && t === is.type && merge === is.merge ? is : new IndexSignature(p, t, merge);
			});
			return props === this.propertySignatures && indexes === this.indexSignatures && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Objects(props, indexes, this.annotations, checks, void 0, this.context, encodingChecks);
		}
		/** @internal */
		flip(recur) {
			return this._rebuild(recur, recur, true, this.encodingChecks, this.checks);
		}
		/** @internal */
		recur(recur, recurParameter = recur) {
			return this._rebuild(recur, recurParameter, false, this.checks, this.encodingChecks);
		}
		/** @internal */
		getExpected() {
			if (this.propertySignatures.length === 0 && this.indexSignatures.length === 0) return "object | array";
			return "object";
		}
	};
	var parseProperties = /*#__PURE__*/ iterateEager()({
		onItem(s, p) {
			const value = Object.hasOwn(s.input, p.name) ? some(s.input[p.name]) : none();
			return p.parser(value, s.options);
		},
		step(s, p, exit) {
			if (exit._tag === "Failure") return wrapPropertyKeyIssue(s, s.ast, p.name, exit);
			else if (exit.value._tag === "Some") set$2(s.out, p.name, exit.value.value);
			else if (!isOptional(p.type)) {
				const issue = new Pointer([p.name], new MissingKey(p.type.context?.annotations));
				if (s.options.errors === "all") {
					if (s.issues) s.issues.push(issue);
					else s.issues = [issue];
					return;
				} else return fail$1(new Composite(s.ast, s.oinput, [issue]));
			}
		}
	});
	function combineChecks(a, b) {
		if (!a) return b;
		if (!b) return a;
		return [...a, ...b];
	}
	/** @internal */
	function struct(fields, checks, annotations) {
		return new Objects(Reflect.ownKeys(fields).map((key) => {
			return new PropertySignature(key, fields[key].ast);
		}), [], annotations, checks);
	}
	/** @internal */
	function getAST(self) {
		return self.ast;
	}
	/** @internal */
	function tuple(elements, checks = void 0) {
		return new Arrays(false, elements.map((e) => e.ast), [], void 0, checks);
	}
	/** @internal */
	function union(members, mode, checks) {
		return new Union$1(members.map(getAST), mode, void 0, checks);
	}
	function getCandidateTypes(ast) {
		switch (ast._tag) {
			case "Null": return ["null"];
			case "Undefined": return ["undefined"];
			case "String":
			case "TemplateLiteral": return ["string"];
			case "Number": return ["number"];
			case "Boolean": return ["boolean"];
			case "Symbol":
			case "UniqueSymbol": return ["symbol"];
			case "BigInt": return ["bigint"];
			case "Arrays": return ["array"];
			case "ObjectKeyword": return [
				"object",
				"array",
				"function"
			];
			case "Objects": return ast.propertySignatures.length || ast.indexSignatures.length ? ["object"] : ["object", "array"];
			case "Enum": return Array.from(new Set(ast.enums.map(([, v]) => typeof v)));
			case "Literal": return [typeof ast.literal];
			case "Union": return Array.from(new Set(ast.types.flatMap(getCandidateTypes)));
			default: return [
				"null",
				"undefined",
				"string",
				"number",
				"boolean",
				"symbol",
				"bigint",
				"object",
				"array",
				"function"
			];
		}
	}
	/** @internal */
	function collectSentinels(ast) {
		switch (ast._tag) {
			default: return [];
			case "Declaration": {
				const s = ast.annotations?.["~sentinels"];
				return Array.isArray(s) ? s : [];
			}
			case "Objects": return ast.propertySignatures.flatMap((ps) => {
				const type = ps.type;
				if (!isOptional(type)) {
					if (isLiteral(type)) return [{
						key: ps.name,
						literal: type.literal
					}];
					if (isUniqueSymbol(type)) return [{
						key: ps.name,
						literal: type.symbol
					}];
				}
				return [];
			});
			case "Arrays": return ast.elements.flatMap((e, i) => {
				return isLiteral(e) && !isOptional(e) ? [{
					key: i,
					literal: e.literal
				}] : [];
			});
			case "Suspend": return collectSentinels(ast.thunk());
		}
	}
	var candidateIndexCache = /*#__PURE__*/ new WeakMap();
	function getIndex(types) {
		let idx = candidateIndexCache.get(types);
		if (idx) return idx;
		idx = {};
		for (let i = 0; i < types.length; i++) {
			const a = types[i];
			const encoded = toEncoded(a);
			if (isNever(encoded)) continue;
			const candidateTypes = getCandidateTypes(encoded);
			const sentinels = collectSentinels(encoded);
			idx.byType ??= {};
			for (const t of candidateTypes) (idx.byType[t] ??= []).push(i);
			if (sentinels.length > 0) {
				idx.bySentinel ??= /* @__PURE__ */ new Map();
				for (const { key, literal } of sentinels) {
					let m = idx.bySentinel.get(key);
					if (!m) idx.bySentinel.set(key, m = /* @__PURE__ */ new Map());
					let arr = m.get(literal);
					if (!arr) m.set(literal, arr = []);
					arr.push(i);
				}
			} else {
				idx.otherwise ??= {};
				for (const t of candidateTypes) (idx.otherwise[t] ??= []).push(i);
			}
		}
		candidateIndexCache.set(types, idx);
		return idx;
	}
	function filterLiterals(input) {
		return (ast) => {
			const encoded = toEncoded(ast);
			return encoded._tag === "Literal" ? encoded.literal === input : encoded._tag === "UniqueSymbol" ? encoded.symbol === input : true;
		};
	}
	/**
	* The goal is to reduce the number of a union members that will be checked.
	* This is useful to reduce the number of issues that will be returned.
	*
	* @internal
	*/
	function getCandidates(input, types) {
		const idx = getIndex(types);
		const runtimeType = input === null ? "null" : Array.isArray(input) ? "array" : typeof input;
		if (idx.bySentinel) {
			const base = idx.otherwise?.[runtimeType] ?? [];
			if (runtimeType === "object" || runtimeType === "array") {
				const selected = new Set(base);
				for (const [k, m] of idx.bySentinel) if (Object.hasOwn(input, k)) {
					const match = m.get(input[k]);
					if (match) for (const candidate of match) selected.add(candidate);
				}
				return Array.from(selected).sort((a, b) => a - b).map((i) => types[i]).filter(filterLiterals(input));
			}
			return base.map((i) => types[i]);
		}
		return (idx.byType?.[runtimeType] ?? []).map((i) => types[i]).filter(filterLiterals(input));
	}
	/**
	* AST node representing a union of schemas.
	*
	* **Details**
	*
	* - `types` — the member AST nodes.
	* - `mode` — `"anyOf"` succeeds on the first match (like TypeScript unions);
	*   `"oneOf"` requires exactly one member to match (fails if multiple do).
	*
	* During parsing, members are tried in order. An internal candidate index
	* narrows which members to try based on the runtime type of the input and
	* discriminant ("sentinel") fields, making large unions efficient.
	*
	* **Example** (Inspecting a union AST)
	*
	* ```ts
	* import { Schema, SchemaAST } from "effect"
	*
	* const schema = Schema.Union([Schema.String, Schema.Number])
	* const ast = schema.ast
	*
	* if (SchemaAST.isUnion(ast)) {
	*   console.log(ast.types.length) // 2
	*   console.log(ast.mode)         // "anyOf"
	* }
	* ```
	*
	* @see {@link isUnion}
	* @category models
	* @since 3.10.0
	*/
	var Union$1 = class Union$1 extends Base {
		_tag = "Union";
		types;
		mode;
		encodingChecks;
		constructor(types, mode, annotations, checks, encoding, context, encodingChecks) {
			super(annotations, checks, encoding, context);
			this.types = types;
			this.mode = mode;
			this.encodingChecks = encodingChecks;
		}
		/** @internal */
		getParser(recur) {
			const ast = this;
			return (oinput, options) => {
				if (oinput._tag === "None") return succeed(oinput);
				const input = oinput.value;
				const candidates = getCandidates(input, ast.types);
				const state = {
					ast,
					recur,
					oinput,
					input,
					out: void 0,
					successes: [],
					issues: void 0,
					options
				};
				const concurrency = resolveConcurrency(options?.concurrency);
				const eff = parseUnion(state, candidates, concurrency ? {
					...concurrency,
					orderedStep: true
				} : void 0);
				if (!eff) return state.out ? succeed(state.out) : fail(new AnyOf(ast, input, state.issues ?? []));
				return flatMap(eff, (_) => {
					return state.out ? succeed(state.out) : fail(new AnyOf(ast, input, state.issues ?? []));
				});
			};
		}
		_rebuild(recur, checks, encodingChecks) {
			const types = mapOrSame(this.types, recur);
			return types === this.types && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Union$1(types, this.mode, this.annotations, checks, void 0, this.context, encodingChecks);
		}
		/** @internal */
		recur(recur) {
			return this._rebuild(recur, this.checks, this.encodingChecks);
		}
		/** @internal */
		flip(recur) {
			return this._rebuild(recur, this.encodingChecks, this.checks);
		}
		/** @internal */
		matchPart(s, options) {
			for (const type of this.types) {
				const out = type.matchPart(s, options);
				if (out !== void 0) return out;
			}
		}
		/** @internal */
		getExpected(getExpected) {
			const expected = this.annotations?.expected;
			if (typeof expected === "string") return expected;
			if (this.types.length === 0) return "never";
			const types = this.types.map((type) => {
				const encoded = toEncoded(type);
				switch (encoded._tag) {
					case "Arrays": {
						const literals = encoded.elements.filter(isLiteral);
						if (literals.length > 0) return `${formatIsMutable(encoded.isMutable)}[ ${literals.map((e) => getExpected(e) + formatIsOptional(e.context?.isOptional)).join(", ")}, ... ]`;
						break;
					}
					case "Objects": {
						const literals = encoded.propertySignatures.filter((ps) => isLiteral(ps.type));
						if (literals.length > 0) return `{ ${literals.map((ps) => `${formatIsMutable(ps.type.context?.isMutable)}${formatPropertyKey(ps.name)}${formatIsOptional(ps.type.context?.isOptional)}: ${getExpected(ps.type)}`).join(", ")}, ... }`;
						break;
					}
				}
				return getExpected(encoded);
			});
			return Array.from(new Set(types)).join(" | ");
		}
	};
	var parseUnion = /*#__PURE__*/ iterateEager()({
		onItem(s, ast) {
			return s.recur(ast)(s.oinput, s.options);
		},
		step(s, candidate, exit) {
			if (exit._tag === "Failure") {
				const issue = getSchemaIssue(exit.cause);
				if (issue === void 0) return exit;
				if (s.issues) s.issues.push(issue);
				else s.issues = [issue];
			} else {
				if (s.out && s.ast.mode === "oneOf") {
					s.successes.push(candidate);
					return fail$1(new OneOf(s.ast, s.input, s.successes));
				}
				s.out = exit.value;
				s.successes.push(candidate);
				if (s.ast.mode === "anyOf") return void_$1;
			}
		}
	});
	var nonFiniteLiterals = /*#__PURE__*/ new Union$1([
		/*#__PURE__*/ new Literal$1("Infinity"),
		/*#__PURE__*/ new Literal$1("-Infinity"),
		/*#__PURE__*/ new Literal$1("NaN")
	], "anyOf");
	var numberToJson = /*#__PURE__*/ new Link(/*#__PURE__*/ new Union$1([number, nonFiniteLiterals], "anyOf"), /*#__PURE__*/ new Transformation(/*#__PURE__*/ Number$3(), /*#__PURE__*/ transform$1((n) => globalThis.Number.isFinite(n) ? n : globalThis.String(n))));
	function formatIsMutable(isMutable) {
		return isMutable ? "" : "readonly ";
	}
	function formatIsOptional(isOptional) {
		return isOptional ? "?" : "";
	}
	/** @internal */
	function memoizeThunk(f) {
		let done = false;
		let a;
		return () => {
			if (done) return a;
			a = f();
			done = true;
			return a;
		};
	}
	/**
	* AST node for lazy/recursive schemas.
	*
	* **Details**
	*
	* Wraps a thunk (`() => AST`) that is memoized on first call. Use this to
	* define recursive or mutually recursive schemas without infinite loops at
	* construction time.
	*
	* **Example** (Defining recursive schema ASTs)
	*
	* ```ts
	* import { Schema, SchemaAST } from "effect"
	*
	* interface Category {
	*   readonly name: string
	*   readonly children: ReadonlyArray<Category>
	* }
	*
	* const Category = Schema.Struct({
	*   name: Schema.String,
	*   children: Schema.Array(Schema.suspend((): Schema.Codec<Category> => Category))
	* })
	*
	* // The recursive branch is a Suspend node
	* ```
	*
	* @see {@link isSuspend}
	* @category models
	* @since 3.10.0
	*/
	var Suspend = class Suspend extends Base {
		_tag = "Suspend";
		thunk;
		constructor(thunk, annotations, checks, encoding, context) {
			if (checks !== void 0) throw new Error("Cannot add checks to Suspend");
			super(annotations, void 0, encoding, context);
			this.thunk = memoizeThunk(thunk);
		}
		/** @internal */
		getParser(recur) {
			return recur(this.thunk());
		}
		/** @internal */
		recur(recur) {
			return new Suspend(() => recur(this.thunk()), this.annotations, void 0, void 0, this.context);
		}
		/** @internal */
		getExpected(getExpected) {
			return getExpected(this.thunk());
		}
	};
	/**
	* Represents a single validation check attached to an AST node.
	*
	* **Details**
	*
	* - `run` — the validation function. Returns `undefined` on success, or an
	*   `Issue` on failure.
	* - `annotations` — optional filter-level metadata (expected message, meta
	*   tags, arbitrary constraint hints).
	* - `aborted` — when `true`, parsing stops immediately after this filter
	*   fails (no further checks run).
	*
	* Use `.annotate()` to add metadata and `.abort()` to mark as aborting.
	* Combine with another check via `.and()` to form a {@link FilterGroup}.
	*
	* @see {@link FilterGroup}
	* @see {@link Check}
	* @see {@link isPattern}
	* @category models
	* @since 4.0.0
	*/
	var Filter = class Filter extends Class$1 {
		_tag = "Filter";
		run;
		annotations;
		/**
		* Whether the parsing process should be aborted after this check has failed.
		*/
		aborted;
		constructor(run, annotations = void 0, aborted = false) {
			super();
			this.run = run;
			this.annotations = annotations;
			this.aborted = aborted;
		}
		annotate(annotations) {
			return new Filter(this.run, {
				...this.annotations,
				...annotations
			}, this.aborted);
		}
		abort() {
			return new Filter(this.run, this.annotations, true);
		}
		and(other, annotations) {
			return new FilterGroup([this, other], annotations);
		}
	};
	/**
	* Represents a composite validation check grouping multiple {@link Check} values.
	*
	* **Details**
	*
	* Created by calling `.and()` on a {@link Filter} or another `FilterGroup`.
	* All inner checks are run; failures from aborted filters still stop
	* evaluation.
	*
	* @see {@link Filter}
	* @see {@link Check}
	* @category models
	* @since 4.0.0
	*/
	var FilterGroup = class FilterGroup extends Class$1 {
		_tag = "FilterGroup";
		checks;
		annotations;
		constructor(checks, annotations = void 0) {
			super();
			this.checks = checks;
			this.annotations = annotations;
		}
		annotate(annotations) {
			return new FilterGroup(this.checks, {
				...this.annotations,
				...annotations
			});
		}
		and(other, annotations) {
			return new FilterGroup([this, other], annotations);
		}
	};
	/** @internal */
	function makeFilter$1(filter, annotations, aborted = false) {
		return new Filter((input, ast, options) => make$6(input, ast, filter(input, ast, options)), annotations, aborted);
	}
	/**
	* Creates a {@link Filter} that validates strings by running `RegExp.test`.
	*
	* **When to use**
	*
	* Use when string validation should be represented as a schema `Filter` backed
	* by a regular expression.
	*
	* **Details**
	*
	* The filter can be used with `Schema.filter` or attached directly to a
	* `String` AST node through checks. The regular expression source is stored in
	* annotations for serialization and arbitrary generation.
	*
	* **Gotchas**
	*
	* Use a non-global, non-sticky regular expression, or reset `lastIndex`
	* yourself, because `RegExp.test` is stateful for expressions with the `g` or
	* `y` flag.
	*
	* **Example** (Validating an email pattern)
	*
	* ```ts
	* import { SchemaAST } from "effect"
	*
	* const emailFilter = SchemaAST.isPattern(/^[^@]+@[^@]+$/)
	* ```
	*
	* @see {@link Filter}
	* @category constructors
	* @since 4.0.0
	*/
	function isPattern$1(regExp, annotations) {
		const source = regExp.source;
		return makeFilter$1((s) => regExp.test(s), {
			expected: `a string matching the RegExp ${source}`,
			meta: {
				_tag: "isPattern",
				regExp
			},
			arbitrary: { constraint: { patterns: [regExp.source] } },
			...annotations
		});
	}
	function modifyOwnPropertyDescriptors(ast, f) {
		const d = Object.getOwnPropertyDescriptors(ast);
		f(d);
		return Object.create(Object.getPrototypeOf(ast), d);
	}
	/** @internal */
	function replaceEncoding(ast, encoding) {
		if (ast.encoding === encoding) return ast;
		return modifyOwnPropertyDescriptors(ast, (d) => {
			d.encoding.value = encoding;
		});
	}
	/** @internal */
	function replaceContext(ast, context) {
		if (ast.context === context) return ast;
		return modifyOwnPropertyDescriptors(ast, (d) => {
			d.context.value = context;
		});
	}
	/** @internal */
	function getLastEncoding(ast) {
		return ast.encoding ? getLastEncoding(ast.encoding[ast.encoding.length - 1].to) : ast;
	}
	/** @internal */
	function annotate$1(ast, annotations) {
		if (ast.checks) {
			const last = ast.checks[ast.checks.length - 1];
			return replaceChecks(ast, append(ast.checks.slice(0, -1), last.annotate(annotations)));
		}
		return modifyOwnPropertyDescriptors(ast, (d) => {
			d.annotations.value = {
				...d.annotations.value,
				...annotations
			};
		});
	}
	/** @internal */
	function replaceChecks(ast, checks) {
		if (ast._tag === "Suspend" && checks !== void 0) throw new Error("Cannot add checks to Suspend");
		if (ast.checks === checks) return ast;
		return modifyOwnPropertyDescriptors(ast, (d) => {
			d.checks.value = checks;
		});
	}
	/** @internal */
	function appendChecks(ast, checks) {
		return replaceChecks(ast, combineChecks(ast.checks, checks));
	}
	function updateLastLink(encoding, f) {
		const links = encoding;
		const last = links[links.length - 1];
		const to = f(last.to);
		if (to !== last.to) return append(encoding.slice(0, encoding.length - 1), new Link(to, last.transformation));
		return encoding;
	}
	/** @internal */
	function applyToLastLink(f) {
		return (ast) => ast.encoding ? replaceEncoding(ast, updateLastLink(ast.encoding, f)) : ast;
	}
	/** @internal */
	function applyToSelfOrLastLinkEncoding(f) {
		function out(ast) {
			return ast.encoding ? replaceEncoding(ast, updateLastLink(ast.encoding, out)) : f(ast);
		}
		return memoize(out);
	}
	function appendTransformation(from, transformation, to) {
		const link = new Link(from, transformation);
		return replaceEncoding(to, to.encoding ? [...to.encoding, link] : [link]);
	}
	function mapOrSame(as, f) {
		let changed = false;
		const out = new Array(as.length);
		for (let i = 0; i < as.length; i++) {
			const a = as[i];
			const fa = f(a);
			if (fa !== a) changed = true;
			out[i] = fa;
		}
		return changed ? out : as;
	}
	/** @internal */
	function annotateKey(ast, annotations) {
		return replaceContext(ast, ast.context ? new Context(ast.context.isOptional, ast.context.isMutable, ast.context.defaultValue, {
			...ast.context.annotations,
			...annotations
		}) : new Context(false, false, void 0, annotations));
	}
	/** @internal */
	var optionalKeyLastLink = /*#__PURE__*/ applyToLastLink(optionalKey$1);
	/**
	* Marks an AST node's property key as optional by setting
	* {@link Context.isOptional} to `true`.
	*
	* **Details**
	*
	* Also propagates the optional flag through the last link of the encoding
	* chain if present.
	*
	* @see {@link isOptional}
	* @see {@link Context}
	* @category transforming
	* @since 4.0.0
	*/
	function optionalKey$1(ast) {
		return optionalKeyLastLink(replaceContext(ast, ast.context ? ast.context.isOptional === false ? new Context(true, ast.context.isMutable, ast.context.defaultValue, ast.context.annotations) : ast.context : new Context(true, false)));
	}
	/** @internal */
	function withConstructorDefault$1(ast, defaultValue) {
		const encoding = [new Link(unknown, new Transformation(withDefault(defaultValue), passthrough$1()))];
		return replaceContext(ast, ast.context ? new Context(ast.context.isOptional, ast.context.isMutable, encoding, ast.context.annotations) : new Context(false, false, encoding));
	}
	/**
	* Attaches a `Transformation` to the `to` AST, making it decode from the
	* `from` AST and encode back to it.
	*
	* **Details**
	*
	* This is the low-level primitive behind `Schema.transform` and
	* `Schema.transformOrFail`. It appends a {@link Link} to the `to` node's
	* encoding chain.
	*
	* - Returns a new AST with the same type as `to`.
	*
	* @see {@link Link}
	* @see {@link Encoding}
	* @see {@link flip}
	* @category transforming
	* @since 4.0.0
	*/
	function decodeTo$1(from, to, transformation) {
		return appendTransformation(from, transformation, to);
	}
	function parseParameter(ast) {
		const literals = [];
		const parameters = [];
		function go(ast) {
			switch (ast._tag) {
				case "Literal":
					if (isPropertyKey(ast.literal)) literals.push(ast.literal);
					return;
				case "UniqueSymbol":
					literals.push(ast.symbol);
					return;
				case "Never": return;
				case "Union":
					for (let i = 0; i < ast.types.length; i++) go(ast.types[i]);
					return;
				default: parameters.push(ast);
			}
		}
		go(ast);
		return {
			literals,
			parameters
		};
	}
	/** @internal */
	function record(key, value, keyValueCombiner) {
		const { literals, parameters: indexSignatures } = parseParameter(key);
		return new Objects(literals.map((literal) => new PropertySignature(literal, value)), indexSignatures.map((parameter) => new IndexSignature(parameter, value, keyValueCombiner)));
	}
	/**
	* Returns `true` if the AST node represents an optional property.
	*
	* **Details**
	*
	* Checks `ast.context?.isOptional`. Defaults to `false` when no
	* {@link Context} is set.
	*
	* @see {@link optionalKey}
	* @see {@link Context}
	* @category predicates
	* @since 4.0.0
	*/
	function isOptional(ast) {
		return ast.context?.isOptional ?? false;
	}
	/** @internal */
	function isMutable(ast) {
		return ast.context?.isMutable ?? false;
	}
	/**
	* Strips all encoding transformations from an AST, returning the decoded
	* (type-level) representation.
	*
	* **Details**
	*
	* - Memoized: same input reference → same output reference.
	* - Recursively walks into composite nodes ({@link Arrays}, {@link Objects},
	*   {@link Union}, {@link Suspend}).
	*
	* **Example** (Getting the type AST)
	*
	* ```ts
	* import { Schema, SchemaAST } from "effect"
	*
	* const schema = Schema.NumberFromString
	* const typeAst = SchemaAST.toType(schema.ast)
	* console.log(typeAst._tag) // "Number"
	* ```
	*
	* @see {@link toEncoded}
	* @see {@link flip}
	* @category transforming
	* @since 4.0.0
	*/
	var toType = /*#__PURE__*/ memoize((ast) => {
		if (ast.encoding) return toType(replaceEncoding(ast, void 0));
		const out = ast;
		const type = out.recur?.(toType) ?? out;
		const encodingChecks = type.encodingChecks;
		if (encodingChecks) return modifyOwnPropertyDescriptors(type, (d) => {
			d.encodingChecks.value = void 0;
			if (type === ast) d.checks.value = combineChecks(type.checks, encodingChecks);
		});
		return type;
	});
	/**
	* Returns the encoded (wire-format) AST by flipping and then stripping
	* encodings.
	*
	* **Details**
	*
	* Equivalent to `toType(flip(ast))`. This gives you the AST that describes
	* the shape of the serialized/encoded data.
	*
	* - Memoized: same input reference → same output reference.
	*
	* **Example** (Getting the encoded AST)
	*
	* ```ts
	* import { Schema, SchemaAST } from "effect"
	*
	* const schema = Schema.NumberFromString
	* const encodedAst = SchemaAST.toEncoded(schema.ast)
	* console.log(encodedAst._tag) // "String"
	* ```
	*
	* @see {@link toType}
	* @see {@link flip}
	* @category transforming
	* @since 4.0.0
	*/
	var toEncoded = /*#__PURE__*/ memoize((ast) => {
		return toType(flip(ast));
	});
	function flipEncoding(ast, encoding) {
		const links = encoding;
		const len = links.length;
		const last = links[len - 1];
		const ls = [new Link(flip(replaceEncoding(ast, void 0)), links[0].transformation.flip())];
		for (let i = 1; i < len; i++) ls.unshift(new Link(flip(links[i - 1].to), links[i].transformation.flip()));
		const to = flip(last.to);
		if (to.encoding) return replaceEncoding(to, [...to.encoding, ...ls]);
		else return replaceEncoding(to, ls);
	}
	/**
	* Swaps the decode and encode directions of an AST's {@link Encoding} chain.
	*
	* **Details**
	*
	* After flipping, what was decoding becomes encoding and vice versa. This is
	* the core operation behind `Schema.encode` — encoding a value is decoding
	* with a flipped SchemaAST.
	*
	* - Memoized: same input reference → same output reference.
	* - Recursively walks composite nodes.
	*
	* @see {@link toType}
	* @see {@link toEncoded}
	* @category transforming
	* @since 4.0.0
	*/
	var flip = /*#__PURE__*/ memoize((ast) => {
		if (ast.encoding) return flipEncoding(ast, ast.encoding);
		const out = ast;
		return out.flip?.(flip) ?? out.recur?.(flip) ?? out;
	});
	/** @internal */
	function containsUndefined(ast) {
		switch (ast._tag) {
			case "Undefined": return true;
			case "Union": return ast.types.some(containsUndefined);
			default: return false;
		}
	}
	function fromConst(ast, value) {
		const succeed = succeedSome(value);
		return (oinput) => {
			if (oinput._tag === "None") return succeedNone;
			return oinput.value === value ? succeed : fail(new InvalidType(ast, oinput));
		};
	}
	function fromRefinement(ast, refinement) {
		return (oinput) => {
			if (oinput._tag === "None") return succeedNone;
			return refinement(oinput.value) ? succeed(oinput) : fail(new InvalidType(ast, oinput));
		};
	}
	function applyTemplateLiteralPartChecks(ast, value, options) {
		if (options?.disableChecks || ast.checks === void 0) return value;
		const issues = [];
		collectIssues(ast.checks, value, issues, ast, options);
		return issues.length === 0 ? value : void 0;
	}
	var parameterFromPropertyKey = /*#__PURE__*/ applyToSelfOrLastLinkEncoding((ast) => {
		switch (ast._tag) {
			default: return ast;
			case "Number": return ast.toCodecStringTree();
			case "Union": return ast.recur(parameterFromPropertyKey);
		}
	});
	/**
	* any string, including newlines
	* @internal
	*/
	var STRING_PATTERN = "[\\s\\S]*?";
	var isStringFiniteRegExp = /*#__PURE__*/ new globalThis.RegExp(`^${FINITE_PATTERN}$`);
	var isStringNumberRegExp = /*#__PURE__*/ new globalThis.RegExp(`(?:${FINITE_PATTERN}|Infinity|-Infinity|NaN)`);
	/** @internal */
	function isStringFinite(annotations) {
		return isPattern$1(isStringFiniteRegExp, {
			expected: "a string representing a finite number",
			meta: {
				_tag: "isStringFinite",
				regExp: isStringFiniteRegExp
			},
			...annotations
		});
	}
	var finiteString = /*#__PURE__*/ appendChecks(string, [/*#__PURE__*/ isStringFinite()]);
	var finiteToString = /*#__PURE__*/ new Link(finiteString, numberFromString);
	var numberToString = /*#__PURE__*/ new Link(/*#__PURE__*/ new Union$1([finiteString, nonFiniteLiterals], "anyOf"), numberFromString);
	/** @internal */
	function collectIssues(checks, value, issues, ast, options) {
		for (let i = 0; i < checks.length; i++) {
			const check = checks[i];
			if (check._tag === "FilterGroup") collectIssues(check.checks, value, issues, ast, options);
			else {
				const issue = check.run(value, ast, options);
				if (issue) {
					issues.push(new Filter$1(value, check, issue));
					if (check.aborted || options?.errors !== "all") return;
				}
			}
		}
	}
	/** @internal */
	var ClassTypeId = "~effect/Schema/Class";
	/** @internal */
	var STRUCTURAL_ANNOTATION_KEY = "~structural";
	/**
	* Returns the `identifier` annotation from the AST node, if set.
	*
	* **Details**
	*
	* The identifier is typically set by `Schema.annotations({ identifier: "..." })`
	* and is used for error messages and schema identification.
	*
	* @see {@link resolve}
	* @see {@link resolveTitle}
	* @category annotations
	* @since 4.0.0
	*/
	var resolveIdentifier = resolveIdentifier$1;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/MutableRef.js
	var TypeId$3 = "~effect/MutableRef";
	var MutableRefProto = {
		[TypeId$3]: TypeId$3,
		...PipeInspectableProto,
		toJSON() {
			return {
				_id: "MutableRef",
				current: toJson(this.current)
			};
		}
	};
	/**
	* Creates a new MutableRef with the specified initial value.
	*
	* **When to use**
	*
	* Use to create a synchronous `MutableRef` initialized with a value.
	*
	* **Example** (Creating mutable refs)
	*
	* ```ts
	* import { MutableRef } from "effect"
	*
	* // Create a counter reference
	* const counter = MutableRef.make(0)
	* console.log(MutableRef.get(counter)) // 0
	*
	* // Create a configuration reference
	* const config = MutableRef.make({ debug: false, timeout: 5000 })
	* console.log(MutableRef.get(config)) // { debug: false, timeout: 5000 }
	*
	* // Create a string reference
	* const status = MutableRef.make("idle")
	* MutableRef.set(status, "running")
	* console.log(MutableRef.get(status)) // "running"
	* ```
	*
	* @category constructors
	* @since 2.0.0
	*/
	var make$3 = (value) => {
		const ref = Object.create(MutableRefProto);
		ref.current = value;
		return ref;
	};
	/**
	* Sets the MutableRef to a new value and returns the reference.
	*
	* **When to use**
	*
	* Use when you need an in-place `MutableRef` replacement that returns the same
	* `MutableRef`.
	*
	* **Example** (Setting values)
	*
	* ```ts
	* import { MutableRef } from "effect"
	*
	* const ref = MutableRef.make("initial")
	*
	* // Set a new value
	* MutableRef.set(ref, "updated")
	* console.log(MutableRef.get(ref)) // "updated"
	*
	* // Chain set operations (since it returns the ref)
	* const result = MutableRef.set(ref, "final")
	* console.log(result === ref) // true (same reference)
	* console.log(MutableRef.get(ref)) // "final"
	*
	* // Set complex objects
	* const config = MutableRef.make({ debug: false, verbose: false })
	* MutableRef.set(config, { debug: true, verbose: true })
	* console.log(MutableRef.get(config)) // { debug: true, verbose: true }
	*
	* // Pipe-able version
	* const setValue = MutableRef.set("new value")
	* setValue(ref)
	* console.log(MutableRef.get(ref)) // "new value"
	*
	* // Useful for state management
	* const state = MutableRef.make<"idle" | "loading" | "success" | "error">("idle")
	* MutableRef.set(state, "loading")
	* // ... perform async operation
	* MutableRef.set(state, "success")
	* ```
	*
	* @category general
	* @since 2.0.0
	*/
	var set$1 = /*#__PURE__*/ dual(2, (self, value) => {
		self.current = value;
		return self;
	});
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Semaphore.js
	/**
	* Creates a `Semaphore` synchronously with the specified total
	* number of permits.
	*
	* **When to use**
	*
	* Use to construct a semaphore synchronously when an immediate value is
	* required outside an Effect workflow.
	*
	* **Example** (Creating an unsafe semaphore)
	*
	* ```ts
	* import { Effect, Semaphore } from "effect"
	*
	* const semaphore = Semaphore.makeUnsafe(3)
	*
	* const task = (id: number) =>
	*   semaphore.withPermits(1)(
	*     Effect.gen(function*() {
	*       yield* Effect.log(`Task ${id} started`)
	*       yield* Effect.sleep("1 second")
	*       yield* Effect.log(`Task ${id} completed`)
	*     })
	*   )
	*
	* // Only 3 tasks can run concurrently
	* const program = Effect.all([
	*   task(1),
	*   task(2),
	*   task(3),
	*   task(4),
	*   task(5)
	* ], { concurrency: "unbounded" })
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var makeUnsafe$1 = (permits) => new SemaphoreImpl(permits);
	var SemaphoreImpl = class {
		waiters = /*#__PURE__*/ new Set();
		taken = 0;
		permits;
		constructor(permits) {
			this.permits = permits;
		}
		get free() {
			return this.permits - this.taken;
		}
		take(n) {
			const take = suspend$2(() => {
				if (this.free < n) return callback$1((resume) => {
					if (this.free >= n) return resume(take);
					const observer = () => {
						if (this.free < n) return;
						this.waiters.delete(observer);
						resume(take);
					};
					this.waiters.add(observer);
					return sync$1(() => {
						this.waiters.delete(observer);
					});
				});
				this.taken += n;
				return succeed$1(n);
			});
			return take;
		}
		updateTakenUnsafe(fiber, f) {
			this.taken = f(this.taken);
			if (this.waiters.size > 0) fiber.currentDispatcher.scheduleTask(() => {
				const iter = this.waiters.values();
				let item = iter.next();
				while (item.done === false && this.free > 0) {
					item.value();
					item = iter.next();
				}
			}, 0);
			return this.free;
		}
		updateTaken(f) {
			return withFiber$1((fiber) => succeed$1(this.updateTakenUnsafe(fiber, f)));
		}
		resize(permits) {
			return withFiber$1((fiber) => {
				this.permits = permits;
				if (this.free < 0) return void_$2;
				this.updateTakenUnsafe(fiber, (taken) => taken);
				return void_$2;
			});
		}
		release(n) {
			return this.updateTaken((taken) => taken - n);
		}
		get releaseAll() {
			return this.updateTaken((_) => 0);
		}
		withPermits(n) {
			return (self) => uninterruptibleMask$1((restore) => flatMap$1(restore(this.take(n)), (permits) => onExitPrimitive(restore(self), () => {
				this.updateTakenUnsafe(getCurrentFiber(), (taken) => taken - permits);
			}, true)));
		}
		withPermit = /*#__PURE__*/ this.withPermits(1);
		withPermitsIfAvailable(n) {
			return (self) => uninterruptibleMask$1((restore) => {
				if (this.free < n) return succeedNone$1;
				this.taken += n;
				return onExitPrimitive(restore(asSome(self)), () => {
					this.updateTakenUnsafe(getCurrentFiber(), (taken) => taken - n);
				}, true);
			});
		}
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Struct.js
	/**
	* Wraps a plain function as a {@link Lambda} value so it can be used with
	* {@link map}, {@link mapPick}, and {@link mapOmit}.
	*
	* **When to use**
	*
	* Use to create a typed lambda for struct mapping APIs that need type-level
	* input and output tracking.
	*
	* **Details**
	*
	* The type parameter `L` encodes both the input and output types at the type
	* level, allowing the compiler to track how struct value types change. At
	* runtime, the returned value is the same function; `lambda` only adjusts the
	* type.
	*
	* **Example** (Wrapping values in arrays)
	*
	* ```ts
	* import { pipe, Struct } from "effect"
	*
	* interface AsArray extends Struct.Lambda {
	*   <A>(self: A): Array<A>
	*   readonly "~lambda.out": Array<this["~lambda.in"]>
	* }
	*
	* const asArray = Struct.lambda<AsArray>((a) => [a])
	* const result = pipe({ x: 1, y: "hello" }, Struct.map(asArray))
	* console.log(result) // { x: [1], y: ["hello"] }
	* ```
	*
	* @see {@link Lambda} – the type-level interface
	* @see {@link map} – apply a lambda to all struct values
	* @category Lambda
	* @since 4.0.0
	*/
	var lambda = (f) => f;
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/SchemaParser.js
	/**
	* Runs schemas against real values.
	*
	* Schema parsers construct values from schema input, check whether a value
	* matches a schema, decode encoded input, and encode decoded values back to
	* their external form. This module exposes those operations through several
	* result styles, including `Effect`, `Promise`, `Exit`, `Option`, `Result`, and
	* synchronous functions that throw. It also contains the lower-level runner that
	* walks a schema AST and reports schema failures as `SchemaIssue.Issue` values.
	*
	* @since 4.0.0
	*/
	var recurDefaults = /*#__PURE__*/ memoize((ast) => {
		switch (ast._tag) {
			case "Declaration": {
				const getLink = ast.annotations?.[ClassTypeId];
				if (isFunction(getLink)) {
					const link = getLink(ast.typeParameters);
					const to = recurDefaults(link.to);
					return replaceEncoding(ast, to === link.to ? [link] : [new Link(to, link.transformation)]);
				}
				return ast;
			}
			case "Objects":
			case "Arrays": return ast.recur((ast) => {
				const defaultValue = ast.context?.defaultValue;
				if (defaultValue) return replaceEncoding(recurDefaults(ast), defaultValue);
				return recurDefaults(ast);
			});
			case "Suspend": return ast.recur(recurDefaults);
			default: return ast;
		}
	});
	/**
	* Creates an effectful maker for the schema's decoded type side.
	*
	* **When to use**
	*
	* Use to construct decoded schema values in `Effect` while preserving
	* construction failures as `SchemaIssue.Issue` values in the error channel.
	*
	* **Details**
	*
	* The returned function accepts constructor input, applies constructor defaults,
	* runs type-side validation unless checks are disabled, and fails with a
	* `SchemaIssue.Issue` when construction fails.
	*
	* @category constructors
	* @since 4.0.0
	*/
	function makeEffect(schema) {
		const parser = run(recurDefaults(toType(schema.ast)));
		return (input, options) => {
			return parser(input, options?.disableChecks ? options?.parseOptions ? {
				...options.parseOptions,
				disableChecks: true
			} : { disableChecks: true } : options?.parseOptions);
		};
	}
	/**
	* Creates a synchronous maker that returns `Option.some` with the constructed
	* value on success, or `Option.none` when construction fails with schema issues.
	*
	* **When to use**
	*
	* Use when you need to validate schema constructor input and only care whether
	* construction succeeds, without exposing `SchemaIssue.Issue` details.
	*
	* **Gotchas**
	*
	* Only causes made entirely of schema issues are converted to `Option.none`.
	* Causes that contain defects, interruptions, or asynchronous work at this
	* synchronous boundary throw an `Error` whose cause is the underlying `Cause`.
	*
	* @category constructors
	* @since 4.0.0
	*/
	function makeOption(schema) {
		const parser = makeEffect(schema);
		return (input, options) => {
			const exit = runSyncExit(parser(input, options));
			if (isSuccess(exit)) return some(exit.value);
			getSchemaIssueOrThrow(exit.cause, "Option adapter can only return none for schema issues");
			return none();
		};
	}
	/**
	* Creates a synchronous maker for the schema's decoded type side.
	*
	* **When to use**
	*
	* Use to construct decoded schema values synchronously when invalid input
	* should throw an `Error` whose cause is `SchemaIssue.Issue`.
	*
	* **Details**
	*
	* The returned function constructs a value from constructor input and throws an
	* `Error` with the `SchemaIssue.Issue` in its `cause` when construction fails.
	*
	* **Gotchas**
	*
	* Causes that contain defects, interruptions, or asynchronous work at this
	* synchronous boundary throw an `Error` whose cause is the underlying `Cause`,
	* instead of being converted to a schema validation error.
	*
	* @category constructors
	* @since 4.0.0
	*/
	function make$2(schema) {
		const parser = makeEffect(schema);
		return (input, options) => {
			const exit = runSyncExit(parser(input, options));
			if (isSuccess(exit)) return exit.value;
			const issue = getSchemaIssueOrThrow(exit.cause, "Constructor adapter can only throw schema issues");
			throw new Error(issue.toString(), { cause: issue });
		};
	}
	/**
	* Creates a type guard that checks whether an input satisfies the schema's decoded
	* type side.
	*
	* **When to use**
	*
	* Use to build a type guard for checking the decoded side of a schema without
	* exposing issue details.
	*
	* **Details**
	*
	* The guard returns `true` on successful validation and `false` when validation
	* fails only with schema issues, without exposing issue details.
	*
	* **Gotchas**
	*
	* Only causes made entirely of schema issues are converted to `false`. Causes
	* that contain defects, interruptions, or asynchronous work at this synchronous
	* boundary throw an `Error` whose cause is the underlying `Cause`.
	*
	* @category Asserting
	* @since 3.10.0
	*/
	function is$1(schema) {
		return _is(schema.ast);
	}
	/** @internal */
	function _is(ast) {
		const parser = asExit(run(toType(ast)));
		return (input) => {
			const exit = parser(input, defaultParseOptions);
			if (isSuccess(exit)) return true;
			getSchemaIssueOrThrow(exit.cause, "Type guard adapter can only return false for schema issues");
			return false;
		};
	}
	/**
	* Creates an effectful decoder for `unknown` input.
	*
	* **When to use**
	*
	* Use when you need to decode untyped boundary input in an `Effect` whose
	* failure channel is `SchemaIssue.Issue`, while preserving transformations
	* and service requirements.
	*
	* **Details**
	*
	* The returned function succeeds with the schema's decoded `Type` or fails with a
	* `SchemaIssue.Issue`. Decoding service requirements are preserved in the returned
	* `Effect`. Parse options may be provided when creating the decoder and overridden
	* when applying it.
	*
	* @see {@link decodeEffect} for input already typed as the schema's `Encoded` type
	*
	* @category decoding
	* @since 4.0.0
	*/
	function decodeUnknownEffect$1(schema, options) {
		const parser = run(schema.ast);
		return options === void 0 ? parser : (input, overrideOptions) => parser(input, mergeParseOptions(options, overrideOptions));
	}
	/**
	* Creates a decoder for `unknown` input that reports failure safely as a
	* `Result`.
	*
	* **When to use**
	*
	* Use when decoding untyped boundary input and you want `SchemaIssue.Issue`
	* failures returned as data in a `Result`.
	*
	* **Details**
	*
	* The returned function produces `Result.succeed` with the decoded `Type` on
	* success or `Result.fail` with a `SchemaIssue.Issue` on decoding failure.
	*
	* **Gotchas**
	*
	* This adapter runs synchronously. Causes made entirely of schema issues become
	* `Result.fail`, but causes that contain defects, interruptions, or asynchronous
	* work at this synchronous boundary throw instead.
	*
	* @see {@link decodeResult} for input already typed as the schema's `Encoded` type
	* @see {@link decodeUnknownEffect} for effectful or service-requiring decoding
	*
	* @category decoding
	* @since 4.0.0
	*/
	function decodeUnknownResult$1(schema, options) {
		return asResult(decodeUnknownEffect$1(schema, options));
	}
	var mergeParseOptions = (options, overrideOptions) => overrideOptions === void 0 ? options : {
		...options,
		...overrideOptions
	};
	/** @internal */
	function run(ast) {
		const parser = recur(ast);
		return (input, options) => flatMapEager(parser(some(input), options ?? defaultParseOptions), (oa) => {
			if (oa._tag === "None") return fail(new InvalidValue(oa));
			return succeed(oa.value);
		});
	}
	function asExit(parser) {
		return (input, options) => runSyncExit(parser(input, options));
	}
	function asResult(parser) {
		const parserExit = asExit(parser);
		return (input, options) => {
			const exit = parserExit(input, options);
			if (isSuccess(exit)) return succeed$2(exit.value);
			return fail$3(getSchemaIssueOrThrow(exit.cause, "Result adapter can only return schema issues"));
		};
	}
	function mapSchemaIssueEffect(self, f) {
		return catchCause(self, (cause) => failCauseSync(() => map$1(cause, f)));
	}
	var recur = /*#__PURE__*/ memoize((ast) => {
		let parser;
		const checks = ast.checks;
		const encoding = ast.encoding;
		const links = encoding;
		const len = links?.length ?? 0;
		const encodingChecks = ast.encodingChecks;
		const astOptions = (checks ? checks[checks.length - 1].annotations : ast.annotations)?.["parseOptions"];
		if (!ast.context && !encoding && !checks && !encodingChecks) return (ou, options) => {
			parser ??= ast.getParser(recur);
			if (astOptions) options = {
				...options,
				...astOptions
			};
			return parser(ou, options);
		};
		const isStructural = isArrays(ast) || isObjects(ast) || isDeclaration(ast) && ast.typeParameters.length > 0;
		const structuralChecks = checks && isStructural ? checks.filter((check) => check.annotations?.[STRUCTURAL_ANNOTATION_KEY]) : void 0;
		return (ou, options) => {
			if (astOptions) options = {
				...options,
				...astOptions
			};
			let srou;
			if (links) {
				for (let i = len - 1; i >= 0; i--) {
					const link = links[i];
					const to = link.to;
					const parser = recur(to);
					srou = srou ? flatMapEager(srou, (ou) => parser(ou, options)) : parser(ou, options);
					if (link.transformation._tag === "Transformation") {
						const getter = link.transformation.decode;
						srou = flatMapEager(srou, (ou) => getter.run(ou, options));
					} else srou = link.transformation.decode(srou, options);
				}
				srou = mapSchemaIssueEffect(srou, (issue) => new Encoding(ast, ou, issue));
			}
			parser ??= ast.getParser(recur);
			const parseLocal = (localOu) => {
				let sroa = parser(localOu, options);
				if (encodingChecks && !options?.disableChecks) sroa = flatMapEager(sroa, (oa) => {
					if (isSome(localOu) && isSome(oa)) {
						const issues = [];
						collectIssues(encodingChecks, localOu.value, issues, ast, options);
						if (isArrayNonEmpty(issues)) return fail(new Composite(ast, localOu, issues));
					}
					return succeed(oa);
				});
				if (checks && !options?.disableChecks) {
					if (options?.errors === "all" && structuralChecks && structuralChecks.length > 0 && isSome(localOu)) sroa = mapSchemaIssueEffect(sroa, (issue) => {
						const issues = [];
						collectIssues(structuralChecks, localOu.value, issues, ast, options);
						return isArrayNonEmpty(issues) ? issue._tag === "Composite" && issue.ast === ast ? new Composite(ast, issue.actual, [...issue.issues, ...issues]) : new Composite(ast, localOu, [issue, ...issues]) : issue;
					});
					sroa = flatMapEager(sroa, (oa) => {
						if (isSome(oa)) {
							const value = oa.value;
							const issues = [];
							collectIssues(checks, value, issues, ast, options);
							if (isArrayNonEmpty(issues)) return fail(new Composite(ast, oa, issues));
						}
						return succeed(oa);
					});
				}
				return sroa;
			};
			return srou ? flatMapEager(srou, parseLocal) : parseLocal(ou);
		};
	});
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/JsonPointer.js
	/**
	* Helpers for escaping and unescaping JSON Pointer path segments. JSON Pointer
	* uses `/` to separate path tokens inside a JSON document, so token text must
	* encode literal `~` and `/` characters. This module provides the two RFC 6901
	* token conversions used by JSON Patch and related path handling.
	*
	* @since 4.0.0
	*/
	/**
	* Escapes a JSON Pointer reference token according to RFC 6901 by encoding special characters so the token can be safely used as a segment in a JSON Pointer.
	*
	* **When to use**
	*
	* Use when you need to escape a single JSON Pointer path segment.
	*
	* **Details**
	*
	* - Returns a new escaped string
	* - Replaces `~` (tilde) with `~0` and `/` (forward slash) with `~1`
	* - Returns the input unchanged if it contains no special characters
	* - Empty strings are valid and returned unchanged
	*
	* **Gotchas**
	*
	* The replacement order matters: `~` is replaced before `/` to prevent double-escaping.
	*
	* **Example** (Escaping special characters)
	*
	* ```ts
	* import { JsonPointer } from "effect"
	*
	* JsonPointer.escapeToken("a/b") // "a~1b"
	* JsonPointer.escapeToken("c~d") // "c~0d"
	* JsonPointer.escapeToken("path/to~key") // "path~1to~0key"
	* ```
	*
	* @see {@link unescapeToken} The inverse operation for decoding escaped tokens
	* @category encoding
	* @since 4.0.0
	*/
	function escapeToken(token) {
		return token.replace(/~/g, "~0").replace(/\//g, "~1");
	}
	globalThis.RegExp;
	/**
	* Escapes special characters in a regular expression pattern.
	*
	* **When to use**
	*
	* Use to turn literal text into a safe regular expression pattern fragment.
	*
	* **Example** (Escaping a pattern string)
	*
	* ```ts
	* import { RegExp } from "effect"
	* import * as assert from "node:assert"
	*
	* assert.deepStrictEqual(RegExp.escape("a*b"), "a\\*b")
	* ```
	*
	* @category RegExp
	* @since 2.0.0
	*/
	var escape = (string) => string.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/SchemaError.js
	/**
	* @since 4.0.0
	*/
	var TypeId$2 = "~effect/SchemaError/SchemaError";
	/**
	* Error thrown (or returned as the error channel value) when schema decoding
	* or encoding fails.
	*
	* **Details**
	*
	* The `issue` field contains a structured {@link Issue} tree describing
	* every validation failure, including the path to the problematic value,
	* expected types, and actual values received. `message` renders the issue tree
	* as a human-readable string.
	*
	* Use {@link isSchemaError} to narrow an unknown value to `SchemaError`.
	*
	* **Example** (Catching a SchemaError)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* try {
	*   Schema.decodeUnknownSync(Schema.Number)("not a number")
	* } catch (err) {
	*   if (Schema.isSchemaError(err)) {
	*     console.log(err.message)
	*     // Expected number, actual "not a number"
	*   }
	* }
	* ```
	*
	* @category errors
	* @since 4.0.0
	*/
	var SchemaError = class extends TaggedError("SchemaError") {
		[TypeId$2] = TypeId$2;
		constructor(issue) {
			super({ issue });
		}
		get message() {
			return this.issue.toString();
		}
		toString() {
			return `SchemaError(${this.message})`;
		}
	};
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/schema/schema.js
	/** @internal */
	var TypeId$1 = "~effect/Schema/Schema";
	var SchemaProto = {
		[TypeId$1]: TypeId$1,
		pipe() {
			return pipeArguments(this, arguments);
		},
		annotate(annotations) {
			return this.rebuild(annotate$1(this.ast, annotations));
		},
		annotateKey(annotations) {
			return this.rebuild(annotateKey(this.ast, annotations));
		},
		check(...checks) {
			return this.rebuild(appendChecks(this.ast, checks));
		}
	};
	/** @internal */
	function make$1(ast, options) {
		const self = Object.create(SchemaProto);
		if (options) Object.assign(self, options);
		self.ast = ast;
		self.rebuild = (ast) => make$1(ast, options);
		const makeEffect$1 = makeEffect(self);
		self.makeEffect = (input, options) => fromIssueEffect(makeEffect$1(input, options));
		self.make = make$2(self);
		self.makeOption = makeOption(self);
		return self;
	}
	/** @internal */
	function fromIssueEffect(self) {
		return catchCause(self, (cause) => failCauseSync(() => map$1(cause, (issue) => new SchemaError(issue))));
	}
	/** @internal */
	var jsonReorder = /*#__PURE__*/ makeReorder(getJsonPriority);
	function getJsonPriority(ast) {
		switch (ast._tag) {
			case "BigInt":
			case "Symbol":
			case "UniqueSymbol": return 0;
			default: return 1;
		}
	}
	/** @internal */
	function makeReorder(getPriority) {
		return (types) => {
			const indexMap = /* @__PURE__ */ new Map();
			for (let i = 0; i < types.length; i++) indexMap.set(toEncoded(types[i]), i);
			const sortedTypes = [...types].sort((a, b) => {
				a = toEncoded(a);
				b = toEncoded(b);
				const pa = getPriority(a);
				const pb = getPriority(b);
				if (pa !== pb) return pa - pb;
				return indexMap.get(a) - indexMap.get(b);
			});
			if (!sortedTypes.some((ast, index) => ast !== types[index])) return types;
			return sortedTypes;
		};
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/internal/schema/representation.js
	/** @internal */
	function fromAST(ast) {
		const { references, representations: schemas } = fromASTs([ast]);
		return {
			representation: schemas[0],
			references
		};
	}
	/** @internal */
	function fromASTs(asts) {
		const references = {};
		const referenceMap = /* @__PURE__ */ new Map();
		const uniqueReferences = /* @__PURE__ */ new Set();
		const visiting = /* @__PURE__ */ new Set();
		return {
			representations: map$3(asts, (ast) => recur(ast)),
			references
		};
		function gen(prefix) {
			let candidate = prefix;
			let suffix = 0;
			while (uniqueReferences.has(candidate)) candidate = `${prefix}${++suffix}`;
			uniqueReferences.add(candidate);
			return candidate;
		}
		function recur(ast, prefix) {
			const found = referenceMap.get(ast);
			if (found !== void 0) return {
				_tag: "Reference",
				$ref: found
			};
			const last = getLastEncoding(ast);
			const identifier = resolveIdentifier$1(ast) ?? prefix;
			if (ast !== last) return recur(last, identifier);
			if (identifier !== void 0) {
				const reference = gen(identifier);
				referenceMap.set(ast, reference);
				const out = on(ast);
				const found = references[identifier];
				if (found !== void 0 && equals$2(out, found)) {
					referenceMap.set(ast, identifier);
					return {
						_tag: "Reference",
						$ref: identifier
					};
				}
				references[reference] = out;
				return {
					_tag: "Reference",
					$ref: reference
				};
			}
			if (visiting.has(ast)) {
				const reference = gen(`${ast._tag}_`);
				referenceMap.set(ast, reference);
				return {
					_tag: "Reference",
					$ref: reference
				};
			}
			visiting.add(ast);
			const out = on(ast);
			visiting.delete(ast);
			const ref = referenceMap.get(ast);
			if (ref !== void 0) {
				references[ref] = out;
				return {
					_tag: "Reference",
					$ref: ref
				};
			}
			return out;
		}
		function getEncodedSchema(last) {
			const getLink = last.annotations?.toCodecJson ?? last.annotations?.toCodec;
			if (isFunction(getLink)) return replaceEncoding(last, [getLink(last.typeParameters.map((tp) => make$1(toEncoded(tp))))]);
			return null_;
		}
		function on(last) {
			const annotations = fromASTAnnotations(last.annotations);
			switch (last._tag) {
				case "Declaration": {
					const encodedSchema = recur(getEncodedSchema(last));
					return {
						_tag: "Declaration",
						typeParameters: last.typeParameters.map((ast) => recur(ast)),
						encodedSchema,
						checks: fromASTChecks(last.checks),
						...annotations
					};
				}
				case "Null":
				case "Undefined":
				case "Void":
				case "Never":
				case "Unknown":
				case "Any":
				case "Boolean":
				case "Symbol":
				case "ObjectKeyword": return {
					_tag: last._tag,
					...annotations
				};
				case "String": {
					const contentMediaType = last.annotations?.contentMediaType;
					const contentSchema = last.annotations?.contentSchema;
					return {
						_tag: last._tag,
						checks: fromASTChecks(last.checks),
						...annotations,
						...typeof contentMediaType === "string" && isAST(contentSchema) ? { contentSchema: recur(contentSchema) } : void 0
					};
				}
				case "Number":
				case "BigInt": return {
					_tag: last._tag,
					checks: fromASTChecks(last.checks),
					...annotations
				};
				case "Literal": return {
					_tag: last._tag,
					literal: last.literal,
					...annotations
				};
				case "UniqueSymbol": return {
					_tag: last._tag,
					symbol: last.symbol,
					...annotations
				};
				case "Enum": return {
					_tag: last._tag,
					enums: last.enums,
					...annotations
				};
				case "TemplateLiteral": return {
					_tag: last._tag,
					parts: last.parts.map((ast) => recur(ast)),
					...annotations
				};
				case "Arrays": return {
					_tag: last._tag,
					elements: last.elements.map((e) => {
						const last = getLastEncoding(e);
						return {
							isOptional: isOptional(last),
							type: recur(e),
							...fromASTAnnotations(last.context?.annotations)
						};
					}),
					rest: last.rest.map((ast) => recur(ast)),
					checks: fromASTChecks(last.checks),
					...annotations
				};
				case "Objects": return {
					_tag: last._tag,
					propertySignatures: last.propertySignatures.map((ps) => {
						const last = getLastEncoding(ps.type);
						return {
							name: ps.name,
							type: recur(ps.type),
							isOptional: isOptional(last),
							isMutable: isMutable(last),
							...fromASTAnnotations(last.context?.annotations)
						};
					}),
					indexSignatures: last.indexSignatures.map((is) => ({
						parameter: recur(is.parameter),
						type: recur(is.type)
					})),
					checks: fromASTChecks(last.checks),
					...annotations
				};
				case "Union": {
					const types = jsonReorder(last.types);
					return {
						_tag: last._tag,
						types: types.map((ast) => recur(ast)),
						mode: last.mode,
						...annotations
					};
				}
				case "Suspend": return {
					_tag: "Suspend",
					checks: [],
					thunk: recur(last.thunk()),
					...annotations
				};
			}
		}
		function fromASTChecks(checks) {
			if (!checks) return [];
			return checks.map(getCheck).filter((c) => c !== void 0);
			function getCheck(c) {
				switch (c._tag) {
					case "Filter": {
						const meta = c.annotations?.meta;
						if (meta) return {
							_tag: "Filter",
							meta: meta._tag === "isPropertyNames" ? {
								_tag: "isPropertyNames",
								propertyNames: recur(meta.propertyNames)
							} : meta,
							...fromASTAnnotations(c.annotations)
						};
						return;
					}
					case "FilterGroup": {
						const checks = fromASTChecks(c.checks);
						if (isArrayNonEmpty(checks)) return {
							_tag: "FilterGroup",
							checks,
							...fromASTAnnotations(c.annotations)
						};
					}
				}
			}
		}
	}
	/** @internal */
	var fromASTBlacklist = /*#__PURE__*/ new Set([
		"~structural",
		"~sentinels",
		"meta",
		"arbitrary",
		"toArbitrary",
		"toEquivalence",
		"toFormatter",
		"toCodec",
		"toCodecJson",
		"toCodecIso",
		ClassTypeId
	]);
	var standardJsonSchemaAnnotationKeys = /*#__PURE__*/ new Set([
		"title",
		"description",
		"default",
		"examples",
		"readOnly",
		"writeOnly",
		"format",
		"contentEncoding",
		"contentMediaType",
		"contentSchema"
	]);
	function fromASTAnnotations(annotations) {
		if (annotations !== void 0) {
			const filtered = filter(annotations, (_, k) => !fromASTBlacklist.has(k));
			if (!isEmptyRecord(filtered)) return { annotations: filtered };
		}
	}
	/** @internal */
	function toJsonSchemaDocument$1(document, options) {
		const { definitions, dialect: source, schemas } = toJsonSchemaMultiDocument({
			representations: [document.representation],
			references: document.references
		}, options);
		return {
			dialect: source,
			schema: schemas[0],
			definitions
		};
	}
	/** @internal */
	function toJsonSchemaMultiDocument(multiDocument, options) {
		const generateDescriptions = options?.generateDescriptions ?? false;
		const additionalProperties = options?.additionalProperties ?? false;
		const includeAnnotationKey = options?.includeAnnotationKey;
		const definitions = map$4(multiDocument.references, (d) => recur(d));
		return {
			dialect: "draft-2020-12",
			schemas: map$3(multiDocument.representations, (s) => recur(s)),
			definitions
		};
		function recur(s) {
			let js = on(s);
			if ("annotations" in s) {
				const a = collectJsonSchemaAnnotations(s.annotations);
				if (a) js = {
					...js,
					...a
				};
			}
			if ("checks" in s) {
				const checks = collectJsonSchemaChecks(s.checks, js.type);
				for (const check of checks) js = appendJsonSchema(js, check);
			}
			return js;
		}
		function on(schema) {
			switch (schema._tag) {
				case "Any":
				case "Unknown": return {};
				case "ObjectKeyword": return { anyOf: [{ type: "object" }, { type: "array" }] };
				case "Void":
				case "Undefined": return { type: "null" };
				case "BigInt": return {
					"type": "string",
					"allOf": [{ "pattern": "^-?\\d+$" }]
				};
				case "Symbol":
				case "UniqueSymbol": return {
					"type": "string",
					"allOf": [{ "pattern": "^Symbol\\((.*)\\)$" }]
				};
				case "Declaration": return recur(schema.encodedSchema);
				case "Suspend": return recur(schema.thunk);
				case "Reference": return { $ref: `#/$defs/${escapeToken(schema.$ref)}` };
				case "Null": return { type: "null" };
				case "Never": return { not: {} };
				case "String": {
					const out = { type: "string" };
					if (schema.contentMediaType !== void 0) out.contentMediaType = schema.contentMediaType;
					if (schema.contentSchema !== void 0) out.contentSchema = recur(schema.contentSchema);
					return out;
				}
				case "Number": return hasCheck(schema.checks, "isInt") ? { type: "integer" } : hasCheck(schema.checks, "isFinite") ? { type: "number" } : { "anyOf": [
					{ type: "number" },
					{
						type: "string",
						enum: ["NaN"]
					},
					{
						type: "string",
						enum: ["Infinity"]
					},
					{
						type: "string",
						enum: ["-Infinity"]
					}
				] };
				case "Boolean": return { type: "boolean" };
				case "Literal": {
					const literal = schema.literal;
					if (typeof literal === "string") return {
						type: "string",
						enum: [literal]
					};
					if (typeof literal === "number") return {
						type: "number",
						enum: [literal]
					};
					if (typeof literal === "boolean") return {
						type: "boolean",
						enum: [literal]
					};
					return {
						type: "string",
						enum: [String(literal)]
					};
				}
				case "Enum": return recur({
					_tag: "Union",
					types: schema.enums.map(([title, value]) => ({
						_tag: "Literal",
						literal: value,
						annotations: { title }
					})),
					mode: "anyOf",
					annotations: schema.annotations
				});
				case "TemplateLiteral": return {
					type: "string",
					pattern: `^${schema.parts.map(getPartPattern).join("")}$`
				};
				case "Arrays": {
					if (schema.rest.length > 1) throw new globalThis.Error("Generating a JSON Schema for post-rest elements is not supported");
					const out = { type: "array" };
					let minItems = schema.elements.length;
					const prefixItems = schema.elements.map((e) => {
						if (e.isOptional) minItems--;
						const v = recur(e.type);
						const a = collectJsonSchemaAnnotations(e.annotations);
						return a ? appendJsonSchema(v, a) : v;
					});
					if (prefixItems.length > 0) {
						out.prefixItems = prefixItems;
						out.maxItems = schema.elements.length;
						if (minItems > 0) out.minItems = minItems;
					} else out.items = false;
					if (schema.rest.length > 0) {
						delete out.maxItems;
						const rest = recur(schema.rest[0]);
						if (Object.keys(rest).length > 0) out.items = rest;
						else delete out.items;
					}
					return out;
				}
				case "Objects": {
					if (schema.propertySignatures.length === 0 && schema.indexSignatures.length === 0) return { anyOf: [{ type: "object" }, { type: "array" }] };
					const out = { type: "object" };
					const properties = {};
					const required = [];
					for (const ps of schema.propertySignatures) {
						const name = ps.name;
						if (typeof name !== "string") throw new globalThis.Error(`Unsupported property signature name: ${format$1(name)}`);
						const v = recur(ps.type);
						const a = collectJsonSchemaAnnotations(ps.annotations);
						properties[name] = a ? appendJsonSchema(v, a) : v;
						if (!ps.isOptional) required.push(name);
					}
					if (Object.keys(properties).length > 0) out.properties = properties;
					if (required.length > 0) out.required = required;
					out.additionalProperties = additionalProperties;
					const patternProperties = {};
					for (const is of schema.indexSignatures) {
						let type = recur(is.type);
						if (Object.keys(type).length === 1 && "not" in type) type = false;
						const patterns = getParameterPatterns(is.parameter);
						if (patterns.length > 0) for (const pattern of patterns) patternProperties[pattern] = type;
						else out.additionalProperties = type;
					}
					if (Object.keys(patternProperties).length > 0) {
						out.patternProperties = patternProperties;
						delete out.additionalProperties;
					}
					if (isObject(out.additionalProperties) && isEmptyRecord(out.additionalProperties)) delete out.additionalProperties;
					return out;
				}
				case "Union": {
					const types = schema.types.map(recur);
					if (types.length === 0) return { not: {} };
					if (types.length > 1) {
						const compacted = compactEnums(types);
						if (compacted) return compacted;
					}
					return schema.mode === "anyOf" ? { anyOf: types } : { oneOf: types };
				}
			}
		}
		function compactEnums(types) {
			let sharedType;
			const values = [];
			for (const t of types) {
				if (Object.keys(t).length !== 2 || t.type === void 0 || !Array.isArray(t.enum) || t.enum.length === 0) return;
				if (sharedType === void 0) sharedType = t.type;
				else if (t.type !== sharedType) return;
				for (const v of t.enum) values.push(v);
			}
			return {
				type: sharedType,
				enum: values
			};
		}
		function collectJsonSchemaAnnotations(annotations) {
			if (annotations === void 0) return void 0;
			const out = {};
			if (typeof annotations.title === "string") out.title = annotations.title;
			if (typeof annotations.description === "string") out.description = annotations.description;
			else if (generateDescriptions && typeof annotations.expected === "string") out.description = annotations.expected;
			if (annotations.default !== void 0) out.default = annotations.default;
			if (Array.isArray(annotations.examples)) out.examples = annotations.examples;
			if (typeof annotations.readOnly === "boolean") out.readOnly = annotations.readOnly;
			if (typeof annotations.writeOnly === "boolean") out.writeOnly = annotations.writeOnly;
			if (typeof annotations.format === "string") out.format = annotations.format;
			if (typeof annotations.contentEncoding === "string") out.contentEncoding = annotations.contentEncoding;
			if (typeof annotations.contentMediaType === "string") out.contentMediaType = annotations.contentMediaType;
			if (includeAnnotationKey) for (const [key, value] of Object.entries(annotations)) {
				if (value === void 0) continue;
				if (standardJsonSchemaAnnotationKeys.has(key)) continue;
				if (!includeAnnotationKey(key)) continue;
				out[key] = value;
			}
			if (Object.keys(out).length > 0) return out;
		}
		function collectJsonSchemaChecks(checks, type) {
			return checks.map(collectJsonSchemaCheck).filter((c) => c !== void 0);
			function collectJsonSchemaCheck(check) {
				switch (check._tag) {
					case "Filter": return filterToJsonSchema(check, type);
					case "FilterGroup": {
						const checks = check.checks.map(collectJsonSchemaCheck).filter((c) => c !== void 0);
						if (checks.length === 0) return void 0;
						let out = { allOf: checks };
						const a = collectJsonSchemaAnnotations(check.annotations);
						if (a) out = {
							...out,
							...a
						};
						return out;
					}
				}
			}
		}
		function filterToJsonSchema(filter, type) {
			const meta = filter.meta;
			if (!meta) return void 0;
			let out = on(meta);
			const a = collectJsonSchemaAnnotations(filter.annotations);
			if (a) out = {
				...out,
				...a
			};
			return out;
			function on(meta) {
				switch (meta._tag) {
					case "isMinLength": return type === "array" ? { minItems: meta.minLength } : { minLength: meta.minLength };
					case "isMaxLength": return type === "array" ? { maxItems: meta.maxLength } : { maxLength: meta.maxLength };
					case "isLengthBetween": return type === "array" ? { allOf: [{ minItems: meta.minimum }, { maxItems: meta.maximum }] } : { allOf: [{ minLength: meta.minimum }, { maxLength: meta.maximum }] };
					case "isPattern":
					case "isGUID":
					case "isULID":
					case "isBase64":
					case "isBase64Url":
					case "isStartsWith":
					case "isEndsWith":
					case "isIncludes":
					case "isUppercased":
					case "isLowercased":
					case "isCapitalized":
					case "isUncapitalized":
					case "isTrimmed":
					case "isStringFinite":
					case "isStringBigInt":
					case "isStringSymbol": return { pattern: meta.regExp.source };
					case "isUUID": return {
						pattern: meta.regExp.source,
						format: "uuid"
					};
					case "isFinite":
					case "isInt": return;
					case "isMultipleOf": return { multipleOf: meta.divisor };
					case "isGreaterThanOrEqualTo": return { minimum: meta.minimum };
					case "isLessThanOrEqualTo": return { maximum: meta.maximum };
					case "isGreaterThan": return { exclusiveMinimum: meta.exclusiveMinimum };
					case "isLessThan": return { exclusiveMaximum: meta.exclusiveMaximum };
					case "isBetween": return {
						[meta.exclusiveMinimum ? "exclusiveMinimum" : "minimum"]: meta.minimum,
						[meta.exclusiveMaximum ? "exclusiveMaximum" : "maximum"]: meta.maximum
					};
					case "isUnique": return { uniqueItems: true };
					case "isMinProperties": return { minProperties: meta.minProperties };
					case "isMaxProperties": return { maxProperties: meta.maxProperties };
					case "isPropertiesLengthBetween": return {
						minProperties: meta.minimum,
						maxProperties: meta.maximum
					};
					case "isPropertyNames": return { propertyNames: recur(meta.propertyNames) };
					case "isDateValid": return { format: "date-time" };
				}
			}
		}
		function getParameterPatterns(parameter) {
			switch (parameter._tag) {
				default: throw new globalThis.Error(`Unsupported index signature parameter: ${parameter._tag}`);
				case "Reference": return getParameterPatterns(multiDocument.references[parameter.$ref]);
				case "String": return getPatterns(parameter);
				case "TemplateLiteral": return [`^${parameter.parts.map(getPartPattern).join("")}$`];
				case "Union": return parameter.types.flatMap(getParameterPatterns);
			}
		}
	}
	function getPatterns(s) {
		return recur(s.checks);
		function recur(checks) {
			return checks.flatMap((c) => {
				switch (c._tag) {
					case "Filter":
						if ("regExp" in c.meta) return [c.meta.regExp.source];
						return [];
					case "FilterGroup": return recur(c.checks);
				}
			});
		}
	}
	function hasCheck(checks, tag) {
		return checks.some((c) => {
			switch (c._tag) {
				case "Filter": return c.meta._tag === tag;
				case "FilterGroup": return hasCheck(c.checks, tag);
			}
		});
	}
	function appendJsonSchema(a, b) {
		if (Object.keys(a).length === 0) return b;
		const len = Object.keys(b).length;
		if (len === 0) return a;
		const members = Array.isArray(b.allOf) && len === 1 ? b.allOf : [b];
		if (Array.isArray(a.allOf)) return {
			...a,
			allOf: [...a.allOf, ...members]
		};
		if (typeof a.$ref === "string") return { allOf: [a, ...members] };
		return {
			...a,
			allOf: members
		};
	}
	function getPartPattern(part) {
		switch (part._tag) {
			case "Literal": return escape(globalThis.String(part.literal));
			case "String": return STRING_PATTERN;
			case "Number": return FINITE_PATTERN;
			case "TemplateLiteral": return part.parts.map(getPartPattern).join("");
			case "Union": return part.types.map(getPartPattern).join("|");
			default: throw new globalThis.Error("Unsupported part", { cause: part });
		}
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Schema.js
	var TypeId = TypeId$1;
	/**
	* Adds metadata annotations to a schema without changing its runtime behavior.
	* This is the pipeable (curried) counterpart of the `.annotate` method.
	*
	* **Details**
	*
	* Annotations provide extra context used by documentation generators, JSON
	* Schema converters, error formatters, and other tooling. Common keys include
	* `title`, `description`, `examples`, `message`, and `identifier`.
	*
	* **Example** (Adding a title and description)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const Age = Schema.Number.pipe(
	*   Schema.annotate({
	*     title: "Age",
	*     description: "A non-negative integer representing age in years"
	*   })
	* )
	* ```
	*
	* @see {@link annotateEncoded} to annotate the encoded side instead.
	*
	* @category annotations
	* @since 4.0.0
	*/
	function annotate(annotations) {
		return (self) => self.annotate(annotations);
	}
	/**
	* Creates a type guard function that checks if a value conforms to a given
	* schema.
	*
	* **Details**
	*
	* This function returns a predicate that performs a type-safe check, narrowing
	* the type of the input value if the check passes. The predicate returns `false`
	* for schema mismatches.
	*
	* **Gotchas**
	*
	* Only causes made entirely of schema issues are converted to `false`. Causes
	* that contain defects, interruptions, or other non-schema reasons throw
	* instead.
	*
	* **Example** (Defining a basic type guard)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const isString = Schema.is(Schema.String)
	*
	* console.log(isString("hello")) // true
	* console.log(isString(42)) // false
	*
	* // Type narrowing in action
	* const value: unknown = "hello"
	* if (isString(value)) {
	*   // value is now typed as string
	*   console.log(value.toUpperCase()) // "HELLO"
	* }
	* ```
	*
	* @category guards
	* @since 3.10.0
	*/
	var is = is$1;
	/**
	* Decodes an `unknown` input against a schema, returning an `Effect` that
	* succeeds with the decoded value or fails with a {@link SchemaError}.
	*
	* **When to use**
	*
	* Use when you need to decode unknown input in an `Effect` whose failure
	* channel is `SchemaError`.
	*
	* **Details**
	*
	* Prefer {@link decodeEffect} when the input is already typed as the schema's
	* `Encoded` type.
	* Options may be provided either when creating the decoder or when applying it;
	* application options override creation options.
	*
	* @see {@link SchemaParser.decodeUnknownEffect} for the adapter that fails with `SchemaIssue.Issue` directly
	*
	* @category decoding
	* @since 4.0.0
	*/
	function decodeUnknownEffect(schema, options) {
		const parser = decodeUnknownEffect$1(schema, options);
		return (input, options) => {
			return fromIssueEffect(parser(input, options));
		};
	}
	/**
	* Decodes an `unknown` input against a schema, returning a `Result` that
	* succeeds with the decoded value or fails with a {@link SchemaError} for schema
	* mismatches.
	*
	* **When to use**
	*
	* Use when you do not know the input type statically and want schema mismatches
	* returned as `Result.fail` with `SchemaError`.
	*
	* **Details**
	*
	* For input already typed as the schema's `Encoded` type use
	* {@link decodeResult}.
	* Options may be provided either when creating the decoder or when applying it;
	* application options override creation options.
	* Schema mismatches are returned as `Result.fail` with `SchemaError`.
	*
	* **Gotchas**
	*
	* Only causes made entirely of schema issues are returned as `Result.fail`.
	* Causes that contain defects, interruptions, or other non-schema reasons throw
	* instead.
	*
	* @see {@link SchemaParser.decodeUnknownResult} for the adapter that fails with `SchemaIssue.Issue` directly
	*
	* @category decoding
	* @since 4.0.0
	*/
	function decodeUnknownResult(schema, options) {
		const parser = decodeUnknownResult$1(schema, options);
		return (input, options) => {
			return mapError$2(parser(input, options), (issue) => new SchemaError(issue));
		};
	}
	/**
	* Creates a schema from an AST (Abstract Syntax Tree) node.
	*
	* **Details**
	*
	* This is the fundamental constructor for all schemas in the Effect Schema
	* library. It takes an AST node and wraps it in a fully-typed schema that
	* preserves all type information and provides the complete schema API.
	*
	* The `make` function is used internally to create all primitive schemas like
	* `String`, `Number`, `Boolean`, etc., as well as more complex schemas. It's
	* the bridge between the untyped AST representation and the strongly-typed
	* schema.
	*
	* @category constructors
	* @since 3.10.0
	*/
	var make = make$1;
	/**
	* Checks whether a value is a `Schema`.
	*
	* @category guards
	* @since 3.10.0
	*/
	function isSchema(u) {
		return hasProperty(u, TypeId) && u[TypeId] === TypeId;
	}
	/**
	* Creates an exact optional key schema for struct fields. Unlike `optional`,
	* this creates exact optional properties (not `| undefined`) that can be
	* completely omitted from the object.
	*
	* **Example** (Creating a struct with optional key)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Struct({
	*   name: Schema.String,
	*   age: Schema.optionalKey(Schema.Number)
	* })
	*
	* // Type: { readonly name: string; readonly age?: number }
	* type Person = typeof schema["Type"]
	* ```
	*
	* @category combinators
	* @since 4.0.0
	*/
	var optionalKey = /*#__PURE__*/ lambda((schema) => make(optionalKey$1(schema.ast), { schema }));
	/**
	* Creates a schema for a single literal value (string, number, bigint, boolean, or null).
	*
	* **Example** (Defining a string literal)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Literal("hello")
	* // Type: Schema.Literal<"hello">
	* ```
	*
	* @see {@link Literals} for a schema that represents a union of literals.
	* @see {@link tag} for a schema that represents a literal value that can be
	* used as a discriminator field in tagged unions and has a constructor default.
	* @category constructors
	* @since 3.10.0
	*/
	function Literal(literal) {
		const out = make(new Literal$1(literal), {
			literal,
			transform(to) {
				return out.pipe(decodeTo(Literal(to), {
					decode: transform$1(() => to),
					encode: transform$1(() => literal)
				}));
			}
		});
		return out;
	}
	/**
	* Schema for the `never` type. Always fails validation — no value satisfies it.
	*
	* @category schemas
	* @since 3.10.0
	*/
	var Never = /*#__PURE__*/ make(never);
	/**
	* Schema for the `unknown` type. Accepts any value without validation.
	*
	* **When to use**
	*
	* Use as a top schema when you need to accept any input while preserving
	* TypeScript's `unknown` safety at use sites.
	*
	* @see {@link Any} for the `any` variant.
	* @category schemas
	* @since 3.10.0
	*/
	var Unknown = /*#__PURE__*/ make(unknown);
	/**
	* Schema for the `null` literal. Validates that the input is strictly `null`.
	*
	* @see {@link NullOr} for a union with another schema.
	* @category schemas
	* @since 3.10.0
	*/
	var Null = /*#__PURE__*/ make(null_);
	/**
	* Schema for `string` values. Validates that the input is `typeof` `"string"`.
	*
	* @category schemas
	* @since 4.0.0
	*/
	var String$1 = /*#__PURE__*/ make(string);
	/**
	* Schema for `number` values, including `NaN`, `Infinity`, and `-Infinity`.
	*
	* **Details**
	*
	* Default JSON serializer:
	*
	* - Finite numbers are serialized as numbers.
	* - Non-finite values are serialized as strings (`"NaN"`, `"Infinity"`, `"-Infinity"`).
	*
	* @see {@link Finite} for a schema that excludes non-finite values.
	* @category schemas
	* @since 4.0.0
	*/
	var Number$1 = /*#__PURE__*/ make(number);
	/**
	* Schema for `boolean` values. Validates that the input is `typeof` `"boolean"`.
	*
	* **When to use**
	*
	* Use to validate values that are already JavaScript booleans.
	*
	* @see {@link BooleanFromBit} for a schema that decodes bit literals `0` or `1` into a boolean
	*
	* @category boolean
	* @since 4.0.0
	*/
	var Boolean$1 = /*#__PURE__*/ make(boolean);
	function makeStruct(ast, fields) {
		return make(ast, {
			fields,
			mapFields(f, options) {
				const fields = f(this.fields);
				return makeStruct(struct(fields, options?.unsafePreserveChecks ? this.ast.checks : void 0), fields);
			}
		});
	}
	/**
	* Defines a struct schema from a map of field schemas.
	*
	* **Details**
	*
	* Each field value is a schema. Use {@link optionalKey} or {@link optional} to
	* mark fields as optional, and {@link mutableKey} to mark them as mutable.
	*
	* The resulting schema's `Type` is a readonly object type with the fields'
	* decoded types. The `Encoded` form mirrors the field schemas' encoded types.
	*
	* **Example** (Defining a basic struct)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const Person = Schema.Struct({
	*   name: Schema.String,
	*   age: Schema.Number,
	*   email: Schema.optionalKey(Schema.String)
	* })
	*
	* // { readonly name: string; readonly age: number; readonly email?: string }
	* type Person = typeof Person.Type
	*
	* const alice = Schema.decodeUnknownSync(Person)({ name: "Alice", age: 30 })
	* console.log(alice)
	* // { name: 'Alice', age: 30 }
	* ```
	*
	* @category constructors
	* @since 3.10.0
	*/
	function Struct(fields) {
		return makeStruct(struct(fields, void 0), fields);
	}
	/**
	* Defines a record schema whose dynamic properties are selected by a key schema
	* and decoded with a value schema.
	*
	* **Details**
	*
	* For dynamic keys, the key schema selects matching own properties and the
	* value schema decodes or encodes only those selected properties. Checks on
	* string, number, symbol, and template literal key schemas narrow which
	* properties are selected.
	*
	* For transformed key schemas, property selection is based on encoded property
	* names before the selected key is decoded.
	*
	* **Example** (Defining a string-keyed record of numbers)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Record(Schema.String, Schema.Number)
	*
	* // { readonly [x: string]: number }
	* type R = typeof schema.Type
	*
	* const result = Schema.decodeUnknownSync(schema)({ a: 1, b: 2 })
	* console.log(result)
	* // { a: 1, b: 2 }
	* ```
	*
	* @category constructors
	* @since 3.10.0
	*/
	function Record(key, value, options) {
		const keyValueCombiner = options?.keyValueCombiner?.decode || options?.keyValueCombiner?.encode ? new KeyValueCombiner(options.keyValueCombiner.decode, options.keyValueCombiner.encode) : void 0;
		return make(record(key.ast, value.ast, keyValueCombiner), {
			key,
			value
		});
	}
	function makeTuple(ast, elements) {
		return make(ast, {
			elements,
			mapElements(f, options) {
				const elements = f(this.elements);
				return makeTuple(tuple(elements, options?.unsafePreserveChecks ? this.ast.checks : void 0), elements);
			}
		});
	}
	/**
	* @category constructors
	* @since 4.0.0
	*/
	var ArraySchema = /*#__PURE__*/ lambda((schema) => make(new Arrays(false, [], [schema.ast]), { value: schema }));
	function makeUnion(ast, members) {
		return make(ast, {
			members,
			mapMembers(f, options) {
				const members = f(this.members);
				return makeUnion(union(members, this.ast.mode, options?.unsafePreserveChecks ? this.ast.checks : void 0), members);
			}
		});
	}
	/**
	* Creates a union schema from an array of member schemas. Members are tested in
	* order; the first match is returned.
	*
	* **Details**
	*
	* Optionally, specify `mode`:
	* - `"anyOf"` (default) — matches if any member matches.
	* - `"oneOf"` — matches if exactly one member matches.
	*
	* **Example** (Defining a string or number union)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Union([Schema.String, Schema.Number])
	*
	* Schema.decodeUnknownSync(schema)("hello") // "hello"
	* Schema.decodeUnknownSync(schema)(42)       // 42
	* ```
	*
	* @category constructors
	* @since 3.10.0
	*/
	function Union(members, options) {
		return makeUnion(union(members, options?.mode ?? "anyOf", void 0), members);
	}
	/**
	* Creates a union schema from an array of literal values.
	*
	* **Example** (Defining status codes)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Literals(["active", "inactive", "pending"])
	* // accepts "active", "inactive", or "pending"
	* ```
	*
	* @see {@link Literal} for a schema that represents a single literal.
	* @category constructors
	* @since 4.0.0
	*/
	function Literals(literals) {
		const members = literals.map(Literal);
		return make(union(members, "anyOf", void 0), {
			literals,
			members,
			mapMembers(f) {
				return Union(f(this.members));
			},
			pick(literals) {
				return Literals(literals);
			},
			transform(to) {
				return Union(members.map((member, index) => member.transform(to[index])));
			}
		});
	}
	/**
	* Creates a union schema of `S | null`.
	*
	* @category constructors
	* @since 3.10.0
	*/
	var NullOr = /*#__PURE__*/ lambda((self) => Union([self, Null]));
	/**
	* Creates a suspended schema that defers evaluation until needed. This is
	* essential for creating recursive schemas where a schema references itself,
	* preventing infinite recursion during schema definition.
	*
	* **Example** (Defining recursive tree schemas)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* interface Tree {
	*   readonly value: number
	*   readonly children: ReadonlyArray<Tree>
	* }
	*
	* const Tree = Schema.Struct({
	*   value: Schema.Number,
	*   children: Schema.Array(Schema.suspend((): Schema.Codec<Tree> => Tree))
	* })
	* ```
	*
	* @category constructors
	* @since 3.10.0
	*/
	function suspend(f) {
		return make(new Suspend(() => f().ast));
	}
	function decodeTo(to, transformation) {
		return (from) => {
			return make(decodeTo$1(from.ast, to.ast, transformation ? make$4(transformation) : passthrough()), {
				from,
				to
			});
		};
	}
	/**
	* Attaches a constructor default value to a schema field.
	*
	* **Details**
	*
	* Constructor defaults are applied only during `make*`, not during decoding or
	* encoding.
	*
	* **Example** (Defining an optional field with a static default)
	*
	* ```ts
	* import { Effect, Schema } from "effect"
	*
	* const MySchema = Schema.Struct({
	*   name: Schema.String.pipe(
	*     Schema.optionalKey,
	*     Schema.withConstructorDefault(Effect.succeed("anonymous"))
	*   )
	* })
	*
	* const value = MySchema.make({})
	* // value: { name: "anonymous" }
	* ```
	*
	* @category constructors
	* @since 3.10.0
	*/
	function withConstructorDefault(defaultValue) {
		return (schema) => make(withConstructorDefault$1(schema.ast, toIssueEffect(defaultValue)), { schema });
	}
	function toIssueEffect(self) {
		return catchCause(self, (cause) => failCauseSync(() => map$1(cause, (error) => error.issue)));
	}
	/**
	* Combines a {@link Literal} schema with {@link withConstructorDefault}, making it ideal
	* for discriminator fields in tagged unions. When constructing via `make`, the
	* `_tag` field can be omitted and will be filled automatically.
	*
	* **Example** (Defining a discriminated union tag)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const A = Schema.Struct({ _tag: Schema.tag("A"), value: Schema.Number })
	*
	* // _tag is optional in make, auto-filled to "A"
	* const a = A.make({ value: 42 })
	* // a: { _tag: "A", value: 42 }
	* ```
	*
	* @see {@link tagDefaultOmit} to also omit the tag during encoding
	* @see {@link TaggedStruct} for a shorthand that adds `_tag` automatically
	* @category constructors
	* @since 3.10.0
	*/
	function tag(literal) {
		return Literal(literal).pipe(withConstructorDefault(succeed(literal)));
	}
	/**
	* Creates a struct schema with an automatically populated `_tag` field.
	*
	* **When to use**
	*
	* Use to define a tagged union case from a literal tag and a set of fields.
	*
	* **Details**
	*
	* When using the `make` method, the `_tag` field is optional and will be
	* added automatically. However, when decoding or encoding, the `_tag` field
	* must be present in the input.
	*
	* **Example** (Defining a tagged struct shorthand)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* // Defines a struct with a fixed `_tag` field
	* const tagged = Schema.TaggedStruct("A", {
	*   a: Schema.String
	* })
	*
	* // This is the same as writing:
	* const equivalent = Schema.Struct({
	*   _tag: Schema.tag("A"),
	*   a: Schema.String
	* })
	* ```
	*
	* **Example** (Accessing the literal value of the tag)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const tagged = Schema.TaggedStruct("A", {
	*   a: Schema.String
	* })
	*
	* // literal: "A"
	* const literal = tagged.fields._tag.schema.literal
	* ```
	*
	* @category constructors
	* @since 3.10.0
	*/
	function TaggedStruct(value, fields) {
		return Struct({
			_tag: tag(value),
			...fields
		});
	}
	/**
	* Creates a custom validation filter from a predicate function.
	*
	* **Details**
	*
	* The predicate receives the decoded input value, the schema AST, and parse
	* options, and returns a `FilterOutput`. Non-success outputs are normalized into
	* schema issues. The `annotations` parameter annotates the filter itself; with
	* the default formatter, failures use `message` first, `expected` second, and
	* `<filter>` when neither is provided.
	*
	* When `abort` is `true`, parsing stops after this filter fails instead of
	* collecting later check failures.
	*
	* **Example** (Reporting failure at a nested path)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Struct({ password: Schema.String, confirmPassword: Schema.String }).check(
	*   Schema.makeFilter((o) =>
	*     o.password === o.confirmPassword
	*       ? undefined
	*       : { path: ["password"], issue: "password and confirmPassword must match" }
	*   )
	* )
	*
	* console.log(String(Schema.decodeUnknownExit(schema)({ password: "123456", confirmPassword: "1234567" })))
	* // Failure(Cause([Fail(SchemaError: password and confirmPassword must match
	* //   at ["password"])]))
	* ```
	*
	* **Example** (Reporting multiple failures at once)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Struct({ a: Schema.Finite, b: Schema.Finite, c: Schema.Finite }).check(
	*   Schema.makeFilter((o) => {
	*     const issues: Array<Schema.FilterIssue> = []
	*     if (o.a > 0) {
	*       if (o.b <= 0) issues.push({ path: ["b"], issue: "b must be greater than 0" })
	*       if (o.c <= 0) issues.push({ path: ["c"], issue: "c must be greater than 0" })
	*     }
	*     return issues
	*   })
	* )
	*
	* console.log(String(Schema.decodeUnknownExit(schema)({ a: 1, b: 0, c: 0 })))
	* // Failure(Cause([Fail(SchemaError: b must be greater than 0
	* //   at ["b"]
	* // c must be greater than 0
	* //   at ["c"])]))
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var makeFilter = makeFilter$1;
	/**
	* Validates that a string matches the specified regular expression pattern.
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `pattern` constraint in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies a `patterns`
	* constraint to ensure generated strings match the specified RegExp pattern.
	*
	* @category String checks
	* @since 4.0.0
	*/
	var isPattern = isPattern$1;
	/**
	* Returns a RegExp for validating an RFC 9562 / RFC 4122 UUID.
	*
	* Optionally specify a version 1-8. If no version is specified (`undefined`), all versions are supported.
	*/
	var getUUIDRegExp = (version) => {
		if (version) return new globalThis.RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|[fF]{8}-[fF]{4}-[fF]{4}-[fF]{4}-[fF]{12})$/;
	};
	/**
	* Validates that a string is a strict Universally Unique Identifier (UUID).
	*
	* **When to use**
	*
	* Use when you need UUID semantics, including version and RFC variant bits,
	* rather than only the dashed hexadecimal shape.
	*
	* **Details**
	*
	* Without a version argument, this accepts UUID versions 1 through 8, the nil
	* UUID (`00000000-0000-0000-0000-000000000000`), and the max UUID
	* (`ffffffff-ffff-ffff-ffff-ffffffffffff`). With a version argument, this
	* accepts only UUIDs with that version and RFC variant bits; nil and max UUIDs
	* are not versioned UUIDs and do not match version-specific checks.
	*
	* JSON Schema:
	*
	* This check corresponds to a `pattern` constraint in JSON Schema that matches
	* UUID format, and includes a `format: "uuid"` annotation.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies a `patterns`
	* constraint to ensure generated strings match the UUID pattern.
	*
	* @see {@link isGUID} for shape-only GUID validation.
	* @category String checks
	* @since 4.0.0
	*/
	function isUUID(version, annotations) {
		const regExp = getUUIDRegExp(version);
		return isPattern(regExp, {
			expected: version ? `a UUID v${version}` : "a UUID",
			meta: {
				_tag: "isUUID",
				regExp,
				version
			},
			...annotations
		});
	}
	/**
	* Validates that a number is finite (not `Infinity`, `-Infinity`, or `NaN`).
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check does not have a direct JSON Schema equivalent, but ensures the
	* number is valid and finite.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies `noNaN: true` and
	* `noInfinity: true` constraints to ensure generated numbers are finite.
	*
	* @category Number checks
	* @since 4.0.0
	*/
	function isFinite(annotations) {
		return makeFilter((n) => globalThis.Number.isFinite(n), {
			expected: "a finite number",
			meta: { _tag: "isFinite" },
			arbitrary: { constraint: {
				noInfinity: true,
				noNaN: true
			} },
			...annotations
		});
	}
	/**
	* Creates a greater-than (`>`) check for any ordered type from an
	* `Order.Order` instance.
	*
	* @category Order checks
	* @since 4.0.0
	*/
	function makeIsGreaterThan(options) {
		const gt = isGreaterThan$1(options.order);
		const formatter = options.formatter ?? format$1;
		return (exclusiveMinimum, annotations) => {
			return makeFilter((input) => gt(input, exclusiveMinimum), {
				expected: `a value greater than ${formatter(exclusiveMinimum)}`,
				arbitrary: { constraint: { ordered: {
					order: options.order,
					minimum: exclusiveMinimum,
					exclusiveMinimum: true
				} } },
				...options.annotate?.(exclusiveMinimum),
				...annotations
			});
		};
	}
	/**
	* Creates a greater-than-or-equal-to (`>=`) check for any ordered type from an
	* `Order.Order` instance.
	*
	* @category Order checks
	* @since 4.0.0
	*/
	function makeIsGreaterThanOrEqualTo(options) {
		const gte = isGreaterThanOrEqualTo$1(options.order);
		const formatter = options.formatter ?? format$1;
		return (minimum, annotations) => {
			return makeFilter((input) => gte(input, minimum), {
				expected: `a value greater than or equal to ${formatter(minimum)}`,
				arbitrary: { constraint: { ordered: {
					order: options.order,
					minimum
				} } },
				...options.annotate?.(minimum),
				...annotations
			});
		};
	}
	/**
	* Creates an inclusive or exclusive range check for any ordered type from an
	* `Order.Order` instance.
	*
	* @category Order checks
	* @since 4.0.0
	*/
	function makeIsBetween(deriveOptions) {
		const greaterThanOrEqualTo = isGreaterThanOrEqualTo$1(deriveOptions.order);
		const greaterThan = isGreaterThan$1(deriveOptions.order);
		const lessThanOrEqualTo = isLessThanOrEqualTo$1(deriveOptions.order);
		const lessThan = isLessThan$1(deriveOptions.order);
		const formatter = deriveOptions.formatter ?? format$1;
		return (options, annotations) => {
			const gte = options.exclusiveMinimum ? greaterThan : greaterThanOrEqualTo;
			const lte = options.exclusiveMaximum ? lessThan : lessThanOrEqualTo;
			return makeFilter((input) => gte(input, options.minimum) && lte(input, options.maximum), {
				expected: `a value between ${formatter(options.minimum)}${options.exclusiveMinimum ? " (excluded)" : ""} and ${formatter(options.maximum)}${options.exclusiveMaximum ? " (excluded)" : ""}`,
				arbitrary: { constraint: { ordered: {
					order: deriveOptions.order,
					minimum: options.minimum,
					maximum: options.maximum,
					...options.exclusiveMinimum && { exclusiveMinimum: true },
					...options.exclusiveMaximum && { exclusiveMaximum: true }
				} } },
				...deriveOptions.annotate?.(options),
				...annotations
			});
		};
	}
	/**
	* Validates that a number is greater than the specified value (exclusive).
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `exclusiveMinimum` constraint in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies an
	* `exclusiveMinimum` constraint to ensure generated numbers are greater than
	* the specified value.
	*
	* @category Number checks
	* @since 4.0.0
	*/
	var isGreaterThan = /*#__PURE__*/ makeIsGreaterThan({
		order: Number$4,
		annotate: (exclusiveMinimum) => ({ meta: {
			_tag: "isGreaterThan",
			exclusiveMinimum
		} })
	});
	/**
	* Validates that a number is greater than or equal to the specified value
	* (inclusive).
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `minimum` constraint in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies a `minimum` constraint
	* to ensure generated numbers are greater than or equal to the specified value.
	*
	* @category Number checks
	* @since 4.0.0
	*/
	var isGreaterThanOrEqualTo = /*#__PURE__*/ makeIsGreaterThanOrEqualTo({
		order: Number$4,
		annotate: (minimum) => ({ meta: {
			_tag: "isGreaterThanOrEqualTo",
			minimum
		} })
	});
	/**
	* Validates that a number is within a specified range. The range boundaries can
	* be inclusive or exclusive based on the provided options.
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to `minimum`/`maximum` or `exclusiveMinimum`/`exclusiveMaximum`
	* constraints in JSON Schema, depending on the options provided.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies `minimum` and
	* `maximum` constraints with optional `exclusiveMinimum` and
	* `exclusiveMaximum` flags to ensure generated numbers fall within the
	* specified range.
	*
	* @category Number checks
	* @since 4.0.0
	*/
	var isBetween = /*#__PURE__*/ makeIsBetween({
		order: Number$4,
		annotate: (options) => {
			return { meta: {
				_tag: "isBetween",
				...options
			} };
		}
	});
	/**
	* Validates that a number is a safe integer (within the safe integer range
	* that can be exactly represented in JavaScript).
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `type: "integer"` constraint in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies an `integer: true`
	* constraint to ensure generated numbers are integers.
	*
	* @category Integer checks
	* @since 4.0.0
	*/
	function isInt(annotations) {
		return makeFilter((n) => globalThis.Number.isSafeInteger(n), {
			expected: "an integer",
			meta: { _tag: "isInt" },
			arbitrary: { constraint: { integer: true } },
			...annotations
		});
	}
	/**
	* Validates that a value has at least the specified length. Works with strings
	* and arrays.
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `minLength` constraint for strings or the
	* `minItems` constraint for arrays in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies a `minLength`
	* constraint to ensure generated strings or arrays have at least the required
	* length.
	*
	* **Example** (Checking minimum length)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const NonEmptyStringSchema = Schema.String.check(Schema.isMinLength(1))
	* const NonEmptyArraySchema = Schema.Array(Schema.Number).check(Schema.isMinLength(1))
	* ```
	*
	* @category Length checks
	* @since 4.0.0
	*/
	function isMinLength(minLength, annotations) {
		minLength = Math.max(0, Math.floor(minLength));
		return makeFilter((input) => input.length >= minLength, {
			expected: `a value with a length of at least ${minLength}`,
			meta: {
				_tag: "isMinLength",
				minLength
			},
			[STRUCTURAL_ANNOTATION_KEY]: true,
			arbitrary: { constraint: { minLength } },
			...annotations
		});
	}
	/**
	* Validates that a value has at least one element. Works with strings and arrays.
	* This is equivalent to `isMinLength(1)`.
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `minLength: 1` constraint for strings or the
	* `minItems: 1` constraint for arrays in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies a `minLength: 1`
	* constraint to ensure generated strings or arrays are non-empty.
	*
	* @category Length checks
	* @since 4.0.0
	*/
	function isNonEmpty(annotations) {
		return isMinLength(1, annotations);
	}
	/**
	* Validates that a value has at most the specified length. Works with strings
	* and arrays.
	*
	* **Details**
	*
	* JSON Schema:
	*
	* This check corresponds to the `maxLength` constraint for strings or the
	* `maxItems` constraint for arrays in JSON Schema.
	*
	* Arbitrary:
	*
	* When generating test data with fast-check, this applies a `maxLength`
	* constraint to ensure generated strings or arrays have at most the required
	* length.
	*
	* @category Length checks
	* @since 4.0.0
	*/
	function isMaxLength(maxLength, annotations) {
		maxLength = Math.max(0, Math.floor(maxLength));
		return makeFilter((input) => input.length <= maxLength, {
			expected: `a value with a length of at most ${maxLength}`,
			meta: {
				_tag: "isMaxLength",
				maxLength
			},
			[STRUCTURAL_ANNOTATION_KEY]: true,
			arbitrary: { constraint: { maxLength } },
			...annotations
		});
	}
	/**
	* Schema for non-empty strings. Validates that a string has at least one
	* character.
	*
	* @category string
	* @since 3.10.0
	*/
	var NonEmptyString = /*#__PURE__*/ String$1.check(/*#__PURE__*/ isNonEmpty());
	globalThis.RegExp;
	globalThis.URL;
	/**
	* Returns a schema that decodes a JSON string and then decodes the parsed value
	* using the given schema.
	*
	* **Details**
	*
	* This is useful when working with JSON-encoded strings where the actual
	* structure of the value is known and described by an existing schema.
	*
	* The resulting schema first parses the input string as JSON, and then runs the
	* provided schema on the parsed result.
	*
	* JSON Schema generation:
	*
	* When using `fromJsonString` with `draft-2020-12` or `openApi3.1`, the
	* resulting schema will be a JSON Schema with a `contentSchema` property that
	* contains the JSON Schema for the given schema.
	*
	* **Example** (Decoding JSON strings with a schema)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const schema = Schema.Struct({ a: Schema.Number })
	* const schemaFromJsonString = Schema.fromJsonString(schema)
	*
	* Schema.decodeUnknownSync(schemaFromJsonString)(`{"a":1,"b":2}`)
	* // => { a: 1 }
	* ```
	*
	* **Example** (Emitting JSON Schema for a JSON string decoder)
	*
	* ```ts
	* import { Schema } from "effect"
	*
	* const original = Schema.Struct({ a: Schema.String })
	* const schema = Schema.fromJsonString(original)
	*
	* const document = Schema.toJsonSchemaDocument(schema)
	*
	* console.log(JSON.stringify(document, null, 2))
	* // {
	* //   "source": "draft-2020-12",
	* //   "schema": {
	* //     "type": "string",
	* //     "contentMediaType": "application/json",
	* //     "contentSchema": {
	* //       "type": "object",
	* //       "properties": {
	* //         "a": {
	* //           "type": "string"
	* //         }
	* //       },
	* //       "required": [
	* //         "a"
	* //       ],
	* //       "additionalProperties": false
	* //     }
	* //   },
	* //   "definitions": {}
	* // }
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	function fromJsonString(schema) {
		const identifier = resolveIdentifier(schema.ast);
		return String$1.annotate({
			identifier: identifier === void 0 ? void 0 : `${identifier}JsonString`,
			expected: "a string that will be decoded as JSON",
			contentMediaType: "application/json",
			contentSchema: toEncoded(schema.ast)
		}).pipe(decodeTo(schema, fromJsonString$1));
	}
	globalThis.File;
	globalThis.FormData;
	globalThis.URLSearchParams;
	/**
	* Schema for finite numbers, rejecting `NaN`, `Infinity`, and `-Infinity`.
	*
	* @category Number
	* @since 3.10.0
	*/
	var Finite = /*#__PURE__*/ Number$1.check(/*#__PURE__*/ isFinite());
	/**
	* Schema for integers, rejecting `NaN`, `Infinity`, and `-Infinity`.
	*
	* @category Number
	* @since 3.10.0
	*/
	var Int = /*#__PURE__*/ Number$1.check(/*#__PURE__*/ isInt());
	globalThis.Uint8Array;
	/**
	* Derives an intermediate `SchemaRepresentation.Document` from a schema. This
	* document is used internally by {@link toJsonSchemaDocument} and related
	* functions to produce JSON Schema output.
	*
	* @category Representation
	* @since 4.0.0
	*/
	function toRepresentation(schema) {
		return fromAST(schema.ast);
	}
	/**
	* Returns a JSON Schema document using draft 2020-12.
	*
	* **Details**
	*
	* The `options` parameter controls generation details such as additional
	* properties and synthesized check descriptions; it does not change the draft
	* target.
	*
	* **Gotchas**
	*
	* JSON Schema generation is best-effort. Some Effect schema semantics cannot
	* be represented exactly in JSON Schema, and importing an emitted JSON Schema
	* may produce an equivalent approximation rather than the original schema
	* shape.
	*
	* @category converting
	* @since 4.0.0
	*/
	function toJsonSchemaDocument(schema, options) {
		const jd = toJsonSchemaDocument$1(toRepresentation(schema), options);
		return {
			dialect: "draft-2020-12",
			schema: jd.schema,
			definitions: jd.definitions
		};
	}
	//#endregion
	//#region ../../node_modules/.pnpm/effect@4.0.0-beta.98/node_modules/effect/dist/Ref.js
	/**
	* Stores fiber-safe mutable state inside Effect programs.
	*
	* A `Ref<A>` holds one value and exposes reads, writes, and atomic
	* transformations as effects, so state changes compose with Effect's
	* concurrency model. This module includes constructors, safe and unsafe reads,
	* set and get-and-set helpers, update and modify helpers, and conditional
	* update variants that leave the value unchanged when an `Option.none` result
	* is returned.
	*
	* @since 2.0.0
	*/
	var RefProto = {
		["~effect/Ref"]: { _A: identity },
		...PipeInspectableProto,
		toJSON() {
			return {
				_id: "Ref",
				ref: this.ref
			};
		}
	};
	/**
	* Creates a new Ref with the specified initial value (unsafe version).
	*
	* **When to use**
	*
	* Use when you need immediate synchronous construction and can guarantee
	* that creating the `Ref` outside of `Effect` is safe.
	*
	* **Gotchas**
	*
	* Prefer `Ref.make` for Effect-wrapped creation in Effect programs.
	*
	* **Example** (Creating a ref unsafely)
	*
	* ```ts
	* import { Ref } from "effect"
	*
	* // Create a ref directly without Effect
	* const counter = Ref.makeUnsafe(0)
	*
	* // Get the current value
	* const value = Ref.getUnsafe(counter)
	* console.log(value) // 0
	*
	* // Note: This is unsafe and should be used carefully
	* // Prefer Ref.make for Effect-wrapped creation
	* ```
	*
	* @category constructors
	* @since 4.0.0
	*/
	var makeUnsafe = (value) => {
		const self = Object.create(RefProto);
		self.ref = make$3(value);
		return self;
	};
	/**
	* Gets the current value of the Ref.
	*
	* **When to use**
	*
	* Use to read the current `Ref` value without changing it.
	*
	* **Example** (Getting the current value)
	*
	* ```ts
	* import { Effect, Ref } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   const ref = yield* Ref.make(42)
	*   const value = yield* Ref.get(ref)
	*   console.log(value) // 42
	* })
	* ```
	*
	* @see {@link set} for replacing the current value
	*
	* @category getters
	* @since 2.0.0
	*/
	var get = (self) => sync(() => self.ref.current);
	/**
	* Sets the value of the Ref to the specified value.
	*
	* **When to use**
	*
	* Use to replace the current `Ref` value with a known value.
	*
	* **Example** (Setting a value)
	*
	* ```ts
	* import { Effect, Ref } from "effect"
	*
	* const program = Effect.gen(function*() {
	*   const ref = yield* Ref.make(0)
	*   yield* Ref.set(ref, 42)
	*   const value = yield* Ref.get(ref)
	*   console.log(value) // 42
	* })
	*
	* // Using multiple operations
	* const program2 = Effect.gen(function*() {
	*   const ref = yield* Ref.make(0)
	*   yield* Ref.set(ref, 100)
	*   const value = yield* Ref.get(ref)
	*   console.log(value) // 100
	* })
	* ```
	*
	* @see {@link getAndSet} for setting while returning the previous value
	* @see {@link setAndGet} for setting while returning the new value
	*
	* @category setters
	* @since 2.0.0
	*/
	var set = /*#__PURE__*/ dual(2, (self, value) => sync(() => set$1(self.ref, value)));
	//#endregion
	//#region ../../protocols/companion-contracts/src/browser-companion.ts
	var BROWSER_COMPANION_CONTRACT = "dsh-chrome/browser-companion@2";
	Struct({
		contract: Literal(BROWSER_COMPANION_CONTRACT),
		directory: String$1,
		evidence: String$1
	});
	var BrowserCompanionExpectation = Struct({
		extensionId: NonEmptyString,
		displayVersion: NonEmptyString,
		protocolFingerprint: NonEmptyString
	});
	var BROWSER_COMPANION_PROBE_KIND = "dsh-chrome/browser-companion-probe";
	var BrowserCompanionProbeRequest = Struct({
		kind: Literal(BROWSER_COMPANION_PROBE_KIND),
		version: Literal(2)
	});
	Struct({
		kind: Literal(BROWSER_COMPANION_PROBE_KIND),
		version: Literal(2),
		extension: BrowserCompanionExpectation
	});
	is(BrowserCompanionProbeRequest);
	var BrowserCompanionMismatch = Literals([
		"ExtensionId",
		"DisplayVersion",
		"ProtocolFingerprint"
	]);
	var browserCompanionMismatches = (expected, actual) => {
		const mismatches = [];
		if (expected.extensionId !== actual.extensionId) mismatches.push("ExtensionId");
		if (expected.displayVersion !== actual.displayVersion) mismatches.push("DisplayVersion");
		if (expected.protocolFingerprint !== actual.protocolFingerprint) mismatches.push("ProtocolFingerprint");
		return mismatches;
	};
	Union([
		TaggedStruct("Missing", { expected: BrowserCompanionExpectation }),
		TaggedStruct("Compatible", {
			expected: BrowserCompanionExpectation,
			actual: BrowserCompanionExpectation
		}),
		TaggedStruct("Incompatible", {
			expected: BrowserCompanionExpectation,
			actual: BrowserCompanionExpectation,
			mismatches: ArraySchema(BrowserCompanionMismatch)
		})
	]);
	var BROWSER_COMPANION_WAKE_KIND = "dsh-chrome/browser-companion-wake";
	var BrowserCompanionWakeRequest = Struct({
		kind: Literal(BROWSER_COMPANION_WAKE_KIND),
		version: Literal(2)
	});
	Struct({
		kind: Literal(BROWSER_COMPANION_WAKE_KIND),
		version: Literal(2),
		accepted: Boolean$1
	});
	var isBrowserCompanionWakeRequest = is(BrowserCompanionWakeRequest);
	//#endregion
	//#region src/protocol/chrome.ts
	var ChromeExtensionExpectation = BrowserCompanionExpectation;
	var CHROME_EXTENSION_PROBE_KIND = BROWSER_COMPANION_PROBE_KIND;
	var isChromeExtensionProbeRequest = is(BrowserCompanionProbeRequest);
	var ChromeExtensionEvidence = Struct({
		...ChromeExtensionExpectation.fields,
		connectorIdentity: Struct({
			connectorId: NonEmptyString,
			connectorLabel: NonEmptyString
		})
	});
	var projectChromeExtensionEvidence = (connector) => ({
		extensionId: connector.extensionId,
		displayVersion: connector.extensionDisplayVersion,
		protocolFingerprint: connector.protocolFingerprint,
		connectorIdentity: {
			connectorId: connector.connectorId,
			connectorLabel: connector.label
		}
	});
	var ChromeCompatibilityMismatch = BrowserCompanionMismatch;
	var chromeExtensionMismatches = (expected, actual) => {
		return browserCompanionMismatches(expected, actual);
	};
	Union([
		TaggedStruct("Unknown", {}),
		TaggedStruct("Verified", { evidence: ChromeExtensionEvidence }),
		TaggedStruct("Incompatible", {
			expected: ChromeExtensionExpectation,
			actual: ChromeExtensionEvidence,
			mismatches: ArraySchema(ChromeCompatibilityMismatch)
		})
	]);
	function classifyChromeCompatibility(expected, actual) {
		if (expected === null || actual === null) return { _tag: "Unknown" };
		const mismatches = chromeExtensionMismatches(expected, actual);
		return mismatches.length === 0 ? {
			_tag: "Verified",
			evidence: actual
		} : {
			_tag: "Incompatible",
			expected,
			actual,
			mismatches
		};
	}
	var classifyChromeConnectorCompatibility = (expected, connector) => classifyChromeCompatibility(expected, projectChromeExtensionEvidence(connector));
	Struct({
		kind: Literal("dsh-chrome/status"),
		version: Literal(3),
		state: Literals([
			"ready",
			"waiting-for-extension",
			"offline",
			"error"
		]),
		bridge: Literals([
			"running",
			"stopped",
			"error"
		]),
		connector: optionalKey(Struct({
			id: NonEmptyString,
			label: NonEmptyString,
			connected: Boolean$1,
			lastSeenAt: optionalKey(Finite)
		})),
		extensionDirectory: String$1,
		errorMessage: optionalKey(String$1)
	});
	Union([
		TaggedStruct("PackageMissing", {}),
		TaggedStruct("CompanionMissing", { expected: ChromeExtensionExpectation }),
		TaggedStruct("CompanionIncompatible", {
			expected: ChromeExtensionExpectation,
			actual: ChromeExtensionExpectation,
			mismatches: ArraySchema(ChromeCompatibilityMismatch)
		}),
		TaggedStruct("Connecting", {
			expected: ChromeExtensionExpectation,
			startedAt: Finite
		}),
		TaggedStruct("Ready", {
			expected: ChromeExtensionExpectation,
			connector: Struct({
				id: NonEmptyString,
				label: NonEmptyString,
				lastSeenAt: optionalKey(Finite)
			})
		}),
		TaggedStruct("ConnectionFailed", {
			expected: ChromeExtensionExpectation,
			reason: Literals([
				"bridge-unavailable",
				"connector-timeout",
				"profile-offline",
				"protocol-mismatch"
			]),
			message: String$1
		})
	]);
	TaggedError("BridgeStopped");
	TaggedError("BridgeBindFailed");
	TaggedError("BridgeUnavailable");
	TaggedError("BridgeOwnerUnreachable");
	TaggedError("ConnectorNotBound");
	TaggedError("ConnectorOffline");
	TaggedError("ConnectorAlreadyBound");
	TaggedError("ConnectorAuthenticationFailed");
	TaggedError("CommandTimeout");
	var CommandOutcomeUnknown = class extends TaggedError("CommandOutcomeUnknown") {};
	var CommandRejected = class extends TaggedError("CommandRejected") {};
	var ProtocolFailure = class extends TaggedError("ProtocolFailure") {};
	TaggedError("ScreenshotFailure");
	TaggedError("ChromeUnavailable");
	var messageOf = (error) => typeof error === "object" && error !== null && "message" in error ? String(error.message) : String(error);
	var bridge_default = {
		host: "127.0.0.1",
		port: 17318,
		hmacAuthentication: {
			"algorithmVersion": 2,
			"digest": "sha256",
			"keyEncoding": "hex",
			"proofEncoding": "hex",
			"domains": {
				"ownerServerProof": "dsh-chrome/bridge-owner/server-proof/v1",
				"ownerRequestProof": "dsh-chrome/bridge-owner/request-proof/v1",
				"connectorServerProof": "dsh-chrome/connector/server-proof/v1",
				"connectorRequestProof": "dsh-chrome/connector/request-proof/v1"
			}
		},
		headers: {
			"ownerProtocolFingerprint": "x-dsh-chrome-protocol-fingerprint",
			"ownerClientNonce": "x-dsh-chrome-owner-client-nonce",
			"ownerBridgeEpoch": "x-dsh-chrome-owner-bridge-epoch",
			"ownerRequestNonce": "x-dsh-chrome-owner-request-nonce",
			"ownerBodySha256": "x-dsh-chrome-owner-body-sha256",
			"ownerProof": "x-dsh-chrome-owner-proof"
		},
		routes: {
			"owner": {
				"ownerHandshake": {
					"method": "GET",
					"path": "/owner/handshake",
					"bodyLimit": "none",
					"responseLimit": "controlBody"
				},
				"status": {
					"method": "GET",
					"path": "/status",
					"bodyLimit": "none",
					"responseLimit": "controlBody"
				},
				"statusWait": {
					"method": "GET",
					"path": "/status/wait",
					"bodyLimit": "none",
					"responseLimit": "controlBody"
				},
				"command": {
					"method": "POST",
					"path": "/command",
					"bodyLimit": "requestBody",
					"responseLimit": "requestBody"
				}
			},
			"extension": { "preflight": {
				"method": "OPTIONS",
				"path": "*",
				"bodyLimit": "none",
				"responseLimit": "controlBody"
			} },
			"connector": {
				"connectorHandshake": {
					"method": "POST",
					"path": "/connector/handshake",
					"bodyLimit": "controlBody",
					"responseLimit": "controlBody"
				},
				"poll": {
					"method": "GET",
					"path": "/next",
					"bodyLimit": "none",
					"responseLimit": "requestBody"
				},
				"result": {
					"method": "POST",
					"path": "/result",
					"bodyLimit": "requestBody",
					"responseLimit": "controlBody"
				}
			}
		},
		transportDeadlinesMs: {
			"ownerRequest": 3e3,
			"ownerCommandHttpResponseGrace": 2e3,
			"connectorRequest": 3e4,
			"pollWait": 25e3,
			"connectorLease": 35e3,
			"incomingRequest": 3e4,
			"incomingHeaders": 1e4,
			"authenticationChallenge": 5e3,
			"authenticationHandshake": 3e3
		},
		transportLimitsBytes: {
			"none": 0,
			"screenshotPayload": 16777216,
			"requestBody": 20971520,
			"controlBody": 65536
		},
		transportLimitsCount: {
			"incomingConnections": 128,
			"pendingChallengesPerScope": 128
		},
		mailboxLimits: { "maxAdmittedCommandsPerConnector": 64 },
		automationTargetLimits: {
			"perSession": 5,
			"perProfile": 256
		},
		screenshotLimits: {
			"maxTiles": 200,
			"maxDpr": 4,
			"maxCapturePixels": 16777216,
			"maxTotalPixels": 67108864
		},
		httpStatuses: { "requestBodyTooLarge": 413 },
		commandDeadlinesMs: {
			"defaultExecution": 3e4,
			"navigateDefault": 15e3,
			"navigateOverhead": 2e3,
			"waitDefault": 1e4,
			"waitIntervalDefault": 250,
			"waitOverhead": 2e3,
			"fullPageScreenshot": 12e4,
			"textInputBase": 3e4,
			"textInputPerCharacter": 180,
			"textInputMaximum": 12e4,
			"resultDeliveryGrace": 5e3
		},
		resultDelivery: {
			"acknowledgedStatus": 200,
			"unknownCommandStatus": 404,
			"retryableRange": {
				"minimum": 500,
				"maximum": 599
			}
		}
	};
	`${bridge_default.host}${bridge_default.port}`;
	bridge_default.headers;
	var HMAC_AUTHENTICATION = bridge_default.hmacAuthentication;
	var authorizeRoutes = (authorization, routes) => Object.fromEntries(Object.entries(routes).map(([name, route]) => [name, {
		...route,
		authorization
	}]));
	var ownerRoutes = authorizeRoutes("owner", bridge_default.routes.owner);
	var extensionRoutes = authorizeRoutes("extension", bridge_default.routes.extension);
	var connectorRoutes = authorizeRoutes("connector", bridge_default.routes.connector);
	var mergeRouteGroups = (owner, extension, connector) => ({
		...owner,
		...extension,
		...connector
	});
	var BRIDGE_ROUTES = mergeRouteGroups(ownerRoutes, extensionRoutes, connectorRoutes);
	bridge_default.transportDeadlinesMs.ownerRequest;
	bridge_default.transportDeadlinesMs.ownerCommandHttpResponseGrace;
	var CONNECTOR_REQUEST_DEADLINE_MS = bridge_default.transportDeadlinesMs.connectorRequest;
	bridge_default.transportDeadlinesMs.pollWait;
	bridge_default.transportDeadlinesMs.connectorLease;
	bridge_default.transportDeadlinesMs.incomingRequest;
	bridge_default.transportDeadlinesMs.incomingHeaders;
	bridge_default.transportDeadlinesMs.authenticationChallenge;
	var AUTHENTICATION_HANDSHAKE_DEADLINE_MS = bridge_default.transportDeadlinesMs.authenticationHandshake;
	var SCREENSHOT_PAYLOAD_BYTE_LIMIT = bridge_default.transportLimitsBytes.screenshotPayload;
	var SCREENSHOT_LIMITS = bridge_default.screenshotLimits;
	var SCREENSHOT_MAX_TILE_COUNT = SCREENSHOT_LIMITS.maxTiles;
	var REQUEST_BODY_BYTE_LIMIT = bridge_default.transportLimitsBytes.requestBody;
	bridge_default.transportLimitsCount.incomingConnections;
	bridge_default.transportLimitsCount.pendingChallengesPerScope;
	var MAX_ADMITTED_COMMANDS_PER_CONNECTOR = bridge_default.mailboxLimits.maxAdmittedCommandsPerConnector;
	var AUTOMATION_TARGET_LIMITS = bridge_default.automationTargetLimits;
	bridge_default.httpStatuses.requestBodyTooLarge;
	var COMMAND_DEADLINES_MS = bridge_default.commandDeadlinesMs;
	var responseBodyLimitForRoute = (name) => bridge_default.transportLimitsBytes[BRIDGE_ROUTES[name].responseLimit];
	[...new Set(Object.values(BRIDGE_ROUTES).map(({ method }) => method))].join(",");
	var RESULT_DELIVERY_POLICY = bridge_default.resultDelivery;
	var isWithin = (status, range) => status >= range.minimum && status <= range.maximum;
	var classifyResultDelivery = (status, policy = RESULT_DELIVERY_POLICY) => {
		if (status === policy.acknowledgedStatus || status === policy.unknownCommandStatus) return "terminal";
		return isWithin(status, policy.retryableRange) ? "retry" : "blocked";
	};
	//#endregion
	//#region src/protocol/hex-256.ts
	var HEX_256_PATTERN = /^[0-9a-f]{64}$/;
	//#endregion
	//#region src/protocol/json-value.ts
	var JsonValue = Union([
		Null,
		Boolean$1,
		Finite,
		String$1,
		ArraySchema(suspend(() => JsonValue)),
		Record(String$1, suspend(() => JsonValue))
	]);
	//#endregion
	//#region src/protocol/json-transport.ts
	var JsonTransportFailure = class extends TaggedError("JsonTransportFailure") {};
	var jsonViolation = (root) => {
		const pending = [root];
		const seen = /* @__PURE__ */ new WeakSet();
		while (pending.length > 0) {
			const value = pending.pop();
			if (value === null || typeof value === "string" || typeof value === "boolean") continue;
			if (typeof value === "number") {
				if (!Number.isFinite(value)) return "contains a non-finite number";
				continue;
			}
			if (typeof value !== "object") return `contains ${typeof value}`;
			if (seen.has(value)) return "contains a circular or aliased object graph";
			seen.add(value);
			if (Array.isArray(value)) {
				for (let index = 0; index < value.length; index += 1) {
					if (!Object.hasOwn(value, index)) return "contains a sparse array";
					pending.push(value[index]);
				}
				continue;
			}
			const prototype = Object.getPrototypeOf(value);
			if (prototype !== Object.prototype && prototype !== null) return "contains a non-plain object";
			for (const key of Reflect.ownKeys(value)) {
				if (typeof key !== "string") return "contains a symbol key";
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				if (!descriptor?.enumerable || !("value" in descriptor)) return "contains a non-enumerable or accessor property";
				pending.push(descriptor.value);
			}
		}
	};
	var encodeJsonTransport = (label, schema, value, limitBytes = REQUEST_BODY_BYTE_LIMIT) => gen(function* () {
		if (!Number.isSafeInteger(limitBytes) || limitBytes < 0) return yield* new JsonTransportFailure({
			label,
			message: `${label} byte limit must be a non-negative safe integer`,
			limitBytes
		});
		const violation = yield* try_({
			try: () => jsonViolation(value),
			catch: (cause) => new JsonTransportFailure({
				label,
				message: `${label} could not be inspected as JSON`,
				limitBytes,
				cause
			})
		});
		if (violation) return yield* new JsonTransportFailure({
			label,
			message: `${label} is not a JSON value: ${violation}`,
			limitBytes
		});
		const json = yield* try_({
			try: () => JSON.stringify(value),
			catch: (cause) => new JsonTransportFailure({
				label,
				message: `${label} could not be encoded as JSON`,
				limitBytes,
				cause
			})
		});
		if (json === void 0) return yield* new JsonTransportFailure({
			label,
			message: `${label} did not encode to a JSON document`,
			limitBytes
		});
		const byteLength = yield* try_({
			try: () => new TextEncoder().encode(json).byteLength,
			catch: (cause) => new JsonTransportFailure({
				label,
				message: `${label} byte length could not be measured`,
				limitBytes,
				cause
			})
		});
		if (byteLength > limitBytes) return yield* new JsonTransportFailure({
			label,
			message: `${label} is ${byteLength} bytes; limit is ${limitBytes} bytes`,
			limitBytes,
			actualBytes: byteLength
		});
		const parsed = yield* try_({
			try: () => JSON.parse(json),
			catch: (cause) => new JsonTransportFailure({
				label,
				message: `${label} could not be decoded from its JSON document`,
				limitBytes,
				actualBytes: byteLength,
				cause
			})
		});
		return {
			value: yield* decodeUnknownEffect(schema, { onExcessProperty: "error" })(parsed).pipe(mapError((cause) => new JsonTransportFailure({
				label,
				message: `${label} does not match its wire schema`,
				limitBytes,
				actualBytes: byteLength,
				cause
			}))),
			json,
			byteLength
		};
	});
	//#endregion
	//#region src/protocol/screenshot-geometry.ts
	var planScreenshotRasterGeometry = (geometry, limits) => {
		const { width, height, dpr } = geometry;
		if (!Number.isFinite(width) || width <= 0) return {
			ok: false,
			message: `Screenshot capture requires a positive finite width, received ${width}`
		};
		if (!Number.isFinite(height) || height <= 0) return {
			ok: false,
			message: `Screenshot capture requires a positive finite height, received ${height}`
		};
		if (!Number.isFinite(dpr) || dpr <= 0) return {
			ok: false,
			message: `Screenshot capture requires a positive finite device pixel ratio, received ${dpr}`
		};
		if (dpr > limits.maxDpr) return {
			ok: false,
			message: `Screenshot capture device pixel ratio is ${dpr}; maximum is ${limits.maxDpr}`
		};
		const pixelWidth = Math.ceil(width * dpr);
		const pixelHeight = Math.ceil(height * dpr);
		const pixels = pixelWidth * pixelHeight;
		if (!Number.isSafeInteger(pixelWidth) || !Number.isSafeInteger(pixelHeight) || !Number.isSafeInteger(pixels) || pixels > limits.maxCapturePixels) return {
			ok: false,
			message: `Screenshot capture requires ${pixels} pixels; maximum per capture is ${limits.maxCapturePixels}`
		};
		return {
			ok: true,
			pixelWidth,
			pixelHeight,
			pixels
		};
	};
	var planFullPageTileGeometry = (geometry, limits) => {
		const { width, height, viewportHeight, dpr } = geometry;
		if (!Number.isFinite(height) || height <= 0) return {
			ok: false,
			message: `Screenshot capture requires a positive finite height, received ${height}`
		};
		if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return {
			ok: false,
			message: `Screenshot capture requires a positive finite viewport height, received ${viewportHeight}`
		};
		const count = Math.ceil(height / viewportHeight);
		if (count > limits.maxTiles) return {
			ok: false,
			message: `Screenshot capture requires ${count} tiles; maximum is ${limits.maxTiles}`
		};
		const tiles = [];
		let totalPixels = 0;
		for (let index = 0; index < count; index += 1) {
			const y = index * viewportHeight;
			const tile = {
				y,
				height: Math.min(viewportHeight, height - y)
			};
			const raster = planScreenshotRasterGeometry({
				width,
				height: tile.height,
				dpr
			}, limits);
			if (!raster.ok) return raster;
			totalPixels += raster.pixels;
			if (!Number.isSafeInteger(totalPixels) || totalPixels > limits.maxTotalPixels) return {
				ok: false,
				message: `Screenshot capture requires ${totalPixels} pixels; maximum total is ${limits.maxTotalPixels}`
			};
			tiles.push(tile);
		}
		return {
			ok: true,
			tiles
		};
	};
	var isCompleteFullPageTileSet = (dimensions, tiles, limits) => {
		const plan = planFullPageTileGeometry(dimensions, limits);
		return plan.ok && tiles.length === plan.tiles.length && tiles.every((tile, index) => tile.y === plan.tiles[index]?.y);
	};
	//#endregion
	//#region src/protocol/operation-schemas.ts
	var optional$2 = optionalKey;
	var NonBlankString$1 = String$1.check(isPattern(/\S/));
	var FiniteNumber = Finite;
	var NonNegativeInt$1 = Int.check(isGreaterThanOrEqualTo(0));
	var OperationTimeoutMs = Int.check(isBetween({
		minimum: 1,
		maximum: 12e4
	}));
	var WaitIntervalMs = Int.check(isBetween({
		minimum: 1,
		maximum: 1e4
	}));
	var InputSteps = Int.check(isBetween({
		minimum: 1,
		maximum: 40
	}));
	var ScrollSteps = Int.check(isBetween({
		minimum: 3,
		maximum: 40
	}));
	var InputText = String$1.check(isMaxLength(500));
	var JpegQuality = Int.check(isBetween({
		minimum: 0,
		maximum: 100
	}));
	var UPLOAD_LIMITS = {
		maxPaths: 32,
		maxPathLength: 4096
	};
	var UploadPaths = ArraySchema(NonBlankString$1.check(isMaxLength(UPLOAD_LIMITS.maxPathLength))).check(isMinLength(1), isMaxLength(UPLOAD_LIMITS.maxPaths));
	var WorkspaceRelativePath = String$1.check(isPattern(/^(?!\/)(?![A-Za-z]:[\\/])(?!.*\\)(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?=.*\S).+$/), makeFilter((value) => value.includes("\0") ? "Workspace-relative paths cannot contain a null byte" : void 0)).annotate({ description: "Portable workspace-relative path using slash-separated segments; absolute, dot, parent, backslash, and null-byte segments are forbidden." });
	var Target = Union([
		Struct({
			by: Literal("id"),
			value: NonNegativeInt$1
		}),
		Struct({
			by: Literal("url"),
			value: NonBlankString$1
		}),
		Struct({
			by: Literal("title"),
			value: NonBlankString$1
		})
	]).annotate({ description: "Exactly one Chrome tab selector." });
	var ElementTarget = Union([Struct({
		by: Literal("uid"),
		value: NonBlankString$1
	}), Struct({
		by: Literal("selector"),
		value: NonBlankString$1
	})]);
	var PointerTarget = Union([ElementTarget, Struct({
		by: Literal("coordinate"),
		x: FiniteNumber,
		y: FiniteNumber
	})]);
	var GroupColor = Literals([
		"grey",
		"blue",
		"red",
		"yellow",
		"green",
		"pink",
		"purple",
		"cyan",
		"orange"
	]);
	var SnapshotMode = Literals([
		"auto",
		"interactive",
		"forms",
		"pageMap",
		"text",
		"changes",
		"full"
	]);
	var SnapshotElementLimit = Int.check(isBetween({
		minimum: 1,
		maximum: 80
	}));
	var SnapshotTextLimit = Int.check(isBetween({
		minimum: 1,
		maximum: 1e5
	}));
	var ReadTextLimit = Int.check(isBetween({
		minimum: 1,
		maximum: 24e3
	}));
	var ObservationRefId = String$1.check(isPattern(/^@?(?:el|frontier)-\d+$/)).annotate({ description: "A fresh context or frontier ref returned by page observation." });
	var Modifiers = Struct({
		shift: optional$2(Boolean$1),
		control: optional$2(Boolean$1),
		alt: optional$2(Boolean$1),
		meta: optional$2(Boolean$1)
	});
	var SnapshotVerification = {
		includeSnapshot: optional$2(Boolean$1),
		maxElements: optional$2(SnapshotElementLimit)
	};
	var SnapshotFields = {
		ref: optional$2(ObservationRefId),
		mode: optional$2(SnapshotMode),
		query: optional$2(String$1),
		maxElements: optional$2(SnapshotElementLimit),
		maxTextChars: optional$2(SnapshotTextLimit),
		containingText: optional$2(String$1),
		role: optional$2(String$1),
		nearUid: optional$2(String$1)
	};
	var SnapshotOptions = Struct(SnapshotFields);
	var ScreenshotCapture = Union([Struct({ kind: Literal("viewport") }), Struct({ kind: Literal("full-page-tiles") })]);
	var ToolScreenshotCapture = Union([Struct({
		kind: Literal("viewport"),
		path: optional$2(WorkspaceRelativePath)
	}), Struct({
		kind: Literal("full-page-tiles"),
		directory: optional$2(WorkspaceRelativePath)
	})]);
	var screenshotCall = (capture) => Union([Struct({
		kind: Literal("screenshot"),
		capture,
		format: Literal("png"),
		quality: optional$2(Never)
	}), Struct({
		kind: Literal("screenshot"),
		capture,
		format: Literal("jpeg"),
		quality: optional$2(JpegQuality)
	})]);
	var ScreenshotCall = screenshotCall(ScreenshotCapture);
	var ToolScreenshotCall = screenshotCall(ToolScreenshotCapture);
	var TabCalls = {
		list: Struct({ op: Literal("list") }),
		new: Struct({
			op: Literal("new"),
			url: optional$2(NonBlankString$1),
			groupColor: optional$2(GroupColor)
		}),
		activate: Struct({
			op: Literal("activate"),
			target: optional$2(Target)
		}),
		close: Struct({
			op: Literal("close"),
			target: optional$2(Target)
		}),
		group: Struct({
			op: Literal("group"),
			target: optional$2(Target),
			groupColor: optional$2(GroupColor)
		}),
		ungroup: Struct({
			op: Literal("ungroup"),
			target: optional$2(Target)
		})
	};
	var PageCalls = {
		snapshot: Struct({
			op: Literal("snapshot"),
			...SnapshotFields
		}),
		read: Struct({
			op: Literal("read"),
			ref: optional$2(ObservationRefId),
			view: optional$2(Literals(["content", "outline"])),
			query: optional$2(String$1),
			maxChars: optional$2(ReadTextLimit)
		}),
		inspect: Struct({
			op: Literal("inspect"),
			element: ElementTarget,
			scrollIntoView: optional$2(Boolean$1)
		}),
		navigate: Struct({
			op: Literal("navigate"),
			url: NonBlankString$1,
			waitUntilLoad: optional$2(Boolean$1),
			timeoutMs: optional$2(OperationTimeoutMs),
			initScript: optional$2(String$1),
			snapshot: optional$2(SnapshotOptions)
		}),
		evaluate: Struct({
			op: Literal("evaluate"),
			expression: NonBlankString$1,
			awaitPromise: optional$2(Boolean$1)
		}),
		wait: Struct({
			op: Literal("wait"),
			condition: Union([
				Struct({
					by: Literal("selector"),
					value: NonBlankString$1
				}),
				Struct({
					by: Literal("urlIncludes"),
					value: NonBlankString$1
				}),
				Struct({
					by: Literal("textContains"),
					value: NonBlankString$1
				}),
				Struct({
					by: Literal("expression"),
					value: NonBlankString$1
				})
			]),
			timeoutMs: optional$2(OperationTimeoutMs),
			intervalMs: optional$2(WaitIntervalMs)
		}),
		console: Struct({
			op: Literal("console"),
			clear: optional$2(Boolean$1)
		}),
		"network-list": Struct({
			op: Literal("network-list"),
			includePreserved: optional$2(Boolean$1),
			clear: optional$2(Boolean$1)
		}),
		"network-get": Struct({
			op: Literal("network-get"),
			requestId: NonBlankString$1
		}),
		screenshot: ScreenshotCall
	};
	var InputCalls = {
		click: Struct({
			op: Literal("click"),
			at: PointerTarget,
			...SnapshotVerification
		}),
		type: Struct({
			op: Literal("type"),
			text: InputText,
			into: optional$2(ElementTarget),
			pressEnter: optional$2(Boolean$1),
			...SnapshotVerification
		}),
		fill: Struct({
			op: Literal("fill"),
			text: InputText,
			into: ElementTarget,
			submit: optional$2(Boolean$1),
			...SnapshotVerification
		}),
		key: Struct({
			op: Literal("key"),
			key: NonBlankString$1,
			at: optional$2(ElementTarget),
			modifiers: optional$2(Modifiers),
			...SnapshotVerification
		}),
		hover: Struct({
			op: Literal("hover"),
			at: PointerTarget
		}),
		drag: Struct({
			op: Literal("drag"),
			from: PointerTarget,
			to: PointerTarget,
			steps: optional$2(InputSteps)
		}),
		tap: Struct({
			op: Literal("tap"),
			at: PointerTarget
		}),
		scroll: Struct({
			op: Literal("scroll"),
			within: optional$2(ElementTarget),
			deltaY: optional$2(FiniteNumber),
			deltaX: optional$2(FiniteNumber),
			steps: optional$2(ScrollSteps)
		}),
		upload: Struct({
			op: Literal("upload"),
			into: ElementTarget,
			paths: UploadPaths
		})
	};
	var SystemCalls = {
		version: Struct({ op: Literal("version") }),
		"automation-status": Struct({ op: Literal("automation-status") }),
		"clear-stale": Struct({ op: Literal("clear-stale") }),
		cleanup: Struct({ op: Literal("cleanup") }),
		"cleanup-all": Struct({ op: Literal("cleanup-all") }),
		probe: Struct({
			op: Literal("probe"),
			target: optional$2(Target)
		})
	};
	var TabGroupResult = Struct({
		id: Int,
		title: String$1,
		color: String$1,
		collapsed: Boolean$1,
		windowId: Int
	});
	var FormattedTabResult = Struct({
		id: Int,
		windowId: Int,
		active: Boolean$1,
		highlighted: Boolean$1,
		title: String$1,
		url: String$1,
		status: optional$2(String$1),
		pinned: optional$2(Boolean$1),
		incognito: optional$2(Boolean$1),
		groupId: Int,
		group: NullOr(TabGroupResult)
	});
	var PngDataUrl = String$1.check(isPattern(/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)$/));
	var JpegDataUrl = String$1.check(isPattern(/^data:image\/jpeg;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)$/));
	var PositiveFinite = Finite.check(isGreaterThan(0));
	var viewportScreenshotResult = (format, dataUrl) => Struct({
		kind: Literal("image"),
		format: Literal(format),
		dataUrl,
		tab: FormattedTabResult
	});
	var fullPageTilesResult = (format, dataUrl) => Struct({
		kind: Literal("tile-set"),
		format: Literal(format),
		tab: FormattedTabResult,
		dimensions: Struct({
			width: PositiveFinite,
			height: PositiveFinite,
			viewportHeight: PositiveFinite,
			dpr: PositiveFinite
		}),
		tiles: ArraySchema(Struct({
			y: Number$1.check(isGreaterThanOrEqualTo(0)),
			dataUrl
		})).check(isMinLength(1), isMaxLength(SCREENSHOT_MAX_TILE_COUNT))
	}).check(makeFilter((result) => isCompleteFullPageTileSet(result.dimensions, result.tiles, SCREENSHOT_LIMITS) ? void 0 : "Full-page tile-set geometry does not match its dimensions"));
	var ScreenshotResultSchemas = {
		viewport: {
			png: viewportScreenshotResult("png", PngDataUrl),
			jpeg: viewportScreenshotResult("jpeg", JpegDataUrl)
		},
		"full-page-tiles": {
			png: fullPageTilesResult("png", PngDataUrl),
			jpeg: fullPageTilesResult("jpeg", JpegDataUrl)
		}
	};
	var AutomationTargetStatus = Union([
		Struct({ state: Literal("allocating") }),
		Struct({
			state: Literal("owned"),
			tab: FormattedTabResult
		}),
		Struct({
			state: Literal("stale"),
			reason: Literals([
				"epoch-changed",
				"tab-missing",
				"tab-outside-regular-profile"
			]),
			recordedTabId: NullOr(Int)
		})
	]);
	var SessionAutomationTargetCount = Int.check(isBetween({
		minimum: 0,
		maximum: AUTOMATION_TARGET_LIMITS.perSession
	}));
	var ProfileAutomationTargetCount = Int.check(isBetween({
		minimum: 0,
		maximum: AUTOMATION_TARGET_LIMITS.perProfile
	}));
	var AutomationStatusResult = Struct({
		targets: ArraySchema(AutomationTargetStatus).check(isMaxLength(AUTOMATION_TARGET_LIMITS.perSession)),
		input: Struct({
			attachedTabs: ArraySchema(Int),
			permissionGranted: Boolean$1
		})
	});
	var ClearStaleResult = Struct({ staleOwnershipsCleared: SessionAutomationTargetCount });
	var ClearStaleAllResult = Struct({ staleOwnershipsCleared: ProfileAutomationTargetCount });
	var WaitResult = Struct({
		satisfied: Boolean$1,
		elapsedMs: NonNegativeInt$1,
		observation: Struct({
			url: String$1,
			title: String$1,
			readyState: Literals([
				"loading",
				"interactive",
				"complete"
			]),
			bodyTextLength: NonNegativeInt$1,
			matchCount: optional$2(NonNegativeInt$1)
		})
	});
	var CleanupResult = Struct({
		closedTabIds: ArraySchema(Int).check(isMaxLength(AUTOMATION_TARGET_LIMITS.perSession)),
		staleOwnershipsCleared: SessionAutomationTargetCount
	});
	var CleanupAllResult = Struct({
		closedTabIds: ArraySchema(Int).check(isMaxLength(AUTOMATION_TARGET_LIMITS.perProfile)),
		clearedSessionCount: ProfileAutomationTargetCount,
		staleOwnershipsCleared: ProfileAutomationTargetCount
	});
	//#endregion
	//#region src/protocol/operation-contract.ts
	var optional$1 = optionalKey;
	var description = (value) => ({ description: value });
	var Deadline = {
		default: "default",
		navigate: "navigate",
		wait: "wait",
		screenshot: "screenshot",
		textInput: "text-input"
	};
	var opaque = (reason) => ({
		_tag: "Opaque",
		reason
	});
	var result = (schema) => ({
		_tag: "Schema",
		schema
	});
	var screenshotResult = {
		_tag: "ScreenshotByCaptureAndFormat",
		schemas: ScreenshotResultSchemas
	};
	var atomicTool = (name, description, promptSnippet, options = {}) => ({
		name,
		description,
		promptSnippet,
		...options
	});
	var defineOperation = (call, resultContract, deadline, atomicToolContract) => ({
		call,
		toolCall: call,
		result: resultContract,
		deadline,
		atomicTool: atomicToolContract
	});
	var defineProjectedOperation = (call, toolCall, resultContract, deadline, atomicToolContract) => ({
		call,
		toolCall,
		result: resultContract,
		deadline,
		atomicTool: atomicToolContract
	});
	var opaqueInput = (operation, atomicToolContract) => defineOperation(InputCalls[operation], opaque("input verification can include a page-defined snapshot"), Deadline.default, atomicToolContract);
	var PostActionResult = Struct({
		action: JsonValue,
		verification: Union([
			Struct({ status: Literal("not-requested") }),
			Struct({
				status: Literal("observed"),
				snapshot: JsonValue
			}),
			Struct({
				status: Literal("unavailable"),
				reason: String$1
			})
		])
	});
	var verifiedInput = (operation, deadline, atomicToolContract) => defineOperation(InputCalls[operation], result(PostActionResult), deadline, atomicToolContract);
	var NavigateResult = Union([FormattedTabResult, Struct({
		tab: FormattedTabResult,
		snapshot: JsonValue
	})]);
	var AtomicActionRef = String$1.check(isPattern(/^@?el-\d+$/)).annotate(description("Action ref returned by chrome_snapshot; an optional leading @ is accepted."));
	var AtomicSelector = String$1.check(isPattern(/\S/));
	var { kind: _clickKind, at: _clickAt, ...atomicClickFields } = InputCalls.click.fields;
	var AtomicClickParameters = Union([
		Struct({
			ref: AtomicActionRef,
			...atomicClickFields
		}),
		Struct({
			selector: AtomicSelector,
			...atomicClickFields
		}),
		Struct({
			x: Finite,
			y: Finite,
			...atomicClickFields
		})
	]);
	var { kind: _fillKind, into: _fillInto, ...atomicFillFields } = InputCalls.fill.fields;
	var AtomicFillParameters = Union([Struct({
		ref: AtomicActionRef,
		...atomicFillFields
	}), Struct({
		selector: AtomicSelector,
		...atomicFillFields
	})]);
	var { kind: _keyKind, at: _keyAt, ...atomicPressFields } = InputCalls.key.fields;
	var AtomicPressParameters = Union([
		Struct({
			ref: AtomicActionRef,
			...atomicPressFields
		}),
		Struct({
			selector: AtomicSelector,
			...atomicPressFields
		}),
		Struct(atomicPressFields)
	]);
	var { kind: _uploadKind, into: _uploadInto, ...atomicUploadFields } = InputCalls.upload.fields;
	var AtomicUploadParameters = Union([Struct({
		ref: AtomicActionRef,
		...atomicUploadFields
	}), Struct({
		selector: AtomicSelector,
		...atomicUploadFields
	})]);
	var normalizeActionRef = (ref) => typeof ref === "string" && ref.startsWith("@") ? ref.slice(1) : ref;
	var projectAtomicPointer = (input) => {
		const { ref, selector, x, y, ...fields } = input;
		const at = ref !== void 0 ? {
			by: "uid",
			value: normalizeActionRef(ref)
		} : selector !== void 0 ? {
			by: "selector",
			value: selector
		} : {
			by: "coordinate",
			x,
			y
		};
		return {
			...fields,
			at
		};
	};
	var projectAtomicElement = (field, input) => {
		const { ref, selector, ...fields } = input;
		const element = ref !== void 0 ? {
			by: "uid",
			value: normalizeActionRef(ref)
		} : selector !== void 0 ? {
			by: "selector",
			value: selector
		} : void 0;
		return {
			...fields,
			...element === void 0 ? {} : { [field]: element }
		};
	};
	var OPERATION_CONTRACTS = {
		tab: {
			list: defineOperation(TabCalls.list, result(ArraySchema(FormattedTabResult)), Deadline.default, atomicTool("chrome_tab_list", "List Chrome tabs visible to this DSH session.", "List Chrome tabs and their exact ids.")),
			new: defineOperation(TabCalls.new, result(FormattedTabResult), Deadline.default, atomicTool("chrome_tab_new", "Create another session-owned Chrome tab.", "Create a session-owned Chrome tab.")),
			activate: defineOperation(TabCalls.activate, result(FormattedTabResult), Deadline.default, atomicTool("chrome_tab_activate", "Activate one exact Chrome tab.", "Activate an exact Chrome tab.")),
			close: defineOperation(TabCalls.close, result(Struct({ closed: Int })), Deadline.default, atomicTool("chrome_tab_close", "Close one exact Chrome tab.", "Close an exact Chrome tab.")),
			group: defineOperation(TabCalls.group, result(FormattedTabResult), Deadline.default, atomicTool("chrome_tab_group", "Place one exact Chrome tab in the DSH session group.", "Group an exact Chrome tab under the DSH session.")),
			ungroup: defineOperation(TabCalls.ungroup, result(FormattedTabResult), Deadline.default, atomicTool("chrome_tab_ungroup", "Remove one exact Chrome tab from its group.", "Ungroup an exact Chrome tab."))
		},
		page: {
			snapshot: defineOperation(PageCalls.snapshot, opaque("snapshot payload is page-defined"), Deadline.default, atomicTool("chrome_snapshot", "Observe the page and return a compact Action Graph. Use its refs for actions.", "Observe a page and obtain fresh action refs.")),
			read: defineOperation(PageCalls.read, opaque("rendered page content is page-defined"), Deadline.default, atomicTool("chrome_read", "Read bounded rendered content from the current page without loading the Action Graph.", "Read current rendered page content or expand a content frontier.")),
			inspect: defineOperation(PageCalls.inspect, opaque("inspection payload is page-defined"), Deadline.default, atomicTool("chrome_inspect", "Inspect one page element and its local context.", "Inspect one page element in detail.")),
			navigate: defineOperation(PageCalls.navigate, result(NavigateResult), Deadline.navigate, atomicTool("chrome_navigate", "Navigate the session-owned page or one explicitly selected tab.", "Navigate a Chrome page.")),
			evaluate: defineOperation(PageCalls.evaluate, opaque("evaluation returns arbitrary page values"), Deadline.default, atomicTool("chrome_evaluate", "Evaluate one JavaScript expression in the page and return bounded JSON.", "Evaluate a bounded page expression.")),
			wait: defineOperation(PageCalls.wait, result(WaitResult), Deadline.wait, atomicTool("chrome_wait", "Wait for one typed page condition.", "Wait for a page condition.")),
			console: defineOperation(PageCalls.console, opaque("console entries are CDP-defined"), Deadline.default, atomicTool("chrome_console", "Read captured page console entries.", "Read or clear captured console entries.")),
			"network-list": defineOperation(PageCalls["network-list"], opaque("network entries are CDP-defined"), Deadline.default, atomicTool("chrome_network_list", "List captured page network requests.", "List or clear captured network requests.")),
			"network-get": defineOperation(PageCalls["network-get"], opaque("network bodies are CDP-defined"), Deadline.default, atomicTool("chrome_network_get", "Read one captured network request and response body.", "Read one captured network record.")),
			screenshot: defineProjectedOperation(PageCalls.screenshot, ToolScreenshotCall, screenshotResult, Deadline.screenshot, atomicTool("chrome_screenshot", "Capture the viewport or a bounded full-page tile set.", "Capture a Chrome screenshot."))
		},
		input: {
			click: verifiedInput("click", Deadline.default, atomicTool("chrome_click", "Click a fresh Action Graph ref, selector, or viewport coordinate with real Chrome input.", "Click a fresh action ref with real Chrome input.", {
				actionVerb: "click",
				parameters: AtomicClickParameters,
				project: projectAtomicPointer
			})),
			type: verifiedInput("type", Deadline.textInput, atomicTool("chrome_type", "Type text with real Chrome keyboard input, optionally into an element.", "Type text with real Chrome keyboard input.")),
			fill: verifiedInput("fill", Deadline.textInput, atomicTool("chrome_fill", "Replace the value of a fresh Action Graph ref or selector with real Chrome input.", "Fill a fresh editable action ref.", {
				actionVerb: "fill",
				parameters: AtomicFillParameters,
				project: (input) => projectAtomicElement("into", input)
			})),
			key: verifiedInput("key", Deadline.default, atomicTool("chrome_press", "Press one key with real Chrome input, optionally after focusing a fresh Action Graph ref.", "Press a key, optionally on a fresh action ref.", {
				actionVerb: "press",
				parameters: AtomicPressParameters,
				project: (input) => projectAtomicElement("at", input)
			})),
			hover: opaqueInput("hover", atomicTool("chrome_hover", "Move the real Chrome pointer over an element or coordinate.", "Hover with the real Chrome pointer.")),
			drag: opaqueInput("drag", atomicTool("chrome_drag", "Drag between two elements or coordinates with real Chrome input.", "Drag with real Chrome pointer input.")),
			tap: opaqueInput("tap", atomicTool("chrome_tap", "Send a real Chrome touch tap to an element or coordinate.", "Tap with real Chrome touch input.")),
			scroll: opaqueInput("scroll", atomicTool("chrome_scroll", "Scroll the page or one element with real Chrome wheel input.", "Scroll with real Chrome wheel input.")),
			upload: opaqueInput("upload", atomicTool("chrome_upload", "Upload workspace files through a fresh file-input Action Graph ref or selector.", "Upload workspace files through a file input.", {
				actionVerb: "upload",
				parameters: AtomicUploadParameters,
				project: (input) => projectAtomicElement("into", input)
			}))
		},
		system: {
			version: defineOperation(SystemCalls.version, result(Struct({
				extensionId: NonEmptyString,
				extensionDisplayVersion: NonEmptyString,
				userAgent: String$1
			})), Deadline.default),
			"automation-status": defineOperation(SystemCalls["automation-status"], result(AutomationStatusResult), Deadline.default, atomicTool("chrome_automation_status", "Report this DSH session's Chrome automation ownership targets (owned, allocating, or stale).", "Inspect session automation ownership without changing it.")),
			"clear-stale": defineOperation(SystemCalls["clear-stale"], result(ClearStaleResult), Deadline.default, atomicTool("chrome_automation_clear_stale", "Remove proved-stale Chrome automation ownership records for this DSH session without closing or adopting tabs.", "Clear proved-stale automation ownership records only; never close or adopt tabs.")),
			cleanup: defineOperation(SystemCalls.cleanup, result(CleanupResult), Deadline.default),
			"cleanup-all": defineOperation(SystemCalls["cleanup-all"], result(CleanupAllResult), Deadline.default),
			probe: defineOperation(SystemCalls.probe, opaque("probe payload is page-defined"), Deadline.default)
		}
	};
	Object.keys(OPERATION_CONTRACTS.tab), Object.keys(OPERATION_CONTRACTS.page), Object.keys(OPERATION_CONTRACTS.input), Object.keys(OPERATION_CONTRACTS.system);
	var callsOf = (contracts, field) => Object.values(contracts).map((contract) => contract[field]);
	var EmptyToolParameters = Record(String$1, Never);
	var operationMembers = (schema) => "members" in schema ? schema.members : [schema];
	var atomicParameterMembers = (domain, contract) => {
		const explicit = contract.atomicTool?.parameters;
		return operationMembers(explicit ?? contract.toolCall).map((member) => {
			const fields = Object.fromEntries(Object.entries(member.fields).filter(([name]) => explicit !== void 0 || name !== (domain === "tab" ? "op" : "kind")));
			const parameterFields = domain === "page" || domain === "input" ? {
				target: optional$1(Target),
				background: optional$1(Boolean$1),
				...fields
			} : fields;
			return Object.keys(parameterFields).length === 0 ? EmptyToolParameters : Struct(parameterFields);
		});
	};
	var atomicParametersFor = (domain, contract) => {
		const members = atomicParameterMembers(domain, contract);
		if (members.length === 1) return members[0];
		const structs = members;
		const exact = Union(structs);
		const fieldSchema = (declaration) => "schema" in declaration && isSchema(declaration.schema) ? declaration.schema : declaration;
		const isOptionalField = (declaration) => "schema" in declaration && isSchema(declaration.schema);
		const fieldNames = new Set(structs.flatMap((member) => Object.keys(member.fields)));
		const fields = Object.fromEntries([...fieldNames].map((name) => {
			const declarations = structs.flatMap((member) => name in member.fields ? [member.fields[name]] : []);
			const schemas = declarations.map(fieldSchema).filter((schema) => schema.ast._tag !== "Never").filter((schema, index, all) => all.indexOf(schema) === index);
			const schema = schemas.length === 0 ? Never : schemas.length === 1 ? schemas[0] : Union(schemas);
			return [name, declarations.length === structs.length && declarations.every((declaration) => !isOptionalField(declaration)) ? schema : optional$1(schema)];
		}));
		const decodeExact = decodeUnknownResult(exact, { onExcessProperty: "error" });
		return Struct(fields).check(makeFilter((value) => isSuccess$1(decodeExact(value)) ? void 0 : "Parameters must match one supported object shape"));
	};
	var ATOMIC_TOOL_DESCRIPTORS = [
		"tab",
		"page",
		"input",
		"system"
	].flatMap((domain) => Object.entries(OPERATION_CONTRACTS[domain]).flatMap(([operation, contract]) => {
		const metadata = contract.atomicTool;
		if (metadata === void 0) return [];
		return [{
			name: metadata.name,
			label: metadata.name.slice(7).split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
			domain,
			operation,
			description: metadata.description,
			promptSnippet: metadata.promptSnippet,
			actionVerb: metadata.actionVerb,
			parameters: atomicParametersFor(domain, contract),
			projectInput: (input) => ({
				...metadata.project?.(input) ?? input,
				op: operation
			})
		}];
	}));
	Object.fromEntries(ATOMIC_TOOL_DESCRIPTORS.flatMap(({ actionVerb, name }) => actionVerb === void 0 ? [] : [[actionVerb, name]]));
	var flatToolCallsOf = (contracts) => Object.entries(contracts).flatMap(([op, contract]) => operationMembers(contract.toolCall).map((operation) => {
		const { kind: _kind, ...fields } = operation.fields;
		return Struct({
			op: Literal(op),
			target: optional$1(Target),
			background: optional$1(Boolean$1),
			...fields
		});
	}));
	var flattenToolCall = (call) => {
		const { target, background, operation } = call;
		const { kind, ...fields } = operation;
		return {
			op: kind,
			...target === void 0 ? {} : { target },
			...background === void 0 ? {} : { background },
			...fields
		};
	};
	var nestToolCall = (call) => {
		const { op, target, background, ...fields } = call;
		return {
			...target === void 0 ? {} : { target },
			...background === void 0 ? {} : { background },
			operation: {
				kind: op,
				...fields
			}
		};
	};
	var TabCall = Union(callsOf(OPERATION_CONTRACTS.tab, "call")).annotate(description("Manage Chrome tabs owned by this DSH session or explicitly selected tabs. Omitted targets require an unambiguous owned set."));
	var PageOperation = Union(callsOf(OPERATION_CONTRACTS.page, "call"));
	var PageCall = Union(flatToolCallsOf(OPERATION_CONTRACTS.page)).annotate(description("Observe, navigate, evaluate, wait for, diagnose, or capture one Chrome page."));
	var ToolPageOperation = Union(callsOf(OPERATION_CONTRACTS.page, "toolCall"));
	var NestedToolPageCall = Struct({
		target: optional$1(Target),
		background: optional$1(Boolean$1),
		operation: ToolPageOperation
	});
	Union(flatToolCallsOf(OPERATION_CONTRACTS.page)).pipe(decodeTo(NestedToolPageCall, {
		decode: transform$1((call) => nestToolCall(call)),
		encode: transform$1((call) => flattenToolCall(call))
	}), annotate(description("Observe, navigate, evaluate, wait for, diagnose, or capture one Chrome page.")));
	var InputOperation = Union(callsOf(OPERATION_CONTRACTS.input, "call"));
	var InputCall = Union(flatToolCallsOf(OPERATION_CONTRACTS.input)).annotate(description("Drive Chrome's real pointer, keyboard, touch, wheel, drag, and file-input layers."));
	var NestedToolInputCall = Struct({
		target: optional$1(Target),
		background: optional$1(Boolean$1),
		operation: InputOperation
	});
	Union(flatToolCallsOf(OPERATION_CONTRACTS.input)).pipe(decodeTo(NestedToolInputCall, {
		decode: transform$1((call) => nestToolCall(call)),
		encode: transform$1((call) => flattenToolCall(call))
	}), annotate(description("Drive Chrome's real pointer, keyboard, touch, wheel, drag, and file-input layers.")));
	var SystemCall = Union(callsOf(OPERATION_CONTRACTS.system, "call"));
	var OperationResultValidationFailure = class extends TaggedError("OperationResultValidationFailure") {};
	var operationNameOf = (command) => {
		switch (command.domain) {
			case "tab":
			case "system": return command.call.op;
			case "page":
			case "input": return command.call.op;
		}
	};
	var screenshotResultSchemaFor = (operation) => {
		return ScreenshotResultSchemas[operation.capture.kind][operation.format];
	};
	var contractFor = (command) => {
		const operation = operationNameOf(command);
		const contract = OPERATION_CONTRACTS[command.domain][operation];
		return contract ? succeed({
			operation,
			result: contract.result
		}) : fail(new OperationResultValidationFailure({
			domain: command.domain,
			operation,
			message: `Missing operation contract for ${command.domain}.${operation}`,
			cause: command
		}));
	};
	var schemaFor = (command, contract) => {
		switch (contract._tag) {
			case "Opaque": return JsonValue;
			case "Schema": return contract.schema;
			case "ScreenshotByCaptureAndFormat": return command.domain === "page" && command.call.op === "screenshot" ? screenshotResultSchemaFor(command.call) : Never;
		}
	};
	var validateOperationSuccess = (command, value) => gen(function* () {
		const { operation, result: contract } = yield* contractFor(command);
		return yield* encodeJsonTransport(`${command.domain}.${operation} result`, schemaFor(command, contract), value).pipe(map(({ value }) => value), mapError((cause) => new OperationResultValidationFailure({
			domain: command.domain,
			operation,
			message: `Invalid successful result for ${command.domain}.${operation}`,
			cause
		})));
	});
	var resultDocument = (contract) => {
		switch (contract._tag) {
			case "Opaque": return { mode: "opaque" };
			case "Schema": return {
				mode: "schema",
				schema: toJsonSchemaDocument(contract.schema).schema
			};
			case "ScreenshotByCaptureAndFormat": return {
				mode: "by-call-fields",
				selectors: ["call.capture.kind", "call.format"],
				variants: {
					viewport: {
						png: toJsonSchemaDocument(contract.schemas.viewport.png).schema,
						jpeg: toJsonSchemaDocument(contract.schemas.viewport.jpeg).schema
					},
					"full-page-tiles": {
						png: toJsonSchemaDocument(contract.schemas["full-page-tiles"].png).schema,
						jpeg: toJsonSchemaDocument(contract.schemas["full-page-tiles"].jpeg).schema
					}
				}
			};
		}
	};
	var operationResultProtocolContract = Object.fromEntries(Object.entries(OPERATION_CONTRACTS).map(([domain, contracts]) => [domain, Object.fromEntries(Object.entries(contracts).map(([operation, contract]) => [operation, {
		...resultDocument(contract.result),
		deadline: contract.deadline
	}]))]));
	//#endregion
	//#region src/protocol/schema.ts
	var optional = optionalKey;
	var NonBlankString = String$1.check(isPattern(/\S/));
	var SessionGroupTitle = NonBlankString.check(isMaxLength(80));
	var ConnectorId = String$1.check(isUUID(4));
	var ChromeExtensionId = String$1.check(isPattern(/^[a-p]{32}$/));
	var ConnectorSecret = String$1.check(isPattern(HEX_256_PATTERN));
	var ConnectorLabel = NonBlankString.check(isMaxLength(80));
	var DisplayVersion = NonBlankString.check(isMaxLength(64));
	var NonNegativeInt = Int.check(isGreaterThanOrEqualTo(0));
	var AdmittedCommandCount = Int.check(isBetween({
		minimum: 0,
		maximum: MAX_ADMITTED_COMMANDS_PER_CONNECTOR
	}));
	var Timestamp = NonNegativeInt;
	var ProtocolFingerprint = String$1.check(isPattern(HEX_256_PATTERN));
	var OwnerAuthenticationToken = String$1.check(isPattern(HEX_256_PATTERN));
	var ForwardTimeoutMs = Int.check(isBetween({
		minimum: 1,
		maximum: 3e5
	}));
	var SessionContext = Struct({
		key: NonBlankString,
		groupTitle: SessionGroupTitle,
		foreground: Boolean$1
	});
	var ConnectorIdentity = Struct({
		connectorId: ConnectorId,
		secret: ConnectorSecret,
		label: ConnectorLabel
	});
	var ConnectorRouteIdentity = Struct({
		connectorId: ConnectorId,
		extensionId: ChromeExtensionId,
		extensionDisplayVersion: DisplayVersion,
		protocolFingerprint: ProtocolFingerprint
	});
	var ProfileConnector = Struct({
		...ConnectorIdentity.fields,
		...ConnectorRouteIdentity.fields
	});
	var PublicConnector = Struct({
		...ConnectorRouteIdentity.fields,
		label: ConnectorLabel
	});
	var ConnectorCommandCountFields = {
		queuedCommands: AdmittedCommandCount,
		pendingCommands: AdmittedCommandCount
	};
	var admittedCommandCount = makeFilter((status) => status.queuedCommands + status.pendingCommands <= MAX_ADMITTED_COMMANDS_PER_CONNECTOR ? void 0 : `queuedCommands + pendingCommands exceeds ${MAX_ADMITTED_COMMANDS_PER_CONNECTOR}`);
	var ConnectorStatus = Struct({
		...PublicConnector.fields,
		connected: Boolean$1,
		lastSeenAt: optional(Timestamp),
		...ConnectorCommandCountFields
	}).check(admittedCommandCount);
	var BridgeStatusResponse = Struct({
		url: String$1,
		mode: Literals([
			"server",
			"client",
			"stopped",
			"closed"
		]),
		extensionExpectation: Struct({
			extensionId: ChromeExtensionId,
			displayVersion: DisplayVersion,
			protocolFingerprint: ProtocolFingerprint
		}),
		connector: optional(ConnectorStatus)
	});
	var CommandEnvelopeFields = {
		id: NonBlankString,
		session: SessionContext
	};
	var WireDomainRequest = Union([
		Struct({
			domain: Literal("tab"),
			call: TabCall
		}),
		Struct({
			domain: Literal("page"),
			call: PageCall
		}),
		Struct({
			domain: Literal("input"),
			call: InputCall
		}),
		Struct({
			domain: Literal("system"),
			call: SystemCall
		})
	]);
	var WireCommand = WireDomainRequest.mapMembers((members) => members.map((member) => Struct({
		...CommandEnvelopeFields,
		...member.fields
	})));
	var WireCommandRejected = Struct({
		_tag: Literal("CommandRejected"),
		code: String$1,
		message: String$1,
		details: optional(JsonValue)
	});
	var WireCommandOutcomeUnknown = Struct({
		_tag: Literal("CommandOutcomeUnknown"),
		message: String$1,
		cause: String$1
	});
	var WireCommandTerminalFailure = Union([WireCommandRejected, WireCommandOutcomeUnknown]);
	var WireResult = Union([Struct({
		id: NonBlankString,
		ok: Literal(true),
		value: JsonValue
	}), Struct({
		id: NonBlankString,
		ok: Literal(false),
		error: WireCommandTerminalFailure
	})]);
	var ForwardEnvelopeFields = {
		session: SessionContext,
		timeoutMs: ForwardTimeoutMs
	};
	var ForwardRequest = WireDomainRequest.mapMembers((members) => members.map((member) => Struct({
		...ForwardEnvelopeFields,
		...member.fields
	})));
	var WireBridgeFailure = Union([
		Struct({
			_tag: Literal("BridgeStopped"),
			message: String$1
		}),
		Struct({
			_tag: Literal("BridgeUnavailable"),
			message: String$1,
			cause: optional(String$1)
		}),
		Struct({
			_tag: Literal("ConnectorNotBound"),
			message: String$1
		}),
		Struct({
			_tag: Literal("ConnectorOffline"),
			connectorId: ConnectorId,
			message: String$1
		}),
		Struct({
			_tag: Literal("CommandTimeout"),
			message: String$1,
			timeoutMs: ForwardTimeoutMs
		}),
		WireCommandOutcomeUnknown,
		WireCommandRejected,
		Struct({
			_tag: Literal("ProtocolFailure"),
			message: String$1,
			cause: String$1
		})
	]);
	var ForwardResponse = Union([Struct({
		ok: Literal(true),
		value: JsonValue
	}), Struct({
		ok: Literal(false),
		error: WireBridgeFailure
	})]);
	var BridgeAuthenticationHandshake = Struct({
		bridgeDisplayVersion: DisplayVersion,
		protocolFingerprint: ProtocolFingerprint,
		bridgeEpoch: OwnerAuthenticationToken,
		requestNonce: OwnerAuthenticationToken,
		proof: OwnerAuthenticationToken
	});
	var PollResponse = Union([
		Struct({
			type: Literal("incompatible"),
			expectedExtensionId: ChromeExtensionId,
			expectedExtensionDisplayVersion: DisplayVersion,
			actualExtensionDisplayVersion: DisplayVersion,
			expectedProtocolFingerprint: ProtocolFingerprint,
			actualProtocolFingerprint: ProtocolFingerprint
		}),
		Struct({
			type: Literal("command"),
			command: WireCommand,
			expectedExtensionId: ChromeExtensionId,
			expectedExtensionDisplayVersion: DisplayVersion,
			expectedProtocolFingerprint: ProtocolFingerprint
		}),
		Struct({
			type: Literal("none"),
			expectedExtensionId: ChromeExtensionId,
			expectedExtensionDisplayVersion: DisplayVersion,
			expectedProtocolFingerprint: ProtocolFingerprint
		})
	]);
	var WireProtocolContract = Struct({
		bridgeStatus: BridgeStatusResponse,
		wireCommand: WireCommand,
		wireResult: WireResult,
		forwardRequest: ForwardRequest,
		forwardResponse: ForwardResponse,
		bridgeAuthenticationHandshake: BridgeAuthenticationHandshake,
		pollResponse: PollResponse
	});
	var toJsonSchema = (schema) => toJsonSchemaDocument(schema).schema;
	//#endregion
	//#region src/protocol/codec.ts
	var failDecode = (label) => (cause) => new ProtocolFailure({
		message: `Invalid ${label}`,
		cause
	});
	var decodeJson = (label, schema, text) => decodeUnknownEffect(fromJsonString(schema), { onExcessProperty: "error" })(text).pipe(mapError(failDecode(label)));
	var decodePollResponseJson = (text) => decodeJson("poll response", PollResponse, text);
	var decodeBridgeAuthenticationHandshakeJson = (text) => decodeJson("bridge authentication handshake", BridgeAuthenticationHandshake, text);
	var POLL_DIAGNOSTIC_LIMIT_CHARS = 2048;
	var POLL_RESPONSE_INVALID_CODE = "poll-response-invalid";
	var recoverPollCommandId = (value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return;
		if (value.type !== "command") return;
		const command = value.command;
		if (typeof command !== "object" || command === null || Array.isArray(command)) return;
		return typeof command.id === "string" && command.id.length > 0 ? command.id : void 0;
	};
	var summarizePollBodyForDiagnostic = (value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
		const summary = {};
		if (typeof value.type === "string") summary.type = value.type;
		const command = value.command;
		if (typeof command === "object" && command !== null && !Array.isArray(command)) {
			const commandSummary = {};
			if (typeof command.id === "string") commandSummary.id = command.id;
			if (typeof command.domain === "string") commandSummary.domain = command.domain;
			const call = command.call;
			if (typeof call === "object" && call !== null && !Array.isArray(call) && typeof call.op === "string") commandSummary.call = { op: call.op };
			if (Object.keys(commandSummary).length > 0) summary.command = commandSummary;
		}
		return summary;
	};
	var formatDiagnosticPathSegment = (segment) => typeof segment === "string" ? segment : typeof segment === "number" && Number.isFinite(segment) ? String(segment) : typeof segment === "symbol" ? segment.description ?? "symbol" : "_";
	var formatDiagnosticFieldPath = (path) => path.length === 0 ? "root" : path.map(formatDiagnosticPathSegment).join(".");
	var secretFreeSchemaLeafMessage = (tag) => {
		switch (tag) {
			case "InvalidType": return "Invalid type";
			case "InvalidValue": return "Invalid value";
			case "MissingKey": return "Missing key";
			case "UnexpectedKey": return "Unexpected key";
			case "Forbidden": return "Forbidden";
			case "OneOf": return "Expected exactly one member to match";
			case "Filter": return "Failed filter";
			default: return tag.length > 0 ? tag : "Schema issue";
		}
	};
	var collectSecretFreeSchemaIssues = (issue, path = []) => {
		switch (issue._tag) {
			case "Filter": {
				const nested = collectSecretFreeSchemaIssues(issue.issue, path);
				return nested.length > 0 ? nested : [{
					path,
					message: secretFreeSchemaLeafMessage("Filter")
				}];
			}
			case "Encoding": return collectSecretFreeSchemaIssues(issue.issue, path);
			case "Pointer": return collectSecretFreeSchemaIssues(issue.issue, [...path, ...issue.path]);
			case "Composite":
			case "AnyOf": return issue.issues.flatMap((child) => collectSecretFreeSchemaIssues(child, path));
			default: return [{
				path,
				message: secretFreeSchemaLeafMessage(issue._tag)
			}];
		}
	};
	var boundDiagnosticText = (text, limit = POLL_DIAGNOSTIC_LIMIT_CHARS) => text.length <= limit ? text : limit <= 1 ? "…" : `${text.slice(0, limit - 1)}…`;
	var formatPollDecodeDiagnostic = (issues, summary) => {
		const lines = issues.map((issue) => `${formatDiagnosticFieldPath(issue.path)}: ${issue.message}`);
		if (lines.length === 0) lines.push("root: Invalid poll response");
		lines.push(`summary: ${JSON.stringify(summary)}`);
		return boundDiagnosticText(lines.join("\n"));
	};
	var tryParsePollJson = (text) => {
		try {
			return {
				_tag: "ok",
				value: JSON.parse(text)
			};
		} catch {
			return { _tag: "invalid" };
		}
	};
	var protocolFailureSchemaIssue = (error) => {
		const cause = error.cause;
		if (cause !== void 0 && typeof cause === "object" && cause !== null && "_tag" in cause) return cause;
	};
	var toWireCommandTerminalFailure = (error) => {
		switch (error._tag) {
			case "CommandRejected": return {
				_tag: error._tag,
				code: error.code,
				message: error.message,
				...error.details === void 0 ? {} : { details: error.details }
			};
			case "CommandOutcomeUnknown": return {
				_tag: error._tag,
				message: error.message,
				cause: messageOf(error.cause)
			};
		}
	};
	var makeWireFailureResult = (id, error) => ({
		id,
		ok: false,
		error: toWireCommandTerminalFailure(error)
	});
	var connector_auth_default = {
		extensionPublicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxOM4CMNraddlpkOjrntKxTQZth8PQVBPo8fF3jMETPAecXJc1WMV58kG4MYkELqJI2PF2tNhsHLX6M013uPhqL1WEFpInAvX3v0+vMj+IeLWtyy5I/TR2AcRWnKi+UBn/x9chtZ/8iZF9iNXHu7gY8S4F9atScM1BvbpDJmYm48UDjV5YTTEOqLFonCdMEeW3l1EMSTM6uJ68aiXdemAAHzQbVd1Hu8TI5oawPyW3uPhe0clKN1r2O/lu7Xf/HOgo8OvArIfacICEdlcEoBR/WKxK7ENtwbEHQjqYUghjHLyLLuc1uk9ze9c2d6RRRFYmdVfJnwC8JOKccsE5Fb0FQIDAQAB",
		storageKey: "dshChromeConnectorIdentity",
		headers: {
			"id": "x-dsh-chrome-connector-id",
			"extensionId": "x-dsh-chrome-extension-id",
			"clientNonce": "x-dsh-chrome-connector-client-nonce",
			"bridgeEpoch": "x-dsh-chrome-connector-bridge-epoch",
			"requestNonce": "x-dsh-chrome-connector-request-nonce",
			"bodySha256": "x-dsh-chrome-connector-body-sha256",
			"proof": "x-dsh-chrome-connector-proof"
		},
		metadataHeaders: {
			"displayVersion": "x-dsh-chrome-extension-version",
			"protocolFingerprint": "x-dsh-chrome-protocol-fingerprint"
		}
	};
	//#endregion
	//#region src/protocol/bridge-authentication.ts
	var canonical = (parts) => JSON.stringify(parts);
	var serverProofMessage = (domain, identity, clientNonce, challenge, serverProtocolFingerprint) => canonical([
		HMAC_AUTHENTICATION.domains[domain],
		String(HMAC_AUTHENTICATION.algorithmVersion),
		...identity,
		clientNonce,
		challenge.bridgeEpoch,
		challenge.requestNonce,
		serverProtocolFingerprint
	]);
	var requestProofMessage = (domain, identity, challenge, clientProtocolFingerprint, method, path, bodyHash) => canonical([
		HMAC_AUTHENTICATION.domains[domain],
		String(HMAC_AUTHENTICATION.algorithmVersion),
		...identity,
		challenge.bridgeEpoch,
		challenge.requestNonce,
		clientProtocolFingerprint,
		method,
		path,
		bodyHash
	]);
	var connectorProofIdentity = (identity) => [
		identity.connectorId,
		identity.extensionId,
		identity.extensionDisplayVersion,
		identity.protocolFingerprint
	];
	var connectorServerProofMessage = (domain, identity, clientNonce, challenge, serverProtocolFingerprint) => serverProofMessage(domain, connectorProofIdentity(identity), clientNonce, challenge, serverProtocolFingerprint);
	var connectorRequestProofMessage = (domain, identity, challenge, method, path, bodyHash) => requestProofMessage(domain, connectorProofIdentity(identity), challenge, identity.protocolFingerprint, method, path, bodyHash);
	var protocolContractChallenge = {
		bridgeEpoch: "bridge-epoch",
		requestNonce: "request-nonce"
	};
	var protocolContractConnector = {
		connectorId: "connector-id",
		extensionId: "extension-id",
		extensionDisplayVersion: "extension-display-version",
		protocolFingerprint: "client-protocol-fingerprint"
	};
	var authenticationMessageProtocolContract = {
		ownerServerProof: serverProofMessage("ownerServerProof", [], "client-nonce", protocolContractChallenge, "server-protocol-fingerprint"),
		ownerRequestProof: requestProofMessage("ownerRequestProof", [], protocolContractChallenge, "client-protocol-fingerprint", "METHOD", "/path", "body-hash"),
		connectorServerProof: connectorServerProofMessage("connectorServerProof", protocolContractConnector, "client-nonce", protocolContractChallenge, "server-protocol-fingerprint"),
		connectorRequestProof: connectorRequestProofMessage("connectorRequestProof", protocolContractConnector, protocolContractChallenge, "METHOD", "/path", "body-hash")
	};
	var decodeHex = (value) => {
		if (value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) return;
		const bytes = new Uint8Array(value.length / 2);
		for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
		return bytes;
	};
	var encodeHex = (value) => Array.from(value instanceof Uint8Array ? value : new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
	//#endregion
	//#region src/protocol/evaluation-value-contract.ts
	var EVALUATION_VALUE_CONTRACT = {
		algorithmVersion: 2,
		marker: {
			tag: "PiChromeEvaluationMarker",
			kinds: {
				arrayHole: "ArrayHole",
				bigint: "BigInt",
				circularReference: "CircularReference",
				collectionLimit: "CollectionLimit",
				depthLimit: "DepthLimit",
				error: "Error",
				function: "Function",
				keyTruncated: "KeyTruncated",
				negativeZero: "NegativeZero",
				nodeLimit: "NodeLimit",
				nonFiniteNumber: "NonFiniteNumber",
				nonPlainObject: "NonPlainObject",
				objectEntryProjection: "ObjectEntryProjection",
				propertyAccessError: "PropertyAccessError",
				sharedReference: "SharedReference",
				stringTruncated: "StringTruncated",
				symbol: "Symbol",
				symbolKey: "SymbolKey",
				undefined: "Undefined",
				uninspectableObject: "UninspectableObject"
			}
		},
		limits: {
			nodes: 512,
			depth: 12,
			collectionEntries: 128,
			stringLength: 2e3,
			keyLength: 256
		},
		rendering: {
			nonFiniteNumbers: {
				nan: "NaN",
				positiveInfinity: "Infinity",
				negativeInfinity: "-Infinity"
			},
			arrayCollectionName: "Array",
			unprintableError: "[unprintable error]"
		},
		plainObjectPolicy: {
			properties: "own-enumerable-string-keys",
			outputPrototype: "null"
		},
		nonPlainObjectPolicy: {
			shape: "marker-with-constructor-name-object-tag-and-projected-properties",
			properties: "plain-object-policy"
		},
		referencePolicy: {
			identity: "depth-first-first-seen",
			subjects: "objects-and-functions-before-type-projection",
			circular: "active-reference-marker",
			shared: "inactive-reference-marker",
			projectedMarkers: "carry-reference-id-after-allocation"
		},
		keyPolicy: {
			order: "string-keys-then-symbol-keys",
			symbol: "entry-projection",
			oversized: "entry-projection",
			overflow: "collection-limit-marker"
		},
		arrayPolicy: {
			holes: "array-hole-marker",
			overflow: "trailing-collection-limit-marker"
		},
		domRectPolicy: {
			detection: "numeric-geometry-and-to-json-or-no-enumerable-strings",
			fields: [
				"x",
				"y",
				"width",
				"height",
				"top",
				"right",
				"bottom",
				"left"
			]
		}
	};
	//#endregion
	//#region src/protocol/protocol-fingerprint.ts
	var ProtocolFingerprintFailure = class extends TaggedError("ProtocolFingerprintFailure") {};
	var JSON_SCHEMA_ANNOTATIONS = /* @__PURE__ */ new Set([
		"$comment",
		"default",
		"deprecated",
		"description",
		"examples",
		"readOnly",
		"title",
		"writeOnly"
	]);
	var JSON_SCHEMA_MAPS = /* @__PURE__ */ new Set([
		"$defs",
		"definitions",
		"dependentSchemas",
		"patternProperties",
		"properties"
	]);
	var JSON_SCHEMA_MEMBERS = /* @__PURE__ */ new Set([
		"additionalProperties",
		"contains",
		"contentSchema",
		"else",
		"if",
		"items",
		"not",
		"propertyNames",
		"then",
		"unevaluatedItems",
		"unevaluatedProperties"
	]);
	var JSON_SCHEMA_SET_ARRAYS = /* @__PURE__ */ new Set([
		"allOf",
		"anyOf",
		"enum",
		"oneOf",
		"required",
		"type"
	]);
	var canonicalize = (value) => {
		if (Array.isArray(value)) return value.map(canonicalize);
		if (typeof value !== "object" || value === null) return value;
		return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
	};
	var canonicalJson = (value) => JSON.stringify(canonicalize(value));
	var semanticJsonSchema = (value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
		return Object.fromEntries(Object.entries(value).flatMap(([key, member]) => {
			if (JSON_SCHEMA_ANNOTATIONS.has(key)) return [];
			if (JSON_SCHEMA_MAPS.has(key) && typeof member === "object" && member !== null) return [[key, Object.fromEntries(Object.entries(member).map(([name, child]) => [name, semanticJsonSchema(child)]))]];
			if (JSON_SCHEMA_MEMBERS.has(key)) return [[key, semanticJsonSchema(member)]];
			if (key === "prefixItems" && Array.isArray(member)) return [[key, member.map(semanticJsonSchema)]];
			if ((key === "allOf" || key === "anyOf" || key === "oneOf") && Array.isArray(member)) return [[key, member.map(semanticJsonSchema).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))]];
			if (JSON_SCHEMA_SET_ARRAYS.has(key) && Array.isArray(member)) return [[key, member.map(canonicalize).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))]];
			return [[key, canonicalize(member)]];
		}));
	};
	var operationResultSemantics = (value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
		return Object.fromEntries(Object.entries(value).map(([domain, operations]) => [domain, typeof operations !== "object" || operations === null || Array.isArray(operations) ? operations : Object.fromEntries(Object.entries(operations).map(([operation, contract]) => {
			if (typeof contract !== "object" || contract === null || Array.isArray(contract)) return [operation, contract];
			const projected = contract;
			if (projected.mode === "schema") return [operation, {
				...projected,
				schema: semanticJsonSchema(projected.schema)
			}];
			if (projected.mode === "by-call-fields") {
				const variants = projected.variants;
				return [operation, {
					...projected,
					variants: Object.fromEntries(Object.entries(variants).map(([capture, formats]) => [capture, Object.fromEntries(Object.entries(formats).map(([format, schema]) => [format, semanticJsonSchema(schema)]))]))
				}];
			}
			return [operation, projected];
		}))]));
	};
	var semanticProtocolProjection = (contract) => {
		if (typeof contract !== "object" || contract === null || Array.isArray(contract)) return contract;
		const value = contract;
		return {
			...value,
			...Object.hasOwn(value, "wire") ? { wire: semanticJsonSchema(value.wire) } : {},
			...Object.hasOwn(value, "operationResults") ? { operationResults: operationResultSemantics(value.operationResults) } : {}
		};
	};
	var canonicalProtocolContractFor = (contract) => gen(function* () {
		const canonical = yield* try_({
			try: () => JSON.stringify(canonicalize(semanticProtocolProjection(contract))),
			catch: (cause) => new ProtocolFingerprintFailure({
				message: "Protocol contract cannot be serialized canonically",
				cause
			})
		});
		if (canonical === void 0) return yield* new ProtocolFingerprintFailure({ message: "Protocol contract did not produce canonical JSON" });
		return canonical;
	});
	var fingerprintCanonicalProtocolContract = (canonical) => gen(function* () {
		const digest = yield* tryPromise({
			try: () => globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)),
			catch: (cause) => new ProtocolFingerprintFailure({
				message: "Protocol contract fingerprint could not be computed",
				cause
			})
		});
		return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	});
	var protocolFingerprint = try_({
		try: () => ({
			wire: toJsonSchema(WireProtocolContract),
			operationResults: operationResultProtocolContract,
			evaluationValues: EVALUATION_VALUE_CONTRACT,
			authenticationMessages: authenticationMessageProtocolContract,
			browserCompanion: BROWSER_COMPANION_CONTRACT,
			bridge: bridge_default,
			connectorAuthentication: connector_auth_default
		}),
		catch: (cause) => new ProtocolFingerprintFailure({
			message: "Wire protocol contract could not be projected",
			cause
		})
	}).pipe(flatMap(canonicalProtocolContractFor)).pipe(flatMap(fingerprintCanonicalProtocolContract));
	//#endregion
	//#region src/browser/command-journal.ts
	var COMMAND_JOURNAL_STORAGE_KEY = "dshChromeCommandJournal";
	var COMMAND_JOURNAL_VERSION = 1;
	var StableJournalEnvelope = Struct({
		version: Literal(COMMAND_JOURNAL_VERSION),
		protocolFingerprint: ProtocolFingerprint,
		commandId: NonEmptyString,
		state: Literals(["executing", "result"]),
		payload: Unknown
	});
	var ExecutingPayload = Struct({ command: WireCommand });
	var ResultPayload = Union([Struct({
		kind: Literal("current"),
		command: WireCommand,
		result: WireResult
	}), Struct({
		kind: Literal("recovered"),
		result: WireResult
	})]);
	var CommandJournalFailure = class extends TaggedError("CommandJournalFailure") {};
	var failure$1 = (operation, message) => (cause) => new CommandJournalFailure({
		operation,
		message,
		cause
	});
	var currentFingerprint = (operation) => protocolFingerprint.pipe(mapError(failure$1(operation, "Could not compute the command journal protocol fingerprint")));
	var persist$1 = (entry) => tryPromise({
		try: () => chrome.storage.local.set({ [COMMAND_JOURNAL_STORAGE_KEY]: entry }),
		catch: failure$1("save", "Could not persist the Chrome command journal")
	});
	var remove = tryPromise({
		try: () => chrome.storage.local.remove(COMMAND_JOURNAL_STORAGE_KEY),
		catch: failure$1("clear", "Could not clear the Chrome command journal")
	});
	var decodeAttempt = (schema, value) => decodeUnknownEffect(schema, { onExcessProperty: "error" })(value).pipe(match({
		onFailure: (cause) => ({
			_tag: "Invalid",
			cause
		}),
		onSuccess: (decoded) => ({
			_tag: "Valid",
			decoded
		})
	}));
	var extractCommandId = (value) => {
		if (typeof value !== "object" || value === null || !("commandId" in value)) return void 0;
		return typeof value.commandId === "string" && value.commandId.length > 0 ? value.commandId : void 0;
	};
	var outcomeUnknown = (commandId, reason) => makeWireFailureResult(commandId, new CommandOutcomeUnknown({
		message: `Chrome command ${commandId} was interrupted or its durable contract changed. The operation may have completed and will not be repeated.`,
		cause: reason
	}));
	var recoveredEnvelope = (commandId, fingerprint, reason) => {
		const result = outcomeUnknown(commandId, reason);
		return {
			envelope: {
				version: COMMAND_JOURNAL_VERSION,
				protocolFingerprint: fingerprint,
				commandId,
				state: "result",
				payload: {
					kind: "recovered",
					result
				}
			},
			entry: {
				state: "result",
				result
			}
		};
	};
	var recover = (commandId, fingerprint, reason) => {
		const recovered = recoveredEnvelope(commandId, fingerprint, reason);
		return persist$1(recovered.envelope).pipe(as(recovered.entry));
	};
	var loadCurrentResult = (envelope, fingerprint) => gen(function* () {
		const payload = yield* decodeAttempt(ResultPayload, envelope.payload);
		if (payload._tag === "Invalid") return yield* recover(envelope.commandId, fingerprint, "current result payload could not be decoded");
		const decoded = payload.decoded;
		if (decoded.result.id !== envelope.commandId) return yield* recover(envelope.commandId, fingerprint, "journal envelope and result ids disagree");
		if (decoded.kind === "recovered") return decoded.result.ok || decoded.result.error._tag !== "CommandOutcomeUnknown" ? yield* recover(envelope.commandId, fingerprint, "recovered journal payload was not an outcome-unknown result") : {
			state: "result",
			result: decoded.result
		};
		if (decoded.command.id !== envelope.commandId) return yield* recover(envelope.commandId, fingerprint, "journal envelope and command ids disagree");
		if (!decoded.result.ok) return {
			state: "result",
			result: decoded.result
		};
		const validated = yield* validateOperationSuccess(decoded.command, decoded.result.value).pipe(match({
			onFailure: () => ({ ok: false }),
			onSuccess: (value) => ({
				ok: true,
				value
			})
		}));
		if (!validated.ok) return yield* recover(envelope.commandId, fingerprint, "successful journal result does not match its command contract");
		return {
			state: "result",
			result: {
				...decoded.result,
				value: validated.value
			}
		};
	});
	var loadCommandJournal = gen(function* () {
		const value = (yield* tryPromise({
			try: () => chrome.storage.local.get(COMMAND_JOURNAL_STORAGE_KEY),
			catch: failure$1("load", "Could not read the Chrome command journal")
		}))[COMMAND_JOURNAL_STORAGE_KEY];
		if (value === void 0) return void 0;
		const fingerprint = yield* currentFingerprint("load");
		const commandId = extractCommandId(value);
		if (!commandId) {
			yield* logWarning("dsh-chrome cleared an unrecoverable command journal without a stable command id");
			yield* remove;
			return;
		}
		const decoded = yield* decodeAttempt(StableJournalEnvelope, value);
		if (decoded._tag === "Invalid") return yield* recover(commandId, fingerprint, "stable journal envelope is invalid");
		const envelope = decoded.decoded;
		if (envelope.protocolFingerprint !== fingerprint) return yield* recover(commandId, fingerprint, "journal protocol fingerprint changed");
		if (envelope.state === "executing") {
			const payload = yield* decodeAttempt(ExecutingPayload, envelope.payload);
			return yield* recover(commandId, fingerprint, payload._tag === "Valid" && payload.decoded.command.id === commandId ? "MV3 worker stopped during command execution" : "executing journal payload is invalid");
		}
		return yield* loadCurrentResult(envelope, fingerprint);
	});
	var recordCommandExecuting = (command) => currentFingerprint("save").pipe(flatMap((fingerprint) => persist$1({
		version: COMMAND_JOURNAL_VERSION,
		protocolFingerprint: fingerprint,
		commandId: command.id,
		state: "executing",
		payload: { command }
	})));
	var resultForCommand = (command, result) => {
		if (result.id !== command.id) return fail(new CommandJournalFailure({
			operation: "save",
			message: "Could not persist a result for a different Chrome command",
			cause: {
				commandId: command.id,
				resultId: result.id
			}
		}));
		if (!result.ok) return succeed(result);
		return validateOperationSuccess(command, result.value).pipe(map((value) => ({
			...result,
			value
		})), catch_((cause) => succeed(outcomeUnknown(command.id, `successful browser result violated its operation or JSON contract: ${cause.message}`))));
	};
	var transportSafeResult = (commandId, result) => encodeJsonTransport("Chrome wire result", WireResult, result).pipe(match({
		onFailure: (cause) => outcomeUnknown(commandId, cause.message),
		onSuccess: ({ value }) => value
	}));
	var recordCommandResult = (command, result) => gen(function* () {
		const validated = yield* resultForCommand(command, result);
		const durable = yield* transportSafeResult(command.id, validated);
		yield* persist$1({
			version: COMMAND_JOURNAL_VERSION,
			protocolFingerprint: yield* currentFingerprint("save"),
			commandId: command.id,
			state: "result",
			payload: {
				kind: "current",
				command,
				result: durable
			}
		});
	});
	var clearCommandJournal = remove;
	//#endregion
	//#region src/browser/browser-command-failure.ts
	var BrowserRejected = class extends Error {
		name = "BrowserRejected";
		code;
		details;
		constructor(message, options = {}) {
			super(message, options.cause === void 0 ? void 0 : { cause: options.cause });
			this.code = options.code ?? "browser-operation";
			if (options.details !== void 0) this.details = options.details;
		}
	};
	var BrowserOutcomeUnknown = class extends Error {
		name = "BrowserOutcomeUnknown";
	};
	var makeBrowserFailureResult = (commandId, error) => error instanceof BrowserOutcomeUnknown ? makeWireFailureResult(commandId, new CommandOutcomeUnknown({
		message: error.message,
		cause: error.cause
	})) : makeWireFailureResult(commandId, new CommandRejected({
		code: error.code,
		message: error.message,
		...error.details === void 0 ? {} : { details: error.details }
	}));
	//#endregion
	//#region src/browser/connector-runtime-step.ts
	var settleBrowserCommand = (command, dispatch) => tryPromise({
		try: () => dispatch(command),
		catch: (cause) => cause instanceof BrowserRejected || cause instanceof BrowserOutcomeUnknown ? cause : new BrowserRejected(cause instanceof Error ? cause.message : String(cause), { cause })
	}).pipe(matchEffect({
		onFailure: (error) => succeed(makeBrowserFailureResult(command.id, error)),
		onSuccess: (value) => validateOperationSuccess(command, value).pipe(match({
			onFailure: (cause) => makeBrowserFailureResult(command.id, new BrowserOutcomeUnknown(`Browser operation ${command.domain} returned a value outside its result contract. It may have changed Chrome and will not be repeated.`, { cause })),
			onSuccess: (validated) => ({
				id: command.id,
				ok: true,
				value: validated
			})
		}))
	}));
	var connectorRuntimeStep = (port) => uninterruptibleMask((restore) => gen(function* () {
		const connector = yield* restore(port.loadConnector);
		const journal = yield* restore(port.loadJournal);
		if (journal) {
			yield* restore(port.deliverResult(journal.result, connector));
			yield* port.clearJournal;
			return;
		}
		const command = yield* restore(port.receiveCommand(connector));
		if (!command) return;
		yield* port.recordExecuting(command);
		const result = yield* port.executeCommand(command);
		yield* port.recordResult(command, result);
	}));
	connector_auth_default.extensionPublicKey;
	var CONNECTOR_ID_HEADER = connector_auth_default.headers.id;
	var CONNECTOR_EXTENSION_ID_HEADER = connector_auth_default.headers.extensionId;
	var CONNECTOR_CLIENT_NONCE_HEADER = connector_auth_default.headers.clientNonce;
	var CONNECTOR_BRIDGE_EPOCH_HEADER = connector_auth_default.headers.bridgeEpoch;
	var CONNECTOR_REQUEST_NONCE_HEADER = connector_auth_default.headers.requestNonce;
	var CONNECTOR_BODY_SHA256_HEADER = connector_auth_default.headers.bodySha256;
	var CONNECTOR_PROOF_HEADER = connector_auth_default.headers.proof;
	var CONNECTOR_DISPLAY_VERSION_METADATA_HEADER = connector_auth_default.metadataHeaders.displayVersion;
	var CONNECTOR_PROTOCOL_FINGERPRINT_HEADER = connector_auth_default.metadataHeaders.protocolFingerprint;
	[
		"content-type",
		CONNECTOR_ID_HEADER,
		CONNECTOR_EXTENSION_ID_HEADER,
		CONNECTOR_CLIENT_NONCE_HEADER,
		CONNECTOR_BRIDGE_EPOCH_HEADER,
		CONNECTOR_REQUEST_NONCE_HEADER,
		CONNECTOR_BODY_SHA256_HEADER,
		CONNECTOR_PROOF_HEADER,
		CONNECTOR_DISPLAY_VERSION_METADATA_HEADER,
		CONNECTOR_PROTOCOL_FINGERPRINT_HEADER
	].join(",");
	var CONNECTOR_STORAGE_KEY = connector_auth_default.storageKey;
	//#endregion
	//#region src/browser/bridge-authentication.ts
	var BrowserBridgeAuthenticationFailure = class extends TaggedError("BrowserBridgeAuthenticationFailure") {};
	var failure = (message, cause) => new BrowserBridgeAuthenticationFailure({
		message,
		cause
	});
	var webCryptoDigest = { sha256: "SHA-256" }[HMAC_AUTHENTICATION.digest];
	var authenticationKey = (secret) => {
		if (HMAC_AUTHENTICATION.keyEncoding !== "hex") return fail(failure("Bridge HMAC key encoding is unsupported"));
		const bytes = decodeHex(secret);
		if (!bytes) return fail(failure("Bridge HMAC key is malformed"));
		if (!webCryptoDigest) return fail(failure("Bridge HMAC digest is unsupported"));
		const keyBytes = new Uint8Array(bytes.byteLength);
		keyBytes.set(bytes);
		return tryPromise({
			try: () => globalThis.crypto.subtle.importKey("raw", keyBytes, {
				name: "HMAC",
				hash: webCryptoDigest
			}, false, ["sign"]),
			catch: (cause) => failure("Could not import the bridge HMAC key", cause)
		});
	};
	var freshBridgeClientNonce = () => encodeHex(globalThis.crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)));
	var hashBrowserRequestBody = (body) => webCryptoDigest ? tryPromise({
		try: () => globalThis.crypto.subtle.digest(webCryptoDigest, new TextEncoder().encode(body)),
		catch: (cause) => failure("Could not hash the bridge request body", cause)
	}).pipe(map(encodeHex)) : fail(failure("Bridge HMAC digest is unsupported"));
	var browserHmacProof = (secret, message) => gen(function* () {
		const key = yield* authenticationKey(secret);
		return encodeHex(yield* tryPromise({
			try: () => globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
			catch: (cause) => failure("Could not sign the bridge authentication proof", cause)
		}));
	});
	var hasValidBrowserHmacProof = (secret, message, actual) => browserHmacProof(secret, message).pipe(map((expected) => {
		if (actual.length !== expected.length) return false;
		let difference = 0;
		for (let index = 0; index < expected.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
		return difference === 0;
	}));
	//#endregion
	//#region src/browser/connector-http.ts
	var ConnectorHttpFailure = class extends TaggedError("ConnectorHttpFailure") {};
	var connectorHeaders = (connector) => ({
		[CONNECTOR_ID_HEADER]: connector.connectorId,
		[CONNECTOR_EXTENSION_ID_HEADER]: connector.extensionId,
		[CONNECTOR_DISPLAY_VERSION_METADATA_HEADER]: connector.extensionDisplayVersion,
		[CONNECTOR_PROTOCOL_FINGERPRINT_HEADER]: connector.protocolFingerprint
	});
	var requestHeaders = (initial, connector, authentication = {}) => {
		const headers = new Headers(initial);
		headers.set(CONNECTOR_EXTENSION_ID_HEADER, chrome.runtime.id);
		for (const [name, value] of Object.entries({
			...connectorHeaders(connector),
			...authentication
		})) headers.set(name, value);
		return headers;
	};
	var responseTooLarge = (limitBytes) => new ConnectorHttpFailure({
		code: "bridge-response-too-large",
		message: `Bridge response exceeds ${limitBytes} bytes`
	});
	var cancelResponseBody = (body) => tryPromise({
		try: () => body.cancel(),
		catch: (cause) => new ConnectorHttpFailure({
			code: "bridge-response-cancel",
			message: "Could not cancel bridge response body",
			cause
		})
	}).pipe(catch_((error) => logWarning("dsh-chrome failed to cancel bridge response body", error.message)));
	var readResponseText = (response, limitBytes) => {
		const declaredLength = Number(response.headers.get("content-length"));
		if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
			const failure = responseTooLarge(limitBytes);
			return response.body ? cancelResponseBody(response.body).pipe(andThen(fail(failure))) : fail(failure);
		}
		if (!response.body) return succeed("");
		const body = response.body;
		return callback((resume) => {
			let finished = false;
			const finish = (effect) => {
				if (finished) return;
				finished = true;
				resume(effect);
			};
			response.text().then((text) => {
				if (text.length > limitBytes) {
					finish(fail(responseTooLarge(limitBytes)));
					return;
				}
				finish(succeed(text));
			}, (cause) => finish(fail(new ConnectorHttpFailure({
				code: "bridge-response-read",
				message: "Could not read bridge response body",
				cause
			}))));
			return sync(() => {
				finished = true;
			}).pipe(andThen(cancelResponseBody(body)), catch_((cause) => logWarning("dsh-chrome failed to cancel bridge response body", String(cause))));
		});
	};
	var bridgeRequest = (routeName, init, connector, authentication, timeoutMs) => {
		const route = BRIDGE_ROUTES[routeName];
		return tryPromise({
			try: (signal) => fetch(`http://127.0.0.1:17401${route.path}`, {
				...init,
				method: route.method,
				cache: "no-store",
				headers: requestHeaders(init.headers, connector, authentication),
				signal
			}),
			catch: (cause) => new ConnectorHttpFailure({
				code: "bridge-unavailable",
				message: `Could not reach http://127.0.0.1:17401`,
				cause
			})
		}).pipe(flatMap((response) => readResponseText(response, responseBodyLimitForRoute(routeName)).pipe(map((text) => ({
			status: response.status,
			text
		})))), timeoutOrElse({
			duration: `${timeoutMs} millis`,
			orElse: () => fail(new ConnectorHttpFailure({
				code: "bridge-timeout",
				message: `Timed out after ${timeoutMs}ms waiting for http://127.0.0.1:17401${route.path}`
			}))
		}));
	};
	var authenticationFailure = (cause) => cause instanceof ConnectorHttpFailure ? cause : new ConnectorHttpFailure({
		code: "bridge-authentication",
		message: "Could not authenticate the local Chrome bridge",
		cause
	});
	var authenticatedRequest = (routeName, connector, init, timeoutMs) => gen(function* () {
		const clientNonce = freshBridgeClientNonce();
		const handshake = yield* decodeBridgeAuthenticationHandshakeJson(yield* requireConnectorSuccess(yield* bridgeRequest("connectorHandshake", {
			headers: { "content-type": "application/json" },
			body: JSON.stringify(connector)
		}, connector, { [CONNECTOR_CLIENT_NONCE_HEADER]: clientNonce }, AUTHENTICATION_HANDSHAKE_DEADLINE_MS)));
		const challenge = {
			bridgeEpoch: handshake.bridgeEpoch,
			requestNonce: handshake.requestNonce
		};
		const serverMessage = connectorServerProofMessage("connectorServerProof", connector, clientNonce, challenge, handshake.protocolFingerprint);
		if (!(yield* hasValidBrowserHmacProof(connector.secret, serverMessage, handshake.proof))) return yield* new ConnectorHttpFailure({
			code: "bridge-listener-authentication",
			message: "Local bridge listener did not prove connector credential possession"
		});
		const bodyHash = yield* hashBrowserRequestBody(init.body ?? "");
		const route = BRIDGE_ROUTES[routeName];
		const proof = yield* browserHmacProof(connector.secret, connectorRequestProofMessage("connectorRequestProof", connector, challenge, route.method, route.path, bodyHash));
		return yield* bridgeRequest(routeName, init, connector, {
			[CONNECTOR_BRIDGE_EPOCH_HEADER]: challenge.bridgeEpoch,
			[CONNECTOR_REQUEST_NONCE_HEADER]: challenge.requestNonce,
			[CONNECTOR_BODY_SHA256_HEADER]: bodyHash,
			[CONNECTOR_PROOF_HEADER]: proof
		}, timeoutMs);
	}).pipe(mapError(authenticationFailure), timeoutOrElse({
		duration: `${timeoutMs} millis`,
		orElse: () => fail(new ConnectorHttpFailure({
			code: "bridge-timeout",
			message: `Timed out after ${timeoutMs}ms authenticating http://127.0.0.1:17401${BRIDGE_ROUTES[routeName].path}`
		}))
	}));
	var connectorRequest = (routeName, init, connector, timeoutMs = CONNECTOR_REQUEST_DEADLINE_MS) => authenticatedRequest(routeName, connector, init, timeoutMs);
	var requireConnectorSuccess = (response) => response.status >= 200 && response.status < 300 ? succeed(response.text) : fail(new ConnectorHttpFailure({
		code: "bridge-http",
		message: `Bridge returned HTTP ${response.status}: ${response.text}`,
		status: response.status
	}));
	TaggedError("ConnectorIdentityMessageFailure");
	var isConnectorIdentityRequest = (value) => {
		if (typeof value !== "object" || value === null || !("type" in value)) return false;
		if (value.type === "dsh-chrome/connector/load") return true;
		return value.type === "dsh-chrome/connector/rename" && "label" in value && typeof value.label === "string";
	};
	var isAutomationRecoveryRequest = (value) => {
		if (typeof value !== "object" || value === null || !("type" in value)) return false;
		return value.type === "dsh-chrome/automation/stale-status" || value.type === "dsh-chrome/automation/clear-stale";
	};
	//#endregion
	//#region src/browser/connector-identity.ts
	var ConnectorIdentityFailure = class extends TaggedError("ConnectorIdentityFailure") {};
	var readStored = tryPromise({
		try: () => chrome.storage.local.get(CONNECTOR_STORAGE_KEY),
		catch: (cause) => new ConnectorIdentityFailure({
			message: "Could not read profile connector identity",
			cause
		})
	});
	var persist = (identity) => tryPromise({
		try: () => chrome.storage.local.set({ [CONNECTOR_STORAGE_KEY]: identity }),
		catch: (cause) => new ConnectorIdentityFailure({
			message: "Could not persist profile connector identity",
			cause
		})
	});
	var decodeStored = (value) => decodeUnknownEffect(ConnectorIdentity, { onExcessProperty: "error" })(value).pipe(mapError((cause) => new ConnectorIdentityFailure({
		message: "Stored profile connector identity is invalid",
		cause
	})));
	var makeIdentity = () => {
		const connectorId = globalThis.crypto.randomUUID();
		return {
			connectorId,
			secret: Array.from(globalThis.crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""),
			label: `Chrome ${connectorId.slice(0, 8)}`
		};
	};
	var projectProfileConnector = (identity) => succeed({
		...identity,
		extensionId: chrome.runtime.id,
		extensionDisplayVersion: chrome.runtime.getManifest().version,
		protocolFingerprint: "5cdf33d5c0f5594efe5917af839023d6b06fd3e59d05924bbc62ed204de4d0ce"
	}).pipe(flatMap(decodeUnknownEffect(ProfileConnector)), mapError((cause) => cause instanceof ConnectorIdentityFailure ? cause : new ConnectorIdentityFailure({
		message: "Live connector metadata is invalid",
		cause
	})));
	var ConnectorIdentityOwner = class ConnectorIdentityOwner {
		current;
		lock;
		constructor(current, lock) {
			this.current = current;
			this.lock = lock;
		}
		static makeUnsafe = () => new ConnectorIdentityOwner(makeUnsafe(void 0), makeUnsafe$1(1));
		get loadUnlocked() {
			return gen({ self: this }, function* () {
				return yield* projectProfileConnector((yield* get(this.current)) ?? (yield* gen({ self: this }, function* () {
					const stored = (yield* readStored)[CONNECTOR_STORAGE_KEY];
					const loaded = stored === void 0 ? yield* this.create : yield* decodeStored(stored);
					yield* set(this.current, loaded);
					return loaded;
				})));
			});
		}
		get load() {
			return this.lock.withPermits(1)(this.loadUnlocked);
		}
		rename(label) {
			return this.lock.withPermits(1)(gen({ self: this }, function* () {
				const normalized = label.replaceAll(/\s+/g, " ").trim().slice(0, 80);
				if (!normalized) return yield* new ConnectorIdentityFailure({ message: "Connector label cannot be empty" });
				const connector = yield* this.loadUnlocked;
				const updated = {
					connectorId: connector.connectorId,
					secret: connector.secret,
					label: normalized
				};
				yield* persist(updated);
				yield* set(this.current, updated);
				return yield* projectProfileConnector(updated);
			}));
		}
		get create() {
			const identity = makeIdentity();
			return persist(identity).pipe(as(identity));
		}
	};
	//#endregion
	//#region src/browser/runtime-loop-owner.ts
	var RuntimeLoopOwner = class RuntimeLoopOwner {
		runtime;
		fork;
		transitionLock;
		fiber;
		constructor(runtime, fork, transitionLock) {
			this.runtime = runtime;
			this.fork = fork;
			this.transitionLock = transitionLock;
		}
		static makeUnsafe(runtime, fork) {
			return new RuntimeLoopOwner(runtime, fork, makeUnsafe$1(1));
		}
		get start() {
			return this.transitionLock.withPermits(1)(sync(() => {
				if (!this.fiber) this.fiber = this.fork(this.runtime);
			}));
		}
		get restart() {
			return this.transitionLock.withPermits(1)(gen({ self: this }, function* () {
				if (this.fiber) yield* interrupt(this.fiber);
				this.fiber = this.fork(this.runtime);
			}));
		}
		get stop() {
			return this.transitionLock.withPermits(1)(gen({ self: this }, function* () {
				const fiber = this.fiber;
				this.fiber = void 0;
				if (fiber) yield* interrupt(fiber);
			}));
		}
	};
	//#endregion
	//#region src/browser/injected/action-core.ts
	function getPiChromeState() {
		const state = window.__DSH_CHROME_STATE__ || {
			nextElementUid: 1,
			nextFrontierUid: 1,
			refs: /* @__PURE__ */ new Map(),
			console: [],
			network: [],
			nextRequestId: 1,
			instrumentationInstalled: false,
			lastSnapshotDigest: null
		};
		window.__DSH_CHROME_STATE__ = state;
		return state;
	}
	//#endregion
	//#region src/browser/injected/action-instrumentation.ts
	function installPiChromeInstrumentation() {
		const CONSOLE_ENTRY_LIMIT = 80;
		const CONSOLE_ARGUMENT_LIMIT = 8;
		const CONSOLE_ARGUMENT_CHAR_LIMIT = 512;
		const CONSOLE_VALUE_CHAR_LIMIT = 256;
		const CONSOLE_VALUE_NODE_LIMIT = 64;
		const CONSOLE_VALUE_DEPTH_LIMIT = 4;
		const NETWORK_ENTRY_LIMIT = 40;
		const NETWORK_BODY_CHAR_LIMIT = 8e3;
		const NETWORK_URL_CHAR_LIMIT = 1024;
		const NETWORK_HEADER_LIMIT = 24;
		const NETWORK_HEADER_NAME_CHAR_LIMIT = 64;
		const NETWORK_HEADER_VALUE_CHAR_LIMIT = 256;
		const NETWORK_HEADER_TEXT_CHAR_LIMIT = 4096;
		const NETWORK_ERROR_CHAR_LIMIT = 512;
		const state = window.__DSH_CHROME_STATE__ || {
			nextElementUid: 1,
			nextFrontierUid: 1,
			refs: /* @__PURE__ */ new Map(),
			console: [],
			network: [],
			nextRequestId: 1,
			instrumentationInstalled: false,
			lastSnapshotDigest: null
		};
		window.__DSH_CHROME_STATE__ = state;
		if (state.instrumentationInstalled) return;
		state.instrumentationInstalled = true;
		const boundedText = (value, limit) => {
			let text;
			try {
				text = String(value);
			} catch {
				text = "[unprintable]";
			}
			return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
		};
		const serializeConsoleArgument = (argument) => {
			let remainingNodes = CONSOLE_VALUE_NODE_LIMIT;
			const seen = /* @__PURE__ */ new WeakSet();
			const project = (value, depth) => {
				if (remainingNodes <= 0) return "[truncated]";
				remainingNodes -= 1;
				if (value === null || typeof value === "boolean" || typeof value === "number") return value;
				if (typeof value === "string") return boundedText(value, CONSOLE_VALUE_CHAR_LIMIT);
				if (typeof value !== "object") return boundedText(value, CONSOLE_VALUE_CHAR_LIMIT);
				if (value instanceof Error) return {
					name: boundedText(value.name, CONSOLE_VALUE_CHAR_LIMIT),
					message: boundedText(value.message, CONSOLE_VALUE_CHAR_LIMIT),
					stack: boundedText(value.stack || "", CONSOLE_VALUE_CHAR_LIMIT)
				};
				if (seen.has(value)) return "[circular]";
				seen.add(value);
				if (depth >= CONSOLE_VALUE_DEPTH_LIMIT) return Array.isArray(value) ? "[array depth limit]" : "[object depth limit]";
				if (Array.isArray(value)) {
					const result = [];
					const count = Math.min(value.length, CONSOLE_ARGUMENT_LIMIT);
					for (let index = 0; index < count; index += 1) result.push(project(value[index], depth + 1));
					if (value.length > count) result.push(`[${value.length - count} more items]`);
					return result;
				}
				let keys;
				try {
					keys = Object.keys(value);
				} catch {
					return "[unreadable object]";
				}
				const result = {};
				const count = Math.min(keys.length, CONSOLE_ARGUMENT_LIMIT);
				for (let index = 0; index < count; index += 1) {
					const rawKey = keys[index];
					const key = boundedText(rawKey, CONSOLE_VALUE_CHAR_LIMIT);
					try {
						result[key] = project(value[rawKey], depth + 1);
					} catch {
						result[key] = "[unreadable]";
					}
				}
				if (keys.length > count) result.__truncatedKeys = keys.length - count;
				return result;
			};
			const projected = project(argument, 0);
			try {
				const json = JSON.stringify(projected);
				return json && json.length > CONSOLE_ARGUMENT_CHAR_LIMIT ? boundedText(json, CONSOLE_ARGUMENT_CHAR_LIMIT) : projected;
			} catch {
				return boundedText(argument, CONSOLE_ARGUMENT_CHAR_LIMIT);
			}
		};
		const pushConsole = (level, args) => {
			const serialized = [];
			const count = Math.min(args.length, CONSOLE_ARGUMENT_LIMIT);
			for (let index = 0; index < count; index += 1) serialized.push(serializeConsoleArgument(args[index]));
			state.console.push({
				id: state.console.length + 1,
				level,
				timestamp: Date.now(),
				url: boundedText(location.href, NETWORK_URL_CHAR_LIMIT),
				args: serialized
			});
			if (state.console.length > CONSOLE_ENTRY_LIMIT) state.console.splice(0, state.console.length - CONSOLE_ENTRY_LIMIT);
		};
		for (const level of [
			"debug",
			"log",
			"info",
			"warn",
			"error"
		]) {
			const original = console[level];
			if (typeof original !== "function" || original.__dshChromeWrapped) continue;
			const wrapped = function(...args) {
				pushConsole(level, args);
				return original.apply(this, args);
			};
			wrapped.__dshChromeWrapped = true;
			console[level] = wrapped;
		}
		window.addEventListener("error", (event) => pushConsole("pageerror", [event.message, event.filename + ":" + event.lineno + ":" + event.colno]));
		window.addEventListener("unhandledrejection", (event) => pushConsole("unhandledrejection", [event.reason]));
		const boundedHeaders = (headers) => {
			const result = [];
			try {
				for (const [name, value] of headers.entries()) {
					if (result.length >= NETWORK_HEADER_LIMIT) break;
					result.push([boundedText(name, NETWORK_HEADER_NAME_CHAR_LIMIT), boundedText(value, NETWORK_HEADER_VALUE_CHAR_LIMIT)]);
				}
			} catch {}
			return result;
		};
		const readBoundedResponseBody = async (response) => {
			const body = response.clone().body;
			if (!body) return {
				body: "",
				truncated: false
			};
			const reader = body.getReader();
			const decoder = new TextDecoder();
			let text = "";
			let truncated = false;
			try {
				while (true) {
					const part = await reader.read();
					if (part.done) {
						const tail = decoder.decode();
						const remaining = NETWORK_BODY_CHAR_LIMIT - text.length;
						text += tail.slice(0, Math.max(0, remaining));
						truncated = tail.length > remaining;
						break;
					}
					const chunk = decoder.decode(part.value, { stream: true });
					const remaining = NETWORK_BODY_CHAR_LIMIT - text.length;
					text += chunk.slice(0, Math.max(0, remaining));
					if (chunk.length > remaining) {
						truncated = true;
						await reader.cancel();
						break;
					}
				}
			} finally {
				reader.releaseLock();
			}
			return {
				body: text,
				truncated
			};
		};
		const record = (entry) => {
			entry.method = boundedText(entry.method, 32);
			entry.url = boundedText(entry.url, NETWORK_URL_CHAR_LIMIT);
			entry.pageUrl = boundedText(entry.pageUrl, NETWORK_URL_CHAR_LIMIT);
			state.network.push(entry);
			if (state.network.length > NETWORK_ENTRY_LIMIT) state.network.splice(0, state.network.length - NETWORK_ENTRY_LIMIT);
			return entry;
		};
		if (window.fetch && !window.fetch.__dshChromeWrapped) {
			const originalFetch = window.fetch.bind(window);
			const wrappedFetch = async (...args) => {
				const id = "req-" + state.nextRequestId++;
				const startedAt = Date.now();
				const input = args[0];
				const init = args[1] || {};
				const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
				const method = (init.method || (input instanceof Request ? input.method : void 0) || "GET").toUpperCase();
				const entry = record({
					id,
					type: "fetch",
					method,
					url: String(url || ""),
					startedAt,
					pageUrl: location.href,
					status: "pending"
				});
				try {
					const response = await originalFetch(...args);
					entry.status = response.status;
					entry.statusText = boundedText(response.statusText, NETWORK_ERROR_CHAR_LIMIT);
					entry.ok = response.ok;
					entry.responseUrl = boundedText(response.url, NETWORK_URL_CHAR_LIMIT);
					entry.durationMs = Date.now() - startedAt;
					entry.responseHeaders = boundedHeaders(response.headers);
					readBoundedResponseBody(response).then(({ body, truncated }) => {
						entry.responseBody = body;
						entry.responseBodyTruncated = truncated;
					}).catch((error) => {
						entry.responseBodyError = boundedText(error?.message || error, NETWORK_ERROR_CHAR_LIMIT);
					});
					return response;
				} catch (error) {
					entry.error = boundedText(error?.message || error, NETWORK_ERROR_CHAR_LIMIT);
					entry.durationMs = Date.now() - startedAt;
					throw error;
				}
			};
			wrappedFetch.__dshChromeWrapped = true;
			window.fetch = wrappedFetch;
		}
		if (window.XMLHttpRequest && !XMLHttpRequest.prototype.open.__dshChromeWrapped) {
			const originalOpen = XMLHttpRequest.prototype.open;
			const originalSend = XMLHttpRequest.prototype.send;
			XMLHttpRequest.prototype.open = function(method, url, ...rest) {
				this.__dshChromeRequest = {
					method: String(method || "GET").toUpperCase(),
					url: String(url || "")
				};
				return originalOpen.call(this, method, url, ...rest);
			};
			XMLHttpRequest.prototype.open.__dshChromeWrapped = true;
			XMLHttpRequest.prototype.send = function(body) {
				const id = "req-" + state.nextRequestId++;
				const startedAt = Date.now();
				const info = this.__dshChromeRequest || {};
				const entry = record({
					id,
					type: "xhr",
					method: info.method || "GET",
					url: info.url || "",
					startedAt,
					pageUrl: location.href,
					status: "pending"
				});
				this.addEventListener("loadend", () => {
					entry.status = this.status;
					entry.statusText = boundedText(this.statusText, NETWORK_ERROR_CHAR_LIMIT);
					entry.responseUrl = boundedText(this.responseURL, NETWORK_URL_CHAR_LIMIT);
					entry.durationMs = Date.now() - startedAt;
					try {
						entry.responseHeadersText = boundedText(this.getAllResponseHeaders(), NETWORK_HEADER_TEXT_CHAR_LIMIT);
					} catch {}
					try {
						if (typeof this.responseText === "string") {
							entry.responseBody = boundedText(this.responseText, NETWORK_BODY_CHAR_LIMIT);
							entry.responseBodyTruncated = this.responseText.length > NETWORK_BODY_CHAR_LIMIT;
						}
					} catch (error) {
						entry.responseBodyError = boundedText(error?.message || error, NETWORK_ERROR_CHAR_LIMIT);
					}
				});
				this.addEventListener("error", () => {
					entry.error = "XMLHttpRequest error";
					entry.durationMs = Date.now() - startedAt;
				});
				return originalSend.call(this, body);
			};
		}
	}
	function probePage() {
		return {
			arithmetic: 2,
			location: location.href,
			title: document.title,
			documentReady: document.readyState,
			userAgent: navigator.userAgent.slice(0, 200),
			webdriver: !!navigator.webdriver
		};
	}
	//#endregion
	//#region src/browser/injected/action-diagnostics.ts
	function listConsoleMessages(clear) {
		installPiChromeInstrumentation();
		const state = getPiChromeState();
		const messages = state.console.slice();
		if (clear) state.console = [];
		return {
			messages,
			count: messages.length
		};
	}
	function listNetworkRequests(includePreservedRequests, clear) {
		installPiChromeInstrumentation();
		const state = getPiChromeState();
		const currentUrl = location.href;
		const requests = state.network.filter((request) => includePreservedRequests || request.pageUrl === currentUrl).map(({ responseBody, ...summary }) => ({
			...summary,
			hasResponseBody: responseBody !== void 0
		}));
		if (clear) state.network = [];
		return {
			requests,
			count: requests.length,
			note: "Captures fetch/XHR after instrumentation is installed. Browser-initiated document/static asset requests are not captured."
		};
	}
	function getNetworkRequest(requestId) {
		installPiChromeInstrumentation();
		const request = getPiChromeState().network.find((entry) => entry.id === requestId);
		if (!request) throw new Error(`No network request with id ${requestId}`);
		return request;
	}
	//#endregion
	//#region src/browser/injected/evaluation-value.ts
	function projectEvaluationValue(input, contract) {
		const marker = (kind, fields = {}) => ({
			_tag: contract.marker.tag,
			kind,
			...fields
		});
		const boundedString = (value) => value.length <= contract.limits.stringLength ? value : marker(contract.marker.kinds.stringTruncated, {
			prefix: value.slice(0, contract.limits.stringLength),
			originalLength: value.length
		});
		const messageOf = (cause) => {
			try {
				return boundedString(String(cause?.message ?? cause));
			} catch {
				return contract.rendering.unprintableError;
			}
		};
		const uninspectableObject = (cause, referenceId) => marker(contract.marker.kinds.uninspectableObject, {
			...referenceId === void 0 ? {} : { referenceId },
			message: messageOf(cause)
		});
		const reflectObject = (value) => {
			try {
				return {
					ok: true,
					reflection: {
						prototype: Object.getPrototypeOf(value),
						array: Array.isArray(value),
						error: value instanceof Error
					}
				};
			} catch (cause) {
				return {
					ok: false,
					cause
				};
			}
		};
		let project;
		const property = (value, key, depth) => {
			try {
				return project(value[key], depth);
			} catch (cause) {
				return marker(contract.marker.kinds.propertyAccessError, { message: messageOf(cause) });
			}
		};
		const projectArray = (value, depth, referenceId) => {
			try {
				const result = [];
				const count = Math.min(value.length, contract.limits.collectionEntries);
				for (let index = 0; index < count; index += 1) result.push(Object.hasOwn(value, index) ? project(value[index], depth + 1) : marker(contract.marker.kinds.arrayHole, { index }));
				if (value.length > count) result.push(marker(contract.marker.kinds.collectionLimit, {
					collection: contract.rendering.arrayCollectionName,
					omitted: value.length - count,
					limit: contract.limits.collectionEntries
				}));
				return result;
			} catch (cause) {
				return uninspectableObject(cause, referenceId);
			}
		};
		let remainingNodes = contract.limits.nodes;
		let nextReferenceId = 1;
		const references = /* @__PURE__ */ new WeakMap();
		const active = /* @__PURE__ */ new WeakSet();
		project = (value, depth) => {
			if (remainingNodes <= 0) return marker(contract.marker.kinds.nodeLimit, { limit: contract.limits.nodes });
			remainingNodes -= 1;
			if (depth >= contract.limits.depth) return marker(contract.marker.kinds.depthLimit, {
				depth,
				limit: contract.limits.depth
			});
			if (value === null || typeof value === "boolean") return value;
			if (typeof value === "string") return boundedString(value);
			if (typeof value === "number") {
				if (Number.isNaN(value)) return marker(contract.marker.kinds.nonFiniteNumber, { value: contract.rendering.nonFiniteNumbers.nan });
				if (value === Number.POSITIVE_INFINITY) return marker(contract.marker.kinds.nonFiniteNumber, { value: contract.rendering.nonFiniteNumbers.positiveInfinity });
				if (value === Number.NEGATIVE_INFINITY) return marker(contract.marker.kinds.nonFiniteNumber, { value: contract.rendering.nonFiniteNumbers.negativeInfinity });
				if (Object.is(value, -0)) return marker(contract.marker.kinds.negativeZero);
				return value;
			}
			if (value === void 0) return marker(contract.marker.kinds.undefined);
			if (typeof value === "bigint") return marker(contract.marker.kinds.bigint, { value: boundedString(value.toString()) });
			if (typeof value === "symbol") return marker(contract.marker.kinds.symbol, { description: value.description === void 0 ? marker(contract.marker.kinds.undefined) : boundedString(value.description) });
			const knownReference = references.get(value);
			if (knownReference !== void 0) return marker(active.has(value) ? contract.marker.kinds.circularReference : contract.marker.kinds.sharedReference, { referenceId: knownReference });
			const referenceId = nextReferenceId++;
			references.set(value, referenceId);
			active.add(value);
			try {
				const reflected = reflectObject(value);
				if (!reflected.ok) return uninspectableObject(reflected.cause, referenceId);
				const reflection = reflected.reflection;
				if (typeof value === "function") try {
					return marker(contract.marker.kinds.function, {
						referenceId,
						source: boundedString(Function.prototype.toString.call(value))
					});
				} catch (cause) {
					return uninspectableObject(cause, referenceId);
				}
				if (reflection.error) return marker(contract.marker.kinds.error, {
					referenceId,
					name: property(value, "name", depth + 1),
					message: property(value, "message", depth + 1),
					stack: property(value, "stack", depth + 1)
				});
				if (reflection.array) return projectArray(value, depth, referenceId);
				let stringKeys;
				let symbolKeys;
				try {
					stringKeys = Object.keys(value);
					symbolKeys = Object.getOwnPropertySymbols(value).filter((key) => Object.getOwnPropertyDescriptor(value, key)?.enumerable === true);
				} catch (cause) {
					return uninspectableObject(cause, referenceId);
				}
				const geometryKeys = contract.domRectPolicy.fields;
				let domRectLike = false;
				try {
					const record = value;
					domRectLike = geometryKeys.every((key) => typeof record[key] === "number") && (typeof record.toJSON === "function" || stringKeys.length === 0);
				} catch {}
				if (domRectLike) return Object.fromEntries(geometryKeys.map((key) => [key, property(value, key, depth + 1)]));
				const requiresEntryProjection = stringKeys.some((key) => key.length > contract.limits.keyLength) || symbolKeys.length > 0 || stringKeys.length > contract.limits.collectionEntries;
				const projectEnumerableProperties = () => {
					if (requiresEntryProjection) {
						const keys = [...stringKeys, ...symbolKeys];
						const count = Math.min(keys.length, contract.limits.collectionEntries);
						const entries = [];
						for (let index = 0; index < count; index += 1) {
							const key = keys[index];
							const projectedKey = typeof key === "symbol" ? marker(contract.marker.kinds.symbolKey, { description: key.description === void 0 ? marker(contract.marker.kinds.undefined) : boundedString(key.description) }) : key.length <= contract.limits.keyLength ? key : marker(contract.marker.kinds.keyTruncated, {
								prefix: key.slice(0, contract.limits.keyLength),
								originalLength: key.length
							});
							entries.push({
								key: projectedKey,
								value: property(value, key, depth + 1)
							});
						}
						return marker(contract.marker.kinds.objectEntryProjection, {
							referenceId,
							entries,
							omitted: keys.length - count,
							limit: contract.limits.collectionEntries
						});
					}
					const result = Object.create(null);
					for (const key of stringKeys) result[key] = property(value, key, depth + 1);
					return result;
				};
				const prototype = reflection.prototype;
				if (prototype !== null && prototype !== Object.prototype) {
					let constructorName = marker(contract.marker.kinds.undefined);
					let objectTag = marker(contract.marker.kinds.undefined);
					try {
						const constructor = prototype.constructor;
						if (typeof constructor === "function") constructorName = boundedString(constructor.name);
					} catch (cause) {
						constructorName = marker(contract.marker.kinds.propertyAccessError, { message: messageOf(cause) });
					}
					try {
						objectTag = boundedString(Object.prototype.toString.call(value));
					} catch (cause) {
						objectTag = marker(contract.marker.kinds.propertyAccessError, { message: messageOf(cause) });
					}
					return marker(contract.marker.kinds.nonPlainObject, {
						referenceId,
						constructorName,
						objectTag,
						properties: projectEnumerableProperties()
					});
				}
				return projectEnumerableProperties();
			} finally {
				active.delete(value);
			}
		};
		return project(input, 0);
	}
	//#endregion
	//#region src/browser/injected/actions.ts
	var PAGE_HELPERS = [getPiChromeState];
	//#endregion
	//#region src/browser/platform-resource-lease.ts
	async function withResourceLease(acquire, use, release) {
		const resource = await acquire();
		const outcome = await use(resource).then((value) => ({
			ok: true,
			value
		}), (cause) => ({
			ok: false,
			cause
		}));
		const released = await release(resource).then(() => ({ ok: true }), (cause) => ({
			ok: false,
			cause
		}));
		if (!released.ok) {
			if (!outcome.ok) throw new AggregateError([outcome.cause, released.cause], "Chrome resource use and release both failed");
			throw released.cause;
		}
		if (!outcome.ok) throw outcome.cause;
		return outcome.value;
	}
	//#endregion
	//#region src/browser/platform-cdp.ts
	var debuggerStates = /* @__PURE__ */ new Map();
	var navigationTurns = /* @__PURE__ */ new Map();
	var INPUT_IDLE_DETACH_MS = 15e3;
	var DEBUGGER_ATTACH_TIMEOUT_MS = 5e3;
	var DEBUGGER_DETACH_TIMEOUT_MS = 5e3;
	var CDP_COMMAND_TIMEOUT_MS = 10e3;
	var EXECUTE_SCRIPT_TIMEOUT_MS = 8e3;
	var withTimeout = (promise, ms, message) => {
		let timer;
		return Promise.race([
			promise.finally(() => clearTimeout(timer)),
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error(message)), ms);
			})
		]);
	};
	var MAX_BUFFERED_NAVIGATION_EVENTS = 256;
	var CDP_VERSION = "1.3";
	var deferred = () => {
		let resolve;
		let reject;
		return {
			promise: new Promise((resolvePromise, rejectPromise) => {
				resolve = resolvePromise;
				reject = rejectPromise;
			}),
			resolve,
			reject
		};
	};
	var attachedSession = (tabId) => {
		const state = debuggerStates.get(tabId);
		return state?.tag === "attached" ? state.session : void 0;
	};
	var attachedTabIds = () => [...debuggerStates].flatMap(([tabId, state]) => state.tag === "attached" ? [tabId] : []);
	var matchesNavigationTarget = (event, target) => event.frameId === target.frameId && event.loaderId === target.loaderId && event.name === navigationEventNameFor(target.milestone);
	var navigationEventNameFor = (milestone) => milestone === "commit" ? "init" : "load";
	var navigationEventKey = (frameId, loaderId, milestone) => JSON.stringify([
		frameId,
		loaderId,
		milestone
	]);
	var settleNavigation = (transition, cause) => {
		if (transition.settled) return;
		transition.settled = true;
		if (cause === void 0) transition.completion.resolve(void 0);
		else transition.completion.reject(cause);
	};
	var applyNavigationEvent = (transition, event) => {
		const target = transition.target;
		if (!target) {
			const key = navigationEventKey(event.frameId, event.loaderId, event.name);
			if (!transition.earlyEventKeys.has(key) && transition.earlyEventKeys.size >= MAX_BUFFERED_NAVIGATION_EVENTS) {
				settleNavigation(transition, /* @__PURE__ */ new Error(`Navigation generation ${transition.generation} exceeded ${MAX_BUFFERED_NAVIGATION_EVENTS} buffered lifecycle events`));
				return;
			}
			transition.earlyEventKeys.add(key);
			return;
		}
		if (matchesNavigationTarget(event, target)) settleNavigation(transition);
	};
	var bindNavigationTarget = (transition, target) => {
		transition.target = target;
		if (transition.earlyEventKeys.has(navigationEventKey(target.frameId, target.loaderId, navigationEventNameFor(target.milestone)))) settleNavigation(transition);
		transition.earlyEventKeys.clear();
	};
	var waitForNavigation = (transition, timeoutMs, tabId) => new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			settleNavigation(transition, /* @__PURE__ */ new Error(`Timed out after ${timeoutMs}ms waiting for ${transition.target?.milestone ?? "navigation"} on tab ${tabId}`));
		}, timeoutMs);
		transition.completion.promise.then(() => {
			clearTimeout(timer);
			resolve();
		}, (cause) => {
			clearTimeout(timer);
			reject(cause);
		});
	});
	var withNavigationDeadline = (tabId, transition, timeoutMs, execute) => {
		const deadlineMs = timeoutMs + COMMAND_DEADLINES_MS.navigateOverhead;
		return new Promise((resolve, reject) => {
			let completed = false;
			const finish = (complete) => {
				if (completed) return;
				completed = true;
				clearTimeout(timer);
				complete();
			};
			const timer = setTimeout(() => {
				const timeout = /* @__PURE__ */ new Error(`Navigation transaction timed out after ${deadlineMs}ms on tab ${tabId}`);
				settleNavigation(transition, timeout);
				detachDebugger(tabId).then(() => finish(() => reject(timeout)), (resetCause) => finish(() => reject(new AggregateError([timeout, resetCause], `Navigation transaction timed out and debugger reset failed for tab ${tabId}`))));
			}, deadlineMs);
			execute().then((value) => finish(() => resolve(value)), (cause) => finish(() => reject(cause)));
		});
	};
	var withNavigationTurn = async (tabId, execute) => {
		const previous = navigationTurns.get(tabId) ?? Promise.resolve();
		let release;
		const current = new Promise((resolve) => {
			release = resolve;
		});
		navigationTurns.set(tabId, current);
		await previous;
		try {
			return await execute();
		} finally {
			release();
			if (navigationTurns.get(tabId) === current) navigationTurns.delete(tabId);
		}
	};
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	function rng(min, max) {
		return min + Math.random() * (max - min);
	}
	function inputStatus() {
		return {
			attachedTabs: attachedTabIds(),
			permissionGranted: typeof chrome !== "undefined" && !!chrome.debugger
		};
	}
	function errorText(error) {
		return String(error?.message || error);
	}
	function isDebuggerSessionLost(error) {
		return /Debugger is not attached|Detached while|Target closed|No tab with id/i.test(errorText(error));
	}
	function isUnknownInitScript(error) {
		return /No script with given id|No script.*identifier|Unknown script identifier|Script with identifier .* (?:does not exist|not found)/i.test(errorText(error));
	}
	async function debuggerAttachRaw(tabId) {
		const debuggee = { tabId };
		const attach = chrome.debugger.attach(debuggee, CDP_VERSION);
		try {
			await withTimeout(
				attach,
				DEBUGGER_ATTACH_TIMEOUT_MS,
				`Chrome debugger attach timed out after ${DEBUGGER_ATTACH_TIMEOUT_MS}ms for tab ${tabId}`
			);
		} catch (error) {
			// Cleanup must not block: Chrome may serialize detach behind the timed-out attach; a late successful attach is detached in background.
			void Promise.resolve(attach).then(() => chrome.debugger.detach(debuggee)).catch(() => {});
			throw error;
		}
		return debuggee;
	}
	var completeDebuggerAttach = async (tabId, transition) => {
		let debuggee;
		try {
			debuggee = await debuggerAttachRaw(tabId);
		} catch (error) {
			if (debuggerStates.get(tabId) === transition) debuggerStates.delete(tabId);
			const message = errorText(error);
			const tabSnapshot = await chrome.tabs.get(tabId).catch(() => null);
			if (!tabSnapshot || (tabSnapshot.url || "").startsWith("chrome://") || (tabSnapshot.url || "").startsWith("chrome-extension://")) throw new Error(`Chrome can't attach the debugger to this tab (${tabSnapshot?.url ?? "unknown"}). Open a normal http(s) tab and try again.`);
			if (/Another debugger|already attached/i.test(message)) throw new Error(`Another debugger is attached to tab ${tabId}; dsh-chrome will not detach or replace it.`, { cause: error });
			const meta = await describeInputTarget(tabId);
			throw new Error(`Chrome debugger attach failed for tab ${tabId}: ${message}${targetMetaSuffix(meta)}`, { cause: error });
		}
		const entry = {
			detachAt: Date.now() + INPUT_IDLE_DETACH_MS,
			activeCommands: 0,
			pointer: {
				x: 120 + Math.random() * 200,
				y: 80 + Math.random() * 120
			},
			debuggee
		};
		if (debuggerStates.get(tabId) !== transition || transition.detachedByEvent) {
			if (debuggerStates.get(tabId) === transition) debuggerStates.delete(tabId);
			throw new Error(`Chrome debugger detached while attaching to tab ${tabId}`);
		}
		debuggerStates.set(tabId, {
			tag: "attached",
			session: entry
		});
		return entry;
	};
	var beginDebuggerAttach = (tabId) => {
		const completion = deferred();
		const transition = {
			tag: "attaching",
			completion: completion.promise,
			detachedByEvent: false
		};
		debuggerStates.set(tabId, transition);
		completeDebuggerAttach(tabId, transition).then(completion.resolve, completion.reject);
		return completion.promise;
	};
	async function attachDebugger(tabId) {
		if (!chrome.debugger) throw new Error("chrome.debugger API unavailable; reload the extension to grant the new permission");
		while (true) {
			const state = debuggerStates.get(tabId);
			if (!state) return beginDebuggerAttach(tabId);
			if (state.tag === "attached") {
				if (state.session.navigationInitScript && !state.session.navigation) {
					await beginDebuggerDetach(tabId, state.session);
					continue;
				}
				state.session.detachAt = Date.now() + INPUT_IDLE_DETACH_MS;
				return state.session;
			}
			if (state.tag === "attaching") return state.completion;
			try {
				await state.completion;
			} catch {}
		}
	}
	async function describeInputTarget(tabId) {
		const tab = await chrome.tabs.get(Number(tabId)).catch(() => null);
		const active = (await chrome.tabs.query({
			active: true,
			lastFocusedWindow: true
		}).catch(() => []))[0] || null;
		let targets = [];
		try {
			targets = await new Promise((resolve) => chrome.debugger.getTargets((t) => resolve(t || [])));
		} catch {}
		return {
			resolvedTab: tab ? {
				id: tab.id,
				windowId: tab.windowId,
				url: tab.url,
				status: tab.status,
				title: tab.title,
				active: tab.active
			} : null,
			activeTab: active ? {
				id: active.id,
				windowId: active.windowId,
				url: active.url,
				status: active.status,
				title: active.title,
				active: active.active
			} : null,
			attachedTabs: attachedTabIds(),
			cdpTargets: targets.map((t) => ({
				id: t.id,
				tabId: t.tabId,
				type: t.type,
				url: t.url,
				attached: t.attached,
				extensionId: t.extensionId
			}))
		};
	}
	function targetMetaSuffix(meta) {
		return `\nTarget metadata: ${JSON.stringify(meta).slice(0, 4e3)}`;
	}
	var completeDebuggerDetach = async (tabId, transition) => {
		try {
			await withTimeout(
				chrome.debugger.detach(transition.session.debuggee),
				DEBUGGER_DETACH_TIMEOUT_MS,
				`Chrome debugger detach timed out after ${DEBUGGER_DETACH_TIMEOUT_MS}ms for tab ${tabId}`
			);
		} catch (error) {
			console.warn(`[dsh-chrome] debugger detach failed for tab ${tabId}:`, error);
			if (debuggerStates.get(tabId) === transition) {
				if (transition.detachedByEvent || isDebuggerSessionLost(error)) {
					debuggerStates.delete(tabId);
					return;
				}
				debuggerStates.set(tabId, {
					tag: "attached",
					session: transition.session
				});
			}
			throw error;
		}
		if (debuggerStates.get(tabId) === transition) debuggerStates.delete(tabId);
	};
	var beginDebuggerDetach = (tabId, session) => {
		if (session.navigation) settleNavigation(session.navigation, /* @__PURE__ */ new Error(`Chrome debugger detached during navigation on tab ${tabId}`));
		const completion = deferred();
		const transition = {
			tag: "detaching",
			session,
			completion: completion.promise,
			detachedByEvent: false
		};
		debuggerStates.set(tabId, transition);
		completeDebuggerDetach(tabId, transition).then(() => completion.resolve(void 0), completion.reject);
		return completion.promise;
	};
	async function detachDebugger(tabId) {
		while (true) {
			const state = debuggerStates.get(tabId);
			if (!state) return;
			if (state.tag === "attached") return beginDebuggerDetach(tabId, state.session);
			if (state.tag === "detaching") return state.completion;
			try {
				await state.completion;
			} catch {
				return;
			}
		}
	}
	function handleDebuggerDetach(source, reason) {
		if (source.tabId !== void 0) {
			const state = debuggerStates.get(source.tabId);
			if (state?.tag === "attached") {
				if (state.session.navigation) settleNavigation(state.session.navigation, /* @__PURE__ */ new Error(`Chrome debugger detached during navigation on tab ${source.tabId}`));
				debuggerStates.delete(source.tabId);
			} else if (state) state.detachedByEvent = true;
		}
		if (reason === "canceled_by_user") console.warn(`[dsh-chrome] debugger canceled by user on tab ${source.tabId}; Chrome input will reattach on next call`);
	}
	function handleDebuggerEvent(source, method, params) {
		if (source.tabId === void 0 || method !== "Page.lifecycleEvent" || !params) return;
		const transition = attachedSession(source.tabId)?.navigation;
		if (!transition) return;
		const event = params;
		if (typeof event.frameId !== "string" || typeof event.loaderId !== "string" || typeof event.name !== "string") return;
		applyNavigationEvent(transition, {
			frameId: event.frameId,
			loaderId: event.loaderId,
			name: event.name
		});
	}
	async function detachExpiredDebuggers(now) {
		const expired = [];
		for (const [tabId, state] of debuggerStates) if (state.tag === "attached" && state.session.navigation === void 0 && state.session.activeCommands === 0 && (state.session.navigationInitScript !== void 0 || state.session.detachAt < now)) expired.push(tabId);
		await Promise.all(expired.map(detachDebugger));
	}
	function cdpRaw(tabId, method, params) {
		const entry = attachedSession(tabId);
		if (!entry) return Promise.reject(/* @__PURE__ */ new Error(`dsh-chrome has no debugger ownership record for tab ${tabId}`));
		entry.detachAt = Date.now() + INPUT_IDLE_DETACH_MS;
		entry.activeCommands += 1;
		const debuggee = entry.debuggee;
		return new Promise((resolve, reject) => {
			let settled = false;
			const finish = (error, result) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				entry.activeCommands -= 1;
				if (error) reject(error);
				else resolve(result);
			};
			const timer = setTimeout(() => {
				console.warn(`[dsh-chrome] CDP ${method} on tab ${tabId} did not answer within ${CDP_COMMAND_TIMEOUT_MS}ms; assuming the debugger session is lost`, { params });
				finish(/* @__PURE__ */ new Error(`${method}: dsh-chrome CDP sendCommand timed out after ${CDP_COMMAND_TIMEOUT_MS}ms; the debugger session is likely lost on tab ${tabId}`));
			}, CDP_COMMAND_TIMEOUT_MS);
			try {
				chrome.debugger.sendCommand(debuggee, method, params || {}, (result) => {
					if (chrome.runtime.lastError) finish(/* @__PURE__ */ new Error(`${method}: ${chrome.runtime.lastError.message}`));
					else finish(void 0, result);
				});
			} catch (error) {
				finish(error);
			}
		});
	}
	function executeScript(options) {
		return withTimeout(
			chrome.scripting.executeScript(options),
			EXECUTE_SCRIPT_TIMEOUT_MS,
			`chrome.scripting.executeScript timed out after ${EXECUTE_SCRIPT_TIMEOUT_MS}ms`
		);
	}
	async function findForeignExtensionTargets(tabId) {
		try {
			return (await new Promise((resolve) => chrome.debugger.getTargets((t) => resolve(t || [])))).filter((t) => {
				if (t.tabId !== tabId) return false;
				if (!String(t.url || "").startsWith("chrome-extension://")) return false;
				if (t.extensionId === chrome.runtime.id) return false;
				return true;
			});
		} catch {
			return [];
		}
	}
	function extractForeignExtId(targets) {
		for (const t of targets) {
			if (t.extensionId && t.extensionId !== chrome.runtime.id) return t.extensionId;
			const extensionId = String(t.url || "").match(/chrome-extension:\/\/([a-p]+)\//)?.[1];
			if (extensionId && extensionId !== chrome.runtime.id) return extensionId;
		}
		return null;
	}
	async function cdp(tabId, method, params) {
		const session = attachedSession(tabId);
		try {
			return await cdpRaw(tabId, method, params);
		} catch (error) {
			const message = errorText(error);
			if (session && attachedSession(tabId) === session && (isDebuggerSessionLost(error) || /did not answer within/i.test(message))) await detachDebugger(tabId);
			if (/Cannot access a chrome-extension:\/\/ URL of different extension/i.test(message) && method.startsWith("Input.")) {
				const extensionId = extractForeignExtId(await findForeignExtensionTargets(tabId)) || "unknown";
				throw new Error(`Another Chrome extension (${extensionId}) blocked input on this page. The input command was not replayed because its outcome is unknown; close the overlay before issuing a new command.`, { cause: error });
			}
			throw error;
		}
	}
	var navigateTabOwned = async (request) => {
		const { tabId, url, milestone, timeoutMs, initScriptSource } = request;
		const session = await attachDebugger(tabId);
		if (session.navigation) throw new Error(`Chrome tab ${tabId} retained an unreleased navigation owner`);
		const transition = {
			generation: globalThis.crypto.randomUUID(),
			completion: deferred(),
			earlyEventKeys: /* @__PURE__ */ new Set(),
			settled: false
		};
		transition.completion.promise.catch(() => void 0);
		return withNavigationDeadline(tabId, transition, timeoutMs, () => withResourceLease(async () => {
			session.navigation = transition;
			return transition;
		}, async () => {
			await cdp(tabId, "Page.enable", {});
			await cdp(tabId, "Page.setLifecycleEventsEnabled", { enabled: true });
			if (attachedSession(tabId) !== session || session.navigation !== transition) throw new Error(`Chrome debugger detached before navigation on tab ${tabId}`);
			await installNavigationInitScript(tabId, session, initScriptSource);
			const result = await cdp(tabId, "Page.navigate", { url });
			if (attachedSession(tabId) !== session || session.navigation !== transition) throw new Error(`Chrome debugger detached while navigating tab ${tabId}`);
			if (typeof result.frameId !== "string" || result.frameId.length === 0) throw new Error("Chrome navigation did not return a main frame id");
			if (result.errorText) throw new Error(`Chrome navigation failed: ${result.errorText}`);
			if (result.isDownload) throw new Error("Chrome navigation became a download");
			if (!result.loaderId) return {
				kind: "same-document",
				frameId: result.frameId,
				initScriptExecuted: false
			};
			bindNavigationTarget(transition, {
				frameId: result.frameId,
				loaderId: result.loaderId,
				milestone
			});
			await waitForNavigation(transition, timeoutMs, tabId);
			return {
				kind: "new-document",
				frameId: result.frameId,
				loaderId: result.loaderId,
				milestone
			};
		}, async () => {
			try {
				await removeNavigationInitScript(tabId);
			} finally {
				if (attachedSession(tabId) === session && session.navigation === transition) delete session.navigation;
			}
		}));
	};
	var navigateTab = (request) => withNavigationTurn(request.tabId, () => navigateTabOwned(request));
	var installNavigationInitScript = async (tabId, session, source) => {
		await removeNavigationInitScript(tabId);
		if (source === void 0) return;
		if (attachedSession(tabId) !== session) throw new Error(`Chrome debugger detached before registering an init script for tab ${tabId}`);
		session.navigationInitScript = { state: "registering" };
		const result = await cdp(tabId, "Page.addScriptToEvaluateOnNewDocument", { source });
		if (attachedSession(tabId) !== session) throw new Error(`Chrome debugger detached while registering an init script for tab ${tabId}`);
		if (typeof result.identifier !== "string" || result.identifier.length === 0) throw new Error("Chrome did not return an identifier for the registered init script");
		session.navigationInitScript = {
			state: "registered",
			identifier: result.identifier
		};
	};
	async function removeNavigationInitScript(tabId) {
		const session = attachedSession(tabId);
		const lease = session?.navigationInitScript;
		if (!session || !lease) return;
		if (lease.state === "registering") {
			await detachDebugger(tabId);
			return;
		}
		try {
			await cdp(tabId, "Page.removeScriptToEvaluateOnNewDocument", { identifier: lease.identifier });
		} catch (error) {
			if (attachedSession(tabId) !== session || isUnknownInitScript(error)) {
				if (attachedSession(tabId) === session) delete session.navigationInitScript;
				return;
			}
			try {
				await detachDebugger(tabId);
			} catch (detachError) {
				throw new AggregateError([error, detachError], `Chrome init-script removal and debugger reset both failed for tab ${tabId}`);
			}
			return;
		}
		if (attachedSession(tabId) === session) delete session.navigationInitScript;
	}
	async function cdpEval(tabId, expression, opts = {}) {
		await attachDebugger(tabId);
		return cdp(tabId, "Runtime.evaluate", {
			expression,
			returnByValue: true,
			awaitPromise: true,
			userGesture: true,
			...opts
		});
	}
	function cdpExceptionText(details) {
		if (!details) return "";
		const value = details.exception?.description ?? details.exception?.value ?? details.text ?? "";
		return typeof value === "string" ? value : JSON.stringify(value) ?? "";
	}
	function pointerOrigin(tabId, fallbackX, fallbackY) {
		const pointer = attachedSession(tabId)?.pointer;
		return {
			x: pointer?.x ?? fallbackX,
			y: pointer?.y ?? fallbackY
		};
	}
	function recordPointer(tabId, x, y) {
		const entry = attachedSession(tabId);
		if (entry) entry.pointer = {
			x,
			y
		};
	}
	//#endregion
	//#region src/browser/extension-runtime-assets.ts
	var SNAPSHOT_BUNDLE_PATH = "snapshot.js";
	var TARGET_BOOTSTRAP_DOCUMENT_PATH = "target-bootstrap.html";
	//#endregion
	//#region src/browser/platform-targets.ts
	var AutomationOwnershipLost = class extends BrowserRejected {
		reason;
		constructor(message, reason, recordedTabId) {
			super(message, {
				code: "automation-ownership-lost",
				details: {
					reason,
					recordedTabId
				}
			});
			this.reason = reason;
		}
	};
	var DEFAULT_GROUP_COLOR = "blue";
	var AUTOMATION_TARGETS_STORAGE_KEY = "dshChromeAutomationTargets";
	var BROWSER_EPOCH_STORAGE_KEY = "dshChromeBrowserEpoch";
	var MAX_AUTOMATION_TARGETS_PER_SESSION = AUTOMATION_TARGET_LIMITS.perSession;
	var MAX_AUTOMATION_TARGETS_PER_PROFILE = AUTOMATION_TARGET_LIMITS.perProfile;
	var targetTurn = Promise.resolve();
	var browserEpochPromise;
	var rejected = (code, message, details) => new BrowserRejected(message, {
		code,
		...details === void 0 ? {} : { details }
	});
	var invalidAutomationTargetState = (message) => rejected("invalid-automation-target-state", message);
	function sessionKeyOf(params) {
		if (typeof params.sessionKey !== "string" || params.sessionKey.length === 0) throw rejected("missing-session-key", "Chrome automation requires a DSH session key");
		return params.sessionKey;
	}
	async function readBrowserEpoch() {
		const stored = (await chrome.storage.session.get(BROWSER_EPOCH_STORAGE_KEY))[BROWSER_EPOCH_STORAGE_KEY];
		if (stored !== void 0) {
			if (typeof stored !== "string" || stored.length === 0) throw invalidAutomationTargetState("Invalid Chrome browser epoch state");
			return stored;
		}
		const epoch = globalThis.crypto.randomUUID();
		await chrome.storage.session.set({ [BROWSER_EPOCH_STORAGE_KEY]: epoch });
		return epoch;
	}
	var currentBrowserEpoch = () => browserEpochPromise ??= readBrowserEpoch();
	var hasExactKeys = (value, keys) => {
		const actual = Object.keys(value).sort();
		const expected = [...keys].sort();
		return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
	};
	var assertAutomationTargetQuotas = (targets) => {
		let profileCount = 0;
		for (const [sessionKey, sessionTargets] of Object.entries(targets)) {
			if (sessionTargets.length === 0) throw invalidAutomationTargetState(`Chrome automation target storage contains an empty target set for DSH session ${sessionKey}`);
			if (sessionTargets.length > MAX_AUTOMATION_TARGETS_PER_SESSION) throw invalidAutomationTargetState(`DSH session ${sessionKey} stores ${sessionTargets.length} automation targets; maximum is ${MAX_AUTOMATION_TARGETS_PER_SESSION}`);
			profileCount += sessionTargets.length;
		}
		if (profileCount > MAX_AUTOMATION_TARGETS_PER_PROFILE) throw invalidAutomationTargetState(`Chrome automation target storage contains ${profileCount} targets; profile maximum is ${MAX_AUTOMATION_TARGETS_PER_PROFILE}`);
	};
	function decodeAutomationTarget(target, sessionKey) {
		if (typeof target !== "object" || target === null) throw invalidAutomationTargetState(`Invalid Chrome automation target state for DSH session ${sessionKey}`);
		const candidate = target;
		const commonValid = typeof candidate.epoch === "string" && candidate.epoch.length > 0 && typeof candidate.label === "string" && candidate.label.length > 0 && candidate.label.length <= 80;
		const allocatingValid = candidate.state === "allocating" && typeof candidate.nonce === "string" && candidate.nonce.length > 0 && hasExactKeys(candidate, [
			"state",
			"epoch",
			"nonce",
			"label"
		]);
		const ownedValid = candidate.state === "owned" && typeof candidate.tabId === "number" && Number.isInteger(candidate.tabId) && hasExactKeys(candidate, [
			"state",
			"epoch",
			"tabId",
			"label"
		]);
		if (!commonValid || !allocatingValid && !ownedValid) throw invalidAutomationTargetState(`Invalid Chrome automation target state for DSH session ${sessionKey}`);
		return target;
	}
	var targetIdentity = (target) => target.state === "allocating" ? `allocation:${target.nonce}` : `tab:${target.tabId}`;
	async function readAutomationTargets() {
		const stored = (await chrome.storage.local.get(AUTOMATION_TARGETS_STORAGE_KEY))[AUTOMATION_TARGETS_STORAGE_KEY];
		if (stored === void 0) return {};
		if (typeof stored !== "object" || stored === null || Array.isArray(stored)) throw invalidAutomationTargetState("Invalid Chrome automation targets state");
		const decoded = Object.fromEntries(Object.entries(stored).map(([sessionKey, value]) => {
			if (!Array.isArray(value) || value.length === 0) throw invalidAutomationTargetState(`Invalid Chrome automation target set for DSH session ${sessionKey}`);
			const sessionTargets = value.map((target) => decodeAutomationTarget(target, sessionKey));
			const identities = sessionTargets.map(targetIdentity);
			if (new Set(identities).size !== identities.length) throw invalidAutomationTargetState(`DSH session ${sessionKey} contains duplicate Chrome automation targets`);
			return [sessionKey, sessionTargets];
		}));
		assertAutomationTargetQuotas(decoded);
		return decoded;
	}
	async function persistAutomationTargets(targets) {
		assertAutomationTargetQuotas(targets);
		if (Object.keys(targets).length === 0) await chrome.storage.local.remove(AUTOMATION_TARGETS_STORAGE_KEY);
		else await chrome.storage.local.set({ [AUTOMATION_TARGETS_STORAGE_KEY]: targets });
	}
	async function appendAutomationTarget(sessionKey, target) {
		const targets = await readAutomationTargets();
		const sessionTargets = targets[sessionKey] ?? [];
		const profileCount = Object.values(targets).reduce((count, entries) => count + entries.length, 0);
		if (sessionTargets.length >= MAX_AUTOMATION_TARGETS_PER_SESSION) throw rejected("automation-target-limit", `DSH session ${sessionKey} already owns ${sessionTargets.length} Chrome automation targets; maximum is ${MAX_AUTOMATION_TARGETS_PER_SESSION}. Close an owned tab before creating another.`, {
			scope: "session",
			limit: MAX_AUTOMATION_TARGETS_PER_SESSION,
			current: sessionTargets.length
		});
		if (profileCount >= MAX_AUTOMATION_TARGETS_PER_PROFILE) throw rejected("automation-target-limit", `The active Chrome profile already stores ${profileCount} automation targets; maximum is ${MAX_AUTOMATION_TARGETS_PER_PROFILE}. Close obsolete automation tabs before retrying.`, {
			scope: "profile",
			limit: MAX_AUTOMATION_TARGETS_PER_PROFILE,
			current: profileCount
		});
		await persistAutomationTargets({
			...targets,
			[sessionKey]: [...sessionTargets, target]
		});
	}
	async function replaceAutomationTarget(sessionKey, previous, replacement) {
		const targets = await readAutomationTargets();
		const sessionTargets = targets[sessionKey] ?? [];
		const identity = targetIdentity(previous);
		if (!sessionTargets.some((target) => targetIdentity(target) === identity)) throw invalidAutomationTargetState(`DSH session ${sessionKey} lost automation target ${identity} during allocation`);
		await persistAutomationTargets({
			...targets,
			[sessionKey]: sessionTargets.map((target) => targetIdentity(target) === identity ? replacement : target)
		});
	}
	async function removeAutomationTarget(sessionKey, target) {
		const targets = await readAutomationTargets();
		const sessionTargets = targets[sessionKey];
		if (!sessionTargets) return;
		const identity = targetIdentity(target);
		const retained = sessionTargets.filter((entry) => targetIdentity(entry) !== identity);
		if (retained.length === sessionTargets.length) return;
		if (retained.length === 0) {
			const updated = { ...targets };
			delete updated[sessionKey];
			await persistAutomationTargets(updated);
			return;
		}
		await persistAutomationTargets({
			...targets,
			[sessionKey]: retained
		});
	}
	var targetBootstrapUrl = () => chrome.runtime.getURL(TARGET_BOOTSTRAP_DOCUMENT_PATH);
	var allocationUrl = (target) => `${targetBootstrapUrl()}#${target.nonce}`;
	var isAllocationUrl = (url) => url.startsWith(`${targetBootstrapUrl()}#`);
	async function withTargetTurn(operation) {
		const previous = targetTurn;
		let release;
		targetTurn = new Promise((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await operation();
		} finally {
			release();
		}
	}
	async function regularNormalWindows() {
		return (await chrome.windows.getAll({ windowTypes: ["normal"] })).filter((window) => typeof window.id === "number" && window.type === "normal" && window.incognito !== true);
	}
	var staleResolution = (target, reason) => ({
		state: "stale",
		target,
		reason
	});
	var ownershipLost = (sessionKey, target, reason) => new AutomationOwnershipLost(reason === "epoch-changed" ? `DSH session ${sessionKey} has automation ownership from a previous browser epoch. Clear the stale automation target before creating a replacement; no existing tab was adopted or closed.` : reason === "tab-missing" ? `DSH session ${sessionKey} lost its exact automation tab. Clear the stale automation target before creating a replacement; no other tab was adopted or closed.` : `DSH session ${sessionKey}'s automation tab left the active profile's regular windows. Call chrome_automation_clear_stale to remove the stale ownership record before creating a replacement; no other tab was adopted or closed.`, reason, target.state === "owned" ? target.tabId : null);
	var resolutionDetails = (resolutions) => resolutions.map((resolution) => {
		switch (resolution.state) {
			case "owned": return {
				state: "owned",
				tabId: resolution.tab.id ?? null,
				title: resolution.tab.title ?? "",
				url: resolution.tab.url ?? ""
			};
			case "allocation-needed": return {
				state: "allocating",
				tabId: null
			};
			case "stale": return {
				state: "stale",
				tabId: resolution.target.state === "owned" ? resolution.target.tabId : null,
				reason: resolution.reason
			};
		}
	});
	var ambiguousAutomationTarget = (sessionKey, resolutions) => rejected("ambiguous-owned-target", `DSH session ${sessionKey} owns ${resolutions.length} Chrome automation targets. Pass one exact target id.`, { ownedTargets: resolutionDetails(resolutions) });
	var resolveAutomationTargets = async (sessionKey, recoverAllocation = true) => {
		const targets = (await readAutomationTargets())[sessionKey] ?? [];
		if (targets.length === 0) return [];
		const epoch = await currentBrowserEpoch();
		const normalWindows = await regularNormalWindows();
		const normalWindowIds = new Set(normalWindows.map((window) => window.id));
		const tabs = recoverAllocation && targets.some((target) => target.state === "allocating") ? await chrome.tabs.query({}) : [];
		const resolutions = [];
		for (const target of targets) {
			if (target.epoch !== epoch) {
				resolutions.push(staleResolution(target, "epoch-changed"));
				continue;
			}
			if (target.state === "allocating") {
				if (!recoverAllocation) {
					resolutions.push({
						state: "allocation-needed",
						target
					});
					continue;
				}
				const allocating = tabs.filter((candidate) => typeof candidate.id === "number" && normalWindowIds.has(candidate.windowId) && candidate.incognito !== true && candidate.url === allocationUrl(target));
				if (allocating.length > 1) throw invalidAutomationTargetState(`DSH session ${sessionKey} has multiple tabs carrying allocation nonce ${target.nonce}`);
				const candidate = allocating[0];
				if (!candidate || typeof candidate.id !== "number") {
					resolutions.push({
						state: "allocation-needed",
						target
					});
					continue;
				}
				await groupTab(candidate, target.label);
				const tab = await chrome.tabs.get(candidate.id);
				const owned = {
					state: "owned",
					epoch,
					tabId: candidate.id,
					label: target.label
				};
				await replaceAutomationTarget(sessionKey, target, owned);
				resolutions.push({
					state: "owned",
					target: owned,
					tab
				});
				continue;
			}
			const tab = await chrome.tabs.get(target.tabId).catch(() => null);
			if (!tab || typeof tab.id !== "number") {
				resolutions.push(staleResolution(target, "tab-missing"));
				continue;
			}
			if (!normalWindowIds.has(tab.windowId) || tab.incognito === true) {
				resolutions.push(staleResolution(target, "tab-outside-regular-profile"));
				continue;
			}
			resolutions.push({
				state: "owned",
				target,
				tab
			});
		}
		return resolutions;
	};
	async function createAutomationTarget(sessionKey, target, normalWindows, groupColor) {
		const windowId = normalWindows[0]?.id;
		if (typeof windowId !== "number") throw rejected("chrome-window-required", "Chrome automation target requires a regular window id");
		const tab = await chrome.tabs.create({
			url: allocationUrl(target),
			active: false,
			windowId
		});
		if (typeof tab.id !== "number") throw new BrowserOutcomeUnknown("Chrome created an automation tab without an id", { cause: "tabs.create returned no tab id" });
		try {
			await groupTab(tab, target.label, groupColor);
			const grouped = await chrome.tabs.get(tab.id);
			await replaceAutomationTarget(sessionKey, target, {
				state: "owned",
				epoch: target.epoch,
				tabId: tab.id,
				label: target.label
			});
			return grouped;
		} catch (error) {
			try {
				await chrome.tabs.remove(tab.id);
			} catch (closeError) {
				if ((await chrome.tabs.query({}).catch((probeError) => {
					throw new AggregateError([
						error,
						closeError,
						probeError
					], `Chrome target creation failed and tab ${tab.id} closure could not be verified; allocation ownership was retained`);
				})).some((candidate) => candidate.id === tab.id)) throw new AggregateError([error, closeError], `Chrome target creation failed and tab ${tab.id} remained open; allocation ownership was retained`);
			}
			try {
				await removeAutomationTarget(sessionKey, target);
			} catch (clearError) {
				throw new AggregateError([error, clearError], `Chrome target creation failed after tab ${tab.id} was closed; allocation ownership cleanup must be retried`);
			}
			throw error;
		}
	}
	async function getOwnedAutomationTarget(sessionKey) {
		return withTargetTurn(async () => {
			await autoReconcileSafeStaleAutomationTargets(sessionKey);
			const current = await resolveAutomationTargets(sessionKey, false);
			if (current.length === 0) return null;
			if (current.length > 1) throw ambiguousAutomationTarget(sessionKey, current);
			const resolution = (await resolveAutomationTargets(sessionKey))[0];
			if (resolution.state === "owned") return resolution.tab;
			if (resolution.state === "stale") throw ownershipLost(sessionKey, resolution.target, resolution.reason);
			throw rejected("automation-target-allocation-pending", `DSH session ${sessionKey} has an unfinished Chrome automation target allocation. Clear the stale automation target before retrying.`);
		});
	}
	async function getOrCreateAutomationTarget(sessionKey, groupTitle) {
		return withTargetTurn(async () => {
			await autoReconcileSafeStaleAutomationTargets(sessionKey);
			const label = cleanGroupTitle(groupTitle);
			const current = await resolveAutomationTargets(sessionKey, false);
			if (current.length > 1) throw ambiguousAutomationTarget(sessionKey, current);
			const resolution = current.length === 0 ? void 0 : (await resolveAutomationTargets(sessionKey))[0];
			if (resolution?.state === "owned") {
				const groupId = resolution.tab.groupId;
				if (typeof groupId === "number" && groupId >= 0 && chrome.tabGroups) {
					const group = await chrome.tabGroups.get(groupId).catch(() => null);
					if (group && cleanGroupTitle(group.title || "") !== label) await chrome.tabGroups.update(groupId, { title: label });
				}
				return resolution.tab;
			}
			if (resolution?.state === "stale") throw ownershipLost(sessionKey, resolution.target, resolution.reason);
			const normalWindows = await regularNormalWindows();
			if (normalWindows.length === 0) throw rejected("chrome-window-required", "No regular Chrome window is open in the bound Chrome profile. Open the bound Chrome profile and try again.");
			const target = resolution?.state === "allocation-needed" ? resolution.target : {
				state: "allocating",
				epoch: await currentBrowserEpoch(),
				nonce: globalThis.crypto.randomUUID(),
				label
			};
			if (!resolution) await appendAutomationTarget(sessionKey, target);
			return createAutomationTarget(sessionKey, target, normalWindows);
		});
	}
	async function createNewAutomationTarget(sessionKey, groupTitle, groupColor) {
		return withTargetTurn(async () => {
			await autoReconcileSafeStaleAutomationTargets(sessionKey);
			const label = cleanGroupTitle(groupTitle);
			const resolutions = await resolveAutomationTargets(sessionKey, false);
			const stale = resolutions.find((resolution) => resolution.state === "stale");
			if (stale?.state === "stale") throw ownershipLost(sessionKey, stale.target, stale.reason);
			if (resolutions.some((resolution) => resolution.state === "allocation-needed")) throw rejected("automation-target-allocation-pending", `DSH session ${sessionKey} has an unfinished Chrome automation target allocation. Clear the stale automation target before creating another tab.`);
			const normalWindows = await regularNormalWindows();
			if (normalWindows.length === 0) throw rejected("chrome-window-required", "No regular Chrome window is open in the bound Chrome profile. Open the bound Chrome profile and try again.");
			const target = {
				state: "allocating",
				epoch: await currentBrowserEpoch(),
				nonce: globalThis.crypto.randomUUID(),
				label
			};
			await appendAutomationTarget(sessionKey, target);
			return createAutomationTarget(sessionKey, target, normalWindows, groupColor);
		});
	}
	async function getAutomationTargetStatus(sessionKey) {
		return withTargetTurn(async () => {
			const resolutions = await resolveAutomationTargets(sessionKey, false);
			return { targets: await Promise.all(resolutions.map(async (resolution) => {
				switch (resolution.state) {
					case "owned": return {
						state: "owned",
						tab: await formatTab(resolution.tab)
					};
					case "allocation-needed": return { state: "allocating" };
					case "stale": return {
						state: "stale",
						reason: resolution.reason,
						recordedTabId: resolution.target.state === "owned" ? resolution.target.tabId : null
					};
				}
			})) };
		});
	}
	var AUTO_RECONCILE_STALE_REASONS = new Set([
		"epoch-changed",
		"tab-missing"
	]);
	var clearProvedStaleAutomationTargets = async (sessionKey, reasons) => {
		const resolutions = await resolveAutomationTargets(sessionKey, false);
		let staleOwnershipsCleared = 0;
		for (const resolution of resolutions) {
			if (resolution.state !== "stale") continue;
			if (reasons !== void 0 && !reasons.has(resolution.reason)) continue;
			await removeAutomationTarget(sessionKey, resolution.target);
			staleOwnershipsCleared += 1;
		}
		return { staleOwnershipsCleared };
	};
	var autoReconcileSafeStaleAutomationTargets = async (sessionKey) => clearProvedStaleAutomationTargets(sessionKey, AUTO_RECONCILE_STALE_REASONS);
	async function clearStaleAutomationTargets(sessionKey) {
		return withTargetTurn(async () => clearProvedStaleAutomationTargets(sessionKey));
	}
	async function clearAllStaleAutomationTargets() {
		return withTargetTurn(async () => {
			const targets = await readAutomationTargets();
			let staleOwnershipsCleared = 0;
			for (const sessionKey of Object.keys(targets)) {
				staleOwnershipsCleared += (await clearProvedStaleAutomationTargets(sessionKey)).staleOwnershipsCleared;
			}
			return { staleOwnershipsCleared };
		});
	}
	async function profileStaleAutomationStatus() {
		return withTargetTurn(async () => {
			const targets = await readAutomationTargets();
			const staleTargets = [];
			for (const sessionKey of Object.keys(targets)) {
				const resolutions = await resolveAutomationTargets(sessionKey, false);
				for (const resolution of resolutions) {
					if (resolution.state !== "stale") continue;
					staleTargets.push({
						sessionKey,
						reason: resolution.reason,
						recordedTabId: resolution.target.state === "owned" ? resolution.target.tabId : null
					});
				}
			}
			return {
				staleCount: staleTargets.length,
				staleTargets
			};
		});
	}
	async function cleanupAutomationTarget(sessionKey) {
		return withTargetTurn(async () => {
			return executeAutomationTargetCleanup(await planAutomationTargetCleanup(sessionKey));
		});
	}
	var planAutomationTargetCleanup = async (onlySessionKey) => {
		const targets = await readAutomationTargets();
		if (Object.keys(targets).length === 0) return [];
		const epoch = await currentBrowserEpoch();
		const normalWindows = await regularNormalWindows();
		const normalWindowIds = new Set(normalWindows.map((window) => window.id));
		const selectedTargets = Object.entries(targets).filter(([sessionKey]) => onlySessionKey === void 0 || sessionKey === onlySessionKey);
		const allocatingTabs = selectedTargets.some(([, sessionTargets]) => sessionTargets.some((target) => target.epoch === epoch && target.state === "allocating")) ? await chrome.tabs.query({}) : [];
		const cleanup = [];
		for (const [sessionKey, sessionTargets] of selectedTargets) for (const target of sessionTargets) {
			if (target.epoch !== epoch) {
				cleanup.push({
					sessionKey,
					target,
					tabId: null,
					stale: true
				});
				continue;
			}
			if (target.state === "allocating") {
				const candidates = allocatingTabs.filter((candidate) => typeof candidate.id === "number" && normalWindowIds.has(candidate.windowId) && candidate.incognito !== true && candidate.url === allocationUrl(target));
				if (candidates.length > 1) throw invalidAutomationTargetState(`DSH session ${sessionKey} has multiple tabs carrying allocation nonce ${target.nonce}`);
				const candidate = candidates[0];
				cleanup.push({
					sessionKey,
					target,
					tabId: candidate && typeof candidate.id === "number" ? candidate.id : null,
					stale: candidate === void 0
				});
				continue;
			}
			const tab = await chrome.tabs.get(target.tabId).catch(() => null);
			const provablyOwned = tab !== null && typeof tab.id === "number" && normalWindowIds.has(tab.windowId) && tab.incognito !== true;
			cleanup.push({
				sessionKey,
				target,
				tabId: provablyOwned ? target.tabId : null,
				stale: !provablyOwned
			});
		}
		return cleanup;
	};
	var executeAutomationTargetCleanup = async (cleanup) => {
		const closedTabIds = [];
		let staleOwnershipsCleared = 0;
		for (const action of cleanup) {
			if (action.tabId !== null) {
				await chrome.tabs.remove(action.tabId);
				closedTabIds.push(action.tabId);
			}
			if (action.stale) staleOwnershipsCleared += 1;
			await removeAutomationTarget(action.sessionKey, action.target);
		}
		return {
			closedTabIds,
			staleOwnershipsCleared
		};
	};
	async function cleanupAllAutomationTargets() {
		return withTargetTurn(async () => {
			const cleanup = await planAutomationTargetCleanup();
			const clearedSessionCount = new Set(cleanup.map((action) => action.sessionKey)).size;
			return {
				...await executeAutomationTargetCleanup(cleanup),
				clearedSessionCount
			};
		});
	}
	async function releaseAutomationTargetTab(tabId) {
		await withTargetTurn(async () => {
			const epoch = await currentBrowserEpoch();
			const targets = await readAutomationTargets();
			let changed = false;
			const retained = Object.fromEntries(Object.entries(targets).flatMap(([sessionKey, sessionTargets]) => {
				const entries = sessionTargets.filter((target) => target.state !== "owned" || target.epoch !== epoch || target.tabId !== tabId);
				if (entries.length !== sessionTargets.length) changed = true;
				return entries.length === 0 ? [] : [[sessionKey, entries]];
			}));
			if (!changed) return;
			await persistAutomationTargets(retained);
		});
	}
	async function handleAutomationTabRemoved(tabId, _removeInfo) {
		await releaseAutomationTargetTab(tabId);
	}
	function cleanGroupTitle(value) {
		return value.replace(/\s+/g, " ").trim().slice(0, 80) || "DSH";
	}
	async function groupRecord(groupId) {
		if (typeof groupId !== "number" || groupId < 0 || !chrome.tabGroups) return null;
		const group = await chrome.tabGroups.get(groupId).catch(() => null);
		if (!group) return null;
		return {
			id: group.id,
			title: group.title || "",
			color: group.color || "",
			collapsed: Boolean(group.collapsed),
			windowId: group.windowId
		};
	}
	async function groupTab(tab, title, color) {
		if (!chrome.tabGroups) throw new Error("chrome.tabGroups API unavailable; reload the extension after granting the tabGroups permission");
		if (!tab || typeof tab.id !== "number") throw new Error("No tab to group");
		const groupTitle = cleanGroupTitle(title);
		if (typeof tab.groupId === "number" && tab.groupId >= 0) await chrome.tabs.ungroup(tab.id);
		const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
		await chrome.tabGroups.update(groupId, {
			title: groupTitle,
			color: color ?? DEFAULT_GROUP_COLOR,
			collapsed: false
		});
		return formatTab(await chrome.tabs.get(tab.id));
	}
	async function formatTab(tab) {
		return {
			id: tab.id,
			windowId: tab.windowId,
			active: tab.active,
			highlighted: tab.highlighted,
			title: tab.title || "",
			url: tab.url || "",
			...tab.status === void 0 ? {} : { status: tab.status },
			...tab.pinned === void 0 ? {} : { pinned: tab.pinned },
			...tab.incognito === void 0 ? {} : { incognito: tab.incognito },
			groupId: typeof tab.groupId === "number" ? tab.groupId : -1,
			group: await groupRecord(tab.groupId)
		};
	}
	async function getTabByParams(params, { createOwnedTarget = true } = {}) {
		const tabs = await chrome.tabs.query({}).catch((cause) => {
			throw new BrowserRejected("Chrome tabs could not be listed", {
				cause,
				code: "tab-list-failed"
			});
		});
		const usesOwnedTarget = params.selectedTabId === void 0 && params.urlFragment === void 0 && params.titleFragment === void 0;
		let tab;
		if (params.selectedTabId !== void 0) {
			const id = params.selectedTabId;
			tab = await chrome.tabs.get(id).catch(() => null);
			if (typeof tab?.id !== "number") throw rejected("tab-not-found", `No Chrome tab with id ${id} (it was likely closed or replaced). Re-target with chrome_tab_list, or pass urlFragment/titleFragment instead of selectedTabId.\nCurrent tabs:\n${tabs.filter((candidate) => candidate.id !== void 0).slice(0, 20).map((candidate) => `  ${candidate.id}${candidate.active ? " *" : ""}\t${(candidate.title || "(untitled)").slice(0, 60)}\t${candidate.url || ""}`).join("\n") || "  (none)"}`, {
				target: {
					by: "id",
					value: id
				},
				currentTabs: tabs.filter((candidate) => candidate.id !== void 0).slice(0, 20).map((candidate) => ({
					id: candidate.id ?? -1,
					title: candidate.title ?? "",
					url: candidate.url ?? ""
				}))
			});
		} else if (params.urlFragment) {
			const urlFragment = params.urlFragment;
			const matches = tabs.filter((candidate) => (candidate.url || "").includes(urlFragment));
			if (matches.length > 1) throw rejected("ambiguous-tab-target", `Chrome tab URL target is ambiguous (${matches.map((candidate) => candidate.id).join(", ")}). Run chrome_tab_list and target one exact tab id.`, {
				target: {
					by: "url",
					value: urlFragment
				},
				matchingTabIds: matches.flatMap((candidate) => candidate.id === void 0 ? [] : [candidate.id])
			});
			tab = matches[0];
		} else if (params.titleFragment) {
			const titleFragment = params.titleFragment;
			const matches = tabs.filter((candidate) => (candidate.title || "").includes(titleFragment));
			if (matches.length > 1) throw rejected("ambiguous-tab-target", `Chrome tab title target is ambiguous (${matches.map((candidate) => candidate.id).join(", ")}). Run chrome_tab_list and target one exact tab id.`, {
				target: {
					by: "title",
					value: titleFragment
				},
				matchingTabIds: matches.flatMap((candidate) => candidate.id === void 0 ? [] : [candidate.id])
			});
			tab = matches[0];
		} else {
			const sessionKey = sessionKeyOf(params);
			tab = createOwnedTarget ? await getOrCreateAutomationTarget(sessionKey, params.sessionGroupTitle) : await getOwnedAutomationTarget(sessionKey);
			if (!tab) throw rejected("automation-target-required", "No target tab specified and this DSH session has no automation tab yet. Pass selectedTabId/urlFragment/titleFragment, or run chrome_navigate first.");
		}
		if (typeof tab?.id !== "number" || typeof tab.windowId !== "number") throw rejected("tab-not-found", "No matching Chrome tab found");
		const url = tab.url || "";
		if (!(usesOwnedTarget && isAllocationUrl(url)) && (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("devtools://"))) throw rejected("protected-tab-url", `Chrome blocks extension automation on protected URL: tab=${tab.id} url=${url}`);
		if (usesOwnedTarget && params.sessionGroupTitle) tab = await joinSessionGroup(tab, params.sessionGroupTitle);
		return tab;
	}
	async function joinSessionGroup(tab, title) {
		if (typeof tab.id !== "number") throw new Error("No tab to join to the DSH session group");
		if (typeof tab.groupId === "number" && tab.groupId >= 0) return tab;
		await groupTab(tab, title);
		return chrome.tabs.get(tab.id);
	}
	async function bringToFront(tab) {
		if (typeof tab.id !== "number" || typeof tab.windowId !== "number") throw new Error("Chrome tab cannot be focused without tab and window ids");
		try {
			await withTimeout(
				chrome.windows.update(tab.windowId, { focused: true }),
				2e3,
				`chrome.windows.update timed out after 2000ms for window ${tab.windowId}`
			);
		} catch (error) {
			console.warn("[dsh-chrome] window focus failed:", error);
		}
		try {
			await withTimeout(
				chrome.tabs.update(tab.id, { active: true }),
				2e3,
				`chrome.tabs.update timed out after 2000ms for tab ${tab.id}`
			);
		} catch (error) {
			console.warn("[dsh-chrome] tab activation failed:", error);
		}
	}
	//#endregion
	//#region src/browser/key-layout.ts
	function usKeyLayoutForChar(ch) {
		const punctuation = {
			"`": {
				code: "Backquote",
				keyCode: 192
			},
			"~": {
				code: "Backquote",
				keyCode: 192,
				shift: true
			},
			"-": {
				code: "Minus",
				keyCode: 189
			},
			_: {
				code: "Minus",
				keyCode: 189,
				shift: true
			},
			"=": {
				code: "Equal",
				keyCode: 187
			},
			"+": {
				code: "Equal",
				keyCode: 187,
				shift: true
			},
			"[": {
				code: "BracketLeft",
				keyCode: 219
			},
			"{": {
				code: "BracketLeft",
				keyCode: 219,
				shift: true
			},
			"]": {
				code: "BracketRight",
				keyCode: 221
			},
			"}": {
				code: "BracketRight",
				keyCode: 221,
				shift: true
			},
			"\\": {
				code: "Backslash",
				keyCode: 220
			},
			"|": {
				code: "Backslash",
				keyCode: 220,
				shift: true
			},
			";": {
				code: "Semicolon",
				keyCode: 186
			},
			":": {
				code: "Semicolon",
				keyCode: 186,
				shift: true
			},
			"'": {
				code: "Quote",
				keyCode: 222
			},
			"\"": {
				code: "Quote",
				keyCode: 222,
				shift: true
			},
			",": {
				code: "Comma",
				keyCode: 188
			},
			"<": {
				code: "Comma",
				keyCode: 188,
				shift: true
			},
			".": {
				code: "Period",
				keyCode: 190
			},
			">": {
				code: "Period",
				keyCode: 190,
				shift: true
			},
			"/": {
				code: "Slash",
				keyCode: 191
			},
			"?": {
				code: "Slash",
				keyCode: 191,
				shift: true
			},
			" ": {
				code: "Space",
				keyCode: 32
			}
		};
		const shiftedDigits = {
			")": "0",
			"!": "1",
			"@": "2",
			"#": "3",
			$: "4",
			"%": "5",
			"^": "6",
			"&": "7",
			"*": "8",
			"(": "9"
		};
		if (/^[a-z]$/.test(ch)) return {
			code: `Key${ch.toUpperCase()}`,
			keyCode: ch.toUpperCase().charCodeAt(0),
			needShift: false
		};
		if (/^[A-Z]$/.test(ch)) return {
			code: `Key${ch}`,
			keyCode: ch.charCodeAt(0),
			needShift: true
		};
		if (/^[0-9]$/.test(ch)) return {
			code: `Digit${ch}`,
			keyCode: ch.charCodeAt(0),
			needShift: false
		};
		const digit = shiftedDigits[ch];
		if (digit) return {
			code: `Digit${digit}`,
			keyCode: digit.charCodeAt(0),
			needShift: true
		};
		const symbol = punctuation[ch];
		if (symbol) return {
			code: symbol.code,
			keyCode: symbol.keyCode,
			needShift: symbol.shift === true
		};
		return {
			code: "",
			keyCode: 0,
			needShift: false
		};
	}
	//#endregion
	//#region src/protocol/action-graph.ts
	var ACTION_VERBS = [
		"click",
		"fill",
		"press",
		"upload"
	];
	var CLICK_ACTION_ROLES = [
		"button",
		"checkbox",
		"combobox",
		"link",
		"menuitem",
		"menuitemcheckbox",
		"menuitemradio",
		"option",
		"radio",
		"switch",
		"tab",
		"treeitem"
	];
	var CLICK_ROLES = new Set(CLICK_ACTION_ROLES);
	var EDITABLE_ROLES = /* @__PURE__ */ new Set([
		"searchbox",
		"spinbutton",
		"textbox"
	]);
	var actionVerbsFor = (evidence) => {
		if (evidence.disabled || evidence.inert) return [];
		const role = evidence.role.toLowerCase();
		const tag = evidence.tag?.toLowerCase();
		const type = evidence.type?.toLowerCase();
		if (tag === "input" && type === "file") return ["upload"];
		if (evidence.editable || EDITABLE_ROLES.has(role)) return ["fill", "press"];
		if (role === "combobox") return ["click", "press"];
		if (CLICK_ROLES.has(role) || evidence.clickable) return ["click"];
		return [];
	};
	var actionRefFromEvidence = (evidence) => {
		const verbs = actionVerbsFor(evidence);
		if (verbs.length === 0) return void 0;
		return {
			kind: "action",
			id: evidence.id,
			role: evidence.role || evidence.tag || "element",
			name: evidence.name,
			state: {
				...evidence.checked === void 0 ? {} : { checked: evidence.checked },
				...evidence.focused ? { focused: true } : {}
			},
			verbs
		};
	};
	var mergeActionRefs = (domActions, accessibilityActions, limit) => {
		const byId = /* @__PURE__ */ new Map();
		for (const action of [...domActions, ...accessibilityActions]) {
			const previous = byId.get(action.id);
			if (!previous) {
				byId.set(action.id, action);
				continue;
			}
			byId.set(action.id, {
				kind: "action",
				id: action.id,
				role: action.role || previous.role,
				name: action.name || previous.name,
				state: {
					...previous.state,
					...action.state
				},
				verbs: ACTION_VERBS.filter((verb) => previous.verbs.includes(verb) || action.verbs.includes(verb))
			});
		}
		return [...byId.values()].slice(0, limit);
	};
	//#endregion
	//#region src/browser/action-elements.ts
	var ACTION_ELEMENT_SELECTOR = [
		"a[href]",
		"button",
		"input:not([type='hidden'])",
		"select",
		"textarea",
		"summary",
		...CLICK_ACTION_ROLES.map((role) => `[role='${role}']`),
		"[contenteditable='true']",
		"[onclick]",
		"[tabindex]:not([tabindex='-1'])"
	].join(",");
	var ACTION_BLOCKED_SELECTOR = ":disabled,[disabled],[aria-disabled='true'],[inert]";
	//#endregion
	//#region src/browser/platform-input-shared.ts
	async function resolveTargetInTab(tabId, params, options = {}) {
		const v = (await executeScript({
			target: {
				tabId,
				frameIds: [0]
			},
			world: "MAIN",
			func: (selector, uid, x, y, preferInteractive, expectedVerb, interactiveSelector, blockedSelector) => {
				let state = window.__DSH_CHROME_STATE__;
				if (!state && selector) {
					state = {
						nextElementUid: 1,
						nextFrontierUid: 1,
						refs: /* @__PURE__ */ new Map(),
						console: [],
						network: [],
						nextRequestId: 1,
						instrumentationInstalled: false,
						lastSnapshotDigest: null
					};
					window.__DSH_CHROME_STATE__ = state;
				}
				let el = null;
				if (uid) {
					const ref = state?.refs.get(uid);
					el = ref?.kind === "element" ? ref.element : null;
					if (!el || !el.isConnected) {
						state?.refs.delete(uid);
						return {
							found: false,
							staleUid: true,
							reason: `snapshot uid ${uid} is stale; call chrome_snapshot again`,
							url: location.href
						};
					}
					if (expectedVerb && (ref?.kind !== "element" || !ref.verbs.has(expectedVerb))) return {
						found: false,
						verbMismatch: true,
						reason: `snapshot uid ${uid} does not grant ${expectedVerb}; take a fresh chrome_snapshot and use a ref whose Action Graph entry includes ${expectedVerb}`,
						url: location.href
					};
					state.refs.delete(uid);
					state.refs.set(uid, ref);
				} else if (selector) el = document.querySelector(selector);
				if (el) {
					const requestedTag = el.tagName;
					let promotedFromTag;
					if (preferInteractive) {
						if (!el.matches?.(interactiveSelector)) {
							if (uid) return {
								found: false,
								nonInteractive: true,
								reason: `Action ref ${uid} no longer resolves to the exact interactive element that issued it; take a fresh chrome_snapshot.`,
								url: location.href
							};
							const ancestor = el.closest?.(interactiveSelector);
							if (!ancestor) return {
								found: false,
								nonInteractive: true,
								reason: `Target ${uid || selector || requestedTag} is <${String(requestedTag || "element").toLowerCase()}> text/content, not an interactive control. Use a ref whose Action Graph entry includes click.`,
								url: location.href
							};
							promotedFromTag = requestedTag;
							el = ancestor;
						}
						if (el.matches?.(blockedSelector) || el.closest?.("[inert]")) return {
							found: false,
							invalidClickTarget: true,
							reason: `Target ${uid || selector || requestedTag} resolves to a disabled or inert <${String(el.tagName || "element").toLowerCase()}>. Take a fresh chrome_snapshot and choose a ref with click.`,
							url: location.href
						};
					}
					el.scrollIntoView({
						block: "center",
						inline: "center",
						behavior: "instant"
					});
					const r = el.getBoundingClientRect();
					let resolvedUid;
					if (state) {
						for (const [key, registered] of state.refs) if (registered.kind === "element" && registered.element === el) {
							resolvedUid = key;
							break;
						}
						if (!resolvedUid) {
							if (!el.__dshChromeUid) el.__dshChromeUid = `el-${state.nextElementUid++}`;
							resolvedUid = el.__dshChromeUid;
							state.refs.set(resolvedUid, {
								kind: "element",
								element: el,
								verbs: /* @__PURE__ */ new Set(),
								context: false
							});
						}
					}
					return {
						x: r.left + r.width / 2,
						y: r.top + r.height / 2,
						rect: {
							left: r.left,
							top: r.top,
							width: r.width,
							height: r.height
						},
						tag: el.tagName,
						requestedTag,
						promotedFromTag,
						resolvedUid,
						interactive: preferInteractive ? true : void 0,
						found: true
					};
				}
				if (typeof x === "number" && typeof y === "number") return {
					x,
					y,
					rect: null,
					tag: null,
					found: true
				};
				return { found: false };
			},
			args: [
				params.selector ?? null,
				params.uid ?? null,
				params.x ?? null,
				params.y ?? null,
				options.preferInteractive === true,
				options.expectedVerb ?? null,
				ACTION_ELEMENT_SELECTOR,
				ACTION_BLOCKED_SELECTOR
			]
		}))?.[0]?.result;
		if (!v) throw new BrowserRejected("Could not resolve target element for Chrome input", { code: "action-target-not-found" });
		if (!v.found) throw new BrowserRejected(v.reason || "Invalid action target; call chrome_snapshot again and choose a ref with the required verb.", {
			code: v.staleUid ? "stale-action-ref" : v.verbMismatch ? "action-verb-mismatch" : "invalid-action-target",
			details: {
				...params.uid ? { ref: params.uid } : {},
				...v.url ? { url: v.url } : {}
			}
		});
		return v;
	}
	async function assertTargetReceivesPoint(tabId, uid, point) {
		if (!uid) return;
		const result = (await executeScript({
			target: {
				tabId,
				frameIds: [0]
			},
			world: "MAIN",
			func: (targetUid, x, y) => {
				const ref = window.__DSH_CHROME_STATE__?.refs.get(targetUid);
				const expected = ref?.kind === "element" ? ref.element : null;
				if (!expected || !expected.isConnected) return {
					ok: false,
					stale: true
				};
				const hit = document.elementFromPoint(x, y);
				if (!hit) return {
					ok: false,
					blocker: "no element"
				};
				const up = (node) => {
					if (!node) return null;
					return node.parentNode || node.host || null;
				};
				for (let node = hit; node; node = up(node)) if (node === expected) return { ok: true };
				for (let node = expected; node; node = up(node)) if (node === hit) return { ok: true };
				const hitLabel = hit.closest?.("label");
				if (hitLabel && (hitLabel.control === expected || hitLabel.contains(expected))) return { ok: true };
				if ((expected.closest?.("label"))?.contains(hit)) return { ok: true };
				let blocker = hit.tagName.toLowerCase();
				if (hit.id) blocker += `#${hit.id}`;
				else if (typeof hit.className === "string" && hit.className.trim()) blocker += `.${hit.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
				return {
					ok: false,
					blocker
				};
			},
			args: [
				uid,
				point.x,
				point.y
			]
		}))?.[0]?.result;
		if (result?.ok === true) return;
		if (result?.stale) throw new BrowserRejected(`Action ref ${uid} became stale before input dispatch`, {
			code: "stale-action-ref",
			details: { ref: uid }
		});
		throw new BrowserRejected(`Action ref ${uid} is covered by <${result?.blocker || "unknown"}> at its click point; dismiss the blocker and take a fresh chrome_snapshot`, {
			code: "click-intercepted",
			details: {
				ref: uid,
				point,
				blocker: result?.blocker || "unknown"
			}
		});
	}
	function pickInsideRect(rect) {
		if (!rect) return null;
		const insetX = Math.min(rect.width * .35, Math.max(2, rect.width / 2 - 1));
		const insetY = Math.min(rect.height * .35, Math.max(2, rect.height / 2 - 1));
		return {
			x: rect.left + rect.width / 2 + rng(-insetX, insetX),
			y: rect.top + rect.height / 2 + rng(-insetY, insetY)
		};
	}
	async function cdpMoveTo(tabId, x, y) {
		const origin = pointerOrigin(tabId, Math.max(20, Math.min(400, x - 200)), Math.max(20, Math.min(400, y - 200)));
		const startX = origin.x;
		const startY = origin.y;
		const n = Math.max(18, Math.min(42, Math.round(Math.hypot(x - startX, y - startY) / 18)));
		for (let i = 1; i <= n; i++) {
			const t = i / n;
			const ease = t * t * (3 - 2 * t);
			const wobble = Math.sin(t * Math.PI) * 8;
			await cdp(tabId, "Input.dispatchMouseEvent", {
				type: "mouseMoved",
				x: startX + (x - startX) * ease + rng(-wobble, wobble),
				y: startY + (y - startY) * ease + rng(-wobble, wobble),
				button: "none",
				buttons: 0,
				pointerType: "mouse"
			});
			await sleep(rng(5, 16));
		}
		recordPointer(tabId, x, y);
	}
	function cdpModifiersFor(mods) {
		let m = 0;
		if (mods?.altKey) m |= 1;
		if (mods?.ctrlKey) m |= 2;
		if (mods?.metaKey) m |= 4;
		if (mods?.shiftKey) m |= 8;
		return m;
	}
	function cdpKeyInfo(key) {
		const SPECIAL = {
			Enter: {
				code: "Enter",
				windowsVirtualKeyCode: 13,
				text: "\r"
			},
			Tab: {
				code: "Tab",
				windowsVirtualKeyCode: 9,
				text: "	"
			},
			Backspace: {
				code: "Backspace",
				windowsVirtualKeyCode: 8,
				text: ""
			},
			Delete: {
				code: "Delete",
				windowsVirtualKeyCode: 46,
				text: ""
			},
			Escape: {
				code: "Escape",
				windowsVirtualKeyCode: 27,
				text: ""
			},
			ArrowLeft: {
				code: "ArrowLeft",
				windowsVirtualKeyCode: 37,
				text: ""
			},
			ArrowUp: {
				code: "ArrowUp",
				windowsVirtualKeyCode: 38,
				text: ""
			},
			ArrowRight: {
				code: "ArrowRight",
				windowsVirtualKeyCode: 39,
				text: ""
			},
			ArrowDown: {
				code: "ArrowDown",
				windowsVirtualKeyCode: 40,
				text: ""
			},
			Shift: {
				code: "ShiftLeft",
				windowsVirtualKeyCode: 16,
				text: ""
			},
			Control: {
				code: "ControlLeft",
				windowsVirtualKeyCode: 17,
				text: ""
			},
			Alt: {
				code: "AltLeft",
				windowsVirtualKeyCode: 18,
				text: ""
			},
			Meta: {
				code: "MetaLeft",
				windowsVirtualKeyCode: 91,
				text: ""
			}
		};
		const codePoints = Array.from(key);
		if (codePoints.length === 1) {
			const ch = codePoints[0];
			const layout = usKeyLayoutForChar(ch);
			return {
				key: ch,
				code: layout.code,
				windowsVirtualKeyCode: layout.keyCode,
				text: ch
			};
		}
		if (SPECIAL[key]) return {
			key,
			...SPECIAL[key]
		};
		return {
			key,
			code: key,
			windowsVirtualKeyCode: 0,
			text: ""
		};
	}
	async function cdpTypeChar(tabId, ch) {
		if (Array.from(ch).length !== 1) throw new Error("Chrome text input requires one Unicode code point");
		const layout = usKeyLayoutForChar(ch);
		const info = cdpKeyInfo(ch);
		const dispatchCharacter = (modifiers) => withResourceLease(async () => {
			await cdp(tabId, "Input.dispatchKeyEvent", {
				type: "keyDown",
				key: info.key,
				code: info.code,
				windowsVirtualKeyCode: info.windowsVirtualKeyCode,
				nativeVirtualKeyCode: info.windowsVirtualKeyCode,
				text: info.text,
				unmodifiedText: info.text,
				modifiers
			});
		}, () => sleep(rng(25, 90)), () => cdp(tabId, "Input.dispatchKeyEvent", {
			type: "keyUp",
			key: info.key,
			code: info.code,
			windowsVirtualKeyCode: info.windowsVirtualKeyCode,
			modifiers
		}).then(() => void 0));
		if (layout.needShift) await withResourceLease(async () => {
			await cdp(tabId, "Input.dispatchKeyEvent", {
				type: "keyDown",
				key: "Shift",
				code: "ShiftLeft",
				windowsVirtualKeyCode: 16,
				modifiers: 8
			});
		}, async () => {
			await sleep(rng(8, 22));
			await dispatchCharacter(8);
		}, async () => {
			await sleep(rng(5, 18));
			await cdp(tabId, "Input.dispatchKeyEvent", {
				type: "keyUp",
				key: "Shift",
				code: "ShiftLeft",
				windowsVirtualKeyCode: 16,
				modifiers: 0
			});
		});
		else await dispatchCharacter(0);
		await sleep(rng(35, 130));
	}
	//#endregion
	//#region src/browser/platform-input-click.ts
	async function captureClickState(tabId) {
		const tab = await chrome.tabs.get(tabId).catch(() => null);
		let page;
		try {
			page = (await executeScript({
				target: {
					tabId,
					frameIds: [0]
				},
				world: "MAIN",
				func: () => {
					const active = document.activeElement;
					const focus = active && active !== document.body && active !== document.documentElement ? [
						active.tagName,
						active.id || "",
						active.getAttribute?.("role") || ""
					].join("|") : "";
					const body = document.body;
					const text = body ? (body.innerText || "").slice(0, 4e3) : "";
					let inputs = "";
					if (body) for (const el of body.querySelectorAll("input,textarea,select")) {
						if (inputs.length >= 4e3) break;
						inputs += `${el.value || ""}\x00`;
					}
					const source = body ? `${text}|${inputs}|${body.getElementsByTagName("*").length}|${document.documentElement.scrollHeight}` : "";
					let pageHash = 2166136261;
					for (let i = 0; i < source.length; i++) {
						pageHash ^= source.charCodeAt(i);
						pageHash = Math.imul(pageHash, 16777619);
					}
					return {
						url: location.href,
						title: document.title,
						focus,
						scroll: `${Math.round(scrollX)},${Math.round(scrollY)}`,
						pageHash: pageHash >>> 0
					};
				},
				args: []
			}))?.[0]?.result;
		} catch {
			page = void 0;
		}
		return {
			url: page?.url || tab?.url || "",
			title: page?.title || tab?.title || "",
			status: tab?.status || "",
			focus: page?.focus || "",
			scroll: page?.scroll || "",
			pageHash: page?.pageHash
		};
	}
	function buildClickOutcome(before, after) {
		const observedChanges = [];
		const urlChanged = Boolean(before?.url && after?.url && before.url !== after.url);
		const titleChanged = Boolean(before?.title !== after?.title && (before?.title || after?.title));
		const focusChanged = Boolean(before?.focus !== after?.focus && (before?.focus || after?.focus));
		const scrollChanged = Boolean(before?.scroll !== after?.scroll && (before?.scroll || after?.scroll));
		const pageChanged = Boolean(before?.pageHash !== void 0 && after?.pageHash !== void 0 && before.pageHash !== after.pageHash);
		if (urlChanged) observedChanges.push("url");
		if (after?.status === "loading") observedChanges.push("navigation-pending");
		if (titleChanged) observedChanges.push("title");
		if (focusChanged) observedChanges.push("focus");
		if (scrollChanged) observedChanges.push("scroll");
		if (pageChanged) observedChanges.push("page");
		return {
			outcome: observedChanges.length ? "effect-observed" : "input-dispatched-no-observable-effect",
			observedChanges,
			urlChanged,
			titleChanged,
			focusChanged,
			scrollChanged,
			pageChanged,
			urlBefore: before?.url || "",
			urlAfter: after?.url || ""
		};
	}
	async function finalizeClickResult(tabId, before, result) {
		const startedAt = Date.now();
		let after = await captureClickState(tabId);
		let outcome = buildClickOutcome(before, after);
		if (!outcome.urlChanged && !outcome.titleChanged && !outcome.pageChanged) {
			await sleep(220);
			after = await captureClickState(tabId);
			outcome = buildClickOutcome(before, after);
		}
		return {
			...result,
			...outcome,
			observedAfterMs: Date.now() - startedAt
		};
	}
	async function chromeInputClick(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		const before = await captureClickState(tab.id);
		await attachDebugger(tab.id);
		const resolved = await resolveTargetInTab(tab.id, params, {
			preferInteractive: true,
			...params.uid ? { expectedVerb: "click" } : {}
		});
		const point = resolved.rect ? pickInsideRect(resolved.rect) : {
			x: resolved.x,
			y: resolved.y
		};
		await cdpMoveTo(tab.id, point.x, point.y);
		await assertTargetReceivesPoint(tab.id, resolved.resolvedUid, point);
		await withResourceLease(async () => {
			await cdp(tab.id, "Input.dispatchMouseEvent", {
				type: "mousePressed",
				x: point.x,
				y: point.y,
				button: "left",
				buttons: 1,
				clickCount: 1,
				pointerType: "mouse",
				force: .5
			});
		}, () => sleep(rng(45, 140)), () => cdp(tab.id, "Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x: point.x,
			y: point.y,
			button: "left",
			buttons: 0,
			clickCount: 1,
			pointerType: "mouse"
		}).then(() => void 0));
		const result = {
			input: "chrome",
			x: point.x,
			y: point.y,
			tag: resolved.tag,
			...resolved.requestedTag === void 0 ? {} : { requestedTag: resolved.requestedTag },
			...resolved.promotedFromTag === void 0 ? {} : { promotedFromTag: resolved.promotedFromTag },
			...resolved.resolvedUid === void 0 ? {} : { resolvedUid: resolved.resolvedUid }
		};
		return finalizeClickResult(tab.id, before, result);
	}
	async function chromeInputHover(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		const resolved = await resolveTargetInTab(tab.id, params);
		const point = resolved.rect ? pickInsideRect(resolved.rect) : {
			x: resolved.x,
			y: resolved.y
		};
		await cdpMoveTo(tab.id, point.x, point.y);
		await sleep(rng(80, 220));
		return {
			input: "chrome",
			x: point.x,
			y: point.y,
			tag: resolved.tag
		};
	}
	//#endregion
	//#region src/browser/platform-input-pointer.ts
	async function chromeInputScroll(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		const resolved = params.selector || params.uid ? await resolveTargetInTab(tab.id, params) : {
			x: 100,
			y: 100,
			rect: null
		};
		const x = resolved.rect ? resolved.rect.left + Math.min(resolved.rect.width, 800) / 2 : resolved.x;
		const y = resolved.rect ? resolved.rect.top + Math.min(resolved.rect.height, 600) / 2 : resolved.y;
		const totalY = params.deltaY ?? 0;
		const totalX = params.deltaX ?? 0;
		const steps = params.steps ?? 24;
		const peakIndex = Math.max(1, Math.floor(steps * .15));
		const weights = Array.from({ length: steps }, (_, index) => index <= peakIndex ? .5 + .5 * (index / peakIndex) : Math.pow(.88, index - peakIndex));
		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
		for (let index = 0; index < steps; index++) {
			const dy = totalY * (weights[index] / totalWeight);
			const dx = totalX * (weights[index] / totalWeight);
			await cdp(tab.id, "Input.dispatchMouseEvent", {
				type: "mouseWheel",
				x,
				y,
				deltaX: dx,
				deltaY: dy,
				pointerType: "mouse"
			});
			await sleep(rng(22, 48));
		}
		return {
			input: "chrome",
			deltaX: totalX,
			deltaY: totalY,
			steps
		};
	}
	async function chromeInputTap(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		const resolved = params.selector || params.uid || typeof params.x === "number" && typeof params.y === "number" ? await resolveTargetInTab(tab.id, params) : null;
		if (!resolved || !resolved.found) throw new Error("chrome.tap: target not found");
		const point = resolved.rect ? pickInsideRect(resolved.rect) : {
			x: resolved.x,
			y: resolved.y
		};
		const tp = {
			x: point.x,
			y: point.y,
			radiusX: 8,
			radiusY: 8,
			rotationAngle: 0,
			force: .5,
			id: 1
		};
		await withResourceLease(async () => {
			await cdp(tab.id, "Input.dispatchTouchEvent", {
				type: "touchStart",
				touchPoints: [tp]
			});
		}, () => sleep(rng(40, 110)), () => cdp(tab.id, "Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: []
		}).then(() => void 0));
		return {
			input: "chrome",
			x: point.x,
			y: point.y,
			tag: resolved.tag
		};
	}
	async function chromeInputDrag(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		const from = await resolveTargetInTab(tab.id, {
			selector: params.fromSelector ?? null,
			uid: params.fromUid ?? null,
			x: params.fromX ?? null,
			y: params.fromY ?? null
		});
		const to = await resolveTargetInTab(tab.id, {
			selector: params.toSelector ?? null,
			uid: params.toUid ?? null,
			x: params.toX ?? null,
			y: params.toY ?? null
		});
		const fp = from.rect ? pickInsideRect(from.rect) : {
			x: from.x,
			y: from.y
		};
		const tp = to.rect ? pickInsideRect(to.rect) : {
			x: to.x,
			y: to.y
		};
		await cdpMoveTo(tab.id, fp.x, fp.y);
		const steps = params.steps || 20;
		const lastPoint = { ...fp };
		await withResourceLease(async () => {
			await cdp(tab.id, "Input.dispatchMouseEvent", {
				type: "mousePressed",
				x: fp.x,
				y: fp.y,
				button: "left",
				buttons: 1,
				clickCount: 1,
				pointerType: "mouse",
				force: .5
			});
		}, async () => {
			await sleep(rng(60, 140));
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const ease = t * t * (3 - 2 * t);
				const wobble = Math.sin(t * Math.PI) * 6;
				const x = fp.x + (tp.x - fp.x) * ease + rng(-wobble, wobble);
				const y = fp.y + (tp.y - fp.y) * ease + rng(-wobble, wobble);
				await cdp(tab.id, "Input.dispatchMouseEvent", {
					type: "mouseMoved",
					x,
					y,
					button: "left",
					buttons: 1,
					pointerType: "mouse"
				});
				lastPoint.x = x;
				lastPoint.y = y;
				await sleep(rng(10, 26));
			}
		}, () => cdp(tab.id, "Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x: lastPoint.x,
			y: lastPoint.y,
			button: "left",
			buttons: 0,
			clickCount: 1,
			pointerType: "mouse"
		}).then(() => void 0));
		return {
			input: "chrome",
			from: fp,
			to: tp,
			steps
		};
	}
	async function chromeInputUpload(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		if (!(params.selector || params.uid)) throw new Error("chrome.upload: selector or uid required");
		const paths = Array.isArray(params.paths) ? params.paths.map(String) : [];
		if (!paths.length) throw new Error("chrome.upload: no file paths provided");
		const expression = `(() => {
    const selector = ${JSON.stringify(params.selector ?? null)};
    const uid = ${JSON.stringify(params.uid ?? null)};
    const state = window.__DSH_CHROME_STATE__;
    const ref = uid && state ? state.refs.get(uid) : null;
    if (uid && (ref?.kind !== "element" || !ref.verbs.has("upload"))) throw new Error("Action ref does not grant upload");
    const el = ref?.kind === "element" ? ref.element : (selector ? document.querySelector(selector) : null);
    if (!el || el.tagName !== "INPUT" || el.type !== "file") throw new Error("Target must be <input type=file>");
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    return el;
  })()`;
		const evaluated = await cdp(tab.id, "Runtime.evaluate", {
			expression,
			objectGroup: "dsh-chrome-upload",
			includeCommandLineAPI: false,
			returnByValue: false
		});
		const objectId = evaluated.result?.objectId;
		if (evaluated.exceptionDetails && !objectId) throw new Error(evaluated.exceptionDetails.text || "Could not resolve file input");
		if (!objectId) throw new Error("Could not resolve file input object");
		await withResourceLease(async () => objectId, async (leasedObjectId) => {
			if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text || "Could not resolve file input");
			await cdp(tab.id, "DOM.enable", {});
			const requested = await cdp(tab.id, "DOM.requestNode", { objectId: leasedObjectId });
			if (!requested.nodeId) throw new Error("Could not resolve file input node");
			await cdp(tab.id, "DOM.setFileInputFiles", {
				nodeId: requested.nodeId,
				files: paths
			});
			const dispatched = await cdp(tab.id, "Runtime.callFunctionOn", {
				objectId: leasedObjectId,
				functionDeclaration: `function() { this.dispatchEvent(new Event("input", { bubbles: true })); this.dispatchEvent(new Event("change", { bubbles: true })); return this.files ? this.files.length : 0; }`,
				returnByValue: true
			});
			if (dispatched.exceptionDetails) throw new Error(dispatched.exceptionDetails.text || "Could not dispatch file input events");
		}, (leasedObjectId) => cdp(tab.id, "Runtime.releaseObject", { objectId: leasedObjectId }).then(() => void 0));
		return {
			input: "chrome",
			uploaded: paths.map((path) => ({ path }))
		};
	}
	//#endregion
	//#region src/browser/platform-input-text.ts
	var focusInputTarget = async (tabId, params, expectedVerb) => {
		if (!(params.selector || params.uid)) return;
		const resolved = await resolveTargetInTab(tabId, params, params.uid && expectedVerb ? { expectedVerb } : {});
		const point = resolved.rect ? pickInsideRect(resolved.rect) : {
			x: resolved.x,
			y: resolved.y
		};
		await cdpMoveTo(tabId, point.x, point.y);
		await withResourceLease(async () => {
			await cdp(tabId, "Input.dispatchMouseEvent", {
				type: "mousePressed",
				x: point.x,
				y: point.y,
				button: "left",
				buttons: 1,
				clickCount: 1,
				pointerType: "mouse",
				force: .5
			});
		}, () => sleep(rng(45, 110)), () => cdp(tabId, "Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x: point.x,
			y: point.y,
			button: "left",
			buttons: 0,
			clickCount: 1,
			pointerType: "mouse"
		}).then(() => void 0));
		await sleep(rng(50, 120));
	};
	async function chromeInputKey(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		await focusInputTarget(tab.id, params, "press");
		const key = String(params.key || "");
		if (!key) throw new Error("chrome_press: missing key");
		const mods = params.modifiers || {};
		const modBits = cdpModifiersFor(mods);
		const modOrder = [];
		if (mods.metaKey) modOrder.push({
			key: "Meta",
			code: "MetaLeft",
			vk: 91,
			bit: 4
		});
		if (mods.ctrlKey) modOrder.push({
			key: "Control",
			code: "ControlLeft",
			vk: 17,
			bit: 2
		});
		if (mods.altKey) modOrder.push({
			key: "Alt",
			code: "AltLeft",
			vk: 18,
			bit: 1
		});
		if (mods.shiftKey) modOrder.push({
			key: "Shift",
			code: "ShiftLeft",
			vk: 16,
			bit: 8
		});
		const info = cdpKeyInfo(key);
		const dispatchKey = () => withResourceLease(async () => {
			await cdp(tab.id, "Input.dispatchKeyEvent", {
				type: modBits ? "rawKeyDown" : "keyDown",
				key: info.key,
				code: info.code,
				windowsVirtualKeyCode: info.windowsVirtualKeyCode,
				nativeVirtualKeyCode: info.windowsVirtualKeyCode,
				text: modBits ? "" : info.text,
				unmodifiedText: modBits ? "" : info.text,
				modifiers: modBits
			});
		}, () => sleep(rng(25, 90)), () => cdp(tab.id, "Input.dispatchKeyEvent", {
			type: "keyUp",
			key: info.key,
			code: info.code,
			windowsVirtualKeyCode: info.windowsVirtualKeyCode,
			modifiers: modBits
		}).then(() => void 0));
		const withModifiers = (index, heldBits) => {
			const modifier = modOrder[index];
			if (!modifier) return dispatchKey();
			const pressedBits = heldBits | modifier.bit;
			return withResourceLease(async () => {
				await cdp(tab.id, "Input.dispatchKeyEvent", {
					type: "keyDown",
					key: modifier.key,
					code: modifier.code,
					windowsVirtualKeyCode: modifier.vk,
					modifiers: pressedBits
				});
			}, async () => {
				await sleep(rng(6, 18));
				await withModifiers(index + 1, pressedBits);
			}, async () => {
				await sleep(rng(5, 18));
				await cdp(tab.id, "Input.dispatchKeyEvent", {
					type: "keyUp",
					key: modifier.key,
					code: modifier.code,
					windowsVirtualKeyCode: modifier.vk,
					modifiers: heldBits
				});
			});
		};
		await withModifiers(0, 0);
		return {
			input: "chrome",
			key: info.key,
			modifiers: mods
		};
	}
	async function chromeInputType(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		await focusInputTarget(tab.id, params);
		const text = String(params.text || "");
		for (const ch of Array.from(text)) await cdpTypeChar(tab.id, ch);
		if (params.pressEnter) await chromeInputKey({
			...params,
			key: "Enter"
		});
		return {
			input: "chrome",
			length: text.length
		};
	}
	async function chromeInputFill(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await attachDebugger(tab.id);
		if (!(params.selector || params.uid)) throw new Error("chrome_fill: selector or ref required");
		const resolved = await resolveTargetInTab(tab.id, params, params.uid ? { expectedVerb: "fill" } : {});
		const point = resolved.rect ? pickInsideRect(resolved.rect) : {
			x: resolved.x,
			y: resolved.y
		};
		await cdpMoveTo(tab.id, point.x, point.y);
		for (let i = 1; i <= 3; i++) {
			await withResourceLease(async () => {
				await cdp(tab.id, "Input.dispatchMouseEvent", {
					type: "mousePressed",
					x: point.x,
					y: point.y,
					button: "left",
					buttons: 1,
					clickCount: i,
					pointerType: "mouse",
					force: .5
				});
			}, () => sleep(rng(20, 60)), () => cdp(tab.id, "Input.dispatchMouseEvent", {
				type: "mouseReleased",
				x: point.x,
				y: point.y,
				button: "left",
				buttons: 0,
				clickCount: i,
				pointerType: "mouse"
			}).then(() => void 0));
			await sleep(rng(20, 60));
		}
		await withResourceLease(async () => {
			await cdp(tab.id, "Input.dispatchKeyEvent", {
				type: "keyDown",
				key: "Delete",
				code: "Delete",
				windowsVirtualKeyCode: 46
			});
		}, async () => void 0, () => cdp(tab.id, "Input.dispatchKeyEvent", {
			type: "keyUp",
			key: "Delete",
			code: "Delete",
			windowsVirtualKeyCode: 46
		}).then(() => void 0));
		await sleep(rng(20, 60));
		const text = String(params.text || "");
		for (const ch of Array.from(text)) await cdpTypeChar(tab.id, ch);
		if (params.submit) await chromeInputKey({
			...params,
			key: "Enter"
		});
		return {
			input: "chrome",
			length: text.length
		};
	}
	//#endregion
	//#region src/browser/screenshot-transport.ts
	var SCREENSHOT_TRANSPORT_BYTE_LIMIT = SCREENSHOT_PAYLOAD_BYTE_LIMIT;
	var accountScreenshotDataUrl = (usedBytes, dataUrl) => {
		const nextBytes = usedBytes + dataUrl.length;
		if (nextBytes > SCREENSHOT_TRANSPORT_BYTE_LIMIT) return {
			ok: false,
			usedBytes: nextBytes,
			limitBytes: SCREENSHOT_TRANSPORT_BYTE_LIMIT
		};
		return {
			ok: true,
			usedBytes: nextBytes
		};
	};
	//#endregion
	//#region src/browser/platform-page.ts
	var axValue = (value) => typeof value?.value === "string" ? value.value : "";
	var axProperty = (node, name) => node.properties?.find((property) => property.name === name)?.value.value;
	var isPotentialAxAction = (node) => {
		const role = axValue(node.role).toLowerCase();
		return [
			"button",
			"checkbox",
			"combobox",
			"link",
			"menuitem",
			"menuitemcheckbox",
			"menuitemradio",
			"option",
			"radio",
			"searchbox",
			"spinbutton",
			"switch",
			"tab",
			"textbox",
			"treeitem"
		].includes(role) || axProperty(node, "editable") === true || axProperty(node, "focusable") === true;
	};
	var resolveAxDomEvidence = async (tabId, node, scopeUid) => {
		const backendNodeId = node.backendDOMNodeId;
		if (backendNodeId === void 0) return void 0;
		const objectId = (await cdp(tabId, "DOM.resolveNode", { backendNodeId })).object.objectId;
		if (!objectId) return void 0;
		try {
			const value = (await cdp(tabId, "Runtime.callFunctionOn", {
				objectId,
				functionDeclaration: `function(actionSelector, blockedSelector, scopeUid) {
        const element = this;
        if (!(element instanceof Element) || !element.isConnected) return null;
        if (scopeUid) {
          const scopeRef = globalThis.__DSH_CHROME_STATE__?.refs.get(scopeUid);
          const root = scopeRef?.kind === "element" ? scopeRef.element : null;
          if (!root || (root !== element && !root.contains(element))) return null;
        }
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.visibility === "hidden" || style.display === "none" || rect.width === 0 || rect.height === 0) return null;
        if (rect.bottom < 0 || rect.right < 0 || rect.top > innerHeight || rect.left > innerWidth) return null;
        const remember = globalThis.__dshChromeRememberElement;
        if (typeof remember !== "function") return null;
        const checked = "checked" in element ? Boolean(element.checked) : undefined;
        return {
          id: remember(element),
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute("type") || undefined,
          disabled: element.matches(blockedSelector),
          inert: Boolean(element.closest("[inert]")),
          checked,
          focused: document.activeElement === element,
          editable: element.matches("textarea,[contenteditable='true'],input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='file']):not([type='hidden'])"),
          clickable: element.matches(actionSelector),
        };
      }`,
				arguments: [
					{ value: ACTION_ELEMENT_SELECTOR },
					{ value: ACTION_BLOCKED_SELECTOR },
					{ value: scopeUid }
				],
				returnByValue: true
			})).result?.value;
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
		} finally {
			await cdp(tabId, "Runtime.releaseObject", { objectId });
		}
	};
	var accessibilityActionsInTab = async (tabId, maxElements, scopeUid) => {
		await attachDebugger(tabId);
		await cdp(tabId, "DOM.enable", {});
		const candidates = (await cdp(tabId, "Accessibility.getFullAXTree", {})).nodes.filter((node) => !node.ignored && isPotentialAxAction(node)).slice(0, maxElements);
		return (await Promise.all(candidates.map(async (node) => {
			const dom = await resolveAxDomEvidence(tabId, node, scopeUid);
			if (!dom) return void 0;
			return actionRefFromEvidence({
				...dom,
				role: axValue(node.role) || dom.tag,
				name: axValue(node.name),
				disabled: axProperty(node, "disabled") === true || dom.disabled,
				checked: typeof axProperty(node, "checked") === "boolean" ? axProperty(node, "checked") : dom.checked,
				focused: axProperty(node, "focused") === true || dom.focused,
				editable: axProperty(node, "editable") === true || dom.editable
			});
		}))).filter((action) => action !== void 0);
	};
	var actionFingerprint = (actions) => {
		let hash = 2166136261;
		for (const action of actions) {
			const text = `${action.id}\u0000${action.role}\u0000${action.name}\u0000${JSON.stringify(action.state)}\u0000${action.verbs.join(",")}`;
			for (let index = 0; index < text.length; index += 1) {
				hash ^= text.charCodeAt(index);
				hash = Math.imul(hash, 16777619);
			}
		}
		return hash >>> 0;
	};
	async function executeInTab(params, func, args) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		const serializedArgs = JSON.stringify(args).replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
		const expression = `(async()=>{${PAGE_HELPERS.map((helper) => `const ${helper.name}=(${helper.toString()});`).join("\n")}
const action=(${func.toString()});
const invocationArgs=${serializedArgs};
try{return {ok:true,value:await action(...invocationArgs)}}
catch(error){return {ok:false,error:error instanceof Error?(error.stack||error.message):String(error)}}
})()`;
		const result = await cdpEval(tab.id, expression);
		if (result.exceptionDetails) throw new Error(`Failed to execute Chrome page action: ${cdpExceptionText(result.exceptionDetails) || "unknown error"}`);
		const envelope = result.result?.value;
		if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) throw new Error("Chrome page action returned an invalid envelope");
		if (envelope?.ok === false) throw new Error(typeof envelope.error === "string" ? envelope.error : "Chrome page script failed");
		if (envelope.ok !== true) throw new Error("Chrome page action returned an invalid envelope");
		return envelope.value;
	}
	async function evaluateInTab(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		const expression = String(params.expression ?? "");
		const projectorSource = `(${projectEvaluationValue.toString()})`;
		const contractSource = JSON.stringify(EVALUATION_VALUE_CONTRACT);
		const awaitPromise = params.awaitPromise !== false;
		const userExpression = awaitPromise ? `(async()=>(${expression}))()` : `(()=>(${expression}))()`;
		const wrapper = awaitPromise ? `(async()=>{const __project=${projectorSource};const __contract=${contractSource};const __value=await ${userExpression};return __project(__value,__contract)})()` : `(()=>{const __project=${projectorSource};const __contract=${contractSource};const __value=${userExpression};return __project(__value,__contract)})()`;
		const evaluationOptions = {
			awaitPromise,
			timeout: params.evaluationTimeoutMs ?? COMMAND_DEADLINES_MS.defaultExecution
		};
		const res = await cdpEval(tab.id, wrapper, evaluationOptions);
		if (res.exceptionDetails) throw new Error(`chrome_evaluate failed: ${cdpExceptionText(res.exceptionDetails) || "evaluation failed"}`);
		const result = res.result;
		if (!result || result.type === "undefined" || result.value === void 0) throw new Error("chrome_evaluate returned no projected JSON value");
		return result.value;
	}
	var failureReason = (cause) => {
		return ((cause instanceof Error ? cause.message : String(cause)) || "Post-action snapshot failed").slice(0, 1e3);
	};
	async function withPostActionVerification(params, actionFn, observeFn = snapshotInTab) {
		const action = await actionFn(params);
		if (!params.includeSnapshot) return {
			action,
			verification: { status: "not-requested" }
		};
		return {
			action,
			verification: await observeFn({
				...params,
				foreground: false
			}).then((snapshot) => ({
				status: "observed",
				snapshot
			}), (cause) => ({
				status: "unavailable",
				reason: failureReason(cause)
			}))
		};
	}
	async function snapshotInTab(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		const args = [
			params.maxElements || 80,
			params.containingText ?? null,
			params.role ?? null,
			params.nearUid ?? null,
			params.mode || "auto",
			params.query ?? null,
			params.maxTextChars ?? null,
			params.ref?.replace(/^@/, "") ?? null
		];
		await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			files: [SNAPSHOT_BUNDLE_PATH]
		});
		const first = (await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			func: async (invocationArgs) => {
				try {
					const snapshotPage = globalThis.__dshChromeSnapshotPage;
					if (typeof snapshotPage !== "function") throw new Error("Snapshot bundle did not install __dshChromeSnapshotPage");
					return {
						ok: true,
						value: snapshotPage(...invocationArgs)
					};
				} catch (error) {
					return {
						ok: false,
						error: error instanceof Error ? error.stack || error.message : String(error)
					};
				}
			},
			args: [args]
		}))?.[0];
		if (first?.error) {
			const message = typeof first.error === "string" ? first.error : first.error.message || JSON.stringify(first.error);
			throw new Error(message);
		}
		const envelope = first?.result;
		if (envelope?.ok === false) {
			if (params.ref) throw new BrowserRejected(envelope.error || `Observation ref ${params.ref} could not be expanded`, {
				code: "stale-observation-ref",
				details: { ref: params.ref }
			});
			throw new Error(envelope.error || "Chrome snapshot script failed");
		}
		const snapshot = envelope?.value;
		if (!snapshot) throw new Error("Chrome snapshot returned no value");
		const expansion = snapshot.observationExpansion;
		const accessibilityActions = await accessibilityActionsInTab(tab.id, 2048, expansion?.rootUid ?? null);
		const allActions = mergeActionRefs(snapshot.actions, accessibilityActions, 2048);
		if (expansion && expansion.fingerprint !== 0 && actionFingerprint(allActions) !== expansion.fingerprint) throw new BrowserRejected(`Observation frontier ${params.ref} is stale; take a fresh chrome_snapshot`, {
			code: "stale-observation-frontier",
			details: {
				ref: params.ref ?? "",
				url: snapshot.url
			}
		});
		const offset = expansion?.offset ?? 0;
		const limit = params.maxElements || 80;
		const actions = allActions.slice(offset, offset + limit);
		const contextByAction = snapshot.actionContextById ?? {};
		const groups = /* @__PURE__ */ new Map();
		for (const action of allActions) {
			const context = expansion?.rootUid ? {
				uid: expansion.rootUid,
				role: "region",
				label: "Expanded context"
			} : contextByAction[action.id];
			const key = context?.uid ?? "__page__";
			const group = groups.get(key) ?? {
				rootUid: context?.uid ?? null,
				role: context?.role || "document",
				name: context?.label || snapshot.title || "Page",
				actions: []
			};
			group.actions.push(action);
			groups.set(key, group);
		}
		const selectedIds = new Set(actions.map(({ id }) => id));
		const contextRefs = [];
		const frontierDescriptors = [];
		for (const group of groups.values()) {
			const shownActionCount = group.actions.filter(({ id }) => selectedIds.has(id)).length;
			if (group.rootUid) contextRefs.push({
				kind: "context",
				id: group.rootUid,
				role: group.role,
				name: group.name,
				actionCount: group.actions.length,
				shownActionCount
			});
			if (shownActionCount < group.actions.length) {
				const consumedActionCount = expansion ? offset + shownActionCount : shownActionCount;
				if (consumedActionCount >= group.actions.length) continue;
				frontierDescriptors.push({
					rootUid: group.rootUid,
					offset: consumedActionCount,
					fingerprint: group.rootUid && !expansion ? 0 : actionFingerprint(group.actions),
					name: group.name,
					omittedCount: group.actions.length - consumedActionCount
				});
			}
		}
		const frontiers = ((await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			func: (issuedActions, contextIds, frontierInputs) => {
				const grant = globalThis.__dshChromeGrantActionVerbs;
				const markContext = globalThis.__dshChromeMarkContextRef;
				const register = globalThis.__dshChromeRegisterFrontier;
				if (typeof grant !== "function" || typeof markContext !== "function" || typeof register !== "function") throw new Error("Snapshot bundle did not install observation ref helpers");
				for (const action of issuedActions) grant(action.id, action.verbs);
				for (const contextId of contextIds) markContext(contextId);
				return frontierInputs.map((frontier) => ({
					id: register({
						projection: "actions",
						rootUid: frontier.rootUid,
						offset: frontier.offset,
						fingerprint: frontier.fingerprint
					}),
					name: frontier.name,
					omittedCount: frontier.omittedCount
				}));
			},
			args: [
				actions.map(({ id, verbs }) => ({
					id,
					verbs
				})),
				contextRefs.map(({ id }) => id),
				frontierDescriptors
			]
		}))?.[0]?.result ?? []).map((frontier) => ({
			kind: "frontier",
			projection: "actions",
			...frontier
		}));
		const { actionContextById: _actionContextById, observationExpansion: _observationExpansion, ...publicSnapshot } = snapshot;
		return {
			...publicSnapshot,
			actions,
			contexts: contextRefs,
			frontiers
		};
	}
	async function readInTab(params) {
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			files: [SNAPSHOT_BUNDLE_PATH]
		});
		const envelope = (await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			func: (maxChars, view, query, ref) => {
				try {
					const readPage = globalThis.__dshChromeReadPage;
					if (typeof readPage !== "function") throw new Error("Snapshot bundle did not install __dshChromeReadPage");
					return {
						ok: true,
						value: readPage(maxChars, view, query, ref)
					};
				} catch (error) {
					return {
						ok: false,
						error: error instanceof Error ? error.stack || error.message : String(error)
					};
				}
			},
			args: [
				params.maxChars ?? 12e3,
				params.view ?? "content",
				params.query ?? null,
				params.ref?.replace(/^@/, "") ?? null
			]
		}))?.[0]?.result;
		if (envelope?.ok === false) {
			if (params.ref) throw new BrowserRejected(envelope.error || `Content ref ${params.ref} could not be expanded`, {
				code: "stale-content-ref",
				details: { ref: params.ref }
			});
			throw new Error(envelope.error || "chrome_read failed");
		}
		if (envelope?.ok !== true) throw new Error("chrome_read returned no value");
		return envelope.value;
	}
	async function inspectInTab(params) {
		if (!params.uid && !params.selector) throw new Error("chrome_inspect requires uid or selector");
		const { tab } = params;
		if (params.foreground) await bringToFront(tab);
		const args = [
			params.uid ?? null,
			params.selector ?? null,
			params.scrollIntoView === true
		];
		await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			files: [SNAPSHOT_BUNDLE_PATH]
		});
		const first = (await executeScript({
			target: {
				tabId: tab.id,
				frameIds: [0]
			},
			world: "MAIN",
			func: async (invocationArgs) => {
				try {
					const inspectTarget = globalThis.__dshChromeInspectTarget;
					if (typeof inspectTarget !== "function") throw new Error("Snapshot bundle did not install __dshChromeInspectTarget");
					return {
						ok: true,
						value: inspectTarget(...invocationArgs)
					};
				} catch (error) {
					return {
						ok: false,
						error: error instanceof Error ? error.stack || error.message : String(error)
					};
				}
			},
			args: [args]
		}))?.[0];
		if (first?.error) {
			const message = typeof first.error === "string" ? first.error : first.error.message || JSON.stringify(first.error);
			throw new Error(message);
		}
		const envelope = first?.result;
		if (envelope?.ok === false) throw new Error(envelope.error || "Chrome inspect script failed");
		return envelope?.value;
	}
	var navigationInitScriptSource = (userSource) => userSource;
	async function takeScreenshot(params) {
		const { tab } = params;
		await attachDebugger(tab.id);
		const metrics = await cdp(tab.id, "Page.getLayoutMetrics", {});
		const content = metrics.cssContentSize ?? metrics.contentSize;
		const viewport = metrics.cssVisualViewport ?? metrics.visualViewport;
		const dpr = (await cdpEval(tab.id, "window.devicePixelRatio")).result?.value;
		const resolvedDpr = typeof dpr === "number" ? dpr : NaN;
		const capture = async (clip) => {
			const captured = await cdp(tab.id, "Page.captureScreenshot", {
				format: params.format,
				quality: params.format === "jpeg" ? params.quality : void 0,
				fromSurface: true,
				captureBeyondViewport: clip !== void 0,
				...clip ? { clip: {
					...clip,
					scale: 1
				} } : {}
			});
			return `data:image/${params.format};base64,${captured.data}`;
		};
		if (params.capture.kind === "full-page-tiles") {
			const plan = planFullPageTileGeometry({
				width: content.width,
				height: content.height,
				viewportHeight: viewport.clientHeight,
				dpr: resolvedDpr
			}, SCREENSHOT_LIMITS);
			if (!plan.ok) throw new Error(plan.message);
			const tiles = [];
			let capturedBytes = 0;
			for (const tile of plan.tiles) {
				const dataUrl = await capture({
					x: content.x,
					y: content.y + tile.y,
					width: content.width,
					height: tile.height
				});
				const budget = accountScreenshotDataUrl(capturedBytes, dataUrl);
				if (!budget.ok) throw new Error(`Full-page screenshot transport is ${budget.usedBytes} bytes; limit is ${budget.limitBytes} bytes`);
				capturedBytes = budget.usedBytes;
				tiles.push({
					y: tile.y,
					dataUrl
				});
			}
			return {
				kind: "tile-set",
				format: params.format,
				tab: await formatTab(await chrome.tabs.get(tab.id)),
				dimensions: {
					width: content.width,
					height: content.height,
					viewportHeight: viewport.clientHeight,
					dpr: resolvedDpr
				},
				tiles
			};
		}
		const raster = planScreenshotRasterGeometry({
			width: viewport.clientWidth,
			height: viewport.clientHeight,
			dpr: resolvedDpr
		}, SCREENSHOT_LIMITS);
		if (!raster.ok) throw new Error(raster.message);
		const dataUrl = await capture();
		const budget = accountScreenshotDataUrl(0, dataUrl);
		if (!budget.ok) throw new Error(`Screenshot transport is ${budget.usedBytes} bytes; limit is ${budget.limitBytes} bytes`);
		return {
			kind: "image",
			format: params.format,
			dataUrl,
			tab: await formatTab(await chrome.tabs.get(tab.id))
		};
	}
	//#endregion
	//#region src/browser/platform.ts
	var browserProgram = (effect, domain, operation, params, execute) => ({
		effect,
		domain,
		operation,
		params,
		execute: async () => execute(params)
	});
	var assertNever = (value) => {
		throw new Error(`Unsupported browser command: ${JSON.stringify(value)}`);
	};
	var targetParams = (target) => {
		if (!target) return {};
		if (target.by === "id") return { selectedTabId: target.value };
		if (target.by === "url") return { urlFragment: target.value };
		return { titleFragment: target.value };
	};
	var elementParams = (target) => {
		if (!target) return {};
		return target.by === "uid" ? { uid: target.value } : { selector: target.value };
	};
	var pointerParams = (target) => target.by === "coordinate" ? {
		x: target.x,
		y: target.y
	} : elementParams(target);
	var commandContext = (command, target) => ({
		...targetParams(target),
		sessionKey: command.session.key,
		sessionGroupTitle: command.session.groupTitle,
		foreground: command.session.foreground
	});
	var withExactTab = async (params, execute) => execute({
		...params,
		tab: await getTabByParams(params)
	});
	var waitProjectionExpression = (conditionBy, conditionValue) => {
		const value = JSON.stringify(conditionValue);
		if (conditionBy === "selector") {
			return `(async()=>{const matchCount=document.querySelectorAll(${value}).length;return {satisfied:matchCount>0,observation:{url:location.href,title:document.title,readyState:document.readyState,matchCount}}})()`;
		}
		if (conditionBy === "urlIncludes") {
			return `(async()=>{const satisfied=location.href.includes(${value});return {satisfied,observation:{url:location.href,title:document.title,readyState:document.readyState}}})()`;
		}
		if (conditionBy === "textContains") {
			return `(async()=>{const bodyText=document.body?.innerText??"";const satisfied=bodyText.includes(${value});return {satisfied,observation:{url:location.href,title:document.title,readyState:document.readyState,bodyTextLength:bodyText.length}}})()`;
		}
		return `(async()=>{const satisfied=Boolean(await (${conditionValue}));return {satisfied,observation:{url:location.href,title:document.title,readyState:document.readyState}}})()`;
	};
	var interpretTabCommand = (command) => {
		const call = command.call;
		const params = {
			...commandContext(command, "target" in call ? call.target : void 0),
			call
		};
		switch (call.op) {
			case "list": return browserProgram("read-only", "tab", call.op, params, async () => {
				const tabs = await chrome.tabs.query({});
				return Promise.all(tabs.map(formatTab));
			});
			case "new": return browserProgram("may-mutate", "tab", call.op, params, async () => {
				const tab = await createNewAutomationTarget(command.session.key, command.session.groupTitle, call.groupColor);
				if (typeof tab.id !== "number") throw new Error("Chrome created an automation tab without an id");
				await navigateTab({
					tabId: tab.id,
					url: call.url || "about:blank",
					milestone: "commit",
					timeoutMs: COMMAND_DEADLINES_MS.navigateDefault,
					initScriptSource: navigationInitScriptSource()
				});
				await bringToFront(await chrome.tabs.get(tab.id));
				return formatTab(await chrome.tabs.get(tab.id));
			});
			case "activate": return browserProgram("may-mutate", "tab", call.op, params, async (operationParams) => {
				const tab = await getTabByParams(operationParams, { createOwnedTarget: false });
				await chrome.windows.update(tab.windowId, { focused: true });
				await chrome.tabs.update(tab.id, { active: true });
				return formatTab(await chrome.tabs.get(tab.id));
			});
			case "close": return browserProgram("may-mutate", "tab", call.op, params, async (operationParams) => {
				const tab = await getTabByParams(operationParams, { createOwnedTarget: false });
				await chrome.tabs.remove(tab.id);
				await releaseAutomationTargetTab(tab.id);
				return { closed: tab.id };
			});
			case "group": return browserProgram("may-mutate", "tab", call.op, params, async (operationParams) => {
				return groupTab(await getTabByParams(operationParams, { createOwnedTarget: false }), command.session.groupTitle, call.groupColor);
			});
			case "ungroup": return browserProgram("may-mutate", "tab", call.op, params, async (operationParams) => {
				const tab = await getTabByParams(operationParams, { createOwnedTarget: false });
				if (typeof tab.groupId === "number" && tab.groupId >= 0) await chrome.tabs.ungroup(tab.id);
				return formatTab(await chrome.tabs.get(tab.id));
			});
			default: return assertNever(call);
		}
	};
	var interpretPageCommand = (command) => {
		const operation = command.call;
		const context = commandContext(command, command.call.target);
		switch (operation.op) {
			case "snapshot": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, snapshotInTab));
			}
			case "read": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, readInTab));
			}
			case "inspect": {
				const params = {
					...context,
					...operation,
					...elementParams(operation.element)
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, inspectInTab));
			}
			case "navigate": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, async (operationParams) => {
					return withExactTab(operationParams, async (exactParams) => {
						const { tab } = exactParams;
						if (exactParams.foreground) await bringToFront(tab);
						await navigateTab({
							tabId: tab.id,
							url: exactParams.url,
							milestone: exactParams.waitUntilLoad === true ? "load" : "commit",
							timeoutMs: exactParams.timeoutMs ?? COMMAND_DEADLINES_MS.navigateDefault,
							initScriptSource: navigationInitScriptSource(exactParams.initScript)
						});
						const observedTab = await formatTab(await chrome.tabs.get(tab.id));
						if (!exactParams.snapshot) return observedTab;
						return {
							tab: observedTab,
							snapshot: await snapshotInTab({
								...exactParams,
								...exactParams.snapshot,
								foreground: false
							})
						};
					});
				});
			}
			case "evaluate": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, evaluateInTab));
			}
			case "wait": {
				const params = {
					...context,
					...operation,
					conditionBy: operation.condition.by,
					conditionValue: operation.condition.value
				};
				return browserProgram("may-mutate", "page", operation.op, params, async (operationParams) => {
					return withExactTab(operationParams, async (exactParams) => {
						if (exactParams.foreground) await bringToFront(exactParams.tab);
						const timeoutMs = exactParams.timeoutMs ?? COMMAND_DEADLINES_MS.waitDefault;
						const intervalMs = exactParams.intervalMs ?? COMMAND_DEADLINES_MS.waitIntervalDefault;
						const started = Date.now();
						while (true) {
							const elapsedBeforeEvaluation = Date.now() - started;
							const projection = await evaluateInTab({
								...exactParams,
								expression: waitProjectionExpression(exactParams.conditionBy, exactParams.conditionValue),
								foreground: false,
								awaitPromise: true,
								evaluationTimeoutMs: Math.max(1, timeoutMs - elapsedBeforeEvaluation)
							});
							const elapsedMs = Date.now() - started;
							if (projection.satisfied) return {
								...projection,
								elapsedMs
							};
							if (elapsedMs >= timeoutMs) return {
								...projection,
								elapsedMs
							};
							await sleep(Math.min(intervalMs, timeoutMs - elapsedMs));
							const elapsedAfterSleep = Date.now() - started;
							if (elapsedAfterSleep >= timeoutMs) return {
								...projection,
								elapsedMs: elapsedAfterSleep
							};
						}
					});
				});
			}
			case "console": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => executeInTab(exactParams, listConsoleMessages, [exactParams.clear === true])));
			}
			case "network-list": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => executeInTab(exactParams, listNetworkRequests, [exactParams.includePreserved === true, exactParams.clear === true])));
			}
			case "network-get": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => executeInTab(exactParams, getNetworkRequest, [exactParams.requestId])));
			}
			case "screenshot": {
				const params = {
					...context,
					...operation
				};
				return browserProgram("may-mutate", "page", operation.op, params, (operationParams) => withExactTab(operationParams, takeScreenshot));
			}
			default: return assertNever(operation);
		}
	};
	var modifiersFor = (modifiers) => modifiers && {
		shiftKey: modifiers.shift,
		ctrlKey: modifiers.control,
		altKey: modifiers.alt,
		metaKey: modifiers.meta
	};
	var interpretInputCommand = (command) => {
		const operation = command.call;
		const context = commandContext(command, command.call.target);
		switch (operation.op) {
			case "click": {
				const params = {
					...context,
					...operation,
					...pointerParams(operation.at)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => withPostActionVerification(exactParams, chromeInputClick)));
			}
			case "type": {
				const params = {
					...context,
					...operation,
					...elementParams(operation.into)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => withPostActionVerification(exactParams, chromeInputType)));
			}
			case "fill": {
				const params = {
					...context,
					...operation,
					...elementParams(operation.into)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => withPostActionVerification(exactParams, chromeInputFill)));
			}
			case "key": {
				const params = {
					...context,
					...operation,
					...elementParams(operation.at),
					modifiers: modifiersFor(operation.modifiers)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => withPostActionVerification(exactParams, chromeInputKey)));
			}
			case "hover": {
				const params = {
					...context,
					...operation,
					...pointerParams(operation.at)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, chromeInputHover));
			}
			case "drag": {
				const from = operation.from.by === "coordinate" ? {
					fromX: operation.from.x,
					fromY: operation.from.y
				} : operation.from.by === "uid" ? { fromUid: operation.from.value } : { fromSelector: operation.from.value };
				const to = operation.to.by === "coordinate" ? {
					toX: operation.to.x,
					toY: operation.to.y
				} : operation.to.by === "uid" ? { toUid: operation.to.value } : { toSelector: operation.to.value };
				const params = {
					...context,
					...from,
					...to,
					...operation.steps === void 0 ? {} : { steps: operation.steps }
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, chromeInputDrag));
			}
			case "tap": {
				const params = {
					...context,
					...operation,
					...pointerParams(operation.at)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, chromeInputTap));
			}
			case "scroll": {
				const params = {
					...context,
					...operation,
					...elementParams(operation.within)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, chromeInputScroll));
			}
			case "upload": {
				const params = {
					...context,
					...operation,
					...elementParams(operation.into)
				};
				return browserProgram("may-mutate", "input", operation.op, params, (operationParams) => withExactTab(operationParams, chromeInputUpload));
			}
			default: return assertNever(operation);
		}
	};
	var interpretSystemCommand = (command) => {
		const call = command.call;
		const params = {
			...commandContext(command, "target" in call ? call.target : void 0),
			call
		};
		switch (call.op) {
			case "version": return browserProgram("read-only", "system", call.op, params, () => ({
				extensionId: chrome.runtime.id,
				extensionDisplayVersion: chrome.runtime.getManifest().version,
				userAgent: navigator.userAgent
			}));
			case "automation-status": return browserProgram("read-only", "system", call.op, params, async () => {
				return {
					...await getAutomationTargetStatus(command.session.key),
					input: inputStatus()
				};
			});
			case "clear-stale": return browserProgram("may-mutate", "system", call.op, params, () => clearStaleAutomationTargets(command.session.key));
			case "cleanup": return browserProgram("may-mutate", "system", call.op, params, () => cleanupAutomationTarget(command.session.key));
			case "cleanup-all": return browserProgram("may-mutate", "system", call.op, params, cleanupAllAutomationTargets);
			case "probe": return browserProgram("may-mutate", "system", call.op, params, (operationParams) => withExactTab(operationParams, (exactParams) => executeInTab(exactParams, probePage, [])));
			default: return assertNever(call);
		}
	};
	var interpretBrowserCommand = (command) => {
		switch (command.domain) {
			case "tab": return interpretTabCommand(command);
			case "page": return interpretPageCommand(command);
			case "input": return interpretInputCommand(command);
			case "system": return interpretSystemCommand(command);
			default: return assertNever(command);
		}
	};
	async function dispatchBrowserCommand(command) {
		const program = interpretBrowserCommand(command);
		try {
			return await program.execute();
		} catch (cause) {
			if (cause instanceof BrowserRejected || cause instanceof BrowserOutcomeUnknown) throw cause;
			const message = cause instanceof Error ? cause.message : String(cause);
			if (program.effect === "may-mutate") throw new BrowserOutcomeUnknown(`${program.domain}.${program.operation} may have changed Chrome before it failed: ${message}. The command was not replayed.`, { cause });
			throw new BrowserRejected(`${program.domain}.${program.operation} failed: ${message}`, { cause });
		}
	}
	//#endregion
	//#region src/browser/runtime-scheduling.ts
	var cappedExponentialRetrySchedule = min([exponential("250 millis"), spaced("2 seconds")]);
	var localDurabilityRetrySchedule = cappedExponentialRetrySchedule;
	var sharedBridgeRetrySchedule = cappedExponentialRetrySchedule.pipe(jittered);
	//#endregion
	//#region src/browser/external-probe.ts
	var handleChromeExtensionProbe = (message, runtime, protocolFingerprint) => isChromeExtensionProbeRequest(message) ? {
		kind: CHROME_EXTENSION_PROBE_KIND,
		version: 2,
		extension: {
			extensionId: runtime.id,
			displayVersion: runtime.getManifest().version,
			protocolFingerprint
		}
	} : void 0;
	//#endregion
	//#region src/browser/service-worker.ts
	var KEEPALIVE_ALARM = "dsh-chrome-runtime";
	var connectorIdentity = ConnectorIdentityOwner.makeUnsafe();
	var effectRuntime = make$8(empty);
	var BrowserRuntimeFailure = class extends TaggedError("BrowserRuntimeFailure") {};
	var persistUntilSuccess = (effect) => effect.pipe(retry({ schedule: localDurabilityRetrySchedule }));
	var classifyResultResponse = (result, response) => {
		const decision = classifyResultDelivery(response.status);
		if (decision === "terminal") return void_;
		if (decision === "retry") return fail(new ConnectorHttpFailure({
			code: "bridge-http",
			message: `Bridge returned HTTP ${response.status}: ${response.text}`,
			status: response.status
		}));
		return fail(new BrowserRuntimeFailure({
			code: "result-rejected",
			message: `Bridge rejected result ${result.id} with HTTP ${response.status}: ${response.text}`,
			status: response.status
		}));
	};
	var postResult = (result, connector) => encodeJsonTransport("Chrome wire result", WireResult, result).pipe(flatMap(({ json }) => connectorRequest("result", {
		headers: { "content-type": "application/json" },
		body: json
	}, connector).pipe(flatMap((response) => classifyResultResponse(result, response)), tapError((error) => logWarning(`dsh-chrome result ${result.id} is not acknowledged; command polling remains blocked`, messageOf(error))), retry({
		schedule: sharedBridgeRetrySchedule,
		while: (error) => error.status === void 0 || classifyResultDelivery(error.status) === "retry"
	}))));
	var commandFromPollResponse = (response, connector) => {
		const compatibility = classifyChromeConnectorCompatibility({
			extensionId: response.expectedExtensionId,
			displayVersion: response.expectedExtensionDisplayVersion,
			protocolFingerprint: response.expectedProtocolFingerprint
		}, connector);
		if (compatibility._tag === "Incompatible") return fail(new BrowserRuntimeFailure({
			code: "extension-protocol-mismatch",
			message: `Extension ${connector.extensionDisplayVersion}/${connector.protocolFingerprint.slice(0, 12)} does not match bridge ${response.expectedExtensionDisplayVersion}/${response.expectedProtocolFingerprint.slice(0, 12)}: ` + compatibility.mismatches.join(", ")
		}));
		if (response.type === "incompatible") return fail(new BrowserRuntimeFailure({
			code: "extension-protocol-mismatch",
			message: `Extension ${response.actualExtensionDisplayVersion}/${response.actualProtocolFingerprint.slice(0, 12)} does not match bridge ${response.expectedExtensionDisplayVersion}/${response.expectedProtocolFingerprint.slice(0, 12)}`
		}));
		return succeed(response.type === "none" ? void 0 : response.command);
	};
	var rejectInvalidPollCommand = (commandId, diagnostic, connector) => postResult(makeWireFailureResult(commandId, new CommandRejected({
		code: POLL_RESPONSE_INVALID_CODE,
		message: diagnostic
	})), connector).pipe(as(void 0), tapError((error) => logWarning(`dsh-chrome poll-response-invalid rejection for ${commandId} was not acknowledged`, messageOf(error))));
	var handleInvalidPollBody = (text, error, connector) => gen(function* () {
		const parsed = tryParsePollJson(text);
		const value = parsed._tag === "ok" ? parsed.value : void 0;
		const issue = protocolFailureSchemaIssue(error);
		const issues = issue === void 0 ? [{
			path: [],
			message: "Invalid poll response"
		}] : collectSecretFreeSchemaIssues(issue);
		const diagnostic = formatPollDecodeDiagnostic(issues, summarizePollBodyForDiagnostic(value));
		const commandId = recoverPollCommandId(value);
		if (commandId !== void 0) {
			yield* rejectInvalidPollCommand(commandId, diagnostic, connector);
			return;
		}
		yield* logWarning("dsh-chrome poll response is invalid and command id is not recoverable", diagnostic);
		return yield* fail(error);
	});
	var receiveCommand = (connector) => connectorRequest("poll", {}, connector).pipe(flatMap(requireConnectorSuccess), flatMap((text) => decodePollResponseJson(text).pipe(catch_((error) => error._tag === "ProtocolFailure" ? handleInvalidPollBody(text, error, connector) : fail(error)), flatMap((decoded) => decoded === void 0 ? succeed(void 0) : commandFromPollResponse(decoded, connector)))));
	var runtime = all([connectorRuntimeStep({
		loadConnector: connectorIdentity.load,
		loadJournal: persistUntilSuccess(loadCommandJournal),
		deliverResult: postResult,
		clearJournal: persistUntilSuccess(clearCommandJournal),
		receiveCommand,
		recordExecuting: (command) => persistUntilSuccess(recordCommandExecuting(command)),
		executeCommand: (command) => settleBrowserCommand(command, dispatchBrowserCommand),
		recordResult: (command, result) => persistUntilSuccess(recordCommandResult(command, result))
	}).pipe(tapError((error) => logWarning("dsh-chrome runtime step failed", messageOf(error))), retry({ schedule: sharedBridgeRetrySchedule }), forever), currentTimeMillis.pipe(flatMap((now) => tryPromise({
		try: () => detachExpiredDebuggers(now),
		catch: (cause) => new BrowserRuntimeFailure({
			code: "debugger-cleanup",
			message: messageOf(cause),
			cause
		})
	})), catch_((error) => logWarning("dsh-chrome debugger cleanup failed", error.message)), repeat({ schedule: spaced("5 seconds") })), currentTimeMillis.pipe(flatMap((now) => tryPromise({
		try: () => chrome.runtime.getPlatformInfo(),
		catch: (cause) => new BrowserRuntimeFailure({
			code: "keepalive",
			message: messageOf(cause),
			cause
		})
	})), catch_((error) => logWarning("dsh-chrome keepalive heartbeat failed", error.message)), repeat({ schedule: spaced("20000 millis") }))], {
		concurrency: "unbounded",
		discard: true
	});
	var runtimeOwner = RuntimeLoopOwner.makeUnsafe(runtime, effectRuntime.runFork);
	var startRuntime = () => {
		effectRuntime.runCallback(runtimeOwner.start, { onExit: () => void 0 });
	};
	var armKeepalive = () => tryPromise({
		try: () => chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: .5 }),
		catch: (cause) => new BrowserRuntimeFailure({
			code: "alarm",
			message: messageOf(cause),
			cause
		})
	});
	var initialize = all([
		connectorIdentity.load,
		armKeepalive(),
		tryPromise({
			try: () => chrome.action.setBadgeText({ text: "pi" }),
			catch: (cause) => new BrowserRuntimeFailure({
				code: "badge",
				message: messageOf(cause),
				cause
			})
		}),
		tryPromise({
			try: () => chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" }),
			catch: (cause) => new BrowserRuntimeFailure({
				code: "badge",
				message: messageOf(cause),
				cause
			})
		})
	], { discard: true }).pipe(catch_((error) => logWarning("dsh-chrome initialization failed", error.message)));
	var launch = (effect) => {
		effectRuntime.runCallback(effect, { onExit: () => void 0 });
	};
	var handleConnectorIdentityRequest = (request) => (request.type === "dsh-chrome/connector/load" ? connectorIdentity.load : connectorIdentity.rename(request.label)).pipe(match({
		onFailure: (error) => ({
			ok: false,
			error: error.message
		}),
		onSuccess: (connector) => ({
			ok: true,
			connector
		})
	}));
	var AutomationRecoveryFailure = class extends TaggedError("AutomationRecoveryFailure") {};
	var handleAutomationRecoveryRequest = (request) => tryPromise({
		try: () => request.type === "dsh-chrome/automation/stale-status" ? profileStaleAutomationStatus() : clearAllStaleAutomationTargets(),
		catch: (cause) => new AutomationRecoveryFailure({
			message: messageOf(cause),
			cause
		})
	}).pipe(match({
		onFailure: (error) => ({
			ok: false,
			error: error.message
		}),
		onSuccess: (result) => ({
			ok: true,
			result
		})
	}));
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (sender.id !== chrome.runtime.id) return false;
		if (isConnectorIdentityRequest(message)) {
			launch(handleConnectorIdentityRequest(message).pipe(tap((response) => sync(() => sendResponse(response)))));
			return true;
		}
		if (isAutomationRecoveryRequest(message)) {
			launch(handleAutomationRecoveryRequest(message).pipe(tap((response) => sync(() => sendResponse(response)))));
			return true;
		}
		return false;
	});
	chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
		if (isBrowserCompanionWakeRequest(message)) {
			launch(runtimeOwner.start.pipe(andThen(sync(() => sendResponse({
				kind: BROWSER_COMPANION_WAKE_KIND,
				version: 2,
				accepted: true
			})))));
			return true;
		}
		const response = handleChromeExtensionProbe(message, chrome.runtime, "5cdf33d5c0f5594efe5917af839023d6b06fd3e59d05924bbc62ed204de4d0ce");
		if (response === void 0) return false;
		sendResponse(response);
		return false;
	});
	chrome.runtime.onInstalled.addListener(() => {
		launch(initialize);
		startRuntime();
	});
	chrome.runtime.onStartup.addListener(() => {
		launch(armKeepalive().pipe(catch_((error) => logWarning("dsh-chrome keepalive alarm failed", error.message))));
		startRuntime();
	});
	chrome.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === KEEPALIVE_ALARM) startRuntime();
	});
	chrome.debugger.onDetach.addListener((source, reason) => {
		launch(sync(() => handleDebuggerDetach(source, reason)));
	});
	chrome.debugger.onEvent.addListener((source, method, params) => {
		launch(sync(() => handleDebuggerEvent(source, method, params)));
	});
	chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
		launch(tryPromise({
			try: () => handleAutomationTabRemoved(tabId, removeInfo),
			catch: (cause) => new BrowserRuntimeFailure({
				code: "owned-tab-removal",
				message: messageOf(cause),
				cause
			})
		}).pipe(catch_((error) => logWarning("dsh-chrome owned-tab removal reconciliation failed", error.message))));
	});
	launch(initialize);
	startRuntime();
	//#endregion
})();
