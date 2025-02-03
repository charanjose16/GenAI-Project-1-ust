from fastapi import Depends, FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import base64
import os
from dotenv import load_dotenv
from mimetypes import guess_type
from openai import AzureOpenAI
import tiktoken
import logging
from bs4 import BeautifulSoup
import json
import requests
import urllib3
from urllib.parse import urlparse, parse_qs
import time
from sentence_transformers import SentenceTransformer, util
from llama_index.llms.azure_openai import AzureOpenAI as LlamaAzureOpenAI
from llama_index.core import Settings
import PyPDF2
import numpy as np
from io import BytesIO
from typing import List, Optional
import uuid
import random
import os
import certifi

from features.data import  generate_synthetic_users
from features.mainsummary import TopicRequest, extract_blog_content, search_articles, summarize_blog
from features.pdf import AnswerResponse, DocumentResponse, QueryRequest

# Set the SSL certificate path
os.environ['SSL_CERT_FILE'] = certifi.where()

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Mock user database
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("adminpassword"),
        "role": "admin"
    },
    "user": {
        "username": "user",
        "hashed_password": pwd_context.hash("userpassword"),
        "role": "user"
    }
}

# Models
class User(BaseModel):
    username: str
    password: str
    role: str  # Add role field

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str  # Add role to the response

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Azure OpenAI Configuration
aoai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
aoai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
aoai_deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
aoai_api_version = os.getenv("AZURE_OPENAI_VERSION", "2023-05-15")

# Initialize the AzureOpenAI client
client = AzureOpenAI(
    azure_endpoint=aoai_endpoint,
    api_key=aoai_api_key,
    api_version=aoai_api_version
)

# Initialize tiktoken for token counting
encoding = tiktoken.encoding_for_model("gpt-4")

# Initialize Sentence Transformer model
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

llm = LlamaAzureOpenAI(
    **azure_config,
    temperature=0.2,
)

# Set global LLM
Settings.llm = llm

# In-memory storage for documents and embeddings
documents = []
doc_embeddings = np.array([])

# In-memory storage for token usage data
token_usage_data = []

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(username: str, password: str):
    if username in fake_users_db:
        user_dict = fake_users_db[username]
        if verify_password(password, user_dict["hashed_password"]):
            return user_dict
    return None

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except jwt.PyJWTError:
        raise credentials_exception
    user = fake_users_db.get(username, None)
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def count_tokens(text: str, model_name: str = "gpt-4") -> int:
    """Count the number of tokens in a text string using tiktoken."""
    encoding = tiktoken.encoding_for_model(model_name)
    return len(encoding.encode(text))

def local_image_to_data_url(image_path: str) -> str:
    """Convert a local image file to a data URL."""
    mime_type, _ = guess_type(image_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'
    with open(image_path, "rb") as image_file:
        base64_encoded_data = base64.b64encode(image_file.read()).decode('utf-8')
    return f"data:{mime_type};base64,{base64_encoded_data}"

# Routes
@app.post("/register")
async def register(user: User):
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    fake_users_db[user.username] = {"username": user.username, "hashed_password": hashed_password, "role": user.role}
    return {"message": "User registered successfully"}



@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Authenticate user
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]},
        expires_delta=access_token_expires,
    )
    
    # Return token with role
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],  # Include role in the response
    }

