import quakerCaramel from "../assets/asset-upload-demo/00030000578407_C1CB_s29.jpg";
import whiteCheddar from "../assets/asset-upload-demo/00810607023315_H1C1.jpg";
import cinnamonCrunch from "../assets/asset-upload-demo/00810607024763_H1C1.jpg";
import jalapenoPopper from "../assets/asset-upload-demo/00810607025463_H1C1.jpg";
import spicyQueso from "../assets/asset-upload-demo/00810607026033_H1C1.jpg";
import kettleCorn from "../assets/asset-upload-demo/00893594002570_H1C1.jpg";
// Sandbox-only static video poster: a composition of three of the local
// product images above on a Galileo-blue gradient (generated locally, no
// external imagery). Used as the "video" thumbnail/preview — there is no
// real video file and no playback anywhere in this sandbox.
import launchVideoPoster from "../assets/asset-upload-demo/launch-video-poster.jpg";

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
 * Mixed-media pass — ONE ATTACHMENT MODEL, MULTIPLE MEDIA REPRESENTATIONS:
 * every asset has the same shape; `mediaType` ("image" | "pdf" | "video")
 * only selects the thumbnail/preview renderer. Images carry a real local
 * `previewSrc`; videos carry the local static poster as `previewSrc` plus
 * a `duration` label; PDFs have no image (`previewSrc: undefined`) and are
 * rendered as a mock document page. Nothing is parsed or played.
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

/* ------------------------------------------------------------------
 * Mock PDF page content — ILLUSTRATIVE PROTOTYPE CONTENT ONLY, not
 * official product data. Rendered as a static first page in the Preview
 * modal (no PDF parsing, no PDF library). UPCs match the local product
 * image filenames; every other value is invented for the demo.
 * ------------------------------------------------------------------ */
const DOC_DISCLAIMER = "Illustrative prototype content — not an official document.";

const PRODUCT_SPECS_DOC = {
  heading: "PRODUCT SPECIFICATIONS",
  reference: "Spec PC-SQ-018 · Rev 03",
  subject: "PopCorners Spicy Queso",
  subline: "18 oz / 510 g",
  sectionTitle: "Product information",
  fields: [
    ["UPC", "00810607026033"],
    ["Case pack", "12 units"],
    ["Dimensions", "12.4 × 8.2 × 4.1 in"],
    ["Net weight", "18 oz (510 g)"],
    ["Storage", "Cool, dry place"],
  ],
  notes: DOC_DISCLAIMER,
  pages: 4,
};

const PLANOGRAM_DOC = {
  heading: "RETAILER PLANOGRAM",
  reference: "POG 7-03 · v2",
  subject: "Salty Snacks — Aisle 7, Bay 3",
  subline: "Effective Nov 1, 2026",
  sectionTitle: "Placement",
  fields: [
    ["Product", "PopCorners Spicy Queso 18 oz"],
    ["Shelf", "3 of 5 (eye level)"],
    ["Facings", "4"],
    ["Adjacent", "PopCorners White Cheddar 18 oz"],
    ["Fixture", "48 in gondola"],
  ],
  notes: DOC_DISCLAIMER,
  pages: 2,
};

const REQUEST_BRIEF_DOC = {
  heading: "CONTENT REQUEST BRIEF",
  reference: "CR-2026-1048",
  subject: "PopCorners Spicy Queso — PDP refresh",
  subline: "Requested Oct 5, 2026",
  sectionTitle: "Request details",
  fields: [
    ["Request type", "Brand visual refresh"],
    ["Channel", "Retailer product page"],
    ["Assets", "Hero image, 360 spin, A+ module"],
    ["Due date", "Oct 30, 2026"],
    ["Owner", "Brand content team"],
  ],
  notes: DOC_DISCLAIMER,
  pages: 3,
};

/** Generic page for PDFs without bespoke content (presets, add-more). */
export function defaultPdfDoc(asset) {
  return {
    heading: "DOCUMENT",
    reference: asset.sizeLabel,
    subject: asset.name.replace(/\.pdf$/i, ""),
    subline: "PDF document",
    sectionTitle: "File information",
    fields: [
      ["File name", asset.name],
      ["File size", asset.sizeLabel],
      ["Type", "PDF document"],
    ],
    notes: DOC_DISCLAIMER,
    pages: 1,
  };
}

