const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const pool = require("../config");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const router = express.Router();


const JWT_SECRET = process.env.JWT_SECRET || "ton_secret_de_jwt";
const JWT_EXPIRATION = "1h";
const REFRESH_EXPIRATION = "7d";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const storage = multer.diskStorage({
    destination: "../uploads/",
    filename: (req, file, cb) => {
        cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

router.post("/upload-profile", authenticateToken, upload.single("profilePic"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const profilePicturePath = `/uploads/${req.file.filename}`;
        const userId = req.user.id;

        await pool.query("UPDATE users SET profile_picture = $1 WHERE id = $2", [profilePicturePath, userId]);

        res.json({ message: "Profile picture updated", profilePicture: profilePicturePath });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const userExists = await pool.query(
            "SELECT * FROM users WHERE username = $1 OR email = $2",
            [username, email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Username or email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = crypto.randomBytes(20).toString("hex");

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password, verification_token, is_verified, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
            [username, email, hashedPassword, verificationToken, false]
        );

        const verificationLink = `http://localhost:8080/#validate-account/${verificationToken}`;
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Account Verification",
            text: `Please click the following link to verify your account: ${verificationLink}`,
        });

        res.status(201).json({
            message: "User created successfully. Please check your email to verify your account.",
            user: newUser.rows[0],
        });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/validate-account", async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Missing token" });
    }

    try {
        const user = await pool.query(
            "SELECT * FROM users WHERE verification_token = $1",
            [token]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        const userData = user.rows[0];

        if (userData.is_verified) {
            return res.status(400).json({ error: "Account already validated" });
        }

        await pool.query(
            "UPDATE users SET is_verified = true WHERE verification_token = $1",
            [token]
        );

        res.status(200).json({ message: "Account successfully validated" });
    } catch (error) {
        console.error("Error validating account:", error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.Status(400).json({error: "Please enter a valid mail address"});
    }
    if (!password) {
        return res.status(400).json({error: "Please enter your Password"});
    }
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: "Invalid Credential" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid Credential" });
        }

        if (!user.is_verified) {
            return res.status(403).json({ error: "Your account is not verified. Please check your email." });
        }

        const accessToken = jwt.sign(
            { userId: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: REFRESH_EXPIRATION }
        );

        res.json({
            accessToken,
            refreshToken,
            message: "Connexion Successful",
        });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(400).json({ error: "User not found" });
        }

        const token = jwt.sign({ userId: user.rows[0].id, email }, JWT_SECRET, { expiresIn: "15m" });

        const resetLink = `http://localhost:8080/#reset-password/${token}`;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset",
            text: `Click the link to reset your password: ${resetLink}`,
        });

        res.json({ message: "Password reset link sent!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, decoded.userId]);

        res.json({ message: "Password successfully updated!" });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

router.get("/getuser", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(userId);
        const result = await pool.query(`
            SELECT u.id, u.username, u.email, u.is_verified, 
                   p.photo_url AS profile_picture
            FROM users u
            LEFT JOIN photo p ON u.profile_picture_id = p.id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found", userId });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
});

router.put("/profile-picture", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { photoId } = req.body;

    try {
        const checkPhoto = await pool.query("SELECT id FROM photo WHERE id = $1 AND user_id = $2", [photoId, userId]);

        if (checkPhoto.rows.length === 0) {
            return res.status(403).json({ error: "This photo does not belong to you." });
        }

        await pool.query("UPDATE users SET profile_picture_id = $1 WHERE id = $2", [photoId, userId]);

        res.json({ message: "Profile Picture updated!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
