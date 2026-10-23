import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import FlowMonitoring from './pages/FlowMonitoring';
import TapManagement from './pages/TapManagement';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import SystemInfo from './pages/SystemInfo';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'flow':
        return <FlowMonitoring />;
      case 'timer':
        return <TapManagement />;
      case 'alerts':
        return <Alerts />;
      case 'settings':
        return <Settings />;
      case 'system':
        return <SystemInfo />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
}

export default App;
