import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import {
    setAuthTokenGetter,
    setBaseUrl,
} from "@workspace/api-client";

// Backend URL - use environment variable if set, otherwise null to use Vite local proxy
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
} else {
  setBaseUrl(null);
}

// JWT token
setAuthTokenGetter(() => localStorage.getItem("rs_token"));

createRoot(document.getElementById("root")!).render(<App />);