import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { TableElement } from '../../types';

interface TableElementProps {
  element: TableElement;
  isSelected: boolean;
}

export const TableElementComponent: React.FC<TableElementProps> = ({ element, isSelected }) => {
  const { position, size, cells, rows, columns, cellPadding, borderWidth, borderColor, headerBackground, cellBackground, textColor, fontSize, fontFamily } = element;

  const cellWidth = size.width / columns;
  const cellHeight = size.height / rows;

  const renderTableCells = () => {
    const components: React.ReactElement[] = [];

    // Render cell backgrounds and text
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const cell = cells[row]?.[col];
        if (!cell) continue;

        const x = col * cellWidth;
        const y = row * cellHeight;
        const isHeader = cell.isHeader;

        // Cell background
        components.push(
          <Rect
            key={`bg-${row}-${col}`}
            x={x}
            y={y}
            width={cellWidth}
            height={cellHeight}
            fill={isHeader ? headerBackground : cellBackground}
            stroke={borderColor}
            strokeWidth={borderWidth}
          />
        );

        // Cell text
        if (cell.content) {
          components.push(
            <Text
              key={`text-${row}-${col}`}
              x={x + cellPadding}
              y={y + cellPadding}
              width={cellWidth - cellPadding * 2}
              height={cellHeight - cellPadding * 2}
              text={cell.content}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fill={textColor}
              fontStyle={isHeader ? 'bold' : 'normal'}
              align="left"
              verticalAlign="middle"
              wrap="word"
              ellipsis={true}
            />
          );
        }
      }
    }

    return components;
  };

  return (
    <Group
      x={position.x}
      y={position.y}
      width={size.width}
      height={size.height}
    >
      {/* Table border */}
      <Rect
        x={0}
        y={0}
        width={size.width}
        height={size.height}
        stroke={borderColor}
        strokeWidth={borderWidth * 2}
        fill="transparent"
      />
      
      {/* Render all cells */}
      {renderTableCells()}

      {/* Selection indicator */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={size.width + 4}
          height={size.height + 4}
          stroke="#2196f3"
          strokeWidth={2}
          fill="transparent"
          dash={[5, 5]}
        />
      )}
    </Group>
  );
};