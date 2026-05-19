import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { SiteProofDataService } from './siteProofDataService';
import { AIService } from './aiService';
import { Job, JobPhoto, VoiceNote } from '../types';
import { TemplateCatalogService } from './templateCatalogService';
import { format } from 'date-fns';
import { ExportPacketService } from '../features/export/exportPacketService';
import type { ExportAssembly } from '../features/export/exportAssembler';
import { buildExportFileName, packetTitle } from '../features/export/exportFileNaming';
import { ProofIntegrityService, ExportIntegrityManifest } from './proofIntegrityService';
import { SITEPROOF_BRAND } from '../config/brand';
import { getLicenseReportFooter, getCustomerProofPacketIntro } from './export/offerBranding';
import type { SiteProofLanguage } from '../types/settings';
import { translate } from '../config/i18n';
import { enUS, es } from 'date-fns/locale';
import { APP_REPORT_TYPES, SiteProofReportType } from '../features/export/reportTypes';
import { getReportDefinition } from '../features/export/reportDefinitions';
import type { ReportDefinition } from '../features/export/reportDefinitions';
import type { ReportFilterOptions } from '../features/export/reportFilters';
import { addAppReportFooters, renderAppReportIntoDocument, renderAppReportPdf } from '../features/export/pdfRenderers/reportPdfRenderers';
import { buildLocalReportNarrative } from '../features/export/reportNarratives';

export enum ReportMode {
  STANDARD = 'STANDARD',
  CUSTOMER = 'CUSTOMER',
  INSPECTOR = 'INSPECTOR',
  DISPUTE = 'DISPUTE',
  WARRANTY = 'WARRANTY',
  HANDOFF = 'HANDOFF'
}

export class PdfService {
  static async generateAppReport(
    job: Job,
    reportType: SiteProofReportType,
    signatureDataUrl?: string,
    exportLanguage: SiteProofLanguage = 'en',
    options: ReportFilterOptions = {},
  ): Promise<void> {
    const { ExportAssembler } = await import('../features/export/exportAssembler');
    const reportDefinition = getReportDefinition(reportType);
    const assembly = await ExportAssembler.assembleForReport(job.id, reportType, exportLanguage, options);
    if (!assembly) throw new Error('Could not assemble report data for this job.');

    const business = await SiteProofDataService.getBusinessProfile();
    const user = await SiteProofDataService.getUserProfile();
    const integrityManifest = reportDefinition.includeIntegrityManifest
      ? await ProofIntegrityService.buildExportManifest({
        jobId: assembly.runtimeJob.job_id,
        proofs: assembly.proofs,
        mediaAssets: assembly.mediaAssets,
        timelineEvents: assembly.timelineEvents,
      })
      : null;

    const doc = renderAppReportPdf({
      assembly,
      definition: reportDefinition,
      language: exportLanguage,
      business,
      user,
      integrityManifest,
      signatureDataUrl,
      narrative: buildLocalReportNarrative(assembly, reportDefinition, exportLanguage),
    });

    const fileName = buildExportFileName(assembly.legacyJob, reportType, exportLanguage);
    if (integrityManifest) {
      await ProofIntegrityService.recordExportCustody(assembly.runtimeJob.job_id, assembly.selectedProofIds, integrityManifest.manifestHash).catch((error) => {
        console.warn('Export manifest custody event failed:', error);
      });
    }
    await ExportPacketService.recordGeneratedPacketFromAssembly(assembly, reportType, integrityManifest ?? undefined, exportLanguage).catch((error) => {
      console.warn('App report packet record failed:', error);
    });
    doc.save(fileName);
  }

