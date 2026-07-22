# Design: Add Bubble Sort Utility Module

## Context

Static GitHub Pages site (HTML + vanilla JS, no build system, no `package.json`). Existing JS under `js/` uses ES5 (`var`, `function`, object literals) and attaches helpers to a global `Fluid` namespace (see `js/utils.js`). There is no test runner; tests must be runnable with plain `node`.

## Goals / Non-Goals

- **Goals:** provide a correct, dependency-free bubble sort; match existing ES5/global-namespace style; include a self-contained Node-runnable test.
- **Non-Goals:** integrate the module into any page (no DOM wiring); support descending order or custom comparators in this change; add a build step.

## API

```js
Fluid.bubbleSort(arr) // -> new Array (ascending)
```

- **Param:** `arr` — array-like of comparable values (numbers/strings). Accepts a real Array.
- **Returns:** a NEW array (does not mutate the input) sorted in ascending order.
- **Behavior:** classic bubble sort — repeated adjacent swaps until no swap occurs in a pass; uses an early-exit when a full pass performs no swaps.
- **Invalid input:** returns `[]` for `null`/`undefined`/non-array to keep the helper safe-by-default.

## Algorithm (reference)

```
function bubbleSort(arr):
  if not arr or not arr.length: return []
  copy = arr.slice(0)
  n = copy.length
  swapped = true
  while swapped:
    swapped = false
    for i from 0 to n-2:
      if copy[i] > copy[i+1]:
        swap(copy[i], copy[i+1])
        swapped = true
  return copy
```

## Data / Model

- No persistence; pure function.

## Decisions

- **ES5 syntax** so it can be loaded by existing pages without transpilation and matches `js/utils.js`.
- **Return a copy, never mutate input** — prevents surprising side-effects when reused.
- **Guard non-array input** by returning `[]` rather than throwing — consistent with defensive helpers in `utils.js`.
- **Early-exit optimization** (stop when a pass has no swaps) — keeps classic bubble sort semantics while avoiding needless passes on nearly-sorted input.

## Risks / Trade-offs

- Bubble sort is O(n²) worst-case; acceptable for small arrays / educational use, which is the stated scope.
- Comparing mixed types (number vs string) with `>` relies on JS default coercion; the module documents "comparable values" as the contract.
