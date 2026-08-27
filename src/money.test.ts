import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';
describe('formatMoney', () => { it('formats NPR with Indian grouping', () => expect(formatMoney(123456)).toBe('NPR 1,23,456')); });
