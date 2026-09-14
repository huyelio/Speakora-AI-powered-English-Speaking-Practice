# Vocabulary data attribution

This directory contains Speakora vocabulary practice datasets derived in part from:

**SkyPedia English–Vietnamese Dictionary**
https://github.com/skypediacode/english-vietnamese-dictionary

License: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

Upstream credits also include MinhQND dictionary and other sources listed in the SkyPedia `ATTRIBUTION.md`.

## Local files

- `mapped-accepted.jsonl` — MVP sample / auto-accepted mapped senses ready to import
- `candidates.jsonl` — extracted SkyPedia senses (generated)
- `review.jsonl` — low-confidence mappings for human review (generated)
- `skypedia/dictionary_en_vi.db` — download locally; not committed (gitignored)
- `.cache/` — embedding cache (gitignored)

Do not commit the full SkyPedia SQLite database.
