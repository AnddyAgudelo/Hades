"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const createWorkspace = useMutation(api.workspaces.create);
  const { setWorkspaceId, userId, workspaces } = useWorkspace();
  const router = useRouter();

  const handleSlugGenerate = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  // Once workspaces appear (reactive from Convex), navigate to dashboard
  if (created && workspaces.length > 0) {
    router.push("/");
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  const handleCreate = async () => {
    if (!name || !slug) return;
    setLoading(true);
    try {
      const result = await createWorkspace({
        name,
        slug,
        description: description || undefined,
        ownerId: userId!,
      });
      setWorkspaceId(result.id);
      setCreated(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] text-white shadow-lg shadow-[#6c63ff]/20 mb-4">
            <Layers className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Create your workspace</CardTitle>
          <CardDescription>
            A workspace groups your tasks, agents, and knowledge hub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace name</label>
            <Input
              placeholder="My Team"
              value={name}
              onChange={(e) => handleSlugGenerate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <Input
              placeholder="my-team"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">URL-safe identifier</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              placeholder="What this workspace is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            className="w-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
            onClick={handleCreate}
            disabled={!name || !slug || loading}
          >
            {loading ? "Creating..." : "Create Workspace"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
