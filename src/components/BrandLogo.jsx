
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
      <img
        src="/pdt-study.png"
        alt="PDT Study"
        className={`${iconSize} shrink-0 object-contain`}
      />

      <span className={`${size} font-semibold tracking-tight text-white`}>
        PDT <span className="font-normal text-[#94A3B8]">Study</span>
      </span>
    </Link>
  );
}
