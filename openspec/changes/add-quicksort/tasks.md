# Tasks: add-quicksort

## Implementation

- [x] 1. 创建 `js/quicksort.js` 文件。
- [x] 2. 实现 `quickSort` 函数:使用三路分区(小于/等于/大于 pivot),递归排序后拼接返回新数组。
- [x] 3. 处理基准元素选取(选取第一个元素作为 pivot)。
- [x] 4. 确保不修改原数组(使用 `slice` 或 `concat` 创建新数组)。
- [x] 5. 通过 `module.exports = { quickSort }` 导出函数。

## Validation

- [x] 6. 编写测试文件 `js/quicksort.test.js`,覆盖以下场景:
  - 普通无序数组
  - 空数组
  - 单元素数组
  - 重复元素
  - 已排序数组(升序)
  - 逆序数组
  - 原数组不可变性
  - 负数与零混合
- [x] 7. 运行测试验证全部通过(`node js/quicksort.test.js` 或项目现有测试命令)。
