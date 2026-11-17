# Made API: Developer Documentation

Source: https://www.made.app/developers (captured 2026-11-17)
Base URL: `https://www.made.app/api`
OpenAPI 3.1 spec: https://www.made.app/api/v1/openapi.json
Summary for AI assistants: https://www.made.app/llms.txt
Support: support@made.app

## Overview

One key runs 31 tools and 147 image, video and audio models (87 video, 51 image, 9 audio), on the same credits as the Made app. Each tool is one call, and the price is quoted in credits before it runs.

Example uses: face swap a photo or clip, recast a video, erase a person from it, cut out a background, relight a portrait, swap an outfit.

Run any tool with: `POST /v1/tools/{id}/run`

Featured tools: `face-swap`, `video-face-swap`, `recast-video`, `video-object-remover`, `background-remover`, `relight`, `style-snap` (Outfit Swap).

Related pages:
- API keys: https://www.made.app/account/api-keys
- Billing (add credits): https://www.made.app/billing
- Playground: https://www.made.app/playground (its API tab writes the request for your settings)
- Price sheet: https://www.made.app/price-sheet

---

## Quickstart

### 1. Create a key
- Make one in Account → API keys. The secret is shown **once**.
- Send it as a bearer token **from your server, never from a browser**.
- Keys belong to your account and can be revoked any time.

```
Authorization: Bearer made_sk_…
```

### 2. Check credits
Every run spends credits from your Made balance. Credits come with a plan, roll over month to month, and more can be added on Billing.

```js
// Node 18+
const response = await fetch('https://www.made.app/api/v1/balance', {
  headers: { Authorization: `Bearer ${process.env.MADE_API_KEY}` },
});
const { balanceCredits } = await response.json();
console.log(`${balanceCredits} credits`);
```

### 3. Run something (quote, run at that price, poll)

```js
// Node 18+. Quote an image, make it, wait for it.
import { randomUUID } from 'node:crypto';

const base = 'https://www.made.app/api';
const headers = {
  Authorization: `Bearer ${process.env.MADE_API_KEY}`,
  'Content-Type': 'application/json',
};

async function api(path, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

const input = {
  model: 'nano_banana_2',
  prompt: 'A red kite over a wheat field at golden hour',
  aspect_ratio: '16:9',
};

// 1. Quote it. Free: no job, no charge.
const { cost } = await api('/v1/cost', input);
console.log(`Costs ${cost.credits} credits`);

// 2. Run it at that price. A retry with the same request_id gets the same job.
let job = await api('/v1/generations', {
  ...input,
  request_id: randomUUID(),
  max_cost_cents: cost.customerCostCents,
});

// 3. Poll until it's done.
while (!['succeeded', 'failed', 'canceled'].includes(job.status)) {
  await new Promise(resolve => setTimeout(resolve, 3000));
  job = await api(`/v1/generations/${job.id}`);
}
console.log(job.status === 'succeeded' ? job.result.assets[0].url : job.error);
```

(The page also shows Python and cURL versions of each example.)

---

## Tools

A tool is a finished edit: you send photos or clips, and Made picks the model and writes the prompt.

`GET /v1/tools` lists every tool with its slots (the media it takes), its settings and the JSON schema of its body. No key needed.

### Video tools

| Tool | id | What it does |
|---|---|---|
| Video Face Swap | `video-face-swap` | Put the face from a photo onto the person in a clip. |
| Recast Video | `recast-video` | Recast a whole clip as the person in a still. Recast step 3. |
| Video Object Remover | `video-object-remover` | Erase a person, a crowd or an object from a clip. |
| Video Object Replacement | `video-object-replacement` | Swap a product, outfit, character or setting in a clip. |
| Motion Transfer | `motion-transfer` | Make the person in a photo perform any clip's moves. |
| Video Background Remover | `video-background-remover` | Remove a video's background, or put a color behind it. |
| Extend Video | `video-extend` | Continue a clip from its last frame. |
| Transitions | `transitions` | A video that moves from a first frame to a last frame. |
| Effects | `effects` | Turn a photo into a short effect video. |
| Behind the Scenes | `behind-the-scenes` | A vertical video that pulls back to reveal a film set. |

