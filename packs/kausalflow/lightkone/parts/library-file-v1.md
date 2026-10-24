# kausalflow/lightkone (version 1): component library-file-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [library-file-v1.tar.gz](library-file-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/library-file/versions/1/examples.jsonl

The first 3 of 57 lines. The rest is part of the spec too: read the whole file at [components/library-file/versions/1/examples.jsonl](../files/components/library-file/versions/1/examples.jsonl).

```json
{"input": {"text": {"$text": "paperpile-import.json"}}, "output": {"written": true, "library": "{\n \"format\": \"lightkone-library\",\n \"version\": 1,\n \"papers\": [\n  {\n   \"id\": \"p1\",\n   \"key\": \"Vaswani2017-at\",\n   \"type\": \"inproceedings\",\n   \"title\": \"Attention Is All You Need\",\n   \"authors\": [\n    \"Vaswani, Ashish\",\n    \"Shazeer, Noam\"\n   ],\n   \"year\": 2017,\n   \"venue\": \"Advances in Neural Information Processing Systems\",\n   \"arxiv\": \"1706.03762\",\n   \"file\": \"All Papers/VASWANI/Vaswani et al. 2017 - Attention Is All You Need.pdf\",\n   \"tags\": [\n    \"ml\"\n   ],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": []\n  },\n  {\n   \"id\": \"p2\",\n   \"key\": \"Peskin1995-in\",\n   \"type\": \"book\",\n   \"title\": \"An Introduction to Quantum Field Theory\",\n   \"authors\": [\n    \"Peskin, Michael E.\",\n    \"Schroeder, Daniel V.\"\n   ],\n   \"year\": 1995,\n   \"file\": \"All Papers/MLDS/Physics/QFT/Peskin and Schroeder 1995 - An Introduction to Quantum Field Theory.pdf\",\n   \"tags\": [\n    \"physics\",\n    \"to read\"\n   ],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": [\n    \"MLDS/Physics/QFT\"\n   ]\n  },\n  {\n   \"id\": \"p3\",\n   \"key\": \"Hinton2012-im\",\n   \"type\": \"article\",\n   \"title\": \"Improving neural networks by preventing co-adaptation of feature detectors\",\n   \"authors\": [\n    \"Hinton, Geoffrey E.\",\n    \"Srivastava, Nitish\"\n   ],\n   \"year\": 2012,\n   \"arxiv\": \"1207.0580\",\n   \"file\": \"All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf; All Papers/MLDS/Reading group/Hinton et al. 2012 - Improving neural networks.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {\n    \"note\": \"dropout\"\n   },\n   \"folders\": [\n    \"MLDS/Reading group\"\n   ]\n  },\n  {\n   \"id\": \"p4\",\n   \"key\": \"Anon-un\",\n   \"type\": \"article\",\n   \"title\": \"Untitled scan\",\n   \"authors\": [],\n   \"file\": \"All Papers/Other/scan-0042.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": []\n  },\n  {\n   \"id\": \"p5\",\n   \"key\": \"LIGO2016-ob\",\n   \"type\": \"article\",\n   \"title\": \"Observation of Gravitational Waves from a Binary Black Hole Merger\",\n   \"authors\": [\n    \"LIGO Scientific Collaboration\",\n    \"others\"\n   ],\n   \"year\": 2016,\n   \"venue\": \"Physical Review Letters\",\n   \"doi\": \"10.1103/PhysRevLett.116.061102\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {\n    \"volume\": \"116\",\n    \"pages\": \"061102\"\n   },\n   \"folders\": []\n  },\n  {\n   \"id\": \"p6\",\n   \"key\": \"Noether1918-in\",\n   \"type\": \"article\",\n   \"title\": \"Invariante Variationsprobleme\",\n   \"authors\": [\n    \"Noether, Emmy\"\n   ],\n   \"year\": 1918,\n   \"venue\": \"Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen\",\n   \"file\": \"Physics/Classics/Noether 1918.pdf;;Physics/Classics/Noether 1918.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": [\n    \"Physics/Classics\"\n   ]\n  }\n ]\n}", "bib": "@inproceedings{Vaswani2017-at,\n  title         = {{Attention Is All You Need}},\n  author        = {Vaswani, Ashish and Shazeer, Noam},\n  year          = {2017},\n  booktitle     = {Advances in Neural Information Processing Systems},\n  eprint        = {1706.03762},\n  archiveprefix = {arXiv},\n  keywords      = {ml},\n  file          = {All Papers/VASWANI/Vaswani et al. 2017 - Attention Is All You Need.pdf}\n}\n\n@book{Peskin1995-in,\n  title    = {{An Introduction to Quantum Field Theory}},\n  author   = {Peskin, Michael E. and Schroeder, Daniel V.},\n  year     = {1995},\n  keywords = {physics;to read},\n  file     = {All Papers/MLDS/Physics/QFT/Peskin and Schroeder 1995 - An Introduction to Quantum Field Theory.pdf}\n}\n\n@article{Hinton2012-im,\n  title         = {{Improving neural networks by preventing co-adaptation of feature detectors}},\n  author        = {Hinton, Geoffrey E. and Srivastava, Nitish},\n  year          = {2012},\n  eprint        = {1207.0580},\n  archiveprefix = {arXiv},\n  file          = {All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf; All Papers/MLDS/Reading group/Hinton et al. 2012 - Improving neural networks.pdf},\n  note          = {dropout}\n}\n\n@article{Anon-un,\n  title = {{Untitled scan}},\n  file  = {All Papers/Other/scan-0042.pdf}\n}\n\n@article{LIGO2016-ob,\n  title   = {{Observation of Gravitational Waves from a Binary Black Hole Merger}},\n  author  = {{LIGO Scientific Collaboration} and others},\n  year    = {2016},\n  journal = {Physical Review Letters},\n  doi     = {10.1103/PhysRevLett.116.061102},\n  volume  = {116},\n  pages   = {061102}\n}\n\n@article{Noether1918-in,\n  title   = {{Invariante Variationsprobleme}},\n  author  = {Noether, Emmy},\n  year    = {1918},\n  journal = {Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen},\n  file    = {Physics/Classics/Noether 1918.pdf;;Physics/Classics/Noether 1918.pdf}\n}\n", "foldered": 3}, "note": "a library imported from Paperpile: folders come from the Drive paths; author folders and Other are skipped"}
{"input": {"text": {"$text": "saved.json"}}, "output": {"written": false, "library": "{\n \"format\": \"lightkone-library\",\n \"version\": 1,\n \"papers\": [\n  {\n   \"id\": \"p1\",\n   \"key\": \"Vaswani2017-at\",\n   \"type\": \"inproceedings\",\n   \"title\": \"Attention Is All You Need\",\n   \"authors\": [\n    \"Vaswani, Ashish\",\n    \"Shazeer, Noam\"\n   ],\n   \"year\": 2017,\n   \"venue\": \"Advances in Neural Information Processing Systems\",\n   \"arxiv\": \"1706.03762\",\n   \"file\": \"All Papers/VASWANI/Vaswani et al. 2017 - Attention Is All You Need.pdf\",\n   \"tags\": [\n    \"ml\"\n   ],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": []\n  },\n  {\n   \"id\": \"p2\",\n   \"key\": \"Peskin1995-in\",\n   \"type\": \"book\",\n   \"title\": \"An Introduction to Quantum Field Theory\",\n   \"authors\": [\n    \"Peskin, Michael E.\",\n    \"Schroeder, Daniel V.\"\n   ],\n   \"year\": 1995,\n   \"file\": \"All Papers/MLDS/Physics/QFT/Peskin and Schroeder 1995 - An Introduction to Quantum Field Theory.pdf\",\n   \"tags\": [\n    \"physics\",\n    \"to read\"\n   ],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": [\n    \"MLDS/Physics/QFT\"\n   ]\n  },\n  {\n   \"id\": \"p3\",\n   \"key\": \"Hinton2012-im\",\n   \"type\": \"article\",\n   \"title\": \"Improving neural networks by preventing co-adaptation of feature detectors\",\n   \"authors\": [\n    \"Hinton, Geoffrey E.\",\n    \"Srivastava, Nitish\"\n   ],\n   \"year\": 2012,\n   \"arxiv\": \"1207.0580\",\n   \"file\": \"All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf; All Papers/MLDS/Reading group/Hinton et al. 2012 - Improving neural networks.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {\n    \"note\": \"dropout\"\n   },\n   \"folders\": [\n    \"MLDS/Reading group\"\n   ]\n  },\n  {\n   \"id\": \"p4\",\n   \"key\": \"Anon-un\",\n   \"type\": \"article\",\n   \"title\": \"Untitled scan\",\n   \"authors\": [],\n   \"file\": \"All Papers/Other/scan-0042.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": []\n  },\n  {\n   \"id\": \"p5\",\n   \"key\": \"LIGO2016-ob\",\n   \"type\": \"article\",\n   \"title\": \"Observation of Gravitational Waves from a Binary Black Hole Merger\",\n   \"authors\": [\n    \"LIGO Scientific Collaboration\",\n    \"others\"\n   ],\n   \"year\": 2016,\n   \"venue\": \"Physical Review Letters\",\n   \"doi\": \"10.1103/PhysRevLett.116.061102\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {\n    \"volume\": \"116\",\n    \"pages\": \"061102\"\n   },\n   \"folders\": []\n  },\n  {\n   \"id\": \"p6\",\n   \"key\": \"Noether1918-in\",\n   \"type\": \"article\",\n   \"title\": \"Invariante Variationsprobleme\",\n   \"authors\": [\n    \"Noether, Emmy\"\n   ],\n   \"year\": 1918,\n   \"venue\": \"Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen\",\n   \"file\": \"Physics/Classics/Noether 1918.pdf;;Physics/Classics/Noether 1918.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"folders\": [\n    \"Physics/Classics\"\n   ]\n  }\n ]\n}", "bib": null, "foldered": 0}, "note": "exactly what lightkone wrote last time: nothing to write"}
{"input": {"text": {"$text": "shared.json"}}, "output": {"written": true, "library": "{\n \"format\": \"lightkone-library\",\n \"version\": 1,\n \"papers\": [\n  {\n   \"id\": \"s1\",\n   \"key\": \"Noether1918-in\",\n   \"type\": \"article\",\n   \"title\": \"Invariante Variationsprobleme\",\n   \"authors\": [\n    \"Noether, Emmy\"\n   ],\n   \"year\": 1918,\n   \"venue\": \"Göttinger Nachrichten\",\n   \"tags\": [\n    \"physics\"\n   ],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {\n    \"lightkone-read\": \"yes\"\n   },\n   \"folders\": [\n    \"Physics/Classics\"\n   ],\n   \"starred\": true,\n   \"notes\": \"Theorem I: symmetries ↔ conserved currents.\\nTheorem II: gauge.\",\n   \"by\": \"Ana\"\n  },\n  {\n   \"id\": \"s2\",\n   \"key\": \"Dirac1928-qu\",\n   \"type\": \"article\",\n   \"title\": \"The Quantum Theory of the Electron\",\n   \"authors\": [\n    \"Dirac, P. A. M.\"\n   ],\n   \"year\": 1928,\n   \"venue\": \"Proc. R. Soc. Lond. A\",\n   \"doi\": \"https://doi.org/10.1098/rspa.1928.0023\",\n   \"file\": \"All Papers/DIRAC/Dirac 1928.pdf\",\n   \"tags\": [],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {},\n   \"trashed\": \"2024-05-02T10:00:00.000Z\",\n   \"folders\": []\n  },\n  {\n   \"id\": \"s3\",\n   \"key\": \"Shannon1948-am\",\n   \"type\": \"article\",\n   \"title\": \"A Mathematical Theory of Communication\",\n   \"authors\": [\n    \"Shannon, C. E.\"\n   ],\n   \"year\": 1948,\n   \"venue\": \"Bell System Technical Journal\",\n   \"tags\": [\n    \"information theory\",\n    \"ml\"\n   ],\n   \"added\": \"2024-03-01T09:00:00.000Z\",\n   \"fields\": {\n    \"volume\": \"27\",\n    \"pages\": \"379--423\"\n   },\n   \"folders\": [],\n   \"opened\": \"2024-06-01T08:00:00.000Z\",\n   \"rating\": 4.5,\n   \"pdf\": \"papers/SHANNON/Shannon 1948 - A Mathematical Theory of Communication.pdf\"\n  }\n ],\n \"bibSync\": [\n  {\n   \"folder\": \"Physics\",\n   \"repo\": \"ana/thesis\",\n   \"path\": \"refs.bib\",\n   \"tex\": \"\",\n   \"aliases\": {\n    \"2\": \"s1\",\n    \"1928\": \"s2\",\n    \"shannon\": \"s3\"\n   }\n  }\n ],\n \"exportedBy\": \"a sync script\"\n}", "bib": "@article{Noether1918-in,\n  title    = {{Invariante Variationsprobleme}},\n  author   = {Noether, Emmy},\n  year     = {1918},\n  journal  = {Göttinger Nachrichten},\n  keywords = {physics}\n}\n\n@article{Shannon1948-am,\n  title    = {{A Mathematical Theory of Communication}},\n  author   = {Shannon, C. E.},\n  year     = {1948},\n  journal  = {Bell System Technical Journal},\n  keywords = {information theory;ml},\n  volume   = {27},\n  pages    = {379--423}\n}\n", "foldered": 0}, "note": "a shared library: bibSync kept, another tool's top-level key kept after it, alias keys that are numbers move first, the trashed paper left out of library.bib"}
```

