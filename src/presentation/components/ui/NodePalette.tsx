import React from 'react';
import { NODE_TYPES } from '../../../shared/constants';
import type { NodeType } from '../../../shared/types';
import './NodePalette.css';

interface NodePaletteProps {
  className?: string;
}

const NodePalette: React.FC<NodePaletteProps> = ({ className }) => {
  // Use the imported NODE_TYPES instead of local definition
  console.log('� NodePalette - Using imported NODE_TYPES');

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    console.log('🚀 Drag started:', nodeType);
    
    try {
      // Usar múltiples formatos para mayor compatibilidad
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.setData('text/plain', nodeType);
      event.dataTransfer.setData('nodeType', nodeType); // Formato simple adicional
      
      // Guardar también en un atributo del elemento
      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.setAttribute('data-node-type', nodeType);
      }
      
      // Añadir al localStorage como último recurso
      localStorage.setItem('dragging-node-type', nodeType);
      
      // Configurar el efecto como copia en lugar de movimiento
      event.dataTransfer.effectAllowed = 'copy';
      
      // Crear una imagen invisible para el arrastre
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer.setDragImage(img, 0, 0);
      
      console.log('✅ Drag data set successfully:', nodeType);
    } catch (error) {
      console.error('❌ Error en onDragStart:', error);
    }
  };

  // Debug logging
  console.log('🔍 NodePalette - Raw import check');
  console.log('🔍 NODE_TYPES imported:', NODE_TYPES);

  return (
    <div className={`node-palette ${className || ''}`}>
      <div className="node-palette__header">
        <h3 className="node-palette__title">Components</h3>
        <p className="node-palette__description">
          Drag components to the canvas to build your flow
        </p>
      </div>

      <div className="node-palette__content">
       
        
        {Object.entries(NODE_TYPES).map(([nodeType, config]) => (
          <div
            key={nodeType}
            className="node-palette__item"
            draggable
            data-node-type={nodeType}
            onDragStart={(event) => {
              console.log('⚠️ Drag start event triggered');
              
              // Guardar el tipo de nodo como atributo de datos
              if (event.currentTarget instanceof HTMLElement) {
                event.currentTarget.setAttribute('data-node-type', nodeType);
                event.currentTarget.setAttribute('data-dragging', 'true');
              }
              
              // Llamar a la función principal de inicio de arrastre
              onDragStart(event, nodeType as NodeType);
              
              // Aplicar estilos visuales
              event.currentTarget.style.opacity = '0.5';
              event.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.7)';
              
              // Añadir clase al body para indicar el estado de arrastre
              document.body.classList.add('node-dragging');
              
              // Registro detallado para diagnóstico
              console.log('🔍 Drag start complete for:', nodeType);
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
              console.log('⚠️ Drag end event triggered');
              event.currentTarget.style.opacity = '1';
              event.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              
              // Remove class from body
              document.body.classList.remove('node-dragging');
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
