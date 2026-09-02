import { initials } from "@/lib/utils";
export function Avatar({
  name,
  url,
  size = "md",
}: {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "lg"
      ? "size-14 text-base"
      : size === "sm"
        ? "size-8 text-[10px]"
        : "size-10 text-xs";
  return (
    <div
      className={`${dimensions} from-accent/70 relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br to-[#7a2715] font-bold text-white`}
    >
      {url ? (
        // User-provided avatar hosts are intentionally rendered directly; community attachments use Next Image.
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
