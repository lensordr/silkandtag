export default function Logo({
  layout = "row",
  showTagline = false,
  iconSize = 40,
  className = "",
}: {
  layout?: "row" | "stacked";
  showTagline?: boolean;
  iconSize?: number;
  className?: string;
}) {
  const icon = (
    <svg
      width={iconSize}
      height={iconSize * 0.62}
      viewBox="0 0 220 136"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M6 78 C 34 96, 58 96, 78 78 C 96 62, 84 46, 98 34 C 112 22, 130 30, 140 44 C 118 30, 100 40, 96 56 C 92 72, 104 82, 88 96 C 66 116, 30 108, 6 78 Z"
        fill="#111111"
      />
      <path
        d="M140 44 C 130 30, 112 22, 98 34"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M140 44 C 148 30, 164 24, 176 34"
        stroke="#111111"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <g transform="rotate(38 178 62)">
        <rect x="152" y="34" width="58" height="56" rx="10" fill="#FC5100" />
        <circle cx="168" cy="50" r="6" fill="#FFF7F0" />
      </g>
    </svg>
  );

  const wordmark = (
    <div className={layout === "stacked" ? "text-center leading-none" : "leading-none"}>
      <span
        className="font-serif-display font-semibold tracking-wide whitespace-nowrap"
        style={{ fontSize: iconSize * 0.42 }}
      >
        SILK <span className="text-brand-orange">&amp;</span> TAG
      </span>
      {showTagline && (
        <div
          className={`text-brand-gray uppercase tracking-[0.25em] mt-1 ${layout === "stacked" ? "text-center" : ""}`}
          style={{ fontSize: iconSize * 0.14 }}
        >
          Resale &middot; Spain
        </div>
      )}
    </div>
  );

  if (layout === "stacked") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        {icon}
        <div className="mt-2">{wordmark}</div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {icon}
      {wordmark}
    </div>
  );
}
