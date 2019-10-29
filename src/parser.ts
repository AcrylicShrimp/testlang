import { Lexer, Token, TokenType } from './lexer';

enum ParsingTreeNodeType {
	id,
	literal,
	paren,
	addsub,
	muldivmod,
	pow,
	incdec,
	eqneq,
	lsgt,
	orand,
	not,
	bit_orandxor,
	bit_not,
	shift,
	assign
}

class ParsingTreeNode {
	private _type: ParsingTreeNodeType;
	protected child: Array<ParsingTreeNode>;

	public constructor(type: ParsingTreeNodeType) {
		this._type = type;
		this.child = [];
	}

	protected push(child: ParsingTreeNode) {
		this.child.push(child);
	}

	public get type(): ParsingTreeNodeType {
		return this._type;
	}

	public get isLeaf(): boolean {
		return !this.child.length;
	}
}

class TokenProvider {
	private lexer: Lexer;
	private currentToken: Token;
	private nextToken: Token;

	public constructor(lexer: Lexer) {
		this.lexer = lexer;
		this.currentToken = this.lexer.next();
		this.nextToken = this.currentToken.type === TokenType.eof ? this.currentToken : this.lexer.next();
	}

	public consume() {
		this.currentToken = this.nextToken;
		this.nextToken = this.currentToken.type === TokenType.eof ? this.currentToken : this.lexer.next();
	}

	public get current(): Token {
		return this.currentToken;
	}

	public get next(): Token {
		return this.nextToken;
	}
}

class Parser {
	private provider: TokenProvider;

	public constructor(content: string) {
		this.provider = new TokenProvider(new Lexer(content));
	}

	public parse() {
		const token = this.provider.current;

		if (token.type === TokenType.keyword_if)
			this.parseIf(token);
	}

	private parseIf(token: Token): ParsingTreeNode | null {
		return null;
	}
}
