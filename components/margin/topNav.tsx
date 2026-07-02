type TopNavProps = {
  isLoading: boolean;
  isSaving: boolean;
  startNextMonth: () => void;
};

export function TopNav({ isLoading: _isLoading, isSaving: _isSaving, startNextMonth: _startNextMonth }: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-5 md:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C95730]">Margin</p>
          <h1 className="truncate text-lg font-bold tracking-tight text-[#163B5C] sm:text-xl md:text-2xl">
            Monthly cash flow
          </h1>
        </div>
      </div>
    </header>
  );
}