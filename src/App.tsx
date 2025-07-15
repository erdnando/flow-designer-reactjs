import React from 'react';
import { FlowProvider } from './presentation/context/FlowContext';
import FlowDesignerPage from './presentation/pages/FlowDesignerPage';
import './App.css';

const App: React.FC = () => {
  return (
    <FlowProvider>
      <div className="App">
        <FlowDesignerPage />
      </div>
    </FlowProvider>
  );
};

export default App;
