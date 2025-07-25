/**
 * Sistema de actualizaciones inmutables usando Immer
 * Permite transición gradual sin romper funcionalidad existente
 */

import { Draft } from 'immer';
import { Flow } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import { Connection } from '../../domain/entities/Connection';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from './logger';

// Lazy loading de Immer para evitar bundle size cuando no se use
let produce: any = null;

const loadImmer = async () => {
  if (!produce) {
    const immerModule = await import('immer');
    produce = immerModule.produce;
  }
  return produce;
};

/**
 * Wrapper para actualizaciones inmutables que funciona con y sin Immer
 */
export const updateFlowImmutable = async <T>(
  currentState: T, 
  updater: (draft: Draft<T>) => void
): Promise<T> => {
  if (isFeatureEnabled('IMMUTABLE_STATE')) {
    try {
      const immerProduce = await loadImmer();
      const result = immerProduce(currentState, updater);
      logger.debug('🔄 Used Immer for immutable update');
      return result;
    } catch (error) {
      logger.error('❌ Immer update failed, falling back to manual update:', error);
      // Fallback manual - crear una copia y aplicar cambios manualmente
      const clonedState = JSON.parse(JSON.stringify(currentState)) as T;
      try {
        updater(clonedState as Draft<T>);
        return clonedState;
      } catch (fallbackError) {
        logger.error('❌ Manual fallback also failed:', fallbackError);
        return { ...currentState };
      }
    }
  } else {
    // Fallback tradicional - crear una copia profunda y aplicar cambios
    logger.debug('🔄 Using traditional deep copy update');
    const clonedState = JSON.parse(JSON.stringify(currentState)) as T;
    try {
      updater(clonedState as Draft<T>);
      return clonedState;
    } catch (error) {
      logger.error('❌ Traditional update failed:', error);
      return { ...currentState };
    }
  }
};

/**
 * Actualizar nodo de manera inmutable
 */
export const updateNodeImmutable = async (
  flow: Flow,
  nodeId: string,
  updates: Partial<Node>
): Promise<Flow> => {
  console.log('🔧 updateNodeImmutable called:', { nodeId, updates });
  
  if (isFeatureEnabled('IMMUTABLE_STATE')) {
    return updateFlowImmutable(flow, (draft) => {
      const node = draft.nodes.find(n => n.id === nodeId);
      if (node) {
        console.log('🔧 Found node to update:', node);
        Object.assign(node, updates);
        console.log('🔧 Node after update:', node);
      }
      draft.updatedAt = new Date();
    });
  } else {
    console.log('🔧 Using traditional method');
    // Método tradicional actual - crear nueva instancia de Flow
    const updatedNodes = flow.nodes.map(node => {
      if (node.id === nodeId) {
        console.log('🔧 Original node:', node);
        console.log('🔧 Updates to apply:', updates);
        const updatedNode = new Node({ ...node, ...updates });
        console.log('🔧 Updated node:', updatedNode);
        return updatedNode;
      }
      return node;
    });
    
    // Crear nueva instancia de Flow con los nodos actualizados
    const updatedFlow = new Flow({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      nodes: updatedNodes,
      connections: flow.connections,
      status: flow.status,
      owner: flow.owner,
      creator: flow.creator
    });
    
    updatedFlow.updatedAt = new Date();
    console.log('🔧 Final updated flow:', updatedFlow);
    return updatedFlow;
  }
};

/**
 * Agregar nodo de manera inmutable
 */
export const addNodeImmutable = async (
  flow: Flow,
  newNode: Node
): Promise<Flow> => {
  if (isFeatureEnabled('IMMUTABLE_STATE')) {
    return updateFlowImmutable(flow, (draft) => {
      draft.nodes.push(newNode);
      draft.updatedAt = new Date();
    });
  } else {
    const updatedFlow = new Flow({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      nodes: [...flow.nodes, newNode],
      connections: flow.connections,
      status: flow.status,
      owner: flow.owner,
      creator: flow.creator
    });
    
    updatedFlow.updatedAt = new Date();
    return updatedFlow;
  }
};

