"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ChecklistItem, calculateChecklistCompletion } from "@/lib/focus-mode-utils"

type MicroChecklistProps = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
};

export function MicroChecklist({ items, onChange }: MicroChecklistProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const completion = calculateChecklistCompletion(items);

  const handleToggle = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleEdit = (id: string, text: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        text: newItemText.trim(),
        completed: false,
      };
      onChange([...items, newItem]);
      setNewItemText("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Session Checklist</h3>
        <span className="text-sm text-gray-500">{completion}% complete</span>
      </div>

      <Progress value={completion} className="h-1.5" />

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 group"
          >
            <GripVertical className="h-4 w-4 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Checkbox
              id={item.id}
              checked={item.completed}
              onCheckedChange={() => handleToggle(item.id)}
              className="mt-1"
            />
            {editingId === item.id ? (
              <Input
                autoFocus
                defaultValue={item.text}
                onBlur={(e) => handleEdit(item.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEdit(item.id, e.currentTarget.value);
                  }
                  if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                className="flex-1 h-8"
              />
            ) : (
              <label
                htmlFor={item.id}
                className={`flex-1 text-sm cursor-pointer ${
                  item.completed
                    ? "line-through text-gray-400"
                    : "text-gray-700"
                }`}
                onDoubleClick={() => setEditingId(item.id)}
              >
                {item.text}
              </label>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.id)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a new step..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAdd();
            }
          }}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={!newItemText.trim()} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
