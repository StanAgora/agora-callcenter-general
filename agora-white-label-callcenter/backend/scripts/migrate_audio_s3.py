#!/usr/bin/env python3
"""
Download audio recordings from temporary pre-signed URLs and re-upload them to
your own S3 bucket. Updates record_file_url in calls_v2 to the permanent S3 URI.

Environment variables required (set in backend/.env or shell):
  AWS_ACCESS_KEY_ID          — your AWS key
  AWS_SECRET_ACCESS_KEY      — your AWS secret
  AWS_S3_BUCKET              — target bucket (default: taiwanplus)
  AWS_S3_REGION              — target region (default: ap-southeast-1)
  AWS_S3_PREFIX              — object key prefix (default: recordings/)
  DATABASE_URL               — SQLAlchemy async URL
                               (default: sqlite+aiosqlite:///./dev.db)

Usage:
  cd backend
  # Dry run — shows what would be migrated without touching S3 or DB:
  python scripts/migrate_audio_s3.py --dry-run

  # Migrate everything that still has an http(s) URL:
  python scripts/migrate_audio_s3.py

  # Migrate only calls belonging to one campaign:
  python scripts/migrate_audio_s3.py --campaign-id <id>
"""

import argparse
import asyncio
import io
import os
import sys
import urllib.parse
from pathlib import Path

import httpx
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Load .env from the backend directory
load_dotenv(Path(__file__).parent.parent / '.env')

# Pull settings
AWS_ACCESS_KEY_ID     = os.environ['AWS_ACCESS_KEY_ID']
AWS_SECRET_ACCESS_KEY = os.environ['AWS_SECRET_ACCESS_KEY']
S3_BUCKET             = os.getenv('AWS_S3_BUCKET', 'taiwanplus')
S3_REGION             = os.getenv('AWS_S3_REGION', 'ap-southeast-1')
S3_PREFIX             = os.getenv('AWS_S3_PREFIX', 'recordings/')
DATABASE_URL          = os.environ['DATABASE_URL']

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.models.calls_v2 import CallV2  # noqa: E402


def _make_s3_key(call_id: str, original_url: str) -> str:
    """Derive S3 object key from call_id + original URL extension."""
    try:
        path = urllib.parse.urlparse(original_url).path
        ext = Path(path).suffix or '.wav'
    except Exception:
        ext = '.wav'
    return f'{S3_PREFIX.rstrip("/")}/{call_id}{ext}'


async def migrate(dry_run: bool, campaign_id: str | None):
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    s3_client = boto3.client(
        's3',
        region_name=S3_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )

    async with async_session() as session:
        stmt = select(CallV2).where(
            CallV2.record_file_url.isnot(None),
            CallV2.record_file_url.like('http%'),
        )
        if campaign_id:
            stmt = stmt.where(CallV2.campaign_id == campaign_id)

        result = await session.execute(stmt)
        calls = result.scalars().all()

    print(f'Found {len(calls)} calls to migrate (dry_run={dry_run})')
    if not calls:
        return

    ok_count = 0
    fail_count = 0

    async with httpx.AsyncClient(timeout=60) as http:
        for call in calls:
            # Use original_record_url when available, else fall back to record_file_url
            url = call.original_record_url or call.record_file_url
            s3_key = _make_s3_key(call.call_id, url)
            s3_uri = f's3://{S3_BUCKET}/{s3_key}'

            print(f'  [{call.call_id}] {s3_key}', end=' ')

            if dry_run:
                print('(dry-run, skipped)')
                continue

            # Download
            try:
                resp = await http.get(url)
                resp.raise_for_status()
                audio_bytes = resp.content
            except Exception as e:
                print(f'DOWNLOAD ERROR: {e}')
                fail_count += 1
                continue

            # Upload
            try:
                content_type = resp.headers.get('content-type', 'audio/wav')
                s3_client.upload_fileobj(
                    io.BytesIO(audio_bytes),
                    S3_BUCKET,
                    s3_key,
                    ExtraArgs={'ContentType': content_type},
                )
            except (BotoCoreError, ClientError) as e:
                print(f'UPLOAD ERROR: {e}')
                fail_count += 1
                continue

            # Update DB
            async with async_session() as session:
                await session.execute(
                    update(CallV2)
                    .where(CallV2.call_id == call.call_id)
                    .values(record_file_url=s3_uri)
                )
                await session.commit()

            print(f'OK ({len(audio_bytes):,} bytes)')
            ok_count += 1

    print(f'\nDone: {ok_count} migrated, {fail_count} failed.')


def main():
    parser = argparse.ArgumentParser(description='Migrate audio recordings to S3')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without executing')
    parser.add_argument('--campaign-id', default=None, help='Only migrate calls for this campaign')
    args = parser.parse_args()

    asyncio.run(migrate(dry_run=args.dry_run, campaign_id=args.campaign_id))


if __name__ == '__main__':
    main()
