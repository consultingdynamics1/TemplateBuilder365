import type { CanvasState, StorageMode } from '../types';
import { CONFIG, isDevelopment } from '../config/environment';
// import { s3Client } from './s3Client';
import {
  saveProjectToAPI,
  loadProjectFromAPI,
  listProjectsFromAPI,
  deleteProjectFromAPI
} from './apiClient';

// Helper to get current user ID from auth context
// In a real app, this would import useAuth hook
function _getCurrentUserId(): string {
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
 * Save project file with storage mode-aware routing
 */
export async function saveProjectFile(
  projectName: string,
  canvasState: CanvasState,
  storageMode?: StorageMode
): Promise<string> {
  // Use storage mode from parameter or fall back to environment-based logic
  // If API_ENDPOINT points to AWS, use cloud storage even in development
  const useCloudStorage = storageMode === 'cloud' ||
    (!storageMode && (CONFIG.API_ENDPOINT.includes('amazonaws.com') || !isDevelopment()));

  // Local storage mode: Use "Save As" dialog
  if (!useCloudStorage) {
    console.log(`💾 Saving locally: project=${projectName}, mode=${storageMode || 'auto-local'}`);
    return await saveProjectFileLocal(projectName, canvasState);
  }

  // Cloud storage mode: Use Lambda API endpoints
  try {
    console.log(`☁️ Saving to cloud via API: project=${projectName}, env=${CONFIG.ENVIRONMENT}`);

    const result = await saveProjectToAPI(projectName, canvasState);
    console.log(`✅ Cloud save successful: ${result.message} (version ${result.version})`);
    return projectName;
  } catch (error) {
    console.error('❌ Cloud save failed, falling back to local save:', error);
    // Fallback to local save if cloud fails
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
 * Get list of existing project names from localStorage or cloud storage
 */
export function getExistingProjectNames(): string[] {
  const savedProjects: string[] = [];

  // For local storage mode, get from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('templatebuilder_project_')) {
      const projectName = key.replace('templatebuilder_project_', '');
      savedProjects.push(projectName);
    }
  }

  return savedProjects.sort();
}

/**
 * Get list of existing cloud project names
 */
export async function getCloudProjectNames(): Promise<string[]> {
  try {
    console.log('☁️ Loading project list from cloud via API');

    const result = await listProjectsFromAPI();
    const projectNames = result.projects.map(p => p.name);

    console.log(`✅ Found ${projectNames.length} cloud projects`);
    return projectNames.sort();
  } catch (error) {
    console.error('❌ Cloud project list failed:', error);
    return [];
  }
}

/**
 * Load project from cloud storage or local storage based on storage mode
 */
export async function loadProjectFromStorage(
  projectName: string,
  storageMode: StorageMode
): Promise<ProjectFile> {
  if (storageMode === 'cloud') {
    return await loadProjectFromCloud(projectName);
  } else {
    return await loadProjectFromLocal(projectName);
  }
}

/**
 * Load project from cloud storage via Lambda API
 */
async function loadProjectFromCloud(projectName: string): Promise<ProjectFile> {
  try {
    console.log(`☁️ Loading from cloud via API: project=${projectName}`);

    const result = await loadProjectFromAPI(projectName);

    // Transform API response to ProjectFile format
    const projectFile: ProjectFile = {
      projectName: result.projectName,
      savedAt: result.savedAt,
      version: result.version,
      canvasState: result.canvasState
    };

    console.log(`✅ Cloud load successful: ${projectFile.projectName} (version ${projectFile.version})`);
    return projectFile;
  } catch (error) {
    console.error('❌ Cloud load failed:', error);
    throw error;
  }
}

/**
 * Load project from local storage (placeholder for future implementation)
 */
async function loadProjectFromLocal(projectName: string): Promise<ProjectFile> {
  try {
    console.log(`💾 Loading from localStorage: project=${projectName}`);

    const storedData = localStorage.getItem(`templatebuilder_project_${projectName}`);
    if (!storedData) {
      throw new Error('Project not found in local storage');
    }

    return JSON.parse(storedData) as ProjectFile;
  } catch (error) {
    console.error('❌ Local load failed:', error);
    throw error;
  }
}

/**
 * Delete project from storage based on storage mode
 */
export async function deleteProject(
  projectName: string,
  storageMode: StorageMode
): Promise<void> {
  if (storageMode === 'cloud') {
    await deleteProjectFromCloud(projectName);
  } else {
    await deleteProjectFromLocal(projectName);
  }
}

/**
 * Delete project from cloud storage via Lambda API
 */
async function deleteProjectFromCloud(projectName: string): Promise<void> {
  try {
    console.log(`☁️ Deleting from cloud via API: project=${projectName}`);

    const result = await deleteProjectFromAPI(projectName);
    console.log(`✅ Cloud delete successful: ${result.message}`);
  } catch (error) {
    console.error('❌ Cloud delete failed:', error);
    throw error;
  }
}

/**
 * Delete project from local storage
 */
async function deleteProjectFromLocal(projectName: string): Promise<void> {
  try {
    console.log(`💾 Deleting from localStorage: project=${projectName}`);
    localStorage.removeItem(`templatebuilder_project_${projectName}`);
  } catch (error) {
    console.error('❌ Local delete failed:', error);
    throw error;
  }
}