'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type Props = {
  /** Which long-running job is in flight, or null when idle */
  job: 'imagery' | 'classify' | null;
  sensorLabel: string;
};

const COPY = {
  imagery: {
    title: 'Fetching satellite imagery',
    detail: (sensor: string) =>
      `Earth Engine is gathering every ${sensor} scene for your dates, masking clouds and building a median composite.`,
    typical: 'Usually 5–20 seconds',
  },
  classify: {
    title: 'Classifying land cover',
    detail: () =>
      'Sampling training points from Dynamic World, training the classifier and labelling every 10 m pixel in your area.',
    typical: 'Usually 15–60 seconds, longer for large areas',
  },
} as const;

/** Floating status card shown over the map while imagery or classification runs. */
export default function ProgressCard({ job, sensorLabel }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!job) return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      window.clearInterval(id);
      setElapsed(0);
    };
  }, [job]);

  if (!job) return null;
  const c = COPY[job];

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 bottom-12 z-[1001] w-[min(92vw,380px)] rounded-xl border border-[#D8D5CA] bg-[#FAF9F5]/95 backdrop-blur-md shadow-md px-4 py-3 text-[#1A1D23]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-[#C96B3C]" />
          {c.title}
        </div>
        <span className="font-mono text-[12px] text-[#69706A] tabular-nums">{elapsed}s</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[#69706A]">{c.detail(sensorLabel)}</p>
      <div className="mt-2 h-1 rounded-full bg-[#E9E6DC] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-[#C96B3C] animate-[gc-indeterminate_1.4s_ease-in-out_infinite]" />
      </div>
      <p className="mt-1.5 text-[11px] text-[#8A908A]">
        {c.typical}
        {elapsed > 90 ? ' — still working; large areas or long date ranges take longer.' : '.'}
      </p>
    </div>
  );
}
