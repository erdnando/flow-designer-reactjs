# Análisis de Rediseño de Nodos - Flow Designer

## Resumen del Proyecto

Este documento describe el plan de rediseño de los nodos del Flow Designer, comenzando por el nodo START, basándose en el nuevo diseño visual propuesto. El objetivo es crear una interfaz más moderna, funcional y intuitiva sin afectar las funcionalidades existentes.

## Estado Actual

### Archivos Principales
- `src/presentation/components/flow/FlowNode.tsx` - Componente principal de nodos
- `src/presentation/components/flow/FlowNode.css` - Estilos actuales
- `src/presentation/components/flow/FlowCanvas.css` - Estilos del canvas (ya modernizado)

### Funcionalidades Existentes
- Arrastrar y soltar nodos
- Conexiones entre nodos
- Diferentes tipos de nodos (START, END, IF, STEP)
- Handles de conexión
- Selección de nodos

## Nuevo Diseño Propuesto

### Elementos Visuales Principales

#### 1. **Estructura del Nodo**
```
┌─────────────────────────────────────┐
│ [✓] [↺] [✕] [⋮]                    │ ← Barra de acciones (hover/selected)
├─────────────────────────────────────┤
│                                     │
│          [ICONO]    [⚠️]           │ ← Contenido principal + advertencia
│                                     │
├─────────────────────────────────────┤
│           Etiqueta                  │ ← Texto descriptivo
└─────────────────────────────────────┘
```

