import React, { useCallback, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useNodes, useEdges } from 'reactflow';
import type { NodeData, NodeType } from '../../../shared/types';
import { NODE_TYPES } from '../../../shared/constants';
import { getNodeHandlers } from '../../../shared/constants/nodeHandlers';
import { useNodeActions } from '../../hooks/useNodeActions';
import { validateNode } from '../../../shared/utils/nodeValidation';
import NodeActionBar from './NodeActionBar';
import WarningIndicator from './WarningIndicator';
import NodeIcon from './NodeIcon';
import './FlowNode.css';
import './FlowNodeHandlers.css';

interface FlowNodeData extends NodeData {
  nodeType: NodeType;
  onNodeClick?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
}

const FlowNode: React.FC<NodeProps<FlowNodeData>> = ({ id, data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const reactFlowInstance = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  
  // Obtener configuración del nodo
  const nodeConfig = NODE_TYPES[data.nodeType];
  
  // Validación del nodo
  const validationResult = useMemo(() => {
    const currentNode = nodes.find(node => node.id === id);
    if (!currentNode) return { isValid: true, warnings: [], errors: [] };
    return validateNode(currentNode, edges);
  }, [id, nodes, edges]);

  // Configurar acciones del nodo
  const { actions } = useNodeActions({
    nodeId: id,
    onNodeDelete: data.onNodeDelete,
    onNodeValidate: (nodeId) => {
      console.log('Validando nodo:', nodeId);
      // Aquí se podría implementar validación manual
    },
    onNodeReset: (nodeId) => {
      console.log('Reseteando nodo:', nodeId);
      // Aquí se podría implementar reset de configuración
    },
    onNodeOptions: (nodeId) => {
      console.log('Opciones del nodo:', nodeId);
      // Aquí se podría abrir un menú contextual
    }
  });

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Manejo de eliminación directo a ReactFlow (mantener compatibilidad)
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🗑️ Eliminando nodo (método directo):', id);
    
    const nodeElement = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
    if (nodeElement) {
      nodeElement.style.opacity = '0.3';
      nodeElement.style.transform = 'scale(0.9)';
      nodeElement.style.transition = 'all 0.2s ease-out';
    }
    
    try {
      if (data.onNodeDelete) {
        data.onNodeDelete(id);
      }
      
      reactFlowInstance.setNodes((nodes) => 
        nodes.map(node => node.id === id 
          ? { 
              ...node, 
              style: { ...node.style, opacity: 0.3 }, 
              data: { 
                ...node.data, 
                config: { 
                  ...node.data.config, 
                  _deletionInProgress: true 
                } 
              } 
            }
          : node
        )
      );
      
      setTimeout(() => {
        reactFlowInstance.setNodes((nodes) => {
          const filteredNodes = nodes.filter(node => node.id !== id);
          setTimeout(() => {
            reactFlowInstance.fitView({ duration: 10, padding: 0.1 });
          }, 50);
          return filteredNodes;
        });
      }, 20);
    } catch (error) {
      console.error('❌ Error al eliminar nodo:', error);
    }
  }, [data, id, reactFlowInstance]);

  // Manejador de eventos para handles de conexión
  const handleConnectionStart = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('🔄 Connection handle click detected - Default drag behavior prevented');
    
    document.body.style.cursor = 'crosshair';
    
    setTimeout(() => {
      document.body.style.cursor = '';
    }, 1000);
  }, []);

  const renderHandles = () => {
    const handles: React.ReactElement[] = [];
    const nodeHandlers = getNodeHandlers(data.nodeType);
    
    // Renderizar handlers de entrada
    nodeHandlers.inputs.forEach(handler => {
      const position = handler.position.charAt(0).toUpperCase() + handler.position.slice(1);
      handles.push(
        <Handle
          key={handler.id}
          type="target"
          position={Position[position as keyof typeof Position]}
          id={handler.id}
          className={`flow-node__handle flow-node__handle--input flow-node__handle--${handler.id}`}
          onMouseDown={handleConnectionStart}
          style={{ 
            ...handler.style,
            cursor: 'crosshair',
            borderRadius: '2px'
          }}
        />
      );
    });
    
    // Renderizar handlers de salida
    nodeHandlers.outputs.forEach(handler => {
      const position = handler.position.charAt(0).toUpperCase() + handler.position.slice(1);
      handles.push(
        <Handle
          key={handler.id}
          type="source"
          position={Position[position as keyof typeof Position]}
          id={handler.id}
          className={`flow-node__handle flow-node__handle--output flow-node__handle--${handler.id}`}
          onMouseDown={handleConnectionStart}
          style={{ 
            ...handler.style,
            cursor: 'crosshair',
            borderRadius: '50%'
          }}
        />
      );
    });
    
    return handles;
  };

  const getNodeClasses = () => {
    const baseClasses = `flow-node flow-node--${nodeConfig.shape} flow-node--${data.nodeType}`;
    const selectedClass = selected ? 'flow-node--selected' : '';
    const warningClass = !validationResult.isValid || validationResult.warnings.length > 0 ? 'flow-node--warning' : '';
    
    return `${baseClasses} ${selectedClass} ${warningClass}`.trim();
  };

  const getNodeStyles = () => {
    const baseStyles = {
      borderColor: nodeConfig.color,
      backgroundColor: '#2d3748'
    };

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
        width: '48px',
        height: '48px',
        borderRadius: '50%'
      };
    }

    return baseStyles;
  };

  const renderNodeContent = () => {
    if (nodeConfig.shape === 'diamond') {
      return (
        <div className="flow-node__content flow-node__content--diamond">
          <NodeIcon 
            type={data.nodeType} 
            className="flow-node__icon"
          />
          <WarningIndicator 
            show={!validationResult.isValid || validationResult.warnings.length > 0}
            warnings={validationResult.warnings}
          />
        </div>
      );
    }

    return (
      <div className="flow-node__content">
        <NodeIcon 
          type={data.nodeType} 
          className="flow-node__icon"
        />
        <WarningIndicator 
          show={!validationResult.isValid || validationResult.warnings.length > 0}
          warnings={validationResult.warnings}
        />
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Barra de acciones */}
      <NodeActionBar 
        actions={actions}
        isVisible={isHovered || selected}
        className={nodeConfig.shape === 'diamond' ? 'node-action-bar--diamond' : ''}
      />
      
      {/* Handles de conexión */}
      {renderHandles()}
      
      {/* Contenido del nodo */}
      {renderNodeContent()}

      {/* Etiqueta del nodo */}
      <div className="flow-node__label-container">
        <div className="flow-node__label">
          {data.label || nodeConfig.label}
        </div>
      </div>

      {/* Botón de eliminar (mantener compatibilidad) */}
      <button
        className="flow-node__delete flow-node__delete--visible"
        onClick={handleDelete}
        title="Eliminar nodo"
        style={{
          transform: nodeConfig.shape === 'diamond' ? 'rotate(-45deg)' : 'none',
          opacity: selected ? 1 : 0.7,
          transition: 'all 0.2s ease',
          pointerEvents: 'all',
          backgroundColor: selected ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.7)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 0 3px rgba(0,0,0,0.3)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = nodeConfig.shape === 'diamond' ? 'rotate(-45deg) scale(1.1)' : 'scale(1.1)';
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = selected ? '1' : '0.7';
          e.currentTarget.style.transform = nodeConfig.shape === 'diamond' ? 'rotate(-45deg)' : 'none';
          e.currentTarget.style.backgroundColor = selected ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.7)';
        }}
      >
        ×
      </button>

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
