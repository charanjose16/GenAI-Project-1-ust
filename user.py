import os
import json
import logging
import re
import tiktoken
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import dspy
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
import datetime
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)

# PostgreSQL Database configuration
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "token_db")

# Create database if it doesn't exist
def create_database():
    try:
        # Connect to PostgreSQL server
        conn = psycopg2.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (DB_NAME,))
        exists = cur.fetchone()
        
        if not exists:
            cur.execute(f'CREATE DATABASE {DB_NAME}')
            logging.info(f"Database {DB_NAME} created successfully")
        
        cur.close()
        conn.close()
    except Exception as e:
        logging.error(f"Error creating database: {str(e)}")
        raise e

# Create database before setting up SQLAlchemy
create_database()

# SQLAlchemy setup
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)  # 'admin' or 'user'
    tokens = relationship("TokenUsage", back_populates="user")

class TokenUsage(Base):
    __tablename__ = "token_usage"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tokens_used = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="tokens")

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

# Initialize tiktoken
encoding = tiktoken.encoding_for_model("gpt-4")

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def clean_json_response(text):
    cleaned_text = re.sub(r"```json\s*|\s*```", "", text)
    return cleaned_text.strip()

def count_tokens(text):
    return len(encoding.encode(text))

# Configure DSPy with Azure OpenAI
azure_lm = dspy.LM(
    model='azure/gpt-35-turbo',
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_base=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-15-preview",
    temperature=0.2,
    max_tokens=4096,
)
dspy.configure(lm=azure_lm)

class UserDetailsPrompt(dspy.Signature):
    prompt = dspy.InputField(desc="Generate 5 user details as separate user objects in a JSON array format.")
    response = dspy.OutputField(desc="JSON array of user details.")

@app.get("/", response_class=HTMLResponse)
async def get_home():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>User Generator</title>
        <script>
            function generateUsers() {
                const username = document.getElementById('username').value || 'anonymous';
                fetch('/generate-users?username=' + encodeURIComponent(username))
                    .then(response => response.json())
                    .then(data => {
                        // Store token count in localStorage
                        const currentCount = parseInt(localStorage.getItem('totalTokens') || '0');
                        localStorage.setItem('totalTokens', currentCount + data.token_count);
                        
                        // Store request history
                        const history = JSON.parse(localStorage.getItem('requestHistory') || '[]');
                        history.push({
                            timestamp: new Date().toISOString(),
                            tokens: data.token_count,
                            username: username
                        });
                        localStorage.setItem('requestHistory', JSON.stringify(history));
                        
                        // Update display
                        document.getElementById('users').textContent = JSON.stringify(data.users, null, 2);
                    });
            }
            
            function clearStorage() {
                localStorage.clear();
                document.getElementById('users').textContent = '';
            }
        </script>
    </head>
    <body>
        <h1>User Generator</h1>
        <div>
            <input type="text" id="username" placeholder="Enter username">
            <button onclick="generateUsers()">Generate Users</button>
            <button onclick="clearStorage()">Clear Storage</button>
        </div>
        
        <h3>Generated Users:</h3>
        <pre id="users"></pre>
    </body>
    </html>
    """

@app.get("/generate-users")
async def get_user_details(username: str = "anonymous", db: SessionLocal = Depends(get_db)):
    try:
        # Create or get user
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(username=username, role="user")
            db.add(user)
            db.commit()
            db.refresh(user)

        # Generate users
        user_details_predictor = dspy.Predict(UserDetailsPrompt)
        result = user_details_predictor(prompt="Generate 5 user details as separate user objects in a JSON array format.")
        
        json_response = result.response.strip()
        cleaned_text = clean_json_response(json_response)
        users = json.loads(cleaned_text)
        
        # Count tokens
        token_count = count_tokens(json_response)
        
        # Check if there's an existing TokenUsage entry for the user
        token_usage = db.query(TokenUsage).filter(TokenUsage.user_id == user.id).first()
        
        if token_usage:
            # Update existing tokens
            token_usage.tokens_used += token_count
            token_usage.timestamp = datetime.datetime.utcnow()
        else:
            # Create new TokenUsage entry
            token_usage = TokenUsage(user_id=user.id, tokens_used=token_count)
            db.add(token_usage)
        
        db.commit()
        
        return JSONResponse(content={
            "users": users,
            "token_count": token_count
        })
        
    except Exception as e:
        db.rollback()
        logging.error(f"Error generating user details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Create database tables
    logging.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create a default admin user if it doesn't exist
    with SessionLocal() as db:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(username="admin", role="admin")
            db.add(admin)
            db.commit()
            logging.info("Created admin user")
    
    logging.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)