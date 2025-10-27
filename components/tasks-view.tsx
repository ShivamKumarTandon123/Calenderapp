"use client"

import { useState, useEffect } from "react"
import { TaskListCard } from "./task-list-card"
import { TaskSidebar } from "./task-sidebar"
import { TaskDetailDialog } from "./task-detail-dialog"
import { getTaskLists, deleteTaskList, type TaskList } from "@/lib/task-lists"
import { getTasks, createTask, updateTask, deleteTask, toggleTaskComplete, toggleTaskStarred, type Task } from "@/lib/tasks"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function TasksView() {
  const [userId] = useState('anonymous-user')
  const [activeFilter, setActiveFilter] = useState('all')
  const [lists, setLists] = useState<TaskList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [listToDelete, setListToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [listsData, tasksData] = await Promise.all([
        getTaskLists(userId),
        getTasks(userId)
      ])
      setLists(listsData)
      setTasks(tasksData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTask = async (listId: string, title: string) => {
    try {
      const newTask = await createTask(userId, listId, title)
      setTasks(prev => [...prev, newTask])
      toast.success('Task created')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const handleToggleComplete = async (taskId: string, isCompleted: boolean) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, is_completed: isCompleted } : t)
    )

    try {
      await toggleTaskComplete(taskId, isCompleted)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
      await loadData()
    }
  }

  const handleToggleStarred = async (taskId: string, isStarred: boolean) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, is_starred: isStarred } : t)
    )

    try {
      await toggleTaskStarred(taskId, isStarred)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
      await loadData()
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates)
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, ...updates } : t)
      )
      toast.success('Task updated')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setSelectedTask(null)
      toast.success('Task deleted')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteTaskList(listId)
      setLists(prev => prev.filter(l => l.id !== listId))
      setTasks(prev => prev.filter(t => t.list_id !== listId))
      setListToDelete(null)
      toast.success('List deleted')
    } catch (error) {
      console.error('Error deleting list:', error)
      toast.error('Failed to delete list')
    }
  }

  const getFilteredLists = () => {
    if (activeFilter === 'all') {
      return lists.filter(l => l.is_visible)
    }
    if (activeFilter === 'starred') {
      return []
    }
    if (activeFilter.startsWith('list:')) {
      const listId = activeFilter.replace('list:', '')
      return lists.filter(l => l.id === listId)
    }
    return lists.filter(l => l.is_visible)
  }

  const getFilteredTasks = (listId: string) => {
    let filtered = tasks.filter(t => t.list_id === listId)

    if (activeFilter === 'starred') {
      filtered = filtered.filter(t => t.is_starred)
    }

    return filtered
  }

  const getStarredTasks = () => {
    return tasks.filter(t => t.is_starred && !t.is_completed)
  }

  const filteredLists = getFilteredLists()

  return (
    <div className="flex h-screen bg-gray-50">
      <TaskSidebar
        userId={userId}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : activeFilter === 'starred' ? (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Starred Tasks</h1>
            {getStarredTasks().length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No starred tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getStarredTasks().map(task => (
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.is_completed}
                        onChange={(e) => handleToggleComplete(task.id, e.target.checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                        {task.notes && (
                          <p className="text-xs text-gray-600 mt-1">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No lists yet</h2>
              <p className="text-gray-600">Create your first list to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
            {filteredLists.map(list => (
              <TaskListCard
                key={list.id}
                list={list}
                tasks={getFilteredTasks(list.id)}
                onAddTask={handleAddTask}
                onToggleComplete={handleToggleComplete}
                onToggleStarred={handleToggleStarred}
                onTaskClick={setSelectedTask}
                onEditList={(listId) => {
                  toast.info('Edit list feature coming soon')
                }}
                onDeleteList={setListToDelete}
              />
            ))}
          </div>
        )}
      </main>

      <TaskDetailDialog
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      <AlertDialog open={!!listToDelete} onOpenChange={() => setListToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the list and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => listToDelete && handleDeleteList(listToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
