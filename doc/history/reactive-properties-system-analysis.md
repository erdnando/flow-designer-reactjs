# Sistema de Propiedades Reactivas - Análisis e Implementación

## Fecha de Análisis
**Fecha**: 17 de julio de 2025  
**Autor**: GitHub Copilot  
**Versión**: 1.0  

## Resumen Ejecutivo

Este documento presenta el análisis completo para implementar un sistema de propiedades reactivas en el Flow Designer, permitiendo la edición y visualización de propiedades para tres entidades principales: Flow, Node y Connection. El sistema debe ser completamente reactivo, mostrando cambios en tiempo real en el canvas al modificar propiedades en el panel lateral.

## Modelo de Datos Objetivo

### 1. Entidad Flow (Flujo)
```typescript
export class Flow {
  public readonly id: string;
  public name: string;
  public description: string;
  public status: 'design' | 'published' | 'error';
  public creator: string;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public nodes: Node[];
  public connections: Connection[];
}
```

**Propiedades Visuales**:
- Nombre (editable)
- Descripción (editable)
- Estado (editable: En diseño, Publicado, Error)
- Fecha de creación (solo lectura)
- Fecha de última modificación (solo lectura)
- Creador (solo lectura)

### 2. Entidad Node (Nodo)
```typescript
export class Node {
  public readonly id: string;
  public name: string;
  public description: string;
  public type: NodeType; // 'start' | 'end' | 'if' | 'step'
  public status: string;
  public input: InputDefinition;
  public output: OutputDefinition;
  public position: Position;
}
```

**Propiedades Visuales**:
- Nombre (editable)
- Descripción (editable)
- Tipo (editable: start, end, IF, step genérico)
- Estado (editable)
- Definición de Input (editable)
- Definición de Output (editable)

### 3. Entidad Connection (Conexión)
```typescript
export class Connection {
  public readonly id: string;
  public name: string; // Formato: "nodo1-nodo2"
  public sourceNodeId: string;
  public targetNodeId: string;
  public mapping: ConnectionMapping;
}

interface ConnectionMapping {
  sourceOutput: string;
  targetInput: string;
  transformations?: any[];
}
```

**Propiedades Visuales**:
- Nombre (editable)
- Mapeo de Output → Input (editable)
- Transformaciones (editable)

## Estado Actual del Proyecto

### ✅ Componentes Existentes
- **Flow.ts**: Clase base con métodos básicos
- **Node.ts**: Entidad con propiedades básicas
- **Connection.ts**: Entidad de conexión básica
- **FlowContext.tsx**: Contexto de estado global
- **PropertiesPanel.tsx**: Panel de propiedades (solo nodos)
- **FlowCanvas.tsx**: Canvas principal con React Flow
- **useFlowDesigner.ts**: Hook principal de manejo de estado

### ❌ Componentes Faltantes
- Sistema de selección unificado para Flow/Node/Connection
- Formularios específicos por tipo de entidad
- Acciones reactivas para actualización de propiedades
- Persistencia automática de cambios
- Validación de propiedades por tipo

## Arquitectura de la Solución

### 1. Diagrama de Flujo de Datos
```
Usuario hace clic → Elemento seleccionado → Estado actualizado → Panel renderizado
                                    ↓
Usuario edita propiedad → Validación → Actualización reactiva → Persistencia
                                    ↓
Canvas actualizado ← Estado sincronizado ← Entidad modificada
```

### 2. Estructura de Componentes
```
FlowDesignerPage
├── FlowCanvas (maneja selección)
│   ├── ReactFlow
│   ├── FlowNode (onClick → selectNode)
│   └── BezierEdge (onClick → selectConnection)
└── PropertiesPanel (reactivo a selección)
    ├── FlowPropertiesForm
    ├── NodePropertiesForm
    └── ConnectionPropertiesForm
```

## Plan de Implementación

### Fase 1: Extender Entidades de Dominio (4 horas)

