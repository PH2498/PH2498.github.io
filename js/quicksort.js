/**
 * 对数字数组执行升序快速排序。
 * 采用三路分区(less / equal / greater)递归实现。
 *
 * @param {number[]} arr - 待排序的数字数组
 * @returns {number[]} 排序后的新数组(升序),原数组不被修改
 * @example
 *   quickSort([3, 1, 4, 1, 5]); // => [1, 1, 3, 4, 5]
 */
function quickSort(arr) {
  // 基准情形:数组长度 <= 1 时直接返回数组副本(不可变性 + 新数组不变式)
  if (arr.length <= 1) {
    return arr.slice();
  }

  // 基准元素:选取第一个元素作为 pivot
  var pivot = arr[0];

  // 三路分区:less < pivot, equal === pivot, greater > pivot
  var less = [];
  var equal = [];
  var greater = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] < pivot) {
      less.push(arr[i]);
    } else if (arr[i] > pivot) {
      greater.push(arr[i]);
    } else {
      equal.push(arr[i]);
    }
  }

  // 递归排序 less 和 greater,拼接返回新数组
  return quickSort(less).concat(equal).concat(quickSort(greater));
}

module.exports = { quickSort };
