require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");


const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)
var checklogin = false;

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store 
    saveUninitialized: false,
    resave: true
}
));

app.get('/', (req, res) => {
    if (checklogin) {
        res.redirect("/loggedin")
    } else {
        let signup = "<a href='/signup'><button type='button' style='display: block'>Sign up</button></a>";
        let login = "<a href='/login'><button type='button'>Login</button></a>";
        res.send(signup + login)
    }


});

app.get("/signup", (req, res) => {
    var html = `
    create user
    <form action='/submitUser' method='post'>
        <input name = 'name' type = 'text' placeholder = 'name'>
        <input name = 'email' type = 'email' placeholder = 'email'>
        <input name = 'password' type = 'password' placeholder = 'password'>
        <button>Submit</button>
    </form>    
    `;
    res.send(html)
})


app.get('/about', (req, res) => {
    var color = req.query.color;
    console.log(color)
    res.send("<h1 style='color:" + color + ";'>Kapish Singla</h1>");
});

app.get('/miss', (req, res) => {
    var missingfields = req.query.missing;
     html =``
    if(missingfields == 1){
        html += "<p> Name is required"
    }                        
    if (missingfields == 2) {
        html += "<p> Email is required";
    }
    if(missingfields == 3){
        html += "<p> Password is required"
    }

    html += "<br><br><br>"
    html += "<a href ='/signup'>Try Again</a>"
    res.send(html);
});




app.get('/login', (req, res) => {
    var html = `
    log in
    <form action='/loggingin' method='post'>
    <input name='email' type='email' placeholder='email'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>
    `;
    res.send(html);
});

app.post('/submitUser', async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    // var newsession = req.session;
    req.session.name = name;

    if(!name){
        res.redirect('/miss?missing=1')
        return;
    }
    if (!email) {
        res.redirect('/miss?missing=2');
        return;
    }
    if(!password){
        res.redirect('/miss?missing=3')
        return;
    }

    const schema = Joi.object(
        {
            name: Joi.string().alphanum().max(20).required(),
            email: Joi.string().email().required(),
            password: Joi.string().max(20).required()
        });

    const validationResult = schema.validate({ name, email, password });
    if (validationResult.error != null) {
        console.log(validationResult.error);
        // res.redirect("/signup");
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);

    await userCollection.insertOne({ name: name, email: email, password: hashedPassword });
    console.log("Inserted user");


    // var html = "successfully created user";
    res.redirect("/members");
});


app.post('/loggingin', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    const schema = Joi.string().email().required();
    const validationResult = schema.validate(email);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/login");
        return;
    }

    const result = await userCollection.find({ email: email }).project({ email: 1, password: 1, _id: 1 }).toArray();

    console.log(result);
    if (result.length != 1) {
        var html = `
        Incorrect email/password combination
        <br><br><br>
        <a href = './login'>Try Again</a>`
        res.send(html);
        return;
    }
    if (await bcrypt.compare(password, result[0].password)) {
        console.log("correct password");
        req.session.authenticated = true;
        req.session.email = email;
        req.session.cookie.maxAge = expireTime;


        checklogin = true;
        res.redirect('/loggedIn');
        return;
    }
    else {
        var html = `
        Incorrect email/password combination
        <br><br><br>
        <a href = './login'>Try Again</a>`
        res.send(html);
        return;
    }
});

app.get('/loggedin', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }

    // let result = userCollection.findOne({}, {projection: {_id: 0, name: 1}}).toArray()
    var html = `
    Hello, ${req.session.name}!
    <a href='/members'><button style='display: block'>Go to Members Area</button></a>
    <a href='/logout'><button style='display: block'>Logout</button></a>
    `;

    res.send(html);
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    var html = `
    You are logged out.
    `;
    res.send(html);
});

app.get("/members", (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
    }
    console.log(req.session)

    const possibleValues = [1, 2, 3];
    const randomIndex = Math.floor(Math.random() * possibleValues.length);
    const randomNumber = possibleValues[randomIndex];
    console.log(randomNumber);


    var html = `
    Hello, ${req.session.name}!`

    if (randomNumber == 1) {
        res.send(html + `<img src="D:\School\Projects 1\COMP2537\Example 1\COMP2537_Demo_Code_1\public\img1.jpeg">`);
    }
    else if (randomNumber == 2) {
        res.send(html + `<img src="./public/img2.jpg">`);
    }
    else if (randomNumber == 3){
        res.send(html + `<img src="./public/img3.jpg">`)
    }
    


})

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 