import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useReactFlow, useNodesState, useEdgesState } from 'reactflow';
import { useFlowContext } from '../context/FlowContext';
import type { FlowNode, FlowEdge, NodeType } from '../../shared/types';
import { NODE_TYPES } from '../../shared/constants';
import { PositionPersistenceService } from '../../infrastructure/services/PositionPersistenceService';
import { Position } from '../../domain/value-objects/Position';
import { logger } from '../../shared/utils';

/**
 * Función utilidad para detectar cambios estructurales entre conjuntos de nodos
 * @param sourceNodes - Los nodos de origen (generalmente del estado de la aplicación)
 * @param targetNodes - Los nodos destino (generalmente del estado de ReactFlow)
 * @returns True si hay cambios estructurales significativos (nodos añadidos/eliminados)
 */
const detectStructuralChanges = (
  sourceNodes: { id: string }[], 
  targetNodes: { id: string }[]
): boolean => {
  // Caso 1: Diferente número de nodos
  if (sourceNodes.length !== targetNodes.length) {
    return true;
  }
  
  // Caso 2: Verificar si todos los IDs coinciden
  const sourceIds = new Set(sourceNodes.map(node => node.id));
  
  // Verificar si hay algún nodo en target que no esté en source
  const hasUnknownNodes = targetNodes.some(node => !sourceIds.has(node.id));
  if (hasUnknownNodes) {
    return true;
  }
  
  // Verificar si el número de IDs únicos coincide con el número de nodos
  // (esto detecta duplicados en cualquier colección)
  if (sourceIds.size !== sourceNodes.length) {
    return true;
  }
  
  return false; // No hay cambios estructurales
};

/**
 * Función utilidad para validar y redondear coordenadas de posición
 * @param position - La posición a validar
 * @returns La posición redondeada o undefined si no es válida
 */
const validateAndRoundPosition = (position: any): { x: number, y: number } | undefined => {
  if (position && 
      typeof position.x === 'number' && 
      typeof position.y === 'number' &&
      !isNaN(position.x) && 
      !isNaN(position.y)) {
    return {
      x: Math.round(position.x),
      y: Math.round(position.y)
    };
  }
  return undefined;
};

/**
 * Función utilidad para determinar la posición final de un nodo considerando todas las fuentes
 * @param nodeId - El ID del nodo
 * @param statePosition - Posición almacenada en el estado
 * @param positionsRef - Referencia de posiciones actuales
 * @param persistedPositions - Mapa de posiciones persistidas
 * @returns La posición final a utilizar para el nodo
 */
const determineFinalPosition = (
  nodeId: string,
  statePosition: any,
  positionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
  persistedPositions: Map<string, any>,
  isInitialLoad: boolean = false
): { x: number, y: number } => {
  // NUEVA PRIORIDAD DE POSICIONES:
  // 1. Posición persistida (del localStorage) - Más prioritario para mantener la última posición conocida
  // 2. Ref actual (posición más reciente en la UI)
  // 3. Posición del estado (del modelo de dominio)
  // 4. Posición por defecto calculada (espaciada y no amontonada)
  
  // PRIMERO verificar si hay una posición persistida (esto mantiene la posición después del refresh)
  const persistedPosition = persistedPositions.get(nodeId);
  if (persistedPosition) {
    const validatedPosition = validateAndRoundPosition(persistedPosition);
    if (validatedPosition) {
      logger.debug(`Using persisted position for node ${nodeId}:`, validatedPosition);
      return validatedPosition;
    }
  }
  
  // SEGUNDO, usar la referencia actual si existe
  const existingPosition = positionsRef.current.get(nodeId);
  if (existingPosition) {
    logger.debug(`Using position from ref for node ${nodeId}:`, existingPosition);
    return existingPosition;
  }
  
  // TERCERO, usar la posición del estado (modelo de dominio) si es válida
  const validatedStatePos = validateAndRoundPosition(statePosition);
  if (validatedStatePos) {
    logger.debug(`Using state position for node ${nodeId}:`, validatedStatePos);
    return validatedStatePos;
  }
  
  // Si todo falla, generar una posición por defecto calculada para evitar el amontonamiento
  // Usamos el nodeId como semilla para distribuir los nodos de manera determinística
  // Esto asegura que cada nodo tenga su propia posición única basada en su ID
  // y que siempre aparezca en la misma posición en cada carga si no hay otra información
  const seed = nodeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Creamos una cuadrícula virtual para distribuir los nodos de manera espaciada
  // con 5 columnas, cada una de 150px de ancho
  const x = 100 + (seed % 5) * 150; // Distribuir horizontalmente
  const y = 100 + Math.floor((seed % 25) / 5) * 150; // Distribuir verticalmente en 5 filas
  
  logger.debug(`No position found for node ${nodeId}, using calculated position:`, { x, y });
  return { x, y };
};

