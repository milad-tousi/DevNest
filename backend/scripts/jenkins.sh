#!/bin/bash

set -e

echo "🟡 Updating system and installing Java 17..."
sudo apt-get update
sudo apt -y install openjdk-17-jdk curl gnupg2 software-properties-common net-tools

cat > /etc/profile.d/java.sh <<'EOF'
export JAVA_HOME=$(dirname $(dirname $(readlink $(readlink $(which java)))))
export PATH=$PATH:$JAVA_HOME/bin
EOF

source /etc/profile.d/java.sh
java --version
echo "✅ Java installed at: $(readlink -f $(which java))"


echo "🐳 Installing Docker..."
sudo apt-get install -y curl apt-transport-https ca-certificates gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

sudo usermod -aG docker vagrant

echo "🔑 Adding Jenkins user and folders..."
sudo adduser --system --group --home /var/lib/jenkins jenkins || true
sudo mkdir -p /usr/share/jenkins /var/lib/jenkins/.jenkins

echo "📦 Downloading Jenkins WAR version 2.509..."
sudo curl -L -o /usr/share/jenkins/jenkins.war https://get.jenkins.io/war/2.509/jenkins.war

echo "🔐 Setting permissions..."
sudo chown -R jenkins:jenkins /usr/share/jenkins
sudo chown -R jenkins:jenkins /var/lib/jenkins

echo "⚙️ Writing custom systemd service file..."
sudo tee /etc/systemd/system/jenkins.service > /dev/null <<EOF
[Unit]
Description=Jenkins Continuous Integration Server
After=network.target

[Service]
Type=simple
User=jenkins
Group=jenkins
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
ExecStart=/usr/bin/java -Djava.awt.headless=true -jar /usr/share/jenkins/jenkins.war
WorkingDirectory=/var/lib/jenkins
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo "🔁 Reloading systemd and starting Jenkins..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable jenkins
sudo systemctl restart jenkins

echo "✅ Jenkins 2.509 is now running on port 8080!"
