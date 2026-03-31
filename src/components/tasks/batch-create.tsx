"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Trash2,
} from "lucide-react";

type BatchTask = {
  title: string;
  description?: string;
  priority?: "urgent" | "high" | "medium" | "low" | "backlog";
  repo?: string;
  branch?: string;
  featureId?: string;
  featureName?: string;
  taskNumber?: number;
  dependsOnIndex?: number[];
  estimatedMinutes?: number;
};

type InputMode = "json" | "form";

const EMPTY_TASK: BatchTask = { title: "", priority: "high" };

export function BatchCreate() {
  const { workspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>("form");
  const [jsonInput, setJsonInput] = useState("");
  const [tasks, setTasks] = useState<BatchTask[]>([{ ...EMPTY_TASK }]);
  const [featureId, setFeatureId] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createBatch = useMutation(api.tasks.createBatch);

  function addTask() {
    setTasks((prev) => [...prev, { ...EMPTY_TASK }]);
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTaskField(index: number, field: keyof BatchTask, value: any) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function reset() {
    setTasks([{ ...EMPTY_TASK }]);
    setJsonInput("");
    setFeatureId("");
    setFeatureName("");
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      let batchTasks: any[];

      if (mode === "json") {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of task objects");
        batchTasks = parsed;
      } else {
        batchTasks = tasks
          .filter((t) => t.title.trim())
          .map((t, i) => ({
            ...t,
            title: t.title.trim(),
            featureId: featureId || undefined,
            featureName: featureName || undefined,
            taskNumber: i + 1,
          }));
      }

      if (batchTasks.length === 0) {
        setError("No valid tasks to create");
        setSubmitting(false);
        return;
      }

      const res = await createBatch({ workspaceId: workspaceId!, tasks: batchTasks });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={
        <Button
          size="sm"
          className="rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Batch Create
        </Button>
      } />
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent-light" />
            Batch Create Tasks
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 rounded-lg border border-border bg-surface w-fit">
          <button
            onClick={() => setMode("form")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "form" ? "bg-accent-glow text-accent-light" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Form
          </button>
          <button
            onClick={() => setMode("json")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "json" ? "bg-accent-glow text-accent-light" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            JSON
          </button>
        </div>

        {mode === "json" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste an array of task objects. Supports: title, description, priority, repo, branch, featureId, featureName, taskNumber, dependsOnIndex, estimatedMinutes.
            </p>
            <Textarea
              placeholder={'[\n  { "title": "Setup backend", "priority": "high", "repo": "api" },\n  { "title": "Setup frontend", "dependsOnIndex": [0] }\n]'}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[200px] font-mono text-xs bg-surface"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Feature context */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                  Feature ID
                </label>
                <Input
                  placeholder="e.g. FEAT-001"
                  value={featureId}
                  onChange={(e) => setFeatureId(e.target.value)}
                  className="h-8 text-xs bg-surface"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                  Feature Name
                </label>
                <Input
                  placeholder="e.g. User Auth"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  className="h-8 text-xs bg-surface"
                />
              </div>
            </div>

            <Separator />

            {/* Task rows */}
            <div className="space-y-3">
              {tasks.map((task, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border p-3 space-y-2 relative"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground tabular-nums font-mono w-5 shrink-0">
                      #{i + 1}
                    </span>
                    <Input
                      placeholder="Task title *"
                      value={task.title}
                      onChange={(e) => updateTaskField(i, "title", e.target.value)}
                      className="h-8 text-xs flex-1 bg-surface"
                    />
                    <select
                      value={task.priority ?? "high"}
                      onChange={(e) => updateTaskField(i, "priority", e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="backlog">Backlog</option>
                    </select>
                    {tasks.length > 1 && (
                      <button
                        onClick={() => removeTask(i)}
                        className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    <Input
                      placeholder="Repo"
                      value={task.repo ?? ""}
                      onChange={(e) => updateTaskField(i, "repo", e.target.value || undefined)}
                      className="h-7 text-[11px] bg-surface"
                    />
                    <Input
                      placeholder="Branch"
                      value={task.branch ?? ""}
                      onChange={(e) => updateTaskField(i, "branch", e.target.value || undefined)}
                      className="h-7 text-[11px] bg-surface"
                    />
                  </div>
                  <div className="pl-7">
                    <Input
                      placeholder="Depends on (comma-separated indices, e.g. 0,1)"
                      value={task.dependsOnIndex?.join(",") ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val.trim()) {
                          updateTaskField(i, "dependsOnIndex", undefined);
                        } else {
                          const indices = val.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
                          updateTaskField(i, "dependsOnIndex", indices);
                        }
                      }}
                      className="h-7 text-[11px] bg-surface"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addTask}
              className="rounded-full w-full"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>
        )}

        {/* Error / Result */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Created {result.created} tasks
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose render={
            <Button variant="outline" size="sm" className="rounded-full">
              {result ? "Close" : "Cancel"}
            </Button>
          } />
          {!result && (
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
              Create {mode === "json" ? "Batch" : `${tasks.filter((t) => t.title.trim()).length} Tasks`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
