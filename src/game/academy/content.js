export const PS_LESSONS = [
 {id:'processes',title:'1 · Inspect running processes',command:'Get-Process',copy:'A process is a running program. Get-Process returns process objects for the local computer. Observe before changing anything. CPU is accumulated processor time, not a live CPU percentage.',docs:'https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-process',questions:[
  {prompt:'What does Get-Process display?',options:['Files','Running processes','User accounts','Network routes'],answer:1,explanation:'It returns objects describing running processes.'},
  {prompt:'What is a sensible first step when an app seems stuck?',options:['Stop every process','Delete its folder','Inspect the relevant process','Disable the firewall'],answer:2,explanation:'Inspection gives you evidence before you make a change.'},
  {prompt:'What does the CPU property represent?',options:['Accumulated processor time','Current CPU percentage','Available disk space','A process password'],answer:0,explanation:'CPU is accumulated time, so sorting it is not the same as measuring live CPU load.'}
 ]},
 {id:'services',title:'2 · Inspect Windows services',command:'Get-Service',copy:'Get-Service lists Windows services, including running and stopped ones. Listing does not start or stop them. This cmdlet is Windows-specific; not every PowerShell command is available on every operating system.',docs:'https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-service',questions:[
  {prompt:'What does Get-Service display?',options:['Registry values','Files','Windows services','Accounts'],answer:2,explanation:'It reports service objects, including each service’s status.'},
  {prompt:'Does Get-Service start stopped services?',options:['Yes, all of them','No, it inspects them','Only on Tuesdays','It removes them'],answer:1,explanation:'Get-Service reads service information; changing state is a different action.'},
  {prompt:'Where is Get-Service available?',options:['Only inside a browser','On every operating system','Only on phones','On Windows'],answer:3,explanation:'Get-Service is a Windows-specific cmdlet.'}
 ]},
 {id:'connection',title:'3 · Test reachability',command:'Test-Connection google.com',copy:'By default, Test-Connection sends ICMP echo requests, often called pings. A reply indicates ICMP reachability. No reply can mean filtering or a network problem; it does not prove that a host is down. A successful ping does not prove that HTTPS works.',docs:'https://learn.microsoft.com/powershell/module/microsoft.powershell.management/test-connection',questions:[
  {prompt:'What is the purpose of this command?',options:['Create a user','Delete a file','Open a firewall','Ping a host'],answer:3,explanation:'Its default behavior tests reachability with ICMP echo requests.'},
  {prompt:'Does a successful ping prove a website works?',options:['No, HTTP/HTTPS is a separate test','Yes, every service must work','It proves the site is secure','It proves your password works'],answer:0,explanation:'ICMP reachability and application health are different observations.'},
  {prompt:'What can no ping reply mean?',options:['The host is definitely destroyed','Only a wrong password','Filtering or a connectivity problem','The command deleted a route'],answer:2,explanation:'Interpret missing replies carefully; ICMP can be blocked.'}
 ]},
 {id:'pipeline',title:'4 · Filter pipeline objects',command:"Get-Service | Where-Object Status -eq 'Running'",copy:'PowerShell pipelines pass objects. Where-Object keeps the objects matching a condition. This example displays running services; it does not start them. Filtering is about selecting relevant evidence, not changing the system.',docs:'https://learn.microsoft.com/powershell/module/microsoft.powershell.core/where-object',questions:[
  {prompt:'What does this pipeline do?',options:['Install a service','Filter running services','Start services','Remove services'],answer:1,explanation:'Only service objects with Status equal to Running pass through.'},
  {prompt:'What travels through this PowerShell pipeline?',options:['Only screenshots','Only filenames','Objects','Passwords automatically'],answer:2,explanation:'Commands can inspect object properties such as Status.'},
  {prompt:'What does -eq mean?',options:['Equals','Starts a service','Deletes an item','Not equal'],answer:0,explanation:'-eq compares values for equality.'}
 ]}
];
export const PS_QUESTIONS=PS_LESSONS.flatMap(lesson=>lesson.questions.map((question,index)=>({...question,id:lesson.id+'-'+index,lesson:lesson.id,command:lesson.command})));

export const TACTICAL_POWERUPS = [
  {
    id: 'credits',
    name: 'Bonus Budget Grant',
    badge: '+75 Credits',
    desc: 'Injects +75 operational credits into your field defense reserve.',
    apply(game) {
      game.credits += 75;
      return '+75 Bonus Credits added to reserves!';
    }
  },
  {
    id: 'overcharge',
    name: 'Pipeline Overcharge',
    badge: '+10% DMG Buff',
    desc: 'Calibrates pipelines for high-energy discharge: +10% damage bonus.',
    apply(game) {
      game.dmgBonus = Math.min(0.8, Number((game.dmgBonus + 0.1).toFixed(2)));
      return '+10% Turret Damage Buff activated!';
    }
  },
  {
    id: 'frequency',
    name: 'Rapid Dispatch Matrix',
    badge: '+10% Fire Rate',
    desc: 'Accelerates command dispatch cycles: +10% turret fire-rate bonus.',
    apply(game) {
      game.speedBonus = Math.min(0.5, Number((game.speedBonus + 0.1).toFixed(2)));
      return '+10% Turret Fire Rate Buff activated!';
    }
  },
  {
    id: 'purge',
    name: 'EMP Wave Dampener',
    badge: 'EMP Purge & Slow',
    desc: 'Emits an EMP pulse that slows all active hostiles by 50% for 90 ticks.',
    apply(game) {
      let affected = 0;
      for (const e of game.enemies) {
        if (!e.shielded) {
          e.slowDuration = Math.max(e.slowDuration || 0, 90);
          affected++;
        }
      }
      return `EMP Pulse deployed: ${affected} hostiles throttled!`;
    }
  }
];

