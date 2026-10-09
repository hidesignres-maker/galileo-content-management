import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  XMarkIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  FilmIcon,
  SpeakerWaveIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { FileThumb } from "../../components/ui/FileThumb";
import { UploadDropzone } from "../../components/ui/UploadDropzone";
import { Tab } from "../../components/ui/Tab";
import { MoreMenu } from "../../components/detail/MoreMenu";
import {
  SANDBOX_SCENARIOS,
  buildAddedBatch,
  buildMainDemoBatch,
  COMPLETED_FLASH_MS,
  RETRY_UPLOAD_MS,
  defaultPdfDoc,
} from "../../data/mockSandboxAssets";

/* PROGRESS NOTE (prototype exploration):
 * Determinate upload progress requires reliable progress events from the
 * upload infrastructure. Fall back to an indeterminate spinner when
 * progress cannot be measured.
 * In this sandbox only Launch Video.mp4 opts in (`progressMode:
 * "determinate"`) and its percentage is SIMULATED on a fixed timer curve —
 * no real bytes are measured. Every other asset keeps the spinner. Same
 * attachment model and lifecycle either way; only the in-progress
 * indicator differs. */
const PROGRESS_TICK_MS = 250;

// List (Compact / forced upload-management) and Grid (Visual) each get
// their own initial/step counts — a "row" means something different in
// each layout, so one shared constant no longer fits both.
const LIST_INITIAL = 8;
const LIST_STEP = 15;
const GRID_INITIAL = 4; // ~one row at 4 columns
const GRID_STEP = 8; // ~two more rows at 4 columns

/* Visual-polish pass — sandbox gray/blue hierarchy, all from existing
 * Galileo theme tokens (src/theme/corporate.css), no new hex values:
 *   page canvas       bg-base-200 (#F5F5F7)
 *   card surface      bg-base-100 (#FFFFFF) via Card
 *   upload strip      bg-base-200 inside the white card
 *   media placeholder bg-base-300 at 60% — one step stronger than the
 *                     strip/page so loading/failed/confirmation media
 *                     areas read as distinct surfaces, not near-white
 *   dividers          base-300 (unchanged)
 *   secondary text    base-content/60; inactive/disabled base-content/40
 *   interactive       text-primary (#0066FF): Uploading spinner/label,
 *                     Show more/fewer, Cancel all (tabs + Browse files
 *                     already use primary via Tab/Button)
 *   failed emphasis   1px border-error + 1px ring-error (~2px, ring adds
 *                     no layout size) on the card; icon/label use
 *                     --color-destructive (#DC2626, Figma error/error) for
 *                     legible contrast. No red fills. */
const MEDIA_PLACEHOLDER_BG = "bg-base-300/60";

/* Visual | Compact switch — lightweight view-mode control built on the
 * shared Tab primitive (40px height, 2px primary underline when active,
 * base-content/60 inactive text — all from Tab itself, unchanged). The
 * only sandbox-local refinement is slightly wider horizontal padding
 * (16px vs Tab's default 12px) so the two short labels don't feel
 * cramped; `!` ensures it wins over Tab's own px-3 without editing the
 * shared component used by Queue/Analytics. */
const VIEW_SWITCH_TAB_CLASS = "px-4!";

/* Sandbox harness bar buttons (Demo controls / Exit sandbox) on the blue
 * bar: white text, transparent at rest, a light white tint on hover/press
 * — replaces DaisyUI ghost's default gray hover/active fill, which washes
 * out against primary blue. Harness chrome only, not component UI. */
const HARNESS_BAR_BTN =
  "text-primary-content border-transparent bg-transparent shadow-none hover:bg-primary-content/15 active:bg-primary-content/20 focus-visible:outline-primary-content";

/* ------------------------------------------------------------------
 * Mixed-media pass — ONE ATTACHMENT MODEL, MULTIPLE MEDIA
 * REPRESENTATIONS. Every asset shares the same shape, lifecycle
 * (Uploading → Completed → Ready / Failed → Retry), menus and actions.
 * `mediaType` only selects HOW the media area/thumbnail and the Preview
 * modal render; it never changes the uploader, the view mode, or the
 * state machine. Sandbox-only: no PDF parsing, no video file, no
 * playback — PDF and video previews are static visual emulations.
 * ------------------------------------------------------------------ */
function getMediaType(asset) {
  if (asset.mediaType) return asset.mediaType;
  if (asset.mimeType?.startsWith("video/")) return "video";
  if (asset.mimeType === "application/pdf") return "pdf";
  return "image";
}

// Neutral type icon used wherever no real preview exists (uploading,
// failed, or a ready asset without a thumbnail).
const MEDIA_TYPE_ICON = { image: PhotoIcon, pdf: DocumentTextIcon, video: FilmIcon };

/** Secondary metadata line: size, plus type for non-image files so PDFs
 * and videos are identifiable in the dense list. Images keep size only. */
function assetMeta(asset, { withDuration = true } = {}) {
  const type = getMediaType(asset);
  if (type === "pdf") return `${asset.sizeLabel} · PDF`;
  if (type === "video") return `${asset.sizeLabel} · Video${withDuration && asset.duration ? ` · ${asset.duration}` : ""}`;
  return asset.sizeLabel;
}

