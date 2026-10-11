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
Ordinary cards use the group color; shared cards use a neutral background, a
stripe of participant colors, and colored group labels. Lesson-kind badges sit
beside the room. Nonadjacent participants get linked pieces that do not cover
intermediate groups. Simultaneous distinct lessons of one group use stripes.

Comparisons live in readable URLs, not on the server. Current-week source data
is cached for ten minutes, future weeks for an hour, past weeks for a day; group
searches for a day. A successful stale snapshot is available for at most another
24 hours and retains its original check time. There is no manual source refresh.

The installable PWA keeps a complete application build and recently opened
schedules for offline restart. It does not invent schedules for unopened groups
or extend snapshot freshness. HTTP errors and cancelled requests remain errors.
App updates are offered separately from schedule updates.
