import os
import json
import logging
import re
import tiktoken
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import dspy
 
# Load environment variables
load_dotenv()
 
# Set up logging
logging.basicConfig(level=logging.INFO)
 
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
                fetch('/generate-users')
                    .then(response => response.json())
                    .then(data => {
                        // Store token count in localStorage without displaying
                        const currentCount = parseInt(localStorage.getItem('totalTokens') || '0');
                        localStorage.setItem('totalTokens', currentCount + data.token_count);
                       
                        // Update users display
                        document.getElementById('users').textContent = JSON.stringify(data.users, null, 2);
                    });
            }
           
            function clearDisplay() {
                document.getElementById('users').textContent = '';
            }
        </script>
    </head>
    <body>
        <h1>User Generator</h1>
        <div>
            <button onclick="generateUsers()">Generate Users</button>
            <button onclick="clearDisplay">Clear Display</button>
        </div>
       
        <h3>Generated Users:</h3>
        <pre id="users"></pre>
    </body>
    </html>
    """
 
@app.get("/generate-users")
async def get_user_details():
    try:
        # Generate users
        user_details_predictor = dspy.Predict(UserDetailsPrompt)
        result = user_details_predictor(prompt="Generate 5 user details as separate user objects in a JSON array format.")
       
        json_response = result.response.strip()
        cleaned_text = clean_json_response(json_response)
        users = json.loads(cleaned_text)
       
        # Count tokens
        token_count = count_tokens(json_response)
       
        return JSONResponse(content={
            "users": users,
            "token_count": token_count
        })
       
    except Exception as e:
        logging.error(f"Error generating user details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
 
if __name__ == "__main__":
    import uvicorn
    logging.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)