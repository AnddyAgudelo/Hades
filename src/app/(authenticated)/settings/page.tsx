"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Users,
  Key,
  Copy,
  Trash2,
  Plus,
  Shield,
  Eye,
  Wrench,
  Check,
} from "lucide-react";

type Role = "admin" | "operator" | "viewer";

const roleBadgeStyles: Record<Role, string> = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  operator: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  viewer: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const roleIcons: Record<Role, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  operator: <Wrench className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleBadgeStyles[role]}`}
    >
      {roleIcons[role]}
      {role}
    </span>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const { workspaceId, role, userId } = useWorkspace();
  const isAdmin = role === "admin";

  // Workspace info
  const workspace = useQuery(
    api.workspaces.get,
    workspaceId ? { id: workspaceId } : "skip"
  );
  const updateWorkspace = useMutation(api.workspaces.update);

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoDesc, setInfoDesc] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  function startEditInfo() {
    setInfoName(workspace?.name ?? "");
    setInfoDesc(workspace?.description ?? "");
    setEditingInfo(true);
  }

  async function saveInfo() {
    if (!workspaceId) return;
    setInfoSaving(true);
    try {
      await updateWorkspace({
        id: workspaceId,
        name: infoName.trim() || undefined,
        description: infoDesc.trim() || undefined,
      });
      setEditingInfo(false);
    } finally {
      setInfoSaving(false);
    }
  }

  // Members
  const members = useQuery(
    api.workspaces.getMembers,
    workspaceId ? { workspaceId } : "skip"
  ) ?? [];
  const memberUserIds = members.map((m: any) => m.userId);
  const usersMap = useQuery(
    api.users.getUsers,
    memberUserIds.length > 0 ? { userIds: memberUserIds } : "skip"
  ) ?? {};
  const addMember = useMutation(api.workspaces.addMember);
  const removeMember = useMutation(api.workspaces.removeMember);

  const convex = useConvex();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("operator");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviting, setInviting] = useState(false);

  async function handleInvite() {
    if (!inviteEmail.trim() || !workspaceId) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const user = await convex.query(api.users.findByEmail, { email: inviteEmail.trim() });
      if (!user) {
        setInviteError("No account found with this email. They need to sign up first.");
        return;
      }
      await addMember({ workspaceId, userId: user.userId, role: inviteRole });
      setInviteSuccess(`${user.name || user.email} added as ${inviteRole}`);
      setInviteEmail("");
    } catch (e: any) {
      setInviteError(e.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  const [changingRole, setChangingRole] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: Role) {
    if (!workspaceId) return;
    setChangingRole(userId);
    try {
      await addMember({ workspaceId, userId, role: newRole });
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!workspaceId) return;
    await removeMember({ workspaceId, userId });
  }

  // API Keys
  const apiKeys = useQuery(
    api.apiKeys.list,
    workspaceId ? { workspaceId } : "skip"
  ) ?? [];
  const createKey = useMutation(api.apiKeys.create);
  const revokeKey = useMutation(api.apiKeys.revoke);

  const [generatingKey, setGeneratingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyCreating, setKeyCreating] = useState(false);

  async function handleGenerateKey() {
    if (!workspaceId || !newKeyName.trim()) return;
    setKeyCreating(true);
    try {
      const result = await createKey({
        workspaceId,
        name: newKeyName.trim(),
        createdBy: userId ?? "",
      });
      setNewKeyResult({ key: result.key, name: newKeyName.trim() });
      setNewKeyName("");
      setGeneratingKey(false);
    } finally {
      setKeyCreating(false);
    }
  }

  async function handleCopyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function handleRevokeKey(id: string) {
    await revokeKey({ id: id as any });
  }

  // Delete workspace
  const [deletingWs, setDeletingWs] = useState(false);
  const removeWorkspace = useMutation(api.workspaces.remove);

  async function handleDeleteWorkspace() {
    if (!workspaceId) return;
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete this workspace and all its data. This cannot be undone."
    );
    if (!confirmed) return;
    setDeletingWs(true);
    try {
      await removeWorkspace({ id: workspaceId });
      window.location.href = "/onboarding";
    } finally {
      setDeletingWs(false);
    }
  }

  if (!workspaceId) {
    return (
      <>
        <Topbar title="Settings" subtitle="Workspace management" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No workspace selected.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Settings" subtitle="Workspace management" />
      <main className="flex-1 p-6 space-y-6 max-w-[900px] w-full mx-auto">

        {/* Workspace Info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/15 border border-primary/30">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Workspace Info</h2>
                <p className="text-xs text-muted-foreground">
                  Name, slug, and description
                </p>
              </div>
            </div>
            {isAdmin && !editingInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEditInfo}
                className="border-border text-xs h-8"
              >
                Edit
              </Button>
            )}
          </div>
          <Separator className="bg-border" />

          {editingInfo ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Name
                </label>
                <Input
                  value={infoName}
                  onChange={(e) => setInfoName(e.target.value)}
                  className="h-9 text-sm bg-surface border-border"
                  placeholder="Workspace name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Slug
                </label>
                <Input
                  value={workspace?.slug ?? ""}
                  disabled
                  className="h-9 text-sm bg-surface border-border opacity-50"
                />
                <p className="text-[11px] text-muted-foreground">Slug cannot be changed.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Description
                </label>
                <Input
                  value={infoDesc}
                  onChange={(e) => setInfoDesc(e.target.value)}
                  className="h-9 text-sm bg-surface border-border"
                  placeholder="Short description (optional)"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={saveInfo}
                  disabled={infoSaving}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-white"
                >
                  {infoSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingInfo(false)}
                  className="h-8 text-xs border-border"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Name
                </p>
                <p className="text-sm font-medium">{workspace?.name ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Slug
                </p>
                <code className="text-xs font-mono text-muted-foreground bg-surface px-2 py-1 rounded border border-border">
                  {workspace?.slug ?? "—"}
                </code>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Description
                </p>
                <p className="text-sm text-muted-foreground">
                  {workspace?.description || (
                    <span className="italic text-muted-foreground/50">No description</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Members</h2>
              <p className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
              </p>
            </div>
          </div>
          <Separator className="bg-border" />

          {isAdmin && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError("");
                    setInviteSuccess("");
                  }}
                  className="h-9 text-sm bg-card border-border flex-1"
                  type="email"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                >
                  <option value="admin">admin</option>
                  <option value="operator">operator</option>
                  <option value="viewer">viewer</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviting}
                  className="h-9 bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] text-white border-0"
                >
                  {inviting ? "..." : "Invite"}
                </Button>
              </div>
              {inviteError && (
                <p className="text-xs text-red-400">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-xs text-emerald-400">{inviteSuccess}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No members found.</p>
            )}
            {members.map((member: any) => {
              const isSelf = member.userId === userId;
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase select-none">
                      {((usersMap as any)[member.userId]?.name ?? member.userId).charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {(usersMap as any)[member.userId]?.name ?? member.userId}
                        {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(usersMap as any)[member.userId]?.email && (
                          <span>{(usersMap as any)[member.userId].email} &middot; </span>
                        )}
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && !isSelf ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.userId, e.target.value as Role)
                        }
                        disabled={changingRole === member.userId}
                        className="text-xs bg-surface border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                      >
                        <option value="admin">admin</option>
                        <option value="operator">operator</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      <RoleBadge role={member.role as Role} />
                    )}
                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-red-500/15 border border-transparent hover:border-red-500/30 text-muted-foreground hover:text-red-400 transition-all"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isSelf && (
                      <span className="text-[11px] text-muted-foreground/60 italic">you</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30">
                <Key className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">API Keys</h2>
                <p className="text-xs text-muted-foreground">
                  Manage access keys for this workspace
                </p>
              </div>
            </div>
            {isAdmin && !generatingKey && (
              <Button
                size="sm"
                onClick={() => {
                  setGeneratingKey(true);
                  setNewKeyResult(null);
                }}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Generate Key
              </Button>
            )}
          </div>
          <Separator className="bg-border" />

          {/* Generate key inline form */}
          {generatingKey && (
            <div className="bg-surface border border-primary/20 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                New API Key
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. CI Deploy, Worker Agent)"
                  className="h-9 text-sm bg-card border-border flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateKey()}
                />
                <Button
                  size="sm"
                  onClick={handleGenerateKey}
                  disabled={!newKeyName.trim() || keyCreating}
                  className="h-9 text-xs bg-primary hover:bg-primary/90 text-white shrink-0"
                >
                  {keyCreating ? "Creating..." : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setGeneratingKey(false);
                    setNewKeyName("");
                  }}
                  className="h-9 text-xs border-border shrink-0"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* New key reveal */}
          {newKeyResult && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Key created — copy it now, it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-card border border-border rounded-md px-3 py-2 text-emerald-300 break-all">
                  {newKeyResult.key}
                </code>
                <button
                  onClick={() => handleCopyKey(newKeyResult.key)}
                  className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 transition-all shrink-0"
                  title="Copy key"
                >
                  {copiedKey ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewKeyResult(null)}
                className="h-7 text-xs border-border text-muted-foreground mt-1"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Keys list */}
          <div className="space-y-2">
            {apiKeys.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No API keys yet.</p>
            )}
            {apiKeys.map((k: any) => (
              <div
                key={k._id}
                className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{k.name}</p>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                          k.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}
                      >
                        {k.isActive ? "active" : "revoked"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[11px] font-mono text-muted-foreground">
                        {k.keyPrefix}...
                      </code>
                      <span className="text-[11px] text-muted-foreground/50">
                        · created {formatDate(k.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {isAdmin && k.isActive && (
                  <button
                    onClick={() => handleRevokeKey(k._id)}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0 ml-3"
                    title="Revoke key"
                  >
                    <Trash2 className="h-3 w-3" />
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <div className="bg-card border border-red-500/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this workspace and all its data
                </p>
              </div>
            </div>
            <Separator className="bg-red-500/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  This will delete all tasks, agents, features, documents, API keys, and members.
                  This action cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteWorkspace}
                disabled={deletingWs}
                className="border-red-500/50 text-red-400 hover:bg-red-500/15 hover:text-red-300 shrink-0"
              >
                {deletingWs ? "Deleting..." : "Delete Workspace"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
