import { useEffect, useState } from 'react';

export default function SystemInfo() {
  const [info, setInfo] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchInfo = async () => {
    try {
      const res = await fetch('/api/system-info');
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      console.error('❌ Failed to fetch system info:', err);
      setStatusMessage('❌ Failed to fetch system info.');
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    setStatusMessage('🔧 Installing requirements...');

    try {
      const res = await fetch('/api/install-requirements', { method: 'POST' });
      const data = await res.json();
      setStatusMessage(data.message || '⚙️ Installation started...');

      const interval = setInterval(async () => {
        const res = await fetch('/api/system-info');
        const updated = await res.json();
        setInfo(updated);

        const t = updated.tools;
        const allInstalled =
          t.vagrant &&
          t.virtualbox &&
          (updated.platform !== 'linux' || t.ansible);

        if (allInstalled) {
          clearInterval(interval);
          setStatusMessage('✅ All requirements installed successfully!');
          setInstalling(false);
        }
      }, 5000);
    } catch (err) {
      setStatusMessage('❌ Installation failed.');
      setInstalling(false);
    }
  };

  if (!info) return <div className="card">Loading system info...</div>;

  const { platform, provider, tools } = info;

  const missingDeps =
    !tools.vagrant ||
    !tools.virtualbox ||
    (platform === 'linux' && !tools.ansible);

  const renderStatus = (label, value) => (
    <li>{label}: {value ? '✅ Installed' : '❌ Not Installed'}</li>
  );

  return (
    <div className="card">
      <h2>System Info</h2>
      <p><strong>Platform:</strong> {platform}</p>
      <p><strong>Recommended Provider:</strong> {provider}</p>
      <ul>
        {renderStatus('Vagrant', tools.vagrant)}
        {renderStatus('VirtualBox', tools.virtualbox)}
        {platform === 'linux' && renderStatus('Ansible', tools.ansible)}
      </ul>

      {missingDeps && (
        <>
          <button onClick={handleInstall} disabled={installing}>
            {installing ? 'Installing...' : 'Install Requirements'}
          </button>
          {statusMessage && (
            <p style={{ marginTop: '1rem', color: installing ? '#888' : '#007b00' }}>
              {statusMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}
