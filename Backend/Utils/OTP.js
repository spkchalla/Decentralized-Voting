import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const sendOtpToEmail = async (user) =>{
    const OTP = crypto.randomInt(100000,999999).toString();
    const expiresAt = new Date(Date.now() + 5*60*1000);

    user.otp = {
        code:OTP,
        expiresAt
    };
    await user.save();

    const transporter = nodemailer.createTransport({
        service:"gmail",
        auth:{
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    const mailOptions = {
        from:'"LA Money" <noreply.lamoney>',
        to: user.email,
        subject:"OTP for Decentralized-Voting System",
        html:`<p> Your OTP is <b>${OTP}</b></p>`
    };
    await transporter.sendMail(mailOptions);
}

export const verifyOTP = async(user,OTP) =>{

    const isOTPExpired = new Date()> new Date(user.otp.expiresAt);
    if(isOTPExpired){
        throw new Error("OTP Expired");
    }

    if(OTP != user.otp.code){
        return res.status(401).json("OTP incorrect");
    }

    user.isVerified = true;
    user.otp = undefined;

    user.save();
}