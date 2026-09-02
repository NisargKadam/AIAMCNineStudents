import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "size-7 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
  xl: "size-20 text-lg",
};

export function Avatar({
  name,
  url,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-display relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line-strong)] bg-[linear-gradient(150deg,color-mix(in_oklab,var(--ember)_75%,transparent),color-mix(in_oklab,var(--ember-deep)_40%,var(--sunken)))] font-semibold text-white",
        sizes[size],
        className,
      )}
    >
      {url ? (
        // Avatars can point at arbitrary user-supplied hosts; community
        // attachments go through next/image instead.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
