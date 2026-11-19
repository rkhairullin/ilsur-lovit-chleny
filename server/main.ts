import { createApp } from "./app.js";
import { readConfig, readLoginConfig } from "./config.js";

let app: ReturnType<typeof createApp> | undefined;
try {
  const address = readConfig(process.env);
  app = createApp(readLoginConfig(process.env));
  await app.listen(address);
} catch (error) {
  if (app) {
    app.log.error(error);
    await app.close();
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
