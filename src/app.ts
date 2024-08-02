import Dockerode from "dockerode";
import { z } from "zod";
import { deregisterService, registerService } from "./consul";

const LABEL_PREFIX = process.env.LABEL_PREFIX ?? "traefik";

async function main() {
   const docker = new Dockerode();

   const stream = await docker.getEvents({
      filters: {
         event: ["start", "die", "stop", "kill"],
         type: ["container"],
      },
   });

   stream.on("data", async (event) => {
      const eventData = dockerEventSchema.parse(JSON.parse(event.toString()));

      const containerId = eventData.id;
      console.log(
         `Container ${eventData.Action}: ${JSON.stringify(eventData, null, 2)}`,
      );
      if (eventData.Action === "start") {
         const container = await docker.getContainer(containerId).inspect();

         const labels = container.Config?.Labels;
         const exposedPorts = Object.values(container.NetworkSettings?.Ports)
            .filter((mount) => mount !== null)
            .map((mount) => +mount[0]!.HostPort);

         if (exposedPorts.length === 1) {
            await registerService(
               eventData.Actor.Attributes.name!,
               exposedPorts[0]!,
               Object.entries(labels ?? {})
                  .filter(([key]) => key.startsWith(LABEL_PREFIX))
                  .map(([key, value]) => `${key}=${value}`),
            );
            console.log(
               `Registered service ${eventData.Actor.Attributes.name} on port ${exposedPorts[0]}`,
            );
         } else if (exposedPorts.length > 1) {
            for (const port of exposedPorts) {
               await registerService(
                  `${eventData.Actor.Attributes.name}-${port}`,
                  port,
                  Object.entries(labels ?? {})
                     .filter(([key]) => key.startsWith(LABEL_PREFIX))
                     .map(([key, value]) => `${key}=${value}`),
               );
               console.log(
                  `Registered service ${eventData.Actor.Attributes.name}-${port} on port ${port}`,
               );
            }
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

main().catch((err) => {
   console.error("Error in main function:", err);
   process.exit(1);
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
