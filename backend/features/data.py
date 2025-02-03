from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import logging
import json
import re
import tiktoken
import random
import uuid
from dspy import LM  # Import LM from the correct library

# Load environment variables
load_dotenv()

# Configure logging
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


# Token counting with tiktoken
encoding = tiktoken.encoding_for_model("gpt-4")

def count_tokens(text):
    return len(encoding.encode(text))

# Configure LM (Language Model)
lm = LM(
    model="azure/" + os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_base=os.getenv("AZURE_OPENAI_ENDPOINT"),
    temperature=0.7,
    top_p=0.9,
    max_tokens=4096,
    model_kwargs={
        "seed": random.randint(0, 100000),
        "headers": {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    }
)

def get_dynamic_instruction():
    """Generate a unique prompt with variations"""
    variations = [
        "Create 5 synthetic user profiles including",
        "Generate 5 artificial user records containing",
        "Produce 5 fictional user entries with",
        "Develop 5 simulated user accounts featuring",
        "Construct 5 mock user identities with"
    ]
    
    field_sets = [
        ("firstname", "lastname", "email", "date_of_birth", "salary"),
        ("given_name", "family_name", "email_address", "birthdate", "annual_income"),
        ("first_name", "surname", "contact_email", "dob", "monthly_salary"),
        ("firstName", "lastName", "userEmail", "birthDate", "currentSalary")
    ]
    
    unique_id = str(uuid.uuid4())[:8]
    selected_variation = random.choice(variations)
    selected_fields = random.choice(field_sets)
    
    field_descriptions = []
    for field in selected_fields:
        if "name" in field:
            field_descriptions.append(f"- {field} (string)")
        elif "email" in field:
            field_descriptions.append(f"- {field} (valid email format)")
        elif "date" in field or "dob" in field:
            field_descriptions.append(f"- {field} (YYYY-MM-DD)")
        elif "salary" in field or "income" in field:
            field_descriptions.append(f"- {field} (float)")
    
    return f"""
    {selected_variation} (Request ID: {unique_id}):
    {"\n".join(field_descriptions)}
    """

def clean_json_response(text):
    """
    Remove markdown code fences and any extra leading text like "json"
    """
    # Remove the starting ```json (case insensitive) and the trailing ```
    cleaned_text = re.sub(r"(?i)```json", "", text)
    cleaned_text = re.sub(r"```", "", cleaned_text)
    return cleaned_text.strip()

def generate_synthetic_users():
    try:
        instruction = get_dynamic_instruction()
        
        # Count tokens in the instruction
        prompt_tokens = count_tokens(instruction)
        logging.info(f"Prompt tokens: {prompt_tokens}")
        
        # Simulate a response (replace this with actual OpenAI API call)
        generated_text = """
        ```json
        [
            {"firstname": "John", "lastname": "Doe", "email": "john.doe@example.com", "date_of_birth": "1990-01-01", "salary": 50000},
            {"firstname": "Jane", "lastname": "Smith", "email": "jane.smith@example.com", "date_of_birth": "1985-05-12", "salary": 60000}
        ]
        ```
        """
        
        # Count tokens in the generated response
        response_tokens = count_tokens(generated_text)
        logging.info(f"Response tokens: {response_tokens}")
        
        # Clean the JSON response
        cleaned_text = clean_json_response(generated_text)
        
        try:
            users = json.loads(cleaned_text)
            return {
                "users": users,
                "token_counts": {
                    "prompt_tokens": prompt_tokens,
                    "response_tokens": response_tokens,
                    "total_tokens": prompt_tokens + response_tokens,
                },
                "cache_info": {
                    "cache_status": "disabled",
                    "request_id": instruction.split("ID: ")[1][:8]
                }
            }
        except json.JSONDecodeError as e:
            logging.error(f"JSON parsing error: {str(e)}")
            logging.error(f"Generated text: {cleaned_text}")
            return {
                "users": [],
                "error": "Failed to parse JSON response",
                "raw_response": cleaned_text
            }
           
    except Exception as e:
        logging.error(f"Error generating users: {str(e)}")
        return {
            "error": str(e),
        }

@app.get("/users")
def get_users():
    """Endpoint to fetch synthetic users"""
    logging.info("Generating synthetic users")
    return generate_synthetic_users()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)
