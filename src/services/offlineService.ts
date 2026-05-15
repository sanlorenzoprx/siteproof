export interface OfflineStatus {
  online: boolean;
  serviceWorkerReady: boolean;
  installable: boolean;
  lastChangedAt: number;
}

type Listener = (status: OfflineStatus) => void;

class OfflineStatusServiceImpl {
  private listeners = new Set<Listener>();
  private status: OfflineStatus = {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    serviceWorkerReady: false,
    installable: false,
    lastChangedAt: Date.now(),
  };

  initialize() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this.handleOnlineState);
    window.addEventListener('offline', this.handleOnlineState);
    window.addEventListener('beforeinstallprompt', () => {
      this.setStatus({ installable: true });
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => this.setStatus({ serviceWorkerReady: true }))
        .catch(() => this.setStatus({ serviceWorkerReady: false }));
    }
  }

  destroy() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', this.handleOnlineState);
    window.removeEventListener('offline', this.handleOnlineState);
  }

  getStatus(): OfflineStatus {
    return this.status;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private handleOnlineState = () => {
    this.setStatus({ online: navigator.onLine });
  };

  private setStatus(update: Partial<OfflineStatus>) {
    this.status = { ...this.status, ...update, lastChangedAt: Date.now() };
    this.listeners.forEach((listener) => listener(this.status));
  }
}

export const OfflineStatusService = new OfflineStatusServiceImpl();
