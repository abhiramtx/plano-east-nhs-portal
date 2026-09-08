import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Globe } from "lucide-react";
import type { Club } from "@/lib/firebase";

interface ClubPageHeaderProps {
  club: Club;
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function ClubPageHeader({
  club,
  title,
  description,
  icon: Icon = Globe,
  actions,
}: ClubPageHeaderProps) {
  return (
    <div className="flex flex-col items-stretch gap-4 pt-10 sm:flex-row sm:items-center sm:justify-between lg:pt-0">
      <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
          style={{ backgroundColor: club.color }}
        >
          <Icon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0">
          <h1 className="page-title break-words text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <div className="line-clamp-2 text-sm text-muted-foreground sm:truncate">{description}</div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}