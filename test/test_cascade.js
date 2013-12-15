//------------------------------------------------------------------------------
//
// @section Helpers
//
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// @part Functions
//------------------------------------------------------------------------------

function __clone(object)
{
  return JSON.parse(JSON.stringify(object));
}

var _is = cascade.__TEST__._is;

function __extend(object)
{
  var extenders = Array.prototype.slice.apply(arguments); //, 1); // <- crashes, @BUG?!
  extenders.shift();

  for (var i = extenders.length - 1; i > -1; i--)
  {
    var extender = extenders[i];

    if (typeof extender == 'object')
    {
      for (var key in extender)
      {
        switch (_is(extender[key]))
        {
          case 'Array':
            object[key] = (_is(object[key]) == 'Array')
              ? object[key].concat(extender)
              : extender[key].concat();
            break;

          case 'Object':
            if (_is(object[key]) != 'Object')
            {
              object[key] = {};
            }
            __extend(object[key], extender[key]);
            break;

          default:
            object[key] = extender[key];
            break;
        }
      }
    }
  }

  return object;
}

function __compareResults(objectA, objectB)
{
  it('valueNumber', function()
  {
    expect(objectB.valueNumber).toBe(objectA.valueNumber);
  });

  it('valueString', function()
  {
    expect(objectB.valueString).toBe(objectA.valueString);
  });

  it('valueBoolean', function()
  {
    expect(objectB.valueBoolean).toBe(objectA.valueBoolean);
  });

  it('valueFunction', function()
  {
    expect(objectB._valueFunctionExecuted).toBe(objectA._valueFunctionExecuted);
  });

  it('valueArray', function()
  {
    expect(objectB.valueArray).toEqual(objectA.valueArray);
  });

  it('valueDate', function()
  {
    expect(objectB.valueDate.getTime()).toBe(objectB.valueDate.getTime());
  });
}


//------------------------------------------------------------------------------
//
// @section `cascade.js` utility function tests
//
//------------------------------------------------------------------------------

describe('`_is`', function()
{
  var _is = cascade.__TEST__._is;

  it('Null', function()
  {
    expect(_is(null)).toBe('Null');
  });
  it('Undefined', function()
  {
    expect(_is(undefined)).toBe('Undefined');
  });
  it('String', function()
  {
    expect(_is('foobar')).toBe('String');
  });
  it('Number 1', function()
  {
    expect(_is(1)).toBe('Number');
  });
  it('Number 2', function()
  {
    expect(_is(0x1)).toBe('Number');
  });
  it('Boolean 1', function()
  {
    expect(_is(false)).toBe('Boolean');
  });
  it('Boolean 2', function()
  {
    expect(_is(true)).toBe('Boolean');
  });
  it('Array', function()
  {
    expect(_is([ 1, 2, 3 ])).toBe('Array');
  });
  it('Object', function()
  {
    expect(_is({ a: 1, b: 2, c: 2 })).toBe('Object');
  });
  it('Function', function()
  {
    expect(_is(function(){})).toBe('Function');
  });
  it('Date', function()
  {
    expect(_is(new Date)).toBe('Date');
  });
});

describe('`_isEmpty`', function()
{
  var _isEmpty = cascade.__TEST__._isEmpty;

  it('Array []', function()
  {
    expect(_isEmpty([])).toBe(true);
  });
  it('Array [ 1, 2, 3 ]', function()
  {
    expect(_isEmpty([ 1, 2, 3 ])).toBe(false);
  });
  it('Object {}', function()
  {
    expect(_isEmpty({})).toBe(true);
  });
  it('Object { a: 1, b: 2, c: 3 }', function()
  {
    expect(_isEmpty({ a: 1, b: 2, c: 3 })).toBe(false);
  });
  it('String ""', function()
  {
    expect(_isEmpty("")).toBe(true);
  });
  it('String "foobar"', function()
  {
    expect(_isEmpty("foobar")).toBe(false);
  });
  it('Number 0', function()
  {
    expect(_isEmpty(0)).toBe(true);
  });
  it('Number 1', function()
  {
    expect(_isEmpty(1)).toBe(false);
  });
  it('undefined', function()
  {
    expect(_isEmpty(undefined)).toBe(true);
  });
  it('null', function()
  {
    expect(_isEmpty(null)).toBe(true);
  });
  it('Date', function()
  {
    expect(_isEmpty(new Date())).toBe(false);
  });
  it('document', function()
  {
    expect(_isEmpty(document)).toBe(false);
  });
});

