import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeData, NodeType } from '../../../shared/types';
import { NODE_TYPES } from '../../../shared/constants';
import './FlowNode.css';

interface FlowNodeData extends NodeData {
  nodeType: NodeType;
  onNodeClick?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
}

const FlowNode: React.FC<NodeProps<FlowNodeData>> = ({ id, data, selected }) => {
  // Local fallback para NODE_TYPES en caso de problemas de importación
  const LOCAL_NODE_TYPES = {
    start: {
      label: 'Start',
      description: 'Nodo de inicio del flujo',
      color: '#10b981',
      icon: '▶️',
      allowedInputs: 0,
      allowedOutputs: 1,
      shape: 'circle' as const
    },
    step: {
      label: 'Step',
      description: 'Paso genérico del flujo',
      color: '#3b82f6',
      icon: '⚡',
      allowedInputs: 1,
      allowedOutputs: 1,
      shape: 'rectangle' as const
    },
    if: {
      label: 'If',
      description: 'Nodo condicional (if/else)',
      color: '#f59e0b',
      icon: '💎',
      allowedInputs: 1,
      allowedOutputs: 2,
      shape: 'diamond' as const
    },
    end: {
      label: 'End',
      description: 'Nodo final del flujo',
      color: '#ef4444',
      icon: '⏹️',
      allowedInputs: 1,
      allowedOutputs: 0,
      shape: 'circle' as const
    }
  };

  const nodeConfig = NODE_TYPES[data.nodeType] || LOCAL_NODE_TYPES[data.nodeType];
  console.log('🔧 FlowNode config for', data.nodeType, ':', nodeConfig);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onNodeDelete?.(id);
  }, [data, id]);

  const renderHandles = () => {
    const handles = [];
    
    // Input handle (si es permitido)
    if (nodeConfig.allowedInputs > 0) {
      handles.push(
        <Handle
          key="input"
          type="target"
          position={Position.Left}
          id="input"
          className="flow-node__handle flow-node__handle--input"
          style={{ 
            left: -8,
            backgroundColor: nodeConfig.color,
            border: '2px solid white'
          }}
        />
      );
    }

    // Output handles basado en el tipo de nodo
    if (data.nodeType === 'if') {
      // Nodo IF con dos outputs (Sí/No)
      handles.push(
        <Handle
          key="output-true"
          type="source"
          position={Position.Bottom}
          id="true"
          className="flow-node__handle flow-node__handle--output flow-node__handle--true"
          style={{ 
            bottom: -8,
            left: '25%',
            backgroundColor: '#10b981',
            border: '2px solid white'
          }}
        />
      );
      handles.push(
        <Handle
          key="output-false"
          type="source"
          position={Position.Bottom}
          id="false"
          className="flow-node__handle flow-node__handle--output flow-node__handle--false"
          style={{ 
            bottom: -8,
            right: '25%',
            backgroundColor: '#ef4444',
            border: '2px solid white'
          }}
        />
      );
    } else if (nodeConfig.allowedOutputs === 1) {
      // Un solo output handle
      handles.push(
        <Handle
          key="output"
          type="source"
          position={Position.Right}
          id="output"
          className="flow-node__handle flow-node__handle--output"
          style={{ 
            right: -8,
            backgroundColor: nodeConfig.color,
            border: '2px solid white'
          }}
        />
      );
    }

    return handles;
  };

  const getNodeClasses = () => {
    return `flow-node flow-node--${nodeConfig.shape} flow-node--${data.nodeType} ${selected ? 'flow-node--selected' : ''}`;
  };

  const getNodeStyles = () => {
    const baseStyles = {
      borderColor: nodeConfig.color,
      backgroundColor: selected ? `${nodeConfig.color}15` : 'white'
    };

    // Estilos específicos para cada forma
    if (nodeConfig.shape === 'diamond') {
      return {
        ...baseStyles,
        width: '100px',
        height: '100px',
        transform: 'rotate(45deg)',
        borderRadius: '8px'
      };
    } else if (nodeConfig.shape === 'circle') {
      return {
        ...baseStyles,
        width: '80px',
        height: '80px',
        borderRadius: '50%'
      };
    }

    return baseStyles;
  };

  const renderNodeContent = () => {
    if (nodeConfig.shape === 'diamond') {
      // Contenido especial para nodo diamante (IF)
      return (
        <div className="flow-node__content flow-node__content--diamond">
          <div 
            className="flow-node__icon"
            style={{ 
              backgroundColor: nodeConfig.color,
              transform: 'rotate(-45deg)' // Contrarresta la rotación del contenedor
            }}
          >
            {nodeConfig.icon}
          </div>
        </div>
      );
    }

    // Contenido para nodos rectangle y circle
    return (
      <div className="flow-node__content">
        <div 
          className="flow-node__icon"
          style={{ backgroundColor: nodeConfig.color }}
        >
          {nodeConfig.icon}
        </div>
        
        <div className="flow-node__details">
          <h4 className="flow-node__title">
            {data.label || nodeConfig.label}
          </h4>
          {data.description && (
            <p className="flow-node__description">
              {data.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={getNodeClasses()}
      style={{
        ...getNodeStyles(),
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {renderHandles()}
      {renderNodeContent()}

      {/* Delete button */}
      {selected && (
        <button
          className="flow-node__delete"
          onClick={handleDelete}
          title="Eliminar nodo"
          style={{
            transform: nodeConfig.shape === 'diamond' ? 'rotate(-45deg)' : 'none'
          }}
        >
          ×
        </button>
      )}

      {/* Labels para nodo IF */}
      {data.nodeType === 'if' && (
        <>
          <div className="flow-node__label flow-node__label--true">
            Sí
          </div>
          <div className="flow-node__label flow-node__label--false">
            No
          </div>
        </>
      )}
    </div>
  );
};

export default FlowNode;
