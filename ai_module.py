# import json
# from google import genai
# from time import sleep
# from typing import Dict, List
# import newspaper
# from config import BRAVE_API_KEY, GEMINI_API_KEY, MODEL_NAME
# import requests
# import os
# from prompts import ANSWER_PROMPT, RELATED_QUERIES_PROMPT, RELEVANT_CONTEXT_PROMPT
# import re

# # Initialize Gemini API client
# client = genai.Client(api_key=GEMINI_API_KEY)

# # Store rolling chat context
# current_context = ""

# def extract_xml_content(text: str, start_tag: str, end_tag: str) -> str:
#     match = re.search(f"{re.escape(start_tag)}(.*?){re.escape(end_tag)}", text, re.DOTALL)
#     if not match:
#         return ""
#     content = match.group(1).strip()
#     content = re.sub(r"^```json\\s*", "", content)  # Remove leading ```
#     content = re.sub(r"\\s*```$", "", content)  # Remove trailing ```
#     return content.strip()

# def extract_relevant_context(chat_history: str, new_query: str) -> str:
#     """
#     Extract only the most relevant parts of past chat history for better context retention.
#     """
#     prompt = RELEVANT_CONTEXT_PROMPT.format(CHAT_HISTORY=chat_history, NEW_QUERY=new_query)
#     response = client.models.generate_content(
#         model="gemini-2.0-flash", contents=[prompt]
#     )
#     #print("\n[DEBUG] Gemini API Raw Response for relevant context:", response.text)
#     relevant_context = extract_xml_content(response.text, "<context>", "</context>")
#     return relevant_context

# def generate_related_queries(query: str, context: str) -> List[str]:
#     # Include context directly in the prompt formatting
#     prompt = RELATED_QUERIES_PROMPT.format(QUESTION=query, CONTEXT=context)
#     response = client.models.generate_content(
#         model="gemini-2.0-flash", contents=[prompt]
#     )
#     #print("\n[DEBUG] Gemini API Raw Response for related queries:", response.text)   
#     json_content = extract_xml_content(response.text, "<answer>", "</answer>")
#     if json_content:
#         try:
#             queries = json.loads(json_content)
#             return queries.get("related_queries", [])
#         except json.JSONDecodeError as e:
#             print("Error parsing JSON from Gemini response:", e)
#             print("Extracted Content:", json_content)
#     return []


# def get_search_results(search_query: str, limit: int = 3):
#     headers = {"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY}
#     response = requests.get(
#         "https://api.search.brave.com/res/v1/web/search",
#         params={"q": search_query, "count": limit},
#         headers=headers,
#         timeout=60,
#     )
#     if not response.ok:
#         raise Exception(f"HTTP error {response.status_code}")
#     sleep(1)
#     return response.json().get("web", {}).get("results", [])

# def get_url_content(url: str) -> str:
#     article = newspaper.Article(url)
#     try:
#         article.download()
#         article.parse()
#         return article.text or ""
#     except newspaper.article.ArticleException:
#         return ""

# def generate_response(query: str, results: List[Dict]) -> str:
#     global current_context  # Use the rolling context

#     formatted_results = "\n\n".join(
#         [
#             f"{idx+1}. {res['title']}\n{res['url']}\n{res.get('content', '')}"
#             for idx, res in enumerate(results)
#         ]
#     )
    
#     # Extract relevant past context
#     relevant_context = extract_relevant_context(current_context, query)
    
#     # Prepare AI prompt with refined context
#     prompt = ANSWER_PROMPT.format(
#         QUESTION=query, 
#         SEARCH_RESULTS=formatted_results, 
#         CHAT_HISTORY=relevant_context  # Only relevant context is included
#     )
    
#     response = client.models.generate_content(
#         model="gemini-2.0-flash", contents=[prompt],
        
#     )
#     answer_content = extract_xml_content(response.text, "<answer>", "</answer>")
    
#     # Update rolling context
#     current_context = relevant_context + f"User: {query}\nAI: {answer_content}\n"
    
#     return answer_content

