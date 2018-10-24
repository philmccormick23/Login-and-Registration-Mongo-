var express = require("express");
//console.log("Let's find out what express is", express);
// invoke express and store the result in the variable app
var session = require('express-session');
var bodyParser = require('body-parser');
var app = express();
var mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var validateEmail = function(email) { //this is the function for the email validation and match in the UserSchema below
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email)
};

app.use(express.static(__dirname + "/static"));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));
app.use(bodyParser.urlencoded({ extended: true }));
const flash = require('express-flash');
app.use(flash());
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/login_and_registration', { useNewUrlParser: true });



//schema for the database structure

var UserSchema = new mongoose.Schema({
    email:{
        type: String, 
        required: [true, 'Email is required'], 
        unique: [true, 'Email must be unique'], 
        minlength: [2, 'Minimum length of 2'], 
        validate: [validateEmail, 'Please fill a valid email address'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']},
    first_name:{
        type: String, 
        required: [true, 'First Name is required'], 
        minlength: [2, 'Minimum length of 2']},
    last_name:{
        type: String, 
        required: [true, 'Last Name is required'], 
        minlength: [2, 'Minimum length of 2']},
    password: {
        type: String, 
        required: [true, 'Password is required'], 
        minlength: [2, 'Minimum length of 2']},
    birthday: {
        type: Date, 
        required: [true, 'Birthday is required'], 
        validate: {
            validator: function (value) {
                if (Date.parse(value) >= Date.now()) {
                    return false;
                }
            },
            message: 'You need to be born to register!'
        },
    }},{ timestamps:true });

UserSchema.pre('save', function (next){ //pre function for password hashing, will not show up in request.body
    bcrypt.hash(this.password, 10)
    .then(hashed_password => {
        this.password=hashed_password;
        next();
    })
    .catch(error => {
        console.log(error);
    });
})
    
UserSchema.plugin(uniqueValidator);

mongoose.model("User", UserSchema);
var User = mongoose.model("User");

//Routes for the server side 

app.get('/', function(request, response){
    User.find({}, function(error, users){
        //console.log(users);
    })
    response.render('index'); 
});

app.post('/register', function(request, response){

   // if(request.body.confirm === '') {
   //     var confirmation = false;
   // }
   // if(request.body.password !== request.body.confirm) {
   //    var confirmationMatch = false;
   //}
    
    console.log("ADD: ", request.body);
    var new_user = new User({
        email: request.body.email,
        first_name: request.body.first_name,
        last_name: request.body.last_name,
        password: request.body.password,
        birthday: request.body.birthday,
    });
    new_user.save(function(error){
        if(error){    
            //if(confirmation == false || confirmationMatch == false) {
            //    request.flash("registration", "Password Confimration Failed");
            //}
            for(var key in error.errors){
                request.flash('registration', error.errors[key].message);
            }   
            response.redirect('/');
        }
       //else if (confirmation == false || confirmationMatch == false) {
        //   request.flash("registration", "Password Confimration Failed");
        //   response.redirect('/');
      // }
        else {
            console.log('success from add POST SAVE message');
            request.session.first_name=new_user.first_name;
            request.session.id=new_user._id;
            response.redirect('/success');
        }
    })
    console.log(new_user)         
});

app.post('/login', function(request, response){
    User.findOne({email: request.body.email}, function(error, user){
        if(error) {
            console.log("can't login");
            response.redirect('/')
        } else {
            if(user){
                const dbPassword = user.password;
                console.log(request.body.password);
                console.log(dbPassword);
                bcrypt.compare(request.body.password, dbPassword)
                .then( result => {
                    if(result == true) {
                        request.session.first_name=user.first_name;
                        request.session.id=user.id;
                        response.redirect('/success')
                    }
                    else {
                        request.flash("registration", "Password doesn't match!");
                        response.redirect('/');
                    }    
                })
                .catch( error => {
                     console.log(error);
                     response.redirect('/')
                })   
            } else {
                request.flash("registration", "The User doesn't exist");
                console.log("user doesnt exist");
                response.redirect('/')
            } 
        } 
    })         
});

app.get('/success', function(request, response){
    var username=request.session.first_name
    User.find({}, function(error, users){
        if(error){
           
        } else {
            console.log('Successful ');
            response.render('success',{session: request.session, users: users}); 
        }
    })  
});

app.get('/logout', function(request, response){
    request.session.destroy();
    console.log('Succesful Logout')
    response.redirect('/'); 
});


    // tell the express app to listen on port 8000, always put this at the end of your server.js file
    app.listen(8000, function () {
        console.log("listening on port 8000");
    })
