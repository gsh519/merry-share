// Service Worker Manager
// Handles registration, communication, and lifecycle management

export interface UploadTaskMessage {
  id: string;
  files: Array<{
    name: string;
    type: string;
    size: number;
    data: string; // base64 encoded file data
  }>;
  userName: string;
  accessToken: string;
}

export interface WorkerMessage {
  type: 'START_UPLOAD' | 'CANCEL_UPLOAD' | 'GET_QUEUE_STATUS' | 'UPLOAD_STARTED' | 'UPLOAD_PROGRESS' | 'UPLOAD_COMPLETED' | 'UPLOAD_ERROR' | 'QUEUE_STATUS';
  payload: any;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker is not supported in this browser');
      return false;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/upload-worker.js', {
        scope: '/',
      });

      console.log('[SW Manager] Service Worker registered:', this.registration.scope);

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      return true;
    } catch (error) {
      console.error('[SW Manager] Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Check if service worker is registered and active
   */
  isReady(): boolean {
    return this.registration !== null && navigator.serviceWorker.controller !== null;
  }

  /**
   * Convert File to base64 for transfer to Service Worker
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data:image/...;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Start an upload task in the service worker
   */
  async startUpload(id: string, files: File[], userName: string): Promise<boolean> {
    if (!this.isReady()) {
      console.error('[SW Manager] Service Worker is not ready');
      return false;
    }

    try {
      // Get access token
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('認証情報が見つかりません');
      }

      // Convert files to base64
      const fileDataArray = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await this.fileToBase64(file),
        }))
      );

      // Send message to service worker
      const message: WorkerMessage = {
        type: 'START_UPLOAD',
        payload: {
          id,
          files: fileDataArray,
          userName,
          accessToken,
        },
      };

      navigator.serviceWorker.controller?.postMessage(message);
      console.log('[SW Manager] Upload task started:', id);

      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to start upload:', error);
      return false;
    }
  }

  /**
   * Cancel an upload task
   */
  cancelUpload(id: string): void {
    if (!this.isReady()) return;

    const message: WorkerMessage = {
      type: 'CANCEL_UPLOAD',
      payload: { id },
    };

    navigator.serviceWorker.controller?.postMessage(message);
  }

  /**
   * Handle messages from service worker
   */
  private handleMessage(event: MessageEvent): void {
    const { type, payload } = event.data as WorkerMessage;

    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(payload);
    }
  }

  /**
   * Register a message handler
   */
  on(type: string, handler: (payload: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Unregister a message handler
   */
  off(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Unregister the service worker (for cleanup/testing)
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      console.log('[SW Manager] Service Worker unregistered');
      return result;
    } catch (error) {
      console.error('[SW Manager] Failed to unregister service worker:', error);
      return false;
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();
