/**
 * Contexto separado para el estado del flujo
 * Fase 5: Separación de contextos para mejor rendimiento
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode, useMemo } from 'react';
import { Flow } from '../../domain/entities/Flow';
import { FlowService } from '../../application/services/FlowService';
import { InMemoryFlowRepository } from '../../infrastructure/repositories/InMemoryFlowRepository';
import { FlowPersistenceService } from '../../infrastructure/services/FlowPersistenceService';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from '../utils/logger';

interface FlowDataState {
  currentFlow: Flow | null;
  isLoading: boolean;
  error: string | null;
}

type FlowDataAction =
  | { type: 'SET_CURRENT_FLOW'; payload: Flow | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const flowDataReducer = (state: FlowDataState, action: FlowDataAction): FlowDataState => {
  switch (action.type) {
    case 'SET_CURRENT_FLOW':
      return { ...state, currentFlow: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
};

interface FlowDataContextType {
  state: FlowDataState;
  flowService: FlowService;
  actions: {
    createFlow: (name: string, description?: string) => Promise<void>;
    loadFlow: (flowId: string) => Promise<void>;
    updateFlowProperties: (updates: Partial<Flow>) => Promise<void>;
  };
}

const FlowDataContext = createContext<FlowDataContextType | null>(null);

export const FlowDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(flowDataReducer, {
    currentFlow: null,
    isLoading: false,
    error: null
  });

  // Servicios memoizados para evitar recreación en cada render
  const flowRepository = useMemo(() => new InMemoryFlowRepository(), []);
  const flowService = useMemo(() => new FlowService(flowRepository), [flowRepository]);
  const persistenceService = useMemo(() => new FlowPersistenceService(), []);

  const actions = {
    createFlow: useCallback(async (name: string, description?: string) => {
      if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
        logger.debug('🔄 Separated contexts feature disabled, skipping');
        return;
      }

      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const flow = new Flow({
          name,
          description: description || '',
          status: 'draft'
        });
        await flowService.saveFlow(flow);
        persistenceService.saveFlow(flow);
        
        dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
        logger.success('✅ Flow created successfully in separated context:', flow.name);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        logger.error('❌ Error creating flow in separated context:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [flowService, persistenceService]),

    loadFlow: useCallback(async (flowId: string) => {
      if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
        logger.debug('🔄 Separated contexts feature disabled, skipping');
        return;
      }

      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        let flow = persistenceService.loadFlow(flowId);
        if (!flow) {
          flow = await flowService.getFlow(flowId);
        }
        
        if (flow) {
          dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
          logger.success('✅ Flow loaded successfully in separated context:', flow.name);
        } else {
          throw new Error(`Flow with ID ${flowId} not found`);
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        logger.error('❌ Error loading flow in separated context:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [flowService, persistenceService]),

    updateFlowProperties: useCallback(async (updates: Partial<Flow>) => {
      if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
        logger.debug('🔄 Separated contexts feature disabled, skipping');
        return;
      }

      try {
        if (!state.currentFlow) {
          throw new Error('No active flow to update');
        }
        
        dispatch({ type: 'SET_LOADING', payload: true });
        
        state.currentFlow.updateProperties(updates);
        await flowService.saveFlow(state.currentFlow);
        persistenceService.saveFlow(state.currentFlow);
        
        dispatch({ type: 'SET_CURRENT_FLOW', payload: state.currentFlow });
        logger.success('✅ Flow properties updated successfully in separated context');
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        logger.error('❌ Error updating flow properties in separated context:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [state.currentFlow, flowService, persistenceService])
  };

  const contextValue: FlowDataContextType = {
    state,
    flowService,
    actions
  };

  return (
    <FlowDataContext.Provider value={contextValue}>
      {children}
    </FlowDataContext.Provider>
  );
};

export const useFlowData = (): FlowDataContextType => {
  const context = useContext(FlowDataContext);
  if (!context) {
    throw new Error('useFlowData must be used within FlowDataProvider');
  }
  return context;
};

/**
 * Hook de compatibilidad que decide qué contexto usar
 */
export const useCompatibleFlowData = () => {
  const flowDataContext = useContext(FlowDataContext);
  
  if (isFeatureEnabled('SEPARATED_CONTEXTS') && flowDataContext) {
    return {
      source: 'separated' as const,
      ...flowDataContext
    };
  }
  
  // Fallback: usar el contexto unificado tradicional
  return {
    source: 'unified' as const,
    state: { currentFlow: null, isLoading: false, error: null },
    flowService: null as any,
    actions: {
      createFlow: async () => {},
      loadFlow: async () => {},
      updateFlowProperties: async () => {}
    }
  };
};
