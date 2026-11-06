'use client';

import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Area' },
  { n: 2, label: 'Imagery' },
  { n: 3, label: 'Classify' },
  { n: 4, label: 'Results' },
] as const;

/** Compact Area → Imagery → Classify → Results progress bar for the workflow panel. */
export default function WorkflowSteps({
  step,
  hasResults,
  onGo,
}: {
  step: number;
  hasResults: boolean;
  onGo: (n: number) => void;
}) {
  return (
    <ol className="grid grid-cols-4 px-2 pt-3 pb-1 text-[11px]" aria-label="Workflow progress">
      {STEPS.map((st, i) => {
        const done = step > st.n || (st.n === 4 && hasResults);
        const current = step === st.n && !done;
        return (
          <li key={st.n} className="relative flex justify-center">
            {/* connector to the next step, drawn behind the circles */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-[13px] left-1/2 w-full h-px ${done ? 'bg-[#C96B3C]' : 'bg-[#D8D5CA]'}`}
              />
            )}
            <button
              type="button"
              onClick={() => onGo(st.n)}
              aria-current={current ? 'step' : undefined}
              className={`relative flex flex-col items-center gap-1 rounded px-1 py-0.5 cursor-pointer transition ${
                current
                  ? 'text-[#1A1D23] font-semibold'
                  : done
                    ? 'text-[#69706A] hover:text-[#1A1D23]'
                    : 'text-[#8A908A] hover:text-[#1A1D23]'
              }`}
            >
              <span
                className={`w-[20px] h-[20px] rounded-full grid place-items-center text-[10px] font-semibold ${
                  done
                    ? 'bg-[#C96B3C] text-white'
                    : current
                      ? 'bg-[#FAF9F5] border-[1.5px] border-[#C96B3C] text-[#C96B3C]'
                      : 'bg-[#FAF9F5] border border-[#D8D5CA] text-[#8A908A]'
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : st.n}
              </span>
              <span className="whitespace-nowrap">{st.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
