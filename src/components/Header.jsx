import React from 'react';
import './Header.css';

const Header = ({ pageTitle, mode, connectionStatus }) => {
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const [time, setTime] = React.useState(getCurrentTime());
  const [date, setDate] = React.useState(getCurrentDate());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(getCurrentTime());
      setDate(getCurrentDate());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{pageTitle}</h1>
      </div>

      <div className="header-right">
        <div className="status-indicators">
          <div className={`mode-badge ${mode.toLowerCase()}`}>
            {mode === 'DEMO_MODE' ? '🔶 DEMO MODE' : '🟢 HARDWARE MODE'}
          </div>
          
          <div className={`connection-badge ${connectionStatus.toLowerCase()}`}>
            {connectionStatus === 'CONNECTED' ? '🔗 Connected' : 
             connectionStatus === 'CONNECTING' ? '⏳ Connecting...' : 
             '❌ Not Connected'}
          </div>
        </div>

        <div className="datetime">
          <div className="time">{time}</div>
          <div className="date">{date}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
