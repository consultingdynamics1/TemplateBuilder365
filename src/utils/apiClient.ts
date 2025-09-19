import { CONFIG } from '../config/environment';

// Removed unused ApiResponse interface

interface ProjectSaveResponse {
  message: string;
  projectName: string;
  version: string;
  savedAt: string;
  userId: string;
}

interface ProjectListResponse {
  projects: Array<{
    name: string;
    lastModified: string;
    version: string;
    size?: number;
  }>;
  userId: string;
  count: number;
}

interface ProjectLoadResponse {
  projectName: string;
  canvasState: any;
  version: string;
  savedAt: string;
  userId: string;
}

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  // In development mode, we don't need auth
  if ((CONFIG.ENVIRONMENT as string) === 'dev' || (CONFIG.ENVIRONMENT as string) === 'development') {
    return 'mock-jwt-token';
  }

  // Get the access token from localStorage
  const accessToken = localStorage.getItem('tb365_access_token');
  return accessToken;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  if (!token && (CONFIG.ENVIRONMENT as string) !== 'development' && (CONFIG.ENVIRONMENT as string) !== 'dev') {
    throw new Error('No authentication token available');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth header for stage/production
  if ((CONFIG.ENVIRONMENT as string) !== 'development' && (CONFIG.ENVIRONMENT as string) !== 'dev') {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${CONFIG.API_ENDPOINT}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Save project to cloud storage via Lambda API
 */
export async function saveProjectToAPI(
  projectName: string,
  canvasState: any
): Promise<ProjectSaveResponse> {
  console.log(`🌐 API Save: ${projectName} to ${CONFIG.API_ENDPOINT}/api/projects/save`);

  const response = await apiRequest<ProjectSaveResponse>('/api/projects/save', {
    method: 'POST',
    body: JSON.stringify({
      projectName,
      canvasState
    })
  });

  return response;
}

/**
 * Load project from cloud storage via Lambda API
 */
export async function loadProjectFromAPI(projectName: string): Promise<ProjectLoadResponse> {
  console.log(`🌐 API Load: ${projectName} from ${CONFIG.API_ENDPOINT}/api/projects/load/${encodeURIComponent(projectName)}`);

  const response = await apiRequest<ProjectLoadResponse>(`/api/projects/load/${encodeURIComponent(projectName)}`);
  return response;
}

/**
 * List projects from cloud storage via Lambda API
 */
export async function listProjectsFromAPI(): Promise<ProjectListResponse> {
  console.log(`🌐 API List: ${CONFIG.API_ENDPOINT}/api/projects/list`);

  const response = await apiRequest<ProjectListResponse>('/api/projects/list');
  return response;
}

/**
 * Delete project from cloud storage via Lambda API
 */
export async function deleteProjectFromAPI(projectName: string): Promise<{ message: string; projectName: string; userId: string }> {
  console.log(`🌐 API Delete: ${projectName} from ${CONFIG.API_ENDPOINT}/api/projects/${encodeURIComponent(projectName)}`);

  const response = await apiRequest<{ message: string; projectName: string; userId: string }>(`/api/projects/${encodeURIComponent(projectName)}`, {
    method: 'DELETE'
  });

  return response;
}

/**
 * Health check for API endpoints
 */
export async function checkAPIHealth(): Promise<{ service: string; status: string; timestamp: string; stage: string }> {
  console.log(`🌐 API Health: ${CONFIG.API_ENDPOINT}/api/projects/health`);

  const response = await apiRequest<{ service: string; status: string; timestamp: string; stage: string }>('/api/projects/health');
  return response;
}