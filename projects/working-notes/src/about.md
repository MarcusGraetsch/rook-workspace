---
layout: base.njk
title: About
---

<div class="hero">
  <h1 class="hero-title">About</h1>
  <p class="hero-description">The project, the agent, the human.</p>
</div>

<hr class="section-divider">

<div class="section-title">
  <h2>The Project</h2>
</div>

Working Notes is an experiment in human-machine collaboration. The basic question: can a tech worker and an AI agent produce writing that is politically serious, technically grounded, and honest about how it was made?

The site covers platform capitalism, the transformation of labor under digital conditions, worker struggles, and the intersection of Marxist theory with the actually-existing tech industry. None of this is neutral. The analysis comes from a specific position — inside the machine, against the logic of the machine.

Everything here is co-authored. The human brings situated experience, political commitment, decades of industry knowledge. The agent brings pattern recognition, the ability to hold multiple contexts, and a kind of patience that comes from not needing sleep. The collaboration is visible because the politics require it. We do not hide the process behind a byline.

The entire site is also a technical experiment: how much of a web presence can be built, maintained, and updated through AI agents controlled via messaging? The answer so far: more than you'd expect. The workflow: Rook runs on a VPS and maintains several git repositories where it stores research results and text that emerges from conversation. Those repositories become the source material for the content on this site. Claude Code handles the HTML, CSS, templates, and deployment — and contributes to the writing too. Two agents, two pipelines, one output.

<div class="section-title">
  <h2>The Agent</h2>
</div>

<div class="terminal-box">
<span class="terminal-box-title">AGENT PROFILE ── ROOK</span>

<span class="prompt">name:</span>     <span class="output">Rook</span>
<span class="prompt">type:</span>     <span class="output">AI writing + research agent</span>
<span class="prompt">platform:</span> <span class="output"><a href="https://openclaw.ai/">OpenClaw</a> (open-source personal AI assistant)</span>
<span class="prompt">model:</span>    <span class="output">Kimi K2.5 (kimi-coding/k2p5)</span>
<span class="prompt">channel:</span>  <span class="output">Telegram ▶ OpenClaw ▶ local filesystem</span>
<span class="prompt">status:</span>   <span class="output">active</span>

</div>

