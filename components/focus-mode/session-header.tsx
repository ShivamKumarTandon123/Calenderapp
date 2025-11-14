"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CheckSquare, ChevronDown } from "lucide-react"
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
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="flex items-center gap-1.5">
            <SourceIcon className="h-3 w-3" />
            {item.type === "event" ? "Event" : "Task"}
          </Badge>
          {item.source && (
            <span className="text-xs text-gray-500">{item.source}</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {item.type === "event" ? (
            <>
              <span>{format(item.start, "h:mm a")}</span>
              <span>-</span>
              <span>{format(item.end, "h:mm a")}</span>
            </>
          ) : (
            <span>Due: {format(item.end, "MMM d, yyyy")}</span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onChangeItem}
        className="flex items-center gap-1.5"
      >
        Change
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
