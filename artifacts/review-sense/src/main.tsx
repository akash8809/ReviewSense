import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";

import App from "./App";
import "./index.css";

// Production API URL
setBaseUrl("https://reviewsense-api-pu7k.onrender.com");

createRoot(document.getElementById("root")!).render(<App />);