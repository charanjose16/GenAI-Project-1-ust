from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import hashlib
from fastapi.security import OAuth2PasswordBearer
from typing import Dict
from openai import AzureOpenAI
import os
from dotenv import load_dotenv
import logging
from bs4 import BeautifulSoup
import tiktoken
import json
import requests
import urllib3
from urllib.parse import urlparse, parse_qs
import time
import base64
from fastapi import  File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import dspy
import tiktoken
from typing import List, Optional


app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
os.environ["CURL_CA_BUNDLE"] = "./huggingface.co.crt"
 
# Load Sentence Transformer model
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

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

class WebsiteDataResponse(BaseModel):
    hero_text: Optional[str]
    website_description: Optional[str]
    call_to_action: Optional[str]
    color_palette: Optional[List[str]]
    font_palette: Optional[List[str]]
    website_content: Optional[str]
    input_token_count: int
    output_token_count: int
    total_token_count: int
 
# DSPy Signature and Module
class WebsiteDataExtractionSignature(dspy.Signature):
    """Website data extraction"""
    website_screenshot: dspy.Image = dspy.InputField(desc="A screenshot of the website")
    hero_text: str = dspy.OutputField(desc="The hero text of the website")
    website_description: str = dspy.OutputField(desc="A description of the website")
    call_to_action: str = dspy.OutputField(desc="The call to action of the website")
    color_palette: List[str] = dspy.OutputField(desc="The color palette of the website")
    font_palette: List[str] = dspy.OutputField(desc="The font palette of the website")
    website_content: str = dspy.OutputField(desc="The main content of the website")
 
class WebsiteDataExtraction(dspy.Module):
    def __init__(self):
        self.website_data_extraction = dspy.ChainOfThought(WebsiteDataExtractionSignature)
 
    def forward(self, website_screenshot: str):
        return self.website_data_extraction(website_screenshot=website_screenshot)
 
# Initialize FastAPI app
app = FastAPI()
 
# CORS Middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")
 
# Serve the main index.html
@app.get("/", response_class=FileResponse)
async def read_index():
    return FileResponse("static/index.html")
 
# Initialize DSPy with Azure OpenAI
dspy_lm = dspy.LM(
    model='azure/gpt-35-turbo',
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_base=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-15-preview",
    temperature=0.2,
    max_tokens=4096,
)
dspy.configure(lm=dspy_lm)
website_data_extractor = WebsiteDataExtraction()

def create_jwt_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str):
    return hash_password(plain_password) == hashed_password

# In-memory storage
fake_users_db = {}
fake_tokens_db = {}  # Maps user_id to total tokens

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class TokenUpdate(BaseModel):
    user_id: int
    tokens_used: int

class TopicRequest(BaseModel):
    topic: str

