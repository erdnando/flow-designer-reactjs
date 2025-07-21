import { useCallback } from 'react';
import { migrationLog, performanceMonitor } from '../../../shared/config/migrationFlags';
import { logger } from '../../../shared/utils';

// Types for the hook (importados del contexto)
interface FlowState {
  currentFlow: any | null; // Flow | null en el tipo real
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface FlowActions {
  createFlow: (name: string, description?: string) => Promise<void>;
  loadFlow: (flowId: string) => Promise<void>;
  addNode: (type: string, position: { x: number; y: number }) => Promise<void>;
  updateNode: (nodeId: string, updates: any) => Promise<void>;
  removeNode: (nodeId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => Promise<void>;
  addConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
}

interface NodeEventHandlersOptions {
  state: FlowState;
  actions: FlowActions;
  isEnabled?: boolean; // Flag para controlar si está activo
}

export interface NodeEventHandlersReturn {
  createNodeHandlers: (nodeId: string) => {
    onNodeClick: (nodeId: string) => void;
    onNodeDelete: (nodeId: string) => void;
    onNodeDoubleClick?: (nodeId: string) => void;
    onNodeMouseEnter?: (nodeId: string) => void;
    onNodeMouseLeave?: (nodeId: string) => void;
  };
  handleSelectionChange: (selection: { nodes: any[]; edges: any[] }) => void;
  handlePaneClick: () => void;
  handleNodeClick: (nodeId: string) => void;
  handleNodeDoubleClick: (nodeId: string) => void;
  handleNodeDelete: (nodeId: string) => void;
}

/**
 * Hook para manejar eventos específicos de nodos
 * Incluye click, double-click, selection, mouse events, etc.
 */
export const useNodeEventHandlers = (options: NodeEventHandlersOptions): NodeEventHandlersReturn => {
  const {
    state,
    actions,
    isEnabled = true // Por defecto está habilitado
  } = options;

  // Handler principal para click en nodos
  const handleNodeClick = useCallback((nodeId: string) => {
    if (!isEnabled) return;
    
    const startTime = performance.now();
    
    migrationLog('NODE_EVENTS', 'Node click event', { nodeId, currentSelection: state.selectedNodeId });
    
    try {
      // Seleccionar el nodo tanto en el estado local como en el contexto
      actions.selectNode(nodeId);
      logger.debug('✅ Node selected successfully:', nodeId);
    } catch (error) {
      logger.error('❌ Error selecting node:', error);
      migrationLog('NODE_EVENTS', 'Node selection error', { 
        nodeId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    performanceMonitor('handleNodeClick', startTime);
  }, [actions, state.selectedNodeId, isEnabled]);

  // Handler para double-click en nodos (ej: abrir modal de edición)
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    if (!isEnabled) return;
    
    const startTime = performance.now();
    
    migrationLog('NODE_EVENTS', 'Node double-click event', { nodeId });
    
    try {
      // Primero seleccionar el nodo
      actions.selectNode(nodeId);
      
      // TODO: Implementar lógica de edición de nodos
      // Por ahora solo seleccionamos el nodo
      logger.debug('✅ Node double-click handled:', nodeId);
      
      // En el futuro aquí podríamos:
      // - Abrir un modal de edición
      // - Cambiar a modo de edición inline
      // - Mostrar propiedades avanzadas
      
    } catch (error) {
      logger.error('❌ Error handling node double-click:', error);
      migrationLog('NODE_EVENTS', 'Node double-click error', { 
        nodeId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    performanceMonitor('handleNodeDoubleClick', startTime);
  }, [actions, isEnabled]);

  // Handler para eliminación de nodos
  const handleNodeDelete = useCallback((nodeId: string) => {
    if (!isEnabled) return;
    
    const startTime = performance.now();
    
    migrationLog('NODE_EVENTS', 'Node delete event', { nodeId });
    
    try {
      // Eliminar el nodo a través de las acciones del contexto
      actions.removeNode(nodeId);
      logger.debug('✅ Node deletion initiated:', nodeId);
    } catch (error) {
      logger.error('❌ Error deleting node:', error);
      migrationLog('NODE_EVENTS', 'Node deletion error', { 
        nodeId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    performanceMonitor('handleNodeDelete', startTime);
  }, [actions, isEnabled]);

  // Handler para cambios de selección en ReactFlow
  const handleSelectionChange = useCallback((selection: { nodes: any[]; edges: any[] }) => {
    if (!isEnabled) return;
    
    const startTime = performance.now();
    
    migrationLog('NODE_EVENTS', 'Selection change event', { 
      nodesCount: selection.nodes.length,
      edgesCount: selection.edges.length,
      nodeIds: selection.nodes.map(n => n.id),
      edgeIds: selection.edges.map(e => e.id)
    });
    
    try {
      if (selection.nodes.length > 0) {
        // Seleccionar el primer nodo si hay varios seleccionados
        const selectedNodeId = selection.nodes[0].id;
        actions.selectNode(selectedNodeId);
        logger.debug('✅ Node selected from selection change:', selectedNodeId);
        
      } else if (selection.edges.length > 0) {
        // Si hay conexiones seleccionadas pero no nodos, deseleccionar nodos
        actions.selectNode(null);
        logger.debug('✅ Node deselected, edge selected');
        
      } else {
        // No hay nada seleccionado
        actions.selectNode(null);
        logger.debug('✅ All selections cleared');
      }
    } catch (error) {
      logger.error('❌ Error handling selection change:', error);
      migrationLog('NODE_EVENTS', 'Selection change error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    performanceMonitor('handleSelectionChange', startTime);
  }, [actions, isEnabled]);

  // Handler para click en el panel vacío (deselección)
  const handlePaneClick = useCallback(() => {
    if (!isEnabled) return;
    
    const startTime = performance.now();
    
    migrationLog('NODE_EVENTS', 'Pane click event (deselection)');
    
    try {
      // Deseleccionar todos los nodos
      actions.selectNode(null);
      logger.debug('✅ All nodes deselected from pane click');
    } catch (error) {
      logger.error('❌ Error handling pane click:', error);
      migrationLog('NODE_EVENTS', 'Pane click error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    performanceMonitor('handlePaneClick', startTime);
  }, [actions, isEnabled]);

  // Handler para mouse enter en nodos (hover)
  const handleNodeMouseEnter = useCallback((nodeId: string) => {
    if (!isEnabled) return;
    
    migrationLog('NODE_EVENTS', 'Node mouse enter', { nodeId });
    
    // TODO: Implementar lógica de hover
    // Por ejemplo:
    // - Mostrar tooltips
    // - Resaltar conexiones relacionadas
    // - Mostrar información adicional
    
    logger.debug('🖱️ Node mouse enter:', nodeId);
  }, [isEnabled]);

  // Handler para mouse leave en nodos
  const handleNodeMouseLeave = useCallback((nodeId: string) => {
    if (!isEnabled) return;
    
    migrationLog('NODE_EVENTS', 'Node mouse leave', { nodeId });
    
    // TODO: Implementar lógica de salida de hover
    // Por ejemplo:
    // - Ocultar tooltips
    // - Quitar resaltado de conexiones
    // - Ocultar información adicional
    
    logger.debug('🖱️ Node mouse leave:', nodeId);
  }, [isEnabled]);

  // Factory function para crear handlers específicos para cada nodo
  const createNodeHandlers = useCallback((nodeId: string) => {
    if (!isEnabled) {
      return {
        onNodeClick: () => {},
        onNodeDelete: () => {},
        onNodeDoubleClick: () => {},
        onNodeMouseEnter: () => {},
        onNodeMouseLeave: () => {}
      };
    }

    return {
      onNodeClick: (clickedNodeId: string) => handleNodeClick(clickedNodeId),
      onNodeDelete: (deletedNodeId: string) => handleNodeDelete(deletedNodeId),
      onNodeDoubleClick: (doubleClickedNodeId: string) => handleNodeDoubleClick(doubleClickedNodeId),
      onNodeMouseEnter: (hoveredNodeId: string) => handleNodeMouseEnter(hoveredNodeId),
      onNodeMouseLeave: (leftNodeId: string) => handleNodeMouseLeave(leftNodeId)
    };
  }, [handleNodeClick, handleNodeDelete, handleNodeDoubleClick, handleNodeMouseEnter, handleNodeMouseLeave, isEnabled]);

  return {
    createNodeHandlers,
    handleSelectionChange,
    handlePaneClick,
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeDelete
  };
};
