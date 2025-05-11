import asyncio
import requests
import re
from google import genai
import newspaper

# Initialize Gemini API client

GEMINI_API_KEY = "AIzaSyCkUdRku6I0MnRCQTmdpWPyP7oLqc8l_pc"
BRAVE_API_KEY = "BSAefBG3VY1hM6Q4r9BxbcorkGzu6AI"
client = genai.Client(api_key=GEMINI_API_KEY)

# Simple Prompt Template
ANSWER_PROMPT = """
Answer the following question based on the search results and provide a detailed answer.
Question: {QUESTION}
Search Results:
{SEARCH_RESULTS}
Answer in markdown format and wrap your final answer within <answer> </answer> tags.
"""

def extract_xml_content(text: str, start_tag: str, end_tag: str) -> str:
    """Extract XML-like content from AI response."""
    match = re.search(f"{re.escape(start_tag)}(.*?){re.escape(end_tag)}", text, re.DOTALL)
    return match.group(1).strip() if match else ""

def get_search_results(search_query: str, limit: int = 3):
    """Fetch search results from Brave Search API."""
    headers = {"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY}
    response = requests.get(
        "https://api.search.brave.com/res/v1/web/search",
        params={"q": search_query, "count": limit},
        headers=headers,
        timeout=60
    )
    return response.json().get("web", {}).get("results", []) if response.ok else []

def get_url_content(url: str) -> str:
    """Extract and clean content from a given URL using Newspaper library."""
    article = newspaper.Article(url)
    try:
        article.download()
        article.parse()
        return article.text or ""
    except newspaper.article.ArticleException:
        return ""

async def stream_response(query: str, results):
    """Stream AI response using Gemini."""
    formatted_results = "\n\n".join(
        [f"{idx+1}. {res['title']}\n{res['url']}\n{res.get('content', '')}" for idx, res in enumerate(results)]
    )

    prompt = ANSWER_PROMPT.format(QUESTION=query, SEARCH_RESULTS=formatted_results)

    stream = client.models.generate_content_stream(
    model="gemini-2.0-flash",
    contents=[prompt]
)

    print("\nStreaming AI response:\n")
    full_response = ""

    for chunk in stream:  # regular for loop, not async for
        content_piece = chunk.text
        if content_piece:
            print(content_piece, end="", flush=True)
            full_response += content_piece


    print("\n\n---\nFinal Extracted Answer:\n")
    final_answer = extract_xml_content(full_response, "<answer>", "</answer>")
    print(final_answer)

async def main():
    query = input("Enter your question: ")

    print("\nFetching search results...")
    results = get_search_results(query)

    for res in results:
        res['content'] = get_url_content(res['url'])

    if not results:
        print("No search results found.")
        return

    await stream_response(query, results)

if __name__ == "__main__":
    asyncio.run(main())
