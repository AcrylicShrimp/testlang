
class Queue<T> {
	private _list: Array<T> = [];

	public add(value: T) {
		this._list.push(value);
	}

	public pop(): T | undefined {
		return this._list.shift();
	}

	public get size(): number {
		return this._list.length;
	}

	public get empty(): boolean {
		return !this._list.length;
	}
}

export default Queue;