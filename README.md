# RAPTOR Hardware Design Studio

Interactive hardware selection, compatibility checking and budget management for the **RAPTOR** senior design project
(*Resilient Autonomous Navigation and Persistent Target Observation in Contested Indoor Environments*,
METU Electrical & Electronics Engineering, 2026–2027).

It answers one question: **can we build the minimum RAPTOR robot with these parts, within $350, while keeping a reasonable path to future upgrades?**

It is a static web app (React + TypeScript + Vite + Tailwind). No server, no database, no secrets — it runs in any modern
browser and deploys to GitHub Pages, Vercel or Netlify.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 37 unit tests for the cost, kit-inclusion, compatibility, import/export and share logic
npm run build      # type-checks, then writes dist/
npm run preview    # serve the production build
```

## What is in it

| Page | What it does |
|---|---|
| **Command Center** | Budget, readiness, open issues, recent changes, “Build Your RAPTOR”, six presets priced from real catalog data |
| **Hardware Configurator** | 10 guided steps (platform → UWB → processor → camera → IMU/odometry → sensors → power → motors/safety → future upgrades → review). Product cards with image, price, pros/cons, ratings, suitability; right-hand inspector with specs, package contents, warnings, sources and “what happens if I select this” |
| **Component Explorer** | 82 researched parts; search; manufacturer, price, kit-contents, expandability, suitability and “fits my current selection” filters; sorting |
| **Comparison Lab** | 2–4 parts side by side with an *effective complete-base cost* (price + what the part lacks), integration ease, documentation, expandability, risks and the effect on your current configuration. A second tab compares whole configurations (team members, A/B scenarios) |
| **Requirements & Compatibility** | Official RAPTOR requirements matrix with evidence recording, compatibility findings, risk register, EE493 milestones |
| **Bill of Materials** | Auto-generated BOM (purchased, implied and included-in-kit lines), editable prices/quantities, cost model, procurement tracking, CSV / JSON / print report / share link |
| **Future Roadmap** | Goal picker with per-goal checks against the *current* chassis, processor, camera and power system; software-only vs hardware upgrades |
| **Report** | “RAPTOR — Hardware Selection & Engineering Design Report” (18 sections), print-optimised → *Save as PDF* |

## Honesty rules the app enforces

1. **Unknown ≠ $0.** A part with no price is counted as *unknown*; totals show *“Total is incomplete — N missing prices”*. A part included in a kit shows *“Included in kit — $0 incremental cost”* with the reason.
2. **Kit inclusion is per variant.** A product only “provides” an IMU, motor driver, camera, … when that exact variant does. Claims taken from team notes rather than the product page are flagged *unverified*.
3. **No double-counting.** Selecting an IMU / driver / camera / encoder / computer that the kit already provides is marked as an optional duplicate, not a mandatory cost.
4. **Requirements are never “passed” from datasheets.** Rows say *Hardware proposed*, *Planned*, *Blocked*, … Only an evidence note you type changes a row to *Evidence recorded*. Vendor accuracy numbers are shown as ranging claims, not robot localization accuracy.
5. **Prohibited sensors cannot be selected.** LiDAR, GNSS, ultrasonic, ToF and radar live in a separate “Not compliant with current project restrictions” section; imports that contain them are flagged critical. Optical flow, extra/stereo/thermal cameras and depth sensors are labelled *needs supervisor approval*.
6. **Official vs. everything else.** Official mandatory requirements, engineering recommendations, optional upgrades, unverified assumptions and approval-needed items are kept visibly apart.
7. **Estimates carry their assumptions** (runtime, payload mass, streaming bitrate) and are labelled *not measured*.

## Data provenance (checked 2026-10-23)

Prices from the original prompt are kept as **preliminary**. During development the product pages below were fetched and compared:

* **Price matched the page:** Waveshare WAVE ROVER ($89.99), UGV02 ($149.99), RaspRover (from $174.99; PT Pi4B AI kit $419.99), UGV Beast (from $264.99; AI kit $501.99), Robot-Chassis ($11.99–$32.99); DFRobot Baron ($49.90), Pirate ($39.90), Black Gladiator ($25.00), Devastator metal-gear variant ($84.90; standard variant $69.90); Freenove FNK0043 ($69.99) and FNK0043B ($74.99); SunFounder PiCar-X ($89.99, **sold out**); Pololu Romi ($39.95); Makerfabs ESP32 UWB DW3000 ($43.80), MaUWB Direct / DSTO Direct ($42.80), Chipsets ($38.90), ESP32 UWB DW1000 ($39.80); Adafruit LSM6DSOX ($11.95), BNO085 ($29.50), INA260 ($9.95).
* **Findings that updated earlier notes** (recorded in the product entries):
  * DFRobot Pirate: the page says *motor encoders are not compatible* (earlier note: “limited encoder compatibility”).
  * WAVE ROVER: payload 0.8 kg, N20 12 V motors, 3 × 18650 cells *not included*; the page text does not list the IMU / power monitor — flagged *unverified* until confirmed on the Waveshare wiki.
  * Makerfabs: the demo libraries for ESP32 UWB boards **do not support time-multiplexing** (multi-anchor is the team’s job); MaUWB firmware supports 8 anchors + 64 tags; DSTO nodes form a mesh (≤20 nodes, 500 Hz claim).
  * Arduino UNO Q: Qualcomm QRB2210 + STM32U585, 2 GB / 16 GB eMMC; documented camera path is **USB UVC** — a CSI connector is not documented, so Raspberry Pi CSI cameras are *unverified*.
  * Raspberry Pi 5 has **no hardware H.264 encoder**; Pi 4 and Zero 2 W do.
  * Distributor (Adafruit) prices have drifted above the preliminary values for Pi 4 2 GB ($80 vs $67.50), Zero 2 W ($19.05 vs $15), Camera Module 3 ($29.25 vs $25), Module 3 Wide ($38.50 vs $35), Camera Module 2 ($29.95 vs $25). Switch **Price basis → Observed** on the BOM page to see the effect.
* **Not verifiable automatically** (site blocks bots): raspberrypi.com, qorvo.com — those entries stay *preliminary / specs unchecked*.
* **Unknown prices** are left unknown on purpose: Luckfox Pico Max (a ≈$14.99 reference is shown only as a *hint*), STM32/ESP32 dev boards, 18650 cells, regulators, e-stop, wiring, the Pi Global Shutter lens, bare-module (BU03 / MaUWB chipset) support electronics. Generic parts carry *typical-price hints* that are never applied unless you press “adopt hints”.
* Product photos are hot-linked from manufacturer / authorised-distributor pages whose URLs were fetched; if an image fails or none is stored, a labelled placeholder is shown.

Please re-verify everything on the manufacturer page before ordering.

## Sharing & persistence

* Everything is stored in **this browser’s localStorage** (`raptor-studio:v1`). It does **not** sync between computers.
* **Share link** (`…/#/share/<code>`): the whole configuration is deflate-compressed into the URL fragment (never sent to a server). Opening it imports a copy into the teammate’s browser.
* **JSON export / import**, **CSV BOM**, and **print → PDF** report.
* Real-time multi-user editing is *not* implemented. If you want it later, add a Supabase/Firebase table keyed by configuration id and replace `src/state/persist.ts`; the app is already a single serialisable `Config` object.

