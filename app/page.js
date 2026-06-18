// app/page.js
// -----------------------------------------------------------------------------
// The home page ("/"). It simply renders our top-level <ChatApp /> component.
// Keeping the page thin and pushing logic into components is a clean pattern.
// -----------------------------------------------------------------------------
import ChatApp from "@/components/ChatApp";

export default function Home() {
  return <ChatApp />;
}
