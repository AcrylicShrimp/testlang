'use strict';

import { readFileSync } from 'fs';
import { resolve } from 'path';
// import { Lexer, Token, TokenType } from './lexer';
import { Parser, TableGenerator } from './rule';
import { stringify } from 'querystring';

// const lexer = new Lexer("if 1 == +1.: return '10fsdfsfs';");

// for (let token = lexer.next(); token.type != TokenType.eof; token = lexer.next()) {
// 	console.log(token);
// }

const parser = new Parser(readFileSync(resolve(__dirname, '..', 'rules', 'test.rule'), 'utf-8'));
const tableGenerator = new TableGenerator(parser);

const firstSet = tableGenerator.generateFirst();
const followSet = tableGenerator.generateFollow(firstSet);

console.log(firstSet);
console.log(followSet);

const result = tableGenerator.generateC1(firstSet);

console.log(result);
