import { useCallback, useRef } from 'react';
import { migrationLog, performanceMonitor } from '../../../shared/config/migrationFlags';
import { logger } from '../../../shared/utils';

export interface EdgeEventHandlersOptions {
  actions: any;
  state: any;
  setEdges: (updater: (edges: any[]) => any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  initialEdges: any[];
  isConnectionValid: (params: any, nodes: any[], connections: any[]) => { valid: boolean; message?: string };
  showConnectionError: (message: string) => void;
}

export interface EdgeEventHandlersReturn {
  handleEdgesChange: (changes: any[]) => void;
  onConnectStart: (event: any, params: any) => void;
  onConnectEnd: (event: any) => void;
  onConnect: (params: any) => void;
}

/**
 * Hook para manejar eventos relacionados con edges y conexiones
 * Gestiona la creación, eliminación y modificación de conexiones entre nodos
 */
export const useEdgeEventHandlers = (options: EdgeEventHandlersOptions): EdgeEventHandlersReturn => {
  const {
    actions,
    state,
    setEdges,
    onEdgesChange,
    initialEdges,
    isConnectionValid,
    showConnectionError
  } = options;

  // Ref para evitar loops de sincronización
  const isSyncingRef = useRef(false);

  // Wrapper para onEdgesChange que maneja nuestro estado personalizado
  const handleEdgesChange = useCallback((changes: any[]) => {
    const startTime = performance.now();
    migrationLog('EDGE_HANDLERS', 'handleEdgesChange called', { changesCount: changes.length });
    
    logger.debug('handleEdgesChange called with changes:', changes);
    
    // Primero aplicar los cambios a ReactFlow
    onEdgesChange(changes);
    
    // Luego procesar los cambios para nuestro estado personalizado
    changes.forEach(change => {
      if (change.type === 'remove') {
        logger.info('Edge removed:', change.id);
        migrationLog('EDGE_HANDLERS', 'Edge removed', { edgeId: change.id });
        actions.removeConnection(change.id);
      }
    });
    
    performanceMonitor('handleEdgesChange', startTime);
  }, [onEdgesChange, actions]);

  // Event handlers para prevenir el efecto de arrastre fantasma
  const onConnectStart = useCallback((event: any, params: any) => {
    const startTime = performance.now();
    
    // Cuando inicia la conexión, eliminar cualquier imagen de arrastre
    const nodeId = params?.nodeId || 'unknown';
    const handleId = params?.handleId || 'unknown';
    const handleType = params?.handleType || 'unknown';
    
    logger.debug('🔌 Connection start detected:', { nodeId, handleId, handleType });
    migrationLog('EDGE_HANDLERS', 'Connection start', { nodeId, handleId, handleType });
    
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
    
    performanceMonitor('onConnectStart', startTime);
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    const startTime = performance.now();
    
    // Restaurar el cursor y remover la clase cuando termina la conexión
    logger.debug('🔌 Connection end detected');
    migrationLog('EDGE_HANDLERS', 'Connection end');
    
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
    
    performanceMonitor('onConnectEnd', startTime);
  }, []);

  const onConnect = useCallback((params: any) => {
    const startTime = performance.now();
    
    logger.debug('⚡ onConnect called with params:', params);
    migrationLog('EDGE_HANDLERS', 'onConnect called', { 
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    });
    
    logger.debug('🔍 onConnect - Full params details:', {
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle,
      allParams: params
    });
    
    if (!params.source || !params.target) {
      logger.error('❌ Missing source or target in connection params');
      migrationLog('EDGE_HANDLERS', 'Missing connection params', { params });
      return;
    }
    
    // Validación de la conexión
    if (state.currentFlow) {
      logger.debug('🔍 Validando conexión en onConnect...');
      migrationLog('EDGE_HANDLERS', 'Validating connection');
      
      const validationResult = isConnectionValid(
        params,
        state.currentFlow.nodes,
        state.currentFlow.connections
      );
      
      if (!validationResult.valid) {
        logger.error('❌ Conexión rechazada por validación:', validationResult.message);
        migrationLog('EDGE_HANDLERS', 'Connection validation failed', { 
          message: validationResult.message 
        });
        
        // Mostrar notificación de error en lugar de alert
        showConnectionError(validationResult.message || 'Conexión no válida');
        return;
      }
      
      logger.debug('✅ Validación en onConnect pasada');
      migrationLog('EDGE_HANDLERS', 'Connection validation passed');
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
        migrationLog('EDGE_HANDLERS', 'Starting connection creation');
        
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
          migrationLog('EDGE_HANDLERS', 'Adding edge to ReactFlow state', { edgeId: newEdge.id });
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
        migrationLog('EDGE_HANDLERS', 'Connection created successfully');
        
        // Asegurar que la UI refleja el estado actual
        setTimeout(() => {
          if (state.currentFlow?.connections) {
            const domainConnections = state.currentFlow.connections.length;
            setEdges(currentEdges => {
              if (currentEdges.length !== domainConnections) {
                logger.debug('🔄 Sincronizando edges con el dominio');
                migrationLog('EDGE_HANDLERS', 'Synchronizing edges with domain', {
                  currentEdges: currentEdges.length,
                  domainConnections
                });
                return initialEdges;
              }
              return currentEdges;
            });
          }
        }, 50);
        
      } catch (error) {
        logger.error('❌ Error al crear conexión:', error);
        migrationLog('EDGE_HANDLERS', 'Error creating connection', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
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
    performanceMonitor('onConnect', startTime);
  }, [actions, setEdges, state.currentFlow, initialEdges, isConnectionValid, showConnectionError]);

  return {
    handleEdgesChange,
    onConnectStart,
    onConnectEnd,
    onConnect
  };
};
