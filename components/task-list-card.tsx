"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreVertical, Plus, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskCard } from "./task-card"
import { type Task } from "@/lib/tasks"
import { type TaskList } from "@/lib/task-lists"
import { cn } from "@/lib/utils"

interface TaskListCardProps {
  list: TaskList
  tasks: Task[]
  onAddTask: (listId: string, title: string) => void
  onToggleComplete: (taskId: string, isCompleted: boolean) => void
  onToggleStarred: (taskId: string, isStarred: boolean) => void
  onTaskClick: (task: Task) => void
  onEditList: (listId: string) => void
  onDeleteList: (listId: string) => void
}

export function TaskListCard({
  list,
  tasks,
  onAddTask,
  onToggleComplete,
  onToggleStarred,
  onTaskClick,
  onEditList,
  onDeleteList,
}: TaskListCardProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return

    onAddTask(list.id, newTaskTitle.trim())
    setNewTaskTitle("")
    setIsAddingTask(false)
  }

  const incompleteTasks = tasks.filter(t => !t.is_completed)
  const completedTasks = tasks.filter(t => t.is_completed)

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: list.color }}
            />
            <h2 className="text-lg font-semibold text-gray-900">{list.name}</h2>
            <span className="text-sm text-gray-500">
              {incompleteTasks.length}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditList(list.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit List
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteList(list.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {incompleteTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onToggleStarred={onToggleStarred}
            onClick={onTaskClick}
          />
        ))}

        {completedTasks.length > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Completed ({completedTasks.length})
            </p>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onToggleStarred={onToggleStarred}
                  onClick={onTaskClick}
                />
              ))}
            </div>
          </div>
        )}

        {isAddingTask ? (
          <div className="pt-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') {
                  setIsAddingTask(false)
                  setNewTaskTitle("")
                }
              }}
              onBlur={() => {
                if (newTaskTitle.trim()) {
                  handleAddTask()
                } else {
                  setIsAddingTask(false)
                }
              }}
              placeholder="Task title"
              className="h-9 text-sm"
              autoFocus
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50 mt-2"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a task
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
