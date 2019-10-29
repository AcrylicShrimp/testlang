import fs from 'fs';

enum AdvanceMode {
	Pre,
	Post,
	None
}

enum TokenType {
	unknown,
	eof,
	id,
	dot, // .
	comma, // ,
	colon, // :
	semicolon, // ;
	question, // ?
	paren_l, // (
	paren_r, // )
	brace_l, // {
	brace_r, // }
	bracket_l, // [
	bracket_r, // ]
	literal_bool,
	literal_integer,
	literal_decimal,
	literal_string,
	op_add, // +
	op_sub, // -
	op_mul, // *
	op_div, // /
	op_mod, // %
	op_pow, // **
	op_inc, // ++
	op_dec, // --
	op_eq, // ==
	op_neq, // !=
	op_ls, // <
	op_lseq, // <=
	op_gt, // >
	op_gteq, // >=
	op_or, // or
	op_and, // and
	op_not, // not
	op_bit_or, // |
	op_bit_and, // &
	op_bit_xor, // ^
	op_bit_not, // ~
	op_shift_l, // <<
	op_shift_r, // >>
	op_assign, // =
	op_assign_add, // +=
	op_assign_sub, // -=
	op_assign_mul, // *=
	op_assign_div, // /=
	op_assign_mod, // %=
	op_assign_pow, // **=
	op_assign_bit_or, // |=
	op_assign_bit_and, // &=
	op_assign_bit_xor, // ^=
	op_assign_bit_not, // ~=
	op_assign_shift_l, // <<=
	op_assign_shift_r, // >>=
	keyword_let, // let
	keyword_ret, // ret
	keyword_if, // if
	keyword_else, // else
	keyword_for // for
}

class Token {
	public type: TokenType;
	public content: string;
	public lineNumber: number;
	public lineOffset: number;

	public constructor(
		type: TokenType,
		content: string,
		lineNumber: number,
		lineOffset: number
	) {
		this.type = type;
		this.content = content;
		this.lineNumber = lineNumber;
		this.lineOffset = lineOffset;
	}
}

class Lexer {
	private content: string;
	private index: number;
	private maxIndex: number;
	private lineNumber: number;
	private lineOffset: number;

	public constructor(content: string) {
		this.content = content;
		this.index = 0;
		this.maxIndex = this.content.length;
		this.lineNumber = 1;
		this.lineOffset = 1;
	}

