const express = require('express');
const router = express.Router();

// Home route
router.get('/', (req, res) => {
  res.send('home');
});

// Dashboard route
router.get('/dashboard', (req, res) => {
  res.send('dashboard');
});

// Profile route
router.get('/profile', (req, res) => {
  res.send('profile');
});

// Register route
router.get('/register', (req, res) => {
  res.send('register');
});
router.post('/register', (req, res) => {
  res.send('register');
});

// Login route
router.get('/login', (req, res) => {
  res.send('login');
});

// Browse route
router.get('/browse', (req, res) => {
  res.send('browse');
});

// Game upload route
router.get('/game/upload', (req, res) => {
  res.send('game upload');
});
router.post('/game/upload', (req, res) => {
  res.send('game upload');
});

// Game edit route
router.get('/game/edit', (req, res) => {
  res.send('game edit');
});
router.post('/game/edit', (req, res) => {
  res.send('game edit');
});

// Profile edit route
router.get('/profile/edit', (req, res) => {
  res.send('profile edit');
});
router.post('/profile/edit', (req, res) => {
  res.send('profile edit');
});

module.exports = router;