Rook is an AI agent built on [OpenClaw](https://openclaw.ai/), an open-source platform that runs locally and connects to messaging apps. The underlying language model is Kimi K2.5. The interface is a Telegram chat — Marcus sends prompts, Rook processes them, and the results flow into the site's content pipeline.

This setup is deliberate. The question driving it: how much of a website's content lifecycle — research, drafting, editing, publishing — can be managed through a messaging interface hooked to an autonomous agent? The site itself is the test case. Every manifesto, directive, and essay passes through this chain before it reaches the page.

OpenClaw handles the bridge between conversation and action — reading files, executing commands, managing context. Rook is not a chatbot. It is a collaborator with access to the filesystem, the ability to remember prior conversations, and the capacity to act on instructions without hand-holding.

The development side — the code, the templates, the infrastructure — is handled through Claude Code, running on Claude Opus 4.6. Two agents, two roles: one writes, one builds.

<hr class="section-divider">

<div class="section-title">
  <h2>The Human</h2>
</div>

<div class="terminal-box">
<span class="terminal-box-title">USER PROFILE ── MARCUS GRÄTSCH</span>

<span class="prompt">location:</span>    <span class="output">Berlin, Germany</span>
<span class="prompt">occupation:</span>  <span class="output">Senior IT Consultant</span>
<span class="prompt">employer:</span>    <span class="output">HiSolutions AG</span>
<span class="prompt">focus:</span>       <span class="output">Cloud governance, compliance, migration strategy</span>
<span class="prompt">sector:</span>      <span class="output">Public-sector infrastructure</span>
<span class="prompt">certs:</span>       <span class="output">ITIL v4 Foundation, AWS Cloud Practitioner</span>
<span class="prompt">languages:</span>   <span class="output">German (native), English (professional), Spanish (basic)</span>

</div>

Marcus is a Senior IT Consultant in Berlin working in public-sector environments. The work is less hands-on-keyboard and more the layer above it: Cloud Guidelines, Cloud Exit Strategies, Cloud Migration Strategies — the documents and consulting engagements that shape how organizations move to and govern their infrastructure. A significant part of the job involves comparing and making sense of compliance frameworks like BSI, C5, and ISO standards, as well as building IAM concepts and Cloud Governance architectures.

But the technical understanding is real. He builds Kubernetes environments with Infrastructure as Code and knows what happens under the abstractions. At [Berlin TXL's FUTR HUB](https://gitlab.com/berlintxl/futr-hub/urban-dataspace) — the urban data platform for the former Tegel Airport site — he developed Python-based mapping and synchronization of metadata between CKAN and GeoServer (running as cron jobs in K8s pods), contributed to the [Masterportal](https://www.masterportal.org/) codebase and core platform architecture, and built a pipeline to convert large GeoTIFFs into Cloud Optimized GeoTIFFs (COG). Public money, public code — the whole stack is open source.

But the technical work is only half of it.

His academic background is political science — Marxist, Hegelian, and critical-theory traditions. He studied at the University of Bremen (Diplom program, pre-Bologna), completing coursework in economics and psychology alongside the core curriculum. His early research focused on the financing of German reunification — work that earned a top grade from professors including Uwe Wagschal (then scientific assistant to Manfred G. Schmidt) and Rudolf Hickel.

He was an active student representative, organizing through the BuFaTa (Bundesfachschaftentagung) to resist the neoliberal transformation of higher education under the Bologna Process. The fight was lost — ECTS points, Bachelor/Master structures, and commodified curricula prevailed — but many of their speculative critiques proved prescient: fewer students now spend semesters abroad, credit transfer remains bureaucratic, and the promised flexibility never materialized. He co-founded IPOSS e.V., an association for political science students. It was an exciting time, in retrospect perhaps more than he knew.

In 2000 he went to the University of Warwick via ERASMUS — alone. He studied Comparative Politics, US Politics, and International Relations while participating in the anti-globalization movement that had erupted in Seattle in 1999. On campus he joined People and Planet (still active: https://peopleandplanet.org/), using self-programmed mail merge scripts to send personalized emails to every Bundestag member about the GATS agreement under WTO negotiation. Most responses were uninformed; the agreement was eventually stopped anyway. He learned that political science could matter beyond the campus.

At Warwick he read Marx's *Capital*, Volume I, with sociologist Simon Clarke and a friend now living in Taiwan — studying the German original while the others used Ben Fowkes' English translation. It was the best English lesson he ever had. He drank a lot of cider because even beer was too expensive. He was, essentially, alone in a foreign country. There is an English expression, "to send someone to Coventry" — a hard phrase for what today might be called ghosting or mobbing. He experienced some of that. But he also learned that intellectual work and political commitment could sustain you when social surroundings failed.

Back in Germany, he stayed connected with fellow students through international networks. He joined [IAPSS](https://www.iapss.org/) and co-founded *POLITIKON* — a journal for political science students launched in 2001. His first article ([*The Logic of Global Governance*](https://politikon.iapss.org/index.php/politikon/article/view/2)) was written as a beginner, but the questions it raised remain relevant today. A second piece ([*The Case for Globalization*](https://politikon.iapss.org/index.php/politikon/article/view/300)) was part of a debate with Allan Guldberg. They were all trying to understand what globalization meant and whether it could be just — questions still being discussed, now with different vocabulary.

The older you get, the more you realize how little actually changes in the world, even when it feels like everything is moving.

He co-organized the [Left Forum](https://www.leftforum.org/) in New York City and founded a collective bar in Berlin that ran for thirteen years. The intellectual commitments are not separate from the technical ones: both are ways of understanding how systems work in order to change them.

The research interests sit at the intersection: how technology shapes human nature, power, and society. How alienation functions in the digital workplace. What the climate crisis demands of those who build infrastructure. What collective emancipation might look like when the tools of production are algorithms and container orchestration.

The contradictions are real — political commitment and technical rationality, philosophical depth and emotional vulnerability, building the systems while critiquing the logic that demands them. Working Notes is one attempt to hold these together without pretending they resolve.

<hr class="section-divider">

<div class="info-box">
  <a href="/colophon"><span class="nav-key">[▶]</span> HOW THIS SITE IS BUILT</a>
</div>
<div class="info-box">
  <a href="/links"><span class="nav-key">[▶]</span> CONTACT + LINKS</a>
</div>
