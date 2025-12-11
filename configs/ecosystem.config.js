module.exports = {
  apps: [
    {
      name: 'websocket.cairn.com',
      cwd: '/var/www/collab-switch',
      script: 'server.js',
      args: 'start',
      env: {
        PORT: 3000
      }
    },
    {
      name: 'ucla-sound-recorder',
      cwd: '/var/www/ucla-sound-recorder',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        RECORDINGS_DIR: '/srv/sounds-recordings'
      }
    },
    {
      name: 'afterimage',
      cwd: '/var/www/afterimage-experiment/backend',
      script: 'server.js',
      args: 'start',
      env: {
        PORT: 3011
      }
    }
  ]
};
