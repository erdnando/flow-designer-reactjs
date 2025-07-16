import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { Flow } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import type { Connection } from '../../domain/entities/Connection';
import { FlowService } from '../../application/services/FlowService';
import { InMemoryFlowRepository } from '../../infrastructure/repositories/InMemoryFlowRepository';
import { FlowPersistenceService } from '../../infrastructure/services/FlowPersistenceService';
import { logger } from '../../shared/utils';

interface FlowState {
  currentFlow: Flow | null;
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
}

type FlowAction =
  | { type: 'SET_CURRENT_FLOW'; payload: Flow }
  | { type: 'SET_SELECTED_NODE'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; updates: Partial<Node> } }
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'ADD_CONNECTION'; payload: Connection }
  | { type: 'REMOVE_CONNECTION'; payload: string };

const initialState: FlowState = {
  currentFlow: null,
  selectedNodeId: null,
  isLoading: false,
  error: null
};

const flowReducer = (state: FlowState, action: FlowAction): FlowState => {
  switch (action.type) {
    case 'SET_CURRENT_FLOW':
      logger.debug('Reducer SET_CURRENT_FLOW called with:', action.payload);
      const setFlowState = { ...state, currentFlow: action.payload, error: null };
      logger.success('New state with current flow:', setFlowState);
      return setFlowState;
    
    case 'SET_SELECTED_NODE':
      return { ...state, selectedNodeId: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'UPDATE_NODE':
      console.log('🔧 Reducer UPDATE_NODE called with:', action.payload);
      if (!state.currentFlow) {
        console.log('❌ No current flow in reducer');
        return state;
      }
      
      try {
        console.log('🔧 Current flow before update:', state.currentFlow.id);
        // Clone the flow to avoid mutating the state directly
        const updatedFlow = state.currentFlow.clone();
        
        const nodeIndex = updatedFlow.nodes.findIndex(n => n.id === action.payload.nodeId);
        console.log('🔧 Node index:', nodeIndex);
        
        if (nodeIndex !== -1) {
          console.log('🔧 Original node:', updatedFlow.nodes[nodeIndex]);
          console.log('🔧 Updates to apply:', action.payload.updates);
          
          // Handle position updates
          if (action.payload.updates.position) {
            // Ensure position is complete with both x and y coordinates
            const currentPosition = updatedFlow.nodes[nodeIndex].position || { x: 0, y: 0 };
            updatedFlow.nodes[nodeIndex].position = { 
              ...currentPosition, 
              ...action.payload.updates.position 
            };
            // Update the node's timestamp
            updatedFlow.nodes[nodeIndex].updatedAt = new Date();
            console.log('✅ Node position updated to:', updatedFlow.nodes[nodeIndex].position);
          }
          
          // Handle data updates
          if (action.payload.updates.data) {
            const currentData = updatedFlow.nodes[nodeIndex].data || {};
            updatedFlow.nodes[nodeIndex].data = { 
              ...currentData, 
              ...action.payload.updates.data 
            };
            updatedFlow.nodes[nodeIndex].updatedAt = new Date();
            console.log('✅ Node data updated');
          }
          
          // Handle selection updates
          if (action.payload.updates.selected !== undefined) {
            updatedFlow.nodes[nodeIndex].selected = action.payload.updates.selected;
            updatedFlow.nodes[nodeIndex].updatedAt = new Date();
            console.log('✅ Node selection updated to:', updatedFlow.nodes[nodeIndex].selected);
          }
          
          // Handle type updates
          if (action.payload.updates.type) {
            updatedFlow.nodes[nodeIndex].type = action.payload.updates.type;
            updatedFlow.nodes[nodeIndex].updatedAt = new Date();
            console.log('✅ Node type updated to:', updatedFlow.nodes[nodeIndex].type);
          }
          
          // Update the flow's timestamp
          updatedFlow.updatedAt = new Date();
        } else {
          console.error('❌ Node not found with ID:', action.payload.nodeId);
        }
        
        const updatedState = { ...state, currentFlow: updatedFlow };
        console.log('✅ New state created with updated flow');
        return updatedState;
      } catch (error) {
        console.error('❌ Error in UPDATE_NODE reducer:', error);
        // Return the state unchanged in case of error
        return state;
      }
    
    case 'ADD_NODE':
      console.log('🔧 Reducer ADD_NODE called with:', action.payload);
      if (!state.currentFlow) {
        console.log('❌ No current flow in reducer');
        return state;
      }
      const flowWithNewNode = state.currentFlow.clone();
      console.log('🔧 Flow cloned, adding node...');
      flowWithNewNode.addNode(action.payload);
      console.log('🔧 Node added to flow. Total nodes:', flowWithNewNode.nodes.length);
      const addNodeState = {
        ...state,
        currentFlow: flowWithNewNode
      };
      console.log('✅ New state created with updated flow');
      return addNodeState;
    
    case 'REMOVE_NODE':
      if (!state.currentFlow) return state;
      const flowWithoutNode = state.currentFlow.clone();
      flowWithoutNode.removeNode(action.payload);
      return {
        ...state,
        currentFlow: flowWithoutNode,
        selectedNodeId: state.selectedNodeId === action.payload ? null : state.selectedNodeId
      };
    
    case 'ADD_CONNECTION':
      console.log('🔧 Reducer ADD_CONNECTION called with:', action.payload);
      if (!state.currentFlow) {
        console.log('❌ No current flow in reducer');
        return state;
      }
      const flowWithNewConnection = state.currentFlow.clone();
      console.log('🔧 Flow cloned, adding connection...');
      flowWithNewConnection.addConnection(action.payload);
      console.log('🔧 Connection added to flow. Total connections:', flowWithNewConnection.connections.length);
      const addConnectionState = {
        ...state,
        currentFlow: flowWithNewConnection
      };
      console.log('✅ New state created with updated flow and connections');
      return addConnectionState;
    
    case 'REMOVE_CONNECTION':
      if (!state.currentFlow) return state;
      const flowWithoutConnection = state.currentFlow.clone();
      flowWithoutConnection.removeConnection(action.payload);
      return {
        ...state,
        currentFlow: flowWithoutConnection
      };
    
    default:
      return state;
  }
};

interface FlowContextType {
  state: FlowState;
  flowService: FlowService;
  actions: {
    createFlow: (name: string, description?: string) => Promise<void>;
    loadFlow: (flowId: string) => Promise<void>;
    addNode: (type: string, position: { x: number; y: number }) => Promise<void>;
    updateNode: (nodeId: string, updates: Partial<Node>) => Promise<void>;
    removeNode: (nodeId: string) => Promise<void>;
    addConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => Promise<void>;
    removeConnection: (connectionId: string) => Promise<void>;
    selectNode: (nodeId: string | null) => void;
    moveNode: (nodeId: string, position: { x: number; y: number }) => Promise<void>;
  };
}

const FlowContext = createContext<FlowContextType | null>(null);

export const useFlowContext = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlowContext must be used within a FlowProvider');
  }
  return context;
};

