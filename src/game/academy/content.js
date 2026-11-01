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
export const CYBER_QUESTIONS=[
 {prompt:'A Cyber Planet relay does not answer ping. What should you conclude?',options:['It has definitely been deleted','ICMP may be filtered; investigate further','Reset every relay immediately'],answer:1,explanation:'A missing ping reply is evidence to investigate, not a complete diagnosis.'},
 {prompt:'Which command helps inspect running Windows services?',options:["Get-Service | Where-Object Status -eq 'Running'",'Stop-Process','Remove-Item'],answer:0,explanation:'Read and filter before deciding whether any service needs a change.'},
 {prompt:'A defender wants to stop a process. What should come first?',options:['Stop all processes','Delete all logs','Identify it and check who depends on it'],answer:2,explanation:'Evidence and impact matter before changing a shared system.'}
];
export const RANKS=[{name:'Initiate',xp:0},{name:'Traveler',xp:250},{name:'Architect',xp:750},{name:'Guardian',xp:1250},{name:'Nexus Builder',xp:2000},{name:'Seven-Star Champion',xp:3000}];
