# Analytics

Tracking is optional, respects DNT and must not affect schedule loading. The app
tracks only on its configured public hostname. Raw comparison URLs, URL queries,
hashes and comparison referrers are reduced to the site root; titles are static.
Search text, teacher names, student identities and lesson descriptions are not
analytics properties. `src/lib/analytics-policy.ts` defines an event/property
allowlist and validates the public IDs, labels and bounded enum values.

- `group_selected`: the successfully loaded selection, public group/subgroup
  IDs and labels, subgroup number, and originating comparison if present.
- `share_opened`: comparison ID, link format, group count and mode.
- `share_link_copied`: successfully copied comparison ID, format, count and mode.
- `comparison_used`: group count, mode, overlap/stale flags and comparison source.
- Selection changes, schedule loads, theme/mode changes and lesson opening have
  bounded properties; they do not all inherit a source link.

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
