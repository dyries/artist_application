"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ArtistProfile,
  CvEntry,
  MaterialKind,
  SourceMaterial,
  Work
} from "@/types/domain";
import { ProfilePanel } from "./ProfilePanel";
import { StudioHeader, StudioSidebar } from "./StudioChrome";
import {
  CvPanel,
  MaterialsPanel,
  OpportunitiesPanel,
  SettingsPanel,
  SubmissionsPanel,
  WorksPanel
} from "./StudioPanels";
import { api } from "./studioApi";
import {
  emptyCvEntry,
  emptyWork,
  initialData,
  materialKindLabel,
  materialKindMeta,
  prepareSavePayload
} from "./studioModel";
import { buildOpportunityShortlist } from "@/lib/opportunityShortlist";
import type { CodexContextResult, OpportunityReviewResult, ProjectAutomationResult, ScanResult, StudioData, Tab } from "./studioTypes";

export default function Studio() {
  const [data, setData] = useState<StudioData>(initialData);
  const [tab, setTab] = useState<Tab>("profile");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualOpportunityUrl, setManualOpportunityUrl] = useState("");
  const [manualOpportunityTitle, setManualOpportunityTitle] = useState("");
  const [manualOpportunityNotes, setManualOpportunityNotes] = useState("");
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<Set<number>>(new Set());
  const isBusy = busy.length > 0;

  const completion = useMemo(() => {
    const fields = [
      data.profile.nameZh || data.profile.name,
      data.profile.nameEn || data.profile.name,
      data.profile.email,
      data.profile.locationZh || data.profile.location,
      data.profile.locationEn || data.profile.location,
      data.profile.bioZhShort || data.profile.bioEnShort,
      data.profile.statementZh || data.profile.statementEn,
      data.profile.applicationRegion || "worldwide",
      String(data.profile.automationBatchLimit || 5),
      data.profile.submissionApprovalMode || "review_required",
      data.profile.opportunityFeePreference || "conservative",
      data.profile.opportunityTierPreference || "high_tier",
      data.profile.preferencesZh || data.profile.preferencesEn || data.profile.preferences
    ];
    const filled = fields.filter((value) => value.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [data.profile]);

  const materialCounts = useMemo(() => {
    return data.materialSources.reduce<Record<MaterialKind, number>>((counts, source) => {
      counts[source.kind] += 1;
      return counts;
    }, { cv: 0, bio: 0, statement: 0, works: 0, portfolio: 0, other: 0 });
  }, [data.materialSources]);

  const materialSections = useMemo(() => {
    return materialKindMeta.map((item) => ({
      ...item,
      sources: data.materialSources
        .map((source, index) => ({ source, index }))
        .filter(({ source }) => source.kind === item.kind)
    }));
  }, [data.materialSources]);

  const showError = useCallback((errorValue: unknown) => {
    setError(errorValue instanceof Error ? errorValue.message : String(errorValue));
    setMessage("");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setData(await api<StudioData>("/api/artist"));
    } catch (err) {
      showError(err);
    }
  }, [showError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedOpportunityIds(new Set(
      data.opportunities
        .filter((opportunity) => opportunity.status === "selected_by_user")
        .map((opportunity) => opportunity.id)
    ));
  }, [data.opportunities]);

  async function persistArtistData(nextData = data) {
    const payload = prepareSavePayload(nextData);
    const savedData = await api<StudioData>("/api/artist", {
      method: "PUT",
      body: JSON.stringify({
        profile: payload.profile,
        works: payload.works,
        cv: payload.cv,
        materialSources: payload.materialSources
      })
    });
    setData(savedData);
    return savedData;
  }

  async function saveArtist() {
    setBusy("save");
    try {
      await persistArtistData();
      setMessage("资料已保存到 SQLite。下一步由 Codex 自动化读取材料并整理。");
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function prepareCodexContext() {
    setBusy("prepare-codex");
    try {
      await persistArtistData();
      const result = await api<CodexContextResult>("/api/codex/context", { method: "POST" });
      setMessage(`已刷新 Codex 自动化上下文：${result.snapshotPath}`);
      setError("");
      setTab("settings");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function runProjectAiAutomation() {
    setBusy("project-ai");
    try {
      await persistArtistData();
      const result = await api<ProjectAutomationResult>("/api/automation/run", { method: "POST" });
      setData(result.data);
      setMessage([
        `项目外部模型自动化已运行：${result.provider}/${result.model}`,
        `报告：${result.reportPath}`,
        `发现候选机会：${result.discoveredOpportunities?.length ?? 0} 个`,
        result.packagePaths.length ? `申请包：${result.packagePaths.join("、")}` : "本轮没有生成申请包。"
      ].join("\n"));
      setError("");
      setTab(result.packagePaths.length ? "submissions" : "settings");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  function setProfile<K extends keyof ArtistProfile>(key: K, value: ArtistProfile[K]) {
    setData((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  }

  function updateWork(index: number, patch: Partial<Work>) {
    setData((current) => ({
      ...current,
      works: current.works.map((work, itemIndex) => (itemIndex === index ? { ...work, ...patch } : work))
    }));
  }

  function updateCv(index: number, patch: Partial<CvEntry>) {
    setData((current) => ({
      ...current,
      cv: current.cv.map((entry, itemIndex) => (itemIndex === index ? { ...entry, ...patch } : entry))
    }));
  }

  function updateSource(index: number, patch: Partial<SourceMaterial>) {
    setData((current) => ({
      ...current,
      materialSources: current.materialSources.map((source, itemIndex) => (
        itemIndex === index ? { ...source, ...patch } : source
      ))
    }));
  }

  async function deleteSource(index: number) {
    const source = data.materialSources[index];
    if (!source) return;
    const label = source.fileName || source.title || "这条材料";
    if (!window.confirm(`删除「${label}」？这只会从资料库移除记录，不会删除原始文件。`)) return;

    if (source.id <= 0) {
      setData((current) => ({
        ...current,
        materialSources: current.materialSources.filter((_, itemIndex) => itemIndex !== index)
      }));
      setMessage("已移除未保存的材料。");
      setError("");
      return;
    }

    setBusy(`delete-source-${source.id}`);
    try {
      setData(await api<StudioData>(`/api/materials/${source.id}`, { method: "DELETE" }));
      setMessage(`已从资料库删除材料：${label}`);
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function deleteCv(index: number) {
    const entry = data.cv[index];
    if (!entry) return;
    const label = entry.titleZh || entry.titleEn || entry.title || entry.year || "这条 CV 条目";
    if (!window.confirm(`删除「${label}」？`)) return;

    if (entry.id <= 0) {
      setData((current) => ({
        ...current,
        cv: current.cv.filter((_, itemIndex) => itemIndex !== index)
      }));
      setMessage("已移除未保存的 CV 条目。");
      setError("");
      return;
    }

    setBusy(`delete-cv-${entry.id}`);
    try {
      setData(await api<StudioData>(`/api/cv/${entry.id}`, { method: "DELETE" }));
      setMessage(`已删除 CV 条目：${label}`);
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function deleteWork(index: number) {
    const work = data.works[index];
    if (!work) return;
    const label = work.titleZh || work.titleEn || work.title || work.year || "这件作品";
    if (!window.confirm(`删除「${label}」？`)) return;

    if (work.id <= 0) {
      setData((current) => ({
        ...current,
        works: current.works.filter((_, itemIndex) => itemIndex !== index)
      }));
      setMessage("已移除未保存的作品。");
      setError("");
      return;
    }

    setBusy(`delete-work-${work.id}`);
    try {
      setData(await api<StudioData>(`/api/works/${work.id}`, { method: "DELETE" }));
      setMessage(`已删除作品：${label}`);
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  function addSource(kind: MaterialKind) {
    setData((current) => ({
      ...current,
      materialSources: [{ id: 0, kind, title: "", content: "", analysis: "", fileName: "", filePath: "", mimeType: "", createdAt: "", updatedAt: "" }, ...current.materialSources]
    }));
  }

  function scrollToMaterialSection(kind: MaterialKind) {
    setTab("materials");
    window.requestAnimationFrame(() => {
      document.getElementById(`material-section-${kind}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function importMaterialFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy("upload-materials");
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch("/api/materials/upload", { method: "POST", body: form });
      if (!response.ok) throw new Error(await responseErrorMessage(response));
      const result = await response.json() as { materials: SourceMaterial[] };
      const nextData = { ...data, materialSources: [...result.materials, ...data.materialSources] };
      await persistArtistData(nextData);
      const firstKind = result.materials[0]?.kind;
      if (firstKind) scrollToMaterialSection(firstKind);
      setMessage(`已导入并归类：${result.materials.map((item) => `${item.fileName || item.title} -> ${materialKindLabel(item.kind)}`).join("、")}`);
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function scanProjectMaterials() {
    setBusy("scan-materials");
    try {
      const result = await api<ScanResult>("/api/materials/scan", { method: "POST" });
      if (result.materials.length === 0) {
        setData(result.data);
        setMessage("没有发现新的项目文件。请把文件放进 artist-assets/inbox 下对应分类文件夹后再扫描。");
        setError("");
        return;
      }

      setData(result.data);
      const firstKind = result.materials[0]?.kind;
      if (firstKind) scrollToMaterialSection(firstKind);
      setMessage(`已扫描并归类：${result.materials.map((item) => `${item.fileName || item.title} -> ${materialKindLabel(item.kind)}`).join("、")}`);
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function addManualOpportunity() {
    if (!manualOpportunityUrl.trim()) return;
    setBusy("add-opportunity");
    try {
      setData(await api<StudioData>("/api/opportunities/manual", {
        method: "POST",
        body: JSON.stringify({
          url: manualOpportunityUrl,
          title: manualOpportunityTitle,
          notes: manualOpportunityNotes
        })
      }));
      setManualOpportunityUrl("");
      setManualOpportunityTitle("");
      setManualOpportunityNotes("");
      setMessage("已加入手动机会链接。Codex 自动化或项目内自动化会先核验页面，再决定是否制作申请包。");
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  function toggleOpportunitySelection(id: number, selected: boolean) {
    setSelectedOpportunityIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function completeOpportunityReview() {
    setBusy("opportunity-review");
    try {
      await persistArtistData();
      const result = await api<OpportunityReviewResult>("/api/opportunities/review", {
        method: "POST",
        body: JSON.stringify({
          selectedOpportunityIds: Array.from(selectedOpportunityIds),
          reviewedOpportunityIds: buildOpportunityShortlist(data.opportunities).map((opportunity) => opportunity.id)
        })
      });
      setData(result.data);
      if (result.selectedCount === 0) {
        setMessage("第一次机会审核已完成：没有选择申请的机会，本轮不会制作申请包。");
        setTab("opportunities");
      } else {
        setMessage([
          `第一次机会审核已完成：选择 ${result.selectedCount} 个机会。`,
          result.automation?.packagePaths.length
            ? `系统已自动生成申请包：${result.automation.packagePaths.join("、")}`
            : "系统已自动进入制包流程；如果没有生成申请包，请查看自动化报告或错误提示。"
        ].join("\n"));
        setTab(result.automation?.packagePaths.length ? "submissions" : "settings");
      }
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  async function setFinalPackageDecision(id: number, decision: "approve_final_submission_package" | "request_revision") {
    setBusy(`application-${id}-${decision}`);
    try {
      setData(await api<StudioData>(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision })
      }));
      setMessage(decision === "approve_final_submission_package"
        ? "已批准最终提交包。下一步仍会在付款、登录、验证码、法律声明、隐私风险或不可逆提交前暂停。"
        : "已要求返工，系统已自动重新进入制包流程；修复完成后会再次回到最终提交前审核。");
      setError("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="shell">
      <StudioHeader
        busy={busy}
        isBusy={isBusy}
        refresh={refresh}
        prepareCodexContext={prepareCodexContext}
        saveArtist={saveArtist}
      />

      <div className="layout">
        <StudioSidebar
          busy={busy}
          completion={completion}
          data={data}
          error={error}
          isBusy={isBusy}
          materialCounts={materialCounts}
          message={message}
          refresh={refresh}
          prepareCodexContext={prepareCodexContext}
          runProjectAiAutomation={runProjectAiAutomation}
          saveArtist={saveArtist}
          setTab={setTab}
          tab={tab}
        />

        <section className="stack">
          {tab === "profile" && (
            <ProfilePanel profile={data.profile} setProfile={setProfile} />
          )}

          {tab === "materials" && (
            <MaterialsPanel
              addSource={addSource}
              busy={busy}
              data={data}
              deleteSource={deleteSource}
              importMaterialFiles={importMaterialFiles}
              isBusy={isBusy}
              materialCounts={materialCounts}
              materialSections={materialSections}
              prepareCodexContext={prepareCodexContext}
              scanProjectMaterials={scanProjectMaterials}
              scrollToMaterialSection={scrollToMaterialSection}
              updateSource={updateSource}
            />
          )}

          {tab === "works" && (
            <WorksPanel
              addWork={() => setData((current) => ({ ...current, works: [...current.works, emptyWork] }))}
              busy={busy}
              data={data}
              deleteWork={deleteWork}
              isBusy={isBusy}
              updateWork={updateWork}
            />
          )}

          {tab === "cv" && (
            <CvPanel
              addCvEntry={() => setData((current) => ({ ...current, cv: [...current.cv, emptyCvEntry] }))}
              busy={busy}
              data={data}
              deleteCv={deleteCv}
              isBusy={isBusy}
              updateCv={updateCv}
            />
          )}

          {tab === "opportunities" && (
            <OpportunitiesPanel
              addManualOpportunity={addManualOpportunity}
              busy={busy}
              data={data}
              isBusy={isBusy}
              manualOpportunityNotes={manualOpportunityNotes}
              manualOpportunityTitle={manualOpportunityTitle}
              manualOpportunityUrl={manualOpportunityUrl}
              prepareCodexContext={prepareCodexContext}
              selectedOpportunityIds={selectedOpportunityIds}
              completeOpportunityReview={completeOpportunityReview}
              toggleOpportunitySelection={toggleOpportunitySelection}
              setManualOpportunityNotes={setManualOpportunityNotes}
              setManualOpportunityTitle={setManualOpportunityTitle}
              setManualOpportunityUrl={setManualOpportunityUrl}
            />
          )}

          {tab === "submissions" && (
            <SubmissionsPanel
              data={data}
              isBusy={isBusy}
              setFinalPackageDecision={setFinalPackageDecision}
            />
          )}

          {tab === "settings" && (
            <SettingsPanel
              busy={busy}
              data={data}
              isBusy={isBusy}
              runProjectAiAutomation={runProjectAiAutomation}
            />
          )}
        </section>
      </div>
    </main>
  );
}

async function responseErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return response.statusText;
  try {
    const data = JSON.parse(text) as { error?: unknown };
    return typeof data.error === "string" ? data.error : text;
  } catch {
    return text;
  }
}
