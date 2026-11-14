# Mobile access to your Windows host

Grace Nexus LMS is the public learning hub. Grace Remote is a personal companion served on the host at http://127.0.0.1:8787. A public webpage cannot safely assume access to your desktop's localhost. Host execution stays behind your private connection.

## First test on the computer

From the extracted companion folder:

```powershell
.\Test-RemoteReadiness.ps1
.\Start-GraceRemote.ps1 -Workspace 'C:\Users\Nick\OneDrive\Documents\GitHub\amazing-grace-consolidated' -SessionDays 30
```

Sign into Codex first. Save the displayed companion token privately, open the local console, and connect. Test a harmless request, such as listing the repository name. Do not paste the token into a chat.

## Reach the computer while away

Use a private VPN between your phone and Windows host (or an existing securely configured SSH arrangement). Install the Windows OpenSSH Server using Microsoft's documented procedure. Prefer SSH key authentication. Do not forward the companion/model ports through your home router. Configuring the VPN and Windows SSH server is separate from downloading this companion.

A readiness script is included. It deliberately does not silently install a VPN, open firewall ports, change SSH authentication, or create user accounts. Keep Windows awake while plugged in; configure and test the optional startup task if you need reboot recovery.

Official Windows setup and key instructions:
- https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse
- https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement

For an administrator account, Windows OpenSSH's default configuration uses `%ProgramData%\ssh\administrators_authorized_keys`, rather than the ordinary per-user file. Follow the documented ACL requirements. For least-privilege work, consider a separate standard Windows account with access only to the needed repository. Never upload a private SSH key to your website or Windows authorized-keys file.

## Android using Termux

Install OpenSSH in Termux and generate the SSH key ON THE PHONE. Use a passphrase when prompted. Do not overwrite an existing key; this distinct filename helps keep keys separate.

```bash
pkg install openssh
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/grace_remote_ed25519 -C grace-mobile
cat ~/.ssh/grace_remote_ed25519.pub
```

The `.pub` file is the public key to install for the Windows SSH account. The file without `.pub` is private and stays on the phone. Compare the Windows server host-key fingerprint through a trusted channel before accepting the first connection.

After SSH key access is configured, replace WINDOWS_USER and PRIVATE_HOST with the real Windows username and the computer's reachable VPN/private address:

```bash
ssh -i ~/.ssh/grace_remote_ed25519 -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 8787:127.0.0.1:8787 WINDOWS_USER@PRIVATE_HOST
```

Keep the tunnel running. Open http://127.0.0.1:8787 in the phone browser and enter your companion token. Android may suspend Termux; reconnect after a background interruption. A 30-day companion token does not keep an SSH tunnel or computer awake automatically.

For a traditional PowerShell terminal, open a second Termux session:

```bash
ssh -t -i ~/.ssh/grace_remote_ed25519 WINDOWS_USER@PRIVATE_HOST powershell.exe -NoLogo
```

This is an SSH shell under that Windows account's permissions. An administrator's interactive elevation prompts may need separate handling. The website does not bypass Windows permissions.

## iPhone

Use an SSH client that supports local TCP forwarding. Configure the same Windows SSH user and private/VPN host. Generate a passphrase-protected key on the iPhone and install only its public key on Windows. Add a local forward from phone port 8787 to host destination 127.0.0.1:8787. Open that local URL in Safari while the SSH connection is active. iOS can suspend background apps; verify your client's tunnel behavior before relying on it for travel.

## LM Studio, separately

Install LM Studio from https://lmstudio.ai/ and choose a model suited to your hardware. Start its server from the Developer page, bind it to localhost, and enable API-token authentication. Store its token through your own protected host credential workflow, never public JavaScript.

A tunnel can carry a separate model client as well:

```bash
ssh -i ~/.ssh/grace_remote_ed25519 -N -o ExitOnForwardFailure=yes -L 8787:127.0.0.1:8787 -L 1234:127.0.0.1:1234 WINDOWS_USER@PRIVATE_HOST
```

The model client then uses http://127.0.0.1:1234/v1, with its LM Studio credential if authentication is enabled. This does not automatically add a local-model chat client to Grace Remote. The current companion still runs Codex tasks through Codex app-server. Local-model selection/routing in the hosted LMS is not connected in this release.

If by LocalMind or Terminix you mean a particular different application, verify its exact vendor, API, and authentication support before configuring it. No unknown software is installed by this package.

## Before leaving

Test from cellular data, not just the same Wi-Fi. Reboot Windows and test the startup task, SSH, local console, and a harmless Codex task again. Ensure OneDrive repository files are fully downloaded. Keep a way to recover the host if power, network, authentication, updates, or a service fails. Check actual provider permissions before publishing changes.
