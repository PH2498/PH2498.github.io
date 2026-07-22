# Tasks: Add Bubble Sort Utility Module

## 1. Implement bubble sort module

- [ ] 1.1 Create `js/bubble-sort.js` exposing `Fluid.bubbleSort(arr)` per design API
- [ ] 1.2 Use ES5 syntax, attach to global `Fluid` namespace (create if missing)
- [ ] 1.3 Implement copy-not-mutate, early-exit optimized bubble sort
- [ ] 1.4 Guard non-array input by returning `[]`

## 2. Add Node-runnable tests

- [ ] 2.1 Create `js/bubble-sort.test.js` requiring the module and asserting ascending output
- [ ] 2.2 Cover cases: empty, single, already-sorted, reversed, duplicates, mixed numbers
- [ ] 2.3 Assert input array is not mutated (copy semantics)
- [ ] 2.4 Run `node js/bubble-sort.test.js`, confirm all assertions pass

## 3. Verify

- [ ] 3.1 Run the test script; capture exit code 0 as evidence
- [ ] 3.2 Static review: ES5 compatibility, no new dependencies, no mutation of input
