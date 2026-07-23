# Add Bubble Sort

## Why

The project needs a reusable, well-tested sorting utility. Bubble sort is a simple, stable, in-place sorting algorithm that is easy to understand and maintain, and serves as a foundational building block for future algorithm work.

## What Changes

- Add `js/bubble-sort.js` exporting a `bubbleSort` function.
- Add `js/bubble-sort.test.js` covering common and edge cases.
- The function must be pure: it returns a new sorted array and must NOT mutate the input array.

## Impact

- New files only; no existing source or behavior changes.
- Consumers can import `bubbleSort` from `js/bubble-sort.js` to sort numeric arrays.
