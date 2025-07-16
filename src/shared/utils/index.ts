export const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getNodeCenter = (position: { x: number; y: number }, width: number, height: number) => ({
  x: position.x + width / 2,
  y: position.y + height / 2
});

export const snapToGrid = (position: { x: number; y: number }, gridSize: number) => ({
  x: Math.round(position.x / gridSize) * gridSize,
  y: Math.round(position.y / gridSize) * gridSize
});

export const isPointInRect = (
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

export const generateConnectionPath = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // Crear una curva suave basada en la distancia vertical
  const controlPoint1 = { x: start.x + dx * 0.5, y: start.y + dy * 0.2 };
  const controlPoint2 = { x: end.x - dx * 0.5, y: end.y - dy * 0.2 };
  
  return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Exportar las funciones de globalInit
export * from './globalInit';

// Exportar el logger
export * from './logger';
export * from './dragDropDebugger';
