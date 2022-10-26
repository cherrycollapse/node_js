import Router from "express";
import path from "path";

import news from "../models/news.js";
import users from "../models/users.js";
import { add_user } from "../controllers/userController.js";

import methodOverride from "method-override";
import bcrypt from "bcryptjs";
import { body } from 'express-validator';

const __dirname = path.resolve();
const router = Router();

router.use(methodOverride("X-HTTP-Method")); //          Microsoft
router.use(methodOverride("X-HTTP-Method-Override")); // Google/GData
router.use(methodOverride("X-Method-Override")); //      IBM
router.use(
    methodOverride(function (req, res) {
        if (req.body && typeof req.body === "object" && "_method" in req.body) {
            // look in urlencoded POST bodies and delete it
            const method = req.body._method;
            delete req.body._method;
            return method;
        }
    })
);

router
    .route("/")
    .get((req, res) => {
        res.render("index.ejs", {
            title: "My Express (ejs)",
            news: news,
            username: req.signedCookies.username,
        });
    })
    .post((req, res) => {
        res.send("<h1>Express POST REQUEST</h1>");
    });

router.route("/news")
    .get((req, res) => {
        console.log(req.cookies)
        res.render("news.ejs", {
            title: "News",
            news: news,
            username: req.cookies.username,
        });
    })

// Надати можливість авторізованим користувачам додавати новини на сайт.    
router.route("/news/add")
    .post(
        // Додати валідацію для отриманих от клієнта даних (новини). express-validator
        body('title').isLength({ min: 6 }),
        body('text').isLength({ min: 80 }),
        (req, res) => {
            const { title, text } = req.body;

            let biggest;
            if (news.length !== 0) {
                biggest = news.reduce((prev, current) =>
                    prev.id > current.id ? prev : current
                );
            }
            news.push({
                id: biggest ? biggest.id + 1 : 1,
                title: title,
                text: text,
            });
            res.redirect("/news")
        });

// Зробити форму реєстрації користувача через механізм cookie-session.         
router
    .route("/register")
    .get((req, res) => {
        res.render("register", {
            title: "Регистрация",
            username: req.signedCookies.username,
        });
    })
    .post(
        add_user,
        // Додати валідацію для отриманих от клієнта даних (юзери). express-validator
        body('email').custom(value => {
            return users.findUserByEmail(value).then(user => {
                if (user) {
                    return Promise.reject('E-mail already in use');
                }
            });
        }),
        body('password').isLength({ min: 5 }),
        body('passwordConfirmation').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        }),
        (req, res) => {
            res.redirect("/news");
        });

// Зробити форму авторизації користувача через механізм cookie-session.         
router
    .route("/login")
    .get(
        (req, res) => {
            res.render("login", { title: "Login" });
        })
    .post(async (req, res) => {
        const { login, password } = req.body;
        let obj = users.find((el) => el.login === login);
        if (obj) {
            const hash = await bcrypt.hashSync(password, obj.salt);
            if (hash === obj.password) {
                req.session.login = obj.name;
                console.log(req.session.username, "login");
            }
        }
        res.redirect("/");
    });

// Передбачити можливість користувача зробити logout.     
router.route("/logout").get((req, res) => {
    if (req.cookies.username) res.clearCookie("username");
    res.render("index", {
        title: "Index",
        news: news,
        username: req.signedCookies.username,
    });
});

export default router;