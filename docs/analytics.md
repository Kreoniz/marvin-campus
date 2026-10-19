# Analytics

Tracking is optional, respects DNT and must not affect schedule loading. The app
tracks only on its configured public hostname. Raw comparison URLs, URL queries,
hashes and comparison referrers are reduced to the site root; titles are static.
Search text, teacher names, student identities and lesson descriptions are not
analytics properties. `src/lib/analytics-policy.ts` defines an event/property
allowlist and validates the public IDs, labels and bounded enum values.

There are 15 named events, plus one pageview when the tracker initializes.
Internal navigation does not automatically send another pageview.

| Event               | Trigger                                                                                                           | Properties                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `group_added`       | A group is added through the picker                                                                               | Selection fields, `group_count`                                           |
| `group_removed`     | A group is removed                                                                                                | Selection fields, `group_count`                                           |
| `subgroup_changed`  | A subgroup or the whole group is selected                                                                         | Selection fields, `selected`                                              |
| `group_selected`    | A selected group/subgroup has usable schedule data, including after opening a comparison link                     | Selection fields, optional `source_share_id`                              |
| `groups_reordered`  | Groups are reordered                                                                                              | `group_count`                                                             |
| `schedule_loaded`   | Loading/revalidation of the current group set finishes                                                            | `group_count`, `success`, `stale`, `week_relation`                        |
| `comparison_used`   | A loaded comparison with at least two groups is used; group/subgroup, week or mode changes can send another event | `group_count`, `mode`, `has_overlap`, `stale`, optional `source_share_id` |
| `share_opened`      | A readable or legacy comparison link is successfully resolved                                                     | `share_id`, `link_format`, `group_count`, `mode`                          |
| `share_link_copied` | Copying a comparison link succeeds                                                                                | `share_id`, `link_format`, `group_count`, `mode`                          |
| `lesson_opened`     | A lesson's details open                                                                                           | `remote`                                                                  |
| `theme_changed`     | The theme is changed                                                                                              | `theme`                                                                   |
| `mode_changed`      | The comparison mode is changed                                                                                    | `mode`                                                                    |
| `week_changed`      | Week navigation is used                                                                                           | `week_relation`                                                           |
| `day_changed`       | A day in the displayed week is selected                                                                           | None                                                                      |
| `date_selected`     | A date is selected through the date picker or Today                                                               | None                                                                      |

Selection fields are `group_id`, `group_label`, `subgroup_id`,
`subgroup_number` and `subgroup_label`; only available, validated values are
sent. `subgroup_id` can also be `all` or `unresolved`. `selected` distinguishes
a subgroup from the whole group.

`group_count` is between 0 and 30. `week_relation` is `past`, `current` or
`future`; `mode` is `presence` (“В вузе”) or `free` (“Без занятий”);
`theme` is `light` or `dark`; `link_format` is `readable` or `legacy`.
`remote` is a boolean. `schedule_loaded.success` means every selected group
has a usable snapshot, including an allowed saved snapshot. `stale` reflects
the snapshots' stale flags. `comparison_used.has_overlap` describes whether
the selected mode has a matching interval anywhere in the displayed week,
not just on the selected day.

Mobile day/week view changes, PWA installation/update, search terms and
individual error reasons have no dedicated events. There are no lesson
subject, room or teacher properties on `lesson_opened`.

`source_share_id` appears only on `group_selected` and `comparison_used`.
Readable comparison IDs are stable `r1-…` fingerprints of the selected path,
date and mode; they identify comparisons, not link authors or recipients. Legacy
links use their stored IDs. Internal Back/Forward does not count another opening.

## Viewing reports in Umami

In Events → Properties, explicitly choose Event = `group_selected` and Property
= `group_label` or `subgroup_label`. The upper event filter does not select the
Properties tab's event. Use a period covering the actual visits.

For link distribution, choose Event = `share_opened`, Property = `share_id`.
To inspect a particular link, filter `share_id` on that event; to inspect groups
chosen after arriving from it, filter `source_share_id` on `group_selected`.
Group source IDs are public catalog identifiers, not account identifiers.

Umami deployment configuration and retention are maintained outside this
repository. Changing this allowlist does not delete previously collected events.
