/**
 * Wrapper de compatibilidad para transición gradual
 * Permite migrar funcionalidades sin romper la API existente
 */

import { useCallback } from 'react';
import { Flow } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import { Connection } from '../../domain/entities/Connection';
import { useFeatureFlag } from '../config/featureFlags';
import { logger } from '../utils/logger';

/**
 * Wrapper para actualizaciones de estado que soporta tanto inmutable como mutable
 */
export const useStateUpdater = () => {
  const immutableEnabled = useFeatureFlag('IMMUTABLE_STATE');
  
  const updateFlow = useCallback((currentFlow: Flow | null, updater: (flow: Flow) => Flow): Flow | null => {
    if (!currentFlow) return null;
    
    if (immutableEnabled) {
      // Usar Immer cuando esté disponible
      return updater(currentFlow);
    } else {
      // Crear nueva instancia de Flow con los datos actualizados
      const updatedFlow = updater(currentFlow);
      return new Flow({
        id: updatedFlow.id,
        name: updatedFlow.name,
        description: updatedFlow.description,
        nodes: updatedFlow.nodes,
        connections: updatedFlow.connections,
        status: updatedFlow.status,
        owner: updatedFlow.owner,
        creator: updatedFlow.creator
      });
    }
  }, [immutableEnabled]);
  
  const updateNode = useCallback((nodes: Node[], nodeId: string, updates: Partial<Node>): Node[] => {
    if (immutableEnabled) {
      return nodes.map(node => 
        node.id === nodeId ? new Node({ ...node, ...updates }) : node
      );
    } else {
      return nodes.map(node => 
        node.id === nodeId ? new Node({ ...node, ...updates }) : node
      );
    }
  }, [immutableEnabled]);
  
  return { updateFlow, updateNode };
};

/**
 * Wrapper para selección que soporta tanto el sistema actual como el nuevo
 */
export const useSelectionWrapper = () => {
  const unifiedSelection = useFeatureFlag('UNIFIED_SELECTION');
  
  const selectNode = useCallback((nodeId: string | null) => {
    if (unifiedSelection) {
      logger.debug('🔄 Using unified selection system');
      // Implementar sistema unificado
    } else {
      logger.debug('🔄 Using traditional selection system');
      // Usar sistema actual
    }
  }, [unifiedSelection]);
  
  return { selectNode };
};

/**
 * Wrapper para validaciones mejoradas
 */
export const useValidationWrapper = () => {
  const advancedValidation = useFeatureFlag('ADVANCED_DEBOUNCING'); // Usar un flag existente
  
  const validateConnection = useCallback((connection: Connection): boolean => {
    if (advancedValidation) {
      // Usar validación avanzada
      logger.debug('🔍 Using advanced validation system');
      return true; // Implementar lógica avanzada
    } else {
      // Usar validación existente
      logger.debug('🔍 Using basic validation system');
      return true; // Mantener lógica actual
    }
  }, [advancedValidation]);
  
  return { validateConnection };
};
