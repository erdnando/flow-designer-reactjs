# Inventario Completo de Funcionalidades - Flow Designer

## 📋 Estado Actual del Sistema

### 🔧 Core Features - Hook Principal (`useFlowDesigner`)

#### 1. **Gestión de Estado**
- **Estado de Nodos**: Sincronización entre ReactFlow y modelo de dominio
- **Estado de Edges**: Gestión de conexiones entre nodos
- **Estado de Selección**: Tracking del nodo actualmente seleccionado
- **Estados de Carga**: Loading, error handling
- **Detección de Cambios Estructurales**: Función `detectStructuralChanges`

#### 2. **Sistema de Posicionamiento**
- **Validación de Posiciones**: Función `validateAndRoundPosition`
- **Determinación de Posición Final**: Prioridad entre persistida, ref, estado, default
- **Redondeo de Coordenadas**: Posiciones enteras para mejor rendering
- **Sistema de Grid**: Posicionamiento espaciado automático

#### 3. **Persistencia de Datos**
- **Persistencia de Posiciones**: `PositionPersistenceService`
- **Persistencia de Viewport**: `ViewportPersistenceService`
- **Cache en Memoria**: Referencias para performance
- **Sincronización con localStorage**: Para mantener estado entre sesiones

#### 4. **Interceptor Nuclear (Sistema Actual)**
- **Filtrado Agresivo**: Bloqueo de cambios no autorizados
- **Tracking de Drag State**: `draggingNodesRef`
- **Validación de Dimensiones**: Control de cambios automáticos
- **Sistema de Firmas**: Para detectar cambios
- **Logging Extensivo**: Para debugging

#### 5. **Detección y Manejo de Nodos Fantasma**
- **Detección de Inconsistencias**: Nodos en UI pero no en estado
- **Limpieza Automática**: Eliminación de nodos fantasma
- **Protección Anti-Loops**: Evitar sincronización infinita

### 🔌 Sistema de Conexiones

#### 1. **Validación de Conexiones** (`useConnectionValidation`)
- **Reglas de Conexión**: Por tipo de nodo
- **Validación de Handles**: Source y target handles
- **Mensajes de Error**: Feedback específico por tipo de error
- **Notificaciones**: Success/error messages

#### 2. **Event Handlers de Conexión**
- **onConnect**: Creación de nuevas conexiones
- **onConnectStart**: Inicio de proceso de conexión
- **onConnectEnd**: Finalización de proceso de conexión
- **isValidConnection**: Validación en tiempo real

### 🎯 Drag & Drop System

#### 1. **Drag and Drop de Nodos**
- **onDrop**: Handler para soltar nodos
- **onDragOver**: Validación durante arrastre
- **Múltiples Estrategias**: Para obtener datos del drag
- **Posicionamiento Automático**: Calcular posición basada en viewport

#### 2. **Gestión de Cursores**
- **Estados Visuales**: Cambio de cursor durante operaciones
- **Feedback Visual**: Para indicar estados de drop válidos/inválidos

### 📊 Context y Estado Global (`FlowContext`)

#### 1. **State Management**
- **Reducer Pattern**: Con múltiples tipos de acciones
- **Inmutabilidad**: Updates inmutables con utilidades
- **Estado Unificado**: Flow, nodos, selección, loading, error

#### 2. **Acciones Disponibles**
- **SET_CURRENT_FLOW**: Cargar/cambiar flujo actual
- **SET_SELECTED_NODE**: Seleccionar nodo
- **SET_LOADING/SET_ERROR**: Estados de UI
- **UPDATE_NODE**: Actualizar propiedades de nodo
- **ADD_NODE/REMOVE_NODE**: CRUD de nodos
- **ADD_CONNECTION/REMOVE_CONNECTION**: CRUD de conexiones

### 🔍 Utilidades y Helpers

#### 1. **Funciones de Utilidad**
- **getSelectedNode**: Obtener nodo seleccionado
- **getNodeTypeConfig**: Configuración por tipo de nodo
- **getPersistenceStats**: Estadísticas de persistencia
- **clearPersistedPositions**: Limpiar cache de posiciones
- **getConnectionHelp**: Ayuda para conexiones

