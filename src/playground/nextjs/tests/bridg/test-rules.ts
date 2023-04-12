import { DbRules } from './handler';
import fs from 'fs';

// just writing them to file for now to make it easy to update / pass around
export const setRules = (newRules: DbRules) => fs.writeFileSync('./tests/bridg/rules.json', JSON.stringify(newRules));

export const getRules = (): DbRules => JSON.parse(fs.readFileSync('./tests/bridg/rules.json', 'utf8')) as DbRules;
