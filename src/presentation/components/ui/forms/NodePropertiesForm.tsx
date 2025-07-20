import React, { useState, useEffect, useMemo } from 'react';
import { Node } from '../../../../domain/entities/Node';
import { NodeType } from '../../../../shared/types';
import { debounce } from '../../../../shared/utils/debounce';
import { useNodeNameValidation } from '../../../hooks/useNodeNameValidation';

interface NodePropertiesFormProps {
  data: Node;
  onUpdate: (updates: Partial<Node>) => void;
}

export const NodePropertiesForm: React.FC<NodePropertiesFormProps> = ({ data, onUpdate }) => {
  const [formState, setFormState] = useState({
    name: data.data?.label || '',
    description: data.description || '',
    type: data.type,
    status: data.status || 'idle',
    inputDefinition: JSON.stringify(data.data.config || {}, null, 2),
    outputDefinition: JSON.stringify(data.data.config || {}, null, 2)
  });

  // Hook para validación de nombres únicos
  const {
    validationState,
    validateName,
    validateNameImmediate
  } = useNodeNameValidation({
    currentNodeId: data.id,
    initialName: formState.name
  });

  // Sincronizar estado del formulario con los datos cuando cambien
  useEffect(() => {
    const newName = data.data?.label || '';
    setFormState(prev => ({
      ...prev,
      name: newName,
      description: data.description || '',
      type: data.type,
      status: data.status || 'idle',
      inputDefinition: JSON.stringify(data.data.config || {}, null, 2),
      outputDefinition: JSON.stringify(data.data.config || {}, null, 2)
    }));
  }, [data]);

  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Node>) => {
      onUpdate(updates);
    }, 500),
    [onUpdate]
  );

  const handleChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    // Manejo especial para el nombre con validación
    if (field === 'name') {
      // Validar nombre en tiempo real
      validateName(value);
      
      // Solo actualizar si el nombre es válido
      const validation = validateNameImmediate(value);
      
      if (validation.isValid && value.trim()) {
        // Solo usar debouncedUpdate para evitar duplicaciones
        debouncedUpdate({ 
          data: { ...data.data, label: value.trim() }
        });
      }
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

  // Función para aplicar nombre sugerido en caso de duplicado
  const applySuggestedName = () => {
    if (validationState.suggestedName) {
      const suggestedName = validationState.suggestedName;
      setFormState(prev => ({ ...prev, name: suggestedName }));
      debouncedUpdate({ 
        data: { ...data.data, label: suggestedName }
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
      <div className="properties-panel__section">
        <h4 className="properties-panel__section-title">Información del Nodo</h4>
        
        <div className="properties-panel__field">
          <label htmlFor="node-name" className="properties-panel__label">Nombre</label>
          <div className="input-group">
            <input
              id="node-name"
              type="text"
              value={formState.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre del nodo"
              className={`properties-panel__input ${!validationState.isValid ? 'form-input--error' : ''}`}
            />
            {validationState.isDuplicate && validationState.suggestedName && (
              <button 
                type="button"
                className="btn btn--small btn--secondary"
                onClick={applySuggestedName}
                title={`Usar nombre sugerido: ${validationState.suggestedName}`}
              >
                Usar sugerencia
              </button>
            )}
          </div>
          {!validationState.isValid && validationState.message && (
            <div className="form-error">
              {validationState.message}
              {validationState.suggestedName && (
                <span className="form-suggestion">
                  {' '}Sugerencia: "{validationState.suggestedName}"
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="properties-panel__field">
          <label htmlFor="node-description" className="properties-panel__label">Descripción</label>
          <textarea
            id="node-description"
            value={formState.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del nodo"
            rows={2}
            className="properties-panel__textarea"
          />
        </div>
        
        <div className="properties-panel__field">
          <label htmlFor="node-type" className="properties-panel__label">Tipo</label>
          <select
            id="node-type"
            value={formState.type}
            onChange={(e) => handleChange('type', e.target.value as NodeType)}
            className="properties-panel__select"
          >
            <option value="start">Inicio</option>
            <option value="end">Fin</option>
            <option value="if">Condicional (IF)</option>
            <option value="step">Paso genérico</option>
          </select>
        </div>
        
        <div className="properties-panel__field">
          <label htmlFor="node-status" className="properties-panel__label">Estado</label>
          <select
            id="node-status"
            value={formState.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="properties-panel__select"
          >
            <option value="idle">Inactivo</option>
            <option value="running">Ejecutándose</option>
            <option value="success">Exitoso</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>
      
      <div className="properties-panel__section">
        <h4 className="properties-panel__section-title">Configuración</h4>
        
        <div className="properties-panel__field">
          <label htmlFor="input-definition" className="properties-panel__label">Definición de Entrada</label>
          <textarea
            id="input-definition"
            value={formState.inputDefinition}
            onChange={(e) => handleJSONChange('inputDefinition', e.target.value)}
            placeholder="Definición de entrada (JSON)"
            rows={4}
            className="properties-panel__textarea json-editor"
          />
        </div>
        
        <div className="properties-panel__field">
          <label htmlFor="output-definition" className="properties-panel__label">Definición de Salida</label>
          <textarea
            id="output-definition"
            value={formState.outputDefinition}
            onChange={(e) => handleJSONChange('outputDefinition', e.target.value)}
            placeholder="Definición de salida (JSON)"
            rows={4}
            className="properties-panel__textarea json-editor"
          />
        </div>
      </div>
      
      <div className="properties-panel__section">
        <h4 className="properties-panel__section-title">Posición y Metadatos</h4>
        
        
        
        <div className="properties-panel__metadata">
          <div className="properties-panel__metadata-item">
            <span className="properties-panel__metadata-label">ID</span>
            <span className="properties-panel__metadata-value">{data.id}</span>
          </div>
          
          <div className="properties-panel__metadata-item">
            <span className="properties-panel__metadata-label">Fecha de creación</span>
            <span className="properties-panel__metadata-value">{formatDate(data.createdAt)}</span>
          </div>
          
          <div className="properties-panel__metadata-item">
            <span className="properties-panel__metadata-label">Última modificación</span>
            <span className="properties-panel__metadata-value">{formatDate(data.updatedAt)}</span>
          </div>
        </div>
      </div>
    </form>
  );
};
