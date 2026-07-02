declare module 'fit-file-parser' {
	export interface FitParserOptions {
		force?: boolean;
		speedUnit?: 'm/s' | 'km/h' | 'mph';
		lengthUnit?: 'm' | 'km' | 'mi';
		temperatureUnit?: 'celsius' | 'kelvin' | 'fahrenheit';
		elapsedRecordField?: boolean;
		mode?: 'cascade' | 'list' | 'both';
	}
	export default class FitParser {
		constructor(options?: FitParserOptions);
		parse(content: ArrayBuffer | Uint8Array, callback: (error: string | null, data: any) => void): void;
	}
}
