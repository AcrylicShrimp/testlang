import objectHash from 'object-hash';

import ObjectSet from './utils/object-set';
import Queue from './utils/queue';
import { Hash, timingSafeEqual } from 'crypto';

enum TokenType {
	eof,
	unknown,
	colon,
	semicolon,
	id,
	literal
}

class Token {
	private _type: TokenType;
	private _content: string;

	public constructor(type: TokenType, content: string) {
		this._type = type;
		this._content = content;
	}

	public get type(): TokenType {
		return this._type;
	}

	public get content(): string {
		return this._content;
	}
}

class Lexer {
	private content: string;
	private index: number;
	private maxIndex: number;

	public constructor(content: string) {
		this.content = content;
		this.index = 0;
		this.maxIndex = this.content.length;
	}

	public next(): Token {
		let content = this.nextBlackspace();

		if (!content)
			return new Token(TokenType.eof, '');

		if (content === ':')
			return new Token(TokenType.colon, ':');

		if (content === ';')
			return new Token(TokenType.semicolon, ';');

		while (!this.isEOF && !this.isWhitespace && !this.isPunctuation)
			content += this.content[this.index++];

		let id = false;

		if (content[0] === '@') {
			id = true;
			content = content.substring(1);
		}

		if (!content)
			return new Token(TokenType.unknown, this.content[this.index++]);

		return new Token(id ? TokenType.id : TokenType.literal, content);
	}

	private nextBlackspace(): string {
		while (!this.isEOF && this.isWhitespace)
			++this.index;

		if (this.isEOF)
			return '';

		return this.content[this.index++];
	}

	private get isWhitespace(): boolean {
		return /[ \f\n\r\t\v\u00A0\u2028\u2029]/.test(this.content[this.index]);
	}

	private get isPunctuation(): boolean {
		return /[:;@]/.test(this.content[this.index]);
	}

	private get isEOF(): boolean {
		return this.maxIndex <= this.index;
	}
}

enum RuleItemType {
	id,
	literal
}

class RuleItem {
	private _type: RuleItemType;
	private _content: string;

	public constructor(type: RuleItemType, content: string) {
		this._type = type;
		this._content = content;
	}

	public get type(): RuleItemType {
		return this._type;
	}

	public get content(): string {
		return this._content;
	}
}

class Rule {
	private _name: string;
	private _itemList: Array<RuleItem>;

	public constructor(name: string) {
		this._name = name;
		this._itemList = [];
	}

	public add(ruleItem: RuleItem) {
		this._itemList.push(ruleItem);
	}

	public get name(): string {
		return this._name;
	}

	public get itemList(): Array<RuleItem> {
		return this._itemList;
	}

	public get first(): RuleItem | null {
		return this._itemList.length === 0 ? null : this._itemList[0];
	}
}

class AugmentedRule {
	private _rule: Rule;
	private _index: number;
	private _lookahead: string;

	public constructor(rule: Rule, lookahead: string) {
		this._rule = rule;
		this._index = 0;
		this._lookahead = lookahead;
	}

	public get rule(): Rule {
		return this._rule;
	}

	public get ruleItem(): RuleItem {
		return this._rule.itemList[this._index];
	}

	public get index(): number {
		return this._index;
	}

	public set index(index: number) {
		this._index = index;
	}

	public get lookahead(): string {
		return this._lookahead;
	}

	public get remains(): boolean {
		return this._index < this._rule.itemList.length;
	}
}

class AugmentedRuleSet extends ObjectSet<AugmentedRule>{ }

interface AugmentedRuleSetMap {
	[ruleName: string]: AugmentedRuleSet
}

type AugmentedRuleSetMapSetTranstition = { from: AugmentedRuleSetMap, to: AugmentedRuleSetMap, label: string };

class AugmentedRuleSetMapSet extends ObjectSet<AugmentedRuleSetMap> {
	private _transitionSet: ObjectSet<AugmentedRuleSetMapSetTranstition> = new ObjectSet();
	private _transitionKeyMap: { [hash: string]: string } = {};
	private _indexMap: { [hash: string]: number } = {};

	public add(obj: AugmentedRuleSetMap) {
		super.add(obj);

		const hash = objectHash(obj, {
			respectType: false,
			unorderedArrays: true
		});

		if (this._indexMap.hasOwnProperty(hash))
			return;

		const index = Object.keys(this._indexMap).length;
		this._indexMap[hash] = index;
	}

	public addTransition(transition: AugmentedRuleSetMapSetTranstition) {
		const hash = objectHash(transition, {
			respectType: false,
			unorderedArrays: true
		});
		const fromHash = objectHash({
			from: transition.from,
			label: transition.label
		}, {
			respectType: false,
			unorderedArrays: true
		});

		this._transitionSet.add(transition);
		this._transitionKeyMap[fromHash] = hash;
	}

