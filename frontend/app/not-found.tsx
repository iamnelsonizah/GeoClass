import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen w-full grid place-items-center bg-[#FAF9F5] text-[#1F231E] px-5">
      <div className="max-w-[440px]">
        <p className="font-mono text-[13px] text-[#8A908A]">404 · 0.0000° N · 0.0000° E</p>
        <h1 className="mt-3 font-display text-[34px] font-medium tracking-[-0.03em] leading-[1.1]">
          Nothing mapped at this address.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-[#5B6159]">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="rounded-lg bg-[#1F231E] hover:bg-[#33392F] text-[#FAF9F5] px-5 py-2.5 text-[15px] font-medium">
            Open the workspace
          </Link>
          <Link href="/" className="rounded-lg border border-[#D8D5CA] hover:border-[#BCB8AA] px-5 py-2.5 text-[15px]">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