@app.post("/describe")
async def describe_image(file: UploadFile = File(...), current_user: UserInDB = Depends(get_current_active_user)):
    try:
        # Save the uploaded file temporarily
        temp_image_path = f"temp_{file.filename}"
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await file.read())

        # Convert image to data URL
        data_url = local_image_to_data_url(temp_image_path)

        # Prepare the user's input text
        user_input_text = "Give a detailed explanation of the image in a professional and with exact details manner."

        # Count tokens in the user's input text
        input_token_count = count_tokens(user_input_text, model_name="gpt-4")

        # Call Azure OpenAI to generate description
        response = client.chat.completions.create(
            model=aoai_deployment_name,
            messages=[{
                "role": "system",
                "content": "You are an AI helpful assistant."
            }, {
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": user_input_text
                }, {
                    "type": "image_url",
                    "image_url": {
                        "url": data_url
                    }
                }]
            }],
            max_tokens=4000 - input_token_count,  # Adjust max_tokens based on input tokens
            temperature=0.9
        )

        # Extract the description
        img_description = response.choices[0].message.content

        # Count tokens in the generated description
        output_token_count = count_tokens(img_description, model_name="gpt-4")

        # Clean up the temporary file
        os.remove(temp_image_path)

        # Record token usage
        token_usage_data.append({
            "username": current_user["username"],
            "feature": "describe_image",
            "input_tokens": input_token_count,
            "output_tokens": output_token_count,
            "total_tokens": input_token_count + output_token_count,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Return the description along with token counts
        return {
            "description": img_description,
            "input_token_count": input_token_count,
            "output_token_count": output_token_count,
            "total_token_count": input_token_count + output_token_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize-topic")
def summarize_topic_endpoint(topic_request: TopicRequest, current_user: UserInDB = Depends(get_current_active_user)):
    try:
        topic = topic_request.topic
        logging.info(f"Searching for articles on: {topic}")
        
        # Step 1: Search for articles
        urls = search_articles(topic)
        if not urls:
            raise HTTPException(status_code=404, detail="No articles found.")
        
        # Step 2: Extract & Summarize
        summaries = []
        total_prompt_tokens = 0
        total_response_tokens = 0
        total_tokens = 0
        
        for url in urls:
            try:
                content = extract_blog_content(url)
                if not content:
                    logging.warning(f"Skipping URL {url} due to empty content.")
                    continue
                
                # Summarize the blog and get token counts
                summary, prompt_tokens, response_tokens = summarize_blog(content, url)
                
                # Accumulate token counts
                total_prompt_tokens += prompt_tokens
                total_response_tokens += response_tokens
                total_tokens += (prompt_tokens + response_tokens)
                
                summaries.append(summary)
            except Exception as e:
                logging.error(f"Skipping URL {url} due to error: {str(e)}")
        
        # Record token usage
        token_usage_data.append({
            "username": current_user["username"],
            "feature": "summarize_topic",
            "input_tokens": total_prompt_tokens,
            "output_tokens": total_response_tokens,
            "total_tokens": total_tokens,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Add token counts to the final response
        response = {
            "topic": topic,
            "articles": summaries,
            "tokens": {
                "prompt_tokens": total_prompt_tokens,
                "response_tokens": total_response_tokens,
                "total_tokens": total_tokens
            }
        }
        
        return response
    except Exception as e:
        logging.error(f"Error in /summarize-topic: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: UserInDB = Depends(get_current_active_user)):
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

        # Record token usage
        token_usage_data.append({
            "username": current_user["username"],
            "feature": "upload_file",
            "input_tokens": count_tokens(text),
            "output_tokens": 0,
            "total_tokens": count_tokens(text),
            "timestamp": datetime.utcnow().isoformat()
        })

        return {"message": f"Uploaded {len(documents)} documents successfully!"}
   
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
@app.post("/retrieve", response_model=List[DocumentResponse])
async def retrieve_documents(
    request: QueryRequest, 
    current_user: UserInDB = Depends(get_current_active_user)
):
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

        # Record token usage
        token_usage_data.append({
            "username": current_user["username"],
            "feature": "retrieve_documents",
            "input_tokens": count_tokens(request.query),
            "output_tokens": 0,
            "total_tokens": count_tokens(request.query),
            "timestamp": datetime.utcnow().isoformat()
        })

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
@app.post("/generate", response_model=AnswerResponse)
async def generate_answer(
    request: QueryRequest, 
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Generate an answer using the LLM with RAG."""
    global documents

    if not documents:
        raise HTTPException(status_code=400, detail="No documents uploaded yet")

    try:
        # Retrieve relevant context
        retrieved = await retrieve_documents(request)
        context = "\n".join([doc.document for doc in retrieved])

        # Generate answer
        prompt = f"""Context information:
{context}

Question: {request.query}
Answer clearly and concisely using the provided context. If unsure, state that you don't know."""

        response = llm.complete(prompt)

        # Record token usage
        token_usage_data.append({
            "username": current_user["username"],
            "feature": "generate_answer",
            "input_tokens": count_tokens(prompt),
            "output_tokens": count_tokens(response.text),
            "total_tokens": count_tokens(prompt) + count_tokens(response.text),
            "timestamp": datetime.utcnow().isoformat()
        })

        return AnswerResponse(answer=response.text.strip())

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating answer")

@app.get("/users")
def get_users():
    """Endpoint to fetch synthetic users"""
    logging.info("Generating synthetic users")
    return generate_synthetic_users()

@app.get("/token-usage")
async def get_token_usage(current_user: UserInDB = Depends(get_current_active_user)):
    """Get token usage data (admin only)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access token usage data")
    return token_usage_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)