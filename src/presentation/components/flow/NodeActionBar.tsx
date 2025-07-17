import React from 'react';
import { NodeAction } from '../../hooks/useNodeActions';
import './NodeActionBar.css';

interface NodeActionBarProps {
  actions: NodeAction[];
  isVisible: boolean;
  className?: string;
}

const NodeActionBar: React.FC<NodeActionBarProps> = ({ 
  actions, 
  isVisible, 
  className = '' 
}) => {
  if (!isVisible) return null;

  return (
    <div className={`node-action-bar ${className}`}>
      {actions.map((action) => (
        <button
          key={action.id}
          className={`node-action-bar__button ${action.disabled ? 'node-action-bar__button--disabled' : ''}`}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.tooltip}
          aria-label={action.label}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
};

export default NodeActionBar;
