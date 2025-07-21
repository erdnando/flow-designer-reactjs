import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useReactFlow, useNodesState, useEdgesState } from 'reactflow';
import { useFlowContext } from '../context/FlowContext';
import { useConnectionValidation } from './useConnectionValidation';
import { useNotificationHelpers } from './useNotificationHelpers';
import type { FlowNode, FlowEdge, NodeType } from '../../shared/types';
import { NODE_TYPES } from '../../shared/constants';
import { PositionPersistenceService } from '../../infrastructure/services/PositionPersistenceService';
import { ViewportPersistenceService } from '../../infrastructure/services/ViewportPersistenceService';
import { Position } from '../../domain/value-objects/Position';
import { logger } from '../../shared/utils';

// ✅ PASO 3: Imports de transformadores modulares
import { MODULAR_DECOMPOSITION_FLAGS } from '../../shared/config/migrationFlags';
import * as transformers from './transformers/useDataTransformers';

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
      return validatedPosition;
    }
  }
  
  // SEGUNDO, usar la referencia actual si existe
  const existingPosition = positionsRef.current.get(nodeId);
  if (existingPosition) {
    return existingPosition;
  }
  
  // TERCERO, usar la posición del estado (modelo de dominio) si es válida
  const validatedStatePos = validateAndRoundPosition(statePosition);
  if (validatedStatePos) {
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

// ✅ PASO 3: Selección condicional de transformadores de datos
const selectDataTransformers = () => {
  if (MODULAR_DECOMPOSITION_FLAGS.USE_DATA_TRANSFORMERS) {
    return {
      convertNodesToReactFlow: transformers.convertNodesToReactFlow,
      convertConnectionsToReactFlow: transformers.convertConnectionsToReactFlow,
      filterValidNodes: transformers.filterValidNodes,
      filterValidConnections: transformers.filterValidConnections
    };
  }
  
  // Funciones originales inline (fallback)
  return {
    convertNodesToReactFlow: (
      validNodes: any[],
      selectedNodeId: string | null,
      nodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
      determineFinalPosition: any,
      persistedPositions: Map<string, any>,
      isInitialLoad: boolean,
      actions: any
    ) => {
      return validNodes.map(node => {
        const finalPosition = determineFinalPosition(
          node.id, node.position, nodePositionsRef, persistedPositions, isInitialLoad
        );
        nodePositionsRef.current.set(node.id, finalPosition);
        const isSelected = node.id === selectedNodeId;
        
        return {
          id: node.id,
          type: node.type,
          position: finalPosition,
          data: {
            ...node.data,
            nodeType: node.type,
            onNodeClick: (nodeId: string) => actions.selectNode(nodeId),
            onNodeDelete: (nodeId: string) => actions.removeNode(nodeId)
          },
          selected: isSelected,
          draggable: true
        };
      });
    },
    convertConnectionsToReactFlow: (validConnections: any[]) => {
      return validConnections.map(connection => ({
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
        data: { connectionId: connection.id }
      }));
    },
    filterValidNodes: (nodes: any[] | undefined) => {
      if (!nodes || !Array.isArray(nodes)) return [];
      
      const uniqueNodesMap = new Map();
      nodes.forEach(node => {
        if (!node?.id) return;
        uniqueNodesMap.set(node.id, node);
      });
      
      return Array.from(uniqueNodesMap.values());
    },
    filterValidConnections: (connections: any[] | undefined) => {
      if (!connections || !Array.isArray(connections)) return [];
      return connections.filter(connection => 
        connection && typeof connection.id === 'string' && connection.id.trim() !== '' &&
        typeof connection.sourceNodeId === 'string' && connection.sourceNodeId.trim() !== '' &&
        typeof connection.targetNodeId === 'string' && connection.targetNodeId.trim() !== ''
      );
    }
  };
};

export const useFlowDesigner = () => {
  const { state, actions } = useFlowContext();
  const { project, getViewport, setViewport } = useReactFlow();
  const { isConnectionValid, getConnectionHelpMessage } = useConnectionValidation();
  const { showConnectionError } = useNotificationHelpers();
  
  // Servicio de persistencia de posiciones
  const positionPersistence = useMemo(() => new PositionPersistenceService(), []);
  
  // Servicio de persistencia de viewport
  const viewportPersistence = useMemo(() => new ViewportPersistenceService(), []);
  
  // Tracking de nodos que están siendo arrastrados activamente
  const draggingNodesRef = useRef<Set<string>>(new Set());
  
  // Mantener las posiciones de los nodos de forma controlada
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // TODO: Flag para saber si debemos forzar persistencia (implementar en fase posterior)
  // const forcePersistenceRef = useRef<boolean>(false);

  // CORRECCIÓN: Flag para depuración
  const initialRenderCompleteRef = useRef(false);
  
  // Función para calcular un signature de los datos importantes de los nodos
  const getNodesSignature = useCallback(() => {
    if (!state.currentFlow?.nodes) return '';
    return state.currentFlow.nodes.map(node => {
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
  }, [state.currentFlow?.nodes]);

  // ✅ PASO 3: Inicializar transformadores de datos
  const dataTransformers = selectDataTransformers();

  // Agregar un counter para forzar re-renders cuando sea necesario
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // Detectar cuando el estado cambia y forzar actualización si es necesario
  useEffect(() => {
    if (state.currentFlow) {
      setForceUpdateCounter((prev: number) => prev + 1);
    }
  }, [state.currentFlow]);
  
  // Calcular signature actual para forzar recálculo cuando cambien los datos
  const currentNodesSignature = getNodesSignature();
  
  // DEBUG: Agregar log para ver cuando cambia la signature
  const previousSignatureRef = useRef(currentNodesSignature);
  if (previousSignatureRef.current !== currentNodesSignature) {
    previousSignatureRef.current = currentNodesSignature;
  }
  
  // Convertir entidades del dominio a formato React Flow
  const initialNodes: FlowNode[] = useMemo(() => {
    if (!state.currentFlow) {
      return [];
    }
    
    // ✅ PASO 3: Usar transformadores modulares para filtrar nodos
    const validNodes = dataTransformers.filterValidNodes(state.currentFlow.nodes);
    
    // Cargar posiciones persistidas
    const persistedPositions = positionPersistence.loadFlowPositions(state.currentFlow.id);
    
    // Determinar si es la primera carga del flujo
    const isInitialLoad = !initialRenderCompleteRef.current;
    
    // ✅ PASO 3: Usar transformadores modulares para convertir nodos
    const converted = dataTransformers.convertNodesToReactFlow(
      validNodes,
      state.selectedNodeId,
      nodePositionsRef,
      determineFinalPosition,
      persistedPositions,
      isInitialLoad,
      actions
    );
    
    // Marcar la renderización inicial como completada
    initialRenderCompleteRef.current = true;
    
    return converted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentFlow, actions, positionPersistence, currentNodesSignature, forceUpdateCounter, dataTransformers]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    if (!state.currentFlow) {
      return [];
    }
    
    // ✅ PASO 3: Usar transformadores modulares para filtrar y convertir conexiones
    const validConnections = dataTransformers.filterValidConnections(state.currentFlow.connections);
    
    if (validConnections.length !== state.currentFlow.connections.length) {
      logger.warn('Filtered out invalid connections:', 
        state.currentFlow.connections.length - validConnections.length);
    }
    
    const converted = dataTransformers.convertConnectionsToReactFlow(validConnections);
    
    return converted;
  }, [state.currentFlow, dataTransformers]); // CORRECCIÓN: Mantener dependencia completa para asegurar recálculo

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
      return;
    }

    // ANTI-FANTASMAS: Detectar y eliminar nodos que existen en la UI pero no en el estado
    if (!isInitialRender) {
      
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
    
    // CASO ESPECIAL 1: Primera renderización - forzar sincronización
    if (isInitialRender && initialNodes.length > 0) {
      
      // Aplicar los nodos iniciales directamente
      setNodes(initialNodes);
      
      // Actualizar la referencia de firma
      lastSyncedNodesRef.current = initialNodesSignature;
      
      return;
    }
    
    // CASO ESPECIAL 2: Carga inicial - si hay nodos para mostrar pero el canvas está vacío
    // Este caso resuelve el problema de nodos que no aparecen al cargar la página
    if (initialNodes.length > 0 && nodes.length === 0) {
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
    
    // NUEVO: Detectar cambios de contenido (labels, datos internos) - OPTIMIZADO
    const hasContentChanges = initialNodes.some(initialNode => {
      const currentNode = nodes.find(n => n.id === initialNode.id);
      if (!currentNode) return true; // Nodo nuevo
      
      // Comparar solo el label para evitar comparaciones complejas durante typing
      return currentNode.data?.label !== initialNode.data?.label;
    });
    
    // CORRECCIÓN: Si hay cambios estructurales, de firmas O de contenido, sincronizar
    if ((hasStructuralChanges || signaturesDiffer || hasContentChanges) && !isSyncingRef.current) {
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, setNodes]);
  
  // NUEVA SOLUCIÓN: Efecto específico para garantizar que los nodos se muestren correctamente después de la carga inicial
  useEffect(() => {
    // Solo ejecutar cuando tenemos un flujo actual
    if (state.currentFlow) {
      
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
        
        // NUEVO: Detectar si los nodos han desaparecido y forzar recuperación
        if (nodes.length === 0 && initialNodes.length > 0) {
          logger.error('🚨 NODOS DESAPARECIDOS: Forzando recuperación inmediata');
          
          // Desactivar todos los bloqueos
          isSyncingRef.current = false;
          
          // Forzar aplicación inmediata de nodos
          setTimeout(() => {
            logger.info('🔄 RECUPERACIÓN: Aplicando nodos forzadamente');
            setNodes(initialNodes);
            
            // Actualizar firma para evitar loops
            const recoverySignature = JSON.stringify(
              initialNodes.map(n => ({ 
                id: n.id, 
                x: n.position ? Math.round(n.position.x) : 0, 
                y: n.position ? Math.round(n.position.y) : 0 
              }))
            );
            lastSyncedNodesRef.current = recoverySignature;
          }, 100);
        }
        
        // Si no hay nodos visibles pero deberían haberlos, forzar visualización
        else if (nodes.length === 0 || nodes.length !== uniqueNodesMap.size) {
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
  }, [state.currentFlow, nodes.length, initialNodes.length]);
  
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

  // Sincronizar edges cuando el estado cambie - MEJORADO PARA CONEXIONES INMEDIATAS
  useEffect(() => {
    logger.debug('Syncing edges with state...');
    logger.debug('Current edges count:', edges.length);
    logger.debug('Initial edges count:', initialEdges.length);
    logger.debug('Is syncing:', isSyncingRef.current);
    
    // Crear una firma única para los edges iniciales
    const initialEdgesSignature = JSON.stringify(
      initialEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    );
    
    logger.debug('Last synced edges signature:', lastSyncedEdgesRef.current);
    logger.debug('Current initial edges signature:', initialEdgesSignature);
    
    // CORRECCIÓN CRÍTICA: Solo saltear si estamos sincronizando Y las firmas son iguales
    // Esto permite que las conexiones nuevas se procesen inmediatamente
    if (isSyncingRef.current && lastSyncedEdgesRef.current === initialEdgesSignature) {
      logger.debug('Already syncing same edges, skipping');
      return;
    }
    
    // Solo sincronizar si la firma ha cambiado
    if (lastSyncedEdgesRef.current !== initialEdgesSignature) {
      logger.info('Edge signature changed, syncing...');
      
      isSyncingRef.current = true;
      
      // CORRECCIÓN: Asegurar que la actualización sea inmediata y visible
      setEdges(initialEdges);
      lastSyncedEdgesRef.current = initialEdgesSignature;
      
      // Forzar una actualización adicional después de un breve delay
      // para asegurar que ReactFlow renderice correctamente
      setTimeout(() => {
        logger.debug('🔄 Forzando segunda actualización de edges para garantizar renderización');
        setEdges(currentEdges => {
          // Comparar con el estado actual para asegurar consistencia
          const currentSignature = JSON.stringify(
            currentEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
          );
          
          if (currentSignature !== initialEdgesSignature) {
            logger.debug('🔄 Detectada inconsistencia, aplicando edges iniciales nuevamente');
            return initialEdges;
          }
          
          return currentEdges;
        });
        
        // Liberar el lock después de asegurar la consistencia
        isSyncingRef.current = false;
      }, 50);
    } else {
      logger.debug('Edges signature unchanged, skipping');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdges, setEdges]);

  // NUEVO: Efecto específico para detectar conexiones que faltan en la renderización
  useEffect(() => {
    // Solo ejecutar si tenemos datos válidos
    if (!state.currentFlow) {
      return;
    }

    const domainConnections = state.currentFlow.connections?.length || 0;
    const renderedEdges = edges.length;
    
    logger.debug(`🔍 Verificando renderización: ${domainConnections} conexiones en dominio vs ${renderedEdges} edges renderizados`);
    
    // Detectar discrepancia entre conexiones del dominio y edges renderizados
    if (domainConnections > renderedEdges) {
      logger.warn(`🔍 DETECCIÓN DE RENDERIZACIÓN: ${domainConnections} conexiones en dominio vs ${renderedEdges} edges renderizados`);
      
      // CORRECCIÓN CRÍTICA: No verificar isSyncingRef aquí para permitir actualizaciones forzadas
      // Forzar actualización inmediata
      const forcedUpdate = setTimeout(() => {
        logger.info('🔄 Forzando actualización de edges por discrepancia detectada');
        
        // Desactivar sincronización temporalmente para permitir la actualización
        const wasSyncing = isSyncingRef.current;
        isSyncingRef.current = false;
        
        // Aplicar edges directamente desde el estado del dominio
        setEdges(initialEdges);
        
        // Forzar segunda actualización para asegurar renderización
        setTimeout(() => {
          setEdges(currentEdges => {
            const shouldUpdate = currentEdges.length !== initialEdges.length;
            if (shouldUpdate) {
              logger.debug('🔄 Aplicando segunda actualización forzada');
              return initialEdges;
            }
            return currentEdges;
          });
          
          // Restaurar estado de sincronización
          isSyncingRef.current = wasSyncing;
        }, 100);
      }, 25); // Reducir el delay para mayor velocidad
      
      return () => clearTimeout(forcedUpdate);
    }
  }, [state.currentFlow, edges.length, initialEdges, setEdges]);

  // INTERCEPTOR NUCLEAR - Bloquear TODOS los cambios de posición no autorizados
  const handleNodesChange = useCallback((changes: any[]) => {
    const isDragging = draggingNodesRef.current.size > 0;
    // Detectar drag también en los cambios actuales
    const hasDragChanges = changes.some(change => 
      change.type === 'position' && (change.dragging === true || change.dragging === false)
    );
    const isDragOperation = isDragging || hasDragChanges;
    
    // OPTIMIZACIÓN: Detectar cambios de dimensiones masivos automáticos
    const hasMultipleDimensionChanges = changes.filter(c => c.type === 'dimensions').length > 3;
    
    // OPTIMIZACIÓN: Logging reducido durante drag Y cuando hay cambios de dimensiones masivos
    if (!isDragOperation && !hasMultipleDimensionChanges) {
      logger.debug('===== NUCLEAR INTERCEPTOR =====');
      logger.debug('Raw changes received:', changes);
      logger.debug('Currently dragging nodes:', Array.from(draggingNodesRef.current));
      logger.debug('Is syncing:', isSyncingRef.current);
    }
    
    // SUPER AGRESIVO: Bloquear CUALQUIER cambio que pueda afectar la posición
    const authorizedChanges = changes.filter(change => {
      // OPTIMIZACIÓN: Solo loggear análisis cuando no hay drag Y no hay cambios masivos de dimensiones
      if (!isDragOperation && !hasMultipleDimensionChanges) {
        logger.debug('Analyzing change:', change);
      }
      
      // FASE 2: Permitir cambios de agregado de nodos (add) con validación simplificada
      if (change.type === 'add') {
        if (!isDragging) {
          logger.success('AUTHORIZED: Adding new node:', change.id);
        }
        
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
            // Cambio de error a warning - puede ser desincronización temporal
            logger.warn('DESYNC: Drag end for node not in dragging set:', change.id);
            // Limpiar el nodo del set por si acaso
            draggingNodesRef.current.delete(change.id);
            return false;
          }
        }
        
        logger.error('BLOCKED: Unknown dragging state:', change);
        return false;
      }
      
      // BLOQUEAR cambios de dimensiones que no estén relacionados con arrastre
      if (change.type === 'dimensions') {
        if (change.dragging === undefined) {
          // OPTIMIZACIÓN: Silenciar log de dimensiones automáticas para reducir spam
          // Solo loggear si hay muy pocos cambios para evitar spam masivo
          if (changes.length <= 2) {
            logger.debug('NUCLEAR BLOCK: Automatic dimensions change for node:', change.id);
          }
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
    
    // OPTIMIZACIÓN: Solo loggear cambios autorizados cuando no hay drag Y no hay cambios masivos
    if (!isDragOperation && !hasMultipleDimensionChanges) {
      logger.debug('Authorized changes:', authorizedChanges);
    }
    
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
    
    // OPTIMIZACIÓN: Solo loggear end cuando no hay drag Y no hay cambios masivos de dimensiones
    if (!isDragOperation && !hasMultipleDimensionChanges) {
      logger.debug('===== END NUCLEAR INTERCEPTOR =====');
    }
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

  // Event handlers para prevenir el efecto de arrastre fantasma
  const onConnectStart = useCallback((event: any, params: any) => {
    // Cuando inicia la conexión, eliminar cualquier imagen de arrastre
    const nodeId = params?.nodeId || 'unknown';
    const handleId = params?.handleId || 'unknown';
    const handleType = params?.handleType || 'unknown';
    
    logger.debug('🔌 Connection start detected:', { nodeId, handleId, handleType });
    
    // Remover cualquier efecto de arrastre existente
    document.body.classList.add('connecting');
    
    // Cambiar el cursor global durante la conexión
    document.body.style.cursor = 'crosshair';
    
    // Añadir una clase especial para CSS
    const allElements = document.querySelectorAll('.react-flow__handle');
    allElements.forEach(el => {
      if (el instanceof HTMLElement) {
        // Usar atributos de datos en lugar de propiedades no estándar
        el.setAttribute('data-connecting', 'true');
      }
    });
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    // Restaurar el cursor y remover la clase cuando termina la conexión
    logger.debug('🔌 Connection end detected');
    document.body.classList.remove('connecting');
    document.body.style.cursor = '';
    
    // Restaurar elementos
    const allElements = document.querySelectorAll('.react-flow__handle');
    allElements.forEach(el => {
      if (el instanceof HTMLElement) {
        // Limpiar atributos de datos
        el.removeAttribute('data-connecting');
      }
    });
  }, []);

  const onConnect = useCallback((params: any) => {
    logger.debug('⚡ onConnect called with params:', params);
    logger.debug('🔍 onConnect - Full params details:', {
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle,
      allParams: params
    });
    
    if (!params.source || !params.target) {
      logger.error('❌ Missing source or target in connection params');
      return;
    }
    
    // Validación de la conexión
    if (state.currentFlow) {
      logger.debug('🔍 Validando conexión en onConnect...');
      const validationResult = isConnectionValid(
        params,
        state.currentFlow.nodes,
        state.currentFlow.connections
      );
      
      if (!validationResult.valid) {
        logger.error('❌ Conexión rechazada por validación:', validationResult.message);
        // Mostrar notificación de error en lugar de alert
        showConnectionError(validationResult.message || 'Conexión no válida');
        return;
      }
      
      logger.debug('✅ Validación en onConnect pasada');
    }
    
    // Log para depuración
    logger.debug('🔌 Connection details:', {
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle
    });

    // Restaurar el cursor
    document.body.style.cursor = '';
    
    const createConnection = async () => {
      try {
        // Desactivar el bloqueo de sincronización temporalmente
        isSyncingRef.current = false;
        
        // Actualizar el estado local de ReactFlow primero
        setEdges(eds => {
          const newEdge = {
            id: `${params.source}-${params.target}`,
            source: params.source,
            target: params.target,
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle,
            type: 'smoothbezier',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 }
          };
          return [...eds, newEdge];
        });
        
        // Crear la conexión en el dominio
        await actions.addConnection(
          params.source,
          params.target,
          params.sourceHandle,
          params.targetHandle
        );
        
        logger.success('✅ Conexión creada exitosamente');
        
        // Asegurar que la UI refleja el estado actual
        setTimeout(() => {
          if (state.currentFlow?.connections) {
            const domainConnections = state.currentFlow.connections.length;
            setEdges(currentEdges => {
              if (currentEdges.length !== domainConnections) {
                logger.debug('� Sincronizando edges con el dominio');
                return initialEdges;
              }
              return currentEdges;
            });
          }
        }, 50);
        
      } catch (error) {
        logger.error('❌ Error al crear conexión:', error);
        // Revertir cambios en caso de error
        setEdges(eds => eds.filter(e => e.id !== `${params.source}-${params.target}`));
      } finally {
        // Restaurar el estado de sincronización
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 100);
      }
    };
    
    createConnection();
  }, [actions, setEdges, state.currentFlow, initialEdges, isConnectionValid, showConnectionError]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Detener la propagación para evitar conflictos
    
    // Registrar todos los tipos de datos disponibles
    logger.debug('Available data types:', event.dataTransfer.types);
    
    // Intentar obtener nodeType con múltiples estrategias
    let nodeType: string | null = null;
    
    // Estrategia 1: Intenta obtener de application/reactflow
    try {
      nodeType = event.dataTransfer.getData('application/reactflow');
      logger.debug('Strategy 1 - application/reactflow:', nodeType);
    } catch (e) {
      logger.warn('Error getting application/reactflow data:', e);
    }
    
    // Estrategia 2: Intenta obtener de text/plain
    if (!nodeType) {
      try {
        nodeType = event.dataTransfer.getData('text/plain');
        logger.debug('Strategy 2 - text/plain:', nodeType);
      } catch (e) {
        logger.warn('Error getting text/plain data:', e);
      }
    }
    
    // Estrategia 3: Intenta obtener de formato simple nodeType
    if (!nodeType) {
      try {
        nodeType = event.dataTransfer.getData('nodeType');
        logger.debug('Strategy 3 - nodeType format:', nodeType);
      } catch (e) {
        logger.warn('Error getting nodeType data:', e);
      }
    }
    
    // Estrategia 4: Buscar elementos en el DOM con data-node-type
    if (!nodeType) {
      try {
        const dragElements = document.querySelectorAll('[data-node-type]');
        if (dragElements.length > 0) {
          // Convertir NodeList a array para iterar de forma segura
          Array.from(dragElements).forEach(el => {
            const dataType = el.getAttribute('data-node-type');
            if (dataType && !nodeType) {
              nodeType = dataType;
              logger.debug('Strategy 4 - Found from DOM elements:', nodeType);
            }
          });
        }
      } catch (e) {
        logger.warn('Error getting nodeType from DOM:', e);
      }
    }
    
    // Estrategia 5: Revisar en localStorage como último recurso
    if (!nodeType) {
      try {
        nodeType = localStorage.getItem('dragging-node-type');
        logger.debug('Strategy 5 - localStorage fallback:', nodeType);
        // Limpiar después de usar
        if (nodeType) {
          localStorage.removeItem('dragging-node-type');
        }
      } catch (e) {
        logger.warn('Error accessing localStorage:', e);
      }
    }
    
    // Estrategia 6: Detectar elementos visibles que están siendo arrastrados
    if (!nodeType) {
      try {
        const paletteItems = document.querySelectorAll('.node-palette__item');
        Array.from(paletteItems).forEach(item => {
          if (item instanceof HTMLElement && item.style.opacity === '0.5' && !nodeType) {
            // Este elemento probablemente está siendo arrastrado
            const type = item.getAttribute('data-node-type');
            if (type) {
              nodeType = type;
              logger.debug('Strategy 6 - Found from opacity check:', nodeType);
            }
          }
        });
      } catch (e) {
        logger.warn('Error in strategy 6:', e);
      }
    }
    
    // Comprobación final
    if (!nodeType) {
      // SOLUCIÓN TEMPORAL: Si todo falla, usar un tipo por defecto
      nodeType = 'step'; // Usar un tipo válido como fallback
      logger.warn('⚠️ No se pudo detectar el tipo de nodo, usando tipo por defecto:', nodeType);
      // return; // Descomentar para cancelar si no se encuentra ningún tipo
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
      // Clean up any visual indicators
      const flowElement = document.querySelector('.react-flow');
      if (flowElement && flowElement.classList.contains('drop-target')) {
        flowElement.classList.remove('drop-target');
      }
      
      // Reset cursor
      document.body.style.cursor = '';
      document.body.classList.remove('node-dragging');

      // Add the node
      actions.addNode(nodeType, adjustedPosition);
      logger.success('addNode called successfully');
      
      // Show visual feedback of success
      setTimeout(() => {
        // Flash the canvas briefly to indicate success
        if (flowElement) {
          flowElement.classList.add('drop-success');
          setTimeout(() => {
            flowElement.classList.remove('drop-success');
          }, 300);
        }
      }, 10);
      
      // Persistir la posición del nuevo nodo
      if (state.currentFlow) {
        // Generar un ID temporal para el nodo (el ID real se generará en el useCase)
        // Esto se sincronizará cuando el nodo se agregue al estado
        logger.debug('New node position will be persisted after state update');
      }
    } catch (error) {
      logger.error('Error in addNode:', error);
      
      // Show visual feedback of error
      const flowElement = document.querySelector('.react-flow');
      if (flowElement) {
        flowElement.classList.add('drop-error');
        setTimeout(() => {
          flowElement.classList.remove('drop-error');
        }, 300);
      }
    }
  }, [actions, project, nodes, state.currentFlow]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Detener la propagación para evitar conflictos
    
    // Asegurar que se muestre el efecto de "copiar" en lugar de "mover"
    event.dataTransfer.dropEffect = 'copy';
    
    // Cambiar el cursor para dar retroalimentación visual clara
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.style.cursor = 'copy';
      
      // Añadir clase de resaltado al objetivo de soltar
      const flowElement = document.querySelector('.react-flow');
      if (flowElement && !flowElement.classList.contains('drop-target')) {
        flowElement.classList.add('drop-target');
        
        // Asegurar que también se añada la clase al viewport interno
        const viewport = document.querySelector('.react-flow__viewport');
        if (viewport) {
          viewport.classList.add('drop-target-viewport');
        }
      }
    }
    
    // Verificar si tenemos datos válidos en cualquier formato
    const validTypes = ['application/reactflow', 'text/plain', 'nodeType'];
    let hasValidData = false;
    
    try {
      for (const type of validTypes) {
        if (event.dataTransfer.types.includes(type)) {
          hasValidData = true;
          break;
        }
      }
      
      // También verificar si hay algún elemento en arrastre
      if (!hasValidData && document.body.classList.contains('node-dragging')) {
        hasValidData = true; // Asumir que hay un arrastre válido basado en el estado del body
      }
    } catch (error) {
      logger.error('Error verificando tipos de datos en onDragOver:', error);
    }
    
    // Si estamos en arrastre, mostrarlo claramente en la consola
    logger.debug('🔄 Drag over canvas, valid data:', hasValidData);
    
    return false; // Asegurar que el navegador maneje el evento correctamente
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

  // Función para validar conexiones en tiempo real (durante el arrastre)
  const isValidConnection = useCallback((connection: any) => {
    logger.debug('🔍 Validando conexión durante arrastre:', connection);
    
    if (!connection.source || !connection.target) {
      logger.debug('❌ Conexión inválida: falta source o target');
      return false;
    }
    
    // Usar el sistema de validación
    if (state.currentFlow) {
      const validationResult = isConnectionValid(
        connection,
        state.currentFlow.nodes,
        state.currentFlow.connections
      );
      
      if (!validationResult.valid) {
        logger.debug('❌ Conexión inválida durante arrastre:', validationResult.message);
        // Mostrar notificación de error al usuario
        showConnectionError(validationResult.message || 'Conexión no válida');
        return false;
      }
      
      logger.debug('✅ isValidConnection: retornando true');
      return true;
    }
    
    logger.debug('❌ isValidConnection: no hay currentFlow');
    return false;
  }, [state.currentFlow, isConnectionValid, showConnectionError]);

  // Función para obtener ayuda sobre conexiones
  const getConnectionHelp = useCallback((sourceNodeType: string, targetNodeType: string, handleType: 'source' | 'target') => {
    return getConnectionHelpMessage(sourceNodeType, targetNodeType, handleType);
  }, [getConnectionHelpMessage]);
  
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
        // Log removido para evitar duplicación con PositionPersistenceService
      }
    } catch (error) {
      logger.error('❌ Error persistiendo posiciones:', error);
    }
  }, [nodes, state.currentFlow, state.isLoading, positionPersistence]);

  // Manejar persistencia del viewport (zoom y posición)
  const hasPersistedViewport = useRef<boolean>(false);
  
  useEffect(() => {
    if (!state.currentFlow) {
      return;
    }

    // Cargar viewport persistido cuando se carga un flujo
    const persistedViewport = viewportPersistence.loadFlowViewport(state.currentFlow.id);
    if (persistedViewport) {
      hasPersistedViewport.current = true;
      logger.debug('🔍 Cargando viewport persistido:', persistedViewport);
      // Usar un delay para asegurar que ReactFlow esté listo
      setTimeout(() => {
        setViewport(persistedViewport, { duration: 300 });
        logger.debug('✅ Viewport aplicado después del delay');
      }, 400); // Más tiempo que el onInit (200ms)
    } else {
      hasPersistedViewport.current = false;
    }
  }, [state.currentFlow, viewportPersistence, setViewport]);

  // Función para guardar el viewport actual
  const saveCurrentViewport = useCallback(() => {
    if (!state.currentFlow) {
      return;
    }
    
    const currentViewport = getViewport();
    viewportPersistence.saveFlowViewport(state.currentFlow.id, currentViewport);
    logger.debug('💾 Viewport guardado:', currentViewport);
  }, [state.currentFlow, getViewport, viewportPersistence]);

  // Función para obtener estadísticas de viewport
  const getViewportStats = useCallback(() => {
    return viewportPersistence.getStats();
  }, [viewportPersistence]);

  // Función para limpiar viewport persistido del flujo actual
  const clearPersistedViewport = useCallback(() => {
    if (!state.currentFlow) {
      return;
    }
    viewportPersistence.clearFlowViewports(state.currentFlow.id);
    logger.info('🧹 Viewport persistido limpiado para flujo:', state.currentFlow.id);
  }, [state.currentFlow, viewportPersistence]);

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
    onConnectStart,
    onConnectEnd,
    onDrop,
    onDragOver,
    isValidConnection,
    
    // Funciones de utilidad
    getNodeTypeConfig,
    getPersistenceStats,
    clearPersistedPositions,
    getConnectionHelp,
    
    // Funciones de viewport
    saveCurrentViewport,
    getViewportStats,
    clearPersistedViewport,
    hasPersistedViewport,
    
    // Acciones
    addNode: actions.addNode,
    updateNode: actions.updateNode,
    removeNode: actions.removeNode,
    selectNode: actions.selectNode,
    createFlow: actions.createFlow,
    moveNode: actions.moveNode
  };
};
