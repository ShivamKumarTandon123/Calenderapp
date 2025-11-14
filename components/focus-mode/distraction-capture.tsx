"use client"

import { Textarea } from "@/components/ui/textarea"
import { Lightbulb } from "lucide-react"

type DistractionCaptureProps = {
  notes: string;
  onChange: (notes: string) => void;
};

export function DistractionCapture({ notes, onChange }: DistractionCaptureProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <h3 className="text-sm font-semibold text-gray-700">Later Notes</h3>
      </div>
      <Textarea
        placeholder="Thoughts or tasks that come up during this session... (one per line)"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px] resize-none"
      />
      <p className="text-xs text-gray-500">
        Capture ideas without losing focus. These can be converted to tasks when the session ends.
      </p>
    </div>
  );
}
