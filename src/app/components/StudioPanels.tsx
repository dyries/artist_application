import type { CvEntry, MaterialKind, SourceMaterial, Work } from "@/types/domain";
import { activeOpportunities, buildOpportunityShortlist } from "@/lib/opportunityShortlist";
import { Area, Field } from "./FormControls";
import type { StudioData } from "./studioTypes";

type MaterialSection = {
  kind: MaterialKind;
  label: string;
  hint: string;
  sources: { source: SourceMaterial; index: number }[];
};

type SharedBusyProps = {
  busy: string;
  isBusy: boolean;
};

type FinalPackageDecision = (id: number, decision: "approve_final_submission_package" | "request_revision") => void;

type MaterialsPanelProps = SharedBusyProps & {
  data: StudioData;
  materialCounts: Record<MaterialKind, number>;
  materialSections: MaterialSection[];
  addSource: (kind: MaterialKind) => void;
  deleteSource: (index: number) => void;
  importMaterialFiles: (files: FileList | null) => void;
  prepareCodexContext: () => void;
  scanProjectMaterials: () => void;
  scrollToMaterialSection: (kind: MaterialKind) => void;
  updateSource: (index: number, patch: Partial<SourceMaterial>) => void;
};

export function MaterialsPanel({
  addSource,
  busy,
  data,
  deleteSource,
  importMaterialFiles,
  isBusy,
  materialCounts,
  materialSections,
  prepareCodexContext,
  scanProjectMaterials,
  scrollToMaterialSection,
  updateSource
}: MaterialsPanelProps) {
  return (
    <div className="panel stack">
      <div className="toolbar">
        <h2>材料库</h2>
        <label className="file-button">
          {busy === "upload-materials" ? "导入中" : "导入文件"}
          <input
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.rtf,.pdf,.doc,.docx,.pptx,.key,.idml,.jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,.psd,.cr2,.mp4,.mov,.m4v,.webm,.avi,.mp3,.m4a,.wav,.rar"
            disabled={isBusy}
            onChange={(event) => {
              importMaterialFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button className="secondary" onClick={() => addSource("other")}>
          新增手填材料
        </button>
        <button className="secondary" onClick={scanProjectMaterials} disabled={isBusy}>
          {busy === "scan-materials" ? "扫描中" : "扫描项目文件夹"}
        </button>
        <button onClick={prepareCodexContext} disabled={isBusy}>
          {busy === "prepare-codex" ? "刷新中" : "刷新自动化上下文"}
        </button>
      </div>
      <p className="muted">把 CV、bio、statement、作品说明、作品集、PDF、Word、图片、音视频和设计文件导入进来，或者直接放进 artist-assets/inbox/cv、statement、bio、portfolio、works、work-images、other 后点击扫描。项目会保存原文件、抽取文本/OCR/metadata，并在配置多模态模型时生成视觉分析；材料取舍和最终判断仍由 Codex 或外接 API 自动化完成。</p>
      <div className="material-overview">
        {materialSections.map((item) => (
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
                  <button className="danger" onClick={() => deleteSource(index)} disabled={isBusy}>
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
  );
}

type WorksPanelProps = SharedBusyProps & {
  data: StudioData;
  addWork: () => void;
  deleteWork: (index: number) => void;
  updateWork: (index: number, patch: Partial<Work>) => void;
};

export function WorksPanel({ addWork, busy, data, deleteWork, isBusy, updateWork }: WorksPanelProps) {
  return (
    <div className="panel stack">
      <div className="toolbar">
        <h2>作品</h2>
        <button className="secondary" onClick={addWork}>新增作品</button>
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
            <button className="danger" onClick={() => deleteWork(index)} disabled={isBusy}>
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
  );
}

type CvPanelProps = SharedBusyProps & {
  data: StudioData;
  addCvEntry: () => void;
  deleteCv: (index: number) => void;
  updateCv: (index: number, patch: Partial<CvEntry>) => void;
};

export function CvPanel({ addCvEntry, busy, data, deleteCv, isBusy, updateCv }: CvPanelProps) {
  return (
    <div className="panel stack">
      <div className="toolbar">
        <h2>CV</h2>
        <button className="secondary" onClick={addCvEntry}>新增 CV 条目</button>
      </div>
      {data.cv.length === 0 && <p className="muted">还没有 CV 条目。可以加入展览、驻留、奖项、出版、教育经历等。</p>}
      {data.cv.map((entry, index) => (
        <div className="card stack" key={`${entry.id}-${index}`}>
          <div className="item-card-header">
            <div>
              <h3>{entry.titleZh || entry.titleEn || entry.title || "未命名 CV 条目"}</h3>
              <p className="muted">{[entry.year, entry.organizationZh || entry.organizationEn || entry.organization, entry.locationZh || entry.locationEn || entry.location].filter(Boolean).join(" · ") || "尚未填写年份、机构或地点"}</p>
            </div>
            <button className="danger" onClick={() => deleteCv(index)} disabled={isBusy}>
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
  );
}

type OpportunitiesPanelProps = SharedBusyProps & {
  data: StudioData;
  addManualOpportunity: () => void;
  manualOpportunityNotes: string;
  manualOpportunityTitle: string;
  manualOpportunityUrl: string;
  prepareCodexContext: () => void;
  selectedOpportunityIds: Set<number>;
  completeOpportunityReview: () => void;
  toggleOpportunitySelection: (id: number, selected: boolean) => void;
  setManualOpportunityNotes: (value: string) => void;
  setManualOpportunityTitle: (value: string) => void;
  setManualOpportunityUrl: (value: string) => void;
};

export function OpportunitiesPanel({
  addManualOpportunity,
  busy,
  data,
  isBusy,
  manualOpportunityNotes,
  manualOpportunityTitle,
  manualOpportunityUrl,
  prepareCodexContext,
  selectedOpportunityIds,
  completeOpportunityReview,
  toggleOpportunitySelection,
  setManualOpportunityNotes,
  setManualOpportunityTitle,
  setManualOpportunityUrl
}: OpportunitiesPanelProps) {
  const shortlist = buildOpportunityShortlist(data.opportunities);
  const active = activeOpportunities(data.opportunities);
  const selectedReviewCount = shortlist.filter((opportunity) => selectedOpportunityIds.has(opportunity.id)).length;
  const coverage = data.searchCoverageReport;

  return (
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
      {coverage && (
        <section className="coverage-panel stack">
          <div className="section-heading">
            <div>
              <h3>搜索覆盖审计</h3>
              <p className="muted">区分候选发现、低成本初筛、深度核验和最终推荐；未配置或失败的来源不会被当作已覆盖。</p>
            </div>
            <span className="badge">置信度：{coverage.confidence}</span>
          </div>
          <div className="coverage-grid">
            <div><span>查询</span><strong>{coverage.generatedQueries}</strong></div>
            <div><span>发现候选</span><strong>{coverage.discoveredCount}</strong></div>
            <div><span>去重后</span><strong>{coverage.deduplicatedCount}</strong></div>
            <div><span>初筛保留</span><strong>{coverage.triageKeepCount}</strong></div>
            <div><span>正在/已核验</span><strong>{coverage.verifiedCount}</strong></div>
            <div><span>最终推荐</span><strong>{coverage.shortlistedCount}</strong></div>
          </div>
          <div className="meta">
            <span className="badge">来源：{coverage.providersSucceeded.join("、") || "无成功来源"}</span>
            {coverage.budgetTruncated && <span className="badge">预算截断</span>}
            {coverage.fixedSourceOnly && <span className="badge">仅固定来源</span>}
          </div>
          {coverage.providersFailed.length > 0 && (
            <p className="notice warn">未覆盖来源：{coverage.providersFailed.map((item) => `${item.provider}：${item.reason}`).join("；")}</p>
          )}
          {coverage.warnings.length > 0 && (
            <ul className="compact-list">
              {coverage.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
        </section>
      )}
      {data.opportunities.length === 0 && <p className="muted">Codex 自动化运行后，会先研究更大的候选池，排除过期和明确不符合资格的项目，再给你约 5 个最值得申请的机会。</p>}
      {shortlist.length > 0 && (
        <div className="notice">
          <strong>第一次审核：</strong>系统已从 {data.opportunities.length} 个记录中整理出以下 {shortlist.length} 个推荐机会。只勾选你要申请的项目，系统会立即为已选机会准备最终提交包。
        </div>
      )}
      {shortlist.length > 0 && (
        <div className="toolbar">
          <span className="badge">推荐 {shortlist.length}</span>
          <span className="badge">已选 {selectedReviewCount}</span>
          <button onClick={completeOpportunityReview} disabled={isBusy}>
            {busy === "opportunity-review" ? "制包中" : "完成第一次审核并自动制包"}
          </button>
          <button onClick={prepareCodexContext} disabled={isBusy}>
            {busy === "prepare-codex" ? "刷新中" : "刷新申请包上下文"}
          </button>
        </div>
      )}
      {shortlist.map((opportunity) => (
        <div className="card" key={opportunity.id}>
          <div className="item-card-header">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedOpportunityIds.has(opportunity.id)}
                disabled={isBusy || opportunity.status === "not_selected" || opportunity.status === "package_ready_for_final_review" || opportunity.status === "approved_for_submission"}
                onChange={(event) => toggleOpportunitySelection(opportunity.id, event.target.checked)}
              />
              <span>申请</span>
            </label>
            <h3>{opportunity.title}</h3>
          </div>
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
        </div>
      ))}
      {active.length > 0 && (
        <section className="stack">
          <div className="section-heading">
            <div>
              <h3>进行中的机会</h3>
              <p className="muted">已进入制包、最终审核或提交跟踪的项目。</p>
            </div>
          </div>
          {active.map((opportunity) => (
            <div className="card" key={opportunity.id}>
              <div className="item-card-header">
                <h3>{opportunity.title}</h3>
                <span className="badge">状态：{opportunity.status}</span>
              </div>
              <div className="meta">
                <span className="badge">{opportunity.organization || "机构待识别"}</span>
                <span className="badge">{opportunity.deadline || "截止日期待识别"}</span>
                {opportunity.score !== null && <span className="badge score">匹配度 {opportunity.score}</span>}
              </div>
              <p className="muted">{opportunity.summary || "申请流程进行中。"}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function SubmissionsPanel({
  data,
  isBusy,
  setFinalPackageDecision
}: {
  data: StudioData;
  isBusy: boolean;
  setFinalPackageDecision: FinalPackageDecision;
}) {
  return (
    <div className="panel stack">
      <h2>申请包</h2>
      {data.applications.length === 0 && <p className="muted">用户选择申请某个机会后，外接 API 或 Codex 才会准备最终审核包。包内固定分为 internal-notes、user-review、external-submission：用户主要看中文审核摘要和最终提交前检查清单；对外文件只保留机构应看到的正式内容。</p>}
      {data.applications.map((app) => (
        <div className="card stack" key={app.id}>
          <h3>申请编号 #{app.id}</h3>
          <div className="meta">
            <span className="badge">机会编号 #{app.opportunityId}</span>
            <span className="badge">运行：{app.runMode}</span>
            <span className="badge">边界：{app.boundaryModel}</span>
            {app.packagePath && <span className="badge">文件夹 {app.packagePath.split(/[\\/]/).pop()}</span>}
          </div>
          {app.packagePath && (
            <details className="file-location">
              <summary>文件位置</summary>
              <p>{app.packagePath}</p>
            </details>
          )}
          <Area label="中文最终审核摘要" value={app.draftZh} onChange={() => undefined} />
          <Area label="正式材料预览" value={app.draftEn} onChange={() => undefined} />
          <Area label="自动检查清单" value={app.checklist} onChange={() => undefined} />
          <div className="list-actions">
            <button onClick={() => setFinalPackageDecision(app.id, "approve_final_submission_package")} disabled={isBusy}>
              批准最终提交包
            </button>
            <button className="secondary" onClick={() => setFinalPackageDecision(app.id, "request_revision")} disabled={isBusy}>
              需要返工
            </button>
          </div>
          {app.submissionLog && <p className="notice">{app.submissionLog}</p>}
        </div>
      ))}
    </div>
  );
}

type SettingsPanelProps = SharedBusyProps & {
  data: StudioData;
  runProjectAiAutomation: () => void;
};

export function SettingsPanel({ busy, data, isBusy, runProjectAiAutomation }: SettingsPanelProps) {
  return (
    <div className="panel stack">
      <h2>自动化</h2>
      <p>这里保存自动化偏好并触发上下文刷新。完整执行规则见 docs/rules.md；机器规则由 src/lib/automationRules.ts 生成给 Codex 和外接 API prompt。</p>
      <div className="card stack">
        <h3>当前偏好</h3>
        <div className="stats">
          <span><strong>{data.profile.applicationRegion || "worldwide"}</strong> 申请地区</span>
          <span><strong>{data.profile.automationBatchLimit || 5}</strong> 每轮上限</span>
          <span><strong>{data.profile.submissionApprovalMode || "review_required"}</strong> 审核模式</span>
          <span><strong>{data.profile.opportunityFeePreference || "conservative"}</strong> 费用偏好</span>
          <span><strong>{data.profile.opportunityTierPreference || "high_tier"}</strong> 机会等级</span>
        </div>
        <p className="muted">自动化会遵守地区偏好、费用偏好、机会等级、审核模式和安全暂停条件；付款、登录、验证码、敏感授权、资格或费用不明、材料缺失和不可逆动作仍需人工介入。</p>
      </div>
      <div className="card stack">
        <h3>Codex 工作流读取</h3>
        <p className="muted">点击“刷新 Codex 上下文”后，会生成当前资料快照和自动化说明：</p>
        <pre>{`generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md`}</pre>
      </div>
      <div className="card stack">
        <h3>外接 API 自动化</h3>
        <p className="muted">如果在 .env.local 配置了外接 API，网页可以生成报告、核验手动机会链接文本和申请包草稿；外接 API 不会自动提交材料。</p>
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
      <p className="notice">默认未经你确认不发送邮件、不提交网页表单、不付款、不处理验证码；预授权准备模式也不能跳过最终提交确认。付款、登录、验证码、法律声明、隐私风险、敏感授权、资格不明或费用不明仍会暂停。</p>
    </div>
  );
}