### Photo tools

| Tool | id | What it does |
|---|---|---|
| Face Swap | `face-swap` | Put the face from one photo on the person in another. |
| Background Remover | `background-remover` | A transparent PNG cut-out of the subject. |
| Relight | `relight` | Change a photo's light: direction, softness, color, brightness. |
| Outfit Swap | `style-snap` | Dress the person in one photo in the outfit from another. |
| Object Remover | `object-remover` | Erase a named object or person from a photo. |
| Text Remover | `text-remover` | Erase captions, watermarks and signs from a photo. |
| Character Swap | `character-swap` | Put a character into another photo in place of its person. |
| Character | `character` | A new scene with the same person, from one photo. |
| Angles | `angles` | Re-photograph a subject from a new camera angle. |
| Zooms | `zooms` | Reframe a photo closer or wider. |
| AI Stylist | `ai-stylist` | Restyle a person with outfit, background and pose choices. |
| Style Reference | `image-reference` | Restyle a photo with another image's look. |
| Skin Enhancer | `skin-enhancer` | Refine skin in a portrait, keeping texture and identity. |
| Unblur | `unblur` | Sharpen a blurry photo and restore faces. |
| Photo Colorizer | `photo-colorizer` | Colorize a black-and-white photo. |
| Image Resizer | `image-resizer` | Resize to exact pixels. **Free, no AI.** |
| Image Compressor | `image-compressor` | Compress to a file size. **Free, no AI.** |
| Image Converter | `image-converter` | Convert to JPG, PNG, WebP or AVIF. **Free, no AI.** |
| Video Frame | `video-frame` | Grab one frame of a clip as a JPEG. **Free.** Recast step 1. |
| Motion Still | `motion-still` | Put a person into the first frame of a move. |
| Recast Still | `recast-still` | Turn the person in a frame into someone else. Recast step 2. |

### Running a tool (four steps)

Slots take media you uploaded (`media_…` ids), the output of an earlier job (`job_…` ids) or a saved character (`ref_…` ids). **Not URLs.**

1. **Upload each file:**
   - `POST /v1/media` with its `content_type`
   - `PUT` the bytes to `upload.url` with `upload.headers`
   - `POST /v1/media/{id}/confirm`
   - Accepted: JPEG, PNG, WebP, MP4, WebM, MOV, MP3, WAV. Max 200 MB each.
2. **Quote:** `POST /v1/tools/{id}/quote` with body `{ media, settings }`. Free.
3. **Run:** `POST /v1/tools/{id}/run` with the same body plus `request_id` and `max_cost_cents` (from the quote).
4. **Poll:** `GET /v1/generations/{id}` until it succeeds. Files are in `result.assets[].url`.

```js
// Node 18+. Face Swap: upload two photos, quote, run, wait.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const base = 'https://www.made.app/api';
const auth = { Authorization: `Bearer ${process.env.MADE_API_KEY}` };

async function api(path, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...auth, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// 1. Upload each photo: reserve it, PUT the bytes, confirm.
async function upload(file, contentType) {
  const { media, upload } = await api('/v1/media', { content_type: contentType, filename: file });
  const put = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: await readFile(file) });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
  await api(`/v1/media/${media.id}/confirm`, {});
  return media.id;
}

const input = {
  media: {
    image: await upload('photo.jpg', 'image/jpeg'), // the photo
    face: await upload('face.jpg', 'image/jpeg'),   // the face to put in it
  },
  settings: {},
};

// 2. Quote it for free, then run it at that price.
const quote = await api('/v1/tools/face-swap/quote', input);
console.log(`Costs ${quote.credits} credits`);
let job = await api('/v1/tools/face-swap/run', {
  ...input,
  request_id: randomUUID(),
  max_cost_cents: quote.costCents,
});

// 3. Poll until it's done.
while (!['succeeded', 'failed', 'canceled'].includes(job.status)) {
  await new Promise(resolve => setTimeout(resolve, 3000));
  job = await api(`/v1/generations/${job.id}`);
}
console.log(job.status === 'succeeded' ? job.result.assets[0].url : job.error);
```

