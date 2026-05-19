"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ArtistProfile,
  CvEntry,
  MaterialKind,
  OpportunityFeePreference,
  OpportunityTierPreference,
  SourceMaterial,
  SubmissionApprovalMode,
  Work
} from "@/types/domain";
import { Area, Field, NumberField, SelectField } from "./FormControls";
import { StudioHeader, StudioSidebar } from "./StudioChrome";
import { api } from "./studioApi";
import {
  applicationRegionLabel,
  applicationRegionOptions,
  emptyCvEntry,
  emptyWork,
  initialData,
  materialKindLabel,
  materialKindMeta,
  opportunityFeePreferenceLabel,
  opportunityFeePreferenceOptions,
  opportunityTierPreferenceLabel,
  opportunityTierPreferenceOptions,
  prepareSavePayload,
  submissionApprovalModeLabel,
  submissionApprovalModeOptions
} from "./studioModel";
import type { CodexContextResult, ProjectAutomationResult, ScanResult, StudioData, Tab } from "./studioTypes";

export default function Studio() {
  const [data, setData] = useState<StudioData>(initialData);
  const [tab, setTab] = useState<Tab>("profile");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualOpportunityUrl, setManualOpportunityUrl] = useState("");
  const [manualOpportunityTitle, setManualOpportunityTitle] = useState("");
  const [manualOpportunityNotes, setManualOpportunityNotes] = useState("");
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
      materialSources: [{ id: 0, kind, title: "", content: "", fileName: "", filePath: "", mimeType: "", createdAt: "", updatedAt: "" }, ...current.materialSources]
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
            <div className="panel stack">
              <h2>艺术家资料</h2>
              <div className="grid-2">
                <Field label="中文姓名" value={data.profile.nameZh} onChange={(value) => setProfile("nameZh", value)} />
                <Field label="English Name" value={data.profile.nameEn} onChange={(value) => setProfile("nameEn", value)} />
                <Field label="邮箱" value={data.profile.email} onChange={(value) => setProfile("email", value)} />
                <Field label="中文所在地" value={data.profile.locationZh} onChange={(value) => setProfile("locationZh", value)} />
                <Field label="Location in English" value={data.profile.locationEn} onChange={(value) => setProfile("locationEn", value)} />
                <SelectField
                  label="申请地区"
                  value={data.profile.applicationRegion || "worldwide"}
                  onChange={(value) => setProfile("applicationRegion", value)}
                  options={applicationRegionOptions}
                />
                <NumberField
                  label="每轮最多处理数量"
                  value={data.profile.automationBatchLimit || 5}
                  min={1}
                  max={100}
                  onChange={(value) => setProfile("automationBatchLimit", value)}
                />
                <SelectField
                  label="提交审核模式"
                  value={data.profile.submissionApprovalMode || "review_required"}
                  onChange={(value) => setProfile("submissionApprovalMode", value as SubmissionApprovalMode)}
                  options={submissionApprovalModeOptions}
                />
                <SelectField
                  label="费用接受度"
                  value={data.profile.opportunityFeePreference || "conservative"}
                  onChange={(value) => setProfile("opportunityFeePreference", value as OpportunityFeePreference)}
                  options={opportunityFeePreferenceOptions}
                />
                <SelectField
                  label="机会等级偏好"
                  value={data.profile.opportunityTierPreference || "high_tier"}
                  onChange={(value) => setProfile("opportunityTierPreference", value as OpportunityTierPreference)}
                  options={opportunityTierPreferenceOptions}
                />
                <Field label="网站" value={data.profile.website} onChange={(value) => setProfile("website", value)} />
                <Field label="Instagram" value={data.profile.instagram} onChange={(value) => setProfile("instagram", value)} />
              </div>
              <p className="notice">
                当前申请地区：{applicationRegionLabel(data.profile.applicationRegion)}；每轮最多处理 {data.profile.automationBatchLimit || 5} 个机会；
                审核模式：{submissionApprovalModeLabel(data.profile.submissionApprovalMode)}；费用接受度：{opportunityFeePreferenceLabel(data.profile.opportunityFeePreference)}；
                机会等级：{opportunityTierPreferenceLabel(data.profile.opportunityTierPreference)}。
              </p>
              <div className="grid-2">
                <Area label="中文 Artist Statement" value={data.profile.statementZh} onChange={(value) => setProfile("statementZh", value)} />
                <Area label="English Artist Statement" value={data.profile.statementEn} onChange={(value) => setProfile("statementEn", value)} />
              </div>
              <div className="grid-3">
                <Area label="中文 Bio 短版" value={data.profile.bioZhShort} onChange={(value) => setProfile("bioZhShort", value)} />
                <Area label="中文 Bio 中版" value={data.profile.bioZhMedium} onChange={(value) => setProfile("bioZhMedium", value)} />
                <Area label="中文 Bio 长版" value={data.profile.bioZhLong} onChange={(value) => setProfile("bioZhLong", value)} />
                <Area label="English Bio Short" value={data.profile.bioEnShort} onChange={(value) => setProfile("bioEnShort", value)} />
                <Area label="English Bio Medium" value={data.profile.bioEnMedium} onChange={(value) => setProfile("bioEnMedium", value)} />
                <Area label="English Bio Long" value={data.profile.bioEnLong} onChange={(value) => setProfile("bioEnLong", value)} />
              </div>
              <div className="grid-2">
                <Area label="中文申请偏好" value={data.profile.preferencesZh} onChange={(value) => setProfile("preferencesZh", value)} />
                <Area label="Application Preferences in English" value={data.profile.preferencesEn} onChange={(value) => setProfile("preferencesEn", value)} />
              </div>
            </div>
          )}

          {tab === "materials" && (
            <div className="panel stack">
              <div className="toolbar">
                <h2>材料库</h2>
                <label className="file-button">
                  {busy === "upload-materials" ? "导入中" : "导入文件"}
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json,.rtf,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.tif,.tiff"
                    disabled={isBusy}
                    onChange={(event) => {
                      importMaterialFiles(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  className="secondary"
                  onClick={() => addSource("other")}
                >
                  新增手填材料
                </button>
                <button className="secondary" onClick={scanProjectMaterials} disabled={isBusy}>
                  {busy === "scan-materials" ? "扫描中" : "扫描项目文件夹"}
                </button>
                <button onClick={prepareCodexContext} disabled={isBusy}>
                  {busy === "prepare-codex" ? "刷新中" : "刷新自动化上下文"}
                </button>
              </div>
              <p className="muted">把 CV、bio、statement、作品说明、作品集、PDF、Word 和图片导入进来，或者直接放进 artist-assets/inbox/cv、statement、bio、portfolio、works、work-images、other 后点击扫描。项目只负责收集和保存材料；材料理解、重写、取舍和资料库整理由 Codex 自动化完成。</p>
              <div className="material-overview">
                {materialKindMeta.map((item) => (
                  <button key={item.kind} className="material-chip" onClick={() => scrollToMaterialSection(item.kind)}>
                    <span>{item.label}</span>
                    <strong>{materialCounts[item.kind]}</strong>
                  </button>
                ))}
              </div>
              {data.materialSources.length === 0 && <p className="muted">还没有材料。可以先新增一份材料，或导入 PDF、Word、图片、txt、md、csv、json、rtf 文件。</p>}
              {materialSections.map((section) => (
                <section className="material-section stack" id={`material-section-${section.kind}`} key={section.kind}>
                  <div className="section-heading">
                    <div>
                      <h3>{section.label}</h3>
                      <p className="muted">{section.hint}</p>
                    </div>
                    <button className="secondary" onClick={() => addSource(section.kind)}>新增手填{section.label}</button>
                  </div>
                  {section.sources.length === 0 && <p className="muted">这个分区还没有材料。</p>}
                  {section.sources.map(({ source, index }) => (
                    <div className="card stack" key={`${source.id}-${index}`}>
                      <div className="material-card-header">
                        <div>
                          <h4>{source.fileName || source.title || "未命名材料"}</h4>
                          <p className="muted">{source.filePath ? source.filePath : "手动填写的材料"}</p>
                        </div>
                        <div className="card-actions">
                          <span className="badge">{section.label}</span>
                          <button
                            className="danger"
                            onClick={() => deleteSource(index)}
                            disabled={isBusy}
                          >
                            {busy === `delete-source-${source.id}` ? "删除中" : "删除"}
                          </button>
                        </div>
                      </div>
                      <div className="grid-2">
                        <label className="label">
                          <span>材料类型</span>
                          <select value={source.kind} onChange={(event) => updateSource(index, { kind: event.target.value as MaterialKind })}>
                            <option value="cv">CV</option>
                            <option value="bio">Bio</option>
                            <option value="statement">Statement</option>
                            <option value="works">作品</option>
                            <option value="portfolio">作品集</option>
                            <option value="other">其他</option>
                          </select>
                        </label>
                        <Field label="标题或来源" value={source.title} onChange={(value) => updateSource(index, { title: value })} />
                      </div>
                      {(source.filePath || source.mimeType) && (
                        <p className="muted">{[source.fileName, source.mimeType, source.filePath].filter(Boolean).join(" · ")}</p>
                      )}
                      <Area label="旧材料正文" value={source.content} onChange={(value) => updateSource(index, { content: value })} />
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}

          {tab === "works" && (
            <div className="panel stack">
              <div className="toolbar">
                <h2>作品</h2>
                <button className="secondary" onClick={() => setData((current) => ({ ...current, works: [...current.works, emptyWork] }))}>新增作品</button>
              </div>
              {data.works.length === 0 && <p className="muted">还没有作品。添加标题、年份、媒介、尺寸、图片路径和说明后，Codex 会用它们匹配机会并选择申请作品。</p>}
              <p className="notice">作品集会作为重点交付物处理：Codex 需要根据机会主题挑作品，并优先把每件入选作品完整、清楚地呈现出来；现场、细节、过程或空间关系图只能作为辅助，不能替代完整作品图。如果展览要求真实作品，会先让你确认哪些作品还在手里。</p>
              {data.works.map((work, index) => (
                <div className="card stack" key={`${work.id}-${index}`}>
                  <div className="item-card-header">
                    <div>
                      <h3>{work.titleZh || work.titleEn || work.title || "未命名作品"}</h3>
                      <p className="muted">{[work.year, work.mediumZh || work.mediumEn || work.medium, work.dimensionsZh || work.dimensionsEn || work.dimensions].filter(Boolean).join(" · ") || "尚未填写年份、媒介或尺寸"}</p>
                    </div>
                    <button
                      className="danger"
                      onClick={() => deleteWork(index)}
                      disabled={isBusy}
                    >
                      {busy === `delete-work-${work.id}` ? "删除中" : "删除"}
                    </button>
                  </div>
                  <div className="grid-2">
                    <Field label="中文标题" value={work.titleZh} onChange={(value) => updateWork(index, { titleZh: value })} />
                    <Field label="English Title" value={work.titleEn} onChange={(value) => updateWork(index, { titleEn: value })} />
                    <Field label="年份" value={work.year} onChange={(value) => updateWork(index, { year: value })} />
                    <Field label="中文媒介" value={work.mediumZh} onChange={(value) => updateWork(index, { mediumZh: value })} />
                    <Field label="Medium in English" value={work.mediumEn} onChange={(value) => updateWork(index, { mediumEn: value })} />
                    <Field label="中文尺寸" value={work.dimensionsZh} onChange={(value) => updateWork(index, { dimensionsZh: value })} />
                    <Field label="Dimensions in English" value={work.dimensionsEn} onChange={(value) => updateWork(index, { dimensionsEn: value })} />
                  </div>
                  <Field label="图片路径" value={work.imagePath} onChange={(value) => updateWork(index, { imagePath: value })} />
                  <div className="grid-2">
                    <Area label="中文说明" value={work.descriptionZh} onChange={(value) => updateWork(index, { descriptionZh: value })} />
                    <Area label="English Description" value={work.descriptionEn} onChange={(value) => updateWork(index, { descriptionEn: value })} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "cv" && (
            <div className="panel stack">
              <div className="toolbar">
                <h2>CV</h2>
                <button className="secondary" onClick={() => setData((current) => ({ ...current, cv: [...current.cv, emptyCvEntry] }))}>新增 CV 条目</button>
              </div>
              {data.cv.length === 0 && <p className="muted">还没有 CV 条目。可以加入展览、驻留、奖项、出版、教育经历等。</p>}
              {data.cv.map((entry, index) => (
                <div className="card stack" key={`${entry.id}-${index}`}>
                  <div className="item-card-header">
                    <div>
                      <h3>{entry.titleZh || entry.titleEn || entry.title || "未命名 CV 条目"}</h3>
                      <p className="muted">{[entry.year, entry.organizationZh || entry.organizationEn || entry.organization, entry.locationZh || entry.locationEn || entry.location].filter(Boolean).join(" · ") || "尚未填写年份、机构或地点"}</p>
                    </div>
                    <button
                      className="danger"
                      onClick={() => deleteCv(index)}
                      disabled={isBusy}
                    >
                      {busy === `delete-cv-${entry.id}` ? "删除中" : "删除"}
                    </button>
                  </div>
                  <div className="grid-3">
                    <Field label="中文类别" value={entry.categoryZh} onChange={(value) => updateCv(index, { categoryZh: value })} />
                    <Field label="Category in English" value={entry.categoryEn} onChange={(value) => updateCv(index, { categoryEn: value })} />
                    <Field label="年份" value={entry.year} onChange={(value) => updateCv(index, { year: value })} />
                    <Field label="中文标题" value={entry.titleZh} onChange={(value) => updateCv(index, { titleZh: value })} />
                    <Field label="Title in English" value={entry.titleEn} onChange={(value) => updateCv(index, { titleEn: value })} />
                    <Field label="中文机构" value={entry.organizationZh} onChange={(value) => updateCv(index, { organizationZh: value })} />
                    <Field label="Organization in English" value={entry.organizationEn} onChange={(value) => updateCv(index, { organizationEn: value })} />
                    <Field label="中文地点" value={entry.locationZh} onChange={(value) => updateCv(index, { locationZh: value })} />
                    <Field label="Location in English" value={entry.locationEn} onChange={(value) => updateCv(index, { locationEn: value })} />
                  </div>
                  <div className="grid-2">
                    <Area label="中文备注" value={entry.notesZh} onChange={(value) => updateCv(index, { notesZh: value })} />
                    <Area label="Notes in English" value={entry.notesEn} onChange={(value) => updateCv(index, { notesEn: value })} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "opportunities" && (
            <div className="panel stack">
              <h2>机会</h2>
              <div className="card stack">
                <h3>手动添加展览/驻留链接</h3>
                <p className="muted">把你看到的申请页面链接放这里。后续 Codex 自动化或项目内自动化会先核验资格、截止日期、费用、材料要求和提交方式，再制作申请包。</p>
                <Field label="申请页面 URL" value={manualOpportunityUrl} onChange={setManualOpportunityUrl} />
                <Field label="标题或备注标题" value={manualOpportunityTitle} onChange={setManualOpportunityTitle} />
                <Area label="你的备注" value={manualOpportunityNotes} onChange={setManualOpportunityNotes} />
                <button onClick={addManualOpportunity} disabled={isBusy || !manualOpportunityUrl.trim()}>
                  {busy === "add-opportunity" ? "添加中" : "添加机会链接"}
                </button>
              </div>
              {data.opportunities.length === 0 && <p className="muted">Codex 自动化运行后，会按当前申请地区（默认全世界）先搜索更大的候选池，确认中国人/中国所在地艺术家可申请，再筛出驻留 Top 5 和展览/open call Top 5。</p>}
              {data.opportunities.map((opportunity) => (
                <div className="card" key={opportunity.id}>
                  <h3>{opportunity.title}</h3>
                  <div className="meta">
                    <span className="badge">{opportunity.organization || "机构待识别"}</span>
                    <span className="badge">{opportunity.deadline || "截止日期待识别"}</span>
                    <span className="badge">{opportunity.location || "地点待识别"}</span>
                    <span className="badge">状态：{opportunity.status}</span>
                    {opportunity.score !== null && <span className="badge score">匹配度 {opportunity.score}</span>}
                  </div>
                  <p className="muted">{opportunity.summary || "等待 Codex 自动化分析。"}</p>
                  {opportunity.risks && <p className="notice warn">{opportunity.risks}</p>}
                  <a href={opportunity.url} target="_blank" rel="noreferrer">{opportunity.url}</a>
                  <div className="list-actions">
                    <button onClick={prepareCodexContext} disabled={isBusy}>
                      {busy === "prepare-codex" ? "刷新中" : "刷新申请包上下文"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "submissions" && (
            <div className="panel stack">
              <h2>申请包</h2>
              {data.applications.length === 0 && <p className="muted">外接 API 或 Codex 准备出的申请草稿、材料清单和文件位置会显示在这里。需要审核时，表单答案、bio、statement、项目文字、作品说明和 checklist 都应提供中英对照；最终提交版只使用对方要求的语言。后续投递按当前提交审核模式执行。</p>}
              {data.applications.map((app) => (
                <div className="card stack" key={app.id}>
                  <h3>申请编号 #{app.id}</h3>
                  <div className="meta">
                    <span className="badge">机会编号 #{app.opportunityId}</span>
                    {app.packagePath && <span className="badge">文件夹 {app.packagePath.split(/[\\/]/).pop()}</span>}
                  </div>
                  {app.packagePath && (
                    <details className="file-location">
                      <summary>文件位置</summary>
                      <p>{app.packagePath}</p>
                    </details>
                  )}
                  <Area label="English Draft" value={app.draftEn} onChange={() => undefined} />
                  <Area label="Checklist" value={app.checklist} onChange={() => undefined} />
                  {app.submissionLog && <p className="notice">{app.submissionLog}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === "settings" && (
            <div className="panel stack">
              <h2>自动化</h2>
              <p>这个项目保存资料、结果和自动化偏好；可以只用外接 API 自动化，也可以只用 Codex，或两者结合。上下文文件会把最新偏好作为执行标准。</p>
              <div className="card stack">
                <h3>执行标准</h3>
                <ul className="compact-list">
                  <li>机会必须确认中国人、中国所在地艺术家或国际申请者可申请。</li>
                  <li>申请地区默认全世界，可在艺术家资料里改成亚洲、欧洲、北美等范围；搜索和排序必须按这个地区偏好执行。</li>
                  <li>每轮处理数量按“每轮最多处理数量”执行，最多可设为 100。</li>
                  <li>费用接受度默认保守：优先免费或强资助；可改成接受少量申请费，或允许付费项目但必须标红风险。</li>
                  <li>机会等级默认高等级优先；可改成高等级 + 中等级，或更开放地包含小机构和实验项目。</li>
                  <li>审核模式可选择必须审核、可跳过审核准备或直接申请；直接申请仍必须在付款、登录、验证码、敏感授权、资格不明时停下来。</li>
                  <li>审核材料默认中英对照；最终提交文件只按对方要求的语言制作。</li>
                  <li>作品集要认真选作品，先完整呈现作品本体，再按需要补充现场或细节图，并做专业排版；真实作品展览先确认作品是否还在手里。</li>
                  <li>投递完成后，把最终提交版复制到 generated/final-submissions/日期/，写清日期和文件名，再清理草稿。</li>
                </ul>
              </div>
              <div className="card stack">
                <h3>Codex 工作流读取</h3>
                <p className="muted">点击“刷新 Codex 上下文”后，会生成当前资料快照和自动化说明，供 Codex 继续做复杂核验、材料分析、文件制作和确认后投递：</p>
                <pre>{`generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md`}</pre>
              </div>
              <div className="card stack">
                <h3>外接 API 自动化</h3>
                <p className="muted">如果在 .env.local 配置了外接模型 API，网页可以直接调用模型生成自动化报告、核验手动机会链接和申请包草稿；外接模型不会自动提交材料。</p>
                <pre>{`ARTIST_STUDIO_AI_API_KEY=你的 key
ARTIST_STUDIO_AI_PROVIDER=openai-compatible
ARTIST_STUDIO_AI_BASE_URL=https://你的接口地址
ARTIST_STUDIO_AI_MODEL=你的模型名`}</pre>
                <button onClick={runProjectAiAutomation} disabled={isBusy}>
                  {busy === "project-ai" ? "运行中" : "运行项目自动化"}
                </button>
              </div>
              <div className="card stack">
                <h3>自动化写回</h3>
                <p className="muted">自动化可以把整理后的资料、机会、筛选报告、申请包和投递记录写回数据库与生成目录：</p>
                <pre>{`data/artist.sqlite
generated/reports/
generated/applications/
generated/final-submissions/`}</pre>
              </div>
              <p className="notice">默认未经你确认不发送邮件、不提交网页表单、不付款、不处理验证码；直接申请模式可跳过逐项审核，但付款、登录、验证码、敏感授权、资格不明或费用不明仍会暂停。</p>
            </div>
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
