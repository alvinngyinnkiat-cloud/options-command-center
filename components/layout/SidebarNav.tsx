"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface SidebarNavProps {
  onClose: () => void;
}

export function SidebarNav({ onClose }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3">
      {NAV_SECTIONS.map((section, sectionIndex) => (
        <div
          key={section.label}
          className={cn(sectionIndex > 0 && "mt-5 pt-5 border-t border-terminal-border/60")}
        >
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-terminal-muted/80">
            {section.label}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
                      "text-terminal-muted hover:bg-terminal-elevated hover:text-terminal-text border border-transparent",
                      isActive &&
                        "bg-accent/15 text-accent border-accent/20 hover:text-accent"
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span
                          className={cn(
                            "hidden lg:block text-[11px] leading-snug mt-0.5 truncate text-terminal-muted",
                            isActive && "text-accent/70"
                          )}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
