# testlang
A typescript &amp; Node.js implemented compiler front-end project.

## Purpose
This project was started for the complete implementation of front-end of compilers.

## Structure
- `src/rule.ts`: Parses a `rule` file and generates a [CLR parsing table](https://www.javatpoint.com/clr-1-parsing).
- `src/parser.ts`: Parses a tokens given by a lexer and generates an AST. This parser is [driven by a parsing table](https://www.tutorialspoint.com/compiler_design/compiler_design_bottom_up_parser.htm).
- `src/lexer.ts`: Supplies tokens to a parser by reading given input.

## Rule file
The `rule.ts` file requires a valid rule file to generate a parsing table. This rule file is similar to [the BNF notation](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form), but not supports alternations(`|` symbol).

### Basic form
It is super easy to define a new non-terminal.

```
non-terminal-name: terminal @non-terminal terminal @non-terminal ... ;
```

If you want use alternations, define it multiple times.

```
statement: @if-statement;
statement: @for-statement;
statement: @while-statement;
...
```
