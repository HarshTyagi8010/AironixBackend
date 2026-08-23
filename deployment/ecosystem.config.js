module.exports = {
  apps: [
    {
      name: "aac-backend",
      script: "server.js",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
    {
      name: "aac-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "./frontend",
      instances: "max", // Scale to all cores for frontend static serving if needed
      exec_mode: "cluster", // Cluster mode
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
