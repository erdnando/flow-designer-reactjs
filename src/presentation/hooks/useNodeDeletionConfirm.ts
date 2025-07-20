import { useState, useCallback } from 'react';

interface NodeToDelete {
  id: string;
  name?: string;
  type?: string;
}

interface UseNodeDeletionConfirmReturn {
  isConfirmDialogOpen: boolean;
  nodeToDelete: NodeToDelete | null;
  openConfirmDialog: (node: NodeToDelete) => void;
  closeConfirmDialog: () => void;
  confirmDeletion: () => void;
}

export const useNodeDeletionConfirm = (
  onDeleteConfirmed: (nodeId: string) => void
): UseNodeDeletionConfirmReturn => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<NodeToDelete | null>(null);

  const openConfirmDialog = useCallback((node: NodeToDelete) => {
    setNodeToDelete(node);
    setIsConfirmDialogOpen(true);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setNodeToDelete(null);
  }, []);

  const confirmDeletion = useCallback(() => {
    if (nodeToDelete) {
      onDeleteConfirmed(nodeToDelete.id);
      closeConfirmDialog();
    }
  }, [nodeToDelete, onDeleteConfirmed, closeConfirmDialog]);

  return {
    isConfirmDialogOpen,
    nodeToDelete,
    openConfirmDialog,
    closeConfirmDialog,
    confirmDeletion
  };
};
