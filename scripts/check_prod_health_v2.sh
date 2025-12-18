#!/bin/bash
SERVER_IP="134.199.203.7"
SERVER_USER="root"
export SERVER_PASS='k5Oso5fl3k8wXx6qEn4QFa368h%$GN'

cat << 'EOF' > check_script_v2.exp
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

send "echo '================ DISK USAGE ================'\r"
expect "#"
send "df -h\r"
expect "#"

send "echo '================ DOCKER CONTAINERS ================'\r"
expect "#"
send "docker ps\r"
expect "#"

send "echo '================ DOCKER COMPOSE LOGS (Backend Errors) ================'\r"
expect "#"
send "cd app\r"
expect "#"
# Check for "ERROR", "Exception", "Traceback" in the last 200 lines. 
# We use || true so the script doesn't fail if grep finds nothing.
send "docker compose -f compose.prod.yaml logs --tail=200 python-backend | grep -iE 'error|exception|traceback' || echo 'No errors found in recent logs'\r"
expect "#"

send "echo '================ DOCKER COMPOSE LOGS (Frontend) ================'\r"
expect "#"
send "docker compose -f compose.prod.yaml logs --tail=50 typescript-frontend\r"
expect "#"

send "exit\r"
expect eof
EOF

chmod +x check_script_v2.exp
./check_script_v2.exp
rm check_script_v2.exp
