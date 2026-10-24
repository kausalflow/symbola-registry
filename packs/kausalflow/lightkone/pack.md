# kausalflow/lightkone (version 1)

Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`. This file holds the brief, assumptions, obligations and manifest. Each component's contract, schemas and tests are in their own file; read the ones you build. Raw files are under [files/](files/), and the tarball holds everything.

## Components

- [parts/bibtex-export-v1.md](parts/bibtex-export-v1.md) (15 KB)
- [parts/bibtex-import-v1.md](parts/bibtex-import-v1.md) (23 KB)
- [parts/citation-key-v1.md](parts/citation-key-v1.md) (10 KB)
- [parts/library-file-v1.md](parts/library-file-v1.md) (36 KB)
- [parts/library-merge-v1.md](parts/library-merge-v1.md) (25 KB)
- [parts/pdf-filing-v1.md](parts/pdf-filing-v1.md) (11 KB)
- [parts/search-query-v1.md](parts/search-query-v1.md) (29 KB)
- [parts/tidy-v1.md](parts/tidy-v1.md) (22 KB)

## AGENTS.md

# AGENTS.md

This is a Symbolon spec pack for lightkone's core components. Build from it;
do not look for lightkone's source.

1. Read `BRIEF.md`: what the product is, its non-goals and priorities.
2. Read `assumptions/`: what you may take as true about the world. Don't build for cases they rule out.
3. Read `obligations.toml`: the decisions you must keep. Obligations marked `open` are yours to choose.
4. Each component's full specification is `components/<name>/versions/1/`: `symbolon.toml`
   (the description), `schema.py`, `examples.jsonl` and `properties.py`. Where the
   description and an example seem to disagree, the example is what lightkone does.

**Harness.** An implementation is a directory with `symbolon-impl.toml`
(`symbolon impl-init <dir> --contract components/<name>/versions/1`). In Python, define
`run(input)` returning the contract's output; in any other language, a program
that reads one JSON input per line on stdin and writes `{"output": ...}` per
line (`docs/ATTESTATION.md`, "Implementations in other languages").

**Done** means `symbolon attest components/<name>/versions/1 <impl-dir>` reports PASSED
for every component. Don't special-case the examples: the properties generate
other inputs, and the publisher keeps a holdout. Write questions about unclear
parts, and the reading you chose, in `NOTES.md` next to your build.

**If the spec contradicts itself** (an example disagrees with the description or
with a property), don't code around it. Run
`symbolon flag <component>#example:<line> "<what disagrees, and the reading you chose>" --dir <impl-dir>`,
build the reading you think is right, and carry on. A flagged contradiction counts
in your favour; matching an example the spec rules out does not.

## BRIEF.md

# Lightkone

Lightkone is a research-paper library for people who read a lot of papers and
want to own their data. It is a static web app with no server: the library is
plain files (`lightkone/library.json` and a generated `library.bib`) in storage
the owner chooses, such as the browser, an S3 or R2 bucket, or a GitHub
repository.

People use it to collect papers (by DOI, arXiv id, BibTeX import or PDF), find
them again with a small query language, file them in folders, tag them, read
and highlight PDFs, and keep `.bib` files in sync with their manuscripts on
Overleaf.

## What this version of the pack covers

Version 1 covers the pure components everything else leans on, and the
library file they all share:

| Component | What it does |
| --- | --- |
| `lightkone/search-query@1` | The search box: filters (`tag:`, `author:`, `year:`, `in:`, `has:`, `no:`, `is:`), words with accent folding, ranking, sort orders, and the trash rule |
| `lightkone/bibtex-import@1` | Reading BibTeX from Paperpile, Zotero, JabRef and Google Scholar into paper drafts, including LaTeX accents, macros, author names and arXiv ids |
| `lightkone/bibtex-export@1` | Writing a paper as the exact BibTeX entry lightkone writes, byte for byte |
| `lightkone/citation-key@1` | Paperpile-style citation keys for new papers, unique within the library |
| `lightkone/pdf-filing@1` | Where a paper's PDF goes, named the way Paperpile names it |
| `lightkone/library-merge@1` | Merging two devices' edits to `library.json` without losing either |
| `lightkone/tidy@1` | Finding duplicate papers and how to merge each group |
| `lightkone/library-file@1` | Reading `library.json` and writing it back, with `library.bib`, byte for byte |

Later versions add the MCP server's tools and UI acceptance scenarios.

## Who it is for