## components/library-file/versions/1/fixtures/paperpile-import.json

```json
{"format": "lightkone-library", "version": 1, "papers": [{"id": "p1", "key": "Vaswani2017-at", "type": "inproceedings", "title": "Attention Is All You Need", "authors": ["Vaswani, Ashish", "Shazeer, Noam"], "year": 2017, "venue": "Advances in Neural Information Processing Systems", "arxiv": "1706.03762", "file": "All Papers/VASWANI/Vaswani et al. 2017 - Attention Is All You Need.pdf", "tags": ["ml"], "added": "2024-03-01T09:00:00.000Z", "fields": {}}, {"id": "p2", "key": "Peskin1995-in", "type": "book", "title": "An Introduction to Quantum Field Theory", "authors": ["Peskin, Michael E.", "Schroeder, Daniel V."], "year": 1995, "file": "All Papers/MLDS/Physics/QFT/Peskin and Schroeder 1995 - An Introduction to Quantum Field Theory.pdf", "tags": ["physics", "to read"], "added": "2024-03-01T09:00:00.000Z", "fields": {}}, {"id": "p3", "key": "Hinton2012-im", "type": "article", "title": "Improving neural networks by preventing co-adaptation of feature detectors", "authors": ["Hinton, Geoffrey E.", "Srivastava, Nitish"], "year": 2012, "arxiv": "1207.0580", "file": "All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf; All Papers/MLDS/Reading group/Hinton et al. 2012 - Improving neural networks.pdf", "tags": [], "added": "2024-03-01T09:00:00.000Z", "fields": {"note": "dropout"}}, {"id": "p4", "key": "Anon-un", "type": "article", "title": "Untitled scan", "authors": [], "file": "All Papers/Other/scan-0042.pdf", "tags": [], "added": "2024-03-01T09:00:00.000Z", "fields": {}}, {"id": "p5", "key": "LIGO2016-ob", "type": "article", "title": "Observation of Gravitational Waves from a Binary Black Hole Merger", "authors": ["LIGO Scientific Collaboration", "others"], "year": 2016, "venue": "Physical Review Letters", "doi": "10.1103/PhysRevLett.116.061102", "tags": [], "added": "2024-03-01T09:00:00.000Z", "fields": {"volume": "116", "pages": "061102"}}, {"id": "p6", "key": "Noether1918-in", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "venue": "Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen", "file": "Physics/Classics/Noether 1918.pdf;;Physics/Classics/Noether 1918.pdf", "tags": [], "added": "2024-03-01T09:00:00.000Z", "fields": {}}]}
```

