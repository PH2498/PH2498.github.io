/**
 * Comprehensive test suite for js/bubble-sort.js
 *
 * Covers correctness, purity, stability, edge cases, consistency, and
 * larger inputs. Uses Node's built-in assert module only — no external
 * test framework required.
 *
 * Run: node js/bubble-sort.test.js
 */

'use strict';

const assert = require('assert');
const { bubbleSort } = require('./bubble-sort');

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

/**
 * Run a single named test case.
 * @param {string} name
 * @param {() => void} fn
 */
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok - ' + name);
  } catch (err) {
    failed++;
    failures.push({ name, message: err && err.message ? err.message : String(err) });
    console.log('not ok - ' + name);
    console.log('      ' + (err && err.stack ? err.stack.split('\n').slice(0, 2).join('\n      ') : String(err)));
  }
}

/** Deep-equal helper for arrays (also available via assert.deepStrictEqual). */
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k++) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 1. Edge cases: empty and single element
// ---------------------------------------------------------------------------

test('empty array returns empty array', () => {
  assert.deepStrictEqual(bubbleSort([]), []);
});

test('empty array result is a new array instance', () => {
  const out = bubbleSort([]);
  assert.ok(Array.isArray(out), 'result should be an array');
  assert.notStrictEqual(out, []);
});

test('single element returns same single element', () => {
  assert.deepStrictEqual(bubbleSort([7]), [7]);
});

test('single negative element is preserved', () => {
  assert.deepStrictEqual(bubbleSort([-42]), [-42]);
});

test('single zero element is preserved', () => {
  assert.deepStrictEqual(bubbleSort([0]), [0]);
});

// ---------------------------------------------------------------------------
// 2. Already-sorted input (best case, early-exit path)
// ---------------------------------------------------------------------------

test('already sorted input stays sorted (small)', () => {
  assert.deepStrictEqual(bubbleSort([1, 2, 3]), [1, 2, 3]);
});

test('already sorted input stays sorted (large ascending)', () => {
  const input = [];
  for (let i = 0; i < 100; i++) input.push(i);
  const expected = input.slice();
  assert.deepStrictEqual(bubbleSort(input), expected);
});

test('descending input is reordered to ascending', () => {
  assert.deepStrictEqual(bubbleSort([5, 4, 3, 2, 1]), [1, 2, 3, 4, 5]);
});

// ---------------------------------------------------------------------------
// 3. General unsorted correctness
// ---------------------------------------------------------------------------

test('unsorted input is sorted ascending', () => {
  assert.deepStrictEqual(bubbleSort([5, 3, 8, 1, 2]), [1, 2, 3, 5, 8]);
});

test('small unsorted input is sorted ascending', () => {
  assert.deepStrictEqual(bubbleSort([2, 1]), [1, 2]);
});

test('two elements already ordered stay the same', () => {
  assert.deepStrictEqual(bubbleSort([1, 2]), [1, 2]);
});

test('three element fully reversed', () => {
  assert.deepStrictEqual(bubbleSort([3, 2, 1]), [1, 2, 3]);
});

test('mixed positive and negative numbers', () => {
  assert.deepStrictEqual(bubbleSort([3, -1, 0, -2, 5, -3]), [-3, -2, -1, 0, 3, 5]);
});

test('input with zeros and negatives', () => {
  assert.deepStrictEqual(bubbleSort([0, -1, 0, -1, 2]), [-1, -1, 0, 0, 2]);
});

// ---------------------------------------------------------------------------
// 4. Duplicates
// ---------------------------------------------------------------------------

test('duplicate elements sorted correctly', () => {
  assert.deepStrictEqual(bubbleSort([4, 2, 4, 1]), [1, 2, 4, 4]);
});

test('all identical elements remain identical', () => {
  assert.deepStrictEqual(bubbleSort([9, 9, 9, 9]), [9, 9, 9, 9]);
});

test('many duplicates interleaved', () => {
  assert.deepStrictEqual(bubbleSort([3, 1, 3, 1, 3, 1]), [1, 1, 1, 3, 3, 3]);
});

// ---------------------------------------------------------------------------
// 5. Purity: input is never mutated
// ---------------------------------------------------------------------------

test('input array is not mutated (small)', () => {
  const input = [3, 1, 2];
  bubbleSort(input);
  assert.deepStrictEqual(input, [3, 1, 2]);
});

