import type { CanvasState } from '../types';

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
 * Save project file (browser download fallback for now)
 */
export async function saveProjectFile(
  projectName: string, 
  canvasState: CanvasState
): Promise<string> {
  const filename = generateProjectFilename(projectName);
  const projectData = createProjectFile(projectName, canvasState);
  
  // For now, we'll use browser download
  // Later this can be enhanced with server-side saving or cloud storage
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