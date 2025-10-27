"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { type Task, formatDueDate, isTaskOverdue } from "@/lib/tasks"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  onToggleComplete: (taskId: string, isCompleted: boolean) => void
  onToggleStarred: (taskId: string, isStarred: boolean) => void
  onClick: (task: Task) => void
}

export function TaskCard({ task, onToggleComplete, onToggleStarred, onClick }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const dueDateText = formatDueDate(task.due_date)
  const isOverdue = isTaskOverdue(task.due_date)

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-all cursor-pointer",
        task.is_completed && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(task)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={(checked) => onToggleComplete(task.id, checked as boolean)}
          className="mt-0.5"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "text-sm font-medium text-gray-900 break-words",
              task.is_completed && "line-through text-gray-500"
            )}
          >
            {task.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStarred(task.id, !task.is_starred)
            }}
            className={cn(
              "flex-shrink-0 p-1 rounded transition-colors",
              task.is_starred
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-300 hover:text-gray-400",
              !task.is_starred && !isHovered && "opacity-0 group-hover:opacity-100"
            )}
          >
            <Star className={cn("h-4 w-4", task.is_starred && "fill-current")} />
          </button>
        </div>

        {task.notes && (
          <p className="mt-1 text-xs text-gray-600 line-clamp-2 break-words">
            {task.notes}
          </p>
        )}

        {dueDateText && (
          <div className="mt-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-normal",
                isOverdue
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              {dueDateText}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
