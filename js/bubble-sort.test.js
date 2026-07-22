// Dependency-free test runner for js/bubble-sort.js
// Usage: node js/bubble-sort.test.js
//
// The module attaches to `window.Fluid`. Under Node we provide a `window`
// global so the module loads, then read `Fluid` off of it.

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

check('empty array returns []', function() {
  assert.deepEqual(bubbleSort([]), []);
});

check('single element stays single', function() {
  assert.deepEqual(bubbleSort([42]), [42]);
});

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

check('input array is not mutated', function() {
  var input = [3, 1, 2];
  bubbleSort(input);
  assert.deepEqual(input, [3, 1, 2]);
});

check('non-array input returns []', function() {
  assert.deepEqual(bubbleSort(null), []);
  assert.deepEqual(bubbleSort(undefined), []);
  assert.deepEqual(bubbleSort('cba'), []);
  assert.deepEqual(bubbleSort({ 0: 3, 1: 1, length: 2 }), []);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
