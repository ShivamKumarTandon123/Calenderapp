import { supabase } from './supabase'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'

export type Task = {
  id: string
  user_id: string
  list_id: string
  title: string
  notes: string
  due_date: string | null
  is_completed: boolean
  is_starred: boolean
  position: number
  created_at: string
  updated_at: string
}

export type TaskWithList = Task & {
  task_lists?: {
    name: string
    color: string
  }
}

export async function getTasks(
  userId: string,
  filters?: {
    listId?: string
    isStarred?: boolean
    isCompleted?: boolean
  }
): Promise<TaskWithList[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_lists (
        name,
        color
      )
    `)
    .eq('user_id', userId)

  if (filters?.listId) {
    query = query.eq('list_id', filters.listId)
  }

  if (filters?.isStarred !== undefined) {
    query = query.eq('is_starred', filters.isStarred)
  }

  if (filters?.isCompleted !== undefined) {
    query = query.eq('is_completed', filters.isCompleted)
  }

  const { data, error } = await query.order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`)
  }

  return data || []
}

export async function createTask(
  userId: string,
  listId: string,
  title: string,
  options?: {
    notes?: string
    dueDate?: string
    isStarred?: boolean
  }
): Promise<Task> {
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existingTasks && existingTasks.length > 0
    ? existingTasks[0].position + 1
    : 0

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: listId,
      title,
      notes: options?.notes || '',
      due_date: options?.dueDate || null,
      is_starred: options?.isStarred || false,
      position: nextPosition,
      is_completed: false
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }

  return data
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'notes' | 'due_date' | 'is_completed' | 'is_starred' | 'position'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`)
  }

  return data
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`)
  }
}

export async function toggleTaskComplete(taskId: string, isCompleted: boolean): Promise<Task> {
  return updateTask(taskId, { is_completed: isCompleted })
}

export async function toggleTaskStarred(taskId: string, isStarred: boolean): Promise<Task> {
  return updateTask(taskId, { is_starred: isStarred })
}

export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null

  try {
    const date = parseISO(dueDate)
    const isOverdue = isPast(date) && new Date().toDateString() !== date.toDateString()

    if (isOverdue) {
      return `${formatDistanceToNow(date)} ago`
    }

    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return null
  }
}

export function isTaskOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false

  try {
    const date = parseISO(dueDate)
    return isPast(date) && new Date().toDateString() !== date.toDateString()
  } catch {
    return false
  }
}

export async function reorderTask(
  taskId: string,
  newPosition: number
): Promise<void> {
  await updateTask(taskId, { position: newPosition })
}
