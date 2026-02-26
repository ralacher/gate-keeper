# Gate Keeper

A single-page application for remotely operating a property gate, built for shared use among neighbors.

## Purpose

Expose remote gate operations (open, open-and-latch, unlatch) to a small group of authorized neighbors via a simple web interface backed by a Home Assistant API.

## Features

### Gate Controls

| Action | Description |
|---|---|
| **Open** | Triggers the gate to open (momentary) |
| **Open & Latch** | Opens the gate and latches it in the open position |
| **Unlatch** | Releases the latch so the gate can close |

### Latch Status

The app displays the current latch state: **Latched** or **Unlatched**.

> **Note:** The gate's open/closed position cannot be monitored — there is no sensor for that. Only latch status is tracked.

### User Identification

The signed-in user's e-mail address is captured from Cloudflare headers (`CF-Access-Authenticated-User-Email`). This is used to attribute actions in the activity log.

### Live Video Feed

An embedded WebRTC video stream from go2rtc (built into Home Assistant). Shows a live view of the gate camera with low latency. Falls back to a placeholder when not configured.

### Gate Position Detection (Experimental)

An optional feature that infers whether the gate is **open** or **closed** by periodically sampling a small region of the camera feed and measuring its average brightness.

> **Note:** This is not a substitute for a hardware sensor. Accuracy depends on lighting, camera angle, and how distinct the gate looks against its background. It works best as a rough visual indicator.

#### How It Works

1. Every N milliseconds (default 2 000), a square patch of pixels is grabbed from the live video frame using a hidden `<canvas>`.
2. The weighted luminance (BT.601) of every pixel in that patch is averaged to produce a single brightness value (0–255).
3. If the brightness is **≥ threshold** → the gate is reported as "open"; **< threshold** → "closed" (invertible via `VITE_GATE_DETECT_OPEN_ABOVE`).

When enabled, the video overlay shows:

- A **crosshair** at the sample point (auto-centered on the POI rectangle if one is configured).
- A **badge** in the top-left corner displaying the detected state and the live brightness reading (`B:142`), useful for calibration.

#### Crosshair Placement

The sample point should be placed where the gate **blocks the view when closed** and **reveals the background when open**. For a gate with narrow vertical bars against a backdrop (e.g. a green tarp):

- **Option A — target a solid element:** Place the crosshair on a gate post, hinge, or horizontal rail that disappears when the gate swings away.
- **Option B — sample a wider area:** Increase `VITE_GATE_DETECT_SAMPLE_SIZE` (e.g. `60`) so the patch spans multiple bars + gaps. The average brightness of bars-over-background will differ from pure background.

Avoid placing the crosshair in a gap *between* bars — the background will be visible regardless of gate position.

If a POI rectangle is configured (`VITE_VIDEO_POI_*`), the crosshair and sample point automatically default to its centre. You can override this with explicit `VITE_GATE_DETECT_SAMPLE_X/Y` values.

#### Calibration

1. Enable the feature: `VITE_FEATURE_GATE_DETECTION_ENABLED=true`.
2. Open the app and watch the `B:` value in the badge.
3. Note the brightness when the gate is **closed** and when it is **open**.
4. Set `VITE_GATE_DETECT_THRESHOLD` halfway between the two readings.
5. If the closed state is *darker* than open, keep `VITE_GATE_DETECT_OPEN_ABOVE=true`. If the closed state is *brighter*, set it to `false`.

### Activity History

A table displays a chronological log of all gate operations:

| Timestamp | User | Action |
|---|---|---|
| 2026-02-25 08:31 | alice@example.com | Opened gate |
| 2026-02-25 09:12 | bob@example.com | Opened & latched gate |
| 2026-02-25 10:45 | bob@example.com | Unlatched gate |

## Architecture

```
┌────────────┐       ┌────────────────┐       ┌─────────────────┐
│  Browser   │──────▶│  Backend API   │──────▶│  Home Assistant  │
│  (SPA)     │◀──────│  (REST)        │◀──────│  API             │
└────────────┘       └────────────────┘       └─────────────────┘
       │
       ▼
  Cloudflare Access
  (user auth + email header)
```

- **Frontend** — Single-page application (static HTML/JS/CSS).
- **Backend** — Lightweight API layer that proxies gate commands to Home Assistant.
- **Home Assistant** — Controls the physical gate hardware via its REST API.
- **Cloudflare Access** — Handles authentication; injects `CF-Access-Authenticated-User-Email` header.

## Configuration

All connection parameters are provided via environment variables — nothing is hardcoded.

**Build-time variables** (compiled into the frontend bundle — safe to expose):

| Variable | Description | Example |
|---|---|---|
| `VITE_HA_BASE_URL` | Home Assistant instance URL | `http://192.168.1.50:8123` |
| `VITE_HA_WEBHOOK_OPEN` | Webhook ID for "Open" | `abc123-open` |
| `VITE_HA_WEBHOOK_OPEN_AND_LATCH` | Webhook ID for "Open & Latch" | `abc123-open-latch` |
| `VITE_HA_WEBHOOK_UNLATCH` | Webhook ID for "Unlatch" | `abc123-unlatch` |
| `VITE_GO2RTC_URL` | go2rtc instance URL (for video feed) | `http://192.168.1.50:1984` |
| `VITE_GO2RTC_STREAM` | go2rtc stream name | `gate_camera` |
| `VITE_MOCK` | Use simulated responses (`true`/`false`) | `true` |
| `VITE_FEATURE_LATCH_ENABLED` | Enable/disable all latch controls (Open & Latch, Unlatch, latch status toggle) | `true` |
| `VITE_FEATURE_GATE_DETECTION_ENABLED` | Enable experimental pixel-sampling gate-position detection | `false` |
| `VITE_GATE_DETECT_SAMPLE_X` | Sample point horizontal centre (% of raw video, 0–100) | `50` |
| `VITE_GATE_DETECT_SAMPLE_Y` | Sample point vertical centre (% of raw video, 0–100) | `50` |
| `VITE_GATE_DETECT_SAMPLE_SIZE` | Side length in px of the square sample area | `20` |
| `VITE_GATE_DETECT_INTERVAL` | Polling interval in ms | `2000` |
| `VITE_GATE_DETECT_THRESHOLD` | Brightness threshold (0–255) dividing open/closed | `128` |
| `VITE_GATE_DETECT_OPEN_ABOVE` | `true` = brightness ≥ threshold means open | `true` |

**Runtime variables** (server-side only — never exposed to the browser):

| Variable | Description | Example |
|---|---|---|
| `HA_TOKEN` | Home Assistant long-lived access token | `eyJ0...` |
| `HA_BASE_URL` | Home Assistant URL used by nginx proxy | `http://192.168.1.50:8123` |
| `GO2RTC_URL` | go2rtc URL used by nginx proxy | `http://192.168.1.50:1984` |
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push | `BEl6...` |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push | `abc...` |
| `VAPID_SUBJECT` | Contact URI for push server | `mailto:gate@example.com` |

> **Security note:** `HA_TOKEN` is intentionally not prefixed with `VITE_`. The Vite build
> toolchain only embeds `VITE_*` variables in the browser bundle. `HA_TOKEN` is injected
> solely by the nginx reverse proxy (or the Vite dev proxy in Node.js), so it is never
> visible to any browser.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API) |
| Build | Vite |
| Styling | Tailwind CSS + DaisyUI (dark theme) |
| PWA | vite-plugin-pwa (installable, offline shell) |
| Auth | Cloudflare Access (`CF-Access-Authenticated-User-Email`) |

## Project Structure

```
bob-cox-gate/
├── public/
│   └── gate-icon.svg          # App icon
├── src/
│   ├── components/
│   │   ├── VideoFeed.vue      # WebRTC video stream via go2rtc
│   │   ├── GateControls.vue   # Open / Open & Latch / Unlatch buttons
│   │   ├── LatchStatus.vue    # Latched / Unlatched badge
│   │   └── ActivityHistory.vue# History table
│   ├── composables/
│   │   └── useGate.js         # Reactive state & action handlers
│   ├── services/
│   │   └── gateApi.js         # Mock HA API (swap for real calls later)
│   ├── App.vue                # Root layout
│   ├── main.js                # Entry point
│   └── style.css              # Tailwind imports
├── .env.example               # Environment variable template
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## Current State

The Home Assistant API integration is **mocked** — all gate commands return simulated responses. This allows full UI development and testing without a live Home Assistant instance.

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd bob-cox-gate

# Copy and edit environment config
cp .env.example .env

# Install dependencies
npm install

# Start the dev server (http://localhost:3000)
npm run dev

# Production build
npm run build
```

## Roadmap

- [x] Build SPA frontend with gate controls, latch status, and history table
- [x] Implement mocked Home Assistant API service
- [x] PWA support (installable on mobile home screens)
- [ ] Wire up real Home Assistant API integration
- [ ] Deploy behind Cloudflare Access for neighbor authentication
- [ ] Persist activity history (database or file-based)

## License

Private — intended for personal/neighborhood use.
