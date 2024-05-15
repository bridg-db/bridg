import { DbRules } from '../generated/bridg/server/index';

let rules: DbRules = {};

export const setRules = (newRules: DbRules) => (rules = newRules);
export const getRules = (): DbRules => rules;
