import type { CanvasState, StorageMode } from '../types';
import { CONFIG, isDevelopment } from '../config/environment';
// import { s3Client } from './s3Client';
import {
  saveProjectToAPI,
  loadProjectFromAPI,
  listProjectsFromAPI,
  deleteProjectFromAPI
} from './apiClient';
import { imageService } from './imageService';

// Helper to get current user ID from auth context
// In a real app, this would import useAuth hook
// Currently unused but planned for future S3 integration
/*
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
*/

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
 * Smart image upload: Convert blob URLs to S3 URLs during save
 * Dev: Skip processing (images already converted to Base64)
 * Stage/Prod: Only uploads images that are still blob URLs (new images)
 */
export async function processImageUploads(
  projectName: string,
  canvasState: CanvasState
): Promise<CanvasState> {
  // Development mode: Images are already Base64, no processing needed
  if (isDevelopment()) {
    return canvasState;
  }

  // Find all image elements with blob URLs
  const imageElements = canvasState.elements.filter(
    element => element.type === 'image' &&
    element.src &&
    imageService.isBlobUrl(element.src)
  );

  if (imageElements.length === 0) {
    console.log('📷 No blob images to upload');
    return canvasState;
  }

  console.log(`📷 Uploading ${imageElements.length} blob images to S3 for project: ${projectName}`);

  // Process each blob image and upload to S3
  const updatedElements = await Promise.all(
    canvasState.elements.map(async (element) => {
      if (element.type === 'image' && element.src && imageService.isBlobUrl(element.src)) {
        try {
          // Convert blob URL back to File for upload
          const file = await imageService.blobToFile(element.src, `image-${element.id}.jpg`);

          // Upload to S3 project folder
          const result = await imageService.uploadImageToProject(file, projectName);

          if (result.success) {
            console.log(`✅ Uploaded blob image: ${element.id} → ${result.filename}`);

            // Clean up the blob URL
            imageService.revokeImageUrl(element.src);

            // Return element with S3 URL
            return { ...element, src: result.imageUrl };
          } else {
            console.warn(`⚠️ Failed to upload image ${element.id}: ${result.error}`);
            return element; // Keep blob URL as fallback
          }
        } catch (error) {
          console.error(`❌ Error uploading blob image ${element.id}:`, error);
          return element; // Keep blob URL as fallback
        }
      }
      return element; // Non-image or already S3 URL
    })
  );

  // Return updated canvas state with S3 URLs
  return {
    ...canvasState,
    elements: updatedElements
  };
}

/**
 * Development mode: Convert blob URLs to Base64 data URLs for portable files
 */
async function processImageUploadsForDev(canvasState: CanvasState): Promise<CanvasState> {
  console.log('🔍 DEV DEBUG: processImageUploadsForDev called');
  console.log('🔍 DEV DEBUG: Total elements:', canvasState.elements.length);

  // Debug all image elements
  const allImageElements = canvasState.elements.filter(element => element.type === 'image');
  console.log('🔍 DEV DEBUG: All image elements found:', allImageElements.length);

  allImageElements.forEach((element, index) => {
    console.log(`🔍 DEV DEBUG: Image ${index + 1} - ID: ${element.id}, src: "${element.src}", isBlobUrl: ${element.src ? imageService.isBlobUrl(element.src) : 'N/A'}`);
  });

  // Find all image elements with blob URLs
  const imageElements = canvasState.elements.filter(
    element => element.type === 'image' &&
    element.src &&
    imageService.isBlobUrl(element.src)
  );

  console.log('🔍 DEV DEBUG: Blob URL image elements found:', imageElements.length);

  if (imageElements.length === 0) {
    console.log('📷 No blob images to convert');
    return canvasState;
  }

  console.log(`📷 Converting ${imageElements.length} blob images to Base64 for dev storage`);

  // Process each blob image and convert to Base64
  const updatedElements = await Promise.all(
    canvasState.elements.map(async (element, index) => {
      console.log(`🔍 DEV DEBUG: Processing element ${index + 1}/${canvasState.elements.length} - type: ${element.type}, id: ${element.id}`);

      if (element.type === 'image') {
        console.log(`🔍 DEV DEBUG: Image element ${element.id} - src: "${element.src}", hasSource: ${!!element.src}, isBlobUrl: ${element.src ? imageService.isBlobUrl(element.src) : 'N/A'}`);

        if (element.src && imageService.isBlobUrl(element.src)) {
          console.log(`🔄 DEV DEBUG: Converting blob URL to Base64 for image ${element.id}`);
          try {
            // Convert blob URL back to File for Base64 conversion
            const file = await imageService.blobToFile(element.src, `image-${element.id}.jpg`);
            console.log(`🔍 DEV DEBUG: Created file for ${element.id} - size: ${file.size} bytes, type: ${file.type}`);

            // Convert File to Base64 data URL
            const base64Url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to convert to Base64'));
              reader.readAsDataURL(file);
            });

            console.log(`✅ Converted blob image to Base64: ${element.id} (${Math.round(base64Url.length / 1024)}KB)`);

            // Clean up the blob URL
            imageService.revokeImageUrl(element.src);

            // Return element with Base64 URL
            return { ...element, src: base64Url };
          } catch (error) {
            console.error(`❌ Error converting blob image ${element.id}:`, error);
            return element; // Keep blob URL as fallback
          }
        } else {
          console.log(`🔍 DEV DEBUG: Image ${element.id} skipped - not a blob URL`);
        }
      }
      return element; // Non-image or already Base64/other URL
    })
  );

  // Return updated canvas state with Base64 URLs
  return {
    ...canvasState,
    elements: updatedElements
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
  // Development always uses local storage with Base64 images
  if (isDevelopment()) {
    console.log(`💾 Dev mode: Processing images and forcing local save with Base64`);

    // Step 1: Convert any blob URLs to Base64 first
    const processedCanvasState = await processImageUploads(projectName, canvasState);

    // Step 2: Save with Base64 embedded images
    return await saveProjectFileLocal(projectName, processedCanvasState);
  }

  // Stage/Prod: Use storage mode from parameter or fall back to environment-based logic
  const useCloudStorage = storageMode === 'cloud' ||
    (!storageMode && CONFIG.API_ENDPOINT.includes('amazonaws.com'));

  // Local storage mode: Use "Save As" dialog
  if (!useCloudStorage) {
    console.log(`💾 Saving locally: project=${projectName}, mode=${storageMode || 'auto-local'}`);
    return await saveProjectFileLocal(projectName, canvasState);
  }

  // Cloud storage mode: Process blob images first, then save to Lambda API
  try {
    console.log(`☁️ Saving to cloud via API: project=${projectName}, env=${CONFIG.ENVIRONMENT}`);

    // Step 1: Upload any blob images to S3 and update canvas state
    const processedCanvasState = await processImageUploads(projectName, canvasState);

    // Step 2: Save project with updated S3 URLs
    const result = await saveProjectToAPI(projectName, processedCanvasState);
    console.log(`✅ Cloud save successful: ${result.message}`);
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
      projectName: result.projectData.projectName,
      savedAt: result.projectData.savedAt,
      version: result.projectData.version,
      canvasState: result.projectData.canvasState
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