#### 1.1 Actualizar Flow.ts
```typescript
// Archivo: src/domain/entities/Flow.ts
export class Flow {
  // Propiedades existentes...
  
  // Nuevas propiedades
  public name: string = '';
  public description: string = '';
  public status: 'design' | 'published' | 'error' = 'design';
  public creator: string = '';
  public readonly createdAt: Date = new Date();
  public updatedAt: Date = new Date();
  
  // Método para actualizar propiedades
  public updateProperties(updates: Partial<Flow>): void {
    Object.assign(this, updates);
    this.updatedAt = new Date();
  }
}
```

#### 1.2 Actualizar Node.ts
```typescript
// Archivo: src/domain/entities/Node.ts
export class Node {
  // Propiedades existentes...
  
  // Nuevas propiedades
  public name: string = '';
  public description: string = '';
  public status: string = 'active';
  public input: InputDefinition = {};
  public output: OutputDefinition = {};
  
  // Método para actualizar propiedades
  public updateProperties(updates: Partial<Node>): void {
    Object.assign(this, updates);
  }
}
```

#### 1.3 Actualizar Connection.ts
```typescript
// Archivo: src/domain/entities/Connection.ts
export class Connection {
  // Propiedades existentes...
  
  // Nuevas propiedades
  public name: string = '';
  public mapping: ConnectionMapping = {
    sourceOutput: '',
    targetInput: '',
    transformations: []
  };
  
  // Método para actualizar propiedades
  public updateProperties(updates: Partial<Connection>): void {
    Object.assign(this, updates);
  }
}
```

### Fase 2: Sistema de Selección Unificado (4 horas)

#### 2.1 Crear tipos de selección
```typescript
// Archivo: src/shared/types/selection.ts
export interface SelectionState {
  type: 'flow' | 'node' | 'connection' | null;
  elementId: string | null;
}

export interface SelectionContextType {
  selection: SelectionState;
  selectFlow: () => void;
  selectNode: (nodeId: string) => void;
  selectConnection: (connectionId: string) => void;
  clearSelection: () => void;
}
```

#### 2.2 Actualizar FlowContext
```typescript
// Archivo: src/presentation/context/FlowContext.tsx
const FlowContext = createContext<FlowContextType | null>(null);

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<SelectionState>({
    type: null,
    elementId: null
  });
  
  const selectFlow = useCallback(() => {
    setSelection({ type: 'flow', elementId: state.currentFlow?.id || null });
  }, [state.currentFlow]);
  
  const selectNode = useCallback((nodeId: string) => {
    setSelection({ type: 'node', elementId: nodeId });
  }, []);
  
  const selectConnection = useCallback((connectionId: string) => {
    setSelection({ type: 'connection', elementId: connectionId });
  }, []);
  
  // Acciones de actualización reactiva
  const updateFlowProperties = useCallback(async (updates: Partial<Flow>) => {
    if (!state.currentFlow) return;
    
    const updatedFlow = { ...state.currentFlow, ...updates, updatedAt: new Date() };
    await flowService.saveFlow(updatedFlow);
    dispatch({ type: 'SET_CURRENT_FLOW', payload: updatedFlow });
  }, [state.currentFlow, flowService]);
  
  const updateNodeProperties = useCallback(async (nodeId: string, updates: Partial<Node>) => {
    if (!state.currentFlow) return;
    
    const updatedNodes = state.currentFlow.nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    );
    
    const updatedFlow = { ...state.currentFlow, nodes: updatedNodes, updatedAt: new Date() };
    await flowService.saveFlow(updatedFlow);
    dispatch({ type: 'SET_CURRENT_FLOW', payload: updatedFlow });
  }, [state.currentFlow, flowService]);
  
  const updateConnectionProperties = useCallback(async (connectionId: string, updates: Partial<Connection>) => {
    if (!state.currentFlow) return;
    
    const updatedConnections = state.currentFlow.connections.map(conn =>
      conn.id === connectionId ? { ...conn, ...updates } : conn
    );
    
    const updatedFlow = { ...state.currentFlow, connections: updatedConnections, updatedAt: new Date() };
    await flowService.saveFlow(updatedFlow);
    dispatch({ type: 'SET_CURRENT_FLOW', payload: updatedFlow });
  }, [state.currentFlow, flowService]);
  
  const contextValue = {
    // Estado existente...
    selection,
    selectFlow,
    selectNode,
    selectConnection,
    clearSelection: () => setSelection({ type: null, elementId: null }),
    updateFlowProperties,
    updateNodeProperties,
    updateConnectionProperties
  };
  
  return (
    <FlowContext.Provider value={contextValue}>
      {children}
    </FlowContext.Provider>
  );
};
```

