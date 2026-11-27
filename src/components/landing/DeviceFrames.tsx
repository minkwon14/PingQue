import Image from "next/image";

export function TabletFrame({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border-[7px] border-[#1d343c] bg-black shadow-[0_40px_90px_-30px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.07)] sm:rounded-[1.75rem] sm:border-[10px]">
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
      className={`overflow-hidden rounded-[1.5rem] border-[5px] border-[#2a444d] bg-black shadow-[0_30px_70px_-20px_rgb(0_0_0/0.9),0_0_0_1px_rgb(255_255_255/0.08)] sm:rounded-[2rem] sm:border-[6px] ${className}`}
    >
      <Image src={src} alt={alt} width={390} height={844} priority={priority} unoptimized className="h-auto w-full" />
    </div>
  );
}
