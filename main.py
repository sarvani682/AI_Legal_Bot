from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai_module import generate_ai_response  # Import AI logic from a separate module

# Initialize FastAPI
app = FastAPI()

class QueryRequest(BaseModel):
    query: str

@app.post("/ask")
def ask(request: QueryRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    response_data = generate_ai_response(query)
    if not response_data:
        raise HTTPException(status_code=404, detail="No response generated.")
    
    return response_data
