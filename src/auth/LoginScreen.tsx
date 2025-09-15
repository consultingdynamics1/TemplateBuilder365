import React from 'react';
import { useAuth } from './AuthContext';
import './LoginScreen.css';

export const LoginScreen: React.FC = () => {
  const { login, error, isLoading } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>🎨 TemplateBuilder365</h1>
          <p>Professional template design made simple</p>
        </div>

        <div className="login-content">
          <h2>Welcome Back</h2>
          <p>Sign in to access your design workspace</p>

          {error && (
            <div className="login-error">
              <span>⚠️</span>
              <div>
                <strong>Authentication Error</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <button
            className="login-button"
            onClick={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Connecting...
              </>
            ) : (
              <>
                🔑 Sign in with AWS Cognito
              </>
            )}
          </button>

          <div className="login-features">
            <h3>✨ Features</h3>
            <ul>
              <li>🎯 Visual template designer</li>
              <li>🖼️ Drag & drop elements</li>
              <li>📊 Data-driven templates</li>
              <li>💾 Save & export projects</li>
              <li>🔒 Secure cloud storage</li>
            </ul>
          </div>
        </div>

        <div className="login-footer">
          <small>
            Powered by AWS Cognito •
            <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer">
              Built with Claude Code
            </a>
          </small>
        </div>
      </div>
    </div>
  );
};