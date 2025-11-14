"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CheckSquare, RefreshCw } from "lucide-react"
import { FocusItem } from "@/lib/focus-mode-utils"
import { format } from "date-fns"

type SessionHeaderProps = {
  item: FocusItem;
  onChangeItem: () => void;
};

export function SessionHeader({ item, onChangeItem }: SessionHeaderProps) {
  const sourceIcon = item.type === "event" ? Calendar : CheckSquare;
  const SourceIcon = sourceIcon;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200/50 rounded-full"
          >
            <SourceIcon className="h-3 w-3" />
            {item.type === "event" ? "Event" : "Task"}
          </Badge>
          {item.source && (
            <span className="text-xs text-gray-500 font-medium">{item.source}</span>
          )}
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 leading-tight tracking-tight">
          {item.title}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {item.type === "event" ? (
            <span className="font-medium">
              {format(item.start, "h:mm a")} - {format(item.end, "h:mm a")}
            </span>
          ) : (
            <span className="font-medium">Due: {format(item.end, "MMM d, yyyy")}</span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onChangeItem}
        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-3 shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Change</span>
      </Button>
    </div>
  );
}
