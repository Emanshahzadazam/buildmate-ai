from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.schemas.layout import Brief, LayoutResponse
from app.generator.smart import generate_layout_variants, ArchitecturalLayoutGenerator

app = FastAPI(title="BuildMate AI - ML Service", version="2.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "BuildMate AI ML Service",
        "version": "2.0"
    }

@app.post("/generate", response_model=LayoutResponse)
async def generate_single_layout(brief: Brief):
    """
    Generate a single floor plan layout
    """
    try:
        generator = ArchitecturalLayoutGenerator(brief.dict())
        layout = generator.generate_layout()
        
        if layout['status'] == 'error':
            raise HTTPException(status_code=400, detail=layout['message'])
        
        return LayoutResponse(**layout)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/generate-variants")
async def generate_layout_variants_endpoint(brief: Brief) -> List[LayoutResponse]:
    """
    Generate 3 layout variants (A, B, C)
    All with same brief but different room arrangements
    """
    try:
        variants = generate_layout_variants(brief.dict())
        
        # Validate all variants
        for v in variants:
            if v['status'] == 'error':
                raise HTTPException(status_code=400, detail=v['message'])
        
        return [LayoutResponse(**v) for v in variants]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Variant generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)