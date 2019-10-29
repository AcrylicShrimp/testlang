import ObjectSet from './utils/object-set';
import Queue from './utils/queue';

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

	public constructor(rule: Rule) {
		this._rule = rule;
		this._index = 0;
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

	public get remains(): boolean {
		return this._index < this._rule.itemList.length;
	}
}

class AugmentedRuleSet extends ObjectSet<AugmentedRule>{ }

interface AugmentedRuleSetMap {
	[ruleName: string]: AugmentedRuleSet
}

class AugmentedRuleSetMapSet extends ObjectSet<AugmentedRuleSetMap>{ }

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
				if (this.ruleListMap.hasOwnProperty(ruleName)) {
					this.ruleListMap[ruleName].forEach(rule => {
						const firstRuleItem = rule.first;

						if (!firstRuleItem)
							return;

						updateSet(ruleName, firstRuleItem);
					});
				}

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

	public generateLR0(): AugmentedRuleSetMapSet {
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

						this.ruleListMap[rule.ruleItem.content].forEach(rule => addedRule.push(new AugmentedRule(rule)));
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

					const newRule = new AugmentedRule(rule.rule);
					newRule.index = rule.index + 1;

					result[ruleName].add(newRule);
				});
			}

			if (!Object.keys(result).length)
				return null;

			return closureAll(result);
		};

		const lr0Set: AugmentedRuleSetMapSet = new AugmentedRuleSetMapSet();
		const gotoQueue = new Queue<{ ruleSetMap: AugmentedRuleSetMap, ruleName: string }>();

		const addSet = (ruleSetMap: AugmentedRuleSetMap) => {
			const size = lr0Set.size;

			lr0Set.add(ruleSetMap);

			if (size === lr0Set.size)
				return;

			for (const ruleName in ruleSetMap) {
				if (!ruleSetMap.hasOwnProperty(ruleName))
					continue;

				ruleSetMap[ruleName].forEach(rule => {
					if (!rule.remains)
						return;

					gotoQueue.add({
						ruleName: rule.ruleItem.content,
						ruleSetMap
					});
				});
			}
		};

		addSet(closure(new AugmentedRule(this.ruleListMap['__root'][0])));

		while (!gotoQueue.empty) {
			const gotoItem = gotoQueue.pop();

			if (!gotoItem)
				continue;

			const gotoResult = gotoAll(gotoItem.ruleSetMap, gotoItem.ruleName);

			if (gotoResult)
				addSet(gotoResult);
		}

		return lr0Set;
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