#!/bin/bash
SERVER_IP="134.199.203.7"
SERVER_USER="root"
export SERVER_PASS='k5Oso5fl3k8wXx6qEn4QFa368h%$GN'

cat << 'EOF' > check_script_v3.exp
#!/usr/bin/expect -f
set timeout 60
set ip "134.199.203.7"
set user "root"
set password $env(SERVER_PASS)

proc login_handle {} {
    global password
    expect {
        "yes/no" { send "yes\r"; exp_continue }
        "password:" { send "$password\r" }
    }
}

spawn ssh -o PubkeyAuthentication=no $user@$ip
login_handle
expect "#"

send "echo '================ BACKEND LOGS (Errors) ================'\r"
expect "#"
# Get logs from container matching 'python-backend'
send "docker logs --tail 200 \$(docker ps -qf \"name=python-backend\") | grep -iE 'error|exception|traceback' || echo 'No errors found in recent logs'\r"
expect "#"

send "echo '================ FRONTEND LOGS (Last 20) ================'\r"
expect "#"
send "docker logs --tail 20 \$(docker ps -qf \"name=typescript-frontend\")\r"
expect "#"

send "exit\r"
expect eof
EOF

chmod +x check_script_v3.exp
./check_script_v3.exp
rm check_script_v3.exp
