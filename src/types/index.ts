export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  visible: boolean;
  locked: boolean;
  name: string;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  padding: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  opacity: number;
  fit: 'fill' | 'contain' | 'cover' | 'stretch';
}

export type TemplateElement = TextElement | RectangleElement | ImageElement;

export type ElementType = 'text' | 'rectangle' | 'image';

export type ToolType = 'select' | 'text' | 'rectangle' | 'image';

export interface CanvasState {
  elements: TemplateElement[];
  selectedElementId: string | null;
  editingElementId: string | null; // For text editing mode
  activeTool: ToolType;
  canvasSize: Size;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
}

export interface TemplateData {
  name: string;
  description: string;
  canvasSize: Size;
  elements: TemplateElement[];
  variables: Record<string, any>;
}