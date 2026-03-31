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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Layers,
  Plus,
  Zap,
  Hash,
  Globe,
  Loader2,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";
import Link from "next/link";

export default function FeaturesPage() {
  const { workspaceId } = useWorkspace();
  const features = useQuery(api.features.list, workspaceId ? { workspaceId } : "skip");
  const createFeature = useMutation(api.features.create);

  const [open, setOpen] = useState(false);
  const [featureId, setFeatureId] = useState("");
  const [name, setName] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [maxParallel, setMaxParallel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!featureId.trim() || !name.trim()) return;

    await createFeature({
      workspaceId: workspaceId!,
      featureId: featureId.trim(),
      name: name.trim(),
      autoAdvance,
      maxParallel: maxParallel ? parseInt(maxParallel, 10) : undefined,
      webhookUrl: webhookUrl.trim() || undefined,
    });

    setFeatureId("");
    setName("");
    setAutoAdvance(false);
    setMaxParallel("");
    setWebhookUrl("");
    setOpen(false);
  }

  const total = features?.length ?? 0;
  const withAutoAdvance = features?.filter((f: any) => f.autoAdvance).length ?? 0;
  const withWebhook = features?.filter((f: any) => f.webhookUrl).length ?? 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Features" subtitle="Multi-repo feature orchestration" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c63ff]/15">
                <Layers className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-[11px] text-muted-foreground">Total Features</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{withAutoAdvance}</p>
                <p className="text-[11px] text-muted-foreground">Auto-Advance</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Globe className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{withWebhook}</p>
                <p className="text-[11px] text-muted-foreground">With Webhook</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0" />
              }
            >
              <Plus className="h-4 w-4" data-icon="inline-start" />
              New Feature
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Feature</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Feature ID</label>
                    <Input
                      value={featureId}
                      onChange={(e) => setFeatureId(e.target.value)}
                      placeholder="e.g. auth-v2"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Auth V2 Migration"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Parallel</label>
                    <Input
                      type="number"
                      min="1"
                      value={maxParallel}
                      onChange={(e) => setMaxParallel(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auto-Advance</label>
                    <button
                      type="button"
                      onClick={() => setAutoAdvance(!autoAdvance)}
                      className={`flex items-center gap-2 w-full h-9 px-3 rounded-md border text-sm transition-colors ${
                        autoAdvance
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {autoAdvance ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                      {autoAdvance ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!featureId.trim() || !name.trim()}
                    className="bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Feature Cards */}
        {!features ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : features.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Layers className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No features created yet</p>
            <p className="text-xs mt-1">Use the New Feature button above</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature: any) => (
              <Link key={feature._id} href={`/features/${feature.featureId}`}>
                <Card className="bg-card border-border hover:border-accent-light/30 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">{feature.name}</CardTitle>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{feature.featureId}</p>
                      </div>
                      {feature.autoAdvance && (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400">
                          auto-advance
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {feature.maxParallel && (
                        <Badge className="text-[10px] bg-blue-500/15 text-blue-400">
                          <Hash className="h-3 w-3 mr-0.5" />
                          max {feature.maxParallel}
                        </Badge>
                      )}
                      {feature.webhookUrl && (
                        <Badge className="text-[10px] bg-amber-500/15 text-amber-400">
                          <Globe className="h-3 w-3 mr-0.5" />
                          webhook
                        </Badge>
                      )}
                    </div>
                    {feature.webhookUrl && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {feature.webhookUrl}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
