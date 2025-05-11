import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import VMSelector from './components/VMSelector';
import SystemInfo from './components/SystemInfo';
import SSHAccessInfo from './components/SSHAccessInfo';
import SignupForm from './components/SignupForm';

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!sessionStorage.getItem('visited')) {
      localStorage.removeItem('token');
      sessionStorage.setItem('visited', 'true');
    }

    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);


  const handleLoginSuccess = ({ token, username }) => {
    setToken(token);
    setUsername(username);
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  return (
    <div className="app-container">
      {!token && (
        <div className="intro-section" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>What is DevNest</h1>
          <p style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', color: '#444' }}>
            Build and test your DevOps infrastructure with one click.<br />
            <strong>DevNest</strong> lets you set up full-stack environments like Kubernetes, Jenkins, and Prometheus — locally, reliably, and fast.
          </p>
        </div>
      )}

      {token ? (
        <>
          <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ paddingLeft: '1rem' }}>
              👋 Welcome, <strong>{username}</strong>
            </span>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </div>

          <div className="main-content">
            <div className="card"><SystemInfo /></div>
            <div className="card"><VMSelector token={token} /></div>
            <div className="card"><SSHAccessInfo token={token} /></div>
          </div>
        </>
      ) : (
        <div className="auth-container">
          <div className="card">
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
          <div className="card">
            <h2>Create User</h2>
            <SignupForm onSignupSuccess={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