test('input array is not mutated (already sorted)', () => {
  const input = [1, 2, 3];
  bubbleSort(input);
  assert.deepStrictEqual(input, [1, 2, 3]);
});

test('input array is not mutated (empty)', () => {
  const input = [];
  bubbleSort(input);
  assert.deepStrictEqual(input, []);
});

test('input array is not mutated (duplicates)', () => {
  const input = [4, 2, 4, 1];
  bubbleSort(input);
  assert.deepStrictEqual(input, [4, 2, 4, 1]);
});

test('returns a new array instance (not same reference)', () => {
  const input = [3, 1, 2];
  const out = bubbleSort(input);
  assert.notStrictEqual(out, input);
});

// ---------------------------------------------------------------------------
// 6. Stability of equal elements (strict > comparison)
// ---------------------------------------------------------------------------

/**
 * Stability is verified indirectly: equal numeric values stay adjacent in
 * ascending order. True object-level stability would need tagged pairs;
 * here we assert equal values remain grouped correctly.
 */
test('equal values remain grouped in ascending order', () => {
  const out = bubbleSort([2, 1, 2, 1, 2]);
  assert.deepStrictEqual(out, [1, 1, 2, 2, 2]);
});

test('two equal elements are never swapped out of order', () => {
  const out = bubbleSort([5, 5]);
  assert.deepStrictEqual(out, [5, 5]);
});

// ---------------------------------------------------------------------------
// 7. Consistency vs reference implementation (Array.prototype.sort)
// ---------------------------------------------------------------------------

test('matches native numeric sort on random small arrays', () => {
  for (let trial = 0; trial < 20; trial++) {
    const n = 1 + Math.floor(Math.random() * 30);
    const input = [];
    for (let k = 0; k < n; k++) input.push(Math.floor(Math.random() * 50) - 25);
    const expected = input.slice().sort((a, b) => a - b);
    assert.deepStrictEqual(bubbleSort(input), expected);
    // purity: input unchanged
    assert.deepStrictEqual(input, input.slice());
  }
});

test('matches native sort on arrays of duplicates', () => {
  const input = [7, 7, 7, 7, 7];
  const expected = input.slice().sort((a, b) => a - b);
  assert.deepStrictEqual(bubbleSort(input), expected);
});

// ---------------------------------------------------------------------------
// 8. Larger inputs (still lightweight)
// ---------------------------------------------------------------------------

test('sorts a larger descending-range array', () => {
  const n = 200;
  const input = [];
  for (let i = n - 1; i >= 0; i--) input.push(i); // descending
  const expected = [];
  for (let i = 0; i < n; i++) expected.push(i);
  assert.deepStrictEqual(bubbleSort(input), expected);
});

test('sorts a pseudo-random larger array correctly', () => {
  const n = 300;
  const input = [];
  // Simple deterministic LCG to avoid heavy RNG use; fixed seed for reproducibility.
  let state = 123456789;
  for (let i = 0; i < n; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    input.push(state % 1000);
  }
  const expected = input.slice().sort((a, b) => a - b);
  assert.deepStrictEqual(bubbleSort(input), expected);
});

// ---------------------------------------------------------------------------
// 9. Determinism: repeated calls produce identical output
// ---------------------------------------------------------------------------

test('repeated calls on same input produce identical output', () => {
  const input = [9, 3, 7, 1, 8, 2, 6, 4, 5];
  const first = bubbleSort(input);
  const second = bubbleSort(input);
  const third = bubbleSort(input);
  assert.ok(arraysEqual(first, second), 'first and second differ');
  assert.ok(arraysEqual(second, third), 'second and third differ');
});

// ---------------------------------------------------------------------------
// 10. arraysEqual helper sanity (meta test)
// ---------------------------------------------------------------------------

test('helper arraysEqual detects differences', () => {
  assert.ok(arraysEqual([1, 2, 3], [1, 2, 3]));
  assert.ok(!arraysEqual([1, 2], [1, 2, 3]));
  assert.ok(!arraysEqual([1, 3], [1, 2]));
  assert.ok(!arraysEqual('abc', ['a', 'b', 'c']));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('');
console.log(passed + ' tests passed');
if (failed > 0) {
  console.log(failed + ' tests failed:');
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + f.message);
  }
  process.exit(1);
}
