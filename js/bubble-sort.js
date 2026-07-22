/* global Fluid */

// Ensure the global Fluid namespace exists without overwriting an existing one.
// Reference via `window.Fluid` throughout so the module is self-contained and
// loadable both in browsers (where `window` === global) and in Node tests
// (where a `global.window` stub is provided).
var Fluid = window.Fluid = window.Fluid || {};

/**
 * Bubble sort utility.
 *
 * Sorts a copy of the input array in ascending order using the bubble sort
 * algorithm. The input array is never mutated. Non-array input safely returns [].
 *
 * @param  {Array} arr - array of mutually comparable values (numbers/strings)
 * @return {Array} new array sorted in ascending order
 */
Fluid.bubbleSort = function(arr) {
  if (!arr || !arr.length || Object.prototype.toString.call(arr) !== '[object Array]') {
    return [];
  }

  var copy = arr.slice(0);
  var n = copy.length;
  var swapped = true;

  while (swapped) {
    swapped = false;
    for (var i = 0; i < n - 1; i++) {
      if (copy[i] > copy[i + 1]) {
        var tmp = copy[i];
        copy[i] = copy[i + 1];
        copy[i + 1] = tmp;
        swapped = true;
      }
    }
  }

  return copy;
};
