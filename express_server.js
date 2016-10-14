'use strict';
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const _ = require("lodash");
const bcrypt = require("bcrypt-nodejs");
const cookieSession = require("cookie-session");
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));

let users = {};
let urlDatabase = {};

app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
})

app.get("/urls", (req, res) => {
  if (req.session.user_id) {
    let templateVars = {
      urlDatabase: urlDatabase,
      user_id: req.session.user_id,
      users: users
    };
    res.statusCode = 200;
    res.render("urls_index", templateVars);
  } else {
    res.statusCode = 401;
    res.send("<html><body><p>Must be logged in to see your URLs</p><a href='/login'>Login here</a></body></html>");
  }
})

app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    res.statusCode = 401;
    res.send("<html><body><p>Must be logged in to create a new URL</p><a href='/login'>Login here</a></body></html>");
  } else {
    let templateVars = {
      user_id: req.session.user_id,
      users: users
    };
    res.statusCode = 200;
    res.render("urls_new", templateVars);
  }
});

app.get("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.statusCode = 404;
    res.send("The short URL you're looking for doesn't exist");
  } else if (!req.session.user_id) {
    res.statusCode = 401;
    res.send("<html><body><p>Must be logged in to see this URL</p><a href='/login'>Login here</a></body></html>");
  } else if (!users[req.session.user_id].links[req.params.id]) {
    res.statusCode = 403;
    res.send("This short URL isn't available");
  } else {
    let templateVars = {
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id],
      user_id: req.session.user_id,
      users: users
    };
    res.statusCode = 200;
    res.render("urls_show", templateVars);
  }
})

app.get("/u/:id", (req, res) => {
  if (urlDatabase[req.params.id]) {
    let longURL = urlDatabase[req.params.id];
    res.redirect(longURL);
  } else {
    res.statusCode = 404;
    res.send("This short URL doesn't exist");
  }
})

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    const rand = generateRandomString();
    const user_id = req.session.user_id;
    urlDatabase[rand] = req.body.longURL;
    users[user_id].links[rand] = req.body.longURL;
    res.redirect(`/urls/${rand}`);
  } else {
    res.statusCode = 401;
    res.send("<html><body><p>Must be logged in to create a new URL</p><a href='/login'>Login here</a></body></html>");
  }
})

app.post("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.statusCode = 404;
    res.send("This short URL doesn't exist");
  } else if (!req.session.user_id) {
    res.statusCode = 401;
    res.send("<html><body><p>Must be logged in to update this URL</p><a href='/login'>Login here</a></body></html>");
  } else if (!users[req.session.user_id].links[req.params.id]) {
    res.statusCode = 403;
    res.send("This short URL isn't available to update");
  } else {
    const user_id = req.session.user_id;
    urlDatabase[req.params.id] = req.body.newURL;
    users[user_id].links[req.params.id] = req.body.newURL;
    res.redirect("/urls");
  }
})

app.post("/urls/:id/delete", (req, res) => {
  const user_id = req.session.user_id;
  delete users[user_id].links[req.params.id];
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
})

app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/');
  } else {
    res.render('urls_login');
  }
})

app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/');
  } else {
    res.statusCode = 200;
    res.render("register_form");
  }
})

app.post("/register", (req, res, next) => {
  const key = _.findKey(users, { 'email': req.body.email });
  if (!req.body.email || !req.body.password) {
    res.statusCode = 400;
    res.send("Please fill in both email and password to sign up");
  } else if (users[key]) {
    res.statusCode = 400;
    res.send("That email has already been registered");
  } else {
    const rand = generateRandomString();
    users[rand] = {
      id: rand,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password),
      links: {}
    };
    req.session.user_id = rand;
    res.redirect("/");
  }
})

app.post("/login", (req, res, next) => {
  const key = _.findKey(users, { 'email': req.body.email });
  if (users[key] && bcrypt.compareSync(req.body.password, users[key].password)) {
    req.session.user_id = key;
    res.redirect("/");
  } else {
    res.statusCode = 401;
    res.send("Username or password is incorrect");
  }
})

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
})

function generateRandomString() {
  let result = '';
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