/**
 * AssetUploadSandbox — isolated design-validation prototype for a reusable
 * Galileo "Asset Upload / Asset View" component. Reachable only at the
 * dev-only `/asset-upload-sandbox` path (see App.jsx's `isAssetUploadSandbox`
 * short-circuit, mirroring the existing `isProductSelectionDemo` pattern
 * exactly) — never linked from `AppShell` navigation, never mounted inside
 * the production `view` state machine, and does not import or touch
 * Supporting Materials, Create Request, Review, Request Detail, Queue, or
 * any request model.
 *
 * Everything here composes existing Galileo primitives (`Card`, `Button`,
 * `Tab` (reused as the Visual/Compact view-mode segmented control — the
 * same pattern Analytics' "Total demand / By request type" toggle already
 * established, not a new primitive), `Modal`, `FileThumb`, `UploadDropzone`,
 * and the existing `MoreMenu` overflow-menu pattern from
 * `components/detail/`) — no new visual system, no new color, no new
 * spacing scale. All asset data is local, illustrative mock data
 * (`data/mockSandboxAssets.js`). Thumbnails and preview images are
 * web-sized copies of the six real product images from `product img/`,
 * stored in `src/assets/asset-upload-demo/` (see mockSandboxAssets.js).
 *
 * Grid-correction pass: `viewMode` ("visual" | "compact") selects between
 * two genuinely different layouts, per the approved Figma concept —
 * "visual" is a thumbnail GRID (`AssetCard`), "compact" is the dense LIST
 * (`AssetRow`).
 *
 * View-mode-during-upload correction (this pass): an earlier version of
 * this sandbox forced Compact/List whenever any asset was uploading, and
 * hid the Visual/Compact control entirely during that window. That
 * auto-switch has been removed — `viewMode` is the single source of truth
 * for which layout renders, always, with no upload-state override. Both
 * `AssetRow` and `AssetCard` now render every status (Uploading/Failed/
 * Completed) directly, so the user can freely switch views while a batch
 * is still uploading.
 *
 * PROTOTYPE BEHAVIOR vs. POTENTIAL PRODUCTION BEHAVIOR (explicitly not the
 * same decision — do not read this sandbox's permissiveness as a final
 * interaction rule):
 *   - Prototype behavior (this file): Visual and Compact views are both
 *     available at all times, including mid-upload, specifically so every
 *     status (Uploading/Failed/Completed) can be evaluated in both
 *     layouts during design review.
 *   - Potential production behavior (not implemented here, and not
 *     decided): a real implementation may choose to lock the component to
 *     Compact/List view for the duration of an active upload batch, to
 *     prioritize status visibility and per-file actions over browsing —
 *     re-enabling the Visual/Compact choice once the batch completes.
 *     This sandbox intentionally does NOT enforce that lock, so it should
 *     not be mistaken for the approved production rule either way; that
 *     is an open product decision, not something resolved by this file.
 *
 * Functional-prototype pass (simulated upload, real local product images):
 *   - Lifecycle: Uploading → Completed (transient, ~COMPLETED_FLASH_MS)
 *     → Ready (neutral). Alternative: Uploading → Failed → Retry →
 *     Uploading → Completed → Ready. "Ready" is `status: "completed"` with
 *     `justCompleted: false`; the green check / "Completed" label only
 *     renders while `justCompleted` is true, never permanently.
 *   - No visible Queued state, no percentage, no MB remaining — the
 *     existing spinner is the only per-asset progress indicator.
 *   - Timers are simulated (setTimeout) and deterministic: the main demo
 *     batch always fails asset 5 and always runs asset 6 longest; Retry
 *     always succeeds. Timers are tracked per asset id, so Cancel/Delete
 *     stop only that asset's timers, and switching Visual/Compact never
 *     touches them (view mode is pure presentation over shared state).
 *   - Browse files / drag-drop (any file) and the "Simulated upload"
 *     harness preset both start the same 11-asset mixed-media demo batch; the picked
 *     file itself is not read. Adding more files prepends a 3-asset batch
 *     that uploads independently without resetting existing assets.
 *
 * Uploader-continuity pass (hierarchy only — simulation, timers, state
 * transitions, Retry/Delete, Preview and view-state preservation are
 * unchanged):
 *   - Component order is fixed: header (title + Visual | Compact) →
 *     upload area → batch summary → assets → Show more/fewer.
 *   - Empty shows the full shared UploadDropzone; once any asset exists
 *     the upload area collapses to a one-row "Drag and drop more files
 *     here or Browse files" (CompactUploadDropzone) instead of
 *     disappearing. It is the single add-more entry point — the separate
 *     "Add assets" button was removed as redundant.
 *   - Batch summary adds a text-level "Cancel all" while uploads are
 *     active (same behavior as per-asset Cancel upload, applied to every
 *     uploading asset); when nothing is uploading only the neutral count
 *     line remains.
 *   - Scenario presets moved out of the component into a collapsed
 *     "Demo controls" panel in the dark sandbox harness bar; the sandbox
 *     now opens on Empty.
 */
