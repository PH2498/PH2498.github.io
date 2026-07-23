/* global Fluid, module */

/**
 * QuickSort module for the Fluid theme.
 *
 * Externally observable behavior (spec):
 *   - Fluid.sort.quickSort(arr, [compareFn]) -> Array
 *       Returns a NEW array sorted in ascending order by default.
 *       Does NOT mutate the input array.
 *       Optional compareFn follows Array.prototype.sort semantics:
 *         compareFn(a, b) < 0  => a before b
 *         compareFn(a, b) > 0  => b before a
 *         compareFn(a, b) === 0 => relative order of equal elements is NOT
 *         guaranteed (quicksort is an UNSTABLE sort; see note below).
 *   - Fluid.sort.quickSortInPlace(arr, [compareFn]) -> Array
 *       Sorts the given array in place and returns it.
 *
 * Stability note:
 *   Quicksort is inherently non-stable. The Lomuto partition places elements
 *   equal to the pivot on its left side, but pivot swaps and median-of-three
 *   exchanges can reorder equal elements. Callers that require stability
 *   should pair the input with an original index and sort by [value, index].
 *
 * Default comparator:
 *   Orders numbers ascending; values are coerced via the "<" operator so it
 *   also works for strings. Non-function compareFn values fall back to the
 *   default comparator (mirroring Array.prototype.sort, which ignores them).
 *
 * Input handling:
 *   - null/undefined arr is treated as an empty array.
 *   - Array-like objects (e.g. arguments) are coerced via Array.prototype.slice.
 *   - quickSort never mutates the input; quickSortInPlace sorts in place.
 *
 * Implementation notes (design):
 *   - Lomuto partition with median-of-three pivot to avoid O(n^2) on
 *     already-sorted / reverse-sorted input.
 *   - Iteration on the larger half plus recursion on the smaller half bounds
 *     the recursion depth to O(log n).
 *   - Insertion sort for small sub-arrays (len <= INSERTION_THRESHOLD) which is
 *     faster in practice than recursing down to length 1.
 *
 * Complexity:
 *   - Time:  O(n log n) average, O(n^2) worst case (mitigated by median-of-three).
 *   - Space: O(log n) auxiliary (recursion on the smaller half only).
 *
 * @example
 *   Fluid.sort.quickSort([3, 1, 2]);                  // [1, 2, 3]
 *   Fluid.sort.quickSort([3, 1, 2], (a, b) => b - a); // [3, 2, 1]
 *   Fluid.sort.quickSortInPlace([3, 1, 2]);           // [1, 2, 3] (same ref)
 */
