
import { Link } from 'react-router-dom';

export default function BrandLogo({
  className = '',
  size = 'text-xl',
  iconSize = 'w-8 h-8'
}) {
  return (
    <Link
      to="/"
      aria-label="PDT Study home"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <div
        className={`${iconSize} grid shrink-0 place-items-center rounded-md border border-[#22D3EE]/30 bg-[#111B2B] text-[#22D3EE]`}
      >
        <span className="text-[1.1em] font-bold leading-none">
          P
        </span>
      </div>

      <span className={`${size} font-semibold tracking-tight text-white`}>
        PDT <span className="font-normal text-[#94A3B8]">Study</span>
      </span>
    </Link>
  );
}