/** Non-image demo files (defined before MAIN_DEMO_PLAN, which uses them). */
const DEMO_PDF = { name: "Product Specs.pdf", sizeLabel: "2.4 MB", mediaType: "pdf", doc: PRODUCT_SPECS_DOC };
const DEMO_PDF_2 = { name: "Retailer Planogram.pdf", sizeLabel: "1.3 MB", mediaType: "pdf", doc: PLANOGRAM_DOC };
const DEMO_PDF_FAILS = { name: "Content Request Brief.pdf", sizeLabel: "860 KB", mediaType: "pdf", doc: REQUEST_BRIEF_DOC };
// Large video — the one asset that demonstrates simulated DETERMINATE
// progress ("Uploading… 64%"). See the sandbox's PROGRESS note.
const DEMO_VIDEO = {
  name: "Launch Video.mp4",
  sizeLabel: "48.6 MB",
  mediaType: "video",
  duration: "0:30",
  progressMode: "determinate",
};
// Smaller video — indeterminate spinner, finishes mid-batch so the Ready
// video state (poster + play + duration) is visible early.
const DEMO_VIDEO_2 = { name: "Social Cutdown.mp4", sizeLabel: "12.8 MB", mediaType: "video", duration: "0:15" };

/**
 * MAIN DEMO PLAN — the primary 11-asset simulated upload, mixed media:
 * 5 images, 2 PDFs, 2 videos, plus 2 that always fail (Retry succeeds):
 * 1 PDF — so a Ready PDF and a Failed PDF can be compared directly — and
 * 1 image.
 *   outcome: "completed" | "failed"
 *   delayMs: time spent in Uploading before the outcome is applied
 * Delays are staggered so no two assets resolve at the same moment; the
 * large Launch Video finishes last, with simulated determinate progress.
 */
const MAIN_DEMO_PLAN = [
  // Order = display order while uploading (uploading/failed sort first,
  // stably), chosen so the first visible row always shows the key cases:
  // determinate video progress, a Ready PDF and the Failed PDF.
  { image: 4, outcome: "completed", delayMs: 1800 }, // Spicy Queso (image)
  { file: DEMO_VIDEO, outcome: "completed", delayMs: 9000 }, // Launch Video.mp4 — determinate progress, finishes last
  { file: DEMO_PDF, outcome: "completed", delayMs: 2400 }, // Product Specs.pdf
  { file: DEMO_PDF_FAILS, outcome: "failed", delayMs: 2800 }, // Content Request Brief.pdf — fails
  // Failed IMAGE — no thumbnail while failed (generic unavailable
  // placeholder); Retry succeeds and reveals the Kettle Corn product image.
  { image: 5, name: "Retailer PDP banner.jpg", sizeLabel: "3.4 MB", outcome: "failed", delayMs: 3000 },
  { file: DEMO_VIDEO_2, outcome: "completed", delayMs: 3200 }, // Social Cutdown.mp4 — ready video
  { image: 1, outcome: "completed", delayMs: 3700 }, // White Cheddar (image)
  { image: 2, outcome: "completed", delayMs: 4200 }, // Cinnamon Crunch (image)
  { file: DEMO_PDF_2, outcome: "completed", delayMs: 4700 }, // Retailer Planogram.pdf
  { image: 3, outcome: "completed", delayMs: 5200 }, // Jalapeño Popper (image)
  { image: 0, outcome: "completed", delayMs: 5700 }, // Quaker Caramel (image)
];

/** Secondary "Add assets" batches: variants of the same six products so
 * appended assets are visually recognizable but distinct by name. */
const ADD_VARIANTS = ["retailer crop", "social 1x1", "secondary angle"];
const ADD_DELAYS_MS = [1600, 2500, 3400];
const ADD_KINDS = ["image", "pdf", "video"];

let batchCounter = 0;

function toAsset(id, image, nameSuffix = "") {
  return {
    id,
    name: `${image.displayName}${nameSuffix}.jpg`,
    sizeLabel: image.sizeLabel,
    mimeType: "image/jpeg",
    mediaType: "image", // "image" | "pdf" | "video" — renderer selector only
    status: "uploading", // "uploading" | "completed" | "failed"
    justCompleted: false, // true only during the transient Completed flash
    previewSrc: image.src,
  };
}

