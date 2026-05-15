export type SiteProofModule =
  | 'jobs'
  | 'workflow_templates'
  | 'proof_objects'
  | 'media_capture'
  | 'voice_notes'
  | 'timeline'
  | 'offline_storage'
  | 'sync_queue'
  | 'export_engine'
  | 'ai_summaries'
  | 'missing_proof_detection'
  | 'customer_packets'
  | 'inspection_packets'
  | 'settings'
  | 'ui_shell'
  | 'testing'
  | 'unknown';

export type TaskExecutionMode =
  | 'must_run_first'
  | 'can_run_parallel'
  | 'blocked'
  | 'requires_review'
  | 'integration_step'
  | 'test_step';

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  affectedModules: SiteProofModule[];
  executionMode: TaskExecutionMode;
  dependsOn: string[];
  canRunWith: string[];
  blocks: string[];
  estimatedRisk: 'low' | 'medium' | 'high';
  reason: string;
}

export interface TaskDependency {
  fromTaskId: string;
  toTaskId: string;
  dependencyType:
    | 'schema_first'
    | 'shared_service_first'
    | 'data_migration_first'
    | 'ui_depends_on_domain'
    | 'export_depends_on_proof_data'
    | 'sync_depends_on_storage'
    | 'test_depends_on_feature'
    | 'manual_review_required';
  reason: string;
}

export interface ParallelTaskGroup {
  id: string;
  title: string;
  tasks: string[];
  reasonParallelSafe: string;
  integrationRequiredAfter: boolean;
}

export interface BlockedTask {
  taskId: string;
  blockedBy: string[];
  unblockCondition: string;
}

export interface RiskFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  category:
    | 'schema_drift'
    | 'offline_regression'
    | 'sync_conflict'
    | 'export_inconsistency'
    | 'proof_integrity'
    | 'ai_overreach'
    | 'ui_complexity'
    | 'test_gap'
    | 'scope_creep';
  description: string;
  mitigation: string;
}

export interface ExecutionStep {
  order: number;
  title: string;
  taskIds: string[];
  executionType: 'single' | 'parallel_group' | 'integration' | 'test';
  successCriteria: string[];
}

export interface RequiredTest {
  id: string;
  title: string;
  testType: 'unit' | 'integration' | 'e2e' | 'manual' | 'build' | 'smoke';
  relatedTaskIds: string[];
  command?: string;
  successCriteria: string;
}

export interface ArchitectureDependency {
  id: string;
  name: string;
  requiredBefore: string[];
  reason: string;
}

export interface TaskGraphReviewResult {
  requestSummary: string;
  realGoal: string;
  affectedModules: SiteProofModule[];
  architectureDependencies: ArchitectureDependency[];
  tasks: TaskNode[];
  dependencies: TaskDependency[];
  parallelGroups: ParallelTaskGroup[];
  blockedTasks: BlockedTask[];
  riskFlags: RiskFlag[];
  recommendedSequence: ExecutionStep[];
  requiredTests: RequiredTest[];
  implementationNotes: string[];
}

export interface EvaluateTaskGraphInput {
  request: string;
  knownArchitecture?: string[];
  affectedModules?: SiteProofModule[];
  constraints?: string[];
  existingTasks?: TaskNode[];
  mode?: 'planning' | 'code_review' | 'refactor_review' | 'release_review';
}

const MODULE_KEYWORDS: Record<SiteProofModule, string[]> = {
  jobs: ['job', 'customer', 'site', 'status'],
  workflow_templates: ['template', 'workflow', 'stage', 'checklist', 'required photo'],
  proof_objects: ['proof', 'evidence', 'hash', 'timestamp', 'gps', 'watermark'],
  media_capture: ['photo', 'camera', 'gallery', 'thumbnail', 'compression', 'media'],
  voice_notes: ['voice', 'audio', 'transcription', 'speech', 'spanish', 'english'],
  timeline: ['timeline', 'playback', 'chronological', 'event'],
  offline_storage: ['offline', 'indexeddb', 'local storage', 'persistence', 'durable'],
  sync_queue: ['sync', 'cloud', 'upload', 'backup', 'conflict'],
  export_engine: ['export', 'pdf', 'report', 'packet', 'inspector', 'insurance'],
  ai_summaries: ['ai', 'summary', 'summaries', 'narrative', 'label'],
  missing_proof_detection: ['missing', 'required', 'warning', 'red flag', 'inspection readiness'],
  customer_packets: ['customer packet', 'handoff', 'signoff'],
  inspection_packets: ['inspection', 'permit', 'inspector'],
  settings: ['settings', 'company logo', 'brand', 'offer'],
  ui_shell: ['ui', 'ux', 'screen', 'button', 'navigation'],
  testing: ['test', 'quality', 'build', 'smoke', 'regression'],
  unknown: [],
};

