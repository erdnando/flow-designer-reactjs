import React from 'react';
import { NODE_TYPES } from '../../../shared/constants';
import type { NodeType } from '../../../shared/types';
import './NodePalette.css';

interface NodePaletteProps {
  className?: string;
}

const NodePalette: React.FC<NodePaletteProps> = ({ className }) => {
  // Test with local constant to debug import issue
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

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    console.log('🚀 Drag started:', nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Debug logging
  console.log('🔍 NodePalette - Raw import check');
  console.log('🔍 NODE_TYPES imported:', NODE_TYPES);
  console.log('🔍 LOCAL_NODE_TYPES:', LOCAL_NODE_TYPES);
  console.log('🔍 Using LOCAL_NODE_TYPES for now...');

  return (
    <div className={`node-palette ${className || ''}`}>
      <div className="node-palette__header">
        <h3 className="node-palette__title">Components</h3>
        <p className="node-palette__description">
          Drag components to the canvas to build your flow
        </p>
      </div>

      <div className="node-palette__content">
        {/* Debug: Show a simple test */}
        <div style={{padding: '10px', background: 'yellow', margin: '5px'}}>
          Debug: LOCAL_NODE_TYPES loaded = {Object.keys(LOCAL_NODE_TYPES).length} types at {new Date().toLocaleTimeString()}
          <br />
          Types: {Object.keys(LOCAL_NODE_TYPES).join(', ')}
        </div>
        
        {Object.entries(LOCAL_NODE_TYPES).map(([nodeType, config]) => (
          <div
            key={nodeType}
            className="node-palette__item"
            draggable
            onDragStart={(event) => {
              onDragStart(event, nodeType as NodeType);
              event.currentTarget.style.opacity = '0.5';
            }}
            style={{ 
              borderLeftColor: config.color,
              padding: '16px',
              margin: '8px 0',
              border: '1px solid #ccc',
              borderRadius: '8px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
            onDragEnd={(event) => {
              event.currentTarget.style.opacity = '1';
            }}
          >
            <div 
              className="node-palette__item-icon"
              style={{ 
                backgroundColor: config.color,
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                marginRight: '12px',
                flexShrink: 0
              }}
            >
              {config.icon}
            </div>
            
            <div className="node-palette__item-content" style={{flex: 1}}>
              <div className="node-palette__item-label" style={{fontWeight: 'bold', fontSize: '14px', marginBottom: '4px'}}>
                {config.label}
              </div>
              <div className="node-palette__item-description" style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                {config.description}
              </div>
              
              <div className="node-palette__item-meta" style={{fontSize: '12px', color: '#888'}}>
                <span className="node-palette__item-inputs">
                  ⬅️ {config.allowedInputs}
                </span>
                <span className="node-palette__item-outputs" style={{marginLeft: '12px'}}>
                  {config.allowedOutputs} ➡️
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="node-palette__footer">
        <div className="node-palette__tip">
          <span className="node-palette__tip-icon">💡</span>
          <span className="node-palette__tip-text">
            Tip: Connect nodes by dragging from the output handle to an input handle
          </span>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;
