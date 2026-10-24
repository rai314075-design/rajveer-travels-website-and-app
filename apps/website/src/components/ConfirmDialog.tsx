"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  loading?: boolean;
  toastSuccess?: string;
  toastError?: string;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  toastSuccess = "Deleted successfully",
  toastError = "Failed to delete",
}: ConfirmDialogProps) {
  const queryClient = useQueryClient();
  const [toastId, setToastId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: onConfirm,
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ predicate: () => true });
      if (toastId) {
        toast.dismiss(toastId);
      }
      const newToastId = toast.success(toastSuccess) as string;
      setToastId(newToastId);
      onOpenChange(false);
    },
    onError: (error) => {
      if (toastId) {
        toast.dismiss(toastId);
      }
      const newToastId = toast.error(
        toastError + (error instanceof Error ? ": " + error.message : "")
      ) as string;
      setToastId(newToastId);
    },
  });

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
      <AlertDialog.Content className="fixed top-[50%] left-[50%] z-50 grid w-[90vw] max-w-lg gap-4 rounded-md border bg-popover p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-md">
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <AlertDialog.Title className="text-lg font-semibold text-popover-foreground">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-popover-foreground">{description}</AlertDialog.Description>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <AlertDialog.Cancel className="flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-popover-foreground hover:bg-accent/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            Cancel
          </AlertDialog.Cancel>
          <button
            type="button"
            className={`
              flex h-10 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white
              ${loading || mutation.isPending ? "cursor-not-allowed opacity-50" : "hover:bg-red-700"}
            `}
            onClick={() => mutation.mutate()}
            disabled={loading || mutation.isPending}
          >
            {loading || mutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
