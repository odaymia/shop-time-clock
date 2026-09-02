import { createRoot } from "react-dom/client";
import TimeClock from "./App.jsx";
import { keepAwake } from "./lib/keepAwake.js";

keepAwake();

const boot = document.getElementById("boot");
if (boot) boot.remove();
createRoot(document.getElementById("root")).render(<TimeClock />);
