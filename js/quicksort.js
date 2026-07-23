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
 *         compareFn(a, b) === 0 => order unchanged (stable w.r.t. partition)
 *   - Fluid.sort.quickSortInPlace(arr, [compareFn]) -> Array
 *       Sorts the given array in place and returns it.
 *
 * Default comparator orders numbers ascending; values are coerced via the
 * "<" operator so it also works for strings.
 *
 * Implementation notes (design):
 *   - Lomuto partition with median-of-three pivot to avoid O(n^2) on
 *     already-sorted / reverse-sorted input.
 *   - Tail-recursion-free iterative stack for the larger half to bound stack
 *     depth to O(log n); the smaller half recurses.
 *   - Insertion sort for small sub-arrays (len <= INSERTION_THRESHOLD) which is
 *     faster in practice than recursing down to length 1.
 */
(function (root) {
  'use strict';

  // Respect an existing Fluid namespace, but stay runnable under Node.
  var Fluid = root.Fluid || (root.Fluid = {});
  Fluid.sort = Fluid.sort || {};

  var INSERTION_THRESHOLD = 16;

  function defaultCompare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
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
   * @param {Array} arr
   * @param {Function} [compareFn]
   * @returns {Array}
   */
  Fluid.sort.quickSort = function (arr, compareFn) {
    var copy = Array.prototype.slice.call(arr || []);
    if (copy.length <= 1) {
      return copy;
    }
    quickSortRange(copy, 0, copy.length - 1, compareFn || defaultCompare);
    return copy;
  };

  /**
   * Sorts the given array in place and returns it.
   * @param {Array} arr
   * @param {Function} [compareFn]
   * @returns {Array}
   */
  Fluid.sort.quickSortInPlace = function (arr, compareFn) {
    var list = arr || [];
    if (list.length > 1) {
      quickSortRange(list, 0, list.length - 1, compareFn || defaultCompare);
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
