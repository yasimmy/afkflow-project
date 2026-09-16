import { nanoid } from 'nanoid';

export const newId = (prefix?: string) =>
  prefix ? `${prefix}_${nanoid(16)}` : nanoid(16);
