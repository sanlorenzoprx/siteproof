import { evaluateTaskGraph, type TaskGraphReviewResult } from './taskGraphReview';

export interface RequestIntent {
  kind: 'feature' | 'bug_fix' | 'refactor' | 'release_review';
  reason: string;
}

export interface ArchitectureContextReview {
  rules: string[];
}

export interface ImplementationPlan {
  firstStep: string;
  taskGraphRequired: true;
}

export interface SiteProofAiImprovementReview {
  intent: RequestIntent;
  architectureContext: ArchitectureContextReview;
  taskGraph: TaskGraphReviewResult;
  implementationPlan: ImplementationPlan;
}

export function classifyRequestIntent(request: string): RequestIntent {
  const normalized = request.toLowerCase();
  if (normalized.includes('refactor')) return { kind: 'refactor', reason: 'Request explicitly asks for refactoring.' };
  if (normalized.includes('release')) return { kind: 'release_review', reason: 'Request mentions release review.' };
  if (['fix', 'bug', 'broken', 'regression'].some((term) => normalized.includes(term))) {
    return { kind: 'bug_fix', reason: 'Request includes bug-fix language.' };
  }
  return { kind: 'feature', reason: 'Defaulted to feature planning.' };
}

export function reviewArchitectureContext(_request: string): ArchitectureContextReview {
  return {
    rules: [
      'field-first',
      'offline-first',
      'proof-first',
      'speed-first',
      'canonical primitives before feature-specific code',
    ],
  };
}

export function createImplementationPlan(taskGraph: TaskGraphReviewResult): ImplementationPlan {
  return {
    firstStep: taskGraph.recommendedSequence[0]?.title ?? 'Clarify request before implementation',
    taskGraphRequired: true,
  };
}

export function runSiteProofAiImprovementReview(request: string): SiteProofAiImprovementReview {
  const intent = classifyRequestIntent(request);
  const architectureContext = reviewArchitectureContext(request);
  const taskGraph = evaluateTaskGraph({
    request,
    knownArchitecture: architectureContext.rules,
    mode: 'planning',
  });

  return {
    intent,
    architectureContext,
    taskGraph,
    implementationPlan: createImplementationPlan(taskGraph),
  };
}

