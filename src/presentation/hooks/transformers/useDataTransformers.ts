/**
 * Transformadores de datos para el flow designer
 * Paso 3 de la modularización gradual - Funciones de transformación seguras
 */
import type { FlowNode, ConnectionProps } from '../../../shared/types';

/**
 * Convierte nodos del dominio a formato ReactFlow
 */
export const convertNodesToReactFlow = (
  validNodes: FlowNode[],
  selectedNodeId: string | null,
  nodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
  determineFinalPosition: (
    nodeId: string,
    statePosition: any,
    positionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
    persistedPositions: Map<string, any>,
    isInitialLoad?: boolean
  ) => { x: number, y: number },
  persistedPositions: Map<string, any>,
  isInitialLoad: boolean,
  actions: any
) => {
  return validNodes.map(node => {
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
    
    return {
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
  });
};

/**
 * Convierte conexiones del dominio a formato ReactFlow
 */
export const convertConnectionsToReactFlow = (validConnections: ConnectionProps[]) => {
  return validConnections.map(connection => {
    return {
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
  });
};

/**
 * Filtra nodos válidos del flujo actual (nodos del dominio)
 */
export const filterValidNodes = (nodes: any[] | undefined): any[] => {
  if (!nodes || !Array.isArray(nodes)) {
    return [];
  }
  
  // Implementar lógica similar a la original para eliminar duplicados
  const uniqueNodesMap = new Map();
  nodes.forEach(node => {
    // Verificar que el nodo tenga un ID válido
    if (!node?.id) {
      return;
    }
    
    // Almacenar solo una instancia por ID
    uniqueNodesMap.set(node.id, node);
  });
  
  return Array.from(uniqueNodesMap.values());
};

/**
 * Filtra conexiones válidas del flujo actual
 */
export const filterValidConnections = (connections: ConnectionProps[] | undefined): ConnectionProps[] => {
  if (!connections || !Array.isArray(connections)) {
    return [];
  }
  
  return connections.filter(connection => 
    connection && 
    typeof connection.id === 'string' && 
    connection.id.trim() !== '' &&
    typeof connection.sourceNodeId === 'string' && 
    connection.sourceNodeId.trim() !== '' &&
    typeof connection.targetNodeId === 'string' && 
    connection.targetNodeId.trim() !== ''
  );
};
