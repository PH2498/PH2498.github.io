# Spec: quicksort

## Requirement

`js/quicksort.js` 模块导出一个名为 `quickSort` 的函数,对数字数组执行升序快速排序。
该实现为纯函数:不修改原数组,返回一个排序后的新数组。

## Interface

### 函数签名

```javascript
/**
 * 对数字数组执行升序快速排序。
 * 采用三路分区(less / equal / greater)递归实现。
 *
 * @param {number[]} arr - 待排序的数字数组
 * @returns {number[]} 排序后的新数组(升序),原数组不被修改
 * @example
 *   quickSort([3, 1, 4, 1, 5]); // => [1, 1, 3, 4, 5]
 */
function quickSort(arr) { ... }

module.exports = { quickSort };
```

### 参数与返回值约定

| 参数/返回 | 类型 | 约定 |
|-----------|------|------|
| `arr` | `number[]` | 数字数组;可为空数组或单元素数组 |
| 返回值 | `number[]` | 升序排列的新数组;长度与输入一致 |
| 原数组 | — | 不被修改(不可变性) |

## Algorithm

本实现使用经典递归三路分区:

1. **基准元素 (pivot)**: 选取输入数组的第一个元素作为 pivot。
2. **三路分区**: 遍历数组,将每个元素分配到三个子数组:
   - `less`: 小于 pivot 的元素。
   - `equal`: 等于 pivot 的元素。
   - `greater`: 大于 pivot 的元素。
3. **递归**: 对 `less` 和 `greater` 递归调用 `quickSort`。
4. **拼接**: `quickSort(less) + equal + quickSort(greater)`。
5. **基准情形**: 数组长度 ≤ 1 时直接返回数组副本。

三路分区相比传统二路分区,对包含大量重复元素的输入具有更好的退化保护,
避免相同元素反复递归导致的性能下降。

## Scenarios

以下场景使用 Given/When/Then 格式定义。所有场景中 `arr` 为输入数组,
`result` 为 `quickSort(arr)` 的返回值。

### Scenario 1: 普通无序数组

- **Given** 输入数组 `[3, 1, 4, 1, 5, 9, 2, 6]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[1, 1, 2, 3, 4, 5, 6, 9]`
- **And** 返回数组长度为 8

### Scenario 2: 空数组

- **Given** 输入数组 `[]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[]`
- **And** 返回数组长度为 0
- **And** 返回值是一个新数组(`result !== arr`)

### Scenario 3: 单元素数组

- **Given** 输入数组 `[42]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[42]`
- **And** 返回数组长度为 1

### Scenario 4: 包含重复元素的数组

- **Given** 输入数组 `[5, 5, 5, 5]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[5, 5, 5, 5]`
- **And** 三路分区将所有元素归入 `equal`,不产生额外递归

### Scenario 5: 已排序数组(升序)

- **Given** 输入数组 `[1, 2, 3, 4, 5]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[1, 2, 3, 4, 5]`
- **And** 所有元素依次归入 `greater`,逐层递归

### Scenario 6: 逆序数组

- **Given** 输入数组 `[5, 4, 3, 2, 1]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[1, 2, 3, 4, 5]`

### Scenario 7: 原数组不被修改(不可变性)

- **Given** 输入数组 `[3, 1, 2]`,保存其引用 `const original = [...arr]`
- **When** 调用 `quickSort(arr)` 并获取返回值 `result`
- **Then** 原数组 `arr` 仍为 `[3, 1, 2]`
- **And** `arr` 与 `original` 深度相等
- **And** `result` 为 `[1, 2, 3]`

### Scenario 8: 负数与零混合

- **Given** 输入数组 `[0, -1, 3, -2, 1]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[-2, -1, 0, 1, 3]`

### Scenario 9: 浮点数数组

- **Given** 输入数组 `[3.14, 1.5, 2.71, 0.5]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[0.5, 1.5, 2.71, 3.14]`

### Scenario 10: 全部相同且为负数

- **Given** 输入数组 `[-3, -3, -3]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[-3, -3, -3]`

### Scenario 11: 极大与极小值混合

- **Given** 输入数组 `[Number.MAX_VALUE, 0, -Number.MAX_VALUE, 1]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[-Number.MAX_VALUE, 0, 1, Number.MAX_VALUE]`

### Scenario 12: 两元素无序

- **Given** 输入数组 `[2, 1]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[1, 2]`

### Scenario 13: 两元素有序

- **Given** 输入数组 `[1, 2]`
- **When** 调用 `quickSort(arr)`
- **Then** 返回 `[1, 2]`