#### 2. **Funciones de Viewport**
- **saveCurrentViewport**: Guardar vista actual
- **getViewportStats**: Estadísticas de viewport
- **clearPersistedViewport**: Limpiar viewport persistido
- **hasPersistedViewport**: Verificar si existe viewport guardado

### 📝 Acciones del Dominio

#### 1. **Acciones de Nodos**
- **addNode**: Agregar nuevo nodo
- **updateNode**: Actualizar nodo existente
- **removeNode**: Eliminar nodo
- **selectNode**: Seleccionar nodo
- **moveNode**: Mover nodo

#### 2. **Acciones de Flujo**
- **createFlow**: Crear nuevo flujo

### 🎨 Rendering y UI

#### 1. **Inicialización de Nodos**
- **Conversión de Dominio a ReactFlow**: `initialNodes` memo
- **Configuración de Props**: onClick, onDelete handlers
- **Estado de Selección**: Sincronización visual
- **Propiedades de Arrastre**: Draggable configuration

#### 2. **Inicialización de Edges**
- **Conversión de Conexiones**: `initialEdges` memo
- **Filtrado de Conexiones Válidas**: Eliminar conexiones con nodos inexistentes
- **Estilos por Defecto**: Configuración visual de conexiones
- **Tipos de Edge**: smoothbezier configuration

### 🔄 Sincronización y Effects

#### 1. **Efectos de Sincronización**
- **Sync Nodes**: Entre estado y ReactFlow
- **Sync Edges**: Entre conexiones y ReactFlow
- **Anti-Loop Protection**: Flags para evitar loops infinitos
- **Viewport Restoration**: Restaurar viewport persistido

#### 2. **Optimizaciones**
- **Memoización**: useMemo para expensive computations
- **Callbacks**: useCallback para handlers
- **Referencias**: useRef para performance crítica

### 🚨 Notificaciones y Feedback

#### 1. **Sistema de Notificaciones** (`useNotificationHelpers`)
- **Error Messages**: Para conexiones inválidas
- **Success Messages**: Para operaciones exitosas
- **Help Messages**: Para guiar al usuario

#### 2. **Logging System**
- **Debug Logging**: Para desarrollo
- **Error Logging**: Para tracking de errores
- **Performance Logging**: Para optimización

## 🎯 Hooks Especializados Adicionales

### 1. **useNodeActions** - Sistema de Acciones de Nodos
- **NodeAction Interface**: Definición de acciones de nodo (id, label, icon, onClick, disabled, tooltip)
- **Acciones Disponibles**: Delete, Validate, Reset, Options
- **Integración con ReactFlow**: Uso de useReactFlow() para manipulación directa
- **Callbacks Personalizados**: onNodeDelete, onNodeValidate, onNodeReset, onNodeOptions
- **Metadata de Nodos**: Manejo de nodeName y nodeType

### 2. **useFlowValidation** - Sistema de Validación de Flujo
- **Validación Estructural**: Verificación de nodos START/END obligatorios
- **Validación de Conexiones**: Nodos con conexiones apropiadas
- **Tipos de Validación**:
  - Errors: Problemas críticos que impiden funcionamiento
  - Warnings: Recomendaciones para mejores prácticas
- **Reglas Específicas**:
  - Un solo nodo START (error si no existe, warning si hay múltiples)
  - Al menos un nodo END (error si no existe)
  - Nodos STEP recomendados (warning si no existen)
  - Conexiones de entrada/salida apropiadas por tipo

### 3. **useClearFlow** - Sistema de Limpieza de Datos
- **Detección de Contenido**: hasVisualContent basado en nodes/edges visibles
- **Confirmación de Usuario**: Dialog de confirmación antes de limpiar
- **Limpieza Selectiva**: Solo datos relacionados al flujo (no toda la localStorage)
- **Recarga Automática**: Reload para asegurar estado limpio
- **Tipos de Datos Limpiados**:
  - `flow_designer_flow_*`: Flujos completos
  - `flow-designer-positions`: Posiciones de nodos
  - `flow-designer-viewports`: Viewports del canvas
  - `reactflow-*`: Datos internos de ReactFlow

### 4. **useNodeDeletionConfirm** - Confirmación de Eliminación
- **Dialog de Confirmación**: Interfaz para confirmar eliminación
- **Estado de Confirmación**: isConfirmDialogOpen, nodeToDelete
- **Callbacks**: openConfirmDialog, confirmDeletion, closeConfirmDialog
- **Integración con useNodeActions**: Para eliminación segura

