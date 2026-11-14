// Shared, public learning content. No provider keys, transcripts or personal answers.
export const JOURNEYS = [
  {
    id: 'signal-watch', title: 'The Signal Watch', chapter: 'I · Notice before acting', minutes: 4,
    skill: 'Evidence & observation', requires: [], practice: '/arcade/matrix-of-conscience/',
    summary: 'Help Ada separate a clue from a conclusion at the Echo Gardens relay.',
    story: [
      'At the Echo Gardens, Ada watches a signal lamp blink out. A runner calls the whole network broken. Another gardener says everything is fine because one lamp still glows. You are the new Signalkeeper: your first tool is a question, not a command.',
      'An observation describes what you actually measured: this lamp did not reply at this time. An interpretation explains what you think it means. A plan should keep those separate. A missing ping reply, for example, might reflect a failed link, a filter, or an unavailable host. It does not identify the cause on its own.',
      'Ada records the time and the affected relay, compares another route, and checks a relevant current notice. She starts with a narrow, reversible test. In the arcade, study the objective and inspect a board before spending your resources. In a real system, confirm the target and your permission before investigating.'
    ],
    reflection: 'What evidence would change your first explanation? Who else might see a different part of the problem?',
    responses: [
      { title: 'Restart every relay', outcome: 'The lamps may return, but shared work could be interrupted and evidence lost. A broad change needs a clear reason and permission.' },
      { title: 'Inspect one affected route first', outcome: 'A smaller test gives Ada a result she can compare. It reduces uncertainty without treating a guess as a fact.' }
    ],
    questions: [
      { prompt: 'Which is an observation rather than a conclusion?', options: ['The entire network is broken', 'Relay A did not answer this test at 10:00', 'The operator must be careless'], answer: 1, explanation: 'A bounded report states the target, test, and time without inventing a cause.' },
      { prompt: 'What helps distinguish competing explanations?', options: ['Repeating the loudest claim', 'Changing every setting at once', 'A relevant test that could change your mind'], answer: 2, explanation: 'A useful test helps you compare explanations and update your plan.' },
      { prompt: 'Before inspecting a real system, what should you check?', options: ['The correct target and your authorization', 'Only its display color', 'Whether a game badge gives admin access'], answer: 0, explanation: 'A learning achievement does not grant permission to inspect or change someone else’s system.' }
    ],
    sources: [{ title: 'Microsoft Learn · Test-Connection', url: 'https://learn.microsoft.com/powershell/module/microsoft.powershell.management/test-connection' }]
  },
  {
    id: 'object-courier', title: 'The Object Courier', chapter: 'I · Notice before acting', minutes: 4,
    skill: 'PowerShell pipelines', requires: ['signal-watch'], practice: '/arcade/powershell-defense/',
    summary: 'Deliver the right service records to Iona without changing the services.',
    story: [
      'Iona has a stack of service reports, but only the running services belong on today’s inspection board. Pip proposes stopping every service with an unfamiliar name. You propose a filter instead.',
      "PowerShell commands often return objects with properties. Get-Service returns Windows service objects. In Get-Service | Where-Object Status -eq 'Running', the pipe passes those objects to Where-Object, which keeps the ones matching the condition. This displays a selection; it does not start or stop a service.",
      'A filter is useful only when it answers the question you meant to ask. Showing only running services would hide stopped services, which could matter in a different investigation. In PowerShell Defense, turrets are fictional command metaphors: a Where-Object turret slows enemies, but the real command filters objects.'
    ],
    reflection: 'What might your filter hide? How would your query change if you were investigating a stopped service?',
    responses: [
      { title: 'Keep every report visible', outcome: 'You retain context, but the board may become harder to scan. A summary and a way to inspect the full set can help.' },
      { title: 'Show only the matching reports', outcome: 'Iona can focus on the current question. Label the filter so the missing records are not mistaken for nonexistent services.' }
    ],
    questions: [
      { prompt: 'What does this pipeline display?', options: ['Only running Windows services', 'Only user accounts', 'All services after restarting them'], answer: 0, explanation: 'Where-Object selects the objects whose Status equals Running.' },
      { prompt: 'What is passed between these PowerShell commands?', options: ['Only an image of the terminal', 'Service objects', 'An automatic password export'], answer: 1, explanation: 'Properties on the objects can be used by the next command.' },
      { prompt: 'Why label a filtered view?', options: ['To grant it administrator rights', 'To guarantee all services are healthy', 'To show what has been included or omitted'], answer: 2, explanation: 'Readers need to understand the selection before drawing conclusions.' }
    ],
    sources: [{ title: 'Microsoft Learn · About pipelines', url: 'https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_pipelines' }]
  },
  {
    id: 'quoted-bridge', title: 'The Quoted Bridge', chapter: 'II · Work with care', minutes: 4,
    skill: 'Bash quoting & boundaries', requires: ['object-courier'], practice: '/arcade/vim-defense/',
    summary: 'Help Pip carry a path containing spaces across the shell bridge intact.',
    story: [
      'Pip writes a path to a folder called Garden Reports. The shell reads it as separate words, and the courier reaches the wrong destination. Your team pauses to inspect the command before sending it again.',
      'In Bash, quoting controls how the shell interprets characters. Double quotes preserve spaces while still allowing expansions such as variables. Single quotes preserve the literal characters inside them. For example, a quoted variable reference can keep a path with spaces together as one argument. Quoting is part of understanding a command, not a universal guarantee that any command is safe.',
      'Before executing a real command, identify the target, the arguments, and any effect that changes files or permissions. Use a disposable practice folder when learning. The VIM/Bash arcade is a simulation: movement keys and quiz rewards do not execute terminal commands.'
    ],
    reflection: 'Which part of a command comes from a trusted fixed value, and which part comes from input that could change?',
    responses: [
      { title: 'Copy the command without reading it', outcome: 'The copied text may fit a different environment. Pip still needs to check the target and effects.' },
      { title: 'Explain each argument first', outcome: 'The team notices the space and can choose the appropriate quoting before a real action.' }
    ],
    questions: [
      { prompt: 'What can double quotes help preserve in a Bash path argument?', options: ['Administrator access', 'Spaces as part of the same argument', 'A guarantee that the file exists'], answer: 1, explanation: 'Double quotes preserve spaces while still permitting certain expansions.' },
      { prompt: 'What do single quotes generally preserve?', options: ['Literal characters inside them', 'Only numbers', 'Only filenames without spaces'], answer: 0, explanation: 'Single quotes prevent the shell from interpreting the enclosed characters as expansions.' },
      { prompt: 'Where should a new file-changing command be practiced?', options: ['On the only copy of important work', 'Inside someone else’s account', 'In a permitted disposable test folder'], answer: 2, explanation: 'Practice should have a clear boundary and recoverable consequences.' }
    ],
    sources: [{ title: 'GNU Bash manual · Quoting', url: 'https://www.gnu.org/software/bash/manual/html_node/Quoting.html' }]
  },
  {
    id: 'keykeepers', title: 'The Keykeepers', chapter: 'II · Work with care', minutes: 5,
    skill: 'Credentials & least privilege', requires: ['quoted-bridge'], practice: '/arcade/academy/',
    summary: 'Choose how a visiting tool receives only the access it needs.',
    story: [
      'A visiting builder asks Mira for the master key to every workshop. The builder only needs to inspect one project. Mira offers a smaller key with an expiry, and asks where it will be kept.',
      'An API key or personal access token acts with the permissions attached to it. A token for one provider does not automatically authorize another provider, and signing in to a website is not the same as granting API access. Use your own official account flow, scope access to the needed task, and review expiration and usage.',
      'Provider secrets belong on the companion host, entered through hidden terminal prompts or approved secure setup. Public scripts and instructions can be shared; secret values must not go in Git, extension code, URLs, chat, or learning exports. A companion session token is different: it authorizes the browser to use your local companion and stays in page memory. Locking the page clears that copy; revoking a token at its issuer is a separate action.'
    ],
    reflection: 'If a token leaked today, how would you revoke it, rotate it, and check the scope of possible use?',
    responses: [
      { title: 'Use one broad key for every tool', outcome: 'Setup may be quick, but compromise of any tool could expose all of those permissions.' },
      { title: 'Use a scoped account-owned credential', outcome: 'The team can limit access and revoke one tool’s credential without deliberately distributing a shared master key.' }
    ],
    questions: [
      { prompt: 'Where should a provider token be entered?', options: ['In a public issue comment', 'In the lesson’s free-text box', 'In the host setup wizard’s hidden prompt'], answer: 2, explanation: 'The wizard stores the credential on the host; this lesson does not accept secrets.' },
      { prompt: 'What belongs in a shared integration catalog?', options: ['Non-secret IDs and setup instructions', 'Everyone’s private tokens', 'A copy of each password'], answer: 0, explanation: 'Share the wiring and instructions, not the credential values.' },
      { prompt: 'Does locking the sidebar revoke the provider key?', options: ['Yes, at every provider', 'No; revoke or rotate it in the provider account', 'It deletes the provider account'], answer: 1, explanation: 'Clearing a browser session and revoking an issued credential are different operations.' }
    ],
    sources: [{ title: 'GitHub Docs · Managing personal access tokens', url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens' }]
  },
  {
    id: 'model-council', title: 'The Model Council', chapter: 'III · Share responsibility', minutes: 5,
    skill: 'AI privacy & uncertainty', requires: ['keykeepers'], practice: '/arcade/matrix_of_consciousness_match_3_game.html',
    summary: 'Compare local and cloud tools before the council shares a document.',
    story: [
      'The council wants a summary of an inspection report. One tool runs a downloaded model locally; another sends the request to a cloud API. The fastest response is attractive, but Ada asks what information leaves the room.',
      'A local model can keep inference on your machine when it is truly using local weights and local services. Cloud requests send their input to the selected provider under that service’s policies and account terms. Check the actual backend, configuration, and permissions; a product name alone is not evidence that a request stays local.',
      'The companion keeps provider choice explicit and does not silently retry a private conversation with another provider. AI output can still be mistaken, incomplete, or unsupported. Compare claims with relevant evidence, remove unneeded sensitive information from prompts, and ask permission before sharing data that belongs to someone else.'
    ],
    reflection: 'What would you need to know before sending the report? Which claims in the model’s answer would need independent checking?',
    responses: [
      { title: 'Send the entire report immediately', outcome: 'The answer may arrive quickly, but the council has not considered permission or whether all of that data is needed.' },
      { title: 'Choose the backend and minimize input', outcome: 'The council makes the data path explicit and shares only the information appropriate for the task.' }
    ],
    questions: [
      { prompt: 'Why should a local request not silently fall back to a cloud provider?', options: ['Local models always know the truth', 'It could change who receives the data and what the request costs', 'Cloud services cannot receive text'], answer: 1, explanation: 'Backend changes can affect data handling, permissions, and billing.' },
      { prompt: 'What should you do with an important AI claim?', options: ['Accept it because it sounds confident', 'Treat a game badge as proof', 'Check it against relevant evidence'], answer: 2, explanation: 'Confidence in wording is not a substitute for evidence.' },
      { prompt: 'What is a useful prompt-preparation step?', options: ['Remove unnecessary sensitive information and check sharing permission', 'Add every credential for context', 'Copy another user’s private files'], answer: 0, explanation: 'Minimize data and respect the rights of the people it concerns.' }
    ],
    sources: [{ title: 'OpenAI · Production best practices', url: 'https://developers.openai.com/api/docs/guides/production-best-practices' }]
  },
  {
    id: 'review-gate', title: 'The Review Gate', chapter: 'III · Share responsibility', minutes: 5,
    skill: 'Verification & accountable automation', requires: ['model-council'], practice: '/arcade/academy/#cyber',
    summary: 'Bring evidence to the final guardian before the next system change.',
    story: [
      'At the Review Gate, the guardian receives a message: “Deployment complete.” There is no link, status, or test result. Pip is ready to celebrate. Mira asks whether anyone has actually checked the result.',
      'Separate an intention, an attempted action, and a verified outcome. A launched setup picker does not prove that a key was saved. A passing unit test does not prove that an entire deployed site works. Match each claim to evidence at the same scope: follow the actual user path, observe failures, and check the resulting state.',
      'An approval should describe a concrete action within the host’s permissions. It cannot override denied policy or grant unrelated access. Before a meaningful change, inspect the diff, expected effect, and recovery plan. Afterward, verify the result. In this fictional world, a trusted guardian earns trust by making decisions inspectable and revisable, not by claiming perfection.'
    ],
    reflection: 'What evidence would let another person verify your completion claim without relying on your confidence?',
    responses: [
      { title: 'Approve an unnamed action', outcome: 'The team cannot tell what it agreed to. A concrete request makes the intended change reviewable.' },
      { title: 'Review the change and check the outcome', outcome: 'The guardian can connect the action to evidence and spot problems before calling the work complete.' }
    ],
    questions: [
      { prompt: 'Which statement proves a key was saved?', options: ['A setup window opened', 'The key name was suggested', 'A successful secure write was verified at the approved destination'], answer: 2, explanation: 'Starting setup and completing a verified write are different states.' },
      { prompt: 'What should a broad completion claim rely on?', options: ['Evidence covering the actual user flow and resulting state', 'Only an unrelated green test', 'The amount of text in a report'], answer: 0, explanation: 'Verification scope should match the scope of the claim.' },
      { prompt: 'Can a companion approval override a denied host policy?', options: ['Yes, if the player has enough XP', 'No; host permissions remain authoritative', 'Only after a story ending'], answer: 1, explanation: 'A local learning achievement does not change real authorization boundaries.' }
    ],
    sources: [{ title: 'Microsoft Learn · What is PowerShell?', url: 'https://learn.microsoft.com/powershell/scripting/overview' }]
  },
  {
    id:'living-weave',title:'The Living Weave',chapter:'IV · Become a guardian',minutes:5,skill:'Synthesis, memory & stewardship',requires:['review-gate'],practice:'/arcade/nexus/',
    summary:'Help Electra carry Spark and Shadow together without erasing a community’s voice.',
    story:[
      'Ella opens the Living Archive. Before the Matrix was created, people recorded not only victories but the moments when they stopped listening. She preserves those human memories, guides Electra, and protects the children of the Remnant. Her oldest fragment is a warning: the first failure was not the machines, but humanity forgetting how to listen.',
      'Noah carries the Shadow Spark: not evil, but heavy with difficult truth. Electra must combine it with the Spark without treating pain as something to erase. A shared memory can inform a plan, but no single record contains every person’s experience. Ask whose perspective is absent, check what the evidence supports, and leave a way to revise the decision.',
      'In the Nexus canon, the Human Patch restores room for feeling, memory, and free choice. Beyond Sparkfall, Deep Code emerges as a mythic manifestation of collective memory—not a technical claim about AI or human consciousness. Electra’s Conscience Weaver transformation represents responsibility for connection. Your seven learning stars unlock the Audio Vault and Sparkfall Uprising so you can test these ideas in the next story.'
    ],
    reflection:'Which memory would you preserve even if it challenged your preferred plan? How can a guardian remain accountable to the people it protects?',
    responses:[{title:'Erase painful memories to keep order',outcome:'The city may appear calm, but its people lose part of their own history and the ability to learn from it.'},{title:'Preserve memory and make room to listen',outcome:'The community faces harder conversations while retaining the evidence and freedom needed to choose its future.'}],
    questions:[
      {prompt:'What does Ella’s oldest archive fragment warn about?',options:['That every machine is inherently evil','That humanity had forgotten how to listen','That no one should keep memories'],answer:1,explanation:'The central theme asks people to recover listening and shared responsibility rather than blaming technology alone.'},
      {prompt:'How should Electra treat the Shadow Spark?',options:['As difficult truth to understand alongside the Spark','As proof that all memories are accurate','As a reason to erase every disagreement'],answer:0,explanation:'The canon presents the Shadow Spark as heavy with truth, not simply evil. Evidence and perspective still need care.'},
      {prompt:'What does Conscience Weaver mean in this fictional learning story?',options:['A real professional certification','Permission to control other people','Stewardship of memory, connection, and accountable choices'],answer:2,explanation:'It is a narrative transformation and learning metaphor, not a claim of technical or spiritual authority.'}
    ],
    sources:[{title:'Nexus Arcade Canon · Sparkfall Uprising',url:'/arcade/nexus/'}]
  },

];
export const journeyById=id=>JOURNEYS.find(lesson=>lesson.id===id);

export const CONSCIENCE_STARS=[
 {journey:'signal-watch',frequency:'Awareness',character:'Electra'},
 {journey:'object-courier',frequency:'Memory',character:'Noah'},
 {journey:'quoted-bridge',frequency:'Empathy',character:'Echo Children'},
 {journey:'keykeepers',frequency:'Courage',character:'Sparkfall Rebellion'},
 {journey:'model-council',frequency:'Wisdom',character:'Ella · Keeper of the Living Archive'},
 {journey:'review-gate',frequency:'Unity',character:'Human Patch'},
 {journey:'living-weave',frequency:'Transcendence',character:'Electra · Conscience Weaver'}
];
