import React from 'react';
import { Group, Rect, Text, Image } from 'react-konva';
import type { TemplateElement } from '../../types/index';
import { useCanvasStore } from '../../stores/canvasStore';
import Konva from 'konva';

interface CanvasElementProps {
  element: TemplateElement;
  isSelected: boolean;
  transformerRef?: React.RefObject<Konva.Transformer>;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  transformerRef,
}) => {
  const { selectElement, moveElement, resizeElement, enterEditMode, enterTableCellEditMode, editingElementId } = useCanvasStore();
  const shapeRef = React.useRef<any>(null);
  const [loadedImage, setLoadedImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (isSelected && transformerRef?.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, transformerRef]);

  // Only force redraw for size/position changes, not content changes
  React.useEffect(() => {
    if (isSelected && transformerRef?.current && shapeRef.current) {
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [element.size, element.position, isSelected]);

  // Load image when src changes (for image elements)
  React.useEffect(() => {
    if (element.type === 'image' && element.src) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setLoadedImage(img);
        
        // Auto-resize to image dimensions if it's a new element
        if (element.size.width === 200 && element.size.height === 150) {
          const aspectRatio = img.width / img.height;
          const maxWidth = 300;
          const maxHeight = 300;
          
          let newWidth = img.width;
          let newHeight = img.height;
          
          if (newWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = newWidth / aspectRatio;
          }
          
          if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
          
          resizeElement(element.id, {
            width: Math.round(newWidth),
            height: Math.round(newHeight)
          });
        }
      };
      img.onerror = () => {
        console.error('Failed to load image:', element.src);
        setLoadedImage(null);
      };
      img.src = element.src;
    }
  }, [element.type === 'image' ? element.src : null, element.id, resizeElement]);

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    selectElement(element.id);
  };

  const handleDoubleClick = (e: any) => {
    e.cancelBubble = true;
    // Only enter edit mode for text elements (Figma behavior)
    if (element.type === 'text') {
      enterEditMode(element.id);
    }
  };

  const handleDragEnd = (e: any) => {
    moveElement(element.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    if (!shapeRef.current) return;

    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset the scale first
    node.scaleX(1);
    node.scaleY(1);

    // Update size
    resizeElement(element.id, {
      width: Math.max(10, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY),
    });

    // Update position
    moveElement(element.id, {
      x: node.x(),
      y: node.y(),
    });
  };

  const renderElement = () => {
    const commonProps = {
      ref: shapeRef,
      x: element.position.x,
      y: element.position.y,
      width: element.size.width,
      height: element.size.height,
      draggable: !element.locked,
      onClick: handleClick,
      onTap: handleClick,
      onDblClick: handleDoubleClick,
      onDblTap: handleDoubleClick,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
    };

    switch (element.type) {
      case 'rectangle':
        return (
          <Rect
            {...commonProps}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius}
          />
        );

      case 'text':
        return (
          <Text
            {...commonProps}
            text={element.content}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fontStyle={element.fontWeight === 'bold' ? 'bold' : element.fontStyle}
            fill={element.color}
            align={element.textAlign}
            verticalAlign="top"
            wrap="word"
            ellipsis={true}
            listening={true}
          />
        );

      case 'image':
        return (
          <Image
            {...commonProps}
            opacity={element.opacity}
            image={loadedImage || undefined}
          />
        );

      case 'table':
        // For tables, we need a different approach - render as a group
        const tableElement = element as any; // TableElement
        const cellWidth = element.size.width / tableElement.columns;
        const cellHeight = element.size.height / tableElement.rows;
        
        return (
          <Group
            {...commonProps}
            width={element.size.width}
            height={element.size.height}
          >
            {/* Table border */}
            <Rect
              x={0}
              y={0}
              width={element.size.width}
              height={element.size.height}
              stroke={tableElement.borderColor}
              strokeWidth={tableElement.borderWidth * 2}
              fill="transparent"
            />
            
            {/* Render cells */}
            {tableElement.cells.map((row: any[], rowIndex: number) =>
              row.map((cell: any, colIndex: number) => (
                <Group key={`${rowIndex}-${colIndex}`}>
                  {/* Cell background - clickable for editing */}
                  <Rect
                    x={colIndex * cellWidth}
                    y={rowIndex * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={cell.isHeader ? tableElement.headerBackground : tableElement.cellBackground}
                    stroke={tableElement.borderColor}
                    strokeWidth={tableElement.borderWidth}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      selectElement(element.id);
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      enterTableCellEditMode(element.id, rowIndex, colIndex);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      selectElement(element.id);
                    }}
                    onDblTap={(e) => {
                      e.cancelBubble = true;
                      enterTableCellEditMode(element.id, rowIndex, colIndex);
                    }}
                    listening={true}
                  />
                  {/* Cell text */}
                  <Text
                    x={colIndex * cellWidth + tableElement.cellPadding}
                    y={rowIndex * cellHeight + tableElement.cellPadding}
                    width={cellWidth - tableElement.cellPadding * 2}
                    height={cellHeight - tableElement.cellPadding * 2}
                    text={cell.content}
                    fontSize={tableElement.fontSize}
                    fontFamily={tableElement.fontFamily}
                    fill={tableElement.textColor}
                    fontStyle={cell.isHeader ? 'bold' : 'normal'}
                    align="left"
                    verticalAlign="middle"
                    wrap="word"
                    ellipsis={true}
                    listening={false} // Let background rect handle clicks
                  />
                </Group>
              ))
            )}
          </Group>
        );

      default:
        return null;
    }
  };

  return (
    <Group visible={element.visible}>
      {renderElement()}
    </Group>
  );
};