import React from "react";
import { Button } from "@/components/ui/button";

const DeleteConfirmationModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}> = ({ open, onClose, onConfirm, title = "Delete", message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">
          {message || "Are you sure? This action cannot be undone."}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant={"outline"} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-red-600">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
