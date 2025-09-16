import type { CanvasState } from '../types';
import { CONFIG, isDevelopment } from '../config/environment';
import { s3Client } from './s3Client';

// Helper to get current user ID from auth context
// In a real app, this would import useAuth hook
function getCurrentUserId(): string {
  // For development mode, use a mock user ID
  if (isDevelopment()) {
    return 'dev-user-id';
  }

  // For stage/production, we'll get this from localStorage for now
  // TODO: Import useAuth hook when we integrate this properly
  const userData = localStorage.getItem('tb365_user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.sub || 'unknown-user';
    } catch (error) {
      console.error('Failed to parse user data:', error);
    }
  }

  return 'unknown-user';
}

export interface ProjectFile {
  projectName: string;
  savedAt: string;
  version: string;
  canvasState: CanvasState;
}

/**
 * Generate a filename for a project file
 */
export function generateProjectFilename(projectName: string): string {
  // Clean the project name but preserve readability
  const cleanName = projectName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file chars
    .replace(/\s+/g, ' '); // Normalize spaces
  
  return `${cleanName}.tb365`;
}

/**
 * Create project file data structure
 */
export function createProjectFile(
  projectName: string, 
  canvasState: CanvasState
): ProjectFile {
  return {
    projectName,
    savedAt: new Date().toISOString(),
    version: '1.0',
    canvasState
  };
}

/**
 * Save project file with environment-aware storage
 */
export async function saveProjectFile(
  projectName: string,
  canvasState: CanvasState
): Promise<string> {
  // Development: Use local "Save As" dialog
  if (isDevelopment()) {
    return await saveProjectFileLocal(projectName, canvasState);
  }

  // Stage/Production: Use S3 cloud storage
  try {
    const userId = getCurrentUserId();
    console.log(`💾 Saving to S3: user=${userId}, project=${projectName}, env=${CONFIG.ENVIRONMENT}`);

    await s3Client.saveProject(userId, projectName, canvasState);
    return projectName;
  } catch (error) {
    console.error('❌ S3 save failed, falling back to local save:', error);
    // Fallback to local save if S3 fails
    return await saveProjectFileLocal(projectName, canvasState);
  }
}

/**
 * Local file save with "Save As" dialog (development mode)
 */
async function saveProjectFileLocal(
  projectName: string,
  canvasState: CanvasState
): Promise<string> {
  const filename = generateProjectFilename(projectName);
  const projectData = createProjectFile(projectName, canvasState);

  try {
    // Try to use the modern File System Access API (Chrome, Edge)
    if ('showSaveFilePicker' in window) {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'TemplateBuilder365 files',
          accept: { 'application/json': ['.tb365'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(projectData, null, 2));
      await writable.close();

      return fileHandle.name;
    }
  } catch (error) {
    // User cancelled or API not supported, fall back to download
    console.log('File picker cancelled or not supported, using download fallback');
  }

  // Fallback: browser download for browsers that don't support File System Access API
  const blob = new Blob([JSON.stringify(projectData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Load project file from user selection (file input)
 */
export async function loadProjectFromFile(file: File): Promise<ProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const projectData = JSON.parse(content);
        
        // Validate file structure
        if (!projectData.canvasState || !projectData.version) {
          throw new Error('Invalid project file format');
        }
        
        resolve(projectData as ProjectFile);
      } catch (error) {
        reject(new Error('Failed to parse project file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read project file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Load available project files (for development)
 */
export async function loadAvailableProjects(): Promise<string[]> {
  try {
    const response = await fetch('/api/list-projects');
    if (!response.ok) {
      throw new Error('Failed to load projects');
    }
    return await response.json();
  } catch (error) {
    // Fallback: return empty list
    console.warn('Could not load project list:', error);
    return [];
  }
}

/**
 * Load a specific project file
 */
export async function loadProjectFile(filename: string): Promise<ProjectFile> {
  try {
    const response = await fetch(`/api/load-project/${filename}`);
    if (!response.ok) {
      throw new Error('Failed to load project');
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Could not load project: ${filename}`);
  }
}

/**
 * Get list of existing project names from localStorage
 * This is a temporary implementation - in production would query server/database
 */
export function getExistingProjectNames(): string[] {
  const savedProjects: string[] = [];
  
  // In a real app, this would query the file system or database
  // For now, we'll simulate with localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('templatebuilder_project_')) {
      const projectName = key.replace('templatebuilder_project_', '');
      savedProjects.push(projectName);
    }
  }
  
  return savedProjects.sort();
}