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

  const pageProps = { currentPage, onPageChange: setCurrentPage };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...pageProps} />;
      case 'flow':
        return <FlowMonitoring {...pageProps} />;
      case 'timer':
        return <TapManagement {...pageProps} />;
      case 'alerts':
        return <Alerts {...pageProps} />;
      case 'settings':
        return <Settings {...pageProps} />;
      case 'system':
        return <SystemInfo {...pageProps} />;
      default:
        return <Dashboard {...pageProps} />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
}

export default App;
