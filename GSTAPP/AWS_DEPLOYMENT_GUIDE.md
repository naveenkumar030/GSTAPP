# AWS EC2 Cloud Deployment Guide

This guide describes how to deploy the GST ReconGraph (GSTAPP) web application to an AWS EC2 instance on the **AWS Free Tier**.

---

## Architecture Overview

```
 ┌────────────────┐
 │     Client     │
 └───────┬────────┘
         │ (Port 80/443: HTTP/HTTPS)
         ▼
 ┌─────────────────────────────────────────────────────────┐
 │                       AWS EC2                           │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │                  Nginx Proxy                      │  │
 │  └────────────────────────┬──────────────────────────┘  │
 │                           │ (Port 8000: HTTP Proxy)     │
 │                           ▼                             │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │                  Docker Compose                   │  │
 │  │  ┌─────────────────────────┐   ┌───────────────┐  │  │
 │  │  │        GSTAPP Web       ├══>│    MongoDB    │  │  │
 │  │  │  (React & FastAPI App)  │   │  (Auth Only)  │  │  │
 │  │  └─────────────┬───────────┘   └───────────────┘  │  │
 │  │                │                                  │  │
 │  │                ▼                                  │  │
 │  │  ┌─────────────────────────┐                      │  │
 │  │  │   Persistent App Data   │                      │  │
 │  │  │  (Recon & Uploads JSON) │                      │  │
 │  │  └─────────────────────────┘                      │  │
 │  └───────────────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────┘
```

The application is deployed on a single virtual machine (EC2) under the free tier. Nginx acts as the entry point, proxying external requests to our secure Docker internal network, where the React + FastAPI web application communicates with MongoDB for authentication & user management, and persists reconciliation datasets to local volume storage (`app_data`).

---

## Step 1: Launch an AWS EC2 Instance

1. Log in to the [AWS Management Console](https://aws.amazon.com/console/).
2. Navigate to **EC2** and click **Launch Instance**.
3. Configure the following options:
   * **Name**: `gst-recon-app`
   * **Application and OS Image (AMI)**: Select **Ubuntu** (Ubuntu Server 24.04 LTS or 22.04 LTS - *Free Tier Eligible*).
   * **Instance Type**: Select `t2.micro` or `t3.micro` (*Free Tier Eligible* depending on region).
   * **Key Pair**: Select or create a key pair (e.g. `gst-key.pem`) to securely SSH into the server. Download it to your local machine.
4. **Network Settings (Security Group)**:
   * Create a new security group.
   * Add the following **Inbound Rules**:
     * **Type**: `SSH`, **Port**: `22`, **Source**: `My IP` (Recommended for security) or `Anywhere (0.0.0.0/0)`.
     * **Type**: `HTTP`, **Port**: `80`, **Source**: `Anywhere (0.0.0.0/0)`.
     * **Type**: `HTTPS`, **Port**: `443`, **Source**: `Anywhere (0.0.0.0/0)`.
5. Click **Launch Instance**.

---

## Step 2: Transfer Application Files to the Server

Once your instance is running, copy the files from your local workspace to the EC2 server.

You can do this using `git` (if your project is pushed to a remote repository) or via `scp` from your local machine:

### Option A: Using SCP (from your local command line)
Open your terminal (PowerShell or Bash) on your local machine and run:
```bash
# Compress the project workspace (excluding local virtual environments and node_modules)
tar --exclude="node_modules" --exclude="venv" --exclude=".git" -czf gstapp.tar.gz -C "c:\Users\bayya\Desktop\Project\GSTAPP" .

# Transfer the tarball to your EC2 instance (replace key path and instance IP)
scp -i /path/to/gst-key.pem gstapp.tar.gz ubuntu@<EC2-PUBLIC-IP>:~/
```

### Option B: Using Git (SSH on EC2 instance)
If your repository is on GitHub:
1. SSH into the instance:
   ```bash
   ssh -i /path/to/gst-key.pem ubuntu@<EC2-PUBLIC-IP>
   ```
2. Clone your repository:
   ```bash
   git clone <your-repo-git-url> gstapp
   cd gstapp
   ```

---

## Step 3: Run the Setup Script

1. SSH into your EC2 instance if you haven't already:
   ```bash
   ssh -i /path/to/gst-key.pem ubuntu@<EC2-PUBLIC-IP>
   ```
2. If you transferred a `gstapp.tar.gz` file, extract it:
   ```bash
   mkdir -p gstapp
   tar -xzf gstapp.tar.gz -C gstapp
   cd gstapp
   ```
3. Make the setup script executable and run it:
   ```bash
   chmod +x setup-ec2.sh
   ./setup-ec2.sh
   ```
   *This script automatically updates Ubuntu, installs Docker, Docker Compose, Nginx, configures Nginx to proxy traffic, and sets up your environment configuration.*

---

## Step 4: Configure Environment Variables

1. Open the `.env` configuration file on the server:
   ```bash
   nano .env
   ```
2. Update the essential variables:
   * **`JWT_SECRET`**: Set a secure random string (e.g. `openssl rand -hex 32` or type a strong password).
   * **`EMAIL_USER` / `EMAIL_PASS`**: Enter your SMTP email credentials to enable OTP registration emails.
   * **`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET`**: *(Optional)* Enter S3 credentials to backup raw data files, otherwise the app falls back to local storage.
3. Save and close the file (`Ctrl + O`, `Enter`, then `Ctrl + X`).

---

## Step 5: Start the Application

Start the container services in background detached mode:
```bash
# Refresh group permissions (so you don't need sudo for docker)
newgrp docker

# Run the docker compose build and run commands
docker compose up -d --build
```

Verify that the containers are running properly:
```bash
docker compose ps
docker compose logs -f web
```

Your application should now be accessible via HTTP at: `http://<EC2-PUBLIC-IP>/`

---

## Step 6: Enable HTTPS / SSL Security (Optional & Recommended)

To configure free SSL certificates through Let's Encrypt, you will need a domain name registered (e.g., `gstapp.example.com`) pointed to your EC2 instance's Elastic IP address.

1. Install **Certbot** for Nginx:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   ```
2. Run Certbot to automatically fetch and configure the SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
3. Certbot will automatically edit your `/etc/nginx/nginx.conf` file to support HTTPS on port 443 and auto-renew the certificates!