### Fase 3: Actualizar Panel de Propiedades (8 horas)

#### 3.1 Crear PropertiesPanel reactivo
```typescript
// Archivo: src/presentation/components/ui/PropertiesPanel.tsx
import React, { useMemo } from 'react';
import { useFlowContext } from '../../context/FlowContext';
import { FlowPropertiesForm } from './forms/FlowPropertiesForm';
import { NodePropertiesForm } from './forms/NodePropertiesForm';
import { ConnectionPropertiesForm } from './forms/ConnectionPropertiesForm';

interface PropertiesPanelProps {
  className?: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className = '' }) => {
  const { state, selection, updateFlowProperties, updateNodeProperties, updateConnectionProperties } = useFlowContext();
  
  const selectedData = useMemo(() => {
    if (!state.currentFlow || !selection.elementId) return null;
    
    switch (selection.type) {
      case 'flow':
        return {
          type: 'flow',
          data: state.currentFlow,
          onUpdate: updateFlowProperties
        };
      case 'node':
        const node = state.currentFlow.nodes.find(n => n.id === selection.elementId);
        return node ? {
          type: 'node',
          data: node,
          onUpdate: (updates: Partial<Node>) => updateNodeProperties(selection.elementId!, updates)
        } : null;
      case 'connection':
        const connection = state.currentFlow.connections.find(c => c.id === selection.elementId);
        return connection ? {
          type: 'connection',
          data: connection,
          onUpdate: (updates: Partial<Connection>) => updateConnectionProperties(selection.elementId!, updates)
        } : null;
      default:
        return null;
    }
  }, [state.currentFlow, selection, updateFlowProperties, updateNodeProperties, updateConnectionProperties]);
  
  const renderForm = () => {
    if (!selectedData) {
      return (
        <div className="empty-selection">
          <p>Selecciona un elemento para ver sus propiedades</p>
          <p className="hint">Haz clic en el canvas para ver propiedades del flujo</p>
        </div>
      );
    }
    
    switch (selectedData.type) {
      case 'flow':
        return <FlowPropertiesForm data={selectedData.data} onUpdate={selectedData.onUpdate} />;
      case 'node':
        return <NodePropertiesForm data={selectedData.data} onUpdate={selectedData.onUpdate} />;
      case 'connection':
        return <ConnectionPropertiesForm data={selectedData.data} onUpdate={selectedData.onUpdate} />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`properties-panel ${className}`}>
      <div className="panel-header">
        <h3>Propiedades</h3>
        {selectedData && (
          <span className="element-type">{selectedData.type}</span>
        )}
      </div>
      <div className="panel-content">
        {renderForm()}
      </div>
    </div>
  );
};
```

#### 3.2 Crear formularios específicos

