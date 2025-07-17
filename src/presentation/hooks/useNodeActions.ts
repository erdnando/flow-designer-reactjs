import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

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
}

export const useNodeActions = ({
  nodeId,
  onNodeDelete,
  onNodeValidate,
  onNodeReset,
  onNodeOptions
}: UseNodeActionsProps) => {
  const reactFlowInstance = useReactFlow();

  const handleDelete = useCallback(() => {
    console.log('🗑️ Eliminando nodo:', nodeId);
    
    try {
      // Llamar al callback personalizado si existe
      if (onNodeDelete) {
        onNodeDelete(nodeId);
      }
      
      // Actualizar la UI de ReactFlow
      reactFlowInstance.setNodes((nodes) => nodes.filter(node => node.id !== nodeId));
      
    } catch (error) {
      console.error('❌ Error al eliminar nodo:', error);
    }
  }, [nodeId, onNodeDelete, reactFlowInstance]);

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
    handleOptions
  };
};
