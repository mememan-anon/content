module.exports = {
  apps: [
    {
      name: "poster",
      cwd: __dirname,
      script: "dist/scheduler.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
