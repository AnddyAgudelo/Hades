"use client";

import { useConvexAuth } from "convex/react";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { Sidebar } from "@/components/layout/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const { workspaces, isLoading } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (!isLoading && workspaces.length === 0 && !isOnboarding) {
      router.push("/onboarding");
    }
  }, [isLoading, workspaces, router, isOnboarding]);

  if (isOnboarding) {
    return <>{children}</>;
  }

  if (isLoading || workspaces.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </WorkspaceProvider>
  );
}
