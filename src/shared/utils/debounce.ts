/**
 * Utilidad para crear funciones con debounce
 * Evita que una función se ejecute múltiples veces en un período corto
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

/**
 * Utilidad para crear funciones con throttle
 * Limita la frecuencia de ejecución de una función
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T => {
  let lastExecTime = 0;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecTime >= delay) {
      func(...args);
      lastExecTime = now;
    }
  }) as T;
};