const schemaSensitiveModules: SiteProofModule[] = [
  'proof_objects',
  'workflow_templates',
  'timeline',
  'export_engine',
  'sync_queue',
  'media_capture',
];

const schemaModuleNames = ['ProofObject', 'WorkflowStep', 'TimelineEvent', 'ExportPacket', 'SyncState', 'MediaAsset'];

function uniqueModules(modules: SiteProofModule[]): SiteProofModule[] {
  return [...new Set(modules)];
}

export function inferAffectedModules(request: string, explicitModules: SiteProofModule[] = []): SiteProofModule[] {
  const normalized = request.toLowerCase();
  const inferred = Object.entries(MODULE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([module]) => module as SiteProofModule);

  if (inferred.includes('missing_proof_detection')) inferred.push('proof_objects');
  if (inferred.includes('export_engine')) inferred.push('proof_objects');
  if (inferred.includes('timeline')) inferred.push('proof_objects');
  if (inferred.includes('sync_queue')) inferred.push('offline_storage');
  if (normalized.includes('required photo')) inferred.push('proof_objects');

  const modules = uniqueModules([...explicitModules, ...inferred]);
  return modules.length ? modules : ['unknown'];
}

function buildFeatureTask(module: SiteProofModule, id: string, dependsOn: string[]): TaskNode {
  const metadata: Record<SiteProofModule, { title: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
    jobs: { title: 'Implement job changes', description: 'Update job behavior using shared domain primitives.', risk: 'medium' },
    workflow_templates: { title: 'Model workflow changes as template data', description: 'Represent trade-specific behavior through reusable workflow templates first.', risk: 'medium' },
    proof_objects: { title: 'Implement proof object changes', description: 'Update canonical proof behavior after schema assumptions are confirmed.', risk: 'high' },
    media_capture: { title: 'Implement media capture changes', description: 'Update media capture behavior while preserving durable proof data.', risk: 'medium' },
    voice_notes: { title: 'Implement voice note changes', description: 'Update voice-note handling and extracted metadata.', risk: 'medium' },
    timeline: { title: 'Polish timeline playback', description: 'Improve chronological proof review using shared timeline events.', risk: 'medium' },
    offline_storage: { title: 'Stabilize offline storage', description: 'Ensure local persistence is durable before dependent sync behavior.', risk: 'high' },
    sync_queue: { title: 'Implement sync queue changes', description: 'Add sync behavior after local durability and IDs are stable.', risk: 'high' },
    export_engine: { title: 'Polish export/report generation', description: 'Improve export output after proof data contracts are stable.', risk: 'medium' },
    ai_summaries: { title: 'Implement AI summary support', description: 'Add internal AI assistance without increasing field-user workflow complexity.', risk: 'medium' },
    missing_proof_detection: { title: 'Add missing-proof detection rules', description: 'Detect missing required proof before downstream review/export.', risk: 'medium' },
    customer_packets: { title: 'Implement customer packet changes', description: 'Update customer-facing packet assembly.', risk: 'medium' },
    inspection_packets: { title: 'Implement inspection packet changes', description: 'Update inspection-oriented packet assembly.', risk: 'medium' },
    settings: { title: 'Implement settings changes', description: 'Update internal configuration behavior.', risk: 'low' },
    ui_shell: { title: 'Implement UI shell changes', description: 'Update user-facing navigation or screen behavior after domain decisions.', risk: 'medium' },
    testing: { title: 'Expand requested test coverage', description: 'Add requested tests for the affected behavior.', risk: 'low' },
    unknown: { title: 'Clarify requested work', description: 'Review the request before implementation because no known module was inferred.', risk: 'medium' },
  };

  const info = metadata[module];
  return {
    id,
    title: info.title,
    description: info.description,
    affectedModules: [module],
    executionMode: dependsOn.length ? 'can_run_parallel' : 'requires_review',
    dependsOn,
    canRunWith: [],
    blocks: [],
    estimatedRisk: info.risk,
    reason: dependsOn.length ? 'Can proceed after foundation work is complete.' : 'No blocking dependency inferred.',
  };
}

