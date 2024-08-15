import Dockerode from "dockerode";
import logger from "./logger";
import { z } from "zod";
import {
   deregisterService,
   getRegisteredServices,
   registerService,
} from "./consul";
import { getServiceFromLabels, ServiceDescription } from "./service";

const abortController = new AbortController();
const unregisterEvents = ["die", "stop", "kill", "destroy", "rename"];
const registerEvents = ["start", "restart", "update"];

async function main() {
   const startTime = Date.now();
   const docker = new Dockerode();

   // Check for missing services on start
   logger.info("Checking for missing services");
   const containers = await docker.listContainers();
   const runningContainers = await Promise.all(
      containers
         .filter((container) => container.State === "running")
         .map((container) => docker.getContainer(container.Id).inspect()),
   );

   const runningServices = runningContainers
      .map((container) => getServiceFromLabels(container))
      .filter(Boolean) as ServiceDescription[];
   const registeredServices = await getRegisteredServices();
   const servicesToRegister = runningServices.filter(
      (service) => !registeredServices[service.serviceName],
   );

   await Promise.all(
      servicesToRegister.map((service) =>
         registerService(
            service.serviceId,
            service.serviceName,
            service.servicePort,
            service.traefikLabels,
            service.connect,
         ),
      ),
   );

   // Check for services that are not running anymore
   logger.info("Checking for services that are not running anymore");
   const servicesToRemove = Object.entries(registeredServices)
      .filter(
         ([serviceName, service]) =>
            !runningServices.find((s) => s.serviceName === serviceName),
      )
      .map(([serviceName]) => serviceName);

   await Promise.all(
      servicesToRemove.map((serviceName) => deregisterService(serviceName)),
   );

   // Listen for Docker events
   logger.info("Listening for Docker events");
   const stream = await docker.getEvents({
      since: Math.floor(startTime / 1000),
      abortSignal: abortController.signal,
      filters: {
         event: [...unregisterEvents, ...registerEvents],
         type: ["container"],
      },
   });

   stream.on("data", async (event) => {
      const eventData = dockerEventSchema.parse(JSON.parse(event.toString()));

      const containerId = eventData.id;
      logger.info(
         `Container ${eventData.Action}: ${eventData.Actor.Attributes.name}`,
      );
      if (registerEvents.includes(eventData.Action)) {
         const container = await docker.getContainer(containerId).inspect();

         const service = getServiceFromLabels(container);
         if (service) {
            logger.info(
               service.connect
                  ? "Service uses Consul Connect"
                  : "Service does not use Consul Connect",
            );
            await registerService(
               service.serviceId,
               service.serviceName,
               service.servicePort,
               service.traefikLabels,
               service.connect,
            );
            logger.info(`Registered service ${service.serviceName}`);
         }
      } else {
         await deregisterService(eventData.Actor.Attributes.name!);
         logger.info(`Deregistered service ${eventData.Actor.Attributes.name}`);
      }
   });

   stream.on("error", (err) => {
      if (!abortController.signal.aborted) {
         logger.error("Error while listening to Docker events:", err);
         throw err;
      }
   });
}

main().catch((err) => {
   logger.error(err);
   process.exit(1);
});

process.on("SIGINT", () => {
   logger.info("Received SIGINT, stopping the service");
   abortController.abort();
});
process.on("SIGTERM", () => {
   logger.info("Received SIGTERM, stopping the service");
   abortController.abort();
});

const dockerEventSchema = z.object({
   status: z.string(),
   id: z.string(),
   from: z.string(),
   Type: z.string(),
   Action: z.string(),
   Actor: z.object({
      ID: z.string(),
      Attributes: z.record(z.string()),
   }),
   scope: z.string(),
   time: z.number(),
   timeNano: z.number(),
});

export type DockerEvent = z.infer<typeof dockerEventSchema>;
