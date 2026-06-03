/**
 * Generates 2D elevations (Front, Back, Side views) from floor plan
 */

export function generateElevation(layout, direction = 'front') {
  const elevation = {
    direction,
    wallHeight: layout.dimensions?.buildableLength || 30,
    wallWidth: layout.dimensions?.buildableWidth || 40,
    rooms: [],
    elements: []
  };

  // Calculate wall height (typical Pakistani residential)
  const floorHeight = 10; // feet
  const totalHeight = floorHeight * (layout.floors || 1);

  // Get rooms facing this direction
  const facingRooms = getExposedRooms(layout.rooms, direction);

  // Generate wall elements
  elevation.elements.push({
    type: 'ground_line',
    y: totalHeight,
    length: elevation.wallWidth
  });

  // Add plinth (foundation band)
  elevation.elements.push({
    type: 'plinth',
    y: totalHeight - 0.5,
    height: 0.5,
    length: elevation.wallWidth
  });

  // Add walls
  elevation.elements.push({
    type: 'wall',
    y: 0,
    height: totalHeight,
    length: elevation.wallWidth,
    thickness: 0.75
  });

  // Add openings (doors and windows)
  for (const room of facingRooms) {
    const opening = getOpeningPosition(room, direction);
    if (opening) {
      elevation.elements.push(opening);
    }
  }

  // Add parapet (roof edge - typical Pakistani style)
  elevation.elements.push({
    type: 'parapet',
    y: 0,
    height: 0.75,
    length: elevation.wallWidth
  });

  return elevation;
}

function getExposedRooms(rooms, direction) {
  /**
   * Get rooms that face a particular direction
   */
  const exposed = [];
  
  if (!rooms || rooms.length === 0) return exposed;

  for (const room of rooms) {
    // Check if room is on the edge (simplified)
    if (direction === 'front' && room.y < 10) {
      exposed.push(room);
    } else if (direction === 'back' && room.y > 50) {
      exposed.push(room);
    } else if (direction === 'left' && room.x < 10) {
      exposed.push(room);
    } else if (direction === 'right' && room.x > 30) {
      exposed.push(room);
    }
  }
  
  return exposed;
}

function getOpeningPosition(room, direction) {
  /**
   * Calculate door/window positions for elevation
   */
  const floorHeight = 10;
  
  if (direction === 'front') {
    const xPos = room.x + room.width / 2;
    
    // Doors (ground level)
    if (room.type !== 'bathroom') {
      return {
        type: 'door',
        x: xPos,
        y: floorHeight - 6.83,
        width: 3,
        height: 6.83
      };
    }
    
    // Windows
    return {
      type: 'window',
      x: xPos,
      y: 3,
      width: 3.5,
      height: 4
    };
  }
  
  return null;
}

/**
 * Canvas rendering for elevation
 */
export function drawElevationOnCanvas(ctx, elevation, canvasWidth, canvasHeight) {
  const scale = canvasWidth / (elevation.wallWidth + 10);
  const groundY = canvasHeight * 0.65;
  const offsetX = 20;
  
  // Clear
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Ground
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(offsetX, groundY);
  ctx.lineTo(canvasWidth - offsetX, groundY);
  ctx.stroke();
  
  // Ground hatching
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  for (let i = 0; i < (canvasWidth - 40) / 15; i++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + i * 15, groundY);
    ctx.lineTo(offsetX + 15 + i * 15, groundY + 20);
    ctx.stroke();
  }
  
  // Plinth band
  const plinthY = groundY - 8;
  ctx.fillStyle = '#9B8B7E';
  ctx.fillRect(offsetX, plinthY, canvasWidth - 2 * offsetX, 8);
  
  // Main wall
  const wallTopY = groundY - elevation.wallHeight * scale;
  ctx.fillStyle = '#E8D4C4';
  ctx.fillRect(offsetX, wallTopY, canvasWidth - 2 * offsetX, groundY - wallTopY);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, wallTopY, canvasWidth - 2 * offsetX, groundY - wallTopY);
  
  // Doors
  const doorY = groundY - 50;
  const doorsPerWall = Math.ceil(elevation.elements.filter(e => e.type === 'door').length);
  for (let i = 0; i < Math.min(doorsPerWall, 3); i++) {
    const doorX = offsetX + 60 + i * ((canvasWidth - 140) / 3);
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(doorX, doorY, 25, 50);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(doorX, doorY, 25, 50);
    // Door panel
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(doorX + 25, doorY + 25, 12, 0, Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Windows
  ctx.fillStyle = '#87CEEB';
  const windowY = wallTopY + 20;
  const windowsCount = Math.min(4, elevation.elements.filter(e => e.type === 'window').length);
  for (let i = 0; i < windowsCount; i++) {
    const windowX = offsetX + 45 + i * ((canvasWidth - 100) / windowsCount);
    ctx.fillRect(windowX, windowY, 30, 20);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(windowX, windowY, 30, 20);
    // Window panes
    ctx.beginPath();
    ctx.moveTo(windowX + 15, windowY);
    ctx.lineTo(windowX + 15, windowY + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(windowX, windowY + 10);
    ctx.lineTo(windowX + 30, windowY + 10);
    ctx.stroke();
  }
  
  // Parapet
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(offsetX, wallTopY);
  ctx.lineTo(canvasWidth - offsetX, wallTopY);
  ctx.stroke();
  
  // Dimension lines
  ctx.strokeStyle = '#D00000';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(offsetX, wallTopY - 30);
  ctx.lineTo(canvasWidth - offsetX, wallTopY - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Dimension text
  ctx.fillStyle = '#D00000';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `Width: ${elevation.wallWidth.toFixed(1)}'`,
    canvasWidth / 2,
    wallTopY - 35
  );
  ctx.fillText(
    `Height: ${elevation.wallHeight.toFixed(1)}'`,
    canvasWidth - 30,
    wallTopY + (groundY - wallTopY) / 2
  );
  
  // Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${elevation.direction.charAt(0).toUpperCase() + elevation.direction.slice(1)} Elevation`,
    canvasWidth / 2,
    30
  );
}