import type { Node } from '../../domain/entities/Node';
import type { Connection } from '../../domain/entities/Connection';
import type { Edge } from 'reactflow';
import { getNodeHandlers, isValidHandle } from '../../shared/constants/nodeHandlers';
import { useNotificationHelpers } from './useNotificationHelpers';

// Tipo para los parámetros de conexión de ReactFlow
interface ConnectParams {
  source?: string;
  sourceHandle?: string;
  target?: string;
  targetHandle?: string;
}

/**
 * Resultado de una validación de conexión
 */
interface ConnectionValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Hook para validar las reglas de conexión entre nodos
 * Implementa las reglas definidas en flow-connection-rules.md
 */
export const useConnectionValidation = () => {
  const { showConnectionError, showConnectionSuccess } = useNotificationHelpers();
  
  /**
   * Obtiene el ID del nodo origen de una conexión
   */
  const getSourceId = (connection: Connection | Edge | ConnectParams): string => {
    // Intentar acceder a la propiedad sourceNodeId primero (Connection del dominio)
    const sourceId = (connection as Connection).sourceNodeId || 
                    // Luego intentar con source (Edge de ReactFlow)
                    (connection as Edge).source ||
                    // Finalmente, intentar con params de ReactFlow
                    (connection as ConnectParams).source || '';
    return sourceId;
  };
  
  /**
   * Obtiene el ID del nodo destino de una conexión
   */
  const getTargetId = (connection: Connection | Edge | ConnectParams): string => {
    // Intentar acceder a la propiedad targetNodeId primero (Connection del dominio)
    const targetId = (connection as Connection).targetNodeId || 
                    // Luego intentar con target (Edge de ReactFlow)
                    (connection as Edge).target ||
                    // Finalmente, intentar con params de ReactFlow
                    (connection as ConnectParams).target || '';
    return targetId;
  };

  /**
   * Determina si una conexión es válida basada en reglas de negocio
   * Implementa las reglas definidas en flow-connection-rules.md
   */
  const isConnectionValid = (
    connection: Connection | Edge | ConnectParams,
    nodes: Node[],
    edges: Connection[]
  ): ConnectionValidationResult => {
    console.log('==================== VALIDATE CONNECTION ====================');
    console.log('Validating connection:', connection);
    
    // Obtener IDs de origen y destino de manera consistente
    const sourceId = getSourceId(connection);
    const targetId = getTargetId(connection);
    
    console.log(`Origen: ${sourceId}, Destino: ${targetId}`);
    
    // Validación básica
    if (!sourceId || !targetId) {
      console.error('❌ CRITICAL: IDs de nodos faltantes');
      return { valid: false, message: "Faltan datos de origen o destino" };
    }
    
    // Buscar nodos
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    console.log(`Nodos encontrados: origen=${!!sourceNode} (${sourceNode?.type}), destino=${!!targetNode} (${targetNode?.type})`);
    
    if (!sourceNode || !targetNode) {
      console.error(`❌ Nodos no encontrados`);
      return { valid: false, message: "Nodo de origen o destino no encontrado" };
    }
    
    // REGLA 1: No permitir conexiones circulares (al mismo nodo)
    if (sourceId === targetId) {
      console.error('❌ Conexión circular detectada');
      const message = "No se permiten conexiones a sí mismo";
      showConnectionError(message);
      return { valid: false, message };
    }
    
    // REGLA 2: Los nodos END no pueden tener conexiones salientes
    if (sourceNode.type === 'end') {
      console.error('❌ Los nodos END no pueden tener salidas');
      const message = "Los nodos de fin no pueden tener conexiones salientes";
      showConnectionError(message);
      return { valid: false, message };
    }
    
    // REGLA 3: Los nodos START no pueden tener conexiones entrantes
    if (targetNode.type === 'start') {
      console.error('❌ Los nodos START no pueden tener entradas');
      const message = "No se puede conectar a un nodo de inicio";
      showConnectionError(message);
      return { valid: false, message };
    }
    
    // REGLA 4: Verificar compatibilidad de tipos de nodos
    if (!areTypesCompatible(sourceNode.type, targetNode.type)) {
      console.error('❌ Tipos de nodos incompatibles');
      const message = `Los nodos ${sourceNode.type} no pueden conectarse a nodos ${targetNode.type}`;
      showConnectionError(message);
      return { valid: false, message };
    }
    
    // Extraer identificadores de manejo de conexión
    const sourceHandle = (connection as Edge).sourceHandle || (connection as ConnectParams).sourceHandle;
    const targetHandle = (connection as Edge).targetHandle || (connection as ConnectParams).targetHandle;
    
    console.log(`Handles: origen=${sourceHandle}, destino=${targetHandle}`);
    
    // Log específico para handler "false"
    if (sourceHandle === 'false') {
      console.log('🔍 HANDLER FALSE DETECTED in validation:', { source: sourceId, sourceHandle, target: targetId, targetHandle });
    }
    
    // REGLA 5: Validar que los handles sean válidos para los tipos de nodo
    if (sourceHandle && !isValidHandle(sourceNode.type, sourceHandle, 'source')) {
      console.error(`❌ Handle de origen inválido: ${sourceHandle} para nodo ${sourceNode.type}`);
      return { valid: false, message: `Handle de salida "${sourceHandle}" no es válido para nodos ${sourceNode.type}` };
    }
    
    if (targetHandle && !isValidHandle(targetNode.type, targetHandle, 'target')) {
      console.error(`❌ Handle de destino inválido: ${targetHandle} para nodo ${targetNode.type}`);
      return { valid: false, message: `Handle de entrada "${targetHandle}" no es válido para nodos ${targetNode.type}` };
    }
    
    // REGLA 6: Verificar límites de conexiones salientes según tipo de nodo y handler
    const sourceHandlers = getNodeHandlers(sourceNode.type);
    const sourceHandlerId = sourceHandle || sourceHandlers.outputs[0]?.id; // Usar primer handler si no se especifica
    
    if (sourceNode.type === 'if') {
      // Nodos IF: verificar que el handle sea 'true' o 'false'
      if (!sourceHandlerId || !['true', 'false'].includes(sourceHandlerId)) {
        console.error('❌ Handle de IF inválido');
        const message = "Los nodos IF solo pueden usar handles 'true' o 'false'";
        showConnectionError(message);
        return { valid: false, message };
      }
    }
    
    // Verificar si ya existe una conexión desde este handle específico
    const existingOutputs = edges.filter(e => 
      getSourceId(e) === sourceId && 
      (e.sourceHandle || 'default') === (sourceHandlerId || 'default')
    );
    
    console.log(`Salidas existentes desde ${sourceId} handle "${sourceHandlerId}": ${existingOutputs.length}`);
    
    if (existingOutputs.length > 0) {
      console.error('❌ El handle ya tiene una conexión');
      const message = "Este punto de salida ya tiene una conexión";
      showConnectionError(message);
      return { valid: false, message };
    }
    
    // REGLA 7: Verificar límites de conexiones entrantes
    const targetHandlers = getNodeHandlers(targetNode.type);
    const targetHandlerId = targetHandle || targetHandlers.inputs[0]?.id; // Usar primer handler si no se especifica
    
    // Solo los nodos END pueden tener múltiples conexiones entrantes
    if (targetNode.type !== 'end') {
      // Para otros nodos (START, STEP, IF), solo permitir una conexión entrante por handle
      const existingInputs = edges.filter(e => 
        getTargetId(e) === targetId && 
        (e.targetHandle || 'default') === (targetHandlerId || 'default')
      );
      
      console.log(`Entradas existentes hacia ${targetId} handle "${targetHandlerId}": ${existingInputs.length}`);
      
      if (existingInputs.length > 0) {
        console.error('❌ El nodo ya tiene una entrada');
        const message = "Este nodo ya tiene una conexión entrante";
        showConnectionError(message);
        return { valid: false, message };
      }
    } else {
      // Nodos END pueden tener múltiples conexiones entrantes pero con restricciones
      console.log(`✅ Nodo END puede recibir múltiples conexiones con restricciones`);
      
      // REGLA 8: Un nodo IF no puede conectar ambos handlers (true y false) al mismo nodo END
      if (sourceNode.type === 'if') {
        // Identificar el handler que está intentando conectar
        const currentHandleId = sourceHandle || 'default';
        
        // Buscar si ya existe una conexión desde otro handler del mismo nodo IF hacia este END
        const existingIfConnections = edges.filter(e => 
          getSourceId(e) === sourceId && // Mismo nodo IF origen
          getTargetId(e) === targetId && // Mismo nodo END destino
          (e.sourceHandle || 'default') !== currentHandleId // Diferente handler
        );
        
        if (existingIfConnections.length > 0) {
          console.error('❌ El nodo IF ya tiene una conexión hacia este nodo END desde otro handler');
          const message = "Un nodo IF no puede conectar ambos handlers (Sí/No) al mismo nodo END";
          showConnectionError(message);
          return { valid: false, message };
        }
      }
    }
    
    // Si llegamos aquí, la conexión es válida
    console.log('✅ Conexión válida');
    showConnectionSuccess();
    return { valid: true };
  };

  /**
   * Verifica si dos tipos de nodos son compatibles para conectarse
   */
  const areTypesCompatible = (sourceType: string, targetType: string): boolean => {
    // Matriz de compatibilidad basada en las reglas de flow-connection-rules.md
    const compatibilityMatrix: Record<string, string[]> = {
      'start': ['step', 'if', 'end'], // START puede conectarse a STEP, IF o END
      'step': ['step', 'if', 'end'],  // STEP puede conectarse a STEP, IF o END
      'if': ['step', 'if', 'end'],    // IF puede conectarse a STEP, IF o END
      'end': []                       // END no puede conectarse a nada (no tiene salidas)
    };
    
    return compatibilityMatrix[sourceType]?.includes(targetType) || false;
  };

  /**
   * Determina si un punto de conexión es válido para ser origen o destino de una conexión.
   * Usa los handlers predefinidos para validación
   */
  const isValidConnectionPoint = (
    nodeId: string,
    handleId: string | null,
    handleType: 'source' | 'target',
    nodes: Node[],
    edges: Connection[]
  ): boolean => {
    console.log(`🔍 Validando punto de conexión: ${nodeId} (${handleType}) handle=${handleId}`);
    
    // Buscar el nodo
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error(`CRITICAL: Node ${nodeId} not found in model!`);
      return false;
    }
    
    // Obtener handlers disponibles para este tipo de nodo
    const nodeHandlers = getNodeHandlers(node.type);
    const availableHandlers = handleType === 'source' ? nodeHandlers.outputs : nodeHandlers.inputs;
    
    console.log(`Handlers disponibles para ${node.type} (${handleType}):`, availableHandlers.map(h => h.id));
    
    // Si no se especifica handle, usar el primero disponible
    const actualHandleId = handleId || availableHandlers[0]?.id;
    
    // Verificar que el handle sea válido para este tipo de nodo
    if (!actualHandleId || !availableHandlers.some(h => h.id === actualHandleId)) {
      console.log(`❌ Handle "${actualHandleId}" no es válido para nodo ${node.type} (${handleType})`);
      return false;
    }
    
    // Reglas invariantes por tipo de nodo
    if (handleType === 'source') {
      // Regla: Los nodos END nunca pueden tener salidas
      if (node.type === 'end') {
        console.log(`❌ Nodo END ${nodeId} no puede ser origen`);
        return false;
      }
      
      // Verificar límites de salida: cada handle solo puede tener una conexión
      const existingConnections = edges.filter(e => 
        getSourceId(e) === nodeId && 
        (e.sourceHandle || nodeHandlers.outputs[0]?.id) === actualHandleId
      );
      
      if (existingConnections.length > 0) {
        console.log(`❌ Handle "${actualHandleId}" del nodo ${node.type} ya tiene conexión`);
        return false;
      }
      
    } else if (handleType === 'target') {
      // Regla: Los nodos START nunca pueden tener entradas
      if (node.type === 'start') {
        console.log(`❌ Nodo START ${nodeId} no puede ser destino`);
        return false;
      }
      
      // Verificar límites de entrada según tipo de nodo
      if (node.type === 'end') {
        // Nodos END pueden tener múltiples entradas - siempre válido
        console.log(`✅ Nodo END puede recibir múltiples entradas`);
        return true;
      } else {
        // Nodos STEP e IF: solo una entrada por handle
        const existingConnections = edges.filter(e => 
          getTargetId(e) === nodeId && 
          (e.targetHandle || nodeHandlers.inputs[0]?.id) === actualHandleId
        );
        
        if (existingConnections.length > 0) {
          console.log(`❌ Handle "${actualHandleId}" del nodo ${node.type} ya tiene entrada`);
          return false;
        }
      }
    }

    console.log(`✅ Punto de conexión válido`);
    return true;
  };

  /**
   * Obtiene un mensaje de ayuda para el usuario sobre por qué una conexión no es válida
   */
  const getConnectionHelpMessage = (
    sourceNodeType: string,
    targetNodeType: string,
    handleType: 'source' | 'target'
  ): string => {
    if (handleType === 'source') {
      switch (sourceNodeType) {
        case 'start':
          return 'Los nodos START pueden conectarse a STEP, IF o END';
        case 'step':
          return 'Los nodos STEP pueden conectarse a STEP, IF o END';
        case 'if':
          return 'Los nodos IF tienen dos salidas: "true" y "false"';
        case 'end':
          return 'Los nodos END no pueden tener conexiones salientes';
        default:
          return 'Tipo de nodo no reconocido';
      }
    } else {
      switch (targetNodeType) {
        case 'start':
          return 'Los nodos START no pueden recibir conexiones entrantes';
        case 'step':
        case 'if':
          return 'Este nodo solo puede recibir una conexión entrante';
        case 'end':
          return 'Los nodos END pueden recibir múltiples conexiones entrantes';
        default:
          return 'Tipo de nodo no reconocido';
      }
    }
  };

  /**
   * Valida que no haya más de un nodo START y un nodo END en el flujo
   */
  const validateUniqueNodes = (nodes: Node[], newNodeType?: string): { valid: boolean; message?: string } => {
    const startNodes = nodes.filter(node => node.type === 'start');
    const endNodes = nodes.filter(node => node.type === 'end');
    
    // Si estamos agregando un nuevo nodo, simulamos su adición
    if (newNodeType) {
      if (newNodeType === 'start') {
        if (startNodes.length >= 1) {
          const message = "Solo puede haber un nodo START en el flujo";
          showConnectionError(message);
          return { valid: false, message };
        }
      } else if (newNodeType === 'end') {
        if (endNodes.length >= 1) {
          const message = "Solo puede haber un nodo END en el flujo";
          showConnectionError(message);
          return { valid: false, message };
        }
      }
    } else {
      // Validación del estado actual
      if (startNodes.length > 1) {
        const message = `Se encontraron ${startNodes.length} nodos START. Solo puede haber uno`;
        showConnectionError(message);
        return { valid: false, message };
      }
      
      if (endNodes.length > 1) {
        const message = `Se encontraron ${endNodes.length} nodos END. Solo puede haber uno`;
        showConnectionError(message);
        return { valid: false, message };
      }
    }
    
    return { valid: true };
  };

  return {
    isConnectionValid,
    isValidConnectionPoint,
    getConnectionHelpMessage,
    validateUniqueNodes,
    areTypesCompatible
  };
};
