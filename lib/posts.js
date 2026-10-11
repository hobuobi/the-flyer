// Single source of truth for posts and issues. Routes only talk to these
// exports, so the storage behind them (markdown files today) can change later,
// e.g. to a database that a submission form writes into.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { marked } from 'marked';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
const ISSUES_DIR = path.join(CONTENT_DIR, 'issues');

const TYPES = ['text', 'image', 'video'];
const TIMEZONE = 'America/Los_Angeles';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE, month: 'short', day: 'numeric', year: 'numeric'
});

function readMarkdownDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ slug: f.replace(/\.md$/, ''), ...matter(fs.readFileSync(path.join(dir, f), 'utf-8')) }));
}

// Returns a list of problems with a post's frontmatter (empty if valid).
function validate(data, date) {
  const problems = [];
  const type = data.type || 'text';
  if (!TYPES.includes(type)) problems.push(`unknown type "${type}"`);
  if (Number.isNaN(date.getTime())) problems.push('missing or invalid date');
  if (!data.author) problems.push('missing author');
  if (type === 'text' && !data.title) problems.push('text posts need a title');
  if ((type === 'image' || type === 'video') && !data.media) problems.push(`${type} posts need media`);
  return problems;
}

// YouTube/Vimeo links become iframe embeds; anything else plays in <video>.
function videoEmbedUrl(url) {
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

function loadIssues() {
  return readMarkdownDir(ISSUES_DIR).map(({ slug, data }) => {
    const date = new Date(data.date);
    return {
      slug,
      title: data.title || slug,
      date,
      // Issue dates are plain YYYY-MM-DD (parsed as UTC midnight), so label in UTC, e.g. "NOVEMBER 2025"
      label: date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).toUpperCase(),
      cover: data.cover || null
    };
  });
}

function loadPosts(issues) {
  const issueTitles = Object.fromEntries(issues.map(i => [i.slug, i.title]));
  const posts = [];

  for (const { slug, data, content } of readMarkdownDir(POSTS_DIR)) {
    if ((data.status || 'published') !== 'published') continue;

    const date = new Date(data.date);
    const problems = validate(data, date);
    if (problems.length) {
      console.warn(`Skipping post "${slug}": ${problems.join(', ')}`);
      continue;
    }

    const type = data.type || 'text';
    posts.push({
      slug,
      type,
      title: data.title || null,
      date,
      displayDate: dateFormatter.format(date),
      author: data.author,
      tags: data.tags || [],
      issue: data.issue || null,
      issueTitle: data.issue ? issueTitles[data.issue] || data.issue : null,
      order: data.order ?? 0,
      media: data.media || null,
      embedUrl: type === 'video' && data.media ? videoEmbedUrl(data.media) : null,
      alt: data.alt || '',
      html: marked(content)
    });
  }

  return posts.sort((a, b) => b.date - a.date || a.order - b.order);
}

// Content only changes on deploy, so cache in production; reload on every
// request locally so edits show up without restarting the server.
let cache = null;
function load() {
  if (cache && process.env.NODE_ENV === 'production') return cache;
  const issues = loadIssues();
  cache = { issues, posts: loadPosts(issues) };
  return cache;
}

export function getPosts({ tag, issue, limit } = {}) {
  let posts = load().posts;
  if (tag) posts = posts.filter(p => p.tags.includes(tag));
  if (issue) posts = posts.filter(p => p.issue === issue);
  return limit ? posts.slice(0, limit) : posts;
}

export function getPost(slug) {
  return load().posts.find(p => p.slug === slug) || null;
}

// Issues newest first, each with its posts in issue order.
export function getIssues() {
  return load().issues
    .map(issue => ({ ...issue, posts: getPosts({ issue: issue.slug }).sort((a, b) => a.order - b.order) }))
    .sort((a, b) => b.date - a.date);
}

export function getIssue(slug) {
  return getIssues().find(i => i.slug === slug) || null;
}
