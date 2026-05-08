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
  Flame
} from 'lucide-react';
import { Match, FilterStatus, SportType, SportConfig, MatchEvent, TeamStatistics } from './types';

const SPORTS: SportConfig[] = [
  { id: 'FOOTBALL', name: 'Football', host: 'v3.football.api-sports.io', icon: 'Trophy' },
  { id: 'BASKETBALL', name: 'Basketball', host: 'v1.basketball.api-sports.io', icon: 'Dribbble' },
  { id: 'BASEBALL', name: 'Baseball', host: 'v1.baseball.api-sports.io', icon: 'Zap' },
  { id: 'NFL', name: 'NFL', host: 'v1.american-football.api-sports.io', icon: 'Flag' },
  { id: 'HOCKEY', name: 'Hockey', host: 'v1.hockey.api-sports.io', icon: 'Activity' },
  { id: 'HANDBALL', name: 'Handball', host: 'v1.handball.api-sports.io', icon: 'Target' },
  { id: 'RUGBY', name: 'Rugby', host: 'v1.rugby.api-sports.io', icon: 'Award' },
  { id: 'VOLLEYBALL', name: 'Volleyball', host: 'v1.volleyball.api-sports.io', icon: 'Award' },
  { id: 'MMA', name: 'MMA', host: 'v1.mma.api-sports.io', icon: 'Flame' },
];

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

