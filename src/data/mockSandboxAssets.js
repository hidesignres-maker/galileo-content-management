import quakerCaramel from "../assets/asset-upload-demo/00030000578407_C1CB_s29.jpg";
import whiteCheddar from "../assets/asset-upload-demo/00810607023315_H1C1.jpg";
import cinnamonCrunch from "../assets/asset-upload-demo/00810607024763_H1C1.jpg";
import jalapenoPopper from "../assets/asset-upload-demo/00810607025463_H1C1.jpg";
import spicyQueso from "../assets/asset-upload-demo/00810607026033_H1C1.jpg";
import kettleCorn from "../assets/asset-upload-demo/00893594002570_H1C1.jpg";

/**
 * mockSandboxAssets — local illustrative data for the isolated Asset
 * Upload/Asset View sandbox (`src/pages/sandbox/AssetUploadSandbox.jsx`).
 *
 * Images: the six distinct products found in the repo's `product img/`
 * folder, copied into `src/assets/asset-upload-demo/` as web-sized
 * (1200px, JPEG) derivatives so the Preview modal has real resolution
 * without bundling the 2–7 MB originals. Filenames keep the original
 * UPC-based names for traceability; the originals in `product img/` are
 * untouched. This sandbox no longer uses the shared
 * `getPlaceholderProductImage` helper (`data/productImages.js`), which is
 * left as-is for the production flows that depend on it.
 *
 * Display names and sizes are illustrative. `sizeLabel` reflects the
 * approximate size of the original source file, not the bundled copy.
 *
 * This is a design-validation sandbox, not a production data model.
 */

/** The six demo products, in a fixed order. `displayName` is the clean
 * name shown in the UI (the underlying file keeps its UPC name). */
const DEMO_IMAGES = [
  { key: "quaker-caramel", src: quakerCaramel, displayName: "Quaker Caramel Rice Crisps — front", sizeLabel: "2.1 MB" },
  { key: "white-cheddar", src: whiteCheddar, displayName: "PopCorners White Cheddar — front", sizeLabel: "1.8 MB" },
  { key: "cinnamon-crunch", src: cinnamonCrunch, displayName: "PopCorners Cinnamon Crunch — front", sizeLabel: "1.8 MB" },
  { key: "jalapeno-popper", src: jalapenoPopper, displayName: "PopCorners Jalapeño Popper — front", sizeLabel: "1.8 MB" },
  { key: "spicy-queso", src: spicyQueso, displayName: "PopCorners Spicy Queso — front", sizeLabel: "1.9 MB" },
  { key: "kettle-corn", src: kettleCorn, displayName: "PopCorners Kettle Corn — front", sizeLabel: "1.9 MB" },
];

/* --------------------------------------------------------------------
 * Simulated-upload timing (milliseconds). Deterministic on purpose so the
 * demo behaves the same way every time it is presented.
 * ------------------------------------------------------------------ */

/** How long the transient green "Completed" confirmation stays visible
 * before the asset settles to its neutral Ready state. */
export const COMPLETED_FLASH_MS = 1500;

/** Upload duration for a retried asset (retry always succeeds). */
export const RETRY_UPLOAD_MS = 2200;

/**
 * MAIN DEMO PLAN — the primary 6-asset simulated upload.
 *   outcome: "completed" | "failed"
 *   delayMs: time spent in Uploading before the outcome is applied
 * Asset 5 always fails; Asset 6 uploads noticeably longer than the rest.
 * Delays are staggered so no two assets resolve at the same moment.
 */
const MAIN_DEMO_PLAN = [
  { image: 0, outcome: "completed", delayMs: 1800 },
  { image: 1, outcome: "completed", delayMs: 2600 },
  { image: 2, outcome: "completed", delayMs: 3300 },
  { image: 3, outcome: "completed", delayMs: 4100 },
  { image: 4, outcome: "failed", delayMs: 2900 },
  { image: 5, outcome: "completed", delayMs: 6200 },
];

/** Secondary "Add assets" batches: variants of the same six products so
 * appended assets are visually recognizable but distinct by name. */
const ADD_VARIANTS = ["retailer crop", "social 1x1", "secondary angle"];
const ADD_DELAYS_MS = [1600, 2500, 3400];

let batchCounter = 0;

function toAsset(id, image, nameSuffix = "") {
  return {
    id,
    name: `${image.displayName}${nameSuffix}.jpg`,
    sizeLabel: image.sizeLabel,
    mimeType: "image/jpeg",
    status: "uploading", // "uploading" | "completed" | "failed"
    justCompleted: false, // true only during the transient Completed flash
    previewSrc: image.src,
  };
}

