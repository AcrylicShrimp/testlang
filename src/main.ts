'use strict';

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Parser as RuleParser, TableGenerator } from './rule';
import { Parser } from './parser';

try {
	const ruleParser = new RuleParser(readFileSync(resolve(__dirname, '..', 'rules', 'main.rule'), 'utf-8'));
	const tableGenerator = new TableGenerator(ruleParser);

	const firstSet = tableGenerator.generateFirst();
	const c1 = tableGenerator.generateC1(firstSet);
	const actionTable = tableGenerator.genenrateActionTable(c1);

	const parser = new Parser(actionTable);

	const ast = parser.parse('let test = id;');

	console.log(ast);
} catch (err) {
	console.error(err);
}
