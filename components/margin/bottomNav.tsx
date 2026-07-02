"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = Record<string, never>;

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10.5V20h13v-9.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 20v-6h5v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BillsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3.5h10A2.5 2.5 0 0 1 19.5 6v14l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V6A2.5 2.5 0 0 1 7 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 8h7" strokeLinecap="round" />
      <path d="M8.5 12h7" strokeLinecap="round" />
      <path d="M8.5 16h4" strokeLinecap="round" />
    </svg>
  );
}

export function BottomNav(_props: BottomNavProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isBills = pathname.startsWith("/bills");

  const homeClassName = isHome
    ? "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-[#163B5C] text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
    : "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-bold text-[#163B5C] transition hover:bg-slate-50 active:scale-[0.98]";

  const billsClassName = isBills
    ? "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-[#163B5C] text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
    : "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-bold text-[#163B5C] transition hover:bg-slate-50 active:scale-[0.98]";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="mx-auto w-full max-w-md rounded-[1.6rem] border border-slate-200 bg-white/95 p-2 shadow-[0_-10px_35px_rgba(15,23,42,0.14)] backdrop-blur md:max-w-lg">
        <div className="grid grid-cols-2 gap-1.5">
          <Link href="/" prefetch className={homeClassName} aria-current={isHome ? "page" : undefined}>
            <HomeIcon />
            <span>Home</span>
          </Link>
          <Link href="/bills" prefetch className={billsClassName} aria-current={isBills ? "page" : undefined}>
            <BillsIcon />
            <span>Bills</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
