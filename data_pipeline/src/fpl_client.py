"""Asynchronous HTTP Client for the official Fantasy Premier League (FPL) REST API."""

import asyncio
import logging
from types import TracebackType
from typing import Any, Self

import httpx

from .config import settings

logger = logging.getLogger(__name__)


class FPLError(Exception):
    """Base exception for FPL API communication errors."""


class FPLRateLimitError(FPLError):
    """Raised when FPL API responds with 429 Too Many Requests."""


class FPLClient:
    """Asynchronous client for extracting data from the official FPL REST API."""

    def __init__(
        self,
        base_url: str | None = None,
        user_agent: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        retry_backoff: float | None = None,
    ) -> None:
        self.base_url = (base_url or settings.FPL_API_BASE_URL).rstrip("/") + "/"
        self.user_agent = user_agent or settings.FPL_USER_AGENT
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS
        self.max_retries = max_retries or settings.HTTP_MAX_RETRIES
        self.retry_backoff = retry_backoff or settings.HTTP_RETRY_BACKOFF
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> Self:
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=True,
        )
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Returns the active httpx.AsyncClient or initializes a default one."""
        if self._client is None or self._client.is_closed:
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "application/json",
            }
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=httpx.Timeout(self.timeout),
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying HTTP client session."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _get(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        """Execute an asynchronous GET request with exponential backoff retry."""
        # Ensure endpoint has trailing slash unless query parameters exist
        clean_endpoint = endpoint.lstrip("/")
        if not clean_endpoint.endswith("/") and "?" not in clean_endpoint:
            clean_endpoint += "/"

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.debug(f"Fetching [Attempt {attempt}/{self.max_retries}]: {clean_endpoint}")
                response = await self.client.get(clean_endpoint, params=params)

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 10))
                    logger.warning(f"Rate limited (429) by FPL API. Sleeping for {retry_after}s...")
                    await asyncio.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json()

            except (
                httpx.ConnectError,
                httpx.ReadTimeout,
                httpx.WriteTimeout,
                httpx.HTTPStatusError,
            ) as exc:
                is_server_error = (
                    isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code >= 500
                )
                is_network_error = isinstance(
                    exc, (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout)
                )

                if (is_server_error or is_network_error) and attempt < self.max_retries:
                    sleep_duration = self.retry_backoff * (2 ** (attempt - 1))
                    logger.warning(
                        f"Transient error fetching {clean_endpoint} ({exc}). "
                        f"Retrying in {sleep_duration:.1f}s (Attempt {attempt}/{self.max_retries})..."
                    )
                    await asyncio.sleep(sleep_duration)
                else:
                    logger.error(
                        f"Failed to fetch {clean_endpoint} after {attempt} attempts: {exc}"
                    )
                    raise FPLError(f"FPL API error fetching {clean_endpoint}: {exc}") from exc

    async def get_bootstrap_static(self) -> dict[str, Any]:
        """Fetch master bootstrap-static payload containing all teams, players, and events."""
        return await self._get("bootstrap-static/")

    async def get_league_standings(self, league_id: int) -> dict[str, Any]:
        """Fetch mini-league standings and member list."""
        return await self._get(f"leagues-classic/{league_id}/standings/")

    async def get_manager_summary(self, entry_id: int) -> dict[str, Any]:
        """Fetch high-level manager profile and overall points."""
        return await self._get(f"entry/{entry_id}/")

    async def get_manager_history(self, entry_id: int) -> dict[str, Any]:
        """Fetch manager gameweek-by-gameweek scores, ranks, and chip usage."""
        return await self._get(f"entry/{entry_id}/history/")

    async def get_manager_transfers(self, entry_id: int) -> list[dict[str, Any]]:
        """Fetch list of all transfers made by a manager."""
        return await self._get(f"entry/{entry_id}/transfers/")

    async def get_manager_picks(self, entry_id: int, gameweek: int) -> dict[str, Any]:
        """Fetch manager squad picks, captaincy, and active chip for a specific gameweek."""
        return await self._get(f"entry/{entry_id}/event/{gameweek}/picks/")

    async def get_live_gameweek(self, gameweek: int) -> dict[str, Any]:
        """Fetch live player performance and stats for a specific gameweek."""
        return await self._get(f"event/{gameweek}/live/")

    async def get_event_live(self, gameweek: int) -> dict[str, Any]:
        """Fetch player matchday performance and stats for a specific gameweek (alias for get_live_gameweek)."""
        return await self.get_live_gameweek(gameweek)

    async def get_element_summary(self, element_id: int) -> dict[str, Any]:
        """Fetch match-by-match history and upcoming fixtures for an individual player."""
        return await self._get(f"element-summary/{element_id}/")