/**
 * Función para manejar la eliminación de nodos con feedback visual
 * @param nodeId - ID del nodo a eliminar
 * @param setNodes - Función para actualizar nodos en React Flow
 * @param actions - Acciones de FlowContext
 * @param isSyncingRef - Referencia al estado de sincronización
 * @returns Promesa que se resuelve cuando la eliminación visual está completa
 */
const handleNodeDeletion = async (
  nodeId: string,
  setNodes: (updater: any) => void,
  actions: any,
  isSyncingRef: React.MutableRefObject<boolean>
): Promise<void> => {
  // Activar bloqueo de sincronización
  isSyncingRef.current = true;
  
  // Paso 1: Marcar visualmente el nodo como "en proceso de eliminación"
  setNodes((currNodes: any[]) => 
    currNodes.map(node => 
      node.id === nodeId 
        ? { 
            ...node, 
            style: { ...node.style, opacity: 0.2 },
            data: { 
              ...node.data,
              config: { ...node.data?.config, _deletionInProgress: true }
            }
          }
        : node
    )
  );
  
  // Esperar a que la animación visual se complete
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    // Paso 2: Eliminar del modelo de dominio (a través de FlowContext)
    await actions.removeNode(nodeId);
    
    // Paso 3: Eliminar completamente de React Flow
    setNodes((currNodes: any[]) => currNodes.filter(node => node.id !== nodeId));
    
    // Esperar para asegurar que la UI se actualiza
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Paso 4: Forzar refresh del canvas
    try {
      const instance = document.querySelector('.react-flow');
      if (instance) {
        instance.dispatchEvent(new Event('refresh', { bubbles: true }));
      }
    } catch (e) {
      console.warn('No se pudo forzar refresh del canvas:', e);
    }
    
  } catch (error) {
    console.error('Error al eliminar nodo:', error);
    
    // Failsafe: intentar eliminar de la UI si falla la acción
    setNodes((currNodes: any[]) => currNodes.filter(n => n.id !== nodeId));
  } finally {
    // Liberar el bloqueo después de todas las operaciones
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  }
};

