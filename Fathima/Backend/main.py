from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import List, Optional
import dspy
from dotenv import load_dotenv
import tiktoken
import base64
import os
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, ForeignKey, CheckConstraint, text
from passlib.context import CryptContext
 
# Load environment variables
load_dotenv()
 
# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/fathima")
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()
 
# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
 
# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
 
# Database Models
class UserDB(Base):
    __tablename__ = "users"
   
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(10), CheckConstraint("role IN ('admin', 'user')"), nullable=False)
 
class TokenDB(Base):
    __tablename__ = "tokens"
   
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tokens_used = Column(Integer, default=0)
 
# ✅ Async Database Initialization
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
 
# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
 
# Pydantic Models
class User(BaseModel):
    username: str
    email: str
    role: str
 
class UserRegistration(User):
    password: str
 
class UserResponse(User):
    id: int
 
class TokenData(BaseModel):
    username: Optional[str] = None
 
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
 
class WebsiteDataResponse(BaseModel):
    hero_text: Optional[str]
    website_description: Optional[str]
    call_to_action: Optional[str]
    color_palette: Optional[List[str]]
    font_palette: Optional[List[str]]
    website_content: Optional[str]  # Website content field
    input_token_count: int  # Added field for input token count
    output_token_count: int  # Added field for output token count
    total_token_count: int  # Added field for total token count
 
# Define the DSPy Signature and Module
class WebsiteDataExtractionSignature(dspy.Signature):
    """Website data extraction"""
    website_screenshot: dspy.Image = dspy.InputField(desc="A screenshot of the website")
    hero_text: str = dspy.OutputField(desc="The hero text of the website")
    website_description: str = dspy.OutputField(desc="A description of the website")
    call_to_action: str = dspy.OutputField(desc="The call to action of the website")
    color_palette: List[str] = dspy.OutputField(desc="The color palette of the website")
    font_palette: List[str] = dspy.OutputField(desc="The font palette of the website")
    website_content: str = dspy.OutputField(desc="The main content of the website")  # Website content field
 
class WebsiteDataExtraction(dspy.Module):
    def __init__(self):
        self.website_data_extraction = dspy.ChainOfThought(WebsiteDataExtractionSignature)
 
    async def forward(self, website_screenshot: str):
        website_data = self.website_data_extraction(website_screenshot=website_screenshot)
        return website_data
 
# ✅ Initialize the WebsiteDataExtraction module
website_data_extractor = WebsiteDataExtraction()
 
# ✅ Initialize DSPy with the Azure OpenAI Language Model
dspy_lm = dspy.LM(
    model='azure/gpt-35-turbo',
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_base=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-15-preview",
    temperature=0.2,
    max_tokens=4096,
)
dspy.configure(lm=dspy_lm)
 
# ✅ Async Function to Get DB Session
async def get_db():
    async with SessionLocal() as db:
        yield db
 
# Function to create JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
 
# Function to verify password
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)
 
# Function to get password hash
def get_password_hash(password: str):
    return pwd_context.hash(password)
 
# ✅ Async Function to Authenticate User
async def authenticate_user(db: AsyncSession, username: str, password: str):
    result = await db.execute(
        text("SELECT id, username, password_hash, role FROM users WHERE username = :username"),
        {"username": username},
    )
    user = result.fetchone()
    if user is None:
        return None
   
    user_dict = dict(zip(["id", "username", "password_hash", "role"], user))
 
    if not verify_password(password, user_dict["password_hash"]):
        return None
 
    return user_dict
 
# Function to get current user from token
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
   
    result = await db.execute(
        text("SELECT id, username, email, role FROM users WHERE username = :username"),
        {"username": token_data.username},
    )
    user = result.fetchone()
    if user is None:
        raise credentials_exception
 
    return dict(zip(["id", "username", "email", "role"], user))
 
# Initialize FastAPI app
app = FastAPI()
 
# Login endpoint to get JWT token
@app.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["username"]}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}
 
# User registration endpoint
# User registration endpoint
@app.post("/register", response_model=UserResponse)
async def register(user: UserRegistration, db: AsyncSession = Depends(get_db)):
    # Check if username or email already exists
    existing_user = await db.execute(
        text("SELECT id FROM users WHERE username = :username OR email = :email"),
        {"username": user.username, "email": user.email},
    )
    if existing_user.fetchone():
        raise HTTPException(status_code=400, detail="Username or email already registered")
 
    # Hash the password
    hashed_password = get_password_hash(user.password)
 
    # Create new user in the database
    await db.execute(
        text("INSERT INTO users (username, email, password_hash, role) VALUES (:username, :email, :password_hash, :role)"),
        {"username": user.username, "email": user.email, "password_hash": hashed_password, "role": user.role},
    )
    await db.commit()
 
    # Retrieve the created user (including the ID)
    result = await db.execute(
        text("SELECT id, username, email, role FROM users WHERE username = :username"),
        {"username": user.username},
    )
    new_user = result.fetchone()
 
    # Return the created user with the 'id' field populated
    return UserResponse(id=new_user[0], username=new_user[1], email=new_user[2], role=new_user[3])
 
 
# Protected endpoint to extract website data
@app.post("/extract-website-data/", response_model=WebsiteDataResponse)
async def extract_website_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract website data from a screenshot and update or insert the user's token usage.
 
    Args:
        file (UploadFile): The website screenshot image file.
 
    Returns:
        WebsiteDataResponse: Extracted website data.
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image.")
 
        # Read and encode the image
        image_data = await file.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        image_data_uri = f"data:{file.content_type};base64,{base64_data}"
 
        # Token count for the input (image data as text)
        tokenizer = tiktoken.get_encoding("cl100k_base")  # Choose appropriate model
        input_token_count = len(tokenizer.encode(image_data_uri))  # Count tokens in input image data
 
        # Extract website data using DSPy
        website_data = await website_data_extractor.forward(image_data_uri)
 
        # Token count for the output (website content)
        output_token_count = len(tokenizer.encode(website_data.website_content or ""))  # Count tokens in the extracted content
 
        # Calculate total token count
        total_token_count = input_token_count + output_token_count
 
        # Check if the user already has a record in the tokens table
        result = await db.execute(
            text("SELECT tokens_used FROM tokens WHERE user_id = :user_id"),
            {"user_id": current_user["id"]},
        )
        token_entry = result.fetchone()
 
        if token_entry:
            # If the record exists, update the tokens_used
            await db.execute(
                text("UPDATE tokens SET tokens_used = tokens_used + :count WHERE user_id = :user_id"),
                {"count": total_token_count, "user_id": current_user["id"]},
            )
        else:
            # If no record exists, insert a new entry with the initial tokens_used
            await db.execute(
                text("INSERT INTO tokens (user_id, tokens_used) VALUES (:user_id, :tokens_used)"),
                {"user_id": current_user["id"], "tokens_used": total_token_count},
            )
 
        # Commit the transaction
        await db.commit()
 
        # Return the extracted data along with token counts
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
        # Log the error for debugging
        print(f"Error: {str(e)}")
        # Return a more detailed HTTPException with the error message
        raise HTTPException(status_code=500, detail=f"Error processing the image: {str(e)}")
 
 
 
 
# Run the FastAPI app
if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())  # ✅ Initialize DB before running the server
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)