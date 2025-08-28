import React from 'react';
import { Stage, Layer, Transformer, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '../../stores/canvasStore';
import { CanvasElement } from './CanvasElement';

export const Canvas: React.FC = () => {
  const {
    elements,
    selectedElementId,
    canvasSize,
    zoom,
    activeTool,
    clearSelection,
    addElement,
    snapToGrid,
    gridSize,
  } = useCanvasStore();

  const stageRef = React.useRef<Konva.Stage>(null);
  const transformerRef = React.useRef<Konva.Transformer>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingImagePosition, setPendingImagePosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const prevZoomRef = React.useRef(zoom);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize canvas position to center it on first load
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || isInitialized) return;

    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const scaledCanvasWidth = canvasSize.width * zoom;
    const scaledCanvasHeight = canvasSize.height * zoom;
    
    // Center the canvas if it's smaller than viewport, otherwise use padding
    const centerX = scaledCanvasWidth < stageWidth ? 
      (stageWidth - scaledCanvasWidth) / 2 : 100;
    const centerY = scaledCanvasHeight < stageHeight ? 
      (stageHeight - scaledCanvasHeight) / 2 : 100;
    
    stage.scale({ x: zoom, y: zoom });
    stage.position({ x: centerX, y: centerY });
    stage.batchDraw();
    
    setIsInitialized(true);
    prevZoomRef.current = zoom;
  }, [canvasSize.width, canvasSize.height, zoom, isInitialized]);

  // Handle zoom changes to keep canvas centered
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || zoom === prevZoomRef.current || !isInitialized) return;

    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const scaledCanvasWidth = canvasSize.width * zoom;
    const scaledCanvasHeight = canvasSize.height * zoom;
    
    // Center the canvas if it's smaller than viewport, otherwise use padding
    const centerX = scaledCanvasWidth < stageWidth ? 
      (stageWidth - scaledCanvasWidth) / 2 : 100;
    const centerY = scaledCanvasHeight < stageHeight ? 
      (stageHeight - scaledCanvasHeight) / 2 : 100;
    
    stage.scale({ x: zoom, y: zoom });
    stage.position({ x: centerX, y: centerY });
    stage.batchDraw();
    
    prevZoomRef.current = zoom;
  }, [zoom, isInitialized, canvasSize.width, canvasSize.height]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      // Get drop position relative to canvas
      const stage = stageRef.current;
      if (stage) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const actualPos = {
            x: (pointerPos.x - (stage.x() || 0)) / zoom,
            y: (pointerPos.y - (stage.y() || 0)) / zoom,
          };
          
          // Create image element from dropped file
          const url = URL.createObjectURL(imageFile);
          addElement('image', actualPos);
          
          // Update the element with the image data
          setTimeout(() => {
            const { elements, updateElement } = useCanvasStore.getState();
            const latestElement = elements[elements.length - 1];
            if (latestElement && latestElement.type === 'image') {
              updateElement(latestElement.id, { src: url });
            }
          }, 0);
        }
      }
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const position = pendingImagePosition;
    
    if (file && file.type.startsWith('image/') && position) {
      const url = URL.createObjectURL(file);
      
      // Create the image element and immediately update it with the file URL
      addElement('image', position);
      
      // Get the element that was just created and update it with the image data
      setTimeout(() => {
        const { elements, updateElement } = useCanvasStore.getState();
        const latestElement = elements[elements.length - 1];
        if (latestElement && latestElement.type === 'image') {
          updateElement(latestElement.id, { src: url });
        }
      }, 0);
    }
    
    // Reset states
    setPendingImagePosition(null);
    event.target.value = '';
  };

  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage || e.target.attrs?.name === 'canvas-background';
    
    if (clickedOnEmpty) {
      // Always clear selection when clicking empty space (Figma behavior)
      clearSelection();
      
      // If using a creation tool, create new element
      if (activeTool !== 'select') {
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          const stage = e.target.getStage();
          const stagePos = stage ? { x: stage.x() || 0, y: stage.y() || 0 } : { x: 0, y: 0 };
          const actualPos = {
            x: (pos.x - stagePos.x) / zoom,
            y: (pos.y - stagePos.y) / zoom,
          };
          
          if (activeTool === 'text' || activeTool === 'rectangle') {
            addElement(activeTool, actualPos);
          } else if (activeTool === 'image') {
            // Store position and trigger file picker
            setPendingImagePosition(actualPos);
            fileInputRef.current?.click();
          }
        }
      }
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 0.1;
    const newScale = Math.max(0.1, Math.min(5, oldScale + direction * factor));

    // Use the store's setZoom to keep everything consistent
    const { setZoom } = useCanvasStore.getState();
    setZoom(newScale);
  };

  const handleMouseDown = (e: any) => {
    // Only start panning if clicking on empty space (not on elements)
    if (e.target === e.target.getStage() || e.target.name() === 'canvas-background') {
      setIsPanning(true);
      e.target.getStage().container().style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isPanning) return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    if (pointer) {
      stage.position({
        x: stage.x() + e.evt.movementX,
        y: stage.y() + e.evt.movementY,
      });
      stage.batchDraw();
    }
  };

  const handleMouseUp = (e: any) => {
    setIsPanning(false);
    e.target.getStage().container().style.cursor = 'default';
  };

  return (
    <div 
      className="canvas-container" 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'auto', // Enable scrollbars when needed
        backgroundColor: isDragging ? '#e3f2fd' : '#f5f5f5',
        position: 'relative',
        border: isDragging ? '2px dashed #2196f3' : 'none',
        transition: 'all 0.2s ease',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            color: '#2196f3',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          Drop image here
        </div>
      )}
      <Stage
        ref={stageRef}
        width={Math.max(canvasSize.width * zoom + 200, window.innerWidth - 400)}
        height={Math.max(canvasSize.height * zoom + 200, window.innerHeight - 60)}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={false}
      >
        <Layer>
          {/* Canvas background */}
          <Rect
            name="canvas-background"
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
            fill="white"
            stroke="#2196f3"
            strokeWidth={2}
            shadowColor="black"
            shadowBlur={15}
            shadowOffsetX={8}
            shadowOffsetY={8}
            shadowOpacity={0.15}
          />
          
          {/* Grid lines (only when snapToGrid is enabled) */}
          {snapToGrid && (
            <>
              {/* Vertical grid lines */}
              {Array.from({ length: Math.ceil(canvasSize.width / gridSize) + 1 }, (_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * gridSize, 0, i * gridSize, canvasSize.height]}
                  stroke="#e0e0e0"
                  strokeWidth={0.5}
                  dash={[2, 4]}
                  opacity={0.6}
                />
              ))}
              {/* Horizontal grid lines */}
              {Array.from({ length: Math.ceil(canvasSize.height / gridSize) + 1 }, (_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * gridSize, canvasSize.width, i * gridSize]}
                  stroke="#e0e0e0"
                  strokeWidth={0.5}
                  dash={[2, 4]}
                  opacity={0.6}
                />
              ))}
            </>
          )}
          
          {/* Render elements */}
          {[...elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={element.id === selectedElementId}
                transformerRef={transformerRef as React.RefObject<Konva.Transformer>}
              />
            ))}
          
          {/* Transformer for selected elements */}
          {selectedElementId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
      
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
};