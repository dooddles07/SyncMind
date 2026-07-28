"use client";

import { CheckSquare, Menu, Mic, Settings, Upload, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Meetings", icon: Mic },
  { href: "/tasks", label: "To-dos", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation so the next page is not hidden behind it
  useEffect(() => setOpen(false), [pathname]);

  const list = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-done-soft text-done-text"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border"
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <Link href="/dashboard">
          <Wordmark />
        </Link>
        <ThemeToggle className="ml-auto" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-9 items-center justify-center rounded-md border border-border"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <Button asChild>
              <Link href="/upload">
                <Upload className="size-4" aria-hidden />
                New meeting
              </Link>
            </Button>
            {list}
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r border-border p-4 lg:flex">
        <Link href="/dashboard" className="px-1 pt-2">
          <Wordmark />
        </Link>
        <Button asChild>
          <Link href="/upload">
            <Upload className="size-4" aria-hidden />
            New meeting
          </Link>
        </Button>
        {list}
        <div className="mt-auto flex items-center justify-between rounded-md border border-border p-2">
          <span className="px-1 text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
