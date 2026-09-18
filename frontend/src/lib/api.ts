/**
 * Asynchronous API client for backend FastAPI endpoints.
 */

import {
  LeagueStandingsResponse,
  LeagueTransfersResponse,
  ManagerProfileResponse,
  PipelineStatusResponse,
  TopPlayersResponse,
} from "./types";

const API_BASE_URL =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1");

export async function fetchLeagueStandings(
  leagueId?: number,
  gameweek?: number
): Promise<LeagueStandingsResponse> {
  const params = new URLSearchParams();
  if (leagueId) params.append("league_id", leagueId.toString());
  if (gameweek) params.append("gameweek", gameweek.toString());

  const url = `${API_BASE_URL}/league/standings?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch standings (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchLeagueTransfers(
  leagueId?: number,
  gameweek?: number,
  limit: number = 100
): Promise<LeagueTransfersResponse> {
  const params = new URLSearchParams();
  if (leagueId) params.append("league_id", leagueId.toString());
  if (gameweek) params.append("gameweek", gameweek.toString());
  params.append("limit", limit.toString());

  const url = `${API_BASE_URL}/league/transfers?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch transfers (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchManagerHistory(
  managerId: number
): Promise<ManagerProfileResponse> {
  const url = `${API_BASE_URL}/managers/${managerId}/history`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch manager history (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchPipelineStatus(): Promise<PipelineStatusResponse> {
  const url = `${API_BASE_URL}/gameweeks/status`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch pipeline status (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchTopPlayers(
  gameweek?: number,
  limit: number = 25
): Promise<TopPlayersResponse> {
  const params = new URLSearchParams();
  if (gameweek) params.append("gameweek", gameweek.toString());
  params.append("limit", limit.toString());

  const url = `${API_BASE_URL}/players/top?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch top players (${res.status}): ${await res.text()}`);
  }
  return res.json();
}
