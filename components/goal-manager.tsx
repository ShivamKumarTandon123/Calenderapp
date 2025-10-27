"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar, CheckCircle2, TrendingUp, Edit, Trash2 } from "lucide-react"

interface Goal {
  id: string
  title: string
  description: string
  category: "work" | "personal" | "health" | "learning"
  priority: "critical" | "high" | "medium" | "low"
  progress: number
  targetDate: string
  tasks: Task[]
  createdAt: string
}

interface Task {
  id: string
  title: string
  completed: boolean
  priority: "critical" | "high" | "medium" | "low"
  dueDate?: string
  estimatedHours?: number
}

const sampleGoals: Goal[] = [
  {
    id: "1",
    title: "Launch Product MVP",
    description: "Complete and launch the minimum viable product for our new application",
    category: "work",
    priority: "critical",
    progress: 65,
    targetDate: "2024-12-31",
    createdAt: "2024-01-15",
    tasks: [
      { id: "1-1", title: "Complete user authentication", completed: true, priority: "high" },
      { id: "1-2", title: "Build dashboard interface", completed: true, priority: "high" },
      { id: "1-3", title: "Implement core features", completed: false, priority: "critical" },
      { id: "1-4", title: "User testing and feedback", completed: false, priority: "medium" },
      { id: "1-5", title: "Deploy to production", completed: false, priority: "high" },
    ],
  },
  {
    id: "2",
    title: "Complete Marathon Training",
    description: "Train consistently to complete a full marathon in under 4 hours",
    category: "health",
    priority: "high",
    progress: 80,
    targetDate: "2024-10-15",
    createdAt: "2024-06-01",
    tasks: [
      { id: "2-1", title: "Build base mileage (30 mpw)", completed: true, priority: "high" },
      { id: "2-2", title: "Complete long runs (18+ miles)", completed: true, priority: "critical" },
      { id: "2-3", title: "Speed work sessions", completed: false, priority: "medium" },
      { id: "2-4", title: "Taper and race preparation", completed: false, priority: "high" },
    ],
  },
  {
    id: "3",
    title: "Learn Advanced React Patterns",
    description: "Master advanced React concepts including performance optimization and design patterns",
    category: "learning",
    priority: "medium",
    progress: 40,
    targetDate: "2024-11-30",
    createdAt: "2024-08-01",
    tasks: [
      { id: "3-1", title: "Study React Server Components", completed: true, priority: "high" },
      { id: "3-2", title: "Build practice projects", completed: false, priority: "medium" },
      { id: "3-3", title: "Performance optimization techniques", completed: false, priority: "high" },
      { id: "3-4", title: "Complete certification", completed: false, priority: "low" },
    ],
  },
]

const categoryColors = {
  work: "bg-[color:var(--goal-work)]",
  personal: "bg-[color:var(--goal-personal)]",
  health: "bg-[color:var(--goal-health)]",
  learning: "bg-[color:var(--goal-learning)]",
}

const priorityColors = {
  critical: "bg-[color:var(--priority-critical)]",
  high: "bg-[color:var(--priority-high)]",
  medium: "bg-[color:var(--priority-medium)]",
  low: "bg-[color:var(--priority-low)]",
}

export function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>(sampleGoals)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const getDaysUntilTarget = (targetDate: string) => {
    const target = new Date(targetDate)
    const today = new Date()
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getCompletedTasksCount = (tasks: Task[]) => {
    return tasks.filter((task) => task.completed).length
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Goals & Objectives</h1>
          <p className="text-muted-foreground">Track your progress and achieve your targets</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Goal title" />
              <Textarea placeholder="Description" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" placeholder="Target date" />
              <div className="flex space-x-2">
                <Button className="flex-1">Create Goal</Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const daysLeft = getDaysUntilTarget(goal.targetDate)
          const completedTasks = getCompletedTasksCount(goal.tasks)
          const totalTasks = goal.tasks.length

          return (
            <Card
              key={goal.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-card-foreground">{goal.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${categoryColors[goal.category]}`} />
                    <Badge className={`text-xs ${priorityColors[goal.priority]} text-white`}>{goal.priority}</Badge>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--priority-low)]" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {completedTasks}/{totalTasks} tasks
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-[color:var(--goal-work)]" />
                    </div>
                    <div className="text-xs text-muted-foreground">{goal.category}</div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl">{selectedGoal.title}</DialogTitle>
                  <p className="text-muted-foreground">{selectedGoal.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-2xl font-bold">{selectedGoal.progress}%</span>
                </div>
                <Progress value={selectedGoal.progress} className="h-3" />
              </div>

              {/* Goal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Category</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${categoryColors[selectedGoal.category]}`} />
                    <span className="capitalize">{selectedGoal.category}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Priority</span>
                  <Badge className={`${priorityColors[selectedGoal.priority]} text-white`}>
                    {selectedGoal.priority}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Target Date</span>
                  <span>{new Date(selectedGoal.targetDate).toLocaleDateString()}</span>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Days Remaining</span>
                  <span>{getDaysUntilTarget(selectedGoal.targetDate)} days</span>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Tasks</h4>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedGoal.tasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <input type="checkbox" checked={task.completed} className="rounded border-border" readOnly />
                      <div className="flex-1">
                        <span
                          className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <Badge className={`text-xs ${priorityColors[task.priority]} text-white`}>{task.priority}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
