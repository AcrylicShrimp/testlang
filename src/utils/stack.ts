
class Stack<T> {
	private _list: Array<T> = [];

	public push(value: T) {
		this._list.push(value);
	}

	public pop(): T | undefined {
		return this._list.pop();
	}

	public get size(): number {
		return this._list.length;
	}

	public get empty(): boolean {
		return !this.size;
	}
}

export default Stack;