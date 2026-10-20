# How to put the Office Ideas Board online

This guide is for people who are **new to coding and hosting**.  
It explains **where** the app should live, **how** to put it there, and **how** everyone in the office opens it.

You do **not** need to understand every technical word. Follow the steps in order.

---

## 1. What you are deploying (plain English)

The Ideas Board is a **website**.

- One address (URL) serves two views:
  - **TV screen:** `…/display` — big board with Ideas and Challenges
  - **Phones:** `…/` — list, details (with names), upvotes, and “Add”

Names are **hidden on the TV**. They show only when someone opens an idea on their phone (after scanning the QR code).

Data can live in:

| Mode | When | Where ideas are stored |
|------|------|------------------------|
| **Mock** | Testing on your laptop | A file on the computer (`data/store.json`) |
| **Google Sheets** | Real office use | A Google Spreadsheet your company already uses |

For the office, use **Google Sheets**.

---

## 2. Where it needs to be deployed

### Why not only on your laptop?

If the site only runs on your laptop:

- The TV cannot open it unless it is the same machine
- Phones cannot scan a QR code that points to `127.0.0.1` (that address means “this phone itself,” not your laptop)

So you need the website on a **server that phones and the TV can reach**.

### Best option for beginners: Vercel

**Vercel** hosts Next.js apps (this project) for free at a small scale and gives you a public HTTPS link like:

`https://office-ideas-board.vercel.app`

That link works from:

- The office TV (Wi‑Fi)
- Anyone’s phone (Wi‑Fi or mobile data)

**Recommended:** deploy on **Vercel**, store ideas in **Google Sheets**.

### Other options (optional later)

| Option | Good for | Notes |
|--------|----------|--------|
| Vercel / Netlify / similar | Beginners | Easiest; public URL |
| Company internal server | IT-managed offices | Ask IT for a URL on the company network |
| Always-on office PC | Temporary demos | Must stay on; URL is the PC’s IP — phones must be on same Wi‑Fi |

This guide focuses on **Vercel**.

---

## 3. What you need before deploying

Checklist:

