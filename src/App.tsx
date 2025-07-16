import React from 'react';
import { FlowProvider } from './presentation/context/FlowContext';
import { NotificationProvider } from './presentation/context/NotificationContext';
import FlowDesignerPage from './presentation/pages/FlowDesignerPage';
import NotificationContainer from './presentation/components/ui/NotificationContainer';
import './App.css';

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <FlowProvider>
        <div className="App">
          <FlowDesignerPage />
          <NotificationContainer />
        </div>
      </FlowProvider>
    </NotificationProvider>
  );
};

export default App;
