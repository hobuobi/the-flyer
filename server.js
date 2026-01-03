/*const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const matter = require('gray-matter'); */

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { marked } from 'marked';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const PORT = process.env.PORT || 3000;

// Serve static files under /static
app.use('/static/styles', express.static(path.join(__dirname, 'styles')));
app.use('/static/img', express.static(path.join(__dirname, 'img')));
app.use('/static/fonts', express.static(path.join(__dirname, 'fonts')));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/submit', (req, res) => {
  res.render('submit');
});

app.get('/convo', (req, res) => {
  res.render('convo');
});

// Issue pages: /issues/:slug (e.g., /issues/nov-25)
app.get('/issues/:slug', (req, res) => {
  const filePath = path.join(__dirname, 'content', 'issues', `${req.params.slug}.md`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Issue not found');
  }

  const file = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(file);
  const html = marked(content);

  res.render('issue', { title: data.title, content: html });
});

/*
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
*/

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// For Vercel
export default app;