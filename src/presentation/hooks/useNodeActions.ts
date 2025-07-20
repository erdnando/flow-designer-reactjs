import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { useNodeDeletionConfirm } from './useNodeDeletionConfirm';

export interface NodeAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

export interface UseNodeActionsProps {
  nodeId: string;
  onNodeDelete?: (nodeId: string) => void;
  onNodeValidate?: (nodeId: string) => void;
  onNodeReset?: (nodeId: string) => void;
  onNodeOptions?: (nodeId: string) => void;
  nodeName?: string;
  nodeType?: string;
}

export const useNodeActions = ({
  nodeId,
  onNodeDelete,
  onNodeValidate,
  onNodeReset,
  onNodeOptions,
  nodeName,
  nodeType
}: UseNodeActionsProps) => {
  const reactFlowInstance = useReactFlow();
  
  // Usar el hook de confirmación de eliminación
  const { openConfirmDialog, isConfirmDialogOpen, confirmDeletion, closeConfirmDialog, nodeToDelete } = useNodeDeletionConfirm(
    (nodeIdToDelete) => {
      console.log('🗑️ Eliminando nodo confirmado:', nodeIdToDelete);
      
      try {
        // Llamar al callback personalizado si existe
        if (onNodeDelete) {
          onNodeDelete(nodeIdToDelete);
        }
        
        // Actualizar la UI de ReactFlow
        reactFlowInstance.setNodes((nodes) => nodes.filter(node => node.id !== nodeIdToDelete));
        
      } catch (error) {
        console.error('❌ Error al eliminar nodo:', error);
      }
    }
  );

  const handleDelete = useCallback(() => {
    // Abrir el diálogo de confirmación en lugar de eliminar directamente
    openConfirmDialog({
      id: nodeId,
      name: nodeName,
      type: nodeType
    });
  }, [nodeId, nodeName, nodeType, openConfirmDialog]);

  const handleValidate = useCallback(() => {
    console.log('✅ Validando nodo:', nodeId);
    
    if (onNodeValidate) {
      onNodeValidate(nodeId);
    }
  }, [nodeId, onNodeValidate]);

  const handleReset = useCallback(() => {
    console.log('🔄 Reseteando nodo:', nodeId);
    
    if (onNodeReset) {
      onNodeReset(nodeId);
    }
  }, [nodeId, onNodeReset]);

  const handleOptions = useCallback(() => {
    console.log('⚙️ Abriendo opciones del nodo:', nodeId);
    
    if (onNodeOptions) {
      onNodeOptions(nodeId);
    }
  }, [nodeId, onNodeOptions]);

  // Configurar las acciones disponibles
  const actions: NodeAction[] = [
    {
      id: 'validate',
      label: 'Validar',
      icon: '✓',
      onClick: handleValidate,
      disabled: !onNodeValidate,
      tooltip: 'Validar nodo'
    },
    {
      id: 'reset',
      label: 'Resetear',
      icon: '↺',
      onClick: handleReset,
      disabled: !onNodeReset,
      tooltip: 'Resetear configuración'
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: '✕',
      onClick: handleDelete,
      tooltip: 'Eliminar nodo'
    },
    {
      id: 'options',
      label: 'Opciones',
      icon: '⋮',
      onClick: handleOptions,
      disabled: !onNodeOptions,
      tooltip: 'Más opciones'
    }
  ];

  return {
    actions,
    handleDelete,
    handleValidate,
    handleReset,
    handleOptions,
    // Exportar variables para el diálogo de confirmación
    isConfirmDialogOpen,
    confirmDeletion,
    closeConfirmDialog,
    nodeToDelete
  };
};
