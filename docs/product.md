# Product rules

Marvin Campus compares public university schedules. Presence means the interval
between a group's first and last in-person lessons, including breaks; it does
not establish a person's actual location. Free windows subtract all lessons,
including online lessons, from every selected group's shared presence.

Shared lessons require matching source identity and event details. Matching
subject text and time alone do not establish a shared lesson. Unavailable data
must never be interpreted as an empty schedule.

The whole group is the default selection. Selecting a subgroup includes that
subgroup and group/stream lessons. The choice persists across weeks, including
weeks without subgroup data. Public subgroup numbers appear beside group names.

Desktop uses a week grid and a detailed selected day. Mobile starts with a
compact day grid; its summary follows the grid. Sunday defaults to next Monday,
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

The installable PWA keeps a complete application build and recently opened
schedules for offline restart. It does not invent schedules for unopened groups
or extend snapshot freshness. HTTP errors and cancelled requests remain errors.
App updates are offered separately from schedule updates.
