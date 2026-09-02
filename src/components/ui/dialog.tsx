"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const overlay =
  "fixed inset-0 z-[90] bg-[rgba(4,6,12,.72)] backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_150ms_ease-in]";
const content =
  "panel-raised lit fixed left-1/2 top-1/2 z-[100] w-[min(92vw,var(--modal-w,34rem))] max-h-[88svh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl p-6 data-[state=open]:animate-[modal-in_320ms_cubic-bezier(.16,.84,.24,1)] data-[state=closed]:animate-[modal-out_160ms_ease-in]";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  width,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          className={content}
          style={
            width ? ({ "--modal-w": width } as React.CSSProperties) : undefined
          }
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-display text-ink text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-dim mt-1.5 text-sm leading-6">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X size={16} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "danger",
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "danger" | "default";
  pending?: boolean;
}) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlay} />
        <AlertPrimitive.Content className={cn(content, "!w-[min(92vw,26rem)]")}>
          <AlertPrimitive.Title className="font-display text-ink text-base font-semibold">
            {title}
          </AlertPrimitive.Title>
          <AlertPrimitive.Description asChild>
            <div className="text-dim mt-2 text-sm leading-6">{description}</div>
          </AlertPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertPrimitive.Cancel asChild>
              <Button variant="ghost" size="sm">
                Keep it
              </Button>
            </AlertPrimitive.Cancel>
            <Button
              size="sm"
              variant={tone === "danger" ? "danger" : "default"}
              disabled={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
