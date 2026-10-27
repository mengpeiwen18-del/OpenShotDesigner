/**
 * A deliberately small, human-reviewed AI director bridge.
 *
 * AI text is NEVER allowed to overwrite screenplay lines, actors or the scene
 * geometry. Imported proposals are verified before they become ordinary shots.
 * Provider APIs are not used here: secrets belong on a future server.
 */
import type { CameraHeight, CameraMovement, ShotSize } from '../../types';

const SHOT_SIZES: readonly ShotSize[] = ['ELS', 'WS', 'FS', 'MWS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'POV', 'Insert', 'Dutch'];
const MOVEMENTS: readonly CameraMovement[] = ['Static', 'Pan', 'Tilt', 'Dolly In', 'Dolly Out', 'Tracking', 'Pedestal', 'Boom / Crane', 'Handheld', 'Steadicam', 'Whip Pan', 'Zoom'];
const CAMERA_ANGLES: readonly CameraHeight[] = ['Ground', 'Knee', 'Waist', 'Eye Level', 'High', 'Low Angle', 'High Angle', "Bird's Eye", "Overhead / Bird's Eye", "Worm's Eye", 'Dutch Angle'];

export interface DirectorShotProposal {
  name: string;
  shotSize: ShotSize;
  movement: CameraMovement;
  cameraAngle: CameraHeight;
  lensMm: number;
  durationSeconds: number;
  framingDescription: string;
  actionScriptNotes: string;
  /** Optional exact excerpt from the imported screenplay, never rewritten. */
  sourceExcerpt?: string;
}

export interface DirectorDraft {
  version: 1;
  shots: DirectorShotProposal[];
}

export type DirectorDraftResult =
  | { ok: true; draft: DirectorDraft }
  | { ok: false; errors: string[] };

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null && !Array.isArray(item);

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const parseDirectorDraft = (
  json: string,
  originalScript: string,
): DirectorDraftResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['内容不是有效 JSON。请粘贴 AI 返回的完整 JSON，不要包含 Markdown 代码围栏。'] };
  }
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.shots)) {
    return { ok: false, errors: ['格式不正确：需要 { "version": 1, "shots": [...] }。'] };
  }
  if (parsed.shots.length === 0 || parsed.shots.length > 50) {
    return { ok: false, errors: ['每次仅允许导入 1–50 个镜头，请按场次分批处理。'] };
  }
  const errors: string[] = [];
  const shots: DirectorShotProposal[] = [];
  parsed.shots.forEach((raw: unknown, index: number) => {
    const tag = '镜头 ' + (index + 1);
    if (!isRecord(raw)) {
      errors.push(tag + ' 不是对象。');
      return;
    }
    if (!nonEmpty(raw.name) || !nonEmpty(raw.framingDescription) || !nonEmpty(raw.actionScriptNotes)) {
      errors.push(tag + ' 必须有名称、画面描述、动作/对白描述。');
    }
    if (!SHOT_SIZES.includes(raw.shotSize as ShotSize)) errors.push(tag + ' 景别不在支持列表中。');
    if (!MOVEMENTS.includes(raw.movement as CameraMovement)) errors.push(tag + ' 运镜类型不在支持列表中。');
    const angle = raw.cameraAngle === undefined ? 'Eye Level' : raw.cameraAngle;
    if (!CAMERA_ANGLES.includes(angle as CameraHeight)) errors.push(tag + ' 摄影机角度无效。');
    if (typeof raw.lensMm !== 'number' || !Number.isFinite(raw.lensMm) || raw.lensMm < 12 || raw.lensMm > 200) {
      errors.push(tag + ' 焦距必须在 12–200 mm 之间。');
    }
    if (typeof raw.durationSeconds !== 'number' || !Number.isFinite(raw.durationSeconds) || raw.durationSeconds <= 0 || raw.durationSeconds > 15) {
      errors.push(tag + ' 时长必须大于 0 且不超过 15 秒。');
    }
    if (raw.sourceExcerpt !== undefined) {
      if (!nonEmpty(raw.sourceExcerpt)) errors.push(tag + ' 原文引用不能为空。');
      else if (originalScript.length > 0 && !originalScript.includes(raw.sourceExcerpt)) {
        errors.push(tag + ' 的原文引用与已导入的剧本不完全一致，请核对原文。');
      }
    }
    if (typeof raw.name === 'string' && raw.name.length > 140) errors.push(tag + ' 名称过长。');
    if (typeof raw.framingDescription === 'string' && raw.framingDescription.length > 6000) errors.push(tag + ' 画面描述过长。');
    if (typeof raw.actionScriptNotes === 'string' && raw.actionScriptNotes.length > 6000) errors.push(tag + ' 动作描述过长。');
    if (errors.length > 0) return;
    shots.push({
      name: raw.name as string,
      shotSize: raw.shotSize as ShotSize,
      movement: raw.movement as CameraMovement,
      cameraAngle: angle as CameraHeight,
      lensMm: raw.lensMm as number,
      durationSeconds: raw.durationSeconds as number,
      framingDescription: raw.framingDescription as string,
      actionScriptNotes: raw.actionScriptNotes as string,
      ...(raw.sourceExcerpt === undefined ? {} : { sourceExcerpt: raw.sourceExcerpt as string }),
    });
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, draft: { version: 1, shots } };
};

export const buildDirectorPrompt = (script: string, sceneLabel: string): string => {
  const template = {
    version: 1,
    shots: [{
      name: '镜头1｜角色发现异常',
      shotSize: 'MS',
      movement: 'Dolly In',
      cameraAngle: 'Eye Level',
      lensMm: 50,
      durationSeconds: 8,
      framingDescription: '16:9 真人电影质感；写清楚拍摄主体、初始构图、空间关系、光影与色调。',
      actionScriptNotes: '写清楚镜头动作、朝向、视线、原文对白与镜头末端状态。',
      sourceExcerpt: '如有引用请填写剧本中逐字一致的短句；无引用可不填',
    }],
  };
  return [
    '你是专业 AI 真人短剧导演，正在为一套可人工调整的影视工作台制作逐镜导演草案。',
    '严格禁止改动、删减、补写原剧情和对白；剧本不明确的站位/持手/朝向写在描述中标记“待确认”。',
    '每镜 16:9，时长 0–15 秒；只在情绪关键镜头设计复杂运镜，普通叙事镜头应克制、稳定。',
    '每场规划统一世界空间，注意轴线、相邻镜头方向、人物走位、左右手道具和画面背景连续性。',
    '写专业景别、焦段、摄影机角度、运镜；对白须融入 actionScriptNotes，不另造台词。',
    '仅返回纯 JSON，不要 Markdown 代码围栏，不要解释。格式如下（内容是演示，请替换）：',
    JSON.stringify(template, null, 2),
    '枚举：shotSize = ' + SHOT_SIZES.join(' / '),
    '枚举：movement = ' + MOVEMENTS.join(' / '),
    '枚举：cameraAngle = ' + CAMERA_ANGLES.join(' / '),
    '焦距 lensMm 是 12–200 之间的数字；durationSeconds 是大于 0、不超过 15 的数字。',
    'sourceExcerpt 可省略；如提供必须与原文逐字完全一致。',
    '本次工作场次：' + sceneLabel,
    '以下为原剧本文字（必须严格保护）：',
    '----- 原稿开始 -----',
    script || '（还没有剧本，请先在网站的“剧本”模块导入剧本，再生成导演指令。）',
    '----- 原稿结束 -----',
  ].join('\n\n');
};
