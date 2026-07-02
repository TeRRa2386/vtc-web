import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const tones = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-red-500/12 text-red-700 dark:text-red-300",
  info: "bg-sky-500/12 text-sky-700 dark:text-sky-300"
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black", tones[tone])}>
      {children}
    </span>
  );
}
