import { GroupingError } from './types';

export class GroupingFailedError extends Error implements GroupingError {
  code = 'GROUPING_FAILED';
  details?: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'GroupingFailedError';
    this.details = details;
  }
}