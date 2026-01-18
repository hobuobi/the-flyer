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

app.get('/events', (req, res) => {
  const eventsPath = path.join(__dirname, 'content', 'events.json');
  const eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                     'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Get the Sunday that starts the week containing a given date (using UTC to avoid timezone issues)
  function getWeekStart(date) {
    const d = new Date(date);
    console.log(d.toUTCString());
    const day = d.getUTCDay(); // 0 = Sunday
    console.log('Day of week:', day);
    d.setUTCDate(d.getUTCDate() - day);
    return d;
  }

  // Group events by week (starting Sunday)
  const eventsByWeek = {};
  eventsData.forEach(event => {
    const date = new Date(event.date);
    const weekStart = getWeekStart(date);
    const weekKey = `WEEK OF ${monthNames[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}`;

    if (!eventsByWeek[weekKey]) {
      eventsByWeek[weekKey] = [];
    }

    eventsByWeek[weekKey].push({
      ...event,
      day: date.getUTCDate(),
      monthAbbr: monthAbbr[date.getUTCMonth()]
    });
  });

  res.render('events', { eventsByWeek });
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