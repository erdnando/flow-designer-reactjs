import { useCallback, useRef, useEffect, useMemo } from 'react';
import type { Node, NodeChange } from 'reactflow';
import { validateAndRoundPosition, handleNodeDeletion } from '../utils/flowUtilities';
import { PositionPersistenceService } from '../../../infrastructure/services/PositionPersistenceService';
import { Position } from '../../../domain/value-objects/Position';
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

interface PositionManagementOptions {
  state: FlowState;
  actions: FlowActions;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  isEnabled?: boolean; // Flag para controlar si está activo
}

export interface PositionManagementReturn {
  nodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  draggingNodesRef: React.MutableRefObject<Set<string>>;
  positionPersistence: PositionPersistenceService;
  handleNodesChange: (changes: any[]) => void;
  getPositionStats: () => any;
  clearPositions: () => void;
}

/**
 * Hook para manejar la gestión de posiciones de nodos
 * Incluye el nuclear interceptor, persistencia de posiciones y sincronización
 */
export const usePositionManagement = (options: PositionManagementOptions): PositionManagementReturn => {
  const {
    state,
    actions,
    nodes,
    setNodes,
    onNodesChange,
    isEnabled = true // Por defecto está habilitado
  } = options;

  // Referencias para manejo de posiciones
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const draggingNodesRef = useRef<Set<string>>(new Set());
  const isSyncingRef = useRef(false);

  // Servicio de persistencia de posiciones
  const positionPersistence = useMemo(() => new PositionPersistenceService(), []);

  // INTERCEPTOR NUCLEAR - Bloquear TODOS los cambios de posición no autorizados
  const handleNodesChange = useCallback((changes: any[]) => {
    // Si el módulo no está habilitado, usar el handler original
    if (!isEnabled) {
      onNodesChange(changes);
      return;
    }

    const startTime = performance.now();
    
    // PROTECCIÓN ADICIONAL: Throttle para cambios masivos de dimensiones
    const hasMultipleDimensionChanges = changes.filter(c => c.type === 'dimensions').length > 5;
    if (hasMultipleDimensionChanges) {
      // Para cambios masivos de dimensiones, aplicar directamente sin procesamiento
      onNodesChange(changes);
      performanceMonitor('handleNodesChange', startTime);
      return;
    }
    
    const isDragging = draggingNodesRef.current.size > 0;
    // Detectar drag también en los cambios actuales
    const hasDragChanges = changes.some(change => 
      change.type === 'position' && (change.dragging === true || change.dragging === false)
    );
    const isDragOperation = isDragging || hasDragChanges;
    
    // LOGGING TEMPORAL CRÍTICO para entender el problema
    if (changes.some(c => c.type === 'position' || c.type === 'select')) {
      console.log('🔍 INTERCEPTOR DEBUG:', {
        changes: changes.map(c => ({ 
          id: c.id, 
          type: c.type, 
          dragging: c.dragging, 
          position: c.position 
        })),
        isDragging,
        hasDragChanges,
        isDragOperation,
        draggingNodes: Array.from(draggingNodesRef.current)
      });
    }
    
    // OPTIMIZACIÓN CRÍTICA: Durante drag, aplicar cambios directamente sin logging ni procesamiento extra
    if (isDragOperation) {
      // Fast path para operaciones de drag - evitar logging y validaciones complejas
      const dragOptimizedChanges = changes.filter(change => {
        // Permitir todos los cambios de posición durante drag
        if (change.type === 'position') return true;
        // Permitir cambios de dimensiones
        if (change.type === 'dimensions') return true;
        // Permitir cambios de selección
        if (change.type === 'select') return true;
        // Bloquear otros tipos durante drag para mantener performance
        return false;
      });
      
      // Aplicar cambios directamente sin logging detallado
      onNodesChange(dragOptimizedChanges);
      
      // Solo actualizar referencias críticas durante drag - SIN LOGGING
      dragOptimizedChanges.forEach(change => {
        if (change.type === 'position') {
          if (change.dragging === true) {
            draggingNodesRef.current.add(change.id);
            const roundedPosition = validateAndRoundPosition(change.position);
            if (roundedPosition) {
              nodePositionsRef.current.set(change.id, roundedPosition);
            }
          } else if (change.dragging === false) {
            draggingNodesRef.current.delete(change.id);
            const roundedPosition = validateAndRoundPosition(change.position);
            if (roundedPosition) {
              nodePositionsRef.current.set(change.id, roundedPosition);
              // Persistir solo al final del drag, no durante
              if (state.currentFlow) {
                const domainPosition = new Position(roundedPosition.x, roundedPosition.y);
                positionPersistence.updateNodePosition(state.currentFlow.id, change.id, domainPosition);
                actions.moveNode(change.id, roundedPosition);
              }
            }
          }
        }
      });
      
      performanceMonitor('handleNodesChange', startTime);
      return;
    }
    
    // LOGGING Y VALIDACIÓN COMPLETA solo para operaciones NO-DRAG
    migrationLog('POSITION_MANAGEMENT', 'Nuclear interceptor called', {
      changesCount: changes.length,
      isDragOperation,
      hasMultipleDimensionChanges,
      draggingNodes: Array.from(draggingNodesRef.current)
    });
    
    logger.debug('===== NUCLEAR INTERCEPTOR =====');
    logger.debug('Raw changes received:', changes);
    logger.debug('Currently dragging nodes:', Array.from(draggingNodesRef.current));
    logger.debug('Is syncing:', isSyncingRef.current);
    
    // SUPER AGRESIVO: Bloquear CUALQUIER cambio que pueda afectar la posición
    const authorizedChanges = changes.filter(change => {
      logger.debug('Analyzing change:', change);
      
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
            migrationLog('POSITION_MANAGEMENT', 'Node position set on add', {
              nodeId: change.item.id,
              position: roundedPosition
            });
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
                migrationLog('POSITION_MANAGEMENT', 'Node position set on replace', {
                  nodeId: node.id,
                  position: roundedPosition
                });
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
            migrationLog('POSITION_MANAGEMENT', 'Drag start position update', {
              nodeId: change.id,
              position: roundedPosition
            });
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
              migrationLog('POSITION_MANAGEMENT', 'Drag end position update', {
                nodeId: change.id,
                position: roundedPosition
              });
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
      
      // PERMITIR cambios de dimensiones - NO bloquear para evitar ResizeObserver loops
      if (change.type === 'dimensions') {
        // CAMBIO CRÍTICO: Siempre permitir cambios de dimensiones para evitar loops de ResizeObserver
        if (!isDragOperation && !hasMultipleDimensionChanges && changes.length <= 2) {
          logger.debug('AUTHORIZED: Automatic dimensions change for node:', change.id);
        }
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
    
    // Si no hay cambios autorizados, NO restaurar automáticamente para evitar bucles
    if (authorizedChanges.length === 0) {
      // CAMBIO CRÍTICO: Solo loggear pero NO restaurar posiciones automáticamente
      // Esto previene los bucles infinitos que causan la desaparición de nodos
      const hasBlockedPositionChanges = changes.some(change => 
        change.type === 'position' && change.dragging === undefined && !isDragOperation
      );
      
      if (hasBlockedPositionChanges && changes.length <= 3) {
        migrationLog('POSITION_MANAGEMENT', 'Position changes blocked (no restoration)', {
          blockedChanges: changes.length,
          changeTypes: changes.map(c => c.type)
        });
      }
      
      performanceMonitor('handleNodesChange', startTime);
      return;
    }
    
    // Aplicar cambios autorizados a ReactFlow
    onNodesChange(authorizedChanges);
    
    // Procesar para nuestro estado
    authorizedChanges.forEach(change => {
      if (change.type === 'remove') {
        logger.info(`🗑️ FASE 4: Eliminación simplificada para nodo: ${change.id}`);
        migrationLog('POSITION_MANAGEMENT', 'Node removal processing', { nodeId: change.id });
        
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
          .then(() => {
            logger.success('✅ Eliminación de nodo completada:', change.id);
            migrationLog('POSITION_MANAGEMENT', 'Node deletion completed', { nodeId: change.id });
          })
          .catch(error => {
            logger.error('❌ Error durante eliminación de nodo:', error);
            migrationLog('POSITION_MANAGEMENT', 'Node deletion error', { 
              nodeId: change.id,
              error: error instanceof Error ? error.message : String(error)
            });
          });
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
            migrationLog('POSITION_MANAGEMENT', 'Position persisted', {
              nodeId: change.id,
              position: roundedPosition,
              flowId: state.currentFlow.id
            });
          }
          
          // Actualizar el modelo de dominio
          actions.moveNode(change.id, roundedPosition);
          logger.success('Node position saved to repository and persistence');
        } else {
          logger.error('Invalid position data for node:', change.id, 'Position:', change.position);
        }
      }
    });
    
    performanceMonitor('handleNodesChange', startTime);
  }, [nodes, setNodes, onNodesChange, actions, state.currentFlow, positionPersistence, isEnabled]);

  // Función para obtener estadísticas de posiciones
  const getPositionStats = useCallback(() => {
    if (!isEnabled) return {};
    
    const startTime = performance.now();
    const stats = positionPersistence.getStats();
    performanceMonitor('getPositionStats', startTime);
    migrationLog('POSITION_MANAGEMENT', 'Position stats retrieved', stats);
    return stats;
  }, [positionPersistence, isEnabled]);

  // Función para limpiar posiciones
  const clearPositions = useCallback(() => {
    if (!isEnabled) return;
    
    const startTime = performance.now();
    if (state.currentFlow) {
      positionPersistence.clearFlowPositions(state.currentFlow.id);
      logger.info('Cleared all persisted positions for current flow');
      migrationLog('POSITION_MANAGEMENT', 'Positions cleared', { flowId: state.currentFlow.id });
    }
    performanceMonitor('clearPositions', startTime);
  }, [positionPersistence, state.currentFlow, isEnabled]);

  // Referencia para prevenir bucles infinitos en persistencia
  const lastPersistedPositionsRef = useRef<string>('');
  const persistenceThrottleRef = useRef<number>(0);

  // Efecto para persistir posiciones cuando hay cambios en los nodos
  useEffect(() => {
    if (!isEnabled || !state.currentFlow || state.isLoading || nodes.length === 0) {
      return;
    }

    // OPTIMIZACIÓN CRÍTICA: NO persistir durante operaciones de drag
    if (draggingNodesRef.current.size > 0) {
      return;
    }

    // PROTECCIÓN CONTRA BUCLES: Throttle agresivo para persistencia
    const now = Date.now();
    if (now - persistenceThrottleRef.current < 500) { // Solo permitir persistencia cada 500ms
      return;
    }

    const startTime = performance.now();
    
    // Crear hash de posiciones actuales para detectar cambios reales
    const currentPositionsHash = nodes
      .map(node => `${node.id}:${Math.round(node.position?.x || 0)},${Math.round(node.position?.y || 0)}`)
      .sort()
      .join('|');
    
    // PROTECCIÓN CONTRA BUCLES: Solo persistir si las posiciones realmente cambiaron
    if (currentPositionsHash === lastPersistedPositionsRef.current) {
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
        lastPersistedPositionsRef.current = currentPositionsHash;
        persistenceThrottleRef.current = now;
        
        migrationLog('POSITION_MANAGEMENT', 'Batch positions persisted', {
          flowId: state.currentFlow.id,
          positionsCount: positions.size,
          throttled: true
        });
      }
    } catch (error) {
      logger.error('❌ Error persistiendo posiciones:', error);
      migrationLog('POSITION_MANAGEMENT', 'Position persistence error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    performanceMonitor('positionPersistenceEffect', startTime);
  }, [nodes, state.currentFlow, state.isLoading, positionPersistence, isEnabled]);

  return {
    nodePositionsRef,
    draggingNodesRef,
    positionPersistence,
    handleNodesChange,
    getPositionStats,
    clearPositions
  };
};
