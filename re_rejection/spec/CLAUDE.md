# Re-Rejection — MVP Spec

## 1. Overview

**Re-Rejection** is a personal tracker for job seekers who receive rejection
letters or emails. Instead of letting each rejection disappear into an
inbox, users log it — by uploading a screenshot, pasting the message text,
or typing it in manually — and Re-Rejection keeps a running record. The MVP
goal is threefold: make
logging a rejection effortless, show the user a simple dashboard of how many
companies have turned them down, and offer a small dose of emotional support
along the way so the process feels less isolating.

## 2. Tech Stack

- **Framework**: Next.js 16.3.5 (App Router), React 19, TypeScript (strict),
  Tailwind CSS v4 — the existing scaffold, reused as-is.
- **Backend**: Supabase —
  - **Postgres** for data (the `rejections` table).
  - **Supabase Auth** for accounts: email/password + Google OAuth, with
    email verification **enabled** (Supabase's default kept on).
  - **Supabase Storage** for rejection screenshots.
- **OCR**: a single multimodal LLM API call (a vision-capable model) that
  returns structured JSON (`company`, `position`, `date`, `raw_text`) in one
  request, rather than a dedicated OCR service plus a separate parsing pass.
  The call happens server-side only — the API key never reaches the client.
- **New dependencies**: `@supabase/supabase-js`, `@supabase/ssr`, `zod`.
  No form library — native `<form>` + Server Actions + `useActionState`
  covers validation/pending/error states per Next 16's own guides. No i18n
  library (content is English-only for MVP). No charting library (the
  dashboard stays numbers and lists, not charts).

## 3. Data Model

Supabase Auth owns `auth.users`; we don't model users ourselves.

### Table: `rejections`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` FK → `auth.users.id`, not null | drives RLS |
| `company_name` | `text`, not null | required in all entry flows |
| `position` | `text`, nullable | not always present |
| `rejection_date` | `date`, nullable | `null` = "date unknown"; excluded from time-bucketed dashboard stats but still counted in the total |
| `source_type` | `text` (check `in ('manual','pasted_text','screenshot')`), not null | |
| `raw_text` | `text`, nullable | pasted text, or OCR-extracted text for screenshots |
| `screenshot_path` | `text`, nullable | Supabase Storage object path, private bucket, resolved via short-TTL signed URLs |
| `ocr_edited` | `boolean`, default `false` | whether the user changed an OCR-suggested field before saving — simpler than a numeric confidence score, which is vendor-shape-dependent |
| `notes` | `text`, nullable | optional free text |
| `created_at` | `timestamptz`, default `now()` | |
| `updated_at` | `timestamptz`, default `now()` | bumped on edit |

### Storage

Private bucket `rejection-screenshots`, path convention
`{user_id}/{rejection_id}/{filename}`.

### Row-Level Security

- Enable RLS on `rejections`. Policy: `user_id = auth.uid()` for
  SELECT/INSERT/UPDATE/DELETE, with a `WITH CHECK` on INSERT so a user can't
  write rows claiming another user's id.
- Storage RLS mirrors this: `(storage.foldername(name))[1] = auth.uid()::text`.
- The Supabase service-role key (if the OCR call needs elevated access)
  stays server-side only — never shipped to the client bundle.

## 4. Route / Page Structure

```
app/
  page.tsx                    # landing, or redirect to /dashboard if authed
  layout.tsx, globals.css     # existing scaffold, reused

  (auth)/
    login/page.tsx            # email/password + "Continue with Google"
    signup/page.tsx           # email/password signup
    actions.ts                # 'use server': signIn, signUp, signInWithGoogle, signOut
    auth-callback/route.ts    # Route Handler — exchanges OAuth code for session

  dashboard/page.tsx          # protected: stats snapshot

  rejections/
    page.tsx                  # protected: full history list
    new/
      page.tsx                # entry method tabs: manual / paste / screenshot
      actions.ts               # createRejectionManual, createRejectionFromText,
                                # extractFromScreenshot, confirmOcrRejection
    [id]/page.tsx              # detail / edit
    actions.ts                 # updateRejection, deleteRejection

lib/
  supabase/{client,server,middleware}.ts
  ocr.ts                       # OCR API call + JSON parsing
  content/encouragement.ts     # static quote/milestone bank

middleware.ts                  # refresh Supabase session, redirect unauthed users from protected routes
```

### Implementation notes

Next.js 16 has breaking changes relative to older training data/docs — check
`node_modules/next/dist/docs/01-app/02-guides/forms.md` and
`server-actions.md` before implementing. Key points already known:

- Every Server Action must re-check `supabase.auth.getUser()` itself — a
  protected page's UI is not an access boundary; actions are reachable
  directly.
- File upload via `<input type="file">` inside a Server Action form works
  directly (`formData.get(...)` returns a `File`). The default Server Action
  body size limit is 1MB — raise it via
  `experimental.serverActions.bodySizeLimit` (e.g. `'8mb'`) in
  `next.config.ts` so real screenshots fit.
- The OAuth callback must be a **Route Handler** (`route.ts`), not a page —
  it handles a GET redirect from Supabase, not a form submission.

## 5. Core User Flows

- **Manual entry**: form (company required; position, date, notes optional)
  → `createRejectionManual` → insert with `source_type='manual'` →
  revalidate dashboard + list → show an encouragement message → redirect to
  dashboard.
- **Paste text**: textarea for the raw email body, plus the same optional
  manual fields alongside it → `createRejectionFromText` → insert with
  `source_type='pasted_text'` and `raw_text` set. Auto-parsing the pasted
  text into fields is a nice-to-have, **not required for MVP**.
- **Screenshot + OCR**: upload image → `extractFromScreenshot` server action
  calls the OCR/vision API and returns `{ rawText, guesses }` **without
  saving anything yet** (no Storage upload or DB insert at this step, to
  avoid orphaned files if the user abandons the flow) → client shows an
  editable confirm step (pre-filled but editable company/position/date
  fields, raw OCR text for reference, thumbnail) → on save, the file is
  resubmitted together with the (possibly edited) fields to
  `confirmOcrRejection`, which uploads to Storage and inserts the row in one
  step, setting `ocr_edited` based on whether any field was changed from the
  OCR suggestion.
- **View dashboard**: `/dashboard` Server Component fetches the user's rows
  (RLS-scoped) and computes stats server-side.
- **Sign up / log in**: email/password via `supabase.auth.signUp` /
  `signInWithPassword`; Google via `signInWithOAuth`. Email verification
  stays **on** — the user confirms via email before first login.

## 6. Dashboard (MVP scope — keep minimal)

- Total rejection count, prominent.
- Reverse-chronological list of the last 5–10 rejections, linking to detail,
  with a "view all" link to `/rejections`.
- Simple count-by-time-period (e.g. "X this month", "X this week") computed
  from non-null `rejection_date` values — plain numbers, no charting library.
- A milestone banner/toast when the just-saved rejection hits a threshold
  (see §7), shown once after save, not a persistent dashboard fixture.
- `/rejections` is the separate, full history view.

## 7. Emotional Support Content

Stored as a static TypeScript array (`lib/content/encouragement.ts`), not a
DB table — this is curated editorial copy, not user data, so a code file is
simpler than adding a content-management surface for MVP.

```ts
type EncouragementMessage = {
  id: string;
  trigger: 'random' | 'milestone';
  milestoneCount?: number; // only when trigger === 'milestone'
  text: string;
};
```

Milestone thresholds: `[1, 5, 10, 25, 50, 100]`. Logic (run right after
insert, inside the Server Action): fetch the user's new total count → if it
matches a threshold, show that milestone's message; otherwise show a random
pick from the `random` pool. No need to persist which message was shown.

### Starter copy (English only, per the MVP language decision)

1. *(random)* "One no closer to the right yes. Logged."
2. *(random)* "This one wasn't it. That's data, not a verdict on you."
3. *(random)* "Rejected, not defeated. On to the next one."
4. *(milestone, 1)* "Your first logged rejection. Everyone doing this has
   one — now you've got a system, not just a feeling."
5. *(milestone, 5)* "Five rejections in. You're showing up more than most
   people ever do."
6. *(milestone, 10)* "Ten. You're already tougher than most people who
   never sent the application at all."
7. *(milestone, 25)* "Twenty-five. Very few people keep going this long —
   your persistence is the skill here."
8. *(milestone, 50)* "Fifty rejections tracked. At this point the process
   has taught you more than most jobs would have in the same time."

## 8. Explicitly Out of Scope for MVP (future ideas)

- **"Anger release" / catharsis feature** (vent text + shred/smash
  animation) — discussed and deliberately deferred; noted only as a future
  idea, no design depth here.
- Charts / advanced analytics (trend lines, industry breakdowns, response
  funnels, time-to-rejection metrics).
- Notifications / reminders.
- Social or sharing features (public profiles, leaderboards).
- Multi-language UI / full i18n.
- Bulk import (e.g. scanning an inbox for multiple rejections at once).
- Admin-editable / CMS-backed encouragement content.
- Data export (CSV/PDF).
- Tracking non-rejection states (interviews, offers) — this app is scoped to
  rejections only.
