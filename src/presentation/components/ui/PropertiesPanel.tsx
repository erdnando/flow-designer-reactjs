import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Node } from '../../../domain/entities/Node';
import { NODE_TYPES } from '../../../shared/constants';
import { useFlowContext } from '../../context/FlowContext';
import { PersistenceStats } from './PersistenceStats';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  className?: string;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedNode, className }) => {
  const { actions } = useFlowContext();
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    config: {}
  });

  // Sincronizar datos del nodo seleccionado con el formulario
  useEffect(() => {
    if (selectedNode) {
      setFormData({
        label: selectedNode.data.label || '',
        description: selectedNode.data.description || '',
        config: selectedNode.data.config || {}
      });
    }
  }, [selectedNode]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Actualizar inmediatamente en el contexto (reactivo)
    if (selectedNode) {
      actions.updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          [field]: value
        }
      });
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...formData.config, [key]: value };
    setFormData(prev => ({ ...prev, config: newConfig }));
    
    if (selectedNode) {
      actions.updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          config: newConfig
        }
      });
    }
  };

  const nodeConfig = selectedNode ? NODE_TYPES[selectedNode.type] : null;

  return (
    <div className={`properties-panel ${className || ''}`}>
      <div className="properties-panel__header">
        <h3 className="properties-panel__title">Properties</h3>
        <p className="properties-panel__description">
          {selectedNode ? 'Configure the selected node' : 'Select a node to view its properties'}
        </p>
      </div>

      <div className="properties-panel__content">
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="properties-panel__form"
            >
              {/* Node Type Info */}
              <div className="properties-panel__section">
                <div className="properties-panel__node-type">
                  <div 
                    className="properties-panel__node-icon"
                    style={{ backgroundColor: nodeConfig?.color }}
                  >
                    {nodeConfig?.icon}
                  </div>
                  <div className="properties-panel__node-info">
                    <div className="properties-panel__node-label">
                      {nodeConfig?.label}
                    </div>
                    <div className="properties-panel__node-id">
                      ID: {selectedNode.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Properties */}
              <div className="properties-panel__section">
                <h4 className="properties-panel__section-title">Basic Properties</h4>
                
                <div className="properties-panel__field">
                  <label className="properties-panel__label">Label</label>
                  <input
                    type="text"
                    className="properties-panel__input"
                    value={formData.label}
                    onChange={(e) => handleInputChange('label', e.target.value)}
                    placeholder={`Enter ${nodeConfig?.label.toLowerCase()} label`}
                  />
                </div>

                <div className="properties-panel__field">
                  <label className="properties-panel__label">Description</label>
                  <textarea
                    className="properties-panel__textarea"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter description..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Position Info */}
              <div className="properties-panel__section">
                <h4 className="properties-panel__section-title">Position</h4>
                <div className="properties-panel__position">
                  <div className="properties-panel__position-item">
                    <span className="properties-panel__position-label">X:</span>
                    <span className="properties-panel__position-value">
                      {Math.round(selectedNode.position.x)}
                    </span>
                  </div>
                  <div className="properties-panel__position-item">
                    <span className="properties-panel__position-label">Y:</span>
                    <span className="properties-panel__position-value">
                      {Math.round(selectedNode.position.y)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Node-specific Configuration */}
              {selectedNode.type === 'if' && (
                <div className="properties-panel__section">
                  <h4 className="properties-panel__section-title">Condition Settings</h4>
                  
                  <div className="properties-panel__field">
                    <label className="properties-panel__label">Condition Type</label>
                    <select
                      className="properties-panel__select"
                      value={(formData.config as any)?.conditionType || 'equals'}
                      onChange={(e) => handleConfigChange('conditionType', e.target.value)}
                    >
                      <option value="equals">Equals</option>
                      <option value="notEquals">Not Equals</option>
                      <option value="greaterThan">Greater Than</option>
                      <option value="lessThan">Less Than</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>

                  <div className="properties-panel__field">
                    <label className="properties-panel__label">Value</label>
                    <input
                      type="text"
                      className="properties-panel__input"
                      value={(formData.config as any)?.conditionValue || ''}
                      onChange={(e) => handleConfigChange('conditionValue', e.target.value)}
                      placeholder="Enter condition value"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === 'step' && (
                <div className="properties-panel__section">
                  <h4 className="properties-panel__section-title">Step Settings</h4>
                  
                  <div className="properties-panel__field">
                    <label className="properties-panel__label">Step Action</label>
                    <select
                      className="properties-panel__select"
                      value={(formData.config as any)?.action || ''}
                      onChange={(e) => handleConfigChange('action', e.target.value)}
                    >
                      <option value="">Select action</option>
                      <option value="process">Process Data</option>
                      <option value="transform">Transform</option>
                      <option value="validate">Validate</option>
                      <option value="calculate">Calculate</option>
                      <option value="store">Store Data</option>
                      <option value="retrieve">Retrieve Data</option>
                      <option value="notify">Send Notification</option>
                    </select>
                  </div>

                  <div className="properties-panel__field">
                    <label className="properties-panel__label">Parameters (JSON)</label>
                    <textarea
                      className="properties-panel__textarea"
                      value={(formData.config as any)?.parameters || '{}'}
                      onChange={(e) => handleConfigChange('parameters', e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="properties-panel__section">
                <h4 className="properties-panel__section-title">Metadata</h4>
                <div className="properties-panel__metadata">
                  <div className="properties-panel__metadata-item">
                    <span className="properties-panel__metadata-label">Created:</span>
                    <span className="properties-panel__metadata-value">
                      {selectedNode.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="properties-panel__metadata-item">
                    <span className="properties-panel__metadata-label">Updated:</span>
                    <span className="properties-panel__metadata-value">
                      {selectedNode.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="properties-panel__section">
                <button
                  className="properties-panel__delete-btn"
                  onClick={() => actions.removeNode(selectedNode.id)}
                >
                  🗑️ Delete Node
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="properties-panel__empty"
            >
              <div className="properties-panel__empty-icon">📄</div>
              <p className="properties-panel__empty-text">
                No node selected
              </p>
              <p className="properties-panel__empty-description">
                Click on a node in the canvas to view and edit its properties
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Estadísticas de persistencia */}
        <PersistenceStats />
      </div>
    </div>
  );
};

export default PropertiesPanel;
