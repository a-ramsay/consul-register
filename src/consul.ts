const CONSUL_ADDR = process.env.CONSUL_ADDR ?? "http://localhost:8500";

export async function registerService(
   name: string,
   port: number,
   tags: string[],
) {
   await fetch(`${CONSUL_ADDR}/v1/agent/service/register`, {
      method: "PUT",
      body: JSON.stringify({
         Name: name,
         Tags: tags,
         EnableTagOverride: true,
         Port: port,
      }),
   });
}

export async function deregisterService(name: string) {
   await fetch(`${CONSUL_ADDR}/v1/agent/service/deregister/${name}`, {
      method: "PUT",
   });
}

export async function getRegisteredServices() {
   const response = await fetch(`${CONSUL_ADDR}/v1/agent/services`);
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
