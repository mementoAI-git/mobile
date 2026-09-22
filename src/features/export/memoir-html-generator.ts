import type { IMemory, ICapsule, IUser } from '@/types';

interface MemoirExportData {
  user?: Partial<IUser> | null;
  stories: IMemory[];
  capsules: ICapsule[];
  totalWords: number;
}

export function generateMemoirHtml({
  user,
  stories,
  capsules,
  totalWords,
}: MemoirExportData): string {
  const authorName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Private Author';
  const exportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const currentYear = new Date().getFullYear();

  const storiesHtml = stories
    .map((story, index) => {
      const storyDate = story.created_at
        ? new Date(story.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Undated Reflection';

      const tagsPills = (story.tags || [])
        .map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`)
        .join(' ');

      // Format body text with paragraphs
      const rawBody = (story.body || '').trim();
      const firstLetter = rawBody.charAt(0);
      const remainingFirstPara = rawBody.slice(1).split('\n\n')[0] || '';
      const otherParas = rawBody.split('\n\n').slice(1);

      let bodyHtml = '';
      if (rawBody.length > 0) {
        bodyHtml += `<p class="first-paragraph"><span class="drop-cap">${escapeHtml(firstLetter)}</span>${escapeHtml(remainingFirstPara)}</p>`;
        otherParas.forEach((p) => {
          if (p.trim()) {
            bodyHtml += `<p>${escapeHtml(p.trim())}</p>`;
          }
        });
      }

      // Attachments preview
      let imagesHtml = '';
      const imageFiles = (story.attachments || []).filter((a) => a.type?.startsWith('image/'));
      if (imageFiles.length > 0) {
        imagesHtml = `<div class="story-gallery">
          ${imageFiles
            .map(
              (img) =>
                `<div class="gallery-image"><img src="${escapeHtml(img.url)}" alt="${escapeHtml(
                  img.name || 'Memory photo'
                )}" /></div>`
            )
            .join('')}
        </div>`;
      }

      return `
        <article class="chapter">
          <div class="chapter-meta">
            <span class="chapter-number">CHAPTER ${index + 1}</span>
            <span class="chapter-date">${storyDate}</span>
          </div>
          <h2 class="chapter-title">${escapeHtml(story.title || 'Untitled Moment')}</h2>
          ${tagsPills ? `<div class="chapter-tags">${tagsPills}</div>` : ''}
          <div class="chapter-body">
            ${bodyHtml}
          </div>
          ${imagesHtml}
          <div class="chapter-divider">✦ ✦ ✦</div>
        </article>
      `;
    })
    .join('\n');

  const capsulesHtml =
    capsules.length > 0
      ? `
      <section class="capsules-appendix">
        <h2 class="appendix-title">Registry of Time Capsules</h2>
        <p class="appendix-desc">The following time capsules remain sealed and scheduled for future delivery in the private vault:</p>
        <div class="capsules-grid">
          ${capsules
            .map((c, i) => {
              const unlockDate = c.schedule_date
                ? new Date(c.schedule_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Scheduled';
              const recipients = (c.recipients || [])
                .map((r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email)
                .join(', ') || 'Designated Beneficiaries';
              return `
                <div class="capsule-card">
                  <span class="capsule-tag">SEALED CAPSULE ${i + 1}</span>
                  <h3 class="capsule-title">${escapeHtml(c.title || 'Time Capsule')}</h3>
                  <div class="capsule-detail"><strong>Unlock Date:</strong> ${unlockDate}</div>
                  <div class="capsule-detail"><strong>Recipients:</strong> ${escapeHtml(recipients)}</div>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(authorName)} — Personal Memoir</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #FAF7F2;
      --card-bg: #FFFFFF;
      --text-strong: #170B00;
      --body-text-color: rgba(23, 11, 0, 0.72);
      --text-muted: rgba(23, 11, 0, 0.45);
      --brand: #E98246;
      --stroke: rgba(23, 11, 0, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--body-text-color);
      line-height: 1.8;
      font-size: 16px;
      padding: 40px 20px;
    }
    .page-container {
      max-width: 760px;
      margin: 0 auto;
      background-color: var(--card-bg);
      padding: 64px 56px;
      border-radius: 24px;
      box-shadow: 0 8px 30px rgba(23, 11, 0, 0.06);
      border: 1px solid var(--stroke);
    }
    /* Cover Page */
    .cover-page {
      text-align: center;
      padding: 80px 20px 100px;
      border-bottom: 2px solid var(--stroke);
      margin-bottom: 60px;
    }
    .cover-monogram {
      width: 64px;
      height: 64px;
      border-radius: 32px;
      background: rgba(233, 130, 70, 0.15);
      color: var(--brand);
      font-family: 'EB Garamond', serif;
      font-size: 28px;
      line-height: 64px;
      margin: 0 auto 28px;
    }
    .cover-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: 16px;
    }
    .cover-title {
      font-family: 'EB Garamond', serif;
      font-size: 42px;
      font-weight: 500;
      color: var(--text-strong);
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .cover-subtitle {
      font-size: 16px;
      color: var(--text-muted);
      max-width: 480px;
      margin: 0 auto 36px;
    }
    .cover-meta {
      font-size: 13px;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    /* Chapters */
    .chapter {
      margin-bottom: 64px;
    }
    .chapter-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .chapter-number {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--brand);
    }
    .chapter-date {
      font-size: 12px;
      color: var(--text-muted);
    }
    .chapter-title {
      font-family: 'EB Garamond', serif;
      font-size: 28px;
      font-weight: 500;
      color: var(--text-strong);
      line-height: 1.3;
      margin-bottom: 12px;
    }
    .chapter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 24px;
    }
    .tag-pill {
      font-size: 11px;
      font-weight: 600;
      background: rgba(23, 11, 0, 0.04);
      color: var(--text-muted);
      padding: 2px 10px;
      border-radius: 999px;
    }
    .chapter-body p {
      margin-bottom: 20px;
      color: rgba(23, 11, 0, 0.82);
    }
    .first-paragraph {
      position: relative;
    }
    .drop-cap {
      float: left;
      font-family: 'EB Garamond', serif;
      font-size: 52px;
      line-height: 44px;
      padding-top: 4px;
      padding-right: 10px;
      padding-bottom: 2px;
      color: var(--brand);
    }
    .story-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin: 24px 0;
    }
    .gallery-image img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
    }
    .chapter-divider {
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
      letter-spacing: 6px;
      margin-top: 48px;
    }
    /* Capsules */
    .capsules-appendix {
      margin-top: 60px;
      padding-top: 40px;
      border-top: 2px solid var(--stroke);
    }
    .appendix-title {
      font-family: 'EB Garamond', serif;
      font-size: 26px;
      color: var(--text-strong);
      margin-bottom: 8px;
    }
    .appendix-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }
    .capsules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .capsule-card {
      background: var(--bg);
      border: 1px solid var(--stroke);
      border-radius: 16px;
      padding: 16px;
    }
    .capsule-tag {
      font-size: 10px;
      font-weight: 700;
      color: var(--brand);
      letter-spacing: 1.5px;
      display: block;
      margin-bottom: 6px;
    }
    .capsule-title {
      font-family: 'EB Garamond', serif;
      font-size: 18px;
      color: var(--text-strong);
      margin-bottom: 8px;
    }
    .capsule-detail {
      font-size: 12px;
      color: var(--body-text-color);
      margin-bottom: 4px;
    }
    /* Footer Colophon */
    .colophon {
      text-align: center;
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1px solid var(--stroke);
      font-size: 12px;
      color: var(--text-muted);
    }
    @media print {
      body { background: #FFF; padding: 0; font-size: 12pt; }
      .page-container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .chapter { page-break-inside: avoid; }
      .cover-page { page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <header class="cover-page">
      <div class="cover-monogram">${escapeHtml(authorName.charAt(0) || 'M')}</div>
      <div class="cover-kicker">PERSONAL MEMOIR ARCHIVE</div>
      <h1 class="cover-title">The Collected Stories of ${escapeHtml(authorName)}</h1>
      <p class="cover-subtitle">A permanent heirloom of personal reflections, family memories, and lived wisdom.</p>
      <div class="cover-meta">
        <span>${stories.length} Stories</span> · <span>${totalWords.toLocaleString()} Words</span> · <span>${exportDate}</span>
      </div>
    </header>

    <main class="chapters-container">
      ${storiesHtml}
    </main>

    ${capsulesHtml}

    <footer class="colophon">
      <p>Compiled and archived from Memento Personal Legacy Vault on ${exportDate}.</p>
      <p style="margin-top: 4px;">Zero-knowledge encrypted · Privately owned by ${escapeHtml(authorName)} &copy; ${currentYear}</p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
