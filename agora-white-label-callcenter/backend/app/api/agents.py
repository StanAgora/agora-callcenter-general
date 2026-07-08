import asyncio
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.agent_v2 import AgentV2

router = APIRouter(prefix='/api/agents', tags=['agents'])

AGENT_BASE_URL = f'{settings.agora_conversational_base_url}/projects/{settings.agora_project_id}/agents'


def _headers() -> dict:
    return {
        'Authorization': f'Basic {settings.agora_conversational_api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


_ASR_LANG_MAP: dict[str, str] = {
    'Chinese': 'zh-CN',
    'Japanese': 'ja-JP',
    'Korean': 'ko-KR',
    'English': 'en-US',
}


class CreateAgentRequest(BaseModel):
    agent_name: str
    system_content: str
    greeting_message: str
    failure_message: str
    voice_id: str
    language_boost: str = 'Chinese'
    asr_language: str | None = None  # 若不传则从 language_boost 自动推导


def _build_payload(body: CreateAgentRequest) -> dict:
    asr_lang = body.asr_language or _ASR_LANG_MAP.get(body.language_boost, 'zh-CN')
    return {
        'agent_name': body.agent_name,
        'agent_type': 'CALL_AGENT',
        'properties': {
            'asr': {
                'vendor': 'ares',
                'language': asr_lang,
            },
            'llm': {
                'url': 'https://api.openai.com/v1/chat/completions',
                'api_key': settings.openai_api_key,
                'system_messages': [{'role': 'system', 'content': body.system_content}],
                'max_history': 32,
                'greeting_message': body.greeting_message,
                'failure_message': body.failure_message,
                'params': {'model': 'gpt-5.4-nano'},
            },
            'tts': {
                'vendor': 'minimax',
                'params': {
                    'key': settings.minimax_api_key,
                    'url': 'wss://api-uw.minimax.io/ws/v1/t2a_v2',
                    'model': 'speech-02-turbo',
                    'group_id': '1967483817044222128',
                    'voice_setting': {
                        'voice_id': body.voice_id,
                        'sample_rate': 8000,
                    },
                    'language_boost': body.language_boost,
                },
            },
            'parameters': {
                'transcript': {
                    'enable': True,
                    'protocol_version': 'v2',
                    'enable_words': True,
                    'redundant': False,
                },
                'enable_dump': True,
                'data_channel': 'rtm',
                'audio_scenario': 'default',
                'enable_metrics': True,
                'silence_config': {
                    'action': 'think',
                    'content': '',
                    'timeout_ms': 4000,
                },
                'enable_flexible': True,
                'enable_error_message': True,
            },
            'idle_timeout': 120,
            'turn_detection': {
                'mode': 'default',
                'config': {
                    'start_of_speech': {
                        'mode': 'vad',
                        'vad_config': {
                            'interrupt_duration_ms': 160,
                            'speaking_interrupt_duration_ms': 160,
                            'prefix_padding_ms': 800,
                        },
                    },
                    'end_of_speech': {
                        'mode': 'semantic',
                        'semantic_config': {
                            'silence_duration_ms': 240,
                            'max_wait_ms': 3000,
                        },
                    },
                },
            },
            'advanced_features': {
                'enable_rtm': True,
                'enable_sal': False,
                'enable_tools': True,
            },
        },
    }


def _serialize(a: AgentV2) -> dict:
    props = json.loads(a.properties) if a.properties else None
    return {
        'id': a.id,
        'agent_id': a.agent_id,
        'agent_name': a.agent_name,
        'app_id': a.app_id,
        'system_content': a.system_content,
        'greeting_message': a.greeting_message,
        'failure_message': a.failure_message,
        'voice_id': a.voice_id,
        'properties': _mask_properties(props) if props else props,
        'created_at': a.created_at,
        'updated_at': a.updated_at,
    }


def _record_from_data(data: dict) -> dict:
    props = data.get('properties', {})
    llm = props.get('llm', {})
    system_msgs = llm.get('system_messages', [])
    system_content = next(
        (m.get('content') for m in system_msgs if m.get('role') == 'system'), None
    )
    voice_id = (
        props.get('tts', {}).get('params', {}).get('voice_setting', {}).get('voice_id')
    )
    return {
        'agent_id': data['agent_id'],
        'agent_name': data['agent_name'],
        'app_id': data.get('app_id', settings.agora_project_id),
        'system_content': system_content,
        'greeting_message': llm.get('greeting_message'),
        'failure_message': llm.get('failure_message'),
        'voice_id': voice_id,
        'properties': json.dumps(props, ensure_ascii=False),
        'created_at': data.get('created_at'),
        'updated_at': data.get('updated_at'),
    }


# ── Endpoints ─────────────────────────────────────────────────────

@router.post('')
async def create_agent(body: CreateAgentRequest, db: AsyncSession = Depends(get_db)):
    payload = _build_payload(body)

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(AGENT_BASE_URL, json=payload, headers=_headers())

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    result = resp.json()
    code = result.get('code') if 'code' in result else result.get('reason')
    if code not in (0, '0'):
        raise HTTPException(status_code=400, detail=result.get('message', result.get('detail', 'Agora API error')))

    fields = _record_from_data(result['data'])
    record = AgentV2(**fields)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.get('')
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentV2).order_by(AgentV2.id.desc()))
    rows = result.scalars().all()
    if not rows:
        return await sync_agents(db)
    return [_serialize(r) for r in rows]


