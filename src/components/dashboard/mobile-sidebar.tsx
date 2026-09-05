"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { NavContent } from "./nav-content";
import type { NavSection } from "@/lib/navigation/nav-config";
import { Button } from "@/components/ui/button";

/** Below `lg`, the persistent Sidebar is hidden and this drawer takes over — same NavContent, one nav implementation. */
export function MobileSidebar({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface p-4 shadow-lg lg:hidden">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-ink">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">
            <NavContent sections={sections} onNavigate={() => setOpen(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
