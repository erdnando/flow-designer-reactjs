/**
 * Sistema de Feature Flags para implementación gradual
 * Permite activar/desactivar funcionalidades durante el desarrollo
 */

export const FEATURE_FLAGS = {
  // Fase 2: Estado inmutable con Immer
  IMMUTABLE_STATE: true,
  
  // Fase 3: Selectores memoizados 
  MEMOIZED_SELECTORS: true,
  
  // Fase 4: Sistema de selección unificado
  UNIFIED_SELECTION: true,
  
  // Fase 5: Separación de contextos
  SEPARATED_CONTEXTS: false, // 🎯 Habilitamos gradualmente
  
  // Fase 6: Optimizaciones de rendimiento
  PERFORMANCE_MONITORING: true,
  REACT_MEMO_OPTIMIZATION: false,
  ADVANCED_DEBOUNCING: false,
  BUNDLE_OPTIMIZATION: false
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Verifica si una feature flag está habilitada
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Hook para usar feature flags en componentes
 */
export const useFeatureFlag = (flag: FeatureFlag): boolean => {
  return isFeatureEnabled(flag);
};

/**
 * Función para habilitar/deshabilitar features en tiempo de desarrollo
 */
export const toggleFeature = (flag: FeatureFlag, enabled: boolean): void => {
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore - Permitir modificación solo en desarrollo
    FEATURE_FLAGS[flag] = enabled;
    console.log(`🚩 Feature ${flag} ${enabled ? 'enabled' : 'disabled'}`);
  }
};

/**
 * Función para obtener el estado de todas las features
 */
export const getFeatureStatus = (): Record<FeatureFlag, boolean> => {
  return { ...FEATURE_FLAGS };
};
