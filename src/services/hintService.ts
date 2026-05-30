import { AppSettingsService } from './appSettingsService';
import type { SiteProofLanguage, SiteProofSettings } from '../types/settings';

export type HintType = 'proof' | 'learning' | 'warning' | 'privacy';

export interface HintDefinition {
  hintId: string;
  screen: string;
  action?: string;
  type: HintType;
  textKey: string;
  maxShows?: number;
  keepPermanent?: boolean;
  language?: SiteProofLanguage;
}

export interface HintState {
  hintId: string;
  showCount: number;
  dismissed: boolean;
  keepPermanent: boolean;
  lastShownAt?: number;
}

const HINT_STATE_KEY = 'siteproof_hint_state';

export class HintService {
  static async getState(): Promise<Record<string, HintState>> {
    return AppSettingsService.getValue<Record<string, HintState>>(HINT_STATE_KEY, {});
  }

  static async shouldShow(hint: HintDefinition, settings: SiteProofSettings): Promise<boolean> {
    if (settings.hintMode === 'minimal' && hint.type === 'learning') return false;
    if (hint.type === 'proof' && settings.alwaysShowProofHints) return true;

    const state = (await this.getState())[hint.hintId];
    if (!state) return true;
    if (state.keepPermanent || hint.keepPermanent) return true;
    if (state.dismissed) return false;
    if (hint.type === 'warning') return true;
    if (hint.type === 'privacy') return state.showCount < (hint.maxShows ?? 8);
    return state.showCount < (hint.maxShows ?? 3);
  }

  static async markShown(hintId: string): Promise<void> {
    const states = await this.getState();
    const current = states[hintId] ?? { hintId, showCount: 0, dismissed: false, keepPermanent: false };
    await AppSettingsService.setValue<Record<string, HintState>>(HINT_STATE_KEY, {
      ...states,
      [hintId]: { ...current, showCount: current.showCount + 1, lastShownAt: Date.now() },
    });
  }

  static async dismiss(hintId: string): Promise<void> {
    const states = await this.getState();
    const current = states[hintId] ?? { hintId, showCount: 0, dismissed: false, keepPermanent: false };
    await AppSettingsService.setValue<Record<string, HintState>>(HINT_STATE_KEY, {
      ...states,
      [hintId]: { ...current, dismissed: true },
    });
  }

  static async keepShowing(hintId: string): Promise<void> {
    const states = await this.getState();
    const current = states[hintId] ?? { hintId, showCount: 0, dismissed: false, keepPermanent: false };
    await AppSettingsService.setValue<Record<string, HintState>>(HINT_STATE_KEY, {
      ...states,
      [hintId]: { ...current, dismissed: false, keepPermanent: true },
    });
  }
}