interface FlowProviderProps {
  children: ReactNode;
}

export const FlowProvider: React.FC<FlowProviderProps> = ({ children }) => {
  logger.debug('FlowProvider: Component initializing...');
  const [state, dispatch] = useReducer(flowReducer, initialState);
  
  // Inicializar servicios
  const persistenceService = useMemo(() => new FlowPersistenceService(), []);
  
  const flowService = useMemo(() => {
    logger.debug('FlowProvider: Creating flowService...');
    try {
      const flowRepository = new InMemoryFlowRepository();
      const service = new FlowService(flowRepository);
      
      // Agregar métodos que faltan si es necesario
      if (typeof service.saveFlow !== 'function') {
        logger.warn('Adding missing saveFlow method to flowService');
        service.saveFlow = async (flow: Flow): Promise<Flow> => {
          logger.debug('Enhanced flowService.saveFlow called with flow:', flow);
          try {
            return await flowRepository.saveFlow(flow);
          } catch (error) {
            logger.error('Error in saveFlow:', error);
            return flow; // Return the flow without saving as fallback
          }
        };
      }
      
      // Verificar otros métodos básicos
      if (typeof service.createFlow !== 'function') {
        logger.warn('flowService.createFlow is missing');
      }
      if (typeof service.updateNode !== 'function') {
        logger.warn('flowService.updateNode is missing');
      }
      
      logger.success('FlowService initialized successfully');
      return service;
    } catch (error) {
      logger.error('Error creating flowService:', error);
      throw error;
    }
  }, []);

  // Efecto para guardar el flujo cuando cambie
  useEffect(() => {
    if (state.currentFlow) {
      logger.debug('Guardando flujo en localStorage:', state.currentFlow.id);
      persistenceService.saveFlow(state.currentFlow);
    }
  }, [state.currentFlow, persistenceService]);

  // Utilizamos el método de verificación de consistencia del servicio
  const verifyStorageConsistency = useCallback((flow: Flow) => {
    logger.debug('Verificando consistencia entre flujo y posiciones...');
    try {
      persistenceService.verifyNodePositions(flow);
      logger.success('✅ Verificación de consistencia completada');
    } catch (error) {
      logger.error('❌ Error al verificar consistencia:', error);
    }
  }, [persistenceService]);

  // Inicializar: cargar flujo guardado o crear uno nuevo
  useEffect(() => {
    logger.debug('Inicializando flujo - buscando guardados o creando nuevo...');
    
    const initializeFlow = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Verificar si hay flujos guardados
        const savedFlowIds = persistenceService.listSavedFlowIds();
        
        if (savedFlowIds.length > 0) {
          logger.debug('Flujos guardados encontrados:', savedFlowIds);
          // Cargar el primer flujo guardado
          const savedFlow = persistenceService.loadFlow(savedFlowIds[0]);
          
          if (savedFlow) {
            logger.success('Cargando flujo guardado:', savedFlowIds[0]);
            
            // SOLUCIÓN: Verificar consistencia entre flujo y posiciones
            verifyStorageConsistency(savedFlow);
            
            dispatch({ type: 'SET_CURRENT_FLOW', payload: savedFlow });
            
            // Esperar un momento para asegurar que la renderización se complete
            setTimeout(() => {
              dispatch({ type: 'SET_LOADING', payload: false });
            }, 50);
            
            return; // No es necesario crear uno nuevo
          }
        }
        
        // No hay flujos guardados o no se pudo cargar, crear uno nuevo
        logger.debug('No se encontraron flujos guardados, creando uno nuevo');
        const initialFlow = new Flow({
          name: 'Mi Flujo', 
          description: 'Flujo creado automáticamente',
          nodes: [],
          connections: [] 
        });
        
        // Guardar usando el servicio
        await flowService.saveFlow(initialFlow);
        
        // También persistir en localStorage
        persistenceService.saveFlow(initialFlow);
        logger.success('Flujo guardado exitosamente en memoria y localStorage');
        
        // Actualizar el estado con el flujo creado
        dispatch({ type: 'SET_CURRENT_FLOW', payload: initialFlow });
      } catch (error) {
        logger.error('Error al inicializar flujo:', error);
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Error desconocido' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initializeFlow();
  }, [flowService, persistenceService, verifyStorageConsistency]);

  const actions = {
    createFlow: useCallback(async (name: string, description = '') => {
      logger.debug('FlowContext.createFlow called with:', { name, description });
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        logger.debug('Calling flowService.createFlow...');
        const flow = await flowService.createFlow({ name, description });
        logger.success('FlowService returned flow:', flow);
        dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
        console.log('✅ Flow set as current flow');
      } catch (error) {
        console.error('❌ Error creating flow:', error);
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [flowService]),

    loadFlow: useCallback(async (flowId: string) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const flow = await flowService.getFlow(flowId);
        if (flow) {
          dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Flow not found' });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [flowService]),

    addNode: useCallback(async (type: string, position: { x: number; y: number }) => {
      console.log('🔧 FlowContext.addNode called with:', { type, position });
      
      // Validar los parámetros
      if (!type) {
        console.error('❌ Invalid node type:', type);
        dispatch({ type: 'SET_ERROR', payload: 'Invalid node type' });
        return;
      }
      
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        console.error('❌ Invalid position:', position);
        position = { x: 100, y: 100 }; // Posición por defecto si es inválida
        console.log('✅ Using default position instead:', position);
      }
      
      // Obtener el estado actual directamente del contexto
      const currentState = state;
      console.log('🔧 Current state in addNode:', currentState);
      console.log('🔧 Current flow exists:', !!currentState.currentFlow);
      console.log('🔧 Current flow ID:', currentState.currentFlow?.id);
      
      // Verificar si hay un flujo actual
      if (!currentState.currentFlow) {
        console.error('❌ No current flow available in addNode');
        
        // Crear un flujo si no existe
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          console.log('🔧 Creating a new flow since none exists...');
          
          // Crear un flujo directamente
          const newFlow = new Flow({
            name: 'My Flow',
            description: 'Auto-created flow'
          });
          console.log('✅ New flow created:', newFlow);
          
          // Actualizar el estado con el nuevo flujo
          dispatch({ type: 'SET_CURRENT_FLOW', payload: newFlow });
          console.log('✅ New flow set as current');
          
          // Continuar con la creación del nodo
          await addNodeToFlow(newFlow, type, position);
        } catch (error) {
          console.error('❌ Error creating new flow in addNode:', error);
          dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
        return;
      }
      
      // Si hay un flujo, agregar el nodo directamente
      await addNodeToFlow(currentState.currentFlow, type, position);
      
      // Función interna para agregar un nodo a un flujo
      async function addNodeToFlow(flow: Flow, nodeType: string, nodePosition: { x: number; y: number }) {
        try {
          console.log('🔧 Adding node to flow with ID:', flow.id);
          
          // Crear el nodo directamente
          const node = new Node({
            type: nodeType as any,
            position: nodePosition,
            data: { label: `${nodeType} Node` }
          });
          console.log('✅ Node created:', node);
          
          // Agregar el nodo al flujo
          flow.addNode(node);
          console.log('✅ Node added to flow');
          
          try {
            // Primero actualizar la UI para respuesta inmediata
            dispatch({ type: 'ADD_NODE', payload: node });
            console.log('✅ Node dispatched to reducer');
            
            // Luego intentar guardar en el repositorio
            if (typeof flowService.saveFlow === 'function') {
              await flowService.saveFlow(flow);
              console.log('✅ Flow saved with new node');
            } else {
              console.error('❌ flowService.saveFlow is not a function');
              console.log('📌 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(flowService)));
              // Fallback - intentar usar addNode del servicio si saveFlow no está disponible
              if (typeof flowService.addNode === 'function') {
                await flowService.addNode(flow.id, {
                  type: nodeType as any,
                  position: nodePosition,
                  data: { label: `${nodeType} Node` }
                });
                console.log('✅ Node added using flowService.addNode as fallback');
              }
            }
          } catch (saveError) {
            console.error('❌ Error saving flow after adding node:', saveError);
            // No lanzar error aquí, ya hemos actualizado la UI
          }
        } catch (error) {
          console.error('❌ Error in addNodeToFlow:', error);
          dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }, [flowService, state, dispatch]),

    updateNode: useCallback(async (nodeId: string, updates: Partial<Node>) => {
      if (!state.currentFlow) return;
      
      try {
        await flowService.updateNode(state.currentFlow.id, nodeId, updates);
        dispatch({ type: 'UPDATE_NODE', payload: { nodeId, updates } });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      }
    }, [flowService, state.currentFlow]),

    removeNode: useCallback(async (nodeId: string) => {
      if (!state.currentFlow) {
        console.error('❌ No hay flujo actual para eliminar nodo');
        return;
      }
      
      console.log('🚀 Iniciando eliminación del nodo:', nodeId, 'del flujo:', state.currentFlow.id);
      
      try {
        // Verificar que el nodo existe
        const nodeExists = state.currentFlow.nodes.some(node => node.id === nodeId);
        
        if (!nodeExists) {
          console.warn('⚠️ El nodo a eliminar no existe en el estado:', nodeId);
          
          // ANTI-FANTASMAS: Actualizar el estado de todas formas para eliminar referencias fantasma
          console.log('🧹 Actualizando el estado para eliminar cualquier referencia persistente');
          dispatch({ type: 'REMOVE_NODE', payload: nodeId });
          return;
        }
        
        console.log('✅ El nodo existe, procediendo con la eliminación');
        
        // PASO 1: Asegurar que el flujo esté actualizado en el repositorio
        try {
          await flowService.saveFlow(state.currentFlow);
          console.log('✅ Flujo sincronizado en repositorio antes de eliminar nodo');
        } catch (syncError) {
          console.warn('⚠️ No se pudo sincronizar el flujo:', syncError);
          // Continuar con la eliminación de todas formas
        }
        
        // PASO 2: Eliminar el nodo del servicio
        try {
          await flowService.removeNode(state.currentFlow.id, nodeId);
          console.log('✅ Nodo eliminado del servicio, actualizando UI');
          dispatch({ type: 'REMOVE_NODE', payload: nodeId });
        } catch (removeError) {
          // Si falla la eliminación del nodo en el servicio, eliminar solo en la UI
          console.error('❌ Error al eliminar nodo del servicio, actualizando solo UI:', removeError);
          console.log('⚠️ Eliminando nodo solo en la UI como fallback');
          dispatch({ type: 'REMOVE_NODE', payload: nodeId });
        }
      } catch (error) {
        console.error('❌ Error general en removeNode:', error);
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      }
    }, [flowService, state.currentFlow]),

    addConnection: useCallback(async (sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => {
      console.log('🔧 FlowContext.addConnection called with:', { sourceNodeId, targetNodeId, sourceHandle, targetHandle });
      if (!state.currentFlow) {
        console.error('❌ No current flow available in addConnection');
        return;
      }
      
      try {
        console.log('🔧 Creating connection with flow ID:', state.currentFlow.id);
        const connection = await flowService.addConnection(state.currentFlow.id, {
          sourceNodeId,
          targetNodeId,
          sourceHandle: sourceHandle || 'output',
          targetHandle: targetHandle || 'input'
        });
        console.log('✅ Connection created:', connection);
        
        // CORRECCIÓN: Dispatch inmediato para actualizar el estado
        dispatch({ type: 'ADD_CONNECTION', payload: connection });
        console.log('✅ Connection dispatched to reducer');
        
        // Forzar re-renderización inmediata del estado
        setTimeout(() => {
          // Crear un pequeño cambio en el estado para forzar re-renderización
          // sin afectar la funcionalidad
          dispatch({ type: 'SET_LOADING', payload: false });
        }, 10);
        
      } catch (error) {
        console.error('❌ Error in addConnection:', error);
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      }
    }, [flowService, state.currentFlow]),

    removeConnection: useCallback(async (connectionId: string) => {
      if (!state.currentFlow) return;
      
      try {
        await flowService.removeConnection(state.currentFlow.id, connectionId);
        dispatch({ type: 'REMOVE_CONNECTION', payload: connectionId });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      }
    }, [flowService, state.currentFlow]),

    selectNode: useCallback((nodeId: string | null) => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: nodeId });
    }, []),

    moveNode: useCallback(async (nodeId: string, position: { x: number; y: number }) => {
      console.log('🔧 FlowContext.moveNode called with:', { nodeId, position });
      
      // Validate arguments
      if (!nodeId || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        console.error('❌ Invalid arguments to moveNode:', { nodeId, position });
        return;
      }
      
      if (!state.currentFlow) {
        console.error('❌ No current flow available in moveNode');
        return;
      }
      
      try {
        // Verify if the node exists
        const node = state.currentFlow.nodes.find(n => n.id === nodeId);
        if (!node) {
          console.error('❌ Node with ID does not exist in current flow:', nodeId);
          return;
        }
        
        console.log('✅ Node exists in flow, updating position');
        
        // Create update object with rounded coordinates
        const updates = {
          position: {
            x: Math.round(position.x),
            y: Math.round(position.y)
          }
        };
        
        // First update UI for immediate response
        dispatch({ 
          type: 'UPDATE_NODE', 
          payload: { nodeId, updates } 
        });
        
        console.log('✅ Node position updated in UI state');
        
        // Get a snapshot of the current state for async operation
        const flowId = state.currentFlow.id;
        
        // Set up debouncing to avoid too many save operations
        // Initialize the window.nodeMoveTimeouts object if it doesn't exist
        if (!window.nodeMoveTimeouts) {
          window.nodeMoveTimeouts = {};
        }
        
        // Clear any existing timeout for this node
        if (window.nodeMoveTimeouts[nodeId]) {
          clearTimeout(window.nodeMoveTimeouts[nodeId]);
        }
        
        // Persist changes asynchronously with debouncing
        window.nodeMoveTimeouts[nodeId] = setTimeout(async () => {
          try {
            await flowService.updateNode(flowId, nodeId, { position: updates.position });
            console.log('✅ Node position saved to repository');
          } catch (saveError) {
            console.error('❌ Error saving node position:', saveError);
          }
        }, 300); // Debounce for 300ms
        
      } catch (error) {
        console.error('❌ Error in moveNode:', error);
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      }
    }, [flowService, state, dispatch])
  };

  const contextValue: FlowContextType = {
    state,
    flowService,
    actions
  };

  return (
    <FlowContext.Provider value={contextValue}>
      {children}
    </FlowContext.Provider>
  );
};
