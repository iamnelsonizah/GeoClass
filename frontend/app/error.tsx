'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';

/** Shown instead of a blank screen if any page crashes while rendering. */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('GeoClass crashed:', error);
  }, [error]);

  return (
    <main className="min-h-screen w-full grid place-items-center bg-[#FAF9F5] text-[#1F231E] px-5">
      <div className="max-w-[440px]">
        <p className="text-[14px] font-medium text-[#AD5630]">Something went wrong</p>
        <h1 className="mt-3 font-display text-[34px] font-medium tracking-[-0.03em] leading-[1.1]">
          This view hit an unexpected error.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-[#5B6159]">
          Your saved analyses are stored in this browser and are not affected. Try again, or go back to the start.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-[#1F231E] hover:bg-[#33392F] text-[#FAF9F5] px-5 py-2.5 text-[15px] font-medium cursor-pointer"
          >
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-[#D8D5CA] hover:border-[#BCB8AA] px-5 py-2.5 text-[15px]">
            Home
          </Link>
        </div>
        {error.digest && <p className="mt-6 font-mono text-[11px] text-[#8A908A]">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