function createInitialTasks(affectedModules: SiteProofModule[]): TaskNode[] {
  const tasks: TaskNode[] = [];
  const needsSchemaReview = affectedModules.some((module) => schemaSensitiveModules.includes(module));
  const hasUi = affectedModules.includes('ui_shell');
  const needsFoundation = needsSchemaReview || hasUi;

  if (needsFoundation) {
    tasks.push({
      id: 'task-001',
      title: `Review shared schema foundation (${schemaModuleNames.join(', ')})`,
      description: 'Confirm shared data primitives before feature work begins.',
      affectedModules: uniqueModules(affectedModules.filter((module) => schemaSensitiveModules.includes(module))),
      executionMode: 'must_run_first',
      dependsOn: [],
      canRunWith: [],
      blocks: [],
      estimatedRisk: 'high',
      reason: 'Domain and shared-data decisions must precede UI, export, and sync work.',
    });
  }

  const implementationModules = affectedModules.filter((module) => {
    if (module === 'testing' || module === 'unknown') return false;
    if (
      module === 'proof_objects'
      && affectedModules.some((candidate) => ['export_engine', 'timeline', 'missing_proof_detection'].includes(candidate))
    ) {
      return false;
    }
    return true;
  });
  implementationModules.forEach((module, index) => {
    tasks.push(buildFeatureTask(module, `task-${String(tasks.length + 1).padStart(3, '0')}`, needsFoundation ? ['task-001'] : []));
  });

  if (!implementationModules.length) {
    tasks.push(buildFeatureTask('unknown', `task-${String(tasks.length + 1).padStart(3, '0')}`, []));
  }

  return tasks;
}

