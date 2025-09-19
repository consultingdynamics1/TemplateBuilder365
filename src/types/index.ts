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

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number;
  columns: number;
  cells: Array<Array<{ content: string; isHeader: boolean }>>;
  cellPadding: number;
  borderWidth: number;
  borderColor: string;
  headerBackground: string;
  cellBackground: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
}

export type TemplateElement = TextElement | RectangleElement | ImageElement | TableElement;

export type ElementType = 'text' | 'rectangle' | 'image' | 'table';

export type ToolType = 'select' | 'text' | 'rectangle' | 'image' | 'table';

export type StorageMode = 'local' | 'cloud';

export interface CanvasState {
  elements: TemplateElement[];
  selectedElementId: string | null;
  editingElementId: string | null; // For text editing mode
  activeTool: ToolType;
  canvasSize: Size;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
  storageMode: StorageMode;
}

export interface TemplateData {
  name: string;
  description: string;
  canvasSize: Size;
  elements: TemplateElement[];
  variables: Record<string, any>;
}