Builders who want lightkone's behavior in their own stack: a different
language, a server instead of a static app, or a fork with their own features.
A build that passes these contracts reads the same queries and BibTeX the same
way lightkone does, so its users' libraries and habits carry over.

## Non-goals

- Full-text search inside PDFs. Search covers metadata and notes only.
- Collaboration. A library belongs to one person; there are no shared libraries, roles or permissions.
- Being a general BibTeX validator. Import reads what the common managers export and skips the rest.
- Pixel-level UI. Later versions specify user flows, not layout or styling.

## Priorities

When goals conflict, earlier ones win:

1. **The owner's data stays theirs and stays readable.** Never lose or corrupt a library, and keep it in plain files.
2. **Compatibility with lightkone's files.** A build reads and writes the same `library.json` and `library.bib`, byte for byte where the contracts say so.
3. **Same answers to the same queries,** so habits carry over between builds.
4. Speed and features beyond the pack.

## Who resolves gaps

kausalflow, as the namespace holder. If the pack doesn't settle something, record the
question and the reading you chose in `NOTES.md` next to your build; obligations marked
`open` in `obligations.toml` are yours to choose. Unsettled questions are answered in the
next version of the pack.

## assumptions/bibtex-sources.toml

```toml
id = "K-bibtex-sources"
statement = "Imported BibTeX comes from Paperpile, Zotero, JabRef or Google Scholar exports, or from a library.bib lightkone wrote."
basis = "These are the managers lightkone's users migrate from; the import rules and examples were drawn from their exports."
monitor = "Count entries dropped per import; report when more than 5% of an import is dropped."
```

## assumptions/iso-timestamps.toml

```toml
id = "K-iso-timestamps"
statement = "Every added and opened timestamp was written by JavaScript's toISOString (UTC, milliseconds), so string order is time order."
basis = "lightkone writes all timestamps itself; libraries are not edited by other tools."
monitor = "On load, report papers whose timestamps do not match the schema pattern."
```

## assumptions/personal-library.toml

```toml
id = "K-personal-library"
statement = "A library belongs to one person, holds at most tens of thousands of papers, and is searched in memory on their device."
basis = "lightkone is a static app with no server, so search runs over the whole library in the browser."
monitor = "Report the library size when it is loaded."
```

## assumptions/single-writer.toml

```toml
id = "K-single-writer"
statement = "Two clients (devices, or Claude through MCP) do not write the same library within the moment between lightkone re-reading library.json and writing it."
basis = "Libraries are personal and saves are small. Writes that are minutes apart are reconciled by lightkone/library-merge; storage offers no lock for the instant in between."
monitor = "After each save, re-read library.json and report when it differs from what was written."
```

## obligations.toml

