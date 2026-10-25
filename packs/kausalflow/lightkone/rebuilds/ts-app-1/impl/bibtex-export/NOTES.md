# bibtex-export notes

- Escaping uses `/\\?([&%#])/g -> "\\$1"`: an `&`, `%` or `#` already preceded by a backslash keeps that one backslash, every other gets one. Only title, venue and abstract are escaped.
- An `author` line is written whenever the authors list is non-empty, even `[""]`, which gives `{}`. The properties expect this.
- `year` is written when it is not null/undefined, so year 0 is written. It is printed with JS `String()`.
- The venue is left out when `fields[journal|booktitle]` is truthy (non-empty).
- `exportBibtex` also takes a stored app paper. It ignores extra keys (id, notes, pdf, ...) and treats missing `authors`/`tags`/`fields` as empty.
- No flags filed: no examples disagreed.
