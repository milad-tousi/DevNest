#!/bin/bash
sudo apt update
sudo apt upgrade -y

sudo apt install -y curl gnupg2 software-properties-common
sudo dpkg --configure -a
sudo rm -rf /etc/apt/trusted.gpg.d/vbox.gpg
curl -fsSL https://www.virtualbox.org/download/oracle_vbox_2016.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/vbox.gpg

echo "deb [arch=amd64] https://download.virtualbox.org/virtualbox/debian $(lsb_release -cs) contrib" | \
  sudo tee /etc/apt/sources.list.d/virtualbox.list

sudo apt update
sudo apt install -y virtualbox-7.0

vboxmanage --version


echo "🔧 Detecting platform..."
PLATFORM=$(uname -a)

echo "🧠 Installing Ansible (if on Linux) ..."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  sudo apt install -y ansible
fi

if ! command -v vagrant &>/dev/null; then
  echo "⬇ Installing Vagrant..."
  sudo apt remove --purge vagrant -y
  sudo rm -rf /opt/vagrant /usr/local/bin/vagrant ~/.vagrant.d
  cd /tmp
  wget https://releases.hashicorp.com/vagrant/2.4.1/vagrant_2.4.1-1_amd64.deb
  sudo apt install ./vagrant_2.4.1-1_amd64.deb
else
  echo "✅ Vagrant already installed"
fi

echo ""
echo "✅ All requirements installed!"