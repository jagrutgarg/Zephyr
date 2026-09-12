"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

/**
 * Catches a failed/missing .glb load (useGLTF throws on 404 or parse error)
 * so the 3D scene degrades to a placeholder primitive instead of crashing.
 * Must be a class component — Suspense alone doesn't catch real errors.
 */
export class ModelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D model failed to load, using fallback:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
