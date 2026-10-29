'use client';

import React, { useState, useEffect } from 'react';

interface SavedProjectMeta {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface ProjectShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  aoiCoords: number[][];
  layerState: Record<string, any>;
  onLoadProject: (projectData: any) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function ProjectShareModal({
  isOpen,
  onClose,
  aoiCoords,
  layerState,
  onLoadProject,
}: ProjectShareModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [projectsList, setProjectsList] = useState<SavedProjectMeta[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch list of saved projects when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setShareUrl(null);
      setCopied(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data);
      }
    } catch (e: any) {
      console.warn('Could not fetch saved projects:', e);
    } finally {
      setLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveProject = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a project title.');
      return;
    }
    if (!aoiCoords || aoiCoords.length < 3) {
      setErrorMsg('No active Area of Interest delineated to save.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const aoiGeoJSON = {
      type: 'Polygon',
      coordinates: [aoiCoords],
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          aoi_geojson: aoiGeoJSON,
          layer_state: layerState,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const project = await res.json();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const permalink = `${origin}/app?project=${project.id}`;
      setShareUrl(permalink);

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(permalink);
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }

      fetchProjects();
    } catch (err: any) {
      setErrorMsg(`Failed to save project: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSingle = async (projectId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}`);
      if (res.ok) {
        const fullProject = await res.json();
        onLoadProject(fullProject);
        onClose();
      }
    } catch (e: any) {
      setErrorMsg(`Failed to load project: ${e.message}`);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProjectsList((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch (e: any) {
      console.warn('Could not delete project:', e);
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#FAF9F5] border border-[#D8D5CA] rounded-md shadow-2xl overflow-hidden flex flex-col font-sans relative z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#F4F1E8] border-b border-[#D8D5CA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9622B]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1D23]">
              Cloud Projects & Shareable Permalinks
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#69706A] hover:text-[#1A1D23] font-mono text-sm px-1.5 py-0.5 rounded hover:bg-[#E9E6DC]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Save Active State Form */}
          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded p-4 space-y-3">
            <div className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider border-b border-[#D8D5CA] pb-1.5">
              Save Active Workspace & Create Permalink
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#69706A] uppercase mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Serengeti Savanna Migration Sector"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D8D5CA] rounded text-[#1A1D23] focus:outline-none focus:border-[#D9622B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#69706A] uppercase mb-1">
                  Description / Research Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional context, sensor settings, or study hypotheses..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D8D5CA] rounded text-[#1A1D23] focus:outline-none focus:border-[#D9622B]"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-[#FBEBEA] border border-[#A84E42]/30 rounded text-xs text-[#A84E42]">
                {errorMsg}
              </div>
            )}

            {/* Generated Permalink Box */}
            {shareUrl && (
              <div className="p-3 bg-[#E4E9DF] border border-[#6F8060]/40 rounded space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#6F8060]">
                  <span>✓ Project Saved to Cloud</span>
                  {copied && <span className="font-mono text-[11px]">Copied to Clipboard!</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full px-2 py-1 text-[11px] font-mono bg-white border border-[#D8D5CA] rounded text-[#1A1D23]"
                  />
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 3000);
                      }
                    }}
                    className="px-2.5 py-1 text-xs bg-[#6F8060] text-white rounded font-semibold shrink-0 hover:bg-[#5E6D51]"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveProject}
              disabled={saving}
              className="w-full py-2 bg-[#D9622B] text-white text-xs font-semibold rounded hover:bg-[#B84E1C] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving Project...' : 'Save & Generate Shareable Permalink'}
            </button>
          </div>

          {/* Saved Projects Library */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#1A1D23] uppercase tracking-wider">
              <span>Saved Projects Library</span>
              <span className="font-mono text-[#69706A] text-[11px]">{projectsList.length} Saved</span>
            </div>

            {loadingList ? (
              <div className="p-4 text-center text-xs text-[#69706A] font-mono">
                Loading saved projects...
              </div>
            ) : projectsList.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#69706A] font-mono bg-[#FAF9F5] border border-[#D8D5CA] rounded">
                No saved projects found. Save your current analysis to access it anytime.
              </div>
            ) : (
              <div className="divide-y divide-[#E3E0D5] border border-[#D8D5CA] rounded overflow-hidden max-h-48 overflow-y-auto">
                {projectsList.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-[#FAF9F5] hover:bg-[#F4F1E8] transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-3">
                      <div className="font-bold text-[#1A1D23] truncate">{p.title}</div>
                      <div className="text-[10.5px] text-[#69706A] font-mono truncate">
                        {p.id} • {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLoadSingle(p.id)}
                        className="px-2 py-1 rounded bg-[#1A1D23] text-white text-[11px] font-semibold hover:bg-black"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => {
                          const origin = typeof window !== 'undefined' ? window.location.origin : '';
                          const url = `${origin}/app?project=${p.id}`;
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(url);
                            alert('Permalink copied to clipboard!');
                          }
                        }}
                        className="px-2 py-1 rounded border border-[#D8D5CA] bg-white text-[#69706A] text-[11px] hover:bg-[#F4F1E8]"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-1.5 py-1 text-[11px] text-[#A84E42] hover:bg-[#FBEBEA] rounded"
                        title="Delete project"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
