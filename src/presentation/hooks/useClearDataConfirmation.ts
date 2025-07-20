import { useState, useEffect } from 'react';
import { ViewportPersistenceService } from '../../infrastructure/services/ViewportPersistenceService';

/**
 * Hook para manejar la confirmación y limpieza de datos persistidos
 */
export const useClearDataConfirmation = () => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hasPersistedData, setHasPersistedData] = useState(false);
  
  /**
   * Verifica si existen datos persistidos relacionados SOLO al flujo
   */
  const checkPersistedData = () => {
    try {
      let hasData = false;
      const foundKeys = [];
      
      // Solo verificar claves específicas del FLUJO (no datos de usuario/auth)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('flow_designer_flow_') ||           // Flujos completos
          key.startsWith('flow-designer-positions') ||       // Posiciones de nodos
          key.startsWith('flow-designer-viewports') ||       // Viewports del canvas
          key.startsWith('reactflow-')                       // Datos internos de ReactFlow
        )) {
          // Verificar que la clave no esté vacía
          const value = localStorage.getItem(key);
          foundKeys.push({ key, value: value ? value.substring(0, 50) + '...' : null, length: value?.length || 0 });
          
          if (value && value.trim() !== '' && value !== '{}' && value !== '[]') {
            hasData = true;
          }
        }
      }
      
      // Log para debugging
      console.log('🔍 Verificando datos persistidos del FLUJO:');
      console.log('📋 Claves de flujo encontradas:', foundKeys);
      console.log('✅ Tiene datos de flujo persistidos:', hasData);
      
      return hasData;
    } catch (error) {
      console.error('❌ Error verificando datos persistidos:', error);
      return false;
    }
  };
  
  // Verificar datos persistidos al montar el componente y cuando se modifique localStorage
  useEffect(() => {
    const updatePersistedDataStatus = () => {
      setHasPersistedData(checkPersistedData());
    };
    
    // Verificar inicialmente
    updatePersistedDataStatus();
    
    // Escuchar cambios en localStorage
    window.addEventListener('storage', updatePersistedDataStatus);
    
    // También verificar periódicamente (cada 5 segundos) para cambios locales
    const interval = setInterval(updatePersistedDataStatus, 5000);
    
    return () => {
      window.removeEventListener('storage', updatePersistedDataStatus);
      clearInterval(interval);
    };
  }, []);
  
  const clearAllPersistedData = () => {
    try {
      // Crear instancia del servicio de viewport
      const viewportService = new ViewportPersistenceService();
      
      // Limpiar todos los viewports
      viewportService.clearAllViewports();
      
      // Limpiar localStorage SOLO de datos relacionados al flujo
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('flow_designer_flow_') ||           // Flujos completos
          key.startsWith('flow-designer-positions') ||       // Posiciones de nodos
          key.startsWith('flow-designer-viewports') ||       // Viewports del canvas
          key.startsWith('reactflow-')                       // Datos internos de ReactFlow
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Removed key:', key);
      });
      
      console.log('✅ Todos los datos persistidos han sido eliminados');
      console.log('📊 Keys eliminadas:', keysToRemove.length);
      
      // Actualizar el estado inmediatamente después de limpiar
      setHasPersistedData(false);
      
      // Recargar la página para asegurar un estado limpio
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error al limpiar datos persistidos:', error);
    }
  };
  
  /**
   * Función para debugging - inspeccionar localStorage completo
   */
  const inspectLocalStorage = () => {
    console.log('🔍 INSPECCIÓN COMPLETA DE LOCALSTORAGE:');
    console.log('📦 Total de claves:', localStorage.length);
    
    const allKeys = [];
    const flowKeys = [];
    const appKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        const keyInfo = {
          key,
          value: value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : null,
          fullLength: value?.length || 0,
          isEmpty: !value || value.trim() === '' || value === '{}' || value === '[]'
        };
        
        allKeys.push(keyInfo);
        
        // Clasificar claves
        //
        if (key.startsWith('flow_designer_flow_') || 
            key.startsWith('flow-designer-positions') || 
            key.startsWith('flow-designer-viewports') ||
            key.startsWith('reactflow-')) {
          flowKeys.push(keyInfo);
        } else if (key === 'authToken' || key === 'currentUser' || key.startsWith('designer-')) {
          appKeys.push(keyInfo);
        }
      }
    }
    
    console.log('📋 Todas las claves:');
    console.table(allKeys);
    console.log('� Claves del FLUJO (que afectan el botón):');
    console.table(flowKeys);
    console.log('👤 Claves de la APLICACIÓN (que NO afectan el botón):');
    console.table(appKeys);
    
    return { allKeys, flowKeys, appKeys };
  };
  
  const requestClearData = () => {
    setIsConfirmDialogOpen(true);
  };
  
  const handleConfirmClear = () => {
    setIsConfirmDialogOpen(false);
    clearAllPersistedData();
  };
  
  const handleCancelClear = () => {
    setIsConfirmDialogOpen(false);
  };
  
  return {
    isConfirmDialogOpen,
    hasPersistedData,
    requestClearData,
    handleConfirmClear,
    handleCancelClear,
    checkPersistedData
  };
};

