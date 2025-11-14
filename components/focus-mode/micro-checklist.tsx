"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">Session Checklist</h3>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600">{completion}%</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors"
          >
            <Checkbox
              id={item.id}
              checked={item.completed}
              onCheckedChange={() => handleToggle(item.id)}
              className="mt-0.5 h-5 w-5 rounded-md border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
                className="flex-1 h-9 text-sm"
              />
            ) : (
              <label
                htmlFor={item.id}
                className={`flex-1 text-sm leading-relaxed cursor-pointer transition-colors ${
                  item.completed
                    ? "line-through text-gray-400"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onDoubleClick={() => setEditingId(item.id)}
              >
                {item.text}
              </label>
            )}
            <button
              onClick={() => handleDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Input
          placeholder="Add a step..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAdd();
            }
          }}
          className="flex-1 h-10 border-2 border-gray-200 focus:border-blue-400 rounded-lg"
        />
        <Button
          onClick={handleAdd}
          disabled={!newItemText.trim()}
          size="icon"
          className="h-10 w-10 bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
