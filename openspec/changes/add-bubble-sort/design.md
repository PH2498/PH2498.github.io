# Design — Add Bubble Sort

## Decision

Implement classic bubble sort with an early-exit optimization: stop when a full inner pass makes no swaps, indicating the array is already sorted.

## Algorithm

```
n = length(arr)
swapped = true
lastUnsorted = n - 1
while swapped:
  swapped = false
  for i from 0 to lastUnsorted - 1:
    if arr[i] > arr[i+1]:
      swap(arr[i], arr[i+1])
      swapped = true
  lastUnsorted -= 1
```

## Purity

Operate on a shallow copy of the input array so the caller's array is never mutated. Returns the sorted copy.

## Stability

Equal elements are not swapped (comparison is strictly `>`), so the relative order of equal elements is preserved.

## Complexity

- Time: O(n^2) worst/average, O(n) best (already sorted, thanks to early exit).
- Space: O(n) for the returned copy (plus O(1) auxiliary).

## Scope

Numeric arrays only. Non-numeric element ordering is undefined and out of scope for this change.
