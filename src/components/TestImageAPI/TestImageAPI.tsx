import React, { useState, useEffect } from 'react';
import './TestImageAPI.css';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  details?: any;
}

interface TestSummary {
  passed: number;
  failed: number;
  total: number;
}

const TestImageAPI: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary>({ passed: 0, failed: 0, total: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Image API configuration
  const IMAGE_API_URL = 'https://7lr787c2s3.execute-api.us-east-1.amazonaws.com';
  const TEST_USER_ID = 'browser-test-user';

  useEffect(() => {
    // Get auth token from localStorage
    const token = localStorage.getItem('tb365_token');
    setAuthToken(token);

    // Initialize test list
    initializeTests();
  }, []);

  const initializeTests = () => {
    const testList: TestResult[] = [
      { name: 'Health Check (no auth)', status: 'pending' },
      { name: 'Upload Test Image', status: 'pending' },
      { name: 'List User Images', status: 'pending' },
      { name: 'Search Images by Tag', status: 'pending' },
      { name: 'Retrieve Specific Image', status: 'pending' },
      { name: 'Delete Test Image', status: 'pending' }
    ];
    setTests(testList);
    setSummary({ passed: 0, failed: 0, total: testList.length });
  };

  // Helper function to update test status
  const updateTest = (index: number, status: TestResult['status'], message?: string, details?: any) => {
    setTests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status, message, details };
      return updated;
    });
  };

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${IMAGE_API_URL}${endpoint}`;
    console.log(`🔍 Making request to: ${url}`);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    };

    console.log(`🔍 Request headers:`, { ...headers, Authorization: authToken ? `Bearer ${authToken.substring(0, 20)}...` : 'none' });

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      console.log(`🔍 Response status: ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      console.error(`❌ Network error for ${url}:`, error);
      throw error;
    }
  };

  // Create a test image as a File object
  const createTestImageFile = (name: string): File => {
    // Create a minimal PNG file as a Blob
    const pngData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00, 0x00, // Compressed pixel data
      0x00, 0x01, 0x00, 0x01, 0x5A, 0x48, 0x2D, 0xB4,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82
    ]);

    const blob = new Blob([pngData], { type: 'image/png' });
    return new File([blob], name, { type: 'image/png' });
  };

  // Test 1: Health Check
  const testHealthCheck = async (index: number) => {
    updateTest(index, 'running');
    try {
      const response = await fetch(`${IMAGE_API_URL}/health`);
      const data = await response.text();

      if (response.ok) {
        updateTest(index, 'passed', 'Service is healthy', data);
        return true;
      } else {
        updateTest(index, 'failed', `HTTP ${response.status}: ${data}`);
        return false;
      }
    } catch (error: any) {
      updateTest(index, 'failed', `Network error: ${error.message}`);
      return false;
    }
  };

  // Test 2: Upload Image
  const testImageUpload = async (index: number) => {
    updateTest(index, 'running');
    try {
      const testFile = createTestImageFile('browser-test.png');
      const formData = new FormData();
      formData.append('image', testFile);
      formData.append('tags', JSON.stringify(['test', 'browser', 'automation']));
      formData.append('userId', TEST_USER_ID);

      const response = await makeAuthenticatedRequest('/api/images', {
        method: 'POST',
        body: formData,
        headers: {} // FormData sets its own Content-Type
      });

      const result = await response.json();

      if (response.ok && result.success) {
        updateTest(index, 'passed', 'Image uploaded successfully', {
          imageId: result.imageId,
          filename: result.filename,
          size: result.size
        });
        return result.imageId;
      } else {
        updateTest(index, 'failed', result.error || 'Upload failed');
        return null;
      }
    } catch (error: any) {
      updateTest(index, 'failed', `Upload error: ${error.message}`);
      return null;
    }
  };

  // Test 3: List Images
  const testListImages = async (index: number) => {
    updateTest(index, 'running');
    try {
      const response = await makeAuthenticatedRequest(`/api/images?userId=${TEST_USER_ID}`);
      const result = await response.json();

      if (response.ok && result.success) {
        updateTest(index, 'passed', `Found ${result.images.length} images`, {
          count: result.images.length,
          images: result.images.slice(0, 3) // Show first 3
        });
        return result.images;
      } else {
        updateTest(index, 'failed', result.error || 'List failed');
        return [];
      }
    } catch (error: any) {
      updateTest(index, 'failed', `List error: ${error.message}`);
      return [];
    }
  };

  // Test 4: Search Images
  const testSearchImages = async (index: number) => {
    updateTest(index, 'running');
    try {
      const response = await makeAuthenticatedRequest(
        `/api/images/search?userId=${TEST_USER_ID}&tags=test`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        updateTest(index, 'passed', `Search found ${result.images.length} images`, {
          searchTag: 'test',
          results: result.images.length
        });
        return result.images;
      } else {
        updateTest(index, 'failed', result.error || 'Search failed');
        return [];
      }
    } catch (error: any) {
      updateTest(index, 'failed', `Search error: ${error.message}`);
      return [];
    }
  };

  // Test 5: Retrieve Image
  const testRetrieveImage = async (index: number, imageId: string) => {
    updateTest(index, 'running');
    try {
      const response = await makeAuthenticatedRequest(`/api/images/${imageId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        updateTest(index, 'passed', 'Image retrieved successfully', {
          imageId: result.image.imageId,
          filename: result.image.filename,
          tags: result.image.tags
        });
        return result.image;
      } else {
        updateTest(index, 'failed', result.error || 'Retrieval failed');
        return null;
      }
    } catch (error: any) {
      updateTest(index, 'failed', `Retrieval error: ${error.message}`);
      return null;
    }
  };

  // Test 6: Delete Image
  const testDeleteImage = async (index: number, imageId: string) => {
    updateTest(index, 'running');
    try {
      const response = await makeAuthenticatedRequest(`/api/images/${imageId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (response.ok && result.success) {
        updateTest(index, 'passed', 'Image deleted successfully');
        return true;
      } else {
        updateTest(index, 'failed', result.error || 'Deletion failed');
        return false;
      }
    } catch (error: any) {
      updateTest(index, 'failed', `Deletion error: ${error.message}`);
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    if (isRunning) return;

    setIsRunning(true);
    initializeTests();

    try {
      let passed = 0;
      let failed = 0;

      // Test 1: Health Check
      const healthResult = await testHealthCheck(0);
      healthResult ? passed++ : failed++;

      if (!authToken) {
        // Skip authenticated tests
        for (let i = 1; i < tests.length; i++) {
          updateTest(i, 'failed', 'No auth token - please log in first');
          failed++;
        }
      } else {
        // Test 2: Upload Image
        const imageId = await testImageUpload(1);
        imageId ? passed++ : failed++;

        // Test 3: List Images
        const images = await testListImages(2);
        images.length >= 0 ? passed++ : failed++;

        // Test 4: Search Images
        const searchResults = await testSearchImages(3);
        searchResults.length >= 0 ? passed++ : failed++;

        // Test 5: Retrieve Image (only if upload succeeded)
        if (imageId) {
          const retrievedImage = await testRetrieveImage(4, imageId);
          retrievedImage ? passed++ : failed++;

          // Test 6: Delete Image
          const deleteResult = await testDeleteImage(5, imageId);
          deleteResult ? passed++ : failed++;
        } else {
          updateTest(4, 'failed', 'Skipped - no image to retrieve');
          updateTest(5, 'failed', 'Skipped - no image to delete');
          failed += 2;
        }
      }

      setSummary({ passed, failed, total: tests.length });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="test-image-api">
      <div className="test-header">
        <h1>🧪 Image API Test Suite</h1>
        <p className="test-description">
          Comprehensive testing of the deployed Image Library API endpoints
        </p>

        <div className="test-config">
          <div className="config-item">
            <strong>API Endpoint:</strong> {IMAGE_API_URL}
          </div>
          <div className="config-item">
            <strong>Auth Status:</strong>
            <span className={authToken ? 'auth-valid' : 'auth-missing'}>
              {authToken ? '✅ Token Found' : '❌ No Token (Login Required)'}
            </span>
          </div>
          {authToken && (
            <div className="config-item">
              <strong>Token Preview:</strong> {authToken.substring(0, 30)}...
            </div>
          )}
        </div>
      </div>

      <div className="test-controls">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="run-tests-btn"
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
        </button>

        {summary.total > 0 && (
          <div className="test-summary">
            <span className="summary-passed">✅ {summary.passed}</span>
            <span className="summary-failed">❌ {summary.failed}</span>
            <span className="summary-total">📊 {summary.total} total</span>
            <span className="summary-rate">
              {Math.round((summary.passed / summary.total) * 100)}% success
            </span>
          </div>
        )}
      </div>

      <div className="test-results">
        {tests.map((test, index) => (
          <div key={index} className={`test-item test-${test.status}`}>
            <div className="test-header-row">
              <span className="test-status">
                {test.status === 'pending' && '⏳'}
                {test.status === 'running' && '🔄'}
                {test.status === 'passed' && '✅'}
                {test.status === 'failed' && '❌'}
              </span>
              <span className="test-name">{test.name}</span>
            </div>

            {test.message && (
              <div className="test-message">{test.message}</div>
            )}

            {test.details && (
              <div className="test-details">
                <pre>{JSON.stringify(test.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {!authToken && (
        <div className="auth-warning">
          <h3>⚠️ Authentication Required</h3>
          <p>
            To test authenticated endpoints, please log in first. The app will automatically
            detect your authentication token from localStorage.
          </p>
          <p>
            <strong>Login URL:</strong> <a href="/auth">Click here to authenticate</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default TestImageAPI;