	public obtainTransition(from: AugmentedRuleSetMap, label: string): AugmentedRuleSetMapSetTranstition | null {
		const hash = objectHash({
			from,
			label
		}, {
			respectType: false,
			unorderedArrays: true
		});

		if (!this._transitionKeyMap.hasOwnProperty(hash))
			return null;

		return this._transitionSet.obtain(this._transitionKeyMap[hash]);
	}

	public forEachTransition(type: (trantision: AugmentedRuleSetMapSetTranstition) => void) {
		this._transitionSet.forEach(type);
	}

	public obtainIndex(ruleSetMap: AugmentedRuleSetMap): number {
		return this._indexMap[objectHash(ruleSetMap, {
			respectType: false,
			unorderedArrays: true
		})];
	}
}

class Parser {
	private lexer: Lexer;

	public constructor(content: string) {
		this.lexer = new Lexer(content);
	}

	public next(): Rule | null {
		const name = this.lexer.next();

		if (name.type === TokenType.eof)
			return null;

		if (name.type !== TokenType.literal)
			throw {
				error: 'Unexpected token',
				message: `'${TokenType[TokenType.literal]}' expected, got '${TokenType[name.type]}'.`
			};

		const colon = this.lexer.next();

		if (colon.type !== TokenType.colon)
			throw {
				error: 'Unexpected token',
				message: `'${TokenType[TokenType.colon]}' expected, got '${TokenType[colon.type]}'.`
			};

		const rule = new Rule(name.content);
		const firstRuleItem = this.lexer.next();

		if (firstRuleItem.type !== TokenType.id && firstRuleItem.type !== TokenType.literal)
			throw {
				error: 'Unexpected token',
				message: `'${TokenType[TokenType.id]}' or '${TokenType[TokenType.literal]}' expected, got '${TokenType[firstRuleItem.type]}'.`
			};

		rule.add(new RuleItem(firstRuleItem.type === TokenType.id ? RuleItemType.id : RuleItemType.literal, firstRuleItem.content));

		for (; ;) {
			const ruleItem = this.lexer.next();

			if (ruleItem.type !== TokenType.semicolon && ruleItem.type !== TokenType.id && ruleItem.type !== TokenType.literal)
				throw {
					error: 'Unexpected token',
					message: `'${TokenType[TokenType.semicolon]}' or '${TokenType[TokenType.id]}' or '${TokenType[TokenType.literal]}' expected, got '${TokenType[ruleItem.type]}'.`
				};

			if (ruleItem.type === TokenType.semicolon)
				break;

			rule.add(new RuleItem(ruleItem.type === TokenType.id ? RuleItemType.id : RuleItemType.literal, ruleItem.content));
		}

		return rule;
	}
}

interface RuleListMap {
	[key: string]: Array<Rule>
}

interface FirstSet {
	[key: string]: Set<string>
}

interface FollowSet {
	[key: string]: Set<string>
}

enum ActionType {
	goto,
	shift,
	reduce,
	accept
}

interface ActionItem {
	type: ActionType,
	nextState: number,
	reduceCount: number,
	reduceRuleName: string
}

interface ActionStateItem {
	id: { [content: string]: ActionItem },
	literal: { [content: string]: ActionItem }
}

class ActionTable extends Array<ActionStateItem>{ }

class TableGenerator {
	private ruleListMap: RuleListMap;

	public constructor(parser: Parser) {
		this.ruleListMap = {};

		try {
			for (let rule = parser.next(); rule; rule = parser.next()) {
				this.ensureRuleExists(rule);
				this.ruleListMap[rule.name].push(rule);
			}
		} catch (err) {
			console.log(err);
		}
	}

	public generateFirst(): FirstSet {
		const firstSet: FirstSet = {};

		for (const ruleName in this.ruleListMap)
			if (this.ruleListMap.hasOwnProperty(ruleName))
				firstSet[ruleName] = new Set();

		for (; ;) {
			let isUpdated = false;

			const updateSet = (ruleName: string, ruleItem: RuleItem) => {
				const size = firstSet[ruleName].size;

				if (ruleItem.type === RuleItemType.literal)
					firstSet[ruleName].add(ruleItem.content);
				else
					firstSet[ruleItem.content].forEach((_, firstSetItem) => firstSet[ruleName].add(firstSetItem));

				isUpdated = isUpdated || size !== firstSet[ruleName].size;
			};

			for (const ruleName in this.ruleListMap)
				if (this.ruleListMap.hasOwnProperty(ruleName))
					this.ruleListMap[ruleName].forEach(rule => {
						const firstRuleItem = rule.first;

						if (!firstRuleItem)
							return;

						updateSet(ruleName, firstRuleItem);
					});

			if (!isUpdated)
				break;
		}

		return firstSet;
	}

