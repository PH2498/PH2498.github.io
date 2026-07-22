# Add Bubble Sort Utility Module

## Summary

Introduce a reusable bubble sort algorithm module under `js/` that sorts arrays in ascending order using the bubble sort algorithm, following the existing project's ES5 / global-namespace conventions and shipping with a dependency-free test script runnable with `node`.

## Motivation

The site currently exposes general-purpose helpers under `js/utils.js` (e.g. `Fluid.utils`), but offers no sorting primitive. Bubble sort is requested as a small, self-contained, well-tested algorithm module that can be reused by other scripts or referenced as a canonical implementation. Implementing it as a standalone file with its own test keeps the change isolated and verifiable without any build tooling (the project has none).

## What Changes

- **Added** `js/bubble-sort.js` — pure ES5 module exposing `Fluid.bubbleSort(arr)` that returns a new ascending-order sorted array copy using bubble sort.
- **Added** `js/bubble-sort.test.js` — Node-runnable test that asserts correctness on representative inputs (empty, single, already sorted, reversed, duplicates, mixed) without any test framework dependency.

## Impact

- **Files touched:** `js/bubble-sort.js` (new), `js/bubble-sort.test.js` (new). No existing files modified.
- **Behavioral impact:** None for existing pages; the module is opt-in and not referenced by any current page until a consumer wires it in.
- **Compatibility:** ES5 syntax, no dependencies, runs in browsers (via `Fluid` global) and Node (test file).
