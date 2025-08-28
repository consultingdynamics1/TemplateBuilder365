import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CanvasState, TemplateElement, ToolType, ElementType } from '../types/index';

interface CanvasStore extends CanvasState {
  addElement: (elementType: ElementType, position: { x: number; y: number }) => void;
  selectElement: (elementId: string | null) => void;
  updateElement: (elementId: string, updates: Partial<TemplateElement>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setZoom: (zoom: number) => void;
  fitToScreen: (viewport: { width: number; height: number }) => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  moveElement: (elementId: string, position: { x: number; y: number }) => void;
  resizeElement: (elementId: string, size: { width: number; height: number }) => void;
  clearSelection: () => void;
  enterEditMode: (elementId: string) => void;
  exitEditMode: () => void;
  loadCanvasState: (canvasState: CanvasState) => void;
}

const createDefaultElement = (
  type: ElementType,
  position: { x: number; y: number },
  id: string
): TemplateElement => {
  // Generate semantic names with counter
  const generateElementName = (elementType: ElementType) => {
    const typeMap = {
      'text': 'text-field',
      'rectangle': 'background-box', 
      'image': 'image-placeholder'
    };
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits for uniqueness
    return `${typeMap[elementType]}-${timestamp}`;
  };

  const baseElement = {
    id,
    type,
    position,
    visible: true,
    locked: false,
    name: generateElementName(type),
    zIndex: Date.now(),
  };

  switch (type) {
    case 'text':
      return {
        ...baseElement,
        type: 'text',
        size: { width: 120, height: 24 },
        content: 'Sample Text',
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        color: '#000000',
        padding: 0,
      };
    case 'rectangle':
      return {
        ...baseElement,
        type: 'rectangle',
        size: { width: 100, height: 100 },
        fill: '#3498db',
        stroke: '#2980b9',
        strokeWidth: 2,
        cornerRadius: 0,
      };
    case 'image':
      return {
        ...baseElement,
        type: 'image',
        size: { width: 200, height: 150 },
        src: '',
        opacity: 1,
        fit: 'contain',
      };
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
};

export const useCanvasStore = create<CanvasStore>()(
  immer((set) => ({
    elements: [],
    selectedElementId: null,
    editingElementId: null,
    activeTool: 'select',
    canvasSize: { width: 800, height: 600 },
    zoom: 1,
    snapToGrid: false,
    gridSize: 20,

    addElement: (elementType, position) =>
      set((state) => {
        const id = crypto.randomUUID();
        const newElement = createDefaultElement(elementType, position, id);
        state.elements.push(newElement);
        state.selectedElementId = id;
        // Auto-switch back to select tool after placing element (Figma-style)
        state.activeTool = 'select';
      }),

    selectElement: (elementId) =>
      set((state) => {
        state.selectedElementId = elementId;
      }),

    updateElement: (elementId, updates) =>
      set((state) => {
        const element = state.elements.find((el) => el.id === elementId);
        if (element) {
          Object.assign(element, updates);
        }
      }),

    deleteElement: (elementId) =>
      set((state) => {
        state.elements = state.elements.filter((el) => el.id !== elementId);
        if (state.selectedElementId === elementId) {
          state.selectedElementId = null;
        }
      }),

    duplicateElement: (elementId) =>
      set((state) => {
        const element = state.elements.find((el) => el.id === elementId);
        if (element) {
          const id = crypto.randomUUID();
          const duplicated = {
            ...element,
            id,
            name: `${element.name}-copy`,
            position: {
              x: element.position.x + 20,
              y: element.position.y + 20,
            },
            zIndex: Date.now(),
          };
          state.elements.push(duplicated);
          state.selectedElementId = id;
        }
      }),

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
        if (tool !== 'select') {
          state.selectedElementId = null;
        }
      }),

    setCanvasSize: (size) =>
      set((state) => {
        state.canvasSize = size;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(0.1, Math.min(2, zoom));
      }),

    fitToScreen: (viewport) =>
      set((state) => {
        // Calculate zoom to fit canvas in viewport with some padding
        const padding = 40; // 20px padding on each side
        const availableWidth = viewport.width - padding;
        const availableHeight = viewport.height - padding;
        
        const scaleX = availableWidth / state.canvasSize.width;
        const scaleY = availableHeight / state.canvasSize.height;
        
        // Use the smaller scale to ensure the entire canvas fits
        const scale = Math.min(scaleX, scaleY);
        
        // Clamp the zoom within our limits
        state.zoom = Math.max(0.1, Math.min(2, scale));
      }),

    toggleSnapToGrid: () =>
      set((state) => {
        state.snapToGrid = !state.snapToGrid;
      }),

    setGridSize: (size) =>
      set((state) => {
        state.gridSize = Math.max(5, size);
      }),

    moveElement: (elementId, position) =>
      set((state) => {
        const element = state.elements.find((el) => el.id === elementId);
        if (element) {
          if (state.snapToGrid) {
            element.position.x = Math.round(position.x / state.gridSize) * state.gridSize;
            element.position.y = Math.round(position.y / state.gridSize) * state.gridSize;
          } else {
            element.position = position;
          }
        }
      }),

    resizeElement: (elementId, size) =>
      set((state) => {
        const element = state.elements.find((el) => el.id === elementId);
        if (element) {
          element.size = {
            width: Math.max(10, size.width),
            height: Math.max(10, size.height),
          };
        }
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedElementId = null;
        state.editingElementId = null; // Also exit edit mode
      }),

    enterEditMode: (elementId) =>
      set((state) => {
        state.editingElementId = elementId;
        state.selectedElementId = elementId; // Keep element selected while editing
      }),

    exitEditMode: () =>
      set((state) => {
        state.editingElementId = null;
      }),

    loadCanvasState: (canvasState) =>
      set((state) => {
        // Restore complete canvas state
        state.elements = canvasState.elements || [];
        state.selectedElementId = canvasState.selectedElementId || null;
        state.editingElementId = canvasState.editingElementId || null;
        state.activeTool = canvasState.activeTool || 'select';
        state.canvasSize = canvasState.canvasSize || { width: 800, height: 600 };
        state.zoom = canvasState.zoom || 1;
        state.snapToGrid = canvasState.snapToGrid || false;
        state.gridSize = canvasState.gridSize || 20;
      }),
  }))
);