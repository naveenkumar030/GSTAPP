#!/usr/bin/env bash
# ==============================================================================
# GST ReconGraph - AWS EC2 Setup and Initialization Script (Ubuntu)
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " Starting GST ReconGraph System Installation (Ubuntu EC2)"
echo "======================================================================"

# 1. Update package lists
echo "[*] Updating package database..."
sudo apt-get update -y

# 2. Install prerequisites
echo "[*] Installing pre-requisites..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    nginx \
    apache2-utils

# 3. Setup Docker Official Repository and GPG Key
echo "[*] Setting up Docker repository..."
sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine and Compose Plugin
echo "[*] Installing Docker and Docker Compose..."
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Manage Docker Permissions
echo "[*] Adding user $USER to docker group..."
sudo usermod -aG docker "$USER"
echo "[!] You may need to log out and log back in (or run 'newgrp docker') to run Docker commands without sudo."

# 6. Stop default Nginx and configure reverse proxy
echo "[*] Configuring Nginx reverse proxy..."
if [ -f "./nginx.conf" ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo cp ./nginx.conf /etc/nginx/nginx.conf
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    echo "[+] Nginx reverse proxy configured successfully."
else
    echo "[-] Warning: './nginx.conf' not found in current directory. Skipping Nginx config copy."
fi

# 7. Environment configuration check
echo "[*] Setting up application environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[+] Created a template '.env' file from '.env.example'."
        echo "[!] Action Required: Open '.env' and fill in your JWT_SECRET, S3, and SMTP credentials before starting!"
    else
        touch .env
        echo "[-] Warning: '.env.example' not found. Created empty '.env' file."
    fi
else
    echo "[+] Found existing '.env' file."
fi

echo "======================================================================"
echo " System setup completed successfully!"
echo "======================================================================"
echo "Next Steps:"
echo "1. Edit the '.env' file to add your secrets (especially JWT_SECRET, SMTP, and S3 credentials):"
echo "   nano .env"
echo "2. Build and start the containers using Docker Compose:"
echo "   sudo docker compose up -d --build"
echo "3. Visit http://<EC2-PUBLIC-IP> in your browser to verify deployment!"
echo "======================================================================"
