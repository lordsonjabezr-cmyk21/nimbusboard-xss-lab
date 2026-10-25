import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Self-XSS Awareness: DevTools console warning
console.log("⚠️ STOP! Self-XSS Warning: Pasting code here can compromise your session.");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
