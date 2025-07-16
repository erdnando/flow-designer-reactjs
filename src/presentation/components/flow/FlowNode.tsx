import React, { useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import type { NodeData, NodeType } from '../../../shared/types';
import { NODE_TYPES } from '../../../shared/constants';
import './FlowNode.css';

interface FlowNodeData extends NodeData {
  nodeType: NodeType;
  onNodeClick?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
}

const FlowNode: React.FC<NodeProps<FlowNodeData>> = ({ id, data, selected }) => {
  // Usar los NODE_TYPES importados
  console.log('� FlowNode - Using imported NODE_TYPES');

  const nodeConfig = NODE_TYPES[data.nodeType];
  console.log('🔧 FlowNode config for', data.nodeType, ':', nodeConfig);
  
  // Manejo de eliminación directo a ReactFlow
  const reactFlowInstance = useReactFlow();
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevenir cualquier evento predeterminado
    console.log('🗑️ Eliminando nodo (método directo):', id);
    
    // Primero ocultar el nodo visualmente para feedback inmediato
    const nodeElement = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
    if (nodeElement) {
      nodeElement.style.opacity = '0.3';
      nodeElement.style.transform = 'scale(0.9)';
      nodeElement.style.transition = 'all 0.2s ease-out';
    }
    
    // Mejorar la sincronización entre ReactFlow UI y el estado del contexto
    try {
      // Primero intentar sincronizar el estado a través del contexto
      if (data.onNodeDelete) {
        console.log('🔄 Llamando al método onNodeDelete para sincronizar estado');
        try {
          // Ejecutar en contexto - Prioridad máxima
          data.onNodeDelete(id);
          console.log('✅ Estado sincronizado correctamente');
        } catch (contextError) {
          console.error('❌ Error al sincronizar estado:', contextError);
          // Continuar para actualizar la UI incluso si falla la sincronización
        }
      } else {
        console.warn('⚠️ No hay método onNodeDelete disponible para sincronizar estado');
      }

      // ANTI-FANTASMAS: Siempre actualizar la UI, incluso si falla la sincronización del estado
      console.log('🔄 Actualizando UI para eliminar el nodo visualmente');
      
      // Forzar actualización inmediata de la UI con doble operación
      // Paso 1: Marcar el nodo como eliminado pero manteniéndolo (para efectos visuales)
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
      
      // Paso 2: Eliminación real después de una breve animación visual
      setTimeout(() => {
        reactFlowInstance.setNodes((nodes) => {
          const filteredNodes = nodes.filter(node => node.id !== id);
          console.log(`✅ Nodo eliminado de la UI: ${nodes.length} -> ${filteredNodes.length} nodos`);
          
          // Forzar refresh completo del canvas para asegurar actualización visual
          setTimeout(() => {
            reactFlowInstance.fitView({ duration: 10, padding: 0.1 });
          }, 50);
          
          return filteredNodes;
        });
      }, 20);
    } catch (error) {
      console.error('❌ Error al eliminar nodo:', error);
      
      // Último recurso: Intentar solo actualizar la UI
      try {
        reactFlowInstance.setNodes((nodes) => nodes.filter(node => node.id !== id));
        console.log('✅ Nodo eliminado de la UI (método de emergencia)');
      } catch (uiError) {
        console.error('❌ Error crítico al eliminar nodo:', uiError);
        alert('Ocurrió un error al eliminar el nodo. Por favor, intenta de nuevo.');
      }
    }
  }, [data, id, reactFlowInstance]);

  // Manejador de eventos para handles de conexión
  const handleConnectionStart = useCallback((event: React.MouseEvent) => {
    // Detener la propagación para evitar que el canvas se mueva
    event.stopPropagation();
    
    // IMPORTANTE: Prevenir el comportamiento por defecto del navegador
    // que causa el efecto de "arrastrar imagen"
    event.preventDefault();
    
    // El dataTransfer solo existiría si fuera un evento de arrastre (DragEvent)
    // pero no es necesario en este caso ya que estamos manejando MouseEvent
    
    console.log('🔄 Connection handle click detected - Default drag behavior prevented');
    
    // Asegurar que el cursor se mantiene como crosshair durante la conexión
    document.body.style.cursor = 'crosshair';
    
    // Restaurar el cursor después de un tiempo
    setTimeout(() => {
      document.body.style.cursor = '';
    }, 1000);
  }, []);

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
          onMouseDown={handleConnectionStart}
          style={{ 
            left: -8,
            backgroundColor: nodeConfig.color,
            border: '2px solid white',
            cursor: 'crosshair' // Cursor especial para indicar creación de conexión
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
          onMouseDown={handleConnectionStart}
          style={{ 
            bottom: -8,
            left: '25%',
            backgroundColor: '#10b981',
            border: '2px solid white',
            cursor: 'crosshair'
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
          onMouseDown={handleConnectionStart}
          style={{ 
            bottom: -8,
            right: '25%',
            backgroundColor: '#ef4444',
            border: '2px solid white',
            cursor: 'crosshair'
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
          onMouseDown={handleConnectionStart}
          style={{ 
            right: -8,
            backgroundColor: nodeConfig.color,
            border: '2px solid white',
            cursor: 'crosshair'
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

      {/* Delete button - MEJORADO: Siempre visible y más clickeable */}
      <button
        className="flow-node__delete flow-node__delete--visible"
        onClick={handleDelete}
        title="Eliminar nodo"
        style={{
          transform: nodeConfig.shape === 'diamond' ? 'rotate(-45deg)' : 'none',
          opacity: selected ? 1 : 0.7, // Más visible incluso cuando no está seleccionado
          transition: 'all 0.2s ease',
          pointerEvents: 'all', // Siempre permitir clics
          backgroundColor: selected ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.7)', // Rojo más visible
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
