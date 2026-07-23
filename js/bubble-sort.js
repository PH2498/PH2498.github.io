/**
 * Bubble sort with early-exit optimization.
 *
 * Returns a NEW array sorted in ascending order. The input array is
 * never mutated (operates on a shallow copy).
 *
 * @param {number[]} arr - array of numbers to sort
 * @returns {number[]} new sorted array
 */
function bubbleSort(arr) {
  // Defensive copy: never mutate the caller's array.
  const result = Array.from(arr);
  const n = result.length;

  // Early exit: a full inner pass with no swaps means it's sorted.
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    // After i passes, the last i elements are already in their final place.
    for (let j = 0; j < n - 1 - i; j++) {
      if (result[j] > result[j + 1]) {
        const tmp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = tmp;
        swapped = true;
      }
    }
    if (!swapped) {
      break;
    }
  }

  return result;
}

// CommonJS export so tests and other modules can require it directly.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bubbleSort };
}