## components/library-file/versions/1/fixtures/saved.json

```json
{
 "format": "lightkone-library",
 "version": 1,
 "papers": [
  {
   "id": "p1",
   "key": "Vaswani2017-at",
   "type": "inproceedings",
   "title": "Attention Is All You Need",
   "authors": [
    "Vaswani, Ashish",
    "Shazeer, Noam"
   ],
   "year": 2017,
   "venue": "Advances in Neural Information Processing Systems",
   "arxiv": "1706.03762",
   "file": "All Papers/VASWANI/Vaswani et al. 2017 - Attention Is All You Need.pdf",
   "tags": [
    "ml"
   ],
   "added": "2024-03-01T09:00:00.000Z",
   "fields": {},
   "folders": []
  },
  {
   "id": "p2",
   "key": "Peskin1995-in",
   "type": "book",
   "title": "An Introduction to Quantum Field Theory",
   "authors": [
    "Peskin, Michael E.",
    "Schroeder, Daniel V."
   ],
   "year": 1995,
   "file": "All Papers/MLDS/Physics/QFT/Peskin and Schroeder 1995 - An Introduction to Quantum Field Theory.pdf",
   "tags": [
    "physics",
    "to read"
   ],
   "added": "2024-03-01T09:00:00.000Z",
   "fields": {},
   "folders": [
    "MLDS/Physics/QFT"
   ]
  },
  {
   "id": "p3",
   "key": "Hinton2012-im",
   "type": "article",
   "title": "Improving neural networks by preventing co-adaptation of feature detectors",
   "authors": [
    "Hinton, Geoffrey E.",
    "Srivastava, Nitish"
   ],
   "year": 2012,
   "arxiv": "1207.0580",
   "file": "All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf; All Papers/MLDS/Reading group/Hinton et al. 2012 - Improving neural networks.pdf",
   "tags": [],
   "added": "2024-03-01T09:00:00.000Z",
   "fields": {
    "note": "dropout"
   },
   "folders": [
    "MLDS/Reading group"
   ]
  },
  {
   "id": "p4",
   "key": "Anon-un",
   "type": "article",
   "title": "Untitled scan",
   "authors": [],
   "file": "All Papers/Other/scan-0042.pdf",
   "tags": [],
   "added": "2024-03-01T09:00:00.000Z",
   "fields": {},
   "folders": []
  },
  {
   "id": "p5",
   "key": "LIGO2016-ob",
   "type": "article",
   "title": "Observation of Gravitational Waves from a Binary Black Hole Merger",
   "authors": [
    "LIGO Scientific Collaboration",
    "others"
   ],
   "year": 2016,
   "venue": "Physical Review Letters",
   "doi": "10.1103/PhysRevLett.116.061102",
   "tags": [],
   "added": "2024-03-01T09:00:00.000Z",
   "fields": {
    "volume": "116",
    "pages": "061102"
   },
   "folders": []
  },
  {
   "id": "p6",
   "key": "Noether1918-in",
   "type": "article",
   "title": "Invariante Variationsprobleme",
   "authors": [
    "Noether, Emmy"
   ],
   "year": 1918,
   "venue": "Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen",
   "file": "Physics/Classics/Noether 1918.pdf;;Physics/Classics/Noether 1918.pdf",
   "tags": [],
   "added": "2024-03-01T09:00:00.000Z",
   "fields": {},
   "folders": [
    "Physics/Classics"
   ]
  }
 ]
}
```

