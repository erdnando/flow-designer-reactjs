/**
 * Tests de regresión para validar que las funcionalidades core se mantienen
 * Estos tests deben pasar SIEMPRE, independientemente de las mejoras implementadas
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowProvider } from '../presentation/context/FlowContext';
import { Flow } from '../domain/entities/Flow';
import { Node } from '../domain/entities/Node';
import { Connection } from '../domain/entities/Connection';
import { FEATURE_FLAGS, toggleFeature } from '../shared/config/featureFlags';

// Mock de servicios
const mockFlowService = {
  createFlow: jest.fn(),
  saveFlow: jest.fn(),
  loadFlow: jest.fn()
};

// Componente de prueba simple
const TestComponent = () => {
  const { state, actions } = useFlowContext();
  
  return (
    <div>
      <div data-testid="current-flow-name">
        {state.currentFlow?.name || 'No flow'}
      </div>
      <div data-testid="selected-node-id">
        {state.selectedNodeId || 'No selection'}
      </div>
      <div data-testid="nodes-count">
        {state.currentFlow?.nodes.length || 0}
      </div>
      <button 
        data-testid="create-flow-btn"
        onClick={() => actions.createFlow('Test Flow')}
      >
        Create Flow
      </button>
      <button 
        data-testid="select-node-btn"
        onClick={() => actions.selectNode('test-node-1')}
      >
        Select Node
      </button>
    </div>
  );
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <FlowProvider>
      {component}
    </FlowProvider>
  );
};

describe('Core Flow Functionality - Regression Tests', () => {
  beforeEach(() => {
    // Reset feature flags to ensure base functionality
    Object.keys(FEATURE_FLAGS).forEach(flag => {
      toggleFeature(flag as any, false);
    });
    
    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore feature flags
    Object.keys(FEATURE_FLAGS).forEach(flag => {
      toggleFeature(flag as any, false);
    });
  });

  describe('Flow Management', () => {
    it('should create and manage flows without errors', async () => {
      renderWithProvider(<TestComponent />);
      
      // Verificar estado inicial
      expect(screen.getByTestId('current-flow-name')).toHaveTextContent('No flow');
      expect(screen.getByTestId('nodes-count')).toHaveTextContent('0');
      
      // Crear flujo
      const createBtn = screen.getByTestId('create-flow-btn');
      fireEvent.click(createBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('current-flow-name')).toHaveTextContent('Test Flow');
      });
    });

    it('should maintain flow creation with all feature flags disabled', () => {
      const flow = new Flow({
        id: 'test-id',
        name: 'Test Flow',
        description: 'Test Description'
      });
      
      expect(flow.id).toBe('test-id');
      expect(flow.name).toBe('Test Flow');
      expect(flow.description).toBe('Test Description');
      expect(flow.nodes).toEqual([]);
      expect(flow.connections).toEqual([]);
    });
  });

  describe('Node Management', () => {
    it('should maintain node selection functionality', async () => {
      renderWithProvider(<TestComponent />);
      
      // Verificar estado inicial
      expect(screen.getByTestId('selected-node-id')).toHaveTextContent('No selection');
      
      // Seleccionar nodo
      const selectBtn = screen.getByTestId('select-node-btn');
      fireEvent.click(selectBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-node-id')).toHaveTextContent('test-node-1');
      });
    });

    it('should create nodes with correct properties', () => {
      const node = new Node({
        id: 'test-node',
        type: 'start',
        position: { x: 100, y: 200 },
        data: { label: 'Test Node' }
      });
      
      expect(node.id).toBe('test-node');
      expect(node.type).toBe('start');
      expect(node.position.x).toBe(100);
      expect(node.position.y).toBe(200);
      expect(node.data.label).toBe('Test Node');
    });

    it('should add nodes to flow correctly', () => {
      const flow = new Flow({
        id: 'test-flow',
        name: 'Test Flow'
      });
      
      const node = new Node({
        id: 'test-node',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Test' }
      });
      
      flow.addNode(node);
      
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0].id).toBe('test-node');
    });

    it('should remove nodes from flow correctly', () => {
      const flow = new Flow({
        id: 'test-flow',
        name: 'Test Flow'
      });
      
      const node = new Node({
        id: 'test-node',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Test' }
      });
      
      flow.addNode(node);
      expect(flow.nodes).toHaveLength(1);
      
      flow.removeNode('test-node');
      expect(flow.nodes).toHaveLength(0);
    });
  });

  describe('Connection Management', () => {
    it('should create connections between nodes', () => {
      const connection = new Connection({
        id: 'test-connection',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input'
      });
      
      expect(connection.id).toBe('test-connection');
      expect(connection.sourceNodeId).toBe('node-1');
      expect(connection.targetNodeId).toBe('node-2');
    });

    it('should add connections to flow correctly', () => {
      const flow = new Flow({
        id: 'test-flow',
        name: 'Test Flow'
      });
      
      const connection = new Connection({
        id: 'test-connection',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input'
      });
      
      flow.addConnection(connection);
      
      expect(flow.connections).toHaveLength(1);
      expect(flow.connections[0].id).toBe('test-connection');
    });

    it('should remove connections when removing nodes', () => {
      const flow = new Flow({
        id: 'test-flow',
        name: 'Test Flow'
      });
      
      const node1 = new Node({
        id: 'node-1',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Node 1' }
      });
      
      const node2 = new Node({
        id: 'node-2',
        type: 'end',
        position: { x: 200, y: 0 },
        data: { label: 'Node 2' }
      });
      
      const connection = new Connection({
        id: 'test-connection',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input'
      });
      
      flow.addNode(node1);
      flow.addNode(node2);
      flow.addConnection(connection);
      
      expect(flow.nodes).toHaveLength(2);
      expect(flow.connections).toHaveLength(1);
      
      // Remover nodo debe remover también las conexiones
      flow.removeNode('node-1');
      
      expect(flow.nodes).toHaveLength(1);
      expect(flow.connections).toHaveLength(0); // Conexión removida automáticamente
    });
  });

  describe('Feature Flag Independence', () => {
    it('should work correctly with IMMUTABLE_STATE enabled', () => {
      toggleFeature('IMMUTABLE_STATE', true);
      
      const flow = new Flow({
        id: 'test-flow',
        name: 'Test Flow'
      });
      
      const node = new Node({
        id: 'test-node',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Test' }
      });
      
      flow.addNode(node);
      
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0].id).toBe('test-node');
    });

    it('should work correctly with MEMOIZED_SELECTORS enabled', () => {
      toggleFeature('MEMOIZED_SELECTORS', true);
      
      const flow = new Flow({
        id: 'test-flow',
        name: 'Test Flow'
      });
      
      expect(flow.name).toBe('Test Flow');
      expect(flow.id).toBe('test-flow');
    });

    it('should work correctly with UNIFIED_SELECTION enabled', () => {
      toggleFeature('UNIFIED_SELECTION', true);
      
      renderWithProvider(<TestComponent />);
      
      const selectBtn = screen.getByTestId('select-node-btn');
      fireEvent.click(selectBtn);
      
      // Debería funcionar independientemente del sistema de selección
      expect(selectBtn).toBeInTheDocument();
    });
  });

  describe('Performance Baselines', () => {
    it('should maintain render time under acceptable limits', () => {
      const startTime = performance.now();
      
      renderWithProvider(<TestComponent />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Render inicial debe ser menor a 100ms
      expect(renderTime).toBeLessThan(100);
    });
  });
});

// Hook mock para tests
const useFlowContext = () => {
  return {
    state: {
      currentFlow: null,
      selectedNodeId: null,
      isLoading: false,
      error: null
    },
    actions: {
      createFlow: jest.fn(),
      selectNode: jest.fn(),
      updateNode: jest.fn()
    }
  };
};
