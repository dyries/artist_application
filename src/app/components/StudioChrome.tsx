import type { MaterialKind } from "@/types/domain";
import type { StudioData, Tab } from "./studioTypes";
import { materialKindMeta } from "./studioModel";

type StudioChromeProps = {
  busy: string;
  completion: number;
  data: StudioData;
  error: string;
  isBusy: boolean;
  materialCounts: Record<MaterialKind, number>;
  message: string;
  refresh: () => void;
  prepareCodexContext: () => void;
  runProjectAiAutomation: () => void;
  saveArtist: () => void;
  setTab: (tab: Tab) => void;
  tab: Tab;
};

const tabs: { key: Tab; label: string }[] = [
  { key: "profile", label: "艺术家资料" },
  { key: "materials", label: "材料库" },
  { key: "works", label: "作品" },
  { key: "cv", label: "CV" },
  { key: "opportunities", label: "机会" },
  { key: "submissions", label: "申请包" },
  { key: "settings", label: "自动化" }
];

export function StudioHeader({ busy, isBusy, refresh, prepareCodexContext, saveArtist }: Pick<
  StudioChromeProps,
  "busy" | "isBusy" | "refresh" | "prepareCodexContext" | "saveArtist"
>) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <h1>Artist Application Studio</h1>
          <p>AI 艺术家申请工作区：可外接 API 生成草稿，也可交给 Codex 做复杂核验、文件制作和确认后投递</p>
        </div>
        <div className="toolbar">
          <button className="secondary" onClick={refresh} disabled={isBusy}>刷新</button>
          <button className="secondary" onClick={prepareCodexContext} disabled={isBusy}>
            {busy === "prepare-codex" ? "刷新中" : "刷新 Codex 上下文"}
          </button>
          <button onClick={saveArtist} disabled={isBusy}>{busy === "save" ? "保存中" : "保存资料"}</button>
        </div>
      </div>
    </header>
  );
}

export function StudioSidebar({
  busy,
  completion,
  data,
  error,
  isBusy,
  materialCounts,
  message,
  prepareCodexContext,
  runProjectAiAutomation,
  setTab,
  tab
}: StudioChromeProps) {
  return (
    <aside className="stack">
      <section className="panel stack">
        <h2>工作区</h2>
        <div className="tabs">
          {tabs.map(({ key, label }) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h2>资料完整度</h2>
        <div className="meter" aria-label={`资料完整度 ${completion}%`}>
          <span style={{ width: `${completion}%` }} />
        </div>
        <div className="stats">
          <span><strong>{completion}%</strong> 核心资料</span>
          <span><strong>{data.counts?.works ?? data.works.length}</strong> 件作品</span>
          <span><strong>{data.counts?.cv ?? data.cv.length}</strong> 条 CV</span>
          <span><strong>{data.counts?.materialSources ?? data.materialSources.length}</strong> 份旧材料</span>
          <span><strong>{data.counts?.opportunities ?? data.opportunities.length}</strong> 个机会</span>
        </div>
      </section>

      <section className="panel stack">
        <h2>材料分区</h2>
        <div className="stats">
          {materialKindMeta.map((item) => (
            <span key={item.kind}><strong>{materialCounts[item.kind]}</strong> {item.label}</span>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h2>Codex 工作流</h2>
        <p className="muted">需要更复杂的网页核验、材料理解、作品集制作或确认后投递时，先刷新上下文，再让 Codex 读取当前项目状态继续处理。</p>
        <button onClick={prepareCodexContext} disabled={isBusy}>{busy === "prepare-codex" ? "刷新中" : "保存并刷新上下文"}</button>
      </section>

      <section className="panel stack">
        <h2>外接 API 自动化</h2>
        <p className="muted">读取 .env.local 中的外接模型配置，在网页内生成报告、核验手动机会链接，并生成申请包草稿。</p>
        <button onClick={runProjectAiAutomation} disabled={isBusy}>
          {busy === "project-ai" ? "运行中" : "运行项目自动化"}
        </button>
      </section>

      {(message || error) && (
        <section className={`notice ${error ? "error" : ""}`}>
          {error || message}
        </section>
      )}
    </aside>
  );
}