**FlowPropertiesForm.tsx**
```typescript
// Archivo: src/presentation/components/ui/forms/FlowPropertiesForm.tsx
import React, { useState, useEffect } from 'react';
import { Flow } from '../../../../domain/entities/Flow';
import { debounce } from '../../../../shared/utils/debounce';

interface FlowPropertiesFormProps {
  data: Flow;
  onUpdate: (updates: Partial<Flow>) => void;
}

export const FlowPropertiesForm: React.FC<FlowPropertiesFormProps> = ({ data, onUpdate }) => {
  const [formState, setFormState] = useState({
    name: data.name,
    description: data.description,
    status: data.status,
    creator: data.creator
  });
  
  // Debounced update function
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Flow>) => onUpdate(updates), 300),
    [onUpdate]
  );
  
  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    debouncedUpdate({ [field]: value });
  };
  
  return (
    <form className="flow-properties-form">
      <div className="form-section">
        <h4>Información General</h4>
        
        <div className="form-group">
          <label htmlFor="flow-name">Nombre</label>
          <input
            id="flow-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre del flujo"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="flow-description">Descripción</label>
          <textarea
            id="flow-description"
            value={formState.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del flujo"
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="flow-status">Estado</label>
          <select
            id="flow-status"
            value={formState.status}
            onChange={(e) => handleChange('status', e.target.value as Flow['status'])}
          >
            <option value="design">En diseño</option>
            <option value="published">Publicado</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>
      
      <div className="form-section">
        <h4>Metadatos</h4>
        
        <div className="form-group readonly">
          <label>Creador</label>
          <input type="text" value={formState.creator} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Fecha de creación</label>
          <input type="text" value={data.createdAt.toLocaleString()} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Última modificación</label>
          <input type="text" value={data.updatedAt.toLocaleString()} readOnly />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Estadísticas</h4>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Nodos</span>
            <span className="stat-value">{data.nodes.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Conexiones</span>
            <span className="stat-value">{data.connections.length}</span>
          </div>
        </div>
      </div>
    </form>
  );
};
```

**NodePropertiesForm.tsx**
```typescript
// Archivo: src/presentation/components/ui/forms/NodePropertiesForm.tsx
import React, { useState, useMemo } from 'react';
import { Node } from '../../../../domain/entities/Node';
import { NodeType } from '../../../../domain/value-objects/NodeType';
import { debounce } from '../../../../shared/utils/debounce';

interface NodePropertiesFormProps {
  data: Node;
  onUpdate: (updates: Partial<Node>) => void;
}

export const NodePropertiesForm: React.FC<NodePropertiesFormProps> = ({ data, onUpdate }) => {
  const [formState, setFormState] = useState({
    name: data.name,
    description: data.description,
    type: data.type,
    status: data.status
  });
  
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Node>) => onUpdate(updates), 300),
    [onUpdate]
  );
  
  const handleChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    debouncedUpdate({ [field]: value });
  };
  
  return (
    <form className="node-properties-form">
      <div className="form-section">
        <h4>Información del Nodo</h4>
        
        <div className="form-group">
          <label htmlFor="node-name">Nombre</label>
          <input
            id="node-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre del nodo"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="node-description">Descripción</label>
          <textarea
            id="node-description"
            value={formState.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del nodo"
            rows={2}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="node-type">Tipo</label>
          <select
            id="node-type"
            value={formState.type}
            onChange={(e) => handleChange('type', e.target.value as NodeType)}
          >
            <option value="start">Inicio</option>
            <option value="end">Fin</option>
            <option value="if">Condicional (IF)</option>
            <option value="step">Paso genérico</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="node-status">Estado</label>
          <input
            id="node-status"
            type="text"
            value={formState.status}
            onChange={(e) => handleChange('status', e.target.value)}
            placeholder="Estado del nodo"
          />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Configuración</h4>
        
        <div className="form-group">
          <label>Input</label>
          <textarea
            value={JSON.stringify(data.input, null, 2)}
            onChange={(e) => {
              try {
                const input = JSON.parse(e.target.value);
                handleChange('input', input);
              } catch (error) {
                // Manejar error de parsing
              }
            }}
            placeholder="Definición de entrada (JSON)"
            rows={4}
          />
        </div>
        
        <div className="form-group">
          <label>Output</label>
          <textarea
            value={JSON.stringify(data.output, null, 2)}
            onChange={(e) => {
              try {
                const output = JSON.parse(e.target.value);
                handleChange('output', output);
              } catch (error) {
                // Manejar error de parsing
              }
            }}
            placeholder="Definición de salida (JSON)"
            rows={4}
          />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Posición</h4>
        
        <div className="position-grid">
          <div className="form-group">
            <label>X</label>
            <input type="number" value={data.position.x} readOnly />
          </div>
          <div className="form-group">
            <label>Y</label>
            <input type="number" value={data.position.y} readOnly />
          </div>
        </div>
      </div>
    </form>
  );
};
```

