from .architect import ProfessionalLayoutGenerator, ArchitecturalValidator

def generate_floor_plan(brief):
    """Generate a single floor plan"""
    try:
        validator = ArchitecturalValidator(brief)
        feasible, msg, analysis = validator.validate()
        
        if not feasible:
            return {
                'status': 'error',
                'message': msg,
                'rooms': [],
                'walls': [],
                'openings': [],
                'feasible': False
            }
        
        generator = ProfessionalLayoutGenerator(brief, variant_num=0)
        layout = generator.generate()
        layout['feasible'] = True
        return layout
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
            'rooms': [],
            'walls': [],
            'openings': [],
            'feasible': False
        }

def generate_three_variants(brief):
    """Generate 3 different architectural variants"""
    try:
        validator = ArchitecturalValidator(brief)
        feasible, msg, analysis = validator.validate()
        
        if not feasible:
            return [{
                'status': 'error',
                'message': msg,
                'rooms': [],
                'walls': [],
                'openings': [],
                'feasible': False
            }]
        
        variants = []
        variant_names = ['Linear (Front-to-Back)', 'Split (Left-Right)', 'Open Plan']
        
        for i in range(3):
            try:
                generator = ProfessionalLayoutGenerator(brief, variant_num=i)
                layout = generator.generate()
                layout['variant'] = chr(65 + i)  # A, B, C
                layout['variantName'] = variant_names[i]
                layout['feasible'] = True
                variants.append(layout)
            except Exception as e:
                variants.append({
                    'status': 'error',
                    'message': f'Variant {chr(65 + i)} failed: {str(e)}',
                    'rooms': [],
                    'walls': [],
                    'openings': [],
                    'variant': chr(65 + i),
                    'feasible': False
                })
        
        return variants
    except Exception as e:
        return [{
            'status': 'error',
            'message': str(e),
            'rooms': [],
            'walls': [],
            'openings': [],
            'feasible': False
        }]

__all__ = ['generate_floor_plan', 'generate_three_variants']
