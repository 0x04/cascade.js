cascade.js
==========

A simple JavaScript chaining library inspired by the cascade operator of the
dart programming language.

As you're not able to overload operators in JavaScript, it uses only proxy
functions. It is far from perfect but I tried to get the best out of my idea.

Some additional features that `cascade.js` offers are:

* Access objects/properties via a dot string syntax
  ```javascript
  var target = { a: { b: { c: 'foobar' } } };
  cascade(target)('a.b.c')`

  // #0: target.a.b.c == 'foobar'
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

  // result: target.a.b.c.d == { propertyA: 2, propertyB: 'foobar!' }
  ```
* Evaluation of variables
  ```javascript
  var target = { a: function(i) { console.log('i:', i); } };
  cascade(target)
    ('a', '$index')
    ('a', '$index')
    ('a', '$index');

  // #0: 'i: 0'
  // #1: 'i: 1'
  // #2: 'i: 2'
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
    ('fn').times(99);

  // #0: target.value == 100
  ```


More examples
-------------

```javascript
// Set values of a object
var obj = {};
cascade(obj)
  ('valueA', 1)
  ('valueB', 2)
  ('valueC', 3)
  ('valueD', 4);

>> { valueA: 1, valueB: 2, valueC: 3, valueD: 4 }

// Set values of a array
var arr = [];
cascade(arr)
  ('push', 1)
  ('push', 2)
  ('splice', 1, 0, 3)
  ('unshift', 'hello');

>> [ 'hello', 1, 3, 2 ]

```