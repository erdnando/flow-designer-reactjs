import React, { useState, useEffect, useMemo } from 'react';
import { Connection } from '../../../../domain/entities/Connection';
import { debounce } from '../../../../shared/utils/debounce';

interface ConnectionPropertiesFormProps {
  data: Connection;
  onUpdate: (updates: Partial<Connection>) => void;
}

export const ConnectionPropertiesForm: React.FC<ConnectionPropertiesFormProps> = ({ data, onUpdate }) => {
  console.log('🔍 ConnectionPropertiesForm rendered with data:', data);
  console.log('🔍 ConnectionPropertiesForm mapping:', data.mapping);
  
  // Log específico para handler "false"
  if (data.mapping?.sourceOutput === 'false') {
    console.log('🔍 HANDLER FALSE DETECTED in ConnectionPropertiesForm:', data);
  }
  
  const [formState, setFormState] = useState({
    name: data.name || '',
    sourceOutput: data.mapping?.sourceOutput || '',
    targetInput: data.mapping?.targetInput || '',
    transformations: JSON.stringify(data.mapping?.transformations || [], null, 2)
  });

  // Sincronizar estado del formulario con los datos cuando cambien
  useEffect(() => {
    setFormState({
      name: data.name || '',
      sourceOutput: data.mapping?.sourceOutput || '',
      targetInput: data.mapping?.targetInput || '',
      transformations: JSON.stringify(data.mapping?.transformations || [], null, 2)
    });
  }, [data]);

  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Connection>) => onUpdate(updates), 300),
    [onUpdate]
  );

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    if (field === 'name') {
      debouncedUpdate({ name: value });
    } else if (field === 'sourceOutput' || field === 'targetInput') {
      const newMapping = { 
        ...data.mapping, 
        [field]: value 
      };
      debouncedUpdate({ mapping: newMapping });
    }
  };

  const handleTransformationsChange = (value: string) => {
    setFormState(prev => ({ ...prev, transformations: value }));
    
    try {
      const parsedTransformations = JSON.parse(value);
      const newMapping = { 
        ...data.mapping, 
        transformations: parsedTransformations 
      };
      debouncedUpdate({ mapping: newMapping });
    } catch (error) {
      // Ignorar errores de parsing mientras el usuario escribe
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <form className="connection-properties-form">
      <div className="form-section">
        <h4>Información de la Conexión</h4>
        
        <div className="form-group">
          <label htmlFor="connection-name">Nombre</label>
          <input
            id="connection-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre de la conexión"
          />
        </div>
        
        <div className="form-group readonly">
          <label>ID de Conexión</label>
          <input type="text" value={data.id} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Nodo Origen</label>
          <input type="text" value={data.sourceNodeId} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Nodo Destino</label>
          <input type="text" value={data.targetNodeId} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Handle Origen</label>
          <input type="text" value={data.sourceHandle || 'N/A'} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Handle Destino</label>
          <input type="text" value={data.targetHandle || 'N/A'} readOnly />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Mapeo de Datos</h4>
        
        <div className="form-group">
          <label htmlFor="source-output">Output de Origen</label>
          <input
            id="source-output"
            type="text"
            value={formState.sourceOutput}
            onChange={(e) => handleChange('sourceOutput', e.target.value)}
            placeholder="Campo de salida del nodo origen"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="target-input">Input de Destino</label>
          <input
            id="target-input"
            type="text"
            value={formState.targetInput}
            onChange={(e) => handleChange('targetInput', e.target.value)}
            placeholder="Campo de entrada del nodo destino"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="transformations">Transformaciones</label>
          <textarea
            id="transformations"
            value={formState.transformations}
            onChange={(e) => handleTransformationsChange(e.target.value)}
            placeholder="Transformaciones aplicadas (JSON)"
            rows={4}
            className="json-editor"
          />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Estilo y Configuración</h4>
        
        <div className="form-group readonly">
          <label>Estilo de Línea</label>
          <input 
            type="text" 
            value={JSON.stringify(data.style, null, 2)} 
            readOnly 
            className="json-display"
          />
        </div>
        
        <div className="form-group readonly">
          <label>Seleccionada</label>
          <input type="text" value={data.selected ? 'Sí' : 'No'} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Fecha de Creación</label>
          <input type="text" value={formatDate(data.createdAt)} readOnly />
        </div>
      </div>
    </form>
  );
};
