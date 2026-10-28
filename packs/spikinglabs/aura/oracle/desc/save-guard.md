The checks the phone makes before it replaces its saved log, so a bug can never overwrite good data with a
broken or shrunken log. `steps` are save attempts in order on one running app; each has the whole `state` to
save and `allow_shrink`. The answer has one result per step: {saved, refused}, where `refused` is null when
saved and otherwise the first check that failed:
1. "too-new": the log's version is above the current one (3; `v` missing or not a positive integer counts as
   1). A log from a newer app is never saved.
2. "malformed": the state is not an object, or has no `settings` (missing or falsy), or one of the 14 synced
   collections (children, episodes, entries, meds, measurements, growth, products, vaccines, checkups, dental,
   appts, emergency, docs, pages) is not a list, or some item in them is not an object with an `id` that is
   neither missing nor null (an id of 0 or "" is fine).
3. "shrunk": the log has fewer items (all 14 collections together) than the last log that was saved, unless the
   last saved log was example data (`example` true) or `allow_shrink` is set. Deletions are tombstones, so the
   count only falls when the parent deletes everything or leaves the example data. The first save has nothing
   to be smaller than.
A refused attempt changes nothing: the count and the example flag of the last save stay, so a refused
shrunken log does not lower the bar. `allow_shrink` is a one-shot permission for the save attempt that asks for it: it lets that attempt skip check
3, and is used up by it whatever the outcome. An attempt refused as too new or malformed uses it up too, so a
later step that does not ask for it gets no permission. A saved log sets the bar to its item count and remembers whether it was
example data.
