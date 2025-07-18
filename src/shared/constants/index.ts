import type { NodeType, NodeTypeConfig } from '../types';

export const NODE_TYPES: Record<NodeType, NodeTypeConfig> = {
  start: {
    label: 'Start',
    description: 'Nodo de inicio del flujo',
    color: '#10b981',
    icon: '▶️',
    allowedInputs: 0,
    allowedOutputs: 1,
    shape: 'circle'
  },
  step: {
    label: 'Step',
    description: 'Paso genérico del flujo',
    color: '#3b82f6',
    icon: '⚡',
    allowedInputs: 1,
    allowedOutputs: 1,
    shape: 'rectangle'
  },
  if: {
    label: 'If',
    description: 'Nodo condicional (if/else)',
    color: '#3b82f6',
    icon: '💎',
    allowedInputs: 1,
    allowedOutputs: 2,
    shape: 'rectangle'
  },
  end: {
    label: 'End',
    description: 'Nodo final del flujo',
    color: '#ef4444',
    icon: '⏹️',
    allowedInputs: 1,
    allowedOutputs: 0,
    shape: 'circle'
  }
};

export const CANVAS_CONFIG = {
  GRID_SIZE: 30,
  ZOOM_MIN: 0.01,
  ZOOM_MAX: 2,
  ZOOM_STEP: 0.1,
  DEFAULT_ZOOM: 0.1, // Zoom out más extremo (similar a 10x zoom out)
  NODE_WIDTH: 240,
  NODE_HEIGHT: 80,
  CONNECTION_STROKE_WIDTH: 2,
  HANDLE_SIZE: 12,
  SNAP_GRID: false,
  BACKGROUND_PATTERN: 'dots' as const,
  MINIMAP_HEIGHT: 120,
  CONTROLS_POSITION: 'bottom-left' as const,
  // Nuevas configuraciones para conexiones con curvas suaves
  CONNECTION_LINE: {
    TYPE: 'custom', // Usamos nuestro componente personalizado
    STROKE: '#3b82f6',  // Color azul para la línea de conexión
    STROKE_WIDTH: 2,
    STROKE_DASHARRAY: '',  // Línea continua como en la imagen 1
    ANIMATION: false,
    CURVATURE: 0.95 // Alta curvatura para líneas más curvas
  },
  // Configuración específica para las conexiones ya creadas
  EDGE_OPTIONS: {
    TYPE: 'smoothbezier', // Usamos nuestro tipo personalizado
    ANIMATED: false,    // Sin animación
    STYLE: {
      STROKE: '#3b82f6', // Mantenemos el color azul como solicitaste
      STROKE_WIDTH: 2,
      STROKE_DASHARRAY: '', // Línea continua para el estilo de la imagen 1
      CURVATURE: 0.8 // Alta curvatura para líneas más curvas
    }
  }
};

export const DRAG_TYPES = {
  NODE: 'flow-node',
  PALETTE_NODE: 'palette-node'
} as const;

export const EVENTS = {
  NODE_CLICK: 'node:click',
  NODE_DRAG_START: 'node:dragStart',
  NODE_DRAG: 'node:drag',
  NODE_DRAG_END: 'node:dragEnd',
  CONNECTION_CREATE: 'connection:create',
  CONNECTION_DELETE: 'connection:delete',
  CANVAS_CLICK: 'canvas:click',
  SELECTION_CHANGE: 'selection:change'
} as const;

export const ANIMATION_CONFIG = {
  DURATION: 0.2,
  EASE: [0.4, 0.0, 0.2, 1] as const,
  SCALE_HOVER: 1.05,
  SCALE_ACTIVE: 0.95
};

export const LAYOUT_CONFIG = {
  SIDEBAR_WIDTH: 280,
  PROPERTIES_PANEL_WIDTH: 320,
  HEADER_HEIGHT: 60,
  TOOLBAR_HEIGHT: 50
};
