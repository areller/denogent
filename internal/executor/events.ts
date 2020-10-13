export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type TaskEvent =
  | TaskStartedEvent
  | TaskLogEvent
  | TaskFailedConditionEvent
  | TaskFailedEvent
  | TaskFinishedSuccessfullyEvent;

export interface TaskStartedEvent {
  type: 'started';
  task: string;
}

export interface TaskLogEvent {
  type: 'log';
  task: string;
  level: LogLevel;
  message: string;
  error?: Error;
}

export interface TaskFailedConditionEvent {
  type: 'failedCondition';
  task: string;
  conditionId: number;
  condition: string;
}

export interface TaskFailedEvent {
  type: 'failed';
  task: string;
  error?: Error;
}

export interface TaskFinishedSuccessfullyEvent {
  type: 'finishedSuccessfully';
  task: string;
}
