"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Trash2, Calendar as CalendarIcon } from "lucide-react"
import { type Task } from "@/lib/tasks"
import { format } from "date-fns"

interface TaskDetailDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
}

export function TaskDetailDialog({ task, isOpen, onClose, onUpdate, onDelete }: TaskDetailDialogProps) {
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isStarred, setIsStarred] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setNotes(task.notes || "")
      setDueDate(task.due_date || "")
      setIsStarred(task.is_starred)
    }
  }, [task])

  const handleSave = () => {
    if (!task) return

    onUpdate(task.id, {
      title: title.trim(),
      notes: notes.trim(),
      due_date: dueDate || null,
      is_starred: isStarred
    })
    onClose()
  }

  const handleDelete = () => {
    if (!task) return
    onDelete(task.id)
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Task</DialogTitle>
            <button
              onClick={() => {
                setIsStarred(!isStarred)
              }}
              className={`p-2 rounded-full transition-colors ${
                isStarred
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-gray-300 hover:text-gray-400"
              }`}
            >
              <Star className={`h-5 w-5 ${isStarred ? "fill-current" : ""}`} />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add detailed notes..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <div className="flex items-center gap-2">
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {dueDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDueDate("")}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
