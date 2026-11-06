'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'geoclass_saved_workspaces_v1';

/* eslint-disable @typescript-eslint/no-explicit-any -- workspace snapshots are free-form JSON */
/**
 * Saved analyses, persisted in this browser's localStorage.
 * Returns the same tuple as useState; every change is written back automatically,
 * so saves and deletes survive a reload.
 */
export function useSavedWorkspaces() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (Array.isArray(parsed)) setWorkspaces(parsed);
    } catch (err) {
      console.warn('Could not read saved workspaces', err);
    } finally {
      loaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch (err) {
      console.warn('Could not persist saved workspaces', err);
    }
  }, [workspaces]);

  return [workspaces, setWorkspaces] as const;
}
