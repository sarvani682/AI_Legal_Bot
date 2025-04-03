from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
import os
from config import DATABASE_URL
from sqlalchemy.orm import declarative_base
Base = declarative_base()

engine = create_async_engine(DATABASE_URL, echo=True)

# Use `async_sessionmaker` instead of `sessionmaker`
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

