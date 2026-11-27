import Image from "next/image";

export function PhoneFrame({
  src,
  alt,
  caption,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="w-[150px] overflow-hidden rounded-[1.75rem] border-[5px] border-zinc-700 bg-black shadow-2xl shadow-indigo-950/60 sm:w-[200px] sm:rounded-[2.25rem] sm:border-[6px] lg:w-[230px]">
        <Image src={src} alt={alt} width={390} height={844} priority={priority} unoptimized className="h-auto w-full" />
      </div>
      <figcaption className="text-sm text-zinc-400">{caption}</figcaption>
    </figure>
  );
}
