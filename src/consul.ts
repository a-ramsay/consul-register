import logger from "./logger";

const CONSUL_ADDR = process.env.CONSUL_ADDR ?? "http://localhost:8500";

export async function registerService(
   id: string,
   name: string,
   port: number,
   tags: string[],
   connect?: boolean,
) {
   const request = await fetch(`${CONSUL_ADDR}/v1/agent/service/register`, {
      method: "PUT",
      body: JSON.stringify({
         ID: id,
         Name: name,
         Tags: tags,
         EnableTagOverride: true,
         Port: port,
         Connect: connect
            ? {
                 sidecar_service: {},
              }
            : undefined,
      }),
   });

   if (!request.ok) {
      const error = await request.text();
      logger.error(error);
      throw new Error(
         `Failed to register service: (${request.status}) ${request.statusText}`,
      );
   }
}

export async function deregisterService(name: string) {
   const request = await fetch(
      `${CONSUL_ADDR}/v1/agent/service/deregister/${name}`,
      {
         method: "PUT",
      },
   );

   if (!request.ok && request.status !== 404) {
      const error = await request.text();
      logger.error(error);
      throw new Error(
         `Failed to deregister service: (${request.status}) ${request.statusText}`,
      );
   }
}

export async function getRegisteredServices() {
   const response = await fetch(`${CONSUL_ADDR}/v1/agent/services`);
   if (!response.ok) {
      const error = await response.text();
      logger.error(error);
      throw new Error(
         `Failed to register service: (${response.status}) ${response.statusText}`,
      );
   }
   return response.json() as Promise<ServiceResponse>;
}

type ServiceResponse = {
   [service: string]: Service;
};
type Service = {
   ID: string;
   Service: string;
   Tags: string[];
   TaggedAddresses: {
      lan: {
         address: string;
         port: number;
      };
      wan: {
         address: string;
         port: number;
      };
   };
   Meta: {
      redis_version: string;
   };
   Namespace: string;
   Port: number;
   Address: string;
   EnableTagOverride: boolean;
   Datacenter: string;
   Weights: {
      Passing: number;
      Warning: number;
   };
};
