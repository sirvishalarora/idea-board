# Office Ideas Board — Design Spec

**Date:** 2026-10-20  
**Status:** Approved for implementation planning  

## Goal

A continuously displayed office screen that shows Ideas and Challenges. Colleagues scan a QR code on their phone to read full details (including submitter name), upvote items, and submit new ones. Google Sheets is the source of truth.

## Decisions

| Topic | Choice |
|---|---|
| Storage | Google Sheets |
| TV name visibility | Hidden on TV; shown on phone detail via QR |
| Upvoting | One upvote per item per browser; many different items allowed |
| Submission | Phone form and direct Sheet edits (both) |
| TV layout | Two columns: Ideas \| Challenges |
| Approach | Next.js app + Google Sheets API, mock fallback without credentials |

## Architecture

```
Phone (QR) ──► Next.js app ──► Google Sheets
TV browser ──► /display     ──► same Sheets
```

- **Google Sheet** — source of truth for items and vote counts
- **`/display`** — office TV: two columns, vote counts, no names, persistent QR on the side
- **`/` (phone)** — browse, open details (with name), upvote, submit form
- Sheet edits appear on the board after the next refresh (~15s)

## Data model (Sheet columns)

One row per item:

| Column | Description |
|---|---|
| `id` | Stable unique id |
| `type` | `idea` or `challenge` |
| `title` | Short title shown on TV and phone |
| `details` | Full description (phone detail; TV may show a short blurb) |
| `submitter_name` | Contact name; phone only, never on TV |
| `votes` | Integer upvote count |
| `created_at` | ISO timestamp |
| `status` | `active` or `hidden` (moderation via Sheet) |

## Screens

### TV — `/display`

- Full-screen two columns: **Ideas** | **Challenges**
- Each row: title, short blurb (first ~120 characters of `details`), **vote count** (no submitter name)
- Sorted by votes descending within each column
- Fixed QR on the side linking to the phone home URL
- Auto-refresh about every 15 seconds
- Empty: “No ideas yet — scan the QR to add one”
- API failure: banner “Can’t reach the board — retrying…”; keep last good data when possible

### Phone — `/`

- List of active ideas and challenges with vote counts
- Tap item → detail page with full text + submitter name + upvote control
- Upvote once per item per browser (localStorage of voted ids + server-side voter token)
- “Add idea/challenge” form writes a new Sheet row (`status=active`, `votes=0`)
- Empty list: short prompt + Add button

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/items` | List active items (TV + phone) |
| `GET` | `/api/items/:id` | Full detail including submitter name |
| `POST` | `/api/items` | Create from phone form |
| `POST` | `/api/items/:id/upvote` | +1 if this browser has not voted that id |

### Vote rules

- One upvote **per item** **per browser**
- A browser may upvote many different ideas/challenges
- Client stores voted item ids in `localStorage`
- Server issues a lightweight voter token cookie; records `(item_id, voter_token)` so “already voted” survives refresh for that browser
- Vote **counts** live on the item row (`votes` column). Vote **receipts** live on a second Sheet tab `vote_receipts` (`item_id`, `voter_token`, `created_at`), or the equivalent in mock JSON

## Mock mode

If Google credentials / Sheet id are not configured, the app uses a local JSON file store (`data/store.json`) with the same API and UI. Production switches to Sheets via environment variables (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `NEXT_PUBLIC_APP_URL`).

## MVP scope

**In**

1. Next.js app: `/display`, phone home, detail, submit
2. Google Sheets integration + mock fallback
3. Upvote once per item per browser
4. QR on TV pointing at phone URL
5. README: create Sheet, share with service account, env vars, run locally

**Out of scope (v1)**

- Google sign-in
- Comments / discussion threads
- Notifications
- Confluence / Drive sync
- Dedicated moderation UI (use Sheet `status` column)

## Success criteria

- Office TV can stay on `/display` and stay readable
- Scanning the QR opens the phone experience without login
- New submissions (form or Sheet) appear on the TV within a refresh cycle
- Vote counts update on the TV; double-upvote of the same item from one browser is blocked
- App runs locally in mock mode without Google credentials
