"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Clock,
  CheckCircle2,
  Cpu,
  Zap,
  Plus,
  Users,
  CircleDot,
  WifiOff,
} from "lucide-react";
import Link from "next/link";

const roleStyles: Record<string, string> = {
  orchestrator: "bg-purple-500/15 text-purple-400",
  worker: "bg-blue-500/15 text-blue-400",
  reviewer: "bg-amber-500/15 text-amber-400",
};

const statusStyles: Record<string, string> = {
  idle: "bg-emerald-500/15 text-emerald-400",
  busy: "bg-amber-500/15 text-amber-400",
  offline: "bg-red-500/15 text-red-400",
};

const specStyles: Record<string, string> = {
  backend: "bg-blue-500/15 text-blue-400",
  frontend: "bg-purple-500/15 text-purple-400",
  infra: "bg-orange-500/15 text-orange-400",
  docs: "bg-zinc-500/15 text-zinc-400",
  general: "bg-teal-500/15 text-teal-400",
};

const statusDotColor: Record<string, string> = {
  idle: "bg-emerald-500",
  busy: "bg-amber-500",
  offline: "bg-red-500",
};

function heartbeatColor(lastHeartbeat?: number): string {
  if (!lastHeartbeat) return "bg-zinc-500";
  const diff = Date.now() - lastHeartbeat;
  if (diff < 2 * 60 * 1000) return "bg-emerald-500";
  if (diff < 5 * 60 * 1000) return "bg-amber-500";
  return "bg-red-500";
}

function heartbeatLabel(lastHeartbeat?: number): string {
  if (!lastHeartbeat) return "No heartbeat";
  const diff = Date.now() - lastHeartbeat;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export default function AgentsPage() {
  const { workspaceId } = useWorkspace();
  const agents = useQuery(api.agents.list, workspaceId ? { workspaceId } : "skip");
  const registerAgent = useMutation(api.agents.register);

  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"orchestrator" | "worker" | "reviewer">("worker");
  const [specialization, setSpecialization] = useState<string>("");
  const [repos, setRepos] = useState("");
  const [model, setModel] = useState("");

  const idle = agents?.filter((a: any) => a.status === "idle").length ?? 0;
  const busy = agents?.filter((a: any) => a.status === "busy").length ?? 0;
  const offline = agents?.filter((a: any) => a.status === "offline").length ?? 0;
  const total = agents?.length ?? 0;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!agentId.trim() || !name.trim()) return;

    await registerAgent({
      workspaceId: workspaceId!,
      agentId: agentId.trim(),
      name: name.trim(),
      role,
      specialization: specialization ? (specialization as any) : undefined,
      repos: repos.trim() ? repos.split(",").map((r) => r.trim()).filter(Boolean) : undefined,
      model: model.trim() || undefined,
    });

    setAgentId("");
    setName("");
    setRole("worker");
    setSpecialization("");
    setRepos("");
    setModel("");
    setOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Agents" subtitle="Multi-agent orchestration" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c63ff]/15">
                <Users className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-[11px] text-muted-foreground">Total Agents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <CircleDot className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{idle}</p>
                <p className="text-[11px] text-muted-foreground">Idle</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{busy}</p>
                <p className="text-[11px] text-muted-foreground">Busy</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                <WifiOff className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offline}</p>
                <p className="text-[11px] text-muted-foreground">Offline</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Register Button */}
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0" />
              }
            >
              <Plus className="h-4 w-4" data-icon="inline-start" />
              Register Agent
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Register Agent</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Agent ID</label>
                    <Input
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      placeholder="e.g. agent-01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My Agent"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={role} onValueChange={(v) => setRole(v as any)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orchestrator">Orchestrator</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Specialization</label>
                    <Input
                      placeholder="e.g. backend, frontend, devops"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="h-8 text-xs bg-surface"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repos (comma-separated)</label>
                  <Input
                    value={repos}
                    onChange={(e) => setRepos(e.target.value)}
                    placeholder="e.g. backend-api, frontend-app"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. claude-opus-4-6"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!agentId.trim() || !name.trim()}
                    className="bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
                  >
                    Register
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Agent Cards */}
        {!agents ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Bot className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No agents registered yet</p>
            <p className="text-xs mt-1">Use the Register Agent button above</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent: any) => (
              <Card key={agent._id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] shadow-sm">
                        <Bot className="h-5 w-5 text-white" />
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${statusDotColor[agent.status] || "bg-zinc-500"}`}>
                          {agent.status === "busy" && (
                            <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-75" />
                          )}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                        <p className="text-[11px] text-muted-foreground font-mono">{agent.agentId}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] ${statusStyles[agent.status] || ""}`}>
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={`text-[10px] ${roleStyles[agent.role] || ""}`}>
                      {agent.role}
                    </Badge>
                    {agent.specialization && (
                      <Badge className={`text-[10px] ${specStyles[agent.specialization] || ""}`}>
                        {agent.specialization}
                      </Badge>
                    )}
                    {agent.model && (
                      <Badge className="text-[10px] bg-zinc-500/15 text-zinc-400">
                        {agent.model}
                      </Badge>
                    )}
                  </div>

                  {agent.repos && agent.repos.length > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-medium">Repos:</span> {agent.repos.join(", ")}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{agent.tasksCompleted || 0} tasks</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{agent.totalExecutionTimeMs ? formatMs(agent.totalExecutionTimeMs) : "0s"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Cpu className="h-3 w-3" />
                      <span>Avg: {agent.avgTaskTimeMs ? formatMs(agent.avgTaskTimeMs) : "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Zap className="h-3 w-3" />
                      <span className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${heartbeatColor(agent.lastHeartbeat)}`} />
                        {heartbeatLabel(agent.lastHeartbeat)}
                      </span>
                    </div>
                  </div>

                  {agent.status === "busy" && agent.currentTaskId && (
                    <Link href={`/tasks/${agent.currentTaskId}`}>
                      <div className="rounded-md border border-accent-light/20 bg-accent-glow p-2 mt-2 hover:border-accent-light/40 transition-colors cursor-pointer">
                        <p className="text-[10px] uppercase tracking-wider text-accent-light font-semibold mb-0.5">Current Task</p>
                        <p className="text-xs text-foreground truncate">{agent.currentTaskId}</p>
                      </div>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
