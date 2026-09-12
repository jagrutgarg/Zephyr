"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Last line of defense around the 3D World Map canvas: if anything in the
 * WebGL scene throws at runtime, this swallows it and renders nothing extra
 * — the 2D starfield/Realm nodes underneath already work independently, so
 * the map degrades to that instead of crashing the whole dashboard.
 */
export class Canvas3DErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D World Map failed, falling back to the 2D map:", error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
