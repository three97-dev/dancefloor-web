declare global {
	namespace App {}
}

declare module '*.glsl' {
	const value: string;
	export default value;
}

export {};
