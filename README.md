# Point of Order

A two-player timed debate game. Pick a motion, argue against a chess clock
(5:00 a side by default), then Claude adjudicates: who won, why, and each
side's strong and weak points with a score out of 10.

Play it **one screen** (hot-seat, pass the laptop) or **two devices** (each
player on their own screen — see [§6](#6-two-device-play-online-rooms)).

- **Frontend** — `public/index.html`, one self-contained file, no build step.
- **Backend**
  - `api/judge.js` — holds your Anthropic API key, calls Claude for the
    verdict. The key never reaches the browser.
  - `api/room.js` + `lib/redis.js` — the online-room sync for two-device
    play. Only used if you set up Redis (§7); the rest of the game works
    without it.

---

## 1. What you need

| Thing | Where | Notes |
|---|---|---|
| Node 18+ | https://nodejs.org | for local dev only |
| Anthropic API key | https://console.anthropic.com → API Keys | **separate from a Claude.ai subscription** — it's prepaid credit |
| GitHub account | https://github.com | to store the code |
| Vercel account | https://vercel.com | free "Hobby" plan is enough; sign in with GitHub |

On the Anthropic console, add some credit under **Billing** (start with $5).
Each verdict costs roughly **2–4 cents** on the default model.

---

## 2. Run it locally

```bash
npm install
npm install -g vercel      # the Vercel CLI, one time
cp .env.example .env        # then paste your real key into .env
npm run dev                 # starts http://localhost:3000
```

`npm run dev` runs `vercel dev`, which serves `public/` and runs
`api/judge.js` together. The first run asks you to link a Vercel project —
answer the prompts (create a new one).

---

## 3. Deploy it

1. **Put the code on GitHub.**
   ```bash
   git init
   git add .
   git commit -m "Point of Order"
   git branch -M main
   git remote add origin https://github.com/<you>/point-of-order.git
   git push -u origin main
   ```

2. **Import it on Vercel.** vercel.com → **Add New… → Project** → pick the
   repo → **Deploy**. No settings to change; Vercel detects `public/` and
   `api/` on its own.

3. **Add your API key.** Project → **Settings → Environment Variables**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-…` key
   - Environments: Production, Preview, Development
   Then **Deployments → … → Redeploy** so the new variable takes effect.

4. Open the `…vercel.app` URL and send it to your friends.

To ship later changes: `git push` — Vercel redeploys automatically.

---

## 4. Knobs

**Model / cost** — top of `api/judge.js`:

```js
const MODEL  = "claude-sonnet-5";  // haiku-4-5 (~$0.005) · sonnet-5 (~$0.02) · opus-5 (~$0.06)
const EFFORT = "medium";           // low | medium | high | xhigh | max
```

Change, commit, push.

**Time per speaker** — the buttons on the setup screen (5:00 / 10:00 / 15:00).
To change the options, edit the `.seg` buttons and their `data-secs` values in
`public/index.html` (two places: `#lengthSeg` and `#lobbyLengthSeg`) and the
matching `PER_SECS` array in `lib/room-logic.js` — the online API rejects any
value not in that list.

**Motions** — the `MOTIONS` array near the top of the `<script>` in
`public/index.html`.

---

## 5. Before you share it widely

`api/judge.js` has a simple built-in rate limit (30 verdicts per IP per 10
minutes). It resets whenever the function cold-starts, so it slows abuse but
doesn't hard-stop it. If the link goes anywhere public and you want a firm
cap, add a durable limiter — [Upstash Ratelimit](https://github.com/upstash/ratelimit-js)
with Vercel's KV integration is the usual choice — or put
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) in front
of the judge call.

Watch spend on the Anthropic console; set a monthly budget limit there too.

---

## 6. Two-device play (online rooms)

Each player on their own laptop/phone, in the same debate. One person makes a
room, the other joins with a 4-letter code (or the invite link). The clock,
the turns, and the transcript stay in sync; either side can end the debate,
and the host's browser fetches the verdict for both.

It needs one extra thing: somewhere to keep the shared room state. This uses
**Upstash Redis**, which has a free tier and a one-click Vercel integration.

### Set it up on Vercel

1. **Add the Redis store.** Vercel dashboard → your project → **Storage** →
   **Create Database** → **Upstash for Redis** (Marketplace) → pick a region
   near you → **Connect** to the project.
   Vercel now injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   into the deployment automatically.
2. **Redeploy** (Deployments → … → Redeploy) so the function picks up the new
   variables.
3. Open your `…vercel.app` URL, click **Two devices**, enter a name, and
   **Create a room**. Send the other player the **invite link** (the "Copy
   invite link" button) or just the 4-letter code.

That's the link to share:

```
https://<your-project>.vercel.app/?room=ABCD
```

Opening it drops your friend straight onto the join screen with the code
filled in — they type a name and hit **Join room**.

### Trying it locally first (`vercel dev`)

```bash
vercel env pull          # writes .env.local with the Upstash vars
npm run dev               # http://localhost:3000
```

`localhost` only works on your own machine. To let a friend test against your
local server, expose it with a tunnel, e.g. `npx localtunnel --port 3000` or
`cloudflared tunnel --url http://localhost:3000`, and share that URL with
`?room=CODE` on the end. Deploying is simpler once it works.

### If Redis isn't configured

"Two devices" shows a "not set up yet" message and one-screen play is
unaffected. Rooms auto-expire after 6 idle hours. Polling is light (about one
request every 2 seconds per player), so a couple of friends testing stays
well inside the Upstash free tier.

---

## 7. Not included (yet)

- **Spectators.** A dropped player can rejoin the same room (same browser)
  while the debate is paused, but there's no third seat to watch from.
- **True realtime.** Sync is short-polling, not websockets — fine for a
  turn-based game, not for anything twitchy.
