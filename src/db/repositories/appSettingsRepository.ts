import { AppSettings, newId, nowIso } from '../schema';
import { requestToPromise, withStore } from '../indexedDb';

const SETTINGS_STORE = 'app_settings';
const DEFAULT_SCOPE: AppSettings['scope'] = 'device';

export class AppSettingsRepository {
  private settingsId(key: string, scope: AppSettings['scope'] = DEFAULT_SCOPE, companyId?: string | null): string {
    return `${scope}:${companyId ?? 'local'}:${key}`;
  }

  async getByKey<T>(key: string, fallback: T, options: { scope?: AppSettings['scope']; companyId?: string | null } = {}): Promise<T> {
    const scope = options.scope ?? DEFAULT_SCOPE;
    const settingsId = this.settingsId(key, scope, options.companyId);
    const record = await withStore<AppSettings | undefined>(SETTINGS_STORE, 'readonly', (store) => store.get(settingsId));
    return record ? (record.value as T) : fallback;
  }

  async setByKey<T>(key: string, value: T, options: { scope?: AppSettings['scope']; companyId?: string | null } = {}): Promise<AppSettings> {
    const scope = options.scope ?? DEFAULT_SCOPE;
    const settingsId = this.settingsId(key, scope, options.companyId);
    const now = nowIso();
    const existing = await withStore<AppSettings | undefined>(SETTINGS_STORE, 'readonly', (store) => store.get(settingsId)).catch(() => undefined);
    const record: AppSettings = {
      settings_id: existing?.settings_id ?? settingsId ?? newId(),
      company_id: options.companyId ?? null,
      key,
      value,
      scope,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await withStore<IDBValidKey>(SETTINGS_STORE, 'readwrite', (store) => store.put(record));
    return record;
  }

  async deleteByKey(key: string, options: { scope?: AppSettings['scope']; companyId?: string | null } = {}): Promise<void> {
    const scope = options.scope ?? DEFAULT_SCOPE;
    const settingsId = this.settingsId(key, scope, options.companyId);
    await withStore<undefined>(SETTINGS_STORE, 'readwrite', (store) => {
      store.delete(settingsId);
      return undefined;
    });
  }

  async getAll(scope: AppSettings['scope'] = DEFAULT_SCOPE): Promise<AppSettings[]> {
    const dbRecords = await withStore<AppSettings[]>(SETTINGS_STORE, 'readonly', async (store) => {
      const index = store.index('scope');
      return requestToPromise<AppSettings[]>(index.getAll(scope));
    });
    return dbRecords;
  }
}

export const appSettingsRepository = new AppSettingsRepository();
