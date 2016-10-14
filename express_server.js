'use strict';
// Below are the various packages used within this server
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

// Below are the two databases that are used to keep track of users as well as
// shortened links
let users = {};
let urlDatabase = {};

// If a user is logged in while the server handles a get request for the root
// endpoint the user is redirected to the /urls endpoint. If the user isn't
// logged in the user is redirected to the /login endpoint.
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
})

// If a user is logged in while the server handles a get request for the /urls
// endpoint, the page urls_index.ejs is rendered while being able to access the
// templateVars object. If the user isn't logged in a 401 status code is sent
// back and the user is shown an error page.
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

// If a user isn't logged in while the server handles a get request for the
// /urls/new endpoint, a 401 status code is sent back and the user is shown an
// error page. If the user is logged in, the urls_new.ejs file is rendered with
// access to templateVars object.
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

// When the server handles get requests to display a specific tinyURL, if
// a user tries to display a tinyURL that isn't created a 404 status code is
// sent and an error message is displayed. If a user tries to display a tinyURL
// and isn't logged in, a 401 status code is sent and an error message is
// displayed. If a user is logged in and tries to display a tinyURL that they
// didn't make, then a 403 status code is sent back and an error message is
// displayed. Lastly, if a user is logged in and tries to display a tinyURL that
// they created, the urls_show.ejs document is rendered and has access to the
// templateVars object.
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

// When the server handles get requests to redirect from the endpoint /u/:id to
// the associated long url, if the tinyURL has been created then the user is
// redirected to the website with the long url. If the tinyURL doesn't exist
// then a 404 status code is sent and an error message appears on the page
app.get("/u/:id", (req, res) => {
  if (urlDatabase[req.params.id]) {
    let longURL = urlDatabase[req.params.id];
    res.redirect(longURL);
  } else {
    res.statusCode = 404;
    res.send("This short URL doesn't exist");
  }
})

// When the server handles post requests to add new tinyURLs, if the user is
// logged in, a random 6 digit string is generated and the variable user_id
// takes on the cookie value. The random string is added to the urlDatabase as
// a key and the long url as the value. Using the user_id, the random string is
// added as a key to the corresponding user in a key called links which is an
// object of tinyURLs created by that user with corresponding long URL values.
// The user is then redirected to the /urls/${rand} endpoint. If the user isn't
// logged in a 401 status code is sent and an error message is displayed on the page.
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

// When the server handles posts requests to the /urls/:id endpoint, used to
// update tinyURLs, if the tinyURL doesn't exist a 404 status code is sent and
// an error message shows up on the page. If a user isn't logged in, a 401 status
// code is sent and an error message shows up on the page. If a user is logged
// in but the tinyURL doesn't belong to that user a 403 status code is sent and
// an error message shows up on the page. If the user is logged in and the tinyURL
// belongs to that user, the cookie is stored in the user_id variable and the
// value in the url database corresponding to the id parameter is updated to the
// new url that was submitted in the form. The value in the corresponding 
// user's links object is also updated to the new url that was submitted. The
// user is then redirected to the /urls endpoint.
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

// When the server handles post requests to the /urls/:id/delete endpoint,
// the cookie is assigned to a variable user_id. The appropriate user is then
// identified from the users database and the corresponding key in user's links
// object is deleted. The corresponding key in the urlDatabase is also deleted.
// The user is then redirected to the /urls endpoint.
app.post("/urls/:id/delete", (req, res) => {
  const user_id = req.session.user_id;
  delete users[user_id].links[req.params.id];
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
})

// When the server handles get requests for the /login endpoint, if a user is
// logged in, the user is redirected to the /login endpoint. If the user isn't
// logged in, the urls_login.ejs file is rendered.
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/');
  } else {
    res.render('urls_login');
  }
})

// When the server handles get requests for the /register endpoint, if a user is
// logged in, the user is redirected to the root endpoint. If the user isn't
// logged in the registe_form.ejs file is rendered.
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/');
  } else {
    res.statusCode = 200;
    res.render("register_form");
  }
})

// When the server handles post requests to the /register endpoint, the key for
// a user is found in the user database using the email provided in the form. If
// no information is filled in either the email or password fields a 400 status
// code is sent and an error message is displayed on the page. If a the email
// put in the email field already exists in the user database a 400 status code
// is sent and an error message is displayed on the page. If the form is filled
// out correctly a random string is generated and a new user is created in the
// users database using the random string as the key to an object with the
// id, email (containing the entered email), password (containing the hashed
// version of the entered password), and links (an object of links the user
// creates). An encrypted cookie is then created using the random string and
// the user is redirected to the root endpoint.
app.post("/register", (req, res) => {
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

// When the server handles post requests to the /login endpoint, using the variable
// key the user is found in the database by their email. If the user exists and
// the hashed entered password matches the hashed stored password, an encrypted
// cookie is then set as the key that was used to find the user in the user
// database. The user is then redirected to the root endpoint. If the email and
// password don't match the values found in the user database a 401 status code
// is sent and an error message is shown on the page.
app.post("/login", (req, res) => {
  const key = _.findKey(users, { 'email': req.body.email });
  if (users[key] && bcrypt.compareSync(req.body.password, users[key].password)) {
    req.session.user_id = key;
    res.redirect("/");
  } else {
    res.statusCode = 401;
    res.send("Username or password is incorrect");
  }
})

// When the server handles post requests to the /logout endpoint, the cookies
// are cleared from the browser and the user is redirected to the root endpoint
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
})

// The server is listening for incoming requests
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
})

// The function below generates a 6 character randomizes string using capital
// and lowercase letters as well as numbers.
function generateRandomString() {
  let result = '';
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
