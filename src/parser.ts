import { Lexer, Token, TokenType } from './lexer';
import { ActionTable, ActionType } from './rule';
import Stack from './utils/stack';

class AST {
	private _name: string;
	private _isTerminal: boolean;
	private _child: Token | null;
	private _children: Array<AST>;

	public constructor(name: string, isTerminal: boolean) {
		this._name = name;
		this._isTerminal = isTerminal;
		this._child = null;
		this._children = [];
	}

	public setChild(token: Token) {
		this._child = token;
	}

	public addChildrenReverse(ast: AST) {
		this._children.unshift(ast);
	}

	public get name(): string {
		return this._name;
	}

	public get isTerminal(): boolean {
		return this._isTerminal;
	}

	public get child(): Token | null {
		return this._child;
	}

	public get children(): Array<AST> {
		return this._children;
	}
}

class Parser {
	private actionTable: ActionTable;

	public constructor(actionTable: ActionTable) {
		this.actionTable = actionTable;
	}

	public parse(content: string): AST | null {
		let state = 0;
		let stack = new Stack<AST | number>();

		stack.push(state);

		const popAST = (): AST => {
			const ast = stack.pop();

			if (ast === undefined || typeof ast === 'number')
				throw {
					error: 'Unexpected Stack Item Error',
					message: `Wrong stack state. AST expected, got ${typeof ast}.`
				};

			return ast;
		};
		const popNumber = (): number => {
			const value = stack.pop();

			if (value === undefined || typeof value !== 'number')
				throw {
					error: 'Unexpected Stack Item Error',
					message: `Wrong stack state. Number expected, got ${typeof value}.`
				};

			return value;
		};
		const peekNumber = (): number => {
			const value = stack.pop();

			if (value === undefined || typeof value !== 'number')
				throw {
					error: 'Unexpected Stack Item Error',
					message: `Wrong stack state. Number expected, got ${typeof value}.`
				};

			stack.push(value);

			return value;
		};

		const lexer = new Lexer(content);
		let token = lexer.next();
		let tokenType = token.type === TokenType.eof ? '' : TokenType[token.type];

		for (; ;) {
			state = peekNumber();

			const actionItem = this.actionTable[state].literal[tokenType];

			if (!actionItem)
				throw {
					error: 'Invalid Syntax',
					message: `Unexpected token detected: ${token}`
				};

			switch (actionItem.type) {
				case ActionType.shift: {
					const ast = new AST(TokenType[token.type], true);
					ast.setChild(token);

					stack.push(ast);
					stack.push(actionItem.nextState);

					token = lexer.next();
					tokenType = token.type === TokenType.eof ? '' : TokenType[token.type];

					break;
				}
				case ActionType.reduce: {
					const ast = new AST(actionItem.reduceRuleName, false);

					for (let count = 0; count < actionItem.reduceCount; ++count) {
						popNumber();
						ast.addChildrenReverse(popAST());
					}

					state = peekNumber();

					stack.push(ast);
					stack.push(this.actionTable[state].id[ast.name].nextState);

					break;
				}
				case ActionType.accept: {
					popNumber();
					return popAST();
				}
				default: {
					throw {
						error: 'Unexpected Action Item',
						message: `Current action item is invalid: ${actionItem}`
					};
				}
			}
		}
	}
}

export {
	AST,
	Parser
};