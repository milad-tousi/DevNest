#!/bin/bash
set -e

echo "📦 Installing dependencies for Prometheus & Grafana..."
sudo apt-get update
sudo apt-get install -y curl wget tar adduser libfontconfig1 musl apt-transport-https software-properties-common

# ========== Prometheus ==========
echo "📦 Installing Prometheus..."

# Create Prometheus user
if ! id "prometheus" &>/dev/null; then
  sudo useradd --no-create-home --shell /bin/false prometheus
fi

# Create directories if they don't exist
sudo mkdir -p /etc/prometheus /var/lib/prometheus/data
sudo chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus

# Download latest Prometheus build
PROM_URL="https://github.com/prometheus/prometheus/releases/download/v3.4.0-rc.0/prometheus-3.4.0-rc.0.linux-amd64.tar.gz"
wget -q "$PROM_URL" -O prometheus.tar.gz

# Extract & install
tar -xf prometheus.tar.gz
cd prometheus-*
sudo cp prometheus promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus /usr/local/bin/promtool

# Copy config files if not exist
[ -f /etc/prometheus/prometheus.yml ] || sudo cp prometheus.yml /etc/prometheus/

if [ -d consoles ]; then
  [ -d /etc/prometheus/consoles ] || sudo cp -r consoles /etc/prometheus
else
  echo "⚠️ 'consoles' directory not found in extracted Prometheus. Skipping."
fi

if [ -d console_libraries ]; then
  [ -d /etc/prometheus/console_libraries ] || sudo cp -r console_libraries /etc/prometheus
else
  echo "⚠️ 'console_libraries' directory not found in extracted Prometheus. Skipping."
fi

sudo chown -R prometheus:prometheus /etc/prometheus

cd ..
rm -rf prometheus-* prometheus.tar.gz

# Create systemd service
echo "⚙️ Creating Prometheus systemd service..."
sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus Monitoring
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/data
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Prometheus
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus

# ========== Grafana ==========
echo "📊 Installing Grafana..."

# Download and install Grafana Enterprise 12
wget -q https://dl.grafana.com/enterprise/release/grafana-enterprise_12.0.0_amd64.deb
sudo dpkg -i grafana-enterprise_12.0.0_amd64.deb
rm grafana-enterprise_12.0.0_amd64.deb

# Enable and start Grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server

echo "✅ Prometheus and Grafana are installed and running."
