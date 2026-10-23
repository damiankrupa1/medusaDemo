---
description: Implements a view from a Figma mockup, checking geometry, typography, assets and responsiveness, with a visual comparison.
disable-model-invocation: true
---

# Pixel Perfect

## Goal
Translate an approved mockup into the existing frontend project as faithfully as possible, without needlessly rewriting the architecture.

## Rules
- Do not run linters, tests or builds on your own without agreement.
- If the project or the mockup is ambiguous, ask instead of guessing.
- Do not rebuild unrelated parts of the application.

## Stage 1: Analysis, no changes
1. Read the link to the specific Figma frame. If the Figma MCP is unavailable, say so and ask for access or a screenshot; do not pretend you have read the design.
2. Inspect the frame, layers, dimensions, typography, colors, spacing, components, variants, assets and available breakpoints.
3. Examine the existing frontend: framework, router, styles, design tokens, components and conventions.
4. Do not install dependencies or modify code during analysis.

## Stage 2: Plan and approval
Present:
- the mockup elements and the scope of implementation;
- existing components to reuse;
- the files you plan to change;
- missing assets/information;
- the responsiveness plan;
- the proposed verification (screenshots, tests, lint/build).

Stop and wait for approval of the implementation and the verification scope.

## Stage 3: Implementation
After approval:
- use the project's existing stack and patterns;
- use the real assets from the project/Figma; do not replace them with random images;
- reproduce the hierarchy, proportions, spacing, fonts, colors, borders and states;
- account for semantic HTML, keyboard support and visible interaction states;
- do not add made-up features or content without need.

## Stage 4: Visual check
Run only the approved tools and commands. If a browser/screenshots are available:
- set the viewport to match the frame;
- compare a screenshot of the implementation with the reference;
- fix the largest geometric differences first, then typography, colors and details;
- check the agreed breakpoints.

Do not claim a visual comparison was done if you have no screenshot or browser access.

## Stage 5: Report
List the changed files, the checks performed and known deviations from the mockup.