### Recast (three tools in a row)
1. `video-frame`: take the clip's first frame.
2. `recast-still`: turn the person in that frame into someone else.
3. `recast-video`: recast the whole clip as that person.

Pass each job's id to the next one's slot.

---

## Models

147 models: 87 video, 51 image, 9 audio. `GET /v1/models` lists each with what it takes (durations, aspect ratios, sizes, resolutions, media roles) and its price. No key needed. Filter with `?kind=image|video|audio` or `?query=`.

Model ids are snake_case, e.g. `nano_banana_2`, `kling_3_pro`.

A model run is the quickstart's third step:
1. `POST /v1/cost` for the price.
2. `POST /v1/generations` to start it (returns 202 with a job).
3. `GET /v1/generations/{id}` until status is `succeeded`, `failed` or `canceled`.

Anything in a model's `allowedParams` goes in `params`.

### Reference media
Image-to-video, edit and reference models take `medias`: an array of `{ value, role }`.
- `value` is an https URL, an uploaded `media_…` id, a `job_…` id or a saved `ref_…` id.
- A model's `mediaRoles` lists the roles it takes; `requiredMedia` lists the ones it needs.

```json
{
  "model": "kling_3_pro_i2v",
  "prompt": "slow push-in, soft morning light",
  "duration": 5,
  "medias": [{ "value": "https://example.com/product.jpg", "role": "start_image" }]
}
```

### Resolution and audio tiers
- Where a model is billed by output resolution, its catalog entry carries `costPerSecondByResolution` and the request takes `resolution` with that exact tier name.
- Models that price sound carry `audioPricing` and take `audio: true|false`.
- Leave either out for the default tier.
- An undeclared tier is refused with 400, never re-priced. `/v1/cost` quotes the tier you asked for.

```json
{ "model": "wan_3", "prompt": "…", "duration": 5, "resolution": "480p" }
{ "model": "kling_3_pro", "prompt": "…", "duration": 5, "audio": false }
```

### Characters
Star up to **three** saved characters with `characters: ["ref_…"]` on any model that takes reference images. Their pictures go first, and the prompt keeps each one as they look. Characters are made and saved in Made, in the AI Influencer tool or over MCP. `GET /v1/creators` lists yours with their `ref_…` ids.

```json
{
  "model": "nano_banana_2",
  "prompt": "She toasts the camera at a rooftop party, flash photo",
  "characters": ["ref_…"]
}
```

---

## Safe retries and spending caps

Send both with every run. **Tools require them.**

- **`request_id`**: your own id for this submission, 8 to 128 letters, digits, `_` or `-`.
  - If a response is lost, send the same body with the same id and you get the same job back, charged once.
  - Same id with a different body is refused with 409.
  - A run refused with 400 or 402 made nothing, so its id is free to reuse once fixed.
