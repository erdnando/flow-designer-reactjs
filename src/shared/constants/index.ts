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
    color: '#f59e0b',
    icon: '💎',
    allowedInputs: 1,
    allowedOutputs: 2,
    shape: 'diamond'
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
  SNAP_GRID: true,
  BACKGROUND_PATTERN: 'dots' as const,
  MINIMAP_HEIGHT: 120,
  CONTROLS_POSITION: 'bottom-left' as const
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
