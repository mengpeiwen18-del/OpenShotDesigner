import React, { useMemo, useState } from 'react';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { buildDirectorPrompt, parseDirectorDraft, type DirectorDraft } from '../../domain/aiDirector/directorDraft';

export const DirectorAssistantPanel: React.FC = () => {
  const { project, activeSetup, scriptLines, addShot } = useFloorPlan();
  const [source, setSource] = useState<'imported' | 'manual'>('imported');
  const [manual, setManual] = useState('');
  const [proposal, setProposal] = useState('');
  const [reviewed, setReviewed] = useState<DirectorDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [committed, setCommitted] = useState(false);
  const script = useMemo(() => source === 'imported'
    ? scriptLines.map((line) => line.text).join('\n')
    : manual, [manual, scriptLines, source]);
  const scene = activeSetup.sceneNumber || '1';

  const validate = () => {
    const parsed = parseDirectorDraft(proposal, script);
    if (!parsed.ok) { setErrors(parsed.errors); setReviewed(null); return; }
    if (!script.trim()) {
      setErrors(['请先在“剧本”页面导入原稿，或在这里粘贴原文；不能在缺少原稿时批准镜头。']);
      setReviewed(null);
      return;
    }
    setReviewed(parsed.draft);
    setErrors([]);
    setCommitted(false);
  };
  const approve = () => {
    if (!reviewed || committed) return;
    for (const shot of reviewed.shots) {
      addShot({
        name: shot.name,
        shotSize: shot.shotSize,
        movement: shot.movement,
        cameraAngle: shot.cameraAngle,
        lensMm: shot.lensMm,
        estDurationSeconds: shot.durationSeconds,
        aspectRatio: '16:9',
        framingDescription: shot.framingDescription,
        actionScriptNotes: shot.actionScriptNotes,
      });
    }
    setCommitted(true);
    setReviewed(null);
    setErrors([]);
  };
  const copyInstructions = () => {
    const text = buildDirectorPrompt(script, scene);
    void navigator.clipboard.writeText(text).catch(() => setErrors(['复制失败，请尝试在安全的 HTTPS 网站中打开。']));
  };
  return (
    <section className="h-full overflow-y-auto p-4 bg-surface text-ink space-y-4" aria-label="AI 导演助手">
      <div>
        <h2 className="text-lg font-bold">AI 导演助手 · 人工审核模式</h2>
        <p className="text-xs text-ink-muted mt-1">现阶段可生成导演指令、导入 AI 的 JSON 草案并审阅后写入真实镜头。尚未连接模型，不能在这里直接自动生成。</p>
      </div>
      <div className="border border-line rounded-xl p-3 space-y-2">
        <h3 className="font-bold text-sm">① 选定原剧本 · {project.title} · 场次 {scene}</h3>
        <label className="text-xs flex items-center gap-2"><input type="radio" checked={source === 'imported'} onChange={() => setSource('imported')}/> 使用已导入的剧本（{scriptLines.length} 行）</label>
        <label className="text-xs flex items-center gap-2"><input type="radio" checked={source === 'manual'} onChange={() => setSource('manual')}/> 粘贴原稿作为临时只读引用</label>
        {source === 'manual' && <textarea className="w-full h-32 p-2 rounded border border-line-strong bg-field text-xs" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="粘贴本场剧本原文；这里只作为核对依据，不会修改项目剧本。"/>}
        <p className="text-[11px] text-ink-muted">引用文本：{script.length} 字。只检查逐字引用是否在当前原稿中，不代表已完成对白完整性核查。</p>
      </div>
      <div className="border border-line rounded-xl p-3 space-y-2">
        <h3 className="font-bold text-sm">② 复制专业导演指令</h3>
        <p className="text-xs text-ink-muted">指令包含：剧情保护、16:9、专业景别/焦距/运镜、最多15秒、空间连续性、JSON输出规范。</p>
        <button type="button" onClick={copyInstructions} className="bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 text-xs font-semibold">复制导演指令与原稿</button>
        <p className="text-[11px] text-ink-muted">将复制的内容发送给你使用的 AI，然后把 AI 返回的纯 JSON 粘贴到下方。仅供当前过渡阶段使用。</p>
      </div>
      <div className="border border-line rounded-xl p-3 space-y-2">
        <h3 className="font-bold text-sm">③ 导入草案 → 审核 → 写入镜头</h3>
        <textarea value={proposal} onChange={(event) => { setProposal(event.target.value); setReviewed(null); setCommitted(false); setErrors([]); }} placeholder={'粘贴 AI 返回的 JSON：\n{"version":1,"shots":[...]}'} className="w-full h-40 p-2 rounded border border-line-strong bg-field text-xs font-mono" />
        <button type="button" onClick={validate} className="border border-line-strong hover:bg-surface-hover rounded-lg px-3 py-2 text-xs font-semibold">校验并预览草案</button>
        {errors.length > 0 && <div role="alert" className="p-2 rounded bg-amber-900/20 text-xs space-y-1">{errors.map((error, i) => <p key={i}>• {error}</p>)}</div>}
        {reviewed && (
          <div className="rounded-lg border border-line p-3 space-y-2">
            <p className="text-xs font-bold">审核通过：{reviewed.shots.length} 镜 · 将追加至当前场次镜头表</p>
            {reviewed.shots.map((shot, index) => <div key={index} className="p-2 rounded bg-surface-muted text-xs">
              <strong>{index + 1}. {shot.name}</strong>
              <p>{shot.shotSize} · {shot.lensMm}mm · {shot.movement} · {shot.durationSeconds}秒 · 16:9</p>
              <p className="mt-1 whitespace-pre-wrap">{shot.framingDescription}</p>
              <p className="mt-1 whitespace-pre-wrap text-ink-muted">{shot.actionScriptNotes}</p>
            </div>)}
            <p className="text-[11px] text-ink-muted">注意：此步骤只新增镜头和摄影机。人物站位、走位路径、场景资产、左右手道具与越轴仍需在俯视图中人工确认，不能视为自动通过。</p>
            <button type="button" onClick={approve} className="bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 text-xs font-bold">确认写入当前场次镜头</button>
          </div>
        )}
        {committed && <p role="status" className="text-xs text-emerald-500">已写入当前场次镜头表。打开“镜头清单”或“分镜板”继续编辑。</p>}
      </div>
    </section>
  );
};
