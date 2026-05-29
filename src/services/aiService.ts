import { Job, JobPhoto, VoiceNote } from '../types';
import { AiTaskQueueService } from './aiTaskQueueService';
import { SiteProofAiClient } from './siteProofAiClient';
import { translate } from '../config/i18n';
import type { SiteProofLanguage } from '../types/settings';

export class AIService {
  /**
   * Generates a professional business bio from a voice transcript.
   */
  static async generateBusinessBio(voiceTranscript: string, companyName: string): Promise<string> {
    try {
      return await SiteProofAiClient.generateBusinessBio(voiceTranscript, companyName);
    } catch (error) {
      console.error('Failed to generate bio:', error);
      await AiTaskQueueService.enqueue('business_bio', error).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Generates multiple tagline options based on company context and optional voice input.
   */
  static async generateTaglineOptions(companyName: string, voiceTranscript?: string): Promise<string[]> {
    try {
      return await SiteProofAiClient.generateTaglineOptions(companyName, voiceTranscript);
    } catch (error) {
      console.error('Failed to generate taglines:', error);
      await AiTaskQueueService.enqueue('taglines', error).catch(() => undefined);
      return [];
    }
  }

  /**
   * Transcribes audio through the backend AI API boundary.
   */
  static async transcribeAudio(audioBase64: string, language?: SiteProofLanguage, mimeType = 'audio/webm'): Promise<string> {
    if (!audioBase64 || audioBase64.length < 10) {
      console.warn('AIService: No audio data provided for transcription.');
      return '';
    }

    try {
      return await SiteProofAiClient.transcribeAudio(audioBase64, mimeType, language);
    } catch (error) {
      console.error('Transcription error:', error);
      await AiTaskQueueService.enqueue('transcribe_audio', error).catch(() => undefined);
      return 'Transcription unavailable.';
    }
  }

  /**
   * Generates a deterministic local summary based on job data.
   */
  static generateLocalSummary(job: Job, photos: JobPhoto[], voiceNotes: VoiceNote[], language: SiteProofLanguage = 'en'): string {
    const photoCount = photos.length;
    const voiceCount = voiceNotes.length;
    const categories = Array.from(new Set(photos.map((photo) => photo.category)));
    const categoryList = categories.length > 0 ? categories.slice(0, 3).join(', ') + (categories.length > 3 ? '...' : '') : translate(language, 'reports.localSummaryGeneral');
    const issues = photos.filter((photo) => photo.isIssue).length;
    const statusText = job.status === 'COMPLETED' ? translate(language, 'reports.localSummaryComplete') : translate(language, 'reports.localSummaryProgress');

    let summary = `${translate(language, 'reports.localSummaryStart')
      .replace('{jobType}', job.jobType)
      .replace('{customerName}', job.customerName)
      .replace('{statusText}', statusText)
      .replace('{photoCount}', String(photoCount))
      .replace('{categoryList}', categoryList)} `;

    if (voiceCount > 0) {
      summary += `${translate(language, 'reports.localSummaryVoice').replace('{voiceCount}', String(voiceCount))} `;
    }

    if (issues > 0) {
      summary += `${translate(language, 'reports.localSummaryIssues').replace('{issues}', String(issues))} `;
    } else {
      summary += `${translate(language, 'reports.localSummaryClear')} `;
    }

    return summary;
  }

  /**
   * Summarizes a job's progress for reports.
   */
  static async summarizeJob(job: Job, photos: JobPhoto[], voiceNotes: VoiceNote[], language: SiteProofLanguage = 'en'): Promise<string> {
    const localSummary = this.generateLocalSummary(job, photos, voiceNotes, language);

    try {
      return await SiteProofAiClient.summarizeJob({
        job,
        photos,
        voiceNotes,
        localSummary,
      });
    } catch (error) {
      console.error('Summary error:', error);
      await AiTaskQueueService.enqueue('summarize_job', error).catch(() => undefined);
      return localSummary;
    }
  }
}
