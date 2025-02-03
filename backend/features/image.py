from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
# Additional imports for DSPy
import dspy
import base64
import tiktoken
import os

# Load environment variables
load_dotenv()

# Define the response model
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

# DSPy Signature and Module for image description
class WebsiteDataExtractionSignature(dspy.Signature):
    """Website data extraction from image"""
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

# Token counting with tiktoken
def count_tokens(text: str, model_name: str = "gpt-4") -> int:
    """Count the number of tokens in a text string using tiktoken."""
    encoding = tiktoken.encoding_for_model(model_name)
    return len(encoding.encode(text))

@app.post("/describe")
async def describe_image(file: UploadFile = File(...), token: str = Depends(oauth2_scheme)):
    try:
        # Save the uploaded file temporarily
        temp_image_path = f"temp_{file.filename}"
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await file.read())

        # Convert image to base64 data URL
        mime_type, _ = guess_type(temp_image_path)
        with open(temp_image_path, "rb") as image_file:
            base64_data = base64.b64encode(image_file.read()).decode('utf-8')
        image_data_uri = f"data:{mime_type};base64,{base64_data}"

        # Count input tokens
        input_token_count = count_tokens(image_data_uri, model_name="gpt-4")

        # Extract website data using DSPy
        website_data = website_data_extractor(image_data_uri)

        # Count output tokens
        output_token_count = count_tokens(website_data.website_content or "", model_name="gpt-4")

        # Total token count
        total_token_count = input_token_count + output_token_count

        # Clean up temporary image file
        os.remove(temp_image_path)

        # Return the description along with token counts
        return WebsiteDataResponse(
            hero_text=website_data.hero_text,
            website_description=website_data.website_description,
            call_to_action=website_data.call_to_action,
            color_palette=website_data.color_palette,
            font_palette=website_data.font_palette,
            website_content=website_data.website_content,
            input_token_count=input_token_count,
            output_token_count=output_token_count,
            total_token_count=total_token_count
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
