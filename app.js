//jshint esversion:6
// const bcrypt = require("bcrypt");
// const saltRounds = 20;
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
var _ = require("lodash");
const date = require(__dirname + "//currentDate.js");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const generateResetToken = () => {
  return crypto.randomBytes(20).toString("hex");
};

const username = encodeURIComponent(process.env.DBUSERNAME);
const password = encodeURIComponent(process.env.DBPASSWORD);
const uri =
  "mongodb+srv://" +
  username +
  ":" +
  password +
  "@cluster0.jbu5cjw.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp";

let deletedCount = 1;
const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 },
  })
);
let transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAILACC, // your Hotmail email
    pass: process.env.EMAILPASS, // your Hotmail password
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

app.use(passport.initialize());
app.use(passport.session());

const conn = mongoose.connect(uri, {
  dbName: process.env.DBNAME,
});

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  resetToken: String,
  resetTokenExpiration: Date,
  // password: { type: String, required: true },
  posts: [
    {
      title: { type: String },
      post: { type: String },
      date: { type: String },
    },
  ],
  friends: [
    {
      username: { type: String },
    },
  ],
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const homeStartingContent =
  "This a simple blog website developed by Ghazi Alsalah to show case some of his skills using mongodb, Nodejs, bootstrap and express ";
const aboutContent =
  "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent =
  "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

