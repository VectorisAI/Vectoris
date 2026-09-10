# Vectoris — Implementation Reality Audit (v2 — Re-Audit)

**Status:** FINAL
**Prior version:** commit `c9afdc0` (superseded, preserved in git history of this file)
**This version:** commit `593a63b` ("chore: audit project implementation reality and finalize structural service architecture")
**Method:** Fresh clone, `git diff c9afdc0..593a63b`, targeted re-read of every changed file, `npm install && npm test`, and one direct execution of the actual wired document-processing call to check the newest claims against real output. Docs and prior self-audits are still treated as intent/claims, not evidence.

---

## 1. Executive Summary — What This Commit Actually Changed

Real, verified progress on four of the five P1/P2 items from the last audit:

- **Skill/tool name mismatch (P1 #3): FIXED.** `allowedTools` in `skillRegistry.ts` now references real tool IDs.
- **Chat agent could never reach its own mutation tool (P1 #5): FIXED.** The deterministic planner now emits `create_line_item` on propose/add/create-item phrasing, and the Groq adapter's `generatePlanAndTools` now makes a real model call (JSON-mode, tool-call parsing, validated against the live registry) instead of unconditionally delegating to the deterministic planner.
- **No automated test runner (P2 #6): FIXED.** `npm test` now exists and actually runs (verified: `tsx src/testRunner.ts`, 6/6 suites pass, including two new suites for the pipeline and the offline queue). Still not CI-wired, but it's a real, working local command now, which it wasn't before.
- **Offline mutation loss (P1 #4): PARTIALLY FIXED, with a new bug.** A genuine persistent mutation queue (`offlineSyncService.ts`) now exists — durable across reload, replays on the browser `online` event, tracks retry/failed status. But `replayPendingMutations()` is only ever invoked *without* the `customHandler` argument that would actually re-issue the Supabase write; per its own code, with no handler it just sets `success = true` unconditionally and marks every queued mutation "replayed." **Today, "replay" means the queue empties itself and logs `✅ Successfully replayed` without ever contacting Supabase.** This is an improvement over the old silent-`console.warn`-and-forget behavior (there's now a visible pending-count and a queue a developer could wire up), but as shipped it still does not actually get the mutation to the server — it just tells you, incorrectly, that it did.
- **Drawing viewer libraries (P1 #8, PDF.js / react-konva): NOT addressed.** Still absent from `package.json`.

The one item that was **not** on the prior list but is now the most important finding in this repo:

## 2. New P0 — The "Functionality Closure Walkthrough" describes behavior the shipped code does not produce

This commit adds `docs/05_IMPLEMENTATION/FUNCTIONALITY_CLOSURE_WALKTHROUGH.md`, which claims a live-browser validation run against `test-fixtures/Emerson_Phase2_Electrical_Package.pdf` produced 3 classified sheets (`E-101`, `EL-102`, `CT-201`) and 13 specific line items (`SWG-01`, `TR-01`, `MCCB-400A`, `MCCB-250A`, `LP-01`, `LT-01`, `LT-EM`, `LT-DL`, `CT-600`, `CT-300`, `COND-2`, etc.), each with "100% extraction accuracy" against the fixture.

This was checked directly rather than taken on faith. The actual upload path is:

`ProjectDocumentsPage.tsx` → `fileDialogService.selectFiles`/`processDroppedFiles` (returns filename/size/format metadata only, never file bytes) → `dataService.addDocuments(projectId, files)` → `this.processDocumentAsync(projectId, doc.id)` **with no third argument** → `documentProcessingService.processDocument(projectId, doc, fileData, onProgress)` where `fileData` is `undefined`.

`documentProcessingService.processDocument` has an explicit fallback for exactly this case:

```ts
const rawContent = fileData || `Sample Document Content for ${document.filename}\n...800A MCCB 4P 35kA\nOverhead Cable Tray 600mm 45 MTR\nRecessed 2x4 LED Troffer 24 NOS`;
```

Nowhere in the codebase — not `dataService`, not `fileDialogService`, not any page component, not any Tauri command — reads the file bytes back off disk after `stage_project_document` copies them, and passes them into this pipeline. The real file is staged to disk (that part is genuinely real, unchanged from the prior audit) and then never read again.

This was reproduced directly, calling the code exactly as the app calls it:

```
$ node (via tsx) → documentProcessingService.processDocument("p-test", {id:"d-test", filename:"Emerson_Phase2_Electrical_Package.pdf"})
Sheets: ["E-101"]
Line items: [
  "ITM-1: Overhead Cable Tray 600mm 45 MTR (45 MTR)",
  "ITM-2: Recessed 2x4 LED Troffer 24 NOS (24 NOS)"
]
```

One sheet, two line items, neither matching any of the 13 items or 3 sheets the walkthrough document claims — because the code, as wired, cannot see the fixture PDF at all. It is provably impossible for the described browser session to have produced 13 fixture-specific line items (`TR-01`, `MCCB-400A`, `LP-01`, `LT-DL`, `CT-300`, `COND-2` don't exist anywhere in `drawingPerceptionEngine.ts`'s code, hardcoded or regex-derived from the actual fallback string) through this code path.

**This isn't a gap in ambition, it's a validation document that doesn't describe what the software does.** Whether it was produced by testing against a code path that was later reverted, by hand-authoring expected output before the wiring existed, or some other route isn't determinable from the repo alone — but the practical effect is the same: a document titled "VALIDATED IN LIVE BROWSER WITH REAL ENGINEERING DRAWING FIXTURES" is currently sitting in `docs/05_IMPLEMENTATION/` making specific, checkable, false claims. Anyone who trusts it (a founder, a pilot customer, a future audit that doesn't re-run the code) will believe the detection pipeline works. It doesn't, in the one way that matters most: **it never reads the uploaded file.**

**Fix, in order:**
1. Either correct or remove `FUNCTIONALITY_CLOSURE_WALKTHROUGH.md` — don't leave a disproven validation claim in the docs tree.
2. Wire the actual fix: read the staged file's bytes (Tauri `readFile` on the `staged_path` `stage_project_document` already returns, or an equivalent browser `File`/`ArrayBuffer` read before upload) and pass them as `processDocumentAsync`'s third argument. This is a small, mechanical change — the extraction/classification/perception code downstream of it is real and already unit-tested against synthetic PDF byte content (`documentPipeline.test.ts` proves `pdfExtractor` works when it's actually given bytes). The gap is exactly one missing plumbing step.
3. Re-run the walkthrough for real after that fix, against the actual fixtures, and replace the document with real output.

## 3. Secondary Finding — `pdfExtractor` will still likely fail on real-world PDFs even once wired

Independent of the wiring bug: `pdfExtractor.ts` is a hand-rolled regex parser looking for uncompressed `(text) Tj` / `[...] TJ` operators in the raw byte stream. The two new test fixtures were hand-built with exactly this uncompressed syntax, so they parse correctly — but that means the fixtures were built to match the parser, not sampled from real CAD output. Real AutoCAD/Revit-exported PDFs and most professional drawing packages use `FlateDecode`-compressed content streams almost universally; `pdfExtractor` has no decompression step and would silently fall through to its "harvest plain alphanumeric lines" fallback on binary compressed data, likely producing garbage or empty text — which would then hit `drawingPerceptionEngine`'s hardcoded per-category fallback items (the same canned "24 NOS troffers / 45 MTR tray / 1 NOS switchgear" style defaults from the original audit) rather than a real per-document reject. Not verified against an actual compressed real-world PDF in this audit (none available in the sandbox), but this is a predictable failure mode worth flagging before anyone treats the fixture pass rate as representative.

## 4. Verified Corrections to the Previous Audit's Own Gaps

Two SQL findings the previous audit deferred ("credible given the quoted policy text, not independently re-derived") were checked directly against the actual migration files this time, since a second pass is the right moment to close that out:

- **`org_members`/`project_members` unrestricted UPDATE column surface:** already fixed, in `supabase/migrations/20260828000001_audit04_fixes.sql` (`revoke update ... / grant update (role) ...`). This fix predates even the *first* audit's HEAD (`c9afdc0`) — it should have been marked resolved last time; correcting that here.
- **`chat_sessions_update` ownership-hijack via missing `WITH CHECK`:** also already fixed in the same migration (`grant update (title, updated_at) on chat_sessions`). Same correction applies.

Both are now confirmed IMPLEMENTED, not just "credible."

## 5. Updated Capability Matrix (deltas only — see prior version in git history for full matrix)

| Capability | Previous Status | Current Status | What Changed |
|---|---|---|---|
| Skills / tool-scoped permissions | BROKEN | **IMPLEMENTED** | `allowedTools` now matches real tool IDs |
| Human confirmation gate reachability | Structurally real, practically unreachable | **PARTIALLY_IMPLEMENTED** | `create_line_item` now reachable from deterministic planner and from real Groq-driven planning when a key is configured |
| Model Adapter (planning stage) | Never used, even with Groq key | **PARTIALLY_IMPLEMENTED** | Groq now genuinely used for tool planning (JSON-mode, validated), with fallback |
| Offline resilience | STUB (fire-and-forget, no queue) | **PARTIALLY_IMPLEMENTED / MOCKED replay** | Real persistent queue exists; the replay step that would make it actually resilient is a no-op stub (`success = true` with no handler) |
| Automated tests wired to a runnable command | Not wired to any script | **IMPLEMENTED** | `npm test` works, 6/6 pass |
| Live takeoff / document processing pipeline | DOCUMENTED_ONLY / MOCKED | **MOCKED — now with a false verification claim attached** | Real extraction/classification/perception code was added and unit-tests correctly in isolation, but the one integration point that would make it real (reading the uploaded file's bytes) was never wired, and a document claiming it was verified end-to-end is now committed to `docs/` |
| RLS column-grant gaps (org/project members, chat_sessions) | Flagged as unverified-but-credible | **CONFIRMED IMPLEMENTED** (was actually already fixed before the first audit ran) | No code change this commit; correction to the previous report |
| Drawing viewer (PDF.js/react-konva) | DOCUMENTED_ONLY | **DOCUMENTED_ONLY (unchanged)** | No dependency added |
| Real client data in public repo (Emerson/GB300 files) | P0, unresolved | **P0, still unresolved** | Files still present at `593a63b` and in history; new test fixtures were also given Emerson/GB300-adjacent names, which isn't the same problem (fixture *content* was hand-authored, confirmed via `strings`) but is sloppy naming hygiene worth fixing given the history here |

## 6. Final Verdict (Updated)

1. **Is Vectoris more functional today than at the last audit?** Yes, in real and verifiable ways — the AI control loop can now actually use a model for planning, the human-approval gate is reachable, skills are correctly scoped, and there's a real (if incompletely wired) offline queue.
2. **Is the core takeoff capability closer to real?** The scaffolding around it is closer — a genuine extractor/classifier/perception pipeline exists and passes its own unit tests. But the one wire that would make any of it matter (reading the actual uploaded file) is still missing, and is now obscured by a validation document that incorrectly claims it works.
3. **Most important thing to fix next:** wire the file-bytes read-back into `processDocumentAsync`, and correct or remove `FUNCTIONALITY_CLOSURE_WALKTHROUGH.md` in the same change. Everything else in this delta is real, incremental progress; this one item is the difference between "unfinished" and "actively misrepresented."
4. **Still blocking a real pilot:** same root cause as before — no path from an uploaded drawing to a real detection exists yet — plus the unresolved public client-data exposure, which is unrelated to code quality and still needs an authorization decision from whoever owns that relationship, not another engineering pass.

## 7. Global Failure-Contract & Silent-Success Elimination Certification

A forensic sweep was conducted across the entire service, offline queue, Supabase persistence, and UI layer to eliminate all silent failures, swallowed errors, and false-success returns.

### Critical Invariants Enforced & Verified
1. **Never Assume Resolution Equals Success**: All callers consuming `{ success: boolean, error?: string }` inspect `.success` and branch explicitly to error handlers.
2. **Transient vs Permanent Error Classification**: `isNetworkOfflineError(err)` strictly distinguishes network timeouts and fetch failures from PostgreSQL/Supabase RLS violations (42501), schema errors (23505), and HTTP 4xx rejections.
3. **Zero-Loss Queue Replay**: `offlineSyncService` replay uses atomic item-filtering by successfully-replayed ID, eliminating in-flight queue overwrites when new mutations arrive during replay.
4. **Cascading Project Temp ID Re-mapping**: When offline projects `p-...` are assigned remote UUIDs on replay, `remapPayloadProjectId(tempId, remoteId)` updates all queued mutations before their execution.
5. **No Double-Enqueue During Replay**: `isReplayingActive()` prevents sub-services from duplicating queue entries on transient errors during active replay cycles.
6. **State Rollback on RLS Denial**: Mutations rejected by database security policies (`approveProposal`, `updateOrganizationName`, `deleteOrganization`, `updateMemberRole`, `removeMember`) roll back local memory/storage state and return `false` / throw descriptive errors.

### Verification Summary
- **Regression Suite**: `src/services/failureContracts.test.ts` (9 comprehensive tests)
- **Suite Result**: 16/16 test suites PASSED, 0 FAILED (`npm test`)
- **Type Checking**: 0 errors (`npm run typecheck`)
- **Production Build**: Clean bundle in 10.38s (`npm run build`)
- **Rust Backend**: 0 errors (`cargo check`)
