import React from 'react';
import './SaveDialog.css';

interface SaveDialogProps {
  isOpen: boolean;
  currentName: string;
  existingFiles: string[];
  onSave: (filename: string) => void;
  onCancel: () => void;
}

export const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  currentName,
  existingFiles,
  onSave,
  onCancel
}) => {
  const [filename, setFilename] = React.useState(currentName);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFilename(currentName);
      setShowOverwriteConfirm(false);
      // Focus and select text after dialog renders
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, currentName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleSave();
    }
  };

  const fileExists = existingFiles.includes(filename);

  const handleSave = () => {
    if (!filename.trim()) return;
    
    if (fileExists && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true);
      return;
    }

    onSave(filename.trim());
  };

  const handleOverwrite = () => {
    onSave(filename.trim());
  };

  const generateNewName = () => {
    let counter = 1;
    let baseName = filename.replace(/\s*\(\d+\)$/, ''); // Remove existing counter
    let newName = `${baseName} (${counter})`;
    
    while (existingFiles.includes(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }
    
    setFilename(newName);
    setShowOverwriteConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="save-dialog-overlay" onClick={onCancel}>
      <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="save-dialog-header">
          <h2>Save Document</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <div className="save-dialog-content">
          <div className="filename-input-group">
            <label htmlFor="filename">Document Name:</label>
            <input
              ref={inputRef}
              id="filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter document name..."
              autoComplete="off"
            />
            {fileExists && !showOverwriteConfirm && (
              <div className="file-exists-warning">
                ⚠️ A file with this name already exists
              </div>
            )}
          </div>

          {existingFiles.length > 0 && (
            <div className="existing-files">
              <h4>Existing Files:</h4>
              <div className="file-list">
                {existingFiles.slice(0, 5).map((file) => (
                  <div 
                    key={file} 
                    className={`file-item ${file === filename ? 'current' : ''}`}
                    onClick={() => setFilename(file)}
                  >
                    {file}
                  </div>
                ))}
                {existingFiles.length > 5 && (
                  <div className="file-item-more">
                    ... and {existingFiles.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {showOverwriteConfirm && (
            <div className="overwrite-confirm">
              <p>⚠️ <strong>"{filename}"</strong> already exists.</p>
              <p>Do you want to overwrite it?</p>
              <div className="overwrite-buttons">
                <button className="btn-secondary" onClick={() => setShowOverwriteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn-secondary" onClick={generateNewName}>
                  Rename
                </button>
                <button className="btn-danger" onClick={handleOverwrite}>
                  Overwrite
                </button>
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
            onClick={handleSave}
            disabled={!filename.trim() || showOverwriteConfirm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};