	public generateFollow(firstSet: FirstSet): FollowSet {
		const followSet: FollowSet = {};

		for (const ruleName in this.ruleListMap)
			if (this.ruleListMap.hasOwnProperty(ruleName))
				followSet[ruleName] = new Set();

		for (; ;) {
			let isUpdated = false;

			const mergeSet = (ruleName: string, srcRuleName: string) => {
				const size = followSet[ruleName].size;

				followSet[ruleName] = new Set([...followSet[ruleName], ...followSet[srcRuleName]]);

				isUpdated = isUpdated || size !== followSet[ruleName].size;
			};
			const updateSet = (ruleName: string, ruleItem: RuleItem) => {
				const size = followSet[ruleName].size;

				if (ruleItem.type === RuleItemType.literal)
					followSet[ruleName].add(ruleItem.content);
				else
					firstSet[ruleItem.content].forEach((_, firstSetItem) => followSet[ruleName].add(firstSetItem));

				isUpdated = isUpdated || size !== followSet[ruleName].size;
			};

			for (const ruleName in this.ruleListMap)
				if (this.ruleListMap.hasOwnProperty(ruleName)) {
					this.ruleListMap[ruleName].forEach(rule => {
						rule.itemList.forEach((ruleItem, ruleItemIndex) => {
							if (ruleItem.type !== RuleItemType.id)
								return;

							if (!rule.itemList[ruleItemIndex + 1])
								mergeSet(ruleItem.content, ruleName);
							else
								updateSet(ruleItem.content, rule.itemList[ruleItemIndex + 1]);
						});
					});
				}

			if (!isUpdated)
				break;
		}

		return followSet;
	}

	public generateC1(firstSet: FirstSet): AugmentedRuleSetMapSet {
		if (!this.ruleListMap.hasOwnProperty('__root'))
			throw {
				error: 'Unable to find a root nonterminal',
				message: "You must define a root nonterminal named '__root'."
			};

		if (this.ruleListMap.__root.length !== 1)
			throw {
				error: 'Multiple root definitions detected',
				message: "The root nonterminal definition must be once."
			};

		const closureAll = (ruleSetMap: AugmentedRuleSetMap): AugmentedRuleSetMap => {
			const calcSize = (ruleSetMap: AugmentedRuleSetMap): number => {
				let size = 0;

				for (const ruleName in ruleSetMap)
					if (ruleSetMap.hasOwnProperty(ruleName))
						size += ruleSetMap[ruleName].size;

				return size;
			};

			for (; ;) {
				const size = calcSize(ruleSetMap);
				const addedRule: Array<AugmentedRule> = [];

				for (const ruleName in ruleSetMap) {
					if (!ruleSetMap.hasOwnProperty(ruleName))
						continue;

					const ruleSet = ruleSetMap[ruleName];

					ruleSet.forEach(rule => {
						if (!rule.remains)
							return;

						if (rule.ruleItem.type !== RuleItemType.id)
							return;

						let lookaheadSet = new Set<string>(['']);

						if (rule.index + 1 < rule.rule.itemList.length) {
							const lookaheadRuleItem = rule.rule.itemList[rule.index + 1];

							if (lookaheadRuleItem.type !== RuleItemType.id)
								lookaheadSet = new Set<string>([lookaheadRuleItem.content]);
							else {
								lookaheadSet = firstSet[lookaheadRuleItem.content];

								if (!lookaheadSet.size)
									lookaheadSet = new Set<string>(['']);
							}
						}

						if (lookaheadSet.size === 1 && lookaheadSet.has(''))
							lookaheadSet = new Set([rule.lookahead]);

						this.ruleListMap[rule.ruleItem.content].forEach(rule =>
							lookaheadSet.forEach(lookahead =>
								addedRule.push(new AugmentedRule(rule, lookahead))));
					});
				}

				addedRule.forEach(rule => {
					if (!ruleSetMap.hasOwnProperty(rule.rule.name))
						ruleSetMap[rule.rule.name] = new AugmentedRuleSet();

					ruleSetMap[rule.rule.name].add(rule);
				});

				if (size === calcSize(ruleSetMap))
					break;
			}

			return ruleSetMap;
		};

		const closure = (rule: AugmentedRule): AugmentedRuleSetMap => {
			const result: AugmentedRuleSetMap = {};

			result[rule.rule.name] = new AugmentedRuleSet();
			result[rule.rule.name].add(rule);

			return closureAll(result);
		};

		const gotoAll = (ruleSetMap: AugmentedRuleSetMap, gotoRuleName: string): AugmentedRuleSetMap | null => {
			const result: AugmentedRuleSetMap = {};

			for (const ruleName in ruleSetMap) {
				if (!ruleSetMap.hasOwnProperty(ruleName))
					continue;

				ruleSetMap[ruleName].forEach(rule => {
					if (!rule.remains)
						return;

					if (rule.ruleItem.content !== gotoRuleName)
						return;

					if (!result.hasOwnProperty(ruleName))
						result[ruleName] = new AugmentedRuleSet();

					const newRule = new AugmentedRule(rule.rule, rule.lookahead);
					newRule.index = rule.index + 1;

					result[ruleName].add(newRule);
				});
			}

			if (!Object.keys(result).length)
				return null;

			return closureAll(result);
		};

		type GotoItem = { ruleSetMap: AugmentedRuleSetMap, labelRuleItemContent: string };
		const gotoQueue = new Queue<GotoItem>();
		const c1Set: AugmentedRuleSetMapSet = new AugmentedRuleSetMapSet();

		const addSet = (ruleSetMap: AugmentedRuleSetMap, srcGotoItem: GotoItem | null) => {
			if (srcGotoItem)
				c1Set.addTransition({
					from: srcGotoItem.ruleSetMap,
					to: ruleSetMap,
					label: srcGotoItem.labelRuleItemContent
				});

			const size = c1Set.size;

			c1Set.add(ruleSetMap);

			if (size === c1Set.size)
				return;

			for (const ruleName in ruleSetMap) {
				if (!ruleSetMap.hasOwnProperty(ruleName))
					continue;

				ruleSetMap[ruleName].forEach(rule => {
					if (!rule.remains)
						return;

					gotoQueue.add({
						labelRuleItemContent: rule.ruleItem.content,
						ruleSetMap
					});
				});
			}
		};

		addSet(closure(new AugmentedRule(this.ruleListMap['__root'][0], '')), null);

		while (!gotoQueue.empty) {
			const gotoItem = gotoQueue.pop();

			if (!gotoItem)
				continue;

			const gotoResult = gotoAll(gotoItem.ruleSetMap, gotoItem.labelRuleItemContent);

			if (gotoResult)
				addSet(gotoResult, gotoItem);
		}

		return c1Set;
	}