## components/library-file/versions/1/fixtures/shared.json

```json
{
  "format": "lightkone-library",
  "version": 1,
  "papers": [
    {
      "id": "s1",
      "key": "Noether1918-in",
      "type": "article",
      "title": "Invariante Variationsprobleme",
      "authors": [
        "Noether, Emmy"
      ],
      "year": 1918,
      "venue": "Göttinger Nachrichten",
      "tags": [
        "physics"
      ],
      "added": "2024-03-01T09:00:00.000Z",
      "fields": {
        "lightkone-read": "yes"
      },
      "folders": [
        "Physics/Classics"
      ],
      "starred": true,
      "notes": "Theorem I: symmetries ↔ conserved currents.\nTheorem II: gauge.",
      "by": "Ana"
    },
    {
      "id": "s2",
      "key": "Dirac1928-qu",
      "type": "article",
      "title": "The Quantum Theory of the Electron",
      "authors": [
        "Dirac, P. A. M."
      ],
      "year": 1928,
      "venue": "Proc. R. Soc. Lond. A",
      "doi": "https://doi.org/10.1098/rspa.1928.0023",
      "file": "All Papers/DIRAC/Dirac 1928.pdf",
      "tags": [],
      "added": "2024-03-01T09:00:00.000Z",
      "fields": {},
      "trashed": "2024-05-02T10:00:00.000Z"
    },
    {
      "id": "s3",
      "key": "Shannon1948-am",
      "type": "article",
      "title": "A Mathematical Theory of Communication",
      "authors": [
        "Shannon, C. E."
      ],
      "year": 1948,
      "venue": "Bell System Technical Journal",
      "tags": [
        "information theory",
        "ml"
      ],
      "added": "2024-03-01T09:00:00.000Z",
      "fields": {
        "volume": "27",
        "pages": "379--423"
      },
      "folders": [],
      "opened": "2024-06-01T08:00:00.000Z",
      "rating": 4.5,
      "pdf": "papers/SHANNON/Shannon 1948 - A Mathematical Theory of Communication.pdf"
    }
  ],
  "bibSync": [
    {
      "folder": "Physics",
      "repo": "ana/thesis",
      "path": "refs.bib",
      "tex": "",
      "aliases": {
        "shannon": "s3",
        "1928": "s2",
        "2": "s1"
      }
    }
  ],
  "exportedBy": "a sync script"
}
```