export function AssetUploadSandbox({ onNavigateHome }) {
  // Starts at Empty so the component is first seen at the beginning of its
  // own lifecycle (demo controls are collapsed by default).
  const [scenarioKey, setScenarioKey] = useState("empty");
  const [assets, setAssets] = useState([]);
  // Default view is Compact (list) on first load. Visual remains fully
  // available via the Visual | Compact switch, and the user's choice is
  // kept for the rest of the session — Replay/Reset/scenario presets never
  // touch viewMode. Only a page reload returns to this default.
  const [viewMode, setViewMode] = useState("compact");
  const [visibleCount, setVisibleCount] = useState(LIST_INITIAL);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [demoControlsOpen, setDemoControlsOpen] = useState(false);
  // Per-asset simulated timers: Map<assetId, timeoutId[]>. Keyed by asset
  // so Cancel/Delete can stop exactly one asset's upload without affecting
  // the rest of the batch.
  const timersRef = useRef(new Map());

  const clearAssetTimers = (id) => {
    (timersRef.current.get(id) || []).forEach(clearTimeout);
    timersRef.current.delete(id);
  };
  const clearAllTimers = () => {
    timersRef.current.forEach((ids) => ids.forEach(clearTimeout));
    timersRef.current.clear();
  };
  const addTimer = (id, fn, ms) => {
    const t = setTimeout(fn, ms);
    timersRef.current.set(id, [...(timersRef.current.get(id) || []), t]);
  };

  // Simulated upload settling (setTimeout, same "no real network" approach
  // ImportCsvStep's own simulate() already uses elsewhere in this app) —
  // cleaned up on unmount so no state update fires after the sandbox is
  // navigated away from.
  useEffect(() => () => clearAllTimers(), []);

  const uploadingCount = assets.filter((a) => a.status === "uploading").length;
  const completedCount = assets.filter((a) => a.status === "completed").length;
  const failedCount = assets.filter((a) => a.status === "failed").length;

  // `viewMode` alone decides the layout — no upload-state override. See
  // the component doc comment above for why that auto-switch was removed.
  const isGrid = viewMode === "visual";
  const initialForMode = isGrid ? GRID_INITIAL : LIST_INITIAL;
  const stepForMode = isGrid ? GRID_STEP : LIST_STEP;

  // Reset the progressive-disclosure window only when the user explicitly
  // switches layouts — a grid "row" and a list "row" aren't comparable
  // counts, so carrying a raw visibleCount across the switch would show
  // either far too few or far too many at a glance. Triggered by the
  // user's own `viewMode` choice, never by asset count or upload state.
  useEffect(() => {
    setVisibleCount(isGrid ? GRID_INITIAL : LIST_INITIAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const patchAsset = (id, patch) =>
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  /** Schedules one asset's simulated upload: after `delayMs` it resolves
   * to `outcome`; a successful upload then shows the transient Completed
   * confirmation for COMPLETED_FLASH_MS before settling to neutral Ready.
   * If the asset was removed in the meantime, the patch is a no-op. */
  const scheduleUpload = (id, outcome, delayMs, { determinate = false } = {}) => {
    // Simulated determinate progress (see PROGRESS NOTE at top of file):
    // fixed ticks on an ease-out curve, capped at 99% until the upload
    // resolves. Ticks are ordinary per-asset timers, so Cancel / Delete /
    // Reset / Replay clear them exactly like the completion timer.
    if (determinate) {
      const ticks = Math.floor(delayMs / PROGRESS_TICK_MS);
      for (let k = 1; k < ticks; k++) {
        const pct = Math.min(99, Math.round(100 * (1 - Math.pow(1 - k / ticks, 1.6))));
        addTimer(id, () => patchAsset(id, { progress: pct }), k * PROGRESS_TICK_MS);
      }
    }
    addTimer(
      id,
      () => {
        if (outcome === "failed") {
          patchAsset(id, { status: "failed", justCompleted: false });
          timersRef.current.delete(id);
          return;
        }
        patchAsset(id, { status: "completed", justCompleted: true, progress: undefined });
        addTimer(
          id,
          () => {
            patchAsset(id, { justCompleted: false });
            timersRef.current.delete(id);
          },
          COMPLETED_FLASH_MS
        );
      },
      delayMs
    );
  };

  /** Starts a planned batch (`{ asset, outcome, delayMs }[]`). `mode`
   * "replace" swaps the collection (fresh demo upload); "prepend" adds the
   * batch in front of the existing assets without resetting them. */
  const startBatch = (items, mode) => {
    const batchAssets = items.map((item) => item.asset);
    setAssets((prev) => (mode === "replace" ? batchAssets : [...batchAssets, ...prev]));
    items.forEach((item) =>
      scheduleUpload(item.asset.id, item.outcome, item.delayMs, {
        determinate: item.asset.progressMode === "determinate",
      })
    );
  };

  const startMainDemo = () => {
    clearAllTimers();
    setScenarioKey("live");
    startBatch(buildMainDemoBatch(), "replace");
  };

  const loadScenario = (key) => {
    if (SANDBOX_SCENARIOS[key].live) {
      startMainDemo();
      return;
    }
    clearAllTimers();
    setScenarioKey(key);
    setAssets(SANDBOX_SCENARIOS[key].assets.map((a) => ({ ...a })));
  };

  /* ---- Sandbox harness only: Replay / Reset (Demo controls panel) ----
   * Both go through clearAllTimers() first, so every pending per-asset
   * timer AND any pending replay-start timer is cancelled — repeated
   * clicks can never stack duplicate timers. Neither touches `viewMode`,
   * so the Visual/Compact preference survives (the tabs are simply hidden
   * while the collection is empty, then reappear with the same choice). */
  const REPLAY_TIMER_KEY = "__sandbox-replay__";
  const REPLAY_EMPTY_PAUSE_MS = 700;

  const resetToEmpty = () => {
    clearAllTimers();
    setPreviewAsset(null);
    setScenarioKey("empty");
    setAssets([]);
  };

  // Replay: reset to the full Empty state, hold it briefly so the reviewer
  // sees the starting point, then run the same deterministic 11-asset batch
  // (staggered timing, transient Completed, one PDF + one image fail, Retry intact).
  const replaySimulatedUpload = () => {
    resetToEmpty();
    setScenarioKey("live");
    addTimer(
      REPLAY_TIMER_KEY,
      () => {
        timersRef.current.delete(REPLAY_TIMER_KEY);
        startBatch(buildMainDemoBatch(), "replace");
      },
      REPLAY_EMPTY_PAUSE_MS
    );
  };

  const handleAddAssets = (count = 3) => startBatch(buildAddedBatch(count), "prepend");

  // Retry always succeeds in this prototype: Failed → Uploading →
  // Completed (transient) → Ready.
  const handleRetry = (id) => {
    clearAssetTimers(id);
    patchAsset(id, { status: "uploading", justCompleted: false, progress: undefined });
    scheduleUpload(id, "completed", RETRY_UPLOAD_MS);
  };

  // Cancel upload and Delete share the existing sandbox behavior (remove
  // the asset from the collection); both now also stop that asset's own
  // timers. No other asset's state or timers are touched.
  const removeAsset = (id) => {
    clearAssetTimers(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setPreviewAsset((p) => (p && p.id === id ? null : p));
  };

  // Cancel all — batch-level equivalent of each asset's own "Cancel upload"
  // (same remove-and-stop-timers behavior), applied only to assets still
  // uploading. Completed, Ready and Failed assets are untouched.
  const cancelAllUploads = () => {
    assets.filter((a) => a.status === "uploading").forEach((a) => clearAssetTimers(a.id));
    setAssets((prev) => prev.filter((a) => a.status !== "uploading"));
  };

  // Attention-priority display order: a *display-only* derivation, never
  // written back into `assets` — the underlying collection/order in state
  // is untouched, so this is not a filter and does not permanently
  // reorder anything. Uploading/Failed sort first so they land inside the
  // initially-visible window instead of hiding behind "Show more";
  // Array.prototype.sort is stable, so items sharing the same priority
  // (e.g. every asset once a batch is fully resolved to "completed") keep
  // their original relative order — no special-casing needed for "don't
  // reorder a fully-resolved batch."
  //
  // Functional pass: an asset in its transient Completed flash also counts
  // as "needs attention", so the confirmation renders in the same slot the
  // spinner occupied. Without this, the asset would jump out of view the
  // instant it finished and the Completed state would never be seen. It
  // moves to the settled group only once it becomes neutral Ready.
  const displayAssets = useMemo(() => {
    const needsAttention = (a) =>
      a.status === "uploading" || a.status === "failed" || a.justCompleted ? 0 : 1;
    return [...assets].sort((a, b) => needsAttention(a) - needsAttention(b));
  }, [assets]);

  const visibleAssets = displayAssets.slice(0, visibleCount);
  const remaining = displayAssets.length - visibleCount;
  const isExpanded = visibleCount > initialForMode;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Sandbox harness chrome — Galileo primary blue (bg-primary /
          text-primary-content theme tokens) so it reads as a prototype/demo
          wrapper rather than the production app's global header.
          Sandbox harness chrome — clearly not production UI. Everything
          below this bar is the actual component under design validation. */}
      <div className="bg-primary text-primary-content px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold">Galileo Sandbox — Asset Upload / Asset View</p>
          <p className="text-xs opacity-70">Isolated design-validation prototype. Not wired into the production flow.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={`${HARNESS_BAR_BTN} ${demoControlsOpen ? "bg-primary-content/15" : ""}`}
            onClick={() => setDemoControlsOpen((o) => !o)}
            aria-expanded={demoControlsOpen}
            aria-controls="sandbox-demo-controls"
          >
            Demo controls {demoControlsOpen ? "▴" : "▾"}
          </Button>
          <Button variant="ghost" size="sm" className={HARNESS_BAR_BTN} onClick={onNavigateHome}>
            Exit sandbox
          </Button>
        </div>
      </div>

      {/* Demo controls — sandbox/testing affordance only. Lives in the dark
          harness chrome (not in the component), collapsed by default, so
          the scenario presets never read as product UI. Same presets and
          loadScenario behavior as before. */}
      {demoControlsOpen && (
        <DemoControls
          scenarioKey={scenarioKey}
          onSelect={loadScenario}
          onReplay={replaySimulatedUpload}
          onReset={resetToEmpty}
        />
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        <Card>
          {/* Header row: title/subtitle and the Visual | Compact view-mode
              switch share one row, vertically centered against each other. */}
          <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
            <div>
              <h1 className="text-base font-bold text-base-content">Supporting assets</h1>
              <p className="text-xs text-base-content/60 mt-0.5">
                Upload images, video, or reference files for this request.
              </p>
            </div>
            {/* View-mode control — always visible/functional whenever
                assets exist, including mid-upload (see the component doc
                comment's PROTOTYPE vs POTENTIAL PRODUCTION note above).
                Reuses the same Tab-based segmented-control pattern already
                established for Analytics' "Total demand / By request
                type" toggle. */}
            {assets.length > 0 && (
              <div
                className="flex items-center gap-1 border-b border-base-300 shrink-0"
                role="tablist"
                aria-label="Asset view mode"
              >
                <Tab
                  active={viewMode === "visual"}
                  onClick={() => setViewMode("visual")}
                  role="tab"
                  aria-selected={viewMode === "visual"}
                  className={VIEW_SWITCH_TAB_CLASS}
                >
                  Visual
                </Tab>
                <Tab
                  active={viewMode === "compact"}
                  onClick={() => setViewMode("compact")}
                  role="tab"
                  aria-selected={viewMode === "compact"}
                  className={VIEW_SWITCH_TAB_CLASS}
                >
                  Compact
                </Tab>
              </div>
            )}
          </div>

          {/* Uploader continuity: the upload area is always present and is
              the single entry point for adding files. Empty → the existing
              full UploadDropzone. Once assets exist → the same dropzone
              pattern collapsed to one row ("add more files"), never
              removed. Order below it is fixed: uploader → batch summary →
              assets, so the component reads as one continuous pattern from
              Empty through Uploading to Ready. */}
          {assets.length === 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              <UploadDropzone
                accept="image/*,video/*,.pdf"
                label="Drag and drop files here or"
                browseLabel="Browse files"
                onFileSelected={startMainDemo}
              />
              <p className="text-xs text-base-content/60">
                Accepted: images, video, or PDF. You can add more assets later.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <CompactUploadDropzone
                  accept="image/*,video/*,.pdf"
                  onFilesSelected={() => handleAddAssets(3)}
                />
              </div>

              <div className="mt-4">
                <BatchSummary
                  uploading={uploadingCount}
                  completed={completedCount}
                  failed={failedCount}
                  onCancelAll={cancelAllUploads}
                />
              </div>

              {isGrid ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                  {visibleAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onPreview={() => setPreviewAsset(asset)}
                      onRetry={() => handleRetry(asset.id)}
                      onCancel={() => removeAsset(asset.id)}
                      onDelete={() => removeAsset(asset.id)}
                    />
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-base-300 border-t border-base-300 mt-3">
                  {visibleAssets.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onPreview={() => setPreviewAsset(asset)}
                      onRetry={() => handleRetry(asset.id)}
                      onCancel={() => removeAsset(asset.id)}
                      onDelete={() => removeAsset(asset.id)}
                    />
                  ))}
                </ul>
              )}

              {(remaining > 0 || isExpanded) && (
                <div className="pt-3">
                  {remaining > 0 ? (
                    <Button
                      variant="text"
                      size="sm"
                      className="text-primary"
                      onClick={() => setVisibleCount((c) => c + Math.min(stepForMode, remaining))}
                    >
                      Show {Math.min(stepForMode, remaining)} more assets
                    </Button>
                  ) : (
                    <Button variant="text" size="sm" className="text-primary" onClick={() => setVisibleCount(initialForMode)}>
                      Show fewer assets
                    </Button>
                  )}
                </div>
              )}
              {/* The former standalone "Add assets" button was removed as
                  redundant: the compact dropzone above is now the one
                  consistent way to add more files. */}
            </>
          )}
        </Card>

        <FutureCapabilities />
      </div>

      {previewAsset && (
        <PreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onDelete={() => {
            removeAsset(previewAsset.id);
            setPreviewAsset(null);
          }}
        />
      )}
    </div>
  );
}

/** Batch-level status line. Top line ("Uploading N assets...") only shows
 * while something is actively uploading; the breakdown line is always
 * visible once at least one asset exists. Deliberately no "remaining MB"
 * figure — the prototype has no reliable byte-progress data to back it. */
function BatchSummary({ uploading, completed, failed, onCancelAll }) {
  const total = uploading + completed + failed;
  const parts = [];
  if (completed > 0) parts.push(`${completed} completed`);
  if (uploading > 0) parts.push(`${uploading} uploading`);
  if (failed > 0) parts.push(`${failed} failed`);

  // Not uploading → no banner, just the existing neutral count line (no
  // permanent success banner; transient per-asset Completed is unchanged).
  if (uploading === 0) {
    return (
      <p className="text-xs text-base-content/60">
        {total} asset{total === 1 ? "" : "s"} total{parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
      </p>
    );
  }

  // Active upload → full-width informational banner directly below the
  // upload area. Same recipe as Galileo's neutral/FYI InfoBanner tone
  // (`tone="default"`: bg-base-200 surface + primary InformationCircleIcon,
  // modeled on ImportCsvStep's informational block), composed locally only
  // because InfoBanner's `actions` slot stacks below the text and this
  // layout needs the action right-aligned and vertically centered. Border
  // is the same light base-300 hairline, not an alert color — this is
  // informational, not an alert. "Cancel all" uses the app's standard
  // neutral secondary Button (`variant="outline"`), as in ImportCsvStep.
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full flex items-center gap-3 rounded-box bg-base-200 border border-base-300 px-4 py-3"
    >
      <InformationCircleIcon className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-base-content">
          Uploading {uploading} asset{uploading === 1 ? "" : "s"}…
        </p>
        <p className="text-xs text-base-content/60 mt-0.5">{parts.join(" · ")}</p>
      </div>
      {onCancelAll && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onCancelAll}>
          Cancel all
        </Button>
      )}
    </div>
  );
}