/**
 * Remover nodo de manera inmutable
 */
export const removeNodeImmutable = async (
  flow: Flow,
  nodeId: string
): Promise<Flow> => {
  logger.debug('🔄 removeNodeImmutable: Starting removal for node:', nodeId);
  logger.debug('📋 Current nodes count:', flow.nodes.length);
  logger.debug('🔗 Current connections count:', flow.connections.length);
  
  if (isFeatureEnabled('IMMUTABLE_STATE')) {
    logger.debug('🔄 Using Immer for node removal');
    const result = await updateFlowImmutable(flow, (draft) => {
      const initialNodesCount = draft.nodes.length;
      const initialConnectionsCount = draft.connections.length;
      
      draft.nodes = draft.nodes.filter(node => node.id !== nodeId);
      draft.connections = draft.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      );
      
      const finalNodesCount = draft.nodes.length;
      const finalConnectionsCount = draft.connections.length;
      
      logger.debug('📊 Nodes removed:', initialNodesCount - finalNodesCount);
      logger.debug('📊 Connections removed:', initialConnectionsCount - finalConnectionsCount);
      
      draft.updatedAt = new Date();
    });
    
    logger.debug('✅ Immer removal completed');
    return result;
  } else {
    logger.debug('🔄 Using traditional method for node removal');
    
    const filteredNodes = flow.nodes.filter(node => node.id !== nodeId);
    const filteredConnections = flow.connections.filter(
      conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
    );
    
    logger.debug('📊 Nodes before filter:', flow.nodes.length, 'after filter:', filteredNodes.length);
    logger.debug('📊 Connections before filter:', flow.connections.length, 'after filter:', filteredConnections.length);
    
    const updatedFlow = new Flow({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      nodes: filteredNodes,
      connections: filteredConnections,
      status: flow.status,
      owner: flow.owner,
      creator: flow.creator
    });
    
    updatedFlow.updatedAt = new Date();
    logger.debug('✅ Traditional removal completed');
    return updatedFlow;
  }
};

/**
 * Agregar conexión de manera inmutable
 */
export const addConnectionImmutable = async (
  flow: Flow,
  connection: Connection
): Promise<Flow> => {
  try {
    logger.debug('🔄 addConnectionImmutable called with:', { 
      flowId: flow.id, 
      connectionId: connection.id,
      immutableFeatureEnabled: isFeatureEnabled('IMMUTABLE_STATE')
    });
    
    if (isFeatureEnabled('IMMUTABLE_STATE')) {
      return updateFlowImmutable(flow, (draft) => {
        draft.connections.push(connection);
        draft.updatedAt = new Date();
      });
    } else {
      // Método más simple y seguro - usar el método existente de la entidad
      logger.debug('🔄 Using existing Flow entity method for adding connection');
      const clonedFlow = flow.clone();
      clonedFlow.addConnection(connection);
      logger.debug('✅ Connection added via Flow.addConnection method');
      return clonedFlow;
    }
  } catch (error) {
    logger.error('❌ Error in addConnectionImmutable:', error);
    logger.error('❌ Flow details:', { id: flow.id, connectionsCount: flow.connections.length });
    logger.error('❌ Connection details:', { id: connection.id, sourceNodeId: connection.sourceNodeId, targetNodeId: connection.targetNodeId });
    throw error;
  }
};

/**
 * Remover conexión de manera inmutable
 */
export const removeConnectionImmutable = async (
  flow: Flow,
  connectionId: string
): Promise<Flow> => {
  if (isFeatureEnabled('IMMUTABLE_STATE')) {
    return updateFlowImmutable(flow, (draft) => {
      draft.connections = draft.connections.filter(conn => conn.id !== connectionId);
      draft.updatedAt = new Date();
    });
  } else {
    const updatedFlow = new Flow({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      nodes: flow.nodes,
      connections: flow.connections.filter(conn => conn.id !== connectionId),
      status: flow.status,
      owner: flow.owner,
      creator: flow.creator
    });
    
    updatedFlow.updatedAt = new Date();
    return updatedFlow;
  }
};
