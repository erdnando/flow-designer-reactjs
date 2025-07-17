/**
 * Contexto separado para operaciones de nodos
 * Fase 5: Separación de contextos para mejor rendimiento
 */

import React, { createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { Node } from '../../domain/entities/Node';
import { Flow } from '../../domain/entities/Flow';
import type { NodeType } from '../../shared/types';
import { 
  updateNodeImmutable, 
  addNodeImmutable, 
  removeNodeImmutable 
} from '../utils/immutableUpdates';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from '../utils/logger';

interface NodeOperationsContextType {
  actions: {
    addNode: (flow: Flow, type: string, position: { x: number; y: number }) => Promise<Flow>;
    updateNode: (flow: Flow, nodeId: string, updates: Partial<Node>) => Promise<Flow>;
    removeNode: (flow: Flow, nodeId: string) => Promise<Flow>;
    moveNode: (flow: Flow, nodeId: string, position: { x: number; y: number }) => Promise<Flow>;
  };
}

const NodeOperationsContext = createContext<NodeOperationsContextType | null>(null);

export const NodeOperationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const addNode = useCallback(async (flow: Flow, type: string, position: { x: number; y: number }): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      const newNode = new Node({
        type: type as NodeType,
        position
      });
      flow.addNode(newNode);
      return flow;
    }

    try {
      logger.debug('🎯 Adding node using separated context:', { type, position });
      const newNode = new Node({
        type: type as NodeType,
        position
      });
      const updatedFlow = await addNodeImmutable(flow, newNode);
      logger.success('✅ Node added successfully in separated context');
      return updatedFlow;
    } catch (error) {
      logger.error('❌ Error adding node in separated context:', error);
      throw error;
    }
  }, []);

  const updateNode = useCallback(async (flow: Flow, nodeId: string, updates: Partial<Node>): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      const nodeIndex = flow.nodes.findIndex((n: Node) => n.id === nodeId);
      if (nodeIndex !== -1) {
        flow.nodes[nodeIndex].updateProperties(updates);
      }
      return flow;
    }

    try {
      logger.debug('🎯 Updating node using separated context:', { nodeId, updates });
      const updatedFlow = await updateNodeImmutable(flow, nodeId, updates);
      logger.success('✅ Node updated successfully in separated context');
      return updatedFlow;
    } catch (error) {
      logger.error('❌ Error updating node in separated context:', error);
      throw error;
    }
  }, []);

  const removeNode = useCallback(async (flow: Flow, nodeId: string): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      flow.removeNode(nodeId);
      return flow;
    }

    try {
      logger.debug('🎯 Removing node using separated context:', nodeId);
      const updatedFlow = await removeNodeImmutable(flow, nodeId);
      logger.success('✅ Node removed successfully in separated context');
      return updatedFlow;
    } catch (error) {
      logger.error('❌ Error removing node in separated context:', error);
      throw error;
    }
  }, []);

  const moveNode = useCallback(async (flow: Flow, nodeId: string, position: { x: number; y: number }): Promise<Flow> => {
    if (!isFeatureEnabled('SEPARATED_CONTEXTS')) {
      logger.debug('🔄 Separated contexts feature disabled, using traditional method');
      // Fallback tradicional
      const node = flow.nodes.find((n: Node) => n.id === nodeId);
      if (node) {
        node.position = position;
      }
      return flow;
    }

    try {
      logger.debug('🎯 Moving node using separated context:', { nodeId, position });
      const updatedFlow = await updateNodeImmutable(flow, nodeId, { position });
      logger.success('✅ Node moved successfully in separated context');
      return updatedFlow;
    } catch (error) {
      logger.error('❌ Error moving node in separated context:', error);
      throw error;
    }
  }, []);

  const actions = useMemo(() => ({
    addNode,
    updateNode,
    removeNode,
    moveNode
  }), [addNode, updateNode, removeNode, moveNode]);

  const contextValue: NodeOperationsContextType = {
    actions
  };

  return (
    <NodeOperationsContext.Provider value={contextValue}>
      {children}
    </NodeOperationsContext.Provider>
  );
};

export const useNodeOperations = (): NodeOperationsContextType => {
  const context = useContext(NodeOperationsContext);
  if (!context) {
    throw new Error('useNodeOperations must be used within NodeOperationsProvider');
  }
  return context;
};

/**
 * Hook de compatibilidad que decide qué sistema usar
 */
export const useCompatibleNodeOperations = () => {
  const nodeContext = useContext(NodeOperationsContext);
  
  if (isFeatureEnabled('SEPARATED_CONTEXTS') && nodeContext) {
    return {
      source: 'separated' as const,
      ...nodeContext
    };
  }
  
  // Fallback: operaciones tradicionales
  return {
    source: 'unified' as const,
    actions: {
      addNode: async (flow: Flow, type: string, position: { x: number; y: number }) => {
        const newNode = new Node({
          type: type as NodeType,
          position
        });
        flow.addNode(newNode);
        return flow;
      },
      updateNode: async (flow: Flow, nodeId: string, updates: Partial<Node>) => {
        const nodeIndex = flow.nodes.findIndex((n: Node) => n.id === nodeId);
        if (nodeIndex !== -1) {
          flow.nodes[nodeIndex].updateProperties(updates);
        }
        return flow;
      },
      removeNode: async (flow: Flow, nodeId: string) => {
        flow.removeNode(nodeId);
        return flow;
      },
      moveNode: async (flow: Flow, nodeId: string, position: { x: number; y: number }) => {
        const node = flow.nodes.find((n: Node) => n.id === nodeId);
        if (node) {
          node.position = position;
        }
        return flow;
      }
    }
  };
};
