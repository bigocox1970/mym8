import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/lib/configManager"; // Import this to initialize the config

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);
