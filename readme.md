# cascade.js

*A JavaScript library deeply inspired by the [cascade operator](https://www.dartlang.org/docs/spec/latest/dart-language-specification.html#h.30hsq2v14fk2)
of the [dart programming language](https://www.dartlang.org).*

This readme is a strongly modified copy of the excellent blog post of
[Gilad Bracha](http://news.dartlang.org/2012/02/method-cascades-in-dart-posted-by-gilad.html).

--------------------------------------------------------------------------------

## Introduction

The idea of `cascade.js` is a cascaded method invocation originated in
Dart and SmallTalk. The motivation is to make it easier to write more fluent
interfaces. In Dart e.g. the cascaded method invocation is initiated by the `..`
operator. As you're not able to overload operators in JavaScript, it uses proxy
functions instead. It is far from being perfect, but I tried to give my best
on the implementation.

However, usually fluent interfaces relay on method chaining. You may already
know a method chaining mechanism from other JavaScript libraries like jQuery.
It is probably the best way to demonstrate in a simple example how `cascade.js`
and its chaining mechanism exactly works. Say we, you want to add a large number
of elements to a unordered list:

```javascript
var ul = document.createElement('ul');
var li;

li = document.createElement('li');
li.textContent = 'foobar 1';
ul.appendChild(li);

li = document.createElement('li');
li.textContent = 'foobar 2';
ul.appendChild(li);

li = document.createElement('li');
li.textContent = 'foobar 3';
ul.appendChild(li);

// ... and so and on
// ... many more lines
```

You might want to this as:

```javascript
var ul = document.createElement('ul');

function li(text)
{
  var li = document.createElement('li');
  li.textContent = text;
  return li;
}

ul
  .appendChild(li('foobar 1'))
  .appendChild(li('foobar 2'))
  .appendChild(li('foobar 3'))
  // ... and so and on
  // ... many more lines
```

But this requires that `appendChild()` return the `ul` element instead of the
`li` element you just appended. The API designer has to plan for this, and it
may conflict with other use cases. With `cascade.js`, no one needs to plan
ahead or make this sort of trade off. The `appendChild()` method do its usual
thing and return its arguments. However, you can get a chaining effect using
`cascade.js`:

```javascript
var ul = document.createElement('ul');

cascade(ul)
  // 1st chain execution, create a element, set it up
  // and release it from the cascade
  ('appendChild',
    cascade(document.createElement('li'))
      ({ textContent: 'foobar {$index}' }))
      .release()
  // Repeat execution of previous chain 2 more times
  .repeat(2);
```
Here, the `cascade.js` cascaded method invocation operation. The `cascade(…)(…)`
invokes a method (or setter or getter) but discards the result, and returns the
chain object instead.

In brief, method cascades provide a syntactic sugar for situations where the
receiver of a method innovation might otherwise have to be repeated. Instead of
writing:

```javascript
var address = getAddress();

address.setStreet("Elm", "13a");
address.city = "Carthage";
address.state = "Eurasia"
address.zip(66666);
```

One may write

```javascript
var address = cascade(getAddress())
  ('setStreet', 'Elm', '13a')
  ('city', 'Carthage')
  ('state', 'Eurasia')
  ('zip', 66666)
  .release();
```

Below you'll find a number of examples. Your feedback is welcome.


## Feature examples

General usage:

```javascript
// cascade.js call
cascade(<target: *>, [ <options: Object> ])
  // cascade chain
  (<operand: *>, ... args)
  [ .each(<fn: Function>) ]
  [ .enter(<operand: *>) ]
  [ .exit() ]
  [ .release() ]
  [ .repeat(<num: Number>) ]
```


### Access object properties and methods
```javascript
var target = { property: 12345, method: function() { return 'foobar'; } };
cascade(target, { overrideUndefined: true })
  ('property', 54321)
  ('method')
  ('methodResult', '$result')
  .release();
// >> {property: 54321, method: function, methodResult: "foobar"}
```

### Access objects/properties via a dot string syntax
```javascript
var target = { a: { b: { c: 'hello world' } } };
cascade(target)('a.b.c').release();

// #0: target.a.b.c == 'foobar'
// >> { a: { b: { c: 'foobar' } } }
```

### Walking down to child objects
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

### Evaluation of variables
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

### Replacement of variables in strings
```javascript
var target = { a: 'foobar', b: 'hello world' };
cascade(target)
  ('a', 'foobar #{$index}');
  ('b', 'hello #{$index} world');

// #0: target.a == 'foobar #0'
// #1: target.b == 'hello #1 world'
```

### Repeat the execution of the current chain several times
```javascript
var target = { value: 0, fn: function() { this.value++; } };
cascade(target)
  ('fn').repeat(99)
  .release();

// #0: target.value == 100
// >> { value: 100, fn: ... }
```

--------------------------------------------------------------------------------

*EOT. End of transmission*