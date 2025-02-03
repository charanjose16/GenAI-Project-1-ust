from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
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
import tiktoken  # Import tiktoken for token counting

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Mock user database
fake_users_db = {}

# Models
class User(BaseModel):
    username: str
    password: str

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

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

# Token counting with tiktoken
def count_tokens(text: str, model_name: str = "gpt-4") -> int:
    """Count the number of tokens in a text string using tiktoken."""
    encoding = tiktoken.encoding_for_model(model_name)
    return len(encoding.encode(text))

# Routes
@app.post("/register")
async def register(user: User):
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    fake_users_db[user.username] = {"username": user.username, "hashed_password": hashed_password}
    return {"message": "User registered successfully"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["username"]}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/describe")
async def describe_image(file: UploadFile = File(...), token: str = Depends(oauth2_scheme)):
    try:
        # Save the uploaded file temporarily
        temp_image_path = f"temp_{file.filename}"
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await file.read())

        # Convert image to data URL
        data_url = local_image_to_data_url(temp_image_path)

        # Prepare the user's input text
        user_input_text = "Give a detailed explanation of the image in a proffesional and with excate details manner."

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

        # Return the description along with token counts
        return {
            "description": img_description,
            "input_token_count": input_token_count,
            "output_token_count": output_token_count,
            "total_token_count": input_token_count + output_token_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def local_image_to_data_url(image_path: str) -> str:
    """
    Convert a local image file to a data URL.

    Parameters:
    -----------
    image_path : str
        The path to the local image file to be converted.

    Returns:
    --------
    str
        A data URL representing the image, suitable for embedding in HTML or other web contexts.
    """
    # Get mime type
    mime_type, _ = guess_type(image_path)

    if mime_type is None:
        mime_type = 'application/octet-stream'

    with open(image_path, "rb") as image_file:
        base64_encoded_data = base64.b64encode(image_file.read()).decode('utf-8')

    return f"data:{mime_type};base64,{base64_encoded_data}"

# Run the FastAPI app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)