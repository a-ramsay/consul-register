import Dockerode from "dockerode";

const LABEL_PREFIX = process.env.LABEL_PREFIX ?? "traefik";

const routerRulePattern = new RegExp(
   `^${LABEL_PREFIX}\.http\.routers\.(.+?)\.rule`,
);
const portPattern = new RegExp(
   `^${LABEL_PREFIX}\.http\.services\.(.+?)\.loadbalancer\.server\.port`,
);
const connectPattern = new RegExp(`^${LABEL_PREFIX}\.consulcatalog\.connect`);

export function getServiceFromLabels(
   container: Dockerode.ContainerInspectInfo,
): ServiceDescription | undefined {
   const labels = container.Config?.Labels;
   const mappedPorts = Object.values(container.NetworkSettings?.Ports)
      .filter((mount) => mount !== null)
      .map((mount) => +mount[0]!.HostPort);
   mappedPorts.sort();

   const exposedPorts = Object.keys(container.NetworkSettings?.Ports)
      .filter((port) => port.match(/(\d+)\/tcp/))
      .map((port) => +port.match(/(\d+)\/tcp/)![1]);
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

   const serviceId = container.Name?.replace(/^\//, "");

   const connectLabel = traefikLabels.find(([key]) =>
      key.match(connectPattern),
   );
   const connect = connectLabel ? connectLabel[1] === "true" : false;

   if (mappedPorts.length > 0) {
      const servicePort = portLabel ? +portLabel[1] : +mappedPorts[0];

      return {
         serviceId,
         serviceName,
         servicePort,
         traefikLabels: traefikLabels.map(([key, value]) => `${key}=${value}`),
         connect,
      };
   } else if (exposedPorts.length > 0 && connect) {
      const servicePort = portLabel ? +portLabel[1] : +exposedPorts[0];

      return {
         serviceId,
         serviceName,
         servicePort,
         traefikLabels: traefikLabels.map(([key, value]) => `${key}=${value}`),
         connect,
      };
   }
}

export type ServiceDescription = {
   serviceId: string;
   serviceName: string;
   servicePort: number;
   traefikLabels: string[];
   connect: boolean;
};