## components/library-file/versions/1/properties.py

```python
"""Behavioral properties for lightkone/library-file.

Libraries are generated the way they arise: imported from Paperpile (Drive
paths, no folders), already saved by lightkone, or edited by other tools
(compact JSON, extra keys). Strings and numbers stay simple here; the
examples pin down escaping and number printing.
"""

import json
import re

from hypothesis import given, strategies as st

from schema import Input

SEGMENTS = ["All Papers", "HINTON", "DOE", "Other", "ML", "Physics", "QFT", "Reading group", "McKay", "2019"]
INDEX = re.compile(r"^(0|[1-9][0-9]*)$")


def clean(s):
    """lightkone/pdf-filing's clean()."""
    s = s.replace("---", "\u2014").replace("--", "\u2013")
    s = re.sub(r'[:/\\?*"<>|]', " - ", s)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"( - )+", " - ", s)
    return re.sub(r"^[\s-]+|[\s-]+$", "", s)


def author_folders(authors):
    return {f for f in (clean(a.split(",")[0].strip()).upper() for a in authors) if f}


def folders_from(file, authors=()):
    """The folder rule of the description, written out independently."""
    names = author_folders(authors)

    def author_folder(d):
        if d == "Other":
            return True
        return d in names if names else d == d.upper() and d != d.lower()

    out = []
    for path in (file or "").split(";"):
        path = path.strip()
        if not path:
            continue
        dirs = path.split("/")[:-1]
        if dirs[:1] == ["All Papers"]:
            dirs = dirs[1:]
        if not dirs or (len(dirs) == 1 and author_folder(dirs[0])):
            continue
        f = "/".join(dirs)
        if f not in out:
            out.append(f)
    return out


paths = st.lists(st.sampled_from(SEGMENTS), max_size=3).map(lambda d: "/".join(d + ["x.pdf"]))


@st.composite
def paper(draw, i):
    p = {"id": f"p{i}", "key": f"Key{i}", "type": draw(st.sampled_from(["article", "book", "misc"])),
         "title": draw(st.sampled_from(["Gauge fields", "Dropout", "Notes on QFT"])),
         "authors": draw(st.lists(st.sampled_from(["Doe, Jane", "Roe, R.", "Hinton, G. E.", "Ml, Kim"]), max_size=2)),
         "tags": draw(st.lists(st.sampled_from(["ml", "physics"]), unique=True, max_size=2)),
         "added": "2024-01-01T00:00:00.000Z", "fields": {}}
    if draw(st.booleans()):
        p["year"] = draw(st.integers(1900, 2030))
    if draw(st.booleans()):
        p["file"] = ";".join(draw(st.lists(paths, min_size=1, max_size=3)))
    if draw(st.booleans()):
        p["folders"] = draw(st.lists(st.sampled_from(["ML", "Physics/QFT"]), unique=True, max_size=2))
    if draw(st.booleans()):
        p["starred"] = True
    if draw(st.booleans()):
        p["trashed"] = "2024-02-01T00:00:00.000Z"
    return p


@st.composite
def library(draw):
    data = {"format": "lightkone-library", "version": 1,
            "papers": [draw(paper(i)) for i in range(draw(st.integers(0, 4)))]}
    if draw(st.booleans()):
        data["bibSync"] = draw(st.lists(st.just({"folder": "", "repo": "a/b", "path": "refs.bib"}), max_size=1))
    if draw(st.booleans()):
        data["note"] = "kept elsewhere"
    if draw(st.booleans()):
        data = {"source": {"tool": "sync", "at": 3}, **data}
    return data


@st.composite
def stored(draw):
    """(data, text): a library and the text of the file holding it."""
    data = draw(library())
    indent = draw(st.sampled_from([None, 1, 2]))
    return data, json.dumps(data, indent=indent, ensure_ascii=False)


def run(impl, text):
    return impl(Input(text=text))


@given(stored())
def test_saved_file_keeps_exactly_the_library(impl, s):
    data, text = s
    out = json.loads(run(impl, text).library)
    expect = {"format": "lightkone-library", "version": 1, "papers": data["papers"]}
    if data.get("bibSync"):
        expect["bibSync"] = data["bibSync"]
    expect.update((k, v) for k, v in data.items() if k not in ("format", "version", "papers", "bibSync"))
    for p in expect["papers"]:
        p.setdefault("folders", folders_from(p.get("file"), p["authors"]))
    assert out == expect
    assert list(out) == list(expect), "other tools' keys come after lightkone's, in the file's order"


@given(stored())
def test_papers_gain_folders_from_paperpile_paths(impl, s):
    data, text = s
    out = run(impl, text)
    papers = json.loads(out.library)["papers"]
    for before, after in zip(data["papers"], papers):
        assert after["folders"] == before.get("folders", folders_from(before.get("file"), before["authors"]))
        assert list(after)[: len(before)] == list(before), "existing keys keep their order; folders goes last"
    assert out.foldered == sum(1 for p in data["papers"] if "folders" not in p and folders_from(p.get("file"), p["authors"]))


@given(stored())
def test_layout_is_one_space_indented_json(impl, s):
    data, text = s
    out = run(impl, text)
    assert out.library == json.dumps(json.loads(out.library), indent=1, ensure_ascii=False)


@given(stored())
def test_writes_only_when_the_text_changes(impl, s):
    data, text = s
    out = run(impl, text)
    assert out.written == (out.library != text)
    assert (out.bib is None) == (not out.written)
    if not out.written:
        assert out.library == text


@given(stored())
def test_saving_again_writes_nothing(impl, s):
    data, text = s
    first = run(impl, text)
    again = run(impl, first.library)
    assert not again.written and again.library == first.library and again.foldered == 0


@given(library(), st.booleans())
def test_bib_has_one_entry_per_live_paper_in_order(impl, data, pretty):
    text = json.dumps(data) + ("\n" if pretty else "")
    out = run(impl, text)
    assert out.written
    heads = re.findall(r"^@(\w+)\{([^,\n]*),$", out.bib, re.M)
    live = [p for p in data["papers"] if not p.get("trashed")]
    assert heads == [(p["type"] or "misc", p["key"]) for p in live]
    assert (out.bib == "") == (not live)


not_a_library = st.one_of(
    st.sampled_from(["", "nope", "{", "[]", "null", "true", "3", '"x"', "{}", "NaN"]),
    st.builds(lambda f: json.dumps({"format": f, "version": 1, "papers": []}),
              st.sampled_from(["", "lightkone", "Lightkone-library", "lightkone-library ", "paperpile"])),
    st.builds(lambda p: json.dumps({"format": "lightkone-library", "version": 1, **p}),
              st.sampled_from([{}, {"papers": {}}, {"papers": 3}, {"papers": "abc"}, {"papers": [None]}, {"papers": [1, {}]},
                              {"version": 2, "papers": []}, {"version": 1.5, "papers": []}, {"version": 1000, "papers": []}])),
)


@given(not_a_library)
def test_anything_else_is_refused(impl, text):
    try:
        out = run(impl, text)
    except ValueError:
        return
    raise AssertionError(f"accepted a file that is not a lightkone library: {out}")
```

