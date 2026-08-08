# Question Data Policy

## Default Source Strategy

Prefer questions authored and reviewed by the project team using publicly documented test structures and competencies. Do not copy or closely paraphrase questions from websites, books, PDFs, applications, or preparation products merely because they are publicly accessible.

Official IELTS and TOEIC materials may be used to understand public test format. Their availability does not grant redistribution rights for individual questions or trademarks.

## Acceptable Source Categories

- Original project-authored content with author and reviewer records.
- Public-domain content with recorded evidence of status.
- Openly licensed content whose license permits the intended modification and distribution, with required attribution.
- Content used under explicit written permission with recorded scope and expiration.

Reject content with unknown provenance, incompatible licenses, missing attribution requirements, or terms that prohibit storage or redistribution.

## Required Provenance Record

Before production publication, each question or imported batch should record:

- source name, canonical URL, and source type;
- author/owner where known;
- license or permission basis and attribution text;
- retrieval date and evidence snapshot/reference;
- project author/editor and reviewer;
- review status, notes, and publication date;
- content hash or stable import identifier.

The current IELTS CSV lacks these fields. It may be used for demos and pipeline tests but must not be called official or verified IELTS content.

## Collection and Review Workflow

1. Record source and rights before drafting/import.
2. Normalize content into the project CSV/schema without discarding provenance.
3. Run structural validation and duplicate checks.
4. Review language quality, task fit, difficulty, timing, required assets, and harmful or sensitive content.
5. Approve or reject through a named reviewer; do not publish drafts by default.
6. Import with stable codes and retain the batch audit record.
7. Re-run review when content, source rights, or exam format changes.

## Mode-Specific Guidance

- IELTS: create original Part 1, cue-card, and Part 3 prompts aligned with the public speaking-test structure; avoid claims of official endorsement.
- TOEIC Speaking: create original tasks matching publicly described response formats; verify rights for any images, schedules, announcements, or other stimuli.
- General English: define learner level, communicative goal, role, and cultural context; avoid stereotypes and unsafe scenarios.

## Publication Gate

A batch is publishable only when required fields validate, codes/prompts are not duplicated, referenced modes/types/topics exist, required assets resolve, source rights are acceptable, human review is approved, and an import dry run succeeds.

Operational CSV instructions are in [Question bank](../architecture/question-bank.md). This policy is technical governance, not legal advice; public or commercial release requires qualified rights review.
