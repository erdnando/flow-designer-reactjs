import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlowContext } from '../../context/FlowContext';
import { PersistenceStats } from './PersistenceStats';
import { FlowPropertiesForm, NodePropertiesForm, ConnectionPropertiesForm } from './forms';
import { Flow } from '../../../domain/entities/Flow';
import { Node as FlowNode } from '../../../domain/entities/Node';
import { Connection } from '../../../domain/entities/Connection';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  className?: string;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className }) => {
  const { state, selection, actions } = useFlowContext();

  // Obtener los datos del elemento seleccionado
  const selectedData = useMemo(() => {
    if (!selection.elementId) return null;

    switch (selection.type) {
      case 'flow':
        return state.currentFlow;
      case 'node':
        return state.currentFlow?.nodes.find(n => n.id === selection.elementId);
      case 'connection':
        return state.currentFlow?.connections.find(c => c.id === selection.elementId);
      default:
        return null;
    }
  }, [selection, state.currentFlow]);

  const renderForm = () => {
    if (!selectedData || !selection.type) {
      return (
        <div className="properties-panel__empty">
          <p>Selecciona un elemento para ver sus propiedades</p>
        </div>
      );
    }

    switch (selection.type) {
      case 'flow':
        return <FlowPropertiesForm data={selectedData as Flow} onUpdate={actions.updateFlowProperties} />;
      case 'node':
        return <NodePropertiesForm data={selectedData as FlowNode} onUpdate={(updates) => actions.updateNode((selectedData as FlowNode).id, updates)} />;
      case 'connection':
        return <ConnectionPropertiesForm data={selectedData as Connection} onUpdate={(updates) => actions.updateConnectionProperties((selectedData as Connection).id, updates)} />;
      default:
        return null;
    }
  };

  return (
    <div className={`properties-panel ${className || ''}`}>
      <div className="properties-panel__header">
        <h2 className="properties-panel__title">Propiedades</h2>
        {selection.type && (
          <span className="properties-panel__type-badge">
            {selection.type === 'flow' ? 'Flujo' : 
             selection.type === 'node' ? 'Nodo' : 
             'Conexión'}
          </span>
        )}
      </div>

      <div className="properties-panel__content">
        <AnimatePresence mode="wait">
          <motion.div
            key={selection.elementId || 'empty'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderForm()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="properties-panel__footer">
        <PersistenceStats />
      </div>
    </div>
  );
};

export default PropertiesPanel;
