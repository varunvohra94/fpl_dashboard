"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Users,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import {
  LeagueStandingsResponse,
  LeagueTransfersResponse,
  ManagerProfileResponse,
  PipelineStatusResponse,
  TopPlayersResponse,
} from "../lib/types";
import {
  fetchLeagueStandings,
  fetchLeagueTransfers,
  fetchManagerHistory,
  fetchPipelineStatus,
  fetchTopPlayers,
} from "../lib/api";
import { generateHighlightCards } from "../utils/highlights";
import { Header } from "../components/Header";
import { HighlightsBanner } from "../components/HighlightsBanner";
import { StandingsTable } from "../components/StandingsTable";
import { TransferFeed } from "../components/TransferFeed";
import { ManagerModal } from "../components/ManagerModal";
import { BarChartRace } from "../components/BarChartRace";
import { FormHitsMatrix } from "../components/FormHitsMatrix";
import { ChipMatrix } from "../components/ChipMatrix";
import { TopPlayersTable } from "../components/TopPlayersTable";

type ActiveTab = "standings" | "race" | "players";

export default function DashboardPage() {
  const [maxAvailableGw, setMaxAvailableGw] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("standings");
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);

  // Independent Section Gameweek States
  const [standingsGw, setStandingsGw] = useState<number>(0); // 0 = Overall Season cumulative
  const [transfersGw, setTransfersGw] = useState<number>(0); // 0 = All Gameweeks
  const [playersGw, setPlayersGw] = useState<number>(1);

  // Data states
  const [standingsData, setStandingsData] = useState<LeagueStandingsResponse | null>(null);
  const [transfersData, setTransfersData] = useState<LeagueTransfersResponse | null>(null);
  const [profilesData, setProfilesData] = useState<ManagerProfileResponse[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusResponse | null>(null);
  const [topPlayersData, setTopPlayersData] = useState<TopPlayersResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load: Pipeline status
  const loadInitialStatus = useCallback(async () => {
    try {
      const status = await fetchPipelineStatus();
      setPipelineStatus(status);

      const latestGw =
        status.latest_completed_gameweek ||
        status.current_gameweek ||
        1;

      setMaxAvailableGw(latestGw);
      setPlayersGw(latestGw);
    } catch (err: any) {
      console.warn("Could not fetch pipeline status, defaulting to GW 1:", err);
      setMaxAvailableGw(1);
      setPlayersGw(1);
    }
  }, []);

  useEffect(() => {
    loadInitialStatus();
  }, [loadInitialStatus]);

  // Fetch full dashboard data
  const loadDashboardData = useCallback(async (currentMaxGw: number, targetPlayersGw: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Standings, Transfers (all season / up to latest), and Top Players concurrently
      const [standingsRes, transfersRes, playersRes] = await Promise.all([
        fetchLeagueStandings(undefined, currentMaxGw > 0 ? currentMaxGw : undefined),
        fetchLeagueTransfers(undefined, undefined, 200),
        fetchTopPlayers(targetPlayersGw > 0 ? targetPlayersGw : currentMaxGw, 40).catch(() => null),
      ]);

      setStandingsData(standingsRes);
      setTransfersData(transfersRes);
      if (playersRes) setTopPlayersData(playersRes);

      // 2. Fetch all manager profiles for season records, race & matrix
      if (standingsRes?.standings?.length > 0) {
        const profilePromises = standingsRes.standings.map((s) =>
          fetchManagerHistory(s.manager_id).catch(() => null)
        );
        const profiles = (await Promise.all(profilePromises)).filter(
          Boolean
        ) as ManagerProfileResponse[];
        setProfilesData(profiles);
      }
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setError(
        err.message ||
          "Unable to connect to the backend service. Ensure PostgreSQL and FastAPI are running."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (maxAvailableGw > 0) {
      loadDashboardData(maxAvailableGw, playersGw);
    }
  }, [maxAvailableGw, playersGw, loadDashboardData]);

  // Gameweek change handler for TopPlayersTable
  const handleSelectPlayersGw = async (gw: number) => {
    setPlayersGw(gw);
    try {
      const playersRes = await fetchTopPlayers(gw, 40);
      if (playersRes) setTopPlayersData(playersRes);
    } catch (err) {
      console.error(`Failed to fetch players for GW ${gw}:`, err);
    }
  };

  // Compute story highlights for the latest active season
  const highlightCards = generateHighlightCards(
    standingsData?.standings || [],
    profilesData,
    maxAvailableGw
  );

  const handleSelectManagerByName = (managerName: string) => {
    const found = standingsData?.standings.find(
      (s) => (s.player_name || "").toLowerCase() === managerName.toLowerCase()
    );
    if (found) {
      setSelectedManagerId(found.manager_id);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header (Clean Master Bar without redundant GW buttons) */}
      <Header
        leagueName={`League #${standingsData?.league_id || 944559}`}
        pipelineStatus={pipelineStatus}
        onRefresh={() => loadDashboardData(maxAvailableGw, playersGw)}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadDashboardData(maxAvailableGw, playersGw)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Season & Matchday Intelligence Highlights */}
        <HighlightsBanner
          cards={highlightCards}
          onSelectManager={handleSelectManagerByName}
        />

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-between border-b border-slate-800/80 mb-6 overflow-x-auto pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("standings")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "standings"
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Standings & News Feed</span>
            </button>

            <button
              onClick={() => setActiveTab("race")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "race"
                  ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/10 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Stats</span>
            </button>

            <button
              onClick={() => setActiveTab("players")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "players"
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Matchday Stats</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Standings & News Feed */}
        {activeTab === "standings" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Standings Table with its own GW Dropdown */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
                <StandingsTable
                  standings={standingsData?.standings || []}
                  selectedGw={standingsGw}
                  maxAvailableGw={maxAvailableGw}
                  onSelectGw={(gw) => setStandingsGw(gw)}
                  onSelectManager={(id) => setSelectedManagerId(id)}
                />
              </div>

              {/* Transfer Feed with its own GW Dropdown */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full">
                <TransferFeed
                  transfers={transfersData?.transfers || []}
                  selectedGw={transfersGw}
                  maxAvailableGw={maxAvailableGw}
                  onSelectGw={(gw) => setTransfersGw(gw)}
                  onSelectManager={(id) => setSelectedManagerId(id)}
                />
              </div>
            </div>

            {/* Chip Usage Metrics */}
            <ChipMatrix profiles={profilesData} />
          </div>
        )}

        {/* Tab 2: Stats */}
        {activeTab === "race" && (
          <div className="space-y-6">
            {/* Animated Bar Chart Race & Trail Graph with bottom Scrubber */}
            <BarChartRace profiles={profilesData} maxGw={maxAvailableGw} />

            {/* Form vs Hits Behavioral Matrix */}
            <FormHitsMatrix
              standings={standingsData?.standings || []}
              selectedGw={maxAvailableGw}
            />
          </div>
        )}

        {/* Tab 3: Matchday Stats */}
        {activeTab === "players" && (
          <TopPlayersTable
            players={topPlayersData?.players || []}
            selectedGw={playersGw}
            maxAvailableGw={maxAvailableGw}
            onSelectGw={handleSelectPlayersGw}
          />
        )}
      </main>

      {/* Manager Scorecard Drilldown Modal */}
      <ManagerModal
        managerId={selectedManagerId}
        onClose={() => setSelectedManagerId(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 mt-12 text-center text-xs text-slate-500">
        <p>Fantasy Premier League Mini-League Rival Intelligence Platform</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Asynchronous ETL Pipeline • FastAPI 2.0 • Next.js App Router
        </p>
      </footer>
    </div>
  );
}