	public genenrateActionTable(ruleSetMapSet: AugmentedRuleSetMapSet): ActionTable {
		const stateList: Array<AugmentedRuleSetMap> = [];

		ruleSetMapSet.forEach(ruleSetMap => stateList[ruleSetMapSet.obtainIndex(ruleSetMap)] = ruleSetMap);

		const actionTable = new ActionTable();

		stateList.forEach(() => {
			actionTable.push({
				id: {},
				literal: {}
			});
		});

		ruleSetMapSet.forEach(ruleSetMap => {
			const index = ruleSetMapSet.obtainIndex(ruleSetMap);

			for (const ruleName in ruleSetMap) {
				if (!ruleSetMap.hasOwnProperty(ruleName))
					continue;

				ruleSetMap[ruleName].forEach(rule => {
					if (rule.remains && rule.ruleItem.type === RuleItemType.literal) { // Shift
						const transition = ruleSetMapSet.obtainTransition(ruleSetMap, rule.ruleItem.content);

						if (transition)
							actionTable[index].literal[rule.ruleItem.content] = {
								type: ActionType.shift,
								nextState: ruleSetMapSet.obtainIndex(transition.to),
								reduceCount: -1,
								reduceRuleName: ''
							};
					} else if (rule.remains && rule.ruleItem.type === RuleItemType.id) { // Goto
						const transition = ruleSetMapSet.obtainTransition(ruleSetMap, rule.ruleItem.content);

						if (transition)
							actionTable[index].id[rule.ruleItem.content] = {
								type: ActionType.goto,
								nextState: ruleSetMapSet.obtainIndex(transition.to),
								reduceCount: -1,
								reduceRuleName: ''
							};
					} else if (!rule.remains && rule.lookahead === '' && ruleName === '__root') { // Accept
						actionTable[index].literal[''] = {
							type: ActionType.accept,
							nextState: -1,
							reduceCount: rule.rule.itemList.length,
							reduceRuleName: ruleName
						};
					} else if (!rule.remains) { // Reduce
						actionTable[index].literal[rule.lookahead] = {
							type: ActionType.reduce,
							nextState: -1,
							reduceCount: rule.rule.itemList.length,
							reduceRuleName: ruleName
						};
					}
				});
			}
		});

		return actionTable;
	}

	private ensureRuleExists(rule: Rule) {
		if (!this.ruleListMap.hasOwnProperty(rule.name))
			this.ruleListMap[rule.name] = [];
	}
}

export {
	Parser,
	TableGenerator
}