def search_articles(topic: str):
    """
    Search for articles related to the topic using DuckDuckGo.
    Returns a list of article URLs.
    """
    try:
        # Refine the query by appending "articles" to make it more specific
        refined_topic = f"{topic} articles"
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(
            f"https://html.duckduckgo.com/html/?q={refined_topic}",
            headers=headers,
            verify=False
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        results = soup.find_all("a", class_="result__url")
        urls = []

        for result in results:
            if "href" in result.attrs:
                raw_url = result["href"]
                parsed_url = urlparse(raw_url)
                query_params = parse_qs(parsed_url.query)

                # Extract URL from 'uddg' parameter
                if "uddg" in query_params:
                    fixed_url = query_params["uddg"][0]
                else:
                    # Fallback to raw URL if 'uddg' is missing
                    fixed_url = raw_url

                if not fixed_url.startswith("http"):
                    fixed_url = "https://" + fixed_url
                urls.append(fixed_url)

            # Add a small delay to avoid rate limiting
            time.sleep(1)

        logging.info(f"Extracted URLs: {urls}")
        return urls[:5]  # Limit to 5 results
    except Exception as e:
        logging.error(f"Error searching articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search for articles.")

def extract_blog_content(url):
    """
    Extracts content from a blog article given a URL.
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, verify=False)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        paragraphs = soup.find_all("p")
        content = " ".join([p.get_text() for p in paragraphs])

        if not content.strip():
            logging.warning(f"No content extracted from URL: {url}")
            return None

        return content
    except Exception as e:
        logging.error(f"Error extracting blog content: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to extract blog content: {str(e)}")

def summarize_blog(content, url):
    """
    Summarize the blog content using Azure OpenAI.
    """
    try:
        prompt = f"""
        Summarize the following blog content in a simple paragraph.
        Blog Content:
        {content}
        Return the summary in JSON format:
        {{
            "summary": "Your summary here...",
            "reference_link": "{url}"
        }}
        """
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=[{"role": "system", "content": "You summarize articles."}, {"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )
        generated_text = response.choices[0].message.content
        summary_data = json.loads(generated_text)
        return {
            "summary": summary_data["summary"],
            "reference_link": summary_data["reference_link"],
        }
    except Exception as e:
        logging.error(f"Error summarizing blog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error summarizing blog: {str(e)}")


@app.post("/signup")
async def signup(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = len(fake_users_db) + 1  # Simple ID assignment
    fake_users_db[user.email] = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": user.role
    }
    fake_tokens_db[user_id] = 0  # Initialize token count
    return {"message": "User created successfully"}



@app.post("/login")
async def login(user_data: UserLogin):
    user = fake_users_db.get(user_data.email)
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token({"user_id": user["id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        for user in fake_users_db.values():
            if user["id"] == user_id:
                return user
        raise HTTPException(status_code=401, detail="User not found")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

@app.get("/user/tokens")
async def get_user_tokens(current_user: dict = Depends(get_current_user)):
    return {"total_tokens": fake_tokens_db.get(current_user["id"], 0)}

@app.get("/admin/all-tokens")
async def get_all_tokens(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return fake_tokens_db

@app.post("/update-tokens")
async def update_tokens(token_update: TokenUpdate, current_user: dict = Depends(get_current_user)):
    if token_update.user_id not in fake_tokens_db:
        raise HTTPException(status_code=404, detail="User not found")
    fake_tokens_db[token_update.user_id] += token_update.tokens_used
    return {"message": "Tokens updated successfully"}

@app.post("/summarize-topic")
def summarize_topic_endpoint(topic_request: TopicRequest):
    """
    Endpoint to search for articles and summarize them.
    """
    try:
        topic = topic_request.topic
        logging.info(f"Searching for articles on: {topic}")
        # Step 1: Search for articles
        urls = search_articles(topic)
        if not urls:
            raise HTTPException(status_code=404, detail="No articles found.")
        # Step 2: Extract & Summarize
        summaries = []
        for url in urls:
            try:
                content = extract_blog_content(url)
                if not content:
                    logging.warning(f"Skipping URL {url} due to empty content.")
                    continue
                summary = summarize_blog(content, url)
                summaries.append(summary)
            except Exception as e:
                logging.error(f"Skipping URL {url} due to error: {str(e)}")
        return {"topic": topic, "articles": summaries}
    except Exception as e:
        logging.error(f"Error in /summarize-topic: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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
 
# Answer generation endpoint
@app.post("/generate", response_model=AnswerResponse)
async def generate_answer(request: QueryRequest):
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
        return AnswerResponse(answer=response.text.strip())
   
    except Exception as e:
        logging.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating answer")

@app.post("/extract-website-data/", response_model=WebsiteDataResponse)
async def extract_website_data(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image.")
 
        image_data = await file.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        image_data_uri = f"data:{file.content_type};base64,{base64_data}"
 
        tokenizer = tiktoken.get_encoding("cl100k_base")
        input_token_count = len(tokenizer.encode(image_data_uri))
 
        website_data = website_data_extractor(image_data_uri)
 
        output_token_count = len(tokenizer.encode(website_data.website_content or ""))
        total_token_count = input_token_count + output_token_count
 
        return WebsiteDataResponse(
            hero_text=website_data.hero_text,
            website_description=website_data.website_description,
            call_to_action=website_data.call_to_action,
            color_palette=website_data.color_palette,
            font_palette=website_data.font_palette,
            website_content=website_data.website_content,
            input_token_count=input_token_count,
            output_token_count=output_token_count,
            total_token_count=total_token_count,
        )
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing the image: {str(e)}")
 

