const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const fse = require('fs-extra');
const httpPort = 80;
let VERSION = "06";

const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    console.log(new Date().toLocaleString() + " " + req.url);
    next();
});

app.use(express.static(path.join(__dirname, "public", VERSION)));

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "public", VERSION, "index.html"));
});

const UPLOAD_PATH = path.join(__dirname, "public", VERSION, "uploads");

var uploadSnaps = multer({
    storage: multer.diskStorage({
        destination: function(req, file, cb) {
            cb(null, UPLOAD_PATH);
        },
        filename: function(req, file, cb) {
            let fn = file.originalname.replace(/:/g,"-");
            cb(null, fn);
        }
    })
}).single("image");

app.post("/saveSnap",  function(req, res) {
    uploadSnaps(req, res, async function(err) {
        if(err) {
            console.log(err);
            res.json({
                success: false,
                error: {
                    message: 'Upload failed:: ' + JSON.stringify(err)
                }
            });
        } else {
            console.log(req.body);
            res.json({success: true, id: req.body.id});
            if(VERSION === "06") await sendPushNotifications(req.body.title);
        }
    });
});

app.get("/snaps", function(req, res) {
    let files = fse.readdirSync(UPLOAD_PATH);
    files = files.reverse().slice(0, 10);
    console.log("In", UPLOAD_PATH, "there are", files);
    res.json({
        files
    });
});

const webpush = require('web-push');

let subscriptions = [];
const SUBS_FILENAME = 'subscriptions.json';

try {
    subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
} catch (error) {
    console.error(error);    
}

app.post("/saveSubscription", function(req, res) {
    console.log(req.body);
    let sub = req.body.sub;
    subscriptions.push(sub);
    fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
    res.json({
        success: true
    });
});

async function sendPushNotifications(snapTitle) {
    webpush.setVapidDetails('mailto:gabriel.paic@fer.hr', 
    'BL1oXiSXCjKRPParkSNUP7ik7Ltl3RpPUxurkh7ro4rdpNLylON7f3xxZryBF_xN8CqxvemlVdT2EJGH33qe5iw', 
    '4B9u-sA9uJ8zISw3FXlsbbsaVixK3NJn6o_BZshEZnI');

    subscriptions.forEach(async sub => {
        try {
            console.log("Sending notif to", sub);
            await webpush.sendNotification(sub, JSON.stringify({
                title: 'New snap!',
                body: 'Somebody just snaped a new photo: ' + snapTitle,
                redirectUrl: '/index.html'
            }));    
        } catch(error) {
            console.error(error);
        }
    });
}

const host = 'localhost';

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 80;

if(externalUrl) {
    const hostname = '127.0.0.1';
    app.listen(port, hostname, () => {
        console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`);
    });
} else {
    app.listen(port, host, () => {
        console.log(`Server running at http://${host}:${port}/`);
    });
}