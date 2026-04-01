// ─────────────────────────────────────────────
//  PM2 Ecosystem Config — NOXETA
//  Usage:
//    pm2 start ecosystem.config.js
//    pm2 reload ecosystem.config.js
//    pm2 stop all
// ─────────────────────────────────────────────
module.exports = {
  apps: [
    {
      name:         'noxeta-api',
      script:       'src/server.js',
      cwd:          '/home/ubuntu/backend',
      instances:    'max',           // use all CPU cores
      exec_mode:    'cluster',       // Node cluster mode
      watch:        false,           // Don't watch in production
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
      },
      // Logging
      out_file:  '/home/ubuntu/logs/noxeta-out.log',
      error_file:'/home/ubuntu/logs/noxeta-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Auto-restart on crash
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
