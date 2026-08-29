alter table public.session_assessments
  add column assessment_mode varchar(20);

update public.session_assessments
set assessment_mode = 'IELTS'
where assessment_mode is null;

alter table public.session_assessments
  alter column estimated_band drop not null,
  alter column assessment_mode set not null,
  add constraint session_assessments_assessment_mode_check
    check (assessment_mode in ('IELTS', 'GENERAL')),
  add constraint session_assessments_mode_band_check
    check (
      (assessment_mode = 'IELTS' and estimated_band is not null)
      or (assessment_mode = 'GENERAL' and estimated_band is null)
    );
