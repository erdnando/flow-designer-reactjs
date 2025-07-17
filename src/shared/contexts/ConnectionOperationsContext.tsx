/**
 * Contexto separado para operaciones de conexiones
 * Fase 5: Separación de contextos para mejor rendimiento
 */

import React, { createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { Connection } from '../../domain/entities/Connection';
import { Flow } from '../../domain/entities/Flow';
import { 
  addConnectionImmutable, 
  removeConnectionImmutable 
} from '../utils/immutableUpdates';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from '../utils/logger';

interface ConnectionOperationsContextType {
  actions: {
    addConnection: (flow: Flow, sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => Promise<Flow>;
    removeConnection: (flow: Flow, connectionId: string) => Promise<Flow>;
    updateConnection: (flow: Flow, connectionId: string, updates: Partial<Connection>) => Promise<Flow>;
  };
}

const ConnectionOperationsContext = createContext<ConnectionOperationsContextType | null>(null);

export const ConnectionOperationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const addConnection = useCallback(async (
    flow: Flow, 
    sourceNodeId: string, 
    targetNodeId: string, 
    sourceHandle?: string, 
    targetHandle?: string
  ): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      const newConnection = new Connection({
        sourceNodeId,
        targetNodeId,
        sourceHandle: sourceHandle || 'output',
        targetHandle: targetHandle || 'input'
      });
      flow.addConnection(newConnection);
      return flow;
    }

    try {
      logger.debug('🎯 Adding connection using separated context:', { 
        sourceNodeId, 
        targetNodeId, 
        sourceHandle, 
        targetHandle 
      });
      const newConnection = new Connection({
        sourceNodeId,
        targetNodeId,
        sourceHandle: sourceHandle || 'output',
        targetHandle: targetHandle || 'input'
      });
      const updatedFlow = await addConnectionImmutable(flow, newConnection);
      logger.success('✅ Connection added successfully in separated context');
      return updatedFlow;
    } catch (error) {
      logger.error('❌ Error adding connection in separated context:', error);
      throw error;
    }
  }, []);

  const removeConnection = useCallback(async (flow: Flow, connectionId: string): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      flow.removeConnection(connectionId);
      return flow;
    }

    try {
      logger.debug('🎯 Removing connection using separated context:', connectionId);
      const updatedFlow = await removeConnectionImmutable(flow, connectionId);
      logger.success('✅ Connection removed successfully in separated context');
      return updatedFlow;
    } catch (error) {
      logger.error('❌ Error removing connection in separated context:', error);
      throw error;
    }
  }, []);

  const updateConnection = useCallback(async (flow: Flow, connectionId: string, updates: Partial<Connection>): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      const connectionIndex = flow.connections.findIndex((c: Connection) => c.id === connectionId);
      if (connectionIndex !== -1) {
        flow.connections[connectionIndex].updateProperties(updates);
      }
      return flow;
    }

    try {
      logger.debug('🎯 Updating connection using separated context:', { connectionId, updates });
      // Para actualizaciones, por ahora usamos el método tradicional
      const connectionIndex = flow.connections.findIndex((c: Connection) => c.id === connectionId);
      if (connectionIndex !== -1) {
        flow.connections[connectionIndex].updateProperties(updates);
      }
      logger.success('✅ Connection updated successfully in separated context');
      return flow;
    } catch (error) {
      logger.error('❌ Error updating connection in separated context:', error);
      throw error;
    }
  }, []);

  const actions = useMemo(() => ({
    addConnection,
    removeConnection,
    updateConnection
  }), [addConnection, removeConnection, updateConnection]);

  const contextValue: ConnectionOperationsContextType = {
    actions
  };

  return (
    <ConnectionOperationsContext.Provider value={contextValue}>
      {children}
    </ConnectionOperationsContext.Provider>
  );
};

export const useConnectionOperations = (): ConnectionOperationsContextType => {
  const context = useContext(ConnectionOperationsContext);
  if (!context) {
    throw new Error('useConnectionOperations must be used within ConnectionOperationsProvider');
  }
  return context;
};

/**
 * Hook de compatibilidad que decide qué sistema usar
 */
export const useCompatibleConnectionOperations = () => {
  const connectionContext = useContext(ConnectionOperationsContext);
  
  if (isFeatureEnabled('SEPARATED_CONTEXTS') && connectionContext) {
    return {
      source: 'separated' as const,
      ...connectionContext
    };
  }
  
  // Fallback: operaciones tradicionales
  return {
    source: 'unified' as const,
    actions: {
      addConnection: async (flow: Flow, sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => {
        const newConnection = new Connection({
          sourceNodeId,
          targetNodeId,
          sourceHandle: sourceHandle || 'output',
          targetHandle: targetHandle || 'input'
        });
        flow.addConnection(newConnection);
        return flow;
      },
      removeConnection: async (flow: Flow, connectionId: string) => {
        flow.removeConnection(connectionId);
        return flow;
      },
      updateConnection: async (flow: Flow, connectionId: string, updates: Partial<Connection>) => {
        const connectionIndex = flow.connections.findIndex((c: Connection) => c.id === connectionId);
        if (connectionIndex !== -1) {
          flow.connections[connectionIndex].updateProperties(updates);
        }
        return flow;
      }
    }
  };
};
