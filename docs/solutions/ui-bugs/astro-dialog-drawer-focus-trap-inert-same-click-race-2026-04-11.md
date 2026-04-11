---
title: "Astro dialog/drawer: same-click race, tab-order leakage, and missing focus management"
date: 2026-04-11
category: docs/solutions/ui-bugs/
module: club-genai-home
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Drawer closes immediately after opening when clicking the hamburger button"
  - "Keyboard Tab navigates to links inside a closed drawer (visually off-screen)"
  - "Keyboard focus is lost after closing the drawer — lands on body or an unpredictable element"
  - "With drawer open, Tab escapes the dialog overlay and reaches page content behind it"
root_cause: async_timing
resolution_type: code_fix
severity: high
tags:
  - dialog
  - drawer
  - focus-trap
  - inert
  - accessibility
  - wcag
  - aria-modal
  - same-click-race
  - requestAnimationFrame
  - keyboard-navigation
  - astro
---

# Astro dialog/drawer: same-click race, tab-order leakage, and missing focus management

## Problem

A side navigation drawer with `role="dialog"` and `aria-modal="true"` suffered four separate defects that broke keyboard and screen-reader accessibility: a race condition that closed the drawer on the same click that opened it, CSS transform not removing hidden drawer links from the Tab order, missing focus management on open/close, and no Tab focus trap inside the dialog.

## Symptoms

- Clicking the hamburger button opens the drawer, then sometimes closes it on the same click (intermittent; depends on event propagation timing)
- With the drawer visually hidden via `translate-x-full`, pressing Tab still reaches the three hidden nav links
- After closing via Escape or the close button, keyboard focus drops to `<body>` instead of returning to the trigger
- With the drawer open, pressing Tab enough times exits the dialog overlay and reaches interactive elements on the page behind it

## What Didn't Work

- **`translate-x-full` for hiding the drawer**: a CSS transform moves the element off-screen visually but has no effect on the accessibility tree or keyboard Tab order. All focusable children remain fully reachable via keyboard.
- **Registering `document.addEventListener('click', outsideClickHandler)` synchronously inside the button click handler**: the click event that triggered the open continues bubbling to `document` in the same propagation pass, immediately firing the newly registered listener and closing the drawer.

## Solution

Five coordinated fixes address the full surface area:

### Fix 1 — `inert` attribute for closed state (tab-order leakage)

Add `inert` to the drawer element in the initial HTML markup. Remove it on open, restore it on close. `inert` removes the subtree from keyboard Tab order, pointer events, and the accessibility tree simultaneously — unlike CSS transforms, `visibility: hidden`, or `display: none`.

```html
<!-- Initial HTML: drawer closed by default -->
<div id="nav-drawer" role="dialog" aria-modal="true" inert ...>
```

```typescript
function openMenu() {
  drawer.removeAttribute('inert');
  // ...
}

function closeMenu() {
  drawer.setAttribute('inert', '');
  // ...
}
```

### Fix 2 — `requestAnimationFrame` to avoid same-click race

Defer registration of the document-level outside-click listener to the next animation frame. This ensures the listener is not present when the current click event finishes propagating, eliminating the race.

```typescript
requestAnimationFrame(() => {
  outsideClickHandler = (e: MouseEvent) => {
    if (!drawer.contains(e.target as Node) && !btn.contains(e.target as Node)) {
      closeMenu();
    }
  };
  document.addEventListener('click', outsideClickHandler);
});
```

### Fix 3 — Focus management (move in on open, return on close)

```typescript
function openMenu() {
  // ...
  (drawer.querySelector('button, a[href]') as HTMLElement)?.focus();
}

function closeMenu() {
  // ...
  btn.focus(); // always the last statement
}
```

### Fix 4 — Tab focus trap

```typescript
focusTrapHandler = (e: KeyboardEvent) => {
  if (e.key !== 'Tab') return;
  const focusables = Array.from(
    drawer.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last  = focusables[focusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
};
document.addEventListener('keydown', focusTrapHandler);
```

Clean up in `closeMenu()`:

```typescript
if (focusTrapHandler) {
  document.removeEventListener('keydown', focusTrapHandler);
  focusTrapHandler = null;
}
```

### Fix 5 — Idempotency guard (listener leak on double-open)

```typescript
function openMenu() {
  if (outsideClickHandler !== null) return; // already open, skip
  // ...
}
```

Without this guard, rapid double-clicks attach multiple `outsideClickHandler` instances to `document`. The first `closeMenu()` call removes only one reference; the rest become permanent ghost listeners.

## Why This Works

**Same-click race**: click events propagate target → bubbling phase → `document`. A listener registered synchronously inside a button's click handler is already in place when the same event reaches `document` in the same propagation pass. `requestAnimationFrame` defers registration to the next frame, after the current event has fully propagated.

**Tab order leakage**: CSS transforms operate in the visual rendering layer only. The browser's Tab-order computation and the accessibility tree are based on the DOM structure, not visual position. `inert` is the W3C-specified mechanism for removing a subtree from all non-visual interaction surfaces at once.

**Focus management**: WCAG 2.1 SC 2.4.3 (Focus Order) and the ARIA dialog authoring practices require focus to move into a dialog on open and return to the triggering element on close. The focus trap fulfills the `aria-modal="true"` contract — that attribute semantically promises focus cannot escape the dialog, but does not enforce it in the browser; the application code must do so.

**Idempotency guard**: `outsideClickHandler` stores a single function reference. If `openMenu()` runs twice, the second call overwrites the variable but a second listener is already attached to `document` with no stored reference to remove it. The null-check at the start of `openMenu()` prevents re-entry.

## Prevention

For any `role="dialog"` or drawer/offcanvas component in this codebase:

- **Always use `inert`** (not CSS transforms or `display: none`) to hide dialog content from keyboard and AT when not visible
- **Always use `requestAnimationFrame`** when registering document-level click listeners inside click handlers to avoid the same-click race
- **Always implement three-part focus management**: first-focusable on open → Tab trap while open → trigger button on close
- **Guard `openMenu()` with an idempotency check** (`if (listener !== null) return`) to prevent listener accumulation
- Test any new dialog/drawer with keyboard-only navigation (Tab, Shift+Tab, Escape, Enter) as an explicit acceptance criterion

## Related Issues

- Related: `docs/solutions/best-practices/astro-anti-fouc-dark-mode-is-inline-2026-04-10.md` — establishes the rule that interactive JS handlers run after DOM parse in Astro's deferred script model, which is the foundation that makes `requestAnimationFrame` safe to use here