function inferDependencies(tasks: TaskNode[], affectedModules: SiteProofModule[]): TaskDependency[] {
  const dependencies: TaskDependency[] = [];
  const foundation = tasks.find((task) => task.executionMode === 'must_run_first');

  if (foundation) {
    for (const task of tasks.filter((task) => task.id !== foundation.id)) {
      dependencies.push({
        fromTaskId: foundation.id,
        toTaskId: task.id,
        dependencyType: task.affectedModules.includes('export_engine')
          ? 'export_depends_on_proof_data'
          : task.affectedModules.includes('sync_queue')
            ? 'sync_depends_on_storage'
            : task.affectedModules.includes('ui_shell')
              ? 'ui_depends_on_domain'
              : 'schema_first',
        reason: task.affectedModules.includes('sync_queue')
          ? 'Sync depends on durable local storage and conflict-safe identifiers.'
          : task.affectedModules.includes('export_engine')
            ? 'Export depends on consistent proof, media, workflow, and timeline data.'
            : 'Shared schema must be confirmed before dependent feature work.',
      });
    }
  }

  const offlineTask = tasks.find((task) => task.affectedModules.includes('offline_storage'));
  const syncTask = tasks.find((task) => task.affectedModules.includes('sync_queue'));
  if (offlineTask && syncTask && offlineTask.id !== syncTask.id) {
    syncTask.dependsOn = uniqueStrings([...syncTask.dependsOn, offlineTask.id]);
    offlineTask.blocks = uniqueStrings([...offlineTask.blocks, syncTask.id]);
    dependencies.push({
      fromTaskId: offlineTask.id,
      toTaskId: syncTask.id,
      dependencyType: 'sync_depends_on_storage',
      reason: 'Offline persistence must be stable before cloud sync or backup recovery.',
    });
  }

  return dependencies;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function inferParallelGroups(tasks: TaskNode[]): ParallelTaskGroup[] {
  const featureTasks = tasks.filter((task) => task.executionMode === 'can_run_parallel');
  if (featureTasks.length < 2) return [];

  const sharedFoundation = featureTasks.every((task) => task.dependsOn.includes('task-001'));
  if (!sharedFoundation) return [];

  for (const task of featureTasks) {
    task.canRunWith = featureTasks.filter((candidate) => candidate.id !== task.id).map((candidate) => candidate.id);
  }

  return [{
    id: 'parallel-001',
    title: 'Feature branches after foundation review',
    tasks: featureTasks.map((task) => task.id),
    reasonParallelSafe: 'Each branch can proceed independently once shared schema and architecture assumptions are confirmed.',
    integrationRequiredAfter: true,
  }];
}

function addIntegrationAndTestTasks(tasks: TaskNode[], parallelGroups: ParallelTaskGroup[]): void {
  const featureTasks = tasks.filter((task) => task.executionMode === 'can_run_parallel');
  const requiresIntegration = parallelGroups.some((group) => group.integrationRequiredAfter);

  if (requiresIntegration) {
    const integrationId = `task-${String(tasks.length + 1).padStart(3, '0')}`;
    tasks.push({
      id: integrationId,
      title: 'Integrate parallel branches',
      description: 'Verify all parallel work uses the same shared primitives and assumptions.',
      affectedModules: uniqueModules(featureTasks.flatMap((task) => task.affectedModules)),
      executionMode: 'integration_step',
      dependsOn: featureTasks.map((task) => task.id),
      canRunWith: [],
      blocks: [],
      estimatedRisk: 'high',
      reason: 'Parallel branches touching shared data require explicit integration review.',
    });
    featureTasks.forEach((task) => task.blocks = uniqueStrings([...task.blocks, integrationId]));
  }

  const terminalDependency = tasks.at(-1)?.id;
  tasks.push({
    id: `task-${String(tasks.length + 1).padStart(3, '0')}`,
    title: 'Run verification suite',
    description: 'Run branch-level and final build/quality checks.',
    affectedModules: ['testing'],
    executionMode: 'test_step',
    dependsOn: terminalDependency ? [terminalDependency] : [],
    canRunWith: [],
    blocks: [],
    estimatedRisk: 'low',
    reason: 'Every branch requires verification and final integration checks.',
  });
}

function inferBlockedTasks(tasks: TaskNode[]): BlockedTask[] {
  return tasks
    .filter((task) => task.dependsOn.length > 0)
    .map((task) => ({
      taskId: task.id,
      blockedBy: task.dependsOn,
      unblockCondition: task.dependsOn.includes('task-001')
        ? 'Shared schema and architecture foundation reviewed.'
        : 'Upstream dependent task completed.',
    }));
}

function inferArchitectureDependencies(affectedModules: SiteProofModule[]): ArchitectureDependency[] {
  const dependencies: ArchitectureDependency[] = [];
  if (affectedModules.some((module) => ['export_engine', 'missing_proof_detection', 'timeline'].includes(module))) {
    dependencies.push({
      id: 'proof-object-schema',
      name: 'ProofObject schema stability',
      requiredBefore: affectedModules.filter((module) => ['export_engine', 'missing_proof_detection', 'timeline'].includes(module)),
      reason: 'Exports, missing-proof rules, and timeline playback depend on consistent proof data.',
    });
  }
  if (affectedModules.includes('sync_queue')) {
    dependencies.push({
      id: 'offline-storage-durability',
      name: 'Offline storage durability',
      requiredBefore: ['sync_queue'],
      reason: 'Sync behavior depends on durable local persistence and conflict-safe identifiers.',
    });
  }
  return dependencies;
}

function inferRiskFlags(request: string, affectedModules: SiteProofModule[], parallelGroups: ParallelTaskGroup[]): RiskFlag[] {
  const risks: RiskFlag[] = [];
  const normalized = request.toLowerCase();

  if (affectedModules.filter((module) => ['export_engine', 'timeline', 'missing_proof_detection', 'proof_objects'].includes(module)).length >= 2) {
    risks.push({
      id: 'risk-001',
      severity: 'high',
      category: 'schema_drift',
      description: 'Multiple branches may define conflicting proof-data assumptions.',
      mitigation: 'Confirm canonical proof schema before parallel implementation.',
    });
  }
  if (affectedModules.includes('sync_queue')) {
    risks.push({
      id: `risk-${String(risks.length + 1).padStart(3, '0')}`,
      severity: 'high',
      category: 'sync_conflict',
      description: 'Cloud sync or backup recovery can create duplicate or conflicting state.',
      mitigation: 'Stabilize offline persistence and conflict-safe IDs before sync behavior.',
    });
  }
  if (affectedModules.includes('offline_storage')) {
    risks.push({
      id: `risk-${String(risks.length + 1).padStart(3, '0')}`,
      severity: 'high',
      category: 'offline_regression',
      description: 'Changes may weaken offline survivability.',
      mitigation: 'Require durable local-write and interrupted-flow tests.',
    });
  }
  if (affectedModules.includes('ai_summaries')) {
    risks.push({
      id: `risk-${String(risks.length + 1).padStart(3, '0')}`,
      severity: 'medium',
      category: 'ai_overreach',
      description: 'AI work may leak complexity into the field-user workflow.',
      mitigation: 'Keep AI support invisible and additive to summaries, detection, or reporting only.',
    });
  }
  if (['crm', 'billing', 'dashboard', 'customer portal', 'team chat', 'enterprise analytics'].some((term) => normalized.includes(term))) {
    risks.push({
      id: `risk-${String(risks.length + 1).padStart(3, '0')}`,
      severity: 'high',
      category: 'scope_creep',
      description: 'Request introduces office-heavy or enterprise-heavy work before proof-of-work MVP stability.',
      mitigation: 'Defer unless directly required for the field-first MVP.',
    });
  }
  if (parallelGroups.length) {
    risks.push({
      id: `risk-${String(risks.length + 1).padStart(3, '0')}`,
      severity: 'medium',
      category: 'test_gap',
      description: 'Parallel work can appear complete without branch-level verification.',
      mitigation: 'Require branch tests plus final integration verification.',
    });
  }
  return risks;
}

function inferRealGoal(request: string, affectedModules: SiteProofModule[]): string {
  if (affectedModules.includes('export_engine') && affectedModules.includes('missing_proof_detection') && affectedModules.includes('timeline')) {
    return 'Improve proof review, reporting quality, and job documentation confidence without breaking shared proof data models.';
  }
  if (affectedModules.includes('sync_queue')) {
    return 'Improve survivable cloud recovery while preserving offline-first data integrity.';
  }
  if (affectedModules.includes('ai_summaries')) {
    return 'Add useful AI assistance without making the field workflow more complex.';
  }
  if (affectedModules.includes('workflow_templates')) {
    return 'Extend reusable workflow behavior without creating trade-specific code paths.';
  }
  return `Deliver the request safely while preserving SiteProof's field-first, offline-first, proof-first architecture: ${request.trim()}`;
}

function inferRequiredTests(tasks: TaskNode[], affectedModules: SiteProofModule[], parallelGroups: ParallelTaskGroup[]): RequiredTest[] {
  const tests: RequiredTest[] = [
    {
      id: 'test-001',
      title: 'Build check',
      testType: 'build',
      relatedTaskIds: [tasks.at(-1)?.id ?? ''],
      command: 'npm run build:check',
      successCriteria: 'Build completes without errors.',
    },
    {
      id: 'test-002',
      title: 'Quality check',
      testType: 'smoke',
      relatedTaskIds: [tasks.at(-1)?.id ?? ''],
      command: 'npm run quality:check',
      successCriteria: 'Quality checks pass.',
    },
  ];

  if (parallelGroups.length) {
    tests.push({
      id: 'test-003',
      title: 'Parallel branch verification',
      testType: 'integration',
      relatedTaskIds: parallelGroups.flatMap((group) => group.tasks),
      successCriteria: 'Each branch passes its focused checks before integration.',
    });
  }
  if (affectedModules.includes('sync_queue')) {
    tests.push({
      id: `test-${String(tests.length + 1).padStart(3, '0')}`,
      title: 'Offline-to-sync recovery',
      testType: 'integration',
      relatedTaskIds: tasks.filter((task) => task.affectedModules.some((module) => ['offline_storage', 'sync_queue'].includes(module))).map((task) => task.id),
      successCriteria: 'Offline writes persist and sync resumes without duplicates or lost state.',
    });
  }
  return tests;
}

function buildExecutionSequence(tasks: TaskNode[], parallelGroups: ParallelTaskGroup[]): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const foundation = tasks.find((task) => task.executionMode === 'must_run_first');
  const integration = tasks.find((task) => task.executionMode === 'integration_step');
  const verification = tasks.find((task) => task.executionMode === 'test_step');
  const parallel = parallelGroups[0];
  const standalone = tasks.filter((task) => !['must_run_first', 'integration_step', 'test_step'].includes(task.executionMode));

  if (foundation) {
    steps.push({
      order: steps.length + 1,
      title: 'Confirm shared foundation',
      taskIds: [foundation.id],
      executionType: 'single',
      successCriteria: ['Shared data assumptions are documented before dependent work.'],
    });
  }
  if (parallel) {
    steps.push({
      order: steps.length + 1,
      title: 'Run feature work in parallel',
      taskIds: parallel.tasks,
      executionType: 'parallel_group',
      successCriteria: ['Each branch compiles independently and follows shared schema assumptions.'],
    });
  } else if (standalone.length) {
    steps.push({
      order: steps.length + 1,
      title: 'Implement requested work',
      taskIds: standalone.map((task) => task.id),
      executionType: 'single',
      successCriteria: ['Requested behavior is implemented without bypassing canonical primitives.'],
    });
  }
  if (integration) {
    steps.push({
      order: steps.length + 1,
      title: 'Integrate parallel branches',
      taskIds: [integration.id],
      executionType: 'integration',
      successCriteria: ['Parallel branches share the same domain assumptions and data contracts.'],
    });
  }
  if (verification) {
    steps.push({
      order: steps.length + 1,
      title: 'Verify with tests',
      taskIds: [verification.id],
      executionType: 'test',
      successCriteria: ['Branch-level checks plus final build and quality checks pass.'],
    });
  }
  return steps;
}

