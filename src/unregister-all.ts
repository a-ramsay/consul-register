import { deregisterService, getRegisteredServices } from "./consul";
import logger from "./logger";

async function main() {
   logger.info("Unregistering all services");
   const registeredServices = await getRegisteredServices();
   await Promise.all(
      Object.keys(registeredServices).map((serviceName) =>
         deregisterService(serviceName),
      ),
   );
}

main().catch((error) => {
   logger.error(error);
   process.exit(1);
});
