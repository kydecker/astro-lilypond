export interface PluginOptions {
	version?: string;
	format?: "svg" | "png";
	resolution?: number;
	crop?: boolean;
	timeout?: number;
}