## components/library-file/versions/1/schema/input.json

```json
{
  "additionalProperties": false,
  "properties": {
    "text": {
      "description": "lightkone/library.json exactly as it is stored.",
      "title": "Text",
      "type": "string"
    }
  },
  "required": [
    "text"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/library-file/versions/1/schema/output.json

```json
{
  "additionalProperties": false,
  "properties": {
    "bib": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "The library.bib written with it; null when nothing is written.",
      "title": "Bib"
    },
    "foldered": {
      "description": "How many papers took their folders from Paperpile's file paths.",
      "minimum": 0,
      "title": "Foldered",
      "type": "integer"
    },
    "library": {
      "description": "The text of library.json after the save.",
      "title": "Library",
      "type": "string"
    },
    "written": {
      "description": "Whether saving writes anything: false when library.json would not change.",
      "title": "Written",
      "type": "boolean"
    }
  },
  "required": [
    "written",
    "library",
    "bib",
    "foldered"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/library-file/versions/1/schema.py

```python
"""Interface for lightkone/library-file.

The input is library.json's raw text, because what is being specified is how
lightkone reads and rewrites that file. Text that is not a lightkone library
at all is in scope (it must raise ValueError). A library whose papers lack
the fields lightkone always writes is out of scope: lightkone never produces
one, so Input rejects it.
"""

import json
import math
import re
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError, field_validator

FieldName = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_.:+-]*$")]
SURROGATE = re.compile(r"[\ud800-\udfff]")


class StoredPaper(BaseModel):
    """A paper as lightkone stores it. Other keys may appear and must be kept."""

    model_config = ConfigDict(extra="allow", strict=True)

    id: str
    key: str
    type: str
    title: str
    authors: list[str]
    year: int | float | None = Field(None, description="A whole number; 2017.0 is read as 2017.")
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    url: str | None = None
    tags: list[str]
    file: str | None = None
    added: str
    folders: list[str] | None = None
    fields: dict[FieldName, str]

    @field_validator("year")
    @classmethod
    def _whole(cls, year):
        if isinstance(year, float) and not year.is_integer():
            raise ValueError("year is a whole number")
        return year


def _check_values(v: Any) -> None:
    if v is None:
        raise ValueError("lightkone never writes null inside a library")
    if isinstance(v, bool):
        return
    if isinstance(v, int) and abs(v) > 2**53:
        raise ValueError("integers beyond 2**53 are not exact in JavaScript")
    if isinstance(v, float) and not math.isfinite(v):
        raise ValueError("numbers too large for a double are out of scope")
    if isinstance(v, str) and SURROGATE.search(v):
        raise ValueError("lone surrogates are out of scope")
    if isinstance(v, dict):
        for k, x in v.items():
            _check_values(k)
            _check_values(x)
    if isinstance(v, list):
        for x in v:
            _check_values(x)


def _not_json(name: str):
    raise ValueError(f"{name} is not JSON")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(description="lightkone/library.json exactly as it is stored.")

    @field_validator("text")
    @classmethod
    def _in_scope(cls, text: str) -> str:
        try:
            data = json.loads(text, parse_constant=_not_json)
        except ValueError:
            return text
        if not (isinstance(data, dict) and data.get("format") == "lightkone-library"):
            return text
        papers = data.get("papers")
        if papers == "":
            raise ValueError('"papers": "" is out of scope (lightkone happens to accept it)')
        if not isinstance(papers, list) or not all(isinstance(p, dict) for p in papers):
            return text
        _check_values(data)
        for p in papers:
            try:
                StoredPaper.model_validate(p)
            except ValidationError as e:
                raise ValueError(f"paper {p.get('id')!r} is not shaped the way lightkone writes papers: {e}") from None
        sync = data.get("bibSync")
        if sync is not None and not (isinstance(sync, list) and all(isinstance(t, dict) for t in sync)):
            raise ValueError("bibSync, when present, is a list of objects")
        return text


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    written: bool = Field(description="Whether saving writes anything: false when library.json would not change.")
    library: str = Field(description="The text of library.json after the save.")
    bib: str | None = Field(description="The library.bib written with it; null when nothing is written.")
    foldered: int = Field(ge=0, description="How many papers took their folders from Paperpile's file paths.")
```

## components/library-file/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/library-file"
version = 1
title = "Read and rewrite lightkone's library.json"
description = """
lightkone/library.json is the library: lightkone's own data, and what other
devices, Claude through MCP, and anyone's scripts read and write. This
contract fixes what lightkone does when it opens that file and saves it
again with nothing else changed (Library.load, then Library.save): which
files it accepts, what it adds, and the exact text it writes.

Input: the file's text. Output:
  written    whether the save writes anything
  library    library.json's text after the save
  bib        lightkone/library.bib, written alongside; null when not written
  foldered   how many papers took their folders from Paperpile paths

Accepting a file. Raise ValueError, writing nothing, when the text is not
JSON, is not an object whose "format" is "lightkone-library", has no
"papers" list, or a paper is not an object. Also raise ValueError when
"version" is a number above 1: the file was saved by a newer lightkone,
which may store things this one would drop. Any other version, or none, is
read as 1.

Folders. Each paper with no "folders" key gets one, from its "file" (a
Paperpile Drive path, or several separated by ";"): for each path, trimmed,
skipping empty ones, take its directories (every segment but the last); drop
a leading "All Papers"; skip it when nothing is left, or when a single
directory is left that is an author folder. Join the rest with "/". Keep the
first of any repeats, in order. A paper with no file gets []. foldered
counts the papers that gained a non-empty list. A paper that already has
"folders", even [], keeps it.

Author folders. Paperpile files a PDF under its first author's surname in
capitals, as lightkone/pdf-filing names the folder; any of the paper's
authors counts, since the author list may have changed since. Let N be the
set of clean(surname(a)) upper-cased, for each author a, leaving out empty
ones (clean and surname as lightkone/pdf-filing defines them; upper-casing
is JavaScript's toUpperCase, so "ß" becomes "SS"). A directory is an author
folder when it is "Other" or is in N. When N is empty there is nothing to
compare, and a directory is an author folder when upper-casing leaves it
unchanged and lower-casing changes it ("HINTON", but not "2019"). So a
user's own "ML" folder is kept unless an author is called Ml.

Writing. The saved file holds format "lightkone-library", version 1, papers,
and bibSync when it is a non-empty list, then every other top-level key of
the input with its value as read, in the input's order: lightkone keeps
other tools' data. written is false only when that text equals the input exactly; then
nothing is written and library is the input.

The text is JavaScript's JSON.stringify with an indent of one space:
  - objects and arrays one entry per line, indented one more space per
    level; ": " after a key; empty ones written {} and []
  - an object's keys keep their order, except keys that are array indices
    ("0", "7", "10"; no sign, no leading zero, below 4294967295) come first,
    in numeric order. A gained "folders" key comes after the existing ones.
  - strings escape " \\ and control characters below U+0020 (\\b \\f \\n
    \\r \\t, others \\u00xx in lower-case hex); nothing else is escaped
  - numbers as JavaScript prints them: integral values below 1e21 as plain
    integers (2017.0 is 2017, -0 is 0, 1e16 is 10000000000000000); others in
    the shortest form that reads back the same, with an exponent written
    e+21 or e-7 for magnitudes from 1e21 up or below 1e-6
  - no newline at the end

library.bib: each paper not in the trash, as lightkone/bibtex-export writes
it (its fields in the order library.json lists them), joined by "\\n". A
paper is in the trash when its "trashed" value is true in JavaScript: any
value but a missing key, false, 0 and "" ([] and {} are in the trash,
and so is "0"). No papers left gives "".
"""
regenerability = "disposable"
license = "Proprietary (kausalflow)"
authors = ["kausalflow/lightkone"]

[entrypoint]
function = "run"

[requires]
network = []
credentials = []
state = []
permissions = []

[spec]
seed = 0
max_examples = 200
timeout_seconds = 300
```