**ConnectionPropertiesForm.tsx**
```typescript
// Archivo: src/presentation/components/ui/forms/ConnectionPropertiesForm.tsx
import React, { useState, useMemo } from 'react';
import { Connection } from '../../../../domain/entities/Connection';
import { debounce } from '../../../../shared/utils/debounce';

interface ConnectionPropertiesFormProps {
  data: Connection;
  onUpdate: (updates: Partial<Connection>) => void;
}

export const ConnectionPropertiesForm: React.FC<ConnectionPropertiesFormProps> = ({ data, onUpdate }) => {
  const [formState, setFormState] = useState({
    name: data.name,
    mapping: data.mapping
  });
  
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Connection>) => onUpdate(updates), 300),
    [onUpdate]
  );
  
  const handleChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    debouncedUpdate({ [field]: value });
  };
  
  const handleMappingChange = (field: keyof typeof formState.mapping, value: string) => {
    const newMapping = { ...formState.mapping, [field]: value };
    setFormState(prev => ({ ...prev, mapping: newMapping }));
    debouncedUpdate({ mapping: newMapping });
  };
  
  return (
    <form className="connection-properties-form">
      <div className="form-section">
        <h4>Información de la Conexión</h4>
        
        <div className="form-group">
          <label htmlFor="connection-name">Nombre</label>
          <input
            id="connection-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre de la conexión"
          />
        </div>
        
        <div className="form-group readonly">
          <label>Nodo origen</label>
          <input type="text" value={data.sourceNodeId} readOnly />
        </div>
        
        <div className="form-group readonly">
          <label>Nodo destino</label>
          <input type="text" value={data.targetNodeId} readOnly />
        </div>
      </div>
      
      <div className="form-section">
        <h4>Mapeo de Datos</h4>
        
        <div className="form-group">
          <label htmlFor="source-output">Output de origen</label>
          <input
            id="source-output"
            type="text"
            value={formState.mapping.sourceOutput}
            onChange={(e) => handleMappingChange('sourceOutput', e.target.value)}
            placeholder="Campo de salida del nodo origen"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="target-input">Input de destino</label>
          <input
            id="target-input"
            type="text"
            value={formState.mapping.targetInput}
            onChange={(e) => handleMappingChange('targetInput', e.target.value)}
            placeholder="Campo de entrada del nodo destino"
          />
        </div>
        
        <div className="form-group">
          <label>Transformaciones</label>
          <textarea
            value={JSON.stringify(formState.mapping.transformations || [], null, 2)}
            onChange={(e) => {
              try {
                const transformations = JSON.parse(e.target.value);
                handleMappingChange('transformations', transformations);
              } catch (error) {
                // Manejar error de parsing
              }
            }}
            placeholder="Transformaciones aplicadas (JSON)"
            rows={4}
          />
        </div>
      </div>
    </form>
  );
};
```

### Fase 4: Actualizar FlowCanvas para Manejo de Selección (4 horas)

