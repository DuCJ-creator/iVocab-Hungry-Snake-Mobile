export interface WordItem {
  word: string;
  pos: string;
  meaning: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Food extends Point {
  meaning: string;
  correct: boolean;
}

export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum ControlMode {
  KEYBOARD = 'KEYBOARD',
  TOUCH = 'TOUCH'
}

export interface GameSettings {
  gridSize: number;
  baseSpeed: number;
  gameDuration: number;
}