import { useCallback } from 'react';
import { NODE_TYPES } from '../../../shared/constants';
import { migrationLog } from '../../../shared/config/migrationFlags';
import { logger } from '../../../shared/utils';
import type { NodeType } from '../../../shared/types';

export interface FlowUtilitiesOptions {
  currentFlow?: any;
  selectedNodeId?: string | null;
  positionPersistence: any;
  isConnectionValid: (connection: any, nodes: any[], connections: any[]) => { valid: boolean; message?: string };
  showConnectionError: (message: string) => void;
  getConnectionHelpMessage: (sourceNodeType: string, targetNodeType: string, handleType: 'source' | 'target') => string;
}

export interface FlowUtilitiesReturn {
  getSelectedNode: () => any;
  getNodeTypeConfig: (nodeType: NodeType) => any;
  getPersistenceStats: () => any;
  clearPersistedPositions: () => void;
  isValidConnection: (connection: any) => boolean;
  getConnectionHelp: (sourceNodeType: string, targetNodeType: string, handleType: 'source' | 'target') => string;
}

/**
 * Hook para utilidades y helpers del flow designer
 * Agrupa funciones de utilidad que no requieren estado complejo
 */
export const useFlowUtilities = (options: FlowUtilitiesOptions): FlowUtilitiesReturn => {
  const {
    currentFlow,
    selectedNodeId,
    positionPersistence,
    isConnectionValid,
    showConnectionError,
    getConnectionHelpMessage
  } = options;

  const getSelectedNode = useCallback(() => {
    if (!currentFlow || !selectedNodeId) {
      migrationLog('UTILITIES', 'No selected node - no flow or selectedNodeId', { hasFlow: !!currentFlow, selectedNodeId });
      return null;
    }
    
    const selectedNode = currentFlow.nodes.find((node: any) => node.id === selectedNodeId) || null;
    migrationLog('UTILITIES', 'Getting selected node', { selectedNodeId, found: !!selectedNode });
    return selectedNode;
  }, [currentFlow, selectedNodeId]);

  const getNodeTypeConfig = useCallback((nodeType: NodeType) => {
    const config = NODE_TYPES[nodeType];
    migrationLog('UTILITIES', 'Getting node type config', { nodeType, hasConfig: !!config });
    return config;
  }, []);

  const getPersistenceStats = useCallback(() => {
    const stats = positionPersistence.getStats();
    migrationLog('UTILITIES', 'Getting persistence stats', stats);
    return stats;
  }, [positionPersistence]);

  const clearPersistedPositions = useCallback(() => {
    if (currentFlow) {
      positionPersistence.clearFlowPositions(currentFlow.id);
      logger.info('Cleared persisted positions for current flow');
      migrationLog('UTILITIES', 'Cleared persisted positions', { flowId: currentFlow.id });
    } else {
      migrationLog('UTILITIES', 'Cannot clear positions - no current flow');
    }
  }, [positionPersistence, currentFlow]);

  // Función para validar conexiones en tiempo real (durante el arrastre)
  const isValidConnection = useCallback((connection: any) => {
    logger.debug('🔍 Validando conexión durante arrastre:', connection);
    migrationLog('UTILITIES', 'Validating connection', connection);
    
    if (!connection.source || !connection.target) {
      logger.debug('❌ Conexión inválida: falta source o target');
      migrationLog('UTILITIES', 'Invalid connection - missing source or target', connection);
      return false;
    }
    
    // Usar el sistema de validación
    if (currentFlow) {
      const validationResult = isConnectionValid(
        connection,
        currentFlow.nodes,
        currentFlow.connections
      );
      
      if (!validationResult.valid) {
        logger.debug('❌ Conexión inválida durante arrastre:', validationResult.message);
        migrationLog('UTILITIES', 'Connection validation failed', { connection, reason: validationResult.message });
        
        // Mostrar notificación de error al usuario
        showConnectionError(validationResult.message || 'Conexión no válida');
        return false;
      }
      
      logger.debug('✅ isValidConnection: retornando true');
      migrationLog('UTILITIES', 'Connection validation passed', connection);
      return true;
    }
    
    logger.debug('❌ isValidConnection: no hay currentFlow');
    migrationLog('UTILITIES', 'Connection validation failed - no current flow');
    return false;
  }, [currentFlow, isConnectionValid, showConnectionError]);

  // Función para obtener ayuda sobre conexiones
  const getConnectionHelp = useCallback((sourceNodeType: string, targetNodeType: string, handleType: 'source' | 'target') => {
    const helpMessage = getConnectionHelpMessage(sourceNodeType, targetNodeType, handleType);
    migrationLog('UTILITIES', 'Getting connection help', { sourceNodeType, targetNodeType, handleType, helpMessage });
    return helpMessage;
  }, [getConnectionHelpMessage]);

  return {
    getSelectedNode,
    getNodeTypeConfig,
    getPersistenceStats,
    clearPersistedPositions,
    isValidConnection,
    getConnectionHelp
  };
};
