# Office Ideas Board

A shared office ideas and challenges board: a **TV display** shows live vote counts (no submitter names), phones scan a **QR code** to browse, upvote, and submit new items. Data lives in **Google Sheets** in production, or a local JSON file in **mock mode** when Google credentials are not set.

## Quick start (mock mode)

No Google setup required — the app uses a local JSON store under `data/store.json`.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3456](http://127.0.0.1:3456) on a phone browser, or [http://127.0.0.1:3456/display](http://127.0.0.1:3456/display) on the office TV.

Run tests:

```bash
npm test
```

## Google Sheets setup

When all three Google env vars are set, the app uses Google Sheets as the source of truth instead of the mock store.

### 1. Create a spreadsheet

Create a Google Sheet with **two tabs**:

**Tab `items`** — header row (row 1) exactly:

```
id,type,title,details,submitter_name,votes,created_at,status
```

**Tab `vote_receipts`** — header row (row 1) exactly:

```
item_id,voter_token,created_at
```

You can add rows manually in the sheet or via the app’s submit form; the API appends new items.

### 2. Google Cloud service account

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project.
2. Enable the **Google Sheets API**.
3. Create a **service account** and download its JSON key.
4. From the key file, copy `client_email` and `private_key`.

### 3. Share the sheet

Share the spreadsheet with the service account email (from the JSON `client_email`) as **Editor**.

### 4. Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Description |
|----------|-------------|
| `GOOGLE_SHEET_ID` | Spreadsheet ID from the sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account `client_email` |
| `GOOGLE_PRIVATE_KEY` | Service account `private_key` (keep quotes; `\n` newlines are fine) |
| `NEXT_PUBLIC_APP_URL` | Public URL phones use to open the app (required for the QR code in production) |

Example for local dev:

```
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3456
```

Restart the dev server after changing env vars.

## Office TV setup

1. Deploy or run the app on a machine reachable on your network (or the internet).
2. Set `NEXT_PUBLIC_APP_URL` to the URL employees will use on their phones.
3. On the TV browser, open `/display` (e.g. `https://your-host/display`) and go **fullscreen**.
4. The board refreshes about every 15 seconds; the side panel shows a QR code linking to the phone UI.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **3456** |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run Vitest tests |