- **`max_cost_cents`**: the price you approved, in cents (the quote's `customerCostCents`, or `costCents` for a tool).
  - It holds the provider the job was quoted on. If that price moved past it, the API answers 409 before any credits move. Quote again.
  - If the provider the job was quoted on fails, Made moves the job to the next compatible provider and charges that provider's price, which **can be more than `max_cost_cents`**. Your balance has to cover it.
  - To have the job fail and be refunded instead, send the header `X-MADE-Backup-Pricing: cap`.

```json
{
  "model": "kling_3_pro",
  "prompt": "a red kite over a wheat field",
  "duration": 5,
  "request_id": "order-1042-take-1",
  "max_cost_cents": 60
}
```

---

## OpenAI-compatible images

`POST /v1/images/generations` takes OpenAI's Images request (`model`, `prompt`, `n`, `size`, `quality`, `background`, `output_format`) and answers right away with base64 images plus a `made` receipt.

- Point an existing OpenAI client at `https://www.made.app/api/v1` with your Made key (OpenAI's own SDK works with `baseURL`).
- `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` run OpenAI's original models, unbatched, at the sizes the catalog prices. `auto` size means 1024x1024; `auto` quality means medium.
- Cheapest drafts: `gpt_image_2_5_fast` on `/v1/generations` (Made's batched version).

```js
// Node 18+. OpenAI's own SDK works too: baseURL 'https://www.made.app/api/v1'.
const response = await fetch('https://www.made.app/api/v1/images/generations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.MADE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-image-2.5-flare',
    prompt: 'A red kite over a wheat field at golden hour',
    size: '1024x1024',
    quality: 'medium',
  }),
});
const result = await response.json();
// result.data[0].b64_json is the image; result.made is the receipt.
```

---

## Errors

Every error is JSON with an `error` message. The OpenAI-compatible route answers in OpenAI's error shape instead.

| Status | Meaning |
|---|---|
| 400 | Value the model or tool doesn't take (e.g. undeclared resolution, missing required reference). Message names it. |
| 401 | Key missing, wrong or revoked. |
| 402 | Not enough credits. Body says what the run costs and what you have. Nothing was made, so resend the same request after adding credits. |
| 404 | No such job, tool or upload on this account. |
| 409 | Price moved past `max_cost_cents` (quote again), or the `request_id` already belongs to a different request. |
| 429 | Too many failed runs in the last few minutes (each was refunded), or the daily upload limit. Wait, then retry. |
| 5xx | Failure on Made's side. Retry with the same `request_id`: if the first try made a job, you get that job back instead of a second charge. |

Example 402:

```
HTTP/1.1 402 Payment Required

{
  "error": "Insufficient credits: this costs 6 credits and your balance is 0.",
  "code": "insufficient_credits",
  "cost_credits": 6,
  "balance_credits": 0,
  "add_credits_url": "https://www.made.app/billing"
}
```

---

## Credits

- A credit is **ten cents**. Every run costs a whole number of credits, quoted before it starts. Free tools cost 0.
- Fields named in **credits**: `cost.credits`, a tool quote's `credits`, `balanceCredits`, and a 402's `cost_credits` and `balance_credits`.
- Fields named in **cents** (so 60 = 6 credits): `customerCostCents`, `costCents`, `max_cost_cents`, `balanceCents`.
- **Two older names break the pattern:**
  - The numeric credit fields inside a model's `pricing` (like `creditsAtDefaultDuration`) count **cents**.
  - The `credits` field of `GET /v1/balance` counts **dollars**.
  - Use `balanceCredits`, read `pricing.display` for a summary, and quote with `/v1/cost` for the exact number.
- Credits are taken when a job is accepted and come back automatically if it fails or is canceled.
- Every model's price is on the price sheet. Credits come with a plan, unused credits roll over, and Billing adds more.

---

## Endpoints

All under `https://www.made.app/api`.

### Catalog (no key needed)

| Method | Path | What it does |
|---|---|---|
| GET | `/v1/models` | Every model with what it takes and its price. Filter with `?kind=image\|video\|audio` or `?query=` |
| GET | `/v1/tools` | Every tool with its slots, settings and JSON schema of its body. |
| GET | `/v1/tools/{id}` | One tool. |
| GET | `/v1/openapi.json` | This API as OpenAPI 3.1. |

### Quotes (free: no job, no charge)

| Method | Path | What it does |
|---|---|---|
| POST | `/v1/cost` | Price of a generation request, in credits (`cost.credits`) and cents. |
| POST | `/v1/tools/{id}/quote` | Price of a tool run. |
| POST | `/v1/generation-batches/quote` | Price of a batch. |
| POST | `/v1/compose-video/estimate` | Price of a timeline render. |

### Run (each answers 202 with a job to poll, except the OpenAI-compatible route)

| Method | Path | What it does |
|---|---|---|
| POST | `/v1/tools/{id}/run` | Run a tool. Needs `request_id` and `max_cost_cents`. |
| POST | `/v1/generations` | Run a model. |
| POST | `/v1/generation-batches` | Up to 12 generations, quoted and charged together. |
| POST | `/v1/images/generations` | OpenAI Images-compatible. Answers with the images. |
| POST | `/v1/reframe` | Change a video's aspect ratio. |
| POST | `/v1/expand` | Expand an image's canvas with generated fill. |
| POST | `/v1/compose-video` | Trims, fits and text overlays on a timeline, rendered to one MP4. |
| POST | `/v1/compose-image` | Image, text and shape layers rendered to one image. |

### Jobs

| Method | Path | What it does |
|---|---|---|
| GET | `/v1/generations/{id}` | Poll a job. Output URLs are re-signed on every read. |
| GET | `/v1/generations` | Your jobs, newest first (`?limit=`, `?before=<ISO time>`, `?tool=<tool id>`). |
| POST | `/v1/generations/{id}/cancel` | Cancel a pending or processing job. Credits come back. |
| DELETE | `/v1/generations/{id}` | Remove a finished job from your history. |

### Media

| Method | Path | What it does |
|---|---|---|
| POST | `/v1/media` | Reserve an upload: a media id and a signed PUT (`upload.url`, `upload.headers`). |
| POST | `/v1/media/{id}/confirm` | Confirm the upload after the PUT. |
| GET | `/v1/media` | Your uploads. |

### Account

| Method | Path | What it does |
|---|---|---|
| GET | `/v1/balance` | Balance in credits (`balanceCredits`). |
| GET | `/v1/ledger` | Every spend, refund and grant, with the balance after each. |
| GET | `/v1/keys` | Your API keys. |
| POST | `/v1/keys` | Create a key. Its `made_sk_…` secret is in this response only. |
| DELETE | `/v1/keys/{id}` | Revoke a key. |
| GET | `/v1/creators` | Your saved characters and their `ref_…` ids. |

---

## Agents: MCP server

For Claude, ChatGPT, Cursor and other MCP clients, the page recommends connecting `https://mcp.made.app/mcp` instead of using the REST API directly. It signs in with your Made account, needs no key, runs the same tools at the same prices, and puts the price in every tool response. (A separate "MCP setup" page is linked from the site.)

## Made for Blender

A Blender add-on built on this API. It renders your camera's view of a blockout as a previs, uploads it with `POST /v1/media`, quotes it with `/v1/cost`, and films it on `seedance_2_5_video_reference` or `seedance_2_0_mini_video_reference` with a `request_id` and `max_cost_cents`. It also runs a local MCP bridge so assistants can edit the open scene. (Linked as "Made for Blender" on the site.)

---

## Quick reference for the agent

- Auth: `Authorization: Bearer made_sk_…` (server-side only)
- Always: quote first (free), then run with `request_id` + `max_cost_cents`, then poll `GET /v1/generations/{id}` until `succeeded` / `failed` / `canceled`
- Tool slots take `media_…`, `job_…` or `ref_…` ids, not URLs. Model `medias[].value` can also be an https URL.
- 1 credit = 10 cents = 10 ¢. Beware the two legacy credit fields (model `pricing.*` in cents; `/v1/balance` `credits` in dollars).
- Poll interval used in examples: 3 seconds.
- Max upload: 200 MB; JPEG, PNG, WebP, MP4, WebM, MOV, MP3, WAV.
