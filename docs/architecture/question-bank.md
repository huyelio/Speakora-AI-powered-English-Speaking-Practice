# Question Bank

## Implemented Model

Questions share one normalized model across IELTS, TOEIC, and General English. Frequently filtered data is relational; format-specific options remain in JSONB. A question belongs to one active practice mode and question type, may belong to a topic/group, and may have ordered prompt items or assets.

The active five-question MVP selects only IELTS records with `questions.status = 'ACTIVE'`. The legacy random-question API supports optional mode, type, difficulty, and topic filters.

## CSV Import

Minimum columns:

```csv
code,mode,type,topic,prompt
IELTS_T01_P1_001,IELTS,IELTS_PART_1,work-or-studies,Do you work or are you a student?
```

- `code`: unique stable question code.
- `mode`: `IELTS`, `TOEIC`, or `GENERAL`.
- `type`: an existing question-type code for that mode.
- `topic`: a topic slug such as `work-or-studies`.
- `prompt`: question text.
- Optional columns include `bullets`, `difficulty`, and `status`; separate bullets with `|`.

Validate all CSV files under `raw_data/` without writes:

```powershell
npm run questions:check
```

Import one file:

```powershell
npm run questions:import -- "raw_data/IELTS Test.csv"
```

The importer validates references, creates missing topics, and upserts questions by `code`. Re-running a file updates existing rows rather than duplicating them. `questions.topic_id` references `topics.id`; the CSV uses `topics.slug` as its stable lookup value.

For General English, every topic that has at least one active question must contain at least five active questions overall. The import check rejects incomplete active topic sets, so the practice selector is never offered a topic it cannot fill at the default session size. Draft and other non-active records do not count toward this threshold. Question-level `difficulty` remains in CSV imports, while future topic difficulty lives on `topics.difficulty_level`.

## General English Catalog

`raw_data/General English Topics.csv` contains 180 original Speakora questions across 15 everyday topics. Each topic has five active Beginner questions, five active Intermediate questions, and two Advanced drafts. The Advanced drafts remain unavailable until a reviewed active set reaches the five-question minimum.

All General English rows use `speakora-original` as the source and `ORIGINAL` as the license. They use only `GENERAL_OPEN_TOPIC` and `GENERAL_SITUATIONAL`; dynamic role-play is intentionally not included in this initial catalog. The original-content provenance does not change the warning below for the separately maintained IELTS source file.

## Current IELTS Dataset

`raw_data/IELTS Test.csv` contains 122 active IELTS Speaking questions arranged as five test sets:

| Part | Records | Share |
| --- | ---: | ---: |
| Part 1 — Introduction and Interview | 67 | 54.9% |
| Part 2 — Individual Long Turn | 5 | 4.1% |
| Part 3 — Discussion | 50 | 41.0% |

The import validator previously accepted all 122 rows, with no missing required fields, duplicate codes, or duplicate prompts. Each set includes all three parts, and its Part 2/Part 3 topics are related. Re-run `npm run questions:check` after editing the CSV instead of relying on these historical counts.

## Provenance Warning

The CSV has no per-question source name, URL, author, license, or verification evidence. It is suitable for demos and pipeline testing, but it must not be represented as an official IELTS dataset. The project used official IELTS materials only to verify the public test format, not to establish ownership of each CSV question.

Before public or commercial use, follow [the question data policy](../specs/question-data-policy.md): establish provenance and reuse rights, record attribution where required, complete human review, and preserve an audit trail for every published batch.