### 5. **Hooks de Utilidad Adicionales**
- **useClearDataConfirmation**: Confirmación para limpieza de datos
- **useNodeNameValidation**: Validación de nombres de nodos
- **useNotificationHelpers**: Sistema de notificaciones

## 🎨 Componentes de UI Especializados

### 1. **FlowCanvas** - Canvas Principal
- **Configuración de ReactFlow**: Background, Controls, MiniMap, ConnectionMode
- **Tipos de Nodos Personalizados**: nodeTypes para start, step, if, end
- **Tipos de Edges Personalizados**: 
  - `bezier`: BezierEdge original
  - `smoothbezier`: SmoothBezierEdge mejorado
- **Componentes Especializados**:
  - CustomConnectionLine: Línea de conexión personalizada
  - ConfirmDialog: Diálogos de confirmación
- **Estilos CSS Específicos**:
  - FlowCanvas.css: Estilos generales del canvas
  - BezierEdge.css: Estilos para edges curvos
  - SmoothBezierEdge.css: Curvas más suaves
  - ForceEdgeCurves.css: Forzar curvas en todas las conexiones
  - DragConnectionStyles.css: Mejoras en líneas de arrastre
  - NoGhostImage.css: Prevenir imagen fantasma en drag
  - DragDropCanvas.css: Estilos para drag & drop

### 2. **FlowNode** - Nodo Personalizado
- **Múltiples Versiones**: FlowNode.tsx, FlowNode.new.tsx, FlowNode.backup.tsx
- **Componentes Relacionados**:
  - NodeActionBar: Barra de acciones por nodo
  - NodeIcon: Iconografía específica por tipo
  - WarningIndicator: Indicadores visuales de advertencias
- **Estilos Específicos**:
  - FlowNode.css: Estilos generales de nodos
  - FlowNodeHandlers.css: Handles de conexión
  - NodeActionBar.css: Barra de acciones
  - NodeIcon.css: Estilos de iconos
  - WarningIndicator.css: Indicadores de advertencia

### 3. **Edges Personalizados**
- **BezierEdge**: Implementación original de curvas bezier
- **SmoothBezierEdge**: Implementación mejorada con curvas más suaves
- **CustomConnectionLine**: Línea temporal durante creación de conexiones
- **custom-marker**: Marcadores personalizados para extremos de edges

## 🔧 Servicios y Infraestructura

### 1. **Servicios de Persistencia**
- **PositionPersistenceService**: Guardar/cargar posiciones
- **ViewportPersistenceService**: Guardar/cargar viewport
- **FlowPersistenceService**: Persistencia completa de flujos

### 2. **Repositorios**
- **InMemoryFlowRepository**: Almacenamiento en memoria
- **Interfaces de Repository**: Para abstracción de datos

### 3. **Servicios de Aplicación**
- **FlowService**: Lógica de negocio de flujos

## 📊 Entidades del Dominio

### 1. **Entidades Principales**
- **Flow**: Entidad principal del flujo
- **Node**: Entidad de nodo
- **Connection**: Entidad de conexión
- **Position**: Value object para posiciones

### 2. **Tipos y Interfaces**
- **FlowNode**: Interface para nodos de ReactFlow
- **FlowEdge**: Interface para edges de ReactFlow
- **NodeType**: Tipos de nodos disponibles
- **SelectionState**: Estado de selección

## 🎯 Funcionalidades de UX/UI

### 1. **Interactividad**
- **Selección de Nodos**: Click para seleccionar
- **Arrastre de Nodos**: Drag para mover
- **Creación de Conexiones**: Drag entre handles
- **Drop de Nuevos Nodos**: Desde panel lateral

### 2. **Feedback Visual**
- **Estados de Hover**: Visual feedback
- **Estados de Selección**: Highlight de nodo seleccionado
- **Estados de Conexión**: Feedback durante creación
- **Estados de Error**: Visual error indicators

## 🔍 Validaciones y Reglas

### 1. **Validaciones de Conexión**
- **Reglas por Tipo de Nodo**: Específicas para cada tipo
- **Validación de Handles**: Source/target compatibility
- **Prevención de Loops**: Evitar conexiones circulares