(function (root) {
  'use strict';

  // Respect an existing Fluid namespace, but stay runnable under Node.
  var Fluid = root.Fluid || (root.Fluid = {});
  Fluid.sort = Fluid.sort || {};

  // Sub-arrays at or below this length are handled by insertion sort, which is
  // faster than recursing down to length 1 and reduces partitioning overhead.
  var INSERTION_THRESHOLD = 16;

  // Default comparator: ascending order for numbers and (coercible) strings.
  function defaultCompare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  // Resolve the caller-supplied compareFn. Non-function values (including the
  // default undefined) fall back to defaultCompare, mirroring the behavior of
  // Array.prototype.sort which ignores a non-function comparator instead of
  // throwing. This keeps quickSort robust against bad input.
  function resolveCompare(compareFn) {
    return typeof compareFn === 'function' ? compareFn : defaultCompare;
  }

  // Coerce a possibly-null / array-like input into a real Array slice so the
  // rest of the module always works on a genuine Array.
  function coerceArray(arr) {
    return Array.prototype.slice.call(arr || []);
  }

  // Median-of-three: order arr[lo], arr[mid], arr[hi] and place the median at
  // arr[hi-1] as the pivot slot used by the Lomuto partition below.
  function medianOfThree(arr, lo, hi, compareFn) {
    var mid = (lo + hi) >>> 1;
    if (compareFn(arr[lo], arr[mid]) > 0) {
      swap(arr, lo, mid);
    }
    if (compareFn(arr[lo], arr[hi]) > 0) {
      swap(arr, lo, hi);
    }
    if (compareFn(arr[mid], arr[hi]) > 0) {
      swap(arr, mid, hi);
    }
    // Move median (now at mid) into the pivot slot hi-1.
    swap(arr, mid, hi - 1);
    return arr[hi - 1];
  }

  function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  function insertionSort(arr, lo, hi, compareFn) {
    var i, j, key;
    for (i = lo + 1; i <= hi; i++) {
      key = arr[i];
      j = i - 1;
      while (j >= lo && compareFn(arr[j], key) > 0) {
        arr[j + 1] = arr[j];
        j--;
      }
      arr[j + 1] = key;
    }
  }

  // Lomuto partition. Pivot is expected at arr[hi] (provided by caller).
  function partition(arr, lo, hi, compareFn) {
    var pivot = arr[hi];
    var i = lo - 1;
    var j;
    for (j = lo; j < hi; j++) {
      if (compareFn(arr[j], pivot) <= 0) {
        i++;
        swap(arr, i, j);
      }
    }
    swap(arr, i + 1, hi);
    return i + 1;
  }

  function quickSortRange(arr, lo, hi, compareFn) {
    var len = hi - lo + 1;
    while (len > 1) {
      if (len <= INSERTION_THRESHOLD) {
        insertionSort(arr, lo, hi, compareFn);
        return;
      }
      // Median-of-three places pivot at arr[hi-1]; move it to arr[hi] slot.
      medianOfThree(arr, lo, hi, compareFn);
      swap(arr, hi - 1, hi); // pivot now at arr[hi]
      var p = partition(arr, lo, hi, compareFn);

      // Recurse into the smaller side, iterate on the larger side to bound
      // the explicit stack/recursion depth to O(log n).
      var leftSize = p - 1 - lo;
      var rightSize = hi - (p + 1);
      if (leftSize < rightSize) {
        if (leftSize > 0) {
          quickSortRange(arr, lo, p - 1, compareFn);
        }
        lo = p + 1;
      } else {
        if (rightSize > 0) {
          quickSortRange(arr, p + 1, hi, compareFn);
        }
        hi = p - 1;
      }
      len = hi - lo + 1;
    }
  }

  /**
   * Returns a new sorted array; the input is not modified.
   *
   * @param {Array|ArrayLike} arr Input array (or array-like). null/undefined
   *   is treated as an empty array.
   * @param {Function} [compareFn] Optional comparator with sort() semantics.
   *   Non-function values are ignored and the default ascending comparator is
   *   used.
   * @returns {Array} A new array containing the sorted elements.
   *
   * @example
   *   quickSort([3, 1, 2]);                   // [1, 2, 3]
   *   quickSort([3, 1, 2], (a, b) => b - a);   // [3, 2, 1]
   *   quickSort(null);                        // []
   */
  Fluid.sort.quickSort = function (arr, compareFn) {
    var copy = coerceArray(arr);
    if (copy.length <= 1) {
      return copy;
    }
    quickSortRange(copy, 0, copy.length - 1, resolveCompare(compareFn));
    return copy;
  };

  /**
   * Sorts the given array in place and returns it.
   *
   * @param {Array} arr Input array to sort in place. null/undefined is treated
   *   as an empty array.
   * @param {Function} [compareFn] Optional comparator with sort() semantics.
   *   Non-function values are ignored and the default ascending comparator is
   *   used.
   * @returns {Array} The same array reference, now sorted.
   *
   * @example
   *   var a = [3, 1, 2];
   *   quickSortInPlace(a); // a === [1, 2, 3]
   */
  Fluid.sort.quickSortInPlace = function (arr, compareFn) {
    var list = arr || [];
    if (list.length > 1) {
      quickSortRange(list, 0, list.length - 1, resolveCompare(compareFn));
    }
    return list;
  };

  // CommonJS hook so the module is verifiable under Node without a browser.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      quickSort: Fluid.sort.quickSort,
      quickSortInPlace: Fluid.sort.quickSortInPlace
    };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
