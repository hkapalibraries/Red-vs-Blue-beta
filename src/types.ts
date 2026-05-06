export type Team = 'red' | 'blue';
export type GameStatus = 'waiting' | 'playing' | 'finished' | 'reward';

export interface Question {
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface GameState {
  sessionId: string;
  status: GameStatus;
  targetScore: number;
  question?: Question;
  winner?: Team | 'none';
}

export interface GameEvent {
  sessionId: string;
  team: Team;
  userId: string;
  createdAt: any;
}
