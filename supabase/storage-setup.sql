-- ============================================================
-- Run AFTER schema.sql. Sets up the storage bucket for
-- day-report attachments (docx/pdf/images).
--
-- Easiest path: do this in the Supabase Dashboard instead of SQL:
-- Storage -> New bucket -> name: "report-attachments" -> Public: OFF
-- (kept private since this is a closed group; access happens through
-- the app's authenticated Supabase client which respects RLS).
--
-- If you prefer SQL, this does the same thing:
-- ============================================================

insert into storage.buckets (id, name, public)
values ('report-attachments', 'report-attachments', false)
on conflict (id) do nothing;

-- Only the report's teacher can upload into their own skill's folder;
-- anyone who can see the report row (per daily_reports RLS) can read it.
create policy "attachments_insert_own_skill"
on storage.objects for insert
with check (
  bucket_id = 'report-attachments'
  and exists (
    select 1 from public.skills s
    where s.id::text = (storage.foldername(name))[1]
      and s.teacher_id = auth.uid()
  )
);

create policy "attachments_select_if_report_visible"
on storage.objects for select
using (
  bucket_id = 'report-attachments'
  and (
    public.is_developer()
    or exists (
      select 1 from public.skills s
      where s.id::text = (storage.foldername(name))[1]
        and s.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.daily_reports r
      join public.skills s on s.id = r.skill_id
      where s.id::text = (storage.foldername(name))[1]
        and r.status = 'approved'
    )
  )
);