## Edge Cases

- **非数组输入**: 行为不在本变更范围内(不要求抛错或做类型检查)。
- **含非数字元素**(如字符串、对象): 行为不在本变更范围内;调用者应确保输入为纯数字数组。
- **含 NaN 或 Infinity**: 数值比较按 JavaScript `<=` / `>` 语义处理,行为由运行时定义,本变更不额外约束。
- **超大数组**: 递归实现对超大数组(如数十万元素)可能因栈溢出失败;
  三路分区缓解重复元素退化,但不保证栈安全;超大输入不纳入验收范围。

## Invariants

以下不变式在所有验收场景中必须成立:

1. **长度守恒**: `result.length === arr.length`。
2. **不可变性**: 调用前后 `arr` 内容不变(`JSON.stringify` 一致)。
3. **新数组**: `result !== arr`(返回值是不同引用的新数组)。
4. **升序**: 对所有 `i < j`,`result[i] <= result[j]`。
5. **元素守恒**: 返回数组是输入数组的排列(作为多重集相等)。

## Test Matrix

| # | 输入 | 期望输出 | 覆盖场景 |
|---|------|----------|----------|
| 1 | `[3,1,4,1,5,9,2,6]` | `[1,1,2,3,4,5,6,9]` | S1 |
| 2 | `[]` | `[]` | S2 |
| 3 | `[42]` | `[42]` | S3 |
| 4 | `[5,5,5,5]` | `[5,5,5,5]` | S4 |
| 5 | `[1,2,3,4,5]` | `[1,2,3,4,5]` | S5 |
| 6 | `[5,4,3,2,1]` | `[1,2,3,4,5]` | S6 |
| 7 | `[3,1,2]` | `[1,2,3]` + 原数组不变 | S7 |
| 8 | `[0,-1,3,-2,1]` | `[-2,-1,0,1,3]` | S8 |
| 9 | `[3.14,1.5,2.71,0.5]` | `[0.5,1.5,2.71,3.14]` | S9 |
| 10 | `[-3,-3,-3]` | `[-3,-3,-3]` | S10 |
| 11 | `[MAX,0,-MAX,1]` | `[-MAX,0,1,MAX]` | S11 |
| 12 | `[2,1]` | `[1,2]` | S12 |
| 13 | `[1,2]` | `[1,2]` | S13 |

## Out of Scope

以下明确不在本变更范围内,实现不应尝试处理:

- 自定义比较函数(comparator)。
- 降序排序选项。
- 原地排序(in-place)模式。
- 非数字类型排序(字符串、对象)。
- 性能基准测试或与内置 `Array.prototype.sort` 的对比。
- 集成到任何现有页面 UI 或业务逻辑中。

## Pivot Selection Strategy

本变更选取数组的第一个元素作为 pivot。该策略的理由与局限:

- **理由**: 实现简单、确定性高、可预测;对所有验收场景表现一致。
- **局限**: 对已排序或接近排序的输入,该策略会导致最坏情况 O(n²) 的递归深度。
  三路分区可缓解重复元素的退化,但对严格递增序列仍存在递归深度线性增长的风险。
- **替代方案(不纳入本变更)**: 随机选取 pivot、三数取中(median-of-three)、
  或插入排序小分区混合策略。这些方案留待未来变更评估。

本变更接受上述局限,因为验收范围不包含超大输入的栈安全保证。

## Complexity Summary

| 指标 | 平均情况 | 最坏情况 |
|------|----------|----------|
| 时间复杂度 | O(n log n) | O(n²) |
| 空间复杂度 | O(n) | O(n) |
| 递归深度 | O(log n) | O(n) |

空间复杂度 O(n) 源于三路分区创建的 `less`、`equal`、`greater` 子数组,
以及每次递归拼接产生的新数组。这是不可变纯函数实现的固有代价。

## Dependencies

本实现仅依赖 JavaScript 语言内置功能,无外部依赖:

- `Array.prototype.filter`: 用于三路分区。
- `Array.prototype.concat`: 用于拼接排序结果。
- 数值比较运算符 `<`、`>`、`<=`。

不引入任何 npm 包或第三方库。

## File Layout

```
js/
  quicksort.js          # 实现:quickSort 函数导出
  quicksort.test.js     # 测试:覆盖 Test Matrix 全部场景
```

文件位于仓库现有 `js/` 目录下,与 `utils.js`、`boot.js` 等现有模块并列。
不修改任何现有文件,不新增构建配置。