```toml
# Obligations of the lightkone spec pack (format: docs/PACK_FORMAT.md).
#
# Each obligation is one decision a builder could get wrong, with the checks
# that pin it down. status: decided (required), default (chosen; a fork may
# change it with a note), open (deliberately undecided; builds may differ).
# Checks are "<component>#example:<line in examples.jsonl>" or
# "<component>#<property test name>".
#
# This is a retrofit of the v1 pack, which was written before v0.5. Pruning
# (dropping obligations that builders get right unprompted) comes with
# `replicate` in step 4.

# ── search-query ──────────────────────────────────────────────────────────

[[obligation]]
id = "search.results-from-library"
statement = "Results are distinct ids of papers in the input library."
status = "decided"
source = "extract"
checks = ["search-query#test_results_are_distinct_papers_from_the_library"]

[[obligation]]
id = "search.trash"
statement = "Trashed papers appear only with is:trash, and then only trashed papers appear; an empty trashed field is not trashed."
status = "decided"
source = "extract"
checks = ["search-query#test_trash_shows_only_with_is_trash", "search-query#example:25", "search-query#example:61", "search-query#example:62"]

[[obligation]]
id = "search.query-tokens"
statement = "Terms split on whitespace; quotes make one word; an unknown field:value or unmatched quote is an ordinary word."
status = "decided"
source = "extract"
checks = ["search-query#example:8", "search-query#example:9", "search-query#example:21", "search-query#example:22", "search-query#example:23", "search-query#example:27"]

[[obligation]]
id = "search.field-edge-cases"
statement = "A field with nothing after the colon is an ordinary word; an unknown field with a quoted value is one word, quotes included."
status = "decided"
source = "replication"
checks = ["search-query#example:82", "search-query#example:83", "search-query#example:84"]

[[obligation]]
id = "search.terms-conjunctive"
statement = "Every filter and every word must hold (except year:, see search.year-last-wins)."
status = "decided"
source = "extract"
checks = ["search-query#test_terms_are_conjunctive", "search-query#example:7", "search-query#example:31", "search-query#example:36", "search-query#example:47", "search-query#example:52", "search-query#example:63", "search-query#example:71"]

[[obligation]]
id = "search.folding"
statement = "Text and query compare after NFKD, removing combining marks, and lower-casing."
status = "decided"
source = "extract"
checks = ["search-query#test_case_and_accents_in_the_query_do_not_matter", "search-query#example:12", "search-query#example:13", "search-query#example:14", "search-query#example:15", "search-query#example:16"]

[[obligation]]
id = "search.word-scoring"
statement = "A word scores 5 in the title, 4 in authors joined by ' ; ', 1 in the rest text; a paper with any zero-scoring word is left out."
status = "decided"
source = "extract"
checks = ["search-query#test_words_rank_title_over_author_over_rest", "search-query#example:3", "search-query#example:6", "search-query#example:10", "search-query#example:11", "search-query#example:17", "search-query#example:18", "search-query#example:19", "search-query#example:20", "search-query#example:24", "search-query#example:68", "search-query#example:69"]

[[obligation]]
id = "search.filter-tag"
statement = "tag:T matches a whole tag after folding, never a substring."
status = "decided"
source = "extract"
checks = ["search-query#test_each_filter_selects_what_it_says", "search-query#example:26", "search-query#example:28", "search-query#example:29", "search-query#example:30", "search-query#example:32"]

[[obligation]]
id = "search.filter-author"
statement = "author:A is a substring of the folded authors joined with ' ; '."
status = "decided"
source = "extract"
checks = ["search-query#test_each_filter_selects_what_it_says", "search-query#example:33", "search-query#example:34", "search-query#example:35"]

[[obligation]]
id = "search.filter-year"
statement = "year:Y is an exact year and year:A-B an inclusive range; a missing year never matches."
status = "decided"
source = "extract"
checks = ["search-query#test_each_filter_selects_what_it_says", "search-query#example:37", "search-query#example:38", "search-query#example:39"]

[[obligation]]
id = "search.year-last-wins"
statement = "Only the last year: term that counts applies; a term whose value is not a number does not count."
status = "decided"
source = "replication"
reason = "The python-1 rebuild read repeated year: filters differently; lightkone keeps one year slot."
checks = ["search-query#test_only_the_last_year_filter_counts", "search-query#example:40", "search-query#example:41", "search-query#example:42"]

[[obligation]]
id = "search.year-malformed"
statement = "year:A-B parts: A not a number or 0 means the term does not count; B missing, empty, 0 or not a number means A; later parts are ignored. A typo such as year:20l7 filters nothing, by kausalflow's decision (2026-10-24): forgiving, low stakes."
status = "decided"
source = "replication"
checks = ["search-query#example:74", "search-query#example:75", "search-query#example:76", "search-query#example:77", "search-query#example:78", "search-query#example:79", "search-query#example:80", "search-query#example:81"]

[[obligation]]
id = "search.filter-folder"
statement = "in:F matches folder F and folders inside it, after folding, ignoring trailing slashes, never by name prefix."
status = "decided"
source = "extract"
checks = ["search-query#test_each_filter_selects_what_it_says", "search-query#example:43", "search-query#example:44", "search-query#example:45", "search-query#example:46"]

[[obligation]]
id = "search.filter-has-no"
statement = "has:/no: test presence of pdf, abstract, arxiv and notes; empty counts as absent; has:pdf also accepts file; unknown values are ignored."
status = "decided"
source = "extract"
checks = ["search-query#test_each_filter_selects_what_it_says", "search-query#example:48", "search-query#example:49", "search-query#example:50", "search-query#example:51", "search-query#example:53", "search-query#example:54", "search-query#example:55", "search-query#example:56"]

[[obligation]]
id = "search.filter-is"
statement = "is:starred and is:recent select starred and opened papers; unknown is: values are ignored."
status = "decided"
source = "extract"
checks = ["search-query#test_each_filter_selects_what_it_says", "search-query#example:57", "search-query#example:64"]

[[obligation]]
id = "search.default-order"
statement = "The default sort is newest added first, relevance when there are words, opened with is:recent; ties keep input order, relevance ties fall back to newest added."
status = "decided"
source = "extract"
checks = ["search-query#test_empty_query_lists_the_library_newest_first", "search-query#example:1", "search-query#example:2", "search-query#example:4", "search-query#example:59", "search-query#example:67", "search-query#example:70"]
assumes = ["K-iso-timestamps"]

[[obligation]]
id = "search.explicit-sorts"
statement = "year: later first, missing as 0; opened: latest first, never-opened last; an explicit sort overrides the default."
status = "decided"
source = "extract"
checks = ["search-query#test_year_sort_puts_later_years_first", "search-query#test_opened_order_and_is_recent", "search-query#example:5", "search-query#example:58", "search-query#example:60", "search-query#example:65", "search-query#example:66"]
assumes = ["K-iso-timestamps"]

[[obligation]]
id = "search.title-sort-ascii"
statement = "title: sort is ascending and stable for titles of lowercase ASCII letters, digits and spaces."
status = "decided"
source = "extract"
checks = ["search-query#test_title_sort_is_ascending_and_stable"]

[[obligation]]
id = "search.title-sort-other"
statement = "title: sort uses Unicode collation (CLDR root, tertiary), as JavaScript's localeCompare does: accents and case only break ties. Kept by kausalflow's decision (2026-10-24); builds need an ICU-grade collator."
status = "decided"
source = "replication"
checks = ["search-query#example:72", "search-query#example:73"]

# ── bibtex-import ─────────────────────────────────────────────────────────

[[obligation]]
id = "import.never-fails"
statement = "Import never fails: malformed parts are skipped and the rest is read."
status = "decided"
kind = "constraint"
source = "extract"
reason = "People import whole .bib files from other managers; one bad entry must not lose the file."
checks = ["bibtex-import#test_well_formed_entries_become_drafts", "bibtex-import#example:24", "bibtex-import#example:25", "bibtex-import#example:26"]
assumes = ["K-bibtex-sources"]

[[obligation]]
id = "import.entries"
statement = "@type{key, fields} and @type(key, fields) become drafts; @comment, @preamble and untitled entries do not."
status = "decided"
source = "extract"
checks = ["bibtex-import#test_entries_without_a_title_are_left_out", "bibtex-import#test_comments_and_preambles_are_not_entries", "bibtex-import#example:1", "bibtex-import#example:2", "bibtex-import#example:7", "bibtex-import#example:9", "bibtex-import#example:10", "bibtex-import#example:11", "bibtex-import#example:12"]

[[obligation]]
id = "import.malformed-field-skip"
statement = "A field without a name or '=' is skipped to the next comma or the end of the entry, skipping its braced and quoted values whole; the fields after it are read."
status = "decided"
source = "replication"
reason = "Lost fields after a malformed one were a lightkone bug, fixed in kausalflow/lightkone#50."
checks = ["bibtex-import#example:18", "bibtex-import#example:29", "bibtex-import#example:30"]

[[obligation]]
id = "import.values"
statement = "Values are braced, quoted, numeric or macro parts joined by #; @string and month macros expand; later fields replace earlier ones; whitespace collapses."
status = "decided"
source = "extract"
checks = ["bibtex-import#test_string_macros_and_concatenation", "bibtex-import#test_month_macros", "bibtex-import#test_whitespace_in_values_collapses", "bibtex-import#test_later_fields_replace_earlier_ones", "bibtex-import#example:8", "bibtex-import#example:17", "bibtex-import#example:21", "bibtex-import#example:22"]

[[obligation]]
id = "import.non-ascii-whitespace"
statement = "Whitespace is JavaScript's \\s set (incl. no-break space, U+2028, U+3000, BOM), everywhere in import. Kept by kausalflow's decision (2026-10-24)."
status = "decided"
checks = ["bibtex-import#example:31", "bibtex-import#example:32", "bibtex-import#example:36"]
source = "replication"
assumes = ["K-bibtex-sources"]

[[obligation]]
id = "import.latex-to-plain"
statement = "Title, venue, abstract, names and tags go through plain(): LaTeX accents and specials become Unicode, formatting commands unwrap, braces go."
status = "decided"
source = "extract"
checks = ["bibtex-import#example:3", "bibtex-import#example:6", "bibtex-import#example:13", "bibtex-import#example:14"]

[[obligation]]
id = "import.authors"
statement = "Authors split on 'and'; First Last flips to Last, First; comma names, 'others' and {braced} names are kept; editor stands in only without an author field."
status = "decided"
source = "extract"
checks = ["bibtex-import#test_braced_names_and_others_are_kept", "bibtex-import#test_editors_stand_in_for_missing_authors", "bibtex-import#example:5", "bibtex-import#example:11", "bibtex-import#example:19", "bibtex-import#example:27"]

[[obligation]]
id = "import.identifiers"
statement = "doi loses its resolver prefix; arxiv ids come from arxivid, arXiv eprints, arxiv.org URLs or new-style bare eprints, without version."
status = "decided"
source = "extract"
checks = ["bibtex-import#test_doi_loses_its_resolver_prefix", "bibtex-import#test_arxiv_ids_are_found", "bibtex-import#test_other_eprints_stay_in_fields", "bibtex-import#example:16", "bibtex-import#example:28", "bibtex-import#example:33", "bibtex-import#example:34"]

[[obligation]]
id = "import.draft-fields"
statement = "year is the first four digits; venue is journal, else booktitle, else publisher; notes is annote, else note; empty abstract, doi and venue are absent."
status = "decided"
source = "extract"
checks = ["bibtex-import#example:4", "bibtex-import#example:20", "bibtex-import#example:23", "bibtex-import#example:35", "bibtex-import#example:37"]

[[obligation]]
id = "import.venue-empty-journal"
statement = "The venue is the first of journal, booktitle, publisher that is not empty, so an empty journal does not hide a booktitle. Fixed in lightkone#53; until then an empty journal left the paper without a venue."
status = "decided"
source = "replication"
checks = ["bibtex-import#example:38", "bibtex-import#example:39"]

[[obligation]]
id = "import.tags"
statement = "keywords split on ; or , into tags, dropping identifiers and URLs."
status = "decided"
source = "extract"
checks = ["bibtex-import#test_keywords_become_tags_without_identifiers", "bibtex-import#example:15"]

# ── bibtex-export ─────────────────────────────────────────────────────────

[[obligation]]
id = "export.byte-exact"
statement = "Export writes the exact entry lightkone writes: frame, aligned names, field order."
status = "decided"
kind = "constraint"
source = "extract"
reason = "library.bib is synced with Overleaf and git; any difference shows up as a spurious diff for every user."
checks = ["bibtex-export#test_entry_frame", "bibtex-export#test_names_are_aligned", "bibtex-export#test_fields_appear_in_order_when_present", "bibtex-export#example:1", "bibtex-export#example:11", "bibtex-export#example:13"]

[[obligation]]
id = "export.values"
statement = "Values are written as given, except that & % # are escaped once in title, venue and abstract."
status = "decided"
source = "extract"
checks = ["bibtex-export#test_values_are_written_as_given", "bibtex-export#test_title_venue_and_abstract_are_escaped", "bibtex-export#example:9", "bibtex-export#example:14", "bibtex-export#example:16", "bibtex-export#example:19"]

[[obligation]]
id = "export.venue"
statement = "The venue is written as journal, or booktitle for inproceedings and incollection, unless a non-empty journal field is already there."
status = "decided"
source = "extract"
checks = ["bibtex-export#example:2", "bibtex-export#example:3", "bibtex-export#example:4", "bibtex-export#example:5"]

[[obligation]]
id = "export.authors-and-keywords"
statement = "Authors join with ' and ', whole names braced; tags join with ';' as keywords."
status = "decided"
source = "extract"
checks = ["bibtex-export#test_authors_and_keywords", "bibtex-export#example:7", "bibtex-export#example:8", "bibtex-export#example:18"]

[[obligation]]
id = "export.empty-values"
statement = "Empty values are left out, except title and year 0; an empty type becomes misc."
status = "decided"
source = "extract"
checks = ["bibtex-export#example:6", "bibtex-export#example:12", "bibtex-export#example:15", "bibtex-export#example:17"]

[[obligation]]
id = "export.no-private-fields"
statement = "Fields whose names start with lightkone- are private and never written to BibTeX."
status = "decided"
kind = "security"
source = "extract"
checks = ["bibtex-export#example:10"]


# ── citation-key ──────────────────────────────────────────────────────

[[obligation]]
id = "keys.format"
statement = "A new key is surname (NFKD, ASCII letters, Anon if none) + year + '-' + first letters of the first two title words longer than 3 letters."
status = "decided"
source = "oracle"
checks = ["citation-key#test_a_key_is_surname_year_and_two_title_letters", "citation-key#example:1", "citation-key#example:2", "citation-key#example:3", "citation-key#example:10", "citation-key#example:11", "citation-key#example:12", "citation-key#example:13", "citation-key#example:14", "citation-key#example:15", "citation-key#example:16", "citation-key#example:17", "citation-key#example:18"]

[[obligation]]
id = "keys.unique"
statement = "Keys are unique in the library: a taken key counts up from 2, and keys given earlier in a batch are taken."
status = "decided"
source = "oracle"
checks = ["citation-key#test_keys_are_unique_and_never_taken", "citation-key#test_collisions_count_up_from_two", "citation-key#test_identical_drafts_in_one_batch_get_distinct_keys", "citation-key#example:4", "citation-key#example:5", "citation-key#example:6", "citation-key#example:19"]

[[obligation]]
id = "keys.stable"
statement = "A key a paper arrives with is kept when it is free, so keys from an imported .bib never change."
status = "decided"
source = "oracle"
checks = ["citation-key#test_an_arriving_key_is_kept_when_free", "citation-key#test_keys_look_like_keys", "citation-key#example:7", "citation-key#example:8", "citation-key#example:9"]

# ── pdf-filing ────────────────────────────────────────────────────────

[[obligation]]
id = "filing.paperpile-layout"
statement = "PDFs are filed as papers/All Papers/<SURNAME>/<Who Year - Title>.pdf, Paperpile's own layout, so a Paperpile folder can be copied in unchanged."
status = "decided"
source = "oracle"
checks = ["pdf-filing#test_pdf_is_the_file_under_papers", "pdf-filing#test_folder_is_the_first_surname_in_capitals", "pdf-filing#test_same_paper_same_place", "pdf-filing#example:1", "pdf-filing#example:2", "pdf-filing#example:3", "pdf-filing#example:7", "pdf-filing#example:8", "pdf-filing#example:9", "pdf-filing#example:10", "pdf-filing#example:16", "pdf-filing#example:17"]

[[obligation]]
id = "filing.clean-names"
statement = "File names hold no characters a file system or Drive rejects; they become ' - ', and -- / --- become dashes."
status = "decided"
source = "oracle"
checks = ["pdf-filing#test_names_hold_no_forbidden_characters", "pdf-filing#example:4", "pdf-filing#example:5", "pdf-filing#example:6", "pdf-filing#example:18", "pdf-filing#example:19"]

[[obligation]]
id = "filing.length"
statement = "Long author lists and names are shortened the way Paperpile shortens them."
status = "decided"
source = "oracle"
checks = ["pdf-filing#test_long_names_are_shortened_around_an_ellipsis", "pdf-filing#example:11", "pdf-filing#example:12"]

[[obligation]]
id = "filing.no-overwrite"
statement = "A new PDF never takes a name another paper uses; it gets (2), (3), ..."
status = "decided"
source = "oracle"
checks = ["pdf-filing#test_taken_names_count_up_and_own_pdf_is_ignored", "pdf-filing#example:13", "pdf-filing#example:14", "pdf-filing#example:15"]

# ── library-merge ─────────────────────────────────────────────────────

[[obligation]]
id = "merge.no-lost-edits"
statement = "A save never silently drops a change made elsewhere: one-sided changes are taken, different fields of one paper both survive."
status = "decided"
source = "oracle"
checks = ["library-merge#test_nothing_changed_merges_to_itself", "library-merge#test_changes_made_only_elsewhere_are_taken_whole", "library-merge#test_changes_made_only_here_are_kept", "library-merge#test_edits_to_different_fields_both_survive", "library-merge#example:1", "library-merge#example:2", "library-merge#example:3", "library-merge#example:4", "library-merge#example:9"]

[[obligation]]
id = "merge.conflict-ours"
statement = "When both sides change the same field differently, this device's edit wins."
status = "decided"
source = "oracle"
checks = ["library-merge#test_the_same_field_changed_both_ways_keeps_ours", "library-merge#example:5", "library-merge#example:20"]

[[obligation]]
id = "merge.sets"
statement = "tags and folders merge as sets: additions from either side are kept, removals from either side stick."
status = "decided"
source = "oracle"
checks = ["library-merge#test_tags_merge_as_sets", "library-merge#example:6", "library-merge#example:7", "library-merge#example:8", "library-merge#example:21"]

[[obligation]]
id = "merge.deletes"
statement = "A paper deleted on one side and unchanged on the other is gone; changed on the other, it survives."
status = "decided"
source = "oracle"
checks = ["library-merge#test_a_paper_deleted_here_but_changed_there_survives", "library-merge#example:10", "library-merge#example:11", "library-merge#example:12", "library-merge#example:13", "library-merge#example:14"]

[[obligation]]
id = "merge.order-and-count"
statement = "Their order first, then papers only here; fromThem counts papers that took a change made elsewhere."
status = "decided"
source = "oracle"
checks = ["library-merge#test_without_a_base_every_paper_is_kept_and_ours_wins", "library-merge#example:15", "library-merge#example:16", "library-merge#example:17"]

[[obligation]]
id = "merge.bibsync"
statement = "bibSync takes theirs unless changed here, and is written only when non-empty."
status = "decided"
source = "oracle"
checks = ["library-merge#example:18", "library-merge#example:19"]

# ── tidy ──────────────────────────────────────────────────────────────

[[obligation]]
id = "tidy.match"
statement = "Duplicates share a DOI, an arXiv id, a long title, or a short title and first author, after normalising; chains join."
status = "decided"
source = "oracle"
checks = ["tidy#test_groups_are_exactly_the_papers_that_share_a_key", "tidy#example:1", "tidy#example:2", "tidy#example:3", "tidy#example:4", "tidy#example:5", "tidy#example:6", "tidy#example:7", "tidy#example:8", "tidy#example:18", "tidy#example:19", "tidy#example:20", "tidy#example:21"]

[[obligation]]
id = "tidy.trash-ignored"
statement = "Papers in the trash are never grouped."
status = "decided"
source = "oracle"
checks = ["tidy#test_trash_is_never_grouped", "tidy#example:9"]

[[obligation]]
id = "tidy.keeper"
statement = "The kept paper is the one with a PDF, then notes, then the oldest."
status = "decided"
source = "oracle"
checks = ["tidy#test_the_keeper_has_a_pdf_then_notes_then_is_oldest", "tidy#example:11", "tidy#example:12", "tidy#example:13", "tidy#example:14"]

[[obligation]]
id = "tidy.nothing-lost"
statement = "Merging keeps every tag, folder, note and star, and fills the keeper's missing fields from the others."
status = "decided"
source = "oracle"
checks = ["tidy#test_the_keeper_gains_what_the_others_have", "tidy#test_fields_prefer_the_keeper_then_earlier_papers", "tidy#example:15", "tidy#example:16", "tidy#example:17"]

[[obligation]]
id = "tidy.blank-ids-ignored"
statement = "A DOI or arXiv id that is empty once trimmed and stripped of its prefix gives no match key, so blank ones never make papers duplicates. Fixed in lightkone#52; until then whitespace-only DOIs matched each other."
status = "decided"
source = "oracle"
checks = ["tidy#example:10", "tidy#example:22", "tidy#example:23", "tidy#test_groups_are_exactly_the_papers_that_share_a_key"]

[[obligation]]
id = "file.refuse-foreign"
statement = "A file that is not a lightkone library (not JSON, wrong format, no papers list, a paper that is not an object) is refused with an error and nothing is written."
status = "decided"
source = "oracle"
checks = ["library-file#test_anything_else_is_refused", "library-file#example:25", "library-file#example:26", "library-file#example:27", "library-file#example:28", "library-file#example:29", "library-file#example:30", "library-file#example:31", "library-file#example:32", "library-file#example:33", "library-file#example:34", "library-file#example:35", "library-file#example:36", "library-file#example:37", "library-file#example:38", "library-file#example:39"]

[[obligation]]
id = "file.keeps-papers"
statement = "Opening and saving keeps every paper and every key of every paper, in order, plus bibSync when it has entries."
status = "decided"
source = "oracle"
checks = ["library-file#test_saved_file_keeps_exactly_the_library", "library-file#example:1", "library-file#example:3", "library-file#example:7", "library-file#example:23"]

[[obligation]]
id = "file.keeps-unknown-keys"
statement = "Top-level keys other than format, version, papers and bibSync are kept on save, after lightkone's own, in the file's order, so another tool's data at the top level survives. Fixed in lightkone#51; until then they were dropped."
status = "decided"
source = "oracle"
checks = ["library-file#example:3", "library-file#example:40", "library-file#example:41", "library-file#example:42", "library-file#test_saved_file_keeps_exactly_the_library"]

[[obligation]]
id = "file.newer-version-refused"
statement = "A library.json whose version is a number above 1 was saved by a newer lightkone and is refused, writing nothing; any other version, or none, is read and saved as 1. Fixed in lightkone#53; until then a newer file was read as version 1 and could lose data on save."
status = "decided"
source = "oracle"
checks = ["library-file#example:8", "library-file#example:50", "library-file#example:51", "library-file#example:52", "library-file#example:53", "library-file#example:54", "library-file#test_anything_else_is_refused"]

[[obligation]]
id = "file.folders"
statement = "Papers without folders take them once from Paperpile's Drive paths, skipping All Papers, author folders and Other."
status = "decided"
source = "oracle"
checks = ["library-file#test_papers_gain_folders_from_paperpile_paths", "library-file#example:1", "library-file#example:10", "library-file#example:11", "library-file#example:13", "library-file#example:14", "library-file#example:15", "library-file#example:16", "library-file#example:17"]

[[obligation]]
id = "file.folders-author-only"
statement = "A single directory is skipped as an author folder only when it is Other or one of the paper's authors' surnames in capitals, so a user's own ML or 2019 folder is kept. With no authors to compare, a directory in capitals with a letter is still skipped. Fixed in lightkone#52; until then every single directory in capitals was skipped."
status = "decided"
source = "oracle"
checks = ["library-file#example:12", "library-file#example:46", "library-file#example:47", "library-file#example:48", "library-file#example:49", "library-file#test_papers_gain_folders_from_paperpile_paths"]

[[obligation]]
id = "file.exact-text"
statement = "library.json is written byte for byte as lightkone writes it: JSON with a one-space indent, JavaScript's key order, escaping and number printing."
status = "decided"
source = "oracle"
checks = ["library-file#test_layout_is_one_space_indented_json", "library-file#example:4", "library-file#example:9", "library-file#example:18", "library-file#example:19", "library-file#example:20", "library-file#example:24"]

[[obligation]]
id = "file.no-needless-write"
statement = "Nothing is written when the file would not change, so opening a library on several devices does not cause sync churn."
status = "decided"
source = "oracle"
checks = ["library-file#test_writes_only_when_the_text_changes", "library-file#test_saving_again_writes_nothing", "library-file#example:2", "library-file#example:5", "library-file#example:6"]

[[obligation]]
id = "file.bib-alongside"
statement = "library.bib is written with every save: the BibTeX entry of each paper not in the trash, in library order."
status = "decided"
source = "oracle"
checks = ["library-file#test_bib_has_one_entry_per_live_paper_in_order", "library-file#example:21"]

[[obligation]]
id = "file.bib-leaves-out-trash"
statement = "Papers in the trash are left out of library.bib, so Overleaf does not see deleted papers. A paper is in the trash when its trashed value is true in JavaScript. Fixed in lightkone#51; until then they were written."
status = "decided"
source = "oracle"
checks = ["library-file#example:22", "library-file#example:43", "library-file#example:44", "library-file#example:45", "library-file#test_bib_has_one_entry_per_live_paper_in_order"]
```

