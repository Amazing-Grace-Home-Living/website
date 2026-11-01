import { playerProfile } from './profile.js';

function nextStep(profile) {
  if (!profile.xp) return ['/lms/', 'Start with Learn & Play'];
  if (profile.games.powershellDefense.lessons < 4) return ['/arcade/powershell-defense/', 'Continue PowerShell Defense'];
  if (!profile.games.vimDefense.xp) return ['/arcade/vim-defense/', 'Try VIM / Bash Defense'];
  if (!profile.games.classicMatrix.xp && !profile.games.match3Academy.xp) return ['/arcade/matrix-of-conscience/', 'Enter Matrix of Conscience'];
  return ['/lms/#missions', 'Continue the defense campaign'];
}

export class ArcadeProfile extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;margin:1rem 0;font:15px system-ui;color:#e6efff}
      section{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border:1px solid #304c70;background:#0b1728;padding:1rem;border-radius:14px}
      p{margin:0;line-height:1.7}small{color:#acbdd2}a{color:#a9d5ff;min-height:44px;display:inline-flex;align-items:center}strong{color:#8ee5c7}
      .continue{border-top:1px solid #304c70;padding-top:.7rem;flex-basis:100%;display:flex;justify-content:space-between;gap:1rem;align-items:center}
      .continue small{display:block}.continue a{font-weight:700;white-space:nowrap}
      @media(max-width:560px){.continue{display:block}.continue a{margin-top:.35rem}}
    </style><section aria-label="Shared arcade profile">
      <p><strong id="player"></strong><br><small id="stats"></small></p>
      <a href="/arcade/academy/">Profile, badges &amp; Cyber Planet →</a>
      <div class="continue"><div><small>YOUR NEXT STEP</small><span id="next-copy"></span></div><a id="next-link"></a></div>
    </section>`;
    this.refresh = () => {
      const profile = playerProfile();
      const [href, label] = nextStep(profile);
      this.shadowRoot.getElementById('player').textContent = `${profile.player} · ${profile.rank}`;
      this.shadowRoot.getElementById('stats').textContent = `${profile.xp} shared XP · level ${profile.level} · ${profile.badges.length} badges`;
      const link = this.shadowRoot.getElementById('next-link');
      link.href = href;
      link.textContent = `${label} →`;
      this.shadowRoot.getElementById('next-copy').textContent = profile.xp ? ' Keep building your shared campaign.' : ' Begin with a short lesson.';
    };
    window.addEventListener('storage', this.refresh);
    window.addEventListener('academy-progress', this.refresh);
    this.refresh();
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this.refresh);
    window.removeEventListener('academy-progress', this.refresh);
  }
}

if (!customElements.get('arcade-profile')) customElements.define('arcade-profile', ArcadeProfile);

if (location.pathname === '/arcade/' || location.pathname === '/arcade/index.html') {
  const nav = document.querySelector('header nav');
  if (nav && ![...nav.querySelectorAll('a')].some(a => a.getAttribute('href') === '/arcade/tools/')) {
    const link = document.createElement('a');
    link.href = '/arcade/tools/';
    link.textContent = 'Tools & AI';
    nav.append(link);
  }
}
