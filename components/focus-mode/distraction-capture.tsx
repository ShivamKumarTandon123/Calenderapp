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
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-yellow-100 rounded-lg">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Later Notes</h3>
      </div>
      <Textarea
        placeholder="Jot down thoughts or tasks that come up during this session... (one per line)"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] resize-none border-2 border-gray-200 focus:border-blue-400 rounded-xl text-sm leading-relaxed"
      />
      <p className="text-xs text-gray-500 leading-relaxed">
        Capture ideas without losing focus. These can be converted to tasks when the session ends.
      </p>
    </div>
  );
}