# def ask(query: str):
#     if not query:
#         print("Query cannot be empty.")
#         return
    
#     print("\nFetching related queries...")
#         # Generate related queries with the current context included
#     related_queries = generate_related_queries(query, current_context)
        
#     print("\nFetching search results...")
#     all_results = []
#     for q in related_queries + [query]:
#         results = get_search_results(q)
#         for res in results:
#             res['content'] = get_url_content(res['url'])
#         all_results.extend(results)
    
#     if not all_results:
#         print("No search results found.")
#         return
    
#     print("\nGenerating response...")
#     answer = generate_response(query, all_results)
    
#     print("\nFinal Answer:")
#     print(answer or "No valid answer generated.")
    
#     print("\nSources:")
#     for idx, result in enumerate(all_results):
#         print(f"{idx+1}. {result['title']} ({result['url']})")

# def main():
#     print("Welcome to AI Search Assistant! Type 'exit' to end chat.")
#     while True:
#         query = input("\nYou: ").strip()
#         if query.lower() == "exit":
#             print("Goodbye!")
#             break
#         ask(query)

# if __name__ == "__main__":
#     main()


import json
import re
import newspaper
import requests
from time import sleep
from google import genai
from config import BRAVE_API_KEY, GEMINI_API_KEY
from prompts import ANSWER_PROMPT, RELATED_QUERIES_PROMPT, RELEVANT_CONTEXT_PROMPT

# Initialize Gemini API client
client = genai.Client(api_key=GEMINI_API_KEY)

# Store rolling chat context
current_context = ""

def extract_xml_content(text: str, start_tag: str, end_tag: str) -> str:
    match = re.search(f"{re.escape(start_tag)}(.*?){re.escape(end_tag)}", text, re.DOTALL)
    return match.group(1).strip() if match else ""

def extract_relevant_context(chat_history: str, new_query: str) -> str:
    prompt = RELEVANT_CONTEXT_PROMPT.format(CHAT_HISTORY=chat_history, NEW_QUERY=new_query)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
    return extract_xml_content(response.text, "<context>", "</context>")

def generate_related_queries(query: str, context: str):
    prompt = RELATED_QUERIES_PROMPT.format(QUESTION=query, CONTEXT=context)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
    json_content = extract_xml_content(response.text, "<answer>", "</answer>")
    try:
        return json.loads(json_content).get("related_queries", []) if json_content else []
    except json.JSONDecodeError:
        return []

def get_search_results(search_query: str, limit: int = 3):
    headers = {"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY}
    response = requests.get("https://api.search.brave.com/res/v1/web/search", 
                            params={"q": search_query, "count": limit}, 
                            headers=headers, timeout=60)
    return response.json().get("web", {}).get("results", []) if response.ok else []

def get_url_content(url: str) -> str:
    article = newspaper.Article(url)
    try:
        article.download()
        article.parse()
        return article.text or ""
    except newspaper.article.ArticleException:
        return ""

def generate_response(query: str, results):
    global current_context
    formatted_results = "\n\n".join([f"{idx+1}. {res['title']}\n{res['url']}\n{res.get('content', '')}" 
                                    for idx, res in enumerate(results)])
    relevant_context = extract_relevant_context(current_context, query)
    prompt = ANSWER_PROMPT.format(QUESTION=query, SEARCH_RESULTS=formatted_results, CHAT_HISTORY=relevant_context)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
    answer_content = extract_xml_content(response.text, "<answer>", "</answer>")
    current_context = relevant_context + f"User: {query}\nAI: {answer_content}\n"
    return answer_content

def generate_ai_response(query: str):
    related_queries = generate_related_queries(query, current_context)
    all_results = []
    for q in related_queries + [query]:
        results = get_search_results(q)
        for res in results:
            res['content'] = get_url_content(res['url'])
        all_results.extend(results)

    if not all_results:
        return None

    answer = generate_response(query, all_results)
    return {
        "query": query,
        "answer": answer,
        "sources": [{"title": res["title"], "url": res["url"]} for res in all_results],
    }