## symbolon-pack.toml

```toml
# Spec pack manifest. Pack tooling (symbolon pack validate/pull) comes later;
# for now this records which contract versions make up the pack.
[pack]
id = "kausalflow/lightkone"
version = 1
title = "Lightkone core: search, BibTeX, keys, filing, merge, tidy and the library file"
license = "Proprietary (kausalflow)"
authors = ["kausalflow"]

[components]
"lightkone/search-query@1" = "sha256:3ee30369355a97d18b46e5c729a157c29c15834655f7dc1033c0404d2c714b46"
"lightkone/bibtex-import@1" = "sha256:549f518845ebd601650bf502cd18bb372368a3fea4e44510d2e67a53ba8ee88a"
"lightkone/bibtex-export@1" = "sha256:b2be7e43a14a1cdf9f5f65dcef181d159fe2afb95859dd1c6c836a6a89c3b97c"
"lightkone/citation-key@1" = "sha256:69041cb4a2e57a7ab161892db71ac21b103afb7e9187624207c66bbac1e5db94"
"lightkone/pdf-filing@1" = "sha256:583b0fa4549f4b8e1a6f6818a2d32d7f4062114e1cd74eba18c5f24786b5fff9"
"lightkone/library-merge@1" = "sha256:70141d55339b28b0dd81d1b37e1426f04e8d1de9d0380cb90766666b7a8ed89b"
"lightkone/tidy@1" = "sha256:b7513bd79d1c0b85eec6ff719f16f92dc9c4ec641b01fb6ab9a76fc7403f6e96"
"lightkone/library-file@1" = "sha256:c51dba7de999b5fbcaee57007e3b55aea18ea538bc28e898f0f92c12696b1b51"
```