describe('`_resolve`', function()
{
  var _resolve = cascade.__TEST__._resolve;
  var resolveObject = {
    a: {
      b: {
        c: {
          d: {
            e: {
              f: 'foobar'
            }
          }
        }
      }
    }
  };

  it('string argument', function()
  {
    expect(_resolve(resolveObject, 'a'))
      .toBe(resolveObject.a);

    expect(_resolve(resolveObject, 'a.b'))
      .toBe(resolveObject.a.b);

    expect(_resolve(resolveObject, 'a.b.c'))
      .toBe(resolveObject.a.b.c);

    expect(_resolve(resolveObject, 'a.b.c.d'))
      .toBe(resolveObject.a.b.c.d);

    expect(_resolve(resolveObject, 'a.b.c.d.e'))
      .toBe(resolveObject.a.b.c.d.e);

    expect(_resolve(resolveObject, 'a.b.c.d.e.f'))
      .toBe(resolveObject.a.b.c.d.e.f);
  });

  it('simple path arguments', function()
  {
    expect(_resolve(resolveObject, 'a'))
      .toBe(resolveObject.a);

    expect(_resolve(resolveObject, 'a', 'b'))
      .toBe(resolveObject.a.b);

    expect(_resolve(resolveObject, 'a', 'b', 'c'))
      .toBe(resolveObject.a.b.c);

    expect(_resolve(resolveObject, 'a', 'b', 'c', 'd'))
      .toBe(resolveObject.a.b.c.d);

    expect(_resolve(resolveObject, 'a', 'b', 'c', 'd', 'e'))
      .toBe(resolveObject.a.b.c.d.e);

    expect(_resolve(resolveObject, 'a', 'b', 'c', 'd', 'e', 'f'))
      .toBe(resolveObject.a.b.c.d.e.f);
  });

  it('mixed path arguments', function()
  {
    expect(_resolve(resolveObject, 'a'))
      .toBe(resolveObject.a);

    expect(_resolve(resolveObject, 'a', 'b'))
      .toBe(resolveObject.a.b);

    expect(_resolve(resolveObject, 'a.b', 'c'))
      .toBe(resolveObject.a.b.c);

    expect(_resolve(resolveObject, 'a', 'b', 'c.d'))
      .toBe(resolveObject.a.b.c.d);

    expect(_resolve(resolveObject, 'a.b', 'c', 'd.e'))
      .toBe(resolveObject.a.b.c.d.e);

    expect(_resolve(resolveObject, 'a', 'b', 'c.d', 'e.f'))
      .toBe(resolveObject.a.b.c.d.e.f);
  });
});


//------------------------------------------------------------------------------
//
// @section Value evaluation
//
//------------------------------------------------------------------------------

describe('evaluation of values', function()
{
  // Pseudo initialisation
  var defaultOptions = __extend({}, cascade.__TEST__._defaultOptions);
  var scope = {
    options: defaultOptions,
    variables: {
      $index: 0,
      $options: defaultOptions,
      $results: [],
      $result: null
    }
  };
  scope.variables.$scope = scope;

  var _evaluateString = cascade.__TEST__._evaluateString;
  var _evaluateObject = cascade.__TEST__._evaluateObject;
  var _evaluateObjectValues = cascade.__TEST__._evaluateObjectValues;
  var $vars = scope.variables;

  it("`_evaluateString` argument replacement", function()
  {
    expect(_evaluateString(scope, '$index')).toBe($vars.$index);
    expect(_evaluateString(scope, '$options')).toBe($vars.$options);
    expect(_evaluateString(scope, '$results')).toBe($vars.$results);
    expect(_evaluateString(scope, '$result')).toBe(null);
  });

  it("`_evaluateString` string replacement", function()
  {
    expect(_evaluateString(scope, 'index:{$index}')).toBe('index:0');
    expect(_evaluateString(scope, 'options:{$options}')).toBe('options:[object Object]');
    expect(_evaluateString(scope, 'results:{$results}')).toBe('results:');
    expect(_evaluateString(scope, 'result:{$result}')).toBe('result:null');
  });

  // Test objects
  var objectA = {
    object : {
      index   : $vars.$index,
      options : defaultOptions,
      results : $vars.$results,
      result  : $vars.$result
    },
    array : [
        $vars.$index,
        defaultOptions,
        $vars.$results,
        $vars.$result
    ],
    index   : $vars.$index,
    options : defaultOptions,
    results : $vars.$results,
    result  : $vars.$result
  };

  var objectB = {
    object : {
        index   : '$index',
        options : '$options',
        results : '$results',
        result  : '$result'
    },
    array : [
        '$index',
        '$options',
        '$results',
        '$result'
    ],
    index   : '$index',
    options : '$options',
    results : '$results',
    result  : '$result'
  };

  it("`_evaluateObject` array argument replacement", function()
  {
    expect(_evaluateObject(scope, objectB.array)).toEqual(objectA.array);
  });

  it("`_evaluateObject` object argument replacement", function()
  {
    expect(_evaluateObject(scope, objectB.object)).toEqual(objectA.object);
  });

  it("`_evaluateObjectValues` argument replacement", function()
  {
     expect(_evaluateObjectValues(scope, objectB)).toEqual(objectA);
  });
});


