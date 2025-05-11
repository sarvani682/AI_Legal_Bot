import json
import re
from fastapi import HTTPException, WebSocket
import newspaper
import requests
from google import genai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
import asyncio
from config import BRAVE_API_KEY, GEMINI_API_KEY
from prompts import ANSWER_PROMPT, RELATED_QUERIES_PROMPT, RELEVANT_CONTEXT_PROMPT
from models import ChatSession, ChatMessage
from document import extract_text

# Initialize Gemini API client
client = genai.Client(api_key=GEMINI_API_KEY)

async def extract_relevant_context(db: AsyncSession, session_id: str, new_query: str) -> str:
    """Fetch previous context from DB and extract relevant context using Gemini."""
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()
    chat_history = chat_session.context if chat_session and chat_session.context else ""

    prompt = RELEVANT_CONTEXT_PROMPT.format(CHAT_HISTORY=chat_history, NEW_QUERY=new_query)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
    
    return extract_xml_content(response.text, "<context>", "</context>")

def extract_xml_content(text: str, start_tag: str, end_tag: str) -> str:
    """Extract XML-like content from AI response."""
    match = re.search(f"{re.escape(start_tag)}(.*?){re.escape(end_tag)}", text, re.DOTALL)
    return match.group(1).strip() if match else ""

def generate_related_queries(query: str, context: str):
    """Generate related search queries based on user input."""
    prompt = RELATED_QUERIES_PROMPT.format(QUESTION=query, CONTEXT=context)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
    json_content = extract_xml_content(response.text, "<answer>", "</answer>")
    
    try:
        return json.loads(json_content).get("related_queries", []) if json_content else []
    except json.JSONDecodeError:
        return []

def get_search_results(search_query: str, limit: int = 3):
    """Fetch search results from Brave Search API."""
    headers = {"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY}
    response = requests.get("https://api.search.brave.com/res/v1/web/search", 
                            params={"q": search_query, "count": limit}, 
                            headers=headers, timeout=60)
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

async def generate_response(db: AsyncSession, session_id: str, query: str, results):
    """Generate an AI response based on the query, search results, and chat history."""
    formatted_results = "\n\n".join([f"{idx+1}. {res['title']}\n{res['url']}\n{res.get('content', '')}" 
                                    for idx, res in enumerate(results)])
    
    relevant_context = await extract_relevant_context(db, session_id, query)
    prompt = ANSWER_PROMPT.format(QUESTION=query, SEARCH_RESULTS=formatted_results, CHAT_HISTORY=relevant_context)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
    
    answer_content = extract_xml_content(response.text, "<answer>", "</answer>")

    # Store AI response in the database
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()

    if chat_session:
        chat_session.context = relevant_context + f"\nUser: {query}\nAI: {answer_content}\n"
        await db.commit()
    
    return answer_content



async def generate_ai_response(db: AsyncSession, session_id: str, query: str):
    """Generate AI response while handling database storage and web search integration."""
    # Fetch the chat session to get user_id
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()

    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = chat_session.user_id  # Extract user_id from the session

    related_queries = generate_related_queries(query, await extract_relevant_context(db, session_id, query))
    all_results = []

    for q in related_queries + [query]:
        results = get_search_results(q)
        for res in results:
            res['content'] = get_url_content(res['url'])
        all_results.extend(results)

    if not all_results:
        return None

    answer = await generate_response(db, session_id, query, all_results)
    sources = [{"title": res["title"], "url": res["url"]} for res in all_results]
    # Store user query and AI response in the database with user_id
    chat_message_user = ChatMessage(session_id=session_id, user_id=user_id, role="user", message=query)
    chat_message_ai = ChatMessage(session_id=session_id, user_id=user_id, role="ai", message=answer, sources=sources )

    db.add(chat_message_user)
    db.add(chat_message_ai)
    await db.commit()

    return {
        "query": query,
        "answer": answer,
        "sources": sources,
    }

async def add_document_context_to_session(db: AsyncSession, session_id: str, file_bytes: bytes, filename: str):
    try:
        extracted_text = extract_text(file_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()

    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    if chat_session.context:
        chat_session.context += f"\n\n[Document: {filename}]\n{extracted_text}\n"
    else:
        chat_session.context = f"[Document: {filename}]\n{extracted_text}\n"

    await db.commit()

    return {"message": "Document content added to session context successfully."}



