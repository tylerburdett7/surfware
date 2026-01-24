const { contextBridge } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

contextBridge.exposeInMainWorld("boatAPI", {
  startSimulation: () => {
    const python = spawn("python", [
      path.join(__dirname, "../python/simulator.py")
    ]);

    python.stdout.on("data", (data) => {
      console.log("Boat data:", data.toString());
    });
  }
});
