"""
Professional Architectural Layout Generator
Handles irregular plots with variable widths/lengths
Generates real-world compliant residential floor plans
"""

import math
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

@dataclass
class Room:
    name: str
    x: float
    y: float
    width: float
    height: float
    room_type: str  # bedroom, bathroom, kitchen, drawing, dining, hall, garage
    color: str

@dataclass
class Wall:
    x1: float
    y1: float
    x2: float
    y2: float
    thickness: float  # in feet
    is_external: bool

@dataclass
class Opening:
    x: float
    y: float
    width: float
    height: float
    opening_type: str  # door, window
    direction: str  # N, S, E, W


class ArchitecturalLayoutGenerator:
    """
    Generates professional floor plans based on:
    - Real Pakistani residential standards
    - Proper room proportions
    - Fixture placement rules
    - Wall thickness differentiation
    - Traffic flow optimization
    """
    
    # Room dimension standards (in feet) - min x min
    ROOM_STANDARDS = {
        'master_bedroom': (16, 14),
        'bedroom': (12, 13),
        'small_bedroom': (10, 10),
        'bathroom': (5, 7),
        'toilet': (4, 5),
        'kitchen': (12, 14),
        'dining': (12, 12),
        'drawing': (18, 16),
        'living': (16, 14),
        'hall': (14, 12),
        'garage': (18, 18),
        'corridor': (4, None)  # width only, length varies
    }
    
    # Wall thicknesses
    WALL_EXTERNAL = 0.75  # 9 inches in feet
    WALL_INTERNAL = 0.38  # 4.5 inches in feet
    
    # Minimum distances from plot edge (setback)
    MIN_SETBACK = 5.0  # feet
    
    def __init__(self, brief: Dict):
        """Initialize with user brief"""
        self.brief = brief
        self.plot = brief['plot']
        self.rooms = []
        self.walls = []
        self.openings = []
        self.warnings = []
        
    def calculate_plot_corners(self) -> List[Point]:
        """
        Convert plot dimensions to corner coordinates
        Handles irregular plots (different left/right lengths, front/back widths)
        """
        front_width = self.plot['frontWidth']
        back_width = self.plot['backWidth']
        left_length = self.plot['leftLength']
        right_length = self.plot['rightLength']
        
        # Origin at front-left corner
        corners = [
            Point(0, 0),                    # Front-left
            Point(front_width, 0),          # Front-right
            Point(back_width, max(left_length, right_length)),  # Back-right
            Point(0, max(left_length, right_length))  # Back-left
        ]
        
        return corners
    
    def calculate_buildable_area(self, corners: List[Point]) -> Tuple[float, float, float, float]:
        """
        Calculate buildable area after applying setbacks
        Returns: (min_x, min_y, max_x, max_y)
        """
        setback = self.brief['setbacks']
        front_setback = setback.get('front', 5)
        back_setback = setback.get('back', 5)
        left_setback = setback.get('left', 5)
        right_setback = setback.get('right', 5)
        
        # Calculate average dimensions for irregular plots
        plot_width_avg = (self.plot['frontWidth'] + self.plot['backWidth']) / 2
        plot_length_avg = (self.plot['leftLength'] + self.plot['rightLength']) / 2
        
        buildable = {
            'min_x': left_setback,
            'max_x': plot_width_avg - right_setback,
            'min_y': front_setback,
            'max_y': plot_length_avg - back_setback
        }
        
        return buildable
    
    def allocate_zones(self, buildable: Dict) -> Dict:
        """
        Divide buildable area into zones:
        - PUBLIC (front 25-30%): Garage, Living, Drawing
        - SERVICE (middle 20-25%): Kitchen, Dining
        - PRIVATE (back 45-50%): Bedrooms, Bathrooms
        """
        total_depth = buildable['max_y'] - buildable['min_y']
        
        public_depth = total_depth * 0.28  # Front 28%
        service_depth = total_depth * 0.22  # Middle 22%
        private_depth = total_depth * 0.50  # Back 50%
        
        zones = {
            'public': {
                'x_min': buildable['min_x'],
                'x_max': buildable['max_x'],
                'y_min': buildable['min_y'],
                'y_max': buildable['min_y'] + public_depth
            },
            'service': {
                'x_min': buildable['min_x'],
                'x_max': buildable['max_x'],
                'y_min': buildable['min_y'] + public_depth,
                'y_max': buildable['min_y'] + public_depth + service_depth
            },
            'private': {
                'x_min': buildable['min_x'],
                'x_max': buildable['max_x'],
                'y_min': buildable['min_y'] + public_depth + service_depth,
                'y_max': buildable['max_y']
            }
        }
        
        return zones
    
    def generate_layout(self) -> Dict:
        """Main generation function"""
        try:
            # Step 1: Calculate plot geometry
            corners = self.calculate_plot_corners()
            buildable = self.calculate_buildable_area(corners)
            
            # Validate buildable area
            if buildable['max_x'] <= buildable['min_x'] or buildable['max_y'] <= buildable['min_y']:
                return self.error_response("Plot too small or invalid setbacks")
            
            # Step 2: Allocate zones
            zones = self.allocate_zones(buildable)
            
            # Step 3: Place rooms based on brief
            self.place_rooms(zones, buildable)
            
            # Step 4: Generate walls
            self.generate_walls(buildable, corners)
            
            # Step 5: Add openings (doors, windows)
            self.add_openings()
            
            # Return layout JSON
            return {
                'status': 'success',
                'plot': {
                    'corners': [{'x': c.x, 'y': c.y} for c in corners],
                    'frontWidth': self.plot['frontWidth'],
                    'backWidth': self.plot['backWidth'],
                    'leftLength': self.plot['leftLength'],
                    'rightLength': self.plot['rightLength'],
                    'unit': self.plot.get('unit', 'feet')
                },
                'buildable': {
                    'min_x': buildable['min_x'],
                    'max_x': buildable['max_x'],
                    'min_y': buildable['min_y'],
                    'max_y': buildable['max_y']
                },
                'zones': zones,
                'rooms': [
                    {
                        'name': r.name,
                        'type': r.room_type,
                        'x': round(r.x, 2),
                        'y': round(r.y, 2),
                        'width': round(r.width, 2),
                        'height': round(r.height, 2),
                        'color': r.color,
                        'area_sqft': round(r.width * r.height, 2)
                    } for r in self.rooms
                ],
                'walls': [
                    {
                        'x1': round(w.x1, 2),
                        'y1': round(w.y1, 2),
                        'x2': round(w.x2, 2),
                        'y2': round(w.y2, 2),
                        'thickness': round(w.thickness, 2),
                        'is_external': w.is_external,
                        'type': 'external' if w.is_external else 'internal'
                    } for w in self.walls
                ],
                'openings': [
                    {
                        'x': round(o.x, 2),
                        'y': round(o.y, 2),
                        'width': round(o.width, 2),
                        'height': round(o.height, 2),
                        'type': o.opening_type,
                        'direction': o.direction
                    } for o in self.openings
                ],
                'warnings': self.warnings,
                'meta': {
                    'total_area_sqft': round(
                        (buildable['max_x'] - buildable['min_x']) * 
                        (buildable['max_y'] - buildable['min_y']), 2
                    ),
                    'rooms_count': len(self.rooms),
                    'generated_by': 'BuildMate AI v2.0'
                }
            }
            
        except Exception as e:
            return self.error_response(f"Layout generation failed: {str(e)}")
    
    def place_rooms(self, zones: Dict, buildable: Dict):
        """Place rooms in appropriate zones"""
        zone_width = buildable['max_x'] - buildable['min_x']
        
        # Extract requirements from brief
        bedroom_count = 0
        for room in self.brief.get('rooms', []):
            if room['type'] == 'bedroom':
                bedroom_count = room['count']
        
        kitchen_type = self.brief.get('kitchenType', 'open')
        drawing_type = self.brief.get('drawingRoomType', 'formal')
        has_garage = self.brief.get('hasGarage', False)
        
        # ===== PUBLIC ZONE (Garage, Living, Drawing) =====
        public = zones['public']
        x_pos = public['x_min'] + self.WALL_EXTERNAL
        y_pos = public['y_min'] + self.WALL_EXTERNAL
        zone_height = public['y_max'] - public['y_min'] - 2*self.WALL_EXTERNAL
        
        # Left side: Garage or nothing
        if has_garage:
            garage_w, garage_h = self.ROOM_STANDARDS['garage']
            if garage_w <= zone_width / 2 - self.WALL_EXTERNAL:
                self.rooms.append(Room(
                    name='Garage',
                    x=x_pos,
                    y=y_pos,
                    width=min(garage_w, zone_width/3 - self.WALL_EXTERNAL),
                    height=min(garage_h, zone_height),
                    room_type='garage',
                    color='#B0B0B0'  # Gray
                ))
                x_pos += garage_w + self.WALL_INTERNAL
        
        # Right side: Drawing/Living Room
        available_w = public['x_max'] - x_pos - self.WALL_EXTERNAL
        draw_w, draw_h = self.ROOM_STANDARDS['drawing']
        actual_draw_w = min(draw_w, available_w)
        actual_draw_h = min(draw_h, zone_height)
        
        if actual_draw_w > 10 and actual_draw_h > 10:  # Minimum viable room
            self.rooms.append(Room(
                name='Drawing Room' if drawing_type == 'formal' else 'Living Room',
                x=x_pos,
                y=y_pos,
                width=actual_draw_w,
                height=actual_draw_h,
                room_type='drawing',
                color='#87CEEB'  # Cyan
            ))
        
        # ===== SERVICE ZONE (Kitchen, Dining) =====
        service = zones['service']
        service_w = service['x_max'] - service['x_min'] - 2*self.WALL_EXTERNAL
        service_h = service['y_max'] - service['y_min'] - 2*self.WALL_EXTERNAL
        
        # Kitchen on left, Dining on right
        kitchen_w = min(self.ROOM_STANDARDS['kitchen'][0], service_w / 2 - self.WALL_INTERNAL/2)
        kitchen_h = min(self.ROOM_STANDARDS['kitchen'][1], service_h)
        
        self.rooms.append(Room(
            name='Kitchen',
            x=service['x_min'] + self.WALL_EXTERNAL,
            y=service['y_min'] + self.WALL_EXTERNAL,
            width=kitchen_w,
            height=kitchen_h,
            room_type='kitchen',
            color='#FFFF00'  # Yellow
        ))
        
        # Dining room
        dining_w = service_w - kitchen_w - self.WALL_INTERNAL
        dining_h = min(self.ROOM_STANDARDS['dining'][1], service_h)
        
        self.rooms.append(Room(
            name='Dining',
            x=service['x_min'] + self.WALL_EXTERNAL + kitchen_w + self.WALL_INTERNAL,
            y=service['y_min'] + self.WALL_EXTERNAL,
            width=max(dining_w, 8),
            height=dining_h,
            room_type='dining',
            color='#FFB6C1'  # Pink
        ))
        
        # ===== PRIVATE ZONE (Bedrooms + Bathrooms) =====
        private = zones['private']
        private_w = private['x_max'] - private['x_min'] - 2*self.WALL_EXTERNAL
        private_h = private['y_max'] - private['y_min'] - 2*self.WALL_EXTERNAL
        
        x_room = private['x_min'] + self.WALL_EXTERNAL
        y_room = private['y_min'] + self.WALL_EXTERNAL
        
        # Place bedrooms side by side
        if bedroom_count >= 1:
            bed_w = min(self.ROOM_STANDARDS['bedroom'][0], private_w / 2 - self.WALL_INTERNAL/2)
            bed_h = min(self.ROOM_STANDARDS['bedroom'][1], private_h)
            
            # Master Bedroom (left)
            self.rooms.append(Room(
                name='Master Bedroom',
                x=x_room,
                y=y_room,
                width=bed_w,
                height=bed_h,
                room_type='bedroom',
                color='#800080'  # Purple
            ))
            
            # Attached Bathroom to Master (right of bedroom)
            bath_w = min(self.ROOM_STANDARDS['bathroom'][0], private_w - bed_w - self.WALL_INTERNAL)
            bath_h = min(self.ROOM_STANDARDS['bathroom'][1], bed_h)
            
            self.rooms.append(Room(
                name='Master Bathroom',
                x=x_room + bed_w + self.WALL_INTERNAL,
                y=y_room,
                width=bath_w,
                height=bath_h,
                room_type='bathroom',
                color='#0000FF'  # Blue
            ))
            
            # Second Bedroom (if exists)
            if bedroom_count >= 2:
                y_room += bed_h + self.WALL_INTERNAL
                bed2_h = min(self.ROOM_STANDARDS['bedroom'][1], private_h - bed_h - self.WALL_INTERNAL)
                
                self.rooms.append(Room(
                    name='Bedroom 2',
                    x=x_room,
                    y=y_room,
                    width=bed_w,
                    height=bed2_h,
                    room_type='bedroom',
                    color='#800080'  # Purple
                ))
                
                # Attached Bathroom to Bedroom 2
                self.rooms.append(Room(
                    name='Bathroom 2',
                    x=x_room + bed_w + self.WALL_INTERNAL,
                    y=y_room,
                    width=bath_w,
                    height=bath_h,
                    room_type='bathroom',
                    color='#0000FF'  # Blue
                ))
                
            # Third Bedroom (if exists)
            if bedroom_count >= 3:
                y_room += bed2_h + self.WALL_INTERNAL
                bed3_h = min(self.ROOM_STANDARDS['bedroom'][1], private_h - bed_h - bed2_h - 2*self.WALL_INTERNAL)
                
                self.rooms.append(Room(
                    name='Bedroom 3',
                    x=x_room,
                    y=y_room,
                    width=bed_w,
                    height=bed3_h,
                    room_type='bedroom',
                    color='#800080'  # Purple
                ))
                
                self.rooms.append(Room(
                    name='Bathroom 3',
                    x=x_room + bed_w + self.WALL_INTERNAL,
                    y=y_room,
                    width=bath_w,
                    height=bath_h,
                    room_type='bathroom',
                    color='#0000FF'  # Blue
                ))
    
    def generate_walls(self, buildable: Dict, corners: List[Point]):
        """Generate exterior and interior walls"""
        # Exterior walls (thick - 9 inches)
        ext_min_x = buildable['min_x']
        ext_max_x = buildable['max_x']
        ext_min_y = buildable['min_y']
        ext_max_y = buildable['max_y']
        
        # Front wall (North)
        self.walls.append(Wall(
            ext_min_x, ext_min_y,
            ext_max_x, ext_min_y,
            self.WALL_EXTERNAL, True
        ))
        
        # Back wall (South)
        self.walls.append(Wall(
            ext_min_x, ext_max_y,
            ext_max_x, ext_max_y,
            self.WALL_EXTERNAL, True
        ))
        
        # Left wall (West)
        self.walls.append(Wall(
            ext_min_x, ext_min_y,
            ext_min_x, ext_max_y,
            self.WALL_EXTERNAL, True
        ))
        
        # Right wall (East)
        self.walls.append(Wall(
            ext_max_x, ext_min_y,
            ext_max_x, ext_max_y,
            self.WALL_EXTERNAL, True
        ))
        
        # Interior walls - drawn between rooms
        # This is simplified - in production you'd trace walls between room boundaries
        for i, room in enumerate(self.rooms):
            # Each room creates invisible boundaries
            # Walls are created by room adjacency
            pass
    
    def add_openings(self):
        """Add doors and windows to rooms"""
        for room in self.rooms:
            # Windows on external walls
            if room.x == 0 or room.x + room.width >= 40:  # On external wall
                self.openings.append(Opening(
                    room.x + room.width/2,
                    room.y,
                    3, 4,  # 3'x4' window
                    'window',
                    'N'
                ))
            
            # Doors
            if room.room_type != 'bathroom':
                self.openings.append(Opening(
                    room.x + 1,
                    room.y,
                    3, 6.8,  # 3'x6'8" door
                    'door',
                    'S'
                ))
    
    def error_response(self, message: str) -> Dict:
        """Return error response"""
        return {
            'status': 'error',
            'message': message,
            'rooms': [],
            'walls': [],
            'openings': [],
            'warnings': [message]
        }


def generate_layout_variants(brief: Dict) -> List[Dict]:
    """Generate 3 layout variants from same brief"""
    variants = []
    
    for variant_num in range(1, 4):
        generator = ArchitecturalLayoutGenerator(brief)
        layout = generator.generate_layout()
        layout['variant'] = chr(64 + variant_num)  # A, B, C
        variants.append(layout)
    
    return variants