### 2. **Validaciones de Posición**
- **Coordenadas Válidas**: No NaN, números válidos
- **Límites de Canvas**: Dentro de área visible
- **Grid Snapping**: Opcional para alineación

## 📈 Performance y Optimización

### 1. **Optimizaciones Actuales**
- **Memoización**: Componentes y funciones memoizadas
- **Referencias**: Para evitar re-renders innecesarios
- **Lazy Loading**: Carga diferida donde sea posible

### 2. **Métricas y Monitoring**
- **Performance Logging**: Tiempos de operación
- **Memory Usage**: Tracking de uso de memoria
- **Error Tracking**: Monitoreo de errores

---

## 🎯 Checklist de Migración

### ✅ Funcionalidades Críticas que DEBEN Preservarse
- [ ] Persistencia de posiciones entre sesiones
- [ ] Validación de conexiones por tipo de nodo
- [ ] Detección y eliminación de nodos fantasma
- [ ] Sistema de notificaciones de usuario
- [ ] Drag & drop de nuevos nodos
- [ ] Selección y manipulación de nodos existentes
- [ ] Viewport persistence y restauración
- [ ] Sincronización estado-UI sin loops infinitos
- [ ] **Sistema de validación de flujo completo** (START/END/STEP rules)
- [ ] **Confirmación de eliminación de nodos** (useNodeDeletionConfirm)
- [ ] **Limpieza selectiva de datos** (useClearFlow)
- [ ] **Acciones de nodos** (delete, validate, reset, options)
- [ ] **Edges personalizados** (bezier, smoothbezier)
- [ ] **Líneas de conexión temporales** (CustomConnectionLine)
- [ ] **Indicadores visuales** (WarningIndicator, NodeIcon)
- [ ] **Barra de acciones por nodo** (NodeActionBar)

### ✅ Funcionalidades que Pueden Simplificarse
- [ ] Sistema de logging (reducir verbosidad)
- [ ] Interceptor nuclear (reemplazar por validador selectivo)
- [ ] Sistema de firmas (simplificar detección de cambios)
- [ ] Referencias múltiples (consolidar en estado unificado)
- [ ] **Múltiples versiones de FlowNode** (consolidar en una versión)
- [ ] **CSS redundante** (consolidar estilos relacionados)

### ✅ Funcionalidades que Requieren Mejora
- [ ] Performance del manejo de cambios
- [ ] Memoización de custom nodes
- [ ] Optimización de event handlers
- [ ] Reducción de re-renders innecesarios
- [ ] **Consolidación de hooks de validación** (unificar useFlowValidation con useConnectionValidation)
- [ ] **Optimización de estilos CSS** (reducir cantidad de archivos CSS separados)

---

**Total de Funcionalidades Identificadas**: 95+ funcionalidades específicas
**Complejidad Estimada**: Alta (debido a sincronización estado-UI y múltiples sistemas de validación)
**Riesgo de Pérdida**: Medio-Alto (con implementación cuidadosa por fases)

## 📋 Inventario Detallado por Categorías

### 🔴 **Crítico - No puede perderse**
1. ✅ Persistencia completa (posiciones, viewport, flujos)
2. ✅ Validación de conexiones entre nodos
3. ✅ Sistema de notificaciones (éxito/error)
4. ✅ Drag & drop funcional
5. ✅ Selección y edición de nodos
6. ✅ Validación de estructura de flujo (START/END)
7. ✅ Confirmación de eliminación de nodos
8. ✅ Limpieza selectiva de datos
9. ✅ Acciones de nodos (CRUD operations)

### 🟡 **Importante - Debe preservarse con mejoras**
1. 🔄 Sistema de logging (simplificado)
2. 🔄 Detección de cambios (optimizado)
3. 🔄 Múltiples tipos de edges (consolidado)
4. 🔄 Estilos CSS (organizados)
5. 🔄 Hooks de validación (unificados)

### 🟢 **Opcional - Puede reimplementarse**
1. ♻️ Interceptor nuclear (reemplazar)
2. ♻️ Referencias múltiples (consolidar)
3. ♻️ Versiones backup de componentes (eliminar)
4. ♻️ CSS redundante (consolidar)