async def _fetch_agent_detail(client: httpx.AsyncClient, agent_id: str) -> dict | None:
    """请求单个 agent 详情，返回 data 字段（含完整 properties）。"""
    try:
        resp = await client.get(
            f'{AGENT_BASE_URL}/{agent_id}',
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code == 200:
            body = resp.json()
            return body.get('data')
    except Exception:
        pass
    return None


def _extract_list_items(body: dict) -> list[dict]:
    data = body.get('data')
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get('list') or data.get('items') or data.get('agents') or []
    return []


class CreateAgentWithPropertiesRequest(BaseModel):
    agent_name: str
    properties: dict


@router.post('/create-with-properties')
async def create_agent_with_properties(
    body: CreateAgentWithPropertiesRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = {
        'agent_name': body.agent_name,
        'agent_type': 'CALL_AGENT',
        'properties': body.properties,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(AGENT_BASE_URL, json=payload, headers=_headers())

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    result = resp.json()
    code = result.get('code') if 'code' in result else result.get('reason')
    if code not in (0, '0'):
        raise HTTPException(status_code=400, detail=result.get('message', result.get('detail', 'Agora API error')))

    fields = _record_from_data(result['data'])
    record = AgentV2(**fields)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.post('/sync')
async def sync_agents(db: AsyncSession = Depends(get_db)):
    """
    1. 从 Agora 拉取全量 agent 列表
    2. 对数据库中不存在的 agent，并发请求详情接口获取完整 properties
    3. 对已存在但 properties 为空的记录，同样补充详情
    4. 写入/更新数据库后返回完整列表
    """
    # ── Step 1: 拉取 Agora 列表 ──────────────────────────────────
    agora_items: list[dict] = []
    page = 1
    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            try:
                resp = await client.get(
                    AGENT_BASE_URL,
                    params={'page': page, 'page_size': 100},
                    headers=_headers(),
                )
                if resp.status_code != 200:
                    break
                items = _extract_list_items(resp.json())
                agora_items.extend(items)
                if len(items) < 100:
                    break
                page += 1
            except Exception:
                break

    if not agora_items:
        result = await db.execute(select(AgentV2).order_by(AgentV2.id.desc()))
        return [_serialize(r) for r in result.scalars().all()]

    # ── Step 2: 查询数据库已有记录 ────────────────────────────────
    existing_result = await db.execute(select(AgentV2))
    existing_records: dict[str, AgentV2] = {r.agent_id: r for r in existing_result.scalars().all()}

    def _properties_incomplete(rec: AgentV2) -> bool:
        """properties 为 None、空字符串、或空 JSON 对象 {} 时视为未同步。"""
        if not rec.properties:
            return True
        try:
            parsed = json.loads(rec.properties)
            return not parsed or 'llm' not in parsed
        except Exception:
            return True

    # 找出需要请求详情的 agent_id：
    # - 数据库中不存在的
    # - 已存在但 properties 不完整的（补全）
    agora_ids = [item['agent_id'] for item in agora_items if item.get('agent_id')]
    need_detail = [
        aid for aid in agora_ids
        if aid not in existing_records or _properties_incomplete(existing_records[aid])
    ]

    # ── Step 3: 并发拉取详情 ──────────────────────────────────────
    detail_map: dict[str, dict] = {}
    if need_detail:
        async with httpx.AsyncClient(timeout=15) as client:
            results = await asyncio.gather(*[_fetch_agent_detail(client, aid) for aid in need_detail])
        for aid, detail in zip(need_detail, results):
            if detail:
                detail_map[aid] = detail

    # ── Step 4: 写入 / 更新数据库 ─────────────────────────────────
    for aid in agora_ids:
        detail = detail_map.get(aid)
        if aid not in existing_records:
            source = detail or next((i for i in agora_items if i.get('agent_id') == aid), {})
            if source:
                stmt = pg_insert(AgentV2).values(**_record_from_data(source))
                stmt = stmt.on_conflict_do_update(
                    index_elements=['agent_id'],
                    set_={k: stmt.excluded[k] for k in (
                        'agent_name', 'system_content', 'greeting_message',
                        'failure_message', 'voice_id', 'properties', 'updated_at',
                    )},
                )
                await db.execute(stmt)
        elif detail:
            rec = existing_records[aid]
            fields = _record_from_data(detail)
            rec.system_content = fields['system_content']
            rec.greeting_message = fields['greeting_message']
            rec.failure_message = fields['failure_message']
            rec.voice_id = fields['voice_id']
            rec.properties = fields['properties']
            rec.updated_at = fields['updated_at']

    await db.commit()

    result = await db.execute(select(AgentV2).order_by(AgentV2.id.desc()))
    return [_serialize(r) for r in result.scalars().all()]


SENSITIVE_PLACEHOLDER = '****'  # 兼容旧前端可能提交的占位符
SENSITIVE_PATHS = [
    ('llm', 'api_key'),
    ('tts', 'params', 'key'),
]


def _mask_secret(value: str) -> str:
    """只保留前 4 位，其余替换为 *，用于返回给前端展示。"""
    if not isinstance(value, str) or not value:
        return value
    return value[:4] + '*' * max(len(value) - 4, 4)


def _mask_properties(props: dict) -> dict:
    """对 properties 中的敏感字段做脱敏处理，供 API 响应使用。"""
    import copy
    result = copy.deepcopy(props)
    for path in SENSITIVE_PATHS:
        node = result
        for key in path[:-1]:
            node = node.get(key) if isinstance(node, dict) else None
            if node is None:
                break
        if isinstance(node, dict):
            last = path[-1]
            value = node.get(last)
            if isinstance(value, str) and value:
                node[last] = _mask_secret(value)
    return result


def _restore_sensitive(new_props: dict, original_props: dict) -> dict:
    """把用户未修改的敏感字段（前端提交的仍是脱敏后的值）从原始 properties 还原。"""
    import copy
    result = copy.deepcopy(new_props)
    for path in SENSITIVE_PATHS:
        node_new = result
        node_orig = original_props
        for key in path[:-1]:
            node_new = node_new.get(key, {}) if isinstance(node_new, dict) else {}
            node_orig = node_orig.get(key, {}) if isinstance(node_orig, dict) else {}
        last = path[-1]
        if not (isinstance(node_new, dict) and isinstance(node_orig, dict) and last in node_orig):
            continue
        orig_val = node_orig[last]
        new_val = node_new.get(last)
        if new_val == SENSITIVE_PLACEHOLDER or (
            isinstance(orig_val, str) and orig_val and new_val == _mask_secret(orig_val)
        ):
            node_new[last] = orig_val
    return result


@router.put('/{agent_id}/properties')
async def update_agent_properties(
    agent_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AgentV2).where(AgentV2.agent_id == agent_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail='Agent not found')

    original_props = json.loads(record.properties) if record.properties else {}
    new_props = _restore_sensitive(body, original_props)

    # PATCH 到 Agora（忽略失败，DB 仍保存）
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.patch(
                f'{AGENT_BASE_URL}/{agent_id}',
                json={'properties': new_props},
                headers=_headers(),
            )
    except Exception:
        pass

    record.properties = json.dumps(new_props, ensure_ascii=False)
    llm = new_props.get('llm', {})
    system_msgs = llm.get('system_messages', [])
    record.system_content = next(
        (m.get('content') for m in system_msgs if m.get('role') == 'system'), record.system_content
    )
    record.greeting_message = llm.get('greeting_message', record.greeting_message)
    record.failure_message = llm.get('failure_message', record.failure_message)
    record.voice_id = (
        new_props.get('tts', {}).get('params', {}).get('voice_setting', {}).get('voice_id')
        or record.voice_id
    )
    await db.commit()
    await db.refresh(record)
    return _serialize(record)


@router.delete('/{agent_id}')
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentV2).where(AgentV2.agent_id == agent_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail='Agent not found')

    async with httpx.AsyncClient(timeout=15) as client:
        agora_resp = await client.delete(
            f'{AGENT_BASE_URL}/{agent_id}',
            headers={
                'Authorization': f'Basic {settings.agora_conversational_api_key}',
                'Accept': 'application/json',
            },
        )
    if agora_resp.status_code not in (200, 204, 404):
        raise HTTPException(
            status_code=agora_resp.status_code,
            detail=f'Agora API error: {agora_resp.text}',
        )

    await db.delete(record)
    await db.commit()
    return {'detail': 'deleted'}
