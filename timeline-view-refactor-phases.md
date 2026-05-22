# Timeline view refactor phases

## Goal

Refactor `src/views/TimelineView.ts` so the timeline view is split into small modules with clear responsibilities.

A hard requirement for this refactor:

- `QuickCheckInModal` and the inline composer inside the timeline view must share the same UI building blocks and the same draft behavior.
- Shared behavior includes at least:
  - content textarea behavior
  - tag chip input and tag draft commit rules
  - pending attachment rendering
  - image/file picker actions
  - audio recording flow
  - attachment preview cleanup

This means the target is not just "similar UI". The target is shared implementation.

## Current problems

- `src/views/TimelineView.ts` is too large and mixes rendering, state, actions, persistence, modal code, and utility helpers.
- Timeline composer logic duplicates `src/quick-check-in/QuickCheckInModal.ts`.
- Entry actions, modals, and pure helper functions are embedded in the same file.
- The view currently owns too many low-level DOM concerns, which makes behavior changes expensive and risky.

## Target structure

Recommended structure:

```text
src/views/timeline/
  TimelineView.ts
  timelineViewTypes.ts
  timelineViewState.ts
  composer/
    composerTypes.ts
    composerDraft.ts
    composerAttachments.ts
    composerRecording.ts
    renderComposerTags.ts
    renderPendingAttachments.ts
    renderComposerAttachmentActions.ts
  render/
    renderTimelineHeader.ts
    renderTimelineToolbar.ts
    renderTimelineList.ts
    renderTimelineEntry.ts
    renderTimelineEntryAttachments.ts
  actions/
    timelineEntryActions.ts
    timelineFilterActions.ts
    timelineMenu.ts
  modals/
    EditTimelineEntryModal.ts
    ConfirmTimelineActionModal.ts
  utils/
    timelineDates.ts
    timelineGrouping.ts
```

Notes:

- `src/views/timeline/` is the primary home for this refactor.
- Shared composer modules live under `src/views/timeline/composer/`.
- `src/quick-check-in/QuickCheckInModal.ts` should import and use shared modules from `src/views/timeline/composer/`.
- This keeps the code concentrated in one area instead of introducing another top-level shared folder.

## Architectural rules

- `TimelineView.ts` should remain an `ItemView` orchestrator, not a storage or modal utility dump.
- Render modules should receive state and callbacks, not a full view instance when avoidable.
- Shared composer modules must not depend on `TimelineView`.
- Shared composer modules should not directly call `timelineRepository`; they should expose state transforms and UI helpers.
- Timeline-specific submit behavior can stay in the view or an action module, but draft handling must be shared.
- New modules should stay focused and preferably below 200 lines where practical.
- `QuickCheckInModal` is a consumer of timeline shared modules, not the owner of them.

## Phase 0: Define boundaries

Objective:

- Freeze the intended module boundaries before moving code.

Tasks:

- Identify everything in `TimelineView.ts` that belongs to one of these buckets:
  - timeline shell and lifecycle
  - filters and toolbar
  - list rendering
  - entry actions and menu
  - inline composer
  - shared composer behavior
  - modal utilities
  - pure helpers
- Mark any dead or weakly owned code.
- Confirm that `handleOpenSelectedSource()` is either removed or wired into the UI.

Deliverable:

- A short checklist of methods mapped to destination files.

Exit criteria:

- No method remains "unassigned".

## Phase 1: Extract low-risk modules

Objective:

- Reduce file size without changing behavior.

Tasks:

- Move `EditEntryModal` into `src/views/timeline/modals/EditTimelineEntryModal.ts`.
- Move `ConfirmActionModal` and `confirmAction()` into `src/views/timeline/modals/ConfirmTimelineActionModal.ts`.
- Move pure helpers into dedicated utility files:
  - `currentTimeForComposer`
  - `shiftDate`
  - `describeDatePreset`
  - `formatDisplayDate`
  - `formatDayHeader`
  - `groupEntriesByDate`
  - `getDotClass`
  - `getErrorMessage`
- Keep behavior unchanged.

Deliverable:

- `TimelineView.ts` no longer contains modal classes or generic helper functions.

Exit criteria:

- Build passes.
- No runtime behavior changes expected.

## Phase 2: Build shared composer foundation

Objective:

- Create the reusable modules that both timeline composer and `QuickCheckInModal` will use.

Tasks:

- Introduce shared composer types under `src/views/timeline/composer/`:
  - draft state
  - attachment action callbacks
  - recording state
- Extract shared draft logic:
  - parse current tags
  - commit tag draft
  - remove tag
  - detect empty draft
  - clear draft
- Extract shared attachment logic:
  - add pending files
  - paste image handling
  - release preview URLs
  - remove pending attachment
- Extract shared recording logic:
  - start recording
  - stop recording
  - finish recording
- Extract shared UI renderers:
  - pending attachment section
  - tag chips and tag input
  - attachment action buttons and hidden file inputs

Deliverable:

