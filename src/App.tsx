/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Circle, 
  Calendar,
  Clock, 
  RefreshCw, 
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  Target,
  Zap,
  Activity,
  Dribbble, // Basketball
  Award, // General
  Flag,
  Flame,
  Play,
  Star
} from 'lucide-react';
import { Match, FilterStatus, SportType, SportConfig, MatchEvent, TeamStatistics } from './types';

const FOOTBALL_API_HOST = 'v3.football.api-sports.io';
const API_KEY = (import.meta as any).env?.VITE_FOOTBALL_API_KEY || '955c8d94e3ea6c7cbc6f57f3c3a35a39';

// Mock data (limited example)
const MOCK_MATCHES: Match[] = [
  {
    fixture: {
      id: 1, referee: "Michael Oliver", timezone: "UTC", date: new Date().toISOString(), timestamp: Date.now() / 1000,
      periods: { first: 1715166000, second: null },
      venue: { id: 1, name: "Anfield", city: "Liverpool" },
      status: { long: "First Half", short: "1H", elapsed: 32 }
    },
    league: {
      id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", flag: null, season: 2023, round: "Matchday 37"
    },
    teams: {
      home: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: null },
      away: { id: 49, name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png", winner: null }
    },
    goals: { home: 1, away: 0 },
    score: { halftime: { home: 1, away: 0 }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } }
  }
];

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Favorites state
  const [favTeams, setFavTeams] = useState<number[]>(() => {
    const saved = localStorage.getItem('goalstream_fav_teams');
    return saved ? JSON.parse(saved) : [];
  });
  const [favLeagues, setFavLeagues] = useState<number[]>(() => {
    const saved = localStorage.getItem('goalstream_fav_leagues');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('goalstream_fav_teams', JSON.stringify(favTeams));
  }, [favTeams]);

  useEffect(() => {
    localStorage.setItem('goalstream_fav_leagues', JSON.stringify(favLeagues));
  }, [favLeagues]);

  const toggleFavTeam = React.useCallback((id: number) => {
    setFavTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }, []);

  const toggleFavLeague = React.useCallback((id: number) => {
    setFavLeagues(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  }, []);

  const fetchMatches = React.useCallback(async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `https://${FOOTBALL_API_HOST}/fixtures?date=${today}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-apisports-key': API_KEY },
      });

      const data = await response.json();
      if (data.response && data.response.length > 0) {
        setMatches(data.response);
        setIsDemo(false);
      } else {
        setMatches(MOCK_MATCHES);
        setIsDemo(true);
      }
    } catch (error) {
      console.error("API Error:", error);
      setMatches(MOCK_MATCHES);
      setIsDemo(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchMatchDetails = React.useCallback(async (fixtureId: number) => {
    try {
      const eventsUrl = `https://${FOOTBALL_API_HOST}/fixtures/events?fixture=${fixtureId}`;
      const statsUrl = `https://${FOOTBALL_API_HOST}/fixtures/statistics?fixture=${fixtureId}`;
      
      const [eventsRes, statsRes] = await Promise.all([
        fetch(eventsUrl, { headers: { 'x-apisports-key': API_KEY } }),
        fetch(statsUrl, { headers: { 'x-apisports-key': API_KEY } })
      ]);

      const eventsData = await eventsRes.json();
      const statsData = await statsRes.json();
      const events = eventsData.response || [];
      const statistics = statsData.response || [];

      setMatches(prev => {
        const updated = prev.map(m => {
          if (m.fixture.id === fixtureId) {
            const newMatch = { ...m, events, statistics };
            // Update selected match if it's the one we just fetched details for
            setSelectedMatch(prevSelected => 
              prevSelected?.fixture.id === fixtureId ? newMatch : prevSelected
            );
            return newMatch;
          }
          return m;
        });
        return updated;
      });
    } catch (err) {
      console.error("Error fetching details:", err);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(() => fetchMatches(), 60000 * 5);
    return () => clearInterval(interval);
  }, []);

  const matchEvents = useMemo(() => {
    const map: Record<number, MatchEvent[]> = {};
    matches.forEach(m => {
      if (m.events) map[m.fixture.id] = m.events;
    });
    return map;
  }, [matches]);

  const matchStats = useMemo(() => {
    const map: Record<number, TeamStatistics[]> = {};
    matches.forEach(m => {
      if (m.statistics) map[m.fixture.id] = m.statistics;
    });
    return map;
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!matches) return [];
    
    const filtered = matches.filter(match => {
      const h = match.teams?.home?.name || '';
      const a = match.teams?.away?.name || '';
      const l = match.league?.name || '';
      
      const searchMatch = !q || 
        h.toLowerCase().includes(q) || 
        a.toLowerCase().includes(q) || 
        l.toLowerCase().includes(q);
      
      if (!searchMatch) return false;

      if (filter === 'LIVE') {
        const liveStatuses = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'];
        return liveStatuses.includes(match.fixture.status.short);
      }
      if (filter === 'FINISHED') {
        const finishedStatuses = ['FT', 'AET', 'PEN', 'AOT'];
        return finishedStatuses.includes(match.fixture.status.short);
      }
      if (filter === 'SCHEDULED') {
        const upcomingStatuses = ['NS', 'TBD'];
        return upcomingStatuses.includes(match.fixture.status.short);
      }
      return true;
    });

    // Priority sorting: Elite Leagues (PL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, WC)
    return [...filtered].sort((a, b) => {
      // 1. Favorites check
      const aFav = favLeagues.includes(a.league.id) || favTeams.includes(a.teams.home.id) || favTeams.includes(a.teams.away.id);
      const bFav = favLeagues.includes(b.league.id) || favTeams.includes(b.teams.home.id) || favTeams.includes(b.teams.away.id);
      
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // 2. Elite Leagues check
      const priorityIds = [39, 140, 78, 135, 61, 2, 1]; // PL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, WC
      const aPriority = priorityIds.includes(a.league.id) ? 1 : 0;
      const bPriority = priorityIds.includes(b.league.id) ? 1 : 0;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // 3. Date sort
      return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
    });
  }, [matches, filter, searchQuery, favTeams, favLeagues]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Liquid Glass Header */}
      <header className="sticky top-0 z-50 px-4 py-4 md:py-6">
        <div className="max-w-7xl mx-auto liquid-glass rounded-[28px] p-2 md:p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 pl-2">
            <div className="bg-black p-2 rounded-xl text-white shadow-lg">
              <Trophy size={18} />
            </div>
            <h1 className="font-display font-black text-xl text-black italic tracking-tighter hidden xs:block">
              GoalStream <span className="text-gray-400 font-sans not-italic font-medium text-sm">PRO</span>
            </h1>
          </div>

          <div className="flex-1 relative group mx-1 md:mx-4 md:max-w-md">
             <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
             <input 
                type="text" 
                placeholder="Search teams or leagues..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-[13px] text-black placeholder:text-gray-400 outline-none transition-all shadow-sm focus:border-black focus:ring-1 focus:ring-black/5"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
             {searchQuery && (
               <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
               >
                 <X size={12} />
               </button>
             )}
          </div>

          <button 
            onClick={() => fetchMatches()}
            className={`flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-gray-800 rounded-2xl transition-all shadow-lg active:scale-95 shrink-0 ${isRefreshing ? 'opacity-70 pointer-events-none' : ''}`}
            title="Refresh Scores"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="text-[11px] font-black uppercase tracking-wider">Reload</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-2 pb-12">
        {/* Live Matches Ticker */}
        {matches.filter(m => ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(m.fixture.status.short)).length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Matches</span>
              </div>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                {matches.filter(m => ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(m.fixture.status.short)).length} active
              </span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-2">
              {matches
                .filter(m => ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(m.fixture.status.short))
                .map(m => (
                  <button
                    key={m.fixture.id}
                    onClick={() => {
                      setSelectedMatch(m);
                      fetchMatchDetails(m.fixture.id);
                    }}
                    className="flex items-center gap-3 bg-white/10 hover:bg-white/15 p-3 rounded-2xl border border-white/5 transition-all shrink-0 group min-w-[200px]"
                  >
                    <img src={m.league.logo} alt="" className="w-4 h-4 object-contain opacity-50" />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-white/60 truncate max-w-[60px] uppercase tracking-tighter">
                          {m.teams.home.name.substring(0, 3)}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-black text-white italic">
                          <span>{m.goals.home ?? 0}</span>
                          <span className="text-white/20 not-italic">:</span>
                          <span>{m.goals.away ?? 0}</span>
                        </div>
                        <span className="text-[10px] font-bold text-white/60 truncate max-w-[60px] uppercase tracking-tighter text-right">
                          {m.teams.away.name.substring(0, 3)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-1 border-t border-white/5 pt-1">
                        <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">{m.fixture.status.elapsed}'</span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-1 p-1 bg-white/10 rounded-2xl w-full">
            {(['ALL', 'LIVE', 'FINISHED', 'SCHEDULED'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all ${
                  filter === f 
                    ? 'bg-white text-black shadow-lg shadow-black/20' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {f === 'SCHEDULED' ? 'UPCOMING' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading && filteredMatches.length === 0 ? (
             Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 bg-white/5 rounded-3xl animate-pulse border border-white/10" />
            ))
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <FixtureCard 
                key={match.fixture.id} 
                match={match} 
                isFavTeamHome={favTeams.includes(match.teams.home.id)}
                isFavTeamAway={favTeams.includes(match.teams.away.id)}
                isFavLeague={favLeagues.includes(match.league.id)}
                onToggleFavTeam={toggleFavTeam}
                onToggleFavLeague={toggleFavLeague}
                onClick={() => {
                  setSelectedMatch(match);
                  fetchMatchDetails(match.fixture.id);
                }} 
              />
            ))
          ) : (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-400 rounded-3xl bg-black/20 border border-white/5">
               <div className="bg-white/10 p-5 rounded-full mb-4">
                  <Filter size={32} className="text-white/20" />
               </div>
              <p className="text-lg font-bold text-white italic font-display">
                {searchQuery ? `No results for "${searchQuery}"` : 'No matches found'}
              </p>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">Try adjusting your filters or search term</p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <MatchDetails 
            match={selectedMatch} 
            allMatches={matches}
            onSelectMatch={(m) => {
              setSelectedMatch(m);
              fetchMatchDetails(m.fixture.id);
            }}
            isFavTeamHome={favTeams.includes(selectedMatch.teams.home.id)}
            isFavTeamAway={favTeams.includes(selectedMatch.teams.away.id)}
            isFavLeague={favLeagues.includes(selectedMatch.league.id)}
            onToggleFavTeam={toggleFavTeam}
            onToggleFavLeague={toggleFavLeague}
            onClose={() => setSelectedMatch(null)} 
            events={matchEvents[selectedMatch.fixture.id]}
          />
        )}
      </AnimatePresence>

      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 opacity-50">
             <Activity size={16} />
             <span className="text-[10px] font-mono tracking-widest uppercase font-bold">API-Sports Enterprise Connectivity</span>
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            © 2026 GoalStream Hub • Real-time Data Synchronization
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FixtureCardProps {
  match: Match;
  onClick: () => void;
  isFavTeamHome: boolean;
  isFavTeamAway: boolean;
  isFavLeague: boolean;
  onToggleFavTeam: (id: number) => void;
  onToggleFavLeague: (id: number) => void;
}

const FixtureCard: React.FC<FixtureCardProps> = React.memo(({ 
  match, 
  onClick, 
  isFavTeamHome, 
  isFavTeamAway, 
  isFavLeague,
  onToggleFavTeam,
  onToggleFavLeague
}) => {
  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(match.fixture.status.short);
  const isFinished = ['FT', 'AET', 'PEN', 'AOT'].includes(match.fixture.status.short);
  const isElite = [39, 140, 78, 135, 61, 2, 1].includes(match.league.id);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://media.api-sports.io/football/teams/unknown.png';
  };

  return (
    <div
      className={`bg-white rounded-[24px] overflow-hidden p-4 flex flex-col gap-3 group cursor-pointer transition-all hover:translate-y-[-4px] hover:shadow-xl active:scale-[0.98] border ${(isElite || isFavLeague || isFavTeamHome || isFavTeamAway) ? 'border-amber-200 shadow-[0_10px_30px_-15px_rgba(251,191,36,0.3)]' : 'border-gray-100 shadow-sm'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavLeague(match.league.id); }}
            className={`transition-colors ${isFavLeague ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
          >
            <Star size={12} fill={isFavLeague ? "currentColor" : "none"} />
          </button>
          <img src={match.league.logo} alt="" className="w-4 h-4 object-contain" onError={handleImageError} />
          <span className="text-[9px] font-black uppercase text-black/50 truncate max-w-[80px]">
            {match.league.name}
          </span>
          {isElite && (
            <span className="bg-amber-100 text-amber-600 text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap">
              Elite
            </span>
          )}
        </div>
          {isLive ? (
            <motion.div 
              layoutId={`live-tag-${match.fixture.id}`}
              className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-100/80 px-2 py-0.5 rounded-lg uppercase border border-red-600/10"
            >
              <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse" />
              {match.fixture.status.elapsed}'
            </motion.div>
          ) : (
            <span className="text-[9px] font-black text-gray-500 bg-black/5 px-2 py-0.5 rounded-lg uppercase">
              {isFinished ? 'FT' : new Date(match.fixture.date).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })}
            </span>
          )}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[70px] relative">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavTeam(match.teams.home.id); }}
            className={`absolute -top-1 -right-1 z-10 transition-colors ${isFavTeamHome ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
          >
            <Star size={10} fill={isFavTeamHome ? "currentColor" : "none"} />
          </button>
          <img src={match.teams.home.logo} alt="" className="w-10 h-10 object-contain drop-shadow-sm" onError={handleImageError} loading="lazy" />
          <span className="text-[10px] font-bold text-center leading-tight truncate w-full text-black">
            {match.teams.home.name}
          </span>
        </div>

        <div className="flex flex-col items-center flex-1">
          {(isFinished || isLive) ? (
            <div className="flex flex-col items-center gap-1">
              <div className="font-mono text-xl font-black italic tracking-tighter flex items-center gap-1.5 text-black">
                <span>{match.goals.home ?? 0}</span>
                <span className="text-gray-300 not-italic">:</span>
                <span>{match.goals.away ?? 0}</span>
              </div>
              {isLive && (
                 <a 
                  href={`https://www.google.com/search?q=${encodeURIComponent(match.teams.home.name + ' vs ' + match.teams.away.name + ' live stream')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[7px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-full hover:bg-red-700 transition-colors"
                 >
                   <Play size={6} fill="currentColor" /> Watch
                 </a>
              )}
            </div>
          ) : (
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 py-1 bg-black/5 rounded-full">VS</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[70px] relative">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavTeam(match.teams.away.id); }}
            className={`absolute -top-1 -right-1 z-10 transition-colors ${isFavTeamAway ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
          >
            <Star size={10} fill={isFavTeamAway ? "currentColor" : "none"} />
          </button>
          <img src={match.teams.away.logo} alt="" className="w-10 h-10 object-contain drop-shadow-sm" onError={handleImageError} loading="lazy" />
          <span className="text-[10px] font-bold text-center leading-tight truncate w-full text-black">
            {match.teams.away.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-black/5">
         <div className="p-1.5 bg-black/5 rounded-lg">
            <Activity size={10} className="text-black/30" />
         </div>
         <div className="flex flex-col overflow-hidden">
            <span className="text-[9px] font-black uppercase tracking-tight text-black truncate">
              {match.fixture.venue.name || 'Neutral Venue'}
            </span>
            <span className="text-[8px] font-medium text-black/40 leading-none truncate uppercase tracking-tighter">
              {match.fixture.venue.city || 'Location N/A'}
            </span>
         </div>
      </div>
    </div>
  );
});

function MatchDetails({ 
  match, 
  allMatches,
  onSelectMatch,
  isFavTeamHome, 
  isFavTeamAway, 
  isFavLeague,
  onToggleFavTeam,
  onToggleFavLeague,
  onClose,
  events = [] 
}: { 
  match: Match, 
  allMatches: Match[],
  onSelectMatch: (m: Match) => void,
  isFavTeamHome: boolean,
  isFavTeamAway: boolean,
  isFavLeague: boolean,
  onToggleFavTeam: (id: number) => void,
  onToggleFavLeague: (id: number) => void,
  onClose: () => void,
  events?: MatchEvent[]
}) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMELINE' | 'STATS'>('OVERVIEW');
  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(match.fixture.status.short);
  const isFinished = ['FT', 'AET', 'PEN'].includes(match.fixture.status.short);

  const liveMatches = useMemo(() => {
    return allMatches.filter(m => 
      ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(m.fixture.status.short)
    );
  }, [allMatches]);

  const getStatValue = (stats: TeamStatistics | undefined, type: string) => {
    return stats?.statistics.find(s => s.type === type)?.value || 0;
  };

  const parseStat = (val: string | number | null) => {
    if (typeof val === 'string' && val.includes('%')) return parseInt(val);
    return parseInt(String(val || 0));
  };

  const statTypes = useMemo(() => [
    'Shots on Goal', 'Total Shots', 'Corner Kicks', 'Offsides', 
    'Ball Possession', 'Yellow Cards', 'Red Cards', 'Goalkeeper Saves'
  ], []);

  const kickoffTime = useMemo(() => {
    return new Date(match.fixture.date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  }, [match.fixture.date]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-2xl h-[90vh] md:h-[80vh] bg-[#202124] rounded-t-[40px] md:rounded-[40px] overflow-hidden flex flex-col shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section (Google Search style Score Tag) */}
        <div className="p-2 md:p-3 flex items-center justify-between border-b border-white/10 bg-[#121212] shrink-0 gap-2">
          <div className="flex-1 overflow-x-auto no-scrollbar scroll-smooth">
            <div className="flex items-center gap-2 py-0.5 min-w-min">
              {liveMatches.length > 0 ? (
                liveMatches.map((m) => {
                  const mIsLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(m.fixture.status.short);
                  const isActive = m.fixture.id === match.fixture.id;
                  return (
                    <button
                      key={m.fixture.id}
                      onClick={() => onSelectMatch(m)}
                      className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                        isActive 
                          ? 'bg-[#303134] border-white/20 shadow-xl scale-100 ring-2 ring-white/5' 
                          : 'bg-transparent border-white/5 hover:bg-white/5 scale-95 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 border-r border-white/5 pr-2 shrink-0">
                        {mIsLive && (
                          <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse shrink-0" />
                        )}
                        <img src={m.league.logo} alt="" className="w-3.5 h-3.5 object-contain opacity-50 shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/40 uppercase tracking-tighter">{m.teams.home.name.substring(0, 3)}</span>
                          <span className="text-white">{m.goals.home ?? 0}</span>
                        </div>
                        
                        <div className="px-1 bg-white/5 rounded border border-white/5">
                           <span className={`text-[8px] font-mono leading-none font-bold ${mIsLive ? 'text-red-400' : 'text-white/40'}`}>
                              {mIsLive ? `${m.fixture.status.elapsed}'` : m.fixture.status.short}
                           </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-white">{m.goals.away ?? 0}</span>
                          <span className="text-white/40 uppercase tracking-tighter">{m.teams.away.name.substring(0, 3)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex items-center gap-3 bg-[#303134] px-4 py-2 rounded-full border border-white/10 shadow-2xl">
                   <div className="flex items-center gap-1.5 border-r border-white/5 pr-2 md:pr-3 shrink-0">
                      <div className="w-4 h-4 md:w-5 md:h-5 bg-white/5 rounded-full flex items-center justify-center p-0.5 shrink-0">
                         <img src={match.league.logo} alt="" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-tighter truncate max-w-[40px] md:max-w-[100px] hidden xs:block">
                        {match.league.name}
                      </span>
                   </div>
                   
                   <div className="flex items-center gap-2.5 md:gap-4 text-[10px] md:text-xs font-black shrink-0">
                      <div className="flex items-center gap-1.5 md:gap-2">
                         <span className="text-white/40 uppercase tracking-tighter">{match.teams.home.name.substring(0, 3)}</span>
                         <span className="text-white text-xs md:text-sm">{match.goals.home ?? 0}</span>
                      </div>
                      
                      <motion.div 
                        layoutId={`live-tag-${match.fixture.id}`}
                        className={`flex items-center px-1.5 md:px-2 rounded-md border ${isLive ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}
                      >
                         <span className={`text-[9px] md:text-[10px] font-mono leading-none font-bold ${isLive ? 'text-red-400' : 'text-white/40'}`}>
                            {isLive ? `${match.fixture.status.elapsed}'` : isFinished ? 'FT' : match.fixture.status.short}
                         </span>
                      </motion.div>
    
                      <div className="flex items-center gap-1.5 md:gap-2">
                         <span className="text-white text-xs md:text-sm">{match.goals.away ?? 0}</span>
                         <span className="text-white/40 uppercase tracking-tighter">{match.teams.away.name.substring(0, 3)}</span>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 border border-white/5 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-[#202124] scroll-smooth">
          <div className="flex flex-col items-center gap-6 relative z-10 p-6 md:p-10 bg-[#202124] text-white">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onToggleFavLeague(match.league.id)}
                className={`transition-colors ${isFavLeague ? 'text-amber-500' : 'text-white/20 hover:text-amber-400'}`}
              >
                <Star size={14} fill={isFavLeague ? "currentColor" : "none"} />
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40">
                <span className="truncate max-w-[120px]">{match.league.name}</span>
                <span>•</span>
                <span className="truncate max-w-[120px]">{match.fixture.venue.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full px-2 max-w-lg">
              <div className="flex flex-col items-center gap-3 flex-1 relative text-center">
                <button 
                  onClick={() => onToggleFavTeam(match.teams.home.id)}
                  className={`absolute -top-2 -right-2 z-10 transition-colors p-1.5 bg-[#303134] rounded-full shadow-sm border border-white/10 ${isFavTeamHome ? 'text-amber-500' : 'text-white/20 hover:text-amber-400'}`}
                >
                  <Star size={14} fill={isFavTeamHome ? "currentColor" : "none"} />
                </button>
                <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-3xl p-3 shadow-md border border-white/10 flex items-center justify-center">
                  <img src={match.teams.home.logo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs md:text-sm font-black tracking-tight">{match.teams.home.name}</span>
              </div>

              <div className="flex flex-col items-center mx-4 gap-2">
                <div className="text-4xl md:text-6xl font-black italic tracking-tighter flex items-center gap-2 text-white">
                  <span>{match.goals.home ?? 0}</span>
                  <span className="text-white/10 not-italic">-</span>
                  <span>{match.goals.away ?? 0}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  {isLive ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl font-mono font-bold text-green-400 underline decoration-green-400/30 decoration-2 underline-offset-4">
                        {match.fixture.status.elapsed}:00
                      </span>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 bg-red-600/10 px-3 py-1 rounded-full animate-pulse border border-red-600/20">
                        Live
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/5 px-3 py-1 rounded-full">
                      {isFinished ? 'Full Time' : match.fixture.status.short}
                    </span>
                  )}
                  {isLive && (
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(match.teams.home.name + ' vs ' + match.teams.away.name + ' live stream')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-lg hover:bg-red-700 transition-all hover:scale-105"
                    >
                      <Play size={10} fill="currentColor" /> Watch Stream
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 flex-1 relative text-center">
                <button 
                  onClick={() => onToggleFavTeam(match.teams.away.id)}
                  className={`absolute -top-2 -right-2 z-10 transition-colors p-1.5 bg-[#303134] rounded-full shadow-sm border border-white/10 ${isFavTeamAway ? 'text-amber-500' : 'text-white/20 hover:text-amber-400'}`}
                >
                  <Star size={14} fill={isFavTeamAway ? "currentColor" : "none"} />
                </button>
                <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-3xl p-3 shadow-md border border-white/10 flex items-center justify-center">
                  <img src={match.teams.away.logo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs md:text-sm font-black tracking-tight">{match.teams.away.name}</span>
              </div>
            </div>

            {/* Goal Scorers Section */}
            <div className="w-full max-w-lg grid grid-cols-[1fr,20px,1fr] gap-2 mt-4 pb-8 border-t border-white/5 transition-opacity">
                <div className="flex flex-col items-end gap-2 px-2 py-4 overflow-hidden">
                   {events.filter(e => {
                      const isGoal = e.type === 'Goal';
                      if (!isGoal) return false;
                      // Fallback to name comparison if ID is missing or 0
                      if (e.team.id && match.teams.home.id) return e.team.id === match.teams.home.id;
                      return e.team.name?.toLowerCase() === match.teams.home.name.toLowerCase();
                   }).map((e, idx) => (
                      <div key={idx} className="flex items-center justify-end gap-2 text-[11px] text-white/80 font-bold tracking-tight w-full animate-in fade-in slide-in-from-right-2 duration-300">
                         <span className="truncate max-w-[120px]">{e.player.name || e.player.id || 'Goal'}</span>
                         <span className="text-white/30 font-mono text-[9px] shrink-0">{e.time.elapsed}'{e.time.extra ? `+${e.time.extra}` : ''}{e.detail === 'Penalty' ? ' (P)' : ''}</span>
                         <div className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/5">
                            <Trophy size={8} className="text-amber-400" />
                         </div>
                      </div>
                   ))}
                </div>
                <div className="flex justify-center">
                   <div className="w-[1px] h-full bg-gradient-to-b from-white/10 to-transparent" />
                </div>
                <div className="flex flex-col items-start gap-2 px-2 py-4 overflow-hidden">
                   {events.filter(e => {
                      const isGoal = e.type === 'Goal';
                      if (!isGoal) return false;
                      if (e.team.id && match.teams.away.id) return e.team.id === match.teams.away.id;
                      return e.team.name?.toLowerCase() === match.teams.away.name.toLowerCase();
                   }).map((e, idx) => (
                      <div key={idx} className="flex items-center justify-start gap-2 text-[11px] text-white/80 font-bold tracking-tight w-full animate-in fade-in slide-in-from-left-2 duration-300">
                         <div className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/5">
                            <Trophy size={8} className="text-amber-400" />
                         </div>
                         <span className="text-white/30 font-mono text-[9px] shrink-0">{e.time.elapsed}'{e.time.extra ? `+${e.time.extra}` : ''}{e.detail === 'Penalty' ? ' (P)' : ''}</span>
                         <span className="truncate max-w-[120px]">{e.player.name || e.player.id || 'Goal'}</span>
                      </div>
                   ))}
                </div>
            </div>
          </div>

          {/* Tab Selection - STICKY */}
          <div className="sticky top-0 z-30 flex px-6 py-4 bg-[#202124] border-t border-b border-white/5">
            <div className="flex w-full bg-white/5 rounded-2xl p-1.5 ring-1 ring-white/10">
              {(['OVERVIEW', 'TIMELINE', 'STATS'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                    activeTab === tab ? 'bg-white text-black shadow-lg shadow-black/20' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Selection Content area (no longer flex-1 scrollable itself, but part of parent scroll) */}
          <div className="px-6 py-8">
             {activeTab === 'OVERVIEW' ? (
              <div className="space-y-12">
                 <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                       <Trophy size={12} className="text-white/20" /> Performance overview
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-8 items-center">
                       <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl font-black text-white">{match.goals.home ?? 0}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{match.teams.home.name}</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl font-black text-white">{match.goals.away ?? 0}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{match.teams.away.name}</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 border-b border-white/5 pb-2">Match Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                         <div className="w-10 h-10 bg-[#303134] rounded-xl flex items-center justify-center text-white/40">
                            <Activity size={20} />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight">{match.fixture.venue.name}</p>
                            <p className="text-[10px] font-medium text-white/40 uppercase tracking-wide">{match.fixture.venue.city}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                         <div className="w-10 h-10 bg-[#303134] rounded-xl flex items-center justify-center text-white/40">
                            <Clock size={20} />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight">{kickoffTime} IST</p>
                            <p className="text-[10px] font-medium text-white/40 uppercase tracking-wide">Kickoff Time</p>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>
           ) : activeTab === 'STATS' ? (
             <div className="space-y-6 max-w-sm mx-auto">
                {match.statistics && match.statistics.length > 0 ? (
                  statTypes.map((type, i) => {
                    const homeVal = getStatValue(match.statistics?.[0], type);
                    const awayVal = getStatValue(match.statistics?.[1], type);
                    
                    const hNum = parseStat(homeVal);
                    const aNum = parseStat(awayVal);
                    const total = (hNum + aNum) || 1;
                    const homePercent = (hNum / total) * 100;

                    return (
                      <div key={i} className="flex flex-col gap-2">
                         <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-wider text-white/40">
                            <span className="font-mono text-xs text-white">{homeVal}</span>
                            <span className="opacity-40">{type}</span>
                            <span className="font-mono text-xs text-white">{awayVal}</span>
                         </div>
                         <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${homePercent}%` }}
                              className="h-full bg-white" 
                            />
                         </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <Activity size={48} className="mb-4 text-white" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Stats synchronized after Kickoff</p>
                  </div>
                )}
             </div>
           ) : (
             <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                {events && events.length > 0 ? (
                   events.map((event, i) => {
                     const isHome = event.team.id === match.teams.home.id;
                     const isGoal = event.type === 'Goal';
                     const isCard = event.type === 'Card';

                     return (
                       <motion.div 
                         key={i} 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: i * 0.05 }}
                         className="relative flex items-start gap-6 pl-10"
                       >
                          <div className={`absolute left-0 w-9 h-9 rounded-full flex items-center justify-center p-2 z-10 border border-white/10 ${
                            isGoal ? 'bg-[#303134] text-white shadow-xl' : 
                            isCard && event.detail.includes('Yellow') ? 'bg-amber-400' :
                            isCard && event.detail.includes('Red') ? 'bg-red-500 text-white' :
                            'bg-[#303134] text-white/40'
                          }`}>
                             {isGoal ? <Trophy size={14} className="text-amber-400" /> : 
                              isCard ? <Activity size={14} /> : 
                              <RefreshCw size={14} />}
                          </div>

                          <div className="flex-1 flex flex-col gap-1">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black font-mono text-white/20 italic">{event.time.elapsed}'</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isHome ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                                  {isHome ? 'Home' : 'Away'}
                                </span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-sm font-black leading-tight text-white">{event.player.name}</span>
                                <span className="text-[10px] font-medium text-white/40 italic">
                                  {event.detail} {event.assist?.name && `(Assist: ${event.assist.name})`}
                                </span>
                             </div>
                          </div>
                       </motion.div>
                     );
                   })
                ) : (
                   <div className="py-20 text-center opacity-30 flex flex-col items-center">
                     <Activity size={48} className="mb-4 text-white" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-white">No major events yet</p>
                   </div>
                )}
             </div>
           )}
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
}
