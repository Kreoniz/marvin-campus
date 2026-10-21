# Analytics

Tracking is optional, respects DNT and must not affect schedule loading. The app
tracks only on its configured public hostname. Raw comparison URLs, URL queries,
hashes and comparison referrers are reduced to the site root; titles are static.
Search text, teacher names, student identities and lesson descriptions are not
analytics properties. `src/lib/analytics-policy.ts` defines an event/property
allowlist and validates group labels, booleans, counts and bounded enum values.

There are 16 named events, plus one pageview when the tracker initializes.
Internal navigation does not automatically send another pageview.

| Event                 | Trigger                                                                                                                | Properties                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `group_added`         | A group is added through the picker                                                                                    | Selection fields, `group_count`                    |
| `group_removed`       | A group is removed                                                                                                     | Selection fields, `group_count`                    |
| `subgroup_changed`    | A subgroup or the whole group is selected                                                                              | Selection fields                                   |
| `group_selected`      | A selected group/subgroup has usable schedule data, including after opening a comparison link                          | Selection fields                                   |
| `groups_reordered`    | Groups are reordered                                                                                                   | `group_count`                                      |
| `schedule_loaded`     | Loading/revalidation of the current group set finishes                                                                 | `group_count`, `success`, `stale`, `week_relation` |
| `comparison_used`     | A loaded comparison with at least two groups is used; group/subgroup, week or mode changes can send another event      | `group_count`, `mode`, `has_overlap`, `stale`      |
| `share_opened`        | A readable or legacy comparison link is successfully resolved                                                          | `link_format`, `group_count`, `mode`               |
| `share_link_copied`   | Copying a comparison link succeeds                                                                                     | `link_format`, `group_count`, `mode`               |
| `lesson_opened`       | A lesson's details open                                                                                                | `remote`                                           |
| `theme_changed`       | The theme is changed                                                                                                   | `theme`                                            |
| `mode_changed`        | The comparison mode is changed                                                                                         | `mode`                                             |
| `week_changed`        | Week navigation is used                                                                                                | `week_relation`                                    |
| `day_changed`         | A day in the displayed week is selected                                                                                | None                                               |
| `mobile_view_changed` | The mobile Day/Week toggle changes its value; reselecting the active view, initial rendering and resizing send nothing | `view`                                             |
| `date_selected`       | A date is selected through the date picker or Today                                                                    | None                                               |

Selection fields are `group_label` and `selected`. `selected` is a boolean:
true when a subgroup is selected, including unresolved readable-link selections;
false for the whole group. No group IDs, subgroup IDs, subgroup numbers or
subgroup labels are sent. A catalog-shaped group code is retained; arbitrary
shared-link labels fall back to the public catalog ID represented as text.

`group_count` is between 0 and 30. `week_relation` is `past`, `current` or
`future`; `mode` is `presence` (“В вузе”) or `free` (“Без занятий”);
`theme` is `light` or `dark`; `link_format` is `readable` or `legacy`.
`view` is `day` or `week`; `remote` is a boolean. `schedule_loaded.success` means every selected group
has a usable snapshot, including an allowed saved snapshot. `stale` reflects
the snapshots' stale flags. `comparison_used.has_overlap` describes whether
the selected mode has a matching interval anywhere in the displayed week,
not just on the selected day.

PWA installation/update, search terms and individual error reasons have no
dedicated events. There are no lesson subject, room or teacher properties on
`lesson_opened`. Comparison fingerprints and incoming-link attribution
(`share_id`, `source_share_id`) are neither computed nor sent by analytics.
Internal Back/Forward does not count another link opening.

## Viewing reports in Umami

Open [stats.kreoniz.ru](https://stats.kreoniz.ru) to view the shared Umami dashboard.

In Events → Properties, explicitly choose Event = `group_selected` and Property
= `group_label` for group popularity, or `selected` for subgroup-feature usage.
The upper event filter does not select the Properties tab's event. Counts measure
actions, not students or unique members of an academic group.

Useful reports include `comparison_used.mode`, `mobile_view_changed.view`,
`share_link_copied` and `share_opened` totals, and `schedule_loaded.success` /
`stale`. Opening and copying totals are separate actions; without link attribution
they do not establish a recipient conversion rate for a particular link.

## Retention and ownership

The approved policy is 30 days of detailed Campus analytics, with daily cleanup.
Old periods disappear from Umami reports too; there is no separate archive of
long-term aggregates. Existing in-window events retain their historical properties
until they expire. Old installed application builds may still send the previous
properties until users activate the offered update.

Umami deployment, cleanup and backup retention are maintained in the separate
analytics operations project. This app owns only its tracker and events. Changing
the allowlist does not delete previously collected records. DNT and URL/title
sanitization remain enabled; this minimization does not establish legal anonymity.
