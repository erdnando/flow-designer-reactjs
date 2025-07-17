import React from 'react';
import { NodeType } from '../../../shared/types';
import './NodeIcon.css';

interface NodeIconProps {
  type: NodeType;
  className?: string;
}

const NodeIcon: React.FC<NodeIconProps> = ({ type, className = '' }) => {
  const getIcon = () => {
    switch (type) {
      case 'start':
        return '▶';
      case 'end':
        return '■';
      case 'step':
        return '⚡';
      case 'if':
        return '?';
      default:
        return '◯';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'start':
        return '#38a169'; // Verde
      case 'end':
        return '#e53e3e'; // Rojo
      case 'step':
        return '#3182ce'; // Azul
      case 'if':
        return '#d69e2e'; // Amarillo
      default:
        return '#718096'; // Gris
    }
  };

  return (
    <div 
      className={`node-icon node-icon--${type} ${className}`}
      style={{ 
        color: getColor(),
        backgroundColor: `${getColor()}15`
      }}
    >
      {getIcon()}
    </div>
  );
};

export default NodeIcon;
