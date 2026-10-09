const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const startOfDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const subDays = (date: Date, days: number): Date => new Date(date.getTime() - days * MS_PER_DAY);

/** UTC calendar date, `YYYY-MM-DD`. */
export const format = (date: Date): string => date.toISOString().slice(0, 10);
