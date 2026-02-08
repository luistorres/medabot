/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import styles from "../index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MedaBot — Assistente Inteligente de Medicamentos" },
      {
        name: "description",
        content:
          "Identifique medicamentos por foto e obtenha respostas instantâneas com base nos folhetos informativos oficiais portugueses.",
      },
      { name: "theme-color", content: "#4f46e5" },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:title", content: "MedaBot — Assistente Inteligente de Medicamentos" },
      {
        property: "og:description",
        content:
          "Identifique medicamentos por foto e obtenha respostas instantâneas com base nos folhetos informativos oficiais portugueses.",
      },
      { property: "og:image", content: "/og-image.png" },
      { property: "og:locale", content: "pt_PT" },
      // Twitter
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "MedaBot — Assistente Inteligente de Medicamentos" },
      {
        name: "twitter:description",
        content:
          "Identifique medicamentos por foto e obtenha respostas instantâneas com base nos folhetos informativos oficiais portugueses.",
      },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [
      // Favicons
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", type: "image/png", href: "/favicon-32x32.png", sizes: "32x32" },
      { rel: "icon", type: "image/png", href: "/favicon-16x16.png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      // Fonts
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: styles },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
