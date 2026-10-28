// Test-only literal query; Vitest's isolated Phase project loads the public32 fixture.
// This declaration grants no Native capability and is absent from the production graph.
declare module '*?test-before-phase-capture492' {
  export function captureNativeMessageForDeferred(value: unknown): unknown;
}