const FOOTBALL_API_HOST = 'v3.football.api-sports.io';
const API_KEY = (import.meta as any).env?.VITE_FOOTBALL_API_KEY || '955c8d94e3ea6c7cbc6f57f3c3a35a39';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
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
    }
  };

  const fetchMatchDetails = async (fixtureId: number) => {
    try {
      const eventsUrl = `https://${FOOTBALL_API_HOST}/fixtures/events?fixture=${fixtureId}`;
      const statsUrl = `https://${FOOTBALL_API_HOST}/fixtures/statistics?fixture=${fixtureId}`;
      
      const [eventsRes, statsRes] = await Promise.all([
        fetch(eventsUrl, { headers: { 'x-apisports-key': API_KEY } }),
        fetch(statsUrl, { headers: { 'x-apisports-key': API_KEY } })
      ]);

      const eventsData = await eventsRes.json();
      const statsData = await statsRes.json();

      setMatches(prev => prev.map(m => {
        if (m.fixture.id === fixtureId) {
          return {
            ...m,
            events: eventsData.response || [],
            statistics: statsData.response || []
          };
        }
        return m;
      }));
      
      const updatedMatch = matches.find(m => m.fixture.id === fixtureId);
      if (updatedMatch) {
        setSelectedMatch({
          ...updatedMatch,
          events: eventsData.response || [],
          statistics: statsData.response || []
        });
      }
    } catch (err) {
      console.error("Error fetching details:", err);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(() => fetchMatches(), 60000 * 5);
    return () => clearInterval(interval);
  }, []);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!matches) return [];
    
    return matches.filter(match => {
      const h = match.teams?.home?.name || '';
      const a = match.teams?.away?.name || '';
      const l = match.league?.name || '';
      
      const searchMatch = !q || 
        h.toLowerCase().includes(q) || 
        a.toLowerCase().includes(q) || 
        l.toLowerCase().includes(q);
      
      if (!searchMatch) return false;

      if (filter === 'LIVE') {
        return ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(match.fixture.status.short);
      }
      if (filter === 'FINISHED') {
        return ['FT', 'AET', 'PEN', 'AOT'].includes(match.fixture.status.short);
      }
      return true;
    });
  }, [matches, filter, searchQuery]);

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
                placeholder="Search fixtures..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-2xl text-[13px] text-black placeholder:text-gray-400 outline-none transition-all shadow-sm focus:shadow-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>

          <button 
            onClick={() => fetchMatches()}
            className="flex items-center gap-2 px-3 py-2 bg-black text-white hover:bg-gray-800 rounded-2xl transition-all shadow-lg active:scale-95 shrink-0"
            title="Refresh Scores"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="text-[10px] font-black uppercase tracking-wider hidden xs:block">Reload</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-2 pb-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Football Today</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-xl">
            {(['ALL', 'LIVE', 'FINISHED'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  filter === f 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
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
              <p className="text-lg font-bold text-white italic font-display">No matches found</p>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </main>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <MatchDetails 
            match={selectedMatch} 
            onClose={() => setSelectedMatch(null)} 
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
}

const FixtureCard: React.FC<FixtureCardProps> = ({ match, onClick }) => {
  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(match.fixture.status.short);
  const isFinished = ['FT', 'AET', 'PEN', 'AOT'].includes(match.fixture.status.short);

  return (
    <div
      className="bg-white rounded-[24px] overflow-hidden p-4 flex flex-col gap-3 group cursor-pointer transition-all hover:translate-y-[-4px] hover:shadow-xl active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <img src={match.league.logo} alt="" className="w-4 h-4 object-contain" />
          <span className="text-[9px] font-black uppercase text-black/50 truncate">
            {match.league.name}
          </span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-100/80 px-2 py-0.5 rounded-lg uppercase">
            <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse" />
            {match.fixture.status.elapsed}'
          </span>
        ) : (
          <span className="text-[9px] font-black text-gray-500 bg-black/5 px-2 py-0.5 rounded-lg uppercase">
            {isFinished ? 'FT' : new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[70px]">
          <img src={match.teams.home.logo} alt="" className="w-10 h-10 object-contain drop-shadow-sm" />
          <span className="text-[10px] font-bold text-center leading-tight truncate w-full text-black">
            {match.teams.home.name}
          </span>
        </div>

        <div className="flex flex-col items-center flex-1">
          {(isFinished || isLive) ? (
            <div className="font-mono text-xl font-black italic tracking-tighter flex items-center gap-1.5 text-black">
              <span>{match.goals.home ?? 0}</span>
              <span className="text-gray-300 not-italic">:</span>
              <span>{match.goals.away ?? 0}</span>
            </div>
          ) : (
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 py-1 bg-black/5 rounded-full">VS</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[70px]">
          <img src={match.teams.away.logo} alt="" className="w-10 h-10 object-contain drop-shadow-sm" />
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
}

function MatchDetails({ match, onClose }: { match: Match, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'STATS' | 'TIMELINE'>('TIMELINE');
  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(match.fixture.status.short);

  const getStatValue = (stats: TeamStatistics | undefined, type: string) => {
    return stats?.statistics.find(s => s.type === type)?.value || 0;
  };

  const parseStat = (val: string | number | null) => {
    if (typeof val === 'string' && val.includes('%')) return parseInt(val);
    return parseInt(String(val || 0));
  };

  const statTypes = [
    'Shots on Goal', 'Total Shots', 'Corner Kicks', 'Offsides', 
    'Ball Possession', 'Yellow Cards', 'Red Cards', 'Goalkeeper Saves'
  ];

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
        className="liquid-glass w-full max-w-2xl h-[90vh] md:h-[80vh] rounded-t-[40px] md:rounded-[40px] overflow-hidden flex flex-col shadow-2xl border-white/30"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="relative p-6 pt-12 md:p-10 text-black">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/5 to-transparent pointer-events-none" />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/80 hover:bg-white rounded-full transition-all active:scale-95 shadow-sm z-50 border border-black/5"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center gap-6 relative z-10">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/5 rounded-full text-[9px] font-black uppercase tracking-widest text-black/50">
              <span className="truncate max-w-[120px]">{match.league.name}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">{match.fixture.venue.name}</span>
            </div>

            <div className="flex items-center justify-between w-full px-2 max-w-lg">
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-3xl p-3 shadow-md border border-black/5 flex items-center justify-center">
                  <img src={match.teams.home.logo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-black text-center leading-tight tracking-tight">{match.teams.home.name}</span>
              </div>

              <div className="flex flex-col items-center mx-4 gap-2">
                <div className="text-4xl md:text-6xl font-display font-black italic tracking-tighter flex items-center gap-2">
                  <span className="text-black">{match.goals.home ?? 0}</span>
                  <span className="text-black/10 not-italic">-</span>
                  <span className="text-black">{match.goals.away ?? 0}</span>
                </div>
                {isLive && (
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 bg-red-100 px-3 py-1 rounded-full animate-pulse">
                    Live
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-3xl p-3 shadow-md border border-black/5 flex items-center justify-center">
                  <img src={match.teams.away.logo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-black text-center leading-tight tracking-tight">{match.teams.away.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex px-6 pt-2">
           <div className="flex w-full bg-black/5 rounded-2xl p-1.5">
             {(['TIMELINE', 'STATS'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                   activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black/60'
                 }`}
               >
                 {tab}
               </button>
             ))}
           </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar scroll-smooth">
           {activeTab === 'STATS' ? (
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
                         <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-wider text-black/60">
                            <span className="font-mono text-xs text-black">{homeVal}</span>
                            <span className="opacity-40">{type}</span>
                            <span className="font-mono text-xs text-black">{awayVal}</span>
                         </div>
                         <div className="h-1.5 bg-black/5 rounded-full overflow-hidden flex border border-black/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${homePercent}%` }}
                              className="h-full bg-black" 
                            />
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${100 - homePercent}%` }}
                              className="h-full bg-gray-400/30" 
                            />
                         </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <Activity size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Stats synchronized after Kickoff</p>
                  </div>
                )}
             </div>
           ) : (
             <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-black/5">
                {match.events && match.events.length > 0 ? (
                   match.events.map((event, i) => {
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
                          <div className={`absolute left-0 w-9 h-9 rounded-full flex items-center justify-center p-2 z-10 ${
                            isGoal ? 'bg-black text-white shadow-xl' : 
                            isCard && event.detail.includes('Yellow') ? 'bg-yellow-400' :
                            isCard && event.detail.includes('Red') ? 'bg-red-500 text-white' :
                            'bg-white text-gray-400 border border-black/5'
                          }`}>
                             {isGoal ? <Trophy size={14} /> : 
                              isCard ? <Activity size={14} /> : 
                              <RefreshCw size={14} />}
                          </div>

                          <div className="flex-1 flex flex-col gap-1">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black font-mono text-black/30 italic">{event.time.elapsed}'</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isHome ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                  {isHome ? 'Home' : 'Away'}
                                </span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-sm font-black leading-tight text-black">{event.player.name}</span>
                                <span className="text-[10px] font-medium text-black/40 italic">
                                  {event.detail} {event.assist.name && `(Assist: ${event.assist.name})`}
                                </span>
                             </div>
                          </div>
                       </motion.div>
                     );
                   })
                ) : (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <Activity size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No major events yet</p>
                  </div>
                )}
             </div>
           )}
        </div>
      </motion.div>
    </motion.div>
  );
}
