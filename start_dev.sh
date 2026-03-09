#!/bin/bash
# Start Backend
cd /home/user/option-pro/backend
nohup ./bin/api > backend.log 2>&1 &
echo $! > backend.pid
echo "Backend started with PID $(cat backend.pid)"

# Start Frontend
cd /home/user/option-pro/frontend
nohup npm run dev > frontend.log 2>&1 &
echo $! > frontend.pid
echo "Frontend started with PID $(cat frontend.pid)"