- Shared composer modules exist under `src/views/timeline/composer/` and can be used by both flows.

Exit criteria:

- No tag/attachment/audio behavior is duplicated between `TimelineView` and `QuickCheckInModal`.

## Phase 3: Migrate `QuickCheckInModal` to shared composer modules

Objective:

- Make the modal the first concrete consumer of shared composer code.

Tasks:

- Replace local tag rendering with shared tag UI renderer from `src/views/timeline/composer/`.
- Replace local pending attachment rendering with shared attachment renderer from `src/views/timeline/composer/`.
- Replace local file picker and recording controls with shared attachment action renderer from `src/views/timeline/composer/`.
- Replace local draft helper methods with shared draft helpers from `src/views/timeline/composer/`.
- Keep modal-only behavior local:
  - modal title
  - focus management
  - submit shortcut
  - modal submit persistence

Deliverable:

- `QuickCheckInModal.ts` becomes thinner and stops owning duplicated composer internals.

Exit criteria:

- Modal behavior remains unchanged from the user perspective.
- Shared composer code proves stable enough for timeline use.

## Phase 4: Extract timeline list rendering

Objective:

- Remove presentation-heavy code from `TimelineView.ts`.

Tasks:

- Move day grouping render into `renderTimelineList.ts`.
- Move single entry render into `renderTimelineEntry.ts`.
- Move image/audio attachment rendering into `renderTimelineEntryAttachments.ts`.
- Keep timeline item menu invocation as a callback.

Deliverable:

- `TimelineView.ts` stops directly building most list DOM.

Exit criteria:

- Timeline list output remains visually and functionally identical.

## Phase 5: Extract toolbar and filter rendering

Objective:

- Isolate filter/search UI from the main view class.

Tasks:

- Move toolbar rendering into `renderTimelineToolbar.ts`.
- Move filter state mutation helpers into `timelineFilterActions.ts` or `timelineViewState.ts`.
- Keep debounce scheduling in a dedicated action/helper rather than inline event code.

Deliverable:

- Toolbar module owns DOM creation and emits high-level callbacks.

Exit criteria:

- Search and filter interactions keep the same behavior.

## Phase 6: Migrate inline timeline composer to shared composer modules

Objective:

- Make the inline composer use the same UI and draft internals as `QuickCheckInModal`.

Tasks:

- Replace local composer tags UI with shared tag renderer from `src/views/timeline/composer/`.
- Replace local pending attachment UI with shared attachment renderer from `src/views/timeline/composer/`.
- Replace local attachment controls with shared controls from `src/views/timeline/composer/`.
- Replace local draft and recording helpers with shared modules from `src/views/timeline/composer/`.
- Keep timeline-only behavior local:
  - inline expand/collapse
  - discard draft confirmation
  - timeline-specific target date selection
  - inline submit callback

Deliverable:

- Timeline composer and `QuickCheckInModal` now share implementation, not just CSS classes.

Exit criteria:

- There is one canonical implementation for shared composer UI/behavior.

## Phase 7: Extract entry actions and menu

Objective:

- Remove repository/index side-effects from the view body.

Tasks:

- Move duplicate/delete/edit/open-source orchestration into `timelineEntryActions.ts`.
- Move menu creation into `timelineMenu.ts`.
- Keep `TimelineView` responsible only for wiring callbacks into renderers.

Deliverable:

- Entry action logic is isolated and easier to test.

Exit criteria:

- `TimelineView.ts` no longer directly contains CRUD orchestration for entries.

## Phase 8: Final cleanup

Objective:

- Normalize API shape and remove leftovers.

Tasks:

- Remove dead methods and unused imports.
- Normalize copy for one language strategy.
- Check file naming consistency.
- Ensure no new module is becoming the next oversized file.
- Verify `main.ts` and view registration imports still stay simple.

Deliverable:

- Clean final structure with no duplicated composer internals.

Exit criteria:

- `TimelineView.ts` is reduced to view lifecycle plus high-level orchestration.
- Shared composer modules are used by both timeline and modal flows.

## Suggested execution order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8

Reasoning:

- Modal and pure helper extraction is the safest first cut.
- Shared composer foundation should be built before moving the timeline composer.
- `QuickCheckInModal` should migrate before the timeline composer so the shared layer is proven on a smaller surface area.

## Risks

- Over-abstracting the shared composer too early can create awkward APIs.
- Passing a full class instance into every renderer will preserve coupling and defeat the refactor.
- If timeline-specific date handling leaks into shared modules, the shared composer will become view-specific again.
- If submit logic is moved into shared code, it may accidentally couple modal and timeline workflows that should remain different.

## Definition of done

The refactor is done when all of the following are true:

- `TimelineView.ts` is small and readable.
- `QuickCheckInModal` and timeline inline composer use the same shared UI modules and draft logic from `src/views/timeline/composer/`.
- Modal classes are outside `TimelineView.ts`.
- Timeline renderers are split by responsibility.
- Entry actions are isolated from rendering code.
- No meaningful composer logic is duplicated across files.
