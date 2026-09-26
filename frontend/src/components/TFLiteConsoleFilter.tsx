"use client";

import { useEffect } from "react";

/**
 * Filter out benign TensorFlow Lite & WebAssembly stderr/info/warn messages
 * and duplicate key warnings from polluting the browser console.
 */
export function TFLiteConsoleFilter() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    const isSuppressed = (msg: string): boolean => {
      return (
        msg.includes("TensorFlow Lite XNNPACK delegate") ||
        msg.includes("Created TensorFlow Lite") ||
        msg.includes("FaceBlendshapesGraph acceleration") ||
        msg.includes("OpenGL error checking is disabled") ||
        msg.includes("GL version: 3.0") ||
        msg.includes("Graph successfully started running") ||
        msg.includes("vision_wasm_internal") ||
        msg.includes("WebSocket is closed before the connection is established") ||
        msg.includes("Encountered two children with the same key") ||
        msg.startsWith("INFO: Created TensorFlow Lite") ||
        msg.startsWith("INFO: ")
      );
    };

    console.error = (...args: any[]) => {
      const firstArg = typeof args[0] === "string" ? args[0] : "";
      if (isSuppressed(firstArg)) {
        return;
      }
      originalConsoleError(...args);
    };

    console.warn = (...args: any[]) => {
      const firstArg = typeof args[0] === "string" ? args[0] : "";
      if (isSuppressed(firstArg)) {
        return;
      }
      originalConsoleWarn(...args);
    };

    console.log = (...args: any[]) => {
      const firstArg = typeof args[0] === "string" ? args[0] : "";
      if (isSuppressed(firstArg)) {
        return;
      }
      originalConsoleLog(...args);
    };

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    };
  }, []);

  return null;
}
