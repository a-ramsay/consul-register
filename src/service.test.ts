import { getServiceFromLabels } from "./service";
import * as fs from "fs/promises";

test("get connect enabled service", async () => {
   const containerFile = await fs.readFile(
      "./tests/container-connect.json",
      "utf-8",
   );
   const container = JSON.parse(containerFile);

   const service = getServiceFromLabels(container);

   expect(service).toEqual({
      serviceId: "tests-whoami-1",
      serviceName: "whoami",
      servicePort: 8080,
      traefikLabels: [
         "traefik.consulcatalog.connect=true",
         "traefik.enable=true",
         "traefik.http.routers.whoami.rule=Host(`whoami.localhost`)",
         "traefik.http.services.whoami.loadbalancer.server.port=8080",
      ],
      connect: true,
   });
});

test("get connect disabled service", async () => {
   const containerFile = await fs.readFile(
      "./tests/container-connect-false.json",
      "utf-8",
   );
   const container = JSON.parse(containerFile);

   const service = getServiceFromLabels(container);

   expect(service).toEqual({
      serviceId: "tests-whoami-1",
      serviceName: "whoami",
      servicePort: 8080,
      traefikLabels: [
         "traefik.consulcatalog.connect=false",
         "traefik.enable=true",
         "traefik.http.routers.whoami.rule=Host(`whoami.localhost`)",
         "traefik.http.services.whoami.loadbalancer.server.port=8080",
      ],
      connect: false,
   });
});

test("get plain service", async () => {
   const containerFile = await fs.readFile(
      "./tests/container-no-connect.json",
      "utf-8",
   );
   const container = JSON.parse(containerFile);

   const service = getServiceFromLabels(container);

   expect(service).toEqual({
      serviceId: "tests-whoami-1",
      serviceName: "whoami",
      servicePort: 8080,
      traefikLabels: [
         "traefik.enable=true",
         "traefik.http.routers.whoami.rule=Host(`whoami.localhost`)",
         "traefik.http.services.whoami.loadbalancer.server.port=8080",
      ],
      connect: false,
   });
});

test("get connect service with no exposed ports", async () => {
   const containerFile = await fs.readFile(
      "./tests/container-connect-no-exposed.json",
      "utf-8",
   );
   const container = JSON.parse(containerFile);

   const service = getServiceFromLabels(container);

   expect(service).toEqual({
      serviceId: "tests-whoami-1",
      serviceName: "whoami",
      servicePort: 8080,
      traefikLabels: [
         "traefik.consulcatalog.connect=true",
         "traefik.enable=true",
         "traefik.http.routers.whoami.rule=Host(`whoami.localhost`)",
         "traefik.http.services.whoami.loadbalancer.server.port=8080",
      ],
      connect: true,
   });
});

test("get connect service with no exposed ports using default port", async () => {
   const containerFile = await fs.readFile(
      "./tests/container-connect-no-exposed-default.json",
      "utf-8",
   );
   const container = JSON.parse(containerFile);

   const service = getServiceFromLabels(container);

   expect(service).toEqual({
      serviceId: "tests-whoami-1",
      serviceName: "whoami",
      servicePort: 80,
      traefikLabels: [
         "traefik.consulcatalog.connect=true",
         "traefik.enable=true",
         "traefik.http.routers.whoami.rule=Host(`whoami.localhost`)",
      ],
      connect: true,
   });
});

test("get service with no exposed ports", async () => {
   const containerFile = await fs.readFile(
      "./tests/container-no-exposed.json",
      "utf-8",
   );
   const container = JSON.parse(containerFile);

   const service = getServiceFromLabels(container);

   expect(service).toBeUndefined();
});
