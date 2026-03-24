from __future__ import annotations

import asyncio
import time
from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit: int
    remaining: int
    retry_after_seconds: int


class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = max(1, int(limit))
        self.window_seconds = max(1, int(window_seconds))
        self._buckets: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> RateLimitDecision:
        now = time.time()
        cutoff = now - self.window_seconds

        async with self._lock:
            bucket = self._buckets.setdefault(key, deque())

            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= self.limit:
                retry_after = max(1, int(bucket[0] + self.window_seconds - now))
                return RateLimitDecision(
                    allowed=False,
                    limit=self.limit,
                    remaining=0,
                    retry_after_seconds=retry_after,
                )

            bucket.append(now)
            remaining = max(0, self.limit - len(bucket))
            return RateLimitDecision(
                allowed=True,
                limit=self.limit,
                remaining=remaining,
                retry_after_seconds=0,
            )
