var assert = require('assert');
var { quickSort } = require('./quicksort.js');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (err) {
    failed++;
    console.error('  \u2717 ' + name);
    console.error('    ' + err.message);
  }
}

// 深度相等断言(基于 JSON 序列化,满足数字数组场景)
function expectEqual(actual, expected) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
}

console.log('quicksort.test.js');

// --- Test Matrix (S1..S13) ---

test('S1 普通无序数组', function () {
  var result = quickSort([3, 1, 4, 1, 5, 9, 2, 6]);
  expectEqual(result, [1, 1, 2, 3, 4, 5, 6, 9]);
  assert.strictEqual(result.length, 8);
});

test('S2 空数组', function () {
  var arr = [];
  var result = quickSort(arr);
  expectEqual(result, []);
  assert.strictEqual(result.length, 0);
  // 不变式:返回值是新数组(result !== arr)
  assert.notStrictEqual(result, arr);
});

test('S3 单元素数组', function () {
  var result = quickSort([42]);
  expectEqual(result, [42]);
  assert.strictEqual(result.length, 1);
});

test('S4 包含重复元素', function () {
  var result = quickSort([5, 5, 5, 5]);
  expectEqual(result, [5, 5, 5, 5]);
});

test('S5 已排序数组(升序)', function () {
  var result = quickSort([1, 2, 3, 4, 5]);
  expectEqual(result, [1, 2, 3, 4, 5]);
});

test('S6 逆序数组', function () {
  var result = quickSort([5, 4, 3, 2, 1]);
  expectEqual(result, [1, 2, 3, 4, 5]);
});

test('S7 原数组不被修改(不可变性)', function () {
  var arr = [3, 1, 2];
  var original = [...arr];
  var result = quickSort(arr);
  // 原数组仍为 [3, 1, 2]
  expectEqual(arr, [3, 1, 2]);
  expectEqual(arr, original);
  expectEqual(result, [1, 2, 3]);
});

test('S8 负数与零混合', function () {
  var result = quickSort([0, -1, 3, -2, 1]);
  expectEqual(result, [-2, -1, 0, 1, 3]);
});

test('S9 浮点数数组', function () {
  var result = quickSort([3.14, 1.5, 2.71, 0.5]);
  expectEqual(result, [0.5, 1.5, 2.71, 3.14]);
});

test('S10 全部相同且为负数', function () {
  var result = quickSort([-3, -3, -3]);
  expectEqual(result, [-3, -3, -3]);
});

test('S11 极大与极小值混合', function () {
  var result = quickSort([Number.MAX_VALUE, 0, -Number.MAX_VALUE, 1]);
  expectEqual(result, [-Number.MAX_VALUE, 0, 1, Number.MAX_VALUE]);
});

test('S12 两元素无序', function () {
  var result = quickSort([2, 1]);
  expectEqual(result, [1, 2]);
});

test('S13 两元素有序', function () {
  var result = quickSort([1, 2]);
  expectEqual(result, [1, 2]);
});

// --- Invariants 跨场景校验 ---

test('Invariant: 长度守恒 + 新数组 + 升序 + 原数组不变 (跨场景)', function () {
  var cases = [
    [3, 1, 4, 1, 5, 9, 2, 6],
    [],
    [42],
    [5, 5, 5, 5],
    [1, 2, 3, 4, 5],
    [5, 4, 3, 2, 1],
    [3, 1, 2],
    [0, -1, 3, -2, 1],
    [3.14, 1.5, 2.71, 0.5],
    [-3, -3, -3],
    [Number.MAX_VALUE, 0, -Number.MAX_VALUE, 1],
    [2, 1],
    [1, 2]
  ];
  cases.forEach(function (arr) {
    var snapshot = arr.slice();
    var result = quickSort(arr);
    // 1. 长度守恒
    assert.strictEqual(result.length, arr.length, '长度守恒失败: ' + JSON.stringify(arr));
    // 2. 不可变性:原数组内容不变
    assert.strictEqual(JSON.stringify(arr), JSON.stringify(snapshot), '不可变性失败: ' + JSON.stringify(arr));
    // 3. 新数组:返回值是不同引用
    assert.notStrictEqual(result, arr, '新数组不变式失败: ' + JSON.stringify(arr));
    // 4. 升序:对所有 i<j,result[i] <= result[j]
    for (var i = 0; i < result.length - 1; i++) {
      assert.ok(result[i] <= result[i + 1], '升序失败: ' + JSON.stringify(arr) + ' => ' + JSON.stringify(result));
    }
    // 5. 元素守恒:作为多重集相等(排序后一致)
    assert.strictEqual(JSON.stringify(result), JSON.stringify(arr.slice().sort(function (a, b) { return a - b; })), '元素守恒失败: ' + JSON.stringify(arr));
  });
});

console.log('');
console.log('passed: ' + passed + ', failed: ' + failed);
if (failed > 0) {
  process.exit(1);
}
