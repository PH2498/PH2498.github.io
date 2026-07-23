# Spec — sort

## Requirements

### Requirement: Ascending numeric sort

The `bubbleSort` function SHALL return a new array containing all elements of the input array sorted in ascending order.

#### Scenario: Unsorted input

- WHEN `bubbleSort` is called with `[5, 3, 8, 1, 2]`
- THEN it SHALL return `[1, 2, 3, 5, 8]`

#### Scenario: Already sorted input

- WHEN `bubbleSort` is called with `[1, 2, 3]`
- THEN it SHALL return `[1, 2, 3]`

#### Scenario: Duplicate elements

- WHEN `bubbleSort` is called with `[4, 2, 4, 1]`
- THEN it SHALL return `[1, 2, 4, 4]`

### Requirement: Purity — no input mutation

The `bubbleSort` function SHALL NOT mutate the input array passed by the caller.

#### Scenario: Input preserved after sort

- WHEN `bubbleSort` is called with `[3, 1, 2]`
- THEN the input array SHALL remain `[3, 1, 2]` after the call

### Requirement: Edge cases

#### Scenario: Empty array

- WHEN `bubbleSort` is called with `[]`
- THEN it SHALL return `[]`

#### Scenario: Single element

- WHEN `bubbleSort` is called with `[7]`
- THEN it SHALL return `[7]`
