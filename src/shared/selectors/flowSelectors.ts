/**
 * Sistema de selectores memoizados para optimizar re-renders
 * Mejora el performance manteniendo compatibilidad con código existente
 */

import { useMemo } from 'react';
import { Flow } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import { Connection } from '../../domain/entities/Connection';
import { isFeatureEnabled } from '../config/featureFlags';

interface FlowState {
  currentFlow: Flow | null;
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface FlowStats {
  nodeCount: number;
  connectionCount: number;
  lastModified: Date | undefined;
  nodesByType: Record<string, number>;
  hasValidationErrors: boolean;
}

interface SelectionInfo {
  selectedNode: Node | null;
  hasSelection: boolean;
  selectionType: 'node' | 'connection' | 'flow' | null;
}

/**
 * Hook principal para selectores memoizados
 */
export const useFlowSelectors = (state: FlowState) => {
  const memoizedEnabled = isFeatureEnabled('MEMOIZED_SELECTORS');
  
  // Selector para nodo seleccionado
  const selectedNodeData = useMemo(() => {
    if (!memoizedEnabled) return null;
    
    if (!state.selectedNodeId || !state.currentFlow) return null;
    return state.currentFlow.nodes.find(n => n.id === state.selectedNodeId) || null;
  }, [
    memoizedEnabled, 
    state.selectedNodeId, 
    state.currentFlow
  ]);

  // Selector para estadísticas del flujo
  const flowStats = useMemo((): FlowStats => {
    if (!memoizedEnabled) {
      return {
        nodeCount: 0,
        connectionCount: 0,
        lastModified: undefined,
        nodesByType: {},
        hasValidationErrors: false
      };
    }

    if (!state.currentFlow) {
      return {
        nodeCount: 0,
        connectionCount: 0,
        lastModified: undefined,
        nodesByType: {},
        hasValidationErrors: false
      };
    }

    const nodesByType = state.currentFlow.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      nodeCount: state.currentFlow.nodes.length,
      connectionCount: state.currentFlow.connections.length,
      lastModified: state.currentFlow.updatedAt,
      nodesByType,
      hasValidationErrors: false // TODO: Implementar validación
    };
  }, [
    memoizedEnabled, 
    state.currentFlow
  ]);

  // Selector para información de selección
  const selectionInfo = useMemo((): SelectionInfo => {
    if (!memoizedEnabled) {
      return {
        selectedNode: null,
        hasSelection: false,
        selectionType: null
      };
    }

    const selectedNode = selectedNodeData;
    
    return {
      selectedNode,
      hasSelection: selectedNode !== null,
      selectionType: selectedNode ? 'node' : null
    };
  }, [memoizedEnabled, selectedNodeData]);

  // Selector para nodos conectados
  const connectedNodes = useMemo(() => {
    if (!memoizedEnabled || !state.currentFlow || !state.selectedNodeId) return [];
    
    const connections = state.currentFlow.connections.filter(
      conn => conn.sourceNodeId === state.selectedNodeId || conn.targetNodeId === state.selectedNodeId
    );
    
    const connectedNodeIds = new Set<string>();
    connections.forEach(conn => {
      if (conn.sourceNodeId !== state.selectedNodeId) {
        connectedNodeIds.add(conn.sourceNodeId);
      }
      if (conn.targetNodeId !== state.selectedNodeId) {
        connectedNodeIds.add(conn.targetNodeId);
      }
    });

    return state.currentFlow.nodes.filter(node => connectedNodeIds.has(node.id));
  }, [
    memoizedEnabled, 
    state.currentFlow, 
    state.selectedNodeId
  ]);

  // Selector para nodos por posición (útil para detección de colisiones)
  const nodesByPosition = useMemo(() => {
    if (!memoizedEnabled || !state.currentFlow) return new Map();
    
    const positionMap = new Map<string, Node>();
    state.currentFlow.nodes.forEach(node => {
      const key = `${Math.round(node.position.x)},${Math.round(node.position.y)}`;
      positionMap.set(key, node);
    });
    
    return positionMap;
  }, [memoizedEnabled, state.currentFlow]);

  // Selector para validación de conexiones
  const connectionValidation = useMemo(() => {
    if (!memoizedEnabled || !state.currentFlow) return { valid: [], invalid: [] };
    
    const valid: Connection[] = [];
    const invalid: Connection[] = [];
    
    state.currentFlow.connections.forEach(conn => {
      const sourceNode = state.currentFlow!.nodes.find(n => n.id === conn.sourceNodeId);
      const targetNode = state.currentFlow!.nodes.find(n => n.id === conn.targetNodeId);
      
      if (sourceNode && targetNode) {
        valid.push(conn);
      } else {
        invalid.push(conn);
      }
    });
    
    return { valid, invalid };
  }, [memoizedEnabled, state.currentFlow]);

  // Método para obtener selectores sin memoización (fallback)
  const getSelectorsWithoutMemo = () => {
    return {
      selectedNodeData: state.selectedNodeId && state.currentFlow 
        ? state.currentFlow.nodes.find(n => n.id === state.selectedNodeId) || null
        : null,
      flowStats: {
        nodeCount: state.currentFlow?.nodes.length || 0,
        connectionCount: state.currentFlow?.connections.length || 0,
        lastModified: state.currentFlow?.updatedAt,
        nodesByType: {},
        hasValidationErrors: false
      },
      selectionInfo: {
        selectedNode: null,
        hasSelection: false,
        selectionType: null as 'node' | 'connection' | 'flow' | null
      },
      connectedNodes: [],
      nodesByPosition: new Map(),
      connectionValidation: { valid: [], invalid: [] }
    };
  };

  // Retornar selectores memoizados o fallback
  if (memoizedEnabled) {
    return {
      selectedNodeData,
      flowStats,
      selectionInfo,
      connectedNodes,
      nodesByPosition,
      connectionValidation
    };
  } else {
    return getSelectorsWithoutMemo();
  }
};

/**
 * Hook específico para propiedades del panel
 */
export const usePropertiesPanelSelectors = (state: FlowState) => {
  const { selectedNodeData, selectionInfo } = useFlowSelectors(state);
  
  const panelData = useMemo(() => {
    if (!selectedNodeData) return null;
    
    return {
      id: selectedNodeData.id,
      name: selectedNodeData.name,
      type: selectedNodeData.type,
      description: selectedNodeData.description,
      position: selectedNodeData.position,
      status: selectedNodeData.status,
      lastModified: selectedNodeData.updatedAt
    };
  }, [selectedNodeData]);

  return {
    panelData,
    hasSelection: selectionInfo.hasSelection,
    selectionType: selectionInfo.selectionType
  };
};

/**
 * Hook específico para estadísticas del canvas
 */
export const useCanvasSelectors = (state: FlowState) => {
  const { flowStats, nodesByPosition } = useFlowSelectors(state);
  
  const canvasInfo = useMemo(() => {
    if (!state.currentFlow) return null;
    
    return {
      totalNodes: flowStats.nodeCount,
      totalConnections: flowStats.connectionCount,
      flowName: state.currentFlow.name,
      flowDescription: state.currentFlow.description,
      flowStatus: state.currentFlow.status,
      lastModified: flowStats.lastModified,
      nodeDistribution: flowStats.nodesByType
    };
  }, [state.currentFlow, flowStats]);

  return {
    canvasInfo,
    nodesByPosition
  };
};
