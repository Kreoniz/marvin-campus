# Product rules

Marvin Campus compares public university schedules. Presence means the interval
between a group's first and last in-person lessons, including breaks; it does
not establish a person's actual location. Free windows subtract all lessons,
including online lessons, from every selected group's shared presence.
When a complete comparison has no shared presence, its summary explains whether
a selected group has no onsite lessons or the groups' presence does not overlap.
A group without onsite lessons is not silently excluded from the comparison.

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
compact day grid; its summary precedes the grid. Mobile group chips open subgroup,
order and removal controls. Group search starts empty, without suggested groups.
The mobile calendar spans the available screen width, while controls and card
content keep their internal spacing. Day/week views use a two-button toggle.
Online lessons use a contrasting two-pixel dashed outline.
Comparison modes appear after a second group is added: “В вузе” and “Без занятий”.
Sunday defaults to next Monday,
unless a date was explicitly selected. Group colors remain stable when reordered.
Ordinary cards use the group color. Each shared event appears once with a common
subject and room, and colored participant sections in stable group-ID order.
Group names and subgroup numbers occupy two lines; more than three participants
show the first two and a count, with the full list in the popover. Lesson-kind
badges sit beside the room. Lanes belong to overlapping events, so empty groups
reserve no space. Week-grid cards are at most 160 pixels wide; their height still
represents duration, including long military classes. Simultaneous distinct
lessons of one group use stripes. The selected-day timeline uses event rows and
reserves the week's peak row count to keep its panel height stable.
Long events in the horizontal day timeline keep their temporal length, but their
participant labels stay compact; the time range is available in the popover.

Comparisons live in readable URLs, not on the server. Current-week source data
is cached for ten minutes, future weeks for an hour, past weeks for a day; group
searches for a day. A successful stale snapshot is available for at most another
24 hours and retains its original check time. There is no manual source refresh.
Usable saved responses appear during reload and revalidation. A stable status row
shows freshness and opens per-group details; affected cards/participants use a
muted background and clock marker. Derived results and empty days identify saved
data too. A missing or expired snapshot never becomes an empty schedule.

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