```typescript
// Archivo: src/presentation/components/flow/FlowCanvas.tsx
import React, { useCallback } from 'react';
import { useFlowContext } from '../../context/FlowContext';

const FlowCanvas: React.FC<FlowCanvasProps> = ({ className }) => {
  const { 
    state, 
    selectFlow, 
    selectNode, 
    selectConnection, 
    clearSelection 
  } = useFlowContext();
  
  // Manejar clic en nodos
  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    event.stopPropagation();
    selectNode(node.id);
  }, [selectNode]);
  
  // Manejar clic en conexiones/edges
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    event.stopPropagation();
    selectConnection(edge.id);
  }, [selectConnection]);
  
  // Manejar clic en el canvas (área vacía)
  const handlePaneClick = useCallback(() => {
    selectFlow();
  }, [selectFlow]);
  
  // Manejar selección de múltiples elementos
  const handleSelectionChange = useCallback((elements: any[]) => {
    if (elements.length === 0) {
      clearSelection();
    } else if (elements.length === 1) {
      const element = elements[0];
      if (element.type === 'default') {
        selectNode(element.id);
      } else {
        selectConnection(element.id);
      }
    }
    // Para múltiples elementos, mantener la selección actual
  }, [selectNode, selectConnection, clearSelection]);
  
  return (
    <div className={`flow-canvas-container ${className || ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={CustomConnectionLine}
        // Otras props...
      >
        {/* Componentes existentes */}
      </ReactFlow>
    </div>
  );
};
```

### Fase 5: Estilos CSS (6 horas)

```css
/* Archivo: src/presentation/components/ui/PropertiesPanel.css */
.properties-panel {
  width: 300px;
  height: 100%;
  background: #f8f9fa;
  border-left: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.element-type {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.empty-selection {
  padding: 24px;
  text-align: center;
  color: #6c757d;
}

.empty-selection .hint {
  font-size: 14px;
  font-style: italic;
  margin-top: 8px;
}

/* Estilos para formularios */
.flow-properties-form,
.node-properties-form,
.connection-properties-form {
  padding: 0;
}

.form-section {
  border-bottom: 1px solid #e9ecef;
  padding: 16px;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-group.readonly input {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #495057;
}

.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Animaciones para cambios reactivos */
.form-group input.updating,
.form-group textarea.updating {
  border-color: #28a745;
  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
}

.form-group input.error,
.form-group textarea.error {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

/* Responsive design */
@media (max-width: 768px) {
  .properties-panel {
    width: 100%;
    height: 50vh;
    border-left: none;
    border-top: 1px solid #e9ecef;
  }
}
```

### Fase 6: Pruebas y Validación (6 horas)

#### 6.1 Pruebas Unitarias
```typescript
// Archivo: src/presentation/components/ui/__tests__/PropertiesPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PropertiesPanel } from '../PropertiesPanel';
import { FlowProvider } from '../../../context/FlowContext';
import { Flow } from '../../../../domain/entities/Flow';

const mockFlow = new Flow();
mockFlow.name = 'Test Flow';
mockFlow.description = 'Test Description';

const MockFlowProvider = ({ children }: { children: React.ReactNode }) => (
  <FlowProvider>
    {children}
  </FlowProvider>
);

describe('PropertiesPanel', () => {
  it('should render empty state when no selection', () => {
    render(
      <MockFlowProvider>
        <PropertiesPanel />
      </MockFlowProvider>
    );
    
    expect(screen.getByText('Selecciona un elemento para ver sus propiedades')).toBeInTheDocument();
  });
  
  it('should render flow properties when flow is selected', async () => {
    // Mock del contexto con flujo seleccionado
    const mockContext = {
      state: { currentFlow: mockFlow },
      selection: { type: 'flow', elementId: mockFlow.id },
      updateFlowProperties: jest.fn()
    };
    
    render(
      <MockFlowProvider>
        <PropertiesPanel />
      </MockFlowProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Flow')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    });
  });
  
  it('should update flow properties reactively', async () => {
    const mockUpdateFlowProperties = jest.fn();
    
    // Setup y renderizado...
    
    const nameInput = screen.getByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Updated Flow Name' } });
    
    await waitFor(() => {
      expect(mockUpdateFlowProperties).toHaveBeenCalledWith({
        name: 'Updated Flow Name'
      });
    });
  });
});
```

#### 6.2 Pruebas de Integración
```typescript
// Archivo: src/presentation/components/flow/__tests__/FlowCanvas.integration.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlowCanvas } from '../FlowCanvas';
import { FlowProvider } from '../../../context/FlowContext';

describe('FlowCanvas Integration', () => {
  it('should update properties panel when node is selected', async () => {
    render(
      <FlowProvider>
        <div style={{ display: 'flex' }}>
          <FlowCanvas />
          <PropertiesPanel />
        </div>
      </FlowProvider>
    );
    
    // Simular clic en nodo
    const node = screen.getByTestId('flow-node-1');
    fireEvent.click(node);
    
    // Verificar que el panel muestra propiedades del nodo
    await waitFor(() => {
      expect(screen.getByText('node')).toBeInTheDocument();
      expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    });
  });
  
  it('should update properties panel when canvas is clicked', async () => {
    render(
      <FlowProvider>
        <div style={{ display: 'flex' }}>
          <FlowCanvas />
          <PropertiesPanel />
        </div>
      </FlowProvider>
    );
    
    // Simular clic en canvas
    const canvas = screen.getByTestId('react-flow-pane');
    fireEvent.click(canvas);
    
    // Verificar que el panel muestra propiedades del flujo
    await waitFor(() => {
      expect(screen.getByText('flow')).toBeInTheDocument();
      expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    });
  });
});
```

## Cronograma de Implementación

| Fase | Tarea | Tiempo | Dependencias |
|------|-------|---------|--------------|
| 1 | Extender entidades de dominio | 4h | - |
| 2 | Sistema de selección unificado | 4h | Fase 1 |
| 3 | Actualizar panel de propiedades | 8h | Fase 2 |
| 4 | Actualizar FlowCanvas | 4h | Fase 3 |
| 5 | Implementar estilos CSS | 6h | Fase 4 |
| 6 | Pruebas y validación | 6h | Todas las fases |
| **Total** | **Implementación completa** | **32h** | - |

## Consideraciones Técnicas

### Performance
- **Debouncing**: Implementar debounce en actualizaciones de propiedades para evitar renders excesivos
- **Memoización**: Usar `useMemo` y `useCallback` para optimizar re-renders
- **Lazy Loading**: Cargar formularios de propiedades solo cuando se necesiten

### Persistencia
- **Auto-save**: Implementar guardado automático con debounce
- **Conflict Resolution**: Manejar conflictos si múltiples usuarios editan el mismo flujo
- **History**: Considerar implementar un sistema de historial de cambios

### Validación
- **Client-side**: Validación inmediata en el formulario
- **Business Rules**: Validar reglas de negocio antes de persistir
- **Error Handling**: Manejo robusto de errores con feedback al usuario

### Extensibilidad
- **Plugin System**: Diseñar para que sea fácil añadir nuevos tipos de nodos
- **Custom Properties**: Permitir propiedades personalizadas por tipo de nodo
- **Theming**: Soporte para temas personalizados en el panel de propiedades

## Riesgos y Mitigaciones

### Riesgos Identificados
1. **Complejidad del estado**: Manejar múltiples niveles de selección puede ser complejo
2. **Performance**: Actualizaciones frecuentes pueden afectar la performance
3. **Sincronización**: Mantener sincronizados el canvas y el panel de propiedades

### Mitigaciones
1. **Estado centralizado**: Usar un contexto bien estructurado con acciones claras
2. **Optimización**: Implementar debouncing y memoización
3. **Testing**: Pruebas exhaustivas de integración

## Próximos Pasos

1. **Revisión del análisis**: Validar el enfoque propuesto
2. **Configuración del entorno**: Preparar herramientas de desarrollo
3. **Implementación por fases**: Seguir el cronograma establecido
4. **Revisiones continuas**: Checkpoints regulares para ajustar el plan

## Conclusión

La implementación del sistema de propiedades reactivas es viable y seguirá la arquitectura existente del proyecto. Con una planificación cuidadosa y siguiendo el plan por fases, se puede lograr una implementación robusta y escalable que mejore significativamente la experiencia del usuario.

---

**Última actualización**: 17 de julio de 2025  
**Próxima revisión**: Antes de comenzar la implementación  
**Responsable**: Equipo de desarrollo
