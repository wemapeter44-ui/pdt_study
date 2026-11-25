
export default function BrandFooter() {
  return (
    <footer className="border-t border-[#263244] py-5 text-center">
      <p className="text-[11px] font-medium tracking-wide text-[#64748B]">
        © {new Date().getFullYear()} PDT Softwares
      </p>
      <p className="mt-1 text-[10px] tracking-wide text-[#475569]">
        Technology for learning and progress.
      </p>
    </footer>
  );
}
