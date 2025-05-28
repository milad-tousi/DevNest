import { useState } from 'react';

const VMSelector = ({ token }) => {
  const [selectedVMs, setSelectedVMs] = useState({
    minikube: false,
    jenkins: false,
    monitoring: false,
  });

  const [logLines, setLogLines] = useState([]);
  const [status, setStatus] = useState('');
  const [sshData, setSshData] = useState({});

  const handleChange = (e) => {
    setSelectedVMs({
      ...selectedVMs,
      [e.target.name]: e.target.checked,
    });
  };

  const handleSubmit = async () => {
    setLogLines([]);
    setStatus('⏳ Creating lab...');
    setSshData({});

    const query = new URLSearchParams(
      Object.entries(selectedVMs).reduce((acc, [k, v]) => {
        acc[k] = v.toString();
        return acc;
      }, {})
    ).toString();

    // 📡 دریافت URL استریم از سرور
    const res = await fetch(`/api/create-lab-url?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      setStatus('❌ Failed to initiate lab setup.');
      return;
    }

    const { streamUrl } = await res.json();

    // ❗ اضافه کردن توکن به URL برای EventSource
    const fullStreamUrl = `${streamUrl}&token=${token}`;

    const eventSource = new EventSource(fullStreamUrl);

    eventSource.onmessage = (event) => {
      const msg = event.data;
      setLogLines((prev) => [...prev, msg]);

      if (msg.includes('🏁 Vagrant finished')) {
        setStatus('✅ Lab setup completed!');
        eventSource.close();

        // 🚀 دریافت اطلاعات SSH
        fetch('/api/ssh-info', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((res) => res.json())
          .then((data) => setSshData(data))
          .catch(() => console.error('Failed to fetch SSH info'));
      }
    };

    eventSource.onerror = (err) => {
      console.error('❌ SSE connection error:', err);
      setStatus('❌ Error streaming logs.');
      eventSource.close();
    };
  };

  return (
    <div className="vm-selector">
      <h2>Select Services</h2>
      <label>
        <input type="checkbox" name="minikube" onChange={handleChange} />
        Minikube
      </label>
      <label>
        <input type="checkbox" name="jenkins" onChange={handleChange} />
        Jenkins
      </label>
      <label>
        <input type="checkbox" name="monitoring" onChange={handleChange} />
        Prometheus + Grafana
      </label>

      <br /><br />
      <button onClick={handleSubmit}>🚀 Create Lab</button>

      {status && <p style={{ marginTop: '1rem' }}>{status}</p>}

      {logLines.length > 0 && (
        <pre style={{
          background: 'black',
          color: 'lime',
          padding: '1rem',
          marginTop: '1rem',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '0.8rem',
          borderRadius: '4px'
        }}>
          {logLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </pre>
      )}

      {Object.keys(sshData).length > 0 && (
        <div style={{
          background: '#fff',
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '6px',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          fontSize: '0.9rem'
        }}>
          <h3>SSH Access Info</h3>
          <ul style={{ paddingLeft: '1.2rem' }}>
            {Object.entries(sshData).map(([vm, { ip, command, web, Grafana, prometheus }]) => (
              <li key={vm} style={{ marginBottom: '1rem' }}>
                <strong>{vm}</strong><br />
                {ip && <div>📡 <code>{ip}</code></div>}
                <div>🔐 <code>{command}</code></div>
                {web && <div>🧩 Web UI: <a href={web} target="_blank" rel="noreferrer">{web}</a></div>}
                {Grafana && <div>📊 Grafana: <a href={Grafana} target="_blank" rel="noreferrer">{Grafana}</a></div>}
                {prometheus && <div>📈 Prometheus: <a href={prometheus} target="_blank" rel="noreferrer">{prometheus}</a></div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VMSelector;
