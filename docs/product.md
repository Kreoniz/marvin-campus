# Product rules

The app's public name is «Кампус». It compares public university schedules.
Presence means the interval
between a group's first and last in-person lessons, including breaks; it does
not establish a person's actual location. Free windows subtract all lessons,
including online lessons, from every selected group's shared presence.
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

Desktop uses a week grid and a detailed selected day. The detail can switch
between a timeline and a chronological list. Mobile starts with a compact day
grid; three 44×44 px header icons switch directly between Day, Week and Day list without another toolbar row.
The list replaces the grid, preserves exact intervals and full subjects, shows
known shared lessons once and expands parallel bundles into separate lessons.
An interval heading appears once for lessons with exactly equal start and end
times; equal starts with different ends remain separate sections. Entries use
dividers rather than separate card frames. Teacher names are visible beside the
other metadata and wrap naturally; there is no repeated teacher disclosure or
left-hand time column.
Its summary and freshness retain the same data semantics as the grid.
Group chips use two non-overlapping targets: the main two-line label opens
subgroups and a separate 44×44 px focus icon toggles only that group's spotlight.
Active focus uses a lighter categorical icon surface and a check mark instead
of an underline; the whole chip keeps its categorical color without a heavy frame.
The whole-group option and unresolved selections retain their labels. A single
group uses the whole chip for subgroup selection. Scope captions never ellipsize;
the whole-group caption is “Все” and short subgroup numbers retain a separate
chevron. One schedule-search icon opens a dialog combining search and the complete
selection with move-up/down and removal; desktop drag handles and Alt+arrows
remain available. Removing the last group keeps the search open and focuses its
input. Group search starts empty, without suggested groups.
Its reserved results area keeps the search field still while typing and loading.
Adding a group keeps the same search dialog, query and results open, including
the first addition from the welcome screen. Added rows are marked “Уже добавлена”
and cannot be added twice. Focus returns to the search input; Escape, outside
click or Close dismisses the dialog. The 30-group cap disables further additions
and explains how to make space without closing the dialog.
The mobile calendar spans the available screen width, while controls and card
content keep their internal spacing. The compact header keeps group names and
subgroup scope visible. Display settings hold layer visibility, theme, help and
clearing all spotlights; common view and group actions are directly available.
The compact layout also covers short landscape viewports up to 1000 pixels wide.
No comparison-mode row precedes the mobile calendar. A partial-data notice
continues to name included and excluded selections above the known lessons. Mobile day and week grids
expand to their full time range and use page scrolling vertically; week and
overlap lanes can still scroll horizontally. Only the day selector shows the date
in mobile day view. A single selected group shows its timetable without a repeated
invitation to add another group.
Custom scrollbars fade out fully when idle, preserving their reserved space.
The compact group strip uses an overlay thumb without a reserved lower row.
Scrolling, hover, dragging and visible keyboard focus reveal them; focus left by
a click or tap does not. Forced-color mode keeps scrollbars visible.
Today stays beside the date and remains available in the date picker.
Compact hour labels omit `:00`; full times remain available to assistive technology
and in lesson details. The time scale and event durations stay proportional.
Online lessons use a contrasting two-pixel dashed outline.
Both comparison layers are enabled by default and require at least two usable
groups: shared presence is an amber rail, and shared free windows are green
bands. Their independent visibility is transient presentation state in Display
settings; it does not alter comparison inputs or links. Compact summaries show
both results. The existing URL mode remains readable and selects summary order
for old links; it no longer limits the visible calendar to one layer.
Sunday defaults to next Monday,
unless a date was explicitly selected. Group colors remain stable when reordered.
Ordinary cards use the group color. In both calendar views, each shared event appears once with a common
subject and room, and colored participant sections in stable group-ID order.
Group names and subgroup numbers occupy two lines. More than three participants
show two and a count, with the full list in the popover. Spotlighted participants
take priority for those two places; otherwise use the first two in group-ID order.
The displayed pair remains sorted by group ID. When hidden participants include
saved data, the count retains a clock marker and its saved-data description.
Lesson-kind badges sit beside the room. Day and week lanes belong to overlapping events,
so empty groups reserve no space. Distinct concurrent events use separate lanes;
a shared event keeps all its participants in one card. Missing group data remains
explicit in the comparison result and data status; known lessons never establish
an empty schedule for an unavailable group. Reordering selected groups keeps
event placement and colors stable.
Teacher and auditorium schedules open from linked lesson metadata or the
search tabs inside the single “Расписания” dialog. They use an independent
selected-day agenda with week/date navigation, and closing restores focus to
the original lesson or search control. Opening a resource preserves selected
groups, date and comparison URL. Only canonical source IDs create links;
missing IDs remain plain text, and virtual rooms have no physical-room link.
Teacher/room numeric identities are scoped by kind. Their events show actual
group/stream audience, rather than a resource masquerading as a student group.
The lecturer's own canonical reference is omitted from repeated lesson metadata;
co-teachers and unstructured teacher text remain visible. Short viewports scroll
the whole inspector so fixed controls cannot squeeze the agenda to a single line.
No presence/free comparison is applied to these views. Empty schedules, missing
data and usable saved snapshots remain distinct. Cold opening needs a network
response; persistent offline resource storage and shareable resource routes are
deferred. Search results become marked saved at their deadline and disappear
after the 24-hour grace period, with an explicit retry action.

Mounted lesson entries fade in over 180 ms without moving their geometry.
Saved/fresh, focus and parallel-stripe colors interpolate over 300 ms; data
status and clock markers update immediately. Revalidation of an existing entry
does not replay its entrance. Reduced-motion preferences disable these effects.

Each group spotlight can be toggled independently; several groups can be active.
A shared event matches if any participant is selected, retaining its normal
subject and metadata. Each participant sector or list badge is emphasized
independently: selected participants retain their categorical fill and gain a
check; other participants are muted even within a matching shared event.
Other events keep their group hues with a quieter fill and readable text;
they remain interactive and retain their positions. Remote dashed
outlines, parallel-event stripes and saved-data clock markers remain explicit.
Opening lesson details retains the full participant colors and information.
Spotlight survives date, subgroup and view changes. Removing a group drops only
that group from the spotlight set. Fewer than two remaining groups clears the
set. Display settings and day detail can clear all spotlights together.
Spotlight and day format are transient presentation state, not comparison URL
parameters or changes to the presence/free calculation.

Each vertical calendar day has its own minimum width, derived from that day's
rendered concurrency. Navigation measures actual date columns and preserves
the visible date/offset across geometry changes. Lane allocation reserves both
the true interval and the minimum painted height, so short events cannot collide.
Ordinary vertical cards remain capped at 160 pixels; a card may expand right
through contiguous lanes free throughout its interval, capped at 320 pixels.
The six-pixel gap and the 166-pixel lane pitch cap remain. Empty dates keep their
columns, and unavailable data is not treated as an empty day.
An isolated lesson does not stretch across the day.
Their horizontal pitch is capped too, keeping a six-pixel gap instead of
spreading narrow cards across a wide day. Pressing a card highlights it without
moving it on the time scale.
Their height still represents duration, including long military classes.
Simultaneous distinct lessons of one group use stripes. The selected-day timeline uses event rows and
reserves the week's peak row count to keep its panel height stable.
Long events in the horizontal day timeline keep their temporal length, but their
participant labels stay compact; the time range is available in the popover.
Presence uses a thin amber rail along the time axis and free windows use green
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
