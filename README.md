# SkillCircle — Phase 1 (MVP)

A private, invite-only mobile app for cohort-based skill teaching in 30-day daily reports.

## What's included in this Phase 1 scaffold

- Invite-only auth (magic link, gated by an `invites` table)
- **Add Skill** screen (Teacher creates a 30+ day course)
- **My Reports** screen (Teacher submits nightly report + optional docx/pdf/image attachment)
- **Admin Approval Queue** (Developer approves/rejects each report)
- **Skill Catalog + Detail** screen (Learner browses, enrolls, views approved reports sequentially, sees final tips after completion)
- **Profile** screen (personal stats, sign out, link to admin queue if you're the Developer)
- Full Postgres schema with **Row Level Security** enforcing the "locked until approved" rule at the database level

Not yet built (Phase 2/3 — see the main plan doc): the 6PM–12AM every-2hr push notification cron, leave/strike tracking, streak heatmap, badges, comments.

## 1. Set up Supabase (free tier)

1. Create a project at supabase.com
2. In the SQL Editor, run `supabase/schema.sql` — this creates all tables, RLS policies, and the auto-profile trigger
3. Then run `supabase/storage-setup.sql` — sets up the private bucket for report attachments
4. Go to Project Settings → API, copy your **Project URL** and **anon public key**

## 2. Configure the app

```bash
cp .env.example .env
# paste your Supabase URL and anon key into .env
```

## 3. Install and run

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone to preview instantly (fastest way to test while building). Note: Expo Go has some native-module limits — for the real thing you'll eventually want a **development build** (see below), especially once push notifications are added in Phase 2.

## 4. Invite your first people (including yourself)

In the Supabase Table Editor, add a row to `invites`:

```
email: you@example.com
```

Then open the app and sign in with that email — you'll get a magic link. After your first login, promote yourself to Developer:

```sql
update public.users set is_developer = true where email = 'you@example.com';
```

Repeat the `invites` insert for each friend you want in the group.

## 5. Building a real installable app (private, no store)

When you're ready to get this onto phones properly instead of Expo Go:

```bash
npm install -g eas-cli
eas login
eas build --profile internal --platform android   # free, no Apple account needed
eas build --profile internal --platform ios        # needs a $99/yr Apple Developer account
```

This gives you a shareable install link — no Play Store or App Store listing, since `eas.json` is already configured for `internal` distribution.

## Project structure

```
app/
  (auth)/login.tsx        - invite-gated magic link login
  (tabs)/
    index.tsx             - skill catalog
    add-skill.tsx          - teacher creates a course
    my-reports.tsx          - teacher submits nightly report
    profile.tsx             - personal dashboard
  skill/[id].tsx          - learner enroll + sequential viewing
  admin/approvals.tsx     - developer approval queue
lib/supabase.ts           - Supabase client
supabase/schema.sql       - full DB schema + RLS
supabase/storage-setup.sql - attachment storage bucket + policies
```
