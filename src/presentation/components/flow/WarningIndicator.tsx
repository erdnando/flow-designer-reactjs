import React from 'react';
import './WarningIndicator.css';

interface WarningIndicatorProps {
  show: boolean;
  warnings?: string[];
  className?: string;
}

const WarningIndicator: React.FC<WarningIndicatorProps> = ({ 
  show, 
  warnings = [], 
  className = '' 
}) => {
  if (!show) return null;

  const warningText = warnings.length > 0 ? warnings.join(', ') : 'Advertencia';

  return (
    <div 
      className={`warning-indicator ${className}`}
      title={warningText}
      aria-label={`Advertencia: ${warningText}`}
    >
      ⚠️
    </div>
  );
};

export default WarningIndicator;
