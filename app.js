if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const mongojs = require("mongojs")
const db = mongojs('localhost:27017/flashcards', ['account']);

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')



const initializePassport = require('./passport-config')
initializePassport(
	passport,
  //look up email in db, return array of matching results
	function(email,cb){
		db.account.find({"email":email}, function(err,docs){
		console.log("FDFD " + " " + docs.length)
		if(err || docs.length==0)
		{
			console.log("NOT FOUND")
			cb(null)
		}
		else{	
			docs.forEach( function(acct) {
				cb(acct)
			})
		}
	})
	},
  //look up id in db, return array of matching results
	function(id){
		db.account.find({id:id},function(err,docs){
			return docs;
		})
	}
)

const users = []

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    let user = {
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    }
	//insert json
	
	db.account.insert(user, function(err,data){
		if(err){
			console.log("Error creating account")
			res.redirect('/register')
		}
		else
		{
			console.log("account created successfully")
			res.redirect('/login')
		}
	})
  } catch {
    res.redirect('/register')
  }
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000)