  static async generateAllAppReports(
    job: Job,
    exportLanguage: SiteProofLanguage = 'en',
    options: ReportFilterOptions = {},
  ): Promise<void> {
    const { ExportAssembler } = await import('../features/export/exportAssembler');
    const business = await SiteProofDataService.getBusinessProfile();
    const user = await SiteProofDataService.getUserProfile();
    const doc = new jsPDF({ compress: true });
    const assemblies: ExportAssembly[] = [];
    const includedProofIds = new Set<string>();

    for (const reportType of APP_REPORT_TYPES) {
      const definition = getReportDefinition(reportType);
      const assembly = await ExportAssembler.assembleForReport(job.id, reportType, exportLanguage, options);
      if (!assembly) continue;
      assemblies.push(assembly);
      assembly.selectedProofIds.forEach((proofId) => includedProofIds.add(proofId));

      const integrityManifest = definition.includeIntegrityManifest
        ? await ProofIntegrityService.buildExportManifest({
          jobId: assembly.runtimeJob.job_id,
          proofs: assembly.proofs,
          mediaAssets: assembly.mediaAssets,
          timelineEvents: assembly.timelineEvents,
        })
        : null;

      renderAppReportIntoDocument(doc, {
        assembly,
        definition,
        language: exportLanguage,
        business,
        user,
        integrityManifest,
        signatureDataUrl: undefined,
        narrative: buildLocalReportNarrative(assembly, definition, exportLanguage),
      }, assemblies.length > 1);
    }

    if (!assemblies.length) throw new Error('Could not assemble app reports for this job.');

    const allReportsDefinition = getReportDefinition(SiteProofReportType.DAILY_JOB_PROOF);
    addAppReportFooters(doc, {
      assembly: assemblies[0],
      definition: allReportsDefinition,
      language: exportLanguage,
      business,
      user,
      integrityManifest: null,
      signatureDataUrl: undefined,
      narrative: buildLocalReportNarrative(assemblies[0], allReportsDefinition, exportLanguage),
    });

    const unionProofIds = [...includedProofIds];
    const unionProofSet = new Set(unionProofIds);
    const firstAssembly = assemblies[0];
    const allReportsManifest = await ProofIntegrityService.buildExportManifest({
      jobId: firstAssembly.runtimeJob.job_id,
      proofs: assemblies.flatMap((assembly) => assembly.proofs).filter((proof, index, proofs) => (
        unionProofSet.has(proof.proof_id) && proofs.findIndex((item) => item.proof_id === proof.proof_id) === index
      )),
      mediaAssets: assemblies.flatMap((assembly) => assembly.mediaAssets).filter((asset, index, assets) => (
        unionProofSet.has(asset.proof_id) && assets.findIndex((item) => item.media_id === asset.media_id) === index
      )),
      timelineEvents: assemblies.flatMap((assembly) => assembly.timelineEvents).filter((event, index, events) => (
        event.related_proof_ids.some((proofId) => unionProofSet.has(proofId))
        && events.findIndex((item) => item.event_id === event.event_id) === index
      )),
    }).catch((error) => {
      console.warn('All reports manifest failed:', error);
      return null;
    });

    if (allReportsManifest) {
      await ProofIntegrityService.recordExportCustody(firstAssembly.runtimeJob.job_id, unionProofIds, allReportsManifest.manifestHash).catch((error) => {
        console.warn('All reports custody event failed:', error);
      });
    }

    await ExportPacketService.recordGeneratedAllReportsPacket(
      firstAssembly,
      unionProofIds,
      ['all_reports', ...APP_REPORT_TYPES.map((reportType) => `report:${reportType}`)],
      allReportsManifest ?? undefined,
      exportLanguage,
    ).catch((error) => {
      console.warn('All reports packet record failed:', error);
    });

    doc.save(buildExportFileName(firstAssembly.legacyJob, SiteProofReportType.ALL_REPORTS, exportLanguage));
  }

