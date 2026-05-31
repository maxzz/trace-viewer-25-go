import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/0-all/0-app";
import './index.css';
import { recomputeFilterMatches } from "@/store/4-file-filters";
import { recomputeHighlightMatches } from "@/store/5-highlight-rules";

// Initial computation in case of hot reload or persisted state
recomputeFilterMatches();
recomputeHighlightMatches();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
