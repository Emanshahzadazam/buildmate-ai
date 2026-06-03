"""
Professional Architectural Floor Plan Generator
Validates requirements and generates realistic layouts
"""
import uuid
from typing import Dict, List, Tuple

class ArchitecturalValidator:
    """Validates feasibility of user requirements"""
    
    # Minimum room sizes (sq ft) per Pakistani standards
    MIN_ROOM_SIZES = {
        'master_bedroom': 150,
        'bedroom': 100,
        'bathroom': 40,
        'kitchen': 100,
        'living': 150,
        'dining': 120,
        'drawing': 180,
        'garage': 250,
        'store': 50,
    }
    
    WALL_EXT = 0.75  # 9 inches
    WALL_INT = 0.375  # 4.5 inches
    CIRCULATION_FACTOR = 1.3  # 30% extra for corridors, entrances
    
    def __init__(self, brief):
        self.brief = brief
        self.plot = brief.get('plot', {})
        self.rooms_req = brief.get('rooms', [])
        
    def validate(self) -> Tuple[bool, str, Dict]:
        """Validate if requirements fit in plot"""
        
        # Calculate plot area
        plot_width = (self.plot.get('frontWidth', 40) + self.plot.get('backWidth', 40)) / 2
        plot_length = (self.plot.get('leftLength', 70) + self.plot.get('rightLength', 70)) / 2
        plot_area = plot_width * plot_length
        
        # Calculate setbacks
        setbacks = self.brief.get('setbacks', {})
        buildable_width = plot_width - setbacks.get('left', 1) - setbacks.get('right', 1)
        buildable_length = plot_length - setbacks.get('front', 4) - setbacks.get('back', 2)
        buildable_area = buildable_width * buildable_length
        
        # Calculate required area
        required_area = 0
        room_counts = {}
        
        for req in self.rooms_req:
            room_type = req.get('type')
            count = req.get('count', 1)
            room_counts[room_type] = count
            
            # Map types to min sizes
            if room_type == 'bedroom':
                min_size = self.MIN_ROOM_SIZES.get('master_bedroom' if count == 1 else 'bedroom', 100)
            elif room_type == 'bathroom':
                min_size = self.MIN_ROOM_SIZES.get('bathroom', 40)
            else:
                min_size = self.MIN_ROOM_SIZES.get(room_type, 100)
            
            required_area += min_size * count
        
        # Add garage
        if self.brief.get('hasGarage', False):
            required_area += self.MIN_ROOM_SIZES['garage']
        
        # Add store
        if self.brief.get('hasStoreRoom', False):
            required_area += self.MIN_ROOM_SIZES['store']
        
        # Apply circulation factor
        required_with_circulation = required_area * self.CIRCULATION_FACTOR
        
        # Check feasibility
        feasible = required_with_circulation <= buildable_area
        
        analysis = {
            'plot_area': plot_area,
            'buildable_area': buildable_area,
            'required_area': required_area,
            'required_with_circulation': required_with_circulation,
            'utilization': (required_with_circulation / buildable_area) * 100,
            'room_counts': room_counts,
            'feasible': feasible,
            'plot_width': plot_width,
            'plot_length': plot_length,
            'buildable_width': buildable_width,
            'buildable_length': buildable_length,
        }
        
        if not feasible:
            msg = f"""Plot size insufficient!
            
Requirements: {required_with_circulation:.0f} sq ft (with circulation)
Available: {buildable_area:.0f} sq ft
Shortfall: {required_with_circulation - buildable_area:.0f} sq ft ({analysis['utilization']:.1f}% utilization)

Suggestions:
1. Reduce number of bedrooms from {room_counts.get('bedroom', 0)} to {max(1, int(room_counts.get('bedroom', 0) * 0.7))}
2. Reduce bathrooms from {room_counts.get('bathroom', 0)} to {max(1, int(room_counts.get('bathroom', 0) * 0.7))}
3. Consider multi-story layout
4. Reduce garage/parking size"""
            return False, msg, analysis
        
        return True, "Requirements fit! Generating layout...", analysis