## Project layout

```
src/
  types.ts                 domain types (Product, Config, Finding, BomLine …)
  data/                    ← edit these to change parts, prices, rules inputs
    platforms.ts uwb.ts processors.ts cameras.ts sensors.ts power.ts
    catalog.ts             assembles the catalog, defines slots and configurator steps
    requirements.ts goals.ts presets.ts risks.ts
  engine/                  pure logic, no React (all unit-tested)
    cost.ts                BOM + totals, kit inclusion, duplicate detection, unknown prices
    compat.ts              rule registry (add a rule object to extend)
    requirements.ts upgrades.ts power.ts effective.ts optimizer.ts streaming.ts
    config.ts share.ts exporters.ts presets.ts
  state/                   store + localStorage persistence + hash routing
  ui/                      components and pages
  test/engine.test.ts      37 tests
```

### Add or update a product / price

1. Open the file for its category in `src/data/` and copy an existing `P({...})` entry.
2. Required: `id`, `slots`, `price` (use `null` if unknown), `provides` (what is *included*), `excludes`, `pros`, `cons`.
3. Keep `priceStatus: 'preliminary'` until you confirm the price on the seller page, then set `'page-verified'`, `priceDate` and `priceNote`.
4. Put the exact official URL in `url`; set `image` only to a URL you have opened and confirmed.
5. Variants (different chassis size, camera inclusion, controller) must be separate entries.
6. Prices can also be corrected at runtime without editing code: *Inspector → Manual price correction* or the unit-price field on the BOM page (stored in the configuration).

### Add a compatibility rule

`src/engine/compat.ts` exports `RULES`. A rule is `{ id, run(ctx) → Finding[] }`; `ctx` gives the selected platform, processor, UWB set, kit-provided capabilities and per-slot selections. Facts (camera support per processor, host families, voltage limits, payload) live in product data, so most checks need no UI changes.

## Deploy

**GitHub Pages** — push to `main`; `.github/workflows/deploy.yml` runs the tests, builds and publishes. Enable once under *Settings → Pages → Source: GitHub Actions*. (`base` is `./` and routing uses `#/`, so any sub-path works.)

**Vercel** — import the repo; `vercel.json` is included (`npm run build`, output `dist`).

**Netlify** — import the repo; `netlify.toml` is included. Or drag the `dist/` folder onto netlify.com/drop.

## Known limitations

* Ratings (integration / documentation / expandability, 1–5) are qualitative judgements with a stated basis, not measurements.
* Payload-mass and runtime estimates use assumed per-part masses and loads (editable on the Power step).
* Specs for several parts were recalled rather than read from the datasheet and are marked *Specs not yet checked*.
* UWB regulatory status for the test location is not assessed.
