import React from 'react';
import { useFlowDesigner } from '../../hooks/useFlowDesigner';
import './PersistenceStats.css';

export const PersistenceStats: React.FC = () => {
  const { getPersistenceStats, clearPersistedPositions } = useFlowDesigner();
  
  const stats = getPersistenceStats();
  
  return (
    <div className="persistence-stats">
      <h3>🔄 Persistencia de Posiciones</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Flujos guardados:</span>
          <span className="stat-value">{stats.totalFlows}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Posiciones guardadas:</span>
          <span className="stat-value">{stats.totalPositions}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Tamaño de datos:</span>
          <span className="stat-value">{(stats.storageSize / 1024).toFixed(2)} KB</span>
        </div>
      </div>
      <button 
        className="clear-button"
        onClick={clearPersistedPositions}
        title="Limpiar posiciones guardadas del flujo actual"
      >
        🧹 Limpiar posiciones
      </button>
    </div>
  );
};