/** Same attachment shape as toAsset, for the non-image demo files. */
function toFileAsset(id, { name, sizeLabel, mediaType, duration, doc, progressMode }) {
  return {
    id,
    name,
    sizeLabel,
    mimeType: mediaType === "pdf" ? "application/pdf" : "video/mp4",
    mediaType,
    status: "uploading",
    justCompleted: false,
    previewSrc: mediaType === "video" ? launchVideoPoster : undefined,
    ...(duration ? { duration } : {}),
    ...(doc ? { doc } : {}),
    // Prototype-only: "determinate" opts this asset into simulated
    // percentage progress (asset.progress 0–99) while uploading.
    ...(progressMode === "determinate" ? { progressMode, progress: 0 } : {}),
  };
}


/**
 * buildMainDemoBatch — the primary 11-asset simulated upload. Returns
 * `{ asset, outcome, delayMs }[]`: each asset starts in "uploading", and
 * the sandbox schedules each one's own independent timers from its plan.
 */
export function buildMainDemoBatch() {
  batchCounter += 1;
  const batchId = `demo-${batchCounter}`;
  return MAIN_DEMO_PLAN.map((step, i) => {
    const id = `${batchId}-${i + 1}`;
    let asset;
    if (step.file) {
      asset = toFileAsset(id, step.file);
    } else {
      asset = toAsset(id, DEMO_IMAGES[step.image]);
      if (step.name) asset = { ...asset, name: step.name, sizeLabel: step.sizeLabel ?? asset.sizeLabel };
    }
    return { asset, outcome: step.outcome, delayMs: step.delayMs };
  });
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
  // Mixed-media pass: each added batch is image → PDF → video (cycling),
  // so "add more files" also demonstrates all three representations.
  return Array.from({ length: count }, (_, i) => {
    const id = `${batchId}-${i + 1}`;
    const kind = ADD_KINDS[i % ADD_KINDS.length];
    let asset;
    if (kind === "pdf") {
      asset = toFileAsset(id, { name: `Spec Sheet ${batchCounter}.pdf`, sizeLabel: "1.1 MB", mediaType: "pdf" });
    } else if (kind === "video") {
      asset = toFileAsset(id, { name: `Teaser Clip ${batchCounter}.mp4`, sizeLabel: "9.4 MB", mediaType: "video", duration: "0:10" });
    } else {
      const image = DEMO_IMAGES[(batchCounter + i) % DEMO_IMAGES.length];
      const variant = ADD_VARIANTS[(batchCounter + i) % ADD_VARIANTS.length];
      asset = toAsset(id, image, ` — ${variant}`);
    }
    return { asset, outcome: "completed", delayMs: ADD_DELAYS_MS[i % ADD_DELAYS_MS.length] };
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

function extToMediaType(name) {
  if (name.endsWith(".mp4")) return "video";
  if (name.endsWith(".pdf")) return "pdf";
  return "image";
}

/** Builds `count` illustrative assets, cycling through the name pool and
 * the six demo images. `statusPattern` maps an index (mod its own length)
 * to a status, so each scenario can shape exactly how many of each state
 * it shows. */
function buildAssets(count, statusPattern, idPrefix) {
  return Array.from({ length: count }, (_, i) => {
    const name = NAME_POOL[i % NAME_POOL.length];
    const mediaType = extToMediaType(name);
    return {
      id: `${idPrefix}-${i + 1}`,
      name,
      sizeLabel: SIZES[i % SIZES.length],
      mimeType: extToMime(name),
      mediaType,
      status: statusPattern[i % statusPattern.length],
      justCompleted: false,
      // Same rule as the live demo: images → product photo, videos → the
      // static poster, PDFs → no image (rendered as a mock document).
      previewSrc:
        mediaType === "image" ? DEMO_IMAGES[i % DEMO_IMAGES.length].src : mediaType === "video" ? launchVideoPoster : undefined,
      ...(mediaType === "video" ? { duration: "0:30" } : {}),
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
  live: { label: "Simulated upload · 11 assets", assets: [], live: true },
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
