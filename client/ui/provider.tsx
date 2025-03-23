"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";
import theme from "./theme";

export function Provider(props: ColorModeProviderProps) {
  // Add the colors to the system value directly
  const customSystem = { ...defaultSystem };

  // @ts-ignore - Extend the system with our custom theme
  customSystem.theme = {
    colors: theme.colors,
    semanticTokens: theme.semanticTokens,
  };

  return (
    <ChakraProvider value={customSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
