"use client";

export function ConfigBanner() {
  const missing =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon");

  if (!missing) return null;

  return (
    <div className="bg-amber-500 text-amber-950 text-center text-xs sm:text-sm font-medium px-4 py-2">
      Configure Supabase: copy{" "}
      <code className="font-mono bg-amber-600/20 px-1 rounded">.env.example</code>{" "}
      →{" "}
      <code className="font-mono bg-amber-600/20 px-1 rounded">.env.local</code>{" "}
      and run the SQL in{" "}
      <code className="font-mono bg-amber-600/20 px-1 rounded">supabase/</code>
    </div>
  );
}
