from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
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

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize FastAPI app
app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Azure OpenAI client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

# Initialize tiktoken for token counting
encoding = tiktoken.encoding_for_model("gpt-4")

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
    Returns the summary, prompt tokens, and response tokens.
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
        
        # Calculate the number of tokens in the prompt
        prompt_tokens = len(encoding.encode(prompt))
        
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=[{"role": "system", "content": "You summarize articles."}, {"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )
        
        # Extract the generated text from the response
        generated_text = response.choices[0].message.content
        
        # Calculate the number of tokens in the response
        response_tokens = len(encoding.encode(generated_text))
        
        # Parse the summary from the generated text
        summary_data = json.loads(generated_text)
        summary = {
            "summary": summary_data["summary"],
            "reference_link": summary_data["reference_link"],
        }
        
        return summary, prompt_tokens, response_tokens
    except Exception as e:
        logging.error(f"Error summarizing blog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error summarizing blog: {str(e)}")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)