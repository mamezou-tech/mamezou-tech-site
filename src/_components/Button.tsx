interface Props {
  label: string;
  href: string;
}

export default ({ label, href }: Props) => (
  <a
    href={href}
    className="inline-flex items-center justify-center bg-mz px-6 py-3 rounded-lg text-white text-base font-bold whitespace-nowrap hover:opacity-90"
  >
    {label}
  </a>
);
