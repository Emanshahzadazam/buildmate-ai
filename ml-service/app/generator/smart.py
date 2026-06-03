"""
Realistic Pakistani Residential Floor Plan Generator
"""
import uuid

def generate_floor_plan(brief):
    """Generate a single realistic floor plan"""
    try:
        plot = brief.get('plot', {})
        setbacks = brief.get('setbacks', {})
        rooms_brief = brief.get('rooms', [])
        
        # Calculate buildable area
        plot_width = (plot.get('frontWidth', 40) + plot.get('backWidth', 40)) / 2
        plot_length = (plot.get('leftLength', 70) + plot.get('rightLength', 70)) / 2
        
        buildable_width = plot_width - setbacks.get('left', 1) - setbacks.get('right', 1)
        buildable_length = plot_length - setbacks.get('front', 4) - setbacks.get('back', 2)
        
        # Start position (after setbacks)
        start_x = setbacks.get('left', 1)
        start_y = setbacks.get('front', 4)
        
        rooms = []
        walls = []
        openings = []
        
        # ZONE ALLOCATION
        public_depth = buildable_length * 0.25
        service_depth = buildable_length * 0.20
        private_depth = buildable_length * 0.55
        
        wall_thick_ext = 0.75
        wall_thick_int = 0.375
        
        x_pos = start_x + wall_thick_ext
        y_pos = start_y + wall_thick_ext
        zone_width = buildable_width - 2 * wall_thick_ext
        
        # ===== PUBLIC ZONE =====
        has_garage = brief.get('hasGarage', False)
        
        if has_garage:
            garage_width = min(18, zone_width * 0.35)
            rooms.append({
                'id': str(uuid.uuid4()),
                'label': 'Garage',
                'name': 'Garage',
                'type': 'garage',
                'x': x_pos,
                'y': y_pos,
                'width': garage_width,
                'height': public_depth - wall_thick_ext,
                'color': '#F0F0F0'
            })
            x_draw = x_pos + garage_width + wall_thick_int
        else:
            x_draw = x_pos
        
        # Drawing/Living Room
        draw_width = zone_width - (x_draw - x_pos) - wall_thick_ext
        rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'Drawing Room',
            'name': 'Drawing Room',
            'type': 'drawing',
            'x': x_draw,
            'y': y_pos,
            'width': draw_width,
            'height': public_depth - wall_thick_ext,
            'color': '#E8F0FF'
        })
        
        # ===== SERVICE ZONE =====
        service_y = y_pos + public_depth + wall_thick_int
        kitchen_width = zone_width * 0.45
        
        rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'Kitchen',
            'name': 'Kitchen',
            'type': 'kitchen',
            'x': x_pos,
            'y': service_y,
            'width': kitchen_width,
            'height': service_depth - wall_thick_int,
            'color': '#FFF9E6'
        })
        
        rooms.append({
            'id': str(uuid.uuid4()),
            'label': 'Dining',
            'name': 'Dining',
            'type': 'dining',
            'x': x_pos + kitchen_width + wall_thick_int,
            'y': service_y,
            'width': zone_width - kitchen_width - wall_thick_int,
            'height': service_depth - wall_thick_int,
            'color': '#FFE8D4'
        })
        
        # ===== PRIVATE ZONE =====
        private_y = service_y + service_depth + wall_thick_int
        
        bed_count = 0
        for room_type in rooms_brief:
            if room_type.get('type') == 'bedroom':
                bed_count = room_type.get('count', 1)
                break
        
        if bed_count == 0:
            bed_count = 2
        
        bed_height = (private_depth - (bed_count - 1) * wall_thick_int) / bed_count
        bed_width = zone_width * 0.55
        
        bed_colors = ['#E8F4F8', '#BA55D3', '#DDA0DD']
        bath_colors = ['#D4E8FF', '#4169E1', '#6495ED']
        
        for i in range(bed_count):
            bed_y = private_y + i * (bed_height + wall_thick_int)
            
            bed_name = 'Master Bedroom' if i == 0 else f'Bedroom {i+1}'
            rooms.append({
                'id': str(uuid.uuid4()),
                'label': bed_name,
                'name': bed_name,
                'type': 'bedroom',
                'x': x_pos,
                'y': bed_y,
                'width': bed_width,
                'height': bed_height,
                'color': bed_colors[i % len(bed_colors)]
            })
            
            bath_width = zone_width - bed_width - wall_thick_int
            rooms.append({
                'id': str(uuid.uuid4()),
                'label': f'Bathroom {i+1}',
                'name': f'Bathroom {i+1}',
                'type': 'bathroom',
                'x': x_pos + bed_width + wall_thick_int,
                'y': bed_y,
                'width': bath_width,
                'height': bed_height,
                'color': bath_colors[i % len(bath_colors)]
            })
        
        # ===== GENERATE WALLS WITH IDs =====
        plot_min_x = start_x
        plot_max_x = start_x + buildable_width
        plot_min_y = start_y
        plot_max_y = start_y + buildable_length
        
        wall_ids = []
        
        # North wall
        wall_id_n = str(uuid.uuid4())
        wall_ids.append(wall_id_n)
        walls.append({
            'id': wall_id_n,
            'x1': plot_min_x, 'y1': plot_min_y,
            'x2': plot_max_x, 'y2': plot_min_y,
            'thickness': wall_thick_ext, 'isExternal': True
        })
        
        # South wall
        wall_id_s = str(uuid.uuid4())
        wall_ids.append(wall_id_s)
        walls.append({
            'id': wall_id_s,
            'x1': plot_min_x, 'y1': plot_max_y,
            'x2': plot_max_x, 'y2': plot_max_y,
            'thickness': wall_thick_ext, 'isExternal': True
        })
        
        # West wall
        wall_id_w = str(uuid.uuid4())
        wall_ids.append(wall_id_w)
        walls.append({
            'id': wall_id_w,
            'x1': plot_min_x, 'y1': plot_min_y,
            'x2': plot_min_x, 'y2': plot_max_y,
            'thickness': wall_thick_ext, 'isExternal': True
        })
        
        # East wall
        wall_id_e = str(uuid.uuid4())
        wall_ids.append(wall_id_e)
        walls.append({
            'id': wall_id_e,
            'x1': plot_max_x, 'y1': plot_min_y,
            'x2': plot_max_x, 'y2': plot_max_y,
            'thickness': wall_thick_ext, 'isExternal': True
        })
        
        # ===== GENERATE OPENINGS WITH REQUIRED FIELDS =====
        for i, room in enumerate(rooms):
            if room['type'] not in ['bathroom', 'store']:
                # Door
                openings.append({
                    'id': str(uuid.uuid4()),
                    'kind': 'door',
                    'type': 'door',
                    'wallId': wall_ids[0],  # North wall
                    'offset': room['x'] + 1.5,
                    'x': room['x'] + 1.5,
                    'y': room['y'],
                    'width': 3.0,
                    'height': 6.83,
                    'direction': 'inward'
                })
            
            # Windows
            if room['type'] in ['bedroom', 'drawing', 'living', 'lounge']:
                openings.append({
                    'id': str(uuid.uuid4()),
                    'kind': 'window',
                    'type': 'window',
                    'wallId': wall_ids[0],  # North wall
                    'offset': room['x'] + room['width'] / 2,
                    'x': room['x'] + room['width'] / 2,
                    'y': room['y'],
                    'width': 3.5,
                    'height': 4.0,
                    'direction': 'outward'
                })
        
        return {
            'status': 'success',
            'rooms': rooms,
            'walls': walls,
            'openings': openings,
            'dimensions': {
                'plotWidth': plot_width,
                'plotLength': plot_length,
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
            }
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'status': 'error',
            'message': str(e),
            'rooms': [],
            'walls': [],
            'openings': []
        }


def generate_floor_plan_variants(brief):
    """Generate 3 variants"""
    variants = []
    
    for i in range(3):
        layout = generate_floor_plan(brief)
        layout['variant'] = chr(65 + i)
        layout['variantName'] = f'Layout {chr(65 + i)}'
        variants.append(layout)
    
    return variants