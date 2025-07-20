import React, { useCallback, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, useNodes, useEdges } from 'reactflow';
import type { NodeData, NodeType } from '../../../shared/types';
import { NODE_TYPES } from '../../../shared/constants';
import { getNodeHandlers } from '../../../shared/constants/nodeHandlers';
import { useNodeActions } from '../../hooks/useNodeActions';
import { validateNode } from '../../../shared/utils/nodeValidation';
import NodeActionBar from './NodeActionBar';
import WarningIndicator from './WarningIndicator';
import NodeIcon from './NodeIcon';
import ConfirmDialog from '../ui/ConfirmDialog';
import './FlowNode.css';
import './FlowNodeHandlers.css';

interface FlowNodeData extends NodeData {
  nodeType: NodeType;
  onNodeClick?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
}

const FlowNode: React.FC<NodeProps<FlowNodeData>> = ({ id, data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
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

  // Configurar acciones del nodo y obtener variables para diálogo de confirmación
  const { actions, isConfirmDialogOpen, confirmDeletion, closeConfirmDialog, nodeToDelete } = useNodeActions({
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
    },
    // Pasar información adicional para el diálogo de confirmación
    nodeName: data.label || nodeConfig.label,
    nodeType: data.nodeType
  });

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

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
      
      // Para handlers del nodo IF, no aplicar estilos inline que interfieren con CSS
      const isIFHandler = data.nodeType === 'if' && (handler.id === 'true' || handler.id === 'false');
      const handleStyle = isIFHandler ? { cursor: 'crosshair' } : { 
        ...handler.style,
        cursor: 'crosshair',
        borderRadius: '50%'
      };
      
      handles.push(
        <Handle
          key={handler.id}
          type="source"
          position={Position[position as keyof typeof Position]}
          id={handler.id}
          className={`flow-node__handle flow-node__handle--output flow-node__handle--${handler.id}`}
          onMouseDown={handleConnectionStart}
          style={handleStyle}
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
    <>
      {/* Diálogo de confirmación para eliminación de nodo */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={`Eliminar nodo ${nodeToDelete?.type ? NODE_TYPES[nodeToDelete.type as NodeType]?.label || nodeToDelete.type : ''}`}
        message={
          <>
            {nodeToDelete?.name && (
              <strong className="node-delete-name">{nodeToDelete.name}</strong>
            )}
            <p>
              ¿Estás seguro de que deseas eliminar este nodo? 
              {validationResult.warnings.length > 0 && (
                <span className="node-delete-warning"> Este nodo tiene advertencias que podrían afectar al flujo.</span>
              )}
            </p>
            <p className="node-delete-note">Esta acción no se puede deshacer y eliminará también todas las conexiones asociadas.</p>
          </>
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmDeletion}
        onCancel={closeConfirmDialog}
      />

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

        {/* Etiqueta del nodo - Ahora fuera del nodo principal */}
        <div className="flow-node__label-container">
          <div className="flow-node__label">
            {data.label || nodeConfig.label}
          </div>
        </div>

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
    </>
  );
};

export default FlowNode;