#### 2. **Estados Visuales**
- **Normal**: Fondo oscuro (#2d3748) con esquinas redondeadas
- **Seleccionado**: Borde rojo (#e53e3e) con sombra destacada
- **Hover**: Aparece barra de acciones superior
- **Advertencia**: Icono de triángulo amarillo en esquina inferior derecha

#### 3. **Iconos por Tipo de Nodo**
- **START**: ▶ (triángulo verde #38a169)
- **END**: ■ (cuadrado rojo #e53e3e)
- **STEP**: ⚡ (rayo azul #3182ce)
- **IF**: ? (interrogación amarilla #d69e2e)

### Funcionalidades Nuevas

#### 1. **Barra de Acciones**
Ubicada en la parte superior del nodo, visible en hover o selección:
- **Validar** (✓): Futuro - validación manual del nodo
- **Resetear** (↺): Futuro - reseteo de configuración
- **Eliminar** (✕): Funcional - elimina el nodo
- **Opciones** (⋮): Futuro - menú contextual

#### 2. **Sistema de Advertencias**
- **Icono**: Triángulo de exclamación (⚠️)
- **Posición**: Esquina inferior derecha
- **Condiciones por tipo**:
  - START: Sin conexiones de salida
  - END: Sin conexiones de entrada
  - STEP: Propiedades incompletas
  - IF: Configuración de condición faltante

#### 3. **Validación Automática**
Sistema que evalúa el estado del nodo y muestra advertencias cuando:
- Faltan conexiones requeridas
- Configuración incompleta
- Datos inválidos

## Plan de Implementación

### Fase 1: Preparación
- [x] Análisis de impacto en funcionalidades existentes
- [x] Identificación de archivos a modificar
- [x] Definición de estructura de componentes

### Fase 2: Componente Base
- [ ] Actualizar `FlowNode.tsx` con nueva estructura
- [ ] Implementar estados visuales básicos
- [ ] Mantener compatibilidad con React Flow

### Fase 3: Estilos CSS
- [ ] Crear estilos para nuevo diseño
- [ ] Implementar estados (normal, selected, hover, warning)
- [ ] Asegurar responsive design

### Fase 4: Sistema de Validación
- [ ] Crear utilidad `nodeValidation.ts`
- [ ] Implementar validaciones por tipo de nodo
- [ ] Integrar con componente principal

### Fase 5: Acciones del Nodo
- [ ] Implementar funcionalidad de eliminación
- [ ] Crear estructura para acciones futuras
- [ ] Preparar menú contextual

## Archivos a Crear/Modificar

### Archivos Nuevos
```
src/shared/utils/nodeValidation.ts          # Lógica de validación
src/presentation/hooks/useNodeActions.ts    # Hook para acciones de nodo
src/presentation/components/flow/NodeActionBar.tsx  # Barra de acciones
```

### Archivos a Modificar
```
src/presentation/components/flow/FlowNode.tsx    # Componente principal
src/presentation/components/flow/FlowNode.css    # Estilos del nodo
src/presentation/hooks/useFlowDesigner.ts       # Integración con validación
```

## Estructura de Componentes

### FlowNode.tsx - Estructura Principal
```tsx
<div className="flow-node flow-node--{type} {selected} {warning}">
  {/* Barra de acciones (hover/selected) */}
  <NodeActionBar 
    onValidate={handleValidate}
    onReset={handleReset}
    onDelete={handleDelete}
    onOptions={handleOptions}
  />
  
  {/* Contenido principal */}
  <div className="flow-node__content">
    <NodeIcon type={data.type} />
    <WarningIndicator show={hasWarning} />
  </div>
  
  {/* Etiqueta */}
  <div className="flow-node__label">
    {data.label}
  </div>
  
  {/* Handles de conexión (existentes) */}
  {renderHandles()}
</div>
```

### Sistema de Validación
```typescript
interface NodeValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

interface NodeValidator {
  validateStartNode(node: Node, edges: Edge[]): NodeValidationResult;
  validateEndNode(node: Node, edges: Edge[]): NodeValidationResult;
  validateStepNode(node: Node, edges: Edge[]): NodeValidationResult;
  validateIfNode(node: Node, edges: Edge[]): NodeValidationResult;
}
```

## Consideraciones Técnicas

### Compatibilidad React Flow
- Mantener estructura de handles existente
- Preservar funcionalidad de drag & drop
- No interferir con sistema de conexiones

### Rendimiento
- Usar React.memo para evitar re-renders innecesarios
- Optimizar validaciones para flujos grandes
- Debounce en validaciones automáticas

### Accesibilidad
- Atributos ARIA en botones de acción
- Contraste adecuado en colores
- Navegación por teclado

### Responsive Design
- Adaptar tamaño de nodos en pantallas pequeñas
- Mantener usabilidad en dispositivos táctiles
- Escalado de iconos y textos

## Configuración de Colores

### Paleta Principal
```css
/* Nodo base */
--node-bg: #2d3748;
--node-text: #f8f9fa;
--node-border-selected: #e53e3e;

/* Iconos por tipo */
--start-color: #38a169;
--end-color: #e53e3e;
--step-color: #3182ce;
--if-color: #d69e2e;

/* Estados */
--warning-color: #f6ad55;
--warning-text: #7b341e;
--action-hover: rgba(255, 255, 255, 0.1);
```

### Conexiones (ya implementado)
```css
/* Conexiones normales */
--edge-color: #2563eb;
--edge-selected: #f97316;
--edge-width: 3px;
--edge-selected-width: 4px;
```

## Pruebas y Validación

### Casos de Prueba
1. **Funcionalidad Básica**
   - Crear nodos de diferentes tipos
   - Conectar nodos
   - Seleccionar y eliminar nodos

2. **Nuevas Funcionalidades**
   - Aparición de barra de acciones en hover
   - Eliminación desde barra de acciones
   - Visualización de advertencias

3. **Validación Automática**
   - Nodo START sin conexiones de salida
   - Nodo END sin conexiones de entrada
   - Cambios en tiempo real

4. **Integración**
   - Compatibilidad con funcionalidades existentes
   - Rendimiento con flujos grandes
   - Responsive en diferentes dispositivos

## Notas de Desarrollo

### Prioridades
1. **Alta**: Funcionalidad básica y compatibilidad
2. **Media**: Sistema de validación y advertencias
3. **Baja**: Acciones futuras y menú contextual

### Dependencias
- React Icons para iconos de la barra de acciones
- Mantener dependencias existentes de React Flow

### Configuración de Desarrollo
```bash
# Instalar dependencias adicionales si es necesario
npm install react-icons

# Estructura de desarrollo
npm run dev  # Desarrollo con hot reload
npm run build  # Construcción para producción
```

## Próximos Pasos

1. **Implementar componente FlowNode actualizado**
2. **Crear sistema de validación básico**
3. **Probar integración con React Flow**
4. **Refinar estilos y animaciones**
5. **Extender a todos los tipos de nodos**
6. **Documentar API de validación**

## Referencias

- [React Flow Documentation](https://reactflow.dev/)
- [React Icons](https://react-icons.github.io/react-icons/)
- Diseño base: Imagen de referencia proporcionada por el usuario

---

**Documento creado**: 16 de julio de 2025  
**Última actualización**: 16 de julio de 2025  
**Estado**: En desarrollo - Fase de análisis completada
