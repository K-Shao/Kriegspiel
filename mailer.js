var nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "kriegspiel.chess",
        pass: "darkboard"
    }
});

module.exports.sendVerification = function (link, emailTo) {
    
    mailOptions={
        to : emailTo,
        subject : "Kriegspiel.tk: Confirm email account.",
        html : "Hello,<br> Thanks for registering with Kriegspiel! Please click on the link to verify your email.<br><a href="+link+">Click here to verify</a><br>If the link doesn't work, you can use this URL directly as well: " + link
    }
    
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
            res.end("error");
        }
    });
};