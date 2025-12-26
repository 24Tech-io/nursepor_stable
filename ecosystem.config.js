module.exports = {
    apps: [
        {
            name: 'lms-student',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3000',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            error_file: './logs/student-error.log',
            out_file: './logs/student-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            min_uptime: '10s',
            max_restarts: 10,
        },
    ],
};
