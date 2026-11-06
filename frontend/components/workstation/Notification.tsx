'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

/** Inline notice for the workflow panel. Success notices dismiss themselves after 8 s. */
export default function Notification({
  type,
  message,
  onDismiss,
}: {
  type: 'error' | 'success';
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (type !== 'success') return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [type, onDismiss]);

  const styles =
    type === 'error'
      ? 'bg-[#F7E9E4] border-[#E3C3B8] text-[#8A3B2B]'
      : 'bg-[#E4E9DF] border-[#C9D3BF] text-[#4A5A3E]';
  const Icon = type === 'error' ? AlertTriangle : CheckCircle;

  return (
    <motion.div
      role={type === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2.5 px-3 py-2.5 border rounded-md ${styles} text-xs leading-relaxed print:hidden`}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-px" />
      <div className="flex-1">{message}</div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded transition flex-shrink-0 cursor-pointer opacity-60 hover:opacity-100 hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