export const useFlowDesigner = () => {
  const { state, actions } = useFlowContext();
  const { project } = useReactFlow();
  
  // Servicio de persistencia de posiciones
  const positionPersistence = useMemo(() => new PositionPersistenceService(), []);
  
  // Tracking de nodos que están siendo arrastrados activamente
  const draggingNodesRef = useRef<Set<string>>(new Set());
  
  // Mantener las posiciones de los nodos de forma controlada
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Flag para saber si debemos forzar persistencia
  const forcePersistenceRef = useRef<boolean>(false);

  // CORRECCIÓN: Flag para depuración
  const initialRenderCompleteRef = useRef(false);
  
  // Convertir entidades del dominio a formato React Flow
  const initialNodes: FlowNode[] = useMemo(() => {
    // CORRECCIÓN: Mejor diagnóstico
    const renderCount = initialRenderCompleteRef.current ? 'ACTUALIZACIÓN' : 'PRIMERA RENDERIZACIÓN';
    logger.info(`🔍 ${renderCount}: Convirtiendo nodos del dominio a React Flow`);
    logger.debug('Current flow exists:', !!state.currentFlow);
    
    if (!state.currentFlow) {
      logger.debug('No current flow, returning empty array');
      return [];
    }
    
    // CORRECCIÓN: Eliminar nodos duplicados por ID y detectar nodos fantasma
    const uniqueNodesMap = new Map();
    state.currentFlow.nodes.forEach(node => {
      // Verificar que el nodo tenga un ID válido
      if (!node.id) {
        logger.warn('⚠️ Detectado nodo sin ID, omitiendo');
        return;
      }
      
      // Almacenar solo una instancia por ID
      uniqueNodesMap.set(node.id, node);
    });
    
    // Usar directamente los nodos únicos (ya filtrados por ID)
    const validNodes = Array.from(uniqueNodesMap.values());
    
    // CORRECCIÓN: Diagnóstico detallado
    const nodeIds = validNodes.map(n => n.id).join(', ');
    logger.info(`📋 Flow nodes count: ${validNodes.length}, IDs: [${nodeIds}]`);
    logger.debug('Flow nodes details:', validNodes);
    
    // Cargar posiciones persistidas
    const persistedPositions = positionPersistence.loadFlowPositions(state.currentFlow.id);
    logger.debug('Loaded persisted positions:', persistedPositions.size);
    
    // Determinar si es la primera carga del flujo
    const isInitialLoad = !initialRenderCompleteRef.current;
    if (isInitialLoad) {
      logger.info('🔄 Initial load detected - prioritizing persisted positions to preserve last known layout');
    }
    
    // Precargar y verificar posiciones persistidas
    logger.debug(`Loaded ${persistedPositions.size} persisted positions`);
    if (persistedPositions.size > 0) {
      // Log a sample of persisted positions
      const sampleNodeId = Array.from(persistedPositions.keys())[0];
      if (sampleNodeId) {
        logger.debug(`Sample persisted position for node ${sampleNodeId}:`, persistedPositions.get(sampleNodeId));
      }
    }
    
    const converted = validNodes.map(node => {
      logger.debug('Converting node:', node);
      
      // FASE 3: Usar la función determineFinalPosition para obtener la posición final
      const finalPosition = determineFinalPosition(
        node.id, 
        node.position, 
        nodePositionsRef, 
        persistedPositions,
        isInitialLoad
      );
      
      logger.debug(`Node ${node.id} - State position:`, node.position, 
                  'Ref position:', nodePositionsRef.current.get(node.id), 
                  'Persisted position:', persistedPositions.get(node.id), 
                  'Final position:', finalPosition);
      
      // Guardar la posición calculada en nuestro ref
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
    
    logger.success(`Converted nodes: ${converted.length} nodos procesados`);
    
    // Marcar la renderización inicial como completada
    initialRenderCompleteRef.current = true;
    
    return converted;
  }, [state.currentFlow, actions, positionPersistence]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    logger.debug('useFlowDesigner: Converting connections to edges...');
    logger.debug('Current flow exists:', !!state.currentFlow);
    
    if (!state.currentFlow) {
      logger.debug('No current flow, returning empty edges array');
      return [];
    }
    
    logger.debug('Flow connections count:', state.currentFlow.connections.length);
    logger.debug('Flow connections:', state.currentFlow.connections);
    
    // Filtrar cualquier conexión que tenga nodos inexistentes
    const validNodeIds = state.currentFlow.nodes.map(node => node.id);
    const validConnections = state.currentFlow.connections.filter(conn => 
      validNodeIds.includes(conn.sourceNodeId) && validNodeIds.includes(conn.targetNodeId)
    );
    
    if (validConnections.length !== state.currentFlow.connections.length) {
      logger.warn('Filtered out invalid connections:', 
        state.currentFlow.connections.length - validConnections.length);
    }
    
    const converted = validConnections.map(connection => {
      logger.debug('Converting connection to edge:', connection);
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
    
    logger.success('Converted edges:', converted);
    return converted;
  }, [state.currentFlow]);

  // Usar ReactFlow's state management para nodes y edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Ref para evitar loops de sincronización
  const isSyncingRef = useRef(false);
  const lastSyncedNodesRef = useRef<string>('');
  const lastSyncedEdgesRef = useRef<string>('');

  // CORRECCIÓN: Agregar un flag para detectar la carga inicial
  const isFirstRenderRef = useRef(true);
  
  // Sincronizar nodes cuando el estado cambie - ULTRA PROTECCIÓN CONTRA LOOPS
  useEffect(() => {
    // SOLUCIÓN MEJORADA: Siempre permitir sincronización en la primera renderización
    const isInitialRender = isFirstRenderRef.current;
    if (isInitialRender) {
      logger.info('🔰 PRIMERA RENDERIZACIÓN DETECTADA - Siempre permitir sincronización');
      isFirstRenderRef.current = false;
    } else if (isSyncingRef.current) {
      logger.debug('Already syncing, skipping nodes sync');
      return;
    }

    logger.debug('Syncing nodes with state...');
    logger.debug('Current nodes count:', nodes.length);
    logger.debug('Initial nodes count:', initialNodes.length);
    
    // ANTI-FANTASMAS: Detectar y eliminar nodos que existen en la UI pero no en el estado
    if (!isInitialRender) {
      logger.info('🔍 VALIDACIÓN DE NODOS: Verificando integridad del canvas');
      
      // Extraer los IDs de nodos del estado para poder filtrar
      const validNodeIds = new Set(initialNodes.map(n => n.id));
      
      // Identificar nodos fantasma (existen en UI pero no en estado)
      const phantomNodes = nodes.filter(node => {
        // Considerar como fantasmas:
        // 1. Nodos que no existen en el estado
        // 2. Nodos marcados como "en proceso de eliminación" (usando data.config como campo seguro)
        return !validNodeIds.has(node.id) || (node.data?.config && node.data.config._deletionInProgress === true);
      });
      
      if (phantomNodes.length > 0) {
        logger.warn(`🔍 ${phantomNodes.length} nodos fantasma detectados:`, 
          phantomNodes.map(n => n.id).join(', '));
        
        // Eliminar nodos fantasma de la UI con efectos visuales
        logger.info('🧹 Eliminando nodos fantasma de la UI');
        
        // Paso 1: Marcar visualmente como eliminados
        setNodes(currentNodes => currentNodes.map(node => 
          phantomNodes.some(phantom => phantom.id === node.id)
            ? { ...node, style: { ...node.style, opacity: 0.2 } }
            : node
        ));
        
        // Paso 2: Eliminar completamente después de efecto visual
        setTimeout(() => {
          setNodes(currentNodes => 
            currentNodes.filter(node => 
              validNodeIds.has(node.id) && 
              !(node.data?.config && node.data.config._deletionInProgress === true)
            )
          );
          
          // Forzar actualización completa del canvas
          setTimeout(() => {
            try {
              const instance = document.querySelector('.react-flow');
              if (instance) {
                instance.dispatchEvent(new Event('refresh', { bubbles: true }));
              }
            } catch (e) {
              logger.warn('No se pudo forzar refresh del canvas:', e);
            }
          }, 50);
        }, 20);
        
        // Corto circuito - no ejecutar más sincronización
        return;
      }
    }
    
    // Crear una firma más detallada que incluya posiciones redondeadas (para cambios menores)
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
    
    logger.debug('Last synced nodes signature:', lastSyncedNodesRef.current);
    logger.debug('Current nodes signature:', currentNodesSignature);
    logger.debug('Initial nodes signature:', initialNodesSignature);
    
    // CASO ESPECIAL 1: Primera renderización - forzar sincronización
    if (isInitialRender && initialNodes.length > 0) {
      logger.info('🔄 Primera renderización con nodos existentes - forzando sincronización');
      
      // Aplicar los nodos iniciales directamente
      setNodes(initialNodes);
      
      // Actualizar la referencia de firma
      lastSyncedNodesRef.current = initialNodesSignature;
      
      return;
    }
    
    // CASO ESPECIAL 2: Carga inicial - si hay nodos para mostrar pero el canvas está vacío
    // Este caso resuelve el problema de nodos que no aparecen al cargar la página
    if (initialNodes.length > 0 && nodes.length === 0) {
      logger.info('🔄 Initial load detected, forcing node sync (FIX for missing nodes)');
      isSyncingRef.current = true;
      
      // FASE 3: Usar la función de validación para actualizar posiciones durante carga inicial
      initialNodes.forEach(node => {
        const roundedPosition = validateAndRoundPosition(node.position);
        if (roundedPosition) {
          nodePositionsRef.current.set(node.id, roundedPosition);
        } else {
          logger.warn('Invalid position data during initial sync:', node.position);
        }
      });
      
      // Aplicar los nodos iniciales directamente
      setNodes(initialNodes);
      
      // Actualizar la referencia de firma
      lastSyncedNodesRef.current = initialNodesSignature;
      
      // Liberar el lock después de un breve delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 150);
      
      return;
    }
    
    // FASE 1: Usar la función de detección de cambios estructurales mejorada
    // para identificar si hay cambios importantes en la estructura (adiciones/eliminaciones)
    const hasStructuralChanges = detectStructuralChanges(initialNodes, nodes);
    
    // Verificar si las firmas son diferentes (puede indicar un refresh o cambios de posición)
    const signaturesDiffer = lastSyncedNodesRef.current !== initialNodesSignature;
    
    logger.debug(`Detección de cambios: Estructurales=${hasStructuralChanges}, Firmas coinciden=${initialNodesSignature === currentNodesSignature}`);
    
    logger.debug('Has structural changes:', hasStructuralChanges);
    logger.debug('Signatures differ:', signaturesDiffer);
    
    // CORRECCIÓN: Si hay cambios estructurales O las firmas son diferentes, sincronizar
    if ((hasStructuralChanges || signaturesDiffer) && !isSyncingRef.current) {
      logger.info(`⚙️ Sincronizando nodos: ${hasStructuralChanges ? 'Cambios estructurales' : 'Firmas diferentes'}`);
      
      isSyncingRef.current = true;
      
      // FASE 3: Usar la función de validación para actualizar posiciones durante sincronización
      initialNodes.forEach(node => {
        const roundedPosition = validateAndRoundPosition(node.position);
        if (roundedPosition) {
          nodePositionsRef.current.set(node.id, roundedPosition);
        } else {
          logger.warn('Invalid position data during sync:', node.position);
        }
      });
      
      // SOLUCIÓN: Aplicar los nodos con un retraso mínimo para asegurar que React Flow esté listo
      setTimeout(() => {
        logger.info('🔄 Applying nodes after delay to ensure React Flow is ready');
        setNodes(initialNodes);
        lastSyncedNodesRef.current = initialNodesSignature;
        
        // Liberar el lock después de otro breve delay para evitar loops
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 150);
      }, 50);
    } else {
      logger.debug('No structural changes or already synced, skipping');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, setNodes]);
  
  // NUEVA SOLUCIÓN: Efecto específico para garantizar que los nodos se muestren correctamente después de la carga inicial
  useEffect(() => {
    // Solo ejecutar cuando tenemos un flujo actual
    if (state.currentFlow) {
      logger.info('🔍 VALIDACIÓN DE NODOS: Verificando integridad de nodos en el flujo');
      
      // Eliminar duplicados y asegurar sincronización completa
      if (state.currentFlow.nodes.length > 0) {
        // Crear un mapa para eliminar duplicados
        const uniqueNodesMap = new Map();
        state.currentFlow.nodes.forEach(node => {
          uniqueNodesMap.set(node.id, node);
        });
        
        // Verificar si hay duplicados
        if (uniqueNodesMap.size !== state.currentFlow.nodes.length) {
          logger.warn('⚠️ DETECCIÓN DE DUPLICADOS: El flujo contiene nodos duplicados');
          logger.info(`Original: ${state.currentFlow.nodes.length} nodos, Sin duplicados: ${uniqueNodesMap.size} nodos`);
        }
        
        // Si no hay nodos visibles pero deberían haberlos, forzar visualización
        if (nodes.length === 0 || nodes.length !== uniqueNodesMap.size) {
          logger.info('🔍 DETECCIÓN DE SEGURIDAD: Discrepancia entre nodos visibles y del flujo, forzando visualización');
          
          // Desactivar cualquier bloqueo previo
          isSyncingRef.current = false;
          
          // Forzar renderizado de nodos con retraso para asegurar que React Flow esté listo
          setTimeout(() => {
            logger.info('🔄 Forzando renderizado de nodos como salvaguardia final');
            setNodes(initialNodes);
            
            // Actualizar la firma de sincronización
            const initialNodesSignature = JSON.stringify(
              initialNodes.map(n => ({ 
                id: n.id, 
                x: n.position ? Math.round(n.position.x) : 0, 
                y: n.position ? Math.round(n.position.y) : 0 
              }))
            );
            lastSyncedNodesRef.current = initialNodesSignature;
          }, 300);
        }
      }
    }
  // Solo ejecutar cuando cambie el currentFlow o si hay un cambio en la cantidad de nodos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentFlow, nodes.length]);
  
  // NUEVA SOLUCIÓN: Efecto específico para forzar refresco visual después de eliminaciones
  useEffect(() => {
    // Buscar nodos marcados para eliminación
    const nodesBeingDeleted = nodes.filter(
      node => node.data?.config && node.data.config._deletionInProgress === true
    );
    
    if (nodesBeingDeleted.length > 0) {
      logger.info(`🔄 Detectados ${nodesBeingDeleted.length} nodos en proceso de eliminación`);
      
      // Forzar limpieza de nodos marcados para eliminación
      setTimeout(() => {
        logger.info('🧹 Limpiando nodos marcados para eliminación');
        setNodes(currentNodes => 
          currentNodes.filter(node => 
            !(node.data?.config && node.data.config._deletionInProgress === true)
          )
        );
        
        // Forzar actualización visual
        setTimeout(() => {
          try {
            // Forzar un reflow completo del canvas
            logger.info('🔄 Forzando refresco del canvas');
            
            // Opción 1: Refrescar vista (zoom y centrado)
            const reactFlowInstance = document.querySelector('.react-flow__viewport') as HTMLElement;
            if (reactFlowInstance) {
              // Crear un pequeño cambio de estilo para forzar reflow
              const currentTransform = reactFlowInstance.style.transform;
              reactFlowInstance.style.transform = 'none';
              // Forzar reflow
              reactFlowInstance.getBoundingClientRect();
              // Restaurar
              reactFlowInstance.style.transform = currentTransform;
            }
          } catch (e) {
            logger.warn('No se pudo forzar refresh del canvas:', e);
          }
        }, 20);
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Sincronizar edges cuando el estado cambie
  useEffect(() => {
    if (isSyncingRef.current) {    logger.debug('Already syncing, skipping edges sync');
    return;
  }

  logger.debug('Syncing edges with state...');
  logger.debug('Current edges count:', edges.length);
  logger.debug('Initial edges count:', initialEdges.length);
  
  // Crear una firma única para los edges iniciales
  const initialEdgesSignature = JSON.stringify(
    initialEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
  );
  
  logger.debug('Last synced edges signature:', lastSyncedEdgesRef.current);
  logger.debug('Current initial edges signature:', initialEdgesSignature);
  
  // Solo sincronizar si la firma ha cambiado
  if (lastSyncedEdgesRef.current !== initialEdgesSignature) {
    logger.info('Edge signature changed, syncing...');
      
      isSyncingRef.current = true;
      
      setEdges(initialEdges);
      lastSyncedEdgesRef.current = initialEdgesSignature;
      
      // Liberar el lock después de un breve delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    } else {
      logger.debug('Edges signature unchanged, skipping');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdges, setEdges]);

  // INTERCEPTOR NUCLEAR - Bloquear TODOS los cambios de posición no autorizados
  const handleNodesChange = useCallback((changes: any[]) => {
    logger.debug('===== NUCLEAR INTERCEPTOR =====');
    logger.debug('Raw changes received:', changes);
    logger.debug('Currently dragging nodes:', Array.from(draggingNodesRef.current));
    logger.debug('Is syncing:', isSyncingRef.current);
    
    // SUPER AGRESIVO: Bloquear CUALQUIER cambio que pueda afectar la posición
    const authorizedChanges = changes.filter(change => {
      logger.debug('Analyzing change:', change);
      
      // FASE 2: Permitir cambios de agregado de nodos (add) con validación simplificada
      if (change.type === 'add') {
        logger.success('AUTHORIZED: Adding new node:', change.id);
        
        // Usar la función de validación de posición
        if (change.item) {
          const roundedPosition = validateAndRoundPosition(change.item.position);
          if (roundedPosition) {
            nodePositionsRef.current.set(change.item.id, roundedPosition);
          } else {
            logger.warn('Invalid position data during node add:', change.item?.position);
          }
        }
        return true;
      }
      
      // FASE 2: Permitir cambios de reemplazo completo de nodos (replace) con validación simplificada
      if (change.type === 'replace') {
        if (isSyncingRef.current) {
          logger.success('AUTHORIZED: Replacing nodes during sync');
          
          // Actualizar nuestras referencias con las nuevas posiciones redondeadas
          if (change.item && Array.isArray(change.item)) {
            change.item.forEach((node: any) => {
              const roundedPosition = validateAndRoundPosition(node.position);
              if (roundedPosition) {
                nodePositionsRef.current.set(node.id, roundedPosition);
              } else {
                logger.warn('Invalid position data during node replace:', node.position);
              }
            });
          }
          return true;
        } else {
          logger.error('BLOCKED: Replace not during sync');
          return false;
        }
      }
      
      // FASE 2: Gestión de cambios de posición simplificada
      if (change.type === 'position') {
        // REGLA NUCLEAR: Solo permitir si dragging está definido
        if (change.dragging === undefined) {
          // Cambiado de error a debug ya que es comportamiento esperado del interceptor
          logger.debug('NUCLEAR BLOCK: Automatic position change for node:', change.id);
          return false;
        }
        
        if (change.dragging === true) {
          logger.success('AUTHORIZED: User started dragging node:', change.id);
          draggingNodesRef.current.add(change.id);
          
          // Usar la función de validación de posición
          const roundedPosition = validateAndRoundPosition(change.position);
          if (roundedPosition) {
            nodePositionsRef.current.set(change.id, roundedPosition);
          } else {
            logger.warn('Invalid position data during drag start:', change.position);
          }
          return true;
        }
        
        if (change.dragging === false) {
          if (draggingNodesRef.current.has(change.id)) {
            logger.success('AUTHORIZED: User finished dragging node:', change.id);
            draggingNodesRef.current.delete(change.id);
            
            // Usar la función de validación de posición
            const roundedPosition = validateAndRoundPosition(change.position);
            if (roundedPosition) {
              nodePositionsRef.current.set(change.id, roundedPosition);
            } else {
              logger.warn('Invalid position data during drag end:', change.position);
            }
            return true;
          } else {
            logger.error('UNAUTHORIZED: Drag end for node not being dragged:', change.id);
            return false;
          }
        }
        
        logger.error('BLOCKED: Unknown dragging state:', change);
        return false;
      }
      
      // BLOQUEAR cambios de dimensiones que no estén relacionados con arrastre
      if (change.type === 'dimensions') {
        if (change.dragging === undefined) {
          // Cambiado de error a debug ya que es comportamiento esperado del interceptor
          logger.debug('NUCLEAR BLOCK: Automatic dimensions change for node:', change.id);
          return false;
        }
        logger.success('AUTHORIZED: Dimensions change during drag for node:', change.id);
        return true;
      }
      
      // SOLO permitir cambios de selección y eliminación
      if (change.type === 'select' || change.type === 'remove') {
        logger.success('AUTHORIZED: Safe change type:', change.type);
        return true;
      }
      
      // BLOQUEAR cualquier otro tipo de cambio desconocido
      logger.debug('BLOCKED: Unknown change type:', change.type, change);
      return false;
    });
    
    logger.debug('Authorized changes:', authorizedChanges);
    
    // Si no hay cambios autorizados, restaurar posiciones originales
    if (authorizedChanges.length === 0) {
      logger.warn('All changes blocked by nuclear interceptor');
      
      // RESTAURAR POSICIONES ORIGINALES si hay cambios de posición bloqueados
      const hasBlockedPositionChanges = changes.some(change => 
        change.type === 'position' && change.dragging === undefined
      );
      
      if (hasBlockedPositionChanges) {
        logger.info('RESTORING all node positions to original state');
        
        // Crear un mapa de posiciones originales
        const restoredNodes = nodes.map(node => {
          const originalPosition = nodePositionsRef.current.get(node.id);
          if (originalPosition) {
            logger.debug(`Restoring ${node.id} from ${JSON.stringify(node.position)} to ${JSON.stringify(originalPosition)}`);
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
        logger.info(`🗑️ FASE 4: Eliminación simplificada para nodo: ${change.id}`);
        
        // Asegurarse de que el nodo existe en el estado antes de eliminarlo
        const nodeExists = nodes.some(node => node.id === change.id);
        if (!nodeExists) {
          logger.warn('⚠️ Intentando eliminar un nodo que no existe en el estado actual:', change.id);
          
          // PROTECCIÓN EXTRA: Forzar eliminación de la UI para nodos fantasma
          logger.info('🔨 Forzando eliminación del nodo fantasma de la UI:', change.id);
          setNodes(currNodes => currNodes.filter(n => n.id !== change.id));
          
          // Liberar el bloqueo después de un tiempo
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 150);
          
          return;
        }
        
        // Limpiar TODAS las referencias para evitar que el nodo reaparezca
        nodePositionsRef.current.delete(change.id);
        draggingNodesRef.current.delete(change.id);
        
        // Limpiar la posición persistida
        if (state.currentFlow) {
          positionPersistence.removeNodePosition(state.currentFlow.id, change.id);
          logger.debug('Persisted position removed for node:', change.id);
        }
        
        // Usar la función dedicada para el manejo de eliminación de nodos
        handleNodeDeletion(change.id, setNodes, actions, isSyncingRef)
          .then(() => logger.success('✅ Eliminación de nodo completada:', change.id))
          .catch(error => logger.error('❌ Error durante eliminación de nodo:', error));
      } else if (change.type === 'select') {
        logger.debug('Node selection changed for:', change.id, 'Selected:', change.selected);
        if (change.selected) {
          actions.selectNode(change.id);
        }
      } else if (change.type === 'position' && change.dragging === false) {
        logger.debug('Final position update for:', change.id, 'Position:', change.position);
        
        // FASE 2: Usar la función de validación de posición para el manejo final
        const roundedPosition = validateAndRoundPosition(change.position);
        if (roundedPosition) {
          // Actualizar la posición en nodePositionsRef inmediatamente
          nodePositionsRef.current.set(change.id, roundedPosition);
          
          // Persistir la posición en localStorage inmediatamente (esto es crucial para mantener posición después del refresh)
          if (state.currentFlow) {
            const domainPosition = new Position(roundedPosition.x, roundedPosition.y);
            positionPersistence.updateNodePosition(state.currentFlow.id, change.id, domainPosition);
            logger.debug('Position persisted for node:', change.id, 'Position:', roundedPosition);
          }
          
          // Actualizar el modelo de dominio
          actions.moveNode(change.id, roundedPosition);
          logger.success('Node position saved to repository and persistence');
        } else {
          logger.warn('Invalid position data in final update:', change.position);
        }
      }
    });
    
    logger.debug('===== END NUCLEAR INTERCEPTOR =====');
  }, [onNodesChange, actions, nodes, setNodes, positionPersistence, state.currentFlow]);

  // Wrapper para onEdgesChange que maneja nuestro estado personalizado
  const handleEdgesChange = useCallback((changes: any[]) => {
    logger.debug('handleEdgesChange called with changes:', changes);
    
    // Primero aplicar los cambios a ReactFlow
    onEdgesChange(changes);
    
    // Luego procesar los cambios para nuestro estado personalizado
    changes.forEach(change => {
      if (change.type === 'remove') {
        logger.info('Edge removed:', change.id);
        actions.removeConnection(change.id);
      }
    });
  }, [onEdgesChange, actions]);

  const onConnect = useCallback((params: any) => {
    logger.debug('onConnect called with params:', params);
    
    if (!params.source || !params.target) {
      logger.error('Missing source or target in connection params');
      return;
    }
    
    // Log completo para depurar
    logger.debug('Connection details:', {
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
    event.stopPropagation(); // Detener la propagación para evitar conflictos
    
    const nodeType = event.dataTransfer.getData('application/reactflow');
    logger.debug('Drop detected! NodeType:', nodeType);
    
    if (!nodeType) {
      logger.warn('No nodeType found in dataTransfer');
      // Intenta extraer el tipo del evento si no está en dataTransfer
      const element = event.target as HTMLElement;
      const nodeTypeAttribute = element.getAttribute('data-node-type');
      if (nodeTypeAttribute) {
        logger.debug('Found nodeType in data attribute:', nodeTypeAttribute);
        return;
      }
      return;
    }

    // Obtener la posición relativa al canvas de ReactFlow
    const reactFlowBounds = (event.currentTarget as Element).getBoundingClientRect();
    const rawPosition = project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    logger.debug('Raw drop position:', rawPosition);
    
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
          logger.debug(`Position too close to node ${existingNode.id} (distance: ${distance}), adjusting...`);
          // Mover hacia abajo y ligeramente a la derecha
          adjustedPosition.x += 30;
          adjustedPosition.y += 50;
          positionOk = false;
          break;
        }
      }
      
      attempts++;
    }
    
    logger.debug('Final adjusted position:', adjustedPosition);
    logger.debug('Calling addNode with:', { nodeType, position: adjustedPosition });
    
    try {
      actions.addNode(nodeType, adjustedPosition);
      logger.success('addNode called successfully');
      
      // Persistir la posición del nuevo nodo
      if (state.currentFlow) {
        // Generar un ID temporal para el nodo (el ID real se generará en el useCase)
        // Esto se sincronizará cuando el nodo se agregue al estado
        logger.debug('New node position will be persisted after state update');
      }
    } catch (error) {
      logger.error('Error in addNode:', error);
    }
  }, [actions, project, nodes, state.currentFlow]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Detener la propagación para evitar conflictos
    event.dataTransfer.dropEffect = 'move';
    
    // Cambiar el cursor para dar retroalimentación visual
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.style.cursor = 'copy';
    }
    
    logger.debug('Drag over canvas');
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
      logger.info('Cleared persisted positions for current flow');
    }
  }, [positionPersistence, state.currentFlow]);
  
  // Efecto para persistir posiciones cuando hay cambios en los nodos
  useEffect(() => {
    if (!state.currentFlow || state.isLoading || nodes.length === 0) {
      return;
    }

    // Persistir todas las posiciones en localStorage después de cada cambio
    try {
      const positions = new Map<string, Position>();
      
      // Guardar las posiciones de todos los nodos
      nodes.forEach(node => {
        if (node.position) {
          const validPosition = validateAndRoundPosition(node.position);
          if (validPosition) {
            const domainPosition = new Position(validPosition.x, validPosition.y);
            positions.set(node.id, domainPosition);
          }
        }
      });
      
      // Solo guardar si hay posiciones para persistir
      if (positions.size > 0) {
        positionPersistence.saveFlowPositions(state.currentFlow.id, positions);
        logger.debug(`📍 Persistidas ${positions.size} posiciones de nodos en localStorage`);
      }
    } catch (error) {
      logger.error('❌ Error persistiendo posiciones:', error);
    }
  }, [nodes, state.currentFlow, state.isLoading, positionPersistence]);

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
