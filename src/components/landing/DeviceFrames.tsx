import Image from "next/image";

export function TabletFrame({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border-[7px] border-zinc-700 bg-black shadow-2xl shadow-indigo-950/60 sm:rounded-[1.75rem] sm:border-[10px]">
      <Image src={src} alt={alt} width={960} height={720} priority={priority} unoptimized className="h-auto w-full" />
    </div>
  );
}

export function PhoneFrame({
  src,
  alt,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.5rem] border-[5px] border-zinc-600 bg-black shadow-2xl shadow-black/70 sm:rounded-[2rem] sm:border-[6px] ${className}`}
    >
      <Image src={src} alt={alt} width={390} height={844} priority={priority} unoptimized className="h-auto w-full" />
    </div>
  );
}
