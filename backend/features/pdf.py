from importlib import util
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util  # Fixed util import
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.core import Settings
import os
import logging
import PyPDF2
import numpy as np
from io import BytesIO
from typing import List
from dotenv import load_dotenv  # Add this

# Load environment variables first!
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment configuration
os.environ["CURL_CA_BUNDLE"] = "./huggingface.co.crt"

# Load Sentence Transformer model
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Initialize Azure OpenAI with validation
azure_config = {
    "engine": os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    "azure_endpoint": os.getenv("AZURE_OPENAI_ENDPOINT"),
    "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
    "api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2023-07-01-preview"),
}

# Validate configuration
missing = [k for k, v in azure_config.items() if not v and k != "api_version"]
if missing:
    raise RuntimeError(f"Missing Azure OpenAI configuration: {missing}")

llm = AzureOpenAI(
    **azure_config,
    temperature=0.2,
)

# Set global LLM
Settings.llm = llm

# In-memory storage for documents and embeddings
documents = []
doc_embeddings = np.array([])

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    similarity_threshold: float = 0.3

class DocumentResponse(BaseModel):
    document: str
    similarity: float
    index: int

class AnswerResponse(BaseModel):
    answer: str

# Standalone retrieval logic
def retrieve_relevant_documents(request: QueryRequest):
    """Retrieve relevant documents based on semantic similarity."""
    global doc_embeddings

    if not documents or doc_embeddings.size == 0:
        raise HTTPException(status_code=400, detail="No documents uploaded yet")

    try:
        # Encode query
        query_embedding = model.encode(request.query)

        # Calculate similarities
        similarities = util.dot_score(query_embedding, doc_embeddings)[0]

        # Filter and sort results
        results = []
        for idx, sim in enumerate(similarities):
            if sim >= request.similarity_threshold:
                results.append((idx, sim.item()))

        # Sort by similarity score descending
        sorted_results = sorted(results, key=lambda x: x[1], reverse=True)

        # Get top-k results
        top_results = sorted_results[:request.top_k]

        return [
            DocumentResponse(
                document=documents[idx],
                similarity=sim,
                index=idx
            ) for idx, sim in top_results
        ]

    except Exception as e:
        logging.error(f"Retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing query")

# File upload endpoint
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a PDF or TXT file and update the documents and embeddings."""
    global documents, doc_embeddings

    try:
        content = await file.read()
        text = ""

        # Determine file type using both Content-Type and filename
        is_pdf = (
            file.content_type == "application/pdf"
            or (file.filename and file.filename.lower().endswith(".pdf"))
        )
        is_text = (
            file.content_type == "text/plain"
            or (file.filename and file.filename.lower().endswith(".txt"))
        )

        if is_pdf:
            try:
                pdf_file = BytesIO(content)
                reader = PyPDF2.PdfReader(pdf_file)

                if reader.is_encrypted:
                    if not reader.decrypt(""):
                        raise HTTPException(status_code=400, detail="Encrypted PDF cannot be processed")

                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"

            except PyPDF2.errors.PdfReadError:
                raise HTTPException(status_code=400, detail="Invalid PDF file")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"PDF processing error: {str(e)}")

        elif is_text:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="File is not a valid UTF-8 text file.")

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Only PDF and TXT are allowed."
            )

        # Process extracted text
        documents = [line.strip() for line in text.split("\n") if line.strip()]
        if not documents:
            raise HTTPException(status_code=400, detail="No readable content found")

        # Compute embeddings
        doc_embeddings = model.encode(documents)
        return {"message": f"Uploaded {len(documents)} documents successfully!"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Document retrieval endpoint
@app.post("/retrieve", response_model=List[DocumentResponse])
async def retrieve_documents(request: QueryRequest):
    """Retrieve relevant documents based on semantic similarity."""
    return retrieve_relevant_documents(request)

# Answer generation endpoint
@app.post("/generate", response_model=AnswerResponse)
async def generate_answer(request: QueryRequest):
    """Generate an answer using the LLM with RAG."""
    global documents

    if not documents:
        raise HTTPException(status_code=400, detail="No documents uploaded yet")

    try:
        # Retrieve relevant context
        retrieved = retrieve_relevant_documents(request)  # Call the standalone function
        context = "\n".join([doc.document for doc in retrieved])

        # Generate answer
        prompt = f"""Context information:
{context}

Question: {request.query}
Answer clearly and concisely using the provided context. If unsure, state that you don't know."""

        response = llm.complete(prompt)
        return AnswerResponse(answer=response.text.strip())

    except Exception as e:
        logging.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating answer")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)