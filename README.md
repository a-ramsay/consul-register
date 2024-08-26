# Consul Register

This is a simple service that listens to the Docker API and when a new service appears, it registers it along with its tags to Consul. It is designed to be used with Traefik and the Consul Catalog provider.

## Getting Started

Either run it as a standalone container:

```bash
docker run --name consul-register --net host -v /var/run/docker.sock:/var/run/docker.sock -d ghcr.io/a-ramsay/consul-register
```

Or include it as part of your `docker-compose.yml`:

```yaml
services:
    consul-register:
        image: ghcr.io/a-ramsay/consul-register
        restart: unless-stopped
        volumes:
            - "/var/run/docker.sock:/var/run/docker.sock"
        network_mode: host
```

## Configuration

There are two configuration options available via environment variables:

-   `LABEL_PREFIX`: (Default: `traefik`) This is the Docker label prefix that will be included in the Consul service. By default only Traefik related labels are included. If you're using a custom label namespace in your Traefik config, you should update this to match.
-   `CONSUL_ADDR`: (Default: `http://localhost:8500`) This should point to the local agent that the services will be registered with. It **should not** point to your cluster leaders, as the service gets registered to whichever node it is running on.
-   `GRACE_TIME`: (Default: `5000`) The number of milliseconds to wait before deregistering a service to prevent flapping when a service is restarting or updating. Each call to deregister the service will reset the timer, and a call to register to the same service will cancel the action entirely.