	public next(): Token {
		const blackspace = this.pickBlackspace();
		const token = new Token(
			TokenType.unknown,
			'',
			this.lineNumber,
			this.lineOffset
		);

		const returnToken = (type: TokenType, content: string): Token => {
			token.type = type;
			token.content = content;

			return token;
		}

		if (!blackspace)
			return returnToken(TokenType.eof, '');

		switch (blackspace) {
			case '.': {
				const token = this.parseNumber();

				if (token)
					return token;

				return this.nextCharacter(), returnToken(TokenType.dot, '.');
			}
			case ',':
				return this.nextCharacter(), returnToken(TokenType.comma, ',');
			case ':':
				return this.nextCharacter(), returnToken(TokenType.colon, ':');
			case ';':
				return this.nextCharacter(), returnToken(TokenType.semicolon, ';');
			case ';':
				return this.nextCharacter(), returnToken(TokenType.semicolon, ';');
			case '?':
				return this.nextCharacter(), returnToken(TokenType.question, '?');
			case '(':
				return this.nextCharacter(), returnToken(TokenType.paren_l, '(');
			case ')':
				return this.nextCharacter(), returnToken(TokenType.paren_r, ')');
			case '{':
				return this.nextCharacter(), returnToken(TokenType.brace_l, '{');
			case '}':
				return this.nextCharacter(), returnToken(TokenType.brace_r, '}');
			case '[':
				return this.nextCharacter(), returnToken(TokenType.bracket_l, '[');
			case ']':
				return this.nextCharacter(), returnToken(TokenType.bracket_r, ']');
			case '+':
				switch (this.nextCharacter()) {
					case '+':
						return this.nextCharacter(), returnToken(TokenType.op_inc, '++');
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_assign_add, '+=');
					default: {
						--this.index;
						--this.lineOffset;

						const token = this.parseNumber();

						if (token)
							return token;

						return this.nextCharacter(), returnToken(TokenType.op_add, '+');
					}
				}
			case '-':
				switch (this.nextCharacter()) {
					case '-':
						return returnToken(TokenType.op_dec, '--');
					case '=':
						return returnToken(TokenType.op_assign_sub, '-=');
					default: {
						--this.index;
						--this.lineOffset;

						const token = this.parseNumber();

						if (token)
							return token;

						return this.nextCharacter(), returnToken(TokenType.op_add, '-');
					}
				}
			case '*':
				switch (this.nextCharacter()) {
					case '*':
						switch (this.nextCharacter()) {
							case '=':
								return this.nextCharacter(), returnToken(
									TokenType.op_assign_pow,
									'**='
								);
							default:
								return returnToken(TokenType.op_pow, '**');
						}
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_assign_mul, '*=');
					default:
						return returnToken(TokenType.op_mul, '*');
				}
			case '/':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_assign_div, '/=');
					default:
						return returnToken(TokenType.op_div, '/');
				}
			case '%':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_assign_mod, '%=');
					default:
						return returnToken(TokenType.op_mod, '%');
				}
			case '=':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_eq, '==');
					default:
						return returnToken(TokenType.op_assign, '=');
				}
			case '!':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_neq, '!=');
					default:
						break;
				}
				break;
			case '<':
				switch (this.nextCharacter()) {
					case '<':
						switch (this.nextCharacter()) {
							case '=':
								return this.nextCharacter(), returnToken(
									TokenType.op_assign_shift_l,
									'<<='
								);
							default:
								return returnToken(TokenType.op_shift_l, '<<');
						}
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_lseq, '<=');
					default:
						return returnToken(TokenType.op_ls, '<');
				}
			case '>':
				switch (this.nextCharacter()) {
					case '>':
						switch (this.nextCharacter()) {
							case '=':
								return this.nextCharacter(), returnToken(
									TokenType.op_assign_shift_r,
									'>>='
								);
							default:
								return returnToken(TokenType.op_shift_r, '>>');
						}
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_gteq, '>=');
					default:
						return returnToken(TokenType.op_gt, '>');
				}
			case '|':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_bit_or, '|=');
					default:
						return returnToken(TokenType.op_assign_bit_or, '|');
				}
			case '&':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_bit_and, '&=');
					default:
						return returnToken(TokenType.op_assign_bit_and, '&');
				}
			case '^':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_bit_xor, '^=');
					default:
						return returnToken(TokenType.op_assign_bit_xor, '^');
				}
			case '~':
				switch (this.nextCharacter()) {
					case '=':
						return this.nextCharacter(), returnToken(TokenType.op_bit_not, '~=');
					default:
						return returnToken(TokenType.op_assign_bit_not, '~');
				}
			case '0':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9': {
				const token = this.parseNumber();

				if (token)
					return token;

				break;	// Unreachable if everything is normal.
			}
			case "'": {
				let string = '';

				for (this.nextCharacter(); !this.isEOF;)
					if (this.nextCharacter(AdvanceMode.None) === '\\') // Escape sequence
						this.nextCharacter(), string += this.nextCharacter(AdvanceMode.Post);
					else if (this.nextCharacter(AdvanceMode.None) === "'")
						break;
					else
						string += this.nextCharacter(AdvanceMode.Post);

				if (this.nextCharacter(AdvanceMode.None) === "'")
					this.nextCharacter();

				return returnToken(TokenType.literal_string, string);
			}
			case '`': {
				let string = '';

				for (this.nextCharacter(); !this.isEOF;)
					if (this.nextCharacter(AdvanceMode.None) === '`')
						break;
					else
						string += this.nextCharacter();

				if (this.nextCharacter(AdvanceMode.None) === '`')
					this.nextCharacter();

				return returnToken(TokenType.literal_string, string);
			}
		}

		if (this.isPunctuation)
			return returnToken(TokenType.unknown, this.nextCharacter(AdvanceMode.Post));

		const readBlackspacesUntilPunctuation = (): string => {
			let content = '';

			while (!this.isEOF && !this.isWhitespace && !this.isPunctuation)
				content += this.nextCharacter(AdvanceMode.Post);

			return content;
		};

		const content = readBlackspacesUntilPunctuation();

		switch (content) {
			case 'or': return returnToken(TokenType.op_or, 'or');
			case 'and': return returnToken(TokenType.op_and, 'and');
			case 'not': return returnToken(TokenType.op_not, 'not');

			case 'true': return returnToken(TokenType.literal_bool, 'true');
			case 'false': return returnToken(TokenType.literal_bool, 'false');

			case 'ret': return returnToken(TokenType.keyword_ret, 'ret');
			case 'if': return returnToken(TokenType.keyword_if, 'if');
			case 'else': return returnToken(TokenType.keyword_else, 'else');
			case 'for': return returnToken(TokenType.keyword_for, 'for');

			default:
				return returnToken(TokenType.id, content);
		}
	}

	private parseNumber(): Token | null {
		const index = this.index;
		const lineOffset = this.lineOffset;

		const readInteger = (): string => {
			let integer = '';

			while (/\d/.test(this.nextCharacter(AdvanceMode.None)))
				integer += this.nextCharacter(AdvanceMode.Post);

			return integer;
		}

		const readExp = (): string => {
			if (!/[eE]/.test(this.nextCharacter(AdvanceMode.None)))
				return '';

			const index = this.index;
			const lineOffset = this.lineOffset;

			let exp = this.nextCharacter(AdvanceMode.Post);

			if (/[+-]/.test(this.nextCharacter(AdvanceMode.None)))
				exp += this.nextCharacter(AdvanceMode.Post);

			if (!/\d/.test(this.nextCharacter(AdvanceMode.None))) {
				this.index = index;
				this.lineOffset = lineOffset;

				return '';
			}

			return exp + readInteger();
		}

		const returnNull = (): null => {
			this.index = index;
			this.lineOffset = lineOffset;

			return null;
		};

		const returnInteger = (integer: string): Token => {
			return new Token(TokenType.literal_integer, integer, this.lineNumber, lineOffset);
		}

		const returnDecimal = (decimal: string): Token => {
			return new Token(TokenType.literal_decimal, decimal, this.lineNumber, lineOffset);
		}

		let sign = '';

		if (/[+-]/.test(this.nextCharacter(AdvanceMode.None)))
			sign = this.nextCharacter(AdvanceMode.Post);

		switch (this.nextCharacter(AdvanceMode.None)) {
			case '.': {
				this.nextCharacter();

				const integer = readInteger();

				if (!integer)
					return returnNull();

				return returnDecimal(sign + '.' + integer + readExp());
			}
			case '0':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9': {
				const integer = readInteger();
				let decimal = '';

				if (this.nextCharacter(AdvanceMode.None) === '.')
					decimal = this.nextCharacter(AdvanceMode.Post) + readInteger();

				decimal += readExp();

				return decimal ? returnDecimal(sign + integer + decimal) : returnInteger(sign + integer);
			}
			default:
				return returnNull();
		}
	}

	private nextCharacter(advanceMode: AdvanceMode = AdvanceMode.Pre): string {
		if (this.isEOF)
			return '';

		const advance = () => {
			if (this.isEOF)
				return;

			++this.lineOffset;

			if (this.isNewline) {
				++this.lineNumber;
				this.lineOffset = 0;
			}

			++this.index;
		};

		if (advanceMode == AdvanceMode.Pre) {
			advance();
			return this.isEOF ? '' : this.content[this.index];
		}

		const result = this.content[this.index];

		if (advanceMode === AdvanceMode.Post)
			advance();

		return result;
	}

	private pickBlackspace(): string {
		for (; ;) {
			if (this.isEOF)
				return '';

			if (!this.isWhitespace)
				break;

			++this.lineOffset;

			if (this.isNewline) {
				++this.lineNumber;
				this.lineOffset = 0;
			}

			++this.index;
		}

		return this.content[this.index];
	}

	private get isEOF(): boolean {
		return this.maxIndex <= this.index;
	}

	private get isWhitespace(): boolean {
		return /[ \f\n\r\t\v\u00A0\u2028\u2029]/.test(this.content[this.index]);
	}

	private get isPunctuation(): boolean {
		return /[.,:;?(){}[\]+\-*/%=!<>|&^~'"`@#]/.test(this.content[this.index]);
	}

	private get isNewline(): boolean {
		return this.content[this.index] === '\n';
	}
}

export {
	TokenType,
	Token,
	Lexer
};
