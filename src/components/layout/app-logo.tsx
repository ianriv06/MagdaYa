import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Intrinsic dimensions of public/logo.png */
const LOGO_WIDTH = 400;
const LOGO_HEIGHT = 175;

const HEIGHTS = {
  xs: 22,
  sm: 32,
  md: 40,
} as const;

export function AppLogo({
  className,
  size = "sm",
  linked = true,
}: {
  className?: string;
  size?: keyof typeof HEIGHTS;
  linked?: boolean;
}) {
  const height = HEIGHTS[size];

  const image = (
    <Image
      src="/logo.png"
      alt="MagdaYa"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className="w-auto object-contain"
      style={{ height }}
      priority
      unoptimized
    />
  );

  if (!linked) {
    return <span className={cn("inline-flex shrink-0", className)}>{image}</span>;
  }

  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 active:opacity-80", className)}
      aria-label="MagdaYa inicio"
    >
      {image}
    </Link>
  );
}

/** Compact top bar with logo — mobile customer tab screens. */
export function MobileLogoBar({
  className,
  sticky = true,
}: {
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "md:hidden px-4 pt-3 pb-2.5 bg-white safe-top border-b border-border",
        sticky && "sticky top-0 z-40",
        className
      )}
    >
      <AppLogo size="sm" />
    </div>
  );
}
