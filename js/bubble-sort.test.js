// Dependency-free test runner for js/bubble-sort.js
// Usage: node js/bubble-sort.test.js
//
// Comprehensive correctness, edge-case, and contract tests for the
// Fluid.bubbleSort utility. The module attaches to `window.Fluid`. Under
// Node we provide a `window` global so the module loads, then read `Fluid`
// off of it. Every test asserts a single, documented behavior.

var assert = require('assert');
var path = require('path');

global.window = global.window || {};
require(path.join(__dirname, 'bubble-sort.js'));
var bubbleSort = global.window.Fluid.bubbleSort;

var passed = 0;
var failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok - ' + name);
  } catch (e) {
    failed++;
    console.error('not ok - ' + name + ' :: ' + e.message);
  }
}

// --- Empty / trivial inputs ---

check('empty array returns []', function() {
  assert.deepEqual(bubbleSort([]), []);
});

check('single element stays single', function() {
  assert.deepEqual(bubbleSort([42]), [42]);
});

check('single negative element stays single', function() {
  assert.deepEqual(bubbleSort([-7]), [-7]);
});

check('single zero stays single', function() {
  assert.deepEqual(bubbleSort([0]), [0]);
});

// --- Two and three element cases ---

check('two elements already ordered', function() {
  assert.deepEqual(bubbleSort([1, 2]), [1, 2]);
});

check('two elements reversed get sorted', function() {
  assert.deepEqual(bubbleSort([2, 1]), [1, 2]);
});

check('three elements reversed get sorted', function() {
  assert.deepEqual(bubbleSort([3, 2, 1]), [1, 2, 3]);
});

check('three elements mixed get sorted', function() {
  assert.deepEqual(bubbleSort([2, 3, 1]), [1, 2, 3]);
});

// --- General numeric correctness ---

check('already sorted stays sorted', function() {
  assert.deepEqual(bubbleSort([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
});

check('reversed gets sorted ascending', function() {
  assert.deepEqual(bubbleSort([5, 4, 3, 2, 1]), [1, 2, 3, 4, 5]);
});

check('duplicates handled', function() {
  assert.deepEqual(bubbleSort([3, 1, 2, 1, 3, 2]), [1, 1, 2, 2, 3, 3]);
});

check('mixed numbers sorted ascending', function() {
  assert.deepEqual(bubbleSort([0, -5, 10, 3, -1, 7]), [-5, -1, 0, 3, 7, 10]);
});

check('all equal elements stay in place', function() {
  assert.deepEqual(bubbleSort([4, 4, 4, 4]), [4, 4, 4, 4]);
});

check('negative numbers only', function() {
  assert.deepEqual(bubbleSort([-3, -1, -2, -5, -4]), [-5, -4, -3, -2, -1]);
});

check('zeros and other numbers', function() {
  assert.deepEqual(bubbleSort([0, -1, 0, 2, 0, -2]), [-2, -1, 0, 0, 0, 2]);
});

// --- Floating point ---

check('floats sorted ascending', function() {
  assert.deepEqual(bubbleSort([3.5, 1.1, 2.2, 0.5]), [0.5, 1.1, 2.2, 3.5]);
});

check('mixed positive and negative floats', function() {
  assert.deepEqual(bubbleSort([1.5, -2.5, 0.0, -0.5, 3.0]), [-2.5, -0.5, 0.0, 1.5, 3.0]);
});

// --- String sorting (design contract: comparable values = numbers/strings) ---

check('string array sorted alphabetically', function() {
  assert.deepEqual(bubbleSort(['c', 'a', 'b']), ['a', 'b', 'c']);
});

check('single character strings sorted', function() {
  assert.deepEqual(bubbleSort(['z', 'a', 'm', 'b']), ['a', 'b', 'm', 'z']);
});

check('multi character strings sorted lexicographically', function() {
  assert.deepEqual(bubbleSort(['banana', 'apple', 'cherry']), ['apple', 'banana', 'cherry']);
});

check('already sorted strings stay sorted', function() {
  assert.deepEqual(bubbleSort(['a', 'b', 'c']), ['a', 'b', 'c']);
});

check('reversed strings get sorted', function() {
  assert.deepEqual(bubbleSort(['c', 'b', 'a']), ['a', 'b', 'c']);
});

// --- Non-mutation / contract ---

check('input array is not mutated', function() {
  var input = [3, 1, 2];
  bubbleSort(input);
  assert.deepEqual(input, [3, 1, 2]);
});

check('returns a new array (not same reference)', function() {
  var input = [3, 1, 2];
  var result = bubbleSort(input);
  assert.notStrictEqual(result, input);
});

check('result is not the same reference even when sorted', function() {
  var input = [1, 2, 3];
  var result = bubbleSort(input);
  assert.notStrictEqual(result, input);
  assert.deepEqual(result, [1, 2, 3]);
});

check('multiple invocations are independent', function() {
  var input = [3, 1, 2];
  var r1 = bubbleSort(input);
  var r2 = bubbleSort(input);
  assert.deepEqual(r1, [1, 2, 3]);
  assert.deepEqual(r2, [1, 2, 3]);
  assert.notStrictEqual(r1, r2);
  assert.deepEqual(input, [3, 1, 2]);
});

// --- Invalid input handling ---

check('non-array input returns []', function() {
  assert.deepEqual(bubbleSort(null), []);
  assert.deepEqual(bubbleSort(undefined), []);
  assert.deepEqual(bubbleSort('cba'), []);
  assert.deepEqual(bubbleSort({ 0: 3, 1: 1, length: 2 }), []);
});

check('number input returns []', function() {
  assert.deepEqual(bubbleSort(123), []);
});

check('boolean input returns []', function() {
  assert.deepEqual(bubbleSort(true), []);
  assert.deepEqual(bubbleSort(false), []);
});

check('plain object input returns []', function() {
  assert.deepEqual(bubbleSort({ a: 1, b: 2 }), []);
});

check('no argument returns []', function() {
  assert.deepEqual(bubbleSort(), []);
});

// --- Larger arrays (exercise loop / early-exit) ---

check('large reversed array sorted ascending', function() {
  var expected = [];
  var input = [];
  var i;
  for (i = 0; i < 50; i++) {
    input.push(50 - i);
    expected.push(i + 1);
  }
  assert.deepEqual(bubbleSort(input), expected);
});

check('large already-sorted array stays sorted', function() {
  var input = [];
  var i;
  for (i = 0; i < 50; i++) {
    input.push(i + 1);
  }
  assert.deepEqual(bubbleSort(input), input);
});

check('near-sorted array (one out of place) gets sorted', function() {
  var input = [1, 2, 3, 9, 5, 6, 7, 8, 4];
  assert.deepEqual(bubbleSort(input), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

check('descending then ascending pattern gets sorted', function() {
  assert.deepEqual(bubbleSort([5, 4, 3, 2, 1, 2, 3, 4, 5]), [1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

check('many duplicates get sorted', function() {
  assert.deepEqual(bubbleSort([7, 7, 1, 1, 7, 1, 7, 1]), [1, 1, 1, 1, 7, 7, 7, 7]);
});

check('first element is smallest, last is largest', function() {
  var result = bubbleSort([9, 3, 7, 1, 8]);
  assert.strictEqual(result[0], 1);
  assert.strictEqual(result[result.length - 1], 9);
});

check('large array with duplicates at both ends', function() {
  var input = [9, 1, 9, 1, 9, 1, 9, 1];
  assert.deepEqual(bubbleSort(input), [1, 1, 1, 1, 9, 9, 9, 9]);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
