import Bull from 'bull';

export const fileQueue = new Bull('fileQueue');
