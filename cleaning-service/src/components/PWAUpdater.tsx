'use client';

import { useEffect } from 'react';

const SERVICE_WORKER_URL = '/sw.js';

export default function PWAUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const hadActiveController = Boolean(navigator.serviceWorker.controller);
    let isReloading = false;

    const reloadAfterUpdate = () => {
      if (!hadActiveController || isReloading) return;

      isReloading = true;
      window.location.reload();
    };

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_URL,
          { updateViaCache: 'none' }
        );

        await registration.update();
      } catch (error) {
        console.warn('PWA update check failed:', error);
      }
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      reloadAfterUpdate
    );
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('online', checkForUpdate);

    void checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        reloadAfterUpdate
      );
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('online', checkForUpdate);
    };
  }, []);

  return null;
}
