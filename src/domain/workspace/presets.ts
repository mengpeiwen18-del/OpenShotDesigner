import {
  ALL_MODULE_IDS,
  CORE_MODULES,
  type ModuleId,
  type WorkspacePresetDefinition,
  type WorkspaceProfile,
} from './types';
/**
 * The bundled workspace presets (plan §1.2). Presets bootstrap module
 * visibility only; users may switch to `custom` and toggle modules freely.
 */
export const WORKSPACE_PRESETS: WorkspacePresetDefinition[] = [
  {
    id: 'blank',
    label: '空白俯视站位图',
    description: '从空白站位图开始，不预先添加人物和摄影机。',
    enabledModules: [...CORE_MODULES, 'annotations'],
  },
  {
    id: 'shot_planning',
    label: '分镜与人物调度',
    description: '包含俯视站位、分镜清单、剧本和分镜板。',
    enabledModules: [...CORE_MODULES, 'annotations', 'shots', 'storyboard', 'script'],
  },
  {
    id: 'full',
    label: '完整影视制作',
    description: '开启从剧本到预算、排期和拍摄装备的所有功能。',
    enabledModules: [...ALL_MODULE_IDS],
  },
  {
    id: 'narrative',
    label: '真人短剧导演模式（推荐）',
    description: '以剧本为主，包含分镜、人物站位、道具、场记与拍摄计划。推荐 AI 真人短剧。',
    enabledModules: [
      'contacts',
      'tasks',
      'budget',
      ...CORE_MODULES,
      'locations',
      'script',
      'breakdown',
      'shots',
      'storyboard',
      'schedule',
      'call_sheets',
      'production_day',
      'continuity',
      'equipment',
    ],
  },
  {
    id: 'documentary',
    label: '纪录片模式',
    description: '包含采访及镜头规划，可不使用标准剧本。',
    enabledModules: [
      'contacts',
      'tasks',
      'budget',
      ...CORE_MODULES,
      'locations',
      'shots',
      'storyboard',
      'schedule',
      'production_day',
      'continuity',
      'equipment',
      'moodboard',
    ],
  },
  {
    id: 'commercial',
    label: '商业视频模式',
    description: '双栏视听脚本、分镜和拍摄器材规划。',
    enabledModules: [
      'contacts',
      'tasks',
      'budget',
      ...CORE_MODULES,
      'av_script',
      'shots',
      'storyboard',
      'schedule',
      'continuity',
      'equipment',
      'moodboard',
    ],
  },
  {
    id: 'interview',
    label: '采访模式',
    description: '适合采访的场景、摄影机及问题规划。',
    enabledModules: [
      'contacts',
      'tasks',...CORE_MODULES, 'locations', 'shots', 'run_of_show', 'equipment'],
  },
  {
    id: 'concert',
    label: '演出与活动',
    description: '演出场地、舞台、灯光、摄影机和设备调度。',
    enabledModules: [
      'contacts',
      'tasks',
      'budget',
      ...CORE_MODULES,
      'locations',
      'shots',
      'run_of_show',
      'production_day',
      'equipment',
      'fixtures_dmx',
      'cables_signal',
      'power',
      'rigging',
      'logistics',
    ],
  },
  {
    id: 'broadcast',
    label: '多机位转播',
    description: '演播室摄影机部署及拍摄日流程。',
    enabledModules: [
      'contacts',
      'tasks',
      'budget',
      ...CORE_MODULES,
      'locations',
      'shots',
      'run_of_show',
      'schedule',
      'production_day',
      'equipment',
      'cables_signal',
      'power',
      'logistics',
    ],
  },
  {
    id: 'studio',
    label: '演播室制作',
    description: '多机位演播室与技术规划。',
    enabledModules: [
      'contacts',
      'tasks',
      'budget',
      ...CORE_MODULES,
      'locations',
      'shots',
      'run_of_show',
      'schedule',
      'equipment',
      'fixtures_dmx',
      'cables_signal',
    ],
  },
  {
    id: 'photo',
    label: '摄影拍摄',
    description: '摄影分镜、氛围参考与布光规划。',
    enabledModules: [
      'contacts',
      'tasks',...CORE_MODULES, 'locations', 'moodboard', 'equipment', 'power'],
  },
  {
    id: 'custom',
    label: '自定义',
    description: '手动选择要显示的工作模块。',
    enabledModules: [...CORE_MODULES],
  },
];

export const getPreset = (id: WorkspacePresetDefinition['id']): WorkspacePresetDefinition =>
  WORKSPACE_PRESETS.find((preset) => preset.id === id) ?? WORKSPACE_PRESETS[0];

/**
 * Build the initial workspace profile for a preset. `modules` overrides the
 * preset's own list, which is what the Custom preset's module picker passes;
 * the core modules are folded back in so a profile can never hide the canvas.
 */
export const createWorkspaceProfile = (
  id: WorkspacePresetDefinition['id'],
  modules?: ModuleId[],
): WorkspaceProfile => ({
  preset: id,
  enabledModules: modules
    ? [...new Set<ModuleId>([...CORE_MODULES, ...modules])]
    : getPreset(id).enabledModules,
});

/** Enable/disable a module, always keeping the core modules available. */
export const withModuleToggled = (
  profile: WorkspaceProfile,
  moduleId: ModuleId,
  enabled: boolean,
): WorkspaceProfile => {
  const base = new Set(profile.enabledModules);
  if (enabled) base.add(moduleId);
  else if (!CORE_MODULES.includes(moduleId)) base.delete(moduleId);
  return { ...profile, preset: 'custom', enabledModules: [...base] };
};

export const isModuleEnabled = (profile: WorkspaceProfile, moduleId: ModuleId): boolean =>
  CORE_MODULES.includes(moduleId) || profile.enabledModules.includes(moduleId);

/**
 * Profile used when a project has no stored preset (e.g. projects created
 * before presets existed): every module visible, preserving current behavior.
 */
export const ALL_MODULES_PROFILE: WorkspaceProfile = {
  preset: 'custom',
  enabledModules: [...ALL_MODULE_IDS],
};
