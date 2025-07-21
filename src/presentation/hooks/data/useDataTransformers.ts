import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { determineFinalPosition } from '../utils/flowUtilities';
import { migrationLog, performanceMonitor } from '../../../shared/config/migrationFlags';
import { logger } from '../../../shared/utils';
import type { FlowNode, FlowEdge } from '../../../shared/types';

export interface DataTransformersOptions {
  currentFlow?: any;
  selectedNodeId?: string | null;
  actions: any;
  positionPersistence: any;
  nodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
}

export interface DataTransformersReturn {
  initialNodes: FlowNode[];
  initialEdges: FlowEdge[];
  getNodesSignature: () => string;
  forceUpdateCounter: number;
  currentNodesSignature: string;
  initialRenderCompleteRef: React.MutableRefObject<boolean>;
}

/**
 * Hook para transformar datos del dominio a formato ReactFlow
 * Maneja la conversión de nodos y edges, así como la sincronización de estado
 */
export const useDataTransformers = (options: DataTransformersOptions): DataTransformersReturn => {
  const {
    currentFlow,
    selectedNodeId,
    actions,
    positionPersistence,
    nodePositionsRef
  } = options;

  // Flag para depuración y control de renderizado inicial
  const initialRenderCompleteRef = useRef(false);

  // Función para calcular un signature de los datos importantes de los nodos
  const getNodesSignature = useCallback(() => {
    const startTime = performance.now();
    
    if (!currentFlow?.nodes) {
      migrationLog('DATA_TRANSFORMERS', 'No nodes for signature calculation');
      return '';
    }
    
    const signature = currentFlow.nodes.map((node: any) => {
      // Manejar updatedAt de forma segura
      let timestamp = 0;
      if (node.updatedAt) {
        if (typeof node.updatedAt.getTime === 'function') {
          timestamp = node.updatedAt.getTime();
        } else if (typeof node.updatedAt === 'number') {
          timestamp = node.updatedAt;
        } else if (typeof node.updatedAt === 'string') {
          timestamp = new Date(node.updatedAt).getTime() || 0;
        }
      }
      // Incluir más propiedades para detectar cambios mejor
      const dataProps = node.data ? JSON.stringify(node.data) : '';
      return `${node.id}:${node.data?.label || ''}:${node.type}:${timestamp}:${dataProps}`;
    }).join('|');
    
    performanceMonitor('getNodesSignature', startTime);
    migrationLog('DATA_TRANSFORMERS', 'Signature calculated', { nodesCount: currentFlow.nodes.length });
    
    return signature;
  }, [currentFlow?.nodes]);

  // Agregar un counter para forzar re-renders cuando sea necesario
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // Detectar cuando el estado cambia y forzar actualización si es necesario
  useEffect(() => {
    if (currentFlow) {
      setForceUpdateCounter((prev: number) => prev + 1);
      migrationLog('DATA_TRANSFORMERS', 'Flow changed, forcing update', { 
        newCounter: forceUpdateCounter + 1,
        flowId: currentFlow.id 
      });
    }
  }, [currentFlow, forceUpdateCounter]);
  
  // Calcular signature actual para forzar recálculo cuando cambien los datos
  const currentNodesSignature = getNodesSignature();
  
  // DEBUG: Agregar log para ver cuando cambia la signature
  const previousSignatureRef = useRef(currentNodesSignature);
  if (previousSignatureRef.current !== currentNodesSignature) {
    migrationLog('DATA_TRANSFORMERS', 'Nodes signature changed', {
      previous: previousSignatureRef.current.substring(0, 50) + '...',
      current: currentNodesSignature.substring(0, 50) + '...'
    });
    previousSignatureRef.current = currentNodesSignature;
  }

  // Convertir entidades del dominio a formato React Flow
  const initialNodes: FlowNode[] = useMemo(() => {
    const startTime = performance.now();
    migrationLog('DATA_TRANSFORMERS', 'Starting initialNodes transformation');
    
    if (!currentFlow) {
      migrationLog('DATA_TRANSFORMERS', 'No current flow, returning empty nodes');
      return [];
    }
    
    // CORRECCIÓN: Eliminar nodos duplicados por ID y detectar nodos fantasma
    const uniqueNodesMap = new Map();
    currentFlow.nodes.forEach((node: any) => {
      // Verificar que el nodo tenga un ID válido
      if (!node.id) {
        logger.warn('⚠️ Detectado nodo sin ID, omitiendo');
        migrationLog('DATA_TRANSFORMERS', 'Node without ID detected and skipped', node);
        return;
      }
      
      // Almacenar solo una instancia por ID
      uniqueNodesMap.set(node.id, node);
    });
    
    // Usar directamente los nodos únicos (ya filtrados por ID)
    const validNodes = Array.from(uniqueNodesMap.values());
    
    // Cargar posiciones persistidas
    const persistedPositions = positionPersistence.loadFlowPositions(currentFlow.id);
    
    // Determinar si es la primera carga del flujo
    const isInitialLoad = !initialRenderCompleteRef.current;
    
    migrationLog('DATA_TRANSFORMERS', 'Processing nodes transformation', {
      totalNodes: currentFlow.nodes.length,
      validNodes: validNodes.length,
      duplicatesFiltered: currentFlow.nodes.length - validNodes.length,
      isInitialLoad,
      persistedPositionsCount: persistedPositions.size
    });
    
    const converted = validNodes.map((node: any) => {
      // FASE 3: Usar la función determineFinalPosition para obtener la posición final
      const finalPosition = determineFinalPosition(
        node.id, 
        node.position, 
        nodePositionsRef, 
        persistedPositions,
        isInitialLoad
      );
      
      // Guardar la posición calculada en nuestro ref
      nodePositionsRef.current.set(node.id, finalPosition);
      
      const isSelected = node.id === selectedNodeId;
      
      const transformedNode = {
        id: node.id,
        type: node.type,
        position: finalPosition, // Usar la posición con prioridad
        data: {
          ...node.data,
          nodeType: node.type,
          onNodeClick: (nodeId: string) => actions.selectNode(nodeId),
          onNodeDelete: (nodeId: string) => actions.removeNode(nodeId)
        },
        selected: isSelected, // Usar selectedNodeId del estado para sincronización
        // Asegurar que los nodos sean arrastrables
        draggable: true
      };
      
      migrationLog('DATA_TRANSFORMERS', 'Node transformed', {
        nodeId: node.id,
        position: finalPosition,
        isSelected
      });
      
      return transformedNode;
    });
    
    // Marcar la renderización inicial como completada
    initialRenderCompleteRef.current = true;
    
    performanceMonitor('initialNodes transformation', startTime);
    migrationLog('DATA_TRANSFORMERS', 'Nodes transformation completed', {
      totalConverted: converted.length,
      initialRenderComplete: true
    });
    
    return converted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFlow, actions, positionPersistence, currentNodesSignature, forceUpdateCounter]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    const startTime = performance.now();
    migrationLog('DATA_TRANSFORMERS', 'Starting initialEdges transformation');
    
    if (!currentFlow) {
      migrationLog('DATA_TRANSFORMERS', 'No current flow, returning empty edges');
      return [];
    }
    
    // Filtrar cualquier conexión que tenga nodos inexistentes
    const validNodeIds = currentFlow.nodes.map((node: any) => node.id);
    const validConnections = currentFlow.connections.filter((conn: any) => 
      validNodeIds.includes(conn.sourceNodeId) && validNodeIds.includes(conn.targetNodeId)
    );
    
    if (validConnections.length !== currentFlow.connections.length) {
      const filteredCount = currentFlow.connections.length - validConnections.length;
      logger.warn('Filtered out invalid connections:', filteredCount);
      migrationLog('DATA_TRANSFORMERS', 'Invalid connections filtered', {
        total: currentFlow.connections.length,
        valid: validConnections.length,
        filtered: filteredCount
      });
    }
    
    const converted = validConnections.map((connection: any) => {
      const transformedEdge = {
        id: connection.id,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'smoothbezier' as const,
        animated: false,
        style: {
          stroke: connection.style?.stroke || '#94a3b8',
          strokeWidth: connection.style?.strokeWidth || 2
        },
        data: {
          connectionId: connection.id
        }
      };
      
      migrationLog('DATA_TRANSFORMERS', 'Edge transformed', {
        edgeId: connection.id,
        source: connection.sourceNodeId,
        target: connection.targetNodeId
      });
      
      return transformedEdge;
    });
    
    performanceMonitor('initialEdges transformation', startTime);
    migrationLog('DATA_TRANSFORMERS', 'Edges transformation completed', {
      totalConverted: converted.length
    });
    
    return converted;
  }, [currentFlow]); // CORRECCIÓN: Mantener dependencia completa para asegurar recálculo

  return {
    initialNodes,
    initialEdges,
    getNodesSignature,
    forceUpdateCounter,
    currentNodesSignature,
    initialRenderCompleteRef
  };
};