// get methods
app.get("/", async function (req, res) {
  if (req.isAuthenticated()) {
    const userdata = await User.findOne({ username: req.user.username });
    console.log(userdata);
    res.render("home", {
      title: "Have a nice day " + userdata.fullName + "!",
      homeContent: homeStartingContent,
      postsList: userdata.posts,
      username: userdata.fullName,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/home", async function (req, res) {
  if (req.isAuthenticated()) {
    const username = req.user.username;
    const userdata = await User.findOne({ username: username });

    res.render("home", {
      title: "Have a nice day " + userdata.fullName + "!",
      homeContent: homeStartingContent,
      postsList: userdata.posts,
      username: userdata.fullName,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/aboutUs", function (req, res) {
  res.render("about", { title: "About us", aboutContent: aboutContent });
});

app.get("/contact", function (req, res) {
  res.render("contact", {
    title: "contact us",
    contactContent: contactContent,
  });
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app
  .route("/compose")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("compose");
    } else {
      res.redirect("/home");
    }
  })
  .post(async function (req, res) {
    const title = req.body.title;
    const massage = req.body.postmassage;
    const username = req.user.username;
    const currentDay = date.getDateToday();
    const user = await User.findOne({ username: username });
    const post = { title: title, post: massage, date: currentDay };
    await user.posts.push(post);
    await user.save();

    res.redirect("/home");
  });

app
  .route("/delete")

  .get(async function (req, res) {
    try {
      if (req.isAuthenticated()) {
        const user = await User.findOne({ username: req.user.username });
        const postsList = user.posts;

        if (deletedCount == 0) {
          res.render("delete", {
            postsList: postsList,
            status: false,
          });
        } else {
          deletedCount = 1;
          res.render("delete", {
            postsList: postsList,
            status: true,
          });
        }
      } else {
        res.redirect("/home");
      }
    } catch (error) {
      res
        .status(500)
        .render("error", { message: "Internal Server Error", errorCode: 500 });
    }
  })
  .post(async function (req, res) {
    try {
      const username = req.user.username;

      const postId = req.body.postId;
      const user = await User.findOne({
        username: username,
      });
      const postIndex = user.posts.findIndex((post) => post._id == postId);

      if (postIndex === -1) {
        // Handle the case where the post with the given postId is not found
        deletedCount = 0;

        return res.status(404).send("Post not found");
      }

      // Remove the post from the posts array
      user.posts.splice(postIndex, 1);

      // Save the updated user document
      await user.save();
      deletedCount = 1;

      // Redirect back to the previous page
      res.redirect(req.get("referer"));
    } catch (error) {
      res
        .status(500)
        .render("error", { message: "An Error Has Occoured", errorCode: 500 });
    }
  });

// post methods
app
  .route("/login")
  .get(function (req, res) {
    const errors = req.flash("error");
    res.render("main", {
      errors: errors,
      activePage: 1,
      errordesc: "Sign You In",
      success: "",
      successdesc: "",
    });
  })
  .post(
    passport.authenticate("local", {
      successRedirect: "/home", // Redirect to the home page after successful login
      failureRedirect: "/login", // Redirect back to the login page if authentication fails
      failureFlash: true,
    })
  );

app
  .route("/signup")
  .get(function (req, res) {
    res.render("main", {
      errors: false,
      activePage: 2,
      errordesc: "",
      successdesc: "",
      success: "",
    });
  })
  .post(async function (req, res) {
    try {
      const name = req.body.fullName;
      const email = req.body.email;
      const passwrd1 = req.body.firstPassword;
      const confirmpasswrd = req.body.secondPassword;
      const check = req.body.checkbox;

      if (passwrd1 === confirmpasswrd) {
        // Register the user using passport-local-mongoose
        User.register(
          new User({
            username: email,
            fullName: name,
            active: true,
            posts: [
              {
                title: "Welcome To uBlog !",
                post: "We are happy that you've joined our blog",
                date: date.getDateToday(),
              },
            ],
            friends: [],
          }),
          passwrd1,
          async function (err, user) {
            if (err) {
              console.log(err);
              return res.render("main", {
                errors: "Already Registerd",
                activePage: 2,
                errordesc: "Sign You Up",
                successdesc: "",
                success: "",
              });
            }
            req.login(user, function (err) {
              if (err) {
                console.log(err);
                return res.redirect("/signup");
              }

              return res.redirect("/home");
            });
          }
        );
      } else {
        res.render("main", {
          errors: "Password Does Not Match",
          successdesc: "",
          errordesc: "Sign You Up",
          success: "",
          activePage: 2,
        });
      }
    } catch (error) {
      console.log(error);
      res.render("main", {
        errors: error,
        activePage: 2,
        errordesc: "Sign You Up",
        successdesc: "",
        success: "",
      });
    }
  });

app.get("/post/:postid", async function (req, res) {
  try {
    const postId = req.params.postid;

    // Check if postId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .render("error", { message: "Invalid Post ID", errorCode: 400 });
    }

    const user = await User.findOne({
      "posts._id": new mongoose.Types.ObjectId(postId),
    });

    if (!user || !user.posts || user.posts.length === 0) {
      // Post not found
      return res
        .status(404)
        .render("error", { message: "Post not found", errorCode: 404 });
    }

    const post = user.posts.find((p) => p._id.toString() === postId);

    if (!post) {
      // Post not found
      return res
        .status(404)
        .render("error", { message: "Post not found", errorCode: 404 });
    }

    res.render("post", {
      title: post.title,
      content: post.post,
      date: post.date,
      author: user.fullName,
    });
  } catch (error) {
    console.error(error);

    // Check if the error is due to an invalid ObjectId
    if (error instanceof mongoose.Error.CastError) {
      return res
        .status(400)
        .render("error", { message: "Invalid Post ID", errorCode: 400 });
    }

    res
      .status(500)
      .render("error", { message: "Internal Server Error", errorCode: 500 });
  }
});

app.post("/forgot-password", async (req, res) => {
  const email = req.body.email;

  const user = await User.findOne({ username: email });

  if (!user) {
    // User not found
    return res.render("main", {
      errors: "No User Found",
      activePage: 1,
      errordesc: "Reset your password",
      successdesc: "",
      success: "",
    });
  }

  const resetToken = generateResetToken();
  user.resetToken = resetToken;
  user.resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

  await user.save().then(async () => {
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    // Send the reset link via email
    // Implement your email sending logic here
    try {
      let info = await transporter.sendMail({
        from: "<uBlog.service@outlook.com>", // sender address
        to: email, // list of receivers
        subject: "uBlog Password Reset", // Subject line
        text: "Password Reset link", // plain text body
        html:
          '<p>Please click this link to <a href="' +
          resetLink +
          '">Reset Password</a> link.</p>',
        // html body
      });
      res.render("main", {
        errors: "",
        activePage: 1,
        errordesc: "",
        successdesc: "Email Sent",
        success: "Email With Link sens successfully!",
      });
    } catch (error) {
      console.log(error);
      res.send(error);
    }

    // res.redirect(resetLink);
  });
});
app.get("/reset-password/:token", async (req, res) => {
  const resetToken = req.params.token;

  await User.findOne({
    resetToken,
    resetTokenExpiration: { $gt: Date.now() },
  }).then((user) => {
    if (!user) {
      // Invalid or expired token
      return res.redirect("/forgot-password");
    }

    // Render the reset password form
    res.render("reset-password", { user });
  });
});

app.post("/reset-password/:token", async (req, res) => {
  const resetToken = req.params.token;
  const newPassword = req.body.password;

  await User.findOne({
    resetToken,
    resetTokenExpiration: { $gt: Date.now() },
  }).then((user) => {
    if (!user) {
      // Invalid or expired token
      return res.redirect("/forgot-password");
    }

    // Update the user's password and clear the reset token
    user.setPassword(newPassword, (err) => {
      if (err) {
        // Handle error
        console.log(err);
        return res
          .status(500)
          .send("An error occurred while updating the password.");
      }

      user.resetToken = undefined;
      user.resetTokenExpiration = undefined;

      user.save().then((user, err) => {
        if (err) {
          // Handle error
          console.log(err);
          return res
            .status(500)
            .send("An error occurred while saving the user.");
        }

        // Password updated successfully
        res.redirect("/login");
      });
    });
  });
});

app.use((req, res, next) => {
  res
    .status(404)
    .render("error", { message: "Page Not Found", errorCode: 404 });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
