/**
 * Feature Flags para la Descomposición Modular de useFlowDesigner
 * 
 * Estos flags permiten una migración gradual y rollback seguro
 */

export const MODULAR_DECOMPOSITION_FLAGS = {
  // Fase 0.1: Funciones utilitarias
  USE_EXTRACTED_UTILITIES: true, // ✅ PASO 1: Funciones utilitarias seguras
  
  // Fase 0.2: Gestión de persistencia
  USE_PERSISTENCE_SERVICES: true, // ✅ PASO 2: Servicios de persistencia seguros
  
  // Fase 0.3: Transformadores de datos
  USE_DATA_TRANSFORMERS: true, // ✅ PASO 3: Transformadores de datos seguros
  
    // Flag para controlar el módulo de posición (actualmente deshabilitado por bucles infinitos)
  USE_POSITION_MODULE: false, // DESHABILITADO: Volviendo a la versión original
  
  // Fase 0.5: Utilities y helpers adicionales
  USE_UTILS_MODULE: false,
  
  // Fase 0.6: Drag & Drop
  USE_DRAGDROP_MODULE: false,
  
  // Fase 0.7: Event handlers
  USE_EDGE_HANDLERS: false,
  USE_NODE_HANDLERS: false,
  USE_NODE_EVENTS_MODULE: false, // DESHABILITADO: Volviendo a la versión original
  
  // Fase 0.8: Estado principal
  USE_CORE_STATE: false,
  
  // Fase 0.9: Hook principal modular
  USE_MODULAR_HOOK: false,
  
  // Debugging y logging
  ENABLE_MIGRATION_LOGGING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  
  // Rollback de emergencia
  FORCE_LEGACY_MODE: false, // Si true, usa solo el hook original
};

/**
 * Verificar si debemos usar el modo legacy (hook original completo)
 */
export const shouldUseLegacyMode = (): boolean => {
  return MODULAR_DECOMPOSITION_FLAGS.FORCE_LEGACY_MODE;
};

/**
 * Log de migración para debugging
 */
export const migrationLog = (phase: string, message: string, data?: any) => {
  if (MODULAR_DECOMPOSITION_FLAGS.ENABLE_MIGRATION_LOGGING) {
    console.log(`[MIGRATION-${phase}] ${message}`, data || '');
  }
};

/**
 * Monitor de performance para validar que no degradamos
 */
export const performanceMonitor = (operationName: string, startTime: number) => {
  if (MODULAR_DECOMPOSITION_FLAGS.ENABLE_PERFORMANCE_MONITORING) {
    const duration = performance.now() - startTime;
    if (duration > 16) { // Más de un frame a 60fps
      console.warn(`[PERFORMANCE] ${operationName} took ${duration.toFixed(2)}ms`);
    }
  }
};
