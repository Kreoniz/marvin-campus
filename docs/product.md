# Product rules

The app's public name is «Кампус». It compares public university schedules.
Presence means the interval
between a comparison participant's first and last in-person lessons, including breaks; it does
not establish a person's actual location. Free windows subtract all lessons,
including online lessons, from the participants' shared presence. Groups,
lecturers and covered VUC platoons can participate. A lecturer's result describes
teaching duties only. Rooms are occupancy overlays, not comparison participants;
their gaps do not establish physical availability or opening hours.
When a complete comparison has no shared presence, its summary explains whether
a selected group has no onsite lessons or the groups' presence does not overlap.
A group without onsite lessons is not silently excluded from the comparison.
Unavailable schedules and selections whose subgroup cannot be resolved are
marked in the group strip and excluded from calculations. If at least two usable
selections remain, show a partial result naming both the included subset and
excluded selections. With zero or one usable selection, show no shared result.
Keep the original selection and URL, and keep known lessons visible. A successful
empty week and usable saved data remain valid inputs; neither is excluded simply
for being empty or saved.

Shared lessons require matching source identity and event details. Matching
subject text and time alone do not establish a shared lesson. Unavailable data
must never be interpreted as an empty schedule.

The whole group is the default selection. Selecting a subgroup includes that
subgroup and group/stream lessons. The choice persists across weeks, including
weeks without subgroup data. Public subgroup numbers appear beside group names.
Lesson labels describe source membership, independently of that filter. A
whole-group lesson keeps the base group name when a subgroup is selected; shared
events retain each participant's own subgroup membership.

