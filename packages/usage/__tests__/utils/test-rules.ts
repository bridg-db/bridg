import { DbRules } from '../generated/bridg/server/request-handler';

let rules: DbRules = {};

export const setRules = (newRules: DbRules) => (rules = newRules);
export const getRules = (): DbRules => rules;
