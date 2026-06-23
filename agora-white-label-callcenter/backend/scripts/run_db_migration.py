#!/usr/bin/env python3
"""
Add is_imported / imported_at / original_record_url columns via raw SQL.
Works with PostgreSQL (and any SQLAlchemy-supported DB).
Safe to run multiple times — skips columns that already exist.

Usage:
  cd backend
  python scripts/run_db_migration.py
"""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv(Path(__file__).parent.parent / '.env')

DATABASE_URL = os.environ['DATABASE_URL']

MIGRATIONS = [
    ("campaigns_v2", "is_imported",  "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("campaigns_v2", "imported_at",  "TEXT"),
    ("calls_v2",     "is_imported",  "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("calls_v2",     "original_record_url", "TEXT"),
]


async def run():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for table, column, definition in MIGRATIONS:
            try:
                await conn.execute(text(
                    f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}'
                ))
                print(f'  + {table}.{column}')
            except Exception as e:
                print(f'  ! {table}.{column}: {e}')
    await engine.dispose()
    print('Migration complete.')


if __name__ == '__main__':
    asyncio.run(run())
