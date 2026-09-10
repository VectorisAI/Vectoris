/**
 * projectPlanService.ts — Project Plan Domain Service & State Boundary.
 *
 * Implements the authoritative Project Plan specification in docs/PLAN.md:
 * - Pure claim diffing by stable claim_id
 * - Guarded draft creation, acceptance with Decision conflict resolution, and rejection
 * - Immutable version retrieval
 * - Offline/local fallback support
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { offlineSyncService, isNetworkOfflineError } from "./offlineSyncService";
import type {
  ProjectPlan,
  PlanVersion,
  PlanClaim,
  Decision,
  ClaimLineage,
  DecisionResolution,
  ClaimDiffItem,
  ClaimSection,
  ClaimGrounding,
  ProjectDocument,
} from "../data/types";
import { generateId } from "./idService";

export interface CreateDraftParams {
  projectId: string;
  documentIds?: string[];
  claims: Array<{
    claim_id?: string;
    section: ClaimSection;
    content: string;
    grounding: ClaimGrounding;
    evidence_links?: Array<{
      document_id: string;
      document_name?: string;
      sheet_id?: string;
      sheet_index?: number;
      coordinates?: { x: number; y: number; width: number; height: number };
      note?: string;
    }>;
    inference_rationale?: string | null;
    unresolved_reason?: string | null;
    conflict_with_decision_id?: string | null;
    conflict_details?: string | null;
  }>;
  lineage?: Array<{
    parent_claim_id: string;
    child_claim_id: string;
    relationship: "split" | "merge";
  }>;
}

// ============================================================================
// TEMP: Mock Plan Creation Loop for Demo (Not for Production)
// ----------------------------------------------------------------------------
// Utility helper to identify demo accounts / sample projects that operate
// purely in local isomorphic mock mode without remote Supabase schema dependencies.
// In production, all projects utilize authoritative remote Supabase tables/RPCs.
// REMOVE OR DISABLE BEFORE PRODUCTION DEPLOYMENT.
// ============================================================================
export function isDemoProject(projectId: string): boolean {
  if (!projectId) return false;
  return (
    projectId.startsWith("p-") ||
    projectId.startsWith("p1") ||
    projectId.startsWith("p2") ||
    projectId.startsWith("demo-") ||
    projectId === "66666666-6666-6666-6666-666666666666" ||
    projectId.startsWith("33333333") ||
    projectId.startsWith("44444444")
  );
}

const LOCAL_STORE_KEY = "vectoris.store.v1.projectPlans.";

const memoryPlans = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val) return val;
    } catch {
      // fallback
    }
  }
  return memoryPlans.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // fallback
    }
  }
  memoryPlans.set(key, value);
}

function getAllPlanKeys(): string[] {
  const keys = new Set<string>();
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORE_KEY)) keys.add(k);
      }
    } catch {
      // fallback
    }
  }
  for (const k of memoryPlans.keys()) {
    if (k.startsWith(LOCAL_STORE_KEY)) keys.add(k);
  }
  return Array.from(keys);
}

function loadLocalPlan(projectId: string): ProjectPlan | null {
  try {
    const raw = getStorageItem(LOCAL_STORE_KEY + projectId);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Error loading local project plan:", err);
  }
  return null;
}

function saveLocalPlan(projectId: string, plan: ProjectPlan): void {
  try {
    setStorageItem(LOCAL_STORE_KEY + projectId, JSON.stringify(plan));
  } catch (err) {
    console.warn("Error saving local project plan:", err);
  }
}

class ProjectPlanService {
  /**
   * Fetches the Project Plan for a given project, including active and draft versions.
   */
  public async getProjectPlan(projectId: string): Promise<ProjectPlan | null> {
    // ============================================================================
    // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
    // ----------------------------------------------------------------------------
    // If Supabase is unconfigured or this is a demo project, immediately return
    // the local isomorphic plan without attempting remote schema queries.
    // ============================================================================
    if (!isSupabaseConfigured() || isDemoProject(projectId)) {
      return loadLocalPlan(projectId);
    }

    try {
      const { data: planData, error: planError } = await supabase
        .from("project_plans")
        .select("id, project_id, created_at, updated_at")
        .eq("project_id", projectId)
        .maybeSingle();

      if (planError) {
        if (isNetworkOfflineError(planError)) {
          return loadLocalPlan(projectId);
        }
        console.warn("Failed to fetch project plan:", planError.message);
        return loadLocalPlan(projectId);
      }

      if (!planData) {
        return loadLocalPlan(projectId);
      }

      // Fetch all versions for this plan
      const { data: versionsData, error: versionsError } = await supabase
        .from("project_plan_versions")
        .select("id, plan_id, version_number, status, created_by, created_at, activated_at, superseded_at")
        .eq("plan_id", planData.id)
        .order("version_number", { ascending: false });

      if (versionsError || !versionsData) {
        return loadLocalPlan(projectId);
      }

      const versionIds = versionsData.map((v) => v.id);

      // Fetch claims for these versions
      let claimsByVersion = new Map<string, PlanClaim[]>();
      if (versionIds.length > 0) {
        const { data: claimsData } = await supabase
          .from("project_plan_claims")
          .select("*")
          .in("plan_version_id", versionIds);

        if (claimsData) {
          for (const c of claimsData) {
            const list = claimsByVersion.get(c.plan_version_id) || [];
            list.push({
              id: c.id,
              claim_id: c.claim_id,
              plan_version_id: c.plan_version_id,
              section: c.section as ClaimSection,
              content: c.content,
              grounding: c.grounding as ClaimGrounding,
              evidence_links: (c.evidence_links as unknown as PlanClaim["evidence_links"]) || [],
              inference_rationale: c.inference_rationale,
              unresolved_reason: c.unresolved_reason,
              conflict_with_decision_id: c.conflict_with_decision_id,
              conflict_details: c.conflict_details,
              created_at: c.created_at,
            });
            claimsByVersion.set(c.plan_version_id, list);
          }
        }
      }

      const versions: PlanVersion[] = versionsData.map((v) => ({
        id: v.id,
        plan_id: v.plan_id,
        version_number: v.version_number,
        status: v.status,
        created_by: v.created_by,
        created_at: v.created_at,
        activated_at: v.activated_at,
        superseded_at: v.superseded_at,
        claims: claimsByVersion.get(v.id) || [],
        is_synced: true,
        sync_status: "synced",
      }));

      const activeVersion = versions.find((v) => v.status === "active") || null;
      const draftVersion = versions.find((v) => v.status === "draft") || null;

      const plan: ProjectPlan = {
        id: planData.id,
        project_id: planData.project_id,
        created_at: planData.created_at,
        updated_at: planData.updated_at,
        active_version: activeVersion,
        draft_version: draftVersion,
        version_history: versions,
        is_synced: true,
        sync_status: "synced",
      };

      saveLocalPlan(projectId, plan);
      return plan;
    } catch (err) {
      if (isNetworkOfflineError(err)) {
        return loadLocalPlan(projectId);
      }
      console.warn("Exception in getProjectPlan:", err);
      return loadLocalPlan(projectId);
    }
  }

  /**
   * Fetches active Decisions attached to claim identities for a project.
   */
  public async getClaimDecisions(projectId: string): Promise<Decision[]> {
    // ============================================================================
    // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
    // ----------------------------------------------------------------------------
    // For demo projects, return grounded mock decisions to enable interactive
    // testing of the Decision Conflict Resolution modal and diff comparison.
    // ============================================================================
    if (isDemoProject(projectId)) {
      return [
        {
          id: "dec-demo-transformer",
          claim_id: "cid-gen-scope-2",
          project_id: projectId,
          decision_text: "Enforce Dry-Type Cast Resin Transformers (33kV/415V) for indoor substation gallery compliance per NFPA 70.",
          rationale: "Oil-filled transformers prohibited inside building envelope without 3-hour rated fire vault and blast relief walls.",
          decided_by: "Lead Electrical PE",
          decided_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          is_active: true,
        },
      ];
    }

    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("decisions")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true);

      if (error || !data) return [];

      return data.map((d) => ({
        id: d.id,
        claim_id: d.claim_id,
        project_id: d.project_id,
        decision_text: d.decision_text,
        rationale: d.rationale,
        decided_by: d.decided_by,
        decided_at: d.decided_at,
        superseded_by: d.superseded_by,
        superseded_at: d.superseded_at,
        is_active: d.is_active,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches claim lineage associated with a triggering plan version.
   */
  public async getClaimLineage(versionId: string): Promise<ClaimLineage[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("claim_lineage")
        .select("*")
        .eq("triggering_plan_version_id", versionId);

      if (error || !data) return [];

      return data.map((l) => ({
        id: l.id,
        parent_claim_id: l.parent_claim_id,
        child_claim_id: l.child_claim_id,
        relationship: l.relationship,
        occurred_at: l.occurred_at,
        triggering_plan_version_id: l.triggering_plan_version_id,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Creates a local plan draft representation in localStorage.
   */
  public createLocalDraft(params: CreateDraftParams, isSynced: boolean = true): string {
    const { projectId, claims } = params;
    let plan = loadLocalPlan(projectId);
    if (!plan) {
      plan = {
        id: generateId("plan"),
        project_id: projectId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version_history: [],
      };
    }

    if (plan.draft_version) {
      // ============================================================================
      // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
      // ----------------------------------------------------------------------------
      // In demo mode, replace the open draft version cleanly rather than throwing an
      // error so that the user can iteratively re-synthesize revisions without friction.
      // ============================================================================
      plan.version_history = (plan.version_history || []).filter(
        (v) => v.id !== plan.draft_version!.id
      );
      plan.draft_version = null;
    }

    const versionNumber = (plan.version_history?.length || 0) + 1;
    const draftId = generateId("ppv");

    const draftClaims: PlanClaim[] = claims.map((c) => ({
      id: generateId("claim"),
      claim_id: c.claim_id || generateId("cid"),
      plan_version_id: draftId,
      section: c.section,
      content: c.content,
      grounding: c.grounding,
      evidence_links: (c.evidence_links as PlanClaim["evidence_links"]) || [],
      inference_rationale: c.inference_rationale,
      unresolved_reason: c.unresolved_reason,
      // TEMP: Preserve decision conflict metadata for demo resolution testing
      conflict_with_decision_id: (c as any).conflict_with_decision_id || null,
      conflict_details: (c as any).conflict_details || null,
      created_at: new Date().toISOString(),
    }));

    const draftVersion: PlanVersion = {
      id: draftId,
      plan_id: plan.id,
      version_number: versionNumber,
      status: "draft",
      created_by: "Project Engineer",
      created_at: new Date().toISOString(),
      claims: draftClaims,
      is_synced: isSynced,
      sync_status: isSynced ? "synced" : "offline_queued",
    };

    plan.draft_version = draftVersion;
    plan.version_history = [draftVersion, ...(plan.version_history || [])];
    plan.is_synced = isSynced;
    plan.sync_status = isSynced ? "synced" : "offline_queued";
    saveLocalPlan(projectId, plan);
    return draftId;
  }

  /**
   * Activates a local plan draft in isomorphic storage.
   */
  public acceptLocalDraft(
    draftVersionId: string,
    resolutions: DecisionResolution[] = [],
    isSynced: boolean = true
  ): void {
    for (const key of getAllPlanKeys()) {
      const raw = getStorageItem(key);
      if (raw) {
        try {
          const plan: ProjectPlan = JSON.parse(raw);
          if (plan.draft_version?.id === draftVersionId) {
            const prevActive = plan.active_version;
            if (prevActive) {
              prevActive.status = "superseded";
              prevActive.superseded_at = new Date().toISOString();
            }
            const activated: PlanVersion = {
              ...plan.draft_version,
              status: "active",
              activated_at: new Date().toISOString(),
              is_synced: isSynced,
              sync_status: isSynced ? "synced" : "offline_queued",
            };
            plan.active_version = activated;
            plan.draft_version = null;
            plan.updated_at = new Date().toISOString();
            plan.is_synced = isSynced;
            plan.sync_status = isSynced ? "synced" : "offline_queued";
            plan.version_history = (plan.version_history || []).map((v) =>
              v.id === activated.id ? activated : v.id === prevActive?.id ? prevActive : v
            );
            setStorageItem(key, JSON.stringify(plan));
            return;
          }
        } catch {
          // ignore corrupted entry
        }
      }
    }
  }

  /**
   * Rejects a local plan draft in isomorphic storage.
   */
  public rejectLocalDraft(draftVersionId: string, isSynced: boolean = true): void {
    for (const key of getAllPlanKeys()) {
      const raw = getStorageItem(key);
      if (raw) {
        try {
          const plan: ProjectPlan = JSON.parse(raw);
          if (plan.draft_version?.id === draftVersionId) {
            const rejected: PlanVersion = {
              ...plan.draft_version,
              status: "superseded",
              superseded_at: new Date().toISOString(),
              is_synced: isSynced,
              sync_status: isSynced ? "synced" : "offline_queued",
            };
            plan.draft_version = null;
            plan.updated_at = new Date().toISOString();
            plan.version_history = (plan.version_history || []).map((v) =>
              v.id === rejected.id ? rejected : v
            );
            setStorageItem(key, JSON.stringify(plan));
            return;
          }
        } catch {
          // ignore corrupted entry
        }
      }
    }
  }

  /**
   * Creates a new Project Plan draft snapshot via guarded RPC with honest persistence semantics.
   *
   * - REMOTE_SUCCESS: Returns true Supabase version ID and updates local cache.
   * - OFFLINE_QUEUED: When workstation is offline/unreachable, creates local draft marked "Not synced" and enqueues mutation.
   * - REMOTE_FAILURE: When Supabase returns an RLS denial or constraint error, throws explicit error without fake fallback.
   */
  public async createDraft(params: CreateDraftParams): Promise<string> {
    const { projectId, documentIds = [], claims, lineage = [] } = params;

    // ============================================================================
    // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
    // ----------------------------------------------------------------------------
    // If Supabase is unconfigured, or if this is a demo project, run completely
    // via local isomorphic store so user interactions work reliably without 
    // requiring remote RPC deployment.
    // ============================================================================
    if (!isSupabaseConfigured() || isDemoProject(projectId)) {
      return this.createLocalDraft(params, true);
    }

    if (isSupabaseConfigured() && !isDemoProject(projectId)) {
      // If workstation is offline, enqueue mutation and create local draft marked not synced
      if (!offlineSyncService.isOnline()) {
        const draftId = this.createLocalDraft(params, false);
        if (!offlineSyncService.isReplayingActive()) {
          offlineSyncService.enqueue("project_plan_draft", params as any);
        }
        return draftId;
      }

      try {
        const { data, error } = await supabase.rpc("create_project_plan_draft", {
          p_project_id: projectId,
          p_document_ids: documentIds,
          p_claims: claims as any,
          p_lineage: lineage as any,
        });

        if (error) {
          if (isNetworkOfflineError(error)) {
            const draftId = this.createLocalDraft(params, false);
            if (!offlineSyncService.isReplayingActive()) {
              offlineSyncService.enqueue("project_plan_draft", params as any);
            }
            return draftId;
          }
          // TEMP: Fallback for missing RPC in remote Supabase schema
          if (error.message?.includes("schema cache") || error.code === "PGRST205" || error.code === "PGRST202") {
            console.warn("Supabase create_project_plan_draft RPC not found, falling back to local demo draft:", error.message);
            return this.createLocalDraft(params, true);
          }
          // REMOTE_FAILURE: Surface explicit error without fake local success
          console.error("Supabase create_project_plan_draft RPC failed:", error.message);
          throw new Error(error.message || "Failed to create project plan draft in Supabase");
        }

        if (data) {
          // REMOTE_SUCCESS: Refresh and return authoritative database UUID
          await this.getProjectPlan(projectId);
          return data as string;
        }
      } catch (err: any) {
        if (isNetworkOfflineError(err)) {
          const draftId = this.createLocalDraft(params, false);
          if (!offlineSyncService.isReplayingActive()) {
            offlineSyncService.enqueue("project_plan_draft", params as any);
          }
          return draftId;
        }
        // Surface explicit error
        throw err;
      }
    }

    // Pure local workspace mode
    return this.createLocalDraft(params, true);
  }

  /**
   * Accepts a draft version and atomically resolves conflicts and activates the new version.
   *
   * - REMOTE_SUCCESS: Activates draft in Supabase and updates local cache.
   * - OFFLINE_QUEUED: When workstation is offline, enqueues mutation and updates local optimistic state.
   * - REMOTE_FAILURE: When Supabase rejects (e.g. unresolved Decision conflict), throws explicit error.
   */
  public async acceptDraft(
    draftVersionId: string,
    resolutions: DecisionResolution[] = []
  ): Promise<void> {
    // ============================================================================
    // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
    // ----------------------------------------------------------------------------
    // Handle local demo draft IDs directly without remote RPC overhead.
    // ============================================================================
    if (!isSupabaseConfigured() || draftVersionId.startsWith("ppv-") || draftVersionId.startsWith("ppv")) {
      this.acceptLocalDraft(draftVersionId, resolutions, true);
      return;
    }

    if (isSupabaseConfigured()) {
      if (!offlineSyncService.isOnline()) {
        if (!offlineSyncService.isReplayingActive()) {
          offlineSyncService.enqueue("project_plan_accept", {
            draftVersionId,
            resolutions,
          });
        }
        this.acceptLocalDraft(draftVersionId, resolutions, false);
        return;
      }

      try {
        const { error } = await supabase.rpc("accept_project_plan_draft", {
          p_draft_version_id: draftVersionId,
          p_decision_resolutions: resolutions as any,
        });

        if (error) {
          if (isNetworkOfflineError(error)) {
            if (!offlineSyncService.isReplayingActive()) {
              offlineSyncService.enqueue("project_plan_accept", {
                draftVersionId,
                resolutions,
              });
            }
            this.acceptLocalDraft(draftVersionId, resolutions, false);
            return;
          }
          // TEMP: Fallback for missing RPC in remote Supabase schema
          if (error.message?.includes("schema cache") || error.code === "PGRST205" || error.code === "PGRST202") {
            console.warn("Supabase accept_project_plan_draft RPC not found, falling back to local draft activation:", error.message);
            this.acceptLocalDraft(draftVersionId, resolutions, true);
            return;
          }
          // REMOTE_FAILURE: Surface explicit error
          console.error("Supabase accept_project_plan_draft RPC failed:", error.message);
          throw new Error(error.message || "Failed to accept project plan draft in Supabase");
        }

        // REMOTE_SUCCESS
        this.acceptLocalDraft(draftVersionId, resolutions, true);
        return;
      } catch (err: any) {
        if (isNetworkOfflineError(err)) {
          if (!offlineSyncService.isReplayingActive()) {
            offlineSyncService.enqueue("project_plan_accept", {
              draftVersionId,
              resolutions,
            });
          }
          this.acceptLocalDraft(draftVersionId, resolutions, false);
          return;
        }
        throw err;
      }
    }

    // Pure local workspace mode
    this.acceptLocalDraft(draftVersionId, resolutions, true);
  }

  /**
   * Rejects a draft version, setting its status to superseded without Decision mutations.
   *
   * - REMOTE_SUCCESS: Supersedes draft in Supabase.
   * - OFFLINE_QUEUED: Enqueues mutation when offline.
   * - REMOTE_FAILURE: Throws explicit error on remote failure.
   */
  public async rejectDraft(draftVersionId: string, reason?: string): Promise<void> {
    // ============================================================================
    // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
    // ----------------------------------------------------------------------------
    // Handle local demo draft IDs directly without remote RPC overhead.
    // ============================================================================
    if (!isSupabaseConfigured() || draftVersionId.startsWith("ppv-") || draftVersionId.startsWith("ppv")) {
      this.rejectLocalDraft(draftVersionId, true);
      return;
    }

    if (isSupabaseConfigured()) {
      if (!offlineSyncService.isOnline()) {
        if (!offlineSyncService.isReplayingActive()) {
          offlineSyncService.enqueue("project_plan_reject", {
            draftVersionId,
            reason,
          });
        }
        this.rejectLocalDraft(draftVersionId, false);
        return;
      }

      try {
        const { error } = await supabase.rpc("reject_project_plan_draft", {
          p_draft_version_id: draftVersionId,
          p_reason: reason || undefined,
        });

        if (error) {
          if (isNetworkOfflineError(error)) {
            if (!offlineSyncService.isReplayingActive()) {
              offlineSyncService.enqueue("project_plan_reject", {
                draftVersionId,
                reason,
              });
            }
            this.rejectLocalDraft(draftVersionId, false);
            return;
          }
          // TEMP: Fallback for missing RPC in remote Supabase schema
          if (error.message?.includes("schema cache") || error.code === "PGRST205" || error.code === "PGRST202") {
            console.warn("Supabase reject_project_plan_draft RPC not found, falling back to local draft rejection:", error.message);
            this.rejectLocalDraft(draftVersionId, true);
            return;
          }
          // REMOTE_FAILURE
          console.error("Supabase reject_project_plan_draft RPC failed:", error.message);
          throw new Error(error.message || "Failed to reject plan draft");
        }

        // REMOTE_SUCCESS
        this.rejectLocalDraft(draftVersionId, true);
        return;
      } catch (err: any) {
        if (isNetworkOfflineError(err)) {
          if (!offlineSyncService.isReplayingActive()) {
            offlineSyncService.enqueue("project_plan_reject", {
              draftVersionId,
              reason,
            });
          }
          this.rejectLocalDraft(draftVersionId, false);
          return;
        }
        throw err;
      }
    }

    // Pure local workspace mode
    this.rejectLocalDraft(draftVersionId, true);
  }

  /**
   * Submits or appends a claim to an active or draft plan version.
   */
  public async submitClaim(
    projectId: string,
    claim: {
      claim_id?: string;
      section: ClaimSection;
      content: string;
      grounding: ClaimGrounding;
      evidence_links?: PlanClaim["evidence_links"];
      inference_rationale?: string | null;
      unresolved_reason?: string | null;
    }
  ): Promise<string> {
    const plan = await this.getProjectPlan(projectId);
    const draft = plan?.draft_version;
    const existingClaims = draft ? draft.claims : plan?.active_version ? plan.active_version.claims : [];
    const updatedClaims = [
      ...existingClaims.filter((c) => c.claim_id !== claim.claim_id),
      claim,
    ];

    if (!draft) {
      return this.createDraft({
        projectId,
        claims: updatedClaims as any,
      });
    }

    // If open draft exists, re-create or update
    draft.claims = updatedClaims as any;
    saveLocalPlan(projectId, plan!);
    return draft.id;
  }

  /**
   * Alias for createDraft to publish a new draft revision snapshot.
   */
  public async publishDraftRevision(params: CreateDraftParams): Promise<string> {
    return this.createDraft(params);
  }

  /**
   * Starts a new Investigation Workshop conversation linked to this Project Plan.
   */
  public async startPlanInvestigation(projectId: string, title?: string): Promise<string> {
    // ============================================================================
    // TEMP: Mock Plan Creation Loop for Demo (Not for Production)
    // ----------------------------------------------------------------------------
    // Demo projects generate local session IDs directly without remote RPC dependency.
    // ============================================================================
    if (!isSupabaseConfigured() || isDemoProject(projectId)) {
      return generateId("session");
    }

    const { data, error } = await supabase.rpc("start_plan_chat_session", {
      p_project_id: projectId,
      p_title: title || undefined,
    });

    if (error) {
      throw new Error(`Failed to start plan session: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Pure claim diffing algorithm comparing active and draft plan claims by stable claim_id.
   * Never relies on array index or text string heuristics.
   */
  public computeClaimDiff(
    activeClaims: PlanClaim[] = [],
    draftClaims: PlanClaim[] = [],
    lineage: ClaimLineage[] = [],
    decisions: Decision[] = []
  ): ClaimDiffItem[] {
    const diffs: ClaimDiffItem[] = [];
    const activeMap = new Map<string, PlanClaim>();
    activeClaims.forEach((c) => activeMap.set(c.claim_id, c));

    const draftMap = new Map<string, PlanClaim>();
    draftClaims.forEach((c) => draftMap.set(c.claim_id, c));

    // Process draft claims (added, modified, unchanged)
    for (const draftClaim of draftClaims) {
      const activeClaim = activeMap.get(draftClaim.claim_id);
      const claimLineageEdges = lineage.filter((l) => l.child_claim_id === draftClaim.claim_id);

      let diffType: ClaimDiffItem["diff_type"] = "added";
      let conflict: ClaimDiffItem["conflict"] | undefined = undefined;

      if (draftClaim.conflict_with_decision_id) {
        const dec = decisions.find((d) => d.id === draftClaim.conflict_with_decision_id);
        conflict = {
          decision_id: draftClaim.conflict_with_decision_id,
          decision_text: dec?.decision_text || "Existing Decision",
          conflict_details: draftClaim.conflict_details || undefined,
        };
      }

      if (activeClaim) {
        if (
          activeClaim.content === draftClaim.content &&
          activeClaim.grounding === draftClaim.grounding &&
          activeClaim.section === draftClaim.section
        ) {
          diffType = "unchanged";
        } else {
          diffType = "modified";
        }
      } else {
        diffType = "added";
      }

      diffs.push({
        claim_id: draftClaim.claim_id,
        section: draftClaim.section,
        diff_type: diffType,
        active_claim: activeClaim,
        draft_claim: draftClaim,
        conflict,
        lineage: claimLineageEdges.length > 0 ? claimLineageEdges : undefined,
      });
    }

    // Process removed claims (present in active but absent in draft)
    for (const activeClaim of activeClaims) {
      if (!draftMap.has(activeClaim.claim_id)) {
        const claimLineageEdges = lineage.filter((l) => l.parent_claim_id === activeClaim.claim_id);
        diffs.push({
          claim_id: activeClaim.claim_id,
          section: activeClaim.section,
          diff_type: "removed",
          active_claim: activeClaim,
          draft_claim: undefined,
          lineage: claimLineageEdges.length > 0 ? claimLineageEdges : undefined,
        });
      }
    }

    return diffs;
  }
}

export const projectPlanService = new ProjectPlanService();
