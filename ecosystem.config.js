// Configuración PM2 para 10 usuarios
// Uso: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'reiki-api',
      script: './apps/api/dist/main.js',
      instances: 1, // 1 instancia es suficiente para 10 usuarios
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M', // Reiniciar si usa más de 500MB
      watch: false,
    },
    {
      name: 'reiki-web',
      script: './apps/web/.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
    },
  ],
};

