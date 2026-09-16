declare module 'gifenc' {
	export type PixelFormat = 'rgb565' | 'rgb444' | 'rgba4444'
	export type Palette = number[][]

	export interface QuantizeOptions {
		format?: PixelFormat
		oneBitAlpha?: boolean | number
		clearAlpha?: boolean
		clearAlphaThreshold?: number
		clearAlphaColor?: number
	}

	export interface FrameOptions {
		palette?: Palette
		/** Milliseconds this frame is shown for. */
		delay?: number
		/** 0 loops forever, -1 plays once. Only read on the first frame. */
		repeat?: number
		transparent?: boolean
		transparentIndex?: number
		dispose?: number
		first?: boolean
	}

	export interface Encoder {
		writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void
		finish(): void
		bytes(): Uint8Array
		bytesView(): Uint8Array
		reset(): void
	}

	export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder
	export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: QuantizeOptions): Palette
	export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: PixelFormat): Uint8Array
}
