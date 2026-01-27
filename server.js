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

  // Sort events chronologically
  eventsData.sort((a, b) => new Date(a.date) - new Date(b.date));

  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                     'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Parse date string as local time (handles both "2026-01-25" and "1/25/2026" formats)
  function parseLocalDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d;
  }

  // Get the Sunday that starts the week containing a given date (local time)
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    d.setDate(d.getDate() - day);
    return d;
  }

  // Get today's date for comparison (local time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Filter to only show current and future events
  const futureEvents = eventsData.filter(event => {
    const eventDate = parseLocalDate(event.date);
    return eventDate >= today;
  });

  // Separate today's events and group the rest by week
  const todayEvents = [];
  const eventsByWeek = {};

  futureEvents.forEach(event => {
    const date = parseLocalDate(event.date);
    const eventStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const enrichedEvent = {
      ...event,
      day: date.getDate(),
      monthAbbr: monthAbbr[date.getMonth()]
    };

    if (eventStr === todayStr) {
      todayEvents.push(enrichedEvent);
    } else {
      const weekStart = getWeekStart(date);
      const weekKey = `WEEK OF ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;

      if (!eventsByWeek[weekKey]) {
        eventsByWeek[weekKey] = [];
      }
      eventsByWeek[weekKey].push(enrichedEvent);
    }
  });

  res.render('events', { todayEvents, eventsByWeek });
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