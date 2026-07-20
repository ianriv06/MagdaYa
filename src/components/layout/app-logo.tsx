import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_ASPECT = 370 / 148;

const SIZES = {
  xs: 20,
  sm: 26,
  md: 32,
} as const;

export function AppLogo({
  className,
  size = "sm",
  linked = true,
}: {
  className?: string;
  size?: keyof typeof SIZES;
  linked?: boolean;
}) {
  const height = SIZES[size];
  const width = Math.round(height * LOGO_ASPECT);

  const image = (
    <Image
      src="/logo.png"
      alt="MagdaYa"
      width={width}
      height={height}
      className="object-contain"
      style={{ width, height }}
      priority
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
        "md:hidden px-4 pt-2.5 pb-2 bg-white safe-top border-b border-border",
        sticky && "sticky top-0 z-40",
        className
      )}
    >
      <AppLogo size="sm" />
    </div>
  );
}
