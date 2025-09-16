import React from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAuth } from '../../auth';
import type { ToolType } from '../../types/index';
import { saveProjectFile, loadProjectFromFile, getExistingProjectNames } from '../../utils/projectFiles';
import { SaveDialog } from '../SaveDialog/SaveDialog';
import './Toolbar.css';

interface ToolButtonProps {
  tool: ToolType;
  isActive: boolean;
  icon: string;
  title: string;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  isActive,
  icon,
  title,
  onClick
}) => (
  <button
    className={`tool-button ${isActive ? 'active' : ''}`}
    onClick={onClick}
    title={title}
    type="button"
  >
    <span className="tool-icon">{icon}</span>
  </button>
);

const UserInfo: React.FC = () => {
  const { user, logout } = useAuth();

  // Extract display name from user data
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const isRealUser = user && !user.email.includes('templatebuilder365.com');

  return (
    <div className="user-info">
      <div className="user-details">
        <span className="user-email" title={user?.email}>
          {displayName}
        </span>
        <small className="user-status">
          {isRealUser ? 'Signed In' : 'Demo Mode'}
        </small>
      </div>
      <button
        className="logout-button"
        onClick={logout}
        title="Sign Out"
        type="button"
      >
        🚪
      </button>
    </div>
  );
};

export const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    selectedElementId,
    deleteElement,
    duplicateElement,
    bringToFront,
    sendToBack,
    zoom,
    setZoom,
    fitToScreen,
    snapToGrid,
    toggleSnapToGrid,
    clearCanvas,
    loadCanvasState,
    // Get complete canvas state for saving
    elements,
    canvasSize,
    editingElementId
  } = useCanvasStore();

  const [saveStatus, setSaveStatus] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadStatus, setLoadStatus] = React.useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [currentDocumentName, setCurrentDocumentName] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveProject = () => {
    // Generate default name if none exists
    if (!currentDocumentName) {
      const firstTextElement = elements.find(el => el.type === 'text');
      const defaultName = firstTextElement?.content || 'Untitled Template';
      setCurrentDocumentName(defaultName);
    }
    
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async (filename: string) => {
    setIsSaving(true);
    setSaveStatus('Saving...');
    setShowSaveDialog(false);
    
    try {
      // Collect complete canvas state
      const canvasState = {
        elements,
        selectedElementId,
        editingElementId,
        activeTool,
        canvasSize,
        zoom,
        snapToGrid,
        gridSize: 20 // Default grid size
      };

      const savedFilename = await saveProjectFile(filename, canvasState);
      setCurrentDocumentName(filename);
      setSaveStatus(`Saved: ${savedFilename}`);
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Save failed');
      setTimeout(() => setSaveStatus(''), 3000);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const handleNewProject = () => {
    if (confirm('Create a new document? This will clear the current canvas.')) {
      clearCanvas();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadStatus('Loading...');
    
    try {
      const projectData = await loadProjectFromFile(file);
      loadCanvasState(projectData.canvasState);
      setCurrentDocumentName(projectData.projectName);
      setLoadStatus(`Loaded: ${projectData.projectName}`);
      
      setTimeout(() => setLoadStatus(''), 3000);
    } catch (error) {
      setLoadStatus('Load failed');
      setTimeout(() => setLoadStatus(''), 3000);
      console.error('Load error:', error);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tools = [
    { tool: 'select' as ToolType, icon: '↖', title: 'Select Tool (V)' },
    { tool: 'text' as ToolType, icon: 'T', title: 'Text Tool (T)' },
    { tool: 'rectangle' as ToolType, icon: '⬜', title: 'Rectangle Tool (R)' },
    { tool: 'image' as ToolType, icon: '🖼', title: 'Image Tool (I)' },
    { tool: 'table' as ToolType, icon: '⚏', title: 'Table Tool (B)' },
  ];

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  const handleFitToScreen = () => {
    // Get viewport size (accounting for toolbar and properties panel)
    const viewport = {
      width: window.innerWidth - 400, // Subtract properties panel width
      height: window.innerHeight - 60  // Subtract toolbar height
    };
    fitToScreen(viewport);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'i':
          setActiveTool('image');
          break;
        case 'b':
          setActiveTool('table');
          break;
        case 'delete':
        case 'backspace':
          if (selectedElementId) {
            deleteElement(selectedElementId);
          }
          break;
        case 'd':
          if (e.ctrlKey && selectedElementId) {
            e.preventDefault();
            duplicateElement(selectedElementId);
          }
          break;
        case 's':
          if (e.ctrlKey) {
            e.preventDefault();
            handleSaveProject();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, setActiveTool, deleteElement, duplicateElement, handleSaveProject]);

  return (
    <div className="toolbar">
      {/* Save/Load Section */}
      <div className="toolbar-section">
        <div className="tool-group">
          <button
            className="tool-button"
            onClick={handleNewProject}
            title="New Document (Clear Canvas)"
            type="button"
          >
            <span className="tool-icon">📄</span>
          </button>
          <button
            className="tool-button"
            onClick={handleSaveProject}
            disabled={isSaving}
            title="Save Project (Ctrl+S)"
            type="button"
          >
            <span className="tool-icon">{isSaving ? '⏳' : '💾'}</span>
          </button>
          <button
            className="tool-button"
            onClick={handleLoadProject}
            title="Load Project"
            type="button"
          >
            <span className="tool-icon">📁</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".tb365"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {(saveStatus || loadStatus) && (
            <span style={{ 
              fontSize: '0.75rem', 
              color: (saveStatus || loadStatus).includes('failed') ? '#f44336' : '#4caf50',
              marginLeft: '8px',
              whiteSpace: 'nowrap'
            }}>
              {saveStatus || loadStatus}
            </span>
          )}
        </div>
      </div>

      {/* Tools Section */}
      <div className="toolbar-section">
        <div className="tool-group">
          {tools.map(({ tool, icon, title }) => (
            <ToolButton
              key={tool}
              tool={tool}
              isActive={activeTool === tool}
              icon={icon}
              title={title}
              onClick={() => setActiveTool(tool)}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="tool-group">
          <button
            className="tool-button"
            onClick={() => selectedElementId && bringToFront(selectedElementId)}
            disabled={!selectedElementId}
            title="Bring to Front"
            type="button"
          >
            <span className="tool-icon">⬆️</span>
          </button>
          <button
            className="tool-button"
            onClick={() => selectedElementId && sendToBack(selectedElementId)}
            disabled={!selectedElementId}
            title="Send to Back"
            type="button"
          >
            <span className="tool-icon">⬇️</span>
          </button>
          <button
            className="tool-button"
            onClick={() => selectedElementId && duplicateElement(selectedElementId)}
            disabled={!selectedElementId}
            title="Duplicate (Ctrl+D)"
            type="button"
          >
            <span className="tool-icon">⧉</span>
          </button>
          <button
            className="tool-button danger"
            onClick={() => selectedElementId && deleteElement(selectedElementId)}
            disabled={!selectedElementId}
            title="Delete (Del)"
            type="button"
          >
            <span className="tool-icon">🗑</span>
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <div className="tool-group">
          <label className="zoom-control">
            <span>Zoom:</span>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={zoom}
              onChange={handleZoomChange}
            />
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          </label>
          <button
            className="tool-button"
            onClick={handleFitToScreen}
            title="Fit to Screen"
            type="button"
          >
            <span className="tool-icon">🔍</span>
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <div className="tool-group">
          <button
            className={`tool-button ${snapToGrid ? 'active' : ''}`}
            onClick={toggleSnapToGrid}
            title="Toggle Snap to Grid"
            type="button"
          >
            <span className="tool-icon">⊞</span>
          </button>
        </div>
      </div>

      {/* User Section */}
      <div className="toolbar-section user-section">
        <UserInfo />
      </div>

      <SaveDialog
        isOpen={showSaveDialog}
        currentName={currentDocumentName || 'Untitled Template'}
        existingFiles={getExistingProjectNames()}
        onSave={handleSaveConfirm}
        onCancel={() => setShowSaveDialog(false)}
      />
    </div>
  );
};