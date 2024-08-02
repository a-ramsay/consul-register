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