/** Collapsed "add more files" state of the existing upload area. Same
 * pattern and treatment as the shared `UploadDropzone` (dashed
 * `border-base-300` box on `bg-base-200`, `primary/5` drag-over tint,
 * whole-box click target, soft-primary "Browse files" Button) laid out as
 * a single row instead of a centered stack. Kept local to the sandbox so
 * the shared UploadDropzone — also used by the production CSV import
 * step — is not modified while this pattern is still under review.
 * Picking or dropping any file triggers the simulated add-more batch; the
 * file itself is not read (prototype). */
function CompactUploadDropzone({ accept, onFilesSelected }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files.length > 0) onFilesSelected?.(files);
  };
  const openPicker = () => inputRef.current?.click();

  return (
    <div
      className={`rounded-box border-2 border-dashed px-4 py-3 cursor-pointer transition-colors flex items-center justify-center gap-2 flex-wrap ${
        dragOver ? "border-primary bg-primary/5" : "border-base-300 bg-base-200"
      }`}
      onClick={openPicker}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <ArrowUpTrayIcon className="w-5 h-5 text-base-content/40" aria-hidden="true" />
      <span className="text-sm text-base-content/70">Drag and drop more files here or</span>
      <Button
        type="button"
        variant="primary"
        emphasis="soft"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
      >
        Browse files
      </Button>
    </div>
  );
}

