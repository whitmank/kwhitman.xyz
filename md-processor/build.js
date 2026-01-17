const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT_DIR = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, 'posts');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const STATIC_DIR = path.join(ROOT_DIR, 'static');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist');

// Parse front matter from markdown
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });
  return { meta, body: match[2] };
}

// Simple template replacement
function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Main build function
function build() {
  // Load templates
  const baseTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'base.html'), 'utf-8');
  const postTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'post.html'), 'utf-8');
  const indexTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf-8');

  // Setup output directories
  ensureDir(OUTPUT_DIR);
  ensureDir(path.join(OUTPUT_DIR, 'posts'));

  // Copy static files
  if (fs.existsSync(STATIC_DIR)) {
    fs.readdirSync(STATIC_DIR).forEach(file => {
      fs.copyFileSync(path.join(STATIC_DIR, file), path.join(OUTPUT_DIR, file));
    });
  }

  // Process posts
  const posts = [];

  if (fs.existsSync(POSTS_DIR)) {
    fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
        const { meta, body } = parseFrontMatter(content);
        const slug = file.replace('.md', '');
        const html = marked(body);

        posts.push({
          title: meta.title || slug,
          date: meta.date || '',
          slug,
          html
        });

        // Render post page
        const postContent = render(postTemplate, {
          title: meta.title || slug,
          date: meta.date || '',
          content: html
        });
        const postPage = render(baseTemplate, {
          title: meta.title || slug,
          content: postContent
        });

        fs.writeFileSync(path.join(OUTPUT_DIR, 'posts', `${slug}.html`), postPage);
        console.log(`Built: posts/${slug}.html`);
      });
  }

  // Sort posts by date (newest first)
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Generate post list HTML
  const postListHtml = posts.map(p =>
    `<article class="post-preview">
      <a href="posts/${p.slug}.html">
        <h2>${p.title}</h2>
        ${p.date ? `<time>${p.date}</time>` : ''}
      </a>
    </article>`
  ).join('\n');

  // Render index page
  const indexContent = render(indexTemplate, { posts: postListHtml });
  const indexPage = render(baseTemplate, { title: 'Home', content: indexContent });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexPage);
  console.log('Built: index.html');
  console.log(`\nDone! ${posts.length} posts built.`);
}

build();
