"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { TaskForm } from "@/components/tasks/task-form";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-border px-6 h-16 shrink-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center h-9 w-9 rounded-full bg-surface hover:bg-surface-hover border border-border transition-all duration-150"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <TaskForm />
      </div>
    </header>
  );
}
