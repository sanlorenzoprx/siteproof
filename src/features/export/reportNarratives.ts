import type { ExportAssembly } from './exportAssembler';
import type { ReportDefinition } from './reportDefinitions';
import type { SiteProofLanguage } from '../../types/settings';
import { AIService } from '../../services/aiService';

export interface LocalReportNarrative {
  executiveSummary: string;
  workCompleted: string;
  issuesOrExceptions: string;
  nextSteps: string;
  paymentReadinessStatement: string;
}

function countIssues(assembly: ExportAssembly): number {
  return assembly.proofBundles.filter((bundle) => (
    bundle.proof.metadata?.is_issue === true
    || bundle.legacyPhoto?.isIssue === true
    || bundle.legacyVoiceNote?.isIssue === true
    || bundle.legacyVoiceNote?.isChangeOrder === true
    || bundle.proof.user_labels.some((label) => ['issue', 'CHANGE_ORDER', 'change_order'].includes(label))
  )).length;
}

function completedStageCount(assembly: ExportAssembly): number {
  return assembly.stages.filter((stage) => stage.status === 'complete').length;
}

function openItems(assembly: ExportAssembly): string[] {
  return assembly.openRequiredItems?.length ? assembly.openRequiredItems : assembly.stages.flatMap((stage) => stage.missing_items ?? []);
}

function statusText(status: string, language: SiteProofLanguage): string {
  if (language === 'es') {
    if (status === 'COMPLETED') return 'está marcado como completado';
    if (status === 'INSPECTION') return 'está marcado como listo para inspección';
    return 'está documentado en progreso';
  }
  if (status === 'COMPLETED') return 'is marked complete';
  if (status === 'INSPECTION') return 'is marked ready for inspection';
  return 'is documented in progress';
}

function noOpenItems(language: SiteProofLanguage): string {
  return language === 'es' ? 'No hay elementos abiertos documentados.' : 'No open items documented.';
}

function notDocumented(language: SiteProofLanguage): string {
  return language === 'es' ? 'No documentado.' : 'Not documented.';
}

export function buildLocalReportNarrative(
  assembly: ExportAssembly,
  definition: ReportDefinition,
  language: SiteProofLanguage,
): LocalReportNarrative {
  const photoCount = assembly.photos.length;
  const noteCount = assembly.notes.length;
  const issues = countIssues(assembly);
  const open = openItems(assembly);
  const stageCount = assembly.stages.length;
  const completed = completedStageCount(assembly);
  const localSummary = AIService.generateLocalSummary(assembly.legacyJob, assembly.photos, assembly.notes, language);
  const executiveSummary = issues > 0
    ? language === 'es'
      ? `${assembly.legacyJob.customerName} ${statusText(assembly.legacyJob.status, language)} con ${photoCount} fotos y ${noteCount} notas incluidas en este reporte. ${issues} elemento(s) requieren revisión por problema, excepción u orden de cambio candidata.`
      : `${assembly.legacyJob.customerName} ${statusText(assembly.legacyJob.status, language)} with ${photoCount} photo proof item(s) and ${noteCount} note(s) included in this report. ${issues} item(s) require review as issues, exceptions, or change-order candidates.`
    : localSummary || (
      language === 'es'
        ? `${assembly.legacyJob.customerName} ${statusText(assembly.legacyJob.status, language)} con ${photoCount} fotos y ${noteCount} notas incluidas en este reporte.`
        : `${assembly.legacyJob.customerName} ${statusText(assembly.legacyJob.status, language)} with ${photoCount} photos and ${noteCount} notes included in this report.`
    );

  const workCompleted = language === 'es'
    ? `${completed} de ${stageCount || 0} etapas del flujo están marcadas como completas. Este reporte incluye ${photoCount} pruebas fotográficas y ${noteCount} notas relacionadas.`
    : `${completed} of ${stageCount || 0} workflow stages are marked complete. This report includes ${photoCount} photo proof item(s) and ${noteCount} related note(s).`;

  const issuesOrExceptions = issues > 0
    ? language === 'es'
      ? `${issues} elemento(s) fueron marcados como problema, excepción u orden de cambio candidata. Revise la evidencia relacionada antes de aprobación o cobro.`
      : `${issues} item(s) were marked as issues, exceptions, or change-order candidates. Review the related evidence before approval or payment.`
    : language === 'es'
      ? 'No hay problemas u órdenes de cambio documentados en la selección de prueba de este reporte.'
      : 'No issues or change orders are documented in this report proof selection.';

  const nextSteps = open.length > 0
    ? language === 'es'
      ? `Elementos abiertos documentados: ${open.slice(0, 5).join('; ')}${open.length > 5 ? '; y más.' : '.'}`
      : `Open documented items: ${open.slice(0, 5).join('; ')}${open.length > 5 ? '; and more.' : '.'}`
    : noOpenItems(language);

  const paymentReadinessStatement = definition.audience === 'payment'
    ? open.length > 0
      ? language === 'es'
        ? 'El reporte contiene elementos abiertos documentados. No se afirma que el pago esté aprobado.'
        : 'This report contains documented open items. It does not state that payment is approved.'
      : language === 'es'
        ? 'No hay elementos abiertos documentados en este reporte. La aprobación de pago no está documentada a menos que exista firma o instrucción separada.'
        : 'No open items are documented in this report. Payment approval is not documented unless a separate signature or instruction exists.'
    : notDocumented(language);

  return {
    executiveSummary,
    workCompleted,
    issuesOrExceptions,
    nextSteps,
    paymentReadinessStatement,
  };
}
