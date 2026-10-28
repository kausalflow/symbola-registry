How two copies of the family's log become one. The log is a JSON document with 14 synced collections (the list
SYNCED): children, episodes, entries, meds, measurements, growth, products, vaccines, checkups, dental, appts,
emergency, docs, pages. Every item has a unique `id` and an `updatedAt` (ms; missing counts as 0). A deletion is
not a removal: the item stays with `deleted: true` and a newer `updatedAt` (a tombstone). `op` picks the
function; the answer is `result`.

merge (local, incoming): the phone's log takes in another copy (a Drive file, a partner's phone, a backup).
`local` has the 14 collections (a missing one counts as empty) and may have `example` (true: it only holds
example data) and `child` (the selected child's id). `incoming` is a saved log with `app` "aura" or
"sick-day-log"; otherwise ValueError. A log with a format version above the current one (3; `v` missing or not
a positive integer counts as 1) is ValueError too. An older incoming log is first brought to the current format
(see the migrate component). If local only holds example data it is first replaced by an empty log (settings
kept), so result.example is false and the example items are gone. An empty log has no items except `meds`: two
starting medicines {id "m1", name "Paracetamol (acetaminophen)", gapH 4, updatedAt 0} and {id "m2", name
"Ibuprofen", gapH 6, updatedAt 0}. A log brought up from the old format without `meds` has them too.
Then, per collection, items are matched by id. An id only on one side is kept. An id on both sides keeps the
incoming item only if its updatedAt is strictly greater than local's; on a tie, or when it is older, local's item
stays. Items are never combined field by field, and tombstones are kept like any item: a newer deletion wins, an
older one loses against a later edit. A collection missing in incoming leaves local's alone. Order: local's items
in their order (an item replaced by a newer one keeps its place), then the new items of incoming in their order.
result: {the 14 collections, child, example}. `child` is local's child if it has one, else the id of the first
child that is not deleted, else null.

covered (mine, theirs): result is true when every item in each of the 14 collections of `mine` is also in
`theirs` (same id) with an updatedAt at least as great. The sync uses it to see that nothing of the phone's was
lost to another phone's write.

unknown (log): result is the object of the log's top-level keys this version does not know, with their values
unchanged, so a newer app's extra parts are written back. Known keys: app, v, savedAt, example, settings, child,
drive, recalls, docTr and the 14 collections.

is-aura (log): result is true when `log` is an object whose `app` is "aura" or "sick-day-log" and whose
`entries` is an array. The sync refuses to write over a Drive file that is not.
