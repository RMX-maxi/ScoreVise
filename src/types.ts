export interface Team {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface Goals {
  home: number | null;
  away: number | null;
}

export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number;
  round: string;
}

export interface Score {
  halftime: Goals;
  fulltime: Goals;
  extratime: Goals;
  penalty: Goals;
}

export interface MatchEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

export interface MatchStatistic {
  type: string;
  value: string | number | null;
}

export interface TeamStatistics {
  team: { id: number; name: string; logo: string };
  statistics: MatchStatistic[];
}

export interface Match {
  fixture: Fixture;
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
  score: Score;
  events?: MatchEvent[];
  statistics?: TeamStatistics[];
}

export type FilterStatus = 'ALL' | 'LIVE' | 'FINISHED' | 'SCHEDULED';

export type SportType = 'FOOTBALL';

export interface SportConfig {
  id: SportType;
  name: string;
  host: string;
  icon: string;
}