export const TACTICAL_QUESTIONS = [
  {
    id: 'tac-net-port',
    category: 'Network Diagnostics',
    command: 'Test-NetConnection -ComputerName "host.local" -Port 443',
    prompt: 'Which cmdlet verifies whether a specific remote TCP port (such as HTTPS 443) is open and reachable?',
    options: ['Get-Service -Port 443', 'Test-NetConnection -ComputerName host -Port 443', 'Ping-Host -Port 443', 'Select-String -Port 443'],
    answer: 1,
    explanation: 'Test-NetConnection tests specific TCP ports and routes, returning TcpTestSucceeded: True when open.'
  },
  {
    id: 'tac-sort-cpu',
    category: 'System Performance',
    command: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5',
    prompt: 'How do you pinpoint the top 5 processes with highest accumulated CPU consumption?',
    options: [
      'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5',
      'Get-Process -Top 5 -OrderBy CPU',
      'Select-Object -Count 5 | Get-Process',
      'Where-Object CPU -gt 5'
    ],
    answer: 0,
    explanation: 'Piping Get-Process into Sort-Object -Descending by CPU and selecting -First 5 extracts the top 5 accumulated consumers.'
  },
  {
    id: 'tac-select-string',
    category: 'Log Auditing & Security',
    command: 'Get-ChildItem -Path C:\\Logs -Filter *.log | Select-String -Pattern "DENIED"',
    prompt: 'Which cmdlet searches for regex matches or text strings inside log files (similar to grep)?',
    options: ['Find-File', 'Select-String', 'Where-Text', 'Filter-Log'],
    answer: 1,
    explanation: 'Select-String searches files and input streams for matching string patterns or regular expressions.'
  },
  {
    id: 'tac-exec-policy',
    category: 'Security Hardening',
    command: 'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process',
    prompt: 'What scope limits ExecutionPolicy changes to only the current PowerShell session without altering system-wide registry keys?',
    options: ['-Scope Machine', '-Scope LocalMachine', '-Scope Process', '-Scope Root'],
    answer: 2,
    explanation: '-Scope Process applies the policy exclusively to the active process without persistent machine or user registry modifications.'
  },
  {
    id: 'tac-api-rest',
    category: 'Modern Integrations',
    command: 'Invoke-RestMethod -Uri "https://api.defense.local/telemetry" -Method Get',
    prompt: 'Which cmdlet automatically parses JSON or XML REST API responses into PowerShell native objects?',
    options: ['Invoke-WebRequest', 'Invoke-RestMethod', 'Get-Content -Json', 'Receive-Job'],
    answer: 1,
    explanation: 'Invoke-RestMethod consumes REST web endpoints and automatically deserializes JSON or XML into interactive PowerShell custom objects.'
  },
  {
    id: 'tac-stop-service',
    category: 'Service Management',
    command: 'Get-Service -Name "Spooler" | Stop-Service -WhatIf',
    prompt: 'Which parameter previews the outcome of a destructive or state-changing command without actually executing it?',
    options: ['-Confirm', '-WhatIf', '-Preview', '-TestOnly'],
    answer: 1,
    explanation: '-WhatIf displays what changes would occur, allowing safe validation before applying any modification.'
  },
  {
    id: 'tac-measure-object',
    category: 'Object Analytics',
    command: 'Get-ChildItem -Path . | Measure-Object -Property Length -Sum',
    prompt: 'Which cmdlet calculates count, average, sum, minimum, or maximum across object properties?',
    options: ['Measure-Object', 'Count-Object', 'Get-Metric', 'Calculate-Property'],
    answer: 0,
    explanation: 'Measure-Object computes statistical values (count, average, sum, min, max) for specified properties of objects passing through the pipeline.'
  },
  {
    id: 'tac-export-csv',
    category: 'Data Pipelines',
    command: 'Get-Process | Select-Object Name, Id, CPU | Export-Csv -Path .\\procs.csv -NoTypeInformation',
    prompt: 'What parameter prevents PowerShell from writing the "#TYPE" metadata header in exported CSV files?',
    options: ['-NoHeaders', '-Clean', '-NoTypeInformation', '-RawFormat'],
    answer: 2,
    explanation: '-NoTypeInformation omits the #TYPE object type header line, generating standard RFC-compliant CSVs compatible with other tools.'
  }
];

export const CYBER_QUESTIONS=[
 {prompt:'A Cyber Planet relay does not answer ping. What should you conclude?',options:['It has definitely been deleted','ICMP may be filtered; investigate further','Reset every relay immediately'],answer:1,explanation:'A missing ping reply is evidence to investigate, not a complete diagnosis.'},
 {prompt:'Which command helps inspect running Windows services?',options:["Get-Service | Where-Object Status -eq 'Running'",'Stop-Process','Remove-Item'],answer:0,explanation:'Read and filter before deciding whether any service needs a change.'},
 {prompt:'A defender wants to stop a process. What should come first?',options:['Stop all processes','Delete all logs','Identify it and check who depends on it'],answer:2,explanation:'Evidence and impact matter before changing a shared system.'}
];
export const RANKS=[{name:'Initiate',xp:0},{name:'Traveler',xp:250},{name:'Architect',xp:750},{name:'Guardian',xp:1250},{name:'Nexus Builder',xp:2000},{name:'Seven-Star Champion',xp:3000}];
