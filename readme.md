cascade.js
==========

A simple JavaScript chaining library inspired by the
[cascade operator](http://news.dartlang.org/2012/02/method-cascades-in-dart-posted-by-gilad.html)
[²](https://www.dartlang.org/docs/spec/latest/dart-language-specification.html#h.30hsq2v14fk2)
of the [dart programming language](https://www.dartlang.org).

As you're not able to overload operators in JavaScript, it uses only proxy
functions. It is far from perfect but I tried to get the best out of my idea.

Some additional features that `cascade.js` offers are:

* Access objects/properties via a dot string syntax
  ```javascript
  var target = { a: { b: { c: 'foobar' } } };
  cascade(target)('a.b.c').release();

  // #0: target.a.b.c == 'foobar'
  // >>
  ```
* Walking down to child objects
  ```javascript
  var target = { a: { b: { c: { d: { propertyA: 1, propertyB: 'foobar' } } } } };
  cascade(target)
    .enter('a')
      .enter('b')
        .enter('c')
          .enter('d')
            ('propertyA', 2)
            ('propertyA', 'foobar!')
          .exit()
        .exit()
      .exit()
    .exit()
  .release();

  // #6: target.a.b.c.d == { propertyA: 2, propertyB: 'foobar!' }
  // >> { d: { propertyA: 2, propertyB: 'foobar!' } a: ... }
  ```
* Evaluation of variables
  ```javascript
  var target = { a: function(i) { console.log('i:', i); this.i = i; }, i: 0 };
  cascade(target)
    ('a', '$index')
    ('a', '$index')
    ('a', '$index')
    .release();

  // #0: 'i: 0'
  // #1: 'i: 1'
  // #2: 'i: 2'
  // >> { a: ..., i: 2 }
  ```
* Replacement of variables in strings
  ```javascript
  var target = { a: 'foobar', b: 'hello world' };
  cascade(target)
    ('a', 'foobar #{$index}');
    ('b', 'hello #{$index} world');

  // #0: target.a == 'foobar #0'
  // #1: target.b == 'hello #1 world'
  ```
* Execution of the current chain multiple times
  ```javascript
  var target = { value: 0, fn: function() { this.value++; } };
  cascade(target)
    ('fn').times(99)
    .release();

  // #0: target.value == 100
  // >> { value: 100, fn: ... }
  ```


Simple examples
---------------

```javascript
// Set values of a object
var obj = {};
cascade(obj)
  ('valueA', 1)
  ('valueB', 2)
  ('valueC', 3)
  ('valueD', 4)
  .release();

// >> { valueA: 1, valueB: 2, valueC: 3, valueD: 4 }

// Set values of a array
var arr = [];
cascade(arr)
  ('push', 1)
  ('push', 2)
  ('splice', 1, 0, 3)
  ('unshift', 'hello')
  .release();

// >> [ 'hello', 1, 3, 2 ]

```