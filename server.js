const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files under /static
app.use('/static/styles', express.static(path.join(__dirname, 'styles')));
app.use('/static/img', express.static(path.join(__dirname, 'img')));
app.use('/static/fonts', express.static(path.join(__dirname, 'fonts')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'submit.html'));
});

app.get('/convo', (req, res) => {
  res.sendFile(path.join(__dirname, 'convo.html'));
});

// Issue pages: /issues/:slug (e.g., /issues/nov-25)
app.get('/issues/:slug', (req, res) => {
  const filePath = path.join(__dirname, 'issues', `${req.params.slug}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Issue not found');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
