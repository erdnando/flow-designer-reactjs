import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import FlowCanvas from '../flow/FlowCanvas';
import NodePalette from '../ui/NodePalette';
import PropertiesPanel from '../ui/PropertiesPanel';
import './MainLayout.css';

// Componente interno que usa hooks de ReactFlow
const MainLayoutContent: React.FC = () => {
  return (
    <div className="main-layout">
      {/* Header */}
      <header className="main-layout__header">
        <div className="main-layout__header-content">
          <div className="main-layout__logo">
            <h1 className="main-layout__title">⚡ Flow Designer</h1>
            <span className="main-layout__subtitle">Visual Process Builder</span>
          </div>
          
          <div className="main-layout__actions">
            <button className="main-layout__btn main-layout__btn--secondary">
              💾 Save
            </button>
            <button className="main-layout__btn main-layout__btn--primary">
              ▶️ Run Flow
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-layout__main">
        {/* Node Palette */}
        <aside 
          className="main-layout__sidebar main-layout__sidebar--left"
          style={{ width: 280 }}
        >
          <NodePalette />
        </aside>

        {/* Canvas */}
        <section className="main-layout__canvas">
          <FlowCanvas />
        </section>

        {/* Properties Panel */}
        <aside 
          className="main-layout__sidebar main-layout__sidebar--right"
          style={{ width: 320 }}
        >
          <PropertiesPanel />
        </aside>
      </main>
    </div>
  );
};

const MainLayout: React.FC = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <MainLayoutContent />
      </ReactFlowProvider>
    </DndProvider>
  );
};

export default MainLayout;
