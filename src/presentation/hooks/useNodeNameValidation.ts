import { useState, useCallback, useMemo } from 'react';
import { useFlowContext } from '../context/FlowContext';
import { useNotificationHelpers } from './useNotificationHelpers';
import { debounce } from '../../shared/utils/debounce';

interface NodeNameValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  message?: string;
  suggestedName?: string;
}

interface UseNodeNameValidationProps {
  currentNodeId: string;
  initialName: string;
}

export const useNodeNameValidation = ({ currentNodeId, initialName }: UseNodeNameValidationProps) => {
  const { state } = useFlowContext();
  const { showWarning } = useNotificationHelpers();
  const [validationState, setValidationState] = useState<NodeNameValidationResult>({
    isValid: true,
    isDuplicate: false
  });

  // Obtener todos los nombres de nodos existentes (excluyendo el nodo actual)
  const existingNames = useMemo(() => {
    if (!state.currentFlow) return new Set<string>();
    
    const names = new Set(
      state.currentFlow.nodes
        .filter(node => node.id !== currentNodeId)
        .map(node => (node.data?.label || '').toLowerCase().trim())
        .filter(name => name.length > 0)
    );
    
    return names;
  }, [state.currentFlow, currentNodeId]);

  // Función para generar nombre sugerido en caso de duplicado
  const generateSuggestedName = useCallback((baseName: string): string => {
    const cleanBaseName = baseName.trim();
    let counter = 1;
    let candidateName: string;
    
    do {
      candidateName = `${cleanBaseName} (${counter})`;
      counter++;
    } while (existingNames.has(candidateName.toLowerCase()) && counter <= 100);
    
    return candidateName;
  }, [existingNames]);

  // Función principal de validación
  const validateName = useCallback((name: string): NodeNameValidationResult => {
    const trimmedName = name.trim();
    
    // Validar si está vacío
    if (!trimmedName) {
      return {
        isValid: false,
        isDuplicate: false,
        message: 'El nombre no puede estar vacío'
      };
    }
    
    // Validar longitud mínima
    if (trimmedName.length < 2) {
      return {
        isValid: false,
        isDuplicate: false,
        message: 'El nombre debe tener al menos 2 caracteres'
      };
    }
    
    // Validar longitud máxima
    if (trimmedName.length > 50) {
      return {
        isValid: false,
        isDuplicate: false,
        message: 'El nombre no puede tener más de 50 caracteres'
      };
    }
    
    // Validar caracteres especiales (permitir letras, números, espacios, guiones y underscores)
    const validCharacters = /^[a-zA-Z0-9\s\-_áéíóúüñÁÉÍÓÚÜÑ]+$/;
    if (!validCharacters.test(trimmedName)) {
      return {
        isValid: false,
        isDuplicate: false,
        message: 'El nombre solo puede contener letras, números, espacios, guiones y underscores'
      };
    }
    
    // Verificar duplicados
    const lowercaseName = trimmedName.toLowerCase();
    if (existingNames.has(lowercaseName)) {
      const suggestedName = generateSuggestedName(trimmedName);
      return {
        isValid: false,
        isDuplicate: true,
        message: `Ya existe un nodo con el nombre "${trimmedName}"`,
        suggestedName
      };
    }
    
    // Todo válido
    return {
      isValid: true,
      isDuplicate: false
    };
  }, [existingNames, generateSuggestedName]);

  // Función de validación con debounce
  const debouncedValidate = useMemo(
    () => debounce((name: string) => {
      const result = validateName(name);
      setValidationState(result);
      
      // Mostrar advertencia si hay duplicado
      if (result.isDuplicate && result.message) {
        showWarning(
          'Nombre duplicado',
          result.message + (result.suggestedName ? `. Sugerencia: "${result.suggestedName}"` : '')
        );
      }
    }, 500), // Aumentar debounce de 300ms a 500ms para reducir actualizaciones
    [validateName, showWarning]
  );

  // Función de validación inmediata (sin debounce)
  const validateNameImmediate = useCallback((name: string): NodeNameValidationResult => {
    const result = validateName(name);
    setValidationState(result);
    return result;
  }, [validateName]);

  // Función para verificar si un nombre es válido sin actualizar el estado
  const isNameValid = useCallback((name: string): boolean => {
    return validateName(name).isValid;
  }, [validateName]);

  return {
    validationState,
    validateName: debouncedValidate,
    validateNameImmediate,
    isNameValid
  };
};