class ProfessionalLayoutGenerator:
    """Generates professional architectural floor plans"""
    
    def __init__(self, brief, variant_num=0):
        self.brief = brief
        self.variant_num = variant_num
        self.rooms = []
        self.walls = []
        self.openings = []
        
        # Validate first
        validator = ArchitecturalValidator(brief)
        feasible, msg, analysis = validator.validate()
        
        if not feasible:
            raise Exception(msg)
        
        self.analysis = analysis
        
    def generate(self) -> Dict:
        """Generate complete floor plan"""
        
        buildable = self.analysis
        start_x = self.brief.get('setbacks', {}).get('left', 1)
        start_y = self.brief.get('setbacks', {}).get('front', 4)
        
        buildable_width = buildable['buildable_width']
        buildable_length = buildable['buildable_length']
        
        # VARIANT STRATEGIES
        if self.variant_num == 0:
            # Variant A: Linear (Front to Back)
            self._generate_linear_variant(start_x, start_y, buildable_width, buildable_length)
        elif self.variant_num == 1:
            # Variant B: Split (Left-Right division)
            self._generate_split_variant(start_x, start_y, buildable_width, buildable_length)
        else:
            # Variant C: Open Plan (Combined living areas)
            self._generate_openplan_variant(start_x, start_y, buildable_width, buildable_length)
        
        self._generate_walls(start_x, start_y, buildable_width, buildable_length)
        self._generate_openings()
        
        return {
            'status': 'success',
            'rooms': self.rooms,
            'walls': self.walls,
            'openings': self.openings,
            'dimensions': {
                'plotWidth': buildable['plot_width'],
                'plotLength': buildable['plot_length'],
                'buildableWidth': buildable_width,
                'buildableLength': buildable_length,
                'totalArea': buildable_width * buildable_length
            },
            'buildable': {
                'width': buildable_width,
                'length': buildable_length,
                'min_x': start_x,
                'max_x': start_x + buildable_width,
                'min_y': start_y,
                'max_y': start_y + buildable_length
            },
            'analysis': self.analysis
        }
    
    def _generate_linear_variant(self, start_x, start_y, bw, bl):
        """Front-to-back zoning: Garage → Living → Kitchen → Bedrooms"""
        
        wall_ext = 0.75
        wall_int = 0.375
        
        x = start_x + wall_ext
        y = start_y + wall_ext
        zone_w = bw - 2 * wall_ext
        
        # FRONT ZONE (25%)
        front_depth = bl * 0.25
        
        # Garage (if requested)
        if self.brief.get('hasGarage', False):
            garage_w = min(18, zone_w * 0.4)
            self.rooms.append({
                'id': str(uuid.uuid4()),
                'label': 'GARAGE',
                'name': 'Garage',
                'type': 'garage',
                'x': x,
                'y': y,
                'width': garage_w,
                'height': front_depth - wall_ext,
                'color': '#E0E0E0'
            })
            x_living = x + garage_w + wall_int
            living_w = zone_w - garage_w - wall_int
        else:
            x_living = x
            living_w = zone_w
        
        # Living/Drawing Room (main front room)
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'DRAWING\nROOM',
            'name': 'Drawing Room',
            'type': 'drawing',
            'x': x_living,
            'y': y,
            'width': living_w,
            'height': front_depth - wall_ext,
            'color': '#E8F0FF'
        })
        
        # SERVICE ZONE (20%)
        service_y = y + front_depth + wall_int
        service_depth = bl * 0.20
        
        kitchen_w = zone_w * 0.5
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'KITCHEN',
            'name': 'Kitchen',
            'type': 'kitchen',
            'x': x,
            'y': service_y,
            'width': kitchen_w,
            'height': service_depth - wall_int,
            'color': '#FFFACD'
        })
        
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'DINING',
            'name': 'Dining Room',
            'type': 'dining',
            'x': x + kitchen_w + wall_int,
            'y': service_y,
            'width': zone_w - kitchen_w - wall_int,
            'height': service_depth - wall_int,
            'color': '#FFE4B5'
        })
        
        # PRIVATE ZONE (55%) - Bedrooms & Bathrooms
        private_y = service_y + service_depth + wall_int
        private_depth = bl - (front_depth + service_depth + 3 * wall_ext)
        
        bed_count = self.analysis['room_counts'].get('bedroom', 2)
        bath_count = self.analysis['room_counts'].get('bathroom', 2)
        
        # Calculate heights
        bed_h = (private_depth - (bed_count - 1) * wall_int) / bed_count
        bed_w = zone_w * 0.6
        
        bed_colors = ['#E0E6F0', '#D4E4F0', '#C8DDFF']
        bath_colors = ['#B0E0E6', '#A0D8E8', '#90D0EA']
        
        for i in range(bed_count):
            bed_y = private_y + i * (bed_h + wall_int)
            bed_name = 'MASTER\nBED' if i == 0 else f'BED {i+1}'
            
            self.rooms.append({
                'id': str(uuid.uuid4()),
                'label': bed_name,
                'name': 'Master Bedroom' if i == 0 else f'Bedroom {i+1}',
                'type': 'bedroom',
                'x': x,
                'y': bed_y,
                'width': bed_w,
                'height': bed_h,
                'color': bed_colors[i % 3]
            })
            
            # Attached bathroom for each bedroom
            if i < bath_count:
                bath_w = zone_w - bed_w - wall_int
                self.rooms.append({
                    'id': str(uuid.uuid4()),
                    'label': f'BATH {i+1}',
                    'name': f'Bathroom {i+1}',
                    'type': 'bathroom',
                    'x': x + bed_w + wall_int,
                    'y': bed_y,
                    'width': bath_w,
                    'height': bed_h,
                    'color': bath_colors[i % 3]
                })
        
        # Store room
        if self.brief.get('hasStoreRoom', False):
            remaining = bl - (private_y - start_y - wall_ext) - bed_count * (bed_h + wall_int)
            if remaining > 8:
                self.rooms.append({
                    'id': str(uuid.uuid4()),
                    'label': 'STORE',
                    'name': 'Store Room',
                    'type': 'store',
                    'x': x,
                    'y': private_y + bed_count * (bed_h + wall_int),
                    'width': zone_w * 0.35,
                    'height': remaining - wall_ext,
                    'color': '#F5F5F5'
                })
    
    def _generate_split_variant(self, start_x, start_y, bw, bl):
        """Left-Right split: Service on left, Bedrooms on right"""
        
        wall_ext = 0.75
        wall_int = 0.375
        
        x = start_x + wall_ext
        y = start_y + wall_ext
        zone_w = bw - 2 * wall_ext
        zone_h = bl - 2 * wall_ext
        
        # Split width
        left_w = zone_w * 0.45
        right_w = zone_w - left_w - wall_int
        
        # LEFT SIDE: Service areas (Kitchen, Dining, Store)
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'DRAWING\nROOM',
            'name': 'Drawing Room',
            'type': 'drawing',
            'x': x,
            'y': y,
            'width': left_w,
            'height': zone_h * 0.35,
            'color': '#E8F0FF'
        })
        
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'KITCHEN',
            'name': 'Kitchen',
            'type': 'kitchen',
            'x': x,
            'y': y + zone_h * 0.35 + wall_int,
            'width': left_w,
            'height': zone_h * 0.35,
            'color': '#FFFACD'
        })
        
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'DINING',
            'name': 'Dining Room',
            'type': 'dining',
            'x': x,
            'y': y + zone_h * 0.7 + 2 * wall_int,
            'width': left_w,
            'height': zone_h * 0.3 - wall_int,
            'color': '#FFE4B5'
        })
        
        # RIGHT SIDE: Bedrooms & Bathrooms
        bed_count = self.analysis['room_counts'].get('bedroom', 2)
        bath_count = self.analysis['room_counts'].get('bathroom', 2)
        
        bed_h = (zone_h - (bed_count - 1) * wall_int) / bed_count
        
        bed_colors = ['#E0E6F0', '#D4E4F0', '#C8DDFF']
        bath_colors = ['#B0E0E6', '#A0D8E8', '#90D0EA']
        
        x_right = x + left_w + wall_int
        
        for i in range(bed_count):
            bed_y = y + i * (bed_h + wall_int)
            bed_name = 'MASTER\nBED' if i == 0 else f'BED {i+1}'
            
            # Bedroom takes 70% of right width
            bed_w = right_w * 0.7
            
            self.rooms.append({
                'id': str(uuid.uuid4()),
                'label': bed_name,
                'name': 'Master Bedroom' if i == 0 else f'Bedroom {i+1}',
                'type': 'bedroom',
                'x': x_right,
                'y': bed_y,
                'width': bed_w,
                'height': bed_h,
                'color': bed_colors[i % 3]
            })
            
            # Attached bathroom
            if i < bath_count:
                bath_w = right_w - bed_w - wall_int
                self.rooms.append({
                    'id': str(uuid.uuid4()),
                    'label': f'BATH {i+1}',
                    'name': f'Bathroom {i+1}',
                    'type': 'bathroom',
                    'x': x_right + bed_w + wall_int,
                    'y': bed_y,
                    'width': bath_w,
                    'height': bed_h,
                    'color': bath_colors[i % 3]
                })
        
        # Garage on left at bottom
        if self.brief.get('hasGarage', False):
            self.rooms.append({
                'id': str(uuid.uuid4()),
                'label': 'GARAGE',
                'name': 'Garage',
                'type': 'garage',
                'x': x_right,
                'y': y + bed_count * (bed_h + wall_int),
                'width': right_w,
                'height': zone_h - bed_count * (bed_h + wall_int) - wall_int,
                'color': '#E0E0E0'
            })
    
    def _generate_openplan_variant(self, start_x, start_y, bw, bl):
        """Open plan: Combined living/dining, compact layout"""
        
        wall_ext = 0.75
        wall_int = 0.375
        
        x = start_x + wall_ext
        y = start_y + wall_ext
        zone_w = bw - 2 * wall_ext
        
        # OPEN LIVING/DINING (front 30%)
        open_depth = bl * 0.30
        
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'DRAWING +\nDINING',
            'name': 'Drawing & Dining',
            'type': 'drawing',
            'x': x,
            'y': y,
            'width': zone_w,
            'height': open_depth - wall_ext,
            'color': '#E8F0FF'
        })
        
        # KITCHEN (next 15%)
        kitchen_y = y + open_depth + wall_int
        kitchen_depth = bl * 0.15
        
        self.rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'KITCHEN',
            'name': 'Kitchen',
            'type': 'kitchen',
            'x': x,
            'y': kitchen_y,
            'width': zone_w,
            'height': kitchen_depth - wall_int,
            'color': '#FFFACD'
        })
        
        # BEDROOMS (remaining 55%)
        private_y = kitchen_y + kitchen_depth + wall_int
        private_depth = bl - (open_depth + kitchen_depth + 3 * wall_ext)
        
        bed_count = self.analysis['room_counts'].get('bedroom', 2)
        bath_count = self.analysis['room_counts'].get('bathroom', 2)
        
        bed_h = (private_depth - (bed_count - 1) * wall_int) / bed_count
        bed_w = zone_w * 0.55
        
        bed_colors = ['#E0E6F0', '#D4E4F0', '#C8DDFF']
        bath_colors = ['#B0E0E6', '#A0D8E8', '#90D0EA']
        
        for i in range(bed_count):
            bed_y = private_y + i * (bed_h + wall_int)
            bed_name = 'MASTER\nBED' if i == 0 else f'BED {i+1}'
            
            self.rooms.append({
                'id': str(uuid.uuid4()),
                'label': bed_name,
                'name': 'Master Bedroom' if i == 0 else f'Bedroom {i+1}',
                'type': 'bedroom',
                'x': x,
                'y': bed_y,
                'width': bed_w,
                'height': bed_h,
                'color': bed_colors[i % 3]
            })
            
            if i < bath_count:
                bath_w = zone_w - bed_w - wall_int
                self.rooms.append({
                    'id': str(uuid.uuid4()),
                    'label': f'BATH {i+1}',
                    'name': f'Bathroom {i+1}',
                    'type': 'bathroom',
                    'x': x + bed_w + wall_int,
                    'y': bed_y,
                    'width': bath_w,
                    'height': bed_h,
                    'color': bath_colors[i % 3]
                })
    
    def _generate_walls(self, start_x, start_y, bw, bl):
        """Generate structural walls"""
        
        wall_ext = 0.75
        
        min_x = start_x
        max_x = start_x + bw
        min_y = start_y
        max_y = start_y + bl
        
        self.wall_ids = []
        
        # Exterior walls (dark, thick)
        walls_data = [
            (min_x, min_y, max_x, min_y, 'north'),  # Front
            (min_x, max_y, max_x, max_y, 'south'),  # Back
            (min_x, min_y, min_x, max_y, 'west'),   # Left
            (max_x, min_y, max_x, max_y, 'east'),   # Right
        ]
        
        for x1, y1, x2, y2, direction in walls_data:
            wall_id = str(uuid.uuid4())
            self.wall_ids.append((wall_id, direction))
            self.walls.append({
                'id': wall_id,
                'x1': x1,
                'y1': y1,
                'x2': x2,
                'y2': y2,
                'thickness': wall_ext,
                'isExternal': True,
                'direction': direction
            })
    
    def _generate_openings(self):
        """Generate doors and windows with correct wall references"""
        
        # Get wall IDs
        wall_map = {d: wid for wid, d in self.wall_ids}
        
        door_count = 1
        win_count = 1
        
        for room in self.rooms:
            if room['type'] not in ['bathroom', 'store']:
                # DOOR (on front wall for front-facing rooms)
                if room['y'] < 20:  # Front rooms
                    self.openings.append({
                        'id': str(uuid.uuid4()),
                        'kind': 'door',
                        'type': 'door',
                        'wallId': wall_map.get('north', self.walls[0]['id']),
                        'offset': room['x'] + room['width'] / 2,
                        'x': room['x'] + room['width'] / 2,
                        'y': room['y'],
                        'width': 3.0,
                        'height': 6.83,
                        'label': f'D{door_count}'
                    })
                    door_count += 1
            
            # WINDOWS (exterior-facing rooms)
            if room['type'] in ['bedroom', 'drawing', 'living', 'kitchen', 'dining']:
                # Front window
                if room['y'] < 20:
                    self.openings.append({
                        'id': str(uuid.uuid4()),
                        'kind': 'window',
                        'type': 'window',
                        'wallId': wall_map.get('north', self.walls[0]['id']),
                        'offset': room['x'] + room['width'] / 2,
                        'x': room['x'] + room['width'] / 2,
                        'y': room['y'],
                        'width': 3.5,
                        'height': 4.0,
                        'label': f'W{win_count}'
                    })
                    win_count += 1
