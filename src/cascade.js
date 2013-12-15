/**
 * cascade.js
 * @author     Oliver Kühn
 * @website    http://0x04.de
 * @version    0.5.0
 * @license    MIT
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
     * @type {boolean}
     */
    overrideUndefined: false,

    /**
     * Don't touch the data type of target value
     * @type {boolean}
     */
    obtainDataType: true,

    /**
     * Replace variables in strings
     * e.g. "index no #{$index}"
     * @type {boolean}
     */
    replaceVariables: true,

    /**
     * Save the results of the function that get executed.
     * Warning: Can hard hit the performance!
     * @type {boolean}
     */
    storeResults: true,

    /**
     * Evaluate/convert variables string into their corresponding object.
     * e.g. "$index" => 0
     * @type {boolean}
     */
    evaluateArguments: true
  };

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

      if (_is(methodName) == 'String')
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
   * @returns {string}
   */
  function _is(value)
  {
    var string = Object.prototype.toString.call(value);
    return string.substring(8, string.length - 1);
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
        result = (object.length == 0);
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
    var paths = Array.prototype.slice.call(arguments, 1);

    for (var i = 0, l = paths.length; i < l; i++)
    {
      if (_is(paths[i]) == 'String' && paths[i].indexOf('.') > -1)
      {
        var tmp = [ i, 1 ].concat(paths[i].split(/\./));
        Array.prototype.splice.apply(paths, tmp);
        l = paths.length;
      }

      if (_is(result[paths[i]]) == 'Undefined')
      {
        result = undefined;
        break;
      }
      else result = result[paths[i]];
    }

    return result;
  }

  /**
   * Returns a array with some option-driven conditions. Its used to
   * determine if changes to a field is allowed or not.
   * @private
   * @param {Object} $scope
   * @param {String} key
   * @param {*} value
   * @param {*} [subject]
   * @returns {Boolean}
   */
  function _conditions($scope, key, value, subject)
  {
    subject = (subject || $scope.subject);

    var target = _resolve(subject, key);

    var overrideUndefined = (
        $scope.options.overrideUndefined
        || _is(target) != 'Undefined'
      );

    var obtainDataType = (
        (overrideUndefined && _is(target) == 'Undefined')
        || (!$scope.options.obtainDataType
          || _is(target) == _is(value)
          || _is(target) == 'Function')
      );

    return overrideUndefined && obtainDataType;
  }


  //----------------------------------------------------------------------------
  // @part Evaluation
  //----------------------------------------------------------------------------

  /**
   * Evaluates a string or replace variables in it.
   * @private
   * @param {Object} $scope
   * @param {*} value
   * @returns {*}
   */
  function _evaluateString($scope, value)
  {
    var result = value;

    if (_is(value) == 'String' && $scope.options.replaceVariables)
    {
      if (value in $scope.variables)
      {
        result = $scope.variables[value];
      }
      else for (var variable in $scope.variables)
      {
        // @TODO: RegExp escaping
        var regexp = new RegExp('{' + variable.replace('$', '\\$') + '}', 'g');

        if (regexp.test(result))
        {
          result = result.replace(regexp, String($scope.variables[variable]));
        }
      }
    }

    return result;
  }

  /**
   * Searches after evaluable strings in objects.
   * @private
   * @param {Object} $scope
   * @param {*} value
   * @return {*}
   */
  function _evaluateObject($scope, value)
  {
    var key, length;

    switch (_is(value))
    {
      case 'Array':
        for (key = 0, length = value.length; key < length; key++)
        {
          if (_isEvaluable(value[key]))
          {
            value[key] = _evaluateObjectValues($scope, value[key]);
          }
        }
        break;

      case 'Object':
        for (key in value)
        {
          if (_isEvaluable(value[key]))
          {
            value[key] = _evaluateObjectValues($scope, value[key]);
          }
        }
        break;
    }

    return value;
  }

  /**
   * Checks if a value evaluable.
   * @private
   * @param {*} value
   * @returns {Boolean}
   */
  function _isEvaluable(value)
  {
    return (/Object|String/.test(_is(value)));
  }

  /**
   * Evaluation recursion helper function.
   * @private
   * @param {Object} $scope
   * @param {*} value
   * @return {*}
   */
  function _evaluateObjectValues($scope, value)
  {
    var result;

    switch (_is(value))
    {
      case 'Object':
        result = _evaluateObject($scope, value);
        break;

      case 'String':
        result = _evaluateString($scope, value);
        break;
    }

    return result;
  }


  //----------------------------------------------------------------------------
  // @part Handler
  //----------------------------------------------------------------------------

  /**
   * Handles a function, which means to execute it with the given `args`
   * in the scope `scope`.
   * @private
   * @param {Object} $scope
   * @param {Function} fn
   * @param {Array} args
   * @param {*} [scope=null]
   */
  function _handleFunction($scope, fn, args, scope)
  {
    if (_is(scope) == 'Undefined')
    {
      scope = null;
    }

    var result = fn.apply(scope, args);

    if ($scope.options.storeResults)
    {
      $scope.variables.$results.push(result);
      $scope.variables.$result = result;
    }
  }

  function _handleArray($scope, args)
  {

  }

  /**
   * Handles a object. The internal handling is chosen by the structure of
   * `args`.
   * @private
   * @param {Object} $scope
   * @param {Array} args
   */
  function _handleObject($scope, args)
  {
    var operand = args[0];

    switch (_is(operand))
    {
      case 'Function':
        _handleFunction(
          $scope,
          args.shift(),
          args,
          $scope.subject
        );
        break;

      case 'Object':
        _handleObjectObject($scope, args);
        break;

      case 'String':
        _handleObjectString($scope, args);
        break;
    }
  }

  /**
   * _handleValue
   * @private
   * @param {Object} $scope
   * @param {String} key
   * @param {*} value
   * @param {*} [subject] Temporarily overrides the subject of `$scope`
   */
  function _handleValue($scope, key, value, subject)
  {
    if (_is(value) == 'Object' && _is(value[key]) != 'Undefined')
    {
      value = value[key];
    }

    // Check option-conditions
    if (_conditions($scope, key, value, subject))
    {
      var targetPath = key,
        parentPath = null,
        parent = (subject || $scope.subject);

      if (key.indexOf('.') > 0)
      {
        // Key is dot string, so resolve the corresponding object.
        targetPath = key.substr(key.lastIndexOf('.') + 1);
        parentPath = key.substr(0, key.lastIndexOf('.'));
        parent = _resolve(parent, parentPath);
      }

      switch (_is(parent[targetPath]))
      {
        case 'Function':
          _handleFunction($scope, parent[targetPath], value, parent);
          break;

        default:
          parent[targetPath] = value;
          break;
      }
    }
  }

  /**
   * Sub handler for `_handleObject`, as the name suggests it is responsible
   * for handling sub objects.
   *
   * @private
   * @param {Object} $scope
   * @param {Array} args
   */
  function _handleObjectObject($scope, args)
  {
    for (var index = 0, length = args.length; index < length; index++)
    {
      var value = args[index];

      for (var key in value)
      {
        switch (_is(value[key]))
        {
          case 'String':
            args.unshift(key);
            _handleObjectString($scope, args);
            break;

          case 'Array':
            // @TODO: Cleanup. Seems a bit messy.
            if (_is(value[key][0]) == 'String')
            {
              var target = _resolve($scope.subject, key);
              _handleObjectString($scope, value[key], target);
            }
            else _handleValue($scope, key, value);
            break;

          default:
            _handleValue($scope, key, value);
            break;
        }
      }
    }
  }

  /**
   * Sub handler for `_handleObject`, as the name suggests it is responsible
   * for handling strings in sub objects.
   * @private
   * @param {Object} $scope
   * @param {Array} args
   * @param {*} [subject]
   */
  function _handleObjectString($scope, args, subject)
  {
    subject = (subject || $scope.subject);

    var pathStr = args.shift();
    var target = _resolve(subject, pathStr);

    switch (_is(target))
    {
      case 'Function':
        // Simply call function
        _handleFunction($scope, target, args, subject);
        break;

      default:
        switch (_is(args[0]))
        {
          // `args = [ { "method": function(target:Object, [... args:*]){} } ]`
          case 'Function':
            // This call is a bit tricky. We remove the first
            // arguments due shift, and merge the remaining
            // arguments to an array containing the target.
            // So we don't need to change the scope.
            _handleFunction(
              $scope,
              args.shift(),
              [ target ].concat(args)
            );
            break;

          default:
            // E.g. `args = [ { "property": 1 } ]`
            if (args.length == 1)
            {
              // Single argument
              _handleValue($scope, pathStr, args[0]);
            }
            // E.g. `args = [ { "property": [ "fn", 1, 2, 3 ] } ];`
            else
            {
              // Multiple arguments
              _handleValue(
                $scope,
                args.shift(),
                args,
                target
              );
            }
            break;
        }
        break;
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
   * @param {Boolean} [options.obtainDataType]
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
      if (_defaultOptions[key] != options[key])
      {
        options[key] = (_is(options[key]) != 'Undefined')
          ? options[key]
          : _defaultOptions[key];
      }
    }

    /**
     * Contains all variables that are scope dependent.
     * @type {object}
     */
    var $scope = {
      previous  : previous,
      subject   : subject,
      options   : options,
      variables : {
        $index   : 0,
        $results : [],
        $result  : undefined
      }
    };
    // Self reference
    $scope.variables.$scope = $scope;

    /**
     * @type {Function}
     */
    var currentChain = function() { console.info('[currentChain/dummy]'); };

    /**
     * The cascade chaining function.
     * @param {... Function|Object|String} args
     * @returns {Function} cascadeChain
     */
    function cascadeChain(args)
    {
      currentChain = (function(originalArgs) {
        // This inner wrap is done for the `.times` method
        return function()
        {
          // Copy original arguments. They will be modified.
          var args = originalArgs.concat();

          if (options.evaluateArguments)
          {
            _evaluateObject($scope, args);
          }

          switch (_is(subject))
          {
            case 'Function':
              _handleFunction($scope, subject, args);
              break;

            case 'Array':
              _handleArray($scope, args);
              break;

            case 'Object':
              _handleObject($scope, args);
              break;

            default:
              throw new Error('@TODO: Implement non-reference values!');
              // _handleValue
              break;
          }

          $scope.variables.$index++;
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
     * @returns {Function}
     */
    cascadeChain.enter = function(property)
    {
      if (/Undefined|Null/.test(_is($scope.subject[property])))
      {
        throw new Error('Property `%s` does not exist on subject.'
          .replace('%s', property));
      }

      return cascade($scope.subject[property], options, cascadeChain);
    };

    /**
     * Exits the current and return the previous `cascadeChain`.
     * @returns {Function}
     */
    cascadeChain.exit = function()
    {
      return ($scope.previous || this);
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
     * @returns {Function}
     */
    cascadeChain.times = function(times)
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
      _evaluateString       : _evaluateString,
      _evaluateObject       : _evaluateObject,
      _evaluateObjectValues : _evaluateObjectValues,
      _handleFunction       : _handleFunction,
      _handleValue          : _handleValue,
      _handleObject         : _handleObject,
      _handleObjectObject   : _handleObjectObject,
      _handleObjectString   : _handleObjectString
    };
  }

  try
  {
    // Browser
    if (_is(window) != 'Undefined')
    {
      window.cascade = cascade;
    }
  }
  catch (e) {}

  try
  {
    // Node?
    if (_is(exports) != 'Undefined')
    {
      exports.cascade = cascade;
    }
  }
  catch (e) {}

})();