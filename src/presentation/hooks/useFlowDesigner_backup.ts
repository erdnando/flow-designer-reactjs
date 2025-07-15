import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useReactFlow, useNodesState, useEdgesState } from 'reactflow';
import { useFlowContext } from '../context/FlowContext';
import type { FlowNode, FlowEdge, NodeType } from '../../shared/types';
import { NODE_TYPES } from '../../shared/constants';
import { PositionPersistenceService } from '../../infrastructure/services/PositionPersistenceService';
import { Position } from '../../domain/value-objects/Position';

export const useFlowDesigner = () => {
  const { state, actions } = useFlowContext();
  const { project } = useReactFlow();
  
  // Servicio de persistencia de posiciones
  const positionPersistence = useMemo(() => new PositionPersistenceService(), []);
  
  // Tracking de nodos que están siendo arrastrados activamente
  const draggingNodesRef = useRef<Set<string>>(new Set());
  
  // Mantener las posiciones de los nodos de forma controlada
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Convertir entidades del dominio a formato React Flow
  const initialNodes: FlowNode[] = useMemo(() => {
    console.log('🔧 useFlowDesigner: Converting nodes...');
    console.log('🔧 Current flow exists:', !!state.currentFlow);
    
    if (!state.currentFlow) {
      console.log('🔧 No current flow, returning empty array');
      return [];
    }
    
    console.log('🔧 Flow nodes count:', state.currentFlow.nodes.length);
    console.log('🔧 Flow nodes:', state.currentFlow.nodes);
    
    // Cargar posiciones persistidas
    const persistedPositions = positionPersistence.loadFlowPositions(state.currentFlow.id);
    console.log('💾 Loaded persisted positions:', persistedPositions.size);
    
    const converted = state.currentFlow.nodes.map(node => {
      console.log('🔧 Converting node:', node);
      
      // PRIORIDAD DE POSICIONES: 1. Ref actual, 2. Posición persistida, 3. Posición del estado
      const existingPosition = nodePositionsRef.current.get(node.id);
      const persistedPosition = persistedPositions.get(node.id);
      const finalPosition = existingPosition || persistedPosition || node.position;
      
      console.log(`🔧 Node ${node.id} - State position:`, node.position, 'Ref position:', existingPosition, 'Persisted position:', persistedPosition, 'Final position:', finalPosition);
      
      // Guardar la posición actual en nuestro ref
      nodePositionsRef.current.set(node.id, finalPosition);
      
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
        selected: node.selected,
        // Asegurar que los nodos sean arrastrables
        draggable: true
      };
    });
    
    console.log('✅ Converted nodes:', converted);
    return converted;
  }, [state.currentFlow, actions, positionPersistence]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    console.log('🔧 useFlowDesigner: Converting connections to edges...');
    console.log('🔧 Current flow exists:', !!state.currentFlow);
    
    if (!state.currentFlow) {
      console.log('🔧 No current flow, returning empty edges array');
      return [];
    }
    
    console.log('🔧 Flow connections count:', state.currentFlow.connections.length);
    console.log('🔧 Flow connections:', state.currentFlow.connections);
    
    // Filtrar cualquier conexión que tenga nodos inexistentes
    const validNodeIds = state.currentFlow.nodes.map(node => node.id);
    const validConnections = state.currentFlow.connections.filter(conn => 
      validNodeIds.includes(conn.sourceNodeId) && validNodeIds.includes(conn.targetNodeId)
    );
    
    if (validConnections.length !== state.currentFlow.connections.length) {
      console.log('⚠️ Filtered out invalid connections:', 
        state.currentFlow.connections.length - validConnections.length);
    }
    
    const converted = validConnections.map(connection => {
      console.log('🔧 Converting connection to edge:', connection);
      return {
        id: connection.id,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'smoothstep' as const,
        animated: true,
        style: {
          stroke: connection.style?.stroke || '#94a3b8',
          strokeWidth: connection.style?.strokeWidth || 2
        },
        data: {
          connectionId: connection.id
        }
      };
    });
    
    console.log('✅ Converted edges:', converted);
    return converted;
  }, [state.currentFlow]);

  // Usar ReactFlow's state management para nodes y edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Ref para evitar loops de sincronización
  const isSyncingRef = useRef(false);
  const lastSyncedNodesRef = useRef<string>('');
  const lastSyncedEdgesRef = useRef<string>('');

  // Sincronizar nodes cuando el estado cambie - ULTRA PROTECCIÓN CONTRA LOOPS
  useEffect(() => {
    if (isSyncingRef.current) {
      console.log('🔄 Already syncing, skipping nodes sync');
      return;
    }

    console.log('🔄 Syncing nodes with state...');
    console.log('🔄 Current nodes count:', nodes.length);
    console.log('🔄 Initial nodes count:', initialNodes.length);
    
    // Crear una firma más detallada que incluya posiciones redondeadas
    const initialNodesSignature = JSON.stringify(
      initialNodes.map(n => ({ 
        id: n.id, 
        x: n.position ? Math.round(n.position.x) : 0, 
        y: n.position ? Math.round(n.position.y) : 0 
      }))
    );
    
    const currentNodesSignature = JSON.stringify(
      nodes.map(n => ({ 
        id: n.id, 
        x: n.position ? Math.round(n.position.x) : 0, 
        y: n.position ? Math.round(n.position.y) : 0 
      }))
    );
    
    console.log('🔄 Last synced nodes signature:', lastSyncedNodesRef.current);
    console.log('🔄 Current nodes signature:', currentNodesSignature);
    console.log('🔄 Initial nodes signature:', initialNodesSignature);
    
    // Solo sincronizar si hay cambios estructurales REALES (no solo posiciones micro)
    const hasStructuralChanges = initialNodes.length !== nodes.length ||
      initialNodes.some(initialNode => !nodes.find(currentNode => currentNode.id === initialNode.id));
    
    console.log('🔄 Has structural changes:', hasStructuralChanges);
    
    if (hasStructuralChanges && lastSyncedNodesRef.current !== initialNodesSignature) {
      console.log('🔄 Structural changes detected, syncing...');
      
      isSyncingRef.current = true;
      
      // Actualizar las posiciones de referencia antes de sincronizar
      initialNodes.forEach(node => {
        if (node.position && 
            typeof node.position.x === 'number' && 
            typeof node.position.y === 'number') {
          const roundedPosition = {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y)
          };
          nodePositionsRef.current.set(node.id, roundedPosition);
        } else {
          console.log('⚠️ Invalid position data during sync:', node.position);
        }
      });
      
      setNodes(initialNodes);
      lastSyncedNodesRef.current = initialNodesSignature;
      
      // Liberar el lock después de un breve delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 150);
    } else {
      console.log('🔄 No structural changes or already synced, skipping');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, setNodes]);

  // Sincronizar edges cuando el estado cambie
  useEffect(() => {
    if (isSyncingRef.current) {
      console.log('🔄 Already syncing, skipping edges sync');
      return;
    }

    console.log('🔄 Syncing edges with state...');
    console.log('🔄 Current edges count:', edges.length);
    console.log('🔄 Initial edges count:', initialEdges.length);
    
    // Crear una firma única para los edges iniciales
    const initialEdgesSignature = JSON.stringify(
      initialEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    );
    
    console.log('🔄 Last synced edges signature:', lastSyncedEdgesRef.current);
    console.log('🔄 Current initial edges signature:', initialEdgesSignature);
    
    // Solo sincronizar si la firma ha cambiado
    if (lastSyncedEdgesRef.current !== initialEdgesSignature) {
      console.log('🔄 Edge signature changed, syncing...');
      
      isSyncingRef.current = true;
      
      setEdges(initialEdges);
      lastSyncedEdgesRef.current = initialEdgesSignature;
      
      // Liberar el lock después de un breve delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    } else {
      console.log('🔄 Edges signature unchanged, skipping');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdges, setEdges]);

  // INTERCEPTOR NUCLEAR - Bloquear TODOS los cambios de posición no autorizados
  const handleNodesChange = useCallback((changes: any[]) => {
    console.log('🔧 ===== NUCLEAR INTERCEPTOR =====');
    console.log('🔧 Raw changes received:', changes);
    console.log('🔧 Currently dragging nodes:', Array.from(draggingNodesRef.current));
    console.log('🔧 Is syncing:', isSyncingRef.current);
    
    // SUPER AGRESIVO: Bloquear CUALQUIER cambio que pueda afectar la posición
    const authorizedChanges = changes.filter(change => {
      console.log('🔍 Analyzing change:', change);
      
      // PERMITIR cambios de agregado de nodos (add)
      if (change.type === 'add') {
        console.log('✅ AUTHORIZED: Adding new node:', change.id);
        // Asegurar que la posición se registre en nuestro ref con redondeo
        if (change.item && change.item.position && 
            typeof change.item.position.x === 'number' && 
            typeof change.item.position.y === 'number') {
          const roundedPosition = {
            x: Math.round(change.item.position.x),
            y: Math.round(change.item.position.y)
          };
          nodePositionsRef.current.set(change.item.id, roundedPosition);
        } else {
          console.log('⚠️ Invalid position data during node add:', change.item?.position);
        }
        return true;
      }
      
      // PERMITIR cambios de reemplazo completo de nodos (replace) SOLO durante sincronización
      if (change.type === 'replace') {
        if (isSyncingRef.current) {
          console.log('✅ AUTHORIZED: Replacing nodes during sync:', change);
          // Actualizar nuestras referencias con las nuevas posiciones redondeadas
          if (change.item && Array.isArray(change.item)) {
            change.item.forEach((node: any) => {
              if (node.position && 
                  typeof node.position.x === 'number' && 
                  typeof node.position.y === 'number') {
                const roundedPosition = {
                  x: Math.round(node.position.x),
                  y: Math.round(node.position.y)
                };
                nodePositionsRef.current.set(node.id, roundedPosition);
              } else {
                console.log('⚠️ Invalid position data during node replace:', node.position);
              }
            });
          }
          return true;
        } else {
          console.log('🚫 BLOCKED: Replace not during sync:', change);
          return false;
        }
      }
      
      // BLOQUEAR cambios de posición
      if (change.type === 'position') {
        // REGLA NUCLEAR: Solo permitir si dragging está definido
        if (change.dragging === undefined) {
          console.log('🚫 NUCLEAR BLOCK: Automatic position change for node:', change.id);
          return false;
        }
        
        if (change.dragging === true) {
          console.log('✅ AUTHORIZED: User started dragging node:', change.id);
          draggingNodesRef.current.add(change.id);
          // Validar que la posición existe antes de procesarla
          if (change.position && typeof change.position.x === 'number' && typeof change.position.y === 'number') {
            const roundedPosition = {
              x: Math.round(change.position.x),
              y: Math.round(change.position.y)
            };
            nodePositionsRef.current.set(change.id, roundedPosition);
          } else {
            console.log('⚠️ Invalid position data during drag start:', change.position);
          }
          return true;
        }
        
        if (change.dragging === false) {
          if (draggingNodesRef.current.has(change.id)) {
            console.log('✅ AUTHORIZED: User finished dragging node:', change.id);
            draggingNodesRef.current.delete(change.id);
            // Validar que la posición existe antes de procesarla
            if (change.position && typeof change.position.x === 'number' && typeof change.position.y === 'number') {
              const roundedPosition = {
                x: Math.round(change.position.x),
                y: Math.round(change.position.y)
              };
              nodePositionsRef.current.set(change.id, roundedPosition);
            } else {
              console.log('⚠️ Invalid position data during drag end:', change.position);
            }
            return true;
          } else {
            console.log('🚫 UNAUTHORIZED: Drag end for node not being dragged:', change.id);
            return false;
          }
        }
        
        console.log('🚫 BLOCKED: Unknown dragging state:', change);
        return false;
      }
      
      // BLOQUEAR cambios de dimensiones que no estén relacionados con arrastre
      if (change.type === 'dimensions') {
        if (change.dragging === undefined) {
          console.log('🚫 NUCLEAR BLOCK: Automatic dimensions change for node:', change.id);
          return false;
        }
        console.log('✅ AUTHORIZED: Dimensions change during drag for node:', change.id);
        return true;
      }
      
      // SOLO permitir cambios de selección y eliminación
      if (change.type === 'select' || change.type === 'remove') {
        console.log('✅ AUTHORIZED: Safe change type:', change.type);
        return true;
      }
      
      // BLOQUEAR cualquier otro tipo de cambio desconocido
      console.log('🚫 BLOCKED: Unknown change type:', change.type, change);
      return false;
    });
    
    console.log('🔧 Authorized changes:', authorizedChanges);
    
    // Si no hay cambios autorizados, restaurar posiciones originales
    if (authorizedChanges.length === 0) {
      console.log('⚠️ All changes blocked by nuclear interceptor');
      
      // RESTAURAR POSICIONES ORIGINALES si hay cambios de posición bloqueados
      const hasBlockedPositionChanges = changes.some(change => 
        change.type === 'position' && change.dragging === undefined
      );
      
      if (hasBlockedPositionChanges) {
        console.log('🔄 RESTORING all node positions to original state');
        
        // Crear un mapa de posiciones originales
        const restoredNodes = nodes.map(node => {
          const originalPosition = nodePositionsRef.current.get(node.id);
          if (originalPosition) {
            console.log(`🔄 Restoring ${node.id} from ${JSON.stringify(node.position)} to ${JSON.stringify(originalPosition)}`);
            return {
              ...node,
              position: originalPosition
            };
          }
          return node;
        });
        
        // Aplicar las posiciones restauradas
        setNodes(restoredNodes);
      }
      
      return;
    }
    
    // Aplicar cambios autorizados a ReactFlow
    onNodesChange(authorizedChanges);
    
    // Procesar para nuestro estado
    authorizedChanges.forEach(change => {
      if (change.type === 'remove') {
        console.log('🗑️ Node removed:', change.id);
        nodePositionsRef.current.delete(change.id);
        draggingNodesRef.current.delete(change.id);
        
        // Limpiar la posición persistida
        if (state.currentFlow) {
          positionPersistence.removeNodePosition(state.currentFlow.id, change.id);
          console.log('💾 Persisted position removed for node:', change.id);
        }
        
        actions.removeNode(change.id);
      } else if (change.type === 'select') {
        console.log('🔍 Node selection changed for:', change.id, 'Selected:', change.selected);
        if (change.selected) {
          actions.selectNode(change.id);
        }
      } else if (change.type === 'position' && change.position && change.dragging === false) {
        console.log('📍 Final position update for:', change.id, 'Position:', change.position);
        // Validar que la posición tiene las propiedades correctas
        if (typeof change.position.x === 'number' && typeof change.position.y === 'number') {
          const roundedPosition = {
            x: Math.round(change.position.x),
            y: Math.round(change.position.y)
          };
          
          // Persistir la posición inmediatamente
          if (state.currentFlow) {
            const domainPosition = new Position(roundedPosition.x, roundedPosition.y);
            positionPersistence.updateNodePosition(state.currentFlow.id, change.id, domainPosition);
            console.log('💾 Position persisted for node:', change.id);
          }
          
          actions.moveNode(change.id, roundedPosition);
          console.log('✅ Node position saved to repository');
        } else {
          console.log('⚠️ Invalid position data in final update:', change.position);
        }
      }
    });
    
    console.log('🔧 ===== END NUCLEAR INTERCEPTOR =====');
  }, [onNodesChange, actions, nodes, setNodes, positionPersistence, state.currentFlow]);

  // Wrapper para onEdgesChange que maneja nuestro estado personalizado
  const handleEdgesChange = useCallback((changes: any[]) => {
    console.log('🔧 handleEdgesChange called with changes:', changes);
    
    // Primero aplicar los cambios a ReactFlow
    onEdgesChange(changes);
    
    // Luego procesar los cambios para nuestro estado personalizado
    changes.forEach(change => {
      if (change.type === 'remove') {
        console.log('🗑️ Edge removed:', change.id);
        actions.removeConnection(change.id);
      }
    });
  }, [onEdgesChange, actions]);

  const onConnect = useCallback((params: any) => {
    console.log('🔗 onConnect called with params:', params);
    
    if (!params.source || !params.target) {
      console.error('❌ Missing source or target in connection params');
      return;
    }
    
    // Log completo para depurar
    console.log('🔍 Connection details:', {
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle
    });
    
    actions.addConnection(
      params.source,
      params.target,
      params.sourceHandle,
      params.targetHandle
    );
  }, [actions]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const nodeType = event.dataTransfer.getData('application/reactflow');
    console.log('🎯 Drop detected! NodeType:', nodeType);
    
    if (!nodeType) {
      console.log('❌ No nodeType found in dataTransfer');
      return;
    }

    // Obtener la posición relativa al canvas de ReactFlow
    const reactFlowBounds = (event.currentTarget as Element).getBoundingClientRect();
    const rawPosition = project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    console.log('📍 Raw drop position:', rawPosition);
    
    // AJUSTAR POSICIÓN PARA EVITAR SOLAPAMIENTO
    const adjustedPosition = { ...rawPosition };
    
    // Verificar si hay nodos cercanos y ajustar posición
    const existingNodes = nodes;
    const minDistance = 150; // Distancia mínima entre nodos
    
    let attempts = 0;
    let positionOk = false;
    
    while (!positionOk && attempts < 10) {
      positionOk = true;
      
      for (const existingNode of existingNodes) {
        const distance = Math.sqrt(
          Math.pow(adjustedPosition.x - existingNode.position.x, 2) +
          Math.pow(adjustedPosition.y - existingNode.position.y, 2)
        );
        
        if (distance < minDistance) {
          console.log(`🔄 Position too close to node ${existingNode.id} (distance: ${distance}), adjusting...`);
          // Mover hacia abajo y ligeramente a la derecha
          adjustedPosition.x += 30;
          adjustedPosition.y += 50;
          positionOk = false;
          break;
        }
      }
      
      attempts++;
    }
    
    console.log('📍 Final adjusted position:', adjustedPosition);
    console.log('🔧 Calling addNode with:', { nodeType, position: adjustedPosition });
    
    try {
      actions.addNode(nodeType, adjustedPosition);
      console.log('✅ addNode called successfully');
      
      // Persistir la posición del nuevo nodo
      if (state.currentFlow) {
        // Generar un ID temporal para el nodo (el ID real se generará en el useCase)
        // Esto se sincronizará cuando el nodo se agregue al estado
        console.log('💾 New node position will be persisted after state update');
      }
    } catch (error) {
      console.error('❌ Error in addNode:', error);
    }
  }, [actions, project, nodes, state.currentFlow]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    console.log('🔄 Drag over canvas');
  }, []);

  const getSelectedNode = useCallback(() => {
    if (!state.currentFlow || !state.selectedNodeId) return null;
    return state.currentFlow.nodes.find(node => node.id === state.selectedNodeId) || null;
  }, [state.currentFlow, state.selectedNodeId]);

  const getNodeTypeConfig = useCallback((nodeType: NodeType) => {
    return NODE_TYPES[nodeType];
  }, []);

  const getPersistenceStats = useCallback(() => {
    return positionPersistence.getStats();
  }, [positionPersistence]);

  const clearPersistedPositions = useCallback(() => {
    if (state.currentFlow) {
      positionPersistence.clearFlowPositions(state.currentFlow.id);
      console.log('🧹 Cleared persisted positions for current flow');
    }
  }, [positionPersistence, state.currentFlow]);

  return {
    // Estado
    nodes: nodes,
    edges: edges,
    selectedNode: getSelectedNode(),
    isLoading: state.isLoading,
    error: state.error,
    
    // Handlers React Flow
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    
    // Funciones de utilidad
    getNodeTypeConfig,
    getPersistenceStats,
    clearPersistedPositions,
    
    // Acciones
    addNode: actions.addNode,
    updateNode: actions.updateNode,
    removeNode: actions.removeNode,
    selectNode: actions.selectNode,
    createFlow: actions.createFlow,
    moveNode: actions.moveNode
  };
};