/**
 * buildMainDemoBatch — the primary 6-asset simulated upload. Returns
 * `{ asset, outcome, delayMs }[]`: each asset starts in "uploading", and
 * the sandbox schedules each one's own independent timers from its plan.
 */
export function buildMainDemoBatch() {
  batchCounter += 1;
  const batchId = `demo-${batchCounter}`;
  return MAIN_DEMO_PLAN.map((step, i) => ({
    asset: toAsset(`${batchId}-${i + 1}`, DEMO_IMAGES[step.image]),
    outcome: step.outcome,
    delayMs: step.delayMs,
  }));
}

/**
 * buildAddedBatch — small secondary batch for "Add assets". Same return
 * shape as buildMainDemoBatch. All new assets start in "uploading" and are
 * planned to succeed, cycling through the six products with a variant
 * suffix so names stay unique and readable.
 */
export function buildAddedBatch(count = 3) {
  batchCounter += 1;
  const batchId = `added-${batchCounter}`;
  return Array.from({ length: count }, (_, i) => {
    const image = DEMO_IMAGES[(batchCounter + i) % DEMO_IMAGES.length];
    const variant = ADD_VARIANTS[(batchCounter + i) % ADD_VARIANTS.length];
    return {
      asset: toAsset(`${batchId}-${i + 1}`, image, ` — ${variant}`),
      outcome: "completed",
      delayMs: ADD_DELAYS_MS[i % ADD_DELAYS_MS.length],
    };
  });
}

/* --------------------------------------------------------------------
 * Static scenario presets (snapshot states, no timers). Kept from the
 * previous sandbox pass so reviewers can jump straight to a given state.
 * Names/types are illustrative; images now come from the demo set.
 * ------------------------------------------------------------------ */

const NAME_POOL = [
  "Front-of-pack hero.jpg",
  "Lifestyle shot — kitchen.jpg",
  "Nutrition panel update.png",
  "Retailer PDP banner.jpg",
  "Product 360 spin.mp4",
  "Ingredient callout.png",
  "Shelf placement photo.jpg",
  "Brand story video.mp4",
  "Packaging redesign v2.jpg",
  "A+ content module.png",
  "Case pack photo.jpg",
  "Allergen statement.pdf",
  "Social crop 1x1.jpg",
  "Social crop 9x16.mp4",
  "Retailer creative brief.pdf",
  "Secondary angle.jpg",
  "In-store display mock.jpg",
  "Recipe card asset.png",
  "Ingredient close-up.jpg",
  "Launch teaser.mp4",
  "Comparison chart.png",
  "Holiday variant photo.jpg",
  "Sustainability badge.png",
  "Back-of-pack detail.jpg",
];

const SIZES = ["1.2 MB", "3.4 MB", "840 KB", "2.1 MB", "5.6 MB", "612 KB", "1.8 MB", "4.0 MB"];

function extToMime(name) {
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

/** Builds `count` illustrative assets, cycling through the name pool and
 * the six demo images. `statusPattern` maps an index (mod its own length)
 * to a status, so each scenario can shape exactly how many of each state
 * it shows. */
function buildAssets(count, statusPattern, idPrefix) {
  return Array.from({ length: count }, (_, i) => {
    const name = NAME_POOL[i % NAME_POOL.length];
    return {
      id: `${idPrefix}-${i + 1}`,
      name,
      sizeLabel: SIZES[i % SIZES.length],
      mimeType: extToMime(name),
      status: statusPattern[i % statusPattern.length],
      justCompleted: false,
      previewSrc: DEMO_IMAGES[i % DEMO_IMAGES.length].src,
    };
  });
}

/** Demo scenarios, switched via the sandbox's own scenario picker (a
 * sandbox-harness affordance, not part of the component itself).
 * `live: true` marks the interactive simulated-upload scenario: the
 * sandbox builds a fresh main demo batch and starts its timers instead of
 * loading static assets. */
export const SANDBOX_SCENARIOS = {
  empty: { label: "Empty", assets: [] },
  live: { label: "Simulated upload · 6 assets", assets: [], live: true },
  one: { label: "1 asset", assets: buildAssets(1, ["completed"], "one") },
  few: {
    label: "6 assets · 1 failed",
    assets: buildAssets(6, ["completed", "completed", "completed", "completed", "completed", "failed"], "few"),
  },
  many: {
    label: "24 assets · 3 uploading · 1 failed",
    assets: buildAssets(
      24,
      [
        "completed", "completed", "completed", "completed", "completed", "completed",
        "uploading", "completed", "completed", "completed", "completed", "completed",
        "uploading", "completed", "completed", "completed", "completed", "completed",
        "failed", "completed", "completed", "completed", "completed", "uploading",
      ],
      "many"
    ),
  },
};
