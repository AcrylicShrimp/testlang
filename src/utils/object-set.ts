
import hash from 'object-hash';

type Callback<T> = (obj: T) => void;

class ObjectSet<T> {
	private _set: { [hash: string]: T } = {};

	public add(obj: T) {
		this._set[hash(obj, {
			respectType: false,
			unorderedArrays: true
		})] = obj;
	}

	public forEach(callback: Callback<T>) {
		for (const objHash in this._set) {
			if (!this._set.hasOwnProperty(objHash))
				return;

			callback(this._set[objHash]);
		}
	}

	public obtain(hash: string): T | null {
		if (!this._set.hasOwnProperty(hash))
			return null;

		return this._set[hash];
	}

	public get size(): number {
		return Object.keys(this._set).length;
	}
}

export default ObjectSet;