Desktop starts with a compact week grid and a secondary selected-day detail;
mobile starts with source-oriented Day. Three labelled 44×44 px header controls
switch the primary surface between Day, Week and Day list at every viewport.
The chosen view survives resizing and selection changes. The secondary detail
below desktop Week is always a timeline. Theme, help and display settings are one-click actions in that
same row; below 420 px the brand keeps its avatar and accessible name.
The list replaces the grid, preserves exact intervals and full subjects, shows
known shared lessons once and expands parallel bundles into separate lessons.
An interval heading appears once for lessons with exactly equal start and end
times; equal starts with different ends remain separate sections. Entries use
dividers rather than separate card frames. Teacher names are visible beside the
other metadata and wrap naturally; there is no repeated teacher disclosure or
left-hand time column.
Its summary and freshness retain the same data semantics as the grid.
Compact 44px chips open a schedule menu containing subgroup selection,
an independently pressed spotlight action and management. Resource menus retain
spotlight and management. Active spotlights use a categorical selected fill;
chips and lesson membership have no decorative spotlight checkmarks.
The whole-group option and unresolved selections retain their labels.
Scope captions never ellipsize;
the whole-group caption is “Все” and short subgroup numbers retain a separate
chevron. One schedule-search icon opens a dialog combining search and the complete
selection of all schedule kinds with move-up/down and removal. A nonempty query
gives the body to results; “Управлять выбранными” opens management in the same
dialog, and Back restores the query and result scroll. Empty search shows quiet
management rows. The whole dialog can scroll at very short viewport heights.
Desktop management drag commits its final insertion order once, so one Back/Forward
restores the pre/post-drop order. Cancellation leaves history unchanged.
Move-up/down buttons support touch; Alt+arrows remain available.
The strip also retains drag without a visible grip and suppresses menu opening after a drag.
Removing the last group keeps the search open and focuses its
input. The unified search starts empty, without suggestions, and queries the
official group/lecturer/room categories plus the configured local VUC catalogue.
Results carry visible kind labels. A failed category has its own retry while
successful categories remain usable.
Its reserved results area keeps the search field still while typing and loading.
Adding a schedule keeps the same search dialog, query and results open, including
the first addition from the welcome screen. Added rows are marked “Уже добавлено”
and cannot be added twice. Focus returns to the search input; Escape, outside
click or Close dismisses the dialog. The 30-schedule cap disables further additions
and explains how to make space without closing the dialog.
The mobile calendar spans the available screen width, while controls and card
content keep their internal spacing. The compact header keeps group names and
subgroup scope visible. Display settings hold layer and kind visibility and
clearing all spotlights. Kind visibility changes cards only, not selection or
calculation; hidden selections remain marked and can be restored directly.
The compact layout also covers short landscape viewports up to 1000 pixels wide.
The mobile calendar follows the date controls immediately. Its brief result, partial count, freshness and a deduplicated VUC document download follow the timetable. The full included/excluded roster and calculation qualifications live in a closed-by-default disclosure. Desktop result cards also show only the result and a short partial count by default; they grow naturally when details are expanded, without an internal scrollbar. Day, Week and the secondary timeline at every viewport
expand to their full time range/row count and use page scrolling vertically; week and
overlap lanes can still scroll horizontally. Only the day selector shows the date
in mobile day view. A single selected group shows its timetable without a repeated
invitation to add another group.
Custom scrollbars fade out fully when idle, preserving their reserved space.
The selected-schedule strip reserves an eight-pixel scrollbar track below its 44-pixel chips. Soft edge fades appear only where more selections can be scrolled into view. Exclusion outlines stay inside the 44-pixel chip bounds. The visible thumb is four pixels thick and never covers the schedule-menu control. Drag previews reuse the same chip grammar, names and height; their cloned controls are inert.
Scrolling, hover, dragging and visible keyboard focus reveal them; focus left by
a click or tap does not. Forced-color mode keeps scrollbars visible.
Today stays beside the date, including desktop Week, and remains available in
the date picker. Repeated Today and `t` reveal the selected column without
adding duplicate date history. Cold/date navigation reveals the selected day
once the first usable cohort geometry appears; deliberate scrolling during
loading and later refresh anchors take precedence. The mobile selected date
retains an explicit system-color marker in forced colors, independently of focus.
Compact hour labels omit `:00`; full times remain available to assistive technology
and in lesson details. The time scale and event durations stay proportional.
Online lessons use a contrasting two-pixel dashed outline.
Both comparison layers are enabled by default and require at least two usable
participants: shared presence is an amber bracket with a light wash, and shared free windows are green
bands. Their independent visibility is transient presentation state in Display
settings; it does not alter comparison inputs or links. Compact summaries show
both results. The existing URL mode remains readable and selects summary order
for old links; it no longer limits the visible calendar to one layer.
Sunday defaults to next Monday,
unless a date was explicitly selected. Group colors remain stable when reordered.
Ordinary group cards use the group color. Lecturer and auditorium cards use a
lightly tinted neutral surface, a categorical inset edge and distinct cap/door glyphs
repeated diagonally. Text strokes and an opaque outline around the text keep labels and metadata links
legible over the stronger motif, including List. Resource selection chips use the same grammar;
spotlight uses categorical fill with dark motifs and no inset edge. In forced
colors, a double inset marker identifies spotlighted cards and List entries
independently of the outer focus/popup outline and remote dashed border.
Short calendar cards reserve space for a side-only marker so it cannot cross text.
lecturer names retain their full labels without ellipsis and redundant role captions are omitted. Visible kind text/icons also identify them. Parallel bundles
retain their stripe meaning and omit the decorative resource motif. Remote dashes,
saved clocks and individual spotlight markers remain independent.

Day assigns each visible selected source a labelled stable band in user order,
with a 16-pixel gap and an extra 16 pixels at kind transitions. Card width follows
the visible source count: 160 pixels for up to three, 144 for four to six, 128
for seven to twelve, and 112 for thirteen to thirty. Distinct overlapping events
reserve sublanes within their source band, separated by six pixels; cards never
stretch into spare viewport space. A design-system Select moves to the requested band and focuses its
first lesson or empty/status band without changing selection or calculation.
It includes hidden sources with an explicit notice rather than silently unhiding.
All 30 schedules remain available; there is no automatic mode change or collapse.
Headers wrap full source names and grow only when their content needs more
height. Headers and the time rail stay visible while navigating the source canvas.
Source anchoring clamps offsets when sublanes shrink and uses a surviving
neighbor when a source disappears. Keyboard focus clears the actual sticky rail
in both Day and Week.

One full shared card belongs to the first selected visible participating source,
including a lecturer or room moved ahead of its groups.
Other member bands carry an explicit actionable reference to the same complete
details, at the original time, never spanning unrelated bands. Hidden owner kinds
promote the next visible member. References never enter counts or calculations.
Week shows one full card per proven shared event, plus these labelled references;
List shows the event once. Shared cards follow the selected-source order in every view and in details. Shared vertical cards use full-width categorical member sectors beneath the heading. Capacity follows measured width and available height, with readable leading names and a remainder for dense membership. Horizontal rows keep one fitting row regardless of duration. Full membership remains in details; saved collapsed members retain their clock marker. Spotlight uses fill rather than decorative checks. Presentation ordering does not alter canonical event merging or geometry.
Long vertical event text starts at the top. Short free intervals keep true height;
inline text appears only when it fits, and exact ranges are visible in the day
summary outside horizontal scrolling. Long calculation membership is collapsible.
Missing data remains explicit and never establishes an empty schedule.
Teacher and auditorium schedules add to the same calendar from linked lesson
metadata or unified search; there is no separate resource inspector. Only
canonical source IDs create links; unknown IDs remain plain text and virtual
rooms have no physical-room link. Identities include source and kind, so equal
numeric IDs can coexist. Their events retain actual group/stream audience,
teacher details and visible kind distinctions. Proven shared events combine
missing metadata deterministically and retain conflicts explicitly.
Large teacher rosters may expand after three names; one teacher stays visible.
Mixed comparisons can be copied and restored; old group links retain their
meaning. Persistent offline resource storage is deferred, so cold offline
resource requests fail explicitly. Search results retain the 24-hour grace
period and explicit retry rather than becoming indefinite fresh data.

VUC is a local document import, not a live website feed. A selectable platoon
retains its document period, exact original dates, source cells and warnings.
Coverage and unresolved dates belong to each platoon independently. Unknown or
ambiguous days never establish an empty timetable or free windows. Ambiguous
cells remain visible as source text outside the timed grid. Merged cells keep
their original time headings; continuous envelopes crossing breaks are marked
unresolved for calculation. The main catalogue is the explicitly configured current-semester input set; old
documents are kept privately and never selected by filesystem timestamps. An
operator command prepares a new complete dataset and exact originals from explicit
inputs, leaving the old set intact; switching both paths requires an API restart.
Archived data is never shifted into the current year. A date action opens a nearby covered date explicitly when other schedules
are already selected. Source documents/imported data remain outside Git.

Mounted live-source lesson entries fade in over 180 ms without moving their geometry.
Available VUC document cards remain static; an unknown lesson kind has no question-mark badge.
Saved/fresh, focus and parallel-stripe colors interpolate over 300 ms; data
status and clock markers update immediately. Revalidation of an existing entry
does not replay its entrance. Reduced-motion preferences disable these effects.
Cold/new-week requests reveal a coherent cohort when all settle, with a two-second
initial bound for slow sources. Late or same-week refresh results coalesce for
up to 1.2 seconds, settling immediately once requests finish. Valid published
same-week inputs remain visible when another schedule is added. Other-week
lessons are never retained beneath new dates. Publication cannot extend snapshot
expiry; errors and hard expiry remain explicit while an update is held.

