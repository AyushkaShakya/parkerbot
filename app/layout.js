// app/layout.js
// -----------------------------------------------------------------------------
// The root layout wraps EVERY page in the app. In Next.js (App Router) this is
// where you set <html>/<body>, global fonts, and metadata (the browser tab title).
// -----------------------------------------------------------------------------
import { Inter, Sora } from "next/font/google";
import "./globals.css";

// next/font loads and self-hosts Google Fonts automatically (fast + no layout
// shift). We expose each font as a CSS variable that Tailwind reads.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora" });

// Metadata shows up in the browser tab and in link previews.
export const metadata = {
  title: "Parker AI — Chat with your PDFs",
  description: "Upload a PDF and ask questions about it, powered by Groq + LLaMA.",
};

export default function RootLayout({ children }) {
  // `suppressHydrationWarning` avoids a React warning because our theme script
  // sets the `dark` class on <html> before React hydrates.
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sora.variable}`}>
      <head>
        {/* This tiny inline script applies the saved theme BEFORE the page
            paints, so there is no white flash when reloading in dark mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
