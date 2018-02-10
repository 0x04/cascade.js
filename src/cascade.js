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
   * Log helper function (using console.log).
   * @private
   * @param {string} methodName
   * @param {... *} [args]
   */
  function _log(methodName, args)
  {
    if (!_isDebug)
    {
      return;
    }

    try
    {
      args = Array.prototype.slice.apply(arguments);

      if (_is(methodName) === 'String')
      {
        args[0] = '[cascade.js/%s]'.replace('%s', methodName);
      }

      console.log.apply(console, args);
    }
    catch (e) { /* @eat. */ }
  }

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
   * Proofs if `object` empty.
   * @private
   * @param {Object} object
   * @return {Boolean}
   */
  function _isEmpty(object)
  {
    var result = true;

    switch (_is(object))
    {
      case 'Object':
        for (var key in object)
        {
          result = false;
          break;
        }
        break;

      case 'Array':
        result = (object.length === 0);
        break;

      default:
        result = (!object);
        break;
    }

    return result;
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

  /**
   * Referring to the table here:
   * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
   * these characters should be escaped
   * \ ^ $ * + ? . ( ) | { } [ ]
   * These characters only have special meaning inside of brackets
   * they do not need to be escaped, but they MAY be escaped
   * without any adverse effects (to the best of my knowledge and casual testing)
   * : ! , =
   * my test "~!@#$%^&*(){}[]`/=?+\|-_;:'\",<.>".match(/[\#]/g)
   *
   * @see http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
   * @type {function}
   */
  var _escapeRegExp = (function () {

    var specials = [
      // order matters for these
      "-", "[", "]",
      // order doesn't matter for any of these
      "/" , "{" , "}" , "(" , ")" , "*" , "+" , "?" , "." , "\\" , "^" , "$" , "|"
    ];

    // I choose to escape every character with '\'
    // even though only some strictly require it when inside of []
    var regex = new RegExp('[' + specials.join('\\') + ']', 'g');

    return function (str) {
      return str.replace(regex, "\\$&");
    };

  }());

  /**
   * Returns a array with some option-driven conditions. Its used to
   * determine if changes to a field is allowed or not.
   * @private
   * @param scope
   * @param operand
   * @param args
   * @returns {Boolean}
   */
  function _conditions(scope, operand, args)
  {
    var overrideUndefined = (
      scope.options.overrideUndefined
        || !_is(operand, 'Undefined')
      );

    var maintainDataType = (
        (overrideUndefined && _is(operand, 'Undefined'))
        || (!scope.options.maintainDataType
        || _is(operand) === _is(args)
        || _is(operand, 'Function'))
      );

    return (overrideUndefined && maintainDataType);
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
        if (scope.variables.hasOwnProperty(variable)) {
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
    var index, length;

    switch (_is(value))
    {
      case 'Array':
        for (index = 0, length = value.length;
             index < length;
             index++)
        {
          if (_is(value[index], 'Object|String'))
          {
            value[index] = _evaluateObjectValue(scope, value[index]);
          }
        }
        break;

      case 'Object':
        for (index in value)
        {
          if (_is(value[index], 'Object|String'))
          {
            value[index] = _evaluateObjectValue(scope, value[index]);
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
    var result;

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
    processing: for (var index = 0, length = args.length;
         index < length;
         index++)
    {
      var arg = args[index];

      // First of all: Determine the operand!
      switch (_is(arg))
      {
        case 'Array':
          // Arrays
          /*result = */
          _processArray(scope, arg);
          break;

        case 'Object':
          // Plain object
          /*result = */
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
    if (arg.length > 2 && _is(arg[1], 'Array'))
    {
      // Following pair wise format is awaited:
      // [ operand:*, args:Array, operand:*, args:Array, ... ]
      if (arg.length % 2 === 0)
      {
        for (index = 0, length = arg.length;
             index < length;
             index += 2)
        {
          operand = arg[index];
          args = (_is(arg[index + 1], 'Array'))
              ? arg[index +1]
              : [ arg[index +1] ];

          _processValue(scope, operand, args);
        }

        return;
      }
    }

    // case #1
    operand = arg[0];

    args = [];

    for (index = 1, length = arg.length;
         index < length;
         index++)
    {
      args = args.concat(arg[index]);
    }

    _processValue(scope, operand, args);
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

    try
    {
      // Resolve dot string of subject.
      if (_is(operand, 'String')
       && operand.indexOf('.') > -1
       && IS_DOT_STRING.test(operand))
      {
        var path = operand.split('.');
        subject =_resolve(subject, path.slice(0, -1));
        operand = path.slice(-1).pop();
      }

      // Replace variables
      if (_is(operand, 'String'))
      {
        operand = _evaluateString(scope, operand);
      }

      // Evaluate arguments
      if (scope.options.evaluateArguments)
      {
        _evaluateObject(scope, args);
      }

      // Operand is a function, just execute
      if (_is(operand, 'Function'))
      {
        _processFunction(scope, operand, subject, args);
        return;
      }

      // Error handling
      if (_is(operand, 'Undefined|Null|NaN'))
      {
        throw new Error('Operand was `%s`.'
            .replace('%s', _is(operand))
        );
      }

      // Final handling
      switch (_is(subject[operand]))
      {
        case 'Function':
          _processFunction(scope, subject[operand], subject, args);
          break;

        default:
          if (_is(subject[operand], 'Object'))
          {
            // @TODO: Better way for determination?
            if (_is(subject[operand], 'Array')
             && !_is(subject[operand][args[0]], 'Undefined'))
            {
              _processValue(
                  scope,
                  args[0],
                  args.slice(1),
                  subject[operand]
              );
            }
            else if (_conditions(scope, subject[operand], args))
            {
              subject[operand] = args;
            }
          }
          // @TODO: How to handle multiple items?
          else if (_conditions(scope, subject[operand], args[0]))
          {
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
    if (_conditions(scope, operand, args))
    {
      var result = operand.apply(subject, args);

      if (scope.options.storeResults)
      {
        scope.variables.result = result;
        scope.variables.results.push(result);
      }
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
    // Self reference
    scope.variables.scope = scope;

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
      _log                  : _log,
      _is                   : _is,
      _isEmpty              : _isEmpty,
      _resolve              : _resolve,
      _conditions           : _conditions,
      // Evaluation
      _evaluateString       : _evaluateString,
      _evaluateObject       : _evaluateObject,
      _evaluateObjectValues : _evaluateObjectValue,
      // Processing
      _process              : _process,
      _processArray         : _processArray,
      _processObject        : _processObject,
      _processValue         : _processValue,
      _processConditions    : _conditions
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