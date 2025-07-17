import React, { useState, useEffect, useMemo } from 'react';
import { Flow } from '../../../../domain/entities/Flow';
import { debounce } from '../../../../shared/utils/debounce';

interface FlowPropertiesFormProps {
  data: Flow;
  onUpdate: (updates: Partial<Flow>) => void;
}

export const FlowPropertiesForm: React.FC<FlowPropertiesFormProps> = ({ data, onUpdate }) => {
  const [formState, setFormState] = useState({
    name: data.name || '',
    description: data.description || '',
    status: data.status || 'design',
    creator: data.creator || '',
    owner: data.owner || ''
  });

  // Sincronizar estado del formulario con los datos cuando cambien
  useEffect(() => {
    setFormState({
      name: data.name || '',
      description: data.description || '',
      status: data.status || 'design',
      creator: data.creator || '',
      owner: data.owner || ''
    });
  }, [data]);

  // Debounced update function
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Flow>) => onUpdate(updates), 300),
    [onUpdate]
  );

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    debouncedUpdate({ [field]: value });
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
    <form className="flow-properties-form">
      <div className="form-section">
        <h4>Información General</h4>
        
        <div className="form-group">
          <label htmlFor="flow-name">Nombre</label>
          <input
            id="flow-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre del flujo"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="flow-description">Descripción</label>
          <textarea
            id="flow-description"
            value={formState.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del flujo"
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="flow-status">Estado</label>
          <select
            id="flow-status"
            value={formState.status}
            onChange={(e) => handleChange('status', e.target.value as Flow['status'])}
          >
            <option value="design">En diseño</option>
            <option value="published">Publicado</option>
            <option value="error">Error</option>
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
      
      <div className="form-section">
        <h4>Metadatos</h4>
        
        <div className="form-group">
          <label htmlFor="flow-creator">Creador</label>
          <input
            id="flow-creator"
            type="text"
            value={formState.creator}
            onChange={(e) => handleChange('creator', e.target.value)}
            placeholder="Nombre del creador"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="flow-owner">Propietario</label>
          <input
            id="flow-owner"
            type="text"
            value={formState.owner}
            onChange={(e) => handleChange('owner', e.target.value)}
            placeholder="Nombre del propietario"
          />
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
      
      <div className="form-section">
        <h4>Estadísticas</h4>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Nodos</span>
            <span className="stat-value">{data.nodes.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Conexiones</span>
            <span className="stat-value">{data.connections.length}</span>
          </div>
        </div>
      </div>
    </form>
  );
};
