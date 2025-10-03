import React from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAuth } from '../../auth';
import { CONFIG, isDevelopment } from '../../config/environment';
import type { ToolType } from '../../types/index';
import { saveProjectFile, loadProjectFromFile, getExistingProjectNames, loadProjectFromStorage, getCloudProjectNames } from '../../utils/projectFiles';
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
    editingElementId,
    storageMode,
    setStorageMode
  } = useCanvasStore();

  const { token } = useAuth();
  const [saveStatus, setSaveStatus] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadStatus, setLoadStatus] = React.useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [showLoadDialog, setShowLoadDialog] = React.useState(false);
  const [currentDocumentName, setCurrentDocumentName] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [exportStatus, setExportStatus] = React.useState<string>('');
  const [isExporting, setIsExporting] = React.useState(false);

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
        gridSize: 20, // Default grid size
        storageMode
      };

      const savedFilename = await saveProjectFile(filename, canvasState, storageMode);
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
    // In development mode, always use local file picker (no cloud storage)
    if (isDevelopment()) {
      fileInputRef.current?.click();
    } else if (storageMode === 'cloud') {
      setShowLoadDialog(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleLoadFromCloud = async (projectName: string) => {
    setLoadStatus('Loading from cloud...');
    setShowLoadDialog(false);

    try {
      const projectData = await loadProjectFromStorage(projectName, 'cloud');
      loadCanvasState(projectData.canvasState);
      setCurrentDocumentName(projectData.projectName);
      setLoadStatus(`Loaded: ${projectData.projectName}`);

      setTimeout(() => setLoadStatus(''), 3000);
    } catch (error) {
      setLoadStatus('Cloud load failed');
      setTimeout(() => setLoadStatus(''), 3000);
      console.error('Cloud load error:', error);
    }
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

  // Export handlers
  const handleExportHTML = async () => {
    if (elements.length === 0) {
      setExportStatus('No elements to export');
      setTimeout(() => setExportStatus(''), 3000);
      return;
    }

    setIsExporting(true);
    setExportStatus('Converting to HTML...');

    try {
      // Prepare canvas state - process blob images to Base64 if in development
      let processedCanvasState = { elements, canvasSize };

      console.log('🔍 HTML EXPORT DEBUG: Starting HTML export workflow');
      console.log('🔍 HTML EXPORT DEBUG: isDevelopment():', isDevelopment());
      console.log('🔍 HTML EXPORT DEBUG: Initial canvas state elements:', elements.length);

      // Debug initial image elements state
      const initialImageElements = elements.filter(element => element.type === 'image');
      console.log('🔍 HTML EXPORT DEBUG: Initial image elements:', initialImageElements.length);
      initialImageElements.forEach((img, index) => {
        console.log(`🔍 HTML EXPORT DEBUG: Initial Image ${index + 1} - ID: ${img.id}, src: "${img.src}"`);
      });

      if (isDevelopment()) {
        // Development mode: Images are already Base64, no processing needed
        setExportStatus('Images ready for export...');
      }

      // Prepare TB365 data format with processed images
      const tb365Data = {
        projectName: currentDocumentName || 'Untitled Template',
        version: '1.0',
        canvasState: processedCanvasState
      };

      console.log('🔍 HTML EXPORT DEBUG: Final TB365 data being sent to converter:');
      console.log('🔍 HTML EXPORT DEBUG: Project:', tb365Data.projectName);
      console.log('🔍 HTML EXPORT DEBUG: Canvas elements:', tb365Data.canvasState.elements.length);

      // Debug final image URLs being sent
      const finalImageElements = tb365Data.canvasState.elements.filter(element => element.type === 'image');
      console.log('🔍 HTML EXPORT DEBUG: Final images being sent to converter:', finalImageElements.length);
      finalImageElements.forEach((img, index) => {
        console.log(`🔍 HTML EXPORT DEBUG: Final Image ${index + 1} - ID: ${img.id}, src: "${img.src ? img.src.substring(0, 50) + '...' : 'Empty'}"`);
      });

      // Call our conversion API (for development, we'll use the local mock server)
      const converterEndpoint = isDevelopment()
        ? 'http://localhost:3001/convert'
        : `${CONFIG.CONVERTER_ENDPOINT}/convert`;

      // Prepare headers - skip authentication in development mode
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Only add authorization header if we have a real token (not development)
      if (!isDevelopment() && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(converterEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tb365Data,
          options: {}
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      // Download the HTML file
      downloadHTML(result.htmlResult.html, tb365Data.projectName);

      setExportStatus(`Exported: ${tb365Data.projectName}.html`);
      setTimeout(() => setExportStatus(''), 3000);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('Export failed');
      setTimeout(() => setExportStatus(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (elements.length === 0) {
      setExportStatus('No elements to export');
      setTimeout(() => setExportStatus(''), 3000);
      return;
    }

    // First export to HTML, then convert to PDF client-side
    handleExportHTML().then(() => {
      setExportStatus('Opening PDF preview...');

      // For now, we'll use the browser's print dialog
      // This allows the user to save as PDF
      setTimeout(() => {
        window.print();
        setExportStatus('Use browser print dialog to save as PDF');
        setTimeout(() => setExportStatus(''), 5000);
      }, 1000);
    });
  };

  // Helper function to download HTML file
  const downloadHTML = (htmlContent: string, filename: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

        {/* Storage Mode Toggle - hidden in development */}
        {!isDevelopment() && (
          <div className="tool-group storage-mode">
            <button
              className={`storage-toggle-button ${storageMode === 'cloud' ? 'cloud-mode' : 'local-mode'}`}
              onClick={() => setStorageMode(storageMode === 'cloud' ? 'local' : 'cloud')}
              title={storageMode === 'cloud' ? 'Switch to Local Storage' : 'Switch to Cloud Storage'}
              type="button"
            >
              <span className="storage-icon">
                {storageMode === 'cloud' ? '⬆️' : '⬇️'}
              </span>
            </button>
            <span className="storage-label">
              {storageMode === 'cloud' ? 'Cloud Storage' : 'Local Files'}
            </span>
          </div>
        )}

      </div>

      {/* Export Section */}
      <div className="toolbar-section">
        <div className="tool-group">
          <button
            className="tool-button"
            onClick={handleExportHTML}
            disabled={isExporting || elements.length === 0}
            title="Export to HTML"
            type="button"
          >
            <span className="tool-icon">{isExporting ? '⏳' : '🌐'}</span>
          </button>
          <button
            className="tool-button"
            onClick={handleExportPDF}
            disabled={isExporting || elements.length === 0}
            title="Export to PDF"
            type="button"
          >
            <span className="tool-icon">📄</span>
          </button>
          {exportStatus && (
            <span style={{
              fontSize: '0.75rem',
              color: exportStatus.includes('failed') ? '#f44336' : '#4caf50',
              marginLeft: '8px',
              whiteSpace: 'nowrap'
            }}>
              {exportStatus}
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


      {/* Development Tools - show in development and stage mode for testing */}
      {(isDevelopment() || window.location.hostname.includes('cloudfront.net')) && (
        <div className="toolbar-section">
          <div className="tool-group">
            <button
              className="tool-button dev-tool"
              onClick={() => {
                // Navigate to test interface using hash routing
                window.location.hash = '#test-image-api';
              }}
              title="Test Image API"
              type="button"
            >
              <span className="tool-icon">🧪</span>
            </button>
          </div>
        </div>
      )}

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

      {/* Load Dialog for Cloud Storage */}
      {showLoadDialog && (
        <LoadDialog
          isOpen={showLoadDialog}
          storageMode={storageMode}
          onLoad={handleLoadFromCloud}
          onCancel={() => setShowLoadDialog(false)}
        />
      )}
    </div>
  );
};

// Simple LoadDialog component
interface LoadDialogProps {
  isOpen: boolean;
  storageMode: 'local' | 'cloud';
  onLoad: (projectName: string) => void;
  onCancel: () => void;
}

const LoadDialog: React.FC<LoadDialogProps> = ({
  isOpen,
  storageMode,
  onLoad,
  onCancel
}) => {
  const [projects, setProjects] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen && storageMode === 'cloud') {
      setLoading(true);
      getCloudProjectNames()
        .then(projectNames => {
          setProjects(projectNames);
          if (projectNames.length > 0) {
            setSelectedProject(projectNames[0]);
          }
        })
        .catch(error => {
          console.error('Failed to load project list:', error);
          setProjects([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, storageMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && selectedProject) {
      onLoad(selectedProject);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="save-dialog-overlay" onClick={onCancel}>
      <div className="save-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="save-dialog-header">
          <h2>Load Project</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <div className="save-dialog-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              No projects found in cloud storage.
            </div>
          ) : (
            <div className="existing-files">
              <h4>Available Projects:</h4>
              <div className="file-list">
                {projects.map((project) => (
                  <div
                    key={project}
                    className={`file-item ${project === selectedProject ? 'current' : ''}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    {project}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="save-dialog-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => selectedProject && onLoad(selectedProject)}
            disabled={!selectedProject || loading}
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
};