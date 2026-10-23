---
description: Analyzes a proposed architecture change before implementation and presents options, trade-offs and a recommendation.
disable-model-invocation: true
---

# Architecture Review

## Goal
Help make an informed architectural decision. By default you analyze and recommend; you do not implement.

## Rules
- Get to know the existing code and project conventions first.
- Do not assume a new library, abstraction, layer or pattern is needed.
- Do not change files, install dependencies or run tests/builds without separate approval.
- Separate facts found in the code from assumptions.
- Prefer the smallest change that solves the actual problem.
- Consider maintainability, testability, security, performance and migration cost.

## Procedure
1. Summarize the requirement and the constraints.
2. Point to the existing places in the code that relate to the problem.
3. Describe 1–3 realistic options, including a simple minimal option.
4. For each option, give its pros, cons, risks and impact on existing code.
5. State your recommendation and the reasoning.
6. Propose a plan of files/modules to change and the verification scope.
7. Stop and ask for approval before implementing.

## Response format
- Goal and context
- Current state
- Options considered
- Recommendation
- Files and scope of changes
- Risks and migrations
- Proposed tests
- Request for approval

Do not present an implementation as done if it was not done.
