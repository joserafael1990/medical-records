#!/bin/bash

# Configuration
SERVER_IP="134.199.196.165"
SERVER_USER="root"
export SERVER_PASS='k5Oso5fl3k8wXx6qEn4QFa368h%$GN'
PROJECT_DIR="medical-records"

echo "📦 Compressing project files..."
rm -f project.tar.gz
tar -czf project.tar.gz \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='.venv' \
    --exclude='.git' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='__pycache__' \
    --exclude='*.tar.gz' \
    .

echo "🚀 Starting deployment to $SERVER_IP..."

# Create an expect script
cat << 'EOF' > deploy_script.exp
#!/usr/bin/expect -f

set timeout 300
set ip "134.199.196.165"
set user "root"
set password $env(SERVER_PASS)
set file "project.tar.gz"
set setup_script "server_setup.sh"
set compose_file "compose.prod.yaml"

# Function to handle SSH/SCP login
proc login_handle {} {
    global password
    expect {
        "yes/no" { send "yes\r"; exp_continue }
        "password:" { send "$password\r" }
    }
}

# 1. Upload project archive
spawn scp $file $user@$ip:~/
login_handle
expect eof

# 2. Upload setup script
spawn scp $setup_script $user@$ip:~/
login_handle
expect eof

# 3. Upload production compose file
spawn scp $compose_file $user@$ip:~/
login_handle
expect eof

# 4. SSH in to setup and unpack
spawn ssh $user@$ip
login_handle
expect "#"

# Run setup script
send "chmod +x server_setup.sh\r"
expect "#"
send "./server_setup.sh\r"
# Wait for setup to complete (can take time)
expect {
    -timeout 600
    "Server setup complete"
}
expect "#"

# Prepare app directory
send "rm -rf app\r"
expect "#"
send "mkdir -p app\r"
expect "#"

# Unpack project
send "tar -xzf project.tar.gz -C app\r"
expect "#"

# Move prod compose to app dir
send "cp compose.prod.yaml app/\r"
expect "#"

# Cleanup
send "rm project.tar.gz\r"
expect "#"

send "exit\r"
expect eof
EOF

# Make the expect script executable
chmod +x deploy_script.exp

# Run the expect script
echo "🔄 Transferring files and setting up server..."
./deploy_script.exp

# Cleanup
rm deploy_script.exp
rm project.tar.gz

echo ""
echo "✅ Deployment files transferred and server environment setup complete!"
echo ""
echo "👉 NEXT STEPS:"
echo "1. SSH into your server: ssh $SERVER_USER@$SERVER_IP"
echo "   (Password: $SERVER_PASS)"
echo "2. Go to the app directory: cd app"
echo "3. Login to Doppler: doppler login"
echo "4. Setup Doppler: doppler setup (Select 'cortex' project and 'prd' config)"
echo "5. Start the app: doppler run -- docker compose -f compose.prod.yaml up -d --build"