//------------------------------------------------------------------------------
//
// @section `cascade.js` Tests
//
//------------------------------------------------------------------------------

var testFn = function()
{
  debugger;
  console.info('[testFn]', arguments);
};

var object = {
  valueNumber  : 1,
  valueString  : 'hello',
  valueBoolean : true,
  valueObject  : {
    valueString  : 'sub value',
    valueNumber  : 1,
    valueBoolean : true,
    valueObject  : {},
    valueArray   : [ 1, 2, 3 ]
  },
  valueArray: [],
  _valueFunctionExecuted: false,
  valueFunction: function()
  {
    console.info('[valueFunction]', arguments);
    this._valueFunctionExecuted = true;
  },
  valueDate: new Date
};

describe("`cascade` with strings", function()
{
  var objectA = __extend({}, object);
  var objectB = __extend({}, object);

  objectA.valueNumber  = 1;
  objectA.valueString  = 'world';
  objectA.valueBoolean = false;
  objectA.valueFunction(1, 2, 3);
  objectA.valueArray.push('foobar');
  objectA.valueDate.setTime(0);

  cascade(objectB)
    ('valueNumber', 1)
    ('valueString', 'world')
    ('valueBoolean', false)
    ('valueFunction', 1, 2, 3)
    ('valueArray', 'push', 'foobar')
    ('valueDate', 'setTime', 0);

  __compareResults(objectA, objectB);
});

describe("`cascade` with single value objects", function()
{
  var objectA = __extend({}, object);
  var objectB = __extend({}, object);

  objectA.valueNumber  = 2;
  objectA.valueString  = 'hello world.';
  objectA.valueBoolean = true;
  objectA.valueFunction(4, 5, 6);
  objectA.valueDate.setTime(1000);

  objectB = __extend(objectA);

  var date = objectB.valueDate;

  Object.defineProperty(objectB, 'valueDate', {
    get: function()
    {
      //debugger;
      return date;
    },
    set: function(value)
    {
      //debugger;
      date = value;
    }
  });

  cascade(objectB)
    ({ valueNumber   : 2 })
    ({ valueString   : 'hello world.' })
    ({ valueBoolean  : true })
    ({ valueFunction : [ 4, 5, 6 ] })
    ({ valueDate     : [ 'setTime', 1000 ] });

  __compareResults(objectA, objectB);
});

describe("`cascade` with multiple value object", function()
{
  var objectA = __extend({}, object);
  var objectB = __extend({}, object);

  objectA.valueNumber  = 3;
  objectA.valueString  = 'hello world!';
  objectA.valueBoolean = false;
  objectA.valueFunction(7, 8, 9);
  objectA.valueDate.setTime(2000);

  cascade(objectB)
    ({
      valueNumber   : 3,
      valueString   : 'hello world!',
      valueBoolean  : false,
      valueFunction : [ 7, 8, 9 ],
      valueDate     : [ 'setTime', 2000 ]
    });

  __compareResults(objectA, objectB);
});

describe("`cascade` with value evaluation: $index", function()
{
  var objectA = {};
  var objectB = {};

  objectA.index0 = 0;
  objectA.index1 = 1;
  objectA.index2 = 2;
  objectA.index3 = 3;
  objectA.index4 = 4;
  objectA.index5 = 5;
  objectA.index6 = 6;
  objectA.index7 = 7;
  objectA.index8 = 8;
  objectA.index9 = 9;

  cascade(objectB, { overrideUndefined: true })
    ('index0', '$index')
    ('index1', '$index')
    ('index2', '$index')
    ('index3', '$index')
    ('index4', '$index')
    ('index5', '$index')
    ('index6', '$index')
    ('index7', '$index')
    ('index8', '$index')
    ('index9', '$index');

  for (var n in objectA)
  {
    it(n, function()
    {
      expect(objectB[n]).toBe(objectA[n]); });
  }
});

describe("`cascade` with value evaluation: $result", function()
{
  var Class = function()
  {
    this._value = 0;
    this.testFn = function()
    {
      return this._value++;
    }
  };

  var objectA = new Class();
  var objectB = new Class();

  var resultA = [];
  var resultB;

  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());
  resultA.push(objectA.testFn());

  cascade(objectB)
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      ('testFn')
      (function($results)
      {
        // As we add a result to through this call we have to return the latest
        // result manually. `this` is pointing to `objectB`

        resultB = $results;
        return this.testFn();

      }, '$results');

  it('compare resultA with resultB', function()
  {
     expect(resultB).toEqual(resultA);
  });
});