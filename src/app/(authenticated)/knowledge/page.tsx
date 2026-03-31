"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

function fileTypeBadge(fileType: string) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return "bg-red-500/15 text-red-400";
    case "md":
    case "markdown":
      return "bg-blue-500/15 text-blue-400";
    case "txt":
      return "bg-zinc-500/15 text-zinc-400";
    default:
      return "bg-purple-500/15 text-purple-400";
  }
}

interface DocumentCardProps {
  doc: any;
  onToggleActive: (id: Id<"documents">) => void;
  onRemove: (id: Id<"documents">) => void;
  onSaveProcessed: (id: Id<"documents">, content: string) => Promise<void>;
}

function DocumentCard({ doc, onToggleActive, onRemove, onSaveProcessed }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editContent, setEditContent] = useState(doc.processedContent ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSaveProcessed(doc._id, editContent);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{doc.name}</CardTitle>
              {doc.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{doc.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-[10px] ${fileTypeBadge(doc.fileType)}`}>
              {doc.fileType}
            </Badge>
            <button
              onClick={() => onToggleActive(doc._id)}
              title={doc.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
              className="flex items-center gap-1 text-xs transition-colors"
            >
              {doc.isActive ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <ToggleRight className="h-4 w-4 text-emerald-400" />
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-zinc-600" />
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </button>
            <button
              onClick={() => onRemove(doc._id)}
              className="text-muted-foreground hover:text-red-400 transition-colors"
              title="Delete document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <Separator className="bg-border" />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Processed content
        </button>

        {expanded && (
          <div className="space-y-2 pt-1">
            {doc.processedContent ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="text-xs font-mono bg-surface border-border resize-none"
                placeholder="Processed content..."
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground italic">No processed content yet.</p>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="text-xs font-mono bg-surface border-border resize-none"
                  placeholder="Enter processed content..."
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSave}
                className="h-7 text-xs bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function KnowledgePage() {
  const { workspaceId } = useWorkspace();
  const documents = useQuery(
    api.documents.list,
    workspaceId ? { workspaceId } : "skip"
  );

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const updateProcessedContent = useMutation(api.documents.updateProcessedContent);
  const toggleActive = useMutation(api.documents.toggleActive);
  const removeDocument = useMutation(api.documents.remove);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file && !uploadName) {
      setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
    setUploadError(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim() || !workspaceId) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploadUrl = await generateUploadUrl();

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
        body: uploadFile,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const { storageId } = await res.json();
      const ext = uploadFile.name.split(".").pop()?.toLowerCase() ?? "txt";

      await createDocument({
        workspaceId,
        name: uploadName.trim(),
        description: uploadDescription.trim() || undefined,
        fileType: ext,
        storageId,
        uploadedBy: "user",
      });

      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function cancelUpload() {
    setShowUpload(false);
    setUploadFile(null);
    setUploadName("");
    setUploadDescription("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSaveProcessed(id: Id<"documents">, content: string) {
    await updateProcessedContent({ id, processedContent: content });
  }

  async function handleToggleActive(id: Id<"documents">) {
    await toggleActive({ id });
  }

  async function handleRemove(id: Id<"documents">) {
    await removeDocument({ id });
  }

  const docCount = documents?.length ?? 0;
  const activeCount = documents?.filter((d: any) => d.isActive).length ?? 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar title="Knowledge Hub" subtitle="Workspace documents and context" />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c63ff]/15">
                <BookOpen className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{docCount}</p>
                <p className="text-[11px] text-muted-foreground">Total Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-[11px] text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border col-span-2 md:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-500/15">
                <FileText className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{docCount - activeCount}</p>
                <p className="text-[11px] text-muted-foreground">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header row with upload trigger */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Documents</h2>
            <p className="text-[11px] text-muted-foreground">{docCount} document{docCount !== 1 ? "s" : ""} in this workspace</p>
          </div>
          {!showUpload && (
            <Button
              size="sm"
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload Document
            </Button>
          )}
        </div>

        {/* Inline upload form */}
        {showUpload && (
          <Card className="bg-card border-[#6c63ff]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#a78bfa]" />
                  Upload Document
                </CardTitle>
                <button onClick={cancelUpload} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleUpload} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#6c63ff]/15 file:text-[#a78bfa] hover:file:bg-[#6c63ff]/25 cursor-pointer"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <Input
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="Document name"
                      className="h-8 text-sm bg-surface border-border"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                    <Input
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Brief description"
                      className="h-8 text-sm bg-surface border-border"
                    />
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-red-400">{uploadError}</p>
                )}

                <div className="flex items-center gap-2 justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelUpload}
                    className="h-8 text-xs border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={uploading || !uploadFile || !uploadName.trim()}
                    className="h-8 text-xs bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] hover:from-[#5b54e6] hover:to-[#9678f0] text-white border-0"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Document list */}
        {!documents ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs mt-1">Upload a document to add context to your workspace</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {documents.map((doc: any) => (
              <DocumentCard
                key={doc._id}
                doc={doc}
                onToggleActive={handleToggleActive}
                onRemove={handleRemove}
                onSaveProcessed={handleSaveProcessed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
