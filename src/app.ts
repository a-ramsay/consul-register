import Dockerode from "dockerode";
import logger from "./logger";
import { z } from "zod";
import {
   deregisterService,
   getRegisteredServices,
   registerService,
} from "./consul";

const LABEL_PREFIX = process.env.LABEL_PREFIX ?? "traefik";

const routerRulePattern = new RegExp(
   `^${LABEL_PREFIX}\.http\.routers\.(.+?)\.rule`,
);
const portPattern = new RegExp(
   `^${LABEL_PREFIX}\.http\.services\.(.+?)\.loadbalancer\.server\.port`,
);

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
            service.serviceName,
            service.servicePort,
            service.traefikLabels,
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
      console.log(
         `Container ${eventData.Action}: ${eventData.Actor.Attributes.name}`,
      );
      if (registerEvents.includes(eventData.Action)) {
         const container = await docker.getContainer(containerId).inspect();

         const service = getServiceFromLabels(container);
         const connect = !!container.Config.Labels?.["consul.connect"];
         if (service) {
            await registerService(
               service.serviceName,
               service.servicePort,
               service.traefikLabels,
               connect,
            );
            console.log(`Registered service ${service.serviceName}`);
         }
      } else {
         await deregisterService(eventData.Actor.Attributes.name!);
         console.log(`Deregistered service ${eventData.Actor.Attributes.name}`);
      }
   });

   stream.on("error", (err) => {
      console.error("Error while listening to Docker events:", err);
      throw err;
   });
}

function getServiceFromLabels(
   container: Dockerode.ContainerInspectInfo,
): ServiceDescription | undefined {
   const labels = container.Config?.Labels;
   const exposedPorts = Object.values(container.NetworkSettings?.Ports)
      .filter((mount) => mount !== null)
      .map((mount) => +mount[0]!.HostPort);
   exposedPorts.sort();

   const traefikLabels = Object.entries(labels ?? {}).filter(([key]) =>
      key.startsWith(LABEL_PREFIX),
   );

   const ruleLabel = traefikLabels.find(([key]) =>
      key.match(routerRulePattern),
   );
   const portLabel = traefikLabels.find(([key]) => key.match(portPattern));

   const serviceName = ruleLabel
      ? ruleLabel[0].match(routerRulePattern)![1]
      : container.Name?.replace(/^\//, "");

   if (exposedPorts.length > 0) {
      const servicePort = portLabel ? +portLabel[1] : +exposedPorts[0];

      return {
         serviceName,
         servicePort,
         traefikLabels: traefikLabels.map(([key, value]) => `${key}=${value}`),
      };
   }
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

type ServiceDescription = {
   serviceName: string;
   servicePort: number;
   traefikLabels: string[];
};