function buildImplementationNotes(affectedModules: SiteProofModule[], riskFlags: RiskFlag[]): string[] {
  const notes = ['Keep proof data as the source of truth for export, timeline, and missing-proof behavior.'];
  if (affectedModules.includes('workflow_templates')) notes.push('Prefer workflow template data over trade-specific custom UI or code paths.');
  if (affectedModules.includes('ai_summaries')) notes.push('AI must stay invisible: support summaries, detection, and reporting without adding field-user complexity.');
  if (riskFlags.some((risk) => risk.category === 'scope_creep')) notes.push('Defer office-heavy features unless they are required for proof-of-work MVP stability.');
  return notes;
}

export function evaluateTaskGraph(input: EvaluateTaskGraphInput): TaskGraphReviewResult {
  const requestSummary = input.request.trim();
  const affectedModules = inferAffectedModules(requestSummary, input.affectedModules);
  const tasks = createInitialTasks(affectedModules);
  const dependencies = inferDependencies(tasks, affectedModules);
  const parallelGroups = inferParallelGroups(tasks);
  addIntegrationAndTestTasks(tasks, parallelGroups);
  const riskFlags = inferRiskFlags(requestSummary, affectedModules, parallelGroups);

  return {
    requestSummary,
    realGoal: inferRealGoal(requestSummary, affectedModules),
    affectedModules,
    architectureDependencies: inferArchitectureDependencies(affectedModules),
    tasks,
    dependencies,
    parallelGroups,
    blockedTasks: inferBlockedTasks(tasks),
    riskFlags,
    recommendedSequence: buildExecutionSequence(tasks, parallelGroups),
    requiredTests: inferRequiredTests(tasks, affectedModules, parallelGroups),
    implementationNotes: buildImplementationNotes(affectedModules, riskFlags),
  };
}
