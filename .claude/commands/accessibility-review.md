---
description: Reviews frontend accessibility for semantics, keyboard support, forms, contrast and WCAG. Does not modify code by default.
disable-model-invocation: true
---

# Accessibility Review

## Rules
- By default, only analyze and report. Do not modify code without approval.
- Do not run automated scanners, tests, linters or builds without agreement.
- Do not declare WCAG compliance based on automated scanning alone.
- Assess the existing context and actual behavior, not just individual attributes.

## Check
1. Semantic HTML structure and heading hierarchy.
2. Keyboard support, focus visibility and tab order.
3. Accessible names of buttons, links, icons and controls.
4. Labels, instructions, validation errors and form messages.
5. Contrast of text and interface elements, if it can be determined reliably.
6. Images: alt text and marking decorative assets.
7. Dialogs, menus, dropdowns, modals and focus management.
8. Loading states, errors and dynamic messages.
9. Zoom, reflow and behavior on small screens.
10. Compliance with the agreed WCAG level, if one was specified.

## Report
For each issue, give:
- severity;
- the file and location;
- the impact on the user;
- the WCAG criterion, if it can be assigned reliably;
- the recommended fix.

Distinguish confirmed issues from those that need manual testing. At the end, propose an order of fixes. Do not claim the application is fully accessible without an adequate scope of testing.
