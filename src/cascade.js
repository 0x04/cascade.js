/**
 * @file src/cascade.js
 * @description A JavaScript chaining library inspired by the cascade operator of the dart programming language.
 * @author Oliver Kühn <ok@0x04.de>
 * @license MIT
 */

(function()
{
  'use strict';


  //----------------------------------------------------------------------------
  //
  // @section Properties
  //
  //----------------------------------------------------------------------------

  /**
   * The default values for options. They're applied in `cascade` to a new
   * scoped instance.
   *
   * @private
   * @type {Object}
   */
  var _defaultOptions = {
    /**
     * Override values that are undefined?
     * @type {Boolean}
     */
    overrideUndefined: false,

    /**
     * Don't touch the data type of target value
     * @type {Boolean}
     */
    maintainDataType: true,

    /**
     * Replace variables in strings
     * e.g. "index no ${index}"
     * @type {Boolean}
     */
    replaceVariables: true,

    /**
     * Save the results of the function that get executed.
     * Warning: Can hard hit the performance!
     * @type {Boolean}
     */
    storeResults: true
  };

  /**
   * @const
   * @type {RegExp}
   */
  var IS_DOT_STRING = /^([$_a-z][$\w]*(\.)?)+$/i;

  /**
   * @const
   * @type {RegExp}
   */
  var VAR_EXPRESSION = /\${([$\w]+)}/gi;

  /**
   * @private
   * @type {Boolean}
   */
  var _isDebug = true;


  //----------------------------------------------------------------------------
  //
  // @section Private methods
  //
  //----------------------------------------------------------------------------
  // Keep this methods out of scope
  //----------------------------------------------------------------------------

  //----------------------------------------------------------------------------
  // @part Helper
  //----------------------------------------------------------------------------

  /**
   * Returns the internal class name of the given object.
   * @private
   * @param {*} value
   * @param {String} [compare]
   * @returns {Boolean|String}
   */
  function _is(value, compare)
  {
    var type = Object.prototype.toString.call(value);

    // Extract the real data type e.g. "[object Object]"
    // -----------------------------------------^^^^^^
    type = type.substring(8, type.length - 1);

    return (typeof compare === 'string')
        ? (compare.split(/[^$\w]/).indexOf(type) > -1)
        : type;
  }

  /**
   * Resolves a property on given `object` with the dot string `pathStr`.
   * @example
   * _resolve('a.b.c', { a: { b: { c: 'foobar' } } });
   * // >>> 'foobar'
   * @private
   * @param {Object} object Object which to resolve from
   * @param {String|Array} [path] A dot string
   * @returns {*} `undefined` if path was not resolvable
   */
  function _resolve(object, path)
  {
    var result = object;
    var paths = (!_is(path, 'Array'))
      ? Array.prototype.slice.call(arguments, 1)
      : path;

    for (var index = 0, length = paths.length;
         index < length;
         index++)
    {
      if (_is(paths[index], 'String') && paths[index].indexOf('.') > -1)
      {
        var tmp = [ index, 1 ].concat(paths[index].split(/\./));
        Array.prototype.splice.apply(paths, tmp);
        length = paths.length;
      }

      if (_is(result[paths[index]], 'Undefined'))
      {
        result = undefined;
        break;
      }
      else result = result[paths[index]];
    }

    return result;
  }


  //----------------------------------------------------------------------------
  // @part Evaluation
  //----------------------------------------------------------------------------

  /**
   * Evaluates a string or replace variables in it.
   * @private
   * @param {Object} scope
   * @param {*} value
   * @returns {*}
   */
  function _evaluateString(scope, value)
  {
    var result = value;

    // Replace variables
    if (scope.options.replaceVariables && VAR_EXPRESSION.test(value))
    {
      result.replace(VAR_EXPRESSION, function(str, variable) {
        // Use the specific variable directly, incl. data type
        if (result === str) {
          result = scope.variables[variable];
        }
        // Replace variable in the result string
        else if (scope.variables.hasOwnProperty(variable)) {
          result = result.replace(str, scope.variables[variable]);
        }
      });
    }

    return result;
  }

  /**
   * Searches after evaluable strings in objects.
   * @private
   * @param {Object} scope
   * @param {*} value
   * @return {*}
   */
  function _evaluateObject(scope, value)
  {
    switch (_is(value))
    {
      case 'Array':
        value.forEach(function(subject, index) {
          value[index] = _evaluateObjectValue(scope, subject);
        });
        break;

      case 'Object':
        for (var name in value)
        {
          if (value.hasOwnProperty(name))
          {
            value[name] = _evaluateObjectValue(scope, value[name]);
          }
        }
        break;
    }

    return value;
  }

  /**
   * Evaluation recursion helper function.
   * @private
   * @param {Object} scope
   * @param {*} value
   * @return {*}
   */
  function _evaluateObjectValue(scope, value)
  {
    var result = value;

    switch (_is(value))
    {
      case 'Object':
        result = _evaluateObject(scope, value);
        break;

      case 'String':
        result = _evaluateString(scope, value);
        break;
    }

    return result;
  }


  //----------------------------------------------------------------------------
  // @part Processing
  //----------------------------------------------------------------------------

  /**
   * The main chain processing function.
   *
   * Possible chain calls:
   *
   * * (operand, arg, ...)
   * * (operand, [ arg, ...], ...)
   * * ([ operand, arg, ...], ...)
   * * ([ operand, [ arg, ...] ], ...)
   * * ({ operand: arg }, ...)
   * * ({ operand: [ arg, ...] }, ...)
   *
   * @private
   * @param {Object} scope Chain scope values
   * @param {Array} args Chain arguments
   * @param {Array|Function|Object|String} args.operand
   * @param {... *} [args.args]
   */
  function _process(scope, args)
  {
    processing: for (
      var index = 0, length = args.length;
      index < length;
      index++
    )
    {
      var arg = args[index];

      // First of all: Determine the operand!
      switch (_is(arg))
      {
        case 'Array':
          _processArray(scope, arg);
          break;

        case 'Object':
          _processObject(scope, arg);
          break;

        default:
          _processValue(scope, args[0], args.slice(1));
          break processing;
      }
    }
  }

  /**
   * Array processing:
   *
   * * case #1: ([ operand, arg, ... ], ...)
   * * case #2: ([ operand, [ arg, ... ], ... ], ...)
   *
   * @private
   * @param {Object} scope
   * @param {Array} arg
   */
  function _processArray(scope, arg)
  {
    var index, length, operand, args;

    // case #2
    // Following pair wise format is awaited:
    // [ operand:*, args:Array, operand:*, args:Array, ... ]
    if (
      arg.length > 2
      && arg.length % 2 === 0
      && _is(arg[1], 'Array')
    )
    {
      for (index = 0, length = arg.length;
           index < length;
           index += 2)
      {
        operand = arg[index];

        args = (_is(arg[index + 1], 'Array'))
            ? arg[index + 1]
            : [ arg[index + 1] ];

        _processValue(scope, operand, args);
      }

      return;
    }

    // case #1
    _processValue(scope, arg[0], arg.slice(1));
  }

  /**
   * Object processing:
   *
   * * case #1: ({ operand: arg, ... }, ...)
   * * case #2: ({ operand: [ arg, ... ] }, ...)
   *
   * @private
   * @param {Object} scope
   * @param {Object} arg
   */
  function _processObject(scope, arg)
  {
    var name, operand, args;

    for (name in arg)
    {
      if (arg.hasOwnProperty(name))
      {
        operand = name;
        args = (_is(arg[name], 'Array'))
            ? arg[name]
            : [ arg[name] ];

        _processValue(scope, operand, args);
      }
      else debugger;
    }
  }

  /**
   * @private
   * @param {Object} scope
   * @param {Function|String} operand
   * @param {Array} args
   * @param {*} [subject]
   */
  function _processValue(scope, operand, args, subject)
  {
    subject = (_is(subject, 'Undefined'))
        ? scope.subject
        : subject;

    // Error handling
    if (_is(operand, 'Undefined|Null|NaN'))
    {
      throw new Error('Operand was `%s`.'
        .replace('%s', _is(operand))
      );
    }

    try
    {
      // Replace variables
      args = _evaluateObject(scope, args);

      if (_is(operand, 'String')) {
        // Replace variables
        operand = _evaluateString(scope, operand);

        // Resolve dot string of subject.
        if (operand.indexOf('.') > -1 && IS_DOT_STRING.test(operand))
        {
          var path = operand.split('.');
          subject =_resolve(subject, path.slice(0, -1));
          operand = path.slice(-1).pop();
        }
      }

      // Operand is a function, just execute
      if (_is(operand, 'Function'))
      {
        _processFunction(scope, operand, subject, args);
        return;
      }

      // Final handling
      var operandTargetType = _is(subject[operand]);

      switch (operandTargetType)
      {
        case 'Function':
          _processFunction(scope, subject[operand], subject, args);
          break;

        case 'Undefined':
          if (scope.options.overrideUndefined) {
            subject[operand] = args[0];
          }
          break;

        default:
          if (args.length > 1) {
            _processValue(scope, args[0], args.slice(1), subject[operand]);
          }
          else if (!scope.options.maintainDataType || _is(args[0], operandTargetType)) {
            subject[operand] = args[0];
          }
          break;
      }
    }
    catch (e)
    {
      throw new Error('Error while processing value "%s".'
          .replace('%s', String(operand))
      );
    }
  }

  function _processFunction(scope, operand, subject, args)
  {
    var result = operand.apply(subject, args);

    if (scope.options.storeResults)
    {
      scope.variables.result = result;
      scope.variables.results.push(result);
    }
  }

  //----------------------------------------------------------------------------
  // @part public
  //----------------------------------------------------------------------------

  /**
   * The `cascade` entry function.
   * @param {Function|Object} subject
   * @param {Object} [options]
   * @param {Boolean} [options.overrideUndefined]
   * @param {Boolean} [options.maintainDataType]
   * @param {Boolean} [options.replaceVariables]
   * @param {Function} [previous]
   * @returns {Function}
   */
  function cascade(subject, options, previous)
  {
    // Ensure options object
    if (!options)
    {
      options = {};
    }

    // Set up options
    for (var key in _defaultOptions)
    {
      if (_defaultOptions[key] !== options[key])
      {
        options[key] = (!_is(options[key], 'Undefined'))
            ? options[key]
            : _defaultOptions[key];
      }
    }

    /**
     * Contains all variables that are scope dependent.
     * @type {object}
     */
    var scope = {
      previous  : previous,
      subject   : subject,
      options   : options,
      variables : {
        index    : 0,
        results  : [],
        result   : undefined
      }
    };

    /**
     * @type {Function}
     */
    var currentChain = function() {
      throw new Error('Dummy function!');
    };

    /**
     * The cascade chaining function.
     * @param {... Function|Object|String} args
     * @returns {Function} cascadeChain
     */
    function cascadeChain(args)
    {
      currentChain = (/* @return {Function} */ function(args) {
        // This inner wrap is done for the `.repeat` method
        return function()
        {
          var result = _process(scope, args);
          scope.variables.index++;
          return result;
        };
        // Convert arguments into an array
      })(Array.prototype.slice.call(arguments));

      // Instantly call first time
      currentChain();

      return cascadeChain;
    }

    /**
     * Enters the given property and return a new `cascadeChain`.
     * @param {String} property
     * @returns {Function} Cascade chain
     */
    cascadeChain.enter = function(property)
    {
        var target = _resolve(scope.subject, property);

      if (/Undefined|Null/.test(_is(target)))
      {
        throw new Error('Property `%s` does not exist on subject.'
            .replace('%s', property));
      }

      return cascade(target, options, cascadeChain);
    };

    /**
     * Exits the current and return the previous `cascadeChain`.
     * @returns {cascadeChain}
     */
    cascadeChain.exit = function()
    {
      return (scope.previous || this);
    };

    /**
     * Just returns the subject and breaks the chain.
     * @returns {Function|Object}
     */
    cascadeChain.release = function()
    {
      return subject;
    };

    /**
     * Repeats the execution of the current chain several times.
     * @param times
     * @returns {cascadeChain}
     */
    cascadeChain.repeat = function(times)
    {
      for (var i = times; i > 0; i--)
      {
        currentChain();
      }

      return this;
    };

    return cascadeChain;
  }


  //----------------------------------------------------------------------------
  //
  // @section Init
  //
  //----------------------------------------------------------------------------

  if (_isDebug)
  {
    // For testing purpose
    cascade.__TEST__ = {
      // Properties
      _defaultOptions       : _defaultOptions,
      // Methods
      _is                   : _is,
      _resolve              : _resolve,
      // Evaluation
      _evaluateString       : _evaluateString,
      _evaluateObject       : _evaluateObject,
      _evaluateObjectValues : _evaluateObjectValue,
      // Processing
      _process              : _process,
      _processArray         : _processArray,
      _processObject        : _processObject,
      _processValue         : _processValue
    };
  }

  try
  {
    // Browser
    if (!_is(window, 'Undefined'))
    {
      window.cascade = cascade;
    }
  }
  catch (e) {}

  try
  {
    // Node?
    if (!_is(exports, 'Undefined'))
    {
      exports.cascade = cascade;
    }
  }
  catch (e) {}

})();