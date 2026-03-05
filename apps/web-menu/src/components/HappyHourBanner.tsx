interface HappyHourBannerProps {
  /** Label from the active PriceSchedule, e.g. "Happy Hour" */
  label: string;
  /** Number of products currently with promotional pricing */
  productCount: number;
}

export function HappyHourBanner({ label, productCount }: HappyHourBannerProps) {
  return (
    <div className="mx-4 mt-2 mb-1 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center gap-3">
      <span className="text-xl flex-shrink-0" role="img" aria-label="Celebration">
        {'\u{1F389}'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-white/80">
          {productCount} {productCount === 1 ? 'produto com preco especial' : 'produtos com precos especiais'}
        </p>
      </div>
      <span className="text-xl flex-shrink-0" role="img" aria-label="Beer">
        {'\u{1F37A}'}
      </span>
    </div>
  );
}
