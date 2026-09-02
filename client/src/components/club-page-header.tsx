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
    <div className="flex items-center justify-between gap-4 pt-10 lg:pt-0">
      <div className="flex min-w-0 items-center space-x-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: club.color }}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="page-title truncate text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <div className="truncate text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 items-center space-x-2">{actions}</div>}
    </div>
  );
}