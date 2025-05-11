import { useEffect, useRef, useState } from 'react';

const LogViewer = () => {
  const [logs, setLogs] = useState('');
  const [streaming, setStreaming] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    let eventSource;

    if (!!window.EventSource) {
      eventSource = new EventSource('/api/create-lab?minikube=true&jenkins=true&monitoring=true');
      setStreaming(true);

      eventSource.onmessage = (e) => {
        setLogs(prev => prev + e.data + '\n');
        scrollToBottom();
      };

      eventSource.onerror = (e) => {
        console.warn('🔌 SSE connection closed');
        eventSource.close();
        setStreaming(false);
        loadSavedLog();
      };
    } else {
      console.error('🚫 Your browser does not support Server-Sent Events.');
      loadSavedLog();
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const loadSavedLog = () => {
    fetch('/api/install-log')
      .then(res => res.text())
      .then(setLogs)
      .catch(err => console.error('❌ Failed to fetch saved logs', err));
  };

  const scrollToBottom = () => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  return (
    <div className="card">
      <h2>📜 Installation Log</h2>
      <div
        ref={logRef}
        style={{
          background: '#111',
          color: '#0f0',
          padding: '1rem',
          height: '400px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          borderRadius: '8px'
        }}>
        <pre>{logs || '⏳ Waiting for log data...'}</pre>
      </div>
    </div>
  );
};

export default LogViewer;
