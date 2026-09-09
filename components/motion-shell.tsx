"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function MotionShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(className)}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
