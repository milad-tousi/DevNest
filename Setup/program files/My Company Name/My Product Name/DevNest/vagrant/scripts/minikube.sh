#!/bin/bash

echo "🔧 Installing Minikube and dependencies..."
sudo apt update

sudo apt-get install -y curl apt-transport-https ca-certificates gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

sudo usermod -aG docker vagrant

curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64

curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

sudo apt install -y bash-completion

echo "source <(kubectl completion bash)" | sudo tee -a /home/vagrant/.bashrc
echo "alias k=kubectl" | sudo tee -a /home/vagrant/.bashrc
echo "complete -F __start_kubectl k" | sudo tee -a /home/vagrant/.bashrc
sudo chown vagrant:vagrant /home/vagrant/.bashrc

sudo -u vagrant minikube start --driver=docker

echo "✅ Minikube installation finished."
