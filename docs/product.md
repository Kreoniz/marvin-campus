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

Desktop uses a week grid and a detailed selected day. Mobile starts with a
compact day grid; its summary and freshness follow the grid. Mobile group chips open subgroup,
order and removal controls. Group search starts empty, without suggested groups.
Its reserved results area keeps the search field still while typing and loading.
Adding a group keeps the same search dialog, query and results open, including
the first addition from the welcome screen. Added rows are marked “Уже добавлена”
and cannot be added twice. Focus returns to the search input; Escape, outside
click or Close dismisses the dialog. The 30-group cap disables further additions
and explains how to make space without closing the dialog.
The mobile calendar spans the available screen width, while controls and card
content keep their internal spacing. Day/week views use a two-button toggle.
The compact layout also covers short landscape viewports up to 1000 pixels wide.
Comparison modes stay above the mobile calendar. A partial-data notice names
included and excluded selections beside those controls. Mobile day and week grids
expand to their full time range and use page scrolling vertically; week and
overlap lanes can still scroll horizontally. Only the day selector shows the date
in mobile day view. A single selected group shows its timetable without a repeated
invitation to add another group.
Custom scrollbars fade out fully when idle, preserving their reserved space.
Scrolling, hover, dragging and visible keyboard focus reveal them; focus left by
a click or tap does not. Forced-color mode keeps scrollbars visible.
On screens up to 360 pixels wide, Today remains available in the date picker.
Compact hour labels omit `:00`; full times remain available to assistive technology
and in lesson details. The time scale and event durations stay proportional.
Online lessons use a contrasting two-pixel dashed outline.
Comparison modes appear after a second group is added: “В вузе” and “Без занятий”.
Sunday defaults to next Monday,
unless a date was explicitly selected. Group colors remain stable when reordered.
Ordinary cards use the group color. In both calendar views, each shared event appears once with a common
subject and room, and colored participant sections in stable group-ID order.
Group names and subgroup numbers occupy two lines; more than three participants
show the first two and a count, with the full list in the popover. Lesson-kind
badges sit beside the room. Day and week lanes belong to overlapping events,
so empty groups reserve no space. Distinct concurrent events use separate lanes;
a shared event keeps all its participants in one card. Missing group data remains
explicit in the comparison result and data status; known lessons never establish
an empty schedule for an unavailable group. Reordering selected groups keeps
event placement and colors stable.
Cards in the vertical calendar are at most 160 pixels wide in
both day and week views; an isolated lesson does not stretch across the day.
Their horizontal pitch is capped too, keeping a six-pixel gap instead of
spreading narrow cards across a wide day. Pressing a card highlights it without
moving it on the time scale.
Their height still represents duration, including long military classes.
Simultaneous distinct lessons of one group use stripes. The selected-day timeline uses event rows and
reserves the week's peak row count to keep its panel height stable.
Long events in the horizontal day timeline keep their temporal length, but their
participant labels stay compact; the time range is available in the popover.
Presence uses amber highlights and free windows use green, including their
legends. Saved ranges retain the mode color with a weaker fill and dashed edge
in both views.

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