  static async generateReport(
    job: Job,
    photos: JobPhoto[],
    voiceNotes: VoiceNote[],
    mode: ReportMode = ReportMode.STANDARD,
    signatureDataUrl?: string,
    exportLanguage: SiteProofLanguage = 'en',
    preparedAssembly?: ExportAssembly | null,
    reportDefinition?: ReportDefinition,
    reportType?: SiteProofReportType,
  ): Promise<void> {
    let canonicalAssembly: ExportAssembly | null = preparedAssembly ?? null;
    let integrityManifest: ExportIntegrityManifest | null = null;
    try {
      const { ExportAssembler } = await import('../features/export/exportAssembler');
      canonicalAssembly = canonicalAssembly ?? await ExportAssembler.assemble(job.id, mode, exportLanguage);
      if (canonicalAssembly) {
        job = canonicalAssembly.legacyJob;
        photos = canonicalAssembly.photos;
        voiceNotes = canonicalAssembly.notes;
        integrityManifest = await ProofIntegrityService.buildExportManifest({
          jobId: canonicalAssembly.runtimeJob.job_id,
          proofs: canonicalAssembly.proofs,
          mediaAssets: canonicalAssembly.mediaAssets,
          timelineEvents: canonicalAssembly.timelineEvents,
        });
      }
    } catch (error) {
      console.warn('Export v2 assembly failed; falling back to legacy export inputs.', error);
    }

    const business = await SiteProofDataService.getBusinessProfile();
    const user = await SiteProofDataService.getUserProfile();

    const doc = new jsPDF({ compress: true });
    const margin = 22;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    reportDefinition = reportDefinition ?? this.legacyDefinitionForMode(mode);
    const isCustomer = reportDefinition.audience === 'customer';
    const isDispute = reportDefinition.audience === 'dispute_support';
    const isHandoff = reportDefinition.audience === 'payment';
    const isInspector = reportDefinition.audience === 'inspector';
    const includeChecklist = reportDefinition.includeChecklist;
    const includeTimeline = reportDefinition.includeTimeline;
    const includeSignature = reportDefinition.includeSignature;
    const includeIntegrityManifest = reportDefinition.includeIntegrityManifest;
    const reportKind = reportType ?? mode;
    const tr = (key: string) => translate(exportLanguage, key);
    const dateLocale = exportLanguage === 'es' ? es : enUS;
    const fmt = (value: number | Date, pattern: string) => format(value, pattern, { locale: dateLocale });
    const primaryColor: [number, number, number] = isDispute ? [220, 38, 38] : isCustomer ? [37, 99, 235] : [15, 23, 42];

    // Filter content based on mode
    const filteredPhotos = photos.filter(p => {
      if (isCustomer) return !p.isIssue || p.issueType === 'CHANGE_ORDER';
      if (isDispute) return p.isIssue;
      return true;
    });

    const filteredVoiceNotes = voiceNotes.filter(v => {
      if (isCustomer) return !v.isIssue;
      if (isDispute) return v.isIssue;
      return true;
    });

    // ====================== HEADER ======================
    const addHeader = () => {
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 52, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text((business?.companyName || SITEPROOF_BRAND.appName).toUpperCase(), margin, 24);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(business?.tagline || SITEPROOF_BRAND.tagline, margin, 30);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const addressParts = [
        business?.address,
        business?.city,
        business?.state,
        business?.zipCode,
        business?.country
      ].filter(Boolean);
      const companyAddress = addressParts.join(', ');
      doc.text(companyAddress, margin, 38);

      const contactLine = [
        business?.phone,
        business?.email,
        business?.website
      ].filter(Boolean).join('  |  ');
      doc.text(contactLine, margin, 44);

      // Right side
      doc.setFontSize(10);
      doc.text(fmt(job.createdAt || Date.now(), 'PP'), pageWidth - margin, 20, { align: 'right' });
      doc.text(`${tr('reports.technician')}: ${job.technicianName || user?.fullName || tr('reports.fieldTeam')}`, pageWidth - margin, 30, { align: 'right' });
      if (business?.licenseNumber) {
        doc.text(`${tr('reports.licenseAbbrev')}${business.licenseNumber}`, pageWidth - margin, 40, { align: 'right' });
      }
    };

    // ====================== FOOTER ======================
    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        getLicenseReportFooter(exportLanguage),
        pageWidth / 2,
        288,
        { align: 'center' }
      );
      doc.text(`${tr('reports.page')} ${pageNum} ${tr('reports.of')} ${totalPages}`, pageWidth - margin, 288, { align: 'right' });
    };

    addHeader();
    y = 70;

    // ====================== COVER PAGE ======================
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(tr('reports.reportTitle').toUpperCase(), margin, y);
    y += 18;

    doc.setFontSize(13);
    doc.text(`${job.customerName}`, margin, y);
    y += 8;
    doc.text(`${job.address}`, margin, y);
    y += 8;
    doc.text(`${job.jobType} • ${fmt(job.createdAt, 'PP')}`, margin, y);
    y += 16;

    doc.setFillColor(isInspector ? 239 : 240, isInspector ? 246 : 253, isInspector ? 255 : 244);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 4, 4, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isInspector ? 29 : 22, isInspector ? 78 : 101, isInspector ? 216 : 52);
      doc.text(isInspector ? tr('reports.inspectionPacket').toUpperCase() : isCustomer ? getCustomerProofPacketIntro(exportLanguage).summary : tr('reports.internalRecord').toUpperCase(), margin + 7, y + 11);
    doc.setTextColor(15, 23, 42);
    y += 28;

    if (canonicalAssembly) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${tr('reports.exportSource')}: ${canonicalAssembly.proofs.length} ${tr('reports.proofObjects')} • ${canonicalAssembly.mediaAssets.length} ${tr('reports.mediaAssets')} • ${canonicalAssembly.timelineEvents.length} ${tr('reports.timelineEvents')}`, margin, y);
      y += 10;
      doc.setTextColor(15, 23, 42);
    }

    // ====================== SUMMARY SECTION ======================
    // Deterministic Local Summary
    const localSummary = AIService.generateLocalSummary(job, filteredPhotos, filteredVoiceNotes, exportLanguage);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(tr('reports.subtitle').toUpperCase(), margin, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const localLines = doc.splitTextToSize(localSummary, pageWidth - margin * 2);
    doc.text(localLines, margin, y);
    y += localLines.length * 5.5 + 12;

    if (!reportType) {
      // AI Enhanced Intelligence (Async/Wait)
      try {
        const aiSummary = await AIService.summarizeJob(job, filteredPhotos, filteredVoiceNotes, exportLanguage);
        // Only show AI summary if it adds value (different from local)
        if (aiSummary && aiSummary !== localSummary) {
          doc.setFillColor(248, 250, 252);
          const aiLines = doc.splitTextToSize(aiSummary, pageWidth - margin * 2 - 16);
          const blockHeight = aiLines.length * 5 + 15;
          
          doc.rect(margin, y, pageWidth - margin * 2, blockHeight, 'F');
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text(tr('reports.aiSiteIntelligence').toUpperCase(), margin + 8, y + 8);
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.text(aiLines, margin + 8, y + 15);
          
          y += blockHeight + 15;
          doc.setTextColor(15, 23, 42); // Reset color
        }
      } catch (err) {
        console.warn("AI Summerization failed, continuing with local summary only.");
        y += 10;
      }
    }

    // Key Stats Bar
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - margin * 2, 42, 'F');
    y += 18;

    const stats = [
      [tr('reports.photoEvidence'), filteredPhotos.length.toString()],
      [tr('reports.voiceNotes'), filteredVoiceNotes.length.toString()],
      [tr('reports.export'), isInspector ? tr('reports.inspector') : isCustomer ? tr('reports.customerMode') : tr('reports.internal')],
      [tr('reports.status'), job.status]
    ];

    const statWidth = (pageWidth - margin * 2) / stats.length;
    stats.forEach((stat, i) => {
      const x = margin + i * statWidth;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(stat[0], x + 8, y - 4);
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(stat[1], x + 8, y + 12);
    });

    // ====================== INTERNAL SECTIONS ======================
    // Checklist (for templated jobs)
    if (includeChecklist && job.templateId) {
      const template = TemplateCatalogService.getTemplate(job.templateId, exportLanguage);
      doc.addPage();
      addHeader();
      y = 65;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${template.display_name.toUpperCase()} ${tr('reports.checklist').toUpperCase()}`, margin, y);
      y += 20;

      template.stages
        .filter(stage => stage.visible_in_field_mode)
        .forEach(stage => {
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.text(stage.display_name, margin, y);
          y += 10;

          (stage.proof_requirements ?? []).forEach(requirement => {
            const hasProof = filteredPhotos.some(p => p.requirementId === requirement.requirement_id || p.category === requirement.display_name);
            const required = requirement.priority === 'required' || requirement.priority === 'conditional';
            doc.setFontSize(10);

            if (isInspector && !hasProof && required) {
              doc.setTextColor(220, 38, 38);
              doc.setFont('helvetica', 'bold');
              doc.text(`${tr('reports.missing').toUpperCase()}: ${requirement.display_name}`, margin + 6, y);
            } else {
              doc.setTextColor(isCustomer ? 37 : 15, isCustomer ? 99 : 23, isCustomer ? 235 : 42);
              doc.setFont('helvetica', hasProof ? 'bold' : 'normal');
              doc.text(`${hasProof ? tr('reports.done').toUpperCase() : tr('reports.open').toUpperCase()}: ${requirement.display_name}`, margin + 6, y);
            }
            y += 8;
            if (y > 270) { doc.addPage(); addHeader(); y = 65; }
          });
          y += 6;
        });
      y += 20;
    }

    // Voice Notes
    if (filteredVoiceNotes.length > 0) {
      doc.addPage();
      addHeader();
      y = 65;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(tr('reports.voiceNotes').toUpperCase(), margin, y);
      y += 15;
      filteredVoiceNotes.forEach(note => {
        if (y > 240) {
          doc.addPage();
          addHeader();
          y = 65;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${note.category} — ${fmt(note.timestamp || Date.now(), 'p')}`, margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const summary = note.summary ? `${tr('reports.summary')}: ${note.summary}` : '';
        const transcript = `${tr('reports.transcript')}: ${note.transcribedText}`;
        const insights = [
          note.language ? `${tr('reports.language')}: ${note.language.toUpperCase()}` : '',
          note.materialMentions?.length ? `${tr('reports.materials')}: ${note.materialMentions.join(', ')}` : '',
          note.issueMentions?.length ? `${tr('reports.issues')}: ${note.issueMentions.join(', ')}` : '',
          note.customerRequests?.length ? `${tr('reports.customerRequests')}: ${note.customerRequests.join('; ')}` : '',
          note.changeOrderCandidates?.length ? `${tr('reports.changeOrders')}: ${note.changeOrderCandidates.join('; ')}` : '',
        ].filter(Boolean).join('\n');
        const lines = doc.splitTextToSize([summary, transcript, insights].filter(Boolean).join('\n'), pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 5.5 + 12;
      });
    }

    // Photo Evidence (Best-in-Class Grid)
    if (filteredPhotos.length > 0) {
      doc.addPage();
      addHeader();
      y = 65;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(tr('reports.photoEvidence').toUpperCase(), margin, y);
      y += 18;

      const colWidth = (pageWidth - margin * 3) / 2;
      filteredPhotos.forEach((photo, i) => {
        const col = i % 2;
        const x = margin + col * (colWidth + margin);

        if (y > 220) {
          doc.addPage();
          addHeader();
          y = 65;
        } else if (i > 0 && i % 2 === 0) {
          y += 95;
        }

        try {
          doc.addImage(photo.dataUrl, 'JPEG', x, y, colWidth, 62);
          
          // Watermark
          doc.setFillColor(0, 0, 0, 0.6);
          doc.rect(x, y + 48, colWidth, 14, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(`${SITEPROOF_BRAND.appName} • ${tr('reports.gpsVerified')} • ` + fmt(photo.timestamp, 'p'), x + 8, y + 57);

          doc.setFillColor(248, 250, 252);
          doc.rect(x, y + 62, colWidth, 22, 'F');

          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(photo.category.toUpperCase(), x + 6, y + 70);
          doc.text(fmt(photo.timestamp, 'MMM d, p'), x + 6, y + 78);

          if (photo.latitude) {
            doc.text(
              `${photo.latitude.toFixed(4)}, ${photo.longitude?.toFixed(4)}`,
              x + colWidth - 6,
              y + 78,
              { align: 'right' }
            );
          }
        } catch (e) {
          doc.text(tr('reports.photoUnavailable'), x + 10, y + 30);
        }
      });
    }

    // Timeline Summary
    if (includeTimeline) {
    doc.addPage();
    addHeader();
    y = 65;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(tr('reports.jobTimeline').toUpperCase(), margin, y);
    y += 14;

    const timelineRows = [
      { time: job.createdAt, label: tr('reports.jobCreated'), detail: job.jobType },
      ...filteredPhotos.map((photo) => ({ time: photo.timestamp, label: tr('reports.photoCaptured'), detail: photo.category })),
      ...filteredVoiceNotes.map((note) => ({ time: note.timestamp, label: tr('reports.voiceNoteCaptured'), detail: note.category })),
    ].sort((a, b) => a.time - b.time);

    timelineRows.slice(0, 48).forEach((row) => {
      if (y > 265) { doc.addPage(); addHeader(); y = 65; }
      doc.setFillColor(248, 250, 252);
      doc.circle(margin + 3, y - 1, 2.5, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(fmt(row.time || Date.now(), 'MMM d, h:mm a'), margin + 12, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${row.label} — ${row.detail}`, margin + 58, y);
      y += 8;
    });
    }

    // Proof Integrity Manifest
    if (includeIntegrityManifest && integrityManifest) {
      doc.addPage();
      addHeader();
      y = 65;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(tr('reports.proofIntegrityManifest').toUpperCase(), margin, y);
      y += 12;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${tr('reports.manifestId')}: ${integrityManifest.manifestId}`, margin, y); y += 6;
      doc.text(`${tr('reports.algorithm')}: ${integrityManifest.algorithm}`, margin, y); y += 6;
      doc.text(`${tr('reports.manifestHash')}: ${integrityManifest.manifestHash}`, margin, y); y += 6;
      doc.text(`${tr('reports.signedManifestHash')}: ${integrityManifest.signedManifestHash}`, margin, y); y += 10;
      doc.text(`${tr('reports.proofObjects')}: ${integrityManifest.proofCount} • ${tr('reports.mediaAssets')}: ${integrityManifest.mediaCount} • ${tr('reports.timelineEvents')}: ${integrityManifest.timelineEventCount}`, margin, y);
      y += 12;

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(tr('reports.proofId'), margin + 3, y + 7);
      doc.text(tr('reports.status'), margin + 58, y + 7);
      doc.text(tr('reports.hashPrefix'), margin + 86, y + 7);
      doc.text(tr('reports.title'), margin + 128, y + 7);
      y += 16;

      doc.setFont('helvetica', 'normal');
      integrityManifest.proofHashes.slice(0, 42).forEach((item) => {
        if (y > 270) { doc.addPage(); addHeader(); y = 65; }
        doc.setFontSize(7);
        doc.setTextColor(item.status === 'verified' ? 22 : 220, item.status === 'verified' ? 101 : 38, item.status === 'verified' ? 52 : 38);
        doc.text(item.proofId.slice(0, 18), margin + 3, y);
        doc.text(item.status.toUpperCase(), margin + 58, y);
        doc.setTextColor(15, 23, 42);
        doc.text((item.hash ?? 'NO HASH').slice(0, 24), margin + 86, y);
        doc.text(item.title.slice(0, 36), margin + 128, y);
        y += 6;
      });

      y += 8;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const manifestNote = tr('reports.manifestNote');
      doc.text(doc.splitTextToSize(manifestNote, pageWidth - margin * 2), margin, y);
    }

    // Final Page - Acknowledgement
    if (includeSignature) {
    doc.addPage();
    addHeader();
    y = 80;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(tr('reports.acceptanceSignature').toUpperCase(), margin, y);
    y += 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(tr('reports.certification'), margin, y);
    y += 40;

    if (signatureDataUrl) {
      try {
        doc.addImage(signatureDataUrl, 'PNG', margin, y, 140, 55);
      } catch (e) {}
    } else {
      doc.rect(margin, y, 160, 45);
    }
    
    doc.text(tr('reports.customerInspectorSignature'), margin + 5, y + 55);
    doc.text(`${tr('reports.date')}: ${fmt(Date.now(), 'PP')}`, margin + 110, y + 55, { align: 'right' });

    // QR Code
    doc.setFontSize(10);
    doc.text(tr('reports.scanVerify'), pageWidth - margin - 70, y + 25);
    await this.addRealQRCode(doc, pageWidth - 80, y - 10, job.id);
    }

    // Apply headers + footers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addHeader();
      addFooter(i, totalPages);
    }

    const fileName = buildExportFileName(job, reportKind, exportLanguage);
    if (canonicalAssembly) {
      if (integrityManifest) {
        await ProofIntegrityService.recordExportCustody(canonicalAssembly.runtimeJob.job_id, canonicalAssembly.selectedProofIds, integrityManifest.manifestHash).catch((error) => {
          console.warn('Export manifest custody event failed:', error);
        });
      }
      await ExportPacketService.recordGeneratedPacketFromAssembly(canonicalAssembly, mode, integrityManifest ?? undefined, exportLanguage).catch((error) => {
        console.warn('Export v2 packet record failed:', error);
      });
    } else {
      await ExportPacketService.recordGeneratedPacket(job, mode, filteredPhotos, filteredVoiceNotes, exportLanguage).catch((error) => {
        console.warn('Export packet record failed:', error);
      });
    }
    doc.save(fileName);
  }

  private static definitionToLegacyMode(definition: ReportDefinition): ReportMode {
    if (definition.audience === 'customer' || definition.audience === 'payment') return ReportMode.CUSTOMER;
    if (definition.audience === 'inspector') return ReportMode.INSPECTOR;
    if (definition.audience === 'dispute_support') return ReportMode.DISPUTE;
    return ReportMode.STANDARD;
  }

  private static legacyDefinitionForMode(mode: ReportMode): ReportDefinition {
    switch (mode) {
      case ReportMode.CUSTOMER:
        return getReportDefinition(SiteProofReportType.CUSTOMER_COMPLETION);
      case ReportMode.INSPECTOR:
        return getReportDefinition(SiteProofReportType.INSPECTION_READINESS);
      case ReportMode.DISPUTE:
        return getReportDefinition(SiteProofReportType.CHANGE_ORDER_EVIDENCE);
      case ReportMode.HANDOFF:
        return getReportDefinition(SiteProofReportType.PAYMENT_FINAL_HANDOFF);
      default:
        return getReportDefinition(SiteProofReportType.DAILY_JOB_PROOF);
    }
  }

  private static async addRealQRCode(doc: jsPDF, x: number, y: number, jobId: string) {
    try {
      const url = `https://siteproof.app/verify/${jobId}`; 
      const qrDataUrl = await QRCode.toDataURL(url, { 
        width: 220, 
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      });
      doc.addImage(qrDataUrl, 'PNG', x, y, 58, 58);
    } catch (e) {
      doc.setFillColor(15, 23, 42);
      doc.rect(x, y, 58, 58, 'F');
    }
  }
}
