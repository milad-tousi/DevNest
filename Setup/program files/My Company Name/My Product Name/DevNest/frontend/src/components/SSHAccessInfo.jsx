import { useEffect, useState } from 'react';

const SSHAccessInfo = ({ token }) => {
  const [info, setInfo] = useState({});
  const [copiedVM, setCopiedVM] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetch('/api/ssh-info', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setInfo(data))
      .catch(err => console.error('Failed to fetch SSH info:', err));
  }, [token]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVM(key);
      setTimeout(() => setCopiedVM(null), 1500);
    });
  };

  if (!Object.keys(info).length) return null;

  return (
    <div className="card">
      <h2>🔐 SSH Access Info</h2>
      <ul>
        {Object.entries(info).map(([vm, { command, web, Grafana, prometheus, adminPassword }]) => (
          <li key={vm} style={{ marginBottom: '20px' }}>
            <strong>{vm}:</strong><br />

            <code style={{ wordBreak: 'break-all' }}>{command}</code>
            <button
              onClick={() => handleCopy(command, vm)}
              style={{
                marginLeft: '10px',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                color: '#007bff'
              }}
              title="Copy SSH command"
            >
              📋
            </button>
            {copiedVM === vm && (
              <span style={{ marginLeft: '5px', color: 'green' }}>Copied!</span>
            )}

            {web && (
              <div style={{ marginTop: '8px' }}>
                <a href={web} target="_blank" rel="noopener noreferrer">
                  🌐 Open Web Interface
                </a>
              </div>
            )}

            {Grafana && (
              <div style={{ marginTop: '8px' }}>
                <a href={Grafana} target="_blank" rel="noopener noreferrer">
                  📊 Open Grafana
                </a>
                <small style={{ display: 'block', marginTop: '4px' }}>
                  (default username/password: <code>admin</code>)
                </small>
              </div>
            )}

            {prometheus && (
              <div style={{ marginTop: '8px' }}>
                <a href={prometheus} target="_blank" rel="noopener noreferrer">
                  📈 Open Prometheus
                </a>
              </div>
            )}

            {adminPassword && (
              <div style={{ marginTop: '8px' }}>
                🔑 <strong>Initial Admin Password:</strong>{' '}
                <code style={{ wordBreak: 'break-all' }}>{adminPassword}</code>
                <button
                  onClick={() => handleCopy(adminPassword, `${vm}-password`)}
                  style={{
                    marginLeft: '10px',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    color: '#007bff'
                  }}
                  title="Copy password"
                >
                  📋
                </button>
                {copiedVM === `${vm}-password` && (
                  <span style={{ marginLeft: '5px', color: 'green' }}>Copied!</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SSHAccessInfo;
