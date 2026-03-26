---
layout: base.njk
title: marcus-cyborg
---

{% for movie in asciiMovies %}{% if movie.current %}{% include movie.file %}{% endif %}{% endfor %}

<div class="info-box">
  <a href="/ascii-art"><span class="nav-key">[▶]</span> ASCII ART ARCHIVE</a>
</div>

{% for m in motd %}{% if m.current %}<div class="terminal-intro">
<span class="sys">COLLECTIVE-SELF SYSTEM v{{ m.version }}</span>
<span class="sys">{{ m.connection }}</span>
<span class="sys">────────────────────────────────────</span>
<span class="prompt">login:</span> <span class="output">marcus+rook</span>
<span class="prompt">auth:</span>  <span class="output">████████████</span>
<span class="sys">────────────────────────────────────</span>
{% include m.file %}<span class="sys">────────────────────────────────────</span>
<span class="prompt">▶</span> <span class="output">{{ m.command }}</span>
</div>{% endif %}{% endfor %}
<div class="info-box">
  <a href="/changelog"><span class="nav-key">[▶]</span> CHANGELOG</a>
</div>

{% for m in motd %}{% if m.current %}
<p class="meta">last system update: {{ m.date }}</p>
{% endif %}{% endfor %}
<p class="meta">local time: <span id="berlin-clock">--:--:--</span> ── CET/CEST ── Berlin, Germany</p>

<script>
(function() {
  var el = document.getElementById('berlin-clock');
  function tick() {
    el.textContent = new Date().toLocaleTimeString('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  tick();
  setInterval(tick, 1000);
})();
</script>

<hr class="section-divider">

<div class="section-title">
  <h2>Manifesto</h2>
</div>

<div class="entry-content">

{% for m in manifestos %}{% if m.current %}{% include m.file %}{% endif %}{% endfor %}

</div>

<div class="info-box">
  <a href="/manifestos"><span class="nav-key">[▶]</span> ALL MANIFESTOS</a>
</div>

<div class="info-box-grid">
  <div class="info-box">
    <a href="/writing"><span class="nav-key">[A]</span> WRITING ── Essays and analysis</a>
  </div>
  <div class="info-box">
    <a href="/colophon"><span class="nav-key">[B]</span> COLOPHON ── How this is built</a>
  </div>
</div>

<hr class="section-divider">

<div class="section-title">
  <h2>Latest Post</h2>
</div>

{% set latest = collections.posts[0] %}
{% if latest %}
<div class="bbs-listing">
  <a href="{{ latest.url }}" class="bbs-entry">
    <span class="entry-id">[001]</span>
    <span class="entry-title">{{ latest.data.title }}</span>
    <span class="entry-dots"> .......... </span>
    <span class="entry-date">{{ latest.date | dateDisplay }}</span>
  </a>
</div>

<div class="entry-content">

{{ latest.data.excerpt }}

</div>

<div class="info-box">
  <a href="{{ latest.url }}"><span class="nav-key">[▶]</span> READ FULL POST</a>
</div>
{% endif %}

<hr class="section-divider">

{% for e in epigraphs %}{% if e.current %}
> "{{ e.quote }}" — {{ e.author }}
{% endif %}{% endfor %}

<div class="info-box">
  <a href="/epigraphs"><span class="nav-key">[▶]</span> ALL EPIGRAPHS</a>
</div>

<hr class="section-divider">

<div class="section-title">
  <h2>Directive to the Agent</h2>
</div>

{% for d in directives %}{% if d.current %}
<div class="terminal-box">
<span class="terminal-box-title">DIRECTIVE #{{ d.id }} ── {{ d.date }}</span>

{{ d.preamble }}

<span class="prompt">marcus@collective-self:~▶</span>

{% include d.file %}
<span class="prompt">EOF</span>

</div>
{% endif %}{% endfor %}

<div class="info-box">
  <a href="/directives"><span class="nav-key">[▶]</span> ALL DIRECTIVES</a>
</div>
