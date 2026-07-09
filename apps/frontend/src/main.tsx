import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import {
    setAuthTokenGetter,
    setBaseUrl,
} from "@workspace/api-client";

// Backend URL
setBaseUrl("https://reviewsense-api-pu7k.onrender.com");

// JWT token
setAuthTokenGetter(() => localStorage.getItem("rs_token"));

createRoot(document.getElementById("root")!).render(<App />);