Each group spotlight can be toggled independently; several groups can be active.
A shared event matches if any participant is selected, retaining its normal
subject and metadata. Each participant sector or list badge is emphasized
independently: selected participants retain their categorical fill;
other participants are muted even within a matching shared event.
Other events keep their group hues with a quieter fill and readable text;
they remain interactive and retain their positions. Remote dashed
outlines, parallel-event stripes and saved-data clock markers remain explicit.
Opening lesson details retains the full participant colors and information.
Spotlight survives date, subgroup and view changes. Removing a group drops only
that group from the spotlight set. Fewer than two remaining groups clears the
set. Display settings and day detail can clear all spotlights together.
Spotlight and day format are transient presentation state, not comparison URL
parameters or changes to the presence/free calculation.

Each compact Week date has its own minimum width, derived from that day's
active source bands in selected order. A source keeps its band throughout that
date; reordering the selection moves the bands. Confirmed-empty bands are
omitted, while unknown, failed, expired or uncovered sources remain explicitly
named in the day's unavailable status and calculation details. Known lessons
remain visible even when their source is excluded from calculation. Empty dates
retain a column. Each date uses the same 160/144/128/112 card-width tiers as Day,
based on its active band count rather than the entire selected set.
Navigation measures actual date columns and preserves
the visible date/offset across geometry changes. Lane allocation reserves both
the true interval and the minimum painted height, so short events cannot collide.
Each source's internal overlap sublanes use a six-pixel gap; only dates with
more active sources or overlaps grow. Unavailable data is never an empty day.
An isolated lesson does not stretch across the day.
Their horizontal pitch is capped too, keeping a six-pixel gap instead of
spreading narrow cards across a wide day. Pressing a card highlights it without
moving it on the time scale.
Their height still represents duration, including long military classes.
Simultaneous distinct lessons of one group use stripes. The selected-day timeline uses event rows and
reserves the week's peak row count to keep its panel height stable.
Long events in the horizontal day timeline keep their temporal length, but their
participant labels stay compact; the time range is available in the popover.
Presence uses a five-pixel amber bracket and a light wash; free windows use green
bands, including separate legends. Both layers can coexist in vertical calendars
and the selected-day timeline. Saved ranges retain their color with dashed edges
and a weaker free fill in both views. All layers use the same usable comparison
subset and are independent of the spotlight selection.

Subgroups use their group's unchanged base color and retain their visible public
numbers. There is no subgroup shade setting. The side-index concept (03) is
preferred for future exploration but remains a mockup, with implementation deferred.
Saved-data muting is independent of subgroup membership and remains enabled.

Time board is retained as a future UX idea, not part of the current release:
show common windows across the week and compact per-group occupancy rows, with
shared lessons listed once. Before implementation, clarify busy versus off-campus
time, exact interval boundaries, participant visibility and unavailable data.

Comparisons live in readable URLs, not on the server. Current-week source data
is cached for thirty minutes, future weeks for an hour, past weeks for a day; group
searches for a day. A successful stale snapshot is available for at most another
24 hours and retains its original check time. There is no manual source refresh.
Usable saved responses appear during reload and revalidation. A stable status row
shows freshness and opens per-group details; affected cards/participants use a
muted background and clock marker. Derived results and empty days identify saved
data too. A missing or expired snapshot never becomes an empty schedule.
The details show a common check minute only for matching fresh states/times;
individual timestamps remain available, and differing or failed states are explicit.

The installable PWA keeps a complete application build and recently opened
schedules for offline restart. It does not invent schedules for unopened groups
or extend snapshot freshness. HTTP errors and cancelled requests remain errors.
App updates are offered separately from schedule updates.
The installation icons use a dark background and a bold character outline;
the manifest launch background is also dark. The saved or system page theme
still controls the opened application.

Keyboard day selectors support Left/Right and Home/End. Page Up/Page Down change
weeks while preserving the selected weekday; week controls also support
Left/Right. Commands are scoped to navigation controls and do not intercept
typing, native selects or open dialogs. Ordinary keyboard access works at every
viewport width; the small command set adds no hotkey dependency.

Lesson hover previews use the library's pointer-safe region. A first click pins
an open preview; a second click, Escape, Close or outside press dismisses it.
Moving from the card into its popup keeps the preview available.
Compact fine-pointer previews open beside the card when a side fits; otherwise
details require a press. Touch popups may overlap tall cards to remain bounded.
Hovered, keyboard-focused and popup-owning cards retain a visible outline, including
resource cards with decorative inset shadows. Resource names use quieter 12px
selection-chip text. VUC chips show the compact source label without a shield
or repeated “взвод” caption and keep the same 44px height.

The dedicated `/vuc` page compares VUC sources only, using the same calendar,
list, scope and data-status components with a separate saved selected set. Opening an explicit VUC link is a temporary view: only a subsequent selection edit adopts that set as the saved VUC workspace. The first catalogue addition opens the existing picker and keeps choosing available. A compact VUC link shares the existing date row; the empty main welcome also links to the page.
The general calendar still accepts mixed VUC selections. Military-preparation
lesson details can preview one personally chosen VUC schedule for the same date;
this preference does not join a comparison or infer a group-to-platoon mapping.

Military-preparation cards from 240px also show the personally chosen VUC for that exact date, including tall shared references. The preview fits as many complete entries as its measured free space permits. The document status and a reserved remaining-count line cannot be pushed out by long entries. Inline topics use at most two lines and include teachers when space permits; all printed intervals wrap. The popup starts its complete-entry list closed under “Все занятия на этот день”, preserving access to every entry without repeating an open inline schedule. The closed-by-default disclosure on military entries in List opens the same exact-date personal preview. Short/horizontal cards keep the full details action. Preview data has its own freshness/retention wake-up and never enters the main calculation. Its popup uses the design-system Select with short document-year choices, with source disambiguation when needed; raw per-lesson document rows live on the dedicated page. Specific warnings and unparsed same-date cells remain available in one compact document-notes disclosure. An explicit empty personal choice remains empty even if one VUC is in the comparison. Preview and the source footer offer “Скачать” only for configured, hash-verified PDF/DOCX bytes confirmed by a usable active catalogue; absent originals are explicit. The footer deduplicates by document and has no repeated platoon or period paragraphs. Per-date calculation exclusions, warnings and unparsed source cells remain in the existing data-status disclosure; each known lesson retains its raw source row. Downloads do not require coverage of the selected date.

Where selected VUC sources share the same compact platoon name, navigation, management, membership details and calculation exclusions add document years and, if needed, an existing source description. Identical metadata falls back to the document-scoped ID. Non-colliding names stay compact; chips retain their 44px height and show the disambiguator on a secondary line. Labels never change source identity or date coverage.

The VUC page puts its calendar before results and the compact document download. Day and Week use page scrolling vertically and keep horizontal scrolling for tracks. The display starts at 09:00 by default and ends after the latest known event; actual earlier or later times remain visible. An unknown day keeps a 09:00–18:00 display range, without implying empty coverage.

A selected lecturer or room uses a full categorical fill in every view, preserving the diagonal kind pattern and readable text. Other resource cards remain neutral. Hover colors transition over 150ms unless reduced motion is requested. Amber presence brackets reserve a gutter clear of card borders and their hover/focus outlines. Date controls center their label; header action targets stay at least 44px while their gaps remain compact. The footer source link has no extra separator.

Vim shortcuts are enabled by default and can be disabled persistently in Display settings. Physical keys work with Russian layouts: h/l change day, Shift+h/l move seven days, j/k scroll, gg/Shift+g reach the calendar edges, t selects today, / opens schedule search, 1/2/3 select Day/Week/List and ? opens help. These commands ignore editable fields, composition and visible dialogs/popovers; existing scoped Arrow/Home/End/Page commands remain available.
