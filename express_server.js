'use strict';
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const _ = require("lodash");
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser())

let users = {};

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.get("/", (req, res) => {
  res.send("<html><body><h1>Tiny URL homepage</h1></body></html>")
});

app.get("/urls", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    user_id: req.cookies["user_id"],
    users: users
  };
  res.render("urls_index", templateVars);
})

app.get("/urls/new", (req, res) => {
  let templateVars = {
    user_id: req.cookies["user_id"],
    users: users
  }
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  const rand = generateRandomString();
  urlDatabase[rand] = req.body.longURL;
  res.redirect(`/urls/${rand}`)
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
    user_id: req.cookies["user_id"],
    users: users
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls")
})

app.post("/urls/:id/update", (req, res) => {
  urlDatabase[req.params.id] = req.body.newURL;
  res.redirect("/urls")
})

app.post("/login", (req, res, next) => {
  const key = _.findKey(users, { 'email': req.body.email });
  if (!users[key] || users[key].password !== req.body.password) {
    res.status = 403;
    next(Error('403 Error'))
  } else {
    res.cookie("user_id", key);
    res.redirect("/urls");
  }
})

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
})

app.get("/register", (req, res) => {
  templateVars = {
    user_id: req.cookies.user_id,
    users: users
  }
  res.render("register_form", templateVars);
})

app.post("/register", (req, res, next) => {
  const key = _.findKey(users, { 'email': req.body.email });
  if (users[key] || !req.body.email || !req.body.password) {
    res.status = 400;
    next(Error('400 Error'));
  } else {
    const rand = generateRandomString();
    users[rand] = {
      id: rand,
      email: req.body.email,
      password: req.body.password
    };
    res.cookie("user_id", rand);
    res.redirect("/urls");
  }
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

function generateRandomString() {
  let result = '';
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  };
  return result;
}