1. A **GitHub** (or GitLab) account — or use the Cursor “Create repo” flow if you have not published the project yet  
2. A **Vercel** account (sign up with GitHub is easiest): [https://vercel.com](https://vercel.com)  
3. A **Google** account that can create a Sheet and a Google Cloud project  
4. About 30–60 minutes the first time  

You do **not** need to buy a server or configure Docker for this path.

---

## 4. Deploy on Vercel (step by step)

### Step A — Put the code on GitHub

1. Create a repository for this project (if you do not have one yet).  
2. Push the code to that repository (Cursor can help; or use GitHub Desktop if you prefer a GUI).  
3. Confirm you can see the project files on github.com (including `README.md` and `package.json`).

### Step B — Import the project in Vercel

1. Open [https://vercel.com](https://vercel.com) and sign in.  
2. Click **Add New… → Project**.  
3. **Import** your GitHub repository.  
4. Leave the defaults for a Next.js app:
   - Framework: Next.js  
   - Build command: `next build` (default)  
   - Output: default  
5. **Do not** click Deploy yet if you still need Google Sheets — first add environment variables (next section).  
   If you deploy without Google vars, the app still runs in **mock mode** (fine for a first test; ideas will not persist in Sheets).

### Step C — Add environment variables in Vercel

In the Vercel project: **Settings → Environment Variables**.

Add these (create them after you finish Google Sheets setup in section 5):

| Name | What to paste | Required for Sheets? |
|------|----------------|----------------------|
| `GOOGLE_SHEET_ID` | The long ID from the Sheet URL | Yes |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `…@….iam.gserviceaccount.com` from the JSON key | Yes |
| `GOOGLE_PRIVATE_KEY` | The full `private_key` from the JSON key, including `-----BEGIN…` and `-----END…` | Yes |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://your-app.vercel.app` | Strongly recommended |

Tips for `GOOGLE_PRIVATE_KEY`:

- Paste the key **exactly** as in the JSON file.  
- Keep the `\n` characters if they appear as text, **or** paste a real multi-line key — both usually work.  
- If Vercel rejects weird characters, wrap the whole value in double quotes in the Vercel UI if the UI allows it.

Apply variables to **Production** (and Preview if you want).

### Step D — Deploy

1. Click **Deploy** (or **Redeploy** after adding env vars).  
2. Wait until the build shows **Ready**.  
3. Open the URL Vercel gives you.

First check:

- `https://YOUR-APP.vercel.app/` → phone-style list  
- `https://YOUR-APP.vercel.app/display` → TV board  

If those pages load, deployment worked.

### Step E — Set the QR URL and redeploy

1. Copy your real Vercel URL.  
2. Set `NEXT_PUBLIC_APP_URL` to that exact URL (no trailing slash).  
3. **Redeploy** (important: this variable is baked in at build time).  

After redeploy, the QR on `/display` should open the same site on phones.

---

## 5. Connect Google Sheets (so ideas are shared)

Do this once, then point Vercel at the Sheet.

### 5.1 Create the spreadsheet

1. Open [Google Sheets](https://sheets.google.com) and create a blank spreadsheet.  
2. Rename the first tab to exactly: `items`  
3. In row 1 of `items`, put these headers in columns A–H (one per column):

```text
id | type | title | details | submitter_name | votes | created_at | status
```

4. Add a second tab named exactly: `vote_receipts`  
5. In row 1 of `vote_receipts`:

```text
item_id | voter_token | created_at
```

6. From the browser address bar, copy the **Sheet ID**:

```text
https://docs.google.com/spreadsheets/d/ THIS_PART_IS_THE_ID /edit
```

That ID is `GOOGLE_SHEET_ID`.

### 5.2 Create a service account (a robot Google user)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).  
2. Create a project (or pick an existing one).  
3. Search for **Google Sheets API** → **Enable**.  
4. Go to **IAM & Admin → Service Accounts → Create service account**.  
5. Give it a name like `ideas-board`.  
6. Create a **JSON key** and download the file. Keep it private (like a password).  
7. From the JSON file, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`  
   - `private_key` → `GOOGLE_PRIVATE_KEY`

### 5.3 Share the Sheet with the robot

1. Open your spreadsheet.  
2. Click **Share**.  
3. Paste the service account email (`…@….iam.gserviceaccount.com`).  
4. Give it **Editor** access.  
5. Send / Done.

Without this share, the website cannot read or write the Sheet.

### 5.4 Add the three Google variables in Vercel and redeploy

Then open the phone UI and add a test idea.  
Confirm a new row appears in the `items` tab of your Sheet.

---

## 6. How to access it in the office

### TV (always on)

1. Open the TV’s browser (Chrome, Edge, etc.).  
2. Go to: `https://YOUR-APP.vercel.app/display`  
3. Make the browser **fullscreen** (F11 on many PCs, or the TV browser’s fullscreen option).  
4. Leave it on that page. It refreshes about every **15 seconds**.  
5. You should see:
   - Two columns: **Ideas** and **Challenges**  
   - Vote numbers  
   - A **QR code** on the side  
   - **No people’s names** on this screen  

Bookmark this URL on the TV so anyone can reopen it after a restart.

### Phones (everyone)

**Easiest:** scan the QR code on the TV.

That opens the phone home page. From there people can:

- Browse ideas and challenges  
- Open one to see **full details and the submitter’s name**  
- Upvote (once per idea per phone browser)  
- Tap **Add** to submit a new idea or challenge  

They can also type the URL manually: `https://YOUR-APP.vercel.app/`

### Admins / power users

- Edit or hide items in the **Google Sheet** (`status` = `hidden` to remove from the board).  
- Use lowercase for `type` (`idea` / `challenge`) and `status` (`active` / `hidden`) if you add rows by hand.

---

## 7. Simple architecture diagram

```text
  Office TV browser                  People's phones
  /display  (big board + QR)         /  (list, details, upvote, add)
           \                        /
            \                      /
             v                    v
              Your Vercel website
                       |
                       v
                 Google Sheet
              (source of truth)
```

---

## 8. Troubleshooting (common beginner issues)

| Problem | Likely cause | What to try |
|---------|--------------|-------------|
| Site works but Sheet stays empty | Google env vars missing or Sheet not shared | Check Vercel env vars; share Sheet with service account as Editor; redeploy |
| QR opens a blank / wrong page | `NEXT_PUBLIC_APP_URL` wrong or not redeployed | Set the exact Vercel HTTPS URL; redeploy |
| TV shows old ideas | Browser cache or API error | Refresh the page; check Vercel deployment logs |
| “Can’t reach the board” on TV | Temporary network/API issue | Wait; the TV keeps the last good data and retries |
| Names visible on TV | Should not happen | Confirm you are on `/display`, not `/` |
| Phone cannot upvote twice on same idea | By design | One upvote per idea per browser; other ideas still work |

---

## 9. Security basics (please read)

- Treat the service account JSON key like a **password**. Do not commit it to GitHub.  
- Put secrets only in **Vercel Environment Variables**, not in the README or chat screenshots.  
- The phone site has **no login** in this version. Anyone with the link can read details and upvote. That is fine for many offices; if you need stricter access later, ask for a follow-up (e.g. company SSO).

---

## 10. Quick “day one” checklist

- [ ] Code is on GitHub  
- [ ] Vercel project imported and deployed  
- [ ] Google Sheet created with `items` + `vote_receipts` tabs  
- [ ] Service account created; Sheets API enabled  
- [ ] Sheet shared with service account (Editor)  
- [ ] Four env vars set in Vercel  
- [ ] Redeployed after setting `NEXT_PUBLIC_APP_URL`  
- [ ] TV opens `/display` fullscreen  
- [ ] Phone scans QR and can add + upvote  
- [ ] New idea appears as a row in the Sheet  

---

## 11. Need help from a developer later?

Point them at:

- [README.md](../README.md) — technical setup and scripts  
- [Design spec](./superpowers/specs/2026-10-20-office-ideas-board-design.md) — product decisions  
- This file — hosting and access for non-developers  

If you tell them “we deploy on Vercel and use Google Sheets,” they will know exactly where to look.
