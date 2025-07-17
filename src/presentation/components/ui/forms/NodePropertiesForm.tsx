import React, { useState, useEffect, useMemo } from 'react';
import { Node } from '../../../../domain/entities/Node';
import { NodeType } from '../../../../shared/types';
import { debounce } from '../../../../shared/utils/debounce';

interface NodePropertiesFormProps {
  data: Node;
  onUpdate: (updates: Partial<Node>) => void;
}

export const NodePropertiesForm: React.FC<NodePropertiesFormProps> = ({ data, onUpdate }) => {
  const [formState, setFormState] = useState({
    name: data.name || '',
    description: data.description || '',
    type: data.type,
    status: data.status || 'idle',
    inputDefinition: JSON.stringify(data.data.config || {}, null, 2),
    outputDefinition: JSON.stringify(data.data.config || {}, null, 2)
  });

  // Sincronizar estado del formulario con los datos cuando cambien
  useEffect(() => {
    setFormState({
      name: data.name || '',
      description: data.description || '',
      type: data.type,
      status: data.status || 'idle',
      inputDefinition: JSON.stringify(data.data.config || {}, null, 2),
      outputDefinition: JSON.stringify(data.data.config || {}, null, 2)
    });
  }, [data]);

  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Node>) => onUpdate(updates), 300),
    [onUpdate]
  );

  const handleChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    // Actualizar propiedades del nodo
    if (field === 'name') {
      debouncedUpdate({ 
        data: { ...data.data, label: value }
      });
    } else if (field === 'description') {
      debouncedUpdate({ 
        data: { ...data.data, description: value }
      });
    } else if (field === 'type') {
      debouncedUpdate({ type: value });
    } else if (field === 'status') {
      debouncedUpdate({ 
        data: { ...data.data, status: value }
      });
    }
  };

  const handleJSONChange = (field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    try {
      const parsedValue = JSON.parse(value);
      if (field === 'inputDefinition' || field === 'outputDefinition') {
        debouncedUpdate({ 
          data: { ...data.data, config: parsedValue }
        });
      }
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
    <form className="node-properties-form">
      <div className="form-section">
        <h4>Información del Nodo</h4>
        
        <div className="form-group">
          <label htmlFor="node-name">Nombre</label>
          <input
            id="node-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre del nodo"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="node-description">Descripción</label>
          <textarea
            id="node-description"
            value={formState.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del nodo"
            rows={2}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="node-type">Tipo</label>
          <select
            id="node-type"
            value={formState.type}
            onChange={(e) => handleChange('type', e.target.value as NodeType)}
          >
            <option value="start">Inicio</option>
            <option value="end">Fin</option>
            <option value="if">Condicional (IF)</option>
            <option value="step">Paso genérico</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="node-status">Estado</label>
          <select
            id="node-status"
            value={formState.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="idle">Inactivo</option>
            <option value="running">Ejecutándose</option>
            <option value="success">Exitoso</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>
      
      <div className="form-section">
        <h4>Configuración</h4>
        
        <div className="form-group">
          <label htmlFor="input-definition">Definición de Entrada</label>
          <textarea
            id="input-definition"
            value={formState.inputDefinition}
            onChange={(e) => handleJSONChange('inputDefinition', e.target.value)}
            placeholder="Definición de entrada (JSON)"
            rows={4}
            className="json-editor"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="output-definition">Definición de Salida</label>
          <textarea
            id="output-definition"
            value={formState.outputDefinition}
            onChange={(e) => handleJSONChange('outputDefinition', e.target.value)}
            placeholder="Definición de salida (JSON)"
            rows={4}
            className="json-editor"
          />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Posición y Metadatos</h4>
        
        <div className="position-grid">
          <div className="form-group readonly">
            <label>Posición X</label>
            <input type="number" value={Math.round(data.position.x)} readOnly />
          </div>
          <div className="form-group readonly">
            <label>Posición Y</label>
            <input type="number" value={Math.round(data.position.y)} readOnly />
          </div>
        </div>
        
        <div className="form-group readonly">
          <label>ID</label>
          <input type="text" value={data.id} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Fecha de creación</label>
          <input type="text" value={formatDate(data.createdAt)} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Última modificación</label>
          <input type="text" value={formatDate(data.updatedAt)} readOnly />
        </div>
      </div>
    </form>
  );
};
