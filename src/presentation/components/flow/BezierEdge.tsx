import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { CANVAS_CONFIG } from '../../../shared/constants';

// Componente personalizado para bordes curvos
const BezierEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  // Utilizamos la función getBezierPath de ReactFlow para generar un camino Bezier de alta calidad
  // Esta función maneja la creación de curvas suaves teniendo en cuenta las posiciones de origen y destino
  // Utilizamos la función getBezierPath de ReactFlow para generar un camino Bezier de alta calidad
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.4 // Ajustamos la curvatura para que sea similar a la imagen de referencia
  });
  
  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      style={{
        ...style,
        stroke: style.stroke || CANVAS_CONFIG.EDGE_OPTIONS.STYLE.STROKE,
        strokeWidth: style.strokeWidth || CANVAS_CONFIG.EDGE_OPTIONS.STYLE.STROKE_WIDTH,
        // No línea punteada para este tipo de conexión, línea continua como en la imagen 1
        strokeLinecap: 'round', // Extremos redondeados para las líneas
      }}
      markerEnd={markerEnd}
    />
  );
};

export default BezierEdge;
