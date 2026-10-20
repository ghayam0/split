// The Split mark: an allowance "donut" with one slice split off. Same artwork as app/icon.svg.
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#0a5c47" />
      <g transform="rotate(-90 16 16)" fill="none" strokeWidth="5">
        <circle
          cx="16"
          cy="16"
          r="9"
          stroke="#fbf7ee"
          strokeDasharray="40.72 56.55"
          strokeDashoffset="-15.83"
        />
        <circle
          cx="16"
          cy="16"
          r="9"
          stroke="#eda100"
          strokeDasharray="12.63 56.55"
          strokeDashoffset="-1.6"
          transform="translate(1.6 1.6)"
        />
      </g>
    </svg>
  );
}
