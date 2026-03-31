"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface WorkspaceContextType {
  workspaceId: Id<"workspaces"> | null;
  workspaceName: string | null;
  role: "admin" | "operator" | "viewer" | null;
  setWorkspaceId: (id: Id<"workspaces">) => void;
  workspaces: any[];
  isLoading: boolean;
  userId: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  workspaceName: null,
  role: null,
  setWorkspaceId: () => {},
  workspaces: [],
  isLoading: true,
  userId: null,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<Id<"workspaces"> | null>(null);
  const currentUser = useQuery(api.users.currentUser);
  const userId = currentUser?.userId ?? null;
  const workspacesQuery = useQuery(
    api.workspaces.list,
    userId ? { userId } : "skip"
  );
  const workspaces = workspacesQuery ?? [];
  const isLoading = currentUser === undefined || (userId !== null && workspacesQuery === undefined);

  useEffect(() => {
    if (workspaces.length > 0 && !selectedId) {
      const stored = localStorage.getItem("hades_workspace");
      const found = stored ? workspaces.find((w: any) => w._id === stored) : null;
      setSelectedId(found ? found._id : workspaces[0]?._id ?? null);
    }
  }, [workspaces, selectedId]);

  useEffect(() => {
    if (selectedId) {
      localStorage.setItem("hades_workspace", selectedId);
    }
  }, [selectedId]);

  const current = workspaces.find((w: any) => w._id === selectedId);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceId: selectedId,
        workspaceName: current?.name ?? null,
        role: current?.role ?? null,
        setWorkspaceId: setSelectedId,
        workspaces,
        isLoading,
        userId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
