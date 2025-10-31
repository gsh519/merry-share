// Service Worker for background file uploads
// This worker runs independently of the main thread and can continue
// processing even when the browser tab is closed

const CACHE_NAME = 'merry-share-upload-v1';
const UPLOAD_QUEUE_KEY = 'upload-queue';

// Service Worker installation
self.addEventListener('install', (event) => {
  console.log('[Upload Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  console.log('[Upload Worker] Activated');
  event.waitUntil(clients.claim()); // Take control of all clients immediately
});

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START_UPLOAD':
      await handleUploadTask(payload, event.source);
      break;

    case 'CANCEL_UPLOAD':
      // TODO: Implement cancel logic
      break;

    case 'GET_QUEUE_STATUS':
      // Send back current queue status
      const status = await getQueueStatus();
      event.source.postMessage({ type: 'QUEUE_STATUS', payload: status });
      break;
  }
});

// Handle upload task
async function handleUploadTask(task, client) {
  const { id, files, userName, accessToken } = task;

  try {
    // Notify client that upload started
    client.postMessage({
      type: 'UPLOAD_STARTED',
      payload: { id }
    });

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];

      // Convert base64 back to Blob
      const blob = base64ToBlob(fileData.data, fileData.type);

      // Create FormData
      const formData = new FormData();
      formData.append('file', blob, fileData.name);
      formData.append('postedUserName', userName);

      // Upload file
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `ファイル ${fileData.name} のアップロードに失敗しました`);
      }

      // Notify progress
      client.postMessage({
        type: 'UPLOAD_PROGRESS',
        payload: {
          id,
          current: i + 1,
          total: files.length,
          fileName: fileData.name
        }
      });

      console.log(`[Upload Worker] Uploaded ${i + 1}/${files.length}: ${fileData.name}`);
    }

    // Upload completed
    client.postMessage({
      type: 'UPLOAD_COMPLETED',
      payload: { id, total: files.length }
    });

    // Show notification
    if (self.registration.showNotification) {
      self.registration.showNotification('アップロード完了', {
        body: `${files.length}個のファイルのアップロードが完了しました`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `upload-${id}`,
      });
    }

  } catch (error) {
    console.error('[Upload Worker] Upload failed:', error);

    // Notify error
    client.postMessage({
      type: 'UPLOAD_ERROR',
      payload: {
        id,
        error: error.message || 'アップロードに失敗しました'
      }
    });

    // Show error notification
    if (self.registration.showNotification) {
      self.registration.showNotification('アップロードエラー', {
        body: error.message || 'アップロードに失敗しました',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `upload-error-${id}`,
      });
    }
  }
}

// Helper: Convert base64 to Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

// Get current queue status
async function getQueueStatus() {
  // This would track active uploads
  // For now, return empty status
  return {
    activeUploads: 0,
    queuedUploads: 0
  };
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background Sync (for offline support - optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-sync') {
    event.waitUntil(syncUploads());
  }
});

async function syncUploads() {
  // This would handle uploads that were queued while offline
  console.log('[Upload Worker] Syncing queued uploads...');
}
