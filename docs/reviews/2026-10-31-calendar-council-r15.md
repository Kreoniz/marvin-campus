# Calendar R15 — implementation and two-round review

R15 improves source ordering, compact schedule controls, resource spotlighting
and current-semester VUC documents. The baseline was
`2c734858e4c1a82a256f268671251080fe6071eb`. Round 1 reviewed
`76eb142e51b87c55410df3ed35cab854daf2c902`; round 2 reviewed
`5fbebbf423ff71aff15b08a3b2c33c37edbe88d8`. The final application revision is
`a922adf33754dde8cfe783ba4eea885285d937cf`, which includes a small correction
after round 2. This record does not claim deployment.

## Requirements and delivered behavior

- **A — resource spotlight:** selected lecturer and room cards, List entries,
  chips and menu actions use dark repeating kind motifs on categorical fill.
  Selected surfaces have no black inset stripe; text halos and ordinary resource
  identity remain. Both themes retain the same grammar.
- **B — source menu actions:** one menu exposes “Снять все выделения” and
  “Убрать расписание”, alongside subgroup selection, spotlight and management.
  Clear includes hidden kinds. Removal retains typed identities and moves focus
  to a surviving source, or opens search after the last removal. Drag remains
  atomic, with keyboard and touch alternatives.
- **C — layer controls:** recognizable building and calendar/clock icons match
  the calendar legend; labels remain concise.
- **D — initial date:** an implicit workspace opening after every selected
  lesson has ended chooses the next calendar day. The decision uses the opening
  instant in UTC+6 and waits for complete usable settled data, including remote
  lessons and room overlays. Empty aggregate data cannot authorize advancement.
  Explicit links, intentional navigation, Today and history retain their dates.
  Crossing midnight cancels a pending decision; no active-page timer advances
  the view. The existing implicit Sunday-to-Monday default remains.
- **E — VUC exclusion:** the heavy pink chip frame is removed. Accessible
  descriptions, menu status and calculation details still explain unavailable
  or ambiguous coverage.
- **F — VUC documents:** the default footer has one “Скачать” per canonical
  document, authorized by the usable active catalogue. Contextual notes retain
  source period, warnings, unparsed cells and original lesson intervals. The
  operator updater freezes explicit PDF/DOCX inputs and publishes a new dataset
  with exact originals. It does not infer a semester, merge archives or switch
  running services. Both configured paths must be switched together; see
  [the workflow](../vuc.md).
- **G — header:** the decorative cluster sits beside left branding/navigation
  in the existing row; compact layouts retain functional controls.
- **Additional steering — ordered tracks:** Week reserves stable selected-order
  source bands within each date, omitting confirmed-empty bands while naming
  unavailable sources explicitly. Day retains selected visible sources. The
  first selected visible participating source owns a shared event's full card;
  other bands contain actionable references. References never add domain events
  or calculation inputs. Widths are 160/144/128/112 px for up to 3/6/12/30 bands,
  with collision-safe internal sublanes and width-aware navigation anchors.
  Room cards replace duplicate room text with compact source-derived audience;
  full audience remains in details, without fabricated IDs or links.

## Actual independent scores

Exactly two rounds ran, each with two Sol and two Terra reviewers at xhigh.
These are the supplied assessments of the frozen revisions, not consensus,
averages, or scores reassessed after the final correction.

| Reviewer lens              | Round 1 | Round 2 |
| -------------------------- | ------: | ------: |
| Sol interaction/navigation |  9.5/10 |  9.3/10 |
| Sol correctness/data       |  9.5/10 |  9.5/10 |
| Terra visual/accessibility |    8/10 |  9.2/10 |
| Terra product              |  8.5/10 |    9/10 |

## Deduplicated dispositions

1. **R1: forced-color spotlight visibility — accepted.** System color
   replacement erased lesson spotlight fill. A double inset system-color marker
   was added to selected calendar cards and List entries, separately from outer
   focus/popup outlines and remote dashed borders.
2. **R1: stale layout documentation — accepted.** Multiple reports identified
   fixed-width, academic-first ownership descriptions. Existing product and
   architecture paragraphs now describe adaptive ordered bands, visible-owner
   promotion, reference semantics and unknown-versus-empty status.
3. **R1/R2: compactness tradeoffs — retained.** At 112 px, long titles and
   membership labels truncate sooner; complete details remain reachable.
   Compact unavailable-original text is less directly associated with a document
   when several are unavailable. Neither established an incorrect download or
   justified expanding the requested compact interface.
4. **R1: successful PDF parsing evidence gap — closed separately.** The
   documented isolated tool command prepared a validation-only historical PDF
   set: six schedules and 191 lessons matching the retained set, with exact
   original hashes. It was not activated. Application dependencies were unchanged.
5. **R2: short-card forced-color readability — accepted.** Sol interaction
   reproduced the double frame crossing the title of an 18 px card. Other
   reviewers' passing normal/tall-card checks did not disprove this defect.
   The post-R2 revision uses a side-only double marker below 36 px and reserves
   7 px at the text start. It preserves time geometry, focus/popup outlines and
   remote dashes. This is an implementation correction and regression check,
   not a third review round; scores above remain unchanged.

The two Terra R2 reviews each launched two sequential, nonoverlapping browsers
instead of one browser for their entire review. Their reports disclose this
method deviation; the browsers were closed. It is not presented as compliance
with the single-launch instruction.

## Validation and limits

Final existing checks passed: TypeScript, Oxlint with zero warnings, **133
frontend tests**, **9 Python importer/updater tests**, the production build and
formatting of the changed supported files. Go source was unchanged; no redundant
backend suite was run for this delivery. The existing main JavaScript chunk
warning remains: 728.44 kB, 234.14 kB gzip.

Fresh final-revision app evidence covers actual theme-toggle rendering, selected
lecturer/room motifs, menu actions, layer icons, header, Week reorder, compact
room audience, mobile Day and current VUC status/download/raw notes. Controlled
fixtures distinguish neutral density and short-card cases from actual source
content. Final short-card checks measure marker/title bounds, retain independent
focus and remote edges, and exercise Enter/Escape details. Earlier frozen-revision
evidence additionally covers initial-date boundaries, delayed cohorts/history,
unknown versus empty data, hidden-owner promotion and source/date anchoring.

The active local VUC set contains six current DOCX schedules and 476 lessons;
the original dates and ambiguities remain. A browser download matched the exact
77,053-byte current document; the historical PDF endpoint returned 404.
Ambiguous or absent document coverage is still excluded from calculation.

Browser evidence is Chromium desktop/touch/forced-colors emulation, not physical
hardware, a screen-reader audit, alternate OS palettes, Firefox/Safari, production
verification or exhaustive PWA lifecycle testing. Import validation does not
certify arbitrary future PDF/DOCX layouts, every PDF cell, competing publication
or power-loss durability. No deployment, service restart or live-data change was
performed for final delivery evidence. Private originals, identities, screenshots,
logs and operator records remain outside Git.
