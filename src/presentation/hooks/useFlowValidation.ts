import { useMemo } from 'react';
import type { Node } from '../../domain/entities/Node';
import type { Connection } from '../../domain/entities/Connection';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useFlowValidation = (nodes: Node[], connections: Connection[]) => {
  const validation = useMemo((): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar que existe al menos un nodo START
    const startNodes = nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push('El flujo debe tener al menos un nodo START');
    } else if (startNodes.length > 1) {
      warnings.push('El flujo tiene múltiples nodos START, se recomienda usar solo uno');
    }

    // Verificar que existe al menos un nodo END
    const endNodes = nodes.filter(node => node.type === 'end');
    if (endNodes.length === 0) {
      errors.push('El flujo debe tener al menos un nodo END');
    }

    // Verificar que existe al menos un nodo STEP
    const stepNodes = nodes.filter(node => node.type === 'step');
    if (stepNodes.length === 0) {
      warnings.push('Se recomienda tener al menos un nodo STEP en el flujo');
    }

    // Verificar que todos los nodos (excepto START y END) tienen conexiones
    nodes.forEach(node => {
      if (node.type === 'start') {
        // Los nodos START deben tener al menos una conexión de salida
        const outgoingConnections = connections.filter(conn => conn.sourceNodeId === node.id);
        if (outgoingConnections.length === 0) {
          warnings.push(`El nodo START "${node.data?.label || node.id}" no tiene conexiones de salida`);
        }
      } else if (node.type === 'end') {
        // Los nodos END deben tener al menos una conexión de entrada
        const incomingConnections = connections.filter(conn => conn.targetNodeId === node.id);
        if (incomingConnections.length === 0) {
          warnings.push(`El nodo END "${node.data?.label || node.id}" no tiene conexiones de entrada`);
        }
      } else {
        // Los nodos STEP e IF deben tener tanto entrada como salida
        const incomingConnections = connections.filter(conn => conn.targetNodeId === node.id);
        const outgoingConnections = connections.filter(conn => conn.sourceNodeId === node.id);
        
        if (incomingConnections.length === 0) {
          warnings.push(`El nodo "${node.data?.label || node.id}" no tiene conexiones de entrada`);
        }
        if (outgoingConnections.length === 0) {
          warnings.push(`El nodo "${node.data?.label || node.id}" no tiene conexiones de salida`);
        }

        // Verificar nodos IF específicamente
        if (node.type === 'if') {
          if (outgoingConnections.length < 2) {
            warnings.push(`El nodo IF "${node.data?.label || node.id}" debería tener dos conexiones de salida (Sí/No)`);
          }
        }
      }
    });

    // Verificar nodos huérfanos (sin conexiones)
    const orphanNodes = nodes.filter(node => {
      const hasIncoming = connections.some(conn => conn.targetNodeId === node.id);
      const hasOutgoing = connections.some(conn => conn.sourceNodeId === node.id);
      return !hasIncoming && !hasOutgoing && node.type !== 'start';
    });

    orphanNodes.forEach(node => {
      warnings.push(`El nodo "${node.data?.label || node.id}" está aislado (sin conexiones)`);
    });

    // Verificar flujo básico: START -> ... -> END
    if (startNodes.length > 0 && endNodes.length > 0) {
      const hasPath = checkPathExists(startNodes[0], endNodes, connections, nodes);
      if (!hasPath) {
        errors.push('No existe un camino válido desde START hasta END');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [nodes, connections]);

  return validation;
};

// Función auxiliar para verificar si existe un camino entre nodos
function checkPathExists(
  startNode: Node,
  endNodes: Node[],
  connections: Connection[],
  allNodes: Node[]
): boolean {
  const visited = new Set<string>();
  const queue = [startNode.id];

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    // Verificar si llegamos a un nodo END
    if (endNodes.some(endNode => endNode.id === currentNodeId)) {
      return true;
    }

    // Agregar nodos conectados a la cola
    const outgoingConnections = connections.filter(conn => conn.sourceNodeId === currentNodeId);
    outgoingConnections.forEach(conn => {
      if (!visited.has(conn.targetNodeId)) {
        queue.push(conn.targetNodeId);
      }
    });
  }

  return false;
}