/** Sandbox-only scenario presets, rendered inside the dark harness chrome
 * so they're visibly prototype/testing controls, not product UI. */
function DemoControls({ scenarioKey, onSelect, onReplay, onReset }) {
  const harnessBtn = "btn btn-xs border btn-ghost text-primary-content border-primary-content/40";
  return (
    <div
      id="sandbox-demo-controls"
      className="bg-primary text-primary-content border-t border-primary-content/20 px-6 py-3 flex flex-col gap-2"
    >
      <div className="max-w-3xl w-full mx-auto flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide opacity-60 shrink-0 mr-1">Playback</span>
        <button type="button" onClick={onReplay} className={harnessBtn}>
          ↻ Replay simulated upload
        </button>
        <button type="button" onClick={onReset} className={harnessBtn}>
          Reset to empty
        </button>
      </div>
      <div className="max-w-3xl w-full mx-auto flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide opacity-60 shrink-0 mr-1">Prototype scenarios</span>
        {Object.entries(SANDBOX_SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={scenarioKey === key}
            className={`btn btn-xs border ${
              scenarioKey === key
                ? "bg-primary-content text-primary border-primary-content"
                : "btn-ghost text-primary-content border-primary-content/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** LIST row — Compact view mode. Every status (Uploading/Failed/Completed)
 * renders here directly; view switching never changes or resets an
 * asset's underlying status. Small (36px, `FileThumb`'s own default size)
 * thumbnail, filename, size, status area, contextual actions. Only a
 * "completed" asset ever shows its real preview image — Uploading/Failed
 * both fall back to `FileThumb`'s own neutral placeholder icon (no
 * `previewUrl` passed), since a not-yet-finished or failed upload
 * realistically has no valid preview to show yet. Status area is the only
 * place visual emphasis lives — completed is deliberately blank/neutral,
 * never a permanent green check. */
function AssetRow({ asset, onPreview, onRetry, onCancel, onDelete }) {
  const isUploading = asset.status === "uploading";
  const isFailed = asset.status === "failed";
  const isCompleted = asset.status === "completed";
  // Determinate only when the asset opted in AND a measured value exists;
  // otherwise the indeterminate spinner is the fallback.
  const isDeterminate = isUploading && typeof asset.progress === "number";

  const menuItems = isUploading
    ? [{ label: "Cancel upload", onSelect: onCancel, destructive: true }]
    : isFailed
      ? [
          { label: "Retry", onSelect: onRetry },
          { label: "Delete", onSelect: onDelete, destructive: true },
        ]
      : [
          { label: "Preview", onSelect: onPreview },
          { label: "Download", onSelect: () => {} },
          { label: "Delete", onSelect: onDelete, destructive: true },
        ];

  return (
    <li className="flex items-center gap-3 py-2">
      <MediaThumb asset={asset} ready={isCompleted} />

      <button
        type="button"
        className="min-w-0 flex-1 text-left disabled:cursor-default"
        onClick={isCompleted ? onPreview : undefined}
        disabled={!isCompleted}
      >
        <p className="text-sm text-base-content truncate">{asset.name}</p>
        <p className="text-xs text-base-content/60">{assetMeta(asset)}</p>
        {isDeterminate && (
          <progress
            className="progress progress-primary block w-full max-w-64 h-1 mt-1"
            value={asset.progress}
            max="100"
            aria-label={`${asset.name} upload progress`}
          />
        )}
      </button>

      <div className="w-28 shrink-0 flex items-center gap-1.5 text-xs">
        {isUploading && isDeterminate && (
          <span className="text-primary font-medium whitespace-nowrap tabular-nums">Uploading… {asset.progress}%</span>
        )}
        {isUploading && !isDeterminate && (
          <>
            <span className="loading loading-spinner loading-sm text-primary shrink-0" aria-hidden="true" />
            <span className="text-primary font-medium">Uploading…</span>
          </>
        )}
        {isFailed && (
          <>
            <ExclamationTriangleIcon className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
            <span className="text-destructive font-semibold">Failed</span>
          </>
        )}
        {/* Transient only — cleared after COMPLETED_FLASH_MS, leaving the
            Ready row neutral (blank status area). */}
        {isCompleted && asset.justCompleted && (
          <>
            <CheckCircleIcon className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
            <span className="text-success font-medium">Completed</span>
          </>
        )}
      </div>

      <MoreMenu items={menuItems} aria-label={`Actions for ${asset.name}`} />
    </li>
  );
}

/** GRID card — Visual view mode. Every status (Uploading/Failed/Completed)
 * renders as a normal card of the same dimensions; an uploading or failed
 * asset is never removed from the grid or demoted to a different
 * structure. Card anatomy is always: media area, filename, file size,
 * overflow menu (top-right, overlaid). Only "completed" ever shows the
 * real thumbnail image — Uploading replaces the media area with a
 * centered spinner + "Uploading…" (the loading state *replaces* the
 * thumbnail, it never appears as ordinary metadata below the filename);
 * Failed replaces it with a neutral unavailable-media icon + a restrained
 * inline "Failed" label, still inside that same media area, with only a
 * subtle border tint on the card itself — never a persistent full-card
 * red fill. Completed carries no badge/checkmark at all. */
function AssetCard({ asset, onPreview, onRetry, onCancel, onDelete }) {
  const isUploading = asset.status === "uploading";
  const isFailed = asset.status === "failed";
  const isCompleted = asset.status === "completed";
  // Determinate only when the asset opted in AND a measured value exists;
  // otherwise the indeterminate spinner is the fallback.
  const isDeterminate = isUploading && typeof asset.progress === "number";
  const mediaType = getMediaType(asset);
  const TypeIcon = MEDIA_TYPE_ICON[mediaType];

  const menuItems = isUploading
    ? [{ label: "Cancel upload", onSelect: onCancel, destructive: true }]
    : isFailed
      ? [
          { label: "Retry", onSelect: onRetry },
          { label: "Delete", onSelect: onDelete, destructive: true },
        ]
      : [
          { label: "Preview", onSelect: onPreview },
          { label: "Download", onSelect: () => {} },
          { label: "Delete", onSelect: onDelete, destructive: true },
        ];

  return (
    <div
      className={`relative rounded-box border bg-base-100 ${
        isFailed ? "border-error ring-1 ring-error" : "border-base-300"
      }`}
    >
      {/* Menu positioning: the card intentionally does NOT carry
       * `overflow-hidden` (only the media area below does, so its corners
       * still clip to match the card's rounded top). `overflow-hidden` on
       * the card itself would clip MoreMenu's `dropdown-content`, which is
       * an absolutely-positioned descendant — that was the cause of the
       * menu getting cut off / visually detached from its trigger. `z-20`
       * keeps the trigger (and the menu once open, via its own z-999 from
       * daisyUI) above neighboring grid cards. */}
      <div className="absolute top-1.5 right-1.5 z-20">
        <MoreMenu items={menuItems} aria-label={`Actions for ${asset.name}`} />
      </div>

      {isCompleted && asset.justCompleted ? (
        // Transient Completed confirmation — same neutral media area as the
        // Uploading state, with the spinner replaced by a success check.
        // After COMPLETED_FLASH_MS it is replaced by the real product image
        // (neutral Ready); no permanent badge or success background.
        <div className={`w-full aspect-square rounded-t-box overflow-hidden ${MEDIA_PLACEHOLDER_BG} flex flex-col items-center justify-center gap-1.5`}>
          <CheckCircleIcon className="w-6 h-6 text-success" aria-hidden="true" />
          <span className="text-xs text-success font-medium">Completed</span>
        </div>
      ) : isCompleted ? (
        <button
          type="button"
          className="block w-full aspect-square rounded-t-box overflow-hidden bg-base-200"
          onClick={onPreview}
        >
          {/* Ready media renderer by type — same card, same dimensions. */}
          {mediaType === "pdf" ? (
            <PdfCardMedia />
          ) : mediaType === "video" && asset.previewSrc ? (
            <VideoPoster src={asset.previewSrc} duration={asset.duration} size="card" />
          ) : asset.previewSrc ? (
            <img src={asset.previewSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-base-content/30">
              No preview
            </div>
          )}
        </button>
      ) : isUploading ? (
        <div className={`w-full aspect-square rounded-t-box overflow-hidden ${MEDIA_PLACEHOLDER_BG} flex flex-col items-center justify-center gap-2`}>
          {isDeterminate ? (
            <>
              <span className="text-xs text-primary font-medium tabular-nums">Uploading… {asset.progress}%</span>
              <progress
                className="progress progress-primary w-3/4 h-1.5"
                value={asset.progress}
                max="100"
                aria-label={`${asset.name} upload progress`}
              />
            </>
          ) : (
            <>
              <span className="loading loading-spinner loading-md text-primary" aria-hidden="true" />
              <span className="text-xs text-primary font-medium">Uploading…</span>
            </>
          )}
        </div>
      ) : (
        <div className={`w-full aspect-square rounded-t-box overflow-hidden ${MEDIA_PLACEHOLDER_BG} flex flex-col items-center justify-center gap-1`}>
          <TypeIcon className="w-6 h-6 text-base-content/40" aria-hidden="true" />
          <span className="text-[11px] text-destructive font-semibold flex items-center gap-1">
            <ExclamationTriangleIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Failed
          </span>
        </div>
      )}

      <div className="p-2">
        <p className="text-xs text-base-content truncate">{asset.name}</p>
        <p className="text-[11px] text-base-content/60 truncate">{assetMeta(asset, { withDuration: false })}</p>
      </div>
    </div>
  );
}

/** Lightbox-style preview — the existing shared Modal, not a Drawer. A
 * simple "see it bigger" surface only: no metadata editing, no tags, no
 * crop/resize/replace, no asset history. Only reachable for a
 * `completed` asset — both `AssetRow` and `AssetCard` only ever wire
 * `onPreview` in their completed branch, so uploading/failed assets can
 * never open this modal.
 *
 * Close-X: Modal's own header deliberately has no close icon (see
 * Modal.jsx's doc comment — its dismissal is explicit, via footer/
 * backdrop/Escape only), and that app-wide contract is out of scope to
 * change here. Rather than adding an icon into the shared header, this
 * renders its own close button as the first row of the modal body,
 * right-aligned and pulled up toward the title with negative margin —
 * an in-flow element, not `position: absolute`, so it can't be clipped
 * by the body's own `overflow-y-auto` (the same class of bug just fixed
 * on the grid card's overflow menu). It sits just under the title rather
 * than exactly level with it; see sandbox doc comment / known
 * limitations for that trade-off.
 *
 * Media (mixed-media pass) — same modal, renderer chosen by mediaType:
 *   - image: real local `previewSrc`, object-contain, never cropped, in a
 *     fixed-height box (unchanged).
 *   - pdf: a mock first page (white page on a light-gray surface with
 *     document-like blocks). No PDF parsing, no page navigation.
 *   - video: the static local poster styled as a player (play button,
 *     inert control bar, duration). No <video> element, no media file, no
 *     playback, no browser media controls.
 *   - anything else: the existing "No preview available" placeholder.
 * PDF/video show a one-line caption saying the preview is static, so
 * stakeholders aren't misled about prototype capabilities.
 */
function PreviewModal({ asset, onClose, onDelete }) {
  const mediaType = getMediaType(asset);
  const isImage = mediaType === "image";
  const isVideo = mediaType === "video";
  const isPdf = mediaType === "pdf";

  return (
    <Modal
      title="Preview"
      onCancel={onClose}
      maxWidthClass="max-w-[640px]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={ArrowDownTrayIcon} iconPosition="leading" onClick={() => {}}>
              Download
            </Button>
            <Button variant="text" className="text-error" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </>
      }
    >
      <div className="flex justify-end -mt-2 -mr-2 mb-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="btn btn-ghost btn-sm btn-square"
        >
          <XMarkIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <p className="text-sm text-base-content/60 mb-4">Asset name: {asset.name}</p>

      {isVideo && asset.previewSrc ? (
        <>
          <VideoPoster src={asset.previewSrc} duration={asset.duration} size="player" />
          <p className="text-xs text-base-content/50 mt-2">
            Static poster — video playback isn't available in this prototype.
          </p>
        </>
      ) : isPdf ? (
        <>
          <div className="flex items-center justify-center w-full h-[420px] bg-base-200 border border-base-300 rounded-box">
            <PdfDocumentPage doc={asset.doc ?? defaultPdfDoc(asset)} />
          </div>
          <p className="text-xs text-base-content/50 mt-2">Static PDF preview for prototype</p>
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-[420px] bg-base-100 border border-base-300 rounded-box">
          {isImage && asset.previewSrc ? (
            <img src={asset.previewSrc} alt="" className="max-h-full max-w-full object-contain" />
          ) : isVideo ? (
            <div className="flex flex-col items-center gap-2 text-base-content/40">
              <PlayCircleIcon className="w-10 h-10" aria-hidden="true" />
              <span className="text-sm">Video preview not available in this prototype</span>
            </div>
          ) : (
            <span className="text-sm text-base-content/40">No preview available</span>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------
 * Media renderers (sandbox-only, purely presentational). Same tokens and
 * surfaces as the rest of the component: base-100/200/300 grays, primary
 * blue accents, rounded-box radius. Decorative pieces are aria-hidden.
 * ------------------------------------------------------------------ */

/** List-row thumbnail (36px, same footprint as FileThumb). Images defer to
 * the shared FileThumb exactly as before; ready videos show the poster
 * with a small play glyph; everything else (PDF, uploading/failed video)
 * uses FileThumb's neutral placeholder box with the media-type icon. */
function MediaThumb({ asset, ready }) {
  const type = getMediaType(asset);
  if (type === "image") {
    return <FileThumb previewUrl={ready ? asset.previewSrc : undefined} mimeType={asset.mimeType} />;
  }
  if (type === "video" && ready && asset.previewSrc) {
    return (
      <div className="relative w-9 h-9 shrink-0">
        <img src={asset.previewSrc} alt="" className="w-9 h-9 rounded object-cover border border-base-300" />
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="w-4 h-4 rounded-full bg-black/55 flex items-center justify-center">
            <PlayIcon className="w-2.5 h-2.5 text-white translate-x-px" />
          </span>
        </span>
      </div>
    );
  }
  if (type === "pdf" && ready) {
    // Ready PDF = file identity (white page, folded corner, blue PDF tag),
    // deliberately NOT the gray placeholder used for uploading/failed.
    return (
      <div className="w-9 h-9 rounded shrink-0 border border-base-300 bg-base-100 flex items-center justify-center">
        <PdfGlyph className="w-6 h-7" />
      </div>
    );
  }
  const Icon = MEDIA_TYPE_ICON[type] ?? PhotoIcon;
  return (
    <div className="w-9 h-9 rounded shrink-0 border border-base-300 bg-base-200 flex items-center justify-center">
      <Icon className="w-4 h-4 text-base-content/40" aria-hidden="true" />
    </div>
  );
}

/** Static video poster with play affordance. `card` = grid media area
 * (fills the square, small duration badge); `player` = Preview modal
 * (16:9, large play button, inert player bar). Never plays anything. */
function VideoPoster({ src, duration, size }) {
  if (size === "player") {
    return (
      <div
        className="relative w-full aspect-video rounded-box overflow-hidden bg-neutral"
        role="img"
        aria-label="Video poster — playback not available in this prototype"
      >
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="w-16 h-16 rounded-full bg-black/55 ring-1 ring-white/40 flex items-center justify-center shadow-lg">
            <PlayIcon className="w-8 h-8 text-white translate-x-0.5" />
          </span>
        </div>
        {/* Inert, decorative player bar — not a control. */}
        <div
          className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-4 pt-10 pb-3 flex items-center gap-3 text-white"
          aria-hidden="true"
        >
          <PlayIcon className="w-4 h-4 shrink-0" />
          <div className="relative flex-1 h-1 rounded-full bg-white/30">
            <span className="absolute -top-1 left-0 w-3 h-3 rounded-full bg-white" />
          </div>
          <span className="text-xs tabular-nums shrink-0">0:00 / {duration ?? "0:00"}</span>
          <SpeakerWaveIcon className="w-4 h-4 shrink-0" />
          <ArrowsPointingOutIcon className="w-4 h-4 shrink-0" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full">
      <img src={src} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="w-10 h-10 rounded-full bg-black/55 ring-1 ring-white/40 flex items-center justify-center">
          <PlayIcon className="w-5 h-5 text-white translate-x-px" />
        </span>
      </div>
      {duration && (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 text-white text-[10px] font-medium leading-none px-1.5 py-1 tabular-nums">
          {duration}
        </span>
      )}
    </div>
  );
}

/** PDF file-identity glyph — page silhouette with a folded corner,
 * subtle text lines and a primary-blue "PDF" tag. Used ONLY for Ready
 * PDFs (list thumb + grid media); uploading/failed PDFs keep the generic
 * gray placeholder, so a valid document never looks like an error. */
function PdfGlyph({ className = "" }) {
  return (
    <svg viewBox="0 0 48 60" className={className} aria-hidden="true">
      <path d="M6 1.5 H32 L45 14.5 V58.5 H6 Z" className="fill-base-100 stroke-base-300" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M32 1.5 V14.5 H45 Z" className="fill-base-200 stroke-base-300" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="12" y="20" width="22" height="2.4" rx="1.2" className="fill-base-content/25" />
      <rect x="12" y="26" width="27" height="2" rx="1" className="fill-base-300" />
      <rect x="12" y="31" width="24" height="2" rx="1" className="fill-base-300" />
      <rect x="12" y="36" width="26" height="2" rx="1" className="fill-base-300" />
      <rect x="1" y="44" width="27" height="11" rx="2" className="fill-primary" />
      <text x="14.5" y="52.2" textAnchor="middle" fontSize="7.5" fontWeight="700" className="fill-primary-content" style={{ fontFamily: "inherit", letterSpacing: "0.04em" }}>
        PDF
      </text>
    </svg>
  );
}

/** Grid media area for a ready PDF: the file-identity glyph centered on
 * the neutral surface — same card dimensions as image/video cards. */
function PdfCardMedia() {
  return (
    <div className="w-full h-full bg-base-200 flex items-center justify-center">
      <PdfGlyph className="w-[42%] drop-shadow-sm" />
    </div>
  );
}

/** Preview modal body for a PDF: a static, readable mock first page
 * (typography, rules, a field table, whitespace) on the light-gray
 * preview surface. Content comes from `asset.doc` (illustrative prototype
 * content). Not a PDF renderer — no parsing, no library, no paging. */
function PdfDocumentPage({ doc }) {
  return (
    <div
      className="h-[396px] aspect-[8.5/11] bg-base-100 border border-base-300 rounded-sm shadow-md px-7 py-6 flex flex-col overflow-hidden text-base-content"
      role="img"
      aria-label={`${doc.heading}: ${doc.subject} — static PDF preview`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[9px] font-bold tracking-[0.14em] text-primary">{doc.heading}</p>
        <p className="text-[8px] text-base-content/50 text-right whitespace-nowrap">{doc.reference}</p>
      </div>
      <p className="mt-4 text-[15px] font-bold leading-tight">{doc.subject}</p>
      <p className="mt-0.5 text-[10px] text-base-content/60">{doc.subline}</p>
      <div className="h-px bg-base-content/70 mt-3 mb-3" />
      <p className="text-[9px] font-semibold uppercase tracking-wide text-base-content/60 mb-1.5">{doc.sectionTitle}</p>
      <dl className="grid grid-cols-[auto_1fr] text-[10px] border-t border-base-300">
        {doc.fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="py-1.5 pr-5 text-base-content/60 border-b border-base-300">{label}</dt>
            <dd className="py-1.5 font-medium border-b border-base-300">{value}</dd>
          </div>
        ))}
      </dl>
      {doc.notes && (
        <>
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-wide text-base-content/60 mb-1">Notes</p>
          <p className="text-[9.5px] leading-snug text-base-content/70">{doc.notes}</p>
        </>
      )}
      <div className="mt-auto pt-2 flex justify-between text-[8px] text-base-content/40 border-t border-base-300">
        <span>Galileo · Content Management</span>
        <span>Page 1 of {doc.pages ?? 1}</span>
      </div>
    </div>
  );
}

const FUTURE_CAPABILITIES = [
  "Descriptions",
  "Tags",
  "Crop",
  "Resize",
  "Replace asset",
  "Advanced metadata",
  "Bulk actions",
  "Search",
  "Filtering",
  "Dedicated asset library",
];

/** Documents scope boundaries directly on the sandbox page — plain text,
 * not interactive, not implemented. */
function FutureCapabilities() {
  return (
    <div className="text-xs text-base-content/40">
      <p className="font-semibold text-base-content/50 uppercase tracking-wide mb-1">
        Future capabilities — not implemented in this sandbox
      </p>
      <p>{FUTURE_CAPABILITIES.join(" · ")}</p>
      <p className="font-semibold text-base-content/50 uppercase tracking-wide mt-3 mb-1">Prototype note — upload progress</p>
      <p>
        Launch Video.mp4 shows simulated percentage progress. Determinate upload progress requires reliable progress
        events from the upload infrastructure. Fall back to an indeterminate spinner when progress cannot be measured.
      </p>
    </div>
  );
}
