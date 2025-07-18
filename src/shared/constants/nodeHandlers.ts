// Configuración de handlers para cada tipo de nodo
export interface NodeHandlerConfig {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'bottom' | 'left' | 'right';
  label?: string;
  style?: React.CSSProperties;
}

export interface NodeTypeHandlers {
  inputs: NodeHandlerConfig[];
  outputs: NodeHandlerConfig[];
}

// Configuración de handlers por tipo de nodo
export const NODE_HANDLERS: Record<string, NodeTypeHandlers> = {
  start: {
    inputs: [], // Los nodos START no tienen entradas
    outputs: [
      {
        id: 'start-output',
        type: 'source',
        position: 'right',
        label: 'Salida',
        style: {
          background: '#4CAF50',
          border: '2px solid #2E7D32',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      }
    ]
  },
  
  step: {
    inputs: [
      {
        id: 'step-input',
        type: 'target',
        position: 'left',
        label: 'Entrada',
        style: {
          background: '#2196F3',
          border: '2px solid #1565C0',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      }
    ],
    outputs: [
      {
        id: 'step-output',
        type: 'source',
        position: 'right',
        label: 'Salida',
        style: {
          background: '#4CAF50',
          border: '2px solid #2E7D32',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      }
    ]
  },
  
  if: {
    inputs: [
      {
        id: 'if-input',
        type: 'target',
        position: 'left',
        label: 'Entrada',
        style: {
          background: '#2196F3',
          border: '2px solid #1565C0',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      }
    ],
    outputs: [
      {
        id: 'true',
        type: 'source',
        position: 'right',
        label: 'Sí',
        style: {
          background: '#4CAF50',
          border: '2px solid #2E7D32',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      },
      {
        id: 'false',
        type: 'source',
        position: 'right',
        label: 'No',
        style: {
          background: '#F44336',
          border: '2px solid #C62828',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      }
    ]
  },
  
  end: {
    inputs: [
      {
        id: 'end-input',
        type: 'target',
        position: 'left',
        label: 'Entrada',
        style: {
          background: '#2196F3',
          border: '2px solid #1565C0',
          width: '12px',
          height: '12px',
          borderRadius: '50%'
        }
      }
    ],
    outputs: [] // Los nodos END no tienen salidas
  }
};

// Función para obtener la configuración de handlers de un tipo de nodo
export const getNodeHandlers = (nodeType: string): NodeTypeHandlers => {
  return NODE_HANDLERS[nodeType] || { inputs: [], outputs: [] };
};

// Función para validar si un handle es válido para un tipo de nodo
export const isValidHandle = (nodeType: string, handleId: string, handleType: 'source' | 'target'): boolean => {
  const config = getNodeHandlers(nodeType);
  const handlers = handleType === 'source' ? config.outputs : config.inputs;
  return handlers.some(h => h.id === handleId);
};

// Estilos CSS para los handlers
export const HANDLER_STYLES = {
  input: {
    background: '#2196F3',
    border: '2px solid #1565C0',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    position: 'absolute' as const,
    left: '-6px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10
  },
  output: {
    background: '#4CAF50',
    border: '2px solid #2E7D32',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    position: 'absolute' as const,
    right: '-6px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10
  },
  ifTrue: {
    background: '#4CAF50',
    border: '2px solid #2E7D32',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    position: 'absolute' as const,
    right: '-6px',
    top: '30%',
    transform: 'translateY(-50%)',
    zIndex: 10
  },
  ifFalse: {
    background: '#F44336',
    border: '2px solid #C62828',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    position: 'absolute' as const,
    right: '-6px',
    top: '70%',
    transform: 'translateY(-50%)',
    zIndex: 10
  }
};
