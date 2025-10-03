import React from 'react';
import { AuthProvider, useAuth, LoginScreen } from './auth';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import TestImageAPI from './components/TestImageAPI/TestImageAPI';
import './App.css'

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = React.useState(window.location.hash);

  // Listen for hash changes to handle routing
  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading TemplateBuilder365...</p>
        </div>
      </div>
    );
  }

  // Check for test route (hash-based routing for SPA)
  const currentPath = window.location.pathname;
  const currentHash = currentRoute;

  if (currentPath === '/test-image-api' || currentHash === '#test-image-api') {
    return <TestImageAPI />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="app-content">
        <div className="canvas-container">
          